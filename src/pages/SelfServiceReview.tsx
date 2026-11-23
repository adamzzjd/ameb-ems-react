/* Self-Service Review — the admin approval queue for officer-submitted record
   updates. Officers never write to the register directly: their changes wait
   here until an administrator approves (which applies them) or rejects them
   with a note. See supabase/setup_selfservice.sql. */

import { useCallback, useEffect, useState } from 'react';
import {
  listRequests, decideRequest,
  type ReviewStatus, type UpdateRequest,
} from '../supabase/selfService';
import { SELF_SERVICE_FIELDS } from '../lib/selfServiceFields';
import { notifyPendingUpdatesChanged } from '../hooks/usePendingSelfServiceUpdates';
import { useToast } from '../hooks/useToast';
import { CheckCircle2, XCircle, RefreshCw, Inbox } from 'lucide-react';

const TABS: { key: ReviewStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const LABELS: Record<string, string> = Object.fromEntries(
  SELF_SERVICE_FIELDS.map(f => [f.key, f.label]),
);
LABELS.photo = 'Photo';

function shown(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  return v || '—';
}

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function SelfServiceReviewPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<ReviewStatus>('pending');
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: ReviewStatus) => {
    setLoading(true);
    setError('');
    const res = await listRequests(status);
    setLoading(false);
    if (!res.ok) { setError(res.message); setRequests([]); return; }
    setRequests(res.requests);
  }, []);

  useEffect(() => { void load(tab); }, [tab, load]);

  const decide = async (req: UpdateRequest, decision: 'approve' | 'reject') => {
    setBusyId(req.id);
    const res = await decideRequest(req.id, decision, notes[req.id] || '');
    setBusyId(null);
    if (!res.ok) { toast(res.message, true); return; }
    toast(decision === 'approve'
      ? `✓ ${req.employee_name}'s update approved and applied.`
      : `✕ ${req.employee_name}'s update rejected.`);
    setRequests(prev => prev.filter(r => r.id !== req.id));
    // Keep the sidebar badge in step without waiting for its next poll.
    notifyPendingUpdatesChanged();
  };

  const diffRows = (req: UpdateRequest) => {
    const keys = Object.keys(req.changes ?? {});
    return keys.map(key => ({
      key,
      label: LABELS[key] || key,
      before: shown((req.current as unknown as Record<string, string | null>)?.[key]),
      after: shown(req.changes[key]),
    }));
  };

  const thStyle: React.CSSProperties = {
    padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.4px',
    background: 'var(--color-surface-warm)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = { padding: '9px 12px', fontSize: 13, verticalAlign: 'top' };

  return (
    <div>
      <div className="text-[13px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Changes officers submitted through the self-service portal. Nothing is written to
        the register until you approve a request here — approving applies the officer's
        changes exactly as submitted; rejecting leaves the record untouched and records
        your note.
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold border cursor-pointer"
            style={{
              background: tab === t.key ? 'var(--color-primary)' : 'var(--color-surface)',
              borderColor: tab === t.key ? 'var(--color-primary)' : 'var(--color-border)',
              color: tab === t.key ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
            }}>
            {t.label}
          </button>
        ))}
        <button onClick={() => void load(tab)} disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border cursor-pointer disabled:opacity-60"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 px-3.5 py-2.5 rounded-lg text-[13px]"
          style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.25)', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border p-10 text-center text-[13px]"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          Loading…
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border p-10 text-center"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Inbox size={26} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Nothing {tab === 'pending' ? 'waiting for review' : tab}
          </div>
          <div className="text-[12.5px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {tab === 'pending'
              ? 'Officer updates will appear here as soon as they are submitted.'
              : 'No requests with this status.'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map(req => {
            const rows = diffRows(req);
            const isPending = req.status === 'pending';
            return (
              <div key={req.id} className="rounded-xl border overflow-hidden"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-warm)' }}>
                  {req.employee_photo ? (
                    <img src={req.employee_photo} alt="" className="w-10 h-10 rounded-full object-cover border"
                      style={{ borderColor: 'var(--color-border)' }} />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-on-primary"
                      style={{ background: 'var(--color-primary)' }}>
                      {(req.employee_name || '?').charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {req.employee_name}
                    </div>
                    <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                      PSN: {req.psn} · Submitted {fmtWhen(req.submitted_at)}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: req.status === 'approved' ? 'rgba(22,163,74,0.12)'
                          : req.status === 'rejected' ? 'rgba(192,57,43,0.1)' : 'rgba(198,138,0,0.14)',
                        color: req.status === 'approved' ? '#16a34a'
                          : req.status === 'rejected' ? 'var(--color-error)' : 'var(--color-warning)',
                      }}>
                      {req.status}
                    </span>
                    {!isPending && (
                      <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        Reviewed {fmtWhen(req.reviewed_at)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Field</th>
                        <th style={thStyle}>Current</th>
                        <th style={thStyle}>Requested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td style={tdStyle} colSpan={3}>No fields in this request.</td>
                        </tr>
                      ) : rows.map((r, i) => (
                        <tr key={r.key} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.label}</td>
                          <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>{r.before}</td>
                          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isPending ? (
                  <div className="px-4 py-3 border-t flex flex-wrap items-center gap-2"
                    style={{ borderColor: 'var(--color-border)' }}>
                    <input value={notes[req.id] || ''} onChange={e => setNotes(n => ({ ...n, [req.id]: e.target.value }))}
                      placeholder="Note to keep with the decision (optional)"
                      className="h-10 px-3 rounded-lg border text-[13px] outline-none flex-1 min-w-[200px]"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                    <button onClick={() => decide(req, 'reject')} disabled={busyId === req.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold border cursor-pointer disabled:opacity-60"
                      style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)', background: 'transparent' }}>
                      <XCircle size={14} /> Reject
                    </button>
                    <button onClick={() => decide(req, 'approve')} disabled={busyId === req.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white border-none cursor-pointer disabled:opacity-60"
                      style={{ background: '#16a34a' }}>
                      <CheckCircle2 size={14} /> {busyId === req.id ? 'Saving…' : 'Approve & Apply'}
                    </button>
                  </div>
                ) : req.review_note ? (
                  <div className="px-4 py-3 border-t text-[12.5px]"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <strong>Note:</strong> {req.review_note}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
