import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MailOpen, Plus, Pencil, Trash2, Printer, Search, ArrowDownToLine,
  ArrowUpFromLine, Repeat2, FileText,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import type { Correspondence } from '../types';
import {
  dbLoadCorrespondence, dbSaveCorrespondence, dbDeleteCorrespondence,
} from '../supabase/assets';
import { useToast } from '../hooks/useToast';

interface CorrespondenceProps {
  departments: { id: string; name: string }[];
  canManage: boolean;
}

const KINDS = ['memo', 'circular', 'minutes', 'letter'];
const DIRECTIONS = ['incoming', 'outgoing', 'internal'];
const STATUSES = ['draft', 'filed', 'archived'];

const KIND_TINT: Record<string, string> = {
  memo: 'bg-blue-50 text-blue-700',
  circular: 'bg-violet-50 text-violet-700',
  minutes: 'bg-emerald-50 text-emerald-700',
  letter: 'bg-amber-50 text-amber-700',
};

const DIRECTION_ICON: Record<string, React.ReactNode> = {
  incoming: <ArrowDownToLine size={13} className="text-emerald-600" />,
  outgoing: <ArrowUpFromLine size={13} className="text-blue-600" />,
  internal: <Repeat2 size={13} className="text-gray-500" />,
};

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export function CorrespondenceRegistry({ departments, canManage }: CorrespondenceProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false); // setup_hierarchy.sql not run yet
  const [search, setSearch] = useState('');
  const [filterKind, setFilterKind] = useState('');
  const [filterDirection, setFilterDirection] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Correspondence | null>(null);
  const [form, setForm] = useState({
    ref_no: '', title: '', kind: 'memo', direction: 'internal',
    department_id: '', date_issued: '', parties: '', status: 'filed',
    file_name: '', url: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await dbLoadCorrespondence();
    if (error) setMissing(/schema cache|does not exist/i.test(error.message));
    setRecords(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const deptName = useCallback((id: string | null) =>
    departments.find(d => d.id === id)?.name || null, [departments]);

  const filtered = useMemo(() => records.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      const hay = `${r.ref_no} ${r.title} ${r.parties} ${deptName(r.department_id) || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterKind && r.kind !== filterKind) return false;
    if (filterDirection && r.direction !== filterDirection) return false;
    if (filterDept && r.department_id !== filterDept) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  }), [records, search, filterKind, filterDirection, filterDept, filterStatus, deptName]);

  const stats = useMemo(() => ({
    total: records.length,
    incoming: records.filter(r => r.direction === 'incoming').length,
    outgoing: records.filter(r => r.direction === 'outgoing').length,
    drafts: records.filter(r => r.status === 'draft').length,
  }), [records]);

  // ── Form ───────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm({ ref_no: '', title: '', kind: 'memo', direction: 'internal', department_id: '', date_issued: '', parties: '', status: 'filed', file_name: '', url: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (r: Correspondence) => {
    setEditing(r);
    setForm({
      ref_no: r.ref_no, title: r.title, kind: r.kind, direction: r.direction,
      department_id: r.department_id || '', date_issued: r.date_issued || '',
      parties: r.parties || '', status: r.status,
      file_name: r.file_name || '', url: r.url || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const refNo = form.ref_no.trim();
    const title = form.title.trim();
    if (!refNo) { setFormError('Reference number is required'); return; }
    if (!title) { setFormError('Title is required'); return; }
    const dup = records.find(r => r.ref_no.trim().toLowerCase() === refNo.toLowerCase() && r.id !== editing?.id);
    if (dup) { setFormError(`Ref "${refNo}" is already filed`); return; }

    setSaving(true);
    const { error } = await dbSaveCorrespondence({
      id: editing?.id,
      ref_no: refNo, title,
      kind: form.kind, direction: form.direction,
      department_id: form.department_id || null,
      date_issued: form.date_issued || null,
      parties: form.parties.trim(),
      status: form.status,
      file_name: form.file_name.trim() || null,
      url: form.url.trim() || null,
    });
    setSaving(false);
    if (error) { toast('Save failed: ' + error.message, true); return; }
    toast(editing ? 'Record updated.' : 'Filed to registry.');
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await dbDeleteCorrespondence(id);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    toast('Record deleted.');
    setShowDelete(null);
    loadData();
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const rows = filtered.map((r, i) => `
      <tr>
        <td style="text-align:center;color:#4A5568;font-size:10px">${i + 1}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#1A5C38;font-weight:600">${esc(r.ref_no)}</td>
        <td style="font-weight:600">${esc(r.title)}</td>
        <td style="text-transform:capitalize">${esc(r.kind)}</td>
        <td style="text-transform:capitalize">${esc(r.direction)}</td>
        <td>${esc(deptName(r.department_id) || '—')}</td>
        <td>${fmtDate(r.date_issued)}</td>
        <td>${esc(r.parties || '—')}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><title>AMEB Correspondence Register</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;padding:20px;font-size:11px;color:#1A1A1A;line-height:1.4}
      .hdr{display:flex;align-items:center;gap:14px;padding:14px 18px;background:#1A5C38;border-radius:8px;margin-bottom:14px}
      .hdr-text{flex:1}
      .hdr-org{font-size:15px;font-weight:800;color:#fff;line-height:1.2}
      .hdr-sub{font-size:10px;color:rgba(255,255,255,.7);margin-top:2px;letter-spacing:.3px}
      h2{font-size:13px;font-weight:700;color:#1A5C38;margin:12px 0 4px;text-align:center}
      .meta{font-size:10px;color:#4A5568;text-align:center;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;font-size:10px}
      th{background:#1A5C38;color:#fff;padding:7px 8px;text-align:left;font-size:9px;font-weight:700;letter-spacing:.4px}
      td{padding:6px 8px;border-bottom:1px solid #D1D9D4;vertical-align:middle}
      tr:nth-child(even) td{background:#f6f7f5}
      .foot{margin-top:16px;font-size:9px;color:#94a3b8;border-top:1px solid #D1D9D4;padding-top:8px;display:flex;justify-content:space-between}
      @media print{body{padding:0}@page{margin:.8cm;size:A4 landscape}}
    </style></head><body>
      <div class="hdr"><div class="hdr-text">
        <div class="hdr-org">Adamawa State Mass Education Board</div>
        <div class="hdr-sub">Correspondence Register — ${filtered.length} records</div>
      </div></div>
      <h2>Correspondence Register</h2>
      <div class="meta">Printed ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <table>
        <thead><tr><th style="width:24px;text-align:center">#</th><th>Ref No.</th><th>Title</th><th>Kind</th><th>Direction</th><th>Department</th><th>Date</th><th>Parties</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8">No records match the current filters</td></tr>'}</tbody>
      </table>
      <div class="foot"><span>Adamawa State Mass Education Board — EMS</span><span>Registry extract — official use</span></div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (missing) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <div className="flex items-center gap-2 font-semibold"><MailOpen size={18} /> Correspondence isn't in the database yet</div>
        <p className="mt-2 text-sm">Run <code className="rounded bg-amber-100 px-1">supabase/setup_hierarchy.sql</code> (§6) and re-run <code className="rounded bg-amber-100 px-1">setup_rls.sql</code> to unlock the registry.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total records', value: stats.total, tint: 'bg-slate-100 text-slate-700' },
          { label: 'Incoming', value: stats.incoming, tint: 'bg-emerald-50 text-emerald-700' },
          { label: 'Outgoing', value: stats.outgoing, tint: 'bg-blue-50 text-blue-700' },
          { label: 'Drafts', value: stats.drafts, tint: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-black/5 p-4 ${s.tint}`}>
            <div className="text-2xl font-extrabold">{s.value}</div>
            <div className="mt-0.5 text-xs font-semibold opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ref no., title, parties…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <select value={filterKind} onChange={e => setFilterKind(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="">All kinds</option>
          {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={filterDirection} onChange={e => setFilterDirection(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="">All directions</option>
          {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="max-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <Printer size={16} /> Print
        </button>
        {canManage && (
          <button onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            <Plus size={16} /> File Record
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Ref No.</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Parties</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={canManage ? 8 : 7} className="px-4 py-10 text-center text-gray-400">Loading registry…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={canManage ? 8 : 7} className="px-4 py-10 text-center text-gray-400">
                {records.length === 0 ? 'Nothing filed yet — file the first memo or circular.' : 'No records match the current filters.'}
              </td></tr>
            )}
            {!loading && filtered.map(r => (
              <tr key={r.id} className="hover:bg-emerald-50/40">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700">{r.ref_no}</td>
                <td className="px-4 py-3 font-semibold text-gray-800">
                  {r.title}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer"
                      className="mt-0.5 flex max-w-[260px] items-center gap-1 truncate text-xs font-normal text-blue-600 hover:underline">
                      <FileText size={11} /> {r.file_name || r.url}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${KIND_TINT[r.kind] || 'bg-gray-100 text-gray-600'}`}>
                    {r.kind}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium capitalize text-gray-600">
                    {DIRECTION_ICON[r.direction] || <Repeat2 size={13} />} {r.direction}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{deptName(r.department_id) || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.date_issued)}</td>
                <td className="px-4 py-3 max-w-[200px] truncate text-gray-600" title={r.parties}>{r.parties || <span className="text-gray-300">—</span>}</td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => openEdit(r)} title="Edit"
                        className="rounded p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15} /></button>
                      <button onClick={() => setShowDelete(r.id)} title="Delete"
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / edit modal */}
      <Modal
        open={showForm}
        title={editing ? `Edit ${editing.ref_no}` : 'File Correspondence'}
        onClose={() => setShowForm(false)}
          footer={
            <>
              <button onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save changes' : 'File record'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {formError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Reference number *</span>
                <input value={form.ref_no} onChange={e => setForm(f => ({ ...f, ref_no: e.target.value }))}
                  placeholder="AMEB/ADM/2026/014" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Date issued</span>
                <input type="date" value={form.date_issued} onChange={e => setForm(f => ({ ...f, date_issued: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Title *</span>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Circular: 2026 literacy classes resumption" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Kind</span>
                <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                  {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Direction</span>
                <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                  {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Status</span>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Department</span>
              <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                <option value="">—</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Parties (who it involves)</span>
              <input value={form.parties} onChange={e => setForm(f => ({ ...f, parties: e.target.value }))}
                placeholder="State Ministry of Education; UNICEF Field Office Yola" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Document name (optional)</span>
                <input value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))}
                  placeholder="circular-2026-014.pdf" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Document link (optional)</span>
                <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://…" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              </label>
            </div>
          </div>
        </Modal>

      {/* Delete confirm */}
      <Modal open={!!showDelete} title="Delete record?"
        onClose={() => setShowDelete(null)}
          footer={
            <>
              <button onClick={() => setShowDelete(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { if (showDelete) handleDelete(showDelete); }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
            </>
          }>
          <p className="text-sm text-gray-600">
            Remove <strong>{records.find(r => r.id === showDelete)?.ref_no}</strong> —{' '}
            {records.find(r => r.id === showDelete)?.title}? This cannot be undone.
          </p>
        </Modal>
      </div>
  );
}
