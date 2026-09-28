import { useState } from 'react';
import Papa from 'papaparse';
import { Modal } from '../components/ui/Modal';
import type { Employee } from '../types';
import { buildColumnMapping, buildImportPlan, type ImportPlan } from '../lib/csv';

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (records: Partial<Employee>[]) => Promise<number>;
  existingEmployees: Employee[];
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const chip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 6, padding: '3px 8px', fontSize: 11,
  color: 'var(--color-text-secondary)',
};

export function CsvImportModal({ open, onClose, onImport, existingEmployees }: CsvImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);
  const [totalToImport, setTotalToImport] = useState(0);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setError('');
    setStep('upload');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const data = (results.data as Record<string, string>[]).filter(r =>
            Object.values(r).some(v => v && v.trim())
          );
          if (data.length === 0) {
            setError('CSV file is empty or has no data rows.');
            return;
          }
          setHeaders(results.meta.fields || []);
          setRows(data);
          // Build mapping (CSV headers → system fields)
          const m = buildColumnMapping(results.meta.fields || []);
          setMapping(m);

          // Check for name column
          const nameCol = (results.meta.fields || []).find(h => m[h] === 'name');
          if (!nameCol) {
            setError('CSV must have a Name column (e.g. "Full Name", "Name", "Staff Name").');
            return;
          }

          // Build the import plan up-front so the preview shows exactly what
          // will be imported and what will be skipped (existing PSNs untouched).
          const existingNames = new Set(existingEmployees.map(e => e.name.toLowerCase().trim()));
          const existingPsns = new Set(existingEmployees.map(e => (e.psn || '').trim().toUpperCase()));
          setPlan(buildImportPlan(data, m, existingNames, existingPsns));
          setStep('preview');
        },
        error: (err: { message: string }) => setError('Failed to parse CSV: ' + err.message),
      });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const nameCol = headers.find(h => mapping[h] === 'name');
    if (!nameCol) return;

    setStep('importing');
    setProgress(0);

    // Re-plan at import time using the latest register state, so a PSN that
    // was added between preview and import is still skipped untouched.
    const existingNames = new Set(existingEmployees.map(e => e.name.toLowerCase().trim()));
    const existingPsns = new Set(existingEmployees.map(e => (e.psn || '').trim().toUpperCase()));
    const p = buildImportPlan(rows, mapping, existingNames, existingPsns);

    if (p.records.length === 0) {
      setStep('preview');
      setPlan(p);
      setError('Nothing new to import — every row was skipped (already in the register, empty name, or PSN already on file).');
      return;
    }

    setPlan(p);
    setTotalToImport(p.records.length);
    const batchSize = 50;
    let count = 0;

    for (let i = 0; i < p.records.length; i += batchSize) {
      const batch = p.records.slice(i, i + batchSize);
      const imported = await onImport(batch);
      count += imported;
      setImported(count);
      setProgress(Math.round(((i + batch.length) / p.records.length) * 100));
    }

    // Done — close modal
    onClose();
  };

  const mappedEntries = Object.entries(mapping).filter(([, v]) => v);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="📥 Import from CSV File"
      subtitle="Upload a staff register CSV to bulk-import employees"
      maxWidth="740px"
      footer={
        step === 'preview' ? (
          <>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--color-border)', cursor: 'pointer',
                background: 'transparent', color: 'var(--color-text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: 'var(--color-primary)', color: '#fff',
              }}
            >
              📥 Import {plan?.records.length ?? 0} New Records
            </button>
          </>
        ) : (
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid var(--color-border)', cursor: 'pointer',
              background: 'transparent', color: 'var(--color-text-secondary)',
            }}
          >
            {step === 'importing' ? 'Importing…' : 'Cancel'}
          </button>
        )
      }
    >
      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.15)',
          color: 'var(--color-error)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Upload step */}
      {step === 'upload' && (
        <div
          style={{
            border: '2px dashed #c6d4cd', borderRadius: 12, padding: 32, textAlign: 'center',
            background: 'var(--color-surface-warm)', cursor: 'pointer', transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#c6d4cd'; e.currentTarget.style.background = 'var(--color-surface-warm)'; }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Choose a CSV file
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Accepted columns: Name, PSN, Grade Level, Cadre, Phone, Station, LGA, DOB, Appointment Dates, Step, Remarks<br />
            Existing PSNs are skipped untouched · grades auto-formatted to GL xx · cadres matched to the register
          </div>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            background: 'var(--color-primary)', color: '#fff',
          }}>
            📂 Browse Files
            <input type="file" accept=".csv,.tsv" onChange={handleFile} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {/* Preview step */}
      {step === 'preview' && (
        <div>
          {/* Summary */}
          <div style={{
            background: 'var(--color-surface-warm)', border: '1px solid var(--color-border)', borderRadius: 8,
            padding: '12px 16px', marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{rows.length}</strong>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}> records found</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>·</span>
                <strong style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{mappedEntries.length}</strong>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}> of {headers.length} columns mapped</span>
              </div>
            </div>
          </div>

          {/* Column mapping */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Column Mapping
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {mappedEntries.map(([csv, sys]) => (
                <span key={csv} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'var(--color-surface-warm)', border: '1px solid var(--color-border)',
                  borderRadius: 4, padding: '3px 8px', fontSize: 11,
                }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{csv}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{sys}</span>
                </span>
              ))}
              {headers.filter(h => !mapping[h]).length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)', width: '100%' }}>
                  Unmapped: {headers.filter(h => !mapping[h]).map(h => (
                    <span key={h} style={{ color: 'var(--color-error)' }}>{h} </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview table */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Preview (first 10 rows)
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0c1b33', color: '#fff' }}>
                  {headers.map(h => (
                    <th key={h} style={{ padding: '6px 8px', fontSize: 10, whiteSpace: 'nowrap', textAlign: 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                    {headers.map(h => (
                      <td key={h} style={{
                        padding: '5px 8px', fontSize: 11, maxWidth: 140,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {esc(r[h] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length > 10 && (
                  <tr>
                    <td colSpan={headers.length} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>
                      … and {rows.length - 10} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Import plan summary */}
          {plan && (() => {
            const s = plan.skipped;
            const totalSkipped = s.noName + s.nameDup + s.psnDup + s.psnDupInFile;
            return (
              <div style={{
                background: 'var(--color-surface-warm)', border: '1px solid var(--color-border)',
                borderRadius: 8, padding: 12, marginTop: 10, fontSize: 12,
              }}>
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                  📥 {plan.records.length} to import · {totalSkipped} skipped
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {s.nameDup > 0 && (
                    <span style={chip}>Name already in register: <strong>{s.nameDup}</strong></span>
                  )}
                  {s.psnDup > 0 && (
                    <span style={{ ...chip, background: '#e8f5e9', borderColor: '#86efac', color: '#166534' }}>
                      PSN already on file — <strong>{s.psnDup}</strong> skipped untouched
                    </span>
                  )}
                  {s.psnDupInFile > 0 && (
                    <span style={chip}>Duplicate PSN inside sheet: <strong>{s.psnDupInFile}</strong></span>
                  )}
                  {s.noName > 0 && (
                    <span style={chip}>Empty name: <strong>{s.noName}</strong></span>
                  )}
                </div>
                {plan.unmatchedCadres.length > 0 && (
                  <div style={{ marginTop: 8, color: 'var(--color-text-muted)' }}>
                    Cadre values not found in the register (kept as typed):{' '}
                    {plan.unmatchedCadres.slice(0, 5).join(', ')}
                    {plan.unmatchedCadres.length > 5 ? ` +${plan.unmatchedCadres.length - 5} more` : ''}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Dedup notice */}
          <div style={{
            background: '#e8f5e9', border: '1px solid #86efac', borderRadius: 8,
            padding: 10, marginTop: 10, fontSize: 12, color: '#166534',
          }}>
            <strong>✓ Safe import:</strong> Rows whose name <em>or PSN</em> already exists in the database are skipped —
            existing records are <strong>never overwritten</strong>.
          </div>
        </div>
      )}

      {/* Progress */}
      {step === 'importing' && (
        <div style={{ background: 'var(--color-surface-warm)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 8 }}>
            Importing… {imported} of {totalToImport}
          </div>
          <div style={{ height: 10, background: 'var(--color-border)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'var(--color-primary)', borderRadius: 5,
              width: `${progress}%`, transition: 'width .3s',
            }} />
          </div>
        </div>
      )}
    </Modal>
  );
}

