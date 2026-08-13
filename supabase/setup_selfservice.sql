-- ============================================================================
-- AMEB EMS — Employee self-service (PSN update portal)
-- ----------------------------------------------------------------------------
-- Lets an officer update their OWN personal details using only their staff
-- number (PSN) — no password. The flow is anonymous, one-shot and admin-gated:
--
--   1. Officer enters their PSN → self_service_lookup() returns their own
--      limited profile (name, PSN, phone, LGA, address, photo) — nothing else,
--      and no way to enumerate other officers.
--   2. Officer edits personal fields → review screen → submit.
--   3. submit_self_service_update() validates the fields, stores the change
--      request as PENDING and stamps employees.self_service_submitted_at
--      (the one-shot lockout — this PSN can never submit again).
--   4. An admin approves the request in the portal (Update Requests page),
--      which applies the changes to the employee record + audit trail; or
--      rejects it with a note.
--
-- SECURITY MODEL
--   The anonymous self-service access is NOT done through RLS policies on the
--   employees table (that would let anyone read/enumerate the register).
--   Instead it goes through two SECURITY DEFINER functions owned by the table
--   owner that expose a tightly-scoped interface:
--     * self_service_lookup(psn)              — one officer, personal fields only
--     * submit_self_service_update(id, jsonb) — validated, one-shot pending insert
--   The employee_update_requests table itself is only readable/writable by
--   admin+ roles through normal RLS policies.
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

-- ── 2. Pending update requests ──────────────────────────────────────────────
create table if not exists public.employee_update_requests (
  id                 uuid primary key,
  employee_id        uuid not null references public.employees(id) on delete cascade,
  requested_changes  jsonb not null,       -- { phone?, lga?, address?, photo? } new values
  status             text not null default 'pending'
                     check (status in ('pending', 'approved', 'rejected')),
  submitted_at       timestamptz not null default now(),
  decided_by         uuid,
  decided_at         timestamptz,
  decided_note       text
);

create index if not exists update_requests_status_idx on public.employee_update_requests (status, submitted_at desc);
create index if not exists update_requests_employee_idx on public.employee_update_requests (employee_id);

alter table public.employee_update_requests enable row level security;

-- admin+ only: review queue reads, approvals and rejections.
drop policy if exists "update_requests_select" on public.employee_update_requests;
create policy "update_requests_select" on public.employee_update_requests
  for select using (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "update_requests_update" on public.employee_update_requests;
create policy "update_requests_update" on public.employee_update_requests
  for update using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "update_requests_delete" on public.employee_update_requests;
create policy "update_requests_delete" on public.employee_update_requests
  for delete using (public.auth_role() in ('admin', 'super_admin'));

-- No INSERT policy: new requests are only ever created by the SECURITY DEFINER
-- submit function below (runs with the table owner's privileges).

-- ── 3. Anonymous self-service functions ──────────────────────────────────────
-- One officer by exact PSN, personal fields only. `already_submitted` lets the
-- portal show the one-shot "already updated" message.
create or replace function public.self_service_lookup(psn text)
returns table (
  id                uuid,
  name              text,
  psn               text,
  phone             text,
  lga               text,
  address           text,
  photo             text,
  already_submitted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.name,
    e.psn,
    e.phone,
    e.lga,
    e.address,
    e.photo,
    e.self_service_submitted_at is not null
  from public.employees e
  where e.psn = self_service_lookup.psn
  limit 1;
$$;

revoke all on function public.self_service_lookup(text) from public;
grant execute on function public.self_service_lookup(text) to anon;
grant execute on function public.self_service_lookup(text) to authenticated;

-- Submit a one-shot personal-details change request. Validates that the
-- employee exists, hasn't already submitted, and that `changes` only contains
-- allowed personal fields (phone, lga, address, photo) with string/null values.
-- On success: inserts a PENDING request and stamps the lockout timestamp.
-- Returns { ok, error?, request_id? }.
create or replace function public.submit_self_service_update(employee_id uuid, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp         public.employees%rowtype;
  v_allowed     text[] := array['phone', 'lga', 'address', 'photo'];
  v_key         text;
  v_request_id  uuid;
begin
  select * into v_emp from public.employees where id = employee_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'No employee record was found for this PSN.');
  end if;

  if v_emp.self_service_submitted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'These details have already been submitted for review.');
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

  v_request_id := gen_random_uuid();
  insert into public.employee_update_requests (id, employee_id, requested_changes, status, submitted_at)
  values (v_request_id, employee_id, changes, 'pending', now());

  update public.employees
  set self_service_submitted_at = now()
  where id = employee_id;

  return jsonb_build_object('ok', true, 'request_id', v_request_id);
end;
$$;

revoke all on function public.submit_self_service_update(uuid, jsonb) from public;
grant execute on function public.submit_self_service_update(uuid, jsonb) to anon;
grant execute on function public.submit_self_service_update(uuid, jsonb) to authenticated;
