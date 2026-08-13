/* Update Requests — review queue for the PSN self-service portal.
   Officers submit one-shot personal-detail changes; admin+ approve
   (applies the change to the employee record) or reject with a note. */

import { useEffect, useState, useCallback } from 'react';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast';
import {
  dbListUpdateRequests,
  dbApproveUpdateRequest,
  dbRejectUpdateRequest,
} from '../supabase/updateRequests';
import type { EmployeeUpdateRequestWithEmployee } from '../types';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const FIELD_LABELS: Record<string, string> = {
  phone: 'Phone Number',
  lga: 'LGA of Origin',
  address: 'Residential Address',
  photo: 'Photo',
};

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

export function UpdateRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<EmployeeUpdateRequestWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [rejecting, setRejecting] = useState<EmployeeUpdateRequestWithEmployee | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await dbListUpdateRequests();
    setLoading(false);
    if (error) { toast('Failed to load update requests.', true); return; }
    setRequests(data ?? []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const visible = requests.filter(r => filter === 'all' || r.status === filter);
  const counts = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const handleApprove = async (req: EmployeeUpdateRequestWithEmployee) => {
    setBusyId(req.id);
    const { error } = await dbApproveUpdateRequest(req);
    setBusyId(null);
    if (error) { toast('Approval failed: ' + error.message, true); return; }
    toast(`✓ Changes applied for ${req.employees?.name ?? 'officer'}.`);
    load();
  };

  const handleReject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    const { error } = await dbRejectUpdateRequest(rejecting.id, rejecting.employee_id, rejectNote.trim() || undefined);
    setBusyId(null);
    setRejecting(null);
    setRejectNote('');
    if (error) { toast('Rejection failed: ' + error.message, true); return; }
    toast('Request rejected.');
    load();
  };

  const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const renderChanges = (req: EmployeeUpdateRequestWithEmployee) => {
    const emp = req.employees;
    const changes = req.requested_changes ?? {};
    const current = (v: string | null | undefined) => (v ?? '').trim();
    return (
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        {Object.entries(changes).map(([field, newVal], i) => {
          const oldVal = field === 'phone' ? emp?.phone : field === 'lga' ? emp?.lga : field === 'address' ? emp?.address : field === 'photo' ? emp?.photo : '';
          const label = FIELD_LABELS[field] || field;
          const before = current(oldVal) || '—';
          const after = current(newVal) || '—';
          return (
            <div key={field} className="px-3.5 py-2.5 border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {label}
              </div>
              {field === 'photo' ? (
                <div className="flex items-center gap-3">
                  {oldVal ? <img src={oldVal} alt="current" className="w-9 h-9 rounded object-cover border" style={{ borderColor: 'var(--color-border)' }} /> : <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>None</span>}
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  {newVal ? <img src={newVal} alt="new" className="w-9 h-9 rounded object-cover border" style={{ borderColor: 'var(--color-border)' }} /> : <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Removed</span>}
                </div>
              ) : (
                <div className="text-[12.5px] flex items-start gap-2.5">
                  <span className="flex-1" style={{ color: 'var(--color-text-muted)' }}>{before}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span className="flex-1 font-semibold" style={{ color: 'var(--color-text-primary)' }}>{after}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          Personal-details change requests submitted by officers through the PSN self-service portal.
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold border cursor-pointer disabled:opacity-60"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([['pending', `Pending (${counts.pending})`], ['approved', `Approved (${counts.approved})`], ['rejected', `Rejected (${counts.rejected})`], ['all', 'All']] as [Filter, string][]).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-colors"
            style={{
              background: filter === f ? 'var(--color-primary)' : 'var(--color-surface)',
              borderColor: filter === f ? 'var(--color-primary)' : 'var(--color-border)',
              color: filter === f ? '#fff' : 'var(--color-text-secondary)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <div style={{ width: 24, height: 24, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 16px' }} />
          Loading requests…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
          <div className="text-[14px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>No {filter === 'all' ? '' : filter + ' '}requests</div>
          <div className="text-[12.5px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {filter === 'pending' ? 'When an officer updates their details on the portal, the request appears here.' : 'Nothing in this view yet.'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(req => (
            <div key={req.id} className="rounded-xl border p-4"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                  style={{ background: 'var(--color-primary)' }}>
                  {(req.employees?.name || '?').charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {req.employees?.name || 'Unknown officer'}
                  </div>
                  <div className="text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                    {req.employees?.psn || '—'} · submitted {fmtDate(req.submitted_at)}
                  </div>
                </div>
                <span className="text-[10.5px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
                  style={{
                    background: req.status === 'pending' ? 'rgba(198,138,0,0.14)' : req.status === 'approved' ? 'rgba(22,163,74,0.12)' : 'rgba(192,57,43,0.1)',
                    color: req.status === 'pending' ? 'var(--color-warning)' : req.status === 'approved' ? '#16a34a' : 'var(--color-error)',
                  }}>
                  {req.status}
                </span>
              </div>

              {renderChanges(req)}

              {req.status !== 'pending' && (
                <div className="text-[11.5px] mt-2.5" style={{ color: 'var(--color-text-muted)' }}>
                  Decided {fmtDate(req.decided_at)}{req.decided_note ? ` · ${req.decided_note}` : ''}
                </div>
              )}

              {req.status === 'pending' && (
                <div className="flex gap-2 mt-3.5">
                  <button onClick={() => handleApprove(req)} disabled={busyId === req.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold text-white border-none cursor-pointer disabled:opacity-60"
                    style={{ background: '#16a34a' }}>
                    <CheckCircle2 size={14} /> {busyId === req.id ? 'Applying…' : 'Approve & Apply'}
                  </button>
                  <button onClick={() => { setRejecting(req); setRejectNote(''); }}
                    disabled={busyId === req.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold border cursor-pointer disabled:opacity-60"
                    style={{ background: 'transparent', borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject Update Request"
        subtitle={rejecting ? `${rejecting.employees?.name || 'Officer'} — ${rejecting.employees?.psn || ''}` : ''}
        maxWidth="440px"
        footer={
          <>
            <button onClick={() => setRejecting(null)}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold border cursor-pointer"
              style={{ background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleReject} disabled={busyId === rejecting?.id}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold border-none text-white cursor-pointer disabled:opacity-60"
              style={{ background: 'var(--color-error)' }}>
              {busyId === rejecting?.id ? 'Rejecting…' : 'Reject Request'}
            </button>
          </>
        }
      >
        <div className="text-[13px] mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Add a note for the officer (optional) — no changes will be applied.
        </div>
        <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3}
          placeholder="e.g. Please provide a correct phone number."
          className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none resize-y"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
      </Modal>
    </div>
  );
}
