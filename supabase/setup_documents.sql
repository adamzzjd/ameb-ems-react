-- ============================================================================
-- AMEB EMS — Employee document vault
-- ----------------------------------------------------------------------------
-- Scanned appointment/promotion letters, certificates, IDs and training
-- records attached to each officer's profile. Files are hosted on Cloudinary
-- (raw uploads); this table only stores the public URL + metadata.
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
--   delete : data_collector+ — editors manage their own district's documents
-- ============================================================================

create table if not exists public.employee_documents (
  id          uuid primary key,
  employee_id uuid not null references public.employees(id) on delete cascade,
  title       text not null,
  category    text not null default 'Other',
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  url         text not null,
  uploaded_by uuid,
  created_at  timestamptz not null default now()
);

create index if not exists employee_documents_employee_idx on public.employee_documents (employee_id, created_at desc);

alter table public.employee_documents enable row level security;

drop policy if exists "employee_documents_select" on public.employee_documents;
create policy "employee_documents_select" on public.employee_documents
  for select using (public.auth_role() is not null);

drop policy if exists "employee_documents_insert" on public.employee_documents;
create policy "employee_documents_insert" on public.employee_documents
  for insert with check (public.auth_role() in ('data_collector', 'admin', 'super_admin'));

drop policy if exists "employee_documents_delete" on public.employee_documents;
create policy "employee_documents_delete" on public.employee_documents
  for delete using (public.auth_role() in ('data_collector', 'admin', 'super_admin'));
