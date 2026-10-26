// ── Staff self-service (PSN portal) ────────────────────────────────────────
//
// Two steps, both through SECURITY DEFINER functions in the database:
//
//   1. verifyIdentity(psn, factor) — the officer proves they know a fact that
//      is already on their record (date of birth, or the last 4 digits of the
//      phone number). The server answers with a single-use token and only then
//      reveals the profile. An unknown PSN and a wrong factor are deliberately
//      indistinguishable, so this cannot be used to test which staff numbers
//      exist.
//   2. submitUpdate(token, changes) — applies the one-shot update to whoever
//      the token was issued for. The employee id never leaves the server.
//
// See supabase/setup_selfservice.sql. Nothing here is a security boundary on
// its own: the database enforces the token, the factor and the attempt limit.

import { supabase } from './client';

export interface SelfServiceProfile {
  id: string;
  psn: string;
  name: string;
  gender: string | null;
  grade: string | null;
  cadre: string | null;
  date_first_appt: string | null;
  date_present_appt: string | null;
  dob: string | null;
  phone: string | null;
  lga: string | null;
  station: string | null;
  address: string | null;
  photo: string | null;
  step: string | null;
  remarks: string | null;
}

export type VerifyResult =
  | { ok: true; token: string; alreadySubmitted: boolean; profile: SelfServiceProfile }
  | { ok: false; kind: 'mismatch' | 'locked' | 'unavailable'; message: string };

export type SubmitResult = { ok: true } | { ok: false; message: string };

/** 900s → "15 minutes". Rounded up so the officer never waits past the lock. */
export function lockedMessage(seconds?: number): string {
  const mins = Math.max(1, Math.ceil((seconds ?? 900) / 60));
  return `Too many attempts. For security, this staff number is locked for ${mins} minute${mins === 1 ? '' : 's'}. Please try again after that.`;
}

const MISMATCH =
  "Those details don't match our records. Check your staff number and the date of birth / phone digits you entered, then try again.";

const GENERIC_SUBMIT = 'Your update could not be saved. Please try again.';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** Verify a PSN + factor and receive a one-shot token. */
export async function verifyIdentity(psn: string, factor: string): Promise<VerifyResult> {
  const { data, error } = await supabase.rpc('self_service_verify', {
    psn: psn.trim(),
    factor: factor.trim(),
  });

  if (error) {
    // A missing function means the database has not been migrated yet.
    const missing = /could not find|does not exist|schema cache/i.test(error.message || '');
    return {
      ok: false,
      kind: 'unavailable',
      message: missing
        ? 'The self-service portal is not ready yet. Please contact the Board Office.'
        : 'We could not reach the register. Please try again.',
    };
  }

  const row = asRecord(data);
  if (!row || row.ok !== true) {
    if (row?.error === 'locked') {
      const retry = typeof row.retry_after_seconds === 'number' ? row.retry_after_seconds : undefined;
      return { ok: false, kind: 'locked', message: lockedMessage(retry) };
    }
    return { ok: false, kind: 'mismatch', message: MISMATCH };
  }

  const profile = asRecord(row.profile);
  if (!profile || typeof row.token !== 'string') {
    return { ok: false, kind: 'unavailable', message: GENERIC_SUBMIT };
  }

  return {
    ok: true,
    token: row.token,
    alreadySubmitted: row.already_submitted === true,
    profile: profile as unknown as SelfServiceProfile,
  };
}

/** Apply the update. Only the token identifies the officer. */
export async function submitUpdate(
  token: string,
  changes: Record<string, string | null>,
): Promise<SubmitResult> {
  const { data, error } = await supabase.rpc('self_service_submit', {
    p_token: token,
    changes,
  });

  if (error) {
    const missing = /could not find|does not exist|schema cache/i.test(error.message || '');
    return {
      ok: false,
      message: missing
        ? 'The self-service portal is not ready yet. Please contact the Board Office.'
        : GENERIC_SUBMIT,
    };
  }

  const row = asRecord(data);
  if (row?.ok === true) return { ok: true };

  switch (row?.error) {
    case 'session_expired':
      return { ok: false, message: 'Your verification has expired. Please start again and re-enter your details.' };
    case 'already_submitted':
      return { ok: false, message: 'These details have already been submitted. Contact the Board Office if you need a correction.' };
    case 'name_required':
      return { ok: false, message: 'Name cannot be empty.' };
    case 'field_not_allowed':
      return { ok: false, message: 'One of those fields cannot be updated through self-service.' };
    case 'invalid_value':
      return { ok: false, message: 'One of the values entered is not valid. Check the dates and try again.' };
    default:
      return { ok: false, message: GENERIC_SUBMIT };
  }
}
