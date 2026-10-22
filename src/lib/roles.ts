// ── Roles & Permissions ─────────────────────────────────────────────────────
// Central role definitions and permission checks for the AMEB EMS.
//
// Roles are stored on the Supabase auth user's `app_metadata.role` (server
// controlled — end users cannot modify app_metadata themselves, unlike
// user_metadata). RLS policies can read the same claim from the JWT:
//   auth.jwt() ->> 'role'
//
// Use `can(role, 'permission')` in the UI to gate features and routes.
// ⚠️ Frontend checks are UX, not security — the DB policies are the gate.

export type Role = 'super_admin' | 'admin' | 'data_collector' | 'staff';

export const ROLES: readonly Role[] = [
  'super_admin',
  'admin',
  'data_collector',
  'staff',
];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
  data_collector: 'Data Collector',
  staff: 'Staff',
};

export type Permission =
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'employees.import'
  | 'employees.export'
  | 'settings.manage'
  | 'cms.edit'
  | 'users.manage'
  | 'audit.view';

// ── Permission matrix ───────────────────────────────────────────────────────
//    super_admin  → everything, including user management
//    admin        → full operational access (EMS + settings + CMS)
//    data_collector → field data entry: view / add / edit employees only
//    staff        → read-only access to the register
const PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: [
    'employees.view',
    'employees.create',
    'employees.edit',
    'employees.delete',
    'employees.import',
    'employees.export',
    'settings.manage',
    'cms.edit',
    'users.manage',
    'audit.view',
  ],
  admin: [
    'employees.view',
    'employees.create',
    'employees.edit',
    'employees.delete',
    'employees.import',
    'employees.export',
    'settings.manage',
    'cms.edit',
  ],
  data_collector: [
    'employees.view',
    'employees.create',
    'employees.edit',
  ],
  staff: [
    'employees.view',
  ],
};

// Higher rank = more privilege. Used for "at least this role" checks.
const ROLE_RANK: Record<Role, number> = {
  super_admin: 4,
  admin: 3,
  data_collector: 2,
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
