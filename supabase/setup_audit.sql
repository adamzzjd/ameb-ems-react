-- ============================================================================
-- AMEB EMS — Audit Log
-- ----------------------------------------------------------------------------
-- Records who did what, when, on which record — an accountability trail for
-- all admin/editor writes (employees, stations, cadres, centres, facilitators,
-- enrolment stats, CMS content, contact inbox actions).
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard → SQL Editor → New query
--   2. Paste this entire file and click "Run"
--   3. (Safe to run multiple times — uses IF NOT EXISTS / DROP POLICY IF EXISTS)
--   4. Run setup_rls.sql afterwards (or just re-run it — it is idempotent) so
--      the auth_role() helper is guaranteed to exist.
--
-- ACCESS MODEL
--   audit_log insert : any signed-in user (the app logs from the client with
--                      the user's JWT). Append-only.
--   audit_log select : super_admin only — the audit trail is a sensitive
--                      accountability record and must not be readable (or
--                      writable) by the admins whose actions it records.
--   No update/delete policies — RLS denies them by default, so the log is
--   append-only.
-- ============================================================================

-- ── Audit log table ─────────────────────────────────────────────────────────
-- `details` holds a small JSON summary of what changed (e.g. {name, psn} for
-- employees) — never full records with photos or remarks.
create table if not exists public.audit_log (
  id          uuid primary key,
  user_id     uuid,
  user_email  text,
  user_role   text,
  action      text not null,          -- create | update | delete | import | reset | assign | mark_read
  table_name  text not null,          -- e.g. employees, centres, cms_news
  row_id      text,                   -- affected row id (uuid or label), nullable
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Query helpers: newest-first, per-table, per-user.
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_table_idx   on public.audit_log (table_name, created_at desc);
create index if not exists audit_log_user_idx    on public.audit_log (user_email);

-- ── RLS (append-only; super_admin can read) ─────────────────────────────────
alter table public.audit_log enable row level security;

drop policy if exists "audit_log_insert" on public.audit_log;
create policy "audit_log_insert" on public.audit_log
  for insert with check (public.auth_role() is not null);

drop policy if exists "audit_log_select" on public.audit_log;
create policy "audit_log_select" on public.audit_log
  for select using (public.auth_role() = 'super_admin');
