import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { dbLoadCohorts, dbSaveCohort, dbDeleteCohort, dbLoadProgrammes } from '../supabase/delivery';
import { dbLoadCentres } from '../supabase/centres';
import type { CohortOverviewRow, Programme } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { CalendarRange, Plus, Pencil, Trash2, Search } from 'lucide-react';

interface Props {
  /** programmes.manage — false for read-only viewers. */
  canManage: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-700',
  running: 'bg-green-100 text-green-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-100 text-red-700',
};

/** Cohorts — a programme delivered at a centre over a period. */
export function CohortsManager({ canManage }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<CohortOverviewRow[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [centres, setCentres] = useState<{ id: string; name: string; lga: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CohortOverviewRow | null>(null);
  const [deleting, setDeleting] = useState<CohortOverviewRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    programme_id: '', centre_id: '', name: '', start_date: '', end_date: '', capacity: '', status: 'planned',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [cohortRes, progRes, centreRes] = await Promise.all([
      dbLoadCohorts(), dbLoadProgrammes(), dbLoadCentres(),
    ]);
    if (cohortRes.error) toast('Failed to load cohorts.', true);
    else setRows(cohortRes.data ?? []);
    if (!progRes.error) setProgrammes(progRes.data ?? []);
    if (!centreRes.error && centreRes.data) {
      setCentres(centreRes.data.map(c => ({ id: c.id, name: c.name, lga: c.lga })));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ programme_id: '', centre_id: '', name: '', start_date: '', end_date: '', capacity: '', status: 'planned' });
    setShowForm(true);
  };

  const openEdit = (r: CohortOverviewRow) => {
    setEditing(r);
    // Edit reads through the view; save goes to the base table.
    setForm({
      programme_id: r.programme_id,
      centre_id: r.centre_id,
      name: r.name,
      start_date: r.start_date ?? '',
      end_date: r.end_date ?? '',
      capacity: r.capacity != null ? String(r.capacity) : '',
      status: r.cohort_status ?? 'planned',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.programme_id || !form.centre_id) { toast('Choose a programme and a centre.', true); return; }
    if (!form.name.trim()) { toast('Please give the cohort a name.', true); return; }
    setSaving(true);
    const { error } = await dbSaveCohort({
      id: editing?.id,
      programme_id: form.programme_id,
      centre_id: form.centre_id,
      name: form.name.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      status: form.status,
    });
    setSaving(false);
    if (error) toast(error.message, true);
    else {
      toast(`✓ Cohort ${editing ? 'updated' : 'created'}.`);
      setShowForm(false);
      void load();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await dbDeleteCohort(deleting.id);
    if (error) toast(error.message, true);
    else {
      toast('Cohort deleted.');
      setDeleting(null);
      void load();
    }
  };

  const filtered = rows.filter(r =>
    !search.trim() ||
    [r.name, r.programme_title, r.centre_name, r.centre_lga].some(v => (v ?? '').toLowerCase().includes(search.trim().toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cohorts, programmes, centres…" className="pl-9" />
        </div>
        {canManage && (
          <Button onClick={openAdd}><Plus size={16} className="mr-1.5" /> Add Cohort</Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading cohorts…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <CalendarRange size={28} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No cohorts yet{canManage ? ' — add the first one' : ''}.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground" style={{ borderColor: 'var(--color-border)' }}>
                <th className="px-4 py-3 font-bold">Cohort</th>
                <th className="px-4 py-3 font-bold">Programme</th>
                <th className="px-4 py-3 font-bold">Centre</th>
                <th className="px-4 py-3 font-bold">Period</th>
                <th className="px-4 py-3 font-bold text-right">Learners</th>
                <th className="px-4 py-3 font-bold">Status</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-4 py-3 font-semibold">{r.name || '(unnamed)'}</td>
                  <td className="px-4 py-3">{r.programme_title}</td>
                  <td className="px-4 py-3">{r.centre_name} <span className="text-muted-foreground">· {r.centre_lga}</span></td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {r.start_date || '—'} → {r.end_date || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {r.learner_count}{r.capacity != null ? <span className="text-muted-foreground font-normal"> / {r.capacity}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[r.cohort_status] ?? 'bg-muted'}`}>
                      {r.cohort_status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(r)}><Trash2 size={14} className="text-destructive" /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Cohort' : 'Add Cohort'}</DialogTitle>
            <DialogDescription>A programme delivered at a centre for a group of learners.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div>
              <Label htmlFor="co-prog">Programme *</Label>
              <select id="co-prog" value={form.programme_id} onChange={e => setForm(f => ({ ...f, programme_id: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <option value="">Select a programme…</option>
                {programmes.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="co-centre">Centre *</Label>
              <select id="co-centre" value={form.centre_id} onChange={e => setForm(f => ({ ...f, centre_id: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <option value="">Select a centre…</option>
                {centres.map(c => <option key={c.id} value={c.id}>{c.name} ({c.lga})</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="co-name">Cohort Name *</Label>
              <Input id="co-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 2026 Intake A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="co-start">Start Date</Label>
                <Input id="co-start" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="co-end">End Date</Label>
                <Input id="co-end" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="co-cap">Capacity</Label>
                <Input id="co-cap" type="number" min="0" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 40" />
              </div>
              <div>
                <Label htmlFor="co-status">Status</Label>
                <select id="co-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <option value="planned">Planned</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Cohort'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Cohort?</DialogTitle>
            <DialogDescription>
              <strong>{deleting?.name || 'This cohort'}</strong> will be removed. Learners stay on the register but lose their cohort assignment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
