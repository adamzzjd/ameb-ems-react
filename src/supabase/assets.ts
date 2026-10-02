// Phase 28.6 — Board assets & correspondence services.
// Both tables live in supabase/setup_hierarchy.sql (§5 assets, §6 correspondence)
// and follow the departments access model: any signed-in user reads;
// data_collector+ writes (RLS §4.11). All writes are audit-logged.
import { supabase } from './client';
import { logAudit } from './audit';
import type { BoardAsset, Correspondence } from '../types';

// ── Board assets ─────────────────────────────────────────────────────────────
export async function dbLoadBoardAssets(): Promise<{ data: BoardAsset[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('board_assets')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as BoardAsset[] | null, error };
}

export async function dbSaveAsset(
  asset: Partial<BoardAsset> & { tag: string; name: string },
): Promise<{ data: BoardAsset | null; error: Error | null }> {
  // At most one location pointer is set — the schema comment promises it, so
  // enforce it here too (station wins, then department, then centre) even if
  // a caller passes several.
  const location = asset.station_id
    ? { station_id: asset.station_id, department_id: null, centre_id: null }
    : asset.department_id
      ? { station_id: null, department_id: asset.department_id, centre_id: null }
      : asset.centre_id
        ? { station_id: null, department_id: null, centre_id: asset.centre_id }
        : { station_id: null, department_id: null, centre_id: null };

  const payload = {
    tag: asset.tag,
    name: asset.name,
    category: asset.category || 'Other',
    quantity: asset.quantity && asset.quantity > 0 ? asset.quantity : 1,
    condition: asset.condition || 'good',
    ...location,
    custodian_employee_id: asset.custodian_employee_id || null,
    remarks: asset.remarks || '',
    updated_at: new Date().toISOString(),
  };

  if (asset.id) {
    const { data, error } = await supabase
      .from('board_assets')
      .update(payload)
      .eq('id', asset.id)
      .select()
      .single();
    if (!error) await logAudit({ action: 'update', table: 'board_assets', rowId: asset.id, details: { tag: asset.tag, name: asset.name } });
    return { data: data as BoardAsset | null, error };
  }

  const { data, error } = await supabase
    .from('board_assets')
    .insert({ ...payload, id: crypto.randomUUID() })
    .select()
    .single();
  if (!error && data) await logAudit({ action: 'create', table: 'board_assets', rowId: data.id, details: { tag: asset.tag, name: asset.name } });
  return { data: data as BoardAsset | null, error };
}

export async function dbDeleteAsset(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('board_assets').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'board_assets', rowId: id });
  return { error };
}

// ── Correspondence ───────────────────────────────────────────────────────────
export async function dbLoadCorrespondence(): Promise<{ data: Correspondence[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('correspondence')
    .select('*')
    .order('date_issued', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  return { data: data as Correspondence[] | null, error };
}

export async function dbSaveCorrespondence(
  rec: Partial<Correspondence> & { ref_no: string; title: string },
): Promise<{ data: Correspondence | null; error: Error | null }> {
  const payload = {
    ref_no: rec.ref_no,
    title: rec.title,
    kind: rec.kind || 'memo',
    direction: rec.direction || 'internal',
    department_id: rec.department_id || null,
    date_issued: rec.date_issued || null,
    parties: rec.parties || '',
    file_name: rec.file_name || null,
    mime_type: rec.mime_type || null,
    size_bytes: rec.size_bytes ?? null,
    url: rec.url || null,
    status: rec.status || 'filed',
    updated_at: new Date().toISOString(),
  };

  if (rec.id) {
    const { data, error } = await supabase
      .from('correspondence')
      .update(payload)
      .eq('id', rec.id)
      .select()
      .single();
    if (!error) await logAudit({ action: 'update', table: 'correspondence', rowId: rec.id, details: { ref_no: rec.ref_no } });
    return { data: data as Correspondence | null, error };
  }

  const { data, error } = await supabase
    .from('correspondence')
    .insert({ ...payload, id: crypto.randomUUID() })
    .select()
    .single();
  if (!error && data) await logAudit({ action: 'create', table: 'correspondence', rowId: data.id, details: { ref_no: rec.ref_no } });
  return { data: data as Correspondence | null, error };
}

export async function dbDeleteCorrespondence(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('correspondence').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'correspondence', rowId: id });
  return { error };
}
