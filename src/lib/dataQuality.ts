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

// ── PSN and grade/step validation ───────────────────────────────────────────
// A register imported from a spreadsheet once carried truncated PSNs
// ("20260202972554" for "202602029725554"), placeholders ("TESTUI0001",
// "123456789") and grades with the step folded in ("GL 07/1"). These checks
// catch that shape of damage so a bad import can't quietly reach the register.

export type PsnProblem = 'missing' | 'invalid';
export type GradeProblem = 'missing' | 'invalid-grade' | 'embedded-step' | 'invalid-step';

export interface StaffIssue {
  employee: Employee;
  psn: PsnProblem | null;
  grade: GradeProblem | null;
}

/** The form the register stores: trimmed, inner spaces collapsed, uppercased. */
export function normalizePsn(psn: string | null | undefined): string {
  return String(psn ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

// A real PSN is 12–16 digits. Hand-issued numbers use the MAS 001 form.
const PSN_NUMERIC = /^\d{12,16}$/;
const PSN_MANUAL = /^MAS\s?\d{3}$/;
const GRADE_FORMAT = /^GL \d{1,2}$/;
const STEP_FORMAT = /^\d{1,2}$/;
const MAX_STEP = 15;

/** null when the PSN is usable, otherwise what is wrong with it. */
export function validatePsn(psn: string | null | undefined): PsnProblem | null {
  const v = normalizePsn(psn);
  if (!v) return 'missing';
  if (PSN_NUMERIC.test(v) || PSN_MANUAL.test(v)) return null;
  return 'invalid';
}

/**
 * null when the grade/step pair is usable. A step inside the grade
 * ("GL 07/1") is reported separately from a grade that is simply not in the
 * "GL nn" form, because the first one silently loses the step on import.
 */
export function validateGrade(grade: string | null | undefined, step: string | null | undefined): GradeProblem | null {
  const g = String(grade ?? '').trim().toUpperCase();
  if (!g) return 'missing';
  if (g.includes('/')) return 'embedded-step';
  if (!GRADE_FORMAT.test(g)) return 'invalid-grade';
  const s = String(step ?? '').trim();
  if (!s) return null;
  if (!STEP_FORMAT.test(s)) return 'invalid-step';
  const n = Number(s);
  return n >= 1 && n <= MAX_STEP ? null : 'invalid-step';
}

/** Every officer with a problem in PSN, grade or step. */
export function findStaffIssues(employees: Employee[]): StaffIssue[] {
  const issues: StaffIssue[] = [];
  for (const employee of employees) {
    const psn = validatePsn(employee.psn);
    const grade = validateGrade(employee.grade, employee.step);
    if (psn || grade) issues.push({ employee, psn, grade });
  }
  return issues;
}

/** How many officers each problem affects (for a dashboard summary). */
export function countStaffIssues(employees: Employee[]): { psn: Record<PsnProblem, number>; grade: Record<GradeProblem, number>; total: number } {
  const psn: Record<PsnProblem, number> = { missing: 0, invalid: 0 };
  const grade: Record<GradeProblem, number> = { missing: 0, 'invalid-grade': 0, 'embedded-step': 0, 'invalid-step': 0 };
  const issues = findStaffIssues(employees);
  for (const issue of issues) {
    if (issue.psn) psn[issue.psn] += 1;
    if (issue.grade) grade[issue.grade] += 1;
  }
  return { psn, grade, total: issues.length };
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
