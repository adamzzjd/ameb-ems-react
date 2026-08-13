-- ============================================================================
-- AMEB EMS — Employee self-service (PSN update portal)
-- ----------------------------------------------------------------------------
-- Lets an officer manage their own register details using only their staff
-- number (PSN) — no password. Two paths, per the board's model:
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
--     1. check_employee_registration(psn) reports any earlier submission.
--     2. They fill in their full details (PSN + all fields).
--     3. submit_employee_registration() stores them as a PENDING
--        employee_registrations row.
--     4. An admin approves → the employee record is created; or rejects.
--        After approval the officer is in the register and gets their own
--        one-shot direct update like everyone else.
--
-- SECURITY MODEL
--   Anonymous self-service NEVER touches the employees table through RLS —
--   it goes through SECURITY DEFINER functions owned by the table owner that
--   expose a tightly-scoped interface:
--     * self_service_lookup(psn)                — one officer, full editable profile
--     * submit_self_service_update(id, jsonb)   — validated one-shot DIRECT update
--     * check_employee_registration(psn)        — status of an earlier submission
--     * submit_employee_registration(psn, jsonb)— validated PENDING registration
--   employee_registrations itself is only readable/writable by admin+ through
--   normal RLS policies (no insert policy — the function creates rows).
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

-- ── 1.5. Supersede the earlier change-request design ───────────────────────
-- The original draft kept pending changes for existing officers in
-- employee_update_requests. The board simplified the model (existing officers
-- update directly; only NEW officers need approval), so that table is replaced
-- by employee_registrations below. Pre-production cleanup — drop if present.
drop table if exists public.employee_update_requests;

-- ── 2. New-officer registrations (pending → admin approval) ────────────────
create table if not exists public.employee_registrations (
  id              uuid primary key,
  psn             text not null,
  full_name       text not null,
  requested_data  jsonb not null,       -- all submitted fields except psn
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  submitted_at    timestamptz not null default now(),
  decided_by      uuid,
  decided_at      timestamptz,
  decided_note    text
);

-- One pending/approved registration per PSN (case-insensitive).
create unique index if not exists employee_registrations_psn_unique
  on public.employee_registrations (lower(psn)) where status in ('pending', 'approved');

create index if not exists employee_registrations_status_idx
  on public.employee_registrations (status, submitted_at desc);

alter table public.employee_registrations enable row level security;

-- admin+ only: the review queue reads, approvals and rejections.
drop policy if exists "registrations_select" on public.employee_registrations;
create policy "registrations_select" on public.employee_registrations
  for select using (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "registrations_update" on public.employee_registrations;
create policy "registrations_update" on public.employee_registrations
  for update using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "registrations_delete" on public.employee_registrations;
create policy "registrations_delete" on public.employee_registrations
  for delete using (public.auth_role() in ('admin', 'super_admin'));

-- ── 3. Anonymous self-service functions ──────────────────────────────────────
-- One officer by exact PSN, full editable profile (everything except PSN and
-- the lockout timestamp, which surfaces as `already_submitted`).
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
  basic_salary       numeric,
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
    e.basic_salary, e.step, e.remarks,
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
    'basic_salary', 'step', 'remarks'
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
    if v_key = 'basic_salary' then
      if jsonb_typeof(changes -> v_key) not in ('number', 'string', 'null') then
        return jsonb_build_object('ok', false, 'error', 'Invalid value for "basic_salary".');
      end if;
    elsif jsonb_typeof(changes -> v_key) not in ('string', 'null') then
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
    basic_salary       = case when changes ? 'basic_salary'       then nullif(changes ->> 'basic_salary', '')::numeric else e.basic_salary end,
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

-- Status of an earlier new-officer submission (for the "not found" flow).
create or replace function public.check_employee_registration(psn text)
returns table (
  status       text,
  full_name    text,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.status, r.full_name, r.submitted_at
  from public.employee_registrations r
  where lower(r.psn) = lower(check_employee_registration.psn)
  order by r.submitted_at desc
  limit 1;
$$;

revoke all on function public.check_employee_registration(text) from public;
grant execute on function public.check_employee_registration(text) to anon;
grant execute on function public.check_employee_registration(text) to authenticated;

-- Submit a new officer's registration for approval. Validates the PSN is not
-- already in the register and not already submitted, and that `changes` only
-- contains editable fields with string/null (or numeric) values. Returns
-- { ok, request_id?, error? }.
create or replace function public.submit_employee_registration(psn text, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed    text[] := array[
    'name', 'gender', 'grade', 'cadre',
    'date_first_appt', 'date_present_appt', 'dob',
    'phone', 'lga', 'station', 'address', 'photo',
    'basic_salary', 'step', 'remarks'
  ];
  v_key        text;
  v_psn        text := btrim(psn);
  v_request_id uuid;
begin
  if v_psn = '' then
    return jsonb_build_object('ok', false, 'error', 'PSN is required.');
  end if;

  if exists (select 1 from public.employees e where lower(e.psn) = lower(v_psn)) then
    return jsonb_build_object('ok', false, 'error', 'This PSN is already in the register — use the update form instead.');
  end if;

  if exists (select 1 from public.employee_registrations r
             where lower(r.psn) = lower(v_psn) and r.status in ('pending', 'approved')) then
    return jsonb_build_object('ok', false, 'error', 'A registration for this PSN has already been submitted.');
  end if;

  if jsonb_typeof(changes) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'Invalid registration payload.');
  end if;

  for v_key in select jsonb_object_keys(changes) loop
    if not (v_key = any (v_allowed)) then
      return jsonb_build_object('ok', false, 'error', 'Field "' || v_key || '" is not allowed.');
    end if;
    if v_key = 'basic_salary' then
      if jsonb_typeof(changes -> v_key) not in ('number', 'string', 'null') then
        return jsonb_build_object('ok', false, 'error', 'Invalid value for "basic_salary".');
      end if;
    elsif jsonb_typeof(changes -> v_key) not in ('string', 'null') then
      return jsonb_build_object('ok', false, 'error', 'Invalid value for "' || v_key || '".');
    end if;
  end loop;

  if nullif(changes ->> 'name', '') is null then
    return jsonb_build_object('ok', false, 'error', 'Name is required.');
  end if;

  v_request_id := gen_random_uuid();
  insert into public.employee_registrations (id, psn, full_name, requested_data, status, submitted_at)
  values (v_request_id, v_psn, btrim(changes ->> 'name'), changes, 'pending', now());

  insert into public.audit_log (id, user_id, user_email, user_role, action, table_name, row_id, details)
  values (gen_random_uuid(), null, null, null, 'create', 'employee_registrations', v_request_id,
          jsonb_build_object('psn', v_psn, 'name', btrim(changes ->> 'name')));

  return jsonb_build_object('ok', true, 'request_id', v_request_id);
end;
$$;

revoke all on function public.submit_employee_registration(text, jsonb) from public;
grant execute on function public.submit_employee_registration(text, jsonb) to anon;
grant execute on function public.submit_employee_registration(text, jsonb) to authenticated;
