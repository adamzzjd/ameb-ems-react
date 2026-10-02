import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { dbLoadLearners, dbSaveLearner, dbDeleteLearner } from '../supabase/delivery';
import { dbLoadCohorts } from '../supabase/delivery';
import { downloadLearnersCsv } from '../lib/learnerCsv';
import { LGAs } from '../data/constants';
import type { CohortOverviewRow, Learner } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Users, Plus, Pencil, Trash2, Search, Download, Upload } from 'lucide-react';
import { LearnerImportModal } from './LearnerImportModal';

interface Props {
  /** learners.manage — false for read-only viewers. */
  canManage: boolean;
  /**
   * Phase 30.2 — partner mode. Resolves the caller's own organisation so every
   * learner they create or import is stamped with it, and shows the import /
   * print actions a partner needs. RLS scopes the rows either way.
   */
  partnerMode?: boolean;
}

const AGE_GROUPS = ['Out-of-school child', 'Youth (15–24)', 'Adult (25+)'];
const STATUSES = ['active', 'completed', 'dropped_out', 'transferred'];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  dropped_out: 'bg-red-100 text-red-700',
  transferred: 'bg-amber-100 text-amber-700',
};

/** The learner register — people enrolled in cohorts (not staff). */
export function LearnersPage({ canManage, partnerMode = false }: Props) {
  const { toast } = useToast();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [cohorts, setCohorts] = useState<CohortOverviewRow[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Learner | null>(null);
  const [deleting, setDeleting] = useState<Learner | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    reference_no: '', full_name: '', gender: '', age_group: '', phone: '',
    lga: '', community: '', cohort_id: '', status: 'active', enrolled_on: '', completed_on: '', notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [learnerRes, cohortRes] = await Promise.all([dbLoadLearners(), dbLoadCohorts()]);
    if (learnerRes.error) toast('Failed to load learners.', true);
    else setLearners(learnerRes.data ?? []);
    if (!cohortRes.error) setCohorts(cohortRes.data ?? []);
    if (partnerMode) {
      const { dbLoadMyOrganisation } = await import('../supabase/partners');
      const { data: org } = await dbLoadMyOrganisation();
      setOrgId(org?.id ?? null);
      setOrgName(org?.name ?? '');
    }
    setLoading(false);
  }, [toast, partnerMode]);

  useEffect(() => { void load(); }, [load]);

  const cohortById = useMemo(
    () => new Map(cohorts.map(c => [c.id, c])),
    [cohorts]
  );

  const openAdd = () => {
    setEditing(null);
    setForm({
      reference_no: '', full_name: '', gender: '', age_group: '', phone: '',
      lga: '', community: '', cohort_id: '', status: 'active', enrolled_on: '', completed_on: '', notes: '',
    });
    setShowForm(true);
  };

  const openEdit = (l: Learner) => {
    setEditing(l);
    setForm({
      reference_no: l.reference_no ?? '',
      full_name: l.full_name,
      gender: l.gender ?? '',
      age_group: l.age_group ?? '',
      phone: l.phone ?? '',
      lga: l.lga ?? '',
      community: l.community ?? '',
      cohort_id: l.cohort_id ?? '',
      status: l.status ?? 'active',
      enrolled_on: l.enrolled_on ?? '',
      completed_on: l.completed_on ?? '',
      notes: l.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast('Please enter the learner\'s full name.', true); return; }
    setSaving(true);
    const { error } = await dbSaveLearner({
      id: editing?.id,
      reference_no: form.reference_no,
      full_name: form.full_name.trim(),
      gender: form.gender || null,
      age_group: form.age_group || null,
      phone: form.phone || null,
      lga: form.lga || null,
      community: form.community || null,
      cohort_id: form.cohort_id || null,
      status: form.status,
      enrolled_on: form.enrolled_on || null,
      completed_on: form.completed_on || null,
      notes: form.notes || null,
      // A partner's new learners belong to their organisation; the board
      // keeps its own null.
      owner_org_id: editing?.owner_org_id ?? orgId ?? null,
    }, { ownerOrgId: orgId });
    setSaving(false);
    if (error) toast(error.message, true);
    else {
      toast(`✓ Learner ${editing ? 'updated' : 'enrolled'}.`);
      setShowForm(false);
      void load();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await dbDeleteLearner(deleting.id);
    if (error) toast(error.message, true);
    else {
      toast('Learner removed from the register.');
      setDeleting(null);
      void load();
    }
  };

  const handleExport = () => {
    const rows = filtered.map(l => {
      const c = l.cohort_id ? cohortById.get(l.cohort_id) : undefined;
      return {
        ...l,
        cohort_name: c?.name ?? null,
        programme_title: c?.programme_title ?? null,
        centre_name: c?.centre_name ?? null,
      };
    });
    downloadLearnersCsv(rows);
    toast(`💾 ${rows.length} learner${rows.length !== 1 ? 's' : ''} exported.`);
  };

  const filtered = useMemo(() => learners.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (cohortFilter !== 'all' && l.cohort_id !== cohortFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const c = l.cohort_id ? cohortById.get(l.cohort_id) : undefined;
    return [l.full_name, l.reference_no, l.phone, l.lga, l.community, c?.name, c?.programme_title]
      .some(v => (v ?? '').toLowerCase().includes(q));
  }), [learners, search, statusFilter, cohortFilter, cohortById]);

  const stats = useMemo(() => ({
    total: learners.length,
    active: learners.filter(l => l.status === 'active').length,
    completed: learners.filter(l => l.status === 'completed').length,
    dropped: learners.filter(l => l.status === 'dropped_out').length,
  }), [learners]);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Learners', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Completed', value: stats.completed },
          { label: 'Dropped Out', value: stats.dropped },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-heading font-bold mt-1.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, ref no, phone, cohort…" className="pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={cohortFilter} onChange={e => setCohortFilter(e.target.value)}
          className="h-10 px-3 rounded-md border text-sm max-w-[220px]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }} aria-label="Filter by cohort">
          <option value="all">All cohorts</option>
          {cohorts.map(c => <option key={c.id} value={c.id}>{c.name || c.programme_title} · {c.centre_name}</option>)}
        </select>
        <Button variant="outline" onClick={handleExport}><Download size={15} className="mr-1.5" /> Export CSV</Button>
        {canManage && partnerMode && (
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload size={15} className="mr-1.5" /> Import CSV
          </Button>
        )}
        {canManage && (
          <Button onClick={openAdd}><Plus size={16} className="mr-1.5" /> Enrol Learner</Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading learners…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <Users size={28} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No learners found{canManage ? ' — enrol the first one' : ''}.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground" style={{ borderColor: 'var(--color-border)' }}>
                <th className="px-4 py-3 font-bold">Learner</th>
                <th className="px-4 py-3 font-bold">Ref No</th>
                <th className="px-4 py-3 font-bold">Age Group</th>
                <th className="px-4 py-3 font-bold">Cohort / Centre</th>
                <th className="px-4 py-3 font-bold">LGA</th>
                <th className="px-4 py-3 font-bold">Status</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const c = l.cohort_id ? cohortById.get(l.cohort_id) : undefined;
                return (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/40" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{l.full_name}</div>
                      {l.phone && <div className="text-[11px] text-muted-foreground">{l.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-[12px]">{l.reference_no || '—'}</td>
                    <td className="px-4 py-3 text-[12px]">{l.age_group || '—'}</td>
                    <td className="px-4 py-3 text-[12px]">
                      {c ? <>{c.name || c.programme_title} <span className="text-muted-foreground">· {c.centre_name}</span></> : '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px]">{l.lga || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[l.status] ?? 'bg-muted'}`}>
                        {l.status.replace('_', ' ')}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(l)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(l)}><Trash2 size={14} className="text-destructive" /></Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Learner' : 'Enrol Learner'}</DialogTitle>
            <DialogDescription>People enrolled in a cohort — this is the learner register, not the staff register.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lr-name">Full Name *</Label>
                <Input id="lr-name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Aisha Mohammed" />
              </div>
              <div>
                <Label htmlFor="lr-ref">Reference No</Label>
                <Input id="lr-ref" value={form.reference_no} onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="e.g. LR-2026-0001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lr-gender">Gender</Label>
                <select id="lr-gender" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <option value="">Not stated</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="lr-age">Age Group</Label>
                <select id="lr-age" value={form.age_group} onChange={e => setForm(f => ({ ...f, age_group: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <option value="">Not stated</option>
                  {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lr-phone">Phone</Label>
                <Input id="lr-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 0803 123 4567" />
              </div>
              <div>
                <Label htmlFor="lr-lga">LGA</Label>
                <select id="lr-lga" value={form.lga} onChange={e => setForm(f => ({ ...f, lga: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <option value="">Not stated</option>
                  {LGAs.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="lr-community">Community / Ward</Label>
              <Input id="lr-community" value={form.community} onChange={e => setForm(f => ({ ...f, community: e.target.value }))} placeholder="e.g. Doubeli" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lr-cohort">Cohort</Label>
                <select id="lr-cohort" value={form.cohort_id} onChange={e => setForm(f => ({ ...f, cohort_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <option value="">Unassigned</option>
                  {cohorts.map(c => <option key={c.id} value={c.id}>{c.name || c.programme_title} · {c.centre_name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="lr-status">Status</Label>
                <select id="lr-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lr-enrolled">Enrolled On</Label>
                <Input id="lr-enrolled" type="date" value={form.enrolled_on} onChange={e => setForm(f => ({ ...f, enrolled_on: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="lr-completed">Completed On</Label>
                <Input id="lr-completed" type="date" value={form.completed_on} onChange={e => setForm(f => ({ ...f, completed_on: e.target.value }))} disabled={form.status !== 'completed'} />
              </div>
            </div>
            <div>
              <Label htmlFor="lr-notes">Notes</Label>
              <Textarea id="lr-notes" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Enrol Learner'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV import (partner self-service) */}
      <LearnerImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        ownerOrgId={orgId}
        orgLabel={orgName}
        onDone={() => { void load(); }}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Learner?</DialogTitle>
            <DialogDescription><strong>{deleting?.full_name}</strong> will be removed from the learner register. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Remove Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
