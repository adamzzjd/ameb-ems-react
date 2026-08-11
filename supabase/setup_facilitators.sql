-- ============================================================================
-- AMEB EMS — Facilitators Registry Setup
-- ----------------------------------------------------------------------------
-- Adds the facilitator system to the Learning Centres register:
--
--   facilitators          (the registry — one row per facilitator)
--   centre_facilitators   (many-to-many: a centre can have many facilitators,
--                          a facilitator can serve many centres)
--
-- This script also MIGRATES the old `centres.facilitator` free-text column:
--   1. one facilitator row is created for every distinct legacy name
--   2. every centre is linked to its existing facilitator(s)
--   3. the legacy `facilitator` column is dropped (the app no longer uses it)
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard → "SQL Editor" → "New query"
--   2. Paste this entire file and click "Run"
--   3. Then re-run `setup_rls.sql` so the new tables get their RLS policies.
--      (Safe to run multiple times — migration only runs while the legacy
--       `facilitator` column still exists.)
-- ============================================================================

-- ── Facilitators (registry) ─────────────────────────────────────────────────
create table if not exists public.facilitators (
  id         uuid primary key,
  name       text not null default '',
  gender     text,
  phone      text,
  lga        text,
  community  text,
  remarks    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Centre ↔ Facilitator (many-to-many join) ────────────────────────────────
-- Deleting a centre or a facilitator automatically removes its links.
create table if not exists public.centre_facilitators (
  centre_id      uuid not null references public.centres(id)       on delete cascade,
  facilitator_id uuid not null references public.facilitators(id)  on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (centre_id, facilitator_id)
);

create index if not exists centre_facilitators_centre_idx
  on public.centre_facilitators (centre_id);
create index if not exists centre_facilitators_facilitator_idx
  on public.centre_facilitators (facilitator_id);

-- ── Migrate legacy `centres.facilitator` text into the registry ────────────
-- Runs only once: guarded by the existence of the legacy column, which is
-- dropped at the end of this block. Re-running the script is a no-op here.
-- (Names are whitespace-normalized so "Aisha  Bello" and "Aisha Bello" are
-- treated as the same facilitator.)
do $$
declare
  r        record;
  v_centre record;
  v_fid    uuid;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'centres'
      and column_name  = 'facilitator'
  ) then
    -- 1) One facilitator row per distinct legacy name
    for r in
      select distinct regexp_replace(btrim(facilitator), '\s+', ' ', 'g') as name
      from public.centres
      where facilitator is not null and btrim(facilitator) <> ''
    loop
      insert into public.facilitators (id, name)
      values (gen_random_uuid(), r.name);
    end loop;

    -- 2) Link each centre to its facilitator(s)
    for v_centre in
      select id, regexp_replace(btrim(facilitator), '\s+', ' ', 'g') as name
      from public.centres
      where facilitator is not null and btrim(facilitator) <> ''
    loop
      select id into v_fid
      from public.facilitators
      where name = v_centre.name
      limit 1;
      if v_fid is not null then
        insert into public.centre_facilitators (centre_id, facilitator_id)
        values (v_centre.id, v_fid)
        on conflict do nothing;
      end if;
    end loop;

    -- 3) The app no longer writes to the old text column — drop it
    alter table public.centres drop column facilitator;
  end if;
end $$;

-- ── Access ───────────────────────────────────────────────────────────────────
-- ⚠️ SECURITY: re-run `setup_rls.sql` after this file — it enables RLS on the
-- two new tables with the same access model as stations/cadres/centres
-- (any signed-in user can read; admin+ can write).
