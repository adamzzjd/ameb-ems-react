import { supabase } from './client';
import { logAudit } from './audit';
import type { CentreStaff } from '../types';

// ── Centre ↔ Staff assignments (many-to-many) ───────────────────────────────
// Facilitators are staff: every link points at an `employees` row, so one
// person is one record across the staff register and the centres they serve.
// Deleting a centre or an employee removes its links automatically (the join
// table cascades), so there is no stale assignment to clean up.

export async function dbLoadCentreStaff(): Promise<{ data: CentreStaff[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('centre_staff')
    .select('*');
  return { data: data as CentreStaff[] | null, error };
}

/**
 * Replace all staff assigned to a centre with the given set.
 * (Delete + re-insert, so assigning/unassigning is a single save operation.)
 */
export async function dbSetCentreStaff(
  centreId: string,
  employeeIds: string[]
): Promise<{ error: Error | null }> {
  const { error: delErr } = await supabase
    .from('centre_staff')
    .delete()
    .eq('centre_id', centreId);
  if (delErr) return { error: delErr };
  if (employeeIds.length === 0) return { error: null };

  const { error: insErr } = await supabase
    .from('centre_staff')
    .insert(employeeIds.map(employeeId => ({ centre_id: centreId, employee_id: employeeId })));
  if (!insErr) await logAudit({ action: 'assign', table: 'centre_staff', rowId: centreId, details: { count: employeeIds.length } });
  return { error: insErr };
}
