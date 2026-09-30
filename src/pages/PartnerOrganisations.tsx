/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  dbLoadPartnerOrganisations, dbSavePartnerOrganisation, dbDeletePartnerOrganisation,
  dbLoadOrgLgaCoverage, dbSetOrgLgaCoverage,
  dbLoadOrganisationMembers, dbLoadPendingCentres, dbSetCentreApproval,
  type PartnerOrganisationInput,
} from '../supabase/partners';
import {
  LGAs, PARTNER_ORG_TYPES, PARTNER_ORG_TYPE_LABELS, ORG_ROLE_LABELS,
} from '../data/constants';
import type {
  PartnerOrganisation, OrganisationMember, Centre, PartnerOrgType, PartnerOrgStatus,
} from '../types';
import {
  Building2, Plus, Pencil, Trash2, Loader2, RefreshCw, Search, Check, X, ShieldCheck,
} from 'lucide-react';

const ORG_STATUSES: readonly PartnerOrgStatus[] = ['active', 'suspended', 'archived'];

const statusTone = (status: PartnerOrgStatus): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (status) {
    case 'active': return 'default';
    case 'suspended': return 'destructive';
    default: return 'outline';
  }
};

const cardStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' } as const;
const fieldStyle = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
} as const;

const emptyForm: PartnerOrganisationInput = {
  name: '',
  type: 'NGO',
  status: 'active',
  remarks: '',
};

export function PartnerOrganisations({ canManage = false }: { canManage?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [orgs, setOrgs] = useState<PartnerOrganisation[]>([]);
  const [members, setMembers] = useState<OrganisationMember[]>([]);
  const [pending, setPending] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<PartnerOrganisationInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PartnerOrganisation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [approvalNote, setApprovalNote] = useState<Record<string, string>>({});
  // Phase 28.5 — org ↔ LGA coverage (organisation_lga_coverage). Degrades
  // silently when setup_hierarchy.sql hasn't run yet.
  const [coverage, setCoverage] = useState<Map<string, string[]>>(new Map());
  const [coverageAvailable, setCoverageAvailable] = useState(true);
  const [formCoverage, setFormCoverage] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [orgRes, memberRes, pendingRes, coverageRes] = await Promise.all([
      dbLoadPartnerOrganisations(),
      dbLoadOrganisationMembers(),
      dbLoadPendingCentres(),
      dbLoadOrgLgaCoverage(),
    ]);
    if (orgRes.error) toast('⚠️ ' + orgRes.error.message, true);
    setOrgs(orgRes.data ?? []);
    setMembers(memberRes.data ?? []);
    setPending(pendingRes.data ?? []);
    if (coverageRes.error) {
      setCoverageAvailable(false);
      setCoverage(new Map());
    } else {
      setCoverageAvailable(true);
      const map = new Map<string, string[]>();
      for (const row of coverageRes.data ?? []) {
        map.set(row.org_id, [...(map.get(row.org_id) ?? []), row.lga]);
      }
      setCoverage(map);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const memberCountByOrg = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of members) map.set(m.organisation_id, (map.get(m.organisation_id) ?? 0) + 1);
    return map;
  }, [members]);

  const centreCountByOrg = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of pending) {
      if (c.partner_org_id) map.set(c.partner_org_id, (map.get(c.partner_org_id) ?? 0) + 1);
    }
    return map;
  }, [pending]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(o =>
      [o.name, o.type, o.lga, o.contact_person, o.email].some(v => (v ?? '').toLowerCase().includes(q))
    );
  }, [orgs, search]);

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim()) { toast('Organisation name is required.', true); return; }
    setSaving(true);
    const { data, error } = await dbSavePartnerOrganisation(form);
    if (error) {
      setSaving(false);
      toast('⚠️ ' + error.message, true);
      return;
    }
    // Persist LGA coverage (Phase 28.5) once the org id is known.
    const orgId = data?.id ?? form.id ?? null;
    if (coverageAvailable && orgId) {
      const { error: covErr } = await dbSetOrgLgaCoverage(orgId, formCoverage);
      if (covErr) {
        setSaving(false);
        toast(`Saved, but LGA coverage failed: ${covErr.message}`, true);
        setForm(null);
        load();
        return;
      }
    }
    setSaving(false);
    toast(`✓ Organisation "${form.name.trim()}" ${form.id ? 'updated' : 'registered'}.`);
    setForm(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await dbDeletePartnerOrganisation(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) { toast('⚠️ ' + error.message, true); return; }
    toast(`${deleteTarget.name} removed.`);
    load();
  };

  const decideCentre = async (centre: Centre, status: 'approved' | 'rejected') => {
    const note = approvalNote[centre.id]?.trim();
    if (status === 'rejected' && !note) {
      toast('Add a short reason before rejecting.', true);
      return;
    }
    const { error } = await dbSetCentreApproval(centre.id, status, {
      approverEmail: user?.email ?? undefined,
      note,
    });
    if (error) { toast('⚠️ ' + error.message, true); return; }
    toast(status === 'approved' ? `✓ ${centre.name} approved.` : `${centre.name} rejected.`);
    setApprovalNote(prev => { const next = { ...prev }; delete next[centre.id]; return next; });
    load();
  };

  const set = <K extends keyof PartnerOrganisationInput>(key: K, value: PartnerOrganisationInput[K]) =>
    setForm(prev => (prev ? { ...prev, [key]: value } : prev));

  if (!canManage) {
    return (
      <div className="rounded-xl border p-10 text-center" style={cardStyle}>
        <div className="text-4xl mb-3">🔒</div>
        <div className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Super Administrator Only</div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Partner organisations are registered by the super administrator.
        </div>
      </div>
    );
  }

  const pendingTotal = pending.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: 'var(--color-primary)', borderColor: 'transparent' }}>
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-[15px] font-bold text-white">Partner Organisations</div>
          <div className="text-xs text-white/60">
            NGOs, LGAs and CSOs that own learning centres. Accounts are provisioned from User Management.
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-50 text-white border-white/25">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Registered organisations', value: orgs.length },
          { label: 'Active', value: orgs.filter(o => o.status === 'active').length },
          { label: 'Centres awaiting approval', value: pendingTotal },
        ].map(card => (
          <div key={card.label} className="rounded-xl border p-4" style={cardStyle}>
            <div className="text-2xl font-heading font-bold" style={{ color: 'var(--color-text-primary)' }}>{card.value}</div>
            <div className="text-[11px] uppercase tracking-wide font-bold mt-1" style={{ color: 'var(--color-text-muted)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Pending centre approvals */}
      {pendingTotal > 0 && (
        <div className="rounded-xl border overflow-hidden" style={cardStyle}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-warm)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              Centre approvals ({pendingTotal})
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {pending.map(centre => (
              <div key={centre.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--color-border)' }}>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{centre.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {[centre.owner_type, centre.lga, centre.ward].filter(Boolean).join(' · ')}
                    {orgs.find(o => o.id === centre.partner_org_id) ? ` · ${orgs.find(o => o.id === centre.partner_org_id)!.name}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    value={approvalNote[centre.id] ?? ''}
                    onChange={e => setApprovalNote(prev => ({ ...prev, [centre.id]: e.target.value }))}
                    placeholder="Reason (required to reject)"
                    className="h-9 w-full md:w-56"
                  />
                  <Button size="sm" onClick={() => decideCentre(centre, 'approved')}>
                    <Check size={14} /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decideCentre(centre, 'rejected')}>
                    <X size={14} /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="rounded-xl border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={cardStyle}>
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, type, LGA…" className="pl-9" />
        </div>
        <Button onClick={() => { setFormCoverage([]); setForm({ ...emptyForm }); }}>
          <Plus size={15} /> Register Organisation
        </Button>
      </div>

      {/* Organisations table */}
      <div className="rounded-xl border overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="py-14 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading organisations…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-4xl mb-2">🤝</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              {orgs.length === 0 ? 'No partner organisations yet' : 'No organisations match your search'}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {orgs.length === 0 ? 'Register the first NGO, LGA or CSO above.' : 'Try a different search term.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Organisation', 'Type', 'Contact', 'Members', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 border-b whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(org => (
                  <tr key={org.id} className="border-b hover:bg-surface-warm transition-colors" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                          style={{ background: 'var(--color-primary)' }}>
                          {org.logo
                            ? <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                            : org.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{org.name}</div>
                          <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            {[org.lga, org.mou_reference].filter(Boolean).join(' · ') || '—'}
                          </div>
                          {coverageAvailable && (coverage.get(org.id)?.length ?? 0) > 0 && (
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              📍 {coverage.get(org.id)!.slice(0, 4).join(', ')}{(coverage.get(org.id)!.length > 4) ? ` +${coverage.get(org.id)!.length - 4}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {PARTNER_ORG_TYPE_LABELS[org.type] ?? org.type}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <div>{org.contact_person || '—'}</div>
                      <div style={{ color: 'var(--color-text-muted)' }}>{org.phone || org.email || ''}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {memberCountByOrg.get(org.id) ?? 0}
                      {centreCountByOrg.get(org.id) ? (
                        <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-surface-warm)' }}>
                          {centreCountByOrg.get(org.id)} pending
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={statusTone(org.status)}>{org.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setFormCoverage(coverage.get(org.id) ?? []); setForm({ ...org }); }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1.5 rounded-lg transition-colors hover:bg-surface-warm"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(org)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1.5 rounded-lg transition-colors hover:bg-surface-warm"
                          style={{ borderColor: 'rgba(192,57,43,0.3)', color: 'var(--color-error)' }}>
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Members preview */}
      {members.length > 0 && (
        <div className="rounded-xl border p-4" style={cardStyle}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Organisation Accounts ({members.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map(m => {
              const org = orgs.find(o => o.id === m.organisation_id);
              return (
                <span key={m.id} className="inline-flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  {org?.name ?? 'Unknown organisation'}
                  <span style={{ color: 'var(--color-text-muted)' }}>{ORG_ROLE_LABELS[m.org_role] ?? m.org_role}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={!!form} onOpenChange={open => { if (!open) setForm(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Edit Organisation' : 'Register Organisation'}</DialogTitle>
            <DialogDescription>
              Partner organisations own centres and have their own portal accounts, scoped to their organisation only.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs">Organisation Name *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Hope for Literacy Initiative" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Type</Label>
                <select value={form.type ?? 'NGO'} onChange={e => set('type', e.target.value as PartnerOrgType)}
                  className="h-9 w-full px-2.5 rounded-lg border text-[13px] outline-none focus:ring-2 focus:ring-ring" style={fieldStyle}>
                  {PARTNER_ORG_TYPES.map(t => <option key={t} value={t}>{PARTNER_ORG_TYPE_LABELS[t]}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Status</Label>
                <select value={form.status ?? 'active'} onChange={e => set('status', e.target.value as PartnerOrgStatus)}
                  className="h-9 w-full px-2.5 rounded-lg border text-[13px] outline-none focus:ring-2 focus:ring-ring" style={fieldStyle}>
                  {ORG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Contact Person</Label>
                <Input value={form.contact_person ?? ''} onChange={e => set('contact_person', e.target.value)} placeholder="Focal person" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="080…" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="contact@ngo.org" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">LGA</Label>
                <select value={form.lga ?? ''} onChange={e => set('lga', e.target.value)}
                  className="h-9 w-full px-2.5 rounded-lg border text-[13px] outline-none focus:ring-2 focus:ring-ring" style={fieldStyle}>
                  <option value="">— Select LGA —</option>
                  {LGAs.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Registration No.</Label>
                <Input value={form.registration_no ?? ''} onChange={e => set('registration_no', e.target.value)} placeholder="CAC / LGA reg." />
              </div>

              {coverageAvailable && (
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <Label className="text-xs">LGA Coverage — where this organisation works</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {LGAs.map(lga => {
                      const on = formCoverage.includes(lga);
                      return (
                        <button key={lga} type="button"
                          onClick={() => setFormCoverage(prev => on ? prev.filter(l => l !== lga) : [...prev, lga])}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-full border cursor-pointer transition-colors ${
                            on ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
                          }`}>
                          {lga}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {formCoverage.length === 0 ? 'No coverage set — the organisation has no declared LGAs yet.' : `${formCoverage.length} LGA${formCoverage.length !== 1 ? 's' : ''} selected · click again to remove`}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">MOU Reference</Label>
                <Input value={form.mou_reference ?? ''} onChange={e => set('mou_reference', e.target.value)} placeholder="ADSMEB/MOU/2026/…" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Agreement Start</Label>
                <Input value={form.agreement_start ?? ''} onChange={e => set('agreement_start', e.target.value)} placeholder="YYYY-MM-DD" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Agreement End</Label>
                <Input value={form.agreement_end ?? ''} onChange={e => set('agreement_end', e.target.value)} placeholder="YYYY-MM-DD" />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs">Remarks</Label>
                <Input value={form.remarks ?? ''} onChange={e => set('remarks', e.target.value)} placeholder="Internal notes" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (form?.id ? 'Save Changes' : 'Register Organisation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="text-4xl mb-2 text-center">⚠️</div>
            <DialogTitle className="text-center">Remove Partner Organisation</DialogTitle>
            <DialogDescription className="text-center">
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{deleteTarget?.name}</span>
              <br />Its centres are kept but unlinked from the organisation. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove Organisation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
