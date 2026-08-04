/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useMemo } from 'react';
import type { Employee, FilterState } from '../types';
import { LGAs, GRADES, STATIONS } from '../data/constants';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Eye, Pencil, Trash2, Printer, X } from 'lucide-react';

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
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

const SORT_OPTIONS: { value: keyof Employee; label: string }[] = [
  { value: 'name', label: 'Name (A–Z)' }, { value: 'grade', label: 'Grade Level' },
  { value: 'lga', label: 'LGA of Origin' }, { value: 'station', label: 'Station' },
  { value: 'date_first_appt', label: 'First Appointment' }, { value: 'date_present_appt', label: 'Present Appointment' },
  { value: 'dob', label: 'Date of Birth' }, { value: 'psn', label: 'PSN' },
];

const inputStyle: React.CSSProperties = { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

export function EmployeesPage({
  employees, filter, paginated, filtered, totalPages,
  onFilterChange, onClearFilters, onViewEmployee, onEditEmployee, onDeleteEmployee, onPrint,
}: EmployeesPageProps) {
  const stationList = useMemo(() => {
    const unique = new Set(employees.map(e => e.station).filter(Boolean) as string[]);
    return [...unique].sort().length > 0 ? [...unique].sort() : [...STATIONS];
  }, [employees]);

  const sortField = filter.sortField as string;
  const handleSort = (field: keyof Employee) => {
    if (filter.sortField === field) onFilterChange({ sortDir: (filter.sortDir === 1 ? -1 : 1) as 1 | -1 });
    else onFilterChange({ sortField: field, sortDir: 1 });
  };
  const from = (filter.page - 1) * 50 + 1;
  const to = Math.min(filter.page * 50, filtered.length);

  const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B8F7E' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`;
  const filterInput = "h-[38px] w-full px-2.5 rounded-lg border text-[13px] outline-none transition-colors focus:ring-2 focus:ring-ring appearance-none pr-7 bg-no-repeat bg-[right_9px_center]";
  const filterLabel = "text-[11px] font-bold uppercase tracking-wider";

  return (
    <div>
      {/* Filter Bar */}
      <div className="rounded-xl border p-3 md:p-3.5 flex gap-2.5 flex-wrap items-end mb-3.5"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col gap-1 flex-[2] min-w-[200px]">
          <div className={filterLabel} style={{ color: 'var(--color-text-muted)' }}>Search</div>
          <input placeholder="Name, PSN, phone, station…" value={filter.search} onChange={e => onFilterChange({ search: e.target.value })}
            className="h-[38px] w-full px-2.5 rounded-lg border text-[13px] outline-none transition-colors focus:ring-2 focus:ring-ring"
            style={inputStyle} />
        </div>
        {[
          { label: 'LGA', value: filter.lga, options: LGAs, key: 'lga' },
          { label: 'Station', value: filter.station, options: stationList, key: 'station' },
          { label: 'Grade', value: filter.grade, options: GRADES, key: 'grade' },
        ].map(f => (
          <div key={f.key} className="flex flex-col gap-1 flex-1 min-w-[130px]">
            <div className={filterLabel} style={{ color: 'var(--color-text-muted)' }}>{f.label}</div>
            <select value={f.value} onChange={e => onFilterChange({ [f.key]: e.target.value })}
              className={filterInput} style={{ ...inputStyle, backgroundImage: chevronSvg }}>
              <option value="">All {f.label}s</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
          <div className={filterLabel} style={{ color: 'var(--color-text-muted)' }}>Sort by</div>
          <select value={sortField} onChange={e => onFilterChange({ sortField: e.target.value as keyof Employee })}
            className={filterInput} style={{ ...inputStyle, backgroundImage: chevronSvg }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex gap-1.5 items-end">
          <button onClick={onClearFilters} className="inline-flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg text-xs font-semibold border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <X size={14} /> Clear
          </button>
          <button onClick={onPrint} className="inline-flex items-center gap-1.5 px-2.5 py-[7px] rounded-lg text-xs font-semibold text-white"
            style={{ background: 'var(--color-text-primary)' }}>
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between px-3.5 py-2 border-b"
          style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {filtered.length > 0 ? (
              <>Showing <strong style={{ color: 'var(--color-text-primary)' }}>{from}–{to}</strong> of {filtered.length} officers ({employees.length} total)</>
            ) : (
              <><strong style={{ color: 'var(--color-text-primary)' }}>0</strong> of {employees.length} officers</>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['PSN', 'Name', 'Cadre', 'Grade', 'LGA', 'Station', 'First Appt.', 'Phone', 'Actions'].map(h => (
                  <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider px-3 py-2.5 border-b whitespace-nowrap cursor-pointer select-none"
                    style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}
                    onClick={() => {
                      const fieldMap: Record<string, keyof Employee> = { 'PSN': 'psn', 'Name': 'name', 'Cadre': 'cadre', 'Grade': 'grade', 'LGA': 'lga', 'Station': 'station', 'First Appt.': 'date_first_appt', 'Phone': 'phone' };
                      if (fieldMap[h]) handleSort(fieldMap[h]);
                    }}>
                    {h} {sortField === (h === 'First Appt.' ? 'date_first_appt' : h.toLowerCase()) ? (filter.sortDir === 1 ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-11">
                    <div className="text-[14px] font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {employees.length === 0 ? 'No employees on record yet.' : 'No employees match your filters.'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {employees.length === 0 ? 'Click "+ Add Employee" or "Import from Register" to get started.'
                        : <a onClick={onClearFilters} className="cursor-pointer text-primary hover:underline">Clear all filters</a>}
                    </div>
                  </td>
                </tr>
              ) : paginated.map(e => (
                <tr key={e.id} className="border-b transition-colors hover:bg-surface-warm cursor-pointer"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-3 py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={e.photo || undefined} alt={e.name} />
                      <AvatarFallback className="text-xs font-bold">
                        {(e.name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </td>
                  <td className="px-3 py-2 text-[11px] font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>
                    {esc(e.psn || '—')}
                  </td>
                  <td className="px-3 py-2 text-[13px] font-bold cursor-pointer" style={{ color: 'var(--color-text-primary)' }}
                    onClick={() => onViewEmployee(e.id)}>
                    {esc(e.name)}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{esc(e.cadre || '—')}</td>
                  <td className="px-3 py-2"><Badge variant="outline">{e.grade || '—'}</Badge></td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{esc(e.lga || '—')}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{esc(e.station || '—')}</td>
                  <td className="px-3 py-2 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(e.date_first_appt)}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{esc(e.phone || '—')}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => onViewEmployee(e.id)} title="View"
                        className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-surface-warm"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <Eye size={14} />
                      </button>
                      <button onClick={() => onEditEmployee(e.id)} title="Edit"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                        style={{ background: 'var(--color-primary)' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => onDeleteEmployee(e.id)} title="Delete"
                        className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-surface-warm"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-error)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 px-3.5 py-2 border-t"
            style={{ borderColor: 'var(--color-border)' }}>
            <button onClick={() => onFilterChange({ page: Math.max(1, filter.page - 1) })} disabled={filter.page <= 1}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border disabled:opacity-40"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              ‹ Prev
            </button>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Page {filter.page} of {totalPages}
            </span>
            <button onClick={() => onFilterChange({ page: Math.min(totalPages, filter.page + 1) })} disabled={filter.page >= totalPages}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border disabled:opacity-40"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
