import { describe, it, expect } from 'vitest';
import {
  PROMOTION_INTERVAL_YEARS,
  DUE_SOON_MONTHS,
  nextGrade,
  nextPromotionDate,
  getPromotionInfo,
} from '../promotion';

// Build calendar-date strings from LOCAL components so tests stay deterministic
// across timezones (toISOString would shift dates across UTC midnight).
function yearsAgo(years: number, month = 0, day = 1): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years, month, day);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Exactly `months` months ago from today — deterministic regardless of the
// day the suite runs (setMonth rolls the year over correctly).
function monthsAgo(months: number, day = 13): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months, day);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

describe('nextGrade', () => {
  it('bumps a GL grade by one level', () => {
    expect(nextGrade('GL 08')).toBe('GL 09');
    expect(nextGrade('GL 1')).toBe('GL 02');
    expect(nextGrade('08')).toBe('GL 09');
  });

  it('returns null for unrecognized grades and the top grade', () => {
    expect(nextGrade(null)).toBeNull();
    expect(nextGrade(undefined)).toBeNull();
    expect(nextGrade('')).toBeNull();
    expect(nextGrade('Director')).toBeNull();
    expect(nextGrade('GL 17')).toBeNull();
    expect(nextGrade('GL 00')).toBeNull();
  });
});

describe('nextPromotionDate', () => {
  it('is the present appointment date plus the interval', () => {
    // Appointed 12 months ago → due 24 months from today.
    const next = nextPromotionDate(monthsAgo(12));
    const expected = new Date();
    expected.setFullYear(expected.getFullYear() + PROMOTION_INTERVAL_YEARS - 1);
    expect(next?.getFullYear()).toBe(expected.getFullYear());
    expect(next?.getMonth()).toBe(expected.getMonth());
    expect(next?.getDate()).toBe(expected.getDate());
  });

  it('returns null without a date', () => {
    expect(nextPromotionDate(null)).toBeNull();
    expect(nextPromotionDate('')).toBeNull();
  });
});

describe('getPromotionInfo', () => {
  it('returns nulls when the present appointment date is missing', () => {
    const info = getPromotionInfo({ date_present_appt: null });
    expect(info.yearsInPresentAppt).toBeNull();
    expect(info.promotionDate).toBeNull();
    expect(info.monthsUntilPromotion).toBeNull();
    expect(info.dueSoon).toBe(false);
    expect(info.overdue).toBe(false);
    expect(info.onTrack).toBe(false);
  });

  it('flags an officer promoted 3+ years ago as overdue', () => {
    const info = getPromotionInfo({ date_present_appt: yearsAgo(PROMOTION_INTERVAL_YEARS + 1) });
    expect(info.yearsInPresentAppt).toBe(PROMOTION_INTERVAL_YEARS + 1);
    expect(info.overdue).toBe(true);
    expect(info.dueSoon).toBe(false);
    expect(info.onTrack).toBe(false);
  });

  it('flags an officer promoted ~2.7 years ago as due soon', () => {
    // 32 months ago → 4 months away from the 3-year mark.
    const info = getPromotionInfo({ date_present_appt: monthsAgo(32) });
    expect(info.dueSoon).toBe(true);
    expect(info.overdue).toBe(false);
    expect(info.monthsUntilPromotion).not.toBeNull();
    expect(info.monthsUntilPromotion!).toBeGreaterThan(0);
    expect(info.monthsUntilPromotion!).toBeLessThanOrEqual(DUE_SOON_MONTHS);
  });

  it('flags a recently promoted officer as on track', () => {
    const info = getPromotionInfo({ date_present_appt: yearsAgo(1) });
    expect(info.onTrack).toBe(true);
    expect(info.dueSoon).toBe(false);
    expect(info.overdue).toBe(false);
  });
});
