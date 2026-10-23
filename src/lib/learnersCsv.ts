// ── Learner CSV helpers (pure — unit tested) ────────────────────────────────
// Column matching, value normalization and de-duplication for the learners
// register. Parsing itself stays in the page (Papa.parse), so everything here
// is a pure function.
import type { Learner } from '../types';
import { AGE_GROUPS, LEARNER_STATUSES } from '../types';
import { normalizeCol } from './csv';

export interface CentreOption {
  id: string;
  name: string;
}

// CSV column headers (normalized) → learner fields.
export const LEARNER_COLUMN_MAP: Record<string, string> = {
  'name': 'full_name', 'full name': 'full_name', 'learner': 'full_name',
  'learner name': 'full_name', 'student': 'full_name', 'student name': 'full_name',
  'reference': 'reference_no', 'reference no': 'reference_no', 'ref': 'reference_no',
  'ref no': 'reference_no', 'reg no': 'reference_no',
  'learner id': 'reference_no', 'id': 'reference_no', 'registration no': 'reference_no',
  'gender': 'gender', 'sex': 'gender',
  'age': 'age_group', 'age group': 'age_group', 'age bracket': 'age_group',
  'phone': 'phone', 'telephone': 'phone', 'mobile': 'phone', 'contact': 'phone',
  'lga': 'lga', 'l.g.a': 'lga', 'local government': 'lga',
  'community': 'community', 'village': 'community', 'town': 'community',
  'centre': 'centre', 'center': 'centre', 'centre name': 'centre',
  'center name': 'centre', 'learning centre': 'centre', 'learning center': 'centre',
  'status': 'status',
  'enrolled': 'enrolled_on', 'enrolled on': 'enrolled_on', 'enrolment date': 'enrolled_on',
  'date enrolled': 'enrolled_on', 'enrollment date': 'enrolled_on',
  'completed': 'completed_on', 'completed on': 'completed_on', 'date completed': 'completed_on',
  'notes': 'notes', 'remarks': 'notes', 'comment': 'notes',
};

/** Map CSV headers to learner fields (null = unrecognized column). */
export function buildLearnerMapping(headers: string[]): Record<string, string | null> {
  const m: Record<string, string | null> = {};
  headers.forEach(h => { m[h] = LEARNER_COLUMN_MAP[normalizeCol(h)] || null; });
  return m;
}

/** CSV headers mapped to system fields, inverted (system field → CSV header). */
export function systemToCsv(mapping: Record<string, string | null>): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(mapping).forEach(([csv, sys]) => { if (sys && !out[sys]) out[sys] = csv; });
  return out;
}

export function normalizeGender(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v === 'm' || v === 'male' || v === 'boy' || v === 'man') return 'Male';
  if (v === 'f' || v === 'female' || v === 'girl' || v === 'woman') return 'Female';
  return raw.trim();
}

/** "15-19" → "15–19" when it matches a known bracket; otherwise trimmed. */
export function normalizeAgeGroup(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withEnDash = v.replace(/\s*[-–]\s*/, '–');
  const match = (AGE_GROUPS as readonly string[]).find(g => g === withEnDash || g.toLowerCase() === v.toLowerCase());
  return match ?? withEnDash;
}

const STATUS_ALIASES: Record<string, string> = {
  active: 'active', 'in progress': 'active', enrolled: 'active', current: 'active', ongoing: 'active',
  completed: 'completed', complete: 'completed', graduated: 'completed', finished: 'completed',
  dropped: 'dropped out', 'dropped out': 'dropped out', dropout: 'dropped out',
  'drop out': 'dropped out', withdrew: 'dropped out', withdrawn: 'dropped out',
  transferred: 'transferred', transfer: 'transferred', 'moved': 'transferred',
};

export function normalizeLearnerStatus(raw: string): string {
  const v = normalizeCol(raw);
  if (!v) return 'active';
  return STATUS_ALIASES[v] ?? ((LEARNER_STATUSES as readonly string[]).includes(v) ? v : 'active');
}

/** Accept 2026-03-12, 12/03/2026 or 12-03-2026; anything else is kept as-is. */
export function normalizeDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return v;
}

export interface LearnerImportPlan {
  records: Array<Partial<Learner> & { full_name: string }>;
  skipped: {
    noName: number;
    duplicateRef: number;   // reference already in the register
    duplicateInFile: number; // same reference twice in the sheet
  };
  unmatchedCentres: string[];
}

/**
 * Plan an import: de-duplicate by reference number, resolve the centre by
 * name, and normalize gender / age group / status / dates.
 *
 * A row whose centre cannot be matched is still imported with no centre and
 * the name is reported, so nothing is silently attached to the wrong school.
 */
export function buildLearnerImportPlan(
  rows: Record<string, string>[],
  mapping: Record<string, string | null>,
  existingRefs: Set<string>,
  centres: CentreOption[]
): LearnerImportPlan {
  const sys = systemToCsv(mapping);
  const nameCol = sys.full_name;
  const empty: LearnerImportPlan = {
    records: [], skipped: { noName: 0, duplicateRef: 0, duplicateInFile: 0 }, unmatchedCentres: [],
  };
  if (!nameCol) return empty;

  const pick = (row: Record<string, string>, field: string): string =>
    (sys[field] ? (row[sys[field]] || '') : '').trim();

  const byName = new Map(centres.map(c => [c.name.trim().toLowerCase(), c.id]));
  const seenRefs = new Set<string>();
  const unmatched = new Set<string>();
  const skipped = { noName: 0, duplicateRef: 0, duplicateInFile: 0 };
  const records: Array<Partial<Learner> & { full_name: string }> = [];

  for (const row of rows) {
    const full_name = (row[nameCol] || '').trim();
    if (!full_name) { skipped.noName++; continue; }

    const ref = pick(row, 'reference_no').toUpperCase();
    if (ref) {
      if (existingRefs.has(ref)) { skipped.duplicateRef++; continue; }
      if (seenRefs.has(ref)) { skipped.duplicateInFile++; continue; }
      seenRefs.add(ref);
    }

    const centreName = pick(row, 'centre');
    let centre_id: string | null = null;
    if (centreName) {
      const found = byName.get(centreName.toLowerCase());
      if (found) centre_id = found;
      else unmatched.add(centreName);
    }

    records.push({
      full_name,
      reference_no: ref || null,
      gender: normalizeGender(pick(row, 'gender')),
      age_group: normalizeAgeGroup(pick(row, 'age_group')),
      phone: pick(row, 'phone') || null,
      lga: pick(row, 'lga') || null,
      community: pick(row, 'community') || null,
      centre_id,
      status: normalizeLearnerStatus(pick(row, 'status')),
      enrolled_on: normalizeDate(pick(row, 'enrolled_on')),
      completed_on: normalizeDate(pick(row, 'completed_on')),
      notes: pick(row, 'notes') || null,
    });
  }

  return { records, skipped, unmatchedCentres: [...unmatched] };
}

// ── CSV Export ────────────────────────────────────────────────────────────────
export function learnersToCSV(learners: Learner[], centres: CentreOption[]): string {
  const byId = new Map(centres.map(c => [c.id, c.name]));
  const headers = [
    'Reference', 'Full Name', 'Gender', 'Age Group', 'Phone',
    'LGA', 'Community', 'Centre', 'Status', 'Enrolled On', 'Completed On', 'Notes',
  ];
  const rows = learners.map(l => [
    l.reference_no || '', l.full_name, l.gender || '', l.age_group || '', l.phone || '',
    l.lga || '', l.community || '',
    l.centres?.name || (l.centre_id ? byId.get(l.centre_id) || '' : ''),
    l.status, l.enrolled_on || '', l.completed_on || '', l.notes || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function exportLearnersCSV(learners: Learner[], centres: CentreOption[]) {
  const csv = learnersToCSV(learners, centres);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AMEB_Learners_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
