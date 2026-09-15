import { supabase } from './client';
import { logAudit } from './audit';
import type { LgaAreaOfficer } from '../types';

export async function dbLoadLgaAreaOfficers(): Promise<{ data: LgaAreaOfficer[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('lga_area_officers')
    .select('*')
    .order('lga', { ascending: true });
  return { data: data as LgaAreaOfficer[] | null, error };
}

/**
 * Assign a staff member as the area officer for an LGA. One officer per LGA,
 * so this upserts on the unique `lga` column — re-assigning simply replaces
 * the previous officer.
 */
export async function dbSetLgaAreaOfficer(
  lga: string,
  employeeId: string,
  remarks = ''
): Promise<{ data: LgaAreaOfficer | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('lga_area_officers')
    .upsert(
      {
        id: crypto.randomUUID(),
        lga,
        employee_id: employeeId,
        remarks: remarks || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'lga' }
    )
    .select()
    .single();
  if (!error && data) await logAudit({ action: 'assign', table: 'lga_area_officers', rowId: data.id, details: { lga, employee_id: employeeId } });
  return { data: data as LgaAreaOfficer | null, error };
}

export async function dbRemoveLgaAreaOfficer(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('lga_area_officers').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'lga_area_officers', rowId: id });
  return { error };
}
