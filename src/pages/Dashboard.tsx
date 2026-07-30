import { useMemo } from 'react';
import type { Employee } from '../types';

interface DashboardProps {
  employees: Employee[];
  onViewEmployee: (id: string) => void;
  onNavigate: (page: string) => void;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function gradeColor(g: string | null | undefined): string {
  const n = parseInt((g || '').replace(/\D/g, ''));
  if (n >= 15) return '#991b1b';
  if (n >= 12) return '#92400e';
  if (n >= 8)  return '#1e3a5f';
  return '#5c5648';
}

function gradeBg(g: string | null | undefined): string {
  const n = parseInt((g || '').replace(/\D/g, ''));
  if (n >= 15) return '#fde8e8';
  if (n >= 12) return '#fef9c3';
  if (n >= 8)  return '#dbeafe';
  return '#efebe4';
}

export function Dashboard({ employees, onViewEmployee, onNavigate }: DashboardProps) {
  const stats = useMemo(() => {
    const byGrade: Record<string, number> = {};
    const byLGA: Record<string, number> = {};
    const byStation: Record<string, number> = {};

    employees.forEach(e => {
      const g = e.grade || 'Unknown';
      const l = e.lga || 'Unknown';
      const s = e.station || 'Unknown';
      byGrade[g] = (byGrade[g] || 0) + 1;
      byLGA[l] = (byLGA[l] || 0) + 1;
      byStation[s] = (byStation[s] || 0) + 1;
    });

    const recent = [...employees]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 6);

    const maxG = Math.max(1, ...Object.values(byGrade));
    const maxL = Math.max(1, ...Object.values(byLGA));

    return { byGrade, byLGA, byStation, recent, maxG, maxL };
  }, [employees]);

  return (
    <div>
      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18,
      }} className="sm:grid-cols-4">
        {[
          { label: 'Total Officers', value: employees.length, sub: 'On register', accent: true },
          { label: 'Stations', value: Object.keys(stats.byStation).length, sub: 'Across Adamawa' },
          { label: 'LGAs', value: Object.keys(stats.byLGA).length, sub: 'of 21 LGAs' },
          { label: 'Grade Levels', value: Object.keys(stats.byGrade).length, sub: 'In this register' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#fff', border: '1px solid #efebe4', borderRadius: 12,
            padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
            ...(stat.accent ? { borderTop: '3px solid #c9a84c' } : {}),
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#948d7e', textTransform: 'uppercase', letterSpacing: '.4px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0b0b14', marginTop: 4, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: '#948d7e', marginTop: 3 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Bar charts */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 16,
      }} className="lg:grid-cols-2">
        {/* By Grade */}
        <div style={{
          background: '#fff', border: '1px solid #efebe4', borderRadius: 12,
          overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
        }}>
          <div style={{
            padding: '11px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', borderBottom: '1px solid #efebe4',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0b0b14' }}>By Grade Level</span>
          </div>
          <div style={{ padding: '10px 16px' }}>
            {Object.entries(stats.byGrade)
              .sort(([,a], [,b]) => b - a)
              .map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                  borderBottom: '1px solid #efebe4',
                }}>
                  <div style={{
                    fontSize: 12, color: '#5c5648', width: 150, flexShrink: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{k}</div>
                  <div style={{ flex: 1, height: 7, background: '#efebe4', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: '#c9a84c',
                      width: `${Math.round((v / stats.maxG) * 100)}%`,
                      transition: 'width .4s',
                    }} />
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: '#0b0b14', width: 26, textAlign: 'right',
                  }}>{v}</div>
                </div>
              ))}
          </div>
        </div>

        {/* By LGA */}
        <div style={{
          background: '#fff', border: '1px solid #efebe4', borderRadius: 12,
          overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
        }}>
          <div style={{
            padding: '11px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', borderBottom: '1px solid #efebe4',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0b0b14' }}>By LGA of Origin</span>
          </div>
          <div style={{ padding: '10px 16px', maxHeight: 300, overflowY: 'auto' }}>
            {Object.entries(stats.byLGA)
              .sort(([,a], [,b]) => b - a)
              .map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                  borderBottom: '1px solid #efebe4',
                }}>
                  <div style={{
                    fontSize: 12, color: '#5c5648', width: 150, flexShrink: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{k}</div>
                  <div style={{ flex: 1, height: 7, background: '#efebe4', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: '#1a56a0',
                      width: `${Math.round((v / stats.maxL) * 100)}%`,
                      transition: 'width .4s',
                    }} />
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: '#0b0b14', width: 26, textAlign: 'right',
                  }}>{v}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Employees */}
      <div style={{
        background: '#fff', border: '1px solid #efebe4', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{
          padding: '11px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid #efebe4',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0b0b14' }}>Recently Added</span>
          <button
            onClick={() => onNavigate('employees')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: '1px solid #dad3c8', cursor: 'pointer',
              background: 'transparent', color: '#5c5648', whiteSpace: 'nowrap',
            }}
          >
            View All →
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}></th>
                <th style={thStyle}>PSN</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Cadre</th>
                <th style={thStyle}>Grade</th>
                <th style={thStyle}>Station</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>👥</div>
                    <div style={{ fontWeight: 600, color: '#5c5648', marginBottom: 5 }}>No employees yet.</div>
                    <div style={{ fontSize: 12, color: '#948d7e' }}>Click + Add Employee or Import from Register.</div>
                  </td>
                </tr>
              ) : stats.recent.map(e => (
                <tr
                  key={e.id}
                  onClick={() => onViewEmployee(e.id)}
                  style={{ borderBottom: '1px solid #efebe4', cursor: 'pointer' }}
                >
                  <td style={tdStyle}>{/* Avatar placeholder */}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11, color: '#c9a84c', fontWeight: 600 }}>
                    {esc(e.psn || '—')}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#0b0b14' }}>
                    {esc(e.name)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: '#5c5648' }}>
                    {esc(e.cadre || '—')}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 9px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                      background: gradeBg(e.grade), color: gradeColor(e.grade),
                    }}>
                      {esc(e.grade || '—')}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{esc(e.station || '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: '#948d7e', textTransform: 'uppercase', letterSpacing: '.4px',
  background: '#f8f6f2', borderBottom: '1px solid #dad3c8', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '9px 12px', fontSize: 13, verticalAlign: 'middle',
};
