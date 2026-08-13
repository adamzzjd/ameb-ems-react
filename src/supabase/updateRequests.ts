// ── Self-service update requests (admin review queue) ─────────────────────
// Officers submit one-shot personal-details change requests through the
// anonymous PSN portal; admins review them here and approve (applies the
// changes to the employee record) or reject with a note. Every decision is
// written to the audit trail.
import { supabase } from './client';
import { logAudit } from './audit';
import type { EmployeeUpdateRequestWithEmployee } from '../types';

/** Current user id from the session (null when signed out / unreachable). */
async function currentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Number of requests still awaiting a decision (for the sidebar badge). */
export async function dbPendingUpdateCount(): Promise<{ count: number | null; error: Error | null }> {
  const { count, error } = await supabase
    .from('employee_update_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  return { count, error };
}

/** Newest first, joined with the officer's current editable values for diffing. */
export async function dbListUpdateRequests(): Promise<{
  data: EmployeeUpdateRequestWithEmployee[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('employee_update_requests')
    .select('*, employees(name, psn, phone, lga, address, photo)')
    .order('submitted_at', { ascending: false });
  return { data: data as EmployeeUpdateRequestWithEmployee[] | null, error };
}

/**
 * Approve a pending request: apply the requested changes to the employee
 * record, mark the request approved, and audit it.
 */
export async function dbApproveUpdateRequest(
  req: EmployeeUpdateRequestWithEmployee,
  note?: string
): Promise<{ error: Error | null }> {
  if (req.status !== 'pending') return { error: new Error('This request has already been decided.') };
  const changes = req.requested_changes ?? {};

  const { error: applyError } = await supabase
    .from('employees')
    .update(changes)
    .eq('id', req.employee_id);
  if (applyError) return { error: applyError };

  const { error } = await supabase
    .from('employee_update_requests')
    .update({
      status: 'approved',
      decided_by: await currentUserId(),
      decided_at: new Date().toISOString(),
      decided_note: note || null,
    })
    .eq('id', req.id);
  if (!error) {
    await logAudit({
      action: 'update',
      table: 'employees',
      rowId: req.employee_id,
      details: { source: 'self_service', approved: true, changes },
    });
  }
  return { error };
}

/** Reject a pending request with an optional note (no changes are applied). */
export async function dbRejectUpdateRequest(
  id: string,
  employeeId: string,
  note?: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('employee_update_requests')
    .update({
      status: 'rejected',
      decided_by: await currentUserId(),
      decided_at: new Date().toISOString(),
      decided_note: note || null,
    })
    .eq('id', id);
  if (!error) {
    await logAudit({
      action: 'update',
      table: 'employees',
      rowId: employeeId,
      details: { source: 'self_service', approved: false, note: note || null },
    });
  }
  return { error };
}
