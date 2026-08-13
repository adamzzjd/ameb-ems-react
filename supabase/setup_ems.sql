-- ============================================================================
-- AMEB EMS — EMS Register Database Setup
-- ----------------------------------------------------------------------------
-- Creates the core staff-register tables used by the Staff Portal:
--   employees  (staff register — REQUIRED, app shows "Database Setup Required")
--   stations   (posting stations — auto-seeded by the app on first load)
--   cadres     (staff cadres — auto-seeded by the app on first load)
--   centres    (learning centres register)
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. Go to "SQL Editor" → "New query"
--   3. Paste this entire file and click "Run"
--   4. (Safe to run multiple times — uses IF NOT EXISTS)
--
-- NOTE: RLS is disabled on these tables to match the app's architecture, which
-- performs all reads/writes with the Supabase anon key. The `employees` table
-- contains sensitive staff data — see the security warning at the bottom.
-- ============================================================================

-- ── Employees (staff register) ───────────────────────────────────────────────
-- `psn` has a UNIQUE constraint: the app rejects duplicate PSNs on save.
create table if not exists public.employees (
  id                uuid primary key,
  name              text not null default '',
  gender            text,
  grade             text,
  cadre             text,
  date_first_appt   text,
  date_present_appt text,
  dob               text,
  phone             text,
  lga               text,
  psn               text,
  station           text,
  photo             text,
  remarks           text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Add the gender column to databases created before this field existed
-- (Safe to run multiple times — mirrors the cadres.grade migration pattern).
alter table public.employees add column if not exists gender text;

-- Guarantee the unique PSN constraint even if an `employees` table already
-- exists without it (CREATE TABLE IF NOT EXISTS won't retrofit constraints).
-- PostgreSQL has no "ADD CONSTRAINT IF NOT EXISTS", so we check pg_constraint
-- first. If this step fails with a duplicate-key error, your existing data has
-- duplicate PSNs — clean those up first, then re-run.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'employees_psn_key'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees add constraint employees_psn_key unique (psn);
  end if;
end $$;

-- ── Stations (posting stations) ──────────────────────────────────────────────
-- The app auto-seeds the standard station list from src/data/constants.ts the
-- first time this table is empty, so no seed rows are needed here.
create table if not exists public.stations (
  id         uuid primary key,
  name       text not null default '',
  lga        text,
  type       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Cadres (staff cadres) ────────────────────────────────────────────────────
-- The app auto-seeds the standard cadre list from src/data/constants.ts the
-- first time this table is empty, so no seed rows are needed here.
-- `grade` carries the cadre's typical salary grade level (e.g. 'GL 08').
create table if not exists public.cadres (
  id         uuid primary key,
  name       text not null default '',
  grade      text,
  category   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add the grade column to databases created before this field existed
-- (Safe to run multiple times.)
alter table public.cadres add column if not exists grade text;

-- ── Centres (learning centres) ───────────────────────────────────────────────
create table if not exists public.centres (
  id           uuid primary key,
  name         text not null default '',
  lga          text not null default '',
  ward         text,
  community    text,
  type         text,
  status       text not null default 'Active',
  capacity     integer,
  phone        text,
  ngo_partner  text,
  remarks      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Access ───────────────────────────────────────────────────────────────────
-- ⚠️ SECURITY: The `employees` table holds personal staff data (name, phone,
-- DOB, LGA, PSN, photo) and MUST be protected. Run `setup_rls.sql` (after
-- this file) to enable Row Level Security with per-role policies — the role
-- system is enforced in the database, not just the UI.
