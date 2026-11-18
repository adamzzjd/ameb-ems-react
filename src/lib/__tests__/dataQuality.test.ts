import { describe, it, expect } from 'vitest';
import {
  REQUIRED_FIELDS,
  getCompletenessStats,
  findMissing,
  findDuplicateOfficers,
  normalizePsn,
  validatePsn,
  validateGrade,
  findStaffIssues,
  countStaffIssues,
} from '../dataQuality';
import type { Employee } from '../../types';

const full: Employee = {
  id: '1',
  name: 'Aisha Bello',
  gender: 'Female',
  grade: 'GL 09',
  cadre: 'Adult Education Officer I',
  date_first_appt: '2010-01-01',
  date_present_appt: '2015-01-01',
  dob: '1980-05-01',
  phone: '08031234567',
  lga: 'Yola North',
  psn: 'PS/AM/001',
  station: 'Yola (HQ)',
  photo: null,
  step: null,
  address: null,
  remarks: '',
};

function emp(overrides: Partial<Employee>): Employee {
  return { ...full, ...overrides };
}

describe('getCompletenessStats', () => {
  it('counts missing fields per officer', () => {
    const stats = getCompletenessStats([
      full,
      emp({ id: '2', name: 'Bulus Dauda', gender: '', dob: null, phone: undefined }),
      emp({ id: '3', name: 'Hauwa Musa', gender: '' }),
    ]);
    expect(stats.total).toBe(3);
    expect(stats.complete).toBe(1);
    expect(stats.missing.gender).toBe(2);
    expect(stats.missing.dob).toBe(1);
    expect(stats.missing.phone).toBe(1);
    expect(stats.missing.name).toBe(0);
  });

  it('detects duplicate names case-insensitively', () => {
    const stats = getCompletenessStats([
      full,
      emp({ id: '2', name: 'aisha bello' }),
      emp({ id: '3', name: 'Bulus Dauda' }),
    ]);
    expect(stats.duplicateNames).toEqual([{ name: 'aisha bello', count: 2 }]);
    expect(stats.duplicateCount).toBe(2);
  });

  it('ignores empty names', () => {
    const stats = getCompletenessStats([
      full,
      emp({ id: '2', name: '' }),
      emp({ id: '3', name: '   ' }),
    ]);
    expect(stats.duplicateNames).toHaveLength(0);
  });
});

describe('findMissing / findDuplicateOfficers', () => {
  it('findMissing returns only officers missing the field', () => {
    const list = [full, emp({ id: '2', gender: '' }), emp({ id: '3', gender: 'Male' })];
    const missing = findMissing(list, 'gender');
    expect(missing.map(e => e.id)).toEqual(['2']);
  });

  it('findDuplicateOfficers returns every copy of a duplicated name', () => {
    const list = [full, emp({ id: '2', name: 'AISHA BELLO' }), emp({ id: '3', name: 'Bulus Dauda' })];
    expect(findDuplicateOfficers(list).map(e => e.id).sort()).toEqual(['1', '2']);
  });
});

describe('normalizePsn', () => {
  it('trims, collapses inner spaces and uppercases', () => {
    expect(normalizePsn('  mas  003 ')).toBe('MAS 003');
    expect(normalizePsn('199401003222')).toBe('199401003222');
    expect(normalizePsn(null)).toBe('');
  });
});

describe('validatePsn', () => {
  it('accepts the real PSN shapes in the register', () => {
    expect(validatePsn('199401003222')).toBeNull();      // 12 digits
    expect(validatePsn('199209017213593')).toBeNull();   // 15 digits
    expect(validatePsn('202602028526707')).toBeNull();
    expect(validatePsn('MAS003')).toBeNull();            // hand-issued
    expect(validatePsn(' mas 004 ')).toBeNull();
  });

  it('flags a blank PSN as missing', () => {
    expect(validatePsn('')).toBe('missing');
    expect(validatePsn('   ')).toBe('missing');
    expect(validatePsn(null)).toBe('missing');
    expect(validatePsn(undefined)).toBe('missing');
  });

  it('rejects junk and truncated numbers', () => {
    expect(validatePsn('TESTUI0001')).toBe('invalid');       // placeholder
    expect(validatePsn('123456789')).toBe('invalid');        // too short
    expect(validatePsn('2026020297')).toBe('invalid');       // truncated hard
    expect(validatePsn('05328/1994/0011270')).toBe('invalid'); // slash form
    expect(validatePsn('20260202972555490')).toBe('invalid'); // too long
  });
});

describe('validateGrade', () => {
  it('accepts GL nn with an optional step in range', () => {
    expect(validateGrade('GL 16', '9')).toBeNull();
    expect(validateGrade('GL 07', '15')).toBeNull();
    expect(validateGrade('GL 04', null)).toBeNull();
    expect(validateGrade('gl 08', '')).toBeNull();
  });

  it('reports a missing grade', () => {
    expect(validateGrade(null, '2')).toBe('missing');
    expect(validateGrade('  ', null)).toBe('missing');
  });

  it('reports a step folded into the grade (the old import bug)', () => {
    expect(validateGrade('GL 07/1', null)).toBe('embedded-step');
    expect(validateGrade('GL 16/9', '9')).toBe('embedded-step');
  });

  it('reports a grade that is not in GL nn form', () => {
    expect(validateGrade('07', '1')).toBe('invalid-grade');
    expect(validateGrade('Grade 8', null)).toBe('invalid-grade');
  });

  it('reports a step that is not a salary step', () => {
    expect(validateGrade('GL 07', '0')).toBe('invalid-step');
    expect(validateGrade('GL 07', '16')).toBe('invalid-step');
    expect(validateGrade('GL 07', 'one')).toBe('invalid-step');
  });
});

describe('findStaffIssues / countStaffIssues', () => {
  const clean = emp({ id: '1', psn: '199401003222', grade: 'GL 09', step: '3' });

  it('returns nothing for a clean register', () => {
    expect(findStaffIssues([clean])).toEqual([]);
    expect(countStaffIssues([clean])).toEqual({
      psn: { missing: 0, invalid: 0 },
      grade: { missing: 0, 'invalid-grade': 0, 'embedded-step': 0, 'invalid-step': 0 },
      total: 0,
    });
  });

  it('reports each damaged record with its problem', () => {
    const issues = findStaffIssues([
      clean,
      { ...clean, id: '2', psn: 'TESTUI0001' },
      { ...clean, id: '3', psn: null },
      { ...clean, id: '4', grade: 'GL 07/1', step: null },
      { ...clean, id: '5', grade: 'GL 07', step: '0' },
    ]);
    expect(issues.map(i => [i.employee.id, i.psn, i.grade])).toEqual([
      ['2', 'invalid', null],
      ['3', 'missing', null],
      ['4', null, 'embedded-step'],
      ['5', null, 'invalid-step'],
    ]);
  });

  it('counts problems per kind', () => {
    const counts = countStaffIssues([
      clean,
      { ...clean, id: '2', psn: 'TESTUI0001' },
      { ...clean, id: '3', psn: '123456789' },
      { ...clean, id: '4', grade: 'GL 07/1' },
    ]);
    expect(counts.psn.invalid).toBe(2);
    expect(counts.grade['embedded-step']).toBe(1);
    expect(counts.total).toBe(3);
  });
});

it('REQUIRED_FIELDS covers the register essentials', () => {
  expect(REQUIRED_FIELDS).toContain('name');
  expect(REQUIRED_FIELDS).toContain('psn');
  expect(REQUIRED_FIELDS).toContain('dob');
});
