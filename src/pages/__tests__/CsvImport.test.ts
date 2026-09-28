import { describe, it, expect } from 'vitest';
import {
  normalizeCol,
  buildColumnMapping,
  mapRowToEmployee,
  buildImportRecords,
  buildImportPlan,
  normalizeGrade,
  matchCadre,
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

  it('maps step and address headers', () => {
    const sysToCSV = buildColumnMapping(['Full Name', 'Step', 'Residential Address']);
    const emp = mapRowToEmployee(
      { 'Full Name': 'Aisha Bello', Step: '3', 'Residential Address': '15 Ahmadu Bello Way, Yola' },
      Object.fromEntries(Object.entries(sysToCSV).map(([k, v]) => [v!, k]))
    );
    expect(emp.step).toBe('3');
    expect(emp.address).toBe('15 Ahmadu Bello Way, Yola');
  });

  it('ignores a Salary column (salaries are not managed in this system)', () => {
    const sysToCSV = buildColumnMapping(['Full Name', 'Basic Salary', 'Salary']);
    expect(Object.values(sysToCSV)).not.toContain('basic_salary');
  });

  it('normalizes grade to GL xx format and uppercases PSN', () => {
    const sysToCSV = buildColumnMapping(['Full Name', 'Grade Level', 'PSN']);
    const emp = mapRowToEmployee(
      { 'Full Name': 'Aisha Bello', 'Grade Level': '07', PSN: 'ps/am/003' },
      Object.fromEntries(Object.entries(sysToCSV).map(([k, v]) => [v!, k]))
    );
    expect(emp.grade).toBe('GL 07');
    expect(emp.psn).toBe('PS/AM/003');
  });

  it('matches cadre to the register list (case-insensitive)', () => {
    const emp = mapRowToEmployee(
      { 'Full Name': 'Aisha Bello', Cadre: 'adult education officer i' },
      { name: 'Full Name', cadre: 'Cadre' }
    );
    expect(emp.cadre).toBe('Adult Education Officer I');
  });
});

describe('normalizeGrade', () => {
  it('formats plain numbers, Grade/Level prefixes and slashed steps', () => {
    expect(normalizeGrade('07')).toBe('GL 07');
    expect(normalizeGrade('7')).toBe('GL 07');
    expect(normalizeGrade('Grade 12')).toBe('GL 12');
    expect(normalizeGrade('Level 08/2')).toBe('GL 08/2');
    expect(normalizeGrade('GL 15/9')).toBe('GL 15/9');
    expect(normalizeGrade('GL 09')).toBe('GL 09');
    expect(normalizeGrade('')).toBe('');
  });
});

describe('matchCadre', () => {
  it('returns the canonical system name for exact and unique matches', () => {
    expect(matchCadre('Driver')).toBe('Driver');
    expect(matchCadre('confidential secretary')).toBe('Confidential Secretary');
    expect(matchCadre('Adult Education Officer II')).toBe('Adult Education Officer II');
  });

  it('keeps the original value when the match is ambiguous or absent', () => {
    expect(matchCadre('Officer')).toBe('Officer'); // matches many cadres
    expect(matchCadre('Zonal Coordinator')).toBe('Zonal Coordinator');
    expect(matchCadre('')).toBe('');
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

describe('buildImportPlan (PSN-safe import)', () => {
  const rows: Record<string, string>[] = [
    { 'Full Name': 'Hauwa Musa', PSN: 'PS/AM/010', 'Grade Level': '07', Cadre: 'Driver' },
    { 'Full Name': 'Ibrahim Adamu', PSN: 'PS/AM/011', 'Grade Level': 'Grade 8', Cadre: 'Clerical Officer' },
    { 'Full Name': 'Already On File', PSN: 'PS/AM/002', 'Grade Level': 'GL 09' }, // PSN exists → skipped untouched
    { 'Full Name': 'Fatima Bello', PSN: 'ps/am/010', 'Grade Level': '09' },        // same PSN as row 1 (case-insensitive) → skipped
    { 'Full Name': '   ', PSN: 'PS/AM/012' },                                      // no name → skipped
  ];

  it('skips existing PSNs untouched, dedupes in-file PSNs, and normalizes grades', () => {
    const mapping = buildColumnMapping(['Full Name', 'PSN', 'Grade Level', 'Cadre']);
    const existingNames = new Set(['bulus dauda']);
    const existingPsns = new Set(['PS/AM/002', 'PS/AM/001']);

    const plan = buildImportPlan(rows, mapping, existingNames, existingPsns);

    expect(plan.records).toHaveLength(2);
    expect(plan.records[0].name).toBe('Hauwa Musa');
    expect(plan.records[0].grade).toBe('GL 07');
    expect(plan.records[0].cadre).toBe('Driver');
    expect(plan.records[1].name).toBe('Ibrahim Adamu');
    expect(plan.records[1].grade).toBe('GL 08');
    expect(plan.records[1].cadre).toBe('Clerical Officer');

    expect(plan.skipped.psnDup).toBe(1);      // PSN/AM/002 already on file
    expect(plan.skipped.psnDupInFile).toBe(1); // ps/am/010 seen twice
    expect(plan.skipped.noName).toBe(1);
    expect(plan.skipped.nameDup).toBe(0);
  });

  it('reports cadre values that did not match the register', () => {
    const rows2: Record<string, string>[] = [
      { 'Full Name': 'Zainab Ali', PSN: 'PS/AM/020', Cadre: 'Zonal Coordinator' },
      { 'Full Name': 'Musa Dan', PSN: 'PS/AM/021', Cadre: 'Driver' },
    ];
    const mapping = buildColumnMapping(['Full Name', 'PSN', 'Cadre']);
    const plan = buildImportPlan(rows2, mapping, new Set(), new Set());

    expect(plan.unmatchedCadres).toEqual(['Zonal Coordinator']);
    expect(plan.records[1].cadre).toBe('Driver');
  });
});
