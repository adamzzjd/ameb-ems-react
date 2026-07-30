import { useState, useCallback } from 'react';
import { Modal } from '../components/ui/Modal';
import { LGAs, GRADES } from '../data/constants';
import type { Employee } from '../types';

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Employee> & { name: string }) => Promise<boolean>;
  employee?: Employee | null;
  stations: string[];
  cadres: string[];
}

// Nigerian phone validation
const NG_PHONE_RE = /^0\d{10}$/;
function validatePhone(phone: string): string {
  if (!phone || !phone.trim()) return '';
  return NG_PHONE_RE.test(phone.trim()) ? '' : 'Enter a valid Nigerian mobile number (e.g. 080XXXXXXXXX)';
}

// Photo validation
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export function EmployeeForm({ open, onClose, onSave, employee, stations, cadres }: EmployeeFormProps) {
  const isEdit = !!employee;
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [name, setName] = useState(employee?.name || '');
  const [grade, setGrade] = useState(employee?.grade || '');
  const [cadre, setCadre] = useState(employee?.cadre || '');
  const [dateFirstAppt, setDateFirstAppt] = useState(employee?.date_first_appt || '');
  const [datePresentAppt, setDatePresentAppt] = useState(employee?.date_present_appt || '');
  const [dob, setDob] = useState(employee?.dob || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [lga, setLga] = useState(employee?.lga || '');
  const [psn, setPsn] = useState(employee?.psn || '');
  const [station, setStation] = useState(employee?.station || '');
  const [remarks, setRemarks] = useState(employee?.remarks || '');
  const [photo, setPhoto] = useState(employee?.photo || '');
  const [_photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(employee?.photo || '');

  const resetForm = useCallback(() => {
    if (!employee) {
      setName(''); setGrade(''); setCadre(''); setDateFirstAppt(''); setDatePresentAppt('');
      setDob(''); setPhone(''); setLga(''); setPsn(''); setStation(''); setRemarks('');
      setPhoto(''); setPhotoFile(null); setPhotoPreview('');
    }
    setErrors({});
    setSaving(false);
  }, [employee]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validatePhoto(file);
    if (err) { alert(err); return; }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => {
      setPhotoPreview(ev.target?.result as string);
      setPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
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
    const data: Partial<Employee> & { name: string } = {
      id: employee?.id,
      name: name.trim(),
      grade,
      cadre,
      date_first_appt: dateFirstAppt || null,
      date_present_appt: datePresentAppt || null,
      dob: dob || null,
      phone: phone.trim(),
      lga,
      psn: psn.trim(),
      station,
      photo: photo || null,
      remarks: remarks.trim(),
    };

    const success = await onSave(data);
    setSaving(false);
    if (success) {
      handleClose();
    }
  };

  const selOpts = (arr: readonly string[] | string[], _val: string) =>
    arr.map(o => (
      <option key={o} value={o}>{o}</option>
    ));

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Employee Record' : 'Add New Employee'}
      subtitle="AMEB — Permanent & Pensionable Officers Register"
      maxWidth="740px"
      footer={
        <>
          <button
            onClick={handleClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid #dad3c8', cursor: 'pointer',
              background: 'transparent', color: '#5c5648',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: '#0b0b14', color: '#fff', opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Employee'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Photo */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '4px 0', borderBottom: '2px solid #e8d5a3', marginBottom: 8 }}>
            Passport Photograph
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 14, background: '#f8f6f2', borderRadius: 8, border: '1px solid #dad3c8' }}>
            <div style={{ width: 84, height: 96, borderRadius: 6, border: '2px solid #c9a84c', background: '#0b0b14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, overflow: 'hidden' }}>
              {photoPreview ? <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff' }}>📷</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2a251c', marginBottom: 5 }}>Upload passport photograph</div>
              <div style={{ fontSize: 12, color: '#948d7e', marginBottom: 10 }}>JPG or PNG · Passport size</div>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 13px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: '1.5px dashed #c2b9aa', cursor: 'pointer', background: '#fff', color: '#5c5648',
              }}>
                📂 Choose Photo
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </label>
              {photo && (
                <button
                  onClick={() => { setPhoto(''); setPhotoPreview(''); setPhotoFile(null); }}
                  style={{ marginLeft: 8, padding: '7px 13px', borderRadius: 6, fontSize: 12, border: '1.5px dashed #fca5a5', cursor: 'pointer', background: '#fff', color: '#c0392b', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section label */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '4px 0', borderBottom: '2px solid #e8d5a3' }}>
            Personal & Service Details
          </div>
        </div>

        {/* Name */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>
            1. Full Name <span style={{ color: '#c0392b' }}>*</span>
          </label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Surname Firstname Middlename"
            style={{
              padding: '9px 11px', border: `1px solid ${errors.name ? '#c0392b' : '#dad3c8'}`,
              borderRadius: 6, fontSize: 13, color: '#2a251c', outline: 'none', width: '100%',
              background: '#fff',
            }}
            onFocus={e => { e.target.style.borderColor = '#c9a84c'; }}
            onBlur={e => { e.target.style.borderColor = errors.name ? '#c0392b' : '#dad3c8'; }}
          />
          {errors.name && <div style={{ fontSize: 11, color: '#c0392b' }}>{errors.name}</div>}
        </div>

        {/* Grade */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>
            2. Grade Level <span style={{ color: '#c0392b' }}>*</span>
          </label>
          <select
            value={grade} onChange={e => setGrade(e.target.value)}
            style={{
              padding: '9px 11px', border: `1px solid ${errors.grade ? '#c0392b' : '#dad3c8'}`,
              borderRadius: 6, fontSize: 13, color: '#2a251c', outline: 'none', width: '100%',
              appearance: 'none', paddingRight: 26, background: '#fff',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
            }}
          >
            <option value="">— Select —</option>
            {selOpts(GRADES, grade)}
          </select>
          {errors.grade && <div style={{ fontSize: 11, color: '#c0392b' }}>{errors.grade}</div>}
        </div>

        {/* Cadre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>
            3. Cadre / Role <span style={{ color: '#c0392b' }}>*</span>
          </label>
          <select
            value={cadre} onChange={e => setCadre(e.target.value)}
            style={{
              padding: '9px 11px', border: `1px solid ${errors.cadre ? '#c0392b' : '#dad3c8'}`,
              borderRadius: 6, fontSize: 13, color: '#2a251c', outline: 'none', width: '100%',
              appearance: 'none', paddingRight: 26, background: '#fff',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
            }}
          >
            <option value="">— Select —</option>
            {selOpts(cadres, cadre)}
          </select>
          {errors.cadre && <div style={{ fontSize: 11, color: '#c0392b' }}>{errors.cadre}</div>}
        </div>

        {/* Date fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>4. Date of First Appointment</label>
          <input type="date" value={dateFirstAppt} onChange={e => setDateFirstAppt(e.target.value)}
            style={{ padding: '9px 11px', border: '1px solid #dad3c8', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>5. Date of Present Appointment</label>
          <input type="date" value={datePresentAppt} onChange={e => setDatePresentAppt(e.target.value)}
            style={{ padding: '9px 11px', border: '1px solid #dad3c8', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>6. Date of Birth</label>
          <input type="date" value={dob} onChange={e => setDob(e.target.value)}
            style={{ padding: '9px 11px', border: '1px solid #dad3c8', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>7. Phone Number</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="080XXXXXXXXX"
            style={{
              padding: '9px 11px', border: `1px solid ${errors.phone ? '#c0392b' : '#dad3c8'}`,
              borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff',
            }} />
          {errors.phone && <div style={{ fontSize: 11, color: '#c0392b' }}>{errors.phone}</div>}
        </div>

        {/* LGA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>8. LGA of Origin</label>
          <select value={lga} onChange={e => setLga(e.target.value)}
            style={{
              padding: '9px 11px', border: '1px solid #dad3c8', borderRadius: 6, fontSize: 13,
              outline: 'none', width: '100%', appearance: 'none', paddingRight: 26, background: '#fff',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
            }}>
            <option value="">— Select —</option>
            {selOpts(LGAs, lga)}
          </select>
        </div>

        {/* PSN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>9. PSN (Personnel Serial No.)</label>
          <input value={psn} onChange={e => setPsn(e.target.value)} placeholder="PS/AM/XXXX"
            style={{ padding: '9px 11px', border: '1px solid #dad3c8', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff' }} />
        </div>

        {/* Station */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>10. Present Station</label>
          <select value={station} onChange={e => setStation(e.target.value)}
            style={{
              padding: '9px 11px', border: '1px solid #dad3c8', borderRadius: 6, fontSize: 13,
              outline: 'none', width: '100%', appearance: 'none', paddingRight: 26, background: '#fff',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
            }}>
            <option value="">— Select —</option>
            {selOpts(stations, station)}
          </select>
        </div>

        {/* Remarks */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5c5648' }}>Remarks / Notes</label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Optional notes…"
            style={{ padding: '9px 11px', border: '1px solid #dad3c8', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff', resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
      </div>
    </Modal>
  );
}

function validatePhoto(file: File): string {
  if (!file) return '';
  if (!PHOTO_ALLOWED_TYPES.includes(file.type)) return 'Only JPEG and PNG files are allowed.';
  if (file.size > PHOTO_MAX_BYTES) return 'Photo must be smaller than 5MB.';
  return '';
}
