import { supabase } from './client';
import { logAudit } from './audit';
import type {
  PartnerOrganisation,
  OrganisationMember,
  ApprovalStatus,
  Centre,
} from '../types';

// ── Partner organisations ───────────────────────────────────────────────────
// The tenant registry. Provisioning *users* for an organisation is not done
// here — it goes through the manage-users edge function (service role), since
// the browser must never be able to create accounts or memberships.

const nowIso = () => new Date().toISOString();

export async function dbLoadPartnerOrganisations(): Promise<{
  data: PartnerOrganisation[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('partner_organisations')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as PartnerOrganisation[] | null, error };
}

export type PartnerOrganisationInput = Partial<PartnerOrganisation> & { name: string };

export async function dbSavePartnerOrganisation(
  org: PartnerOrganisationInput
): Promise<{ data: PartnerOrganisation | null; error: Error | null }> {
  const payload = {
    id: org.id ?? crypto.randomUUID(),
    name: org.name,
    type: org.type ?? 'NGO',
    registration_no: org.registration_no ?? null,
    contact_person: org.contact_person ?? null,
    phone: org.phone ?? null,
    email: org.email ?? null,
    address: org.address ?? null,
    lga: org.lga ?? null,
    mou_reference: org.mou_reference ?? null,
    agreement_start: org.agreement_start ?? null,
    agreement_end: org.agreement_end ?? null,
    logo: org.logo ?? null,
    status: org.status ?? 'active',
    remarks: org.remarks ?? '',
    updated_at: nowIso(),
  };

  if (org.id) {
    const { data, error } = await supabase
      .from('partner_organisations')
      .update(payload)
      .eq('id', org.id)
      .select()
      .single();
    if (!error && data) {
      await logAudit({
        action: 'update', table: 'partner_organisations', rowId: data.id,
        details: { name: payload.name, type: payload.type },
      });
    }
    return { data: data as PartnerOrganisation | null, error };
  }

  const { data, error } = await supabase
    .from('partner_organisations')
    .insert(payload)
    .select()
    .single();
  if (!error && data) {
    await logAudit({
      action: 'create', table: 'partner_organisations', rowId: data.id,
      details: { name: payload.name, type: payload.type },
    });
  }
  return { data: data as PartnerOrganisation | null, error };
}

export async function dbDeletePartnerOrganisation(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('partner_organisations').delete().eq('id', id);
  if (!error) await logAudit({ action: 'delete', table: 'partner_organisations', rowId: id });
  return { error };
}

/** All user↔organisation links (readable by board staff). */
export async function dbLoadOrganisationMembers(): Promise<{
  data: OrganisationMember[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('*')
    .order('created_at', { ascending: true });
  return { data: data as OrganisationMember[] | null, error };
}

/** Centres waiting for ADSMEB approval (partner-created or partner-edited). */
export async function dbLoadPendingCentres(): Promise<{ data: Centre[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('centres')
    .select('*')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });
  return { data: data as Centre[] | null, error };
}

// ── Centre approval ─────────────────────────────────────────────────────────
// Partner-created (or partner-edited) centres are forced back to 'pending' by
// the enforce_centres_approval trigger; only board staff can approve or reject.
export async function dbSetCentreApproval(
  centreId: string,
  status: Extract<ApprovalStatus, 'approved' | 'rejected'>,
  opts: { approverEmail?: string; note?: string } = {}
): Promise<{ data: Centre | null; error: Error | null }> {
  const payload = status === 'approved'
    ? {
        approval_status: status,
        approved_by: opts.approverEmail ?? null,
        approved_at: nowIso(),
        rejection_note: null,
        updated_at: nowIso(),
      }
    : {
        approval_status: status,
        rejection_note: opts.note ?? null,
        updated_at: nowIso(),
      };

  const { data, error } = await supabase
    .from('centres')
    .update(payload)
    .eq('id', centreId)
    .select()
    .single();

  if (!error && data) {
    await logAudit({
      action: status === 'approved' ? 'approve' : 'reject',
      table: 'centres',
      rowId: centreId,
      details: { status, ...(opts.note ? { note: opts.note } : {}) },
    });
  }
  return { data: data as Centre | null, error };
}
