import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../hooks/useToast';
import type { Employee } from '../types';
import { buildPayrollRows, buildIppsCsv, fmtNaira, monthLabel, type PayrollRow } from '../lib/payroll';
import { dbListPayrollRuns, dbPublishPayroll, dbLoadRunLines, type PayrollRun, type PayrollLine } from '../supabase/payroll';
import { printPayrollSheet } from '../utils/print';

interface PayrollProps {
  employees: Employee[];
}

function esc(s: string | null | undefined): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PayrollPage({ employees }: PayrollProps) {
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [publishing, setPublishing] = useState(false);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [viewingRun, setViewingRun] = useState<PayrollRun | null>(null);
  const [runLines, setRunLines] = useState<PayrollLine[]>([]);
  const [loadingRun, setLoadingRun] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dbListPayrollRuns().then(({ data }) => { if (!cancelled) setRuns(data ?? []); });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => buildPayrollRows(employees), [employees]);

  const totals = useMemo(() => ({
    withSalary: rows.filter(r => r.basicSalary > 0).length,
    totalBasic: rows.reduce((s, r) => s + r.basicSalary, 0),
    totalGross: rows.reduce((s, r) => s + r.gross, 0),
  }), [rows]);

  const label = monthLabel(month, year);
  const alreadyPublished = runs.some(r => r.month === month && r.year === year);

  const handleExport = () => {
    downloadCsv(buildIppsCsv(rows, month, year), `AMEB_Payroll_${year}-${String(month).padStart(2, '0')}.csv`);
    toast('💾 Payroll CSV exported.');
  };

  const handlePrint = () => printPayrollSheet(rows, `Monthly Payroll — ${label}`);

  const handlePublish = async () => {
    if (rows.length === 0) { toast('Add employees before publishing a payroll.', true); return; }
    setPublishing(true);
    const { data, error } = await dbPublishPayroll(month, year, rows);
    setPublishing(false);
    if (error || !data) { toast('Failed to publish payroll.', true); return; }
    setRuns(prev => [data, ...prev.filter(r => !(r.month === month && r.year === year))]);
    toast(`✓ ${label} payroll published (${data.count} officers).`);
  };

  const openRun = async (run: PayrollRun) => {
    setViewingRun(run);
    setLoadingRun(true);
    const { data } = await dbLoadRunLines(run.id);
    setRunLines(data ?? []);
    setLoadingRun(false);
  };

  const exportRun = (run: PayrollRun, lines: PayrollLine[]) => {
    const csvRows: PayrollRow[] = lines.map(l => ({
      employeeId: l.employee_id, name: l.name, psn: l.psn, grade: l.grade, step: l.step,
      station: null, lga: null, basicSalary: l.basic_salary, allowance: l.allowance, gross: l.gross,
    }));
    downloadCsv(buildIppsCsv(csvRows, run.month, run.year), `AMEB_Payroll_${run.year}-${String(run.month).padStart(2, '0')}_published.csv`);
    toast('💾 Published payroll CSV exported.');
  };

  const years = useMemo(() => {
    const ys = new Set([year, year - 1, year + 1, ...runs.map(r => r.year)]);
    return [...ys].sort((a, b) => b - a);
  }, [year, runs]);

  const STATS = [
    { label: 'Officers on Sheet', value: rows.length, icon: '👥' },
    { label: 'With Salary Set', value: totals.withSalary, icon: '💰' },
    { label: 'Total Basic Salary', value: fmtNaira(totals.totalBasic), icon: '🏦', small: true },
    { label: 'Total Gross', value: fmtNaira(totals.totalGross), icon: '📊', small: true },
  ];

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--color-border)',
    background: active ? 'var(--color-primary)' : '#fff',
    color: active ? '#fff' : 'var(--color-text-secondary)',
  });

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 720, marginBottom: 14 }}>
        Monthly payroll sheet generated from the register. Basic salary is set per officer on their record
        (or via CSV import — <strong>Basic Salary</strong> / <strong>Step</strong> columns). Export produces an{' '}
        <strong>IPPS-style CSV</strong>; <strong>Publish month</strong> snapshots the sheet for the records.
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12, padding: '13px 15px' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: s.small ? 16 : 22, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.15 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Month picker + actions */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14, padding: '11px 14px',
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Month</div>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, background: 'var(--color-surface-warm)', color: 'var(--color-text-primary)' }}>
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Year</div>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, background: 'var(--color-surface-warm)', color: 'var(--color-text-primary)' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120, paddingBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {label}{alreadyPublished && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary)', marginLeft: 8 }}>✓ published</span>}
        </div>
        <button onClick={handleExport} style={chipStyle(false)}>⬇ Export IPPS CSV</button>
        <button onClick={handlePrint} style={chipStyle(false)}>🖨 Print Sheet</button>
        <button onClick={handlePublish} disabled={publishing}
          style={{ ...chipStyle(true), border: 'none', color: '#fff', padding: '6px 14px' }}>
          {publishing ? 'Publishing…' : alreadyPublished ? 'Re-publish Month' : 'Publish Month'}
        </button>
      </div>

      {/* Sheet table */}
      <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
        <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {label} · <strong style={{ color: 'var(--color-text-primary)' }}>{rows.length}</strong> officers
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Officer</th>
                <th style={thStyle}>Grade</th>
                <th style={thStyle}>Step</th>
                <th style={thStyle}>Station</th>
                <th style={thStyle}>Basic Salary</th>
                <th style={thStyle}>Gross</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>🏦</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>No employees yet.</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Add employees and set their basic salary to build the payroll.</div>
                  </td>
                </tr>
              ) : rows.map((r, i) => (
                <tr key={r.employeeId} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                  <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {esc(r.name)}
                    <div style={{ fontSize: 11, fontWeight: 400, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>{esc(r.psn || '—')}</div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{esc(r.grade || '—')}</td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{esc(r.step || '—')}</td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{esc(r.station || '—')}</td>
                  <td style={{ ...tdStyle, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{r.basicSalary > 0 ? fmtNaira(r.basicSalary) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                  <td style={{ ...tdStyle, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmtNaira(r.gross)}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, fontWeight: 800, background: 'var(--color-surface-warm)', borderTop: '2px solid var(--color-primary)' }}>TOTAL — {rows.length} officers</td>
                  <td style={{ ...tdStyle, fontWeight: 800, background: 'var(--color-surface-warm)', borderTop: '2px solid var(--color-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{fmtNaira(totals.totalBasic)}</td>
                  <td style={{ ...tdStyle, fontWeight: 800, background: 'var(--color-surface-warm)', borderTop: '2px solid var(--color-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{fmtNaira(totals.totalGross)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Published runs */}
      {runs.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
            Published Months ({runs.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {runs.map(run => (
              <div key={run.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--color-border)', borderRadius: 10, background: '#fff' }}>
                <div style={{ fontSize: 17 }}>🗓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{run.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {run.count} officers · {fmtNaira(run.total)}
                  </div>
                </div>
                <button onClick={() => openRun(run)}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-secondary)' }}>
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run detail modal */}
      {viewingRun && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setViewingRun(null)}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, maxWidth: 640, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 22 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>🗓 {viewingRun.label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {viewingRun.count} officers · {fmtNaira(viewingRun.total)} · published {viewingRun.created_at ? new Date(viewingRun.created_at).toLocaleDateString('en-GB') : ''}
                </div>
              </div>
              <button onClick={() => setViewingRun(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => exportRun(viewingRun, runLines)} disabled={loadingRun}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--color-primary)', color: '#fff' }}>
                ⬇ Export CSV
              </button>
            </div>
            {loadingRun ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: 20, textAlign: 'center' }}>Loading…</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Officer</th>
                    <th style={thStyle}>Grade</th>
                    <th style={thStyle}>Basic</th>
                    <th style={thStyle}>Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {runLines.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{esc(l.name)}<div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>{esc(l.psn || '—')}</div></td>
                      <td style={tdStyle}>{esc(l.grade || '—')}</td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace" }}>{fmtNaira(l.basic_salary)}</td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmtNaira(l.gross)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.4px',
  background: 'var(--color-surface-warm)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '9px 12px', fontSize: 13, verticalAlign: 'middle',
};
