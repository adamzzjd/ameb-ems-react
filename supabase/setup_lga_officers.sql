-- ============================================================================
-- AMEB EMS — LGA Area Officers Setup
-- ----------------------------------------------------------------------------
-- Adds the Local Government Area Officers register:
--
--   lga_area_officers     one row per LGA (unique `lga`), each pointing at a
--                         staff member in the `employees` register.
--
-- One officer per LGA, and the officer must come from the staff register —
-- `employee_id` is a foreign key to `employees`. Deleting the staff record
-- clears the assignment (on delete set null) rather than dropping the LGA row.
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard → "SQL Editor" → "New query"
--   2. Paste this entire file and click "Run"
--   3. Then re-run `setup_rls.sql` so the new table gets its RLS policies.
--      (Safe to run multiple times.)
-- ============================================================================

-- ── LGA Area Officers (one officer per LGA) ─────────────────────────────────
create table if not exists public.lga_area_officers (
  id          uuid primary key,
  lga         text not null unique,
  employee_id uuid references public.employees(id) on delete set null,
  remarks     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists lga_area_officers_employee_idx
  on public.lga_area_officers (employee_id);

-- ── Access ───────────────────────────────────────────────────────────────────
-- ⚠️ SECURITY: re-run `setup_rls.sql` after this file — it enables RLS on the
-- new table with the same access model as stations/cadres/centres
-- (any signed-in user can read; admin+ can write).
