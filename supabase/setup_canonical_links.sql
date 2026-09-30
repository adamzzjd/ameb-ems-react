-- ============================================================================
-- AMEB EMS — Canonical Links: LGAs, Stations & Partner Ownership (Phase 27)
-- ----------------------------------------------------------------------------
-- Turns "fields that look like relationships" into real ones:
--
--   1. lgas reference table (the statutory 21) — every LGA text column in the
--      system gets a FOREIGN KEY to lgas(name) with ON UPDATE CASCADE, so a
--      typo is rejected at write time instead of silently splitting M&E
--      numbers. App code keeps reading plain text (CSV, print, exports all
--      unchanged).
--   2. employees.station_id — a real FK to the stations table, with sync
--      triggers keeping the legacy employees.station TEXT in step (display,
--      CSV and the self-service functions keep working untouched).
--   3. centres.ngo_partner (free text duplicate of partner_org_id) — values
--      migrated onto partner_org_id where a name matches, then the column is
--      DROPPED. public_centres is re-created to show the partner's name via
--      the join instead.
--
-- HOW TO RUN:
--   1. Supabase dashboard → SQL Editor → paste → Run (idempotent).
--      Must run AFTER setup_ems.sql, setup_partners.sql, setup_delivery.sql.
--   2. Re-run `setup_rls.sql` afterwards (adds the lgas policies).
--   3. The final section prints a checklist of any values that could not be
--      matched — fix those rows in the app, then re-run this script.
-- ============================================================================

-- ── Preflight ───────────────────────────────────────────────────────────────
do $preflight$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'employees') then
    raise exception 'setup_canonical_links.sql: public.employees is missing — run supabase/setup_ems.sql first';
  end if;
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'centres') then
    raise exception 'setup_canonical_links.sql: public.centres is missing — run supabase/setup_ems.sql first';
  end if;
end
$preflight$;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. THE STATUTORY 21 LGAs (reference table)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.lgas (
  name       text primary key,
  created_at timestamptz not null default now()
);

alter table public.lgas enable row level security;

insert into public.lgas (name) values
  ('Demsa'), ('Fufore'), ('Ganye'), ('Girei'), ('Gombi'), ('Guyuk'), ('Hong'),
  ('Jada'), ('Lamurde'), ('Madagali'), ('Maiha'), ('Mayo-Belwa'), ('Michika'),
  ('Mubi North'), ('Mubi South'), ('Numan'), ('Shelleng'), ('Song'), ('Toungo'),
  ('Yola North'), ('Yola South')
on conflict (name) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 1a. Canonicalize existing LGA values, then FK every LGA text column
-- ════════════════════════════════════════════════════════════════════════════
-- Values are matched case-insensitively against the 21 before the FKs land so
-- the constraints never fail on casing ("ganye " → "Ganye").

do $canonicalize$
begin
  -- employees.lga (LGA of origin)
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'employees' and column_name = 'lga') then
    update public.employees e
    set lga = l.name
    from public.lgas l
    where e.lga is not null
      and lower(btrim(e.lga)) = lower(l.name)
      and e.lga <> l.name;
  end if;

  -- centres.lga
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'centres' and column_name = 'lga') then
    update public.centres c
    set lga = l.name
    from public.lgas l
    where c.lga is not null
      and lower(btrim(c.lga)) = lower(l.name)
      and c.lga <> l.name;
  end if;

  -- facilitators.lga
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'facilitators') then
    update public.facilitators f
    set lga = l.name
    from public.lgas l
    where f.lga is not null
      and lower(btrim(f.lga)) = lower(l.name)
      and f.lga <> l.name;
  end if;

  -- learners.lga
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'learners') then
    update public.learners lr
    set lga = l.name
    from public.lgas l
    where lr.lga is not null
      and lower(btrim(lr.lga)) = lower(l.name)
      and lr.lga <> l.name;
  end if;

  -- partner_organisations.lga
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'partner_organisations') then
    update public.partner_organisations po
    set lga = l.name
    from public.lgas l
    where po.lga is not null
      and lower(btrim(po.lga)) = lower(l.name)
      and po.lga <> l.name;
  end if;
end
$canonicalize$;

-- FKs are added only when missing, so the script is safe to re-run. A NULL
-- lga stays legal everywhere (unknown origin is real life); a WRONG lga is
-- impossible from here on.
do $fks$
begin
  if not exists (select 1 from pg_constraint where conname = 'employees_lga_fk') then
    alter table public.employees
      add constraint employees_lga_fk foreign key (lga) references public.lgas(name) on update cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'centres_lga_fk') then
    alter table public.centres
      add constraint centres_lga_fk foreign key (lga) references public.lgas(name) on update cascade;
  end if;
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'facilitators')
     and not exists (select 1 from pg_constraint where conname = 'facilitators_lga_fk') then
    alter table public.facilitators
      add constraint facilitators_lga_fk foreign key (lga) references public.lgas(name) on update cascade;
  end if;
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'learners')
     and not exists (select 1 from pg_constraint where conname = 'learners_lga_fk') then
    alter table public.learners
      add constraint learners_lga_fk foreign key (lga) references public.lgas(name) on update cascade;
  end if;
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'partner_organisations')
     and not exists (select 1 from pg_constraint where conname = 'partner_organisations_lga_fk') then
    alter table public.partner_organisations
      add constraint partner_organisations_lga_fk foreign key (lga) references public.lgas(name) on update cascade;
  end if;
end
$fks$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. employees.station_id — the real link to the stations register
-- ════════════════════════════════════════════════════════════════════════════
alter table public.employees add column if not exists station_id uuid
  references public.stations(id) on delete set null;

create index if not exists employees_station_id_idx on public.employees (station_id);

-- Seed the stations register from the canonical list if empty (idempotent).
insert into public.stations (id, name)
select gen_random_uuid(), x.name
from unnest(array[
  'Yola (HQ)', 'Women Development Centre Malamre', 'Technical College Yola',
  'Mubi', 'Ganye', 'Numan', 'Hong', 'Michika', 'Gombi',
  'Song', 'Girei', 'Fufore', 'Demsa', 'Shelleng', 'Lamurde', 'Guyuk',
  'Jada', 'Mayo-Belwa', 'Madagali', 'Maiha', 'Toungo',
  'Yola North Office', 'Yola South Office', 'Other'
]) as x(name)
where not exists (select 1 from public.stations);

-- Backfill station_id from the legacy text (case/whitespace-insensitive).
update public.employees e
set station_id = s.id
from public.stations s
where e.station_id is null
  and e.station is not null
  and lower(btrim(e.station)) = lower(btrim(s.name));

-- Sync trigger: whichever side is written, both end up canonical.
--   • station text given (CSV import, self-service) → resolve to station_id
--   • station_id given (app) → normalize the text to the register's name
create or replace function public.sync_employee_station()
returns trigger
language plpgsql
as $fn$
begin
  if new.station_id is null and new.station is not null and btrim(new.station) <> '' then
    select s.id into new.station_id
    from public.stations s
    where lower(btrim(s.name)) = lower(btrim(new.station))
    limit 1;
  elsif new.station_id is not null then
    select s.name into new.station
    from public.stations s
    where s.id = new.station_id;
  end if;
  return new;
end
$fn$;

drop trigger if exists employees_station_sync on public.employees;
create trigger employees_station_sync
  before insert or update of station, station_id on public.employees
  for each row execute function public.sync_employee_station();

-- Renaming a station in the register updates every officer posted there.
create or replace function public.sync_station_rename()
returns trigger
language plpgsql
as $fn$
begin
  if new.name is distinct from old.name then
    update public.employees
    set station = new.name
    where station_id = new.id;
  end if;
  return new;
end
$fn$;

drop trigger if exists stations_rename_sync on public.stations;
create trigger stations_rename_sync
  before update of name on public.stations
  for each row execute function public.sync_station_rename();

-- ════════════════════════════════════════════════════════════════════════════
-- 3. centres.ngo_partner → partner_org_id (kill the duplicate)
-- ════════════════════════════════════════════════════════════════════════════
do $ngo_migration$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'centres' and column_name = 'ngo_partner') then
    -- Migrate: text name → the partner organisation with that name (when the
    -- centre doesn't already point at a partner).
    update public.centres c
    set partner_org_id = po.id
    from public.partner_organisations po
    where c.partner_org_id is null
      and c.ngo_partner is not null
      and lower(btrim(c.ngo_partner)) = lower(btrim(po.name));

    drop column public.centres.ngo_partner;  -- single source of truth: partner_org_id
  end if;
end
$ngo_migration$;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Re-create public_centres WITHOUT ngo_partner (dropped above) — the
--    partner's name comes from the partner_organisations join instead.
--    Drop-first per the project convention; still owner-rights by design
--    (anon visitors read the directory).
-- ════════════════════════════════════════════════════════════════════════════
do $public_centres$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'centres') then
    drop view if exists public.public_centres;

    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = 'centre_facilitators')
       and exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = 'facilitators')
       and exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'centres' and column_name = 'partner_org_id')
    then
      create view public.public_centres as
      select
        c.id, c.name, c.lga, c.ward, c.community, c.type, c.status,
        c.capacity, c.phone,
        c.owner_type, c.centre_code,
        po.name as partner_name,
        coalesce(
          array_agg(f.name order by f.name) filter (where f.name is not null),
          '{}'::text[]
        ) as facilitators
      from public.centres c
      left join public.partner_organisations po on po.id = c.partner_org_id
      left join public.centre_facilitators cf on cf.centre_id = c.id
      left join public.facilitators f on f.id = cf.facilitator_id
      where c.approval_status = 'approved'
      group by c.id, po.name;
    else
      -- Pre-partner schema: keep the legacy shape (no approval columns yet).
      create view public.public_centres as
      select
        c.id, c.name, c.lga, c.ward, c.community, c.type, c.status,
        c.capacity, c.phone,
        coalesce(
          array_agg(f.name order by f.name) filter (where f.name is not null),
          '{}'::text[]
        ) as facilitators
      from public.centres c
      left join public.centre_facilitators cf on cf.centre_id = c.id
      left join public.facilitators f on f.id = cf.facilitator_id
      group by c.id;
    end if;

    grant select on public.public_centres to anon, authenticated, service_role;
  end if;
end
$public_centres$;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Verification checklist — run the outputs below; fix what they name.
-- ════════════════════════════════════════════════════════════════════════════
-- Officers whose legacy station text matched no register row (station_id still
-- null). Fix in Manage Stations / the employee form, then re-run this script:
--   select name, station from public.employees where station is not null and station_id is null;
--
-- Centres whose ngo_partner text named no partner organisation (the text is
-- now gone — re-link them via Centres → Edit → Owner):
--   (run BEFORE this script to preview:)
--   select c.name, c.ngo_partner from public.centres c
--   where c.ngo_partner is not null and c.partner_org_id is null;
