import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { dbLoadFormTemplates, dbLoadSubmissions, dbReviewSubmission, dbDeleteSubmission } from '../supabase/forms';
import { dbSaveLearner } from '../supabase/delivery';
import { answersToCsvRows, csvFromRows, promoteToLearner } from '../lib/forms';
import type { FormSubmission, FormTemplate } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ClipboardList, Search, Download, Check, X, Trash2, UserPlus } from 'lucide-react';

const STATUS_FILTERS = ['all', 'submitted', 'approved', 'rejected', 'draft'] as const;

const statusChip = (s: string) =>
  s === 'approved' ? 'bg-green-100 text-green-700'
  : s === 'submitted' ? 'bg-blue-100 text-blue-700'
  : s === 'rejected' ? 'bg-red-100 text-red-700'
  : 'bg-muted text-muted-foreground';

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Board-side review queue: approve/reject, CSV export, promote to learners (Phase 26.8). */
export function SubmissionsReview({ canReview }: { canReview: boolean }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('submitted');
  const [templateFilter, setTemplateFilter] = useState('all');

  // Review dialog state
  const [reviewing, setReviewing] = useState<{ submission: FormSubmission; decision: 'approved' | 'rejected' } | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, s] = await Promise.all([dbLoadFormTemplates(), dbLoadSubmissions()]);
    if (t.error) toast('Failed to load forms.', true);
    if (s.error) toast('Failed to load submissions.', true);
    setTemplates(t.data ?? []);
    setSubmissions(s.data ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const templateById = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (templateFilter !== 'all' && s.template_id !== templateFilter) return false;
      if (!q) return true;
      const tpl = templateById.get(s.template_id);
      const answersText = Object.values(s.answers ?? {}).join(' ').toLowerCase();
      return (tpl?.title ?? '').toLowerCase().includes(q) || answersText.includes(q);
    });
  }, [submissions, statusFilter, templateFilter, search, templateById]);

  const exportCsv = () => {
    // Export per template so the header matches the form's fields.
    const byTemplate = new Map<string, FormSubmission[]>();
    for (const s of filtered) {
      const list = byTemplate.get(s.template_id) ?? [];
      list.push(s);
      byTemplate.set(s.template_id, list);
    }
    if (byTemplate.size === 0) { toast('Nothing to export.', true); return; }
    for (const [templateId, rows] of byTemplate) {
      const tpl = templateById.get(templateId);
      const fields = Array.isArray(tpl?.fields) ? tpl!.fields : [];
      const csv = csvFromRows(answersToCsvRows(fields, rows));
      downloadTextFile(`submissions-${(tpl?.title ?? templateId).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`, csv);
    }
    toast(`✓ Exported ${filtered.length} submission${filtered.length === 1 ? '' : 's'}.`);
  };

  const openReview = (submission: FormSubmission, decision: 'approved' | 'rejected') => {
    if (!canReview) { toast('You do not have permission to review submissions.', true); return; }
    setReviewing({ submission, decision });
    setNote('');
  };

  const handleReview = async () => {
    if (!reviewing) return;
    setSaving(true);
    const { error } = await dbReviewSubmission(reviewing.submission.id, reviewing.decision, note.trim() || null);
    setSaving(false);
    if (error) toast(error.message, true);
    else {
      toast(`✓ Submission ${reviewing.decision}.`);
      setReviewing(null);
      void load();
    }
  };

  const handlePromote = async (submission: FormSubmission) => {
    const tpl = templateById.get(submission.template_id);
    const fields = Array.isArray(tpl?.fields) ? tpl!.fields : [];
    const learner = promoteToLearner(fields, submission.answers ?? {});
    if (!learner) {
      toast('This form has no recognisable name question — cannot promote to the learner register.', true);
      return;
    }
    const { error } = await dbSaveLearner(learner);
    if (error) toast(error.message, true);
    else toast(`✓ ${learner.full_name} added to the learner register.`);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search answers…" className="pl-9" />
        </div>
        <select value={templateFilter} onChange={e => setTemplateFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <option value="all">All forms</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <div className="flex gap-1">
          {STATUS_FILTERS.map(s => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold capitalize ${
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}>{s}</button>
          ))}
        </div>
        <Button variant="outline" onClick={exportCsv}><Download size={15} className="mr-1.5" /> Export CSV</Button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading submissions…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <ClipboardList size={28} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No submissions match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const tpl = templateById.get(s.template_id);
            const fields = Array.isArray(tpl?.fields) ? tpl!.fields : [];
            const answerPairs = fields
              .map(f => [f.label, s.answers?.[f.key]] as const)
              .filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0) && v !== '');
            return (
              <div key={s.id} className="rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading text-[14px] font-bold">{tpl?.title ?? s.template_id}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusChip(s.status)}`}>{s.status}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : 'not submitted yet'}
                      {s.review_note ? <> · review note: “{s.review_note}”</> : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canReview && s.status === 'submitted' && (
                      <>
                        <Button size="sm" onClick={() => openReview(s, 'approved')}><Check size={14} className="mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => openReview(s, 'rejected')}>
                          <X size={14} className="mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {canReview && s.status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => void handlePromote(s)}>
                        <UserPlus size={14} className="mr-1" /> Promote to learner
                      </Button>
                    )}
                    {canReview && (s.status === 'draft' || s.status === 'rejected') && (
                      <Button size="sm" variant="ghost" className="text-red-600"
                        onClick={async () => {
                          if (!window.confirm('Delete this submission?')) return;
                          const { error } = await dbDeleteSubmission(s.id);
                          if (error) toast(error.message, true);
                          else { toast('Submission deleted.'); void load(); }
                        }}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
                {answerPairs.length > 0 && (
                  <dl className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]" style={{ borderColor: 'var(--color-border)' }}>
                    {answerPairs.map(([label, v]) => (
                      <div key={label} className="flex gap-2">
                        <dt className="text-muted-foreground shrink-0">{label}:</dt>
                        <dd className="font-medium break-words">{Array.isArray(v) ? v.join('; ') : String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={o => !o && setReviewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewing?.decision === 'approved' ? 'Approve submission' : 'Reject submission'}
            </DialogTitle>
            <DialogDescription>
              {reviewing?.decision === 'approved'
                ? 'Approved submissions count in Reports & M&E.'
                : 'The enumerator can fix and resubmit a rejected form.'}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="r-note">Note {reviewing?.decision === 'rejected' && <span className="text-red-600">*</span>}</Label>
            <Textarea id="r-note" rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder={reviewing?.decision === 'rejected' ? 'What needs fixing?' : 'Optional'} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button
              onClick={() => void handleReview()}
              disabled={saving || (reviewing?.decision === 'rejected' && !note.trim())}
              className={reviewing?.decision === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {saving ? 'Saving…' : reviewing?.decision === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
