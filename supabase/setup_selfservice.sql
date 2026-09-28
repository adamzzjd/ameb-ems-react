-- ============================================================================
-- AMEB EMS — Employee self-service (PSN update portal)
-- ----------------------------------------------------------------------------
-- Lets an officer manage their own register details using only their staff
-- number (PSN) — no password. One path, per the board's model:
--
--   EXISTING OFFICER (PSN already in the register)
--     1. self_service_lookup(psn) returns their FULL profile (all editable
--        fields except PSN) + an `already_submitted` flag.
--     2. They edit any field, review, submit.
--     3. submit_self_service_update() validates the fields and applies the
--        changes DIRECTLY to the employees row (no approval), stamps
--        self_service_submitted_at (the one-shot lockout), and writes an
--        audit row. The officer can never submit again.
--
--   NEW OFFICER (PSN not in the register)
--     Self-registration is CLOSED — a lookup miss shows a "contact the board
--     office" message. New staff are registered by the board office (CSV
--     import or the PSN Tools admin page).
--
--   ADMIN ESCAPE HATCH
--     reset_self_service_lock(psn) clears the one-shot lockout for one officer
--     (admin+ only, audited) — used for testing and corrections.
--
-- SECURITY MODEL
--   Anonymous self-service NEVER touches the employees table through RLS —
--   it goes through SECURITY DEFINER functions owned by the table owner that
--   expose a tightly-scoped interface:
--     * self_service_lookup(psn)              — one officer, full editable profile
--     * submit_self_service_update(id, jsonb) — validated one-shot DIRECT update
--     * reset_self_service_lock(psn)          — admin+ only escape hatch (audited)
--   No anonymous write path exists: updates go through the validated function
--   and self-registration is closed.
--
-- HOW TO RUN:
--   1. Open Supabase dashboard → SQL Editor → New query
--   2. Paste this entire file and click "Run"
--   3. (Safe to run multiple times — uses IF NOT EXISTS / DROP POLICY IF EXISTS)
--   4. Run setup_rls.sql afterwards (or re-run it — it is idempotent).
-- ============================================================================

-- ── 1. New employees columns (idempotent) ─────────────────────────────────
alter table public.employees add column if not exists address text;
alter table public.employees add column if not exists self_service_submitted_at timestamptz;

-- ── 1.5. Superseded designs (pre-production cleanup) ───────────────────────
-- (a) The first draft kept pending changes for existing officers in
--     employee_update_requests — replaced by direct updates.
-- (b) employee_registrations + its functions powered the new-officer
--     self-registration queue. The board later closed self-registration
--     entirely (only existing PSNs use the portal), so both are dropped.
drop table if exists public.employee_update_requests;
drop table if exists public.employee_registrations;
drop function if exists public.check_employee_registration(text);
drop function if exists public.submit_employee_registration(text, jsonb);

-- ── 2. Anonymous self-service functions ──────────────────────────────────────
-- NOTE: each function is DROPPED before being recreated. The first deployed
-- versions had a different return type/signature, and PostgreSQL refuses to
-- `create or replace` a function whose return type changed (42P13) — dropping
-- first makes re-runs of this script always succeed.

-- One officer by exact PSN, full editable profile (everything except PSN and
-- the lockout timestamp, which surfaces as `already_submitted`).
drop function if exists public.self_service_lookup(text);
create or replace function public.self_service_lookup(psn text)
returns table (
  id                 uuid,
  psn                text,
  name               text,
  gender             text,
  grade              text,
  cadre              text,
  date_first_appt    date,
  date_present_appt  date,
  dob                date,
  phone              text,
  lga                text,
  station            text,
  address            text,
  photo              text,
  step               text,
  remarks            text,
  already_submitted  boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id, e.psn, e.name, e.gender, e.grade, e.cadre,
    e.date_first_appt, e.date_present_appt, e.dob,
    e.phone, e.lga, e.station, e.address, e.photo,
    e.step, e.remarks,
    e.self_service_submitted_at is not null
  from public.employees e
  where e.psn = self_service_lookup.psn
  limit 1;
$$;

revoke all on function public.self_service_lookup(text) from public;
grant execute on function public.self_service_lookup(text) to anon;
grant execute on function public.self_service_lookup(text) to authenticated;

-- Apply an existing officer's one-shot DIRECT update. Validates that the
-- employee exists, hasn't already submitted, and that `changes` only contains
-- editable fields (everything except id, psn and the lockout/timestamps).
-- Clears a field when its value is null/empty; stamps the lockout and writes
-- an audit row. Returns { ok, error? }.
drop function if exists public.submit_self_service_update(uuid, jsonb);
create or replace function public.submit_self_service_update(employee_id uuid, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp        public.employees%rowtype;
  v_allowed    text[] := array[
    'name', 'gender', 'grade', 'cadre',
    'date_first_appt', 'date_present_appt', 'dob',
    'phone', 'lga', 'station', 'address', 'photo',
    'step', 'remarks'
  ];
  v_key        text;
begin
  select * into v_emp from public.employees where id = employee_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'No employee record was found for this PSN.');
  end if;

  if v_emp.self_service_submitted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'These details have already been submitted.');
  end if;

  if jsonb_typeof(changes) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'Invalid update payload.');
  end if;

  for v_key in select jsonb_object_keys(changes) loop
    if not (v_key = any (v_allowed)) then
      return jsonb_build_object('ok', false, 'error', 'Field "' || v_key || '" cannot be updated through self-service.');
    end if;
    if jsonb_typeof(changes -> v_key) not in ('string', 'null') then
      return jsonb_build_object('ok', false, 'error', 'Invalid value for "' || v_key || '".');
    end if;
  end loop;

  if nullif(changes ->> 'name', '') is null then
    return jsonb_build_object('ok', false, 'error', 'Name cannot be empty.');
  end if;

  update public.employees e set
    name               = case when changes ? 'name'               then changes ->> 'name'               else e.name end,
    gender             = case when changes ? 'gender'             then nullif(changes ->> 'gender', '') else e.gender end,
    grade              = case when changes ? 'grade'              then nullif(changes ->> 'grade', '')  else e.grade end,
    cadre              = case when changes ? 'cadre'              then nullif(changes ->> 'cadre', '')  else e.cadre end,
    date_first_appt    = case when changes ? 'date_first_appt'    then nullif(changes ->> 'date_first_appt', '')    ::date else e.date_first_appt end,
    date_present_appt  = case when changes ? 'date_present_appt'  then nullif(changes ->> 'date_present_appt', '')  ::date else e.date_present_appt end,
    dob                = case when changes ? 'dob'                then nullif(changes ->> 'dob', '')                ::date else e.dob end,
    phone              = case when changes ? 'phone'              then nullif(changes ->> 'phone', '')      else e.phone end,
    lga                = case when changes ? 'lga'                then nullif(changes ->> 'lga', '')        else e.lga end,
    station            = case when changes ? 'station'            then nullif(changes ->> 'station', '')    else e.station end,
    address            = case when changes ? 'address'            then nullif(changes ->> 'address', '')    else e.address end,
    photo              = case when changes ? 'photo'              then nullif(changes ->> 'photo', '')      else e.photo end,
    step               = case when changes ? 'step'               then nullif(changes ->> 'step', '')       else e.step end,
    remarks            = case when changes ? 'remarks'            then nullif(changes ->> 'remarks', '')    else e.remarks end,
    updated_at             = now(),
    self_service_submitted_at = now()
  where e.id = employee_id;

  insert into public.audit_log (id, user_id, user_email, user_role, action, table_name, row_id, details)
  values (gen_random_uuid(), null, null, null, 'update', 'employees', employee_id,
          jsonb_build_object('source', 'self_service', 'changes', changes));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submit_self_service_update(uuid, jsonb) from public;
grant execute on function public.submit_self_service_update(uuid, jsonb) to anon;
grant execute on function public.submit_self_service_update(uuid, jsonb) to authenticated;

-- Admin-only escape hatch: clears the one-shot lockout for one officer so
-- they can update again (used for testing / corrections). Audited.
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
grant execute on function public.reset_self_service_lock(text) to authenticated;
