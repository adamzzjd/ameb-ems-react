import { useMemo } from 'react';
import type { Employee } from '../types';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { printEmployees } from '../utils/print';

interface GroupViewProps {
  employees: Employee[];
  groupBy: 'station' | 'lga' | 'grade';
  title: string;
  icon: string;
  onViewEmployee: (id: string) => void;
  onEditEmployee: (id: string) => void;
  onDeleteEmployee: (id: string) => void;
  canManage?: boolean;
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

export function GroupView({
  employees, groupBy, title, icon,
  onViewEmployee, onEditEmployee, onDeleteEmployee, canManage,
}: GroupViewProps) {
  const altKey = groupBy === 'station' ? 'lga' : 'station';
  const altLabel = groupBy === 'station' ? 'LGA' : 'Station';

  const groups = useMemo(() => {
    const map: Record<string, Employee[]> = {};
    employees.forEach(e => {
      const k = e[groupBy] || 'Unknown';
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    return Object.keys(map).sort().map(gk => ({
      key: gk,
      employees: map[gk].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    }));
  }, [employees, groupBy]);

  const handlePrintGroup = (groupKey: string, groupEmployees: Employee[]) => {
    printEmployees(groupEmployees, `${title}: ${groupKey}`, `${groupKey} — ${groupEmployees.length} officers`);
  };

  if (groups.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
        <div style={{ fontSize: 14 }}>No employees on record yet.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map(group => (
        <div
          key={group.key}
          style={{
            background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12,
            overflow: 'hidden', boxShadow: 'none',
          }}
        >
          {/* Group header */}
          <div style={{
            background: 'var(--color-primary)',
            padding: '11px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span>{icon}</span>
              <span>{esc(group.key)}</span>
              <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.55 }}>
                ({group.employees.length} officer{group.employees.length !== 1 ? 's' : ''})
              </span>
            </div>
            <button
              onClick={() => handlePrintGroup(group.key, group.employees)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: 'rgba(255,255,255,.12)', color: '#fff',
              }}
            >
              🖨 Print
            </button>
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
                  <th style={thStyle}>{altLabel}</th>
                  <th style={thStyle}>First Appt.</th>
                  <th style={thStyle}>Phone</th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.employees.map(e => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
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
                    <td
                      style={{ ...tdStyle, fontWeight: 700, color: 'var(--color-text-primary)' }}
                      onClick={() => onViewEmployee(e.id)}
                    >
                      {esc(e.name)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {esc(e.cadre || '—')}
                    </td>
                    <td style={tdStyle}>
                      <Badge variant="outline">{e.grade || '—'}</Badge>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>
                      {esc(e[altKey] || '—')}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmtDate(e.date_first_appt)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>
                      {esc(e.phone || '—')}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 5 }} onClick={e2 => e2.stopPropagation()}>
                        <button
                          onClick={() => onViewEmployee(e.id)}
                          title="View"
                          style={actionBtnStyle}
                        >
                          👁
                        </button>
                        {canManage && (
                          <button
                            onClick={() => onEditEmployee(e.id)}
                            title="Edit"
                            style={{ ...actionBtnStyle, background: 'var(--color-primary)', color: '#fff' }}
                          >
                            ✏️
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => onDeleteEmployee(e.id)}
                            title="Delete"
                            style={{ ...actionBtnStyle, color: 'var(--color-error)' }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
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

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '4px 8px', borderRadius: 6, fontSize: 13,
  border: '1px solid var(--color-border)', cursor: 'pointer',
  background: 'transparent', color: 'var(--color-text-secondary)',
  width: 30, height: 28, lineHeight: 1,
};
