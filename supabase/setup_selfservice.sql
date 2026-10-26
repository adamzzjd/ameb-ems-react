-- ============================================================================
-- AMEB EMS — Employee self-service (PSN update portal)
-- ----------------------------------------------------------------------------
-- Lets an officer update their own register details using their staff number
-- (PSN) plus one fact already held on their record, then a short-lived token.
--
--   STEP 1  self_service_verify(psn, factor)
--           factor = date of birth (YYYYMMDD or DDMMYYYY) OR the last 4 digits
--           of the phone number on the record. On success returns the profile
--           and a single-use token valid for 20 minutes.
--
--   STEP 2  self_service_submit(token, changes)
--           Applies the validated one-shot DIRECT update to the employee the
--           token was issued for. No employee id is ever accepted from the
--           client.
--
--   ADMIN   reset_self_service_lock(psn) — admin+ only, audited escape hatch.
--
-- SECURITY MODEL
--   The previous design accepted a bare PSN: an unauthenticated caller could
--   read any officer's full profile (DOB, phone, address, photo) and, with the
--   employee id that came back, apply an update. PSNs are numeric and short, so
--   the whole register was enumerable.
--
--   Now:
--     * A factor that is not public knowledge (DOB / phone digits) is required
--       before any profile data is returned.
--     * Failures are indistinguishable — an unknown PSN and a wrong factor
--       return the same answer, so the endpoint cannot be used to test whether
--       a staff number exists.
--     * Five failed attempts lock that PSN for 15 minutes (server-side, in
--       self_service_attempts — not in the browser).
--     * Writes need the token from a successful verify, so an employee id on
--       its own is useless. Tokens are single-use and expire.
--     * No anonymous write path exists: self-registration is closed and the
--       only writer is the validated one-shot function.
--
-- HOW TO RUN:
--   1. Supabase dashboard → SQL Editor → paste → Run (or `node
--      scripts/run-sql.mjs supabase/setup_selfservice.sql`).
--   2. Safe to run multiple times.
-- ============================================================================

-- ── 1. Columns used by the portal (idempotent) ─────────────────────────────
alter table public.employees add column if not exists address text;
alter table public.employees add column if not exists self_service_submitted_at timestamptz;

-- ── 2. Superseded designs (pre-production cleanup) ─────────────────────────
drop table if exists public.employee_update_requests;
drop table if exists public.employee_registrations;
drop function if exists public.check_employee_registration(text);
drop function if exists public.submit_employee_registration(text, jsonb);

-- ── 3. Bookkeeping tables ──────────────────────────────────────────────────
-- Failed-attempt counters, one row per PSN (never exposed to clients).
create table if not exists public.self_service_attempts (
  psn               text primary key,
  attempts          integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until      timestamptz
);
alter table public.self_service_attempts enable row level security;

-- Short-lived, single-use write tokens issued by a successful verify.
create table if not exists public.self_service_tokens (
  token       uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);
alter table public.self_service_tokens enable row level security;
create index if not exists self_service_tokens_employee_idx
  on public.self_service_tokens (employee_id);

-- ── 4. Attempt bookkeeping helper (internal only) ──────────────────────────
create or replace function public.self_service_note_failure(p_psn text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window constant interval := interval '15 minutes';
  v_limit  constant integer  := 5;
begin
  insert into public.self_service_attempts as a (psn, attempts, window_started_at, locked_until)
  values (p_psn, 1, now(), null)
  on conflict (psn) do update set
    attempts = case
      when a.window_started_at < now() - v_window then 1
      else a.attempts + 1
    end,
    window_started_at = case
      when a.window_started_at < now() - v_window then now()
      else a.window_started_at
    end,
    locked_until = case
      when (case when a.window_started_at < now() - v_window then 1 else a.attempts + 1 end) >= v_limit
        then now() + v_window
      else null
    end;
end;
$$;

-- Supabase gives every new function EXECUTE to `anon` through default
-- privileges, so revoking from PUBLIC alone is not enough. An anon grant on
-- this helper would let anyone lock an officer's PSN out deliberately.
revoke all on function public.self_service_note_failure(text) from public;
revoke execute on function public.self_service_note_failure(text) from anon, authenticated, service_role;

-- ── 5. Step 1 — verify identity, hand back a token ─────────────────────────
drop function if exists public.self_service_verify(text, text);
create or replace function public.self_service_verify(psn text, factor text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_psn      text := upper(trim(coalesce(psn, '')));
  v_digits   text := regexp_replace(coalesce(factor, ''), '\D', '', 'g');
  v_emp      public.employees%rowtype;
  v_locked   timestamptz;
  v_token    uuid;
  v_ok       boolean := false;
  v_last4    text;
begin
  -- One uniform answer for every kind of miss, so the endpoint cannot be used
  -- to test whether a staff number exists.
  if v_psn = '' then
    return jsonb_build_object('ok', false, 'error', 'verify_failed');
  end if;

  -- Table is aliased because the function parameter is also called `psn`;
  -- an unqualified reference is ambiguous (42702).
  select a.locked_until into v_locked
    from public.self_service_attempts a where a.psn = v_psn;

  if v_locked is not null and v_locked > now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'locked',
      'retry_after_seconds', ceil(extract(epoch from (v_locked - now())))::int
    );
  end if;

  select * into v_emp
    from public.employees e
   where upper(trim(e.psn)) = v_psn
   limit 1;

  if found and v_digits <> '' then
    v_last4 := right(regexp_replace(coalesce(v_emp.phone, ''), '\D', '', 'g'), 4);
    v_ok :=
      (v_emp.dob is not null and v_digits in (
         to_char(v_emp.dob, 'YYYYMMDD'),
         to_char(v_emp.dob, 'DDMMYYYY')
      ))
      or (length(v_last4) = 4 and v_digits = v_last4);
  end if;

  if not v_ok then
    perform public.self_service_note_failure(v_psn);
    return jsonb_build_object('ok', false, 'error', 'verify_failed');
  end if;

  -- Success clears the counter for this PSN and issues one single-use token.
  delete from public.self_service_attempts a where a.psn = v_psn;
  delete from public.self_service_tokens
   where employee_id = v_emp.id and (used_at is not null or expires_at < now());

  insert into public.self_service_tokens (employee_id, expires_at)
  values (v_emp.id, now() + interval '20 minutes')
  returning token into v_token;

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'already_submitted', v_emp.self_service_submitted_at is not null,
    'profile', jsonb_build_object(
      'id', v_emp.id,
      'psn', v_emp.psn,
      'name', v_emp.name,
      'gender', v_emp.gender,
      'grade', v_emp.grade,
      'cadre', v_emp.cadre,
      'date_first_appt', v_emp.date_first_appt,
      'date_present_appt', v_emp.date_present_appt,
      'dob', v_emp.dob,
      'phone', v_emp.phone,
      'lga', v_emp.lga,
      'station', v_emp.station,
      'address', v_emp.address,
      'photo', v_emp.photo,
      'step', v_emp.step,
      'remarks', v_emp.remarks
    )
  );
end;
$$;

revoke all on function public.self_service_verify(text, text) from public;
grant execute on function public.self_service_verify(text, text) to anon;
grant execute on function public.self_service_verify(text, text) to authenticated;

-- ── 6. Step 2 — apply the one-shot update behind the token ─────────────────
drop function if exists public.self_service_submit(uuid, jsonb);
create or replace function public.self_service_submit(p_token uuid, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp     public.employees%rowtype;
  v_token   public.self_service_tokens%rowtype;
  v_allowed text[] := array[
    'name', 'gender', 'grade', 'cadre',
    'date_first_appt', 'date_present_appt', 'dob',
    'phone', 'lga', 'station', 'address', 'photo',
    'step', 'remarks'
  ];
  v_key     text;
begin
  select * into v_token
    from public.self_service_tokens t
   where t.token = p_token
     and t.used_at is null
     and t.expires_at > now();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'session_expired');
  end if;

  select * into v_emp from public.employees where id = v_token.employee_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'session_expired');
  end if;

  if v_emp.self_service_submitted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_submitted');
  end if;

  if jsonb_typeof(changes) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid_payload');
  end if;

  for v_key in select jsonb_object_keys(changes) loop
    if not (v_key = any (v_allowed)) then
      return jsonb_build_object('ok', false, 'error', 'field_not_allowed', 'field', v_key);
    end if;
    if jsonb_typeof(changes -> v_key) not in ('string', 'null') then
      return jsonb_build_object('ok', false, 'error', 'invalid_value', 'field', v_key);
    end if;
  end loop;

  if nullif(changes ->> 'name', '') is null and changes ? 'name' then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;

  update public.employees e set
    name              = case when changes ? 'name'              then changes ->> 'name'              else e.name end,
    gender            = case when changes ? 'gender'            then nullif(changes ->> 'gender', '')            else e.gender end,
    grade             = case when changes ? 'grade'             then nullif(changes ->> 'grade', '')             else e.grade end,
    cadre             = case when changes ? 'cadre'             then nullif(changes ->> 'cadre', '')             else e.cadre end,
    date_first_appt   = case when changes ? 'date_first_appt'   then nullif(changes ->> 'date_first_appt', '')::date   else e.date_first_appt end,
    date_present_appt = case when changes ? 'date_present_appt' then nullif(changes ->> 'date_present_appt', '')::date else e.date_present_appt end,
    dob               = case when changes ? 'dob'               then nullif(changes ->> 'dob', '')::date               else e.dob end,
    phone             = case when changes ? 'phone'             then nullif(changes ->> 'phone', '')             else e.phone end,
    lga               = case when changes ? 'lga'               then nullif(changes ->> 'lga', '')               else e.lga end,
    station           = case when changes ? 'station'           then nullif(changes ->> 'station', '')           else e.station end,
    address           = case when changes ? 'address'           then nullif(changes ->> 'address', '')           else e.address end,
    photo             = case when changes ? 'photo'             then nullif(changes ->> 'photo', '')             else e.photo end,
    step              = case when changes ? 'step'              then nullif(changes ->> 'step', '')              else e.step end,
    remarks           = case when changes ? 'remarks'           then nullif(changes ->> 'remarks', '')           else e.remarks end,
    updated_at                = now(),
    self_service_submitted_at = now()
  where e.id = v_emp.id;

  update public.self_service_tokens set used_at = now() where token = p_token;

  insert into public.audit_log (id, user_id, user_email, user_role, action, table_name, row_id, details)
  values (gen_random_uuid(), null, null, null, 'update', 'employees', v_emp.id,
          jsonb_build_object('source', 'self_service', 'changes', changes));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.self_service_submit(uuid, jsonb) from public;
grant execute on function public.self_service_submit(uuid, jsonb) to anon;
grant execute on function public.self_service_submit(uuid, jsonb) to authenticated;

-- ── 7. Admin escape hatch (unchanged, admin+ only, audited) ────────────────
drop function if exists public.reset_self_service_lock(text);
create or replace function public.reset_self_service_lock(psn text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp public.employees%rowtype;
begin
  if public.auth_role() not in ('admin', 'super_admin') then
    return jsonb_build_object('ok', false, 'error', 'Only administrators can unlock an officer.');
  end if;

  select * into v_emp from public.employees e where lower(e.psn) = lower(reset_self_service_lock.psn) limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'No employee found with that PSN.');
  end if;

  if v_emp.self_service_submitted_at is null then
    return jsonb_build_object('ok', false, 'error', 'This officer has not submitted yet — nothing to unlock.');
  end if;

  update public.employees set self_service_submitted_at = null where id = v_emp.id;

  insert into public.audit_log (id, user_id, user_email, user_role, action, table_name, row_id, details)
  values (gen_random_uuid(), auth.uid(), nullif(auth.jwt() ->> 'email', ''), public.auth_role(),
          'update', 'employees', v_emp.id,
          jsonb_build_object('action', 'reset_self_service_lock', 'psn', v_emp.psn));

  return jsonb_build_object('ok', true, 'psn', v_emp.psn);
end;
$$;

revoke all on function public.reset_self_service_lock(text) from public;
revoke execute on function public.reset_self_service_lock(text) from anon;
grant execute on function public.reset_self_service_lock(text) to authenticated;

-- ── 8. Retire the anonymous PSN-only endpoints ─────────────────────────────
-- These exposed a full profile for a bare PSN and accepted a client-supplied
-- employee id for writes. Run this section only once the new client is live.
drop function if exists public.self_service_lookup(text);
drop function if exists public.submit_self_service_update(uuid, jsonb);
