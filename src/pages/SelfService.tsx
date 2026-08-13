/* Restyled from scratch - Adamawa State Mass Education Board
   Employee self-service — update your personal details with your PSN (one-shot) */

import { useState } from 'react';
import { supabase } from '../supabase/client';
import { uploadImageToStorage } from '../supabase/storage';
import { LGAs } from '../data/constants';
import { useToast } from '../hooks/useToast';
import { GraduationCap, Shield, Search, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface SelfServiceProps {
  onBack: () => void;
}

interface LookupResult {
  id: string;
  name: string;
  psn: string;
  phone: string | null;
  lga: string | null;
  address: string | null;
  photo: string | null;
  already_submitted: boolean;
}

type Step =
  | { kind: 'enter' }
  | { kind: 'edit'; emp: LookupResult }
  | { kind: 'review'; emp: LookupResult; changed: ChangedField[] }
  | { kind: 'done' }
  | { kind: 'already'; emp: LookupResult }
  | { kind: 'notfound'; psn: string };

interface ChangedField {
  field: 'phone' | 'lga' | 'address' | 'photo';
  label: string;
  before: string;
  after: string;
}

const FIELD_LABELS: Record<ChangedField['field'], string> = {
  phone: 'Phone Number',
  lga: 'LGA of Origin',
  address: 'Residential Address',
  photo: 'Photo',
};

export function SelfService({ onBack }: SelfServiceProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>({ kind: 'enter' });
  const [psn, setPsn] = useState('');
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');

  // Edit state
  const [phone, setPhone] = useState('');
  const [lga, setLga] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const startEdit = (emp: LookupResult) => {
    setPhone(emp.phone || '');
    setLga(emp.lga || '');
    setAddress(emp.address || '');
    setPhoto(emp.photo);
    setError('');
    setStep({ kind: 'edit', emp });
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = psn.trim();
    if (!value) { setError('Enter your staff number (PSN) to continue.'); return; }
    setLooking(true);
    setError('');
    const { data, error: rpcError } = await supabase
      .rpc('self_service_lookup', { psn: value });
    setLooking(false);
    if (rpcError) {
      setError(rpcError.message || 'Something went wrong. Please try again.');
      return;
    }
    const emp = Array.isArray(data) ? data[0] : data;
    if (!emp) { setStep({ kind: 'notfound', psn: value }); return; }
    if (emp.already_submitted) { setStep({ kind: 'already', emp: emp as LookupResult }); return; }
    startEdit(emp as LookupResult);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || photoUploading) return;
    setPhotoUploading(true);
    const { url, error: upError } = await uploadImageToStorage(file, 'employees', { maxDim: 600, quality: 0.8 });
    setPhotoUploading(false);
    if (upError || !url) { toast(upError?.message || 'Photo upload failed.', true); return; }
    setPhoto(url);
    toast('✓ Photo attached.');
  };

  const goToReview = () => {
    const emp = step.kind === 'edit' ? step.emp : null;
    if (!emp) return;
    const changed: ChangedField[] = [];
    const current = (v: string | null) => (v ?? '').trim();

    if (current(phone) !== current(emp.phone)) {
      changed.push({ field: 'phone', label: FIELD_LABELS.phone, before: current(emp.phone), after: current(phone) });
    }
    if (current(lga) !== current(emp.lga)) {
      changed.push({ field: 'lga', label: FIELD_LABELS.lga, before: current(emp.lga), after: current(lga) });
    }
    if (current(address) !== current(emp.address)) {
      changed.push({ field: 'address', label: FIELD_LABELS.address, before: current(emp.address), after: current(address) });
    }
    if (photo !== emp.photo) {
      changed.push({ field: 'photo', label: FIELD_LABELS.photo, before: emp.photo || 'No photo', after: photo || 'No photo' });
    }

    if (changed.length === 0) { setError('No changes made — update a field first.'); return; }
    setError('');
    setStep({ kind: 'review', emp, changed });
  };

  const handleSubmit = async () => {
    if (step.kind !== 'review') return;
    const { emp, changed } = step;
    setSubmitting(true);
    const changes: Record<string, string | null> = {};
    for (const c of changed) {
      if (c.field === 'photo') changes.photo = photo;
      else if (c.field === 'phone') changes.phone = phone.trim() || null;
      else if (c.field === 'lga') changes.lga = lga || null;
      else if (c.field === 'address') changes.address = address.trim() || null;
    }
    const { data, error: rpcError } = await supabase
      .rpc('submit_self_service_update', { employee_id: emp.id, changes });
    setSubmitting(false);
    if (rpcError) { setError(rpcError.message || 'Submission failed. Please try again.'); return; }
    const res = data as { ok?: boolean; error?: string } | null;
    if (res && res.ok === false) { setError(res.error || 'Submission failed.'); return; }
    if (res && res.ok) setStep({ kind: 'done' });
    else setError('Submission failed. Please try again.');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[999] p-4 overflow-y-auto"
      style={{ background: 'var(--color-bg)' }}>

      {/* Government header */}
      <div className="fixed top-0 left-0 right-0 z-[1000] w-full text-[11px] font-medium tracking-wide py-1.5 px-4 flex items-center justify-between border-b"
        style={{ background: 'var(--color-primary-dark)', color: 'var(--color-text-inverse)', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <Shield size={12} className="opacity-60" />
          <span>Federal Republic of Nigeria | Adamawa State Government</span>
        </div>
      </div>

      <div className="w-full max-w-[460px] rounded-2xl border p-8 md:p-10 my-12"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 8px 32px var(--color-shadow)',
        }}>

        {/* Branding */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--color-primary)' }}>
            <GraduationCap size={26} className="text-white" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[2.5px] mb-1.5"
            style={{ color: 'var(--color-primary)' }}>
            Adamawa State Government
          </div>
          <div className="font-heading text-lg font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}>
            Update Your Details
          </div>
          <div className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            AMEB Staff Self-Service
          </div>
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
              Enter your staff number (PSN) to view and update your personal details.
              You can use this service <strong>once</strong> — after you submit, your
              changes go to the board office for review.
            </div>
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}>
              Staff Number (PSN)
            </label>
            <input value={psn} onChange={e => setPsn(e.target.value)}
              placeholder="e.g. PS/AM/0123" autoFocus
              className="w-full h-12 px-4 rounded-lg border text-[15px] outline-none transition-colors focus:ring-2 focus:ring-ring"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
            <button type="submit" disabled={looking}
              className="w-full h-12 mt-4 rounded-lg text-[15px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--color-primary)', letterSpacing: '0.3px' }}>
              <Search size={16} /> {looking ? 'Looking up…' : 'Find My Details'}
            </button>
          </form>
        )}

        {/* ── Step 2: edit ── */}
        {step.kind === 'edit' && (
          <div>
            <div className="mb-4 p-3.5 rounded-lg border flex items-center gap-3"
              style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
              {step.emp.photo ? (
                <img src={step.emp.photo} alt="" className="w-12 h-12 rounded-full object-cover border"
                  style={{ borderColor: 'var(--color-border)' }} />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: 'var(--color-primary)' }}>
                  {step.emp.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {step.emp.name}
                </div>
                <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  PSN: {step.emp.psn}
                </div>
              </div>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider mb-3"
              style={{ color: 'var(--color-text-muted)' }}>
              Personal details you can update
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}>Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0803 123 4567"
                  className="w-full h-11 px-4 rounded-lg border text-[14px] outline-none transition-colors focus:ring-2 focus:ring-ring"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}>LGA of Origin</label>
                <select value={lga} onChange={e => setLga(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border text-[14px] outline-none transition-colors focus:ring-2 focus:ring-ring"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                  <option value="">— Select LGA —</option>
                  {LGAs.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}>Residential Address</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                  placeholder="e.g. 15 Ahmadu Bello Way, Yola"
                  className="w-full px-4 py-2.5 rounded-lg border text-[14px] outline-none transition-colors focus:ring-2 focus:ring-ring resize-y min-h-[60px]"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}>Photo (optional)</label>
                <div className="flex items-center gap-3">
                  {photo && (
                    <img src={photo} alt="" className="w-12 h-12 rounded-lg object-cover border"
                      style={{ borderColor: 'var(--color-border)' }} />
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handlePhotoChange}
                    className="text-[12px] flex-1" style={{ color: 'var(--color-text-secondary)' }} />
                </div>
                {photoUploading && <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>Uploading…</div>}
              </div>
            </div>

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

        {/* ── Step 3: review ── */}
        {step.kind === 'review' && (
          <div>
            <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              Review your changes — {step.emp.name}
            </div>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              {step.changed.map((c, i) => (
                <div key={c.field}
                  className="px-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: 'var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {c.label}
                  </div>
                  {c.field === 'photo' ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-[13px] text-[var(--color-text-muted)] truncate" title={c.before}>Before: {c.before === 'No photo' ? 'No photo' : 'photo'}</div>
                      <ArrowLeft size={12} style={{ color: 'var(--color-text-muted)' }} />
                      <div className="flex-1 text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }} title={c.after}>After: {c.after === 'No photo' ? 'No photo' : 'photo'}</div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                        <span className="font-semibold">Before:</span> {c.before || '—'}
                      </div>
                      <ArrowLeft size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                      <div className="flex-1 text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
                        <span className="font-semibold">After:</span> {c.after || '—'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-[11.5px] mt-3 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Once submitted, these changes go to the board office for approval and
              you will not be able to update again.
            </div>

            <div className="flex gap-2 mt-5">
              <button type="button" disabled={submitting}
                onClick={() => step.kind === 'review' && startEdit(step.emp)}
                className="h-11 px-4 rounded-lg text-[13px] font-semibold border cursor-pointer"
                style={{ background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Back
              </button>
              <button type="button" disabled={submitting}
                onClick={handleSubmit}
                className="flex-1 h-11 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)' }}>
                {submitting ? 'Submitting…' : 'Submit for Review'}
              </button>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {step.kind === 'done' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4"><CheckCircle2 size={52} style={{ color: 'var(--color-success, #16a34a)' }} /></div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Details submitted for review
            </div>
            <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Thank you! Your changes have been forwarded to the board office and will
              take effect once approved. You won't be able to update your details
              again through this portal.
            </p>
            <button onClick={onBack}
              className="mt-6 h-11 px-6 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              Back to Website
            </button>
          </div>
        )}

        {/* ── Already submitted (with read-only preview of stored details) ── */}
        {step.kind === 'already' && (
          <div className="py-2">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Details already submitted
              </div>
              <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Your details were already sent to the board office for review.
                This is what we currently have on file:
              </p>
            </div>

            <div className="rounded-xl border overflow-hidden mb-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-warm)' }}>
                {step.emp.photo ? (
                  <img src={step.emp.photo} alt="" className="w-11 h-11 rounded-full object-cover border"
                    style={{ borderColor: 'var(--color-border)' }} />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: 'var(--color-primary)' }}>
                    {step.emp.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {step.emp.name}
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    PSN: {step.emp.psn}
                  </div>
                </div>
              </div>
              {[
                ['Phone Number', step.emp.phone || '—'],
                ['LGA of Origin', step.emp.lga || '—'],
                ['Residential Address', step.emp.address || '—'],
              ].map(([label, value]) => (
                <div key={label} className="px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    {label}
                  </div>
                  <div className="text-[13px] font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[12px] text-center leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Need a correction? Contact the HR/records unit.
            </p>
            <button onClick={onBack}
              className="w-full mt-5 h-11 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              Back to Website
            </button>
          </div>
        )}

        {/* ── PSN not found ── */}
        {step.kind === 'notfound' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🔎</div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              No record found
            </div>
            <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              We couldn't find a record for <strong>{step.psn}</strong>. Please check
              the number and try again — or contact the HR/records unit if you believe
              this is an error.
            </p>
            <button onClick={() => setStep({ kind: 'enter' })}
              className="mt-6 h-11 px-6 rounded-lg text-[14px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              Try Again
            </button>
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
