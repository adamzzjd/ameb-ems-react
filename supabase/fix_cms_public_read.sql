-- ============================================================================
-- AMEB EMS — Fix 8.5.7: site_content + cms_news anon reads blocked by RLS
-- ----------------------------------------------------------------------------
-- Symptom: Landing page / CMS show "No site content found"; anon and
-- logged-in reads of `site_content` and `cms_news` return 0 rows, while
-- cms_programs / cms_team / cms_gallery / cms_downloads read fine.
--
-- Cause: the select (and write) policies for these two tables are missing on
-- the live project — `setup_rls.sql` was likely run before these policy blocks
-- were added. The snippet below is identical to the relevant sections of
-- `supabase/setup_rls.sql`, so running the full file also works.
--
-- Safe to run multiple times (drops + recreates).
-- ============================================================================

-- ── site_content: public read + admin write ─────────────────────────────────
drop policy if exists "cms_content_select" on public.site_content;
create policy "cms_content_select" on public.site_content
  for select using (true);

drop policy if exists "cms_content_write" on public.site_content;
create policy "cms_content_write" on public.site_content
  for all using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

-- ── cms_news: public read + admin write ─────────────────────────────────────
drop policy if exists "cms_news_select" on public.cms_news;
create policy "cms_news_select" on public.cms_news
  for select using (true);

drop policy if exists "cms_news_write" on public.cms_news;
create policy "cms_news_write" on public.cms_news
  for all using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

-- ── Verify: run after applying, expect a row for each policy (8 total) ──────
-- select tablename, policyname, cmd, qual
-- from pg_policies
-- where tablename in ('site_content', 'cms_news')
-- order by tablename, policyname;

-- ── Smoke test (read counts via the anon role) ──────────────────────────────
-- set role anon;
-- select count(*) from public.site_content;
-- select count(*) from public.cms_news;
-- reset role;
