import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Printer, Search, Hand, CheckCircle2,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast';
import type { Centre, Facilitator, PartnerOrganisation } from '../types';
import {
  dbAddFacilitator, dbUpdateFacilitator, dbDeleteFacilitator,
  dbLoadFacilitators, dbLoadCentreFacilitators, dbSetFacilitatorCentres,
  dbClaimFacilitator,
} from '../supabase/facilitators';
import { dbLoadCentres } from '../supabase/centres';
import { dbLoadMyOrganisation, dbLoadCentreOrganisationLinks } from '../supabase/partners';
import { LGAs } from '../data/constants';

interface Props {
  canManage: boolean;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function PartnerFacilitators({ canManage }: Props) {
  const { toast } = useToast();
  const [org, setOrg] = useState<PartnerOrganisation | null>(null);
  const [all, setAll] = useState<Facilitator[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [assignments, setAssignments] = useState<{ centre_id: string; facilitator_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'mine' | 'board'>('mine');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Facilitator | null>(null);
  const [form, setForm] = useState({ name: '', gender: '', phone: '', lga: '', community: '', remarks: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<Facilitator | null>(null);
  const [assignPicks, setAssignPicks] = useState<Set<string>>(new Set());
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [mine, fac, cen, cf, links] = await Promise.all([
      dbLoadMyOrganisation(), dbLoadFacilitators(), dbLoadCentres(),
      dbLoadCentreFacilitators(), dbLoadCentreOrganisationLinks(),
    ]);
    setOrg(mine.data);
    setAll(fac.data ?? []);
    setCentres(cen.data ?? []);
    setAssignments(cf.data ?? []);
    // Centres this organisation is linked to — the only ones it may staff.
    setOrgCentreIds(new Set((links.data ?? []).map(l => l.centre_id)));
    setLoading(false);
  }, []);

  const [orgCentreIds, setOrgCentreIds] = useState<Set<string>>(new Set());

  useEffect(() => { void load(); }, [load]);

  const mine = useMemo(
    () => all.filter(f => org && f.owner_org_id === org.id),
    [all, org],
  );
  const boardOwned = useMemo(
    () => all.filter(f => !f.owner_org_id),
    [all],
  );
  const shown = (tab === 'mine' ? mine : boardOwned).filter(f =>
    !search || `${f.name} ${f.phone ?? ''} ${f.lga ?? ''} ${f.community ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  const myCentres = useMemo(
    () => centres.filter(c => orgCentreIds.has(c.id)),
    [centres, orgCentreIds],
  );
  const facAt = useCallback((centreId: string) =>
    new Set(assignments.filter(a => a.centre_id === centreId).map(a => a.facilitator_id)),
    [assignments]);
  const centresFor = useCallback((facId: string) =>
    myCentres.filter(c => facAt(c.id).has(facId)),
    [myCentres, facAt]);

  // ── Add / edit ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', gender: '', phone: '', lga: '', community: '', remarks: '' });
    setFormError('');
    setShowForm(true);
  };
  const openEdit = (f: Facilitator) => {
    setEditing(f);
    setForm({ name: f.name, gender: f.gender ?? '', phone: f.phone ?? '', lga: f.lga ?? '', community: f.community ?? '', remarks: f.remarks ?? '' });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) { setFormError('Facilitator name is required'); return; }
    setSaving(true);
    const fields = {
      gender: form.gender || undefined, phone: form.phone || undefined,
      lga: form.lga || undefined, community: form.community || undefined,
      remarks: form.remarks || undefined,
    };
    const { error } = editing
      ? await dbUpdateFacilitator(editing.id, name, fields)
      // New facilitators are always born owned by this organisation.
      : await dbAddFacilitator(name, { ...fields, ownerOrgId: org?.id ?? null });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    toast(editing ? 'Facilitator updated.' : 'Facilitator added.');
    setShowForm(false);
    void load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await dbDeleteFacilitator(id);
    if (error) { toast(error.message, true); return; }
    toast('Facilitator deleted.');
    setShowDelete(null);
    void load();
  };

  /** Take a Board-registered facilitator into this organisation. */
  const claim = async (f: Facilitator) => {
    if (!org) return;
    setClaiming(f.id);
    const { error } = await dbClaimFacilitator(f.id);
    setClaiming(null);
    if (error) { toast(`Could not claim ${f.name}: ${error.message}`, true); return; }
    toast(`${f.name} now belongs to ${org.name}.`);
    void load();
  };

  // ── Centre assignment ──────────────────────────────────────────────────────
  const openAssign = (f: Facilitator) => {
    setAssignFor(f);
    setAssignPicks(new Set(assignments.filter(a => a.facilitator_id === f.id).map(a => a.centre_id)));
  };
  const saveAssign = async () => {
    if (!assignFor) return;
    const { error } = await dbSetFacilitatorCentres(
      assignFor.id,
      myCentres.filter(c => assignPicks.has(c.id)).map(c => c.id),
    );
    if (error) { toast(error.message, true); return; }
    toast(`Centres updated for ${assignFor.name}.`);
    setAssignFor(null);
    void load();
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const rows = mine.map((f, i) => `
      <tr>
        <td style="text-align:center;color:#4A5568;font-size:10px">${i + 1}</td>
        <td style="font-weight:600">${esc(f.name)}</td>
        <td>${esc(f.gender || '—')}</td>
        <td>${esc(f.phone || '—')}</td>
        <td>${esc(f.lga || '—')}</td>
        <td>${esc(centresFor(f.id).map(c => c.name).join(', ') || '—')}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>Facilitator Register</title><style>
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
        <div class="hdr-sub">Facilitator Register — ${esc(org?.name ?? '')}</div></div>
      <h2>Facilitator Register</h2>
      <div class="meta">${mine.length} facilitator${mine.length === 1 ? '' : 's'} · Printed ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <table><thead><tr><th style="width:26px;text-align:center">#</th><th>Name</th><th>Gender</th><th>Phone</th><th>LGA</th><th>Centres</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">No facilitators registered yet</td></tr>'}</tbody></table>
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
          { label: 'Our facilitators', value: mine.length, tint: 'bg-green-50 text-green-700' },
          { label: 'Board register', value: boardOwned.length, tint: 'bg-slate-100 text-slate-700' },
          { label: 'Our centres', value: myCentres.length, tint: 'bg-blue-50 text-blue-700' },
          { label: 'Unstaffed centres', value: myCentres.filter(c => facAt(c.id).size === 0).length, tint: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-black/5 p-4 ${s.tint}`}>
            <div className="text-2xl font-extrabold">{s.value}</div>
            <div className="mt-0.5 text-xs font-semibold opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['mine', 'board'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-semibold ${tab === t ? 'bg-emerald-700 text-white' : 'bg-white text-gray-600'}`}>
              {t === 'mine' ? 'Our facilitators' : 'Board register'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, LGA…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
        </div>
        <button onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <Printer size={16} /> Print
        </button>
        {canManage && tab === 'mine' && (
          <button onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            <Plus size={16} /> Add Facilitator
          </button>
        )}
      </div>

      {tab === 'board' && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
          These facilitators are registered by the Board. <strong>Claim</strong> one to move it into
          {' '}{org.name} — you can then edit them and assign them to your centres. The Board keeps its own.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">LGA</th>
              <th className="px-4 py-3">Centres</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
            {!loading && shown.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                {tab === 'mine' ? 'No facilitators yet — add your first one.' : 'No Board-registered facilitators.'}
              </td></tr>
            )}
            {!loading && shown.map(f => (
              <tr key={f.id} className="hover:bg-emerald-50/40">
                <td className="px-4 py-3 font-semibold text-gray-800">🧑‍🏫 {f.name}</td>
                <td className="px-4 py-3 text-gray-600">{f.gender || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{f.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{f.lga || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {centresFor(f.id).length === 0
                    ? <span className="text-amber-600">not assigned</span>
                    : centresFor(f.id).map(c => c.name).join(', ')}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    {canManage && tab === 'mine' && (
                      <>
                        <button onClick={() => openAssign(f)} title="Assign centres"
                          className="rounded p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700"><Hand size={15} /></button>
                        <button onClick={() => openEdit(f)} title="Edit"
                          className="rounded p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15} /></button>
                        <button onClick={() => setShowDelete(f.id)} title="Delete"
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                      </>
                    )}
                    {canManage && tab === 'board' && (
                      <button onClick={() => claim(f)} disabled={claiming === f.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                        <CheckCircle2 size={13} /> {claiming === f.id ? 'Claiming…' : 'Claim'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / edit */}
      <Modal open={showForm} title={editing ? `Edit ${editing.name}` : 'Add Facilitator'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add facilitator'}
            </button>
          </>
        }>
        <div className="space-y-4">
          {formError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div>}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Full name *</span>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Facilitator name" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Gender</span>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                <option value="">—</option><option>Male</option><option>Female</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Phone</span>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">LGA</span>
              <select value={form.lga} onChange={e => setForm(f => ({ ...f, lga: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                <option value="">—</option>
                {LGAs.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Community</span>
              <input value={form.community} onChange={e => setForm(f => ({ ...f, community: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Remarks</span>
            <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              rows={2} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </label>
        </div>
      </Modal>

      {/* Assign to centres */}
      <Modal open={!!assignFor} title={`Centres for ${assignFor?.name ?? ''}`}
        onClose={() => setAssignFor(null)}
        footer={
          <>
            <button onClick={() => setAssignFor(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={saveAssign}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Save</button>
          </>
        }>
        {myCentres.length === 0 ? (
          <p className="text-sm text-gray-600">
            You have no centres registered yet. Ask the Board office to register your centres, then staff them here.
          </p>
        ) : (
          <div className="space-y-1.5">
            {myCentres.map(c => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={assignPicks.has(c.id)}
                  onChange={e => setAssignPicks(prev => {
                    const n = new Set(prev);
                    e.target.checked ? n.add(c.id) : n.delete(c.id);
                    return n;
                  })}
                  className="accent-emerald-700" />
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-gray-500">{c.lga}</span>
              </label>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!showDelete} title="Delete facilitator?"
        onClose={() => setShowDelete(null)}
        footer={
          <>
            <button onClick={() => setShowDelete(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => showDelete && handleDelete(showDelete)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
          </>
        }>
        <p className="text-sm text-gray-600">
          Remove <strong>{mine.find(f => f.id === showDelete)?.name}</strong> from {org.name}? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}