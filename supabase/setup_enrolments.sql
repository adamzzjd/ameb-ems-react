-- ============================================================================
-- AMEB EMS — Enrolment Statistics & Public Centre Directory
-- ----------------------------------------------------------------------------
--   enrolment_stats   per-year learner outcomes (managed from the CMS, shown
--                     live on the public site hero stats)
--   public_centres    safe public projection of the centres register with
--                     facilitator names; used by the public "Find a Learning
--                     Centre" directory
--
-- HOW TO RUN:
--   Supabase dashboard → SQL Editor → New query → paste → Run
--   Then re-run `setup_rls.sql` so enrolment_stats gets its policies.
--   Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================================

-- ── Enrolment statistics ────────────────────────────────────────────────────
create table if not exists public.enrolment_stats (
  id               uuid primary key default gen_random_uuid(),
  year             integer not null unique,
  learners_enrolled integer not null default 0,
  certified        integer not null default 0,
  dropped_out      integer not null default 0,
  no_exam          integer not null default 0,
  ngos             text[]  not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- No public policies yet — runs deny-all until setup_rls.sql is re-run yet.
alter table public.enrolment_stats enable row level security;

-- ── Public centre directory view ────────────────────────────────────────────
-- The view is now owned by `setup_centre_staff.sql`, which rebuilds it against
-- centre_staff → employees after dropping the facilitator registry. It is not
-- defined here, so the two scripts cannot drift apart — this file only creates
-- the enrolment statistics table.
