/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useRef, useState, useEffect } from 'react';
import { Modal } from '../components/ui/Modal';
import { LGAs, GRADES } from '../data/constants';
import { deleteImageFromStorage, uploadImageToStorage } from '../supabase/storage';
import type { Employee } from '../types';

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Employee> & { name: string }) => Promise<boolean>;
  employee?: Employee | null;
  stations: string[];
  cadres: string[];
  /** Cadre name → default grade level (auto-fills the grade field). */
  cadreGrades?: Record<string, string>;
}

const NG_PHONE_RE = /^0\d{10}$/;
function validatePhone(phone: string): string {
  if (!phone || !phone.trim()) return '';
  return NG_PHONE_RE.test(phone.trim()) ? '' : 'Enter a valid Nigerian mobile number (e.g. 080XXXXXXXXX)';
}

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
function validatePhoto(file: File): string {
  if (!file) return '';
  if (!PHOTO_ALLOWED_TYPES.includes(file.type)) return 'Only JPEG, PNG and WebP files are allowed.';
  if (file.size > PHOTO_MAX_BYTES) return 'Photo must be smaller than 5MB.';
  return '';
}

const inputClass = "h-[42px] w-full px-3 rounded-lg border text-[13px] outline-none transition-colors focus:ring-2 focus:ring-ring";
const selectClass = "h-[42px] w-full px-3 rounded-lg border text-[13px] outline-none transition-colors focus:ring-2 focus:ring-ring appearance-none pr-8 bg-no-repeat bg-[right_9px_center]";
const labelClass = "text-[12px] font-bold";
const errorClass = "text-[11px] mt-0.5";

export function EmployeeForm({ open, onClose, onSave, employee, stations, cadres, cadreGrades = {} }: EmployeeFormProps) {
  const isEdit = !!employee;
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [grade, setGrade] = useState('');
  const [cadre, setCadre] = useState('');
  const [dateFirstAppt, setDateFirstAppt] = useState('');
  const [datePresentAppt, setDatePresentAppt] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [lga, setLga] = useState('');
  const [psn, setPsn] = useState('');
  const [station, setStation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  // Photo (if any) that was saved in the DB and got replaced/removed in the
  // form — its hosted file is only deleted AFTER a successful save, so a
  // cancel never breaks the record's existing photo.
  // NOTE: deleteImageFromStorage is currently a no-op (Cloudinary unsigned
  // presets can't delete) — this deferred-delete logic is inert but kept for
  // when a signed-delete endpoint is added.
  const [pendingPhotoDelete, setPendingPhotoDelete] = useState('');
  const originalPhotoRef = useRef('');
  // Tracks the last grade that was auto-filled from a cadre selection, so a
  // change of cadre only overwrites a still-default grade (never a manually
  // chosen one).
  const autoGradeRef = useRef('');

  // Keep the form in sync with the employee being edited — the component stays
  // mounted between opens (App.tsx renders it once), so plain useState initializers
  // would only run on first mount and leave the form blank on edit.
  useEffect(() => {
    setName(employee?.name || '');
    setGender(employee?.gender || '');
    setGrade(employee?.grade || '');
    setCadre(employee?.cadre || '');
    setDateFirstAppt(employee?.date_first_appt || '');
    setDatePresentAppt(employee?.date_present_appt || '');
    setDob(employee?.dob || '');
    setPhone(employee?.phone || '');
    setLga(employee?.lga || '');
    setPsn(employee?.psn || '');
    setStation(employee?.station || '');
    setRemarks(employee?.remarks || '');
    setPhoto(employee?.photo || '');
    setPhotoPreview(employee?.photo || '');
    setPhotoUploading(false);
    originalPhotoRef.current = employee?.photo || '';
    setPendingPhotoDelete('');
    // Only allow auto-fill for grades filled *during this session* — never
    // treat the officer's stored grade as an auto-filled default.
    autoGradeRef.current = '';
    setErrors({}); setSaving(false);
  }, [employee]);

  const resetForm = () => {
    setName(''); setGender(''); setGrade(''); setCadre(''); setDateFirstAppt(''); setDatePresentAppt('');
    setDob(''); setPhone(''); setLga(''); setPsn(''); setStation(''); setRemarks('');
    setPhoto(''); setPhotoPreview('');
    setPhotoUploading(false);
    setPendingPhotoDelete('');
    setErrors({}); setSaving(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  // Upload the photo immediately on selection — the file is stored on
  // Cloudinary and only the public URL is saved with the record (never
  // image data in the database).
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || photoUploading) return;
    const err = validatePhoto(file);
    if (err) { alert(err); return; }
    setPhotoUploading(true);
    const { url, error } = await uploadImageToStorage(file, 'employees', { maxDim: 600, quality: 0.8 });
    setPhotoUploading(false);
    if (error || !url) { alert(error?.message || 'Photo upload failed.'); return; }
    // Old photo: if it's the one saved in the DB, defer its deletion until the
    // record is saved (see handleSubmit); a never-saved upload is orphaned now.
    if (photo && photo === originalPhotoRef.current) setPendingPhotoDelete(photo);
    else if (photo) void deleteImageFromStorage(photo);
    setPhoto(url);
    setPhotoPreview(url);
  };

  const handlePhotoRemove = () => {
    if (photo && photo === originalPhotoRef.current) setPendingPhotoDelete(photo);
    else if (photo) void deleteImageFromStorage(photo);
    setPhoto('');
    setPhotoPreview('');
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!grade) newErrors.grade = 'Grade level is required';
    if (!cadre) newErrors.cadre = 'Cadre is required';
    const phoneErr = validatePhone(phone);
    if (phoneErr) newErrors.phone = phoneErr;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setSaving(true);
    const success = await onSave({
      id: employee?.id, name: name.trim(), gender: gender || null, grade, cadre,
      date_first_appt: dateFirstAppt || null, date_present_appt: datePresentAppt || null,
      dob: dob || null, phone: phone.trim(), lga, psn: psn.trim(), station,
      photo: photo || null, remarks: remarks.trim(),
    });
    setSaving(false);
    if (success) {
      if (pendingPhotoDelete) {
        void deleteImageFromStorage(pendingPhotoDelete);
        setPendingPhotoDelete('');
      }
      handleClose();
    }
  };

  const selOpts = (arr: readonly string[] | string[]) => arr.map(o => <option key={o} value={o}>{o}</option>);

  // Auto-fill the grade when a cadre is chosen (only while the grade is empty
  // or still holds a grade auto-filled earlier in this session, so a stored or
  // manually chosen grade is never silently overwritten).
  const handleCadreChange = (value: string) => {
    setCadre(value);
    const def = cadreGrades[value];
    if (def && (!grade || grade === autoGradeRef.current)) {
      setGrade(def);
      autoGradeRef.current = def;
    } else if (!def) {
      autoGradeRef.current = '';
    }
  };
  const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B8F7E' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`;

  return (
    <Modal open={open} onClose={handleClose}
      title={isEdit ? 'Edit Employee Record' : 'Add New Employee'}
      subtitle="AMEB — Permanent & Pensionable Officers Register"
      maxWidth="740px"
      footer={
        <div className="flex items-center gap-2">
          <button onClick={handleClose} className="px-4 py-2 rounded-lg text-[13px] font-semibold border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--color-primary)' }}>
            {saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Employee'}
          </button>
        </div>
      }>

      <div className="grid grid-cols-2 gap-3.5">
        {/* Photo */}
        <div className="col-span-full">
          <div className="text-[10px] font-extrabold uppercase tracking-[1.2px] pb-1 mb-2 border-b-2"
            style={{ color: 'var(--color-primary)', borderColor: 'var(--color-gold-light)' }}>
            Passport Photograph
          </div>
          <div className="flex items-center gap-4 p-3.5 rounded-xl border"
            style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
            <div className="w-[84px] h-[96px] rounded-lg border-2 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
              style={{ borderColor: 'var(--color-gold)', background: 'var(--color-primary)' }}>
              {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <span className="text-white">📷</span>}
            </div>
            <div>
              <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Upload passport photograph</div>
              <div className="text-xs mb-2.5" style={{ color: 'var(--color-text-muted)' }}>JPG, PNG or WebP · Passport size</div>
              <div className="flex items-center gap-2">
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed cursor-pointer ${photoUploading ? 'opacity-60 cursor-wait' : ''}`}
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  {photoUploading ? '⏳ Uploading…' : '📂 Choose Photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
                </label>
                {photo && (
                  <button onClick={handlePhotoRemove}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed"
                    style={{ borderColor: 'rgba(192,57,43,0.3)', color: 'var(--color-error)' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section label */}
        <div className="col-span-full">
          <div className="text-[10px] font-extrabold uppercase tracking-[1.2px] pb-1 border-b-2"
            style={{ color: 'var(--color-primary)', borderColor: 'var(--color-gold-light)' }}>
            Personal & Service Details
          </div>
        </div>

        {/* Name */}
        <div className="col-span-full flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>
            1. Full Name <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Surname Firstname Middlename"
            className={inputClass}
            style={{ background: 'var(--color-surface)', borderColor: errors.name ? 'var(--color-error)' : 'var(--color-border)', color: 'var(--color-text-primary)' }} />
          {errors.name && <div className={errorClass} style={{ color: 'var(--color-error)' }}>{errors.name}</div>}
        </div>

        {/* Gender */}
        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>Gender</label>
          <select value={gender} onChange={e => setGender(e.target.value)} className={selectClass}
            style={{ background: 'var(--color-surface)', backgroundImage: chevronSvg, borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            <option value="">— Select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Grade */}
        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>
            2. Grade Level <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select value={grade} onChange={e => setGrade(e.target.value)} className={selectClass}
            style={{ background: 'var(--color-surface)', backgroundImage: chevronSvg, borderColor: errors.grade ? 'var(--color-error)' : 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            <option value="">— Select —</option>{selOpts(GRADES)}
          </select>
          {errors.grade && <div className={errorClass} style={{ color: 'var(--color-error)' }}>{errors.grade}</div>}
        </div>

        {/* Cadre */}
        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>
            3. Cadre / Role <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select value={cadre} onChange={e => handleCadreChange(e.target.value)} className={selectClass}
            style={{ background: 'var(--color-surface)', backgroundImage: chevronSvg, borderColor: errors.cadre ? 'var(--color-error)' : 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            <option value="">— Select —</option>
            {cadres.map(c => (
              <option key={c} value={c}>{cadreGrades[c] ? `${c} — ${cadreGrades[c]}` : c}</option>
            ))}
            {/* Keep a stored cadre visible even if it's no longer in the list
                (e.g. a legacy name from before this update). */}
            {cadre && !cadres.includes(cadre) && (
              <option value={cadre}>{cadre}</option>
            )}
          </select>
          {cadre && cadreGrades[cadre] && (
            <div className={errorClass} style={{ color: 'var(--color-text-muted)' }}>
              Default grade: <strong style={{ color: 'var(--color-primary)' }}>{cadreGrades[cadre]}</strong> — adjust if needed.
            </div>
          )}
          {errors.cadre && <div className={errorClass} style={{ color: 'var(--color-error)' }}>{errors.cadre}</div>}
        </div>

        {/* Date fields */}
        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>4. Date of First Appointment</label>
          <input type="date" value={dateFirstAppt} onChange={e => setDateFirstAppt(e.target.value)}
            className={inputClass} style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>5. Date of Present Appointment</label>
          <input type="date" value={datePresentAppt} onChange={e => setDatePresentAppt(e.target.value)}
            className={inputClass} style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>6. Date of Birth</label>
          <input type="date" value={dob} onChange={e => setDob(e.target.value)}
            className={inputClass} style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>7. Phone Number</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="080XXXXXXXXX"
            className={inputClass} style={{ background: 'var(--color-surface)', borderColor: errors.phone ? 'var(--color-error)' : 'var(--color-border)', color: 'var(--color-text-primary)' }} />
          {errors.phone && <div className={errorClass} style={{ color: 'var(--color-error)' }}>{errors.phone}</div>}
        </div>

        {/* LGA */}
        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>8. LGA of Origin</label>
          <select value={lga} onChange={e => setLga(e.target.value)} className={selectClass}
            style={{ background: 'var(--color-surface)', backgroundImage: chevronSvg, borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            <option value="">— Select —</option>{selOpts(LGAs)}
          </select>
        </div>

        {/* PSN */}
        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>9. PSN (Personnel Serial No.)</label>
          <input value={psn} onChange={e => setPsn(e.target.value)} placeholder="PS/AM/XXXX"
            className={inputClass} style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>

        {/* Station */}
        <div className="flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>10. Present Station</label>
          <select value={station} onChange={e => setStation(e.target.value)} className={selectClass}
            style={{ background: 'var(--color-surface)', backgroundImage: chevronSvg, borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            <option value="">— Select —</option>{selOpts(stations)}
          </select>
        </div>

        {/* Remarks */}
        <div className="col-span-full flex flex-col gap-1">
          <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>Remarks / Notes</label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Optional notes…"
            className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none resize-y min-h-[60px] transition-colors focus:ring-2 focus:ring-ring"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>
      </div>
    </Modal>
  );
}
