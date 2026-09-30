import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../hooks/useToast';
import {
  dbLoadFormTemplates, dbSaveFormTemplate, dbDeleteFormTemplate,
  dbLoadFormAssignments, dbSaveFormAssignment, dbDeleteFormAssignment,
} from '../supabase/forms';
import { dbLoadCentres } from '../supabase/centres';
import { dbLoadCohorts } from '../supabase/delivery';
import { generateFieldKey } from '../lib/forms';
import type { CohortOverviewRow, Centre, FormAssignment, FormField, FormTemplate } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ClipboardList, Plus, Pencil, Trash2, Search, Send, ArrowUp, ArrowDown, Users,
} from 'lucide-react';

const FIELD_TYPES: FormField['type'][] = ['text', 'number', 'select', 'multi', 'date', 'boolean', 'textarea'];

interface Props {
  /** forms.manage — false for read-only viewers. */
  canManage: boolean;
}

const statusChip = (s: string) =>
  s === 'active' ? 'bg-green-100 text-green-700'
  : s === 'draft' ? 'bg-amber-100 text-amber-700'
  : 'bg-muted text-muted-foreground';

/** Board-side form designer + assignment panel (Phase 26.5/26.6). */
export function FormBuilder({ canManage }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [cohorts, setCohorts] = useState<CohortOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Template editor dialog state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FormTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: 'draft' });
  const [fields, setFields] = useState<FormField[]>([]);
  const [newField, setNewField] = useState({ label: '', type: 'text' as FormField['type'], options: '', required: false });

  // Assignment dialog state
  const [assigning, setAssigning] = useState<FormTemplate | null>(null);
  const [assignment, setAssignment] = useState({ centre_id: '', cohort_id: '', due_date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [t, a, c, ch] = await Promise.all([
      dbLoadFormTemplates(), dbLoadFormAssignments(), dbLoadCentres(), dbLoadCohorts(),
    ]);
    if (t.error) toast('Failed to load form templates.', true);
    if (a.error) toast('Failed to load assignments.', true);
    setTemplates(t.data ?? []);
    setAssignments(a.data ?? []);
    setCentres(c.data ?? []);
    setCohorts(ch.data ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', description: '', status: 'draft' });
    setFields([]);
    setShowForm(true);
  };

  const openEdit = (t: FormTemplate) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description ?? '', status: t.status ?? 'draft' });
    setFields(Array.isArray(t.fields) ? [...t.fields] : []);
    setShowForm(true);
  };

  const addField = () => {
    const label = newField.label.trim();
    if (!label) { toast('Enter a question label first.', true); return; }
    if (newField.type === 'select' || newField.type === 'multi') {
      const options = newField.options.split('\n').map(s => s.trim()).filter(Boolean);
      if (options.length < 2) { toast('List at least two options (one per line).', true); return; }
      setFields(fs => [...fs, { key: generateFieldKey(fs, label), label, type: newField.type, options, required: newField.required }]);
    } else {
      setFields(fs => [...fs, { key: generateFieldKey(fs, label), label, type: newField.type, required: newField.required }]);
    }
    setNewField({ label: '', type: 'text', options: '', required: false });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    setFields(fs => {
      const next = [...fs];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return fs;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const handleSaveTemplate = async () => {
    if (!form.title.trim()) { toast('Please enter a form title.', true); return; }
    if (fields.length === 0) { toast('Add at least one question.', true); return; }
    setSaving(true);
    const { error } = await dbSaveFormTemplate({
      id: editing?.id,
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      version: editing?.version ?? 1,
      fields,
      owner_org_id: editing?.owner_org_id ?? null,
    });
    setSaving(false);
    if (error) toast(error.message, true);
    else {
      toast(`✓ Form ${editing ? 'updated' : 'created'}.`);
      setShowForm(false);
      void load();
    }
  };

  const toggleStatus = async (t: FormTemplate) => {
    const next = t.status === 'active' ? 'retired' : 'active';
    const { error } = await dbSaveFormTemplate({
      id: t.id, title: t.title, description: t.description ?? '', status: next,
      version: t.version, fields: t.fields, owner_org_id: t.owner_org_id,
    });
    if (error) toast(error.message, true);
    else { toast(`Form ${next === 'active' ? 'activated' : 'retired'}.`); void load(); }
  };

  const handleDeleteTemplate = async (t: FormTemplate) => {
    if (!window.confirm(`Delete "${t.title}"? Its assignments and submissions are deleted too.`)) return;
    const { error } = await dbDeleteFormTemplate(t.id);
    if (error) toast(error.message, true);
    else { toast('Form deleted.'); void load(); }
  };

  const openAssign = (t: FormTemplate) => {
    setAssigning(t);
    setAssignment({ centre_id: '', cohort_id: '', due_date: '' });
  };

  const handleAssign = async () => {
    if (!assigning) return;
    setSaving(true);
    const { error } = await dbSaveFormAssignment({
      template_id: assigning.id,
      centre_id: assignment.centre_id || null,
      cohort_id: assignment.cohort_id || null,
      due_date: assignment.due_date || null,
      status: 'open',
      owner_org_id: assigning.owner_org_id,
    });
    setSaving(false);
    if (error) toast(error.message, true);
    else {
      toast(`✓ "${assigning.title}" assigned to all enumerators.`);
      setAssigning(null);
      void load();
    }
  };

  const templateTitle = useMemo(
    () => new Map(templates.map(t => [t.id, t.title])),
    [templates]
  );

  const filtered = templates.filter(t =>
    !search.trim() ||
    [t.title, t.description].some(v => (v ?? '').toLowerCase().includes(search.trim().toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Forms', value: templates.length, icon: <ClipboardList size={18} /> },
          { label: 'Active', value: templates.filter(t => t.status === 'active').length, icon: <Send size={18} /> },
          { label: 'Drafts', value: templates.filter(t => t.status === 'draft').length, icon: <Pencil size={18} /> },
          { label: 'Assignments', value: assignments.length, icon: <Users size={18} /> },
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
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search forms…" className="pl-9" />
        </div>
        {canManage && (
          <Button onClick={openAdd}><Plus size={16} className="mr-1.5" /> New Form</Button>
        )}
      </div>

      {/* Template cards */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading forms…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <ClipboardList size={28} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No forms yet{canManage ? ' — design the first one' : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="rounded-xl border p-5 flex flex-col" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-heading text-[15px] font-bold leading-snug">{t.title}</h3>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusChip(t.status)}`}>{t.status}</span>
              </div>
              <p className="text-[13px] text-muted-foreground line-clamp-2 mb-3">{t.description || '—'}</p>
              <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-3">
                {Array.isArray(t.fields) ? t.fields.length : 0} question{(Array.isArray(t.fields) ? t.fields.length : 0) === 1 ? '' : 's'} · v{t.version}
              </p>
              {canManage && (
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Pencil size={14} className="mr-1" /> Edit</Button>
                  {t.status !== 'retired' && (
                    <Button size="sm" variant="outline" onClick={() => openAssign(t)}><Users size={14} className="mr-1" /> Assign</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void toggleStatus(t)}>
                    {t.status === 'active' ? 'Retire' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => void handleDeleteTemplate(t)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assignments table */}
      {assignments.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground" style={{ borderColor: 'var(--color-border)' }}>
            Assignments ({assignments.length})
          </div>
          <table className="w-full text-[13px]">
            <tbody>
              {assignments.map(a => (
                <tr key={a.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-4 py-2.5 font-medium">{templateTitle.get(a.template_id) ?? a.template_id}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {a.centre_id ? `Centre: ${centres.find(c => c.id === a.centre_id)?.name ?? a.centre_id}` : 'All enumerators'}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">Due {a.due_date ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>{a.status}</span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="ghost" className="text-red-600"
                        onClick={async () => {
                          const { error } = await dbDeleteFormAssignment(a.id);
                          if (error) toast(error.message, true);
                          else { toast('Assignment removed.'); void load(); }
                        }}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Template editor dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Form' : 'New Form'}</DialogTitle>
            <DialogDescription>Questions are stored with the form; enumerators fill them in the field.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="f-title">Title</Label>
              <Input id="f-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Centre Facility Check" />
            </div>
            <div>
              <Label htmlFor="f-desc">Description</Label>
              <Textarea id="f-desc" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="f-status">Status</Label>
              <select id="f-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <option value="draft">draft — still being designed</option>
                <option value="active">active — visible to enumerators</option>
                <option value="retired">retired — closed for new submissions</option>
              </select>
            </div>

            <div>
              <Label>Questions ({fields.length})</Label>
              <div className="space-y-1.5 mt-1.5">
                {fields.map((f, i) => (
                  <div key={f.key} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="font-medium flex-1">{f.label}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">{f.type}{f.required ? ' · required' : ''}</span>
                    <button type="button" aria-label="Move up" onClick={() => moveField(i, -1)} className="text-muted-foreground hover:text-foreground"><ArrowUp size={13} /></button>
                    <button type="button" aria-label="Move down" onClick={() => moveField(i, 1)} className="text-muted-foreground hover:text-foreground"><ArrowDown size={13} /></button>
                    <button type="button" aria-label="Remove" onClick={() => setFields(fs => fs.filter(x => x.key !== f.key))} className="text-red-600"><Trash2 size={13} /></button>
                  </div>
                ))}
                {fields.length === 0 && <p className="text-[12px] text-muted-foreground">No questions yet — add the first below.</p>}
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
              <Label>Add a question</Label>
              <div className="flex gap-2">
                <Input value={newField.label} onChange={e => setNewField(nf => ({ ...nf, label: e.target.value }))} placeholder="Question label" className="flex-1" />
                <select value={newField.type} onChange={e => setNewField(nf => ({ ...nf, type: e.target.value as FormField['type'] }))}
                  className="rounded-md border px-2 text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {(newField.type === 'select' || newField.type === 'multi') && (
                <Textarea rows={2} value={newField.options} onChange={e => setNewField(nf => ({ ...nf, options: e.target.value }))}
                  placeholder="One option per line" />
              )}
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={newField.required} onChange={e => setNewField(nf => ({ ...nf, required: e.target.checked }))} />
                Required
              </label>
              <Button size="sm" variant="outline" onClick={addField}><Plus size={14} className="mr-1" /> Add Question</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => void handleSaveTemplate()} disabled={saving}>{saving ? 'Saving…' : 'Save Form'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={!!assigning} onOpenChange={o => !o && setAssigning(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign "{assigning?.title}"</DialogTitle>
            <DialogDescription>Open to every enumerator; optionally scoped to a centre or cohort with a due date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="a-centre">Centre (optional)</Label>
              <select id="a-centre" value={assignment.centre_id} onChange={e => setAssignment(a => ({ ...a, centre_id: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <option value="">— any centre —</option>
                {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="a-cohort">Cohort (optional)</Label>
              <select id="a-cohort" value={assignment.cohort_id} onChange={e => setAssignment(a => ({ ...a, cohort_id: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <option value="">— any cohort —</option>
                {cohorts.map(c => <option key={c.id} value={c.id}>{c.programme_title} · {c.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="a-due">Due date (optional)</Label>
              <Input id="a-due" type="date" value={assignment.due_date} onChange={e => setAssignment(a => ({ ...a, due_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button onClick={() => void handleAssign()} disabled={saving}>{saving ? 'Assigning…' : 'Assign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
