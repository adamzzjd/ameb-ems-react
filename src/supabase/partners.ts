import { supabase } from './client';
import { logAudit } from './audit';
import type {
  PartnerOrganisation,
  OrganisationMember,
  ApprovalStatus,
  Centre,
  CentreOrgLink,
  OrgLgaCoverage,
} from '../types';

// ── "Which org am I?" (Phase 30.2) ─────────────────────────────────────────
// Partner pages need the caller's own organisation to stamp ownership on the
// rows they create (learners, facilitators, centres). Membership is the only
// trustworthy source — the browser must never send an org id we then trust.
export async function dbLoadMyOrganisation(): Promise<{
  data: PartnerOrganisation | null;
  error: Error | null;
}> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return { data: null, error: userErr };
  const { data: member, error: memberErr } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', userData.user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (memberErr) return { data: null, error: memberErr };
  const orgId = (member as { organisation_id?: string } | null)?.organisation_id;
  if (!orgId) return { data: null, error: null };
  const { data: org, error } = await supabase
    .from('partner_organisations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();
  return { data: (org as PartnerOrganisation) ?? null, error };
}

/**
 * Partner self-service profile edit (Phase 30.2). Only contact-facing fields
 * are sent — status, type and registration_no are Board-only, and the
 * protect_org_columns trigger enforces that even if a caller tries.
 */
export async function dbUpdateMyOrganisation(orgId: string, fields: {
  contact_person?: string; phone?: string; email?: string; address?: string;
  mou_reference?: string; logo?: string; remarks?: string;
}): Promise<{ data: PartnerOrganisation | null; error: Error | null }> {
  const payload: Record<string, unknown> = { updated_at: nowIso() };
  if (fields.contact_person !== undefined) payload.contact_person = fields.contact_person || null;
  if (fields.phone !== undefined) payload.phone = fields.phone || null;
  if (fields.email !== undefined) payload.email = fields.email || null;
  if (fields.address !== undefined) payload.address = fields.address || null;
  if (fields.mou_reference !== undefined) payload.mou_reference = fields.mou_reference || null;
  if (fields.logo !== undefined) payload.logo = fields.logo || null;
  if (fields.remarks !== undefined) payload.remarks = fields.remarks || '';

  const { data, error } = await supabase
    .from('partner_organisations')
    .update(payload)
    .eq('id', orgId)
    .select()
    .single();
  if (!error) {
    await logAudit({
      action: 'update', table: 'partner_organisations', rowId: orgId,
      details: { self_service: true },
    });
  }
  return { data: data as PartnerOrganisation | null, error };
}

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

// ── Centre ↔ Organisation links (Phase 28.5 — the many-to-many) ────────────
// Lives on centre_organisations (setup_hierarchy.sql). Callers probe table
// existence via this loader's error (unlike the degrade-to-empty loader in
// hierarchy.ts, this keeps the envelope so callers can tell missing vs empty).
export async function dbLoadCentreOrganisationLinks(): Promise<{
  data: CentreOrgLink[] | null; error: Error | null;
}> {
  const { data, error } = await supabase.from('centre_organisations').select('*');
  return { data: data as CentreOrgLink[] | null, error };
}

/** Replace a centre's organisation links: one lead plus any partners. */
export async function dbSetCentreOrganisations(
  centreId: string,
  orgs: { org_id: string; role: 'lead' | 'partner' | 'funder' | 'host' }[],
): Promise<{ error: Error | null }> {
  const { error: delErr } = await supabase
    .from('centre_organisations')
    .delete()
    .eq('centre_id', centreId);
  if (delErr) return { error: delErr };
  if (orgs.length === 0) {
    await logAudit({ action: 'assign', table: 'centre_organisations', rowId: centreId, details: { orgs: [] } });
    return { error: null };
  }

  const { error: insErr } = await supabase
    .from('centre_organisations')
    .insert(orgs.map(o => ({ centre_id: centreId, org_id: o.org_id, role: o.role })));
  if (!insErr) {
    await logAudit({
      action: 'assign', table: 'centre_organisations', rowId: centreId,
      details: { orgs: orgs.map(o => o.org_id) },
    });
  }
  return { error: insErr };
}

/**
 * Register one centre to one organisation without touching the centre's other
 * links (the replace-set above is for the full editor). Idempotent: re-linking
 * the same pair is a no-op rather than a duplicate row.
 */
export async function dbLinkCentreToOrg(
  centreId: string,
  orgId: string,
  role: 'lead' | 'partner' | 'funder' | 'host' = 'lead',
): Promise<{ error: Error | null }> {
  const { data: existing, error: readErr } = await supabase
    .from('centre_organisations')
    .select('id')
    .eq('centre_id', centreId)
    .eq('org_id', orgId);
  if (readErr) return { error: readErr };
  if (existing && existing.length > 0) return { error: null };

  const { error } = await supabase
    .from('centre_organisations')
    .insert({ centre_id: centreId, org_id: orgId, role, id: crypto.randomUUID() });
  if (!error) {
    await logAudit({
      action: 'assign', table: 'centre_organisations', rowId: centreId,
      details: { org_id: orgId, role },
    });
  }
  return { error };
}

// ── Organisation ↔ LGA coverage (Phase 28.5) ────────────────────────────────
/** The LGAs an organisation works in. Degrades to null when the table is missing. */
export async function dbLoadOrgLgaCoverage(): Promise<{
  data: OrgLgaCoverage[] | null; error: Error | null;
}> {
  const { data, error } = await supabase.from('organisation_lga_coverage').select('*');
  return { data: data as OrgLgaCoverage[] | null, error };
}

/** Replace an organisation's LGA coverage with the given set. */
export async function dbSetOrgLgaCoverage(
  orgId: string,
  lgas: string[],
): Promise<{ error: Error | null }> {
  const { error: delErr } = await supabase
    .from('organisation_lga_coverage')
    .delete()
    .eq('org_id', orgId);
  if (delErr) return { error: delErr };
  if (lgas.length === 0) {
    await logAudit({ action: 'assign', table: 'organisation_lga_coverage', rowId: orgId, details: { lgas: [] } });
    return { error: null };
  }

  const { error: insErr } = await supabase
    .from('organisation_lga_coverage')
    .insert(lgas.map(lga => ({ org_id: orgId, lga })));
  if (!insErr) {
    await logAudit({ action: 'assign', table: 'organisation_lga_coverage', rowId: orgId, details: { lgas } });
  }
  return { error: insErr };
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
