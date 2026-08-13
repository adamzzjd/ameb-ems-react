import { describe, it, expect } from 'vitest';
import { computePayrollRow, buildPayrollRows, fmtNaira, monthLabel, buildIppsCsv } from '../payroll';
import type { Employee } from '../../types';

const base: Employee = {
  id: 'e1', name: 'Aisha Bello', gender: 'Female', grade: 'GL 09', cadre: 'Teacher',
  date_first_appt: null, date_present_appt: null, dob: null, phone: null,
  lga: 'Yola North', psn: 'PS/AM/0001', station: 'Jimeta', photo: null,
  basic_salary: 485200, step: '3', address: null, remarks: '',
};

describe('computePayrollRow', () => {
  it('computes gross from basic salary (allowance is 0 for now)', () => {
    const r = computePayrollRow(base);
    expect(r.basicSalary).toBe(485200);
    expect(r.allowance).toBe(0);
    expect(r.gross).toBe(485200);
  });

  it('treats a missing salary as 0', () => {
    const r = computePayrollRow({ ...base, basic_salary: null });
    expect(r.basicSalary).toBe(0);
    expect(r.gross).toBe(0);
  });

  it('clamps negative salaries to 0', () => {
    const r = computePayrollRow({ ...base, basic_salary: -100 });
    expect(r.basicSalary).toBe(0);
  });
});

describe('buildPayrollRows', () => {
  it('maps every employee to a row', () => {
    const rows = buildPayrollRows([base, { ...base, id: 'e2', name: 'Yusuf Musa', basic_salary: null }]);
    expect(rows).toHaveLength(2);
    expect(rows[1].gross).toBe(0);
  });
});

describe('fmtNaira', () => {
  it('formats naira with thousands separators', () => {
    expect(fmtNaira(485200)).toBe('₦485,200.00');
  });
  it('handles null/undefined as 0', () => {
    expect(fmtNaira(null)).toBe('₦0.00');
    expect(fmtNaira(undefined)).toBe('₦0.00');
  });
});

describe('monthLabel', () => {
  it('renders "August 2026" for month 8 / year 2026', () => {
    expect(monthLabel(8, 2026)).toBe('August 2026');
  });
});

describe('buildIppsCsv', () => {
  it('includes a header, one row per officer and totals', () => {
    const csv = buildIppsCsv(buildPayrollRows([base]), 8, 2026);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('# Adamawa State Mass Education Board — Monthly Payroll — August 2026');
    expect(lines[1]).toContain('FULLNAME');
    expect(lines[2]).toContain('Aisha Bello');
    expect(lines[3]).toContain('TOTAL');
    expect(lines[3]).toContain('485200'); // raw numbers — no commas in CSV
  });

  it('escapes quotes in names', () => {
    const emp = { ...base, name: 'Grace "GG" Adamu' };
    const csv = buildIppsCsv(buildPayrollRows([emp]), 8, 2026);
    expect(csv).toContain('"Grace ""GG"" Adamu"');
  });
});
