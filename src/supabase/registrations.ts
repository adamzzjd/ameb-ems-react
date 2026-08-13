// ── New-officer registrations (admin approval queue) ─────────────────────
// Officers whose PSN isn't in the register submit their full details through
// the anonymous PSN portal; admin+ review them here and approve (creating the
// employee record) or reject with a note. Every decision is audited.
// Existing officers' self-service updates apply directly and never reach this
// queue (see supabase/setup_selfservice.sql).
import { supabase } from './client';
import { logAudit } from './audit';
import type { EmployeeRegistration } from '../types';

/** Current user id from the session (null when signed out / unreachable). */
async function currentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Newest first. */
export async function dbListRegistrations(): Promise<{
  data: EmployeeRegistration[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('employee_registrations')
    .select('*')
    .order('submitted_at', { ascending: false });
  return { data: data as EmployeeRegistration[] | null, error };
}

/** Number of registrations still awaiting a decision (for the sidebar badge). */
export async function dbPendingRegistrationCount(): Promise<{ count: number | null; error: Error | null }> {
  const { count, error } = await supabase
    .from('employee_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  return { count, error };
}

/**
 * Approve a pending registration: create the employee record from the
 * submitted details, mark the registration approved, and audit it.
 */
export async function dbApproveRegistration(
  reg: EmployeeRegistration,
  note?: string
): Promise<{ error: Error | null }> {
  if (reg.status !== 'pending') return { error: new Error('This registration has already been decided.') };

  const data = reg.requested_data ?? {};
  const { data: created, error: insertError } = await supabase
    .from('employees')
    .insert({
      id: crypto.randomUUID(),
      psn: reg.psn,
      name: data.name ?? reg.full_name,
      gender: data.gender || null,
      grade: data.grade || null,
      cadre: data.cadre || null,
      date_first_appt: data.date_first_appt || null,
      date_present_appt: data.date_present_appt || null,
      dob: data.dob || null,
      phone: data.phone || null,
      lga: data.lga || null,
      station: data.station || null,
      address: data.address || null,
      photo: data.photo || null,
      basic_salary: typeof data.basic_salary === 'number' ? data.basic_salary : null,
      step: data.step || null,
      remarks: data.remarks || '',
    })
    .select()
    .single();
  if (insertError) return { error: insertError };

  const { error } = await supabase
    .from('employee_registrations')
    .update({
      status: 'approved',
      decided_by: await currentUserId(),
      decided_at: new Date().toISOString(),
      decided_note: note || null,
    })
    .eq('id', reg.id);
  if (!error && created) {
    await logAudit({
      action: 'create',
      table: 'employees',
      rowId: created.id,
      details: { source: 'self_service_registration', psn: reg.psn, name: created.name },
    });
  }
  return { error };
}

/** Reject a pending registration with an optional note (no record is created). */
export async function dbRejectRegistration(
  id: string,
  psn: string,
  name: string,
  note?: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('employee_registrations')
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
      table: 'employee_registrations',
      rowId: id,
      details: { psn, name, approved: false, note: note || null },
    });
  }
  return { error };
}
