// ── CSV import/export helpers (pure — unit tested) ──────────────────────────
import type { Employee } from '../types';

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

/**
 * Turn a parsed CSV row into an employee record using the column mapping.
 * Empty values become null (except remarks, which defaults to '').
 */
export function mapRowToEmployee(
  row: Record<string, string>,
  sysToCSV: Record<string, string>
): Partial<Employee> {
  const pick = (field: string): string => (row[sysToCSV[field]] || '').trim();
  return {
    name: pick('name'),
    gender: pick('gender') || null,
    grade: pick('grade') || null,
    cadre: pick('cadre') || null,
    phone: pick('phone') || null,
    station: pick('station') || null,
    lga: pick('lga') || null,
    psn: pick('psn') || null,
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

/**
 * Build the records to insert: skip rows without a name and rows whose name
 * already exists in the database (duplicate-safe import).
 */
export function buildImportRecords(
  rows: Record<string, string>[],
  mapping: Record<string, string | null>,
  existingNames: Set<string>
): Partial<Employee>[] {
  const nameCol = Object.keys(mapping).find(h => mapping[h] === 'name');
  if (!nameCol) return [];

  const sysToCSV: Record<string, string> = {};
  Object.entries(mapping).forEach(([csv, sys]) => {
    if (sys) sysToCSV[sys] = csv;
  });

  return rows
    .filter(r => {
      const name = (r[nameCol] || '').trim();
      return name && !existingNames.has(name.toLowerCase());
    })
    .map(r => mapRowToEmployee(r, sysToCSV));
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
