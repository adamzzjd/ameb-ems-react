import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Pencil, Printer, Search, Building2, CheckCircle2, Clock,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast';
import type { Centre, CentreOrgLink, PartnerOrganisation } from '../types';
import { dbLoadCentres, dbSaveCentre } from '../supabase/centres';
import { dbLoadMyOrganisation, dbLoadCentreOrganisationLinks } from '../supabase/partners';
import { LGAs } from '../data/constants';

interface Props {
  canManage: boolean;
}

const CENTRE_TYPES = ['Community', 'School-based', 'Vocational', 'Other'];
const CENTRE_STATUSES = ['Active', 'Inactive', 'Suspended'];

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const APPROVAL_TINT: Record<string, string> = {
  approved: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-700',
};

export function PartnerCentres({ canManage }: Props) {
  const { toast } = useToast();
  const [org, setOrg] = useState<PartnerOrganisation | null>(null);
  const [all, setAll] = useState<Centre[]>([]);
  const [links, setLinks] = useState<CentreOrgLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Centre | null>(null);
  const [form, setForm] = useState({
    name: '', lga: '', ward: '', community: '', type: 'Community',
    status: 'Active', capacity: '', phone: '', remarks: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [mine, cen, ln] = await Promise.all([
      dbLoadMyOrganisation(), dbLoadCentres(), dbLoadCentreOrganisationLinks(),
    ]);
    setOrg(mine.data);
    setAll(cen.data ?? []);
    setLinks(ln.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Centres registered to this organisation, with the role it holds there. */
  const mine = useMemo(() => {
    if (!org) return [];
    const roleByCentre = new Map<string, string>();
    for (const l of links) {
      if (l.org_id === org.id) roleByCentre.set(l.centre_id, l.role);
    }
    return all
      .filter(c => roleByCentre.has(c.id))
      .map(c => ({ centre: c, role: roleByCentre.get(c.id) ?? 'partner' }));
  }, [all, links, org]);

  const filtered = mine.filter(({ centre }) =>
    !search || `${centre.name} ${centre.lga} ${centre.community} ${centre.ward}`
      .toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: mine.length,
    approved: mine.filter(m => m.centre.approval_status === 'approved').length,
    pending: mine.filter(m => m.centre.approval_status === 'pending').length,
    capacity: mine.reduce((n, m) => n + (m.centre.capacity ?? 0), 0),
  };

  // ── Add / edit ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '', lga: org?.lga ?? '', ward: '', community: '', type: 'Community',
      status: 'Active', capacity: '', phone: '', remarks: '',
    });
    setFormError('');
    setShowForm(true);
  };
  const openEdit = (c: Centre) => {
    setEditing(c);
    setForm({
      name: c.name, lga: c.lga, ward: c.ward ?? '', community: c.community ?? '',
      type: c.type ?? 'Community', status: c.status ?? 'Active',
      capacity: c.capacity ? String(c.capacity) : '', phone: c.phone ?? '', remarks: c.remarks ?? '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const lga = form.lga.trim();
    if (!name) { setFormError('Centre name is required'); return; }
    if (!lga) { setFormError('Select the LGA this centre is in'); return; }

    setSaving(true);
    const { data, error } = await dbSaveCentre({
      id: editing?.id,
      name, lga,
      ward: form.ward.trim(),
      community: form.community.trim(),
      type: form.type,
      status: form.status,
      capacity: form.capacity ? Number(form.capacity) : null,
      phone: form.phone.trim(),
      remarks: form.remarks.trim(),
      owner_type: 'NGO',
    });
    setSaving(false);
    if (error) { setFormError(error.message); return; }

    // A brand-new centre is registered to this organisation as its lead.
    if (data && !editing) {
      const { dbLinkCentreToOrg } = await import('../supabase/partners');
      const { error: linkErr } = await dbLinkCentreToOrg(data.id, org!.id, 'lead');
      if (linkErr) {
        toast(`Centre saved, but registering it to ${org!.name} failed: ${linkErr.message}`, true);
        setShowForm(false);
        void load();
        return;
      }
    }
    toast(editing ? 'Centre updated.' : 'Centre submitted to the Board for approval.');
    setShowForm(false);
    void load();
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const rows = filtered.map(({ centre, role }, i) => `
      <tr>
        <td style="text-align:center;color:#4A5568;font-size:10px">${i + 1}</td>
        <td style="font-weight:600">${esc(centre.name)}</td>
        <td>${esc(role)}</td>
        <td>${esc(centre.lga)}</td>
        <td>${esc(centre.community || '—')}</td>
        <td style="text-align:center">${centre.capacity ?? '—'}</td>
        <td style="text-transform:capitalize">${esc(centre.approval_status || '—')}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>Centre Register</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;padding:20px;font-size:11px;color:#1A1A1A;line-height:1.4}
      .hdr{padding:14px 18px;background:#1A5C38;border-radius:8px;margin-bottom:14px}
      .hdr-org{font-size:15px;font-weight:800;color:#fff}
      .hdr-sub{font-size:10px;color:rgba(255,255,255,.7);margin-top:2px}
      h2{font-size:13px;font-weight:700;color:#1A5C38;margin:12px 0 4px;text-align:center}
      .meta{font-size:10px;color:#4A5568;text-align:center;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#1A5C38;color:#fff;padding:7px 10px;text-align:left;font-size:10px}
      td{padding:6px 10px;border-bottom:1px solid #D1D9D4}
      tr:nth-child(even) td{background:#f6f7f5}
      .foot{margin-top:16px;font-size:9px;color:#94a3b8;border-top:1px solid #D1D9D4;padding-top:8px;display:flex;justify-content:space-between}
      @media print{body{padding:0}@page{margin:.8cm}}
    </style></head><body>
      <div class="hdr"><div class="hdr-org">Adamawa State Mass Education Board</div>
        <div class="hdr-sub">Learning Centre Register — ${esc(org?.name ?? '')}</div></div>
      <h2>Learning Centre Register</h2>
      <div class="meta">${mine.length} centre${mine.length === 1 ? '' : 's'} · Printed ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <table><thead><tr><th style="width:26px;text-align:center">#</th><th>Centre</th><th>Role</th><th>LGA</th><th>Community</th><th style="text-align:center">Capacity</th><th>Approval</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">No centres registered yet</td></tr>'}</tbody></table>
      <div class="foot"><span>Adamawa State Mass Education Board — EMS</span><span>${esc(org?.name ?? '')}</span></div>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  if (!org) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800 text-sm">
        No organisation is linked to your account yet. Ask the Board office to add you under
        <strong> Partner Organisations → members</strong>.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Our centres', value: stats.total, tint: 'bg-blue-50 text-blue-700' },
          { label: 'Approved', value: stats.approved, tint: 'bg-green-50 text-green-700' },
          { label: 'Awaiting approval', value: stats.pending, tint: 'bg-amber-50 text-amber-700' },
          { label: 'Combined capacity', value: stats.capacity, tint: 'bg-slate-100 text-slate-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-black/5 p-4 ${s.tint}`}>
            <div className="text-2xl font-extrabold">{s.value}</div>
            <div className="mt-0.5 text-xs font-semibold opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search centre, LGA, community…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
        </div>
        <button onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <Printer size={16} /> Print
        </button>
        {canManage && (
          <button onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            <Plus size={16} /> Add Centre
          </button>
        )}
      </div>

      {stats.pending > 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Clock size={14} /> {stats.pending} centre{stats.pending === 1 ? '' : 's'} awaiting Board approval.
          They appear in the public directory once approved.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Centre</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">LGA</th>
              <th className="px-4 py-3">Community</th>
              <th className="px-4 py-3 text-center">Capacity</th>
              <th className="px-4 py-3">Approval</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && <tr><td colSpan={canManage ? 7 : 6} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={canManage ? 7 : 6} className="px-4 py-10 text-center text-gray-400">
                {mine.length === 0
                  ? `No centres registered to ${org.name} yet — add your first one, or ask the Board office to register an existing centre.`
                  : 'No centres match your search.'}
              </td></tr>
            )}
            {!loading && filtered.map(({ centre, role }) => (
              <tr key={centre.id} className="hover:bg-emerald-50/40">
                <td className="px-4 py-3 font-semibold text-gray-800">
                  <span className="inline-flex items-center gap-1.5"><Building2 size={14} className="text-gray-400" />{centre.name}</span>
                  {centre.centre_code && <div className="text-[11px] font-normal text-gray-400">{centre.centre_code}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{role}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{centre.lga}</td>
                <td className="px-4 py-3 text-gray-600">{centre.community || '—'}</td>
                <td className="px-4 py-3 text-center">{centre.capacity ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${APPROVAL_TINT[centre.approval_status ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                    {centre.approval_status === 'approved'
                      ? <CheckCircle2 size={12} />
                      : centre.approval_status === 'pending' ? <Clock size={12} /> : null}
                    {centre.approval_status || 'unknown'}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(centre)} title="Edit"
                      className="rounded p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} title={editing ? `Edit ${editing.name}` : 'Register a learning centre'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Submit for approval'}
            </button>
          </>
        }>
        <div className="space-y-4">
          {formError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div>}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Centre name *</span>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Malamre Multipurpose Center" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">LGA *</span>
              <select value={form.lga} onChange={e => setForm(f => ({ ...f, lga: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                <option value="">— Select —</option>
                {LGAs.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Community</span>
              <input value={form.community} onChange={e => setForm(f => ({ ...f, community: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Ward</span>
              <input value={form.ward} onChange={e => setForm(f => ({ ...f, ward: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Type</span>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                {CENTRE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Capacity</span>
              <input type="number" min={0} value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Phone</span>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Status</span>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                {CENTRE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Remarks</span>
            <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              rows={2} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </label>
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
            New centres are sent to the Board for approval before they appear in the public directory.
          </p>
        </div>
      </Modal>
    </div>
  );
}