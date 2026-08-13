-- ============================================================================
-- AMEB EMS — Image URL Columns (Cloudinary-only hosting)
-- ----------------------------------------------------------------------------
-- Images are hosted EXCLUSIVELY on Cloudinary. Uploads go straight from the
-- browser to Cloudinary (unsigned preset); the database only ever stores the
-- resulting Cloudinary public URL in text columns — never image data, and
-- never Supabase Storage URLs.
--
-- This script just adds the image columns to the existing tables. It is
-- idempotent and safe to re-run.
--
-- WHY THIS MATTERS FOR EXISTING DATABASES:
--   `CREATE TABLE IF NOT EXISTS` in setup.sql / setup_ems.sql only creates a
--   table when it's absent — it NEVER adds columns to a table that already
--   exists. Databases created before the image columns were introduced (or
--   migrated from the old project) are therefore missing some of them (e.g.
--   `cms_gallery.image`, `employees.photo`). Run this file once to fix that.
--
-- The old Supabase Storage "images" bucket + access policy are intentionally
-- NOT created anymore (see Phase 8.6 in PROGRESS.md). If the bucket already
-- exists in your project with orphaned files, you can delete it in the
-- dashboard: Storage → images → (bucket settings) → Delete bucket.
--
-- HOW TO RUN:
--   1. Supabase dashboard → "SQL Editor" → "New query"
--   2. Paste this entire file and click "Run"
--   3. (Safe to re-run — uses ADD COLUMN IF NOT EXISTS)
-- ============================================================================

-- ── 1. Image URL columns (idempotent — safe for existing databases) ────────
-- site_content: logo + hero + about images for the public website
alter table public.site_content add column if not exists logo_url text;
alter table public.site_content add column if not exists hero_image text;
alter table public.site_content add column if not exists about_image text;

-- cms_programs: optional cover photo (replaces the icon on the public site)
alter table public.cms_programs add column if not exists image text;

-- cms_news: optional thumbnail image (replaces the icon banner when set)
alter table public.cms_news add column if not exists image text;

-- cms_team: optional leadership photo (replaces the initials avatar when set)
alter table public.cms_team add column if not exists photo text;

-- cms_gallery: gallery photos
alter table public.cms_gallery add column if not exists image text;

-- employees: passport photo
alter table public.employees add column if not exists photo text;

-- ── 2. Verify all eight columns now exist ───────────────────────────────────
-- select table_name, column_name
--   from information_schema.columns
--   where table_schema = 'public'
--     and (table_name, column_name) in (
--       ('site_content', 'logo_url'),  ('site_content', 'hero_image'), ('site_content', 'about_image'),
--       ('cms_programs', 'image'),      ('cms_news', 'image'),          ('cms_team', 'photo'),
--       ('cms_gallery', 'image'),       ('employees', 'photo')
--     )
--   order by table_name, column_name;
