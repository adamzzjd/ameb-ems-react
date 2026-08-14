// ── CSV import/export helpers (pure — unit tested) ──────────────────────────
import type { Employee } from '../types';
import { GRADES, CADRE_NAMES } from '../data/constants';

// Column name mapping — CSV column headers (normalized) → system field names.
export const CSV_COLUMN_MAP: Record<string, string> = {
  'name': 'name', 'full name': 'name', 'employee name': 'name',
  'staff name': 'name', 'surname': 'name',
  'gender': 'gender', 'sex': 'gender',
  'grade': 'grade', 'grade level': 'grade', 'gl': 'grade',
  'cadre': 'cadre', 'role': 'cadre', 'designation': 'cadre', 'position': 'cadre',
  'phone': 'phone', 'telephone': 'phone', 'mobile': 'phone', 'contact': 'phone',
  'station': 'station', 'posting': 'station', 'location': 'station',
  'lga': 'lga', 'l.g.a': 'lga', 'local government': 'lga',
  'psn': 'psn', 'staff id': 'psn', 'employee id': 'psn', 'file number': 'psn',
  'date first appt': 'date_first_appt', 'first appointment': 'date_first_appt',
  'date of first appointment': 'date_first_appt',
  'date present appt': 'date_present_appt', 'present appointment': 'date_present_appt',
  'date of present appointment': 'date_present_appt',
  'dob': 'dob', 'date of birth': 'dob', 'birth date': 'dob',
  'basic salary': 'basic_salary', 'salary': 'basic_salary', 'basic pay': 'basic_salary',
  'monthly salary': 'basic_salary', 'step': 'step', 'salary step': 'step',
  'address': 'address', 'residential address': 'address', 'home address': 'address',
  'remarks': 'remarks', 'remark': 'remarks', 'notes': 'remarks', 'comment': 'remarks',
};

/** Normalize a CSV header so "Full Name!", "FULL NAME" and "full  name" all match. */
export function normalizeCol(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Map CSV headers to system fields (null = unrecognized column). */
export function buildColumnMapping(headers: string[]): Record<string, string | null> {
  const m: Record<string, string | null> = {};
  headers.forEach(h => {
    m[h] = CSV_COLUMN_MAP[normalizeCol(h)] || null;
  });
  return m;
}

/** Normalize a grade value to the system's "GL xx" format ("07" → "GL 07"). */
export function normalizeGrade(raw: string): string {
  const v = raw.trim();
  if (!v) return '';
  const upper = v.toUpperCase().replace(/\s+/g, ' ').trim();
  if ((GRADES as readonly string[]).includes(upper)) return upper;
  // Extract a level like 7, 07, 7/1 or 15/9 from anything ("Grade 7", "Level 08/2"…)
  const m = upper.match(/(\d{1,2})(?:\/(\d+))?/);
  if (!m) return v;
  return `GL ${m[1].padStart(2, '0')}${m[2] ? '/' + m[2] : ''}`;
}

/**
 * Match a sheet cadre value to the system's cadre list. Returns the canonical
 * system name when the match is unambiguous, otherwise null (unmatched).
 */
export function findCadreMatch(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const norm = v.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  const exact = CADRE_NAMES.find(c => c.toLowerCase() === norm);
  if (exact) return exact;
  const matches = CADRE_NAMES.filter(c => {
    const cn = c.toLowerCase();
    return cn.includes(norm) || norm.includes(cn);
  });
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Match a sheet cadre value to the system's cadre list. Returns the canonical
 * system name when the match is unambiguous; otherwise the trimmed original.
 */
export function matchCadre(raw: string): string {
  return findCadreMatch(raw) ?? raw.trim();
}

/**
 * Turn a parsed CSV row into an employee record using the column mapping.
 * Empty values become null (except remarks, which defaults to ''). Grade and
 * cadre are normalized to match the system's lists; PSN is trimmed + uppercased.
 */
export function mapRowToEmployee(
  row: Record<string, string>,
  sysToCSV: Record<string, string>
): Partial<Employee> {
  const pick = (field: string): string => (row[sysToCSV[field]] || '').trim();
  const psn = pick('psn');
  return {
    name: pick('name'),
    gender: pick('gender') || null,
    grade: normalizeGrade(pick('grade')) || null,
    cadre: matchCadre(pick('cadre')) || null,
    phone: pick('phone') || null,
    station: pick('station') || null,
    lga: pick('lga') || null,
    psn: psn ? psn.toUpperCase() : null,
    date_first_appt: pick('date_first_appt') || null,
    date_present_appt: pick('date_present_appt') || null,
    dob: pick('dob') || null,
    basic_salary: pick('basic_salary') ? Number(pick('basic_salary')) || null : null,
    step: pick('step') || null,
    address: pick('address') || null,
    remarks: pick('remarks') || '',
    photo: null,
  };
}

export interface ImportPlan {
  records: Partial<Employee>[];
  skipped: {
    noName: number;
    nameDup: number;      // name already in the register
    psnDup: number;       // PSN already in the register — untouched
    psnDupInFile: number; // same PSN appears twice in the sheet
  };
  unmatchedCadres: string[];
}

/**
 * Plan an import: dedupe against the register by NAME and by PSN (existing PSNs
 * are skipped untouched — never updated), skip in-file duplicate PSNs, normalize
 * grades/cadres, and report what was skipped and which cadres didn't match.
 */
export function buildImportPlan(
  rows: Record<string, string>[],
  mapping: Record<string, string | null>,
  existingNames: Set<string>,
  existingPsns: Set<string>
): ImportPlan {
  const nameCol = Object.keys(mapping).find(h => mapping[h] === 'name');
  if (!nameCol) {
    return { records: [], skipped: { noName: 0, nameDup: 0, psnDup: 0, psnDupInFile: 0 }, unmatchedCadres: [] };
  }

  const sysToCSV: Record<string, string> = {};
  Object.entries(mapping).forEach(([csv, sys]) => {
    if (sys) sysToCSV[sys] = csv;
  });

  const psnCol = Object.keys(mapping).find(h => mapping[h] === 'psn');
  const cadreCol = Object.keys(mapping).find(h => mapping[h] === 'cadre');

  const skipped = { noName: 0, nameDup: 0, psnDup: 0, psnDupInFile: 0 };
  const unmatchedCadres = new Set<string>();
  const seenPsns = new Set<string>();
  const records: Partial<Employee>[] = [];

  for (const r of rows) {
    const name = (r[nameCol] || '').trim();
    if (!name) { skipped.noName++; continue; }
    if (existingNames.has(name.toLowerCase())) { skipped.nameDup++; continue; }

    const psnRaw = psnCol ? (r[psnCol] || '').trim() : '';
    const psnKey = psnRaw.toUpperCase();
    if (psnRaw) {
      if (existingPsns.has(psnKey)) { skipped.psnDup++; continue; }
      if (seenPsns.has(psnKey)) { skipped.psnDupInFile++; continue; }
      seenPsns.add(psnKey);
    }

    const emp = mapRowToEmployee(r, sysToCSV);
    if (cadreCol) {
      const cadreRaw = (r[cadreCol] || '').trim();
      if (cadreRaw && findCadreMatch(cadreRaw) === null) unmatchedCadres.add(cadreRaw);
    }
    records.push(emp);
  }

  return { records, skipped, unmatchedCadres: [...unmatchedCadres] };
}

/**
 * Build the records to insert (records only). Dedupes by name and by PSN — a
 * PSN already in the register is skipped untouched. See buildImportPlan for
 * skip/unmatched reporting.
 */
export function buildImportRecords(
  rows: Record<string, string>[],
  mapping: Record<string, string | null>,
  existingNames: Set<string>,
  existingPsns: Set<string> = new Set()
): Partial<Employee>[] {
  return buildImportPlan(rows, mapping, existingNames, existingPsns).records;
}

// ── CSV Export ────────────────────────────────────────────────────────────────
export function exportEmployeesCSV(employees: Employee[]) {
  const headers = [
    'PSN', 'Full Name', 'Gender', 'Cadre', 'Grade',
    'Date First Appt', 'Date Present Appt', 'Date of Birth',
    'Phone', 'LGA', 'Station', 'Address', 'Basic Salary', 'Step', 'Remarks',
  ];

  const rows = employees.map(e => [
    e.psn, e.name, e.gender || '', e.cadre, e.grade,
    e.date_first_appt || '', e.date_present_appt || '', e.dob || '',
    e.phone, e.lga, e.station, e.address,
    e.basic_salary ?? '', e.step || '', e.remarks || '',
  ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AMEB_Staff_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
