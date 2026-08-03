import { useMemo } from 'react';
import type { Employee, FilterState } from '../types';
import { LGAs, GRADES, STATIONS } from '../data/constants';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';

interface EmployeesPageProps {
  employees: Employee[];
  filter: FilterState;
  paginated: Employee[];
  filtered: Employee[];
  totalPages: number;
  onFilterChange: (f: Partial<FilterState>) => void;
  onClearFilters: () => void;
  onViewEmployee: (id: string) => void;
  onEditEmployee: (id: string) => void;
  onDeleteEmployee: (id: string) => void;
  onPrint: () => void;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
}

const SORT_OPTIONS: { value: keyof Employee; label: string }[] = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'grade', label: 'Grade Level' },
  { value: 'lga', label: 'LGA of Origin' },
  { value: 'station', label: 'Station' },
  { value: 'date_first_appt', label: 'First Appointment' },
  { value: 'date_present_appt', label: 'Present Appointment' },
  { value: 'dob', label: 'Date of Birth' },
  { value: 'psn', label: 'PSN' },
];

const thStyle: React.CSSProperties = {
  padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px',
  background: '#f7faf8', borderBottom: '1px solid #d3ded9',
  whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
};

const tdStyle: React.CSSProperties = {
  padding: '9px 12px', fontSize: 13, verticalAlign: 'middle',
};

export function EmployeesPage({
  employees, filter, paginated, filtered, totalPages,
  onFilterChange, onClearFilters, onViewEmployee,
  onEditEmployee, onDeleteEmployee, onPrint,
}: EmployeesPageProps) {
  const stationList = useMemo(() => {
    const unique = new Set(employees.map(e => e.station).filter(Boolean) as string[]);
    const fromData = [...unique].sort();
    return fromData.length > 0 ? fromData : [...STATIONS];
  }, [employees]);

  const sortField = filter.sortField as string;

  const handleSort = (field: keyof Employee) => {
    if (filter.sortField === field) {
      onFilterChange({ sortDir: (filter.sortDir === 1 ? -1 : 1) as 1 | -1 });
    } else {
      onFilterChange({ sortField: field, sortDir: 1 });
    }
  };

  const from = (filter.page - 1) * 50 + 1;
  const to = Math.min(filter.page * 50, filtered.length);

  return (
    <div>
      {/* ── Filter Bar ── */}
      <div style={{
        background: '#fff', border: '1px solid #e2eae6', borderRadius: 12,
        padding: '13px 14px', display: 'flex', gap: 10, flexWrap: 'wrap',
        alignItems: 'flex-end', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.3px' }}>
            Search
          </div>
          <input
            placeholder="Name, PSN, phone, station…"
            value={filter.search}
            onChange={e => onFilterChange({ search: e.target.value })}
            style={{
              padding: '8px 10px', border: '1px solid #d3ded9', borderRadius: 6,
              fontSize: 13, background: '#f7faf8', color: '#27313b',
              outline: 'none', width: '100%',
            }}
            onFocus={e => { e.target.style.borderColor = '#0f6e56'; e.target.style.background = '#fff'; }}
            onBlur={e => { e.target.style.borderColor = '#d3ded9'; e.target.style.background = '#f7faf8'; }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.3px' }}>
            LGA
          </div>
          <select
            value={filter.lga}
            onChange={e => onFilterChange({ lga: e.target.value })}
            style={{
              padding: '8px 10px', border: '1px solid #d3ded9', borderRadius: 6,
              fontSize: 13, background: '#f7faf8', color: '#27313b', outline: 'none',
              appearance: 'none', paddingRight: 26,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
              backgroundColor: '#f7faf8',
            }}
          >
            <option value="">All LGAs</option>
            {LGAs.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.3px' }}>
            Station
          </div>
          <select
            value={filter.station}
            onChange={e => onFilterChange({ station: e.target.value })}
            style={{
              padding: '8px 10px', border: '1px solid #d3ded9', borderRadius: 6,
              fontSize: 13, background: '#f7faf8', color: '#27313b', outline: 'none',
              appearance: 'none', paddingRight: 26,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
              backgroundColor: '#f7faf8',
            }}
          >
            <option value="">All Stations</option>
            {stationList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.3px' }}>
            Grade
          </div>
          <select
            value={filter.grade}
            onChange={e => onFilterChange({ grade: e.target.value })}
            style={{
              padding: '8px 10px', border: '1px solid #d3ded9', borderRadius: 6,
              fontSize: 13, background: '#f7faf8', color: '#27313b', outline: 'none',
              appearance: 'none', paddingRight: 26,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
              backgroundColor: '#f7faf8',
            }}
          >
            <option value="">All Grades</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.3px' }}>
            Sort by
          </div>
          <select
            value={sortField}
            onChange={e => onFilterChange({ sortField: e.target.value as keyof Employee })}
            style={{
              padding: '8px 10px', border: '1px solid #d3ded9', borderRadius: 6,
              fontSize: 13, background: '#f7faf8', color: '#27313b', outline: 'none',
              appearance: 'none', paddingRight: 26,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
              backgroundColor: '#f7faf8',
            }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
          <button
            onClick={onClearFilters}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: '1px solid #d3ded9', cursor: 'pointer',
              background: 'transparent', color: '#475569', whiteSpace: 'nowrap',
            }}
          >
            Clear
          </button>
          <button
            onClick={onPrint}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: '#27313b', color: '#fff',
            }}
          >
            🖨 Print
          </button>
        </div>
      </div>

      {/* ── Results Table ── */}
      <div style={{
        background: '#fff', border: '1px solid #e2eae6', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{
          padding: '9px 14px', borderBottom: '1px solid #e2eae6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {filtered.length > 0 ? (
              <>Showing <strong style={{ color: '#27313b' }}>{from}–{to}</strong> of {filtered.length} officers ({employees.length} total)</>
            ) : (
              <><strong style={{ color: '#27313b' }}>0</strong> of {employees.length} officers</>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}></th>
                <th style={thStyle} onClick={() => handleSort('psn')}>
                  PSN {sortField === 'psn' ? (filter.sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th style={thStyle} onClick={() => handleSort('name')}>
                  Name {sortField === 'name' ? (filter.sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th style={thStyle} onClick={() => handleSort('cadre')}>
                  Cadre {sortField === 'cadre' ? (filter.sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th style={thStyle} onClick={() => handleSort('grade')}>
                  Grade {sortField === 'grade' ? (filter.sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th style={thStyle} onClick={() => handleSort('lga')}>
                  LGA {sortField === 'lga' ? (filter.sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th style={thStyle} onClick={() => handleSort('station')}>
                  Station {sortField === 'station' ? (filter.sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th style={thStyle} onClick={() => handleSort('date_first_appt')}>
                  First Appt. {sortField === 'date_first_appt' ? (filter.sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th style={thStyle} onClick={() => handleSort('phone')}>
                  Phone {sortField === 'phone' ? (filter.sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th style={{ ...thStyle, cursor: 'default' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>🔍</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                      {employees.length === 0 ? 'No employees on record yet.' : 'No employees match your filters.'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {employees.length === 0
                        ? 'Click "+ Add Employee" or "Import from Register" to get started.'
                        : <a onClick={onClearFilters} style={{ color: '#0f6e56', cursor: 'pointer' }}>Clear all filters</a>
                      }
                    </div>
                  </td>
                </tr>
              ) : paginated.map(e => (
                <tr
                  key={e.id}
                  style={{ borderBottom: '1px solid #e2eae6', transition: 'background .1s' }}
                  onMouseEnter={e2 => { (e2.currentTarget as HTMLElement).style.background = '#f7faf8'; }}
                  onMouseLeave={e2 => { (e2.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <td style={{ ...tdStyle, width: 44 }}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={e.photo || undefined} alt={e.name} />
                      <AvatarFallback className="bg-navy text-white text-xs font-bold">
                        {(e.name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#0f6e56', fontWeight: 600 }}>
                    {esc(e.psn || '—')}
                  </td>
                  <td
                    style={{ ...tdStyle, fontWeight: 700, color: '#27313b', cursor: 'pointer' }}
                    onClick={() => onViewEmployee(e.id)}
                  >
                    {esc(e.name)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: '#475569' }}>
                    {esc(e.cadre || '—')}
                  </td>
                  <td style={tdStyle}>
                    <Badge variant="outline">{e.grade || '—'}</Badge>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>
                    {esc(e.lga || '—')}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>
                    {esc(e.station || '—')}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtDate(e.date_first_appt)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>
                    {esc(e.phone || '—')}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={() => onViewEmployee(e.id)}
                        title="View"
                        style={actionBtnStyle}
                      >
                        👁
                      </button>
                      <button
                        onClick={() => onEditEmployee(e.id)}
                        title="Edit"
                        style={{ ...actionBtnStyle, background: '#0f6e56', color: '#fff' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDeleteEmployee(e.id)}
                        title="Delete"
                        style={{ ...actionBtnStyle, color: '#c0392b' }}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderTop: '1px solid #e2eae6',
          }}>
            <button
              onClick={() => onFilterChange({ page: Math.max(1, filter.page - 1) })}
              disabled={filter.page <= 1}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid #d3ded9', cursor: filter.page <= 1 ? 'not-allowed' : 'pointer',
                background: 'transparent', color: filter.page <= 1 ? '#d3ded9' : '#475569',
                opacity: filter.page <= 1 ? 0.4 : 1,
              }}
            >
              ‹ Prev
            </button>
            <span style={{ fontSize: 12, color: '#475569' }}>
              Page {filter.page} of {totalPages}
            </span>
            <button
              onClick={() => onFilterChange({ page: Math.min(totalPages, filter.page + 1) })}
              disabled={filter.page >= totalPages}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid #d3ded9', cursor: filter.page >= totalPages ? 'not-allowed' : 'pointer',
                background: 'transparent', color: filter.page >= totalPages ? '#d3ded9' : '#475569',
                opacity: filter.page >= totalPages ? 0.4 : 1,
              }}
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '4px 8px', borderRadius: 6, fontSize: 13,
  border: '1px solid #d3ded9', cursor: 'pointer',
  background: 'transparent', color: '#475569',
  width: 30, height: 28, lineHeight: 1,
};
