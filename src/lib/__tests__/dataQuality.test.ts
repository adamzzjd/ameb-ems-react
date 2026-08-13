import { describe, it, expect } from 'vitest';
import { REQUIRED_FIELDS, getCompletenessStats, findMissing, findDuplicateOfficers } from '../dataQuality';
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

it('REQUIRED_FIELDS covers the register essentials', () => {
  expect(REQUIRED_FIELDS).toContain('name');
  expect(REQUIRED_FIELDS).toContain('psn');
  expect(REQUIRED_FIELDS).toContain('dob');
});
