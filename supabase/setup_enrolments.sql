-- ============================================================================
-- AMEB EMS — Enrolment Statistics + Public Learning Centre Directory
-- ----------------------------------------------------------------------------
-- Adds:
--   enrolment_stats   (per-year learner figures: enrolled, certified, dropped
--                      out, did-not-write-exam, and NGOs involved that year)
--   public_centres    (view — safe public projection of the centres register
--                      with facilitator names; used by the public "Find a
--                      Learning Center" directory on the Landing page)
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard → SQL Editor → New query
--   2. Paste this entire file and click "Run"
--   3. (Safe to run multiple times — uses IF NOT EXISTS / CREATE OR REPLACE)
--   4. Run setup_rls.sql afterwards (it adds the RLS policies for the new
--      table) — or just re-run setup_rls.sql, it is idempotent.
-- ============================================================================

-- ── Enrolment stats (per-year record) ───────────────────────────────────────
-- One row per year. `ngos` holds the names of NGOs that supported programmes
-- in that year (Postgres text array).
create table if not exists public.enrolment_stats (
  id                uuid primary key,
  year              integer not null unique,
  learners_enrolled integer not null default 0,   -- total learners enrolled that year
  certified         integer not null default 0,   -- learners issued certificates
  dropped_out       integer not null default 0,   -- learners who withdrew
  no_exam           integer not null default 0,   -- learners who did not sit the exam
  ngos              text[] not null default '{}', -- NGOs involved that year
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Enable RLS immediately (deny-all until setup_rls.sql adds the policies), so
-- the table is never writable by anon keys even if setup_rls.sql hasn't been
-- re-run yet.
alter table public.enrolment_stats enable row level security;

-- ── Public centre directory view ────────────────────────────────────────────
-- Exposes only public-facing centre fields plus facilitator names (never
-- remarks or other internal columns). Because views run with the owner's
-- privileges, anon/authenticated users can read this projection even though
-- RLS protects the underlying centres/facilitators tables.
-- Guarded: requires the Phase 9 facilitator tables (centre_facilitators +
-- facilitators from setup_facilitators.sql) to exist.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public'
               and table_name in ('centre_facilitators', 'facilitators'))
  then
    -- Drop-first: see setup_partners.sql — "create or replace" fails with 42P16
    -- when an older public_centres has different columns. Re-granted below.
    -- Note: no ngo_partner — the column was dropped in Phase 27; partner names
    -- resolve via the partner_org_id join in the fuller view definitions.
    drop view if exists public.public_centres;
    create view public.public_centres as
    select
      c.id,
      c.name,
      c.lga,
      c.ward,
      c.community,
      c.type,
      c.status,
      c.capacity,
      c.phone,
      coalesce(
        array_agg(f.name order by f.name) filter (where f.name is not null),
        '{}'::text[]
      ) as facilitators
    from public.centres c
    left join public.centre_facilitators cf on cf.centre_id = c.id
    left join public.facilitators f on f.id = cf.facilitator_id
    group by c.id;

    -- Allow the public (anon key) and any signed-in user to read the view.
    grant select on public.public_centres to anon, authenticated, service_role;
  end if;
end $$;
