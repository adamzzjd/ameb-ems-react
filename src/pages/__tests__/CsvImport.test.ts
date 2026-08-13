import { describe, it, expect } from 'vitest';
import {
  normalizeCol,
  buildColumnMapping,
  mapRowToEmployee,
  buildImportRecords,
} from '../../lib/csv';

describe('normalizeCol', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeCol('Full Name!')).toBe('full name');
    expect(normalizeCol('L.G.A')).toBe('lga');
    expect(normalizeCol('  Staff   ID  ')).toBe('staff id');
    expect(normalizeCol('GL')).toBe('gl');
  });
});

describe('buildColumnMapping', () => {
  it('maps recognized headers to system fields', () => {
    const m = buildColumnMapping(['Full Name', 'Grade Level', 'PSN', 'Date of Birth']);
    expect(m['Full Name']).toBe('name');
    expect(m['Grade Level']).toBe('grade');
    expect(m['PSN']).toBe('psn');
    expect(m['Date of Birth']).toBe('dob');
  });

  it('leaves unknown headers unmapped', () => {
    const m = buildColumnMapping(['Name', 'Favourite Colour']);
    expect(m['Name']).toBe('name');
    expect(m['Favourite Colour']).toBeNull();
  });

  it('requires a name column to be present for import', () => {
    const m = buildColumnMapping(['PSN', 'Grade']);
    expect(Object.values(m)).not.toContain('name');
    expect(buildImportRecords([{ PSN: 'PS/1' }], m, new Set())).toHaveLength(0);
  });
});

describe('mapRowToEmployee', () => {
  it('maps values and trims whitespace', () => {
    const sysToCSV = { name: 'Full Name', grade: 'Grade', psn: 'PSN', remarks: 'Notes' };
    const emp = mapRowToEmployee(
      { 'Full Name': '  Aisha Bello ', Grade: 'GL 09', PSN: 'PS/AM/001', Notes: '  transferred  ' },
      sysToCSV
    );
    expect(emp.name).toBe('Aisha Bello');
    expect(emp.grade).toBe('GL 09');
    expect(emp.psn).toBe('PS/AM/001');
    expect(emp.remarks).toBe('transferred');
  });

  it('turns empty values into null (except remarks)', () => {
    const emp = mapRowToEmployee(
      { 'Full Name': 'Aisha Bello', Grade: '', Phone: '' },
      { name: 'Full Name', grade: 'Grade', phone: 'Phone' }
    );
    expect(emp.grade).toBeNull();
    expect(emp.phone).toBeNull();
    expect(emp.remarks).toBe('');
    expect(emp.photo).toBeNull();
  });

  it('maps salary, step and address headers', () => {
    const sysToCSV = buildColumnMapping(['Full Name', 'Basic Salary', 'Step', 'Residential Address']);
    const emp = mapRowToEmployee(
      { 'Full Name': 'Aisha Bello', 'Basic Salary': '485200', Step: '3', 'Residential Address': '15 Ahmadu Bello Way, Yola' },
      Object.fromEntries(Object.entries(sysToCSV).map(([k, v]) => [v!, k]))
    );
    expect(emp.basic_salary).toBe(485200);
    expect(emp.step).toBe('3');
    expect(emp.address).toBe('15 Ahmadu Bello Way, Yola');
  });
});

describe('buildImportRecords', () => {
  const rows: Record<string, string>[] = [
    { 'Full Name': 'Bulus Dauda', Grade: 'GL 12', PSN: 'PS/AM/002' },
    { 'Full Name': 'Aisha Bello', Grade: 'GL 09', PSN: 'PS/AM/003' },
    { 'Full Name': '   ', Grade: 'GL 08' },            // empty name → skipped
    { 'Full Name': 'Bulus Dauda', Grade: 'GL 10' },    // duplicate → skipped
  ];

  it('skips nameless rows and duplicates by name (case-insensitive)', () => {
    const mapping = buildColumnMapping(['Full Name', 'Grade', 'PSN']);
    const existing = new Set(['bulus dauda']);
    const records = buildImportRecords(rows, mapping, existing);

    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Aisha Bello');
    expect(records[0].psn).toBe('PS/AM/003');
  });

  it('returns an empty array when there is nothing new to import', () => {
    const mapping = buildColumnMapping(['Full Name']);
    const existing = new Set(['aisha bello', 'bulus dauda']);
    expect(buildImportRecords(rows, mapping, existing)).toHaveLength(0);
  });
});
