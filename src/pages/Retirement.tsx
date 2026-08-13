import { useMemo, useState } from 'react';
import type { Employee } from '../types';
import { getRetirementInfo, DUE_SOON_YEARS, RETIREMENT_AGE, MAX_SERVICE_YEARS } from '../lib/retirement';

interface RetirementProps {
  employees: Employee[];
  onViewEmployee: (id: string) => void;
}

type StatusFilter = 'all' | 'retired' | 'due1' | 'due2' | 'ontrack';

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RetirementPage({ employees, onViewEmployee }: RetirementProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const rows = useMemo(() => {
    return employees
      .map(e => ({ emp: e, info: getRetirementInfo(e) }))
      .sort((a, b) => {
        // Non-retired first (soonest retirement date), retired officers last.
        const ar = a.info.yearsUntilRetirement ?? Infinity;
        const br = b.info.yearsUntilRetirement ?? Infinity;
        if ((a.info.retired || false) !== (b.info.retired || false)) {
          return a.info.retired ? 1 : -1;
        }
        return ar - br;
      });
  }, [employees]);

  const counts = useMemo(() => ({
    total: employees.length,
    retired: rows.filter(r => r.info.retired).length,
    due1: rows.filter(r => !r.info.retired && (r.info.yearsUntilRetirement ?? Infinity) <= 1).length,
    due2: rows.filter(r => !r.info.retired && (r.info.yearsUntilRetirement ?? Infinity) <= DUE_SOON_YEARS).length,
  }), [employees, rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      if (status === 'retired' && !r.info.retired) return false;
      if (status === 'due1' && (r.info.retired || (r.info.yearsUntilRetirement ?? Infinity) > 1)) return false;
      if (status === 'due2' && (r.info.retired || (r.info.yearsUntilRetirement ?? Infinity) > DUE_SOON_YEARS)) return false;
      if (status === 'ontrack' && (r.info.retired || (r.info.yearsUntilRetirement ?? Infinity) <= DUE_SOON_YEARS)) return false;
      if (!q) return true;
      return (
        (r.emp.name || '').toLowerCase().includes(q) ||
        (r.emp.psn || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, status]);

  const statusBadge = (retired: boolean, yearsUntil: number | null) => {
    if (retired) return { label: 'Retired', color: '#dc2626', bg: 'rgba(220,38,38,.1)' };
    if (yearsUntil !== null && yearsUntil <= 1) return { label: 'Due ≤ 1 yr', color: '#ea580c', bg: 'rgba(234,88,12,.1)' };
    if (yearsUntil !== null && yearsUntil <= DUE_SOON_YEARS) return { label: `Due ≤ ${DUE_SOON_YEARS} yrs`, color: '#ca8a04', bg: 'rgba(202,138,4,.12)' };
    return { label: 'On track', color: '#16a34a', bg: 'rgba(22,163,74,.1)' };
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--color-border)',
    background: active ? 'var(--color-primary)' : '#fff',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    whiteSpace: 'nowrap',
  });

  const STATS = [
    { label: 'Total Officers', value: counts.total, icon: '👥' },
    { label: 'Retired / Due', value: counts.retired + counts.due2, icon: '🎓' },
    { label: 'Due Within 1 Year', value: counts.due1, icon: '⏰' },
    { label: `Due Within ${DUE_SOON_YEARS} Years`, value: counts.due2, icon: '📅' },
  ];

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 700, marginBottom: 14 }}>
        Computed from each officer's date of birth and first appointment — Nigeria's public service rule
        applies: retirement at <strong>age {RETIREMENT_AGE}</strong> or after{' '}
        <strong>{MAX_SERVICE_YEARS} years of service</strong>, whichever comes first. Officers missing a
        date of birth or first appointment can't be dated.
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        {STATS.map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12, padding: '13px 15px',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14, padding: '11px 14px',
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Search</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or PSN…"
            style={{ padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%', background: 'var(--color-surface-warm)' }} />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {([['all', 'All'], ['due2', `Due ≤ ${DUE_SOON_YEARS} yrs`], ['due1', 'Due ≤ 1 yr'], ['retired', 'Retired'], ['ontrack', 'On track']] as [StatusFilter, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setStatus(key)} style={chipStyle(status === key)}>{label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Showing <strong style={{ color: 'var(--color-text-primary)' }}>{filtered.length}</strong> of {rows.length} officers
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Officer</th>
                <th style={thStyle}>Age</th>
                <th style={thStyle}>Years of Service</th>
                <th style={thStyle}>Retirement Date</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>🎓</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      No officers match.
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {employees.length === 0 ? 'Add employees to see retirement projections.' : 'Try a different search or status filter.'}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(({ emp, info }, i) => {
                const badge = statusBadge(info.retired, info.yearsUntilRetirement);
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)', cursor: 'pointer' }}
                    onClick={() => onViewEmployee(emp.id)}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {esc(emp.name)}
                      <div style={{ fontSize: 11, fontWeight: 400, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>
                        {esc(emp.psn || '—')}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{info.age !== null ? `${info.age} yrs` : '—'}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{info.yearsOfService !== null ? `${info.yearsOfService} yrs` : '—'}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{fmtDate(info.retirementDate)}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
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
