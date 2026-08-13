-- ============================================================================
-- AMEB EMS — Payroll (salary fields + monthly payroll runs)
-- ----------------------------------------------------------------------------
-- Adds per-officer salary fields (basic salary + step) to the employees table
-- and creates monthly payroll-run snapshot tables so published months can be
-- revisited later. The Payroll page generates the sheet from live employee
-- data, exports IPPS-style CSV, and snapshots it here on "Publish month".
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard → SQL Editor → New query
--   2. Paste this entire file and click "Run"
--   3. (Safe to run multiple times — uses IF NOT EXISTS / DROP POLICY IF EXISTS)
--   4. Run setup_rls.sql afterwards (or re-run it — it is idempotent) so the
--      auth_role() helper is guaranteed to exist.
--
-- ACCESS MODEL
--   employees.basic_salary / .step : managed through the normal employees
--                                    policies (data_collector+ write).
--   payroll_runs / payroll_lines   : any signed-in user reads; admin+ writes
--                                    (payroll.manage in the UI). Re-publishing
--                                    a month overwrites that month's lines.
-- ============================================================================

-- ── 1. Salary fields on employees ───────────────────────────────────────────
alter table public.employees add column if not exists basic_salary numeric;
alter table public.employees add column if not exists step text;

-- ── 2. Payroll run (one row per published month) ────────────────────────────
create table if not exists public.payroll_runs (
  id          uuid primary key,
  month       int not null check (month between 1 and 12),
  year        int not null,
  label       text not null,          -- e.g. "August 2026"
  total       numeric not null default 0,
  count       int not null default 0,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  unique (month, year)
);

create index if not exists payroll_runs_date_idx on public.payroll_runs (year desc, month desc);

-- ── 3. Payroll lines (snapshot of every officer in a published run) ─────────
create table if not exists public.payroll_lines (
  id           uuid primary key,
  run_id       uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id  uuid not null references public.employees(id) on delete cascade,
  name         text not null,
  psn          text,
  grade        text,
  step         text,
  basic_salary numeric not null default 0,
  allowance    numeric not null default 0,
  gross        numeric not null default 0
);

create index if not exists payroll_lines_run_idx on public.payroll_lines (run_id);

-- ── 4. RLS ──────────────────────────────────────────────────────────────────
alter table public.payroll_runs enable row level security;
alter table public.payroll_lines enable row level security;

drop policy if exists "payroll_runs_select" on public.payroll_runs;
create policy "payroll_runs_select" on public.payroll_runs
  for select using (public.auth_role() is not null);

drop policy if exists "payroll_runs_insert" on public.payroll_runs;
create policy "payroll_runs_insert" on public.payroll_runs
  for insert with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "payroll_runs_update" on public.payroll_runs;
create policy "payroll_runs_update" on public.payroll_runs
  for update using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "payroll_runs_delete" on public.payroll_runs;
create policy "payroll_runs_delete" on public.payroll_runs
  for delete using (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "payroll_lines_select" on public.payroll_lines;
create policy "payroll_lines_select" on public.payroll_lines
  for select using (public.auth_role() is not null);

drop policy if exists "payroll_lines_insert" on public.payroll_lines;
create policy "payroll_lines_insert" on public.payroll_lines
  for insert with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "payroll_lines_delete" on public.payroll_lines;
create policy "payroll_lines_delete" on public.payroll_lines
  for delete using (public.auth_role() in ('admin', 'super_admin'));
