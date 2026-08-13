// ── Retirement & tenure helpers (pure — unit tested) ────────────────────────
// Nigerian public service rule: an officer retires at age 60 OR after 35 years
// of pensionable service — whichever comes FIRST.
import type { Employee } from '../types';

export const RETIREMENT_AGE = 60;
export const MAX_SERVICE_YEARS = 35;
/** Officers retiring within this many years are flagged as "due soon". */
export const DUE_SOON_YEARS = 2;

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  // Treat a plain calendar date (YYYY-MM-DD) as LOCAL time so age/tenure
  // boundaries land on the correct day regardless of the browser timezone
  // (parsing bare 'YYYY-MM-DD' as UTC can shift the date back a day).
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  return isNaN(d.getTime()) ? null : d;
}

/** Whole years since the given date (null when the date is missing). */
export function calcAge(dob: string | null | undefined): number | null {
  const birth = parseDate(dob);
  if (!birth) return null;
  return wholeYearsSince(birth);
}

/** Whole years of service since the first appointment (null when missing). */
export function calcYearsOfService(dateFirstAppt: string | null | undefined): number | null {
  const start = parseDate(dateFirstAppt);
  if (!start) return null;
  return wholeYearsSince(start);
}

function wholeYearsSince(from: Date): number {
  const now = new Date();
  let years = now.getFullYear() - from.getFullYear();
  const beforeAnniversary =
    now.getMonth() < from.getMonth() ||
    (now.getMonth() === from.getMonth() && now.getDate() < from.getDate());
  if (beforeAnniversary) years -= 1;
  return years;
}

/** Date the officer turns 60. */
function ageRetirementDate(dob: string | null | undefined): Date | null {
  const birth = parseDate(dob);
  if (!birth) return null;
  return new Date(birth.getFullYear() + RETIREMENT_AGE, birth.getMonth(), birth.getDate());
}

/** Date the officer completes 35 years of service. */
function serviceRetirementDate(dateFirstAppt: string | null | undefined): Date | null {
  const start = parseDate(dateFirstAppt);
  if (!start) return null;
  return new Date(start.getFullYear() + MAX_SERVICE_YEARS, start.getMonth(), start.getDate());
}

export interface RetirementInfo {
  age: number | null;
  yearsOfService: number | null;
  /** Whichever comes first: 60th birthday or 35-year service anniversary. */
  retirementDate: Date | null;
  /** Years (fractional) until retirement; ≤ 0 means already retired. */
  yearsUntilRetirement: number | null;
  retired: boolean;
  dueSoon: boolean;
}

export function getRetirementInfo(emp: Pick<Employee, 'dob' | 'date_first_appt'>): RetirementInfo {
  const age = calcAge(emp.dob);
  const yearsOfService = calcYearsOfService(emp.date_first_appt);

  const candidates = [ageRetirementDate(emp.dob), serviceRetirementDate(emp.date_first_appt)]
    .filter((d): d is Date => d !== null);
  const retirementDate = candidates.length
    ? new Date(Math.min(...candidates.map(d => d.getTime())))
    : null;

  const yearsUntilRetirement = retirementDate
    ? (retirementDate.getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000)
    : null;

  return {
    age,
    yearsOfService,
    retirementDate,
    yearsUntilRetirement,
    retired: yearsUntilRetirement !== null && yearsUntilRetirement <= 0,
    dueSoon:
      yearsUntilRetirement !== null &&
      yearsUntilRetirement > 0 &&
      yearsUntilRetirement <= DUE_SOON_YEARS,
  };
}
