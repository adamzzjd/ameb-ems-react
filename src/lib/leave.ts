// ── Leave helpers (pure — unit tested) ──────────────────────────────────────
// Nigerian public service convention: annual leave is 12 working days per year
// of service, with a cap on accumulation. Weekends (Sat/Sun) don't count.
import type { Employee } from '../types';

export interface LeaveType {
  key: string;
  label: string;
  /** Max days per request (0 = as approved). */
  maxDays: number;
  /** Working days accrued per year of service (0 = not accrued). */
  accrualPerYear: number;
  /** Cap on accumulated days. */
  accrualCap: number;
}

export const LEAVE_TYPES: readonly LeaveType[] = [
  { key: 'Annual', label: 'Annual Leave', maxDays: 12, accrualPerYear: 12, accrualCap: 36 },
  { key: 'Sick', label: 'Sick Leave', maxDays: 10, accrualPerYear: 0, accrualCap: 0 },
  { key: 'Study', label: 'Study Leave', maxDays: 0, accrualPerYear: 0, accrualCap: 0 },
  { key: 'Maternity', label: 'Maternity Leave', maxDays: 90, accrualPerYear: 0, accrualCap: 0 },
  { key: 'Paternity', label: 'Paternity Leave', maxDays: 10, accrualPerYear: 0, accrualCap: 0 },
  { key: 'Casual', label: 'Casual Leave', maxDays: 7, accrualPerYear: 0, accrualCap: 0 },
];

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  return isNaN(d.getTime()) ? null : d;
}

/** Whole working days (Mon–Fri) between two inclusive dates; 0 when invalid. */
export function calcLeaveDays(start: string | null | undefined, end: string | null | undefined): number {
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e) return 0;
  if (e < s) return 0;
  let days = 0;
  const cur = new Date(s.getTime());
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Whole years since the given date (null when missing). */
export function yearsOfService(dateFirstAppt: string | null | undefined): number | null {
  const start = parseDate(dateFirstAppt);
  if (!start) return null;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const beforeAnniversary =
    now.getMonth() < start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() < start.getDate());
  if (beforeAnniversary) years -= 1;
  return years;
}

export interface LeaveBalance {
  accrued: number;
  used: number;
  balance: number;
}

/**
 * Annual-leave balance for an officer: accrued = 12 working days × whole years
 * of service (capped), minus working days of approved Annual leave.
 * Returns nulls when the officer has no first-appointment date (can't accrue).
 */
export function getAnnualLeaveBalance(
  emp: Pick<Employee, 'date_first_appt'>,
  approvedAnnualDays: number
): LeaveBalance | null {
  const years = yearsOfService(emp.date_first_appt);
  if (years === null) return null;
  const type = LEAVE_TYPES.find(t => t.key === 'Annual')!;
  const accrued = Math.min(years * type.accrualPerYear, type.accrualCap);
  const used = Math.min(approvedAnnualDays, accrued); // never show a negative balance
  return { accrued, used, balance: accrued - used };
}

export interface LeaveRequestInput {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

/** Validation for a new leave request → error message or null. */
export function validateLeaveRequest(input: LeaveRequestInput): string | null {
  const type = LEAVE_TYPES.find(t => t.key === input.leaveType);
  if (!type) return 'Select a leave type.';
  const days = calcLeaveDays(input.startDate, input.endDate);
  if (days <= 0) return 'End date must be on or after the start date.';
  if (type.maxDays > 0 && days > type.maxDays) {
    return `${type.label} is limited to ${type.maxDays} working days (this request is ${days}).`;
  }
  return null;
}

// ── Leave calendar (pure — unit tested) ────────────────────────────────────

/** Local ISO date (YYYY-MM-DD) for a Date. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** True when an approved leave record covers the given day. */
export function isApprovedOnDay(
  l: { status: string; start_date: string; end_date: string },
  day: Date
): boolean {
  if (l.status !== 'approved') return false;
  const d = isoDate(day);
  return d >= l.start_date && d <= l.end_date;
}

/**
 * Monday-first month grid: an array of weeks, each a 7-cell array of
 * Date | null (null = a day belonging to an adjacent month, for alignment).
 */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Mon-first offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// ── CSV export (pure — unit tested) ────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export interface LeaveRequestCsvRow {
  name: string;
  psn: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  decided_note: string | null;
}

/** CSV of leave requests (one row each), quoted + escaped for Excel. */
export function buildLeaveRequestsCsv(rows: LeaveRequestCsvRow[]): string {
  const headers = ['Officer', 'PSN', 'Leave Type', 'Start', 'End', 'Working Days', 'Reason', 'Status', 'Decision Note'];
  const lines = rows.map(r => [
    r.name, r.psn, r.leave_type, r.start_date, r.end_date, r.days, r.reason, r.status, r.decided_note,
  ].map(csvCell).join(','));
  return [headers.map(csvCell).join(','), ...lines].join('\n');
}

export interface LeaveBalanceCsvRow {
  name: string;
  psn: string | null;
  years: number | null;
  accrued: number | null;
  used: number | null;
  balance: number | null;
  other: string;
}

/** CSV of annual-leave balances, with a totals row appended. */
export function buildLeaveBalancesCsv(rows: LeaveBalanceCsvRow[]): string {
  const headers = ['Officer', 'PSN', 'Years of Service', 'Annual Accrued', 'Annual Used', 'Annual Balance', 'Other Approved (days)'];
  const lines = rows.map(r => [
    r.name, r.psn, r.years, r.accrued, r.used, r.balance, r.other,
  ].map(csvCell).join(','));
  const totals = {
    name: 'TOTAL', psn: null as string | null, years: null as number | null,
    accrued: rows.reduce((s, r) => s + (r.accrued ?? 0), 0),
    used: rows.reduce((s, r) => s + (r.used ?? 0), 0),
    balance: rows.reduce((s, r) => s + (r.balance ?? 0), 0),
    other: '',
  };
  return [headers.map(csvCell).join(','), ...lines, [
    totals.name, totals.psn, totals.years, totals.accrued, totals.used, totals.balance, totals.other,
  ].map(csvCell).join(',')].join('\n');
}

/** Trigger a browser download of a CSV string. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
