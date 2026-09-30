import { describe, it, expect } from 'vitest';
import {
  answersToCsvRows,
  csvFromRows,
  generateFieldKey,
  normalizeAnswers,
  promoteToLearner,
  validateAnswers,
} from '../forms';
import type { FormField } from '../../types';

const FIELDS: FormField[] = [
  { key: 'full_name', label: 'Full name', type: 'text', required: true },
  { key: 'age', label: 'Age', type: 'number', min: 10, max: 80 },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
  { key: 'subjects', label: 'Subjects', type: 'multi', options: ['Literacy', 'Numeracy'] },
  { key: 'enrolled', label: 'Enrolled', type: 'boolean' },
  { key: 'enrolled_on', label: 'Enrolled on', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

describe('generateFieldKey', () => {
  it('slugifies a label', () => {
    expect(generateFieldKey([], 'Full Name')).toBe('full_name');
  });
  it('strips punctuation and trims underscores', () => {
    expect(generateFieldKey([], '  Learner’s Phone №2! ')).toBe('learner_s_phone_2');
  });
  it('falls back to "field" for an empty label', () => {
    expect(generateFieldKey([], '!!!')).toBe('field');
  });
  it('avoids collisions with a numeric suffix', () => {
    const fields = [{ key: 'full_name', label: 'Full name', type: 'text' as const }];
    expect(generateFieldKey(fields, 'Full name')).toBe('full_name_2');
    expect(generateFieldKey([...fields, { key: 'full_name_2', label: 'x', type: 'text' }], 'Full name')).toBe('full_name_3');
  });
});

describe('validateAnswers', () => {
  it('passes clean answers', () => {
    expect(validateAnswers(FIELDS, { full_name: 'Ada', age: 25, gender: 'Female' })).toEqual({});
  });
  it('flags missing required fields', () => {
    expect(validateAnswers(FIELDS, {})).toEqual({ full_name: 'Full name is required.' });
  });
  it('treats whitespace and empty arrays as empty', () => {
    expect(validateAnswers(FIELDS, { full_name: '   ' })).toHaveProperty('full_name');
    expect(validateAnswers([{ key: 'subjects', label: 'Subjects', type: 'multi', options: ['a'], required: true }], { subjects: [] }))
      .toHaveProperty('subjects');
  });
  it('rejects non-numbers and out-of-range numbers', () => {
    expect(validateAnswers(FIELDS, { age: 'abc' })).toHaveProperty('age');
    expect(validateAnswers(FIELDS, { age: 5 })).toHaveProperty('age');
    expect(validateAnswers(FIELDS, { age: 120 })).toHaveProperty('age');
  });
  it('rejects select values outside the options', () => {
    expect(validateAnswers(FIELDS, { gender: 'Other' })).toHaveProperty('gender');
  });
  it('rejects multi values outside the options', () => {
    expect(validateAnswers(FIELDS, { subjects: ['Literacy', 'Trade'] })).toHaveProperty('subjects');
  });
});

describe('normalizeAnswers', () => {
  it('coerces numbers, booleans and trims strings', () => {
    expect(normalizeAnswers(FIELDS, { age: ' 27 ', enrolled: 'true', full_name: '  Ada  ', notes: ' hi ' })).toEqual({
      age: 27,
      enrolled: true,
      full_name: 'Ada',
      notes: 'hi',
    });
  });
  it('maps empty numbers to null and collects multi as string arrays', () => {
    expect(normalizeAnswers(FIELDS, { age: '', subjects: 'Literacy' })).toEqual({ age: null, subjects: ['Literacy'] });
  });
  it('drops keys that are not in the template', () => {
    expect(normalizeAnswers(FIELDS, { hacker: 'x', full_name: 'Ada' })).toEqual({ full_name: 'Ada' });
  });
});

describe('answersToCsvRows + csvFromRows', () => {
  it('flattens submissions into header + rows with meta columns first', () => {
    const { header, rows } = answersToCsvRows(
      [{ key: 'full_name', label: 'Full name', type: 'text' }],
      [{ id: 's1', status: 'approved', submitted_at: '2026-09-28T10:00:00Z', answers: { full_name: 'Ada' } }]
    );
    expect(header[0]).toBe('submission_id');
    expect(header[3]).toBe('Full name');
    expect(rows[0][3]).toBe('Ada');
  });
  it('joins multi-select answers with semicolons', () => {
    const { rows } = answersToCsvRows(
      [{ key: 'subjects', label: 'Subjects', type: 'multi' }],
      [{ id: 's1', status: 'draft', submitted_at: null, answers: { subjects: ['Literacy', 'Numeracy'] } }]
    );
    expect(rows[0][3]).toBe('Literacy; Numeracy');
  });
  it('escapes commas and quotes in the CSV output', () => {
    const csv = csvFromRows({ header: ['a', 'b'], rows: [['x,y', 'say "hi"']] });
    expect(csv).toBe('a,b\r\n"x,y","say ""hi"""');
  });
});

describe('promoteToLearner', () => {
  it('maps aliased field keys onto the Learner shape', () => {
    // 'phone' is not a declared field, so it must be ignored (only template
    // fields are mapped).
    const learner = promoteToLearner(FIELDS, { full_name: 'Ada', gender: 'Female', phone: '080' });
    expect(learner).toMatchObject({ full_name: 'Ada', gender: 'Female' });
    expect(learner?.phone).toBeNull();
  });
  it('accepts common aliases like name / sex / village', () => {
    const fields: FormField[] = [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'sex', label: 'Sex', type: 'select' },
      { key: 'village', label: 'Village', type: 'text' },
    ];
    expect(promoteToLearner(fields, { name: 'Musa', sex: 'Male', village: 'Girei' }))
      .toMatchObject({ full_name: 'Musa', gender: 'Male', community: 'Girei' });
  });
  it('returns null when no full name is present', () => {
    expect(promoteToLearner(FIELDS, { age: 30 })).toBeNull();
  });
});
