// ── Employee Types ────────────────────────────────────────────────────────────
export interface Employee {
  id: string;
  name: string;
  gender: string | null;
  grade: string | null;
  cadre: string | null;
  date_first_appt: string | null;
  date_present_appt: string | null;
  dob: string | null;
  phone: string | null;
  lga: string | null;
  psn: string | null;
  station: string | null;
  photo: string | null;
  step: string | null;
  address: string | null;
  remarks: string;
  /** Set once the officer has used the self-service portal (one-shot lockout). */
  self_service_submitted_at?: string | null;
  /** The Board unit this officer belongs to (Phase 28 hierarchy). */
  department_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeFormData {
  name: string;
  gender: string;
  grade: string;
  cadre: string;
  date_first_appt: string;
  date_present_appt: string;
  dob: string;
  phone: string;
  lga: string;
  psn: string;
  station: string;
  photo: string;
  /** Grade step — progression detail only; the Board pays salaries outside this system. */
  step: string | null;
  remarks: string;
}

// ── CMS Types ──────────────────────────────────────────────────────────────────
export interface CmsProgram {
  id: string;
  title: string;
  icon: string;
  description: string;
  details?: string;
  image?: string;
  sort_order: number;
}

export interface CmsNews {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  icon: string;
  image?: string;
  body?: string;
  sort_order: number;
}

export interface CmsTeam {
  id: string;
  name: string;
  initials: string;
  role: string;
  photo?: string;
  sort_order: number;
}

export interface CmsGallery {
  id: string;
  label: string;
  image?: string;
  wide?: boolean;
  tall?: boolean;
  sort_order: number;
}

export interface CmsDownload {
  id: string;
  title: string;
  meta: string;
  icon: string;
  sort_order: number;
}

export interface CmsContact {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface SiteContent {
  id?: string;
  hero_badge: string;
  hero_title_1: string;
  hero_title_2: string;
  hero_title_sub: string;
  hero_desc: string;
  about_tag: string;
  about_title: string;
  about_sub: string;
  vision_text: string;
  mission_text: string;
  about_body: string;
  address: string;
  phone: string;
  phone_2: string;
  email: string;
  email_2: string;
  hours: string;
  hours_sat: string;
  programs_tag: string;
  programs_title: string;
  programs_sub: string;
  news_tag: string;
  news_title: string;
  news_sub: string;
  gallery_tag: string;
  gallery_title: string;
  gallery_sub: string;
  downloads_tag: string;
  downloads_title: string;
  downloads_sub: string;
  contact_tag: string;
  contact_title: string;
  contact_sub: string;
  logo_url?: string;
  hero_image?: string;
  about_image?: string;
}

export interface CmsData {
  site_content: SiteContent;
  programs: CmsProgram[];
  news: CmsNews[];
  team: CmsTeam[];
  gallery: CmsGallery[];
  downloads: CmsDownload[];
  contacts: CmsContact[];
}

// ── Station / Cadre / Centre Types ────────────────────────────────────────────
export interface Station {
  id: string;
  name: string;
  lga: string;
  type: string;
  created_at?: string;
  updated_at?: string;
}

export interface Cadre {
  id: string;
  name: string;
  grade: string | null;
  category: string;
  created_at?: string;
  updated_at?: string;
}

/** Who owns / operates a learning centre. */
export type CentreOwnerType = 'ADSMEB' | 'NGO' | 'LGA' | 'COMMUNITY' | 'PRIVATE';

/** ADSMEB review state for centre records created outside the board. */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Centre {
  id: string;
  name: string;
  lga: string;
  ward: string;
  community: string;
  type: string;
  status: string;
  capacity: number | null;
  phone: string;
  remarks: string;
  /** Who owns/operates the centre — powers the public directory filter. */
  owner_type?: CentreOwnerType;
  /** Set when the centre belongs to a registered partner organisation. */
  partner_org_id?: string | null;
  /** Human-readable centre code, e.g. 'ADS-YOL-001'. */
  centre_code?: string | null;
  funding_source?: string | null;
  agreement_start?: string | null;
  agreement_end?: string | null;
  /** Partner-created records start 'pending' until ADSMEB approves them. */
  approval_status?: ApprovalStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_note?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── Partner Organisations (multi-tenancy) ─────────────────────────────────────
export type PartnerOrgType =
  | 'NGO'
  | 'INGO'
  | 'LGA'
  | 'CSO'
  | 'FAITH'
  | 'GOVT_AGENCY'
  | 'PRIVATE';

export type PartnerOrgStatus = 'active' | 'suspended' | 'archived';

export type OrgRole = 'org_admin' | 'org_editor' | 'org_viewer';

/**
 * An external organisation (NGO, LGA, CSO…) that owns learning centres and
 * whose users sign in to a partner-scoped view of the platform. Row access is
 * scoped to the organisation by RLS — see supabase/setup_partners.sql.
 */
export interface PartnerOrganisation {
  id: string;
  name: string;
  type: PartnerOrgType;
  registration_no: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lga: string | null;
  mou_reference: string | null;
  agreement_start: string | null;
  agreement_end: string | null;
  logo: string | null;
  status: PartnerOrgStatus;
  remarks: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Membership link between an authenticated user and a partner organisation.
 * Written only by the manage-users edge function (service role) — never from
 * the browser.
 */
export interface OrganisationMember {
  id: string;
  organisation_id: string;
  user_id: string;
  org_role: OrgRole;
  status: 'active' | 'suspended';
  remarks: string;
  created_at?: string;
  updated_at?: string;
}

/** A partner organisation together with its member count (list view). */
export interface PartnerOrganisationSummary extends PartnerOrganisation {
  centres?: number;
  members?: number;
}

export interface Facilitator {
  id: string;
  name: string;
  gender: string | null;
  phone: string | null;
  lga: string | null;
  community: string | null;
  remarks: string;
  /** Phase 30.2 — null means the facilitator is the Board's own. */
  owner_org_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Many-to-many: a centre can have many facilitators, and a facilitator can
// serve many centres.
export interface CentreFacilitator {
  centre_id: string;
  facilitator_id: string;
  created_at?: string;
}

// Local Government Area Officer — one officer per LGA, always drawn from the
// staff register (`employee_id`). Rows are keyed by LGA so every LGA can have
// at most one area officer; the officer's details are read live from employees.
export interface LgaAreaOfficer {
  id: string;
  lga: string;
  employee_id: string | null;
  remarks: string;
  created_at?: string;
  updated_at?: string;
}

// Public projection of a centre (the `public_centres` view) — safe fields +
// facilitator names only, never internal remarks.
export interface PublicCentre {
  id: string;
  name: string;
  lga: string;
  ward: string | null;
  community: string | null;
  type: string | null;
  status: string;
  capacity: number | null;
  phone: string | null;
  /** Who owns/operates the centre — only approved centres are exposed. */
  owner_type?: CentreOwnerType | null;
  centre_code?: string | null;
  partner_name?: string | null;
  facilitators: string[];
}

// ── Board & partner hierarchy (Phase 28) ──────────────────────────────────
/** A unit of the Board — staff belong to one; assets and correspondence file under it. */
export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string;
  head_employee_id: string | null;
  status: 'active' | 'merged' | 'closed' | string;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

/** A centre's link to an organisation — exactly one lead plus any partners/funders/hosts. */
export type CentreOrgRole = 'lead' | 'partner' | 'funder' | 'host';

/** Centre ↔ organisation many-to-many row (centre_organisations). */
export interface CentreOrgLink {
  id: string;
  centre_id: string;
  org_id: string;
  role: CentreOrgRole | string;
  created_at?: string;
}

/** Programme ↔ LGA scope row (programme_lgas). */
export interface ProgrammeLgaLink {
  programme_id: string;
  lga: string;
}

/** Organisation ↔ LGA coverage row (organisation_lga_coverage). */
export interface OrgLgaCoverage {
  org_id: string;
  lga: string;
}

/** A physical asset of the Board — property, vehicles, materials (no money values). */
export type AssetCategory = 'Furniture' | 'Vehicle' | 'ICT' | 'Teaching Materials' | 'Equipment' | 'Other';
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'written_off';

export interface BoardAsset {
  id: string;
  /** Human asset tag, unique — e.g. 'AMEB-ICT-001'. */
  tag: string;
  name: string;
  category: AssetCategory | string;
  quantity: number;
  condition: AssetCondition | string;
  /** Where the asset sits — at most one of these is set. */
  station_id: string | null;
  department_id: string | null;
  centre_id: string | null;
  /** The officer answerable for the asset. */
  custodian_employee_id: string | null;
  remarks: string;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

/** A filed memo, circular, letter or minutes record — the Board's paper trail. */
export type CorrespondenceKind = 'memo' | 'circular' | 'minutes' | 'letter';
export type CorrespondenceDirection = 'incoming' | 'outgoing' | 'internal';
export type CorrespondenceStatus = 'draft' | 'filed' | 'archived';

export interface Correspondence {
  id: string;
  /** Registry reference, unique — e.g. 'AMEB/ADM/2026/014'. */
  ref_no: string;
  title: string;
  kind: CorrespondenceKind | string;
  direction: CorrespondenceDirection | string;
  department_id: string | null;
  date_issued: string | null;
  /** Who the correspondence involves — free text. */
  parties: string;
  /** Optional attached document. */
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  url: string | null;
  status: CorrespondenceStatus | string;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── Employee Documents (document vault) ──────────────────────────────────────
export interface EmployeeDocument {
  id: string;
  employee_id: string;
  title: string;
  category: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  url: string;
  uploaded_by: string | null;
  created_at?: string;
}

export const DOCUMENT_CATEGORIES = [
  'Appointment Letter',
  'Promotion Letter',
  'Certificate',
  'Identification',
  'Training',
  'Other',
] as const;


// ── Leave Requests ───────────────────────────────────────────────────────────
export interface LeaveRecord {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decided_by: string | null;
  decided_at: string | null;
  decided_note: string | null;
  created_by: string | null;
  created_at?: string;
}

// ── Promotion History ─────────────────────────────────────────────────────────
export interface PromotionRecord {
  id: string;
  employee_id: string;
  promoted_on: string;
  from_grade: string | null;
  to_grade: string;
  reference: string | null;
  notes: string;
  created_by: string | null;
  created_at?: string;
}

// ── Audit Log ──────────────────────────────────────────────────────────────────
// Append-only accountability trail: who did what, when, on which record.
// Written by the app's services after every admin write; readable by
// super_admin only (see supabase/setup_audit.sql).
export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: 'create' | 'update' | 'delete' | 'import' | 'reset' | 'assign' | 'mark_read' | string;
  table_name: string;
  row_id: string | null;
  details: Record<string, unknown>;
  /** Which partner organisation the action belongs to, when applicable. */
  organisation_id?: string | null;
  created_at: string;
}

// ── Enrolment Stats ───────────────────────────────────────────────────────────
// Per-year learner outcome figures managed from the CMS and shown live on the
// public site hero stats.
export interface EnrolmentStat {
  id: string;
  year: number;
  learners_enrolled: number;
  certified: number;
  dropped_out: number;
  no_exam: number;
  ngos: string[];
  created_at?: string;
  updated_at?: string;
}

// ── Programme delivery (programmes / cohorts / learners) ─────────────────────
/** A course or programme the board or a partner organisation delivers. */
export interface Programme {
  id: string;
  title: string;
  description: string;
  category: string | null;
  duration_weeks: number | null;
  status: 'active' | 'paused' | 'closed' | string;
  /** null = board-owned; otherwise the partner organisation that delivers it. */
  owner_org_id: string | null;
  created_at?: string;
  updated_at?: string;
}

/** A delivery of a programme at a centre over a period. */
export interface Cohort {
  id: string;
  programme_id: string;
  centre_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: 'planned' | 'running' | 'completed' | 'cancelled' | string;
  capacity: number | null;
  owner_org_id: string | null;
  created_at?: string;
  updated_at?: string;
}

/** One row of the `cohort_overview` view (cohort + programme + centre + count). */
export interface CohortOverviewRow {
  id: string;
  name: string;
  cohort_status: string;
  start_date: string | null;
  end_date: string | null;
  capacity: number | null;
  owner_org_id: string | null;
  programme_id: string;
  programme_title: string;
  programme_category: string | null;
  centre_id: string;
  centre_name: string;
  centre_lga: string;
  learner_count: number;
}

/** A person enrolled in a cohort — the learner register (not staff). */
export interface Learner {
  id: string;
  reference_no: string | null;
  full_name: string;
  gender: string | null;
  age_group: string | null;
  phone: string | null;
  lga: string | null;
  community: string | null;
  cohort_id: string | null;
  status: 'active' | 'completed' | 'dropped_out' | 'transferred' | string;
  enrolled_on: string | null;
  completed_on: string | null;
  notes: string | null;
  owner_org_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export const LEARNER_AGE_GROUPS = [
  'Out-of-school child',
  'Youth (15–24)',
  'Adult (25+)',
  'Not sure yet',
] as const;

export const LEARNER_STATUSES = ['active', 'completed', 'dropped_out', 'transferred'] as const;

export const COHORT_STATUSES = ['planned', 'running', 'completed', 'cancelled'] as const;

// ── Data collection (forms / assignments / submissions) ────────────────────
/** One question on a form template. */
export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multi' | 'date' | 'boolean' | 'textarea';
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  help?: string;
}

/** A form the board designs. fields is the JSONB column on form_templates. */
export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'retired' | string;
  version: number;
  fields: FormField[];
  owner_org_id: string | null;
  created_at?: string;
  updated_at?: string;
}

/** A template pushed to a user (or open to all enumerators) with scope + due date. */
export interface FormAssignment {
  id: string;
  template_id: string;
  /** null = open to every enumerator. */
  assigned_to: string | null;
  centre_id: string | null;
  cohort_id: string | null;
  due_date: string | null;
  status: 'open' | 'closed' | string;
  owner_org_id: string | null;
  created_at?: string;
  updated_at?: string;
}

/** One person's answers to a template (draft → submitted → approved/rejected). */
export interface FormSubmission {
  id: string;
  template_id: string;
  assignment_id: string | null;
  answers: Record<string, unknown>;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | string;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  centre_id: string | null;
  cohort_id: string | null;
  owner_org_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FilterState {
  search: string;
  lga: string;
  station: string;
  grade: string;
  sortField: keyof Employee;
  sortDir: 1 | -1;
  page: number;
}

// ── Auth Types ─────────────────────────────────────────────────────────────────
export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  loading: boolean;
  session: import('@supabase/supabase-js').Session | null;
  role: import('../lib/roles').Role | null;
  isAdmin: boolean;
  can: (permission: import('../lib/roles').Permission) => boolean;
}

// ── Navigation ──────────────────────────────────────────────────────────────────
export interface PageTitle {
  title: string;
  subtitle: string;
}

export type AppPage =
  | 'dashboard'
  | 'employees'
  | 'explore'
  | 'stations'
  | 'cadres'
  | 'departments'
  | 'board-assets'
  | 'correspondence'
  | 'facilitators'
  | 'lga-officers'
  | 'partners'
  | 'centres'
  | 'cms-dashboard'
  | 'cms-content'
  | 'cms-programs'
  | 'cms-news'
  | 'cms-team'
  | 'cms-gallery'
  | 'cms-downloads'
  | 'cms-inbox'
  | 'cms-enrolments'
  | 'users'
  | 'audit-log'
  | 'account'
  | 'retirement'
  | 'promotions'
  | 'psn-check'
  | 'data-quality'
  | 'programmes'
  | 'cohorts'
  | 'learners'
  | 'reports'
  | 'partner-home'
  | 'partner-centres'
  | 'partner-facilitators'
  | 'form-builder'
  | 'my-assignments'
  | 'submissions-review';
