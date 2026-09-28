import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { dbLoadProgrammes, dbSaveProgramme, dbDeleteProgramme } from '../supabase/delivery';
import type { Programme } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { BookOpen, Plus, Pencil, Trash2, Search, Layers } from 'lucide-react';

const CATEGORIES = ['Literacy', 'Vocational', 'Youth', 'Women', 'Other'];

interface Props {
  /** programmes.manage — false for read-only viewers. */
  canManage: boolean;
}

/** Programme catalogue — the courses the board or partners deliver. */
export function ProgrammesManager({ canManage }: Props) {
  const { toast } = useToast();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Programme | null>(null);
  const [deleting, setDeleting] = useState<Programme | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Literacy', duration_weeks: '', status: 'active',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await dbLoadProgrammes();
    if (error) toast('Failed to load programmes.', true);
    else setProgrammes(data ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', description: '', category: 'Literacy', duration_weeks: '', status: 'active' });
    setShowForm(true);
  };

  const openEdit = (p: Programme) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description ?? '',
      category: p.category ?? 'Other',
      duration_weeks: p.duration_weeks != null ? String(p.duration_weeks) : '',
      status: p.status ?? 'active',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast('Please enter a programme title.', true); return; }
    setSaving(true);
    const { error } = await dbSaveProgramme({
      id: editing?.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      duration_weeks: form.duration_weeks ? Number(form.duration_weeks) : null,
      status: form.status,
      owner_org_id: editing?.owner_org_id ?? null,
    });
    setSaving(false);
    if (error) toast(error.message, true);
    else {
      toast(`✓ Programme ${editing ? 'updated' : 'created'}.`);
      setShowForm(false);
      void load();
    }
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

  const filtered = programmes.filter(p =>
    !search.trim() ||
    [p.title, p.description, p.category].some(v => (v ?? '').toLowerCase().includes(search.trim().toLowerCase()))
  );
  const activeCount = programmes.filter(p => p.status === 'active').length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Programmes', value: programmes.length, icon: <BookOpen size={18} /> },
          { label: 'Active', value: activeCount, icon: <Layers size={18} /> },
          { label: 'Paused / Closed', value: programmes.length - activeCount, icon: <BookOpen size={18} /> },
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
          {filtered.map(p => (
            <div key={p.id} className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-heading text-[15px] font-bold leading-snug">{p.title}</h3>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  p.status === 'active' ? 'bg-green-100 text-green-700' :
                  p.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                }`}>{p.status}</span>
              </div>
              {p.category && <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">{p.category}</p>}
              <p className="text-[13px] text-muted-foreground line-clamp-2 mb-3">{p.description || '—'}</p>
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
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
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
