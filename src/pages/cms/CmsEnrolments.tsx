import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { dbLoadEnrolmentStats, dbSaveEnrolmentStat, dbDeleteEnrolmentStat } from '@/supabase/enrolments';
import type { EnrolmentStat } from '@/types';

const fmt = (n: number) => n.toLocaleString();

export function CmsEnrolments() {
  const { toast } = useToast();
  const [stats, setStats] = useState<EnrolmentStat[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EnrolmentStat | null>(null);
  const [formYear, setFormYear] = useState('');
  const [formEnrolled, setFormEnrolled] = useState('');
  const [formCertified, setFormCertified] = useState('');
  const [formDropped, setFormDropped] = useState('');
  const [formNoExam, setFormNoExam] = useState('');
  const [formNgos, setFormNgos] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDelete, setShowDelete] = useState<EnrolmentStat | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await dbLoadEnrolmentStats();
    if (data) setStats(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Totals across all years (used for the public site hero stats)
  const totals = useMemo(() => ({
    enrolled: stats.reduce((s, r) => s + (r.learners_enrolled || 0), 0),
    certified: stats.reduce((s, r) => s + (r.certified || 0), 0),
    dropped: stats.reduce((s, r) => s + (r.dropped_out || 0), 0),
    noExam: stats.reduce((s, r) => s + (r.no_exam || 0), 0),
  }), [stats]);

  const uniqueNgos = useMemo(() => {
    const set = new Set<string>();
    stats.forEach(r => (r.ngos || []).forEach(n => n.trim() && set.add(n.trim())));
    return [...set].sort();
  }, [stats]);

  const openAdd = () => {
    setEditing(null);
    setFormYear(String(new Date().getFullYear()));
    setFormEnrolled(''); setFormCertified(''); setFormDropped(''); setFormNoExam(''); setFormNgos('');
    setFormError(''); setShowForm(true);
  };

  const openEdit = (s: EnrolmentStat) => {
    setEditing(s);
    setFormYear(String(s.year));
    setFormEnrolled(String(s.learners_enrolled ?? 0));
    setFormCertified(String(s.certified ?? 0));
    setFormDropped(String(s.dropped_out ?? 0));
    setFormNoExam(String(s.no_exam ?? 0));
    setFormNgos((s.ngos || []).join('\n'));
    setFormError(''); setShowForm(true);
  };

  const handleSave = async () => {
    const year = parseInt(formYear, 10);
    if (!year) { setFormError('Enter a valid year'); return; }
    const dup = stats.find(s => s.year === year && s.id !== editing?.id);
    if (dup) { setFormError(`A record for ${year} already exists`); return; }

    const toNum = (v: string) => Math.max(0, parseInt(v, 10) || 0);
    const ngos = formNgos.split('\n').map(n => n.trim()).filter(Boolean);

    setSaving(true);
    const { data, error } = await dbSaveEnrolmentStat({
      id: editing?.id,
      year,
      learners_enrolled: toNum(formEnrolled),
      certified: toNum(formCertified),
      dropped_out: toNum(formDropped),
      no_exam: toNum(formNoExam),
      ngos,
    });
    setSaving(false);
    if (error) { toast('Save failed: ' + error.message, true); return; }
    if (data) {
      setStats(prev => {
        const rest = prev.filter(s => s.id !== data.id);
        return [...rest, data].sort((a, b) => b.year - a.year);
      });
    }
    toast(`✓ ${year} enrolment record saved.`);
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const { error } = await dbDeleteEnrolmentStat(showDelete.id);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    setStats(prev => prev.filter(s => s.id !== showDelete.id));
    toast(`Deleted ${showDelete.year} record.`);
    setShowDelete(null);
  };

  const summaryCards = [
    { label: 'Total Learners Enrolled', value: totals.enrolled, icon: '🎓', accent: true },
    { label: 'Certified', value: totals.certified, icon: '📜', accent: false },
    { label: 'Dropped Out', value: totals.dropped, icon: '🚪', accent: false },
    { label: 'Did Not Sit Exam', value: totals.noExam, icon: '📝', accent: false },
  ];

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin mx-auto mb-4" />
        Loading enrolment stats…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-navy">📈 Enrolment Statistics</h2>
          <p className="text-sm text-muted-foreground">
            Per-year learner figures shown live on the public website hero stats.
          </p>
        </div>
        <Button variant="gold" onClick={openAdd}>+ Add Year</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {summaryCards.map(c => (
          <div key={c.label} className="rounded-xl border p-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderTop: c.accent ? '3px solid var(--color-primary)' : undefined }}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{c.icon} {c.label}</div>
            <div className="font-heading text-2xl font-bold text-foreground">{fmt(c.value)}</div>
          </div>
        ))}
      </div>

      {/* NGOs involved */}
      {uniqueNgos.length > 0 && (
        <Card className="mb-5">
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">🤝 NGO Partners Involved</div>
            <div className="flex flex-wrap gap-1.5">
              {uniqueNgos.map(n => (
                <span key={n} className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                  style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  {n}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Year table */}
      <Card>
        <div className="p-3 border-b border-border">
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{stats.length}</strong> year{stats.length !== 1 ? 's' : ''} on record
          </span>
        </div>
        {stats.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-4xl mb-3">📈</div>
            <p className="font-medium text-foreground mb-1">No enrolment records yet.</p>
            <p className="text-sm">Click "+ Add Year" to enter figures for a year.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Year', 'Enrolled', 'Certified', 'Dropped Out', 'No Exam', 'NGOs', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider px-3 py-2.5 border-b whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map(s => (
                  <tr key={s.id} className="border-b hover:bg-muted/40 transition-colors" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-3 py-3 text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.year}</td>
                    <td className="px-3 py-3 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{fmt(s.learners_enrolled ?? 0)}</td>
                    <td className="px-3 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{fmt(s.certified ?? 0)}</td>
                    <td className="px-3 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{fmt(s.dropped_out ?? 0)}</td>
                    <td className="px-3 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{fmt(s.no_exam ?? 0)}</td>
                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {(s.ngos || []).length > 0 ? (
                        <span className="inline-flex flex-wrap gap-1 max-w-[220px]">
                          {(s.ngos || []).slice(0, 2).map(n => (
                            <span key={n} className="px-2 py-0.5 rounded-full border text-[10px] font-semibold"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{n}</span>
                          ))}
                          {(s.ngos || []).length > 2 && <span className="text-[10px]">+{(s.ngos || []).length - 2}</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} title="Edit">✏️</Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowDelete(s)} title="Delete" className="text-destructive hover:text-destructive">🗑</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-card border border-border rounded-xl shadow-sm w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-navy text-white px-5 py-4 rounded-t-xl flex items-center justify-between sticky top-0 z-10">
              <div className="text-sm font-bold">{editing ? `Edit ${editing.year} Record` : 'Add Enrolment Year'}</div>
              <button onClick={() => setShowForm(false)}
                className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-sm cursor-pointer border-none text-white hover:bg-white/20 transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {formError && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Year <span className="text-destructive">*</span></Label>
                  <Input type="number" value={formYear} onChange={e => setFormYear(e.target.value)} placeholder="2026" />
                </div>
                <div className="space-y-1.5">
                  <Label>Learners Enrolled</Label>
                  <Input type="number" min={0} value={formEnrolled} onChange={e => setFormEnrolled(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Certified (got certificates)</Label>
                  <Input type="number" min={0} value={formCertified} onChange={e => setFormCertified(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Dropped Out</Label>
                  <Input type="number" min={0} value={formDropped} onChange={e => setFormDropped(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Did Not Sit Exam</Label>
                  <Input type="number" min={0} value={formNoExam} onChange={e => setFormNoExam(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>NGOs Involved This Year <span className="text-muted-foreground font-normal">(one per line)</span></Label>
                <textarea value={formNgos} onChange={e => setFormNgos(e.target.value)} rows={4}
                  placeholder={'UNICEF\nSave the Children\nEducation Cannot Wait'}
                  className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none resize-y transition-colors focus:ring-2 focus:ring-ring"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button variant="gold" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : editing ? '💾 Save Changes' : '+ Add Year'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDelete(null); }}>
          <div className="bg-card border border-border rounded-xl shadow-sm w-full max-w-sm">
            <div className="bg-destructive text-white px-5 py-4 rounded-t-xl text-sm font-bold">Delete Enrolment Record</div>
            <div className="p-6 text-center">
              <div className="text-4xl mb-3">🗑</div>
              <p className="font-medium text-foreground mb-1">Delete the {showDelete.year} record permanently?</p>
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
