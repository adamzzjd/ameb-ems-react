import { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import {
  dbImportLearners, type LearnerInput,
} from '../supabase/delivery';
import {
  normalizeLearnerHeaders, validateLearnerRow,
} from '../lib/learnerCsv';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Stamped on every imported row so a partner's learners land in their org. */
  ownerOrgId?: string | null;
  /** Board staff import into the Board (null); partners into their own org. */
  orgLabel?: string;
  onDone: () => void;
}

type Step = 'upload' | 'preview' | 'importing';

export function LearnerImportModal({ open, onClose, ownerOrgId, orgLabel, onDone }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [issues, setIssues] = useState<{ row: number; reason: string }[]>([]);

  if (!open) return null;

  const reset = () => {
    setStep('upload'); setRows([]); setFileName(''); setError(''); setIssues([]);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File too large — maximum 10MB.'); return; }
    setError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      Papa.parse(ev.target?.result as string, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const fields = results.meta.fields ?? [];
          // Map whatever headers they used onto our canonical names.
          const rename = normalizeLearnerHeaders(fields);
          const data = (results.data as Record<string, string>[])
            .filter(r => Object.values(r).some(v => v && v.trim()))
            .map(r => {
              const out: Record<string, string> = {};
              for (const [k, v] of Object.entries(r)) out[rename[k] ?? k] = (v ?? '').toString().trim();
              return out;
            });
          if (data.length === 0) { setError('That file has no data rows.'); return; }
          if (!data.some(r => (r['Full Name'] ?? '').trim())) {
            setError('The sheet needs a name column — "Full Name", "Name" or similar.');
            return;
          }
          setRows(data);
          setFileName(file.name);
          setStep('preview');
        },
        error: (err: { message: string }) => setError('Could not read the CSV: ' + err.message),
      });
    };
    reader.readAsText(file);
  };

  // Validate once so the preview shows exactly what will and won't import.
  const validated = (() => {
    const seen = new Set<string>();
    const bad: { row: number; reason: string }[] = [];
    rows.forEach((r, i) => {
      const msg = validateLearnerRow(r, seen);
      if (msg) bad.push({ row: i + 2, reason: msg }); // +2: header row + 1-based
    });
    return bad;
  })();

  const handleImport = async () => {
    setStep('importing');
    const seen = new Set<string>();
    const usable = rows.filter(r => validateLearnerRow(r, seen) === null).map(r => ({
      reference_no: r['Reference No'] || undefined,
      full_name: r['Full Name'],
      gender: r['Gender'] || undefined,
      age_group: r['Age Group'] || undefined,
      phone: r['Phone'] || undefined,
      lga: r['LGA'] || undefined,
      community: r['Community'] || undefined,
      notes: r['Notes'] || undefined,
      enrolled_on: r['Enrolled On'] || undefined,
    } satisfies LearnerInput));

    const { inserted, failed, error } = await dbImportLearners(usable, { ownerOrgId: ownerOrgId ?? null });
    if (error) {
      toast(`Import failed: ${error.message}`, true);
      setStep('preview');
      return;
    }
    const allIssues = [...validated, ...failed];
    setIssues(allIssues);
    toast(`✓ ${inserted} learner${inserted === 1 ? '' : 's'} imported${orgLabel ? ` to ${orgLabel}` : ''}.`, );
    onDone();
    if (allIssues.length === 0) { reset(); onClose(); } else setStep('preview');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,.45)' }}
      onClick={() => { if (step !== 'importing') { reset(); onClose(); } }}>
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <div>
            <h3 className="font-heading text-[15px] font-bold flex items-center gap-2">
              <Upload size={16} /> Import learners from CSV
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Columns recognised: Full Name, Reference No, Gender, Age Group, Phone, LGA, Community, Enrolled On, Notes
              {orgLabel && <> · these will be registered to <strong>{orgLabel}</strong></>}
            </p>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          {step === 'upload' && (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-12 cursor-pointer hover:border-emerald-500 transition-colors">
              <FileSpreadsheet size={30} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Choose a CSV file</span>
              <span className="text-xs text-gray-500">Maximum 10MB</span>
              <input type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => handleFile(e.target.files?.[0])} />
            </label>
          )}

          {step !== 'upload' && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-800">{fileName}</span>
                <span className="text-gray-500">{rows.length} row{rows.length === 1 ? '' : 's'} read</span>
              </div>

              {validated.length === 0 ? (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={15} /> Every row looks good — ready to import.
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <div className="font-semibold flex items-center gap-2 mb-1">
                    <AlertTriangle size={15} /> {validated.length} row{validated.length === 1 ? '' : 's'} will be skipped
                  </div>
                  <ul className="text-xs space-y-0.5 max-h-28 overflow-y-auto">
                    {validated.slice(0, 12).map((i, n) => (
                      <li key={n}>Row {i.row}: {i.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {issues.length > 0 && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 max-h-28 overflow-y-auto">
                  {issues.map((i, n) => <div key={n}>Row {i.row}: {i.reason}</div>)}
                </div>
              )}

              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      {['#', 'Full Name', 'Reference No', 'Gender', 'LGA', 'Community'].map(h => (
                        <th key={h} className="px-2 py-1.5 font-bold uppercase tracking-wide text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 12).map((r, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-2 py-1 text-gray-400">{i + 2}</td>
                        <td className="px-2 py-1 font-semibold">{r['Full Name'] || '—'}</td>
                        <td className="px-2 py-1">{r['Reference No'] || '—'}</td>
                        <td className="px-2 py-1">{r['Gender'] || '—'}</td>
                        <td className="px-2 py-1">{r['LGA'] || '—'}</td>
                        <td className="px-2 py-1">{r['Community'] || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 12 && (
                  <div className="px-2 py-1.5 text-[11px] text-gray-500 border-t">+ {rows.length - 12} more rows</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={() => { reset(); onClose(); }}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          {step === 'preview' && (
            <button onClick={handleImport} disabled={rows.length - validated.length === 0}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
              Import {rows.length - validated.length} learner{rows.length - validated.length === 1 ? '' : 's'}
            </button>
          )}
          {step === 'importing' && (
            <button disabled className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white opacity-60">
              Importing…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}