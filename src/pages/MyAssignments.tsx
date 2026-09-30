import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { dbLoadFormTemplates, dbLoadFormAssignments, dbLoadSubmissions, dbSaveSubmission, dbDeleteSubmission } from '../supabase/forms';
import { normalizeAnswers, validateAnswers } from '../lib/forms';
import type { FormAssignment, FormField, FormSubmission, FormTemplate } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ClipboardList, Send, Save, Plus, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Props {
  /** forms.submit — false for read-only viewers. */
  canSubmit: boolean;
}

const statusChip = (s: string) =>
  s === 'approved' ? 'bg-green-100 text-green-700'
  : s === 'submitted' ? 'bg-blue-100 text-blue-700'
  : s === 'rejected' ? 'bg-red-100 text-red-700'
  : 'bg-muted text-muted-foreground';

const statusIcon = (s: string) =>
  s === 'approved' ? <CheckCircle2 size={13} /> :
  s === 'rejected' ? <XCircle size={13} /> :
  <Clock size={13} />;

/** Field capture for enumerators — fill assigned forms and track submissions (Phase 26.7). */
export function MyAssignments({ canSubmit }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Fill-screen state
  const [filling, setFilling] = useState<{ template: FormTemplate; submission: FormSubmission | null } | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, a, s] = await Promise.all([
      dbLoadFormTemplates(), dbLoadFormAssignments(), dbLoadSubmissions(),
    ]);
    if (t.error) toast('Failed to load forms.', true);
    if (a.error) toast('Failed to load assignments.', true);
    if (s.error) toast('Failed to load your submissions.', true);
    setTemplates((t.data ?? []).filter(x => x.status === 'active'));
    setAssignments((a.data ?? []).filter(x => x.status === 'open'));
    setSubmissions(s.data ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const templateById = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates]);

  // Assignments whose template still exists and is active.
  const myAssignments = useMemo(
    () => assignments.filter(a => templateById.has(a.template_id)),
    [assignments, templateById]
  );

  const submissionsByTemplate = useMemo(() => {
    const map = new Map<string, FormSubmission[]>();
    for (const s of submissions) {
      const list = map.get(s.template_id) ?? [];
      list.push(s);
      map.set(s.template_id, list);
    }
    return map;
  }, [submissions]);

  const openFill = (template: FormTemplate, submission: FormSubmission | null) => {
    if (!canSubmit) { toast('You do not have permission to submit forms.', true); return; }
    if (submission && (submission.status === 'approved' || submission.status === 'submitted')) {
      toast('Approved and submitted forms can no longer be edited.', true);
      return;
    }
    setFilling({ template, submission });
    setAnswers({ ...(submission?.answers ?? {}) });
    setErrors({});
  };

  const handleSave = async (status: 'draft' | 'submitted') => {
    if (!filling) return;
    const fields = Array.isArray(filling.template.fields) ? filling.template.fields : [];
    const normalized = normalizeAnswers(fields, answers);
    if (status === 'submitted') {
      const errs = validateAnswers(fields, normalized);
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        toast('Please fix the highlighted questions before submitting.', true);
        return;
      }
    }
    setSaving(true);
    const { error } = await dbSaveSubmission({
      id: filling.submission?.id,
      template_id: filling.template.id,
      assignment_id: filling.submission?.assignment_id ?? null,
      answers: normalized,
      status,
    });
    setSaving(false);
    if (error) toast(error.message, true);
    else {
      toast(status === 'submitted' ? '✓ Submitted for review.' : 'Draft saved.');
      setFilling(null);
      void load();
    }
  };

  const renderField = (f: FormField) => {
    const value = answers[f.key];
    const set = (v: unknown) => {
      setAnswers(a => ({ ...a, [f.key]: v }));
      setErrors(e => { const { [f.key]: _drop, ...rest } = e; return rest; });
    };
    return (
      <div key={f.key}>
        <Label htmlFor={`q-${f.key}`}>{f.label}{f.required && <span className="text-red-600"> *</span>}</Label>
        {f.type === 'textarea' ? (
          <Textarea id={`q-${f.key}`} rows={3} value={String(value ?? '')} onChange={e => set(e.target.value)} className="mt-1" />
        ) : f.type === 'select' ? (
          <select id={`q-${f.key}`} value={String(value ?? '')} onChange={e => set(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2.5 text-sm min-h-[42px]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <option value="">— choose —</option>
            {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : f.type === 'multi' ? (
          <div className="mt-1.5 space-y-1.5">
            {(f.options ?? []).map(o => (
              <label key={o} className="flex items-center gap-2 text-[13px] py-1">
                <input type="checkbox" checked={Array.isArray(value) && (value as unknown[]).includes(o)}
                  onChange={e => {
                    const list = Array.isArray(value) ? [...(value as string[])] : [];
                    if (e.target.checked) list.push(o); else list.splice(list.indexOf(o), 1);
                    set(list);
                  }} />
                {o}
              </label>
            ))}
          </div>
        ) : f.type === 'boolean' ? (
          <label className="flex items-center gap-2 text-[13px] mt-1.5 py-1">
            <input type="checkbox" checked={value === true} onChange={e => set(e.target.checked)} />
            Yes
          </label>
        ) : (
          <Input id={`q-${f.key}`} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
            value={String(value ?? '')} onChange={e => set(e.target.value)} className="mt-1 min-h-[42px]"
            inputMode={f.type === 'number' ? 'numeric' : undefined} />
        )}
        {f.help && <p className="text-[11px] text-muted-foreground mt-0.5">{f.help}</p>}
        {errors[f.key] && <p className="text-[11px] text-red-600 font-medium mt-0.5">{errors[f.key]}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading your assignments…</p>
      ) : (
        <>
          {/* Assigned forms */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assigned forms ({myAssignments.length})</h3>
            {myAssignments.length === 0 ? (
              <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)' }}>
                <ClipboardList size={28} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No open assignments right now.</p>
              </div>
            ) : myAssignments.map(a => {
              const t = templateById.get(a.template_id)!;
              const mine = submissionsByTemplate.get(a.template_id) ?? [];
              const overdue = a.due_date && new Date(a.due_date) < new Date(new Date().toDateString());
              return (
                <div key={a.id} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-heading text-[15px] font-bold">{t.title}</h3>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {Array.isArray(t.fields) ? t.fields.length : 0} questions
                        {a.due_date ? <> · due {a.due_date}{overdue ? ' ⚠ overdue' : ''}</> : null}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => openFill(t, mine.find(s => s.status === 'draft' || s.status === 'rejected') ?? null)}>
                      <Plus size={14} className="mr-1" /> {mine.length ? 'Continue' : 'Fill'}
                    </Button>
                  </div>
                  {mine.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      {mine.map(s => (
                        <button key={s.id} type="button" onClick={() => openFill(t, s)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-muted hover:bg-accent">
                          {statusIcon(s.status)} {s.status}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* All my submissions */}
          {submissions.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <div className="px-4 py-3 border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground" style={{ borderColor: 'var(--color-border)' }}>
                My submissions ({submissions.length})
              </div>
              <table className="w-full text-[13px]">
                <tbody>
                  {submissions.map(s => (
                    <tr key={s.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-2.5 font-medium">{templateById.get(s.template_id)?.title ?? s.template_id}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusChip(s.status)}`}>
                          {statusIcon(s.status)} {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-[12px]">
                        {s.review_note ? `“${s.review_note}”` : (s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—')}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {(s.status === 'draft' || s.status === 'rejected') && canSubmit && (
                          <Button size="sm" variant="ghost" className="text-red-600"
                            onClick={async () => {
                              const { error } = await dbDeleteSubmission(s.id);
                              if (error) toast(error.message, true);
                              else { toast('Draft deleted.'); void load(); }
                            }}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Fill dialog */}
      <Dialog open={!!filling} onOpenChange={o => !o && setFilling(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{filling?.template.title}</DialogTitle>
            <DialogDescription>{filling?.template.description || 'Fill all required questions, then submit.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(Array.isArray(filling?.template.fields) ? filling.template.fields : []).map(renderField)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilling(null)}>Close</Button>
            {canSubmit && (
              <>
                <Button variant="outline" onClick={() => void handleSave('draft')} disabled={saving}>
                  <Save size={15} className="mr-1.5" /> Save Draft
                </Button>
                <Button onClick={() => void handleSave('submitted')} disabled={saving}>
                  <Send size={15} className="mr-1.5" /> {saving ? 'Sending…' : 'Submit'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
