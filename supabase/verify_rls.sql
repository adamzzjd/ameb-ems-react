-- ============================================================================
-- AMEB EMS — Verify RLS policies took effect
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor after `setup_rls.sql` to confirm the
-- policies exist on the new facilitator tables (and the contact inbox whose
-- INSERT policy was recently fixed).
--
-- Expected:
--   * RLS enabled = true for all three tables
--   * facilitators      → select, insert, update, delete (insert has WITH CHECK)
--   * centre_facilitators → select, insert, delete
--   * cms_contacts      → insert, select, update, delete
--   * Every INSERT row shows a value under with_check and an EMPTY using_expr.
-- ============================================================================

-- ── 1. Is RLS actually enabled on the tables? ───────────────────────────────
select relname as table_name,
       relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('facilitators', 'centre_facilitators', 'cms_contacts')
order by relname;

-- ── 2. The policies themselves (names, command, role, expressions) ──────────
select tablename,
       policyname,
       cmd,
       roles,
       qual       as using_expr,   -- NULL/empty on INSERT policies (expected)
       with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('facilitators', 'centre_facilitators', 'cms_contacts')
order by tablename, cmd;
