-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 30.2 — PARTNER PORTAL BACKEND (schema)
--
-- What partners gained: facilitators they own, and an organisation profile
-- they can keep up to date themselves.
--
--   §1 facilitators.owner_org_id  — NULL means the facilitator is the Board's
--        own; existing rows stay NULL so no current facilitator is silently
--        reassigned to an organisation.
--   §2 protect_org_columns()      — a partner may edit contact fields, but
--        status / type / registration_no stay Board-only (RLS cannot filter
--        columns, so a trigger does it).
--
-- The RLS policies themselves live in setup_rls.sql (single source of truth) —
-- run setup_rls.sql AFTER this script so the org-scoped facilitator and
-- partner_organisations_update policies are in place.
--
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Preflight ────────────────────────────────────────────────────────────
do $preflight$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'facilitators') then
    raise exception 'facilitators table missing — run supabase/setup_ems.sql first';
  end if;
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'partner_organisations') then
    raise exception 'partner_organisations missing — run supabase/setup_partners.sql first';
  end if;
end
$preflight$;

-- ── 1. Facilitators belong to an organisation ───────────────────────────────
alter table public.facilitators
  add column if not exists owner_org_id uuid
  references public.partner_organisations(id) on delete set null;

create index if not exists facilitators_owner_org_idx
  on public.facilitators(owner_org_id);

-- ── 2. Column guard on the organisation profile ─────────────────────────────
create or replace function public.protect_org_columns()
returns trigger
language plpgsql
as $guard$
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
$guard$;

drop trigger if exists protect_org_columns on public.partner_organisations;
create trigger protect_org_columns
  before update on public.partner_organisations
  for each row execute function public.protect_org_columns();

-- ── 3. Claiming a Board-registered facilitator ─────────────────────────────
-- RLS deliberately lets a partner UPDATE only its OWN facilitators, so the
-- "claim" action cannot be a plain update: a Board facilitator has
-- owner_org_id NULL and would simply be filtered out. This function does the
-- one thing a partner is allowed to do to it — take ownership — and only
-- when the facilitator is unowned and the org is really theirs.
create or replace function public.claim_facilitator(facilitator uuid, org uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $claim$
declare
  current_owner uuid;
begin
  if org is null or org not in (select public.auth_org_ids()) then
    return false;
  end if;
  if public.auth_role() not in ('partner_admin', 'partner_editor') then
    return false;
  end if;

  select f.owner_org_id into current_owner
  from public.facilitators f
  where f.id = facilitator
  for update;

  -- only an unowned facilitator can be claimed
  if current_owner is not null then
    return false;
  end if;

  update public.facilitators set owner_org_id = org where id = facilitator;
  return true;
end
$claim$;

grant execute on function public.claim_facilitator(uuid, uuid) to authenticated;

-- ── 4. Verification ─────────────────────────────────────────────────────────
-- §3a. Facilitators by owner (Board = NULL).
select case when f.owner_org_id is null then 'Board (unclaimed)' else coalesce(o.name, 'unknown org') end as owner,
       count(*) as facilitators
from public.facilitators f
left join public.partner_organisations o on o.id = f.owner_org_id
group by 1 order by 2 desc;

-- §3b. Centres awaiting Board approval (unchanged by this script).
select approval_status, count(*) from public.centres group by 1 order by 1;