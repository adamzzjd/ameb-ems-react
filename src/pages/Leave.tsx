import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { Employee } from '../types';
import { dbListLeaves, dbCreateLeave, dbDecideLeave, dbDeleteLeave, type LeaveWithEmployee } from '../supabase/leaves';
import {
  LEAVE_TYPES, LEAVE_STATUSES, calcLeaveDays, getAnnualLeaveBalance, yearsOfService, validateLeaveRequest,
  isApprovedOnDay, monthGrid, isoDate, buildLeaveRequestsCsv, buildLeaveBalancesCsv, downloadCsv,
} from '../lib/leave';

interface LeaveProps {
  employees: Employee[];
}

function esc(s: string | null | undefined): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: string): string {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

// Colour per leave type, used by the calendar chips + legend.
const LEAVE_COLORS: Record<string, string> = {
  Annual: '#0f766e', Sick: '#dc2626', Study: '#2563eb',
  Maternity: '#db2777', Paternity: '#7c3aed', Casual: '#ca8a04',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function LeavePage({ employees }: LeaveProps) {
  const { can } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'requests' | 'calendar' | 'balances'>('requests');
  const [leaves, setLeaves] = useState<LeaveWithEmployee[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | (typeof LEAVE_STATUSES)[number]>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [form, setForm] = useState({ employee_id: '', leave_type: 'Annual', start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    let cancelled = false;
    dbListLeaves().then(({ data }) => { if (!cancelled) setLeaves(data ?? []); });
    return () => { cancelled = true; };
  }, []);

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const today = new Date().toISOString().slice(0, 10);

  const approvedLeaves = useMemo(() => leaves.filter(l => l.status === 'approved'), [leaves]);
  const onLeaveToday = useMemo(() => approvedLeaves.filter(l => isApprovedOnDay(l, new Date())), [approvedLeaves]);

  const formDays = calcLeaveDays(form.start_date, form.end_date);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateLeaveRequest({
      employeeId: form.employee_id, leaveType: form.leave_type,
      startDate: form.start_date, endDate: form.end_date, reason: form.reason,
    });
    if (err) { toast(err, true); return; }
    setSaving(true);
    const { data, error } = await dbCreateLeave({
      employee_id: form.employee_id, leave_type: form.leave_type,
      start_date: form.start_date, end_date: form.end_date,
      days: formDays, reason: form.reason.trim(),
    });
    setSaving(false);
    if (error || !data) { toast('Failed to submit leave request.', true); return; }
    const empName = employees.find(em => em.id === form.employee_id)?.name || 'Officer';
    setLeaves(prev => [{
      ...data, employees: { name: empName, psn: employees.find(em => em.id === form.employee_id)?.psn ?? null },
    } as LeaveWithEmployee, ...prev]);
    setForm({ employee_id: '', leave_type: 'Annual', start_date: '', end_date: '', reason: '' });
    setShowForm(false);
    toast('✓ Leave request submitted.');
  };

  const handleDecide = async (id: string, status: 'approved' | 'rejected') => {
    const note = status === 'rejected'
      ? (window.prompt('Reason for rejection (optional):') ?? undefined)
      : undefined;
    const { error } = await dbDecideLeave(id, status, note);
    if (error) { toast('Failed to update request.', true); return; }
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status, decided_at: new Date().toISOString(), decided_note: note ?? null } : l));
    toast(status === 'approved' ? '✓ Leave approved.' : 'Leave request rejected.');
  };

  const handleDelete = async (l: LeaveWithEmployee) => {
    if (!window.confirm(`Delete this ${l.leave_type} request for ${l.employees?.name || 'this officer'}? This cannot be undone.`)) return;
    const { error } = await dbDeleteLeave(l.id);
    if (error) { toast('Failed to delete request.', true); return; }
    setLeaves(prev => prev.filter(x => x.id !== l.id));
    toast('Leave request deleted.');
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leaves.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return (l.employees?.name || '').toLowerCase().includes(q) || (l.employees?.psn || '').toLowerCase().includes(q);
    });
  }, [leaves, statusFilter, search]);

  // Balances: per-officer annual leave + days used by other types.
  const balances = useMemo(() => {
    return employees.map(em => {
      const approvedAnnual = leaves
        .filter(l => l.employee_id === em.id && l.leave_type === 'Annual' && l.status === 'approved')
        .reduce((s, l) => s + l.days, 0);
      const annual = getAnnualLeaveBalance(em, approvedAnnual);
      const byType: Record<string, number> = {};
      for (const t of LEAVE_TYPES) {
        if (t.key === 'Annual') continue;
        byType[t.key] = leaves
          .filter(l => l.employee_id === em.id && l.leave_type === t.key && l.status === 'approved')
          .reduce((s, l) => s + l.days, 0);
      }
      return { emp: em, annual, byType, years: yearsOfService(em.date_first_appt) };
    });
  }, [employees, leaves]);

  const balanceSearch = useMemo(() => {
    const q = search.toLowerCase();
    return balances.filter(b => !q || (b.emp.name || '').toLowerCase().includes(q) || (b.emp.psn || '').toLowerCase().includes(q));
  }, [balances, search]);

  // Calendar month navigation (offset can go before/after the current month).
  const calAnchor = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const calYear = calAnchor.getFullYear();
  const calMonth = calAnchor.getMonth();
  const calWeeks = useMemo(() => monthGrid(calYear, calMonth), [calYear, calMonth]);
  const calLabel = calAnchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const todayLocal = isoDate(new Date());

  const handleExportRequests = () => {
    downloadCsv(`AMEB_Leave_Requests_${today}.csv`, buildLeaveRequestsCsv(filtered.map(l => ({
      name: l.employees?.name || '', psn: l.employees?.psn ?? null,
      leave_type: l.leave_type, start_date: l.start_date, end_date: l.end_date,
      days: l.days, reason: l.reason, status: l.status, decided_note: l.decided_note,
    }))));
    toast(`✓ Exported ${filtered.length} request${filtered.length !== 1 ? 's' : ''} to CSV.`);
  };

  const handleExportBalances = () => {
    downloadCsv(`AMEB_Leave_Balances_${today}.csv`, buildLeaveBalancesCsv(balanceSearch.map(b => ({
      name: b.emp.name, psn: b.emp.psn, years: b.years,
      accrued: b.annual?.accrued ?? null, used: b.annual?.used ?? null, balance: b.annual?.balance ?? null,
      other: Object.entries(b.byType).filter(([, n]) => n > 0).map(([t, n]) => `${t}: ${n}`).join(' · '),
    }))));
    toast(`✓ Exported ${balanceSearch.length} balance${balanceSearch.length !== 1 ? 's' : ''} to CSV.`);
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--color-border)',
    background: active ? 'var(--color-primary)' : '#fff',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    whiteSpace: 'nowrap',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6,
    fontSize: 12, outline: 'none', background: 'var(--color-surface-warm)', color: 'var(--color-text-primary)',
  };

  const exportBtn: React.CSSProperties = {
    padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-secondary)',
    whiteSpace: 'nowrap',
  };

  const statusBadge = (s: string) => {
    if (s === 'approved') return { label: 'Approved', color: '#16a34a', bg: 'rgba(22,163,74,.1)' };
    if (s === 'rejected') return { label: 'Rejected', color: '#dc2626', bg: 'rgba(220,38,38,.1)' };
    return { label: 'Pending', color: '#ca8a04', bg: 'rgba(202,138,4,.12)' };
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {([['requests', `Requests (${pendingCount} pending)`], ['calendar', 'Leave Calendar'], ['balances', 'Annual Balances']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={chipStyle(tab === key)}>{label}</button>
        ))}
        {tab === 'requests' && can('employees.create') && (
          <button onClick={() => setShowForm(s => !s)} style={{ ...chipStyle(showForm), marginLeft: 'auto' }}>
            {showForm ? '✕ Close Form' : '＋ New Request'}
          </button>
        )}
      </div>

      {tab === 'requests' && (
        <>
          {/* Request form */}
          {showForm && (
            <form onSubmit={handleSubmit} style={{
              marginBottom: 14, padding: 14, border: '1px solid var(--color-border)', borderRadius: 10,
              background: '#fff', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Officer *</span>
                <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} style={inputStyle}>
                  <option value="">— Select officer —</option>
                  {employees.map(em => <option key={em.id} value={em.id}>{em.name}{em.psn ? ` (${em.psn})` : ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Leave Type *</span>
                <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))} style={inputStyle}>
                  {LEAVE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}{t.maxDays > 0 ? ` (max ${t.maxDays} days)` : ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Start Date *</span>
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>End Date *</span>
                <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Reason</span>
                <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional notes" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', paddingBottom: 8 }}>
                  {formDays > 0 ? `${formDays} working day${formDays !== 1 ? 's' : ''}` : '—'}
                </div>
                <button type="submit" disabled={saving}
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--color-primary)', color: '#fff' }}>
                  {saving ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          )}

          {/* Filters */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 14, padding: '11px 14px',
            background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, alignItems: 'flex-end', flexWrap: 'wrap',
          }}>
            <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Search</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Officer name or PSN…" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {([['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setStatusFilter(key)} style={chipStyle(statusFilter === key)}>{label}</button>
              ))}
            </div>
            <button onClick={handleExportRequests} style={exportBtn}>⬇ Export CSV</button>
          </div>

          {/* Requests table */}
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>{pendingCount}</strong> pending ·{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>{onLeaveToday.length}</strong> on leave today · showing{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>{filtered.length}</strong> requests
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Officer</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Dates</th>
                    <th style={thStyle}>Days</th>
                    <th style={thStyle}>Reason</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 44 }}>
                        <div style={{ fontSize: 38, marginBottom: 10 }}>🏖</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>No leave requests match.</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {leaves.length === 0 ? 'Submit a request to get started.' : 'Try a different filter or search.'}
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map((l, i) => {
                    const badge = statusBadge(l.status);
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {esc(l.employees?.name || '—')}
                          <div style={{ fontSize: 11, fontWeight: 400, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>{esc(l.employees?.psn || '—')}</div>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{esc(l.leave_type)}</td>
                        <td style={{ ...tdStyle, fontSize: 12 }}>{fmtDate(l.start_date)} → {fmtDate(l.end_date)}</td>
                        <td style={{ ...tdStyle, fontSize: 13, fontWeight: 700 }}>{l.days}</td>
                        <td style={{ ...tdStyle, fontSize: 12, color: 'var(--color-text-secondary)', maxWidth: 180 }}>{esc(l.reason || '—')}</td>
                        <td style={tdStyle}>
                          <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                          {l.decided_note && <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{esc(l.decided_note)}</div>}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            {l.status === 'pending' && can('leave.approve') && (
                              <>
                                <button onClick={() => handleDecide(l.id, 'approved')}
                                  style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--color-primary)', color: '#fff' }}>
                                  ✓ Approve
                                </button>
                                <button onClick={() => handleDecide(l.id, 'rejected')}
                                  style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(192,57,43,0.3)', background: '#fff', color: 'var(--color-error)' }}>
                                  ✕ Reject
                                </button>
                              </>
                            )}
                            {can('leave.approve') && (
                              <button onClick={() => handleDelete(l)}
                                title="Delete request"
                                style={{ padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-muted)' }}>
                                🗑
                              </button>
                            )}
                            {!(l.status === 'pending' && can('leave.approve')) && !can('leave.approve') && (
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'calendar' && (
        <>
          {/* On leave today */}
          <div style={{
            display: 'flex', gap: 12, marginBottom: 14, padding: '12px 14px', flexWrap: 'wrap',
            background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, alignItems: 'center',
          }}>
            <div style={{
              minWidth: 46, height: 46, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(15,118,110,.1)', color: '#0f766e', fontWeight: 800, fontSize: 16,
            }}>
              {onLeaveToday.length}
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>today</span>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Officers on approved leave today
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {onLeaveToday.length === 0
                  ? 'Nobody is on approved leave today.'
                  : onLeaveToday.map(l => `${l.employees?.name || 'Officer'} (${l.leave_type}, ${l.days}d)`).join(' · ')}
              </div>
            </div>
          </div>

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
            <button onClick={() => setMonthOffset(o => o - 1)} style={chipStyle(false)}>‹ Prev</button>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>{calLabel}</div>
            <button onClick={() => setMonthOffset(o => (o === 0 ? 0 : o + 1))} style={chipStyle(false)}>Next ›</button>
          </div>

          {/* Month grid */}
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--color-surface-warm)', borderBottom: '1px solid var(--color-border)' }}>
              {WEEKDAYS.map(d => (
                <div key={d} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{d}</div>
              ))}
            </div>
            {calWeeks.map((week, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {week.map((day, di) => {
                  if (!day) return <div key={di} style={{ minHeight: 84, borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-warm)' }} />;
                  const dayLeaves = approvedLeaves.filter(l => isApprovedOnDay(l, day));
                  const isToday = isoDate(day) === todayLocal;
                  return (
                    <div key={di} style={{
                      minHeight: 84, padding: 5, borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)',
                      background: isToday ? 'rgba(15,118,110,.06)' : '#fff',
                      boxShadow: isToday ? 'inset 0 0 0 2px rgba(15,118,110,.35)' : undefined,
                      display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)', alignSelf: 'flex-end' }}>{day.getDate()}</div>
                      {dayLeaves.slice(0, 2).map(l => (
                        <div key={l.id} title={`${l.employees?.name || 'Officer'} — ${l.leave_type} (${l.days} days)`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4, padding: '2px 5px', borderRadius: 5, fontSize: 10,
                            fontWeight: 600, color: '#fff', background: LEAVE_COLORS[l.leave_type] || '#64748b', overflow: 'hidden', whiteSpace: 'nowrap',
                          }}>
                          <span>{initials(l.employees?.name || '?')}</span>
                        </div>
                      ))}
                      {dayLeaves.length > 2 && (
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', paddingLeft: 2 }}>+{dayLeaves.length - 2} more</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* Legend */}
            <div style={{ padding: '9px 14px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {LEAVE_TYPES.map(t => (
                <span key={t.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: LEAVE_COLORS[t.key] || '#64748b', display: 'inline-block' }} />
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'balances' && (
        <>
          <div style={{
            display: 'flex', gap: 8, marginBottom: 14, padding: '11px 14px',
            background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, alignItems: 'flex-end', flexWrap: 'wrap',
          }}>
            <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Search</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Officer name or PSN…" style={inputStyle} />
            </div>
            <button onClick={handleExportBalances} style={exportBtn}>⬇ Export CSV</button>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Annual leave: <strong style={{ color: 'var(--color-text-primary)' }}>12 working days</strong> per year of service, capped at{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>36 days</strong>.
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Officer</th>
                    <th style={thStyle}>Service</th>
                    <th style={thStyle}>Accrued</th>
                    <th style={thStyle}>Used</th>
                    <th style={thStyle}>Balance</th>
                    <th style={thStyle}>Other (approved)</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceSearch.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 44 }}>
                        <div style={{ fontSize: 38, marginBottom: 10 }}>📅</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>No officers match.</div>
                      </td>
                    </tr>
                  ) : balanceSearch.map((b, i) => (
                    <tr key={b.emp.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {esc(b.emp.name)}
                        <div style={{ fontSize: 11, fontWeight: 400, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>{esc(b.emp.psn || '—')}</div>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 13 }}>{b.years !== null ? `${b.years} yrs` : '—'}</td>
                      <td style={{ ...tdStyle, fontSize: 13 }}>{b.annual ? b.annual.accrued : '—'}</td>
                      <td style={{ ...tdStyle, fontSize: 13 }}>{b.annual ? b.annual.used : '—'}</td>
                      <td style={{ ...tdStyle, fontSize: 13, fontWeight: 700 }}>
                        {b.annual ? (
                          <span style={b.annual.balance <= 3 ? { color: 'var(--color-error)' } : { color: 'var(--color-primary)' }}>
                            {b.annual.balance} day{b.annual.balance !== 1 ? 's' : ''}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        {Object.entries(b.byType).filter(([, n]) => n > 0).map(([t, n]) => `${t}: ${n}`).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
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
