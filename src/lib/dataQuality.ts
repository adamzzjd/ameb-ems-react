// ── Data quality helpers (pure — unit tested) ───────────────────────────────
// Used by the Data Quality dashboard to flag officers missing key fields and
// to detect duplicate names, so the register (and the retirement/gender
// reports built on it) can be trusted.
import type { Employee } from '../types';

/** Fields the register should carry for every officer. */
export const REQUIRED_FIELDS = [
  'name',
  'psn',
  'gender',
  'dob',
  'date_first_appt',
  'phone',
  'lga',
  'station',
] as const;

export type MissingField = (typeof REQUIRED_FIELDS)[number];

export interface CompletenessStats {
  total: number;
  /** Officers with every required field filled in. */
  complete: number;
  /** Field → how many officers are missing it. */
  missing: Record<MissingField, number>;
  /** Names shared by more than one officer (possible duplicates). */
  duplicateNames: { name: string; count: number }[];
  duplicateCount: number;
}

function isBlank(v: string | null | undefined): boolean {
  return !v || !String(v).trim();
}

export function getCompletenessStats(employees: Employee[]): CompletenessStats {
  const missing = Object.fromEntries(REQUIRED_FIELDS.map(f => [f, 0])) as Record<MissingField, number>;
  let complete = 0;

  for (const e of employees) {
    let allFilled = true;
    for (const f of REQUIRED_FIELDS) {
      if (isBlank(e[f] as string | null | undefined)) {
        missing[f] += 1;
        allFilled = false;
      }
    }
    if (allFilled) complete += 1;
  }

  const nameCount = new Map<string, number>();
  for (const e of employees) {
    const name = (e.name || '').trim().toLowerCase();
    if (!name) continue;
    nameCount.set(name, (nameCount.get(name) || 0) + 1);
  }
  const duplicateNames = [...nameCount.entries()]
    .filter(([, c]) => c > 1)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    total: employees.length,
    complete,
    missing,
    duplicateNames,
    duplicateCount: duplicateNames.reduce((s, d) => s + d.count, 0),
  };
}

/** Officers missing a particular field (used by the dashboard's filter). */
export function findMissing(employees: Employee[], field: MissingField): Employee[] {
  return employees.filter(e => isBlank(e[field] as string | null | undefined));
}

/** The officers involved in duplicate names (all copies). */
export function findDuplicateOfficers(employees: Employee[]): Employee[] {
  const nameCount = new Map<string, number>();
  for (const e of employees) {
    const name = (e.name || '').trim().toLowerCase();
    if (name) nameCount.set(name, (nameCount.get(name) || 0) + 1);
  }
  return employees.filter(e => (nameCount.get((e.name || '').trim().toLowerCase()) || 0) > 1);
}
