-- ============================================================================
-- AMEB EMS — Purge non-Cloudinary image URLs (Cloudinary-only)
-- ----------------------------------------------------------------------------
-- The app now uploads to and serves images exclusively from Cloudinary
-- (res.cloudinary.com). This script finds and clears any leftover image
-- values that still point at base64 data or Supabase Storage URLs, so the
-- database contains ONLY Cloudinary URLs (or NULL).
--
-- SCHEMA-AWARE: every table.column is checked against information_schema
-- first. Columns that don't exist in your database (older schemas) are
-- reported as "missing column" instead of crashing the script — see Step 3
-- to add them.
--
-- NOTE: the table.column list below (7 pairs) is duplicated in Steps 1/2 and
-- in setup_storage.sql / scripts/diag-count.mjs — keep them in sync.
--
-- ⚠️  Step 2 contains IRREVERSIBLE UPDATEs. Run Step 1 FIRST and check the
--     counts. Only uncomment Step 2 when you're sure every remaining
--     non-Cloudinary value is safe to discard.
--
-- Run in the Supabase dashboard → SQL Editor → New query.
-- ============================================================================

-- ── 1. Review: counts of non-Cloudinary values per column ───────────────────
--    legacy_rows   = rows holding base64 / Supabase Storage / anything-not-
--                    Cloudinary (these are the values Step 2 would clear)
--    status        = 'ok' | 'missing column'
create temp table if not exists image_legacy_review (tbl text, col text, legacy_rows bigint, status text);
truncate image_legacy_review;

do $$
declare
  r  record;
  q  text;
  cnt bigint;
begin
  for r in select * from (values
    ('site_content'::text, 'logo_url'::text),
    ('site_content', 'hero_image'),
    ('site_content', 'about_image'),
    ('cms_news', 'image'),
    ('cms_team', 'photo'),
    ('cms_gallery', 'image'),
    ('employees', 'photo')
  ) as v(tbl, col)
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = r.tbl
        and column_name = r.col
    ) then
      q := format(
        'select count(*) from public.%I where coalesce(%I,'''') <> '''' and %I !~ ''^https?://res\.cloudinary\.com/''',
        r.tbl, r.col, r.col
      );
      execute q into cnt;
      insert into image_legacy_review values (r.tbl, r.col, cnt, 'ok');
    else
      insert into image_legacy_review values (r.tbl, r.col, 0, 'missing column');
    end if;
  end loop;
end $$;

select * from image_legacy_review order by tbl, col;

-- ── 2. Clear leftover base64 / Supabase Storage values (UNCOMMENT TO RUN) ───
-- do $$
-- declare
--   r record;
-- begin
--   for r in select * from (values
--     ('site_content'::text, 'logo_url'::text),
--     ('site_content', 'hero_image'),
--     ('site_content', 'about_image'),
--     ('cms_news', 'image'),
--     ('cms_team', 'photo'),
--     ('cms_gallery', 'image'),
--     ('employees', 'photo')
--   ) as v(tbl, col)
--   loop
--     if exists (
--       select 1 from information_schema.columns
--       where table_schema = 'public'
--         and table_name = r.tbl
--         and column_name = r.col
--     ) then
--       execute format(
--         'update public.%I set %I = case when %I ~ ''^https?://res\.cloudinary\.com/'' then %I else null end',
--         r.tbl, r.col, r.col, r.col
--       );
--     end if;
--   end loop;
-- end $$;

-- ── 3. Add any MISSING image columns (fixes old schemas; safe to re-run) ────
--    The app expects all of these columns. Run this once if Step 1 reported
--    any "missing column" rows. (Also part of setup_storage.sql.)
-- alter table public.site_content add column if not exists logo_url text;
-- alter table public.site_content add column if not exists hero_image text;
-- alter table public.site_content add column if not exists about_image text;
-- alter table public.cms_news     add column if not exists image text;
-- alter table public.cms_team     add column if not exists photo text;
-- alter table public.cms_gallery  add column if not exists image text;
-- alter table public.employees    add column if not exists photo text;

-- ── 4. Verify after purging: re-run Step 1, then this check must be 0 ───────
-- select count(*) as legacy_rows_left
--   from image_legacy_review
--   where legacy_rows > 0;
