-- ============================================================================
-- AMEB EMS — Board & Partner Hierarchy (Phase 28.1)
-- ----------------------------------------------------------------------------
-- The "total but not total separation" migration:
--
--   BOARD side                              PARTNER side
--   ────────────                            ────────────
--   departments (units of the Board)        organisation_lga_coverage
--    └ employees.department_id               (which LGAs an org works in)
--   board programmes (owner_org_id null)    programmes (owner_org_id = org)
--   board_assets                            programme_lgas (LGA scope)
--   correspondence                           └ centres ◇ centre_organisations
--                                             (lead + partner orgs per centre)
--
--   centres become the meeting point: a centre can host the Board AND several
--   organisations at once (one lead + partners), each running their own
--   programmes/cohorts inside it. Centres.owner_type says who runs the place;
--   centre_organisations says who is involved.
--
-- HOW TO RUN:
--   1. Supabase dashboard → SQL Editor → paste → Run (idempotent).
--      Must run AFTER setup_ems.sql, setup_partners.sql, setup_delivery.sql
--      AND setup_canonical_links.sql (needs the lgas table + partner_org_id).
--   2. Re-run `setup_rls.sql` afterwards (adds the §4.11 hierarchy policies).
--   3. NOTIFY pgrst, 'reload schema';  (or just wait a few seconds).
-- ============================================================================

-- ── Preflight ───────────────────────────────────────────────────────────────
do $preflight$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'centres') then
    raise exception 'setup_hierarchy.sql: public.centres is missing — run supabase/setup_ems.sql first';
  end if;
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'partner_organisations') then
    raise exception 'setup_hierarchy.sql: public.partner_organisations is missing — run supabase/setup_partners.sql first';
  end if;
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'lgas') then
    raise exception 'setup_hierarchy.sql: public.lgas is missing — run supabase/setup_canonical_links.sql first';
  end if;
end
$preflight$;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. DEPARTMENTS — the Board's own units (the staff register grows a home)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.departments (
  id          uuid primary key,
  name        text not null,
  code        text,
  description text not null default '',
  head_employee_id uuid references public.employees(id) on delete set null,
  status      text not null default 'active',   -- active | merged | closed
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.departments enable row level security;

create index if not exists departments_status_idx on public.departments (status);
create unique index if not exists departments_name_key on public.departments (lower(btrim(name)));

alter table public.employees add column if not exists department_id uuid
  references public.departments(id) on delete set null;
create index if not exists employees_department_idx on public.employees (department_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. CENTRE ↔ ORGANISATION (many-to-many — the heart of "not total")
--    Replaces the single centres.partner_org_id. Existing values migrate to
--    role='lead' rows; then the column is dropped.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.centre_organisations (
  id          uuid primary key,
  centre_id   uuid not null references public.centres(id) on delete cascade,
  org_id      uuid not null references public.partner_organisations(id) on delete cascade,
  role        text not null default 'partner',  -- lead | partner | funder | host
  created_by  uuid,
  created_at  timestamptz not null default now(),
  unique (centre_id, org_id)
);

alter table public.centre_organisations enable row level security;

create index if not exists centre_orgs_centre_idx on public.centre_organisations (centre_id);
create index if not exists centre_orgs_org_idx    on public.centre_organisations (org_id);

-- Migrate the single-owner column into lead rows, then drop it (same playbook
-- as centres.ngo_partner in Phase 27).
do $co_migration$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'centres' and column_name = 'partner_org_id') then
    insert into public.centre_organisations (id, centre_id, org_id, role, created_by)
    select gen_random_uuid(), c.id, c.partner_org_id, 'lead', null
    from public.centres c
    where c.partner_org_id is not null
    on conflict (centre_id, org_id) do nothing;

    -- The live public_centres view joins on partner_org_id — drop it here so
    -- the column can go; §7 below re-creates it from the join table.
    drop view if exists public.public_centres;

    -- The §4.6 centres policies reference partner_org_id (Postgres tracks
    -- column dependencies for policies too). Drop them here; re-running
    -- setup_rls.sql afterwards re-creates the schema-aware set (§4.6 writes
    -- different policies depending on whether this column exists).
    drop policy if exists "centres_select" on public.centres;
    drop policy if exists "centres_partner_insert" on public.centres;
    drop policy if exists "centres_partner_update" on public.centres;

    alter table public.centres drop column partner_org_id;
  end if;
end
$co_migration$;

-- At most ONE lead per centre — enforced with a partial unique index (several
-- partners/funders can share a centre, but accountability stays single).
create unique index if not exists centre_orgs_one_lead_idx
  on public.centre_organisations (centre_id)
  where role = 'lead';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. PROGRAMME ↔ LGA SCOPE — where a programme is meant to run
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.programme_lgas (
  programme_id uuid not null references public.programmes(id) on delete cascade,
  lga          text not null references public.lgas(name) on update cascade on delete cascade,
  primary key (programme_id, lga)
);

alter table public.programme_lgas enable row level security;

create index if not exists programme_lgas_lga_idx on public.programme_lgas (lga);

-- ════════════════════════════════════════════════════════════════════════════
-- 4. ORGANISATION ↔ LGA COVERAGE — the LGAs a partner organisation works in
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.organisation_lga_coverage (
  org_id uuid not null references public.partner_organisations(id) on delete cascade,
  lga    text not null references public.lgas(name) on update cascade on delete cascade,
  primary key (org_id, lga)
);

alter table public.organisation_lga_coverage enable row level security;

create index if not exists org_coverage_lga_idx on public.organisation_lga_coverage (lga);

-- Backfill coverage from each org's HQ LGA (a starting point, editable in the
-- app afterwards).
insert into public.organisation_lga_coverage (org_id, lga)
select po.id, po.lga
from public.partner_organisations po
where po.lga is not null
on conflict do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. BOARD ASSETS — property, vehicles, materials (NO money values)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.board_assets (
  id           uuid primary key,
  tag          text not null,
  name         text not null,
  category     text not null default 'Other',   -- Furniture | Vehicle | ICT | Teaching Materials | Equipment | Other
  quantity     integer not null default 1,
  condition    text not null default 'good',    -- new | good | fair | poor | written_off
  -- Where the asset sits — at most one of these is set:
  station_id   uuid references public.stations(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  centre_id    uuid references public.centres(id) on delete set null,
  custodian_employee_id uuid references public.employees(id) on delete set null,
  remarks      text not null default '',
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.board_assets enable row level security;

create unique index if not exists board_assets_tag_key on public.board_assets (upper(btrim(tag)));
create index if not exists board_assets_station_idx   on public.board_assets (station_id);
create index if not exists board_assets_department_idx on public.board_assets (department_id);
create index if not exists board_assets_centre_idx    on public.board_assets (centre_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. CORRESPONDENCE — memos, circulars, minutes per department
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.correspondence (
  id          uuid primary key,
  ref_no      text not null,
  title       text not null,
  kind        text not null default 'memo',     -- memo | circular | minutes | letter
  direction   text not null default 'internal', -- incoming | outgoing | internal
  department_id uuid references public.departments(id) on delete set null,
  date_issued text,                             -- ISO yyyy-mm-dd
  parties     text not null default '',         -- free text: who it involves
  file_name   text,
  mime_type   text,
  size_bytes  bigint,
  url         text,                             -- storage URL (optional)
  status      text not null default 'filed',    -- draft | filed | archived
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.correspondence enable row level security;

create unique index if not exists correspondence_ref_key on public.correspondence (upper(btrim(ref_no)));
create index if not exists correspondence_department_idx on public.correspondence (department_id, date_issued desc);

-- ════════════════════════════════════════════════════════════════════════════
-- 7. Re-create public_centres: partner_name now comes via centre_organisations
--    (the lead org wins; ties broken alphabetically). Drop-first per the
--    project convention. Still owner-rights by design (anon reads directory).
-- ════════════════════════════════════════════════════════════════════════════
do $public_centres$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'centre_facilitators')
     and exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'facilitators')
  then
    drop view if exists public.public_centres;

    create view public.public_centres as
    select
      c.id, c.name, c.lga, c.ward, c.community, c.type, c.status,
      c.capacity, c.phone,
      c.owner_type, c.centre_code,
      lead.name as partner_name,
      coalesce(
        array_agg(distinct f.name) filter (where f.name is not null),
        '{}'::text[]
      ) as facilitators,
      coalesce(
        array_agg(distinct org.name) filter (where org.name is not null and co.role <> 'lead'),
        '{}'::text[]
      ) as partner_orgs
    from public.centres c
    left join public.centre_organisations co on co.centre_id = c.id
    left join public.partner_organisations lead
           on lead.id = co.org_id and co.role = 'lead'
    left join public.partner_organisations org on org.id = co.org_id
    left join public.centre_facilitators cf on cf.centre_id = c.id
    left join public.facilitators f on f.id = cf.facilitator_id
    where c.approval_status = 'approved'
    group by c.id, lead.name;
  else
    -- Pre-facilitators schema: same shape, without the facilitator names.
    drop view if exists public.public_centres;

    create view public.public_centres as
    select
      c.id, c.name, c.lga, c.ward, c.community, c.type, c.status,
      c.capacity, c.phone,
      c.owner_type, c.centre_code,
      lead.name as partner_name,
      '{}'::text[] as facilitators,
      coalesce(
        array_agg(distinct org.name) filter (where org.name is not null and co.role <> 'lead'),
        '{}'::text[]
      ) as partner_orgs
    from public.centres c
    left join public.centre_organisations co on co.centre_id = c.id
    left join public.partner_organisations lead
           on lead.id = co.org_id and co.role = 'lead'
    left join public.partner_organisations org on org.id = co.org_id
    where c.approval_status = 'approved'
    group by c.id, lead.name;
  end if;

  grant select on public.public_centres to anon, authenticated, service_role;
end
$public_centres$;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. Verification checklist — run these after the script; fix what they name.
-- ════════════════════════════════════════════════════════════════════════════
-- (Preview BEFORE running, to see which centres will get which lead row:)
--   select c.name, po.name as lead_org
--   from public.centres c
--   join public.partner_organisations po on po.id = c.partner_org_id;
--
-- (After running: centres that used to have a partner but got none migrated —
--  shouldn't happen, the FK guaranteed the org existed.)
--   select c.id, c.name from public.centres c
--   where not exists (select 1 from public.centre_organisations co where co.centre_id = c.id)
--     and exists (select 1 from information_schema.columns
--                 where table_schema='public' and table_name='centres' and column_name='partner_org_id');
--
-- (Programmes with no LGA scope yet — scope them in the app):
--   select p.id, p.title, p.owner_org_id from public.programmes p
--   where not exists (select 1 from public.programme_lgas pl where pl.programme_id = p.id);
