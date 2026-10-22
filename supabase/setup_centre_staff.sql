-- ============================================================================
-- AMEB EMS — Centre Staff (facilitators drawn from the staff register)
-- ----------------------------------------------------------------------------
-- Replaces the standalone facilitator registry (the old setup_facilitators.sql).
-- A facilitator is now simply a member of staff: centres link straight to
-- `employees` rows, so one person is one record everywhere, and removing
-- somebody from the staff register removes them as a facilitator too.
--
-- Adds:
--   centre_staff   (centre_id, employee_id) — many-to-many
--
-- This script also MIGRATES the old registry:
--   1. every centre_facilitators row whose facilitator name matches exactly one
--      employee (case- and whitespace-insensitive) becomes a centre_staff row
--   2. `centre_facilitators` and `facilitators` are then dropped — anyone who is
--      not on the staff register is discarded
--   3. `public_centres` is rebuilt to read facilitator names from centre_staff
--
-- HOW TO RUN:
--   1. Supabase dashboard → SQL Editor → New query → paste → Run
--   2. Re-run `setup_rls.sql` afterwards so centre_staff gets its policies.
--   Safe to run multiple times — the migration only runs while the legacy
--   tables still exist. The NOTICE output lists what was migrated and discarded.
-- ============================================================================

-- ── Centre ↔ Staff (many-to-many) ───────────────────────────────────────────
-- Deleting a centre or an employee automatically removes the link.
create table if not exists public.centre_staff (
  centre_id   uuid not null references public.centres(id)   on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (centre_id, employee_id)
);

create index if not exists centre_staff_centre_idx
  on public.centre_staff (centre_id);
create index if not exists centre_staff_employee_idx
  on public.centre_staff (employee_id);

-- Enable RLS immediately (deny-all until setup_rls.sql adds the policies).
alter table public.centre_staff enable row level security;

-- ── Migrate the old registry, then remove it ───────────────────────────────
-- Runs only while the legacy tables still exist; re-running is a no-op.
do $$
declare
  v_links    integer := 0;
  v_matched  integer := 0;
  v_people   integer := 0;
  v_orphans  integer := 0;
  r          record;
  v_emp      uuid;
  v_hits     integer;
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'centre_facilitators')
     or not exists (select 1 from information_schema.tables
                    where table_schema = 'public' and table_name = 'facilitators')
  then
    raise notice 'Legacy facilitator tables not found — nothing to migrate.';
    return;
  end if;

  -- 1. Copy every assignment whose name identifies exactly one employee.
  --    Ambiguous names (two officers with the same spelling) are skipped:
  --    guessing would attach a centre to the wrong person. Assign those by
  --    hand in Centres Manager afterwards.
  for r in
    select cf.centre_id, f.name
    from public.centre_facilitators cf
    join public.facilitators f on f.id = cf.facilitator_id
  loop
    v_links := v_links + 1;

    -- array_agg, not min(): there is no min() for uuid.
    select count(*), (array_agg(e.id))[1]
      into v_hits, v_emp
    from public.employees e
    where lower(regexp_replace(btrim(e.name), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(r.name), '\s+', ' ', 'g'));

    if v_hits = 1 then
      insert into public.centre_staff (centre_id, employee_id)
      values (r.centre_id, v_emp)
      on conflict do nothing;
      v_matched := v_matched + 1;
    end if;
  end loop;

  -- 2. Report who is about to be discarded, so the numbers are visible in the
  --    SQL Editor output rather than disappearing silently.
  select count(*) into v_people from public.facilitators;

  select count(*) into v_orphans
  from public.facilitators f
  where not exists (
    select 1 from public.employees e
    where lower(regexp_replace(btrim(e.name), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(f.name), '\s+', ' ', 'g'))
  );

  raise notice 'Centre staff migration: % of % centre links matched a staff member; % of % facilitator records are not on the staff register and will be removed.',
    v_matched, v_links, v_orphans, v_people;
end $$;

-- 3. Drop the registry. Order matters, because these objects depend on each
--    other in both directions:
--      * `public_centres` is a view over the tables (rebuilt below)
--      * the `facilitators_select` policy calls `facilitator_works_for_my_org`,
--        so the policy must go before the function
--      * the two partner-era helpers read the registry, so they go before the
--        tables (`claim_facilitator` let a partner claim a Board facilitator;
--        neither can work once the registry is gone)
--    All guarded, so the script stays re-runnable.
drop view if exists public.public_centres;

do $$
begin
  if to_regclass('public.facilitators') is not null then
    execute 'drop policy if exists "facilitators_select" on public.facilitators';
  end if;
end $$;

drop function if exists public.claim_facilitator(uuid, uuid);
drop function if exists public.facilitator_works_for_my_org(uuid);

drop table if exists public.centre_facilitators;
drop table if exists public.facilitators;

-- ── Public centre directory view ────────────────────────────────────────────
-- Reproduces the shape this database already exposed (approved centres only,
-- owning organisation and centre code included) with one change: facilitator
-- names now come from centre_staff → employees instead of the dropped
-- registry. `remarks` stays out, and views run with the owner's privileges, so
-- anon can read this projection while RLS protects the tables underneath.
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
  c.owner_type,
  c.centre_code,
  po.name as partner_name,
  coalesce(
    array_agg(e.name order by e.name) filter (where e.name is not null),
    '{}'::text[]
  ) as facilitators
from public.centres c
left join public.partner_organisations po on po.id = c.partner_org_id
left join public.centre_staff cs on cs.centre_id = c.id
left join public.employees e on e.id = cs.employee_id
where c.approval_status = 'approved'
group by c.id, po.name;

grant select on public.public_centres to anon, authenticated, service_role;
