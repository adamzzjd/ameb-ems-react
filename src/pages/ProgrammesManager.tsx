import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../hooks/useToast';
import {
  dbLoadProgrammes, dbSaveProgramme, dbDeleteProgramme,
  dbLoadProgrammeLgas, dbSetProgrammeLgaScope,
} from '../supabase/delivery';
import { dbLoadPartnerOrganisations } from '../supabase/partners';
import type { PartnerOrganisation, Programme } from '../types';
import { LGAs } from '../data/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { BookOpen, Plus, Pencil, Trash2, Search, Layers, Landmark, Handshake, MapPin } from 'lucide-react';

const CATEGORIES = ['Literacy', 'Vocational', 'Youth', 'Women', 'Other'];

interface Props {
  /** programmes.manage — false for read-only viewers. */
  canManage: boolean;
}

/**
 * Programme catalogue — the courses the Board or a partner organisation
 * delivers (Phase 28: owner is explicit, plus an optional LGA scope).
 */
export function ProgrammesManager({ canManage }: Props) {
  const { toast } = useToast();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [orgs, setOrgs] = useState<PartnerOrganisation[]>([]);
  const [orgError, setOrgError] = useState(false);
  const [scopeByProgramme, setScopeByProgramme] = useState<Map<string, string[]>>(new Map());
  const [scopeAvailable, setScopeAvailable] = useState(true); // programme_lgas exists?
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'board' | string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Programme | null>(null);
  const [deleting, setDeleting] = useState<Programme | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Literacy', duration_weeks: '', status: 'active',
    ownerMode: 'board' as 'board' | 'org',
    ownerOrgId: '',
    lgas: [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [progs, orgRes, scopeRes] = await Promise.all([
      dbLoadProgrammes(),
      dbLoadPartnerOrganisations(),
      dbLoadProgrammeLgas(),
    ]);
    if (progs.error) toast('Failed to load programmes.', true);
    else setProgrammes(progs.data ?? []);
    if (orgRes.error) setOrgError(true);
    else setOrgs(orgRes.data ?? []);
    if (scopeRes.error) {
      // setup_hierarchy.sql hasn't run — hide the scope picker quietly.
      setScopeAvailable(false);
      setScopeByProgramme(new Map());
    } else {
      const map = new Map<string, string[]>();
      for (const row of scopeRes.data ?? []) {
        map.set(row.programme_id, [...(map.get(row.programme_id) ?? []), row.lga]);
      }
      setScopeByProgramme(map);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const orgName = useCallback(
    (id: string | null) => (id ? (orgs.find(o => o.id === id)?.name ?? 'Unknown organisation') : 'The Board'),
    [orgs],
  );

  const openAdd = () => {
    setEditing(null);
    setForm({
      title: '', description: '', category: 'Literacy', duration_weeks: '', status: 'active',
      ownerMode: 'board', ownerOrgId: orgs[0]?.id ?? '', lgas: [],
    });
    setShowForm(true);
  };

  const openEdit = (p: Programme) => {
    setEditing(p);
    const scope = scopeByProgramme.get(p.id) ?? [];
    setForm({
      title: p.title,
      description: p.description ?? '',
      category: p.category ?? 'Other',
      duration_weeks: p.duration_weeks != null ? String(p.duration_weeks) : '',
      status: p.status ?? 'active',
      ownerMode: p.owner_org_id ? 'org' : 'board',
      ownerOrgId: p.owner_org_id ?? orgs[0]?.id ?? '',
      lgas: scope,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast('Please enter a programme title.', true); return; }
    if (form.ownerMode === 'org' && !form.ownerOrgId) {
      toast('Pick the organisation that owns this programme.', true);
      return;
    }
    setSaving(true);
    const ownerOrgId = form.ownerMode === 'org' ? form.ownerOrgId : null;
    const { data, error } = await dbSaveProgramme({
      id: editing?.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      duration_weeks: form.duration_weeks ? Number(form.duration_weeks) : null,
      status: form.status,
      owner_org_id: ownerOrgId,
    });
    if (error) {
      setSaving(false);
      toast(error.message, true);
      return;
    }
    // Scope second (needs the programme id; harmless on edit too).
    if (scopeAvailable && data) {
      const { error: scopeError } = await dbSetProgrammeLgaScope(data.id, form.lgas);
      if (scopeError) {
        setSaving(false);
        toast(`Programme saved, but the LGA scope failed: ${scopeError.message}`, true);
        void load();
        return;
      }
    }
    setSaving(false);
    toast(`✓ Programme ${editing ? 'updated' : 'created'}.`);
    setShowForm(false);
    void load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await dbDeleteProgramme(deleting.id);
    if (error) toast(error.message, true);
    else {
      toast('Programme deleted.');
      setDeleting(null);
      void load();
    }
  };

  const filtered = useMemo(() => programmes.filter(p => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      [p.title, p.description, p.category].some(v => (v ?? '').toLowerCase().includes(q));
    const matchesOwner =
      ownerFilter === 'all'
      || (ownerFilter === 'board' ? p.owner_org_id === null : p.owner_org_id === ownerFilter);
    return matchesSearch && matchesOwner;
  }), [programmes, search, ownerFilter]);

  const activeCount = programmes.filter(p => p.status === 'active').length;
  const boardCount = programmes.filter(p => p.owner_org_id === null).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Programmes', value: programmes.length, icon: <BookOpen size={18} /> },
          { label: 'Board-run', value: boardCount, icon: <Landmark size={18} /> },
          { label: 'Partner-run', value: programmes.length - boardCount, icon: <Handshake size={18} /> },
          { label: 'Active', value: activeCount, icon: <Layers size={18} /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {s.icon} {s.label}
            </div>
            <div className="text-2xl font-heading font-bold mt-1.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search programmes…" className="pl-9" />
        </div>
        <select
          value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
          className="h-10 px-3 rounded-md border text-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <option value="all">All owners</option>
          <option value="board">Board-run only</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        {canManage && (
          <Button onClick={openAdd}><Plus size={16} className="mr-1.5" /> Add Programme</Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading programmes…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <BookOpen size={28} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No programmes yet{canManage ? ' — add the first one' : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const scope = scopeByProgramme.get(p.id) ?? [];
            return (
              <div key={p.id} className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-heading text-[15px] font-bold leading-snug">{p.title}</h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.status === 'active' ? 'bg-green-100 text-green-700' :
                    p.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                  }`}>{p.status}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  {p.category && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{p.category}</span>
                  )}
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    p.owner_org_id ? 'bg-gold/15 text-gold' : 'bg-primary/10 text-primary'
                  }`}>
                    {p.owner_org_id ? <Handshake size={10} /> : <Landmark size={10} />}
                    {orgName(p.owner_org_id)}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground line-clamp-2 mb-2">{p.description || '—'}</p>
                {scope.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mb-2 flex items-start gap-1">
                    <MapPin size={11} className="mt-0.5 shrink-0" />
                    <span>{scope.length >= 8 ? `${scope.slice(0, 7).join(', ')} +${scope.length - 7} more` : scope.join(', ')}</span>
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {p.duration_weeks != null ? `${p.duration_weeks} weeks` : 'Open-ended'}
                  </span>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(p)}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Programme' : 'Add Programme'}</DialogTitle>
            <DialogDescription>A course or programme delivered at learning centres.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div>
              <Label htmlFor="prog-title">Title *</Label>
              <Input id="prog-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Adult Literacy & Numeracy" />
            </div>
            <div>
              <Label htmlFor="prog-owner">Owner *</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button" variant={form.ownerMode === 'board' ? 'default' : 'outline'} size="sm"
                  onClick={() => setForm(f => ({ ...f, ownerMode: 'board' }))}
                >
                  <Landmark size={13} className="mr-1" /> The Board
                </Button>
                <Button
                  type="button" variant={form.ownerMode === 'org' ? 'default' : 'outline'} size="sm"
                  onClick={() => setForm(f => ({ ...f, ownerMode: 'org' }))}
                >
                  <Handshake size={13} className="mr-1" /> An organisation
                </Button>
                {orgError && (
                  <span className="text-[11px] text-muted-foreground self-center">Org list unavailable — is the partners table set up?</span>
                )}
              </div>
              {form.ownerMode === 'org' && (
                <select
                  id="prog-owner" value={form.ownerOrgId}
                  onChange={e => setForm(f => ({ ...f, ownerOrgId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border text-sm"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                  <option value="">— Select organisation —</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  {form.ownerOrgId && !orgs.some(o => o.id === form.ownerOrgId) && (
                    <option value={form.ownerOrgId}>{form.ownerOrgId}</option>
                  )}
                </select>
              )}
            </div>
            <div>
              <Label htmlFor="prog-cat">Category</Label>
              <select id="prog-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="prog-weeks">Duration (weeks)</Label>
              <Input id="prog-weeks" type="number" min="0" value={form.duration_weeks}
                onChange={e => setForm(f => ({ ...f, duration_weeks: e.target.value }))} placeholder="e.g. 24" />
            </div>
            <div>
              <Label htmlFor="prog-status">Status</Label>
              <select id="prog-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            {scopeAvailable ? (
              <div>
                <Label>LGA scope — where it should run</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {LGAs.map(lga => {
                    const on = form.lgas.includes(lga);
                    return (
                      <button
                        key={lga} type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          lgas: on ? f.lgas.filter(l => l !== lga) : [...f.lgas, lga],
                        }))}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-full border cursor-pointer transition-colors ${
                          on
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {lga}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {form.lgas.length === 0
                    ? 'No scope set — the programme may run anywhere.'
                    : `${form.lgas.length} LGA${form.lgas.length !== 1 ? 's' : ''} selected · click again to remove`}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                LGA scope unlocks after <code className="font-mono">setup_hierarchy.sql</code> runs (README step 13).
              </p>
            )}
            <div>
              <Label htmlFor="prog-desc">Description</Label>
              <Textarea id="prog-desc" rows={3} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this programme teach?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Programme'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Programme?</DialogTitle>
            <DialogDescription>
              <strong>{deleting?.title}</strong> and its cohorts will be removed (learners stay but lose their cohort). This cannot be undone.
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
