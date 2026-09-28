-- ============================================================================
-- AMEB EMS — Verify RLS policies took effect
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor after `setup_rls.sql` to confirm the
-- policies exist on the newer tables — the facilitator registry, the LGA area
-- officers register, the partner-organisation tables, the centres approval
-- policies, the staff-register lockdown, and the contact inbox (whose INSERT
-- policy was recently fixed).
--
-- Expected:
--   * RLS enabled = true for every table listed below
--   * facilitators          → select, insert, update, delete
--   * centre_facilitators   → select, insert, delete
--   * lga_area_officers     → select, insert, update, delete
--   * partner_organisations → select, insert, update, delete (write = super_admin)
--   * organisation_members  → select ONLY (written by the manage-users edge fn)
--   * centres               → select, insert, update, delete (+ the partner_* pair)
--   * employees             → select uses can_view_staff_register() (board roles only)
--   * cms_contacts          → insert, select, update, delete
--   * programmes / cohorts / learners → owner_org-scoped CRUD (setup_delivery.sql)
--   * Every INSERT row shows a value under with_check and an EMPTY using_expr.
-- ============================================================================

-- ── 1. Is RLS actually enabled on the tables? ───────────────────────────────
select relname as table_name,
       relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'facilitators', 'centre_facilitators', 'lga_area_officers', 'cms_contacts',
    'partner_organisations', 'organisation_members', 'centres', 'employees',
    'programmes', 'cohorts', 'learners'
  )
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
  and tablename in (
    'facilitators', 'centre_facilitators', 'lga_area_officers', 'cms_contacts',
    'partner_organisations', 'organisation_members', 'centres', 'employees',
    'programmes', 'cohorts', 'learners'
  )
order by tablename, cmd;

-- ── 3. The RLS helper functions must all exist ──────────────────────────────
-- auth_role / is_adsmeb_staff / can_view_staff_register come from setup_rls.sql;
-- auth_org_ids / has_org_access come from setup_partners.sql.
select proname as helper_function,
       prosecdef as security_definer
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'auth_role', 'is_adsmeb_staff', 'can_view_staff_register',
    'auth_org_ids', 'has_org_access'
  )
order by proname;

-- ── 4. The centre approval trigger must be installed ────────────────────────
select tgname as trigger_name,
       tgenabled as enabled,   -- 'O' = enabled (origin)
       pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'public.centres'::regclass
  and not tgisinternal;
