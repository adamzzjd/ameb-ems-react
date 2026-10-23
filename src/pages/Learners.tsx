import { useCallback, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast';
import { LGAs } from '../data/constants';
import { AGE_GROUPS, LEARNER_STATUSES, type Centre, type Learner } from '../types';
import {
  dbLoadLearners, dbSaveLearner, dbDeleteLearner, dbImportLearners,
} from '../supabase/learners';
import { dbLoadCentres } from '../supabase/centres';
import {
  buildLearnerMapping, buildLearnerImportPlan, exportLearnersCSV,
  type CentreOption, type LearnerImportPlan,
} from '../lib/learnersCsv';
import { printLearners } from '../utils/print';

interface LearnersPageProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canImport?: boolean;
  canExport?: boolean;
}

type FormState = {
  id?: string;
  full_name: string;
  reference_no: string;
  gender: string;
  age_group: string;
  phone: string;
  lga: string;
  community: string;
  centre_id: string;
  status: string;
  enrolled_on: string;
  completed_on: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  full_name: '', reference_no: '', gender: '', age_group: '', phone: '',
  lga: '', community: '', centre_id: '', status: 'active',
  enrolled_on: new Date().toISOString().slice(0, 10), completed_on: '', notes: '',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)',
};

const filterInput = 'h-[38px] w-full px-2.5 rounded-lg border text-[13px] outline-none transition-colors focus:ring-2 focus:ring-ring appearance-none pr-7 bg-no-repeat bg-[right_9px_center]';
const filterLabel = 'text-[11px] font-bold uppercase tracking-wider';
const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B8F7E' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`;

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'active': return { background: 'rgba(22,163,74,.12)', color: '#15803d' };
    case 'completed': return { background: 'rgba(26,92,56,.12)', color: '#1a5c38' };
    case 'dropped out': return { background: 'rgba(220,38,38,.1)', color: '#b91c1c' };
    case 'transferred': return { background: 'rgba(217,119,6,.12)', color: '#b45309' };
    default: return { background: 'var(--color-surface-warm)', color: 'var(--color-text-muted)' };
  }
}

function isoDate(v: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '';
}

function friendlyError(error: Error): string {
  if (/duplicate key|unique/i.test(error.message)) {
    return 'That reference number is already used by another learner.';
  }
  return error.message;
}

/** Learners register — the board's record of everyone attending a centre. */
export function LearnersPage({
  canCreate = false, canEdit = false, canDelete = false, canImport = false, canExport = false,
}: LearnersPageProps) {
  const { toast } = useToast();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [lgaFilter, setLgaFilter] = useState('');
  const [centreFilter, setCentreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Learner | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    const [learnerRes, centreRes] = await Promise.all([dbLoadLearners(), dbLoadCentres()]);
    if (learnerRes.error) setLoadError(learnerRes.error.message);
    else setLearners(learnerRes.data ?? []);
    if (!centreRes.error && centreRes.data) setCentres(centreRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const centreOptions: CentreOption[] = useMemo(
    () => centres.map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [centres]
  );
  const centreNames = useMemo(
    () => Object.fromEntries(centres.map(c => [c.id, c.name])),
    [centres]
  );
  const centreName = useCallback(
    (l: Learner) => l.centres?.name || (l.centre_id ? centreNames[l.centre_id] : '') || '—',
    [centreNames]
  );

  const lgaOptions = useMemo(() => {
    const used = new Set(learners.map(l => l.lga).filter((v): v is string => Boolean(v)));
    const all = new Set<string>([...LGAs, ...used]);
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [learners]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return learners.filter(l => {
      if (lgaFilter && l.lga !== lgaFilter) return false;
      if (centreFilter && l.centre_id !== centreFilter) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      if (!q) return true;
      return [l.full_name, l.reference_no, l.phone, l.community, l.lga, centreName(l)]
        .some(v => (v ?? '').toLowerCase().includes(q));
    });
  }, [learners, search, lgaFilter, centreFilter, statusFilter, centreName]);

  const stats = useMemo(() => ({
    total: learners.length,
    active: learners.filter(l => l.status === 'active').length,
    completed: learners.filter(l => l.status === 'completed').length,
    centres: new Set(learners.map(l => l.centre_id).filter(Boolean)).size,
  }), [learners]);

  const clearFilters = () => {
    setSearch(''); setLgaFilter(''); setCentreFilter(''); setStatusFilter('');
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, enrolled_on: new Date().toISOString().slice(0, 10) });
    setFormOpen(true);
  };

  const openEdit = (l: Learner) => {
    setForm({
      id: l.id,
      full_name: l.full_name,
      reference_no: l.reference_no || '',
      gender: l.gender || '',
      age_group: l.age_group || '',
      phone: l.phone || '',
      lga: l.lga || '',
      community: l.community || '',
      centre_id: l.centre_id || '',
      status: l.status || 'active',
      enrolled_on: l.enrolled_on || '',
      completed_on: l.completed_on || '',
      notes: l.notes || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast('A learner needs a name.', true);
      return;
    }
    setSaving(true);
    const { error } = await dbSaveLearner({
      id: form.id,
      full_name: form.full_name,
      reference_no: form.reference_no || null,
      gender: form.gender || null,
      age_group: form.age_group || null,
      phone: form.phone || null,
      lga: form.lga || null,
      community: form.community || null,
      centre_id: form.centre_id || null,
      status: form.status || 'active',
      enrolled_on: form.enrolled_on || null,
      completed_on: form.completed_on || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast(friendlyError(error), true); return; }
    toast(form.id ? 'Learner updated.' : 'Learner added to the register.');
    setFormOpen(false);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await dbDeleteLearner(deleteTarget.id);
    if (error) { toast(error.message, true); return; }
    toast('Learner removed from the register.');
    setDeleteTarget(null);
    await load();
  };

  const handleExport = () => {
    if (filtered.length === 0) { toast('Nothing to export — the register is empty.', true); return; }
    exportLearnersCSV(filtered, centreOptions);
    toast(`Exported ${filtered.length} learner${filtered.length === 1 ? '' : 's'} to CSV.`);
  };

  const handlePrint = () => {
    if (filtered.length === 0) { toast('Nothing to print — the register is empty.', true); return; }
    const bits = [lgaFilter, centres.find(c => c.id === centreFilter)?.name, statusFilter].filter(Boolean);
    printLearners(filtered, centreNames, 'Learners Register', bits.length ? bits.join(' · ') : undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mr-3" />
        Loading learners…
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Learners" value={stats.total} hint="In the register" primary />
        <StatCard label="Active" value={stats.active} hint="Currently attending" />
        <StatCard label="Completed" value={stats.completed} hint="Finished their course" />
        <StatCard label="Centres" value={stats.centres} hint="With learners enrolled" />
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border p-3 md:p-3.5 flex gap-2.5 flex-wrap items-end mb-3.5"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col gap-1 flex-[2] min-w-[200px]">
          <div className={filterLabel} style={{ color: 'var(--color-text-muted)' }}>Search</div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Name, reference, phone, community…"
            aria-label="Search learners"
            className="h-[38px] w-full px-2.5 rounded-lg border text-[13px] outline-none transition-colors focus:ring-2 focus:ring-ring"
            style={inputStyle} />
        </div>
        {[
          { label: 'LGA', value: lgaFilter, key: 'lga', options: lgaOptions },
          { label: 'Status', value: statusFilter, key: 'status', options: [...LEARNER_STATUSES] },
        ].map(f => (
          <div key={f.key} className="flex flex-col gap-1 flex-1 min-w-[130px]">
            <div className={filterLabel} style={{ color: 'var(--color-text-muted)' }}>{f.label}</div>
            <select value={f.value} onChange={e => (f.key === 'lga' ? setLgaFilter(e.target.value) : setStatusFilter(e.target.value))}
              className={filterInput} style={{ ...inputStyle, backgroundImage: chevronSvg }}>
              <option value="">All {f.label === 'LGA' ? 'LGAs' : 'Statuses'}</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div className="flex flex-col gap-1 flex-[2] min-w-[170px]">
          <div className={filterLabel} style={{ color: 'var(--color-text-muted)' }}>Learning Centre</div>
          <select value={centreFilter} onChange={e => setCentreFilter(e.target.value)}
            aria-label="Filter by learning centre"
            className={filterInput} style={{ ...inputStyle, backgroundImage: chevronSvg }}>
            <option value="">All centres</option>
            {centreOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-1.5 items-end flex-wrap">
          <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg text-xs font-semibold border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            Clear
          </button>
          {canExport && (
            <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg text-xs font-semibold border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              ⤓ Export
            </button>
          )}
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg text-xs font-semibold border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            🖨 Print
          </button>
          {canImport && (
            <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg text-xs font-semibold border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              ⤒ Import
            </button>
          )}
          {canCreate && (
            <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--color-primary)' }}>
              + Add Learner
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between px-3.5 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Showing <strong style={{ color: 'var(--color-text-primary)' }}>{filtered.length}</strong> of {learners.length} learners
          </div>
        </div>

        {loadError ? (
          <div className="text-center py-14 px-6">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              The learners register could not be loaded.
            </p>
            <p className="text-[12px] mb-4" style={{ color: 'var(--color-text-muted)' }}>{loadError}</p>
            <button onClick={load} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: 'var(--color-primary)' }}>
              Try again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Reference', 'Learner', 'Gender', 'Age Group', 'LGA', 'Learning Centre', 'Status', 'Enrolled', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider px-3 py-2.5 border-b whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14">
                      <div className="text-3xl mb-2">🎓</div>
                      <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {learners.length > 0 ? 'No learners match your filters.' : 'No learners in the register yet.'}
                      </div>
                      <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                        {learners.length > 0 ? (
                          <button onClick={clearFilters} className="font-semibold" style={{ color: 'var(--color-primary)' }}>Clear filters</button>
                        ) : canCreate ? (
                          'Add a learner, or import an existing register from CSV.'
                        ) : (
                          'Learners added by the board will appear here.'
                        )}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                    <td className="px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap" style={{ color: 'var(--color-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {l.reference_no || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{l.full_name}</td>
                    <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{l.gender || '—'}</td>
                    <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{l.age_group || '—'}</td>
                    <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {l.lga || '—'}
                      {l.community && <span className="block text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{l.community}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{centreName(l)}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize whitespace-nowrap" style={statusStyle(l.status)}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{l.enrolled_on || '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {canEdit && (
                          <button onClick={() => openEdit(l)} title="Edit learner"
                            className="w-7 h-7 rounded-md border text-[12px] flex items-center justify-center"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>✏️</button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteTarget(l)} title="Remove learner"
                            className="w-7 h-7 rounded-md border text-[12px] flex items-center justify-center"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-error)' }}>🗑</button>
                        )}
                        {!canEdit && !canDelete && <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / edit form */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? 'Edit Learner' : 'Add Learner'}
        subtitle="One record per learner attending a learning centre"
        maxWidth="760px"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}>
              {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Add Learner'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field label="Full Name" required>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="e.g. Aisha Bello" className={filterInput.replace(' pr-7', '')} style={inputStyle} autoFocus />
          </Field>
          <Field label="Reference No.">
            <input value={form.reference_no} onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))}
              placeholder="e.g. AM/001" className={filterInput.replace(' pr-7', '')} style={inputStyle} />
          </Field>
          <Field label="Learning Centre">
            <select value={form.centre_id} onChange={e => setForm(f => ({ ...f, centre_id: e.target.value }))}
              className={filterInput} style={{ ...inputStyle, backgroundImage: chevronSvg }}>
              <option value="">Not assigned yet</option>
              {centreOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className={filterInput} style={{ ...inputStyle, backgroundImage: chevronSvg }}>
              {LEARNER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
              className={filterInput} style={{ ...inputStyle, backgroundImage: chevronSvg }}>
              <option value="">—</option>
              {['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Age Group">
            <select value={form.age_group} onChange={e => setForm(f => ({ ...f, age_group: e.target.value }))}
              className={filterInput} style={{ ...inputStyle, backgroundImage: chevronSvg }}>
              <option value="">—</option>
              {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. 08030000000" className={filterInput.replace(' pr-7', '')} style={inputStyle} />
          </Field>
          <Field label="LGA">
            <select value={form.lga} onChange={e => setForm(f => ({ ...f, lga: e.target.value }))}
              className={filterInput} style={{ ...inputStyle, backgroundImage: chevronSvg }}>
              <option value="">—</option>
              {lgaOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Community">
            <input value={form.community} onChange={e => setForm(f => ({ ...f, community: e.target.value }))}
              placeholder="e.g. Jambutu" className={filterInput.replace(' pr-7', '')} style={inputStyle} />
          </Field>
          <Field label="Enrolled On">
            <input type="date" value={isoDate(form.enrolled_on)} onChange={e => setForm(f => ({ ...f, enrolled_on: e.target.value }))}
              className={filterInput.replace(' pr-7', '')} style={inputStyle} />
          </Field>
          <Field label="Completed On">
            <input type="date" value={isoDate(form.completed_on)} onChange={e => setForm(f => ({ ...f, completed_on: e.target.value }))}
              className={filterInput.replace(' pr-7', '')} style={inputStyle} />
          </Field>
          <Field label="Notes" wide>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Anything the centre should know"
              className="w-full px-2.5 py-2 rounded-lg border text-[13px] outline-none transition-colors focus:ring-2 focus:ring-ring"
              style={inputStyle} />
          </Field>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove Learner"
        maxWidth="440px"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-[13px] font-semibold border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleDelete} className="px-5 py-2 rounded-lg text-[13px] font-bold text-white"
              style={{ background: 'var(--color-error)' }}>
              Remove
            </button>
          </div>
        }
      >
        <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          Remove <strong style={{ color: 'var(--color-text-primary)' }}>{deleteTarget?.full_name}</strong> from the learners register?
          This cannot be undone.
        </p>
      </Modal>

      {/* CSV import */}
      {importOpen && (
        <LearnerImportModal
          learners={learners}
          centres={centreOptions}
          onClose={() => setImportOpen(false)}
          onDone={async () => { setImportOpen(false); await load(); }}
          onToast={(msg, isError) => toast(msg, isError)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, hint, primary }: { label: string; value: number; hint: string; primary?: boolean }) {
  return (
    <div className="rounded-xl border p-3.5"
      style={primary
        ? { background: 'var(--color-primary)', borderColor: 'transparent', color: '#fff' }
        : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: primary ? 'rgba(255,255,255,.55)' : 'var(--color-text-muted)' }}>{label}</div>
      <div className="text-[24px] font-extrabold leading-tight"
        style={{ color: primary ? '#fff' : 'var(--color-text-primary)' }}>{value}</div>
      <div className="text-[11px]" style={{ color: primary ? 'rgba(255,255,255,.55)' : 'var(--color-text-muted)' }}>{hint}</div>
    </div>
  );
}

function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label}{required && <span style={{ color: 'var(--color-error)' }}> *</span>}
      </span>
      {children}
    </label>
  );
}

// ── CSV import ───────────────────────────────────────────────────────────────

function LearnerImportModal({
  learners, centres, onClose, onDone, onToast,
}: {
  learners: Learner[];
  centres: CentreOption[];
  onClose: () => void;
  onDone: () => Promise<void>;
  onToast: (msg: string, isError?: boolean) => void;
}) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [plan, setPlan] = useState<LearnerImportPlan | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Maximum size is 10MB.'); return; }
    setError('');

    const reader = new FileReader();
    reader.onload = ev => {
      Papa.parse(ev.target?.result as string, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        complete: results => {
          const data = (results.data as Record<string, string>[])
            .filter(r => Object.values(r).some(v => v && String(v).trim()));
          if (data.length === 0) { setError('CSV file is empty or has no data rows.'); return; }
          const headers = results.meta.fields || [];
          const m = buildLearnerMapping(headers);
          if (!headers.some(h => m[h] === 'full_name')) {
            setError('CSV must have a learner name column ("Full Name", "Name", "Learner Name"…).');
            return;
          }
          const existingRefs = new Set(
            learners.map(l => (l.reference_no || '').toUpperCase()).filter(Boolean)
          );
          setRows(data);
          setMapping(m);
          setPlan(buildLearnerImportPlan(data, m, existingRefs, centres));
          setStep('preview');
        },
        error: (err: { message: string }) => setError('Failed to parse CSV: ' + err.message),
      });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!plan) return;
    if (plan.records.length === 0) {
      onToast('Nothing to import — every row was skipped.', true);
      return;
    }
    setStep('importing');
    setProgress(0);

    const existingRefs = new Set(
      learners.map(l => (l.reference_no || '').toUpperCase()).filter(Boolean)
    );
    const fresh = buildLearnerImportPlan(rows, mapping, existingRefs, centres);

    const batchSize = 100;
    let done = 0;
    let failed = '';
    for (let i = 0; i < fresh.records.length; i += batchSize) {
      const batch = fresh.records.slice(i, i + batchSize);
      const { error: err } = await dbImportLearners(batch);
      if (err) { failed = err.message; break; }
      done += batch.length;
      setProgress(Math.round((done / fresh.records.length) * 100));
    }

    if (failed) {
      setError(`${done} learner${done === 1 ? '' : 's'} imported, then the import stopped: ${failed}`);
      setStep('preview');
      return;
    }
    onToast(`Imported ${done} learner${done === 1 ? '' : 's'}.`);
    await onDone();
  };

  return (
    <Modal open onClose={onClose} title="Import Learners from CSV" subtitle="Match your existing learner sheet to the register" maxWidth="700px">
      {step === 'upload' && (
        <div>
          <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Upload a CSV with one learner per row. Recognised columns include
            <strong> Full Name</strong>, Reference, Gender, Age Group, Phone, LGA, Community,
            Learning Centre, Status, Enrolled On, Completed On and Notes — in any order.
            Centre names are matched against the centres register.
          </p>
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold text-white cursor-pointer"
            style={{ background: 'var(--color-primary)' }}>
            Choose CSV file
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          </label>
          {error && (
            <p className="mt-4 text-[12px] px-3 py-2 rounded-lg"
              style={{ background: 'rgba(192,57,43,.06)', border: '1px solid rgba(192,57,43,.25)', color: 'var(--color-error)' }}>
              {error}
            </p>
          )}
        </div>
      )}

      {step === 'preview' && plan && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
            <PreviewStat label="To import" value={plan.records.length} primary />
            <PreviewStat label="Already on file" value={plan.skipped.duplicateRef} />
            <PreviewStat label="Duplicate in file" value={plan.skipped.duplicateInFile} />
            <PreviewStat label="No name" value={plan.skipped.noName} />
            <PreviewStat label="Unmatched centres" value={plan.unmatchedCentres.length} />
          </div>

          {plan.unmatchedCentres.length > 0 && (
            <p className="text-[12px] mb-3 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.3)', color: '#92400e' }}>
              These centre names did not match the centres register, so those learners will be saved
              without a centre: <strong>{plan.unmatchedCentres.join(', ')}</strong>
            </p>
          )}
          {error && <p className="text-[12px] mb-3" style={{ color: 'var(--color-error)' }}>{error}</p>}

          <div className="flex justify-end gap-2">
            <button onClick={() => { setStep('upload'); setPlan(null); setError(''); }}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              Choose another file
            </button>
            <button onClick={handleImport} disabled={plan.records.length === 0}
              className="px-5 py-2 rounded-lg text-[13px] font-bold text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}>
              Import {plan.records.length} learner{plan.records.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="py-6 text-center">
          <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Importing learners… {progress}%
          </div>
          <div className="h-2 rounded-full overflow-hidden mx-auto max-w-sm" style={{ background: 'var(--color-surface-warm)' }}>
            <div className="h-full transition-all" style={{ width: `${progress}%`, background: 'var(--color-primary)' }} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function PreviewStat({ label, value, primary }: { label: string; value: number; primary?: boolean }) {
  return (
    <div className="rounded-lg border px-3 py-2.5"
      style={primary
        ? { background: 'rgba(26,92,56,.08)', borderColor: 'rgba(26,92,56,.25)' }
        : { background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="text-[18px] font-extrabold" style={{ color: primary ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}
