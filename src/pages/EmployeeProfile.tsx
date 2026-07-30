import { Modal } from '../components/ui/Modal';
import type { Employee } from '../types';

interface EmployeeProfileProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return '';
  const b = new Date(dob), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return `${a} yrs`;
}

function initials(name: string): string {
  return (name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function EmployeeProfile({ employee, open, onClose, onEdit, onDelete }: EmployeeProfileProps) {
  if (!employee) return null;

  const photo = employee.photo ? (
    <img src={employee.photo} alt={employee.name} style={{ width: 88, height: 100, objectFit: 'cover', borderRadius: 8, border: '3px solid #b8892a' }} />
  ) : (
    <div style={{ width: 88, height: 100, borderRadius: 8, background: '#243f6a', border: '3px solid #b8892a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff' }}>
      {initials(employee.name)}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="640px"
      footer={
        <>
          <button
            onClick={() => onEdit(employee.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: 'linear-gradient(145deg,#c9a84c,#dbb668)', color: '#0b0b14',
            }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => { onClose(); setTimeout(() => onDelete(employee.id), 200); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid #fca5a5', cursor: 'pointer',
              background: 'transparent', color: '#c0392b',
            }}
          >
            🗑 Delete
          </button>
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid #dad3c8', cursor: 'pointer', marginLeft: 'auto',
              background: 'transparent', color: '#5c5648',
            }}
          >
            ✕ Close
          </button>
        </>
      }
    >
      {/* Header with photo */}
      <div style={{
        background: 'linear-gradient(145deg,#0b0b14,#12121f)',
        padding: 22, display: 'flex', gap: 18, alignItems: 'flex-start',
        borderRadius: 8, marginBottom: 0,
      }}>
        {photo}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#c9a84c', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 5 }}>
            Adamawa State Mass Education Board
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
            {esc(employee.name)}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>
            {esc(employee.cadre || '—')}
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
            <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#c9a84c', color: '#0b0b14' }}>
              {esc(employee.psn || 'No PSN')}
            </span>
            <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,.12)', color: '#fff' }}>
              {esc(employee.grade || '—')}
            </span>
            <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.65)' }}>
              📍 {esc(employee.station || '—')}
            </span>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>
        {[
          { label: 'Date of First Appointment', value: fmtDate(employee.date_first_appt) },
          { label: 'Date of Present Appointment', value: fmtDate(employee.date_present_appt) },
          { label: 'Date of Birth', value: fmtDate(employee.dob) + (employee.dob ? ` (${calcAge(employee.dob)})` : '') },
          { label: 'Phone Number', value: employee.phone || '—' },
          { label: 'LGA of Origin', value: employee.lga || '—' },
          { label: 'Present Station', value: employee.station || '—' },
        ].map(field => (
          <div key={field.label} style={{
            padding: '10px 16px', borderBottom: '1px solid #efebe4',
            borderRight: field.label === 'Date of Present Appointment' || field.label === 'Phone Number' ? 'none' : '1px solid #efebe4',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#948d7e', textTransform: 'uppercase', letterSpacing: '.4px' }}>
              {field.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2a251c', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {field.value}
            </div>
          </div>
        ))}
      </div>

      {/* Remarks */}
      {employee.remarks && (
        <div style={{ padding: '11px 16px', background: '#fffbeb', borderTop: '1px solid #fde68a', fontSize: 12, color: '#78350f' }}>
          <strong>Remarks:</strong> {esc(employee.remarks)}
        </div>
      )}

      {/* Footer info */}
      <div style={{ padding: '9px 16px', background: '#f8f6f2', borderTop: '1px solid #efebe4', fontSize: 10, color: '#948d7e', display: 'flex', justifyContent: 'space-between' }}>
        <span>AMEB — Permanent & Pensionable Officers Register</span>
        <span>Viewed: {new Date().toLocaleDateString('en-GB')}</span>
      </div>
    </Modal>
  );
}
