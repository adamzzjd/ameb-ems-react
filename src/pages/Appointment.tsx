import { useMemo } from 'react';
import type { Employee } from '../types';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';

interface AppointmentProps {
  employees: Employee[];
  onViewEmployee: (id: string) => void;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
}

export function Appointment({ employees, onViewEmployee }: AppointmentProps) {
  const groups = useMemo(() => {
    const sorted = [...employees].sort((a, b) =>
      (a.date_first_appt || '').localeCompare(b.date_first_appt || '')
    );

    const byYear: Record<string, Employee[]> = {};
    sorted.forEach(e => {
      const yr = e.date_first_appt ? e.date_first_appt.substring(0, 4) : 'Unknown';
      if (!byYear[yr]) byYear[yr] = [];
      byYear[yr].push(e);
    });

    return Object.keys(byYear).sort().map(yr => ({
      year: yr,
      employees: byYear[yr],
    }));
  }, [employees]);

  if (groups.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
        <div style={{ fontSize: 14 }}>No employees yet.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map(group => (
        <div
          key={group.year}
          style={{
            background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12,
            overflow: 'hidden', boxShadow: 'none',
          }}
        >
          {/* Year header */}
          <div style={{
            background: 'var(--color-primary)',
            padding: '11px 16px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span>📅</span>
              <span>{group.year}</span>
              <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.55 }}>
                ({group.employees.length} officer{group.employees.length !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}></th>
                  <th style={thStyle}>PSN</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Cadre</th>
                  <th style={thStyle}>Grade</th>
                  <th style={thStyle}>First Appt.</th>
                  <th style={thStyle}>Present Appt.</th>
                  <th style={thStyle}>Station</th>
                </tr>
              </thead>
              <tbody>
                {group.employees.map(e => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                    onClick={() => onViewEmployee(e.id)}
                    onMouseEnter={el => { (el.currentTarget as HTMLElement).style.background = 'var(--color-surface-warm)'; }}
                    onMouseLeave={el => { (el.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    <td style={{ ...tdStyle, width: 42 }}>
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={e.photo || undefined} alt={e.name} />
                        <AvatarFallback className="bg-navy text-white text-[10px] font-bold">
                          {(e.name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>
                      {esc(e.psn || '—')}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {esc(e.name)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {esc(e.cadre || '—')}
                    </td>
                    <td style={tdStyle}>
                      <Badge variant="outline">{e.grade || '—'}</Badge>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmtDate(e.date_first_appt)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmtDate(e.date_present_appt)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>
                      {esc(e.station || '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
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
