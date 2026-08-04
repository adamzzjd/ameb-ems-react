/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { Modal } from '../components/ui/Modal';
import type { Employee } from '../types';
import { Pencil, Trash2, X } from 'lucide-react';

interface EmployeeProfileProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function esc(s: string | null | undefined): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  return (
    <Modal open={open} onClose={onClose} maxWidth="640px"
      footer={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => onEdit(employee.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}>
            <Pencil size={14} /> Edit
          </button>
          <button onClick={() => { onClose(); setTimeout(() => onDelete(employee.id), 200); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold border"
            style={{ borderColor: 'rgba(192,57,43,0.3)', color: 'var(--color-error)' }}>
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold border ml-auto"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <X size={14} /> Close
          </button>
        </div>
      }>

      {/* Header with photo */}
      <div className="flex gap-4 items-start p-5 rounded-xl mb-0"
        style={{ background: 'var(--color-primary)' }}>
        {/* Photo */}
        <div className="w-[88px] h-[100px] rounded-lg flex-shrink-0 flex items-center justify-center text-[28px] font-bold text-white overflow-hidden border-2"
          style={{ borderColor: 'var(--color-gold)' }}>
          {employee.photo ? (
            <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
          ) : (
            initials(employee.name)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-[1.5px] mb-1"
            style={{ color: 'var(--color-gold)' }}>
            Adamawa State Mass Education Board
          </div>
          <div className="font-heading text-xl font-bold text-white leading-tight">
            {esc(employee.name)}
          </div>
          <div className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {esc(employee.cadre || '—')}
          </div>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-white">
              {esc(employee.psn || 'No PSN')}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gold/20 text-gold">
              {esc(employee.grade || '—')}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-white/65">
              📍 {esc(employee.station || '—')}
            </span>
          </div>
        </div>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2">
        {[
          { label: 'Date of First Appointment', value: fmtDate(employee.date_first_appt) },
          { label: 'Date of Present Appointment', value: fmtDate(employee.date_present_appt) },
          { label: 'Date of Birth', value: fmtDate(employee.dob) + (employee.dob ? ` (${calcAge(employee.dob)})` : '') },
          { label: 'Phone Number', value: employee.phone || '—' },
          { label: 'LGA of Origin', value: employee.lga || '—' },
          { label: 'Present Station', value: employee.station || '—' },
        ].map(field => (
          <div key={field.label} className="px-4 py-2.5 border-b"
            style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}>
              {field.label}
            </div>
            <div className="text-[13px] font-semibold mt-0.5"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-text-primary)' }}>
              {field.value}
            </div>
          </div>
        ))}
      </div>

      {/* Remarks */}
      {employee.remarks && (
        <div className="px-4 py-2.5 text-xs border-t"
          style={{ background: 'rgba(198,138,0,0.06)', borderColor: 'rgba(198,138,0,0.2)', color: '#78350f' }}>
          <strong>Remarks:</strong> {esc(employee.remarks)}
        </div>
      )}

      {/* Footer info */}
      <div className="flex justify-between items-center px-4 py-2 text-[10px] border-t"
        style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
        <span>AMEB — Permanent & Pensionable Officers Register</span>
        <span>Viewed: {new Date().toLocaleDateString('en-GB')}</span>
      </div>
    </Modal>
  );
}
