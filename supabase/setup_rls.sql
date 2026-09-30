-- ============================================================================
-- AMEB EMS — Row Level Security (RLS) Setup
-- ----------------------------------------------------------------------------
-- Enforces the role system in the database. Run this AFTER setup.sql,
-- setup_ems.sql, setup_storage.sql, setup_facilitators.sql,
-- setup_lga_officers.sql and setup_partners.sql, in the Supabase dashboard SQL
-- Editor. Safe to run multiple times (drops and recreates policies).
--
-- Roles live on the Supabase auth user's `app_metadata.role`:
--   super_admin | admin | meb_officer | lga_officer | enumerator |
--   data_collector | partner_admin | partner_editor | partner_viewer |
--   mne_viewer | staff
-- Policies read the role straight from the JWT via auth.jwt().
--
-- ACCESS MODEL
--   employees        : ⚠ INTERNAL BOARD ROLES ONLY (can_view_staff_register) —
--                      partner users and enumerators must never read the staff
--                      register. data_collector+ can insert/update; admin+ delete.
--   stations/cadres  : any signed-in internal user can read; admin+ can write.
--   centres          : board staff read all; a partner reads only its own org's
--                      centres. admin+ write anything; a partner may insert/
--                      update its own centres (forced back to 'pending' review
--                      by the enforce_centres_approval trigger).
--   facilitators/centre_facilitators: any signed-in user can read; admin+ can write.
--   lga_area_officers: any signed-in user can read; admin+ can write (one area
--                      officer per LGA, drawn from the staff register).
--   partner_organisations / organisation_members: board reads (super_admin
--                      manages); a partner reads only its own organisation.
--   CMS content      : public read (anon — the Landing page needs it); admin+ write.
--   cms_contacts     : public insert (contact form); admin+ read/update/delete.
-- ============================================================================

-- ── 1. Role helper (reads the role claim from the caller's JWT) ────────────
create or replace function public.auth_role()
returns text
language sql
stable
set search_path = public
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- Internal board staff (all roles that operate the register, including field
-- enumerators). Partner-* roles are deliberately excluded.
-- These two helpers have no table dependencies and are also defined in
-- setup_partners.sql, so either script may be run first.
create or replace function public.is_adsmeb_staff()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in (
    'super_admin', 'admin', 'meb_officer', 'lga_officer',
    'data_collector', 'staff', 'mne_viewer', 'enumerator'
  );
$$;

-- Roles allowed to read the employees register (personal staff data).
-- Enumerators and partner users are excluded.
create or replace function public.can_view_staff_register()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in (
    'super_admin', 'admin', 'meb_officer', 'lga_officer',
    'data_collector', 'staff', 'mne_viewer'
  );
$$;-- ── 2. Enable RLS on all application tables ─────────────────────────────
-- ⚠️ SECURITY: drop any legacy dashboard-created bypass policies first.
-- "full_access" (using true, incl. anon) and "Auth users full access"
-- (any authenticated user) were found live in production masking the real
-- role policies below — every permissive ALL policy ORs together, so the
-- staff register was world-readable/writable until these were removed.
do $drop_bypass$
declare
  stmt text;
begin
  select string_agg(format('drop policy if exists %I on public.%I', policyname, tablename), '; ')
    into stmt
  from pg_policies
  where schemaname = 'public' and policyname = 'full_access';
  if stmt is not null then execute stmt; end if;

  select string_agg(format('drop policy if exists %I on public.%I', policyname, tablename), '; ')
    into stmt
  from pg_policies
  where schemaname = 'public' and policyname = 'Auth users full access';
  if stmt is not null then execute stmt; end if;
end
$drop_bypass$;
────
alter table public.employees      enable row level security;
alter table public.stations       enable row level security;
alter table public.cadres         enable row level security;
alter table public.centres        enable row level security;
alter table public.facilitators       enable row level security;
alter table public.centre_facilitators enable row level security;
alter table public.site_content   enable row level security;
alter table public.cms_programs   enable row level security;
alter table public.cms_news       enable row level security;
alter table public.cms_team       enable row level security;
alter table public.cms_gallery    enable row level security;
alter table public.cms_downloads  enable row level security;
alter table public.cms_contacts   enable row level security;

-- ── 3. Employees (staff register) ───────────────────────────────────────────
-- ⚠️ INTERNAL BOARD ROLES ONLY. This used to allow any signed-in user; now
-- that partner organisations have portal accounts, that would expose every
-- officer's name, phone, DOB, PSN and address to external organisations.
drop policy if exists "employees_select" on public.employees;
create policy "employees_select" on public.employees
  for select
  using (public.can_view_staff_register());

drop policy if exists "employees_insert" on public.employees;
create policy "employees_insert" on public.employees
  for insert
  with check (public.auth_role() in ('data_collector', 'admin', 'super_admin'));

drop policy if exists "employees_update" on public.employees;
create policy "employees_update" on public.employees
  for update
  using (public.auth_role() in ('data_collector', 'admin', 'super_admin'))
  with check (public.auth_role() in ('data_collector', 'admin', 'super_admin'));

drop policy if exists "employees_delete" on public.employees;
create policy "employees_delete" on public.employees
  for delete
  using (public.auth_role() in ('admin', 'super_admin'));

-- ── 4. Stations / Cadres / Centres (read for all users, write for admin+) ──
drop policy if exists "stations_select" on public.stations;
create policy "stations_select" on public.stations
  for select using (public.auth_role() is not null);

drop policy if exists "stations_insert" on public.stations;
create policy "stations_insert" on public.stations
  for insert with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "stations_update" on public.stations;
create policy "stations_update" on public.stations
  for update using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "stations_delete" on public.stations;
create policy "stations_delete" on public.stations
  for delete using (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "cadres_select" on public.cadres;
create policy "cadres_select" on public.cadres
  for select using (public.auth_role() is not null);

drop policy if exists "cadres_insert" on public.cadres;
create policy "cadres_insert" on public.cadres
  for insert with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "cadres_update" on public.cadres;
create policy "cadres_update" on public.cadres
  for update using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "cadres_delete" on public.cadres;
create policy "cadres_delete" on public.cadres
  for delete using (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "centres_select" on public.centres;
create policy "centres_select" on public.centres
  for select using (public.is_adsmeb_staff());

drop policy if exists "centres_insert" on public.centres;
create policy "centres_insert" on public.centres
  for insert with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "centres_update" on public.centres;
create policy "centres_update" on public.centres
  for update using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "centres_delete" on public.centres;
create policy "centres_delete" on public.centres
  for delete using (public.auth_role() in ('admin', 'super_admin'));

-- ── 4.5. Facilitators (registry + centre assignments) ───────────────────────
-- Same access model as stations/cadres/centres: any signed-in user reads,
-- admin+ writes. The join table lets a centre have many facilitators and a
-- facilitator serve many centres.
drop policy if exists "facilitators_select" on public.facilitators;
create policy "facilitators_select" on public.facilitators
  for select using (public.auth_role() is not null);

drop policy if exists "facilitators_insert" on public.facilitators;
create policy "facilitators_insert" on public.facilitators
  for insert with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "facilitators_update" on public.facilitators;
create policy "facilitators_update" on public.facilitators
  for update using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "facilitators_delete" on public.facilitators;
create policy "facilitators_delete" on public.facilitators
  for delete using (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "centre_facilitators_select" on public.centre_facilitators;
create policy "centre_facilitators_select" on public.centre_facilitators
  for select using (public.auth_role() is not null);

drop policy if exists "centre_facilitators_insert" on public.centre_facilitators;
create policy "centre_facilitators_insert" on public.centre_facilitators
  for insert with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "centre_facilitators_delete" on public.centre_facilitators;
create policy "centre_facilitators_delete" on public.centre_facilitators
  for delete using (public.auth_role() in ('admin', 'super_admin'));

-- ── 4.6. LGA Area Officers (read for all users, write for admin+) ──────────
-- Guarded so this file stays safe to re-run before setup_lga_officers.sql.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'lga_area_officers') then
    alter table public.lga_area_officers enable row level security;

    drop policy if exists "lga_area_officers_select" on public.lga_area_officers;
    create policy "lga_area_officers_select" on public.lga_area_officers
      for select using (public.auth_role() is not null);

    drop policy if exists "lga_area_officers_insert" on public.lga_area_officers;
    create policy "lga_area_officers_insert" on public.lga_area_officers
      for insert with check (public.auth_role() in ('admin', 'super_admin'));

    drop policy if exists "lga_area_officers_update" on public.lga_area_officers;
    create policy "lga_area_officers_update" on public.lga_area_officers
      for update using (public.auth_role() in ('admin', 'super_admin'))
      with check (public.auth_role() in ('admin', 'super_admin'));

    drop policy if exists "lga_area_officers_delete" on public.lga_area_officers;
    create policy "lga_area_officers_delete" on public.lga_area_officers
      for delete using (public.auth_role() in ('admin', 'super_admin'));
  end if;
end $$;

-- ── 4.7. Enrolment stats (public read — shown on the Landing page; admin+ write) ──
-- Guarded: only applies if the enrolment_stats table exists (created by
-- setup_enrolments.sql). Keeps setup_rls.sql safe to re-run in any order.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'enrolment_stats') then
    alter table public.enrolment_stats enable row level security;

    drop policy if exists "enrolment_stats_select" on public.enrolment_stats;
    create policy "enrolment_stats_select" on public.enrolment_stats
      for select using (true);

    drop policy if exists "enrolment_stats_insert" on public.enrolment_stats;
    create policy "enrolment_stats_insert" on public.enrolment_stats
      for insert with check (public.auth_role() in ('admin', 'super_admin'));

    drop policy if exists "enrolment_stats_update" on public.enrolment_stats;
    create policy "enrolment_stats_update" on public.enrolment_stats
      for update using (public.auth_role() in ('admin', 'super_admin'))
      with check (public.auth_role() in ('admin', 'super_admin'));

    drop policy if exists "enrolment_stats_delete" on public.enrolment_stats;
    create policy "enrolment_stats_delete" on public.enrolment_stats
      for delete using (public.auth_role() in ('admin', 'super_admin'));
  end if;
end $$;

-- ── 4.8. Partner organisations & organisation membership ───────────────────
-- Guarded: only applies once setup_partners.sql has created the tables.
-- Board staff read everything (super_admin manages); a partner user reads only
-- the organisation(s) they belong to. User provisioning happens exclusively
-- through the manage-users edge function (service role), never from the
-- browser — so members are readable but not writable here.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'partner_organisations')
     and exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'organisation_members')
  then
    -- auth_org_ids()/has_org_access() are created by setup_partners.sql; make
    -- sure they exist even if this script is re-run first.
    create or replace function public.auth_org_ids()
    returns setof uuid
    language sql
    stable
    security definer
    set search_path = public
    as $fn$
      select organisation_id
      from public.organisation_members
      where user_id = auth.uid()
        and status = 'active';
    $fn$;

    create or replace function public.has_org_access(org uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $fn$
      select org is not null and exists (
        select 1
        from public.organisation_members
        where user_id = auth.uid()
          and organisation_id = org
          and status = 'active'
      );
    $fn$;

    -- ── Partner organisations ──
    drop policy if exists "partner_organisations_select" on public.partner_organisations;
    create policy "partner_organisations_select" on public.partner_organisations
      for select using (
        public.can_view_staff_register()
        or id in (select public.auth_org_ids())
      );

    drop policy if exists "partner_organisations_insert" on public.partner_organisations;
    create policy "partner_organisations_insert" on public.partner_organisations
      for insert with check (public.auth_role() = 'super_admin');

    drop policy if exists "partner_organisations_update" on public.partner_organisations;
    create policy "partner_organisations_update" on public.partner_organisations
      for update using (public.auth_role() = 'super_admin')
      with check (public.auth_role() = 'super_admin');

    drop policy if exists "partner_organisations_delete" on public.partner_organisations;
    create policy "partner_organisations_delete" on public.partner_organisations
      for delete using (public.auth_role() = 'super_admin');

    -- ── Organisation members (read-only from the app; written by the edge fn) ──
    drop policy if exists "organisation_members_select" on public.organisation_members;
    create policy "organisation_members_select" on public.organisation_members
      for select using (
        public.can_view_staff_register()
        or organisation_id in (select public.auth_org_ids())
      );

    -- ── Centres: scope partners to their own organisation ──
    -- Phase 28: when centre_organisations exists (setup_hierarchy.sql ran),
    -- involvement goes through the join table; otherwise fall back to the
    -- legacy partner_org_id column (fresh installs pre-hierarchy).
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = 'centre_organisations') then
      drop policy if exists "centres_select" on public.centres;
      create policy "centres_select" on public.centres
        for select using (
          public.is_adsmeb_staff()
          or exists (
            select 1 from public.centre_organisations co
            where co.centre_id = centres.id
              and co.org_id in (select public.auth_org_ids())
          )
        );

      -- A partner may submit centres for approval (the enforce_centres_approval
      -- trigger forces approval_status back to 'pending', so a partner can
      -- never self-approve). The org binding is made afterwards through the
      -- centre_organisations writer, whose own RLS scopes it to the org.
      drop policy if exists "centres_partner_insert" on public.centres;
      create policy "centres_partner_insert" on public.centres
        for insert with check (
          public.auth_role() in ('partner_admin', 'partner_editor')
        );

      drop policy if exists "centres_partner_update" on public.centres;
      create policy "centres_partner_update" on public.centres
        for update using (
          exists (
            select 1 from public.centre_organisations co
            where co.centre_id = centres.id
              and co.org_id in (select public.auth_org_ids())
          )
        )
        with check (true);
    else
      drop policy if exists "centres_select" on public.centres;
      create policy "centres_select" on public.centres
        for select using (
          public.is_adsmeb_staff()
          or partner_org_id in (select public.auth_org_ids())
        );

      drop policy if exists "centres_partner_insert" on public.centres;
      create policy "centres_partner_insert" on public.centres
        for insert with check (
          partner_org_id is not null
          and partner_org_id in (select public.auth_org_ids())
        );

      drop policy if exists "centres_partner_update" on public.centres;
      create policy "centres_partner_update" on public.centres
        for update using (partner_org_id in (select public.auth_org_ids()))
        with check (partner_org_id in (select public.auth_org_ids()));
    end if;
  end if;
end $$;

-- ── 4.7. Programme delivery: programmes, cohorts, learners ─────────────────
-- Guarded — the tables come from setup_delivery.sql, which may not have run
-- yet. Same tenant model as centres: board staff see everything; partner
-- users are scoped to their own organisation by owner_org_id.
--   • programmes.manage  → board (admin+/meb_officer) and partners on their own rows
--   • learners.manage    → board delivery roles, enumerators, partners on own rows
--   • reports.view roles (mne_viewer, partner_viewer) get read-only
-- The permission *checks* live in the app; here RLS is the real gate.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'programmes') then
    -- ── Programmes ──
    drop policy if exists "programmes_select" on public.programmes;
    create policy "programmes_select" on public.programmes
      for select using (
        public.can_view_staff_register()
        or owner_org_id in (select public.auth_org_ids())
      );

    drop policy if exists "programmes_insert" on public.programmes;
    create policy "programmes_insert" on public.programmes
      for insert with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or (owner_org_id in (select public.auth_org_ids()))
      );

    drop policy if exists "programmes_update" on public.programmes;
    create policy "programmes_update" on public.programmes
      for update using (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or (owner_org_id in (select public.auth_org_ids()))
      )
      with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or (owner_org_id in (select public.auth_org_ids()))
      );

    drop policy if exists "programmes_delete" on public.programmes;
    create policy "programmes_delete" on public.programmes
      for delete using (
        public.auth_role() in ('super_admin', 'admin')
        or (owner_org_id in (select public.auth_org_ids()))
      );
  end if;

  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'cohorts') then
    -- ── Cohorts ── (readable by reports-viewers too)
    drop policy if exists "cohorts_select" on public.cohorts;
    create policy "cohorts_select" on public.cohorts
      for select using (
        public.can_view_staff_register()
        or owner_org_id in (select public.auth_org_ids())
      );

    drop policy if exists "cohorts_insert" on public.cohorts;
    create policy "cohorts_insert" on public.cohorts
      for insert with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer', 'lga_officer', 'data_collector')
        or (owner_org_id in (select public.auth_org_ids()))
      );

    drop policy if exists "cohorts_update" on public.cohorts;
    create policy "cohorts_update" on public.cohorts
      for update using (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer', 'lga_officer', 'data_collector')
        or (owner_org_id in (select public.auth_org_ids()))
      )
      with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer', 'lga_officer', 'data_collector')
        or (owner_org_id in (select public.auth_org_ids()))
      );

    drop policy if exists "cohorts_delete" on public.cohorts;
    create policy "cohorts_delete" on public.cohorts
      for delete using (
        public.auth_role() in ('super_admin', 'admin')
        or (owner_org_id in (select public.auth_org_ids()))
      );
  end if;

  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'learners') then
    -- ── Learners ── (field capture roles + partners; viewers read-only)

    drop policy if exists "learners_select" on public.learners;
    create policy "learners_select" on public.learners
      for select using (
        public.can_view_staff_register()
        or public.auth_role() = 'enumerator'
        or owner_org_id in (select public.auth_org_ids())
      );

    drop policy if exists "learners_insert" on public.learners;
    create policy "learners_insert" on public.learners
      for insert with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer', 'lga_officer', 'data_collector', 'enumerator')
        or (owner_org_id in (select public.auth_org_ids()))
      );

    drop policy if exists "learners_update" on public.learners;
    create policy "learners_update" on public.learners
      for update using (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer', 'lga_officer', 'data_collector', 'enumerator')
        or (owner_org_id in (select public.auth_org_ids()))
      )
      with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer', 'lga_officer', 'data_collector', 'enumerator')
        or (owner_org_id in (select public.auth_org_ids()))
      );

    drop policy if exists "learners_delete" on public.learners;
    create policy "learners_delete" on public.learners
      for delete using (
        public.auth_role() in ('super_admin', 'admin')
        or (owner_org_id in (select public.auth_org_ids()))
      );
  end if;
end $$;

-- ── 4.10. Canonical LGAs reference table (Phase 27) ─────────────────────────
-- Guarded: only applies once setup_canonical_links.sql has created it. All
-- signed-in users (and the anon public directory) read; writes are admin+ —
-- the 21 statutory LGAs are reference data, not user content.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'lgas') then
    alter table public.lgas enable row level security;

    drop policy if exists "lgas_select" on public.lgas;
    create policy "lgas_select" on public.lgas
      for select using (true);

    drop policy if exists "lgas_write" on public.lgas;
    create policy "lgas_write" on public.lgas
      for all
      using (public.auth_role() in ('super_admin', 'admin'))
      with check (public.auth_role() in ('super_admin', 'admin'));
  end if;
end $$;

-- ── 4.11. Board & partner hierarchy (Phase 28.1) ─────────────────────────────
-- Guarded — the tables come from setup_hierarchy.sql, which may not have run yet.
--
-- BOARD side (departments, assets, correspondence) follows the employees
-- access model: readable by any signed-in user, writable by data_collector+.
--
-- PARTNER joins (centre_organisations, programme_lgas,
-- organisation_lga_coverage) follow the owner_org_id tenant model: board
-- staff see everything, partner users see (and manage) only rows that
-- involve their own organisation.
do $$
begin
  -- ── Departments ── (references employees.head — board register viewers only)
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'departments') then
    alter table public.departments enable row level security;

    drop policy if exists "departments_select" on public.departments;
    create policy "departments_select" on public.departments
      for select using (public.can_view_staff_register());

    drop policy if exists "departments_write" on public.departments;
    create policy "departments_write" on public.departments
      for all
      using (public.auth_role() in ('super_admin', 'admin', 'meb_officer'))
      with check (public.auth_role() in ('super_admin', 'admin', 'meb_officer'));
  end if;

  -- ── Centre ↔ Organisation (many-to-many) ──
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'centre_organisations') then
    alter table public.centre_organisations enable row level security;

    drop policy if exists "centre_orgs_select" on public.centre_organisations;
    create policy "centre_orgs_select" on public.centre_organisations
      for select using (
        public.is_adsmeb_staff()
        or org_id in (select public.auth_org_ids())
      );

    drop policy if exists "centre_orgs_board_insert" on public.centre_organisations;
    create policy "centre_orgs_board_insert" on public.centre_organisations
      for insert with check (public.auth_role() in ('super_admin', 'admin', 'meb_officer'));

    drop policy if exists "centre_orgs_partner_insert" on public.centre_organisations;
    create policy "centre_orgs_partner_insert" on public.centre_organisations
      for insert with check (org_id in (select public.auth_org_ids()));

    drop policy if exists "centre_orgs_board_update" on public.centre_organisations;
    create policy "centre_orgs_board_update" on public.centre_organisations
      for update using (public.auth_role() in ('super_admin', 'admin', 'meb_officer'))
      with check (public.auth_role() in ('super_admin', 'admin', 'meb_officer'));

    drop policy if exists "centre_orgs_partner_update" on public.centre_organisations;
    create policy "centre_orgs_partner_update" on public.centre_organisations
      for update using (org_id in (select public.auth_org_ids()))
      with check (org_id in (select public.auth_org_ids()));

    drop policy if exists "centre_orgs_delete" on public.centre_organisations;
    create policy "centre_orgs_delete" on public.centre_organisations
      for delete using (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or org_id in (select public.auth_org_ids())
      );
  end if;

  -- ── Programme ↔ LGA scope ── (visibility mirrors the programmes policy)
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'programme_lgas') then
    alter table public.programme_lgas enable row level security;

    drop policy if exists "programme_lgas_select" on public.programme_lgas;
    create policy "programme_lgas_select" on public.programme_lgas
      for select using (
        public.can_view_staff_register()
        or exists (
          select 1 from public.programmes p
          where p.id = programme_id
            and p.owner_org_id in (select public.auth_org_ids())
        )
      );

    drop policy if exists "programme_lgas_write" on public.programme_lgas;
    create policy "programme_lgas_write" on public.programme_lgas
      for all
      using (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or exists (
          select 1 from public.programmes p
          where p.id = programme_id
            and p.owner_org_id in (select public.auth_org_ids())
        )
      )
      with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or exists (
          select 1 from public.programmes p
          where p.id = programme_id
            and p.owner_org_id in (select public.auth_org_ids())
        )
      );
  end if;

  -- ── Organisation ↔ LGA coverage ──
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'organisation_lga_coverage') then
    alter table public.organisation_lga_coverage enable row level security;

    drop policy if exists "org_coverage_select" on public.organisation_lga_coverage;
    create policy "org_coverage_select" on public.organisation_lga_coverage
      for select using (
        public.can_view_staff_register()
        or org_id in (select public.auth_org_ids())
      );

    drop policy if exists "org_coverage_board_write" on public.organisation_lga_coverage;
    create policy "org_coverage_board_write" on public.organisation_lga_coverage
      for all
      using (public.auth_role() in ('super_admin', 'admin', 'meb_officer'))
      with check (public.auth_role() in ('super_admin', 'admin', 'meb_officer'));

    drop policy if exists "org_coverage_org_write" on public.organisation_lga_coverage;
    create policy "org_coverage_org_write" on public.organisation_lga_coverage
      for all
      using (org_id in (select public.auth_org_ids()))
      with check (org_id in (select public.auth_org_ids()));
  end if;

  -- ── Board assets ── (employees model: any signed-in read, data_collector+ write)
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'board_assets') then
    alter table public.board_assets enable row level security;

    drop policy if exists "board_assets_select" on public.board_assets;
    create policy "board_assets_select" on public.board_assets
      for select using (public.auth_role() is not null);

    drop policy if exists "board_assets_insert" on public.board_assets;
    create policy "board_assets_insert" on public.board_assets
      for insert with check (public.auth_role() in ('data_collector', 'admin', 'super_admin'));

    drop policy if exists "board_assets_update" on public.board_assets;
    create policy "board_assets_update" on public.board_assets
      for update using (public.auth_role() in ('data_collector', 'admin', 'super_admin'))
      with check (public.auth_role() in ('data_collector', 'admin', 'super_admin'));

    drop policy if exists "board_assets_delete" on public.board_assets;
    create policy "board_assets_delete" on public.board_assets
      for delete using (public.auth_role() in ('data_collector', 'admin', 'super_admin'));
  end if;

  -- ── Correspondence ── (employee_documents model + a status update policy)
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'correspondence') then
    alter table public.correspondence enable row level security;

    drop policy if exists "correspondence_select" on public.correspondence;
    create policy "correspondence_select" on public.correspondence
      for select using (public.auth_role() is not null);

    drop policy if exists "correspondence_insert" on public.correspondence;
    create policy "correspondence_insert" on public.correspondence
      for insert with check (public.auth_role() in ('data_collector', 'admin', 'super_admin'));

    drop policy if exists "correspondence_update" on public.correspondence;
    create policy "correspondence_update" on public.correspondence
      for update using (public.auth_role() in ('data_collector', 'admin', 'super_admin'))
      with check (public.auth_role() in ('data_collector', 'admin', 'super_admin'));

    drop policy if exists "correspondence_delete" on public.correspondence;
    create policy "correspondence_delete" on public.correspondence
      for delete using (public.auth_role() in ('data_collector', 'admin', 'super_admin'));
  end if;
end $$;

-- ── 4.9. Data collection: form_templates, form_assignments, form_submissions ──
-- Guarded — the tables come from setup_forms.sql, which may not have run yet.
-- Decision A: field staff see ONLY their own submissions. Decision B: board
-- reviewers (reports.view roles) see all and approve/reject. Board writes
-- templates/assignments (forms.manage). Partner users are scoped by
-- owner_org_id as everywhere else.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'form_templates') then
    -- ── Templates: signed-in read, board writes ──
    drop policy if exists "form_templates_select" on public.form_templates;
    create policy "form_templates_select" on public.form_templates
      for select using (
        public.auth_role() is not null
        or owner_org_id in (select public.auth_org_ids())
      );

    drop policy if exists "form_templates_insert" on public.form_templates;
    create policy "form_templates_insert" on public.form_templates
      for insert with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or (owner_org_id in (select public.auth_org_ids()))
      );

    drop policy if exists "form_templates_update" on public.form_templates;
    create policy "form_templates_update" on public.form_templates
      for update using (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or (owner_org_id in (select public.auth_org_ids()))
      )
      with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or (owner_org_id in (select public.auth_org_ids()))
      );

    drop policy if exists "form_templates_delete" on public.form_templates;
    create policy "form_templates_delete" on public.form_templates
      for delete using (
        public.auth_role() in ('super_admin', 'admin')
        or (owner_org_id in (select public.auth_org_ids()))
      );
  end if;

  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'form_assignments') then
    -- ── Assignments: board writes; field staff see own or open ones ──
    drop policy if exists "form_assignments_select" on public.form_assignments;
    create policy "form_assignments_select" on public.form_assignments
      for select using (
        public.can_view_staff_register()
        or assigned_to = auth.uid()
        or (assigned_to is null and public.auth_role() in (
          'enumerator', 'data_collector', 'lga_officer', 'meb_officer'
        ))
        or owner_org_id in (select public.auth_org_ids())
       );

    drop policy if exists "form_assignments_insert" on public.form_assignments;
    create policy "form_assignments_insert" on public.form_assignments
      for insert with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or (owner_org_id in (select public.auth_org_ids()))
      );

    drop policy if exists "form_assignments_update" on public.form_assignments;
    create policy "form_assignments_update" on public.form_assignments
      for update using (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or (owner_org_id in (select public.auth_org_ids()))
      )
      with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer')
        or (owner_org_id in (select public.auth_org_ids()))
      );

    drop policy if exists "form_assignments_delete" on public.form_assignments;
    create policy "form_assignments_delete" on public.form_assignments
      for delete using (
        public.auth_role() in ('super_admin', 'admin')
        or (owner_org_id in (select public.auth_org_ids()))
      );
  end if;

  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'form_submissions') then
    -- ── Submissions: own-only for field staff; board reviews ──
    drop policy if exists "form_submissions_select" on public.form_submissions;
    create policy "form_submissions_select" on public.form_submissions
      for select using (
        public.can_view_staff_register()
        or submitted_by = auth.uid()
        or owner_org_id in (select public.auth_org_ids())
      );

    drop policy if exists "form_submissions_insert" on public.form_submissions;
    create policy "form_submissions_insert" on public.form_submissions
      for insert with check (
        -- draft/submitted only: the review transitions go through the
        -- reviewer policies below, which require the review roles.
        (status in ('draft', 'submitted'))
        and (
          public.auth_role() in ('super_admin', 'admin', 'meb_officer', 'lga_officer', 'data_collector', 'enumerator')
          or (owner_org_id in (select public.auth_org_ids()))
        )
      );

    drop policy if exists "form_submissions_field_update" on public.form_submissions;
    create policy "form_submissions_field_update" on public.form_submissions
      for update using (
        submitted_by = auth.uid()
        and status in ('draft', 'submitted', 'rejected')  -- approved rows are frozen
        and public.auth_role() in ('super_admin', 'admin', 'meb_officer', 'lga_officer', 'data_collector', 'enumerator')
      )
      with check (
        submitted_by = auth.uid()
        and status in ('draft', 'submitted')
      );

    drop policy if exists "form_submissions_review_update" on public.form_submissions;
    create policy "form_submissions_review_update" on public.form_submissions
      for update using (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer', 'mne_viewer')
      )
      with check (
        public.auth_role() in ('super_admin', 'admin', 'meb_officer', 'mne_viewer')
      );

    drop policy if exists "form_submissions_delete" on public.form_submissions;
    create policy "form_submissions_delete" on public.form_submissions
      for delete using (
        public.auth_role() in ('super_admin', 'admin')
        or (owner_org_id in (select public.auth_org_ids()))
      );
  end if;
end $$;

-- ── 5. CMS content tables (public read, admin+ write) ──────────────────────
-- Public read is required: the public Landing page reads these with the anon key.
drop policy if exists "cms_content_select" on public.site_content;
create policy "cms_content_select" on public.site_content
  for select using (true);

drop policy if exists "cms_content_write" on public.site_content;
create policy "cms_content_write" on public.site_content
  for all using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "cms_programs_select" on public.cms_programs;
create policy "cms_programs_select" on public.cms_programs
  for select using (true);

drop policy if exists "cms_programs_write" on public.cms_programs;
create policy "cms_programs_write" on public.cms_programs
  for all using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "cms_news_select" on public.cms_news;
create policy "cms_news_select" on public.cms_news
  for select using (true);

drop policy if exists "cms_news_write" on public.cms_news;
create policy "cms_news_write" on public.cms_news
  for all using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "cms_team_select" on public.cms_team;
create policy "cms_team_select" on public.cms_team
  for select using (true);

drop policy if exists "cms_team_write" on public.cms_team;
create policy "cms_team_write" on public.cms_team
  for all using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "cms_gallery_select" on public.cms_gallery;
create policy "cms_gallery_select" on public.cms_gallery
  for select using (true);

drop policy if exists "cms_gallery_write" on public.cms_gallery;
create policy "cms_gallery_write" on public.cms_gallery
  for all using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "cms_downloads_select" on public.cms_downloads;
create policy "cms_downloads_select" on public.cms_downloads
  for select using (true);

drop policy if exists "cms_downloads_write" on public.cms_downloads;
create policy "cms_downloads_write" on public.cms_downloads
  for all using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

-- ── 6. Contact inbox (public submit, admin+ manage) ─────────────────────────
drop policy if exists "cms_contacts_insert" on public.cms_contacts;
-- Note: INSERT policies only allow WITH CHECK (USING is invalid for INSERT).
create policy "cms_contacts_insert" on public.cms_contacts
  for insert with check (true);

drop policy if exists "cms_contacts_read" on public.cms_contacts;
create policy "cms_contacts_read" on public.cms_contacts
  for select using (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "cms_contacts_update" on public.cms_contacts;
create policy "cms_contacts_update" on public.cms_contacts
  for update using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

drop policy if exists "cms_contacts_delete" on public.cms_contacts;
create policy "cms_contacts_delete" on public.cms_contacts
  for delete using (public.auth_role() in ('admin', 'super_admin'));

-- ============================================================================
-- ── 7. Legacy role migration ────────────────────────────────────────────────
-- The old auth code instructed admins to store the role in user_metadata
-- (client-editable). Copy any legacy roles into app_metadata, then give any
-- remaining role-less user the read-only "staff" role so nobody is locked out.
-- ============================================================================
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                        || jsonb_build_object('role', raw_user_meta_data ->> 'role')
where raw_user_meta_data ? 'role'
  and not coalesce(raw_app_meta_data, '{}'::jsonb) ? 'role';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"staff"}'::jsonb
where not coalesce(raw_app_meta_data, '{}'::jsonb) ? 'role';

-- ── Optional: promote an existing user to super_admin ───────────────────────
-- Uncomment and adjust the email to make your first super administrator:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"super_admin"}'::jsonb
-- where email = 'you@ameb.gov.ng';
