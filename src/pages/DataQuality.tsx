import { useMemo, useState } from 'react';
import type { Employee } from '../types';
import {
  REQUIRED_FIELDS,
  getCompletenessStats,
  findMissing,
  findDuplicateOfficers,
  type MissingField,
} from '../lib/dataQuality';
import { exportEmployeesCSV } from '../lib/csv';

interface DataQualityProps {
  employees: Employee[];
  onEditEmployee: (id: string) => void;
}

type View = 'missing' | 'duplicates';

const FIELD_LABELS: Record<MissingField, string> = {
  name: 'Name',
  psn: 'PSN',
  gender: 'Gender',
  dob: 'Date of Birth',
  date_first_appt: 'First Appointment',
  phone: 'Phone',
  lga: 'LGA',
  station: 'Station',
};

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function DataQualityPage({ employees, onEditEmployee }: DataQualityProps) {
  const stats = useMemo(() => getCompletenessStats(employees), [employees]);
  const [view, setView] = useState<View>('missing');
  const [field, setField] = useState<MissingField | 'all'>('all');

  const rows = useMemo(() => {
    if (view === 'duplicates') return findDuplicateOfficers(employees);
    if (field === 'all') return employees.filter(e => !getCompletenessStats([e]).complete);
    return findMissing(employees, field);
  }, [employees, view, field]);

  const missingCells = useMemo(
    () => REQUIRED_FIELDS.reduce((s, f) => s + stats.missing[f], 0),
    [stats]
  );

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--color-border)',
    background: active ? 'var(--color-primary)' : '#fff',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    whiteSpace: 'nowrap',
  });

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 720, marginBottom: 14 }}>
        The retirement projections and gender reporting are only as good as the register.
        This page flags officers missing key fields and possible duplicate names — use{' '}
        <strong>Edit</strong> to fill gaps, or export the current list to CSV.
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Total Officers', value: stats.total, icon: '👥' },
          { label: 'Complete Records', value: stats.complete, icon: '✅' },
          { label: 'Missing Fields', value: missingCells, icon: '⚠️' },
          { label: 'Duplicate Names', value: stats.duplicateCount, icon: '🔁' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12, padding: '13px 15px' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button style={chipStyle(view === 'missing')} onClick={() => setView('missing')}>Missing fields</button>
        <button style={chipStyle(view === 'duplicates')} onClick={() => setView('duplicates')}>
          Duplicates{stats.duplicateCount > 0 ? ` (${stats.duplicateCount})` : ''}
        </button>
      </div>

      {view === 'missing' && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
          <button style={chipStyle(field === 'all')} onClick={() => setField('all')}>All ({employees.filter(e => !getCompletenessStats([e]).complete).length})</button>
          {REQUIRED_FIELDS.map(f => (
            <button key={f} style={chipStyle(field === f)} onClick={() => setField(f)}>
              {FIELD_LABELS[f]} ({stats.missing[f]})
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
        <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Showing <strong style={{ color: 'var(--color-text-primary)' }}>{rows.length}</strong> of {employees.length} officers
          </div>
          <button
            onClick={() => exportEmployeesCSV(rows)}
            style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'var(--color-primary)', color: '#fff' }}
          >
            💾 Export List (CSV)
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Officer</th>
                <th style={thStyle}>Issue</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>🎉</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {view === 'missing' ? 'No officers missing this field.' : 'No duplicate names found.'}
                    </div>
                  </td>
                </tr>
              ) : rows.map((e, i) => {
                const issues = view === 'duplicates'
                  ? ['Possible duplicate name']
                  : REQUIRED_FIELDS.filter(f => !e[f]).map(f => FIELD_LABELS[f]);
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {esc(e.name || '(no name)')}
                      <div style={{ fontSize: 11, fontWeight: 400, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>
                        {esc(e.psn || 'no PSN')}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {issues.map(issue => (
                          <span key={issue} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(234,88,12,.1)', color: '#c2410c' }}>
                            {issue}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => onEditEmployee(e.id)}
                        style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'var(--color-primary)', color: '#fff' }}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
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
