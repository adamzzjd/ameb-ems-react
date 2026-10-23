-- ── Learners register ────────────────────────────────────────────────────────
-- The `learners` table already exists (it shipped with the partner-portal
-- schema) but records carried no place of learning: a learner could only reach
-- a centre through a cohort, and no cohorts exist. This adds a direct link so
-- the board can record learners per learning centre without setting up intakes
-- first. `cohort_id` stays, so learners can still be grouped into a cohort
-- later.
--
-- Row-level security is already in place: learners are visible to staff roles
-- only (names and phone numbers are personal data), never to the public site.
--   select  → can_view_staff_register()  (super_admin, admin, meb_officer,
--             lga_officer, data_collector, staff, mne_viewer)
--   write   → admin, meb_officer, lga_officer, data_collector, enumerator
--
-- Run once in the Supabase SQL editor (or `node scripts/run-sql.mjs
-- supabase/setup_learners.sql`). Safe to re-run.

alter table public.learners
  add column if not exists centre_id uuid references public.centres(id) on delete set null;

create index if not exists learners_centre_idx on public.learners (centre_id);
create index if not exists learners_status_idx on public.learners (status);
create index if not exists learners_name_idx   on public.learners (full_name);

-- ── Verify ───────────────────────────────────────────────────────────────────
-- Every learner is attached to a centre, or explicitly unassigned:
--   select status, count(*),
--          count(centre_id) as with_centre
--     from public.learners group by status order by status;
