/* Restyled from scratch - Adamawa State Mass Education Board
   Employee self-service — update your register details with your PSN (no
   password). Existing officers: one-shot DIRECT update of all fields except
   PSN. New officers (PSN not in the register): full registration, pending
   admin approval. */

import { useState } from 'react';
import { supabase } from '../supabase/client';
import { uploadImageToStorage } from '../supabase/storage';
import { LGAs, GRADES, CADRE_NAMES, STATIONS } from '../data/constants';
import { useToast } from '../hooks/useToast';
import { GraduationCap, Shield, Search, ArrowLeft, CheckCircle2, X } from 'lucide-react';

interface SelfServiceProps {
  onBack: () => void;
}

interface LookupResult {
  id: string;
  psn: string;
  name: string;
  gender: string | null;
  grade: string | null;
  cadre: string | null;
  date_first_appt: string | null;
  date_present_appt: string | null;
  dob: string | null;
  phone: string | null;
  lga: string | null;
  station: string | null;
  address: string | null;
  photo: string | null;
  basic_salary: number | null;
  step: string | null;
  remarks: string | null;
  already_submitted: boolean;
}

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'textarea';
  options?: readonly string[];
  placeholder?: string;
}

const FIELDS: readonly FieldDef[] = [
  { key: 'name', label: 'Full Name', type: 'text', placeholder: 'e.g. Aisha Bello' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
  { key: 'grade', label: 'Grade Level', type: 'select', options: GRADES },
  { key: 'cadre', label: 'Cadre', type: 'select', options: CADRE_NAMES },
  { key: 'date_first_appt', label: 'Date of First Appointment', type: 'date' },
  { key: 'date_present_appt', label: 'Date of Present Appointment', type: 'date' },
  { key: 'dob', label: 'Date of Birth', type: 'date' },
  { key: 'phone', label: 'Phone Number', type: 'text', placeholder: 'e.g. 0803 123 4567' },
  { key: 'lga', label: 'LGA of Origin', type: 'select', options: LGAs },
  { key: 'station', label: 'Present Station', type: 'select', options: STATIONS },
  { key: 'address', label: 'Residential Address', type: 'text', placeholder: 'e.g. 15 Ahmadu Bello Way, Yola' },
  { key: 'basic_salary', label: 'Basic Salary (₦/month)', type: 'number', placeholder: 'e.g. 485200' },
  { key: 'step', label: 'Salary Step', type: 'text', placeholder: 'e.g. 1' },
  { key: 'remarks', label: 'Remarks / Notes', type: 'textarea', placeholder: 'Optional notes…' },
];

type Step =
  | { kind: 'enter' }
  | { kind: 'edit'; emp: LookupResult }
  | { kind: 'review'; emp: LookupResult; changed: ChangedField[] }
  | { kind: 'done' }
  | { kind: 'already'; emp: LookupResult }
  | { kind: 'notfound'; psn: string }
  | { kind: 'underReview'; psn: string }
  | { kind: 'regRejected'; psn: string }
  | { kind: 'register'; psn: string }
  | { kind: 'regReview'; psn: string; changed: ChangedField[] }
  | { kind: 'regSubmitted' };

interface ChangedField {
  field: string;
  label: string;
  before: string;
  after: string;
}

const norm = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
};

export function SelfService({ onBack }: SelfServiceProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>({ kind: 'enter' });
  const [psn, setPsn] = useState('');
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');

  // Form state — one string per field (basic_salary converted on submit).
  const [form, setForm] = useState<Record<string, string>>({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: string) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const fillForm = (emp: LookupResult) => {
    setForm({
      name: norm(emp.name),
      gender: norm(emp.gender),
      grade: norm(emp.grade),
      cadre: norm(emp.cadre),
      date_first_appt: norm(emp.date_first_appt),
      date_present_appt: norm(emp.date_present_appt),
      dob: norm(emp.dob),
      phone: norm(emp.phone),
      lga: norm(emp.lga),
      station: norm(emp.station),
      address: norm(emp.address),
      photo: norm(emp.photo),
      basic_salary: emp.basic_salary !== null && emp.basic_salary !== undefined ? String(emp.basic_salary) : '',
      step: norm(emp.step),
      remarks: norm(emp.remarks),
    });
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = psn.trim();
    if (!value) { setError('Enter your staff number (PSN) to continue.'); return; }
    setLooking(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('self_service_lookup', { psn: value });
    setLooking(false);
    if (rpcError) { setError(rpcError.message || 'Something went wrong. Please try again.'); return; }

    const emp = Array.isArray(data) ? data[0] : data;
    if (emp) {
      const found = emp as LookupResult;
      if (found.already_submitted) { setStep({ kind: 'already', emp: found }); return; }
      fillForm(found);
      setStep({ kind: 'edit', emp: found });
      return;
    }

    // Not in the register — check for an earlier registration.
    const { data: reg, error: regError } = await supabase.rpc('check_employee_registration', { psn: value });
    setError(regError ? regError.message : '');
    const row = Array.isArray(reg) ? reg[0] : reg;
    if (row?.status === 'pending') { setStep({ kind: 'underReview', psn: value }); return; }
    if (row?.status === 'rejected') { setStep({ kind: 'regRejected', psn: value }); return; }
    setStep({ kind: 'register', psn: value });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || photoUploading) return;
    setPhotoUploading(true);
    const { url, error: upError } = await uploadImageToStorage(file, 'employees', { maxDim: 600, quality: 0.8 });
    setPhotoUploading(false);
    if (upError || !url) { toast(upError?.message || 'Photo upload failed.', true); return; }
    set('photo')(url);
    toast('✓ Photo attached.');
  };

  /** Diff the form against the current record (existing officers). */
  const goToReview = () => {
    const emp = step.kind === 'edit' ? step.emp : null;
    if (!emp) return;
    const changed: ChangedField[] = [];
    for (const f of FIELDS) {
      const before = norm((emp as unknown as Record<string, string | number | null>)[f.key]);
      const after = norm(form[f.key]);
      if (f.key === 'basic_salary') {
        if ((Number(after) || 0) !== (Number(before) || 0)) {
          changed.push({ field: f.key, label: f.label, before: before || '—', after: after || '—' });
        }
      } else if (after !== before) {
        changed.push({ field: f.key, label: f.label, before: before || '—', after: after || '—' });
      }
    }
    if (changed.length === 0) { setError('No changes made — update a field first.'); return; }
    setError('');
    setStep({ kind: 'review', emp, changed });
  };

  /** Review screen for a new-officer registration (shows everything filled in). */
  const goToRegReview = () => {
    if (step.kind !== 'register') return;
    const changed: ChangedField[] = FIELDS
      .filter(f => norm(form[f.key]) !== '')
      .map(f => ({ field: f.key, label: f.label, before: '—', after: norm(form[f.key]) }));
    if (changed.length === 0) { setError('Fill in at least your name before submitting.'); return; }
    if (!norm(form.name)) { setError('Full name is required.'); return; }
    setError('');
    setStep({ kind: 'regReview', psn: step.psn, changed });
  };

  const buildChanges = (): Record<string, string | number | null> => {
    const out: Record<string, string | number | null> = {};
    for (const f of FIELDS) {
      if (f.key === 'basic_salary') {
        out[f.key] = form[f.key] ? Number(form[f.key]) || null : null;
      } else {
        out[f.key] = form[f.key] ?? null;
      }
    }
    return out;
  };

  const handleSubmit = async () => {
    if (step.kind !== 'review') return;
    const { emp } = step;
    setSubmitting(true);
    const { data, error: rpcError } = await supabase
      .rpc('submit_self_service_update', { employee_id: emp.id, changes: buildChanges() });
    setSubmitting(false);
    if (rpcError) { setError(rpcError.message || 'Submission failed. Please try again.'); return; }
    const res = data as { ok?: boolean; error?: string } | null;
    if (res && res.ok === false) { setError(res.error || 'Submission failed.'); return; }
    if (res && res.ok) setStep({ kind: 'done' });
    else setError('Submission failed. Please try again.');
  };

  const handleRegSubmit = async () => {
    if (step.kind !== 'regReview') return;
    setSubmitting(true);
    const { data, error: rpcError } = await supabase
      .rpc('submit_employee_registration', { psn: step.psn, changes: buildChanges() });
    setSubmitting(false);
    if (rpcError) { setError(rpcError.message || 'Submission failed. Please try again.'); return; }
    const res = data as { ok?: boolean; error?: string } | null;
    if (res && res.ok === false) { setError(res.error || 'Submission failed.'); return; }
    if (res && res.ok) setStep({ kind: 'regSubmitted' });
    else setError('Submission failed. Please try again.');
  };

  const renderField = (f: FieldDef) => {
    const base: React.CSSProperties = {
      width: '100%', height: f.type === 'textarea' ? undefined : 40, minHeight: f.type === 'textarea' ? 64 : undefined,
      padding: f.type === 'textarea' ? '9px 12px' : '0 12px', borderRadius: 8, border: '1px solid var(--color-border)',
      fontSize: 13, outline: 'none', resize: f.type === 'textarea' ? 'vertical' : 'none',
      background: 'var(--color-surface)', color: 'var(--color-text-primary)',
    };
    return (
      <div>
        <label className="text-[11.5px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          {f.label}
        </label>
        {f.type === 'select' ? (
          <select value={form[f.key] || ''} onChange={e => set(f.key)(e.target.value)} style={base}>
            <option value="">— Select —</option>
            {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : f.type === 'textarea' ? (
          <textarea value={form[f.key] || ''} onChange={e => set(f.key)(e.target.value)} rows={2} placeholder={f.placeholder} style={base} />
        ) : (
          <input type={f.type} value={form[f.key] || ''} onChange={e => set(f.key)(e.target.value)}
            placeholder={f.placeholder} style={base} />
        )}
      </div>
    );
  };

  const renderPhotoField = () => (
    <div>
      <label className="text-[11.5px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        Photo (optional)
      </label>
      <div className="flex items-center gap-3">
        {form.photo ? (
          <div className="relative">
            <img src={form.photo} alt="" className="w-12 h-12 rounded-lg object-cover border" style={{ borderColor: 'var(--color-border)' }} />
            <button type="button" onClick={() => set('photo')('')} title="Remove photo"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border flex items-center justify-center cursor-pointer"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-error)' }}>
              <X size={11} />
            </button>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg border border-dashed flex items-center justify-center text-[18px]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>📷</div>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoChange}
          className="text-[12px] flex-1" style={{ color: 'var(--color-text-secondary)' }} />
      </div>
      {photoUploading && <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>Uploading…</div>}
    </div>
  );

  const renderReviewList = (changed: ChangedField[]) => (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      {changed.map((c, i) => (
        <div key={c.field} className="px-4 py-3 border-b last:border-b-0"
          style={{ borderColor: 'var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            {c.label}
          </div>
          {c.field === 'photo' ? (
            <div className="flex items-center gap-3">
              <span className="flex-1 text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>{c.before === '—' ? '—' : 'photo'}</span>
              <ArrowLeft size={12} style={{ color: 'var(--color-text-muted)' }} />
              <span className="flex-1 text-[12.5px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{c.after === '—' ? '—' : 'photo'}</span>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="flex-1 text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
                <span className="font-semibold">Before:</span> {c.before}
              </div>
              <ArrowLeft size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <div className="flex-1 text-[12.5px]" style={{ color: 'var(--color-text-primary)' }}>
                <span className="font-semibold">After:</span> {c.after}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 flex items-start justify-center z-[999] p-4 overflow-y-auto"
      style={{ background: 'var(--color-bg)' }}>

      {/* Government header */}
      <div className="fixed top-0 left-0 right-0 z-[1000] w-full text-[11px] font-medium tracking-wide py-1.5 px-4 flex items-center justify-between border-b"
        style={{ background: 'var(--color-primary-dark)', color: 'var(--color-text-inverse)', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <Shield size={12} className="opacity-60" />
          <span>Federal Republic of Nigeria | Adamawa State Government</span>
        </div>
      </div>

      <div className="w-full max-w-[560px] rounded-2xl border p-8 md:p-10 my-12"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 8px 32px var(--color-shadow)' }}>

        {/* Branding */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--color-primary)' }}>
            <GraduationCap size={26} className="text-white" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[2.5px] mb-1.5" style={{ color: 'var(--color-primary)' }}>
            Adamawa State Government
          </div>
          <div className="font-heading text-lg font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            Update Your Details
          </div>
          <div className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>AMEB Staff Self-Service</div>
        </div>

        <a onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer transition-colors hover:text-primary mb-6"
          style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={13} /> Back to Website
        </a>

        {/* ── Step 1: PSN entry ── */}
        {step.kind === 'enter' && (
          <form onSubmit={handleLookup}>
            <div className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Enter your staff number (PSN) to view and update your details. Existing
              officers' changes apply <strong>directly</strong> (one-time); new staff
              submit their details for board-office approval.
            </div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Staff Number (PSN)
            </label>
            <input value={psn} onChange={e => setPsn(e.target.value)} placeholder="e.g. PS/AM/0123" autoFocus
              className="w-full h-12 px-4 rounded-lg border text-[15px] outline-none transition-colors focus:ring-2 focus:ring-ring"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
            <button type="submit" disabled={looking}
              className="w-full h-12 mt-4 rounded-lg text-[15px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--color-primary)', letterSpacing: '0.3px' }}>
              <Search size={16} /> {looking ? 'Looking up…' : 'Find My Details'}
            </button>
          </form>
        )}

        {/* ── Step 2: edit (existing officer, all fields) ── */}
        {step.kind === 'edit' && (
          <div>
            <div className="mb-4 p-3.5 rounded-lg border flex items-center gap-3"
              style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
              {form.photo ? (
                <img src={form.photo} alt="" className="w-11 h-11 rounded-full object-cover border" style={{ borderColor: 'var(--color-border)' }} />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--color-primary)' }}>
                  {step.emp.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{step.emp.name}</div>
                <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>PSN: {step.emp.psn} — PSN cannot be changed</div>
              </div>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Your details — update what needs changing
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {FIELDS.map(f => f.key === 'photo' ? null : <div key={f.key}>{renderField(f)}</div>)}
            </div>
            <div className="mt-3.5">{renderPhotoField()}</div>

            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setStep({ kind: 'enter' })}
                className="h-11 px-4 rounded-lg text-[13px] font-semibold border cursor-pointer"
                style={{ background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Back
              </button>
              <button type="button" onClick={goToReview}
                className="flex-1 h-11 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                Review Changes
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: review + direct submit (existing) ── */}
        {step.kind === 'review' && (
          <div>
            <div className="text-[13px] font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Review your changes — {step.emp.name}</div>
            <div className="text-[12px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
              These will be applied to the register <strong>immediately</strong> — no approval needed.
            </div>
            {renderReviewList(step.changed)}
            <div className="text-[11.5px] mt-3 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              You can only update your details once. After submitting, they take effect right away.
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" disabled={submitting} onClick={() => { setStep({ kind: 'edit', emp: step.emp }); }}
                className="h-11 px-4 rounded-lg text-[13px] font-semibold border cursor-pointer"
                style={{ background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Back
              </button>
              <button type="button" disabled={submitting} onClick={handleSubmit}
                className="flex-1 h-11 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)' }}>
                {submitting ? 'Submitting…' : 'Submit — Apply Now'}
              </button>
            </div>
          </div>
        )}

        {/* ── Done (direct update applied) ── */}
        {step.kind === 'done' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4"><CheckCircle2 size={52} style={{ color: '#16a34a' }} /></div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Your details are updated</div>
            <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Thank you! Your changes have been applied to the register. You won't be
              able to update again through this portal.
            </p>
            <button onClick={onBack}
              className="mt-6 h-11 px-6 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>Back to Website</button>
          </div>
        )}

        {/* ── Already submitted (read-only preview) ── */}
        {step.kind === 'already' && (
          <div className="py-2">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Details already updated</div>
              <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                You've already used your one-time update. This is what's on file:
              </p>
            </div>
            <div className="rounded-xl border overflow-hidden mb-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-warm)' }}>
                {step.emp.photo ? (
                  <img src={step.emp.photo} alt="" className="w-11 h-11 rounded-full object-cover border" style={{ borderColor: 'var(--color-border)' }} />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--color-primary)' }}>
                    {step.emp.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{step.emp.name}</div>
                  <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>PSN: {step.emp.psn}</div>
                </div>
              </div>
              {FIELDS.filter(f => f.key !== 'remarks').map(f => (
                <div key={f.key} className="px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{f.label}</div>
                  <div className="text-[13px] font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                    {f.key === 'photo' ? (step.emp.photo ? '✓ photo' : '—') : norm((step.emp as unknown as Record<string, string | number | null>)[f.key]) || '—'}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-center leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Need a correction? Contact the HR/records unit.
            </p>
            <button onClick={onBack}
              className="w-full mt-5 h-11 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>Back to Website</button>
          </div>
        )}

        {/* ── New officer: register form ── */}
        {(step.kind === 'register' || step.kind === 'regRejected') && (
          <div>
            {step.kind === 'regRejected' && (
              <div className="mb-4 px-3.5 py-2.5 rounded-lg text-[12.5px]"
                style={{ background: 'rgba(198,138,0,0.08)', border: '1px solid rgba(198,138,0,0.25)', color: 'var(--color-warning)' }}>
                Your earlier registration was not approved — you can try again below.
              </div>
            )}
            <div className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Your PSN <strong>{step.psn}</strong> isn't in the register yet. Fill in your
              details — they'll be submitted for <strong>board-office approval</strong> before
              you're added.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {FIELDS.map(f => f.key === 'photo' ? null : <div key={f.key}>{renderField(f)}</div>)}
            </div>
            <div className="mt-3.5">{renderPhotoField()}</div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setStep({ kind: 'enter' })}
                className="h-11 px-4 rounded-lg text-[13px] font-semibold border cursor-pointer"
                style={{ background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Back
              </button>
              <button type="button" onClick={goToRegReview}
                className="flex-1 h-11 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                Review & Submit
              </button>
            </div>
          </div>
        )}

        {/* ── New officer: review + submit for approval ── */}
        {step.kind === 'regReview' && (
          <div>
            <div className="text-[13px] font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Review your registration</div>
            <div className="text-[12px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
              These details will be submitted for board-office approval.
            </div>
            {renderReviewList(step.changed)}
            <div className="flex gap-2 mt-5">
              <button type="button" disabled={submitting} onClick={() => setStep({ kind: 'register', psn: step.psn })}
                className="h-11 px-4 rounded-lg text-[13px] font-semibold border cursor-pointer"
                style={{ background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Back
              </button>
              <button type="button" disabled={submitting} onClick={handleRegSubmit}
                className="flex-1 h-11 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)' }}>
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}

        {/* ── New officer: registration submitted ── */}
        {step.kind === 'regSubmitted' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4"><CheckCircle2 size={52} style={{ color: '#16a34a' }} /></div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Registration submitted for approval
            </div>
            <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Thank you! The board office will review your details and add you to the
              register. Once approved, you'll be able to update your details here.
            </p>
            <button onClick={onBack}
              className="mt-6 h-11 px-6 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>Back to Website</button>
          </div>
        )}

        {/* ── New officer: registration under review ── */}
        {step.kind === 'underReview' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">⏳</div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Registration under review
            </div>
            <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              A registration for PSN <strong>{step.psn}</strong> has already been submitted
              and is awaiting board-office approval. Please check back later.
            </p>
            <button onClick={onBack}
              className="mt-6 h-11 px-6 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>Back to Website</button>
          </div>
        )}

        {error && (
          <div className="mt-4 px-3.5 py-2.5 rounded-lg text-[13px]"
            style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.25)', color: 'var(--color-error)' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
