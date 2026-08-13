import { describe, it, expect } from 'vitest';
import {
  RETIREMENT_AGE,
  MAX_SERVICE_YEARS,
  DUE_SOON_YEARS,
  calcAge,
  calcYearsOfService,
  getRetirementInfo,
} from '../retirement';

// Date helpers relative to "now" so the tests stay deterministic. Builds the
// calendar-date string from LOCAL components (toISOString would shift the date
// across UTC midnight in non-UTC timezones).
function yearsAgo(years: number, month = 0, day = 1): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years, month, day);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

describe('calcAge', () => {
  it('returns null without a date of birth', () => {
    expect(calcAge(null)).toBeNull();
    expect(calcAge(undefined)).toBeNull();
    expect(calcAge('')).toBeNull();
  });

  it('computes whole years since birth', () => {
    // Born exactly 30 years ago on Jan 1 → age 30.
    expect(calcAge(yearsAgo(30))).toBe(30);
    // Birthday later this year (November) → still 29 until it passes.
    expect(calcAge(yearsAgo(30, 10, 15))).toBe(29);
  });
});

describe('calcYearsOfService', () => {
  it('returns null without a first appointment date', () => {
    expect(calcYearsOfService(null)).toBeNull();
  });

  it('computes whole years since first appointment', () => {
    expect(calcYearsOfService(yearsAgo(35))).toBe(35);
    // Anniversary later this year (November) → not reached yet.
    expect(calcYearsOfService(yearsAgo(10, 10, 20))).toBe(9);
  });
});

describe('getRetirementInfo', () => {
  it('retires at age 60 when age comes first', () => {
    // Born 45 years ago, appointed 20 years ago: age-60 in 15 yrs, service-35 in 15 yrs.
    const info = getRetirementInfo({ dob: yearsAgo(45), date_first_appt: yearsAgo(20) });
    expect(info.age).toBe(45);
    expect(info.yearsOfService).toBe(20);
    expect(info.retirementDate?.getFullYear()).toBe(new Date().getFullYear() + 15);
    expect(info.retired).toBe(false);
    expect(info.dueSoon).toBe(false);
  });

  it('retires at 35 years of service when service comes first', () => {
    // Started service at ~20: born 45 yrs ago, appointed 25 yrs ago.
    // Age-60 is 15 yrs away; 35-yr service anniversary is only 10 yrs away.
    const info = getRetirementInfo({ dob: yearsAgo(45), date_first_appt: yearsAgo(25) });
    expect(info.retirementDate?.getFullYear()).toBe(new Date().getFullYear() + 10);
    expect(info.retired).toBe(false);
  });

  it('flags an officer past age 60 as retired', () => {
    const info = getRetirementInfo({ dob: yearsAgo(RETIREMENT_AGE + 1), date_first_appt: yearsAgo(10) });
    expect(info.age).toBe(RETIREMENT_AGE + 1);
    expect(info.retired).toBe(true);
  });

  it('flags an officer past 35 years of service as retired', () => {
    const info = getRetirementInfo({ dob: yearsAgo(50), date_first_appt: yearsAgo(MAX_SERVICE_YEARS + 1) });
    expect(info.yearsOfService).toBe(MAX_SERVICE_YEARS + 1);
    expect(info.retired).toBe(true);
  });

  it('flags officers retiring within the due-soon window', () => {
    // Born 58 years ago → retires at 60, two years from now.
    const info = getRetirementInfo({ dob: yearsAgo(RETIREMENT_AGE - DUE_SOON_YEARS), date_first_appt: yearsAgo(30) });
    expect(info.retired).toBe(false);
    expect(info.dueSoon).toBe(true);
  });

  it('cannot compute a date when both dob and first appointment are missing', () => {
    const info = getRetirementInfo({ dob: null, date_first_appt: null });
    expect(info.retirementDate).toBeNull();
    expect(info.retired).toBe(false);
    expect(info.dueSoon).toBe(false);
  });
});
