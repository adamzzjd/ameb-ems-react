import { supabase } from './client';
import { logAudit } from './audit';
import type { Centre } from '../types';

// Phase 28: after setup_hierarchy.sql the centres table has NO partner_org_id
// column (org involvement moved to centre_organisations). Probe once per
// session and only include the legacy column in the payload while it exists —
// writing an absent column makes PostgREST reject the whole save.
let centreOrgTableProbe: Promise<boolean> | null = null;
function centreOrganisationsTableExists(): Promise<boolean> {
  if (!centreOrgTableProbe) {
    centreOrgTableProbe = (async () => {
      try {
        const r = await supabase.from('centre_organisations').select('id').limit(1);
        return !r.error;
      } catch {
        return false;
      }
    })();
  }
  return centreOrgTableProbe;
}

export async function dbLoadCentres(): Promise<{ data: Centre[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('centres')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as Centre[] | null, error };
}

export async function dbGetCentre(id: string): Promise<{ data: Centre | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('centres')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Centre | null, error };
}

export async function dbSaveCentre(
  centre: Partial<Centre> & { name: string; lga: string }
): Promise<{ data: Centre | null; error: Error | null }> {
  // Legacy column only exists pre-hierarchy (see probe above).
  const legacyPartnerOrg = (await centreOrganisationsTableExists())
    ? undefined
    : (centre.partner_org_id ?? null);

  if (centre.id) {
    // Update
    const { data, error } = await supabase
      .from('centres')
      .update({
        name: centre.name,
        lga: centre.lga,
        ward: centre.ward || null,
        community: centre.community || null,
        type: centre.type || null,
        status: centre.status || 'Active',
        capacity: centre.capacity != null ? centre.capacity : null,
        phone: centre.phone || null,
        ...(legacyPartnerOrg !== undefined ? { partner_org_id: legacyPartnerOrg } : {}),
        remarks: centre.remarks || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', centre.id)
      .select()
      .single();
    if (!error) await logAudit({ action: 'update', table: 'centres', rowId: centre.id, details: { name: centre.name, lga: centre.lga } });
    return { data: data as Centre | null, error };
  } else {
    // Insert
    const { data, error } = await supabase
      .from('centres')
      .insert({
        id: crypto.randomUUID(),
        name: centre.name,
        lga: centre.lga,
        ward: centre.ward || null,
        community: centre.community || null,
        type: centre.type || null,
        status: centre.status || 'Active',
        capacity: centre.capacity != null ? centre.capacity : null,
        phone: centre.phone || null,
        ...(legacyPartnerOrg !== undefined ? { partner_org_id: legacyPartnerOrg } : {}),
        remarks: centre.remarks || null,
      })
      .select()
      .single();
    if (!error && data) await logAudit({ action: 'create', table: 'centres', rowId: data.id, details: { name: centre.name, lga: centre.lga } });
    return { data: data as Centre | null, error };
  }
}

export async function dbDeleteCentre(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('centres').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'centres', rowId: id });
  return { error };
}
