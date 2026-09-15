/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useEffect, useMemo, useState } from 'react';
import type { Employee, LgaAreaOfficer } from '../types';
import { Users, MapPin, Award, ChevronRight, TrendingUp, MapPinned } from 'lucide-react';
import { getPromotionInfo, DUE_SOON_MONTHS } from '../lib/promotion';
import { LGAs } from '../data/constants';
import { dbLoadLgaAreaOfficers } from '../supabase/lgaOfficers';
import { useAuth } from '../hooks/useAuth';

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
  const { can } = useAuth();

  // LGA area officers live in their own table. Load them here (the card simply
  // stays hidden if the table hasn't been set up yet) so the dashboard can show
  // which officer covers each local government.
  const [officers, setOfficers] = useState<LgaAreaOfficer[]>([]);
  const [officersAvailable, setOfficersAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dbLoadLgaAreaOfficers().then(({ data, error }) => {
      if (cancelled) return;
      if (error) return;
      setOfficers(data ?? []);
      setOfficersAvailable(true);
    });
    return () => { cancelled = true; };
  }, []);

  // LGA → assigned area officer (and that officer's name from the register).
  const coverage = useMemo(() => {
    const byLga = new Map(officers.map(o => [o.lga, o]));
    const employeeNames = new Map(employees.map(e => [e.id, e.name]));
    const unassigned = LGAs.filter(l => {
      const o = byLga.get(l);
      return !o || !o.employee_id || !employeeNames.has(o.employee_id);
    });
    return {
      byLga, employeeNames, unassigned,
      covered: LGAs.length - unassigned.length,
      pct: Math.round(((LGAs.length - unassigned.length) / LGAs.length) * 100),
    };
  }, [officers, employees]);

  const stats = useMemo(() => {
    const byGrade: Record<string, number> = {};
    const byLGA: Record<string, number> = {};
    const byStation: Record<string, number> = {};
    const byGender: Record<string, number> = {};
    employees.forEach(e => {
      const g = e.grade || 'Unknown';
      const l = e.lga || 'Unknown';
      const s = e.station || 'Unknown';
      const x = e.gender || 'Not stated';
      byGrade[g] = (byGrade[g] || 0) + 1;
      byLGA[l] = (byLGA[l] || 0) + 1;
      byStation[s] = (byStation[s] || 0) + 1;
      byGender[x] = (byGender[x] || 0) + 1;
    });
    const male = byGender['Male'] || 0;
    const female = byGender['Female'] || 0;
    const genderKnown = male + female;
    const malePct = genderKnown ? Math.round((male / genderKnown) * 100) : 0;
    const recent = [...employees]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 6);
    const maxG = Math.max(1, ...Object.values(byGrade));
    const maxL = Math.max(1, ...Object.values(byLGA));
    return { byGrade, byLGA, byStation, byGender, male, female, malePct, recent, maxG, maxL };
  }, [employees]);

  const promotionAlerts = useMemo(() => {
    const due = employees.filter(e => getPromotionInfo(e).dueSoon);
    const overdue = employees.filter(e => getPromotionInfo(e).overdue);
    return { due, overdue, total: due.length + overdue.length };
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

      {/* Promotion alerts */}
      {promotionAlerts.total > 0 && (
        <div className="rounded-xl border px-4 py-3 mb-3.5 flex flex-wrap items-center gap-3"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderLeft: '3px solid var(--color-warning)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(198,138,0,0.12)' }}>
            <TrendingUp size={17} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {promotionAlerts.overdue.length > 0
                ? `${promotionAlerts.overdue.length} officer${promotionAlerts.overdue.length !== 1 ? 's' : ''} overdue for promotion`
                : `${promotionAlerts.due.length} officer${promotionAlerts.due.length !== 1 ? 's' : ''} due for promotion within ${DUE_SOON_MONTHS} months`}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Based on each officer's present appointment date (next grade due after 3 years).
            </div>
          </div>
          <button onClick={() => onNavigate('promotions')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 border-none cursor-pointer"
            style={{ background: 'var(--color-warning)' }}>
            Review <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Gender distribution */}
      {employees.length > 0 && (
        <div className="rounded-xl border px-4 py-3 mb-3.5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>Gender Distribution</span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {stats.male} ♂ · {stats.female} ♀ {stats.byGender['Not stated'] ? `· ${stats.byGender['Not stated']} not stated` : ''}
            </span>
          </div>
          <div className="flex h-[9px] rounded overflow-hidden" style={{ background: 'var(--color-surface-raised)' }}>
            <div className="h-full transition-all duration-500" style={{ background: 'var(--color-primary)', width: `${stats.malePct}%` }} />
            <div className="h-full transition-all duration-500" style={{ background: 'var(--color-gold)', width: `${100 - stats.malePct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: 'var(--color-primary)' }} />Male {stats.malePct}%</span>
            <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: 'var(--color-gold)' }} />Female {100 - stats.malePct}%</span>
          </div>
        </div>
      )}

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

      {/* LGA Area Officers — one officer per local government */}
      {officersAvailable && (
        <div className="rounded-xl border overflow-hidden mb-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b flex-wrap" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(26,92,56,0.1)' }}>
                <MapPinned size={16} style={{ color: 'var(--color-primary)' }} />
              </div>
              <span className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>LGA Area Officers</span>
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {coverage.covered} of {LGAs.length} LGAs covered
              </span>
            </div>
            {can('settings.manage') && (
              <button onClick={() => onNavigate('lga-officers')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border hover:bg-surface-warm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Manage <ChevronRight size={14} />
              </button>
            )}
          </div>

          <div className="px-4 pt-3">
            <div className="h-[7px] rounded overflow-hidden" style={{ background: 'var(--color-surface-raised)' }}>
              <div className="h-full rounded transition-all duration-500" style={{ background: 'var(--color-primary)', width: `${coverage.pct}%` }} />
            </div>
            <div className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {coverage.unassigned.length > 0
                ? `${coverage.unassigned.length} LGA${coverage.unassigned.length !== 1 ? 's' : ''} still without an area officer — assign one from the staff register.`
                : 'Every LGA has an area officer assigned from the staff register.'}
            </div>
          </div>

          <div className="p-4 max-h-[320px] overflow-y-auto">
            {LGAs.map(l => {
              const o = coverage.byLga.get(l);
              const officerName = o?.employee_id ? coverage.employeeNames.get(o.employee_id) : null;
              return (
                <div key={l} className="flex items-center gap-2.5 py-1.5 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-xs w-[150px] shrink-0 truncate" style={{ color: 'var(--color-text-secondary)' }}>{l}</div>
                  {officerName ? (
                    <button onClick={() => o?.employee_id && onViewEmployee(o.employee_id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border-none cursor-pointer"
                      style={{ background: 'rgba(26,92,56,0.1)', color: 'var(--color-primary)' }}>
                      {esc(officerName)}
                    </button>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>— Unassigned —</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
