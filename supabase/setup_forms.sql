-- ============================================================================
-- AMEB EMS — Data Collection Tool: Forms, Assignments & Submissions (Phase 26)
-- ----------------------------------------------------------------------------
-- Lets the board design its own forms (surveys, attendance tallies, facility
-- checks) and push them to enumerators / partner organisations:
--   form_templates   the form design (typed fields as JSONB, versioned)
--   form_assignments who (or which org) should fill a template, where, by when
--   form_submissions the answers (draft → submitted → approved/rejected)
--
-- Design notes
--   • Same tenant model as the delivery tables: nullable owner_org_id
--     (null = board-owned); RLS scopes partner users to their own org.
--   • Decision A (signed off): enumerators see ONLY their own submissions.
--   • Decision B: M&E counts approved submissions only (app-side).
--   • Decision C: online-only in this phase — no offline queue.
--
-- HOW TO RUN:
--   1. Run AFTER `setup_ems.sql` (centres) and `setup_delivery.sql` (cohorts)
--      — the FKs below point at those tables. Preflighted like the rest.
--   2. Supabase dashboard → SQL Editor → paste → Run (idempotent).
--   3. Re-run `setup_rls.sql` afterwards — adds the §4.9 policies.
-- ============================================================================

-- ── Preflight: fail early with a clear message ──────────────────────────────
do $preflight$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'partner_organisations') then
    raise exception 'setup_forms.sql: public.partner_organisations is missing — run supabase/setup_partners.sql first';
  end if;
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'cohorts') then
    raise exception 'setup_forms.sql: public.cohorts is missing — run supabase/setup_delivery.sql first';
  end if;
end
$preflight$;

-- ── Form templates (the board designs these) ────────────────────────────────
create table if not exists public.form_templates (
  id           uuid primary key,
  title        text not null,
  description  text not null default '',
  status       text not null default 'draft',   -- draft | active | retired
  version      integer not null default 1,
  fields       jsonb not null default '[]'::jsonb,
  owner_org_id uuid references public.partner_organisations(id) on delete set null,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.form_templates enable row level security;

create index if not exists form_templates_owner_idx on public.form_templates (owner_org_id);

-- ── Assignments (who should fill which template, where, by when) ────────────
-- assigned_to null = open to every enumerator. centre/cohort optionally scope
-- where the data should be collected.
create table if not exists public.form_assignments (
  id           uuid primary key,
  template_id  uuid not null references public.form_templates(id) on delete cascade,
  assigned_to  uuid,                            -- null = open to all enumerators
  centre_id    uuid references public.centres(id) on delete set null,
  cohort_id    uuid references public.cohorts(id) on delete set null,
  due_date     text,                            -- ISO yyyy-mm-dd
  status       text not null default 'open',    -- open | closed
  owner_org_id uuid references public.partner_organisations(id) on delete set null,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.form_assignments enable row level security;

create index if not exists form_assignments_template_idx on public.form_assignments (template_id);
create index if not exists form_assignments_assigned_idx on public.form_assignments (assigned_to);
create index if not exists form_assignments_owner_idx    on public.form_assignments (owner_org_id);

-- ── Submissions (the answers) ───────────────────────────────────────────────
create table if not exists public.form_submissions (
  id             uuid primary key,
  template_id    uuid not null references public.form_templates(id) on delete cascade,
  assignment_id  uuid references public.form_assignments(id) on delete set null,
  answers        jsonb not null default '{}'::jsonb,
  status         text not null default 'draft',  -- draft | submitted | approved | rejected
  submitted_by   uuid,
  submitted_at   timestamptz,
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  review_note    text,
  centre_id      uuid references public.centres(id) on delete set null,
  cohort_id      uuid references public.cohorts(id) on delete set null,
  owner_org_id   uuid references public.partner_organisations(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.form_submissions enable row level security;

create index if not exists form_submissions_template_idx on public.form_submissions (template_id);
create index if not exists form_submissions_submitter_idx on public.form_submissions (submitted_by);
create index if not exists form_submissions_owner_idx on public.form_submissions (owner_org_id);
