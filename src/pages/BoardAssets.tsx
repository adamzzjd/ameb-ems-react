import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Plus, Pencil, Trash2, Printer, Search,
  MapPin,
  Landmark, Building2, UserRound,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import type { BoardAsset, Centre, Employee, Station } from '../types';
import {
  dbLoadBoardAssets, dbSaveAsset, dbDeleteAsset,
} from '../supabase/assets';
import { useToast } from '../hooks/useToast';

interface BoardAssetsProps {
  onNavigate?: (page: string) => void;
  /** Register lookups for the location/custodian pickers. */
  employees: Employee[];
  centres: Centre[];
  stations: Station[];
  departments: { id: string; name: string }[];
  canManage: boolean;
}

const CATEGORIES = ['Furniture', 'Vehicle', 'ICT', 'Teaching Materials', 'Equipment', 'Other'];
const CONDITIONS = ['new', 'good', 'fair', 'poor', 'written_off'];

const CONDITION_TINT: Record<string, string> = {
  new: 'bg-emerald-50 text-emerald-700',
  good: 'bg-green-50 text-green-700',
  fair: 'bg-amber-50 text-amber-700',
  poor: 'bg-orange-50 text-orange-700',
  written_off: 'bg-red-50 text-red-700',
};

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function BoardAssets({
  employees, centres, stations, departments, canManage,
}: BoardAssetsProps) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<BoardAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false); // setup_hierarchy.sql not run yet
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterLocation, setFilterLocation] = useState(''); // 'station:<id>' | 'dept:<id>' | 'centre:<id>' | 'unlocated'

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BoardAsset | null>(null);
  const [form, setForm] = useState({
    tag: '', name: '', category: 'Other', quantity: 1, condition: 'good',
    station_id: '', department_id: '', centre_id: '', custodian_employee_id: '',
    remarks: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await dbLoadBoardAssets();
    if (error) setMissing(/schema cache|does not exist/i.test(error.message));
    setAssets(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Lookups ────────────────────────────────────────────────────────────────
  const stationName = useCallback((id: string | null) =>
    stations.find(s => s.id === id)?.name || null, [stations]);
  const deptName = useCallback((id: string | null) =>
    departments.find(d => d.id === id)?.name || null, [departments]);
  const centreName = useCallback((id: string | null) =>
    centres.find(c => c.id === id)?.name || null, [centres]);
  const custodianName = useCallback((id: string | null) =>
    employees.find(e => e.id === id)?.name || null, [employees]);

  /** The one location a row points at, as a short label. */
  const locationLabel = (a: BoardAsset): string => {
    if (a.station_id) return stationName(a.station_id) || 'Station';
    if (a.department_id) return deptName(a.department_id) || 'Department';
    if (a.centre_id) return centreName(a.centre_id) || 'Centre';
    return '—';
  };

  const locationKey = (a: BoardAsset): string =>
    a.station_id ? `station:${a.station_id}`
      : a.department_id ? `dept:${a.department_id}`
        : a.centre_id ? `centre:${a.centre_id}`
          : 'unlocated';

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => assets.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      const hay = `${a.tag} ${a.name} ${a.remarks} ${custodianName(a.custodian_employee_id) || ''} ${locationLabel(a)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterCategory && a.category !== filterCategory) return false;
    if (filterCondition && a.condition !== filterCondition) return false;
    if (filterLocation && locationKey(a) !== filterLocation) return false;
    return true;
  }), [assets, search, filterCategory, filterCondition, filterLocation, custodianName, stations, departments, centres]);

  const stats = useMemo(() => ({
    records: assets.length,
    units: assets.reduce((n, a) => n + (a.quantity || 0), 0),
    poor: assets.filter(a => a.condition === 'poor' || a.condition === 'written_off').length,
    unlocated: assets.filter(a => locationKey(a) === 'unlocated').length,
  }), [assets]);

  // ── Form ───────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm({ tag: '', name: '', category: 'Other', quantity: 1, condition: 'good', station_id: '', department_id: '', centre_id: '', custodian_employee_id: '', remarks: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (a: BoardAsset) => {
    setEditing(a);
    setForm({
      tag: a.tag, name: a.name, category: a.category, quantity: a.quantity, condition: a.condition,
      station_id: a.station_id || '', department_id: a.department_id || '', centre_id: a.centre_id || '',
      custodian_employee_id: a.custodian_employee_id || '', remarks: a.remarks || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const tag = form.tag.trim();
    const name = form.name.trim();
    if (!tag) { setFormError('Asset tag is required'); return; }
    if (!name) { setFormError('Asset name is required'); return; }
    const dup = assets.find(a => a.tag.trim().toLowerCase() === tag.toLowerCase() && a.id !== editing?.id);
    if (dup) { setFormError(`Tag "${tag}" is already used by ${dup.name}`); return; }

    setSaving(true);
    const { error } = await dbSaveAsset({
      id: editing?.id,
      tag, name,
      category: form.category,
      quantity: Number(form.quantity) || 1,
      condition: form.condition,
      station_id: form.station_id || null,
      department_id: form.department_id || null,
      centre_id: form.centre_id || null,
      custodian_employee_id: form.custodian_employee_id || null,
      remarks: form.remarks.trim(),
    });
    setSaving(false);
    if (error) { toast('Save failed: ' + error.message, true); return; }
    toast(editing ? 'Asset updated.' : 'Asset added.');
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await dbDeleteAsset(id);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    toast('Asset deleted.');
    setShowDelete(null);
    loadData();
  };

  // ── Print (reuses the house style via a self-contained window) ─────────────
  const handlePrint = () => {
    const rows = filtered.map((a, i) => `
      <tr>
        <td style="text-align:center;color:#4A5568;font-size:10px">${i + 1}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#1A5C38;font-weight:600">${esc(a.tag)}</td>
        <td style="font-weight:600">${esc(a.name)}</td>
        <td>${esc(a.category)}</td>
        <td style="text-align:center">${a.quantity}</td>
        <td style="text-transform:capitalize">${esc(a.condition.replace('_', ' '))}</td>
        <td>${esc(locationLabel(a))}</td>
        <td>${esc(custodianName(a.custodian_employee_id) || '—')}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><title>AMEB Board Assets</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;padding:20px;font-size:11px;color:#1A1A1A;line-height:1.4}
      .hdr{display:flex;align-items:center;gap:14px;padding:14px 18px;background:#1A5C38;border-radius:8px;margin-bottom:14px}
      .hdr-text{flex:1}
      .hdr-org{font-size:15px;font-weight:800;color:#fff;line-height:1.2}
      .hdr-sub{font-size:10px;color:rgba(255,255,255,.7);margin-top:2px;letter-spacing:.3px}
      h2{font-size:13px;font-weight:700;color:#1A5C38;margin:12px 0 4px;text-align:center}
      .meta{font-size:10px;color:#4A5568;text-align:center;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#1A5C38;color:#fff;padding:7px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.4px}
      td{padding:6px 10px;border-bottom:1px solid #D1D9D4;vertical-align:middle}
      tr:nth-child(even) td{background:#f6f7f5}
      .foot{margin-top:16px;font-size:9px;color:#94a3b8;border-top:1px solid #D1D9D4;padding-top:8px;display:flex;justify-content:space-between}
      @media print{body{padding:0}@page{margin:.8cm}}
    </style></head><body>
      <div class="hdr"><div class="hdr-text">
        <div class="hdr-org">Adamawa State Mass Education Board</div>
        <div class="hdr-sub">Board Assets Register — ${filtered.length} records · ${filtered.reduce((n, a) => n + a.quantity, 0)} units</div>
      </div></div>
      <h2>Board Assets</h2>
      <div class="meta">Printed ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <table>
        <thead><tr><th style="width:30px;text-align:center">#</th><th>Tag</th><th>Name</th><th>Category</th><th style="text-align:center">Qty</th><th>Condition</th><th>Location</th><th>Custodian</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8">No assets match the current filters</td></tr>'}</tbody>
      </table>
      <div class="foot"><span>Adamawa State Mass Education Board — EMS</span><span>No money values are recorded in this system</span></div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (missing) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <div className="flex items-center gap-2 font-semibold"><Package size={18} /> Board assets aren't in the database yet</div>
        <p className="mt-2 text-sm">Run <code className="rounded bg-amber-100 px-1">supabase/setup_hierarchy.sql</code> (§5) and re-run <code className="rounded bg-amber-100 px-1">setup_rls.sql</code> to unlock this register.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Records', value: stats.records, tint: 'bg-blue-50 text-blue-700' },
          { label: 'Total units', value: stats.units, tint: 'bg-green-50 text-green-700' },
          { label: 'Poor / written off', value: stats.poor, tint: 'bg-orange-50 text-orange-700' },
          { label: 'No location set', value: stats.unlocated, tint: 'bg-amber-50 text-amber-700' },
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
            placeholder="Search tag, name, custodian, location…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="">All conditions</option>
          {CONDITIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
        <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
          className="max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="">All locations</option>
          <option value="unlocated">⚠ No location set</option>
          {departments.map(d => <option key={d.id} value={`dept:${d.id}`}>Dept · {d.name}</option>)}
          {stations.map(s => <option key={s.id} value={`station:${s.id}`}>Station · {s.name}</option>)}
          {centres.map(c => <option key={c.id} value={`centre:${c.id}`}>Centre · {c.name}</option>)}
        </select>
        <button onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <Printer size={16} /> Print
        </button>
        {canManage && (
          <button onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            <Plus size={16} /> Add Asset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Custodian</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={canManage ? 8 : 7} className="px-4 py-10 text-center text-gray-400">Loading assets…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={canManage ? 8 : 7} className="px-4 py-10 text-center text-gray-400">
                {assets.length === 0 ? 'No assets registered yet.' : 'No assets match the current filters.'}
              </td></tr>
            )}
            {!loading && filtered.map(a => (
              <tr key={a.id} className="hover:bg-emerald-50/40">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700">{a.tag}</td>
                <td className="px-4 py-3 font-semibold text-gray-800">
                  {a.name}
                  {a.remarks && <div className="mt-0.5 max-w-[240px] truncate text-xs font-normal text-gray-400">{a.remarks}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">{a.category}</td>
                <td className="px-4 py-3 text-center font-semibold">{a.quantity}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${CONDITION_TINT[a.condition] || 'bg-gray-100 text-gray-600'}`}>
                    {a.condition.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {locationKey(a) === 'unlocated' ? (
                    <span className="text-xs font-medium text-amber-600">⚠ not set</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      {a.station_id ? <MapPin size={13} /> : a.department_id ? <Landmark size={13} /> : <Building2 size={13} />}
                      {locationLabel(a)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {a.custodian_employee_id
                    ? <span className="inline-flex items-center gap-1"><UserRound size={13} /> {custodianName(a.custodian_employee_id)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => openEdit(a)} title="Edit"
                        className="rounded p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15} /></button>
                      <button onClick={() => setShowDelete(a.id)} title="Delete"
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
        title={editing ? `Edit ${editing.tag}` : 'Add Board Asset'}
        onClose={() => setShowForm(false)}
          footer={
            <>
              <button onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add asset'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {formError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Asset tag *</span>
                <input value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                  placeholder="AMEB-ICT-001" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Name *</span>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Desktop computer — Admin office" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Category</span>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Qty</span>
                  <input type="number" min={1} value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) || 1 }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Condition</span>
                  <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                    {CONDITIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {/* Location — mutually exclusive pointers */}
            <fieldset className="rounded-lg border border-gray-100 p-3">
              <legend className="px-1 text-xs font-bold uppercase tracking-wide text-gray-500">Where the asset sits (pick one)</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600"><MapPin size={12} className="mr-1 inline" />Station</span>
                  <select value={form.station_id}
                    onChange={e => setForm(f => ({ ...f, station_id: e.target.value, department_id: '', centre_id: '' }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                    <option value="">—</option>
                    {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600"><Landmark size={12} className="mr-1 inline" />Department</span>
                  <select value={form.department_id}
                    onChange={e => setForm(f => ({ ...f, department_id: e.target.value, station_id: '', centre_id: '' }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                    <option value="">—</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600"><Building2 size={12} className="mr-1 inline" />Centre</span>
                  <select value={form.centre_id}
                    onChange={e => setForm(f => ({ ...f, centre_id: e.target.value, station_id: '', department_id: '' }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                    <option value="">—</option>
                    {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              </div>
            </fieldset>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500"><UserRound size={12} className="mr-1 inline" />Custodian (officer answerable)</span>
              <select value={form.custodian_employee_id}
                onChange={e => setForm(f => ({ ...f, custodian_employee_id: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                <option value="">—</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}{e.station ? ` — ${e.station}` : ''}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Remarks</span>
              <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                rows={2} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
          </div>
        </Modal>

      {/* Delete confirm */}
      <Modal open={!!showDelete} title="Delete asset?"
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
            Remove <strong>{assets.find(a => a.id === showDelete)?.tag}</strong> —{' '}
            {assets.find(a => a.id === showDelete)?.name}? This cannot be undone.
          </p>
        </Modal>
      </div>
  );
}
