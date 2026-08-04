/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useMemo } from 'react';
import type { Employee } from '../types';
import { Users, MapPin, BarChart3, Award, ChevronRight } from 'lucide-react';

interface DashboardProps {
  employees: Employee[];
  onViewEmployee: (id: string) => void;
  onNavigate: (page: string) => void;
}

function esc(s: string | null | undefined): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function gradeColor(g: string | null | undefined): string {
  const n = parseInt((g || '').replace(/\D/g, ''));
  if (n >= 15) return 'var(--color-error)';
  if (n >= 12) return 'var(--color-warning)';
  if (n >= 8) return 'var(--color-primary)';
  return 'var(--color-text-muted)';
}

function gradeBg(g: string | null | undefined): string {
  const n = parseInt((g || '').replace(/\D/g, ''));
  if (n >= 15) return 'rgba(192,57,43,0.1)';
  if (n >= 12) return 'rgba(198,138,0,0.1)';
  if (n >= 8) return 'rgba(26,92,56,0.1)';
  return 'var(--color-surface-raised)';
}

const STAT_ICONS = [Users, MapPin, MapPin, Award];

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
      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-5">
        {[
          { label: 'Total Officers', value: employees.length, sub: 'On register', accent: true },
          { label: 'Stations', value: Object.keys(stats.byStation).length, sub: 'Across Adamawa' },
          { label: 'LGAs', value: Object.keys(stats.byLGA).length, sub: 'of 21 LGAs' },
          { label: 'Grade Levels', value: Object.keys(stats.byGrade).length, sub: 'In this register' },
        ].map((stat, i) => {
          const Icon = STAT_ICONS[i];
          return (
            <div key={stat.label} className="rounded-xl border p-4 transition-all"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                borderTop: stat.accent ? '3px solid var(--color-primary)' : undefined,
              }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: stat.accent ? 'rgba(26,92,56,0.1)' : 'var(--color-surface-warm)' }}>
                  <Icon size={16} style={{ color: stat.accent ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  {stat.label}
                </span>
              </div>
              <div className="font-heading text-[28px] font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
                {stat.value}
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{stat.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-4">
        {/* By Grade */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>By Grade Level</span>
          </div>
          <div className="p-4">
            {Object.entries(stats.byGrade).sort(([,a], [,b]) => b - a).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2.5 py-1.5 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                <div className="text-xs w-[150px] shrink-0 truncate" style={{ color: 'var(--color-text-secondary)' }}>{k}</div>
                <div className="flex-1 h-[7px] rounded overflow-hidden" style={{ background: 'var(--color-surface-raised)' }}>
                  <div className="h-full rounded transition-all duration-500" style={{ background: 'var(--color-primary)', width: `${Math.round((v / stats.maxG) * 100)}%` }} />
                </div>
                <div className="text-xs font-bold w-7 text-right" style={{ color: 'var(--color-text-primary)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* By LGA */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>By LGA of Origin</span>
          </div>
          <div className="p-4 max-h-[300px] overflow-y-auto">
            {Object.entries(stats.byLGA).sort(([,a], [,b]) => b - a).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2.5 py-1.5 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                <div className="text-xs w-[150px] shrink-0 truncate" style={{ color: 'var(--color-text-secondary)' }}>{k}</div>
                <div className="flex-1 h-[7px] rounded overflow-hidden" style={{ background: 'var(--color-surface-raised)' }}>
                  <div className="h-full rounded transition-all duration-500" style={{ background: 'var(--color-gold)', width: `${Math.round((v / stats.maxL) * 100)}%` }} />
                </div>
                <div className="text-xs font-bold w-7 text-right" style={{ color: 'var(--color-text-primary)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Employees */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>Recently Added</span>
          <button onClick={() => onNavigate('employees')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border hover:bg-surface-warm"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['PSN', 'Name', 'Cadre', 'Grade', 'Station'].map(h => (
                  <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider px-3 py-2.5 border-b"
                    style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-warm)', borderColor: 'var(--color-border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-11">
                    <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>No employees yet.</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Click + Add Employee or Import from Register.</div>
                  </td>
                </tr>
              ) : stats.recent.map(e => (
                <tr key={e.id} onClick={() => onViewEmployee(e.id)}
                  className="cursor-pointer transition-colors hover:bg-surface-warm border-b"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-3 py-2.5 text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>
                    <span className="inline-block w-8 h-8 rounded-lg text-xs font-bold text-white flex items-center justify-center"
                      style={{ background: 'var(--color-primary)' }}>
                      {e.name?.charAt(0) || '?'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>
                    {esc(e.psn || '—')}
                  </td>
                  <td className="px-3 py-2.5 text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {esc(e.name)}
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {esc(e.cadre || '—')}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
                      style={{ background: gradeBg(e.grade), color: gradeColor(e.grade) }}>
                      {esc(e.grade || '—')}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {esc(e.station || '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
