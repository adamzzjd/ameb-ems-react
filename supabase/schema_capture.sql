-- ═══════════════════════════════════════════════════════════════════════════
-- Schema capture — generated from the production database, do not hand-edit.
-- Captured: 2026-10-22   Project: wyyvqrferotiuvbojhwn
--
-- Why this exists: the setup_*.sql scripts were written feature by feature as
-- the app grew, and stopped describing the database. Tables, functions,
-- triggers and policies from the October partner work were never added back,
-- so the live database could not be rebuilt from source.
--
-- This file is a complete snapshot of the public schema. It is safe to run on
-- an existing database as well as a fresh one (tables use IF NOT EXISTS,
-- indexes are guarded, policies and triggers are dropped before creation).
-- Verified by applying it to production inside a rolled-back transaction.
--
-- Do not hand-edit: regenerate from the database when the schema changes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id uuid not null,
  user_id uuid,
  user_email text,
  user_role text,
  action text not null,
  table_name text not null,
  row_id text,
  details jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  organisation_id uuid,
  constraint audit_log_pkey PRIMARY KEY (id)
);

create table if not exists public.board_assets (
  id uuid not null,
  tag text not null,
  name text not null,
  category text default 'Other'::text not null,
  quantity integer default 1 not null,
  condition text default 'good'::text not null,
  station_id uuid,
  department_id uuid,
  centre_id uuid,
  custodian_employee_id uuid,
  remarks text default ''::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint board_assets_pkey PRIMARY KEY (id)
);

create table if not exists public.cadres (
  id uuid default gen_random_uuid() not null,
  name text not null,
  category text,
  updated_at timestamp with time zone default now(),
  grade text,
  constraint cadres_pkey PRIMARY KEY (id)
);

create table if not exists public.centre_organisations (
  id uuid default gen_random_uuid() not null,
  centre_id uuid not null,
  org_id uuid not null,
  role text default 'partner'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  constraint centre_organisations_pkey PRIMARY KEY (id)
);

create table if not exists public.centre_staff (
  centre_id uuid not null,
  employee_id uuid not null,
  created_at timestamp with time zone default now() not null,
  constraint centre_staff_pkey PRIMARY KEY (centre_id, employee_id)
);

create table if not exists public.centres (
  id uuid default gen_random_uuid() not null,
  name text not null,
  lga text,
  ward text,
  community text,
  type text,
  status text default 'Active'::text,
  capacity integer,
  phone text,
  remarks text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  owner_type text default 'ADSMEB'::text not null,
  centre_code text,
  funding_source text,
  agreement_start text,
  agreement_end text,
  approval_status text default 'approved'::text not null,
  approved_by text,
  approved_at timestamp with time zone,
  rejection_note text,
  partner_org_id uuid,
  constraint centres_pkey PRIMARY KEY (id)
);

create table if not exists public.cms_contacts (
  id text not null,
  name text,
  email text,
  subject text,
  message text,
  read boolean default false,
  created_at timestamp with time zone default now(),
  constraint cms_contacts_pkey PRIMARY KEY (id)
);

create table if not exists public.cms_downloads (
  id text not null,
  title text,
  meta text,
  icon text,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint cms_downloads_pkey PRIMARY KEY (id)
);

create table if not exists public.cms_gallery (
  id text not null,
  label text,
  wide boolean default false,
  tall boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  image text,
  constraint cms_gallery_pkey PRIMARY KEY (id)
);

create table if not exists public.cms_news (
  id text not null,
  title text,
  excerpt text,
  date text,
  icon text,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  image text,
  body text default ''::text not null,
  constraint cms_news_pkey PRIMARY KEY (id)
);

create table if not exists public.cms_programs (
  id text not null,
  title text,
  icon text,
  description text,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  details text default ''::text not null,
  image text,
  constraint cms_programs_pkey PRIMARY KEY (id)
);

create table if not exists public.cms_settings (
  key text not null,
  value jsonb,
  updated_at timestamp with time zone default now(),
  constraint cms_settings_pkey PRIMARY KEY (key)
);

create table if not exists public.cms_team (
  id text not null,
  name text,
  initials text,
  role text,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  photo text,
  constraint cms_team_pkey PRIMARY KEY (id)
);

create table if not exists public.cohorts (
  id uuid not null,
  programme_id uuid not null,
  centre_id uuid not null,
  name text default ''::text not null,
  start_date text,
  end_date text,
  status text default 'planned'::text not null,
  capacity integer,
  owner_org_id uuid,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint cohorts_pkey PRIMARY KEY (id)
);

create table if not exists public.correspondence (
  id uuid not null,
  ref_no text not null,
  title text not null,
  kind text default 'memo'::text not null,
  direction text default 'internal'::text not null,
  department_id uuid,
  date_issued text,
  parties text default ''::text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  url text,
  status text default 'filed'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint correspondence_pkey PRIMARY KEY (id)
);

create table if not exists public.departments (
  id uuid not null,
  name text not null,
  code text,
  description text default ''::text not null,
  head_employee_id uuid,
  status text default 'active'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint departments_pkey PRIMARY KEY (id)
);

create table if not exists public.employee_documents (
  id uuid not null,
  employee_id uuid not null,
  title text not null,
  category text default 'Other'::text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  url text not null,
  uploaded_by uuid,
  created_at timestamp with time zone default now() not null,
  constraint employee_documents_pkey PRIMARY KEY (id)
);

create table if not exists public.employees (
  id uuid default gen_random_uuid() not null,
  name text not null,
  grade text,
  cadre text,
  date_first_appt date,
  date_present_appt date,
  dob date,
  phone text,
  lga text,
  psn text,
  station text,
  remarks text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  photo text,
  gender text,
  address text,
  self_service_submitted_at timestamp with time zone,
  step text,
  station_id uuid,
  department_id uuid,
  constraint employees_pkey PRIMARY KEY (id)
);

create table if not exists public.enrolment_stats (
  id uuid not null,
  year integer not null,
  learners_enrolled integer default 0 not null,
  certified integer default 0 not null,
  dropped_out integer default 0 not null,
  no_exam integer default 0 not null,
  ngos text[] default '{}'::text[] not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint enrolment_stats_pkey PRIMARY KEY (id)
);

create table if not exists public.form_assignments (
  id uuid not null,
  template_id uuid not null,
  assigned_to uuid,
  centre_id uuid,
  cohort_id uuid,
  due_date text,
  status text default 'open'::text not null,
  owner_org_id uuid,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint form_assignments_pkey PRIMARY KEY (id)
);

create table if not exists public.form_submissions (
  id uuid not null,
  template_id uuid not null,
  assignment_id uuid,
  answers jsonb default '{}'::jsonb not null,
  status text default 'draft'::text not null,
  submitted_by uuid,
  submitted_at timestamp with time zone,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_note text,
  centre_id uuid,
  cohort_id uuid,
  owner_org_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint form_submissions_pkey PRIMARY KEY (id)
);

create table if not exists public.form_templates (
  id uuid not null,
  title text not null,
  description text default ''::text not null,
  status text default 'draft'::text not null,
  version integer default 1 not null,
  fields jsonb default '[]'::jsonb not null,
  owner_org_id uuid,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint form_templates_pkey PRIMARY KEY (id)
);

create table if not exists public.learners (
  id uuid not null,
  reference_no text,
  full_name text not null,
  gender text,
  age_group text,
  phone text,
  lga text,
  community text,
  cohort_id uuid,
  status text default 'active'::text not null,
  enrolled_on text,
  completed_on text,
  notes text,
  owner_org_id uuid,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint learners_pkey PRIMARY KEY (id)
);

create table if not exists public.leaves (
  id uuid not null,
  employee_id uuid not null,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  days integer not null,
  reason text default ''::text not null,
  status text default 'pending'::text not null,
  decided_by uuid,
  decided_at timestamp with time zone,
  decided_note text,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  constraint leaves_pkey PRIMARY KEY (id)
);

create table if not exists public.lga_area_officers (
  id uuid not null,
  lga text not null,
  employee_id uuid,
  remarks text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint lga_area_officers_pkey PRIMARY KEY (id)
);

create table if not exists public.lgas (
  name text not null,
  created_at timestamp with time zone default now() not null,
  constraint lgas_pkey PRIMARY KEY (name)
);

create table if not exists public.organisation_lga_coverage (
  org_id uuid not null,
  lga text not null,
  constraint organisation_lga_coverage_pkey PRIMARY KEY (org_id, lga)
);

create table if not exists public.organisation_members (
  id uuid not null,
  organisation_id uuid not null,
  user_id uuid not null,
  org_role text default 'org_viewer'::text not null,
  status text default 'active'::text not null,
  remarks text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint organisation_members_pkey PRIMARY KEY (id)
);

create table if not exists public.partner_organisations (
  id uuid not null,
  name text default ''::text not null,
  type text default 'NGO'::text not null,
  registration_no text,
  contact_person text,
  phone text,
  email text,
  address text,
  lga text,
  mou_reference text,
  agreement_start text,
  agreement_end text,
  logo text,
  status text default 'active'::text not null,
  remarks text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint partner_organisations_pkey PRIMARY KEY (id)
);

create table if not exists public.programme_lgas (
  programme_id uuid not null,
  lga text not null,
  constraint programme_lgas_pkey PRIMARY KEY (programme_id, lga)
);

create table if not exists public.programmes (
  id uuid not null,
  title text not null,
  description text default ''::text not null,
  category text,
  duration_weeks integer,
  status text default 'active'::text not null,
  owner_org_id uuid,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint programmes_pkey PRIMARY KEY (id)
);

create table if not exists public.promotions (
  id uuid not null,
  employee_id uuid not null,
  promoted_on date not null,
  from_grade text,
  to_grade text not null,
  reference text,
  notes text default ''::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  constraint promotions_pkey PRIMARY KEY (id)
);

create table if not exists public.settings (
  key text not null,
  value text,
  updated_at timestamp with time zone default now(),
  constraint settings_pkey PRIMARY KEY (key)
);

create table if not exists public.site_content (
  id uuid not null,
  hero_badge text default ''::text not null,
  hero_title_1 text default ''::text not null,
  hero_title_2 text default ''::text not null,
  hero_title_sub text default ''::text not null,
  hero_desc text default ''::text not null,
  about_tag text default ''::text not null,
  about_title text default ''::text not null,
  about_sub text default ''::text not null,
  vision_text text default ''::text not null,
  mission_text text default ''::text not null,
  about_body text default ''::text not null,
  address text default ''::text not null,
  phone text default ''::text not null,
  phone_2 text default ''::text not null,
  email text default ''::text not null,
  email_2 text default ''::text not null,
  hours text default ''::text not null,
  hours_sat text default ''::text not null,
  programs_tag text default ''::text not null,
  programs_title text default ''::text not null,
  programs_sub text default ''::text not null,
  news_tag text default ''::text not null,
  news_title text default ''::text not null,
  news_sub text default ''::text not null,
  gallery_tag text default ''::text not null,
  gallery_title text default ''::text not null,
  gallery_sub text default ''::text not null,
  downloads_tag text default ''::text not null,
  downloads_title text default ''::text not null,
  downloads_sub text default ''::text not null,
  contact_tag text default ''::text not null,
  contact_title text default ''::text not null,
  contact_sub text default ''::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  logo_url text,
  hero_image text,
  about_image text,
  constraint site_content_pkey PRIMARY KEY (id)
);

create table if not exists public.stations (
  id uuid default gen_random_uuid() not null,
  name text not null,
  lga text,
  type text,
  updated_at timestamp with time zone default now(),
  constraint stations_pkey PRIMARY KEY (id)
);

-- ── Constraints (foreign keys, unique, check) ──────────────────────────────
do $$ begin
  alter table public.board_assets add constraint board_assets_centre_id_fkey FOREIGN KEY (centre_id) REFERENCES centres(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.board_assets add constraint board_assets_custodian_employee_id_fkey FOREIGN KEY (custodian_employee_id) REFERENCES employees(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.board_assets add constraint board_assets_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.board_assets add constraint board_assets_station_id_fkey FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.cadres add constraint cadres_name_key UNIQUE (name);
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.centre_organisations add constraint centre_organisations_centre_id_fkey FOREIGN KEY (centre_id) REFERENCES centres(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.centre_organisations add constraint centre_organisations_org_id_fkey FOREIGN KEY (org_id) REFERENCES partner_organisations(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.centre_organisations add constraint centre_organisations_centre_id_org_id_key UNIQUE (centre_id, org_id);
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.centre_staff add constraint centre_staff_centre_id_fkey FOREIGN KEY (centre_id) REFERENCES centres(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.centre_staff add constraint centre_staff_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.centres add constraint centres_lga_fk FOREIGN KEY (lga) REFERENCES lgas(name) ON UPDATE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.centres add constraint centres_partner_org_id_fkey FOREIGN KEY (partner_org_id) REFERENCES partner_organisations(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.cohorts add constraint cohorts_centre_id_fkey FOREIGN KEY (centre_id) REFERENCES centres(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.cohorts add constraint cohorts_owner_org_id_fkey FOREIGN KEY (owner_org_id) REFERENCES partner_organisations(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.cohorts add constraint cohorts_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.correspondence add constraint correspondence_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.departments add constraint departments_head_employee_id_fkey FOREIGN KEY (head_employee_id) REFERENCES employees(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.employee_documents add constraint employee_documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.employees add constraint employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.employees add constraint employees_lga_fk FOREIGN KEY (lga) REFERENCES lgas(name) ON UPDATE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.employees add constraint employees_station_id_fkey FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.employees add constraint employees_psn_key UNIQUE (psn);
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.enrolment_stats add constraint enrolment_stats_year_key UNIQUE (year);
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.form_assignments add constraint form_assignments_centre_id_fkey FOREIGN KEY (centre_id) REFERENCES centres(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.form_assignments add constraint form_assignments_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.form_assignments add constraint form_assignments_owner_org_id_fkey FOREIGN KEY (owner_org_id) REFERENCES partner_organisations(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.form_assignments add constraint form_assignments_template_id_fkey FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.form_submissions add constraint form_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES form_assignments(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.form_submissions add constraint form_submissions_centre_id_fkey FOREIGN KEY (centre_id) REFERENCES centres(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.form_submissions add constraint form_submissions_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.form_submissions add constraint form_submissions_owner_org_id_fkey FOREIGN KEY (owner_org_id) REFERENCES partner_organisations(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.form_submissions add constraint form_submissions_template_id_fkey FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.form_templates add constraint form_templates_owner_org_id_fkey FOREIGN KEY (owner_org_id) REFERENCES partner_organisations(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.learners add constraint learners_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.learners add constraint learners_lga_fk FOREIGN KEY (lga) REFERENCES lgas(name) ON UPDATE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.learners add constraint learners_owner_org_id_fkey FOREIGN KEY (owner_org_id) REFERENCES partner_organisations(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.leaves add constraint leaves_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.leaves add constraint leaves_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.lga_area_officers add constraint lga_area_officers_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.lga_area_officers add constraint lga_area_officers_lga_key UNIQUE (lga);
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.organisation_lga_coverage add constraint organisation_lga_coverage_lga_fkey FOREIGN KEY (lga) REFERENCES lgas(name) ON UPDATE CASCADE ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.organisation_lga_coverage add constraint organisation_lga_coverage_org_id_fkey FOREIGN KEY (org_id) REFERENCES partner_organisations(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.organisation_members add constraint organisation_members_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'pending'::text])));
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.organisation_members add constraint organisation_members_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES partner_organisations(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.partner_organisations add constraint partner_organisations_lga_fk FOREIGN KEY (lga) REFERENCES lgas(name) ON UPDATE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.programme_lgas add constraint programme_lgas_lga_fkey FOREIGN KEY (lga) REFERENCES lgas(name) ON UPDATE CASCADE ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.programme_lgas add constraint programme_lgas_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.programmes add constraint programmes_owner_org_id_fkey FOREIGN KEY (owner_org_id) REFERENCES partner_organisations(id) ON DELETE SET NULL;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.promotions add constraint promotions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table public.stations add constraint stations_name_key UNIQUE (name);
exception when duplicate_object then null; when duplicate_table then null; end $$;

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_table_idx ON public.audit_log USING btree (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_user_idx ON public.audit_log USING btree (user_email);
CREATE INDEX IF NOT EXISTS board_assets_centre_idx ON public.board_assets USING btree (centre_id);
CREATE INDEX IF NOT EXISTS board_assets_department_idx ON public.board_assets USING btree (department_id);
CREATE INDEX IF NOT EXISTS board_assets_station_idx ON public.board_assets USING btree (station_id);
CREATE UNIQUE INDEX IF NOT EXISTS board_assets_tag_key ON public.board_assets USING btree (upper(btrim(tag)));
CREATE UNIQUE INDEX IF NOT EXISTS cadres_name_key ON public.cadres USING btree (name);
CREATE INDEX IF NOT EXISTS centre_orgs_centre_idx ON public.centre_organisations USING btree (centre_id);
CREATE INDEX IF NOT EXISTS centre_orgs_org_idx ON public.centre_organisations USING btree (org_id);
CREATE UNIQUE INDEX IF NOT EXISTS centre_organisations_centre_id_org_id_key ON public.centre_organisations USING btree (centre_id, org_id);
CREATE UNIQUE INDEX IF NOT EXISTS centre_orgs_one_lead_idx ON public.centre_organisations USING btree (centre_id) WHERE (role = 'lead'::text);
CREATE INDEX IF NOT EXISTS centre_staff_centre_idx ON public.centre_staff USING btree (centre_id);
CREATE INDEX IF NOT EXISTS centre_staff_employee_idx ON public.centre_staff USING btree (employee_id);
CREATE INDEX IF NOT EXISTS centres_partner_org_idx ON public.centres USING btree (partner_org_id);
CREATE UNIQUE INDEX IF NOT EXISTS centres_centre_code_unique ON public.centres USING btree (centre_code) WHERE (centre_code IS NOT NULL);
CREATE INDEX IF NOT EXISTS cohorts_centre_idx ON public.cohorts USING btree (centre_id);
CREATE INDEX IF NOT EXISTS cohorts_owner_idx ON public.cohorts USING btree (owner_org_id);
CREATE INDEX IF NOT EXISTS cohorts_programme_idx ON public.cohorts USING btree (programme_id);
CREATE INDEX IF NOT EXISTS correspondence_department_idx ON public.correspondence USING btree (department_id, date_issued DESC);
CREATE UNIQUE INDEX IF NOT EXISTS correspondence_ref_key ON public.correspondence USING btree (upper(btrim(ref_no)));
CREATE INDEX IF NOT EXISTS departments_status_idx ON public.departments USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS departments_name_key ON public.departments USING btree (lower(btrim(name)));
CREATE INDEX IF NOT EXISTS employee_documents_employee_idx ON public.employee_documents USING btree (employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS employees_department_idx ON public.employees USING btree (department_id);
CREATE INDEX IF NOT EXISTS employees_station_id_idx ON public.employees USING btree (station_id);
CREATE UNIQUE INDEX IF NOT EXISTS employees_psn_key ON public.employees USING btree (psn);
CREATE UNIQUE INDEX IF NOT EXISTS enrolment_stats_year_key ON public.enrolment_stats USING btree (year);
CREATE INDEX IF NOT EXISTS form_assignments_assigned_idx ON public.form_assignments USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS form_assignments_owner_idx ON public.form_assignments USING btree (owner_org_id);
CREATE INDEX IF NOT EXISTS form_assignments_template_idx ON public.form_assignments USING btree (template_id);
CREATE INDEX IF NOT EXISTS form_submissions_owner_idx ON public.form_submissions USING btree (owner_org_id);
CREATE INDEX IF NOT EXISTS form_submissions_submitter_idx ON public.form_submissions USING btree (submitted_by);
CREATE INDEX IF NOT EXISTS form_submissions_template_idx ON public.form_submissions USING btree (template_id);
CREATE INDEX IF NOT EXISTS form_templates_owner_idx ON public.form_templates USING btree (owner_org_id);
CREATE INDEX IF NOT EXISTS learners_cohort_idx ON public.learners USING btree (cohort_id);
CREATE INDEX IF NOT EXISTS learners_lga_idx ON public.learners USING btree (lga);
CREATE INDEX IF NOT EXISTS learners_owner_idx ON public.learners USING btree (owner_org_id);
CREATE UNIQUE INDEX IF NOT EXISTS learners_reference_no_unique ON public.learners USING btree (reference_no) WHERE (reference_no IS NOT NULL);
CREATE INDEX IF NOT EXISTS leaves_employee_idx ON public.leaves USING btree (employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leaves_status_idx ON public.leaves USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS lga_area_officers_employee_idx ON public.lga_area_officers USING btree (employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS lga_area_officers_lga_key ON public.lga_area_officers USING btree (lga);
CREATE INDEX IF NOT EXISTS org_coverage_lga_idx ON public.organisation_lga_coverage USING btree (lga);
CREATE INDEX IF NOT EXISTS organisation_members_org_idx ON public.organisation_members USING btree (organisation_id);
CREATE INDEX IF NOT EXISTS organisation_members_user_idx ON public.organisation_members USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS organisation_members_user_org_unique ON public.organisation_members USING btree (user_id, organisation_id);
CREATE UNIQUE INDEX IF NOT EXISTS organisation_members_user_unique ON public.organisation_members USING btree (user_id);
CREATE INDEX IF NOT EXISTS programme_lgas_lga_idx ON public.programme_lgas USING btree (lga);
CREATE INDEX IF NOT EXISTS programmes_owner_idx ON public.programmes USING btree (owner_org_id);
CREATE INDEX IF NOT EXISTS promotions_date_idx ON public.promotions USING btree (promoted_on DESC);
CREATE INDEX IF NOT EXISTS promotions_employee_idx ON public.promotions USING btree (employee_id, promoted_on DESC);
CREATE UNIQUE INDEX IF NOT EXISTS stations_name_key ON public.stations USING btree (name);

-- ── Views ──────────────────────────────────────────────────────────────────
create or replace view public.cohort_overview as
SELECT co.id,
    co.name,
    co.status AS cohort_status,
    co.start_date,
    co.end_date,
    co.capacity,
    co.owner_org_id,
    p.id AS programme_id,
    p.title AS programme_title,
    p.category AS programme_category,
    c.id AS centre_id,
    c.name AS centre_name,
    c.lga AS centre_lga,
    ( SELECT count(*) AS count
           FROM learners l
          WHERE l.cohort_id = co.id) AS learner_count
   FROM cohorts co
     JOIN programmes p ON p.id = co.programme_id
     JOIN centres c ON c.id = co.centre_id;

-- ── Functions ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auth_org_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select organisation_id
  from public.organisation_members
  where user_id = auth.uid()
    and status = 'active';
$function$;

CREATE OR REPLACE FUNCTION public.can_view_staff_register()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in (
    'super_admin', 'admin', 'meb_officer', 'lga_officer',
    'data_collector', 'staff', 'mne_viewer'
  );
$function$;

CREATE OR REPLACE FUNCTION public.centre_belongs_to_my_org(centre uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
        select exists (
          select 1 from public.centre_organisations co
          where co.centre_id = centre
            and co.org_id in (select public.auth_org_ids())
        );
      $function$;

CREATE OR REPLACE FUNCTION public.create_org_centre(centre_name text, centre_lga text, centre_ward text DEFAULT NULL::text, centre_community text DEFAULT NULL::text, centre_type text DEFAULT NULL::text, centre_status text DEFAULT 'Active'::text, centre_capacity integer DEFAULT NULL::integer, centre_phone text DEFAULT NULL::text, centre_remarks text DEFAULT NULL::text, centre_code text DEFAULT NULL::text, link_role text DEFAULT 'lead'::text)
 RETURNS SETOF centres
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  org    uuid;
  new_id uuid := gen_random_uuid();
begin
  if public.auth_role() not in ('partner_admin', 'partner_editor') then
    raise exception 'Only a partner account can register a centre from the portal'
      using errcode = '42501';
  end if;

  if centre_name is null or btrim(centre_name) = ''
     or centre_lga is null or btrim(centre_lga) = '' then
    raise exception 'A centre needs a name and an LGA' using errcode = '22023';
  end if;

  -- The caller's own active membership — never a body-supplied org id, so a
  -- partner cannot register a centre into somebody else's organisation.
  select m.organisation_id into org
  from public.organisation_members m
  where m.user_id = auth.uid()
    and m.status = 'active'
  order by m.created_at
  limit 1;

  if org is null then
    raise exception 'This account has no active organisation membership'
      using errcode = '42501';
  end if;

  insert into public.centres (
    id, name, lga, ward, community, type, status, capacity, phone,
    remarks, owner_type, centre_code
  ) values (
    new_id,
    btrim(centre_name),
    btrim(centre_lga),
    centre_ward,
    centre_community,
    centre_type,
    coalesce(centre_status, 'Active'),
    centre_capacity,
    centre_phone,
    centre_remarks,
    'NGO',
    centre_code
  );

  insert into public.centre_organisations (centre_id, org_id, role)
  values (new_id, org, coalesce(link_role, 'lead'))
  on conflict (centre_id, org_id) do nothing;

  return query select * from public.centres where id = new_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.enforce_centres_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_adsmeb_staff() then
    new.approval_status := 'pending';
    new.approved_by := null;
    new.approved_at := null;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.has_org_access(org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select org is not null and exists (
    select 1
    from public.organisation_members
    where user_id = auth.uid()
      and organisation_id = org
      and status = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_adsmeb_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in (
    'super_admin', 'admin', 'meb_officer', 'lga_officer',
    'data_collector', 'staff', 'mne_viewer', 'enumerator'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_board_centre_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in (
    'super_admin', 'admin', 'meb_officer', 'lga_officer'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_partner_editor()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in (
    'partner_admin', 'partner_editor'
  );
$function$;

CREATE OR REPLACE FUNCTION public.protect_org_columns()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Board staff (and the service role, e.g. the manage-users function) may
  -- change anything. Everyone else keeps the existing value on the columns
  -- that decide an organisation's standing.
  if public.auth_role() is null
     or public.auth_role() not in ('super_admin', 'admin', 'meb_officer') then
    new.name            := old.name;
    new.type            := old.type;
    new.status          := old.status;
    new.registration_no := old.registration_no;
    new.created_at      := old.created_at;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.sync_employee_station()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_station_rename()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.name is distinct from old.name then
    update public.employees
    set station = new.name
    where station_id = new.id;
  end if;
  return new;
end
$function$;

-- ── Triggers ───────────────────────────────────────────────────────────────
drop trigger if exists centres_enforce_approval on public.centres;
CREATE TRIGGER centres_enforce_approval BEFORE INSERT OR UPDATE ON public.centres FOR EACH ROW EXECUTE FUNCTION enforce_centres_approval();

drop trigger if exists employees_station_sync on public.employees;
CREATE TRIGGER employees_station_sync BEFORE INSERT OR UPDATE OF station, station_id ON public.employees FOR EACH ROW EXECUTE FUNCTION sync_employee_station();

drop trigger if exists protect_org_columns on public.partner_organisations;
CREATE TRIGGER protect_org_columns BEFORE UPDATE ON public.partner_organisations FOR EACH ROW EXECUTE FUNCTION protect_org_columns();

drop trigger if exists stations_rename_sync on public.stations;
CREATE TRIGGER stations_rename_sync BEFORE UPDATE OF name ON public.stations FOR EACH ROW EXECUTE FUNCTION sync_station_rename();

-- ── Row level security ─────────────────────────────────────────────────────
alter table public.settings enable row level security;
alter table public.stations enable row level security;
alter table public.site_content enable row level security;
alter table public.cadres enable row level security;
alter table public.cms_settings enable row level security;
alter table public.leaves enable row level security;
alter table public.cms_programs enable row level security;
alter table public.employee_documents enable row level security;
alter table public.enrolment_stats enable row level security;
alter table public.cms_news enable row level security;
alter table public.partner_organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.cms_team enable row level security;
alter table public.audit_log enable row level security;
alter table public.centres enable row level security;
alter table public.employees enable row level security;
alter table public.cms_gallery enable row level security;
alter table public.promotions enable row level security;
alter table public.cms_downloads enable row level security;
alter table public.lga_area_officers enable row level security;
alter table public.cms_contacts enable row level security;
alter table public.programmes enable row level security;
alter table public.cohorts enable row level security;
alter table public.learners enable row level security;
alter table public.form_templates enable row level security;
alter table public.form_assignments enable row level security;
alter table public.form_submissions enable row level security;
alter table public.lgas enable row level security;
alter table public.departments enable row level security;
alter table public.centre_organisations enable row level security;
alter table public.programme_lgas enable row level security;
alter table public.organisation_lga_coverage enable row level security;
alter table public.board_assets enable row level security;
alter table public.correspondence enable row level security;
alter table public.centre_staff enable row level security;

-- Policies (skip anything already declared in setup_rls.sql by name).
drop policy if exists audit_log_insert on public.audit_log;
create policy audit_log_insert on public.audit_log as permissive for insert to public with check ((auth_role() IS NOT NULL));
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log as permissive for select to public using ((auth_role() = 'super_admin'::text));
drop policy if exists board_assets_delete on public.board_assets;
create policy board_assets_delete on public.board_assets as permissive for delete to public using ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists board_assets_insert on public.board_assets;
create policy board_assets_insert on public.board_assets as permissive for insert to public with check ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists board_assets_select on public.board_assets;
create policy board_assets_select on public.board_assets as permissive for select to public using ((auth_role() IS NOT NULL));
drop policy if exists board_assets_update on public.board_assets;
create policy board_assets_update on public.board_assets as permissive for update to public using ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists cadres_delete on public.cadres;
create policy cadres_delete on public.cadres as permissive for delete to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists cadres_insert on public.cadres;
create policy cadres_insert on public.cadres as permissive for insert to public with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists cadres_select on public.cadres;
create policy cadres_select on public.cadres as permissive for select to public using ((auth_role() IS NOT NULL));
drop policy if exists cadres_update on public.cadres;
create policy cadres_update on public.cadres as permissive for update to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists centre_orgs_delete on public.centre_organisations;
create policy centre_orgs_delete on public.centre_organisations as permissive for delete to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (is_partner_editor() AND (org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))));
drop policy if exists centre_orgs_partner_insert on public.centre_organisations;
create policy centre_orgs_partner_insert on public.centre_organisations as permissive for insert to public with check ((is_board_centre_manager() OR (is_partner_editor() AND (org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))));
drop policy if exists centre_orgs_partner_update on public.centre_organisations;
create policy centre_orgs_partner_update on public.centre_organisations as permissive for update to public using ((is_board_centre_manager() OR (is_partner_editor() AND (org_id IN ( SELECT auth_org_ids() AS auth_org_ids))))) with check ((is_board_centre_manager() OR (is_partner_editor() AND (org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))));
drop policy if exists centre_orgs_select on public.centre_organisations;
create policy centre_orgs_select on public.centre_organisations as permissive for select to public using ((is_adsmeb_staff() OR (org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists centre_staff_delete on public.centre_staff;
create policy centre_staff_delete on public.centre_staff as permissive for delete to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists centre_staff_insert on public.centre_staff;
create policy centre_staff_insert on public.centre_staff as permissive for insert to public with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists centre_staff_select on public.centre_staff;
create policy centre_staff_select on public.centre_staff as permissive for select to public using ((auth_role() IS NOT NULL));
drop policy if exists admin_select_centres on public.centres;
create policy admin_select_centres on public.centres as permissive for select to public using ((auth.role() = 'service_role'::text));
drop policy if exists centres_delete on public.centres;
create policy centres_delete on public.centres as permissive for delete to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists centres_partner_insert on public.centres;
create policy centres_partner_insert on public.centres as permissive for insert to public with check ((is_board_centre_manager() OR is_partner_editor()));
drop policy if exists centres_partner_update on public.centres;
create policy centres_partner_update on public.centres as permissive for update to public using ((is_board_centre_manager() OR (is_partner_editor() AND (EXISTS ( SELECT 1
   FROM centre_organisations co
  WHERE ((co.centre_id = centres.id) AND (co.org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))))))) with check ((is_board_centre_manager() OR (is_partner_editor() AND (EXISTS ( SELECT 1
   FROM centre_organisations co
  WHERE ((co.centre_id = centres.id) AND (co.org_id IN ( SELECT auth_org_ids() AS auth_org_ids))))))));
drop policy if exists centres_select on public.centres;
create policy centres_select on public.centres as permissive for select to public using ((is_adsmeb_staff() OR (EXISTS ( SELECT 1
   FROM centre_organisations co
  WHERE ((co.centre_id = centres.id) AND (co.org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))))));
drop policy if exists cms_contacts_delete on public.cms_contacts;
create policy cms_contacts_delete on public.cms_contacts as permissive for delete to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists cms_contacts_insert on public.cms_contacts;
create policy cms_contacts_insert on public.cms_contacts as permissive for insert to public with check (true);
drop policy if exists cms_contacts_read on public.cms_contacts;
create policy cms_contacts_read on public.cms_contacts as permissive for select to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists cms_contacts_update on public.cms_contacts;
create policy cms_contacts_update on public.cms_contacts as permissive for update to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists cms_downloads_select on public.cms_downloads;
create policy cms_downloads_select on public.cms_downloads as permissive for select to public using (true);
drop policy if exists cms_downloads_write on public.cms_downloads;
create policy cms_downloads_write on public.cms_downloads as permissive for all to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists cms_gallery_select on public.cms_gallery;
create policy cms_gallery_select on public.cms_gallery as permissive for select to public using (true);
drop policy if exists cms_gallery_write on public.cms_gallery;
create policy cms_gallery_write on public.cms_gallery as permissive for all to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists cms_news_select on public.cms_news;
create policy cms_news_select on public.cms_news as permissive for select to public using (true);
drop policy if exists cms_news_write on public.cms_news;
create policy cms_news_write on public.cms_news as permissive for all to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists cms_programs_select on public.cms_programs;
create policy cms_programs_select on public.cms_programs as permissive for select to public using (true);
drop policy if exists cms_programs_write on public.cms_programs;
create policy cms_programs_write on public.cms_programs as permissive for all to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists cms_team_select on public.cms_team;
create policy cms_team_select on public.cms_team as permissive for select to public using (true);
drop policy if exists cms_team_write on public.cms_team;
create policy cms_team_write on public.cms_team as permissive for all to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists cohorts_delete on public.cohorts;
create policy cohorts_delete on public.cohorts as permissive for delete to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists cohorts_insert on public.cohorts;
create policy cohorts_insert on public.cohorts as permissive for insert to public with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text, 'lga_officer'::text, 'data_collector'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists cohorts_select on public.cohorts;
create policy cohorts_select on public.cohorts as permissive for select to public using ((can_view_staff_register() OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists cohorts_update on public.cohorts;
create policy cohorts_update on public.cohorts as permissive for update to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text, 'lga_officer'::text, 'data_collector'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))) with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text, 'lga_officer'::text, 'data_collector'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists correspondence_delete on public.correspondence;
create policy correspondence_delete on public.correspondence as permissive for delete to public using ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists correspondence_insert on public.correspondence;
create policy correspondence_insert on public.correspondence as permissive for insert to public with check ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists correspondence_select on public.correspondence;
create policy correspondence_select on public.correspondence as permissive for select to public using ((auth_role() IS NOT NULL));
drop policy if exists correspondence_update on public.correspondence;
create policy correspondence_update on public.correspondence as permissive for update to public using ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments as permissive for select to public using (can_view_staff_register());
drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments as permissive for all to public using ((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text]))) with check ((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])));
drop policy if exists employee_documents_delete on public.employee_documents;
create policy employee_documents_delete on public.employee_documents as permissive for delete to public using ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists employee_documents_insert on public.employee_documents;
create policy employee_documents_insert on public.employee_documents as permissive for insert to public with check ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists employee_documents_select on public.employee_documents;
create policy employee_documents_select on public.employee_documents as permissive for select to public using ((auth_role() IS NOT NULL));
drop policy if exists employees_delete on public.employees;
create policy employees_delete on public.employees as permissive for delete to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists employees_insert on public.employees;
create policy employees_insert on public.employees as permissive for insert to public with check ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees as permissive for select to public using (can_view_staff_register());
drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees as permissive for update to public using ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists enrolment_stats_delete on public.enrolment_stats;
create policy enrolment_stats_delete on public.enrolment_stats as permissive for delete to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists enrolment_stats_insert on public.enrolment_stats;
create policy enrolment_stats_insert on public.enrolment_stats as permissive for insert to public with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists enrolment_stats_select on public.enrolment_stats;
create policy enrolment_stats_select on public.enrolment_stats as permissive for select to public using (true);
drop policy if exists enrolment_stats_update on public.enrolment_stats;
create policy enrolment_stats_update on public.enrolment_stats as permissive for update to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists form_assignments_delete on public.form_assignments;
create policy form_assignments_delete on public.form_assignments as permissive for delete to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists form_assignments_insert on public.form_assignments;
create policy form_assignments_insert on public.form_assignments as permissive for insert to public with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists form_assignments_select on public.form_assignments;
create policy form_assignments_select on public.form_assignments as permissive for select to public using ((can_view_staff_register() OR (assigned_to = auth.uid()) OR ((assigned_to IS NULL) AND (auth_role() = ANY (ARRAY['enumerator'::text, 'data_collector'::text, 'lga_officer'::text, 'meb_officer'::text]))) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists form_assignments_update on public.form_assignments;
create policy form_assignments_update on public.form_assignments as permissive for update to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))) with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists form_submissions_delete on public.form_submissions;
create policy form_submissions_delete on public.form_submissions as permissive for delete to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists form_submissions_field_update on public.form_submissions;
create policy form_submissions_field_update on public.form_submissions as permissive for update to public using (((submitted_by = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'rejected'::text])) AND (auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text, 'lga_officer'::text, 'data_collector'::text, 'enumerator'::text])))) with check (((submitted_by = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'submitted'::text]))));
drop policy if exists form_submissions_insert on public.form_submissions;
create policy form_submissions_insert on public.form_submissions as permissive for insert to public with check (((status = ANY (ARRAY['draft'::text, 'submitted'::text])) AND ((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text, 'lga_officer'::text, 'data_collector'::text, 'enumerator'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))));
drop policy if exists form_submissions_review_update on public.form_submissions;
create policy form_submissions_review_update on public.form_submissions as permissive for update to public using ((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text, 'mne_viewer'::text]))) with check ((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text, 'mne_viewer'::text])));
drop policy if exists form_submissions_select on public.form_submissions;
create policy form_submissions_select on public.form_submissions as permissive for select to public using ((can_view_staff_register() OR (submitted_by = auth.uid()) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists form_templates_delete on public.form_templates;
create policy form_templates_delete on public.form_templates as permissive for delete to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists form_templates_insert on public.form_templates;
create policy form_templates_insert on public.form_templates as permissive for insert to public with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists form_templates_select on public.form_templates;
create policy form_templates_select on public.form_templates as permissive for select to public using (((auth_role() IS NOT NULL) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists form_templates_update on public.form_templates;
create policy form_templates_update on public.form_templates as permissive for update to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))) with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists learners_delete on public.learners;
create policy learners_delete on public.learners as permissive for delete to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists learners_insert on public.learners;
create policy learners_insert on public.learners as permissive for insert to public with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text, 'lga_officer'::text, 'data_collector'::text, 'enumerator'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists learners_select on public.learners;
create policy learners_select on public.learners as permissive for select to public using ((can_view_staff_register() OR (auth_role() = 'enumerator'::text) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists learners_update on public.learners;
create policy learners_update on public.learners as permissive for update to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text, 'lga_officer'::text, 'data_collector'::text, 'enumerator'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))) with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text, 'lga_officer'::text, 'data_collector'::text, 'enumerator'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists leaves_delete on public.leaves;
create policy leaves_delete on public.leaves as permissive for delete to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists leaves_insert on public.leaves;
create policy leaves_insert on public.leaves as permissive for insert to public with check ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists leaves_select on public.leaves;
create policy leaves_select on public.leaves as permissive for select to public using ((auth_role() IS NOT NULL));
drop policy if exists leaves_update on public.leaves;
create policy leaves_update on public.leaves as permissive for update to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists lga_area_officers_delete on public.lga_area_officers;
create policy lga_area_officers_delete on public.lga_area_officers as permissive for delete to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists lga_area_officers_insert on public.lga_area_officers;
create policy lga_area_officers_insert on public.lga_area_officers as permissive for insert to public with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists lga_area_officers_select on public.lga_area_officers;
create policy lga_area_officers_select on public.lga_area_officers as permissive for select to public using ((auth_role() IS NOT NULL));
drop policy if exists lga_area_officers_update on public.lga_area_officers;
create policy lga_area_officers_update on public.lga_area_officers as permissive for update to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists lgas_partner_update_guard on public.lgas;
create policy lgas_partner_update_guard on public.lgas as permissive for update to public using (true) with check ((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])));
drop policy if exists lgas_select on public.lgas;
create policy lgas_select on public.lgas as permissive for select to public using (true);
drop policy if exists lgas_write on public.lgas;
create policy lgas_write on public.lgas as permissive for all to public using ((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text]))) with check ((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text])));
drop policy if exists org_coverage_board_write on public.organisation_lga_coverage;
create policy org_coverage_board_write on public.organisation_lga_coverage as permissive for all to public using ((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text]))) with check ((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])));
drop policy if exists org_coverage_org_write on public.organisation_lga_coverage;
create policy org_coverage_org_write on public.organisation_lga_coverage as permissive for all to public using ((org_id IN ( SELECT auth_org_ids() AS auth_org_ids))) with check ((org_id IN ( SELECT auth_org_ids() AS auth_org_ids)));
drop policy if exists org_coverage_select on public.organisation_lga_coverage;
create policy org_coverage_select on public.organisation_lga_coverage as permissive for select to public using ((can_view_staff_register() OR (org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists organisation_members_select on public.organisation_members;
create policy organisation_members_select on public.organisation_members as permissive for select to public using ((can_view_staff_register() OR (organisation_id IN ( SELECT auth_org_ids() AS auth_org_ids)) OR (user_id = auth.uid())));
drop policy if exists partner_organisations_delete on public.partner_organisations;
create policy partner_organisations_delete on public.partner_organisations as permissive for delete to public using ((auth_role() = 'super_admin'::text));
drop policy if exists partner_organisations_insert on public.partner_organisations;
create policy partner_organisations_insert on public.partner_organisations as permissive for insert to public with check ((auth_role() = 'super_admin'::text));
drop policy if exists partner_organisations_select on public.partner_organisations;
create policy partner_organisations_select on public.partner_organisations as permissive for select to public using ((can_view_staff_register() OR (id IN ( SELECT auth_org_ids() AS auth_org_ids)) OR (id IN ( SELECT organisation_members.organisation_id
   FROM organisation_members
  WHERE (organisation_members.user_id = auth.uid())))));
drop policy if exists partner_organisations_update on public.partner_organisations;
create policy partner_organisations_update on public.partner_organisations as permissive for update to public using (((auth_role() = 'super_admin'::text) OR ((auth_role() = ANY (ARRAY['partner_admin'::text, 'partner_editor'::text])) AND (id IN ( SELECT auth_org_ids() AS auth_org_ids))))) with check (((auth_role() = 'super_admin'::text) OR ((auth_role() = ANY (ARRAY['partner_admin'::text, 'partner_editor'::text])) AND (id IN ( SELECT auth_org_ids() AS auth_org_ids)))));
drop policy if exists programme_lgas_select on public.programme_lgas;
create policy programme_lgas_select on public.programme_lgas as permissive for select to public using ((can_view_staff_register() OR (EXISTS ( SELECT 1
   FROM programmes p
  WHERE ((p.id = programme_lgas.programme_id) AND (p.owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))))));
drop policy if exists programme_lgas_write on public.programme_lgas;
create policy programme_lgas_write on public.programme_lgas as permissive for all to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (EXISTS ( SELECT 1
   FROM programmes p
  WHERE ((p.id = programme_lgas.programme_id) AND (p.owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))))))) with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (EXISTS ( SELECT 1
   FROM programmes p
  WHERE ((p.id = programme_lgas.programme_id) AND (p.owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))))));
drop policy if exists programmes_delete on public.programmes;
create policy programmes_delete on public.programmes as permissive for delete to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists programmes_insert on public.programmes;
create policy programmes_insert on public.programmes as permissive for insert to public with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists programmes_select on public.programmes;
create policy programmes_select on public.programmes as permissive for select to public using ((can_view_staff_register() OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists programmes_update on public.programmes;
create policy programmes_update on public.programmes as permissive for update to public using (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids)))) with check (((auth_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'meb_officer'::text])) OR (owner_org_id IN ( SELECT auth_org_ids() AS auth_org_ids))));
drop policy if exists promotions_delete on public.promotions;
create policy promotions_delete on public.promotions as permissive for delete to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists promotions_insert on public.promotions;
create policy promotions_insert on public.promotions as permissive for insert to public with check ((auth_role() = ANY (ARRAY['data_collector'::text, 'admin'::text, 'super_admin'::text])));
drop policy if exists promotions_select on public.promotions;
create policy promotions_select on public.promotions as permissive for select to public using ((auth_role() IS NOT NULL));
drop policy if exists cms_content_select on public.site_content;
create policy cms_content_select on public.site_content as permissive for select to public using (true);
drop policy if exists cms_content_write on public.site_content;
create policy cms_content_write on public.site_content as permissive for all to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists stations_delete on public.stations;
create policy stations_delete on public.stations as permissive for delete to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists stations_insert on public.stations;
create policy stations_insert on public.stations as permissive for insert to public with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));
drop policy if exists stations_select on public.stations;
create policy stations_select on public.stations as permissive for select to public using ((auth_role() IS NOT NULL));
drop policy if exists stations_update on public.stations;
create policy stations_update on public.stations as permissive for update to public using ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))) with check ((auth_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])));

-- ── Grants ─────────────────────────────────────────────────────────────────
grant delete, insert, references, select, trigger, truncate, update on public.audit_log to anon;
grant delete, insert, references, select, trigger, truncate, update on public.audit_log to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.audit_log to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.board_assets to anon;
grant delete, insert, references, select, trigger, truncate, update on public.board_assets to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.board_assets to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.cadres to anon;
grant delete, insert, references, select, trigger, truncate, update on public.cadres to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.cadres to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.centre_organisations to anon;
grant delete, insert, references, select, trigger, truncate, update on public.centre_organisations to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.centre_organisations to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.centre_staff to anon;
grant delete, insert, references, select, trigger, truncate, update on public.centre_staff to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.centre_staff to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.centres to anon;
grant delete, insert, references, select, trigger, truncate, update on public.centres to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.centres to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.cms_contacts to anon;
grant delete, insert, references, select, trigger, truncate, update on public.cms_contacts to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.cms_contacts to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.cms_downloads to anon;
grant delete, insert, references, select, trigger, truncate, update on public.cms_downloads to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.cms_downloads to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.cms_gallery to anon;
grant delete, insert, references, select, trigger, truncate, update on public.cms_gallery to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.cms_gallery to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.cms_news to anon;
grant delete, insert, references, select, trigger, truncate, update on public.cms_news to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.cms_news to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.cms_programs to anon;
grant delete, insert, references, select, trigger, truncate, update on public.cms_programs to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.cms_programs to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.cms_settings to anon;
grant delete, insert, references, select, trigger, truncate, update on public.cms_settings to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.cms_settings to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.cms_team to anon;
grant delete, insert, references, select, trigger, truncate, update on public.cms_team to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.cms_team to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.cohort_overview to anon;
grant delete, insert, references, select, trigger, truncate, update on public.cohort_overview to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.cohort_overview to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.cohorts to anon;
grant delete, insert, references, select, trigger, truncate, update on public.cohorts to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.cohorts to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.correspondence to anon;
grant delete, insert, references, select, trigger, truncate, update on public.correspondence to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.correspondence to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.departments to anon;
grant delete, insert, references, select, trigger, truncate, update on public.departments to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.departments to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.employee_documents to anon;
grant delete, insert, references, select, trigger, truncate, update on public.employee_documents to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.employee_documents to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.employees to anon;
grant delete, insert, references, select, trigger, truncate, update on public.employees to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.employees to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.enrolment_stats to anon;
grant delete, insert, references, select, trigger, truncate, update on public.enrolment_stats to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.enrolment_stats to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.form_assignments to anon;
grant delete, insert, references, select, trigger, truncate, update on public.form_assignments to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.form_assignments to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.form_submissions to anon;
grant delete, insert, references, select, trigger, truncate, update on public.form_submissions to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.form_submissions to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.form_templates to anon;
grant delete, insert, references, select, trigger, truncate, update on public.form_templates to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.form_templates to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.learners to anon;
grant delete, insert, references, select, trigger, truncate, update on public.learners to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.learners to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.leaves to anon;
grant delete, insert, references, select, trigger, truncate, update on public.leaves to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.leaves to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.lga_area_officers to anon;
grant delete, insert, references, select, trigger, truncate, update on public.lga_area_officers to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.lga_area_officers to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.lgas to anon;
grant delete, insert, references, select, trigger, truncate, update on public.lgas to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.lgas to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.organisation_lga_coverage to anon;
grant delete, insert, references, select, trigger, truncate, update on public.organisation_lga_coverage to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.organisation_lga_coverage to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.organisation_members to anon;
grant delete, insert, references, select, trigger, truncate, update on public.organisation_members to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.organisation_members to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.partner_organisations to anon;
grant delete, insert, references, select, trigger, truncate, update on public.partner_organisations to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.partner_organisations to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.programme_lgas to anon;
grant delete, insert, references, select, trigger, truncate, update on public.programme_lgas to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.programme_lgas to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.programmes to anon;
grant delete, insert, references, select, trigger, truncate, update on public.programmes to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.programmes to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.promotions to anon;
grant delete, insert, references, select, trigger, truncate, update on public.promotions to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.promotions to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.public_centres to anon;
grant delete, insert, references, select, trigger, truncate, update on public.public_centres to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.public_centres to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.settings to anon;
grant delete, insert, references, select, trigger, truncate, update on public.settings to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.settings to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.site_content to anon;
grant delete, insert, references, select, trigger, truncate, update on public.site_content to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.site_content to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.stations to anon;
grant delete, insert, references, select, trigger, truncate, update on public.stations to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.stations to service_role;
