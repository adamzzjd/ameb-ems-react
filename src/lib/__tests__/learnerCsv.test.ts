import { describe, it, expect } from 'vitest';
import {
  csvCell, learnerRowsToCsv, validateLearnerRow, normalizeLearnerHeaders,
} from '../learnerCsv';
import type { LearnerExportRow } from '../learnerCsv';

const baseLearner = (over: Partial<LearnerExportRow> = {}): LearnerExportRow => ({
  id: 'l1',
  reference_no: 'LR-001',
  full_name: 'Aisha Mohammed',
  gender: 'Female',
  age_group: 'Adult (25+)',
  phone: '08031234567',
  lga: 'Yola North',
  community: 'Doubeli',
  cohort_id: null,
  status: 'active',
  enrolled_on: '2026-01-15',
  completed_on: null,
  notes: null,
  owner_org_id: null,
  ...over,
});

describe('csvCell', () => {
  it('leaves simple values untouched', () => {
    expect(csvCell('Aisha')).toBe('Aisha');
    expect(csvCell(42)).toBe('42');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes values containing commas, quotes or newlines', () => {
    expect(csvCell('Yola, Adamawa')).toBe('"Yola, Adamawa"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('learnerRowsToCsv', () => {
  it('writes the header row exactly', () => {
    const csv = learnerRowsToCsv([]);
    expect(csv.split('\n')[0]).toBe(
      'Reference No,Full Name,Gender,Age Group,Phone,LGA,Community,Cohort,Programme,Centre,Status,Enrolled On,Completed On,Notes'
    );
  });

  it('serializes a learner row with joined cohort info', () => {
    const csv = learnerRowsToCsv([
      baseLearner({ cohort_name: '2026 Intake A', programme_title: 'Adult Literacy', centre_name: 'Yola Centre' }),
    ]);
    const [, row] = csv.split('\n');
    expect(row).toContain('LR-001');
    expect(row).toContain('Aisha Mohammed');
    expect(row).toContain('2026 Intake A');
    expect(row).toContain('Adult Literacy');
    expect(row).toContain('Yola Centre');
  });

  it('escapes commas in learner notes', () => {
    const csv = learnerRowsToCsv([baseLearner({ notes: 'attends Mon, Wed, Fri' })]);
    expect(csv).toContain('"attends Mon, Wed, Fri"');
  });
});

describe('validateLearnerRow', () => {
  it('requires a full name', () => {
    expect(validateLearnerRow({ 'Full Name': '' }, new Set())).toBe('Full Name is required.');
    expect(validateLearnerRow({}, new Set())).toBe('Full Name is required.');
  });

  it('accepts a row without a reference number', () => {
    expect(validateLearnerRow({ 'Full Name': 'Bala' }, new Set())).toBeNull();
  });

  it('rejects duplicate reference numbers within the sheet', () => {
    const seen = new Set<string>();
    expect(validateLearnerRow({ 'Full Name': 'Bala', 'Reference No': 'R1' }, seen)).toBeNull();
    expect(validateLearnerRow({ 'Full Name': 'Zainab', 'Reference No': 'R1' }, seen)).toContain('Duplicate reference');
  });
});

describe('normalizeLearnerHeaders', () => {
  it('maps common aliases to canonical headers', () => {
    const map = normalizeLearnerHeaders(['Ref', 'NAME', 'Sex', 'Local Government']);
    expect(map['Ref']).toBe('Reference No');
    expect(map['NAME']).toBe('Full Name');
    expect(map['Sex']).toBe('Gender');
    expect(map['Local Government']).toBe('LGA');
  });

  it('leaves unknown headers as-is (trimmed)', () => {
    const map = normalizeLearnerHeaders(['Favourite Colour ']);
    expect(map['Favourite Colour ']).toBe('Favourite Colour');
  });
});
