/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useEffect, useState } from 'react';
import { Modal } from '../components/ui/Modal';
import type { Employee, EmployeeDocument } from '../types';
import { DOCUMENT_CATEGORIES } from '../types';
import { Pencil, Trash2, X, Printer, Upload, FileText, Link2 } from 'lucide-react';
import { printEmployeeProfile } from '../utils/print';
import { getRetirementInfo } from '../lib/retirement';
import { dbListDocuments, dbAddDocument, dbDeleteDocument } from '../supabase/documents';
import { uploadDocumentToStorage } from '../supabase/storage';
import { useToast } from '../hooks/useToast';

interface EmployeeProfileProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
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

function fmtDateObj(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initials(name: string): string {
  return (name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function EmployeeProfile({ employee, open, onClose, onEdit, onDelete, canEdit, canDelete }: EmployeeProfileProps) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!open || !employee) return;
    let cancelled = false;
    setLoadingDocs(true);
    dbListDocuments(employee.id).then(({ data }) => {
      if (cancelled) return;
      setDocs(data ?? []);
      setLoadingDocs(false);
    });
    return () => { cancelled = true; };
  }, [open, employee]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !docFile) { toast('Choose a file to upload.', true); return; }
    if (!docTitle.trim()) { toast('Give the document a title.', true); return; }
    setUploading(true);
    const { url, error } = await uploadDocumentToStorage(docFile);
    if (error || !url) {
      setUploading(false);
      toast(error?.message || 'Upload failed.', true);
      return;
    }
    const { data, error: dbError } = await dbAddDocument({
      employee_id: employee.id,
      title: docTitle.trim(),
      category: docCategory,
      file_name: docFile.name,
      mime_type: docFile.type || null,
      size_bytes: docFile.size,
      url,
    });
    setUploading(false);
    if (dbError || !data) { toast('Document saved but failed to record. Try again.', true); return; }
    setDocs(prev => [data, ...prev]);
    setDocTitle(''); setDocFile(null); setShowUpload(false);
    toast('✓ Document attached.');
  };

  const handleDeleteDoc = async (id: string) => {
    const { error } = await dbDeleteDocument(id);
    if (error) { toast('Failed to delete document.', true); return; }
    setDocs(prev => prev.filter(d => d.id !== id));
    toast('Document removed.');
  };

  if (!employee) return null;

  return (
    <Modal open={open} onClose={onClose} maxWidth="640px"
      footer={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => printEmployeeProfile(employee)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}>
            <Printer size={14} /> Print
          </button>
          {canEdit && (
            <button onClick={() => onEdit(employee.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: 'var(--color-primary)' }}>
              <Pencil size={14} /> Edit
            </button>
          )}
          {canDelete && (
            <button onClick={() => { onClose(); setTimeout(() => onDelete(employee.id), 200); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold border"
              style={{ borderColor: 'rgba(192,57,43,0.3)', color: 'var(--color-error)' }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
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
          { label: 'Gender', value: employee.gender || '—' },
          { label: 'Date of First Appointment', value: fmtDate(employee.date_first_appt) },
          ...(() => {
            const r = getRetirementInfo(employee);
            return [
              { label: 'Years of Service', value: r.yearsOfService !== null ? `${r.yearsOfService} yrs` : '—' },
              { label: 'Retirement Date', value: fmtDateObj(r.retirementDate) + (r.retired ? ' (retired)' : '') },
            ];
          })(),
          { label: 'Date of Present Appointment', value: fmtDate(employee.date_present_appt) },
          { label: 'Date of Birth', value: fmtDate(employee.dob) + (employee.dob ? ` (${calcAge(employee.dob)})` : '') },
          { label: 'Phone Number', value: employee.phone || '—' },
          { label: 'LGA of Origin', value: employee.lga || '—' },
          { label: 'Present Station', value: employee.station || '—' },
          { label: 'Residential Address', value: employee.address || '—' },
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

      {/* Documents vault */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            📎 Documents ({docs.length})
          </span>
          <div className="flex gap-2">
            {canEdit && !showUpload && (
              <button onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white border-none cursor-pointer"
                style={{ background: 'var(--color-primary)' }}>
                <Upload size={12} /> Attach
              </button>
            )}
          </div>
        </div>

        {showUpload && (
          <form onSubmit={handleUpload} className="mb-3 p-3 rounded-lg border" style={{ background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Title (e.g. Appointment Letter)"
                className="h-9 px-3 rounded-lg border text-[12px] outline-none"
                style={{ background: '#fff', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              <select value={docCategory} onChange={e => setDocCategory(e.target.value)}
                className="h-9 px-2 rounded-lg border text-[12px] outline-none"
                style={{ background: '#fff', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
              onChange={e => setDocFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[12px] mb-2.5" style={{ color: 'var(--color-text-secondary)' }} />
            <div className="flex gap-2">
              <button type="submit" disabled={uploading}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-white border-none cursor-pointer disabled:opacity-60"
                style={{ background: 'var(--color-primary)' }}>
                {uploading ? 'Uploading…' : 'Upload & Attach'}
              </button>
              <button type="button" onClick={() => { setShowUpload(false); setDocFile(null); setDocTitle(''); }}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: '#fff' }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {loadingDocs ? (
          <div className="text-[12px] py-2" style={{ color: 'var(--color-text-muted)' }}>Loading documents…</div>
        ) : docs.length === 0 ? (
          <div className="text-[12px] py-2" style={{ color: 'var(--color-text-muted)' }}>
            No documents attached yet.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {docs.map(d => (
              <div key={d.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border"
                style={{ background: '#fff', borderColor: 'var(--color-border)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(26,92,56,0.1)' }}>
                  <FileText size={15} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {esc(d.title)}
                  </div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {d.category} · {d.file_name}
                  </div>
                </div>
                <a href={d.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: '#fff', textDecoration: 'none' }}>
                  <Link2 size={11} /> Open
                </a>
                {canEdit && (
                  <button onClick={() => handleDeleteDoc(d.id)} title="Delete this document"
                    className="px-2 py-1 rounded-lg text-[11px] border cursor-pointer"
                    style={{ borderColor: 'rgba(192,57,43,0.3)', color: 'var(--color-error)', background: '#fff' }}>
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
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
