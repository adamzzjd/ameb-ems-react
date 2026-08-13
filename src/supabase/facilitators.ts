import { supabase } from './client';
import { logAudit } from './audit';
import type { Facilitator, CentreFacilitator } from '../types';

export async function dbLoadFacilitators(): Promise<{ data: Facilitator[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('facilitators')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as Facilitator[] | null, error };
}

export async function dbAddFacilitator(
  name: string,
  fields: { gender?: string; phone?: string; lga?: string; community?: string; remarks?: string } = {}
): Promise<{ data: Facilitator | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('facilitators')
    .insert({
      id: crypto.randomUUID(),
      name,
      gender: fields.gender || null,
      phone: fields.phone || null,
      lga: fields.lga || null,
      community: fields.community || null,
      remarks: fields.remarks || null,
    })
    .select()
    .single();
  if (!error && data) await logAudit({ action: 'create', table: 'facilitators', rowId: data.id, details: { name } });
  return { data: data as Facilitator | null, error };
}

export async function dbUpdateFacilitator(
  id: string,
  name: string,
  fields: { gender?: string; phone?: string; lga?: string; community?: string; remarks?: string } = {}
): Promise<{ data: Facilitator | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('facilitators')
    .update({
      name,
      gender: fields.gender || null,
      phone: fields.phone || null,
      lga: fields.lga || null,
      community: fields.community || null,
      remarks: fields.remarks || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (!error) await logAudit({ action: 'update', table: 'facilitators', rowId: id, details: { name } });
  return { data: data as Facilitator | null, error };
}

export async function dbDeleteFacilitator(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('facilitators').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'facilitators', rowId: id });
  return { error };
}

// ── Centre ↔ Facilitator assignments (many-to-many) ─────────────────────────

export async function dbLoadCentreFacilitators(): Promise<{ data: CentreFacilitator[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('centre_facilitators')
    .select('*');
  return { data: data as CentreFacilitator[] | null, error };
}

/**
 * Replace all facilitator assignments for a centre with the given set.
 * (Delete + re-insert, so assigning/unassigning is a single save operation.)
 */
export async function dbSetCentreFacilitators(
  centreId: string,
  facilitatorIds: string[]
): Promise<{ error: Error | null }> {
  const { error: delErr } = await supabase
    .from('centre_facilitators')
    .delete()
    .eq('centre_id', centreId);
  if (delErr) return { error: delErr };
  if (facilitatorIds.length === 0) return { error: null };

  const { error: insErr } = await supabase
    .from('centre_facilitators')
    .insert(facilitatorIds.map(fid => ({ centre_id: centreId, facilitator_id: fid })));
  if (!insErr) await logAudit({ action: 'assign', table: 'centre_facilitators', rowId: centreId, details: { count: facilitatorIds.length } });
  return { error: insErr };
}
