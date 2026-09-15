-- ============================================================================
-- AMEB EMS — Row Level Security (RLS) Setup
-- ----------------------------------------------------------------------------
-- Enforces the role system in the database. Run this AFTER setup.sql,
-- setup_ems.sql, setup_storage.sql, setup_facilitators.sql and
-- setup_lga_officers.sql, in the Supabase
-- dashboard SQL Editor. Safe to run multiple times (drops and recreates policies).
--
-- Roles live on the Supabase auth user's `app_metadata.role`:
--   super_admin | admin | data_collector | staff
-- Policies read the role straight from the JWT via auth.jwt().
--
-- ACCESS MODEL
--   employees        : any signed-in user (any role) can read; data_collector+
--                      can insert/update; admin+ can delete.
--   stations/cadres/centres: any signed-in user can read; admin+ can write.
--   facilitators/centre_facilitators: any signed-in user can read; admin+ can write.
--   lga_area_officers: any signed-in user can read; admin+ can write (one area
--                      officer per LGA, drawn from the staff register).
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

-- ── 2. Enable RLS on all application tables ─────────────────────────────────
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
drop policy if exists "employees_select" on public.employees;
create policy "employees_select" on public.employees
  for select
  using (public.auth_role() is not null);

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
  for select using (public.auth_role() is not null);

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
