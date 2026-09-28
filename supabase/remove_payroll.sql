-- ============================================================================
-- AMEB EMS — Remove Payroll & Salary
-- ----------------------------------------------------------------------------
-- ⚠️ DESTRUCTIVE — RUN ONCE, ONLY IF YOU ARE SURE.
--
-- The Board does not pay salaries from this system, so the payroll module and
-- the salary field have been removed from the app. This script removes what is
-- left in the database:
--
--   payroll_lines            dropped (individual entries per run)
--   payroll_runs             dropped (published months)
--   employees.basic_salary   dropped (⚠ the salary amounts are deleted for good)
--
-- `employees.step` is KEPT — it is a grade-progression detail, not a money
-- amount. Nothing else in the register changes.
--
-- HOW TO RUN:
--   1. Take a Backup Register export first (sidebar → Backup Register) if you
--      want a copy of the salary figures before they go.
--   2. Supabase dashboard → "SQL Editor" → "New query" → paste → "Run".
--   3. Re-run `setup_selfservice.sql` afterwards, so the self-service portal's
--      lookup function stops returning and accepting a salary field.
--      (setup_selfservice.sql drops and recreates its functions, so it upgrades
--      safely — without it, the portal would error on the missing column.)
--
-- Safe to run more than once.
-- ============================================================================

-- ── Payroll tables ──────────────────────────────────────────────────────────
-- `cascade` so the dependent payroll_lines rows/constraints come along even if
-- the two tables are dropped in either order.
drop table if exists public.payroll_lines cascade;
drop table if exists public.payroll_runs cascade;

-- ── Salary amount ───────────────────────────────────────────────────────────
alter table public.employees drop column if exists basic_salary;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect: no rows (tables gone) and no basic_salary column.
select table_name
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('payroll_runs', 'payroll_lines');

select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'employees'
   and column_name = 'basic_salary';
