-- ============================================================================
-- AMEB EMS — Promotion history
-- ----------------------------------------------------------------------------
-- Append-only-ish record of each officer's promotions (date, from → to grade,
-- reference number, notes). The "Promotions & Progression" page combines this
-- history with a projection of when each officer becomes due for their next
-- grade (present appointment + 3 years).
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard → SQL Editor → New query
--   2. Paste this entire file and click "Run"
--   3. (Safe to run multiple times — uses IF NOT EXISTS / DROP POLICY IF EXISTS)
--   4. Run setup_rls.sql afterwards (or re-run it — it is idempotent) so the
--      auth_role() helper is guaranteed to exist.
--
-- ACCESS MODEL (mirrors employees)
--   select : any signed-in user (any role)
--   insert : data_collector+ (the same roles who can edit employees)
--   delete : admin+ (promotion records are part of the official record, so
--            only admins may remove a mistaken entry)
-- ============================================================================

create table if not exists public.promotions (
  id          uuid primary key,
  employee_id uuid not null references public.employees(id) on delete cascade,
  promoted_on date not null,
  from_grade  text,
  to_grade    text not null,
  reference   text,                 -- promotion letter / committee reference
  notes       text not null default '',
  created_by  uuid,
  created_at  timestamptz not null default now()
);

create index if not exists promotions_employee_idx on public.promotions (employee_id, promoted_on desc);
create index if not exists promotions_date_idx on public.promotions (promoted_on desc);

alter table public.promotions enable row level security;

drop policy if exists "promotions_select" on public.promotions;
create policy "promotions_select" on public.promotions
  for select using (public.auth_role() is not null);

drop policy if exists "promotions_insert" on public.promotions;
create policy "promotions_insert" on public.promotions
  for insert with check (public.auth_role() in ('data_collector', 'admin', 'super_admin'));

drop policy if exists "promotions_delete" on public.promotions;
create policy "promotions_delete" on public.promotions
  for delete using (public.auth_role() in ('admin', 'super_admin'));
