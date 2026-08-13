import { describe, it, expect } from 'vitest';
import {
  LEAVE_TYPES,
  calcLeaveDays,
  yearsOfService,
  getAnnualLeaveBalance,
  validateLeaveRequest,
  isoDate,
  isApprovedOnDay,
  monthGrid,
  buildLeaveRequestsCsv,
  buildLeaveBalancesCsv,
} from '../leave';
import type { Employee } from '../../types';

function yearsAgo(years: number, month = 0, day = 1): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years, month, day);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const emp: Employee = {
  id: 'e1', name: 'Aisha Bello', gender: 'Female', grade: 'GL 09', cadre: 'Teacher',
  date_first_appt: yearsAgo(5), date_present_appt: null, dob: null, phone: null,
  lga: 'Yola North', psn: 'PS/AM/0001', station: 'Jimeta', photo: null,
  basic_salary: null, step: null, address: null, remarks: '',
};

describe('calcLeaveDays', () => {
  it('counts working days only (Mon–Fri)', () => {
    // Mon 2026-08-10 → Fri 2026-08-14 = 5 working days.
    expect(calcLeaveDays('2026-08-10', '2026-08-14')).toBe(5);
  });

  it('skips weekends across a full week', () => {
    // Mon 2026-08-10 → Sun 2026-08-16 = 5 working days (Sat/Sun excluded).
    expect(calcLeaveDays('2026-08-10', '2026-08-16')).toBe(5);
  });

  it('returns 0 for invalid or reversed ranges', () => {
    expect(calcLeaveDays(null, '2026-08-10')).toBe(0);
    expect(calcLeaveDays('2026-08-10', null)).toBe(0);
    expect(calcLeaveDays('2026-08-14', '2026-08-10')).toBe(0);
  });

  it('counts 10 working days across two full weeks', () => {
    // Mon 2026-08-10 → Fri 2026-08-21 = 10 working days.
    expect(calcLeaveDays('2026-08-10', '2026-08-21')).toBe(10);
  });
});

describe('yearsOfService', () => {
  it('returns null without a first appointment date', () => {
    expect(yearsOfService(null)).toBeNull();
  });

  it('counts whole years and reduces before the anniversary', () => {
    const exact = new Date();
    exact.setFullYear(exact.getFullYear() - 5);
    exact.setHours(0, 0, 0, 0);
    expect(yearsOfService(isoDate(exact))).toBe(5);

    // Five years ago plus one day: this year's anniversary hasn't arrived yet.
    const shy = new Date();
    shy.setDate(shy.getDate() + 1);
    shy.setFullYear(shy.getFullYear() - 5);
    shy.setHours(0, 0, 0, 0);
    expect(yearsOfService(isoDate(shy))).toBe(4);
  });
});

describe('monthGrid', () => {
  it('builds a Monday-first grid for January 2026 (starts Thursday)', () => {
    // 2026-01-01 is a Thursday → 3 leading nulls (Mon, Tue, Wed).
    const weeks = monthGrid(2026, 0);
    expect(weeks.length).toBe(5);
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][2]).toBeNull();
    expect(weeks[0][3]?.getDate()).toBe(1);
    expect(weeks[0][3]?.getMonth()).toBe(0);
  });

  it('pads the trailing week with nulls (February 2026 ends Saturday)', () => {
    // 2026-02-01 is a Sunday (6 leading nulls in a Monday-first grid) and Feb
    // has 28 days → 6 + 28 + 1 pad = 35 cells = 5 weeks, last cell null.
    const weeks = monthGrid(2026, 1);
    expect(weeks.length).toBe(5);
    expect(weeks[0][0]).toBeNull();
    const last = weeks[4][6];
    expect(last === null || last.getMonth() === 1).toBe(true);
  });
});

describe('isApprovedOnDay', () => {
  const span = { status: 'approved', start_date: '2026-08-10', end_date: '2026-08-14' };

  it('matches days inside an approved range', () => {
    expect(isApprovedOnDay(span, new Date(2026, 7, 10))).toBe(true);
    expect(isApprovedOnDay(span, new Date(2026, 7, 14))).toBe(true);
  });

  it('is false outside the range', () => {
    expect(isApprovedOnDay(span, new Date(2026, 7, 9))).toBe(false);
    expect(isApprovedOnDay(span, new Date(2026, 7, 15))).toBe(false);
  });

  it('ignores non-approved statuses', () => {
    expect(isApprovedOnDay({ ...span, status: 'pending' }, new Date(2026, 7, 12))).toBe(false);
    expect(isApprovedOnDay({ ...span, status: 'rejected' }, new Date(2026, 7, 12))).toBe(false);
  });
});

describe('getAnnualLeaveBalance', () => {
  it('accrues 12 working days per year of service, capped at 36', () => {
    expect(getAnnualLeaveBalance(emp, 0)?.accrued).toBe(60 < 36 ? 60 : 36);
    // 5 years → 60 days → capped at 36.
    expect(getAnnualLeaveBalance(emp, 0)?.accrued).toBe(36);
    expect(getAnnualLeaveBalance(emp, 0)?.balance).toBe(36);
  });

  it('subtracts used annual leave', () => {
    const b = getAnnualLeaveBalance(emp, 12);
    expect(b?.used).toBe(12);
    expect(b?.balance).toBe(24);
  });

  it('never shows a negative balance', () => {
    const b = getAnnualLeaveBalance(emp, 999);
    expect(b?.used).toBe(36);
    expect(b?.balance).toBe(0);
  });

  it('returns null without a first appointment date', () => {
    expect(getAnnualLeaveBalance({ date_first_appt: null }, 0)).toBeNull();
  });
});

describe('validateLeaveRequest', () => {
  it('rejects an invalid type', () => {
    expect(validateLeaveRequest({ employeeId: 'e1', leaveType: 'PTO', startDate: '2026-08-10', endDate: '2026-08-12', reason: '' }))
      .toMatch(/Select a leave type/);
  });

  it('rejects reversed dates', () => {
    expect(validateLeaveRequest({ employeeId: 'e1', leaveType: 'Annual', startDate: '2026-08-14', endDate: '2026-08-10', reason: '' }))
      .toMatch(/End date must be on or after/);
  });

  it('rejects requests beyond the type limit', () => {
    // 2 full weeks Mon→Fri = 10 working days > 7 (Casual).
    const msg = validateLeaveRequest({ employeeId: 'e1', leaveType: 'Casual', startDate: '2026-08-10', endDate: '2026-08-21', reason: '' });
    expect(msg).toMatch(/limited to 7 working days/);
  });

  it('accepts a valid annual request', () => {
    expect(validateLeaveRequest({ employeeId: 'e1', leaveType: 'Annual', startDate: '2026-08-10', endDate: '2026-08-14', reason: 'Travel' }))
      .toBeNull();
  });

  it('annual leave max is 12 working days', () => {
    const annual = LEAVE_TYPES.find(t => t.key === 'Annual')!;
    expect(annual.maxDays).toBe(12);
  });

  it('maternity is limited to 90 working days', () => {
    // Jan 5 → Jun 30 2026 is ~127 working days, well over the cap.
    const msg = validateLeaveRequest({ employeeId: 'e1', leaveType: 'Maternity', startDate: '2026-01-05', endDate: '2026-06-30', reason: '' });
    expect(msg).toMatch(/limited to 90 working days/);
  });

  it('study leave has no day cap', () => {
    expect(validateLeaveRequest({ employeeId: 'e1', leaveType: 'Study', startDate: '2026-01-05', endDate: '2026-12-31', reason: '' })).toBeNull();
  });
});

describe('buildLeaveRequestsCsv', () => {
  it('renders quoted headers and rows, escaping embedded quotes', () => {
    const csv = buildLeaveRequestsCsv([{
      name: 'Bello, Aisha', psn: 'PS/1', leave_type: 'Annual',
      start_date: '2026-08-10', end_date: '2026-08-14', days: 5,
      reason: 'Travel "home"', status: 'approved', decided_note: null,
    }]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('"Officer"');
    expect(lines[0]).toContain('"Working Days"');
    expect(lines[1]).toContain('"Bello, Aisha"');
    expect(lines[1]).toContain('"Travel ""home"""');
    expect(lines[1]).toContain('"approved"');
  });
});

describe('buildLeaveBalancesCsv', () => {
  it('appends a totals row summing accrued/used/balance', () => {
    const csv = buildLeaveBalancesCsv([
      { name: 'A', psn: 'P1', years: 5, accrued: 36, used: 10, balance: 26, other: 'Sick: 2' },
      { name: 'B', psn: 'P2', years: 2, accrued: 24, used: 0, balance: 24, other: '' },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Annual Balance');
    expect(lines[1]).toContain('"A"');
    expect(lines[3]).toContain('"TOTAL"');
    expect(lines[3]).toContain('"60"'); // 36 + 24 accrued
    expect(lines[3]).toContain('"10"'); // 10 + 0 used
    expect(lines[3]).toContain('"50"'); // 26 + 24 balance
  });
});
