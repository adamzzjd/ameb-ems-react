import { describe, it, expect } from 'vitest';
import {
  buildLearnerMapping,
  buildLearnerImportPlan,
  normalizeGender,
  normalizeAgeGroup,
  normalizeLearnerStatus,
  normalizeDate,
  learnersToCSV,
  type CentreOption,
} from '../learnersCsv';
import type { Learner } from '../../types';

const CENTRES: CentreOption[] = [
  { id: 'c1', name: 'GSS Girei' },
  { id: 'c2', name: 'Jambutu Center' },
];

const row = (over: Record<string, string> = {}) => ({
  'Full Name': 'Aisha Bello',
  'Reference': 'AM/001',
  'Gender': 'F',
  'Age Group': '15-19',
  'Phone': '08030000000',
  'LGA': 'Girei',
  'Community': 'Girei',
  'Centre': 'GSS Girei',
  'Status': 'Active',
  'Enrolled On': '12/03/2026',
  ...over,
});

describe('buildLearnerMapping', () => {
  it('maps common header spellings to learner fields', () => {
    const m = buildLearnerMapping(['Full Name', 'Learner ID', 'Age Bracket', 'Learning Centre', 'Date Enrolled']);
    expect(m['Full Name']).toBe('full_name');
    expect(m['Learner ID']).toBe('reference_no');
    expect(m['Age Bracket']).toBe('age_group');
    expect(m['Learning Centre']).toBe('centre');
    expect(m['Date Enrolled']).toBe('enrolled_on');
  });

  it('leaves unrecognized columns unmapped', () => {
    expect(buildLearnerMapping(['Whatever']).Whatever).toBeNull();
  });

  it('normalizes case, punctuation and spacing', () => {
    const m = buildLearnerMapping(['FULL  NAME!', 'Ref No.']);
    expect(m['FULL  NAME!']).toBe('full_name');
    expect(m['Ref No.']).toBe('reference_no');
  });
});

describe('value normalization', () => {
  it('resolves gender variants', () => {
    expect(normalizeGender('M')).toBe('Male');
    expect(normalizeGender('female')).toBe('Female');
    expect(normalizeGender('')).toBeNull();
    expect(normalizeGender('Other')).toBe('Other');
  });

  it('uses the en dash for age brackets', () => {
    expect(normalizeAgeGroup('15-19')).toBe('15–19');
    expect(normalizeAgeGroup('60+')).toBe('60+');
    expect(normalizeAgeGroup('')).toBeNull();
  });

  it('maps status aliases to the register values', () => {
    expect(normalizeLearnerStatus('Active')).toBe('active');
    expect(normalizeLearnerStatus('drop out')).toBe('dropped out');
    expect(normalizeLearnerStatus('Graduated')).toBe('completed');
    expect(normalizeLearnerStatus('')).toBe('active');
    expect(normalizeLearnerStatus('nonsense')).toBe('active');
  });

  it('accepts ISO and dd/mm/yyyy dates', () => {
    expect(normalizeDate('2026-03-12')).toBe('2026-03-12');
    expect(normalizeDate('12/03/2026')).toBe('2026-03-12');
    expect(normalizeDate('1-3-2026')).toBe('2026-03-01');
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate('March 2026')).toBe('March 2026');
  });
});

describe('buildLearnerImportPlan', () => {
  const mapping = buildLearnerMapping(Object.keys(row()));

  it('maps a complete row, resolving the centre by name', () => {
    const plan = buildLearnerImportPlan([row()], mapping, new Set(), CENTRES);
    expect(plan.records).toHaveLength(1);
    expect(plan.records[0]).toMatchObject({
      full_name: 'Aisha Bello',
      reference_no: 'AM/001',
      gender: 'Female',
      age_group: '15–19',
      centre_id: 'c1',
      status: 'active',
      enrolled_on: '2026-03-12',
    });
    expect(plan.skipped).toEqual({ noName: 0, duplicateRef: 0, duplicateInFile: 0 });
    expect(plan.unmatchedCentres).toEqual([]);
  });

  it('skips rows with no name', () => {
    const plan = buildLearnerImportPlan([row({ 'Full Name': '  ' })], mapping, new Set(), CENTRES);
    expect(plan.records).toHaveLength(0);
    expect(plan.skipped.noName).toBe(1);
  });

  it('skips references already in the register and duplicates inside the file', () => {
    const existing = new Set(['AM/009']);
    const plan = buildLearnerImportPlan(
      [row({ Reference: 'AM/009' }), row({ Reference: 'AM/010' }), row({ Reference: 'am/010' })],
      mapping,
      existing,
      CENTRES
    );
    expect(plan.records).toHaveLength(1);
    expect(plan.records[0].reference_no).toBe('AM/010');
    expect(plan.skipped).toEqual({ noName: 0, duplicateRef: 1, duplicateInFile: 1 });
  });

  it('imports with no centre when the name does not match, and reports it', () => {
    const plan = buildLearnerImportPlan([row({ Centre: 'Unknown School' })], mapping, new Set(), CENTRES);
    expect(plan.records[0].centre_id).toBeNull();
    expect(plan.unmatchedCentres).toEqual(['Unknown School']);
  });

  it('matches centre names case-insensitively', () => {
    const plan = buildLearnerImportPlan([row({ Centre: 'jambutu center' })], mapping, new Set(), CENTRES);
    expect(plan.records[0].centre_id).toBe('c2');
  });

  it('returns nothing when there is no name column', () => {
    const plan = buildLearnerImportPlan([row()], buildLearnerMapping(['Phone']), new Set(), CENTRES);
    expect(plan.records).toHaveLength(0);
  });
});

describe('learnersToCSV', () => {
  const learner = (over: Partial<Learner> = {}): Learner => ({
    id: 'l1', reference_no: 'AM/001', full_name: 'Aisha Bello', gender: 'Female',
    age_group: '15–19', phone: '08030000000', lga: 'Girei', community: 'Girei',
    centre_id: 'c1', cohort_id: null, status: 'active',
    enrolled_on: '2026-03-12', completed_on: null, notes: 'Needs a mat',
    ...over,
  });

  it('writes a header row and quotes values', () => {
    const csv = learnersToCSV([learner()], CENTRES);
    const [header, first] = csv.split('\n');
    expect(header).toBe('Reference,Full Name,Gender,Age Group,Phone,LGA,Community,Centre,Status,Enrolled On,Completed On,Notes');
    expect(first).toContain('"Aisha Bello"');
    expect(first).toContain('"GSS Girei"');
    expect(first).toContain('"Needs a mat"');
  });

  it('prefers the joined centre name, then the centre list', () => {
    expect(learnersToCSV([learner({ centres: { name: 'Joined Name' } })], CENTRES)).toContain('"Joined Name"');
    expect(learnersToCSV([learner()], CENTRES)).toContain('"GSS Girei"');
    expect(learnersToCSV([learner({ centre_id: null })], CENTRES)).not.toContain('"GSS Girei"');
  });

  it('escapes double quotes inside values', () => {
    expect(learnersToCSV([learner({ notes: 'Said "hello"' })], CENTRES)).toContain('"Said ""hello"""');
  });
});
