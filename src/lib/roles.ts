// ── Roles & Permissions ─────────────────────────────────────────────────────
// Central role definitions and permission checks for the AMEB EMS.
//
// Roles are stored on the Supabase auth user's `app_metadata.role` (server
// controlled — end users cannot modify app_metadata themselves, unlike
// user_metadata). RLS policies can read the same claim from the JWT:
//   auth.jwt() -> 'app_metadata' ->> 'role'
//
// Use `can(role, 'permission')` in the UI to gate features and routes.
// ⚠️ Frontend checks are UX, not security — the DB policies are the gate.
//
// Internal board roles operate the register. `partner_*` roles belong to an
// external organisation (NGO / LGA / CSO): their *row* access is scoped to
// their own organisation by RLS (see supabase/setup_partners.sql), so the same
// `centres.manage` permission means "manage my organisation's centres" for a
// partner and "manage any centre" for board staff. Cooperating permission
// checks must therefore be paired with RLS, never used alone.

export type Role =
  | 'super_admin'
  | 'admin'
  | 'meb_officer'
  | 'lga_officer'
  | 'enumerator'
  | 'data_collector'
  | 'partner_admin'
  | 'partner_editor'
  | 'partner_viewer'
  | 'mne_viewer'
  | 'staff';

export const ROLES: readonly Role[] = [
  'super_admin',
  'admin',
  'meb_officer',
  'lga_officer',
  'enumerator',
  'data_collector',
  'mne_viewer',
  'partner_admin',
  'partner_editor',
  'partner_viewer',
  'staff',
];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
  meb_officer: 'MEB Officer',
  lga_officer: 'LGA Area Officer',
  enumerator: 'Enumerator',
  data_collector: 'Data Collector',
  partner_admin: 'Partner Administrator',
  partner_editor: 'Partner Editor',
  partner_viewer: 'Partner Viewer',
  mne_viewer: 'M&E Viewer',
  staff: 'Staff',
};

/** Roles that belong to an external partner organisation (tenant-scoped). */
export const PARTNER_ROLES: readonly Role[] = [
  'partner_admin',
  'partner_editor',
  'partner_viewer',
];

/** True when the role is an external partner organisation user. */
export function isPartnerRole(role: Role | null | undefined): boolean {
  return !!role && PARTNER_ROLES.includes(role);
}

export type Permission =
  // Staff register (internal only)
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'employees.import'
  | 'employees.export'
  // Programme delivery
  | 'centres.manage'
  | 'programmes.manage'
  | 'learners.manage'
  | 'enrolments.manage'
  | 'forms.submit'
  | 'forms.manage'
  | 'reports.view'
  | 'approvals.review'
  // Administration
  | 'settings.manage'
  | 'partners.manage'
  | 'cms.edit'
  | 'users.manage'
  | 'audit.view'
  | 'leave.approve';

// ── Permission matrix ───────────────────────────────────────────────────────
//    super_admin   → everything, including partner + user management
//    admin         → full operational access (EMS + settings + CMS + approvals)
//    meb_officer   → programme delivery across the board
//    lga_officer   → programme delivery within their LGA (row-scoped by RLS)
//    enumerator    → field data capture: learners, enrolments, forms
//    data_collector→ staff register entry + field data capture
//    partner_admin → manage their organisation's delivery (row-scoped by RLS)
//    partner_editor→ edit their organisation's learners/enrolments
//    partner_viewer→ read-only within their organisation
//    mne_viewer    → read-only dashboards and reports
//    staff         → read-only access to the register
const PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: [
    'employees.view',
    'employees.create',
    'employees.edit',
    'employees.delete',
    'employees.import',
    'employees.export',
    'centres.manage',
    'programmes.manage',
    'learners.manage',
    'enrolments.manage',
    'forms.manage',
    'forms.submit',
    'reports.view',
    'approvals.review',
    'settings.manage',
    'partners.manage',
    'cms.edit',
    'users.manage',
    'audit.view',
    'leave.approve',
  ],
  admin: [
    'employees.view',
    'employees.create',
    'employees.edit',
    'employees.delete',
    'employees.import',
    'employees.export',
    'centres.manage',
    'programmes.manage',
    'learners.manage',
    'enrolments.manage',
    'forms.submit',
    'reports.view',
    'approvals.review',
    'forms.manage',
    'settings.manage',
    'cms.edit',
    'leave.approve',
  ],
  meb_officer: [
    'employees.view',
    'centres.manage',
    'programmes.manage',
    'learners.manage',
    'enrolments.manage',
    'forms.submit',
    'reports.view',
    'approvals.review',
    'forms.manage',
    'settings.manage',
    'cms.edit',
  ],
  lga_officer: [
    'employees.view',
    'centres.manage',
    'learners.manage',
    'enrolments.manage',
    'forms.submit',
    'reports.view',
  ],
  enumerator: [
    'learners.manage',
    'enrolments.manage',
    'forms.submit',
  ],
  data_collector: [
    'employees.view',
    'employees.create',
    'employees.edit',
    'learners.manage',
    'enrolments.manage',
    'forms.submit',
  ],
  partner_admin: [
    'centres.manage',
    'programmes.manage',
    'learners.manage',
    'enrolments.manage',
    'reports.view',
  ],
  partner_editor: [
    'centres.manage',
    'learners.manage',
    'enrolments.manage',
  ],
  partner_viewer: [
    'reports.view',
  ],
  mne_viewer: [
    'reports.view',
  ],
  staff: [
    'employees.view',
  ],
};

// Higher rank = more privilege. Used for "at least this role" checks.
const ROLE_RANK: Record<Role, number> = {
  super_admin: 11,
  admin: 10,
  meb_officer: 8,
  lga_officer: 7,
  data_collector: 6,
  partner_admin: 6,
  mne_viewer: 5,
  partner_editor: 5,
  enumerator: 4,
  partner_viewer: 3,
  staff: 1,
};

/**
 * Safely coerce an unknown value (e.g. `user.app_metadata.role`) into a
 * known Role, returning null for anything unrecognized.
 */
export function normalizeRole(value: unknown): Role | null {
  if (typeof value === 'string' && (ROLES as readonly string[]).includes(value)) {
    return value as Role;
  }
  return null;
}

/**
 * Check whether a role holds a specific permission.
 * Always denies when role is null/undefined.
 */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(permission);
}

/**
 * Check whether a role sits at or above `min` in the hierarchy.
 * Always denies when role is null/undefined.
 */
export function roleAtLeast(role: Role | null | undefined, min: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
