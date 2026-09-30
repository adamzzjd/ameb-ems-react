-- ============================================================================
-- AMEB EMS — Programmes, Cohorts & Learner Register (Phases 21-23)
-- ----------------------------------------------------------------------------
-- Adds the programme-delivery data model:
--   programmes   a course/programme the board or a partner delivers
--   cohorts      a delivery of a programme at a centre over a period
--   learners     people enrolled in a cohort (the learner register)
--
-- Design notes
--   • programmes/cohorts/learners carry owner_org_id (nullable = board-owned).
--     RLS scopes partner users to their own organisation exactly like centres;
--     board staff see everything.
--   • learners are NOT staff-register employees — this is the public-facing
--     learner register (adults, youths, out-of-school children).
--   • No money fields anywhere (pay is outside this system).
--
-- HOW TO RUN:
--   1. Run AFTER `setup_ems.sql` (centres) and `setup_partners.sql`
--      (partner_organisations) — the FKs below point at those tables.
--   2. Supabase dashboard → SQL Editor → paste → Run (idempotent, safe to
--      re-run).
--   3. Re-run `setup_rls.sql` afterwards — it adds the RLS policies.
-- ============================================================================

-- ── Preflight: fail early with a clear message, not a cryptic FK error ──────
do $preflight$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'partner_organisations') then
    raise exception 'setup_delivery.sql: public.partner_organisations is missing — run supabase/setup_partners.sql first';
  end if;
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'centres') then
    raise exception 'setup_delivery.sql: public.centres is missing — run supabase/setup_ems.sql first';
  end if;
end
$preflight$;

-- ── Programmes (delivery catalogue) ─────────────────────────────────────────
create table if not exists public.programmes (
  id              uuid primary key,
  title           text not null,
  description     text not null default '',
  category        text,                          -- Literacy | Vocational | Youth | Women | Other
  duration_weeks  integer,
  status          text not null default 'active',-- active | paused | closed
  owner_org_id    uuid references public.partner_organisations(id) on delete set null,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.programmes enable row level security;

create index if not exists programmes_owner_idx on public.programmes (owner_org_id);

-- ── Cohorts (a programme delivered at a centre) ─────────────────────────────
create table if not exists public.cohorts (
  id              uuid primary key,
  programme_id    uuid not null references public.programmes(id) on delete cascade,
  centre_id       uuid not null references public.centres(id) on delete cascade,
  name            text not null default '',
  start_date      text,                          -- ISO yyyy-mm-dd
  end_date        text,
  status          text not null default 'planned', -- planned | running | completed | cancelled
  capacity        integer,
  owner_org_id    uuid references public.partner_organisations(id) on delete set null,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.cohorts enable row level security;

create index if not exists cohorts_programme_idx on public.cohorts (programme_id);
create index if not exists cohorts_centre_idx   on public.cohorts (centre_id);
create index if not exists cohorts_owner_idx    on public.cohorts (owner_org_id);

-- ── Learners (the learner register) ─────────────────────────────────────────
-- One row per enrolled person. psn is intentionally absent — learners are not
-- employees. reference_no is a board/partner-issued enrolment number.
create table if not exists public.learners (
  id              uuid primary key,
  reference_no    text,
  full_name       text not null,
  gender          text,                          -- Male | Female | Other
  age_group       text,                          -- Out-of-school child | Youth (15-24) | Adult (25+)
  phone           text,
  lga             text,
  community       text,
  cohort_id       uuid references public.cohorts(id) on delete set null,
  status          text not null default 'active', -- active | completed | dropped_out | transferred
  enrolled_on     text,
  completed_on    text,
  notes           text,
  owner_org_id    uuid references public.partner_organisations(id) on delete set null,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.learners enable row level security;

create index if not exists learners_cohort_idx  on public.learners (cohort_id);
create index if not exists learners_owner_idx   on public.learners (owner_org_id);
create index if not exists learners_lga_idx     on public.learners (lga);

-- Enrolment numbers are unique when present.
create unique index if not exists learners_reference_no_unique
  on public.learners (reference_no) where reference_no is not null;

-- ── Convenience view: cohort + programme + centre in one row ────────────────
-- Used by the learner register's cohort picker and the M&E dashboard.
-- Re-created (drop + create, never "create or replace") so a column change
-- can't trip Postgres' "cannot change name of view column" error, and
-- SECURITY INVOKER so the caller's RLS applies — without it, partner users
-- would see every organisation's cohorts through the view.
drop view if exists public.cohort_overview;
create view public.cohort_overview with (security_invoker = true) as
select
  co.id,
  co.name,
  co.status       as cohort_status,
  co.start_date,
  co.end_date,
  co.capacity,
  co.owner_org_id,
  p.id            as programme_id,
  p.title         as programme_title,
  p.category      as programme_category,
  c.id            as centre_id,
  c.name          as centre_name,
  c.lga           as centre_lga,
  (select count(*) from public.learners l where l.cohort_id = co.id) as learner_count
from public.cohorts co
join public.programmes p on p.id = co.programme_id
join public.centres   c on c.id = co.centre_id;

grant select on public.cohort_overview to authenticated;
grant select on public.programmes to authenticated;
grant select on public.cohorts to authenticated;
grant select on public.learners to authenticated;
