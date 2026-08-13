import { supabase } from './client';
import { logAudit } from './audit';
import type { LeaveRecord } from '../types';

export interface NewLeaveRequest {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason?: string;
}

/** A leave row joined with the employee's name + PSN for display. */
export type LeaveWithEmployee = LeaveRecord & {
  employees?: { name: string; psn: string | null } | null;
};

/** Current user id from the session (null when signed out / unreachable). */
async function currentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function dbListLeaves(): Promise<{ data: LeaveWithEmployee[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('leaves')
    .select('*, employees(name, psn)')
    .order('created_at', { ascending: false });
  return { data: data as LeaveWithEmployee[] | null, error };
}

export async function dbCreateLeave(input: NewLeaveRequest): Promise<{ data: LeaveRecord | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('leaves')
    .insert({
      id: crypto.randomUUID(),
      employee_id: input.employee_id,
      leave_type: input.leave_type,
      start_date: input.start_date,
      end_date: input.end_date,
      days: input.days,
      reason: input.reason || '',
      status: 'pending',
      created_by: await currentUserId(),
    })
    .select()
    .single();
  if (!error && data) {
    await logAudit({
      action: 'leave',
      table: 'leaves',
      rowId: data.id,
      details: { employee_id: data.employee_id, leave_type: data.leave_type, days: data.days, status: 'pending' },
    });
  }
  return { data: data as LeaveRecord | null, error };
}

export async function dbDecideLeave(id: string, status: 'approved' | 'rejected', note?: string): Promise<{ error: Error | null }> {
  const { data, error } = await supabase
    .from('leaves')
    .update({
      status,
      decided_by: await currentUserId(),
      decided_at: new Date().toISOString(),
      decided_note: note || null,
    })
    .eq('id', id)
    .select()
    .single();
  if (!error && data) {
    await logAudit({
      action: 'update',
      table: 'leaves',
      rowId: id,
      details: { employee_id: data.employee_id, leave_type: data.leave_type, status },
    });
  }
  return { error };
}

export async function dbDeleteLeave(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('leaves').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'leaves', rowId: id });
  return { error };
}
