// ── Staff self-service (PSN portal) ────────────────────────────────────────
//
// Three steps, all through SECURITY DEFINER functions in the database:
//
//   1. lookupProfile(psn) — loads the officer's editable record. Nothing is
//      written; the PSN alone identifies the record (as requested).
//   2. submitUpdate(psn, changes) — queues the proposed changes in
//      `employee_update_requests`. The register is NOT touched.
//   3. An administrator reviews the queue (listRequests / decideRequest) and
//      approving a request is what actually applies the changes.
//
// See supabase/setup_selfservice.sql. Nothing here is a security boundary on
// its own: the database enforces the queue, the one-pending-request rule and
// the admin-only approval.

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

export type LookupResult =
  | { ok: true; alreadySubmitted: boolean; pending: boolean; profile: SelfServiceProfile }
  | { ok: false; kind: 'not_found' | 'unavailable'; message: string };

export type SubmitResult = { ok: true } | { ok: false; message: string };

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'all';

export interface UpdateRequest {
  id: string;
  psn: string;
  employee_name: string;
  employee_photo: string | null;
  /** What the officer proposed (only the fields they actually sent). */
  changes: Record<string, string | null>;
  /** The officer's record at the time the queue was read. */
  current: SelfServiceProfile;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_email: string | null;
  review_note: string | null;
}

export type ReviewListResult =
  | { ok: true; requests: UpdateRequest[] }
  | { ok: false; message: string };

export type DecideResult =
  | { ok: true; status: 'approved' | 'rejected' }
  | { ok: false; message: string };

const GENERIC_SUBMIT = 'Your update could not be saved. Please try again.';
const GENERIC_REVIEW = 'The review queue could not be read. Please try again.';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function missingFunction(message: string | undefined): boolean {
  return /could not find|does not exist|schema cache/i.test(message || '');
}

/** Load one officer's record for update, by PSN only. */
export async function lookupProfile(psn: string): Promise<LookupResult> {
  const { data, error } = await supabase.rpc('self_service_lookup', {
    psn: psn.trim(),
  });

  if (error) {
    return {
      ok: false,
      kind: 'unavailable',
      message: missingFunction(error.message)
        ? 'The self-service portal is not ready yet. Please contact the Board Office.'
        : 'We could not reach the register. Please try again.',
    };
  }

  const row = asRecord(data);
  if (!row || row.ok !== true) {
    return {
      ok: false,
      kind: 'not_found',
      message:
        row?.error === 'unavailable'
          ? 'The self-service portal is not ready yet. Please contact the Board Office.'
          : 'That staff number (PSN) is not in the register. Check it and try again — contact the Board Office if it should be there.',
    };
  }

  const profile = asRecord(row.profile);
  if (!profile) {
    return { ok: false, kind: 'unavailable', message: GENERIC_SUBMIT };
  }

  return {
    ok: true,
    alreadySubmitted: row.already_submitted === true,
    pending: row.pending === true,
    profile: profile as unknown as SelfServiceProfile,
  };
}

/** Queue the officer's changes for an administrator to review. */
export async function submitUpdate(
  psn: string,
  changes: Record<string, string | null>,
): Promise<SubmitResult> {
  const { data, error } = await supabase.rpc('self_service_submit', {
    psn: psn.trim(),
    changes,
  });

  if (error) {
    return {
      ok: false,
      message: missingFunction(error.message)
        ? 'The self-service portal is not ready yet. Please contact the Board Office.'
        : GENERIC_SUBMIT,
    };
  }

  const row = asRecord(data);
  if (row?.ok === true) return { ok: true };

  switch (row?.error) {
    case 'not_found':
      return { ok: false, message: 'That staff number (PSN) is not in the register any more.' };
    case 'already_submitted':
      return { ok: false, message: 'Your update has already been approved. Contact the Board Office if you need another correction.' };
    case 'pending_review':
      return { ok: false, message: 'You already have an update waiting for review. Please wait for it to be approved or rejected.' };
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

/** Admin review queue. */
export async function listRequests(status: ReviewStatus = 'pending'): Promise<ReviewListResult> {
  const { data, error } = await supabase.rpc('self_service_requests', { p_status: status });

  if (error) {
    return {
      ok: false,
      message: missingFunction(error.message)
        ? 'The review queue is not set up yet. Run supabase/setup_selfservice.sql.'
        : GENERIC_REVIEW,
    };
  }

  const row = asRecord(data);
  if (!row || row.ok !== true) {
    return {
      ok: false,
      message: typeof row?.error === 'string' ? row.error : GENERIC_REVIEW,
    };
  }

  return {
    ok: true,
    requests: Array.isArray(row.requests) ? (row.requests as UpdateRequest[]) : [],
  };
}

/** Number of requests waiting for review (sidebar badge). 0 when not allowed. */
export async function pendingRequestCount(): Promise<number> {
  const { data, error } = await supabase.rpc('self_service_pending_count');
  if (error) return 0;
  return typeof data === 'number' ? data : 0;
}

/** Approve (applies the changes) or reject one request. */
export async function decideRequest(
  requestId: string,
  decision: 'approve' | 'reject',
  note = '',
): Promise<DecideResult> {
  const { data, error } = await supabase.rpc('self_service_decide', {
    p_request: requestId,
    p_decision: decision,
    p_note: note.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      message: missingFunction(error.message)
        ? 'The review queue is not set up yet. Run supabase/setup_selfservice.sql.'
        : 'That decision could not be saved. Please try again.',
    };
  }

  const row = asRecord(data);
  if (row?.ok === true) {
    return { ok: true, status: row.status === 'approved' ? 'approved' : 'rejected' };
  }

  return {
    ok: false,
    message: typeof row?.error === 'string' ? row.error : 'That decision could not be saved.',
  };
}
