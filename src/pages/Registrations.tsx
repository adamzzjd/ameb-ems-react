/* New Officer Registrations — the approval queue for the PSN self-service portal.
   Officers whose PSN isn't in the register submit their full details; admin+
   approve (creates the employee record) or reject with a note. Existing
   officers' self-service updates apply directly and never reach this queue. */

import { useEffect, useState, useCallback } from 'react';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../hooks/useToast';
import {
  dbListRegistrations,
  dbApproveRegistration,
  dbRejectRegistration,
} from '../supabase/registrations';
import type { EmployeeRegistration } from '../types';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const FIELD_LABELS: Record<string, string> = {
  name: 'Full Name',
  gender: 'Gender',
  grade: 'Grade',
  cadre: 'Cadre',
  date_first_appt: 'Date of First Appointment',
  date_present_appt: 'Date of Present Appointment',
  dob: 'Date of Birth',
  phone: 'Phone Number',
  lga: 'LGA of Origin',
  station: 'Present Station',
  address: 'Residential Address',
  photo: 'Photo',
  basic_salary: 'Basic Salary (₦/month)',
  step: 'Salary Step',
  remarks: 'Remarks',
};

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

const fmtVal = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return String(v);
  return v;
};

export function RegistrationsPage() {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<EmployeeRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [rejecting, setRejecting] = useState<EmployeeRegistration | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await dbListRegistrations();
    setLoading(false);
    if (error) { toast('Failed to load registrations.', true); return; }
    setRegistrations(data ?? []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const visible = registrations.filter(r => filter === 'all' || r.status === filter);
  const counts = {
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
  };

  const handleApprove = async (reg: EmployeeRegistration) => {
    setBusyId(reg.id);
    const { error } = await dbApproveRegistration(reg);
    setBusyId(null);
    if (error) { toast('Approval failed: ' + error.message, true); return; }
    toast(`✓ ${reg.full_name} registered in the register.`);
    load();
  };

  const handleReject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    const { error } = await dbRejectRegistration(rejecting.id, rejecting.psn, rejecting.full_name, rejectNote.trim() || undefined);
    setBusyId(null);
    setRejecting(null);
    setRejectNote('');
    if (error) { toast('Rejection failed: ' + error.message, true); return; }
    toast('Registration rejected.');
    load();
  };

  const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          New officers who submitted their details through the PSN portal. Approving creates their register record.
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
          Loading registrations…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
          <div className="text-[14px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>No {filter === 'all' ? '' : filter + ' '}registrations</div>
          <div className="text-[12.5px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {filter === 'pending' ? 'When a new officer submits their details on the portal, the submission appears here.' : 'Nothing in this view yet.'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(reg => (
            <div key={reg.id} className="rounded-xl border p-4"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                  style={{ background: 'var(--color-primary)' }}>
                  {(reg.full_name || '?').charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {reg.full_name || 'Unknown'}
                  </div>
                  <div className="text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                    PSN {reg.psn || '—'} · submitted {fmtDate(reg.submitted_at)}
                  </div>
                </div>
                <span className="text-[10.5px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
                  style={{
                    background: reg.status === 'pending' ? 'rgba(198,138,0,0.14)' : reg.status === 'approved' ? 'rgba(22,163,74,0.12)' : 'rgba(192,57,43,0.1)',
                    color: reg.status === 'pending' ? 'var(--color-warning)' : reg.status === 'approved' ? '#16a34a' : 'var(--color-error)',
                  }}>
                  {reg.status}
                </span>
              </div>

              {/* Submitted details */}
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                {Object.entries(reg.requested_data ?? {}).filter(([, v]) => v !== '' && v !== null && v !== undefined).map(([field, value], i) => (
                  <div key={field} className="px-3.5 py-2.5 border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      {FIELD_LABELS[field] || field}
                    </div>
                    {field === 'photo' ? (
                      value ? <img src={String(value)} alt="photo" className="w-10 h-10 rounded object-cover border" style={{ borderColor: 'var(--color-border)' }} /> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    ) : (
                      <div className="text-[12.5px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{fmtVal(value)}</div>
                    )}
                  </div>
                ))}
              </div>

              {reg.status !== 'pending' && (
                <div className="text-[11.5px] mt-2.5" style={{ color: 'var(--color-text-muted)' }}>
                  Decided {fmtDate(reg.decided_at)}{reg.decided_note ? ` · ${reg.decided_note}` : ''}
                </div>
              )}

              {reg.status === 'pending' && (
                <div className="flex gap-2 mt-3.5">
                  <button onClick={() => handleApprove(reg)} disabled={busyId === reg.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold text-white border-none cursor-pointer disabled:opacity-60"
                    style={{ background: '#16a34a' }}>
                    <CheckCircle2 size={14} /> {busyId === reg.id ? 'Creating…' : 'Approve & Register'}
                  </button>
                  <button onClick={() => { setRejecting(reg); setRejectNote(''); }}
                    disabled={busyId === reg.id}
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
        title="Reject Registration"
        subtitle={rejecting ? `${rejecting.full_name || 'Officer'} — PSN ${rejecting.psn || ''}` : ''}
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
              {busyId === rejecting?.id ? 'Rejecting…' : 'Reject Registration'}
            </button>
          </>
        }
      >
        <div className="text-[13px] mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Add a note for the officer (optional) — no register record will be created.
        </div>
        <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3}
          placeholder="e.g. Please provide a valid PSN and supporting documents."
          className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none resize-y"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
      </Modal>
    </div>
  );
}
