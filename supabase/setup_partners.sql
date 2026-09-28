-- ============================================================================
-- AMEB EMS — Partner Organisations & Centre Ownership
-- ----------------------------------------------------------------------------
-- Introduces multi-tenancy: external organisations (NGOs, LGAs, CSOs) can be
-- registered, staffed with their own portal users, and own learning centres.
--
-- Adds:
--   partner_organisations  the tenant (NGO / LGA / CSO / faith / private)
--   organisation_members   which authenticated user belongs to which tenant
--   centres (new columns)  owner_type, partner_org_id, centre_code, funding
--                          source, agreement dates, and an approval workflow
--
-- Adds helper functions used by RLS (see setup_rls.sql):
--   auth_org_ids()            the organisation ids the caller belongs to
--   has_org_access(org)       does the caller belong to this organisation?
--   is_adsmeb_staff()         is the caller internal board staff?
--   can_view_staff_register() may the caller read the staff register?
--
-- HOW TO RUN:
--   1. Supabase dashboard → SQL Editor → New query → paste → Run
--   2. Re-run `setup_rls.sql` afterwards — it adds the RLS policies for the
--      two new tables and the new role-aware centre policies.
--   Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE throughout).
-- ============================================================================

-- ── Partner organisations (the tenant) ──────────────────────────────────────
create table if not exists public.partner_organisations (
  id              uuid primary key,
  name            text not null default '',
  type            text not null default 'NGO',   -- NGO | INGO | LGA | CSO | FAITH | GOVT_AGENCY | PRIVATE
  registration_no text,
  contact_person  text,
  phone           text,
  email           text,
  address         text,
  lga             text,
  mou_reference   text,
  agreement_start text,
  agreement_end   text,
  logo            text,                          -- Cloudinary URL
  status          text not null default 'active',-- active | suspended | archived
  remarks         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Enable RLS immediately (deny-all until setup_rls.sql adds the policies).
alter table public.partner_organisations enable row level security;

-- ── Organisation members (which user belongs to which tenant) ───────────────
-- One row per user↔organisation link. Resolved in RLS by auth_org_ids() —
-- deliberately NOT stored as a JWT claim so membership changes take effect
-- immediately without re-issuing tokens, and a user can belong to many
-- organisations. Accounts are always provisioned by a super administrator
-- (see the manage-users edge function); org_admin only manages org data.
create table if not exists public.organisation_members (
  id              uuid primary key,
  organisation_id uuid not null references public.partner_organisations(id) on delete cascade,
  user_id         uuid not null,
  org_role        text not null default 'org_viewer', -- org_admin | org_editor | org_viewer
  status          text not null default 'active',     -- active | suspended
  remarks         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.organisation_members enable row level security;

-- A user is a member of an organisation at most once.
create unique index if not exists organisation_members_user_org_unique
  on public.organisation_members (user_id, organisation_id);
create index if not exists organisation_members_user_idx
  on public.organisation_members (user_id);
create index if not exists organisation_members_org_idx
  on public.organisation_members (organisation_id);

-- ── Centre ownership + approval workflow ────────────────────────────────────
-- Existing centres default to owner_type 'ADSMEB' and approval_status
-- 'approved', so nothing already in the register disappears or goes public in
-- a pending state.
alter table public.centres add column if not exists owner_type      text not null default 'ADSMEB';
alter table public.centres add column if not exists partner_org_id  uuid references public.partner_organisations(id) on delete set null;
alter table public.centres add column if not exists centre_code     text;
alter table public.centres add column if not exists funding_source  text;
alter table public.centres add column if not exists agreement_start text;
alter table public.centres add column if not exists agreement_end   text;
alter table public.centres add column if not exists approval_status text not null default 'approved'; -- pending | approved | rejected
alter table public.centres add column if not exists approved_by     text;
alter table public.centres add column if not exists approved_at     timestamptz;
alter table public.centres add column if not exists rejection_note  text;

-- Human-readable centre code (e.g. 'ADS-YOL-001'). Nullable: centres created
-- before this feature simply have no code.
create unique index if not exists centres_centre_code_unique
  on public.centres (centre_code) where centre_code is not null;

create index if not exists centres_partner_org_idx on public.centres (partner_org_id);

-- ── RLS helper functions ────────────────────────────────────────────────────
-- auth_org_ids() is SECURITY DEFINER so the membership lookup inside RLS
-- policies is not itself blocked by organisation_members' own policies.
create or replace function public.auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organisation_id
  from public.organisation_members
  where user_id = auth.uid()
    and status = 'active';
$$;

create or replace function public.has_org_access(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select org is not null and exists (
    select 1
    from public.organisation_members
    where user_id = auth.uid()
      and organisation_id = org
      and status = 'active'
  );
$$;

-- Internal board staff (all roles that operate the register, including field
-- enumerators). Partner-* roles are deliberately excluded.
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
$$;

-- ── Approval guard for centres ──────────────────────────────────────────────
-- The RLS policies let a partner insert/update their own centres, but they
-- must never be able to approve their own records (or edit their way around
-- the queue). This trigger forces any write by a non-board caller back to
-- 'pending' and clears the approval fields, so an approved centre that a
-- partner later edits returns to the review queue.
create or replace function public.enforce_centres_approval()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_adsmeb_staff() then
    new.approval_status := 'pending';
    new.approved_by := null;
    new.approved_at := null;
  end if;
  return new;
end $$;

drop trigger if exists centres_enforce_approval on public.centres;
create trigger centres_enforce_approval
  before insert or update on public.centres
  for each row execute function public.enforce_centres_approval();

-- NOTE: the trigger fires on every centres write. Board staff signed in through
-- the app keep the approval_status they chose (their JWT says who they are).
-- A write made directly in the SQL Editor carries no JWT, so it is treated as
-- non-board and forced back to 'pending' — which is why approving by hand in
-- SQL requires clearing approval_status afterwards, or running
-- `alter table public.centres disable trigger centres_enforce_approval;` first.

-- ── Public centre directory (re-created with ownership fields) ──────────────
-- The public view bypasses RLS by design (it runs with the view owner's
-- privileges), so it must never expose internal columns and must only surface
-- ADSMEB-approved centres. Re-created here to add owner_type + partner name.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'centres')
     and exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'partner_organisations')
  then
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = 'centre_facilitators')
       and exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = 'facilitators')
    then
      create or replace view public.public_centres as
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
        c.ngo_partner,
        c.owner_type,
        c.centre_code,
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
      create or replace view public.public_centres as
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
        c.ngo_partner,
        c.owner_type,
        c.centre_code,
        po.name as partner_name,
        '{}'::text[] as facilitators
      from public.centres c
      left join public.partner_organisations po on po.id = c.partner_org_id
      where c.approval_status = 'approved';
    end if;

    grant select on public.public_centres to anon, authenticated, service_role;
  end if;
end $$;

-- ── Audit trail: record which tenant an action belongs to ───────────────────
-- Guarded — audit_log is created by setup_audit.sql, which may not have run.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'audit_log') then
    alter table public.audit_log add column if not exists organisation_id uuid;
  end if;
end $$;

-- ── Access ──────────────────────────────────────────────────────────────────
-- ⚠️ SECURITY: now that partner users exist, the employees register must no
-- longer be readable by "any signed-in user". Re-run `setup_rls.sql` — it
-- restricts `employees_select` to internal board roles (can_view_staff_register)
-- and adds the partner_organisations / organisation_members policies.
