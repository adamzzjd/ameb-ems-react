-- ============================================================================
-- AMEB EMS — Leave management
-- ----------------------------------------------------------------------------
-- Leave requests (annual, sick, study, maternity, paternity, casual) with an
-- approval workflow. Working-day counts and balances are computed in the app
-- (see src/lib/leave.ts); this table holds the requests and their status.
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard → SQL Editor → New query
--   2. Paste this entire file and click "Run"
--   3. (Safe to run multiple times — uses IF NOT EXISTS / DROP POLICY IF EXISTS)
--   4. Run setup_rls.sql afterwards (or re-run it — it is idempotent) so the
--      auth_role() helper is guaranteed to exist.
--
-- ACCESS MODEL (mirrors employees; approval is an admin action)
--   select : any signed-in user (any role)
--   insert : data_collector+ (the same roles who can edit employees)
--   update : admin+ (approve / reject)
--   delete : admin+
-- ============================================================================

create table if not exists public.leaves (
  id           uuid primary key,
  employee_id  uuid not null references public.employees(id) on delete cascade,
  leave_type   text not null,        -- Annual | Sick | Study | Maternity | Paternity | Casual
  start_date   date not null,
  end_date     date not null,
  days         int not null,         -- working days (Mon–Fri)
  reason       text not null default '',
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  decided_by   uuid,
  decided_at   timestamptz,
  decided_note text,
  created_by   uuid,
  created_at   timestamptz not null default now()
);

create index if not exists leaves_employee_idx on public.leaves (employee_id, created_at desc);
create index if not exists leaves_status_idx on public.leaves (status, created_at desc);

alter table public.leaves enable row level security;

drop policy if exists "leaves_select" on public.leaves;
create policy "leaves_select" on public.leaves
  for select using (public.auth_role() is not null);

drop policy if exists "leaves_insert" on public.leaves;
create policy "leaves_insert" on public.leaves
  for insert with check (public.auth_role() in ('data_collector', 'admin', 'super_admin'));

drop policy if exists "leaves_update" on public.leaves;
create policy "leaves_update" on public.leaves
  for update using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "leaves_delete" on public.leaves;
create policy "leaves_delete" on public.leaves
  for delete using (public.auth_role() in ('admin', 'super_admin'));
