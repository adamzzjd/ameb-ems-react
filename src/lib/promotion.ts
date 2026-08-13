// ── Promotion & career progression helpers (pure — unit tested) ─────────────
// Nigerian public service practice: an officer is due for the next grade after
// a fixed interval in their present appointment (commonly 3 years).
import type { Employee } from '../types';

export const PROMOTION_INTERVAL_YEARS = 3;
/** Officers whose next promotion lands within this many months are flagged. */
export const DUE_SOON_MONTHS = 6;

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  // Treat a plain calendar date (YYYY-MM-DD) as LOCAL time so boundaries land
  // on the correct day regardless of the browser timezone.
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  return isNaN(d.getTime()) ? null : d;
}

/** Whole years since the given date (null when the date is missing). */
export function wholeYearsSince(from: Date): number {
  const now = new Date();
  let years = now.getFullYear() - from.getFullYear();
  const beforeAnniversary =
    now.getMonth() < from.getMonth() ||
    (now.getMonth() === from.getMonth() && now.getDate() < from.getDate());
  if (beforeAnniversary) years -= 1;
  return years;
}

/** Date the officer becomes due for promotion (present appointment + interval). */
export function nextPromotionDate(datePresentAppt: string | null | undefined): Date | null {
  const start = parseDate(datePresentAppt);
  if (!start) return null;
  return new Date(start.getFullYear() + PROMOTION_INTERVAL_YEARS, start.getMonth(), start.getDate());
}

/**
 * The next grade level for a "GL NN" grade (e.g. "GL 08" → "GL 09").
 * Returns null for unrecognized grades or when already at the top (GL 17).
 */
export function nextGrade(grade: string | null | undefined): string | null {
  if (!grade) return null;
  const m = grade.match(/(?:GL\s*)?(\d{1,2})/i);
  if (!m) return null;
  const level = Number(m[1]);
  if (level < 1 || level >= 17) return null;
  return `GL ${String(level + 1).padStart(2, '0')}`;
}

export interface PromotionInfo {
  /** Whole years in the present appointment. */
  yearsInPresentAppt: number | null;
  /** Date the next promotion becomes due (present appointment + 3 years). */
  promotionDate: Date | null;
  /** Months (fractional) until due; ≤ 0 means already overdue. */
  monthsUntilPromotion: number | null;
  dueSoon: boolean;
  overdue: boolean;
  onTrack: boolean;
}

export function getPromotionInfo(emp: Pick<Employee, 'date_present_appt'>): PromotionInfo {
  const start = parseDate(emp.date_present_appt);
  if (!start) {
    return {
      yearsInPresentAppt: null,
      promotionDate: null,
      monthsUntilPromotion: null,
      dueSoon: false,
      overdue: false,
      onTrack: false,
    };
  }

  const yearsInPresentAppt = wholeYearsSince(start);
  const promotionDate = new Date(start.getFullYear() + PROMOTION_INTERVAL_YEARS, start.getMonth(), start.getDate());
  const monthsUntilPromotion = (promotionDate.getTime() - Date.now()) / (30.4375 * 24 * 3600 * 1000);

  return {
    yearsInPresentAppt,
    promotionDate,
    monthsUntilPromotion,
    dueSoon: monthsUntilPromotion > 0 && monthsUntilPromotion <= DUE_SOON_MONTHS,
    overdue: monthsUntilPromotion <= 0,
    onTrack: monthsUntilPromotion > DUE_SOON_MONTHS,
  };
}
