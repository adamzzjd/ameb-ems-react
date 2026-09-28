import type { Learner } from '../types';

// ── Learner register CSV helpers (pure, testable) ───────────────────────────

export const LEARNER_CSV_HEADERS = [
  'Reference No', 'Full Name', 'Gender', 'Age Group', 'Phone', 'LGA', 'Community',
  'Cohort', 'Programme', 'Centre', 'Status', 'Enrolled On', 'Completed On', 'Notes',
] as const;

/** CSV cell escaping: wrap in quotes when needed, double inner quotes. */
export function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows to export for the learner register (joined cohort info optional). */
export interface LearnerExportRow extends Learner {
  cohort_name?: string | null;
  programme_title?: string | null;
  centre_name?: string | null;
}

export function learnerRowsToCsv(
  rows: readonly LearnerExportRow[],
): string {
  const lines = [LEARNER_CSV_HEADERS.join(',')];
  for (const l of rows) {
    lines.push([
      l.reference_no, l.full_name, l.gender, l.age_group, l.phone, l.lga, l.community,
      l.cohort_name, l.programme_title, l.centre_name, l.status, l.enrolled_on, l.completed_on, l.notes,
    ].map(csvCell).join(','));
  }
  return lines.join('\n');
}

/** Trigger a client-side download of the learner CSV. */
export function downloadLearnersCsv(rows: readonly LearnerExportRow[], filename = 'learner-register.csv'): void {
  const blob = new Blob(['\uFEFF' + learnerRowsToCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validate one import row. Returns an error message, or null when the row is
 * usable. Reference numbers must be unique within the sheet.
 */
export function validateLearnerRow(
  row: Record<string, string>,
  seenRefs: Set<string>
): string | null {
  const name = (row['Full Name'] ?? '').trim();
  if (!name) return 'Full Name is required.';
  const ref = (row['Reference No'] ?? '').trim();
  if (ref) {
    if (seenRefs.has(ref)) return `Duplicate reference number in sheet: ${ref}`;
    seenRefs.add(ref);
  }
  return null;
}

/** Map a CSV header alias to the canonical field name. */
const HEADER_ALIASES: Record<string, string> = {
  'reference no': 'Reference No', 'reference': 'Reference No', 'ref': 'Reference No', 'reg no': 'Reference No',
  'full name': 'Full Name', 'name': 'Full Name',
  'gender': 'Gender', 'sex': 'Gender',
  'age group': 'Age Group', 'age': 'Age Group',
  'phone': 'Phone', 'phone number': 'Phone', 'mobile': 'Phone',
  'lga': 'LGA', 'local government': 'LGA',
  'community': 'Community', 'ward': 'Community',
  'cohort': 'Cohort',
  'status': 'Status',
  'enrolled on': 'Enrolled On', 'enrolment date': 'Enrolled On', 'date enrolled': 'Enrolled On',
  'notes': 'Notes', 'remarks': 'Notes',
};

/** Normalize arbitrary CSV headers to the canonical learner headers. */
export function normalizeLearnerHeaders(headers: readonly string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    const key = h.trim().toLowerCase();
    map[h] = HEADER_ALIASES[key] ?? h.trim();
  }
  return map;
}
