-- ============================================================================
-- AMEB EMS — Supabase Storage Setup (images)
-- ----------------------------------------------------------------------------
-- Enables image uploads for the public website and CMS:
--   1. Creates the public "images" storage bucket
--   2. Grants the app (anon key) read/write access to that bucket
--   3. Adds the new image columns to existing tables
--
-- WHY:
--   The app stores image URLs in text columns; the actual files live in
--   Supabase Storage so the database stays small and images load fast via
--   CDN-cached public URLs. Existing base64 images (gallery, employee
--   photos) keep working untouched — only new uploads use Storage.
--
-- HOW TO RUN:
--   1. Supabase dashboard → "SQL Editor" → "New query"
--   2. Paste this entire file and click "Run"
--   3. (Safe to re-run — uses IF NOT EXISTS / ON CONFLICT)
--
-- NOTE: The app performs all requests with the Supabase anon key (RLS is
-- disabled on tables elsewhere), so we grant the anon role access to this
-- bucket. If you later add real authentication, tighten these policies.
-- ============================================================================

-- ── 1. Storage bucket ────────────────────────────────────────────────────────
-- Public bucket → files get public URLs (no auth needed to view).
-- Limits: 8 MB per file, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images', 'images', true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- ── 2. Access policy ────────────────────────────────────────────────────────
-- Version-safe: a DO block checks the policy catalog first, so this works on
-- PostgreSQL 14 (no CREATE POLICY IF NOT EXISTS there) and can be re-run.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'images_anon_all'
  ) then
    create policy "images_anon_all" on storage.objects
      for all
      using (bucket_id = 'images')
      with check (bucket_id = 'images');
  end if;
end
$$;

-- ── 3. New image columns (idempotent — safe for existing databases) ────────
-- site_content: logo + hero + about images for the public website
alter table public.site_content add column if not exists logo_url text;
alter table public.site_content add column if not exists hero_image text;
alter table public.site_content add column if not exists about_image text;

-- cms_team: optional leadership photo (replaces the initials avatar when set)
alter table public.cms_team add column if not exists photo text;

-- cms_news: optional thumbnail image (replaces the icon banner when set)
alter table public.cms_news add column if not exists image text;
