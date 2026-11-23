/* Restyled from scratch - Adamawa State Mass Education Board
   Employee self-service — update your register details with your PSN (no
   password). The PSN loads the officer's record; the changes are queued for an
   administrator to review and approve. Nothing is written to the register from
   this screen — see supabase/setup_selfservice.sql. */

import { useEffect, useState } from 'react';
import { lookupProfile, submitUpdate, type SelfServiceProfile } from '../supabase/selfService';
import { uploadImageToStorage } from '../supabase/storage';
import { SELF_SERVICE_FIELDS, type SelfServiceFieldDef } from '../lib/selfServiceFields';
import { useToast } from '../hooks/useToast';
import { usePageMeta } from '../hooks/usePageMeta';
import { GraduationCap, Shield, Search, ArrowLeft, CheckCircle2, Clock, X } from 'lucide-react';

interface SelfServiceProps {
  onBack: () => void;
  /** PSN entered in the site header — loaded straight away. */
  initialPsn?: string;
}

const FIELDS: readonly SelfServiceFieldDef[] = SELF_SERVICE_FIELDS;

type Step =
  | { kind: 'enter' }
  | { kind: 'edit'; emp: SelfServiceProfile }
  | { kind: 'review'; emp: SelfServiceProfile; changed: ChangedField[] }
  | { kind: 'done' }
  | { kind: 'pending'; emp: SelfServiceProfile }
  | { kind: 'already'; emp: SelfServiceProfile };

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

export function SelfService({ onBack, initialPsn }: SelfServiceProps) {
  // Staff self-service — never index it.
  usePageMeta({ title: 'Staff Self-Service', path: '/self-service', noindex: true });

  const { toast } = useToast();
  const [step, setStep] = useState<Step>({ kind: 'enter' });
  const [psn, setPsn] = useState('');
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');

  // Form state — one string per field.
  const [form, setForm] = useState<Record<string, string>>({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: string) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const fillForm = (emp: SelfServiceProfile) => {
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
      step: norm(emp.step),
      remarks: norm(emp.remarks),
    });
  };

  // PSN only: if it is in the register, the record is loaded for editing.
  const load = async (value: string) => {
    const v = value.trim();
    if (!v) { setError('Enter your staff number (PSN) to continue.'); return; }
    setPsn(v);
    setError('');
    setLooking(true);
    const res = await lookupProfile(v);
    setLooking(false);

    if (!res.ok) { setError(res.message); return; }
    if (res.pending) { setStep({ kind: 'pending', emp: res.profile }); return; }
    if (res.alreadySubmitted) { setStep({ kind: 'already', emp: res.profile }); return; }
    fillForm(res.profile);
    setStep({ kind: 'edit', emp: res.profile });
  };

  // Prefill the PSN box when the officer came from the site header or login
  // page, and load the record straight away.
  useEffect(() => {
    if (initialPsn) {
      setPsn(initialPsn);
      void load(initialPsn);
    }
  }, [initialPsn]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    void load(psn);
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

  /** Diff the form against the current record. */
  const goToReview = () => {
    if (step.kind !== 'edit') return;
    const { emp } = step;
    const changed: ChangedField[] = [];
    for (const f of FIELDS) {
      const before = norm((emp as unknown as Record<string, string | number | null>)[f.key]);
      const after = norm(form[f.key]);
      if (after !== before) {
        changed.push({ field: f.key, label: f.label, before: before || '—', after: after || '—' });
      }
    }
    // Photo is edited outside the FIELDS grid — diff it explicitly.
    const beforePhoto = norm(emp.photo);
    const afterPhoto = norm(form.photo);
    if (afterPhoto !== beforePhoto) {
      changed.push({ field: 'photo', label: 'Photo', before: beforePhoto || '—', after: afterPhoto || '—' });
    }
    if (changed.length === 0) { setError('No changes made — update a field first.'); return; }
    setError('');
    setStep({ kind: 'review', emp, changed });
  };

  /** Only the fields the officer actually changed are sent for review. */
  const buildChanges = (emp: SelfServiceProfile): Record<string, string | null> => {
    const out: Record<string, string | null> = {};
    for (const f of FIELDS) {
      const before = norm((emp as unknown as Record<string, string | number | null>)[f.key]);
      const after = norm(form[f.key]);
      if (after !== before) out[f.key] = form[f.key] ?? '';
    }
    if (norm(form.photo) !== norm(emp.photo)) out.photo = form.photo || '';
    return out;
  };

  const handleSubmit = async () => {
    if (step.kind !== 'review') return;
    setSubmitting(true);
    const res = await submitUpdate(step.emp.psn || psn, buildChanges(step.emp));
    setSubmitting(false);
    if (res.ok) { setStep({ kind: 'done' }); return; }
    setError(res.message);
  };

  const renderField = (f: SelfServiceFieldDef) => {
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
              <span className="flex-1">
                {c.before && c.before !== '—' ? (
                  <img src={c.before} alt="" className="w-10 h-10 rounded object-cover border" style={{ borderColor: 'var(--color-border)' }} />
                ) : (
                  <span className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>—</span>
                )}
              </span>
              <ArrowLeft size={12} style={{ color: 'var(--color-text-muted)' }} />
              <span className="flex-1">
                {c.after && c.after !== '—' ? (
                  <img src={c.after} alt="" className="w-10 h-10 rounded object-cover border" style={{ borderColor: 'var(--color-border)' }} />
                ) : (
                  <span className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>—</span>
                )}
              </span>
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
            <GraduationCap size={26} className="text-on-primary" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[2.5px] mb-1.5" style={{ color: 'var(--color-primary)' }}>
            Adamawa State Government
          </div>
          <h1 className="font-heading text-lg font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            Update Your Details
          </h1>
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
              Enter your staff number (PSN) to load and update your details. Your
              changes are sent to the Board Office for approval — the register is
              updated once an administrator reviews them.
            </div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Staff Number (PSN)
            </label>
            <input value={psn} onChange={e => setPsn(e.target.value)} placeholder="e.g. PS/AM/0123" autoFocus
              className="w-full h-12 px-4 rounded-lg border text-[15px] outline-none transition-colors focus:ring-2 focus:ring-ring"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
            <button type="submit" disabled={looking}
              className="w-full h-12 mt-4 rounded-lg text-[15px] font-bold text-on-primary transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--color-primary)', letterSpacing: '0.3px' }}>
              <Search size={16} /> {looking ? 'Loading…' : 'Continue'}
            </button>
          </form>
        )}

        {/* ── Step 2: edit every field on the loaded record ── */}
        {step.kind === 'edit' && (
          <div>
            <div className="mb-4 p-3.5 rounded-lg border flex items-center gap-3"
              style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
              {form.photo ? (
                <img src={form.photo} alt="" className="w-11 h-11 rounded-full object-cover border" style={{ borderColor: 'var(--color-border)' }} />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-on-primary" style={{ background: 'var(--color-primary)' }}>
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
              {FIELDS.map(f => <div key={f.key}>{renderField(f)}</div>)}
            </div>
            <div className="mt-3.5">{renderPhotoField()}</div>

            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => { setError(''); setStep({ kind: 'enter' }); }}
                className="h-11 px-4 rounded-lg text-[13px] font-semibold border cursor-pointer"
                style={{ background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Back
              </button>
              <button type="button" onClick={goToReview}
                className="flex-1 h-11 rounded-lg text-[14px] font-bold text-on-primary transition-all hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                Review Changes
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: review, then send for approval ── */}
        {step.kind === 'review' && (
          <div>
            <div className="text-[13px] font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Review your changes — {step.emp.name}</div>
            <div className="text-[12px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
              These changes will be sent to the <strong>Board Office for approval</strong>.
              Your record is updated only after an administrator reviews them.
            </div>
            {renderReviewList(step.changed)}
            <div className="text-[11.5px] mt-3 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              You can track this by contacting the Board Office. One update at a time
              is sent for review.
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" disabled={submitting} onClick={() => { setError(''); setStep({ kind: 'edit', emp: step.emp }); }}
                className="h-11 px-4 rounded-lg text-[13px] font-semibold border cursor-pointer"
                style={{ background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Back
              </button>
              <button type="button" disabled={submitting} onClick={handleSubmit}
                className="flex-1 h-11 rounded-lg text-[14px] font-bold text-on-primary transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)' }}>
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}

        {/* ── Done (queued for review) ── */}
        {step.kind === 'done' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4"><CheckCircle2 size={52} style={{ color: '#16a34a' }} /></div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Sent for approval</div>
            <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Thank you! Your changes have been sent to the Board Office. Your staff
              record will be updated once an administrator reviews and approves them.
            </p>
            <button onClick={onBack}
              className="mt-6 h-11 px-6 rounded-lg text-[14px] font-bold text-on-primary transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>Back to Website</button>
          </div>
        )}

        {/* ── Update waiting for review ── */}
        {step.kind === 'pending' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4"><Clock size={52} style={{ color: 'var(--color-warning)' }} /></div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Update awaiting approval</div>
            <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Your details update for <strong>{step.emp.name}</strong> (PSN {step.emp.psn}) is
              already waiting for the Board Office to review it. You'll be able to
              submit again only after it has been reviewed.
            </p>
            <button onClick={onBack}
              className="mt-6 h-11 px-6 rounded-lg text-[14px] font-bold text-on-primary transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>Back to Website</button>
          </div>
        )}

        {/* ── Already approved (read-only preview) ── */}
        {step.kind === 'already' && (
          <div className="py-2">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Details already updated</div>
              <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Your update has been reviewed and approved. This is what's on file:
              </p>
            </div>
            <div className="rounded-xl border overflow-hidden mb-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-warm)' }}>
                {step.emp.photo ? (
                  <img src={step.emp.photo} alt="" className="w-11 h-11 rounded-full object-cover border" style={{ borderColor: 'var(--color-border)' }} />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-on-primary" style={{ background: 'var(--color-primary)' }}>
                    {step.emp.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{step.emp.name}</div>
                  <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>PSN: {step.emp.psn}</div>
                </div>
              </div>
              <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Photo</div>
                <div className="mt-0.5">
                  {step.emp.photo ? (
                    <img src={step.emp.photo} alt="" className="w-10 h-10 rounded object-cover border" style={{ borderColor: 'var(--color-border)' }} />
                  ) : (
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>—</span>
                  )}
                </div>
              </div>
              {FIELDS.filter(f => f.key !== 'remarks').map(f => (
                <div key={f.key} className="px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{f.label}</div>
                  <div className="text-[13px] font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                    {norm((step.emp as unknown as Record<string, string | number | null>)[f.key]) || '—'}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-center leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Need another correction? Contact the HR/records unit.
            </p>
            <button onClick={onBack}
              className="w-full mt-5 h-11 rounded-lg text-[14px] font-bold text-on-primary transition-all hover:opacity-90"
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
