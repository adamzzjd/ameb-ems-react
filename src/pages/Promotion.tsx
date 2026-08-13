import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { Employee, PromotionRecord } from '../types';
import { dbListPromotions, dbAddPromotion, dbDeletePromotion } from '../supabase/promotions';
import {
  getPromotionInfo, nextGrade, PROMOTION_INTERVAL_YEARS, DUE_SOON_MONTHS,
} from '../lib/promotion';

interface PromotionProps {
  employees: Employee[];
  onViewEmployee: (id: string) => void;
}

type StatusFilter = 'all' | 'due' | 'overdue' | 'ontrack';

function esc(s: string | null | undefined): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PromotionPage({ employees, onViewEmployee }: PromotionProps) {
  const { can } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [historyEmp, setHistoryEmp] = useState<Employee | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ promoted_on: '', from_grade: '', to_grade: '', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dbListPromotions().then(({ data, error }) => {
      if (cancelled) return;
      if (error) setLoadError(true);
      else setPromotions(data ?? []);
    });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    return employees
      .map(e => ({ emp: e, info: getPromotionInfo(e), next: nextGrade(e.grade) }))
      .sort((a, b) => {
        const am = a.info.monthsUntilPromotion ?? Infinity;
        const bm = b.info.monthsUntilPromotion ?? Infinity;
        return am - bm;
      });
  }, [employees]);

  const counts = useMemo(() => ({
    total: employees.length,
    due: rows.filter(r => r.info.dueSoon).length,
    overdue: rows.filter(r => r.info.overdue).length,
    recorded: promotions.length,
  }), [employees, rows, promotions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      if (status === 'due' && !r.info.dueSoon) return false;
      if (status === 'overdue' && !r.info.overdue) return false;
      if (status === 'ontrack' && !r.info.onTrack) return false;
      if (!q) return true;
      return (
        (r.emp.name || '').toLowerCase().includes(q) ||
        (r.emp.psn || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, status]);

  const empPromotions = useMemo(() => {
    if (!historyEmp) return [];
    return promotions.filter(p => p.employee_id === historyEmp.id)
      .sort((a, b) => b.promoted_on.localeCompare(a.promoted_on));
  }, [promotions, historyEmp]);

  const statusBadge = (info: ReturnType<typeof getPromotionInfo>) => {
    if (info.overdue) return { label: 'Overdue', color: '#dc2626', bg: 'rgba(220,38,38,.1)' };
    if (info.dueSoon) return { label: `Due ≤ ${DUE_SOON_MONTHS} mo`, color: '#ea580c', bg: 'rgba(234,88,12,.1)' };
    if (info.onTrack) return { label: 'On track', color: '#16a34a', bg: 'rgba(22,163,74,.1)' };
    return { label: 'No date', color: '#64748b', bg: 'rgba(100,116,139,.12)' };
  };

  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyEmp) return;
    if (!form.promoted_on || !form.to_grade.trim()) {
      toast('Promotion date and new grade are required.', true);
      return;
    }
    setSaving(true);
    const { data, error } = await dbAddPromotion({
      employee_id: historyEmp.id,
      promoted_on: form.promoted_on,
      from_grade: form.from_grade.trim() || null,
      to_grade: form.to_grade.trim(),
      reference: form.reference.trim() || null,
      notes: form.notes.trim(),
    });
    setSaving(false);
    if (error) { toast('Failed to save promotion.', true); return; }
    if (data) setPromotions(prev => [data, ...prev]);
    setForm({ promoted_on: '', from_grade: '', to_grade: '', reference: '', notes: '' });
    setAdding(false);
    toast(`✓ Promotion to ${data?.to_grade} recorded.`);
  };

  const handleDelete = async (id: string) => {
    const { error } = await dbDeletePromotion(id);
    if (error) { toast('Failed to delete promotion.', true); return; }
    setPromotions(prev => prev.filter(p => p.id !== id));
    toast('Promotion record deleted.');
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
    { label: `Due ≤ ${DUE_SOON_MONTHS} mo`, value: counts.due, icon: '⏰' },
    { label: 'Overdue', value: counts.overdue, icon: '🔔' },
    { label: 'Promotions Recorded', value: counts.recorded, icon: '📜' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6,
    fontSize: 12, outline: 'none', background: 'var(--color-surface-warm)', color: 'var(--color-text-primary)',
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 720, marginBottom: 14 }}>
        Officers become due for their next grade{' '}
        <strong>{PROMOTION_INTERVAL_YEARS} years</strong> after their present appointment date. The status is a
        projection only — record actual promotions from the officer's history to keep the official record.
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12, padding: '13px 15px' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>{s.value}</div>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or PSN…" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {([['all', 'All'], ['due', `Due ≤ ${DUE_SOON_MONTHS} mo`], ['overdue', 'Overdue'], ['ontrack', 'On track']] as [StatusFilter, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setStatus(key)} style={chipStyle(status === key)}>{label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
        <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Showing <strong style={{ color: 'var(--color-text-primary)' }}>{filtered.length}</strong> of {rows.length} officers
            {loadError && <span style={{ color: 'var(--color-error)' }}> · promotion history unavailable</span>}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Officer</th>
                <th style={thStyle}>Grade</th>
                <th style={thStyle}>Next Grade</th>
                <th style={thStyle}>Present Appt</th>
                <th style={thStyle}>Next Promotion</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>History</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>📈</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>No officers match.</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {employees.length === 0 ? 'Add employees to see promotion projections.' : 'Try a different search or status filter.'}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(({ emp, info, next }, i) => {
                const badge = statusBadge(info);
                const historyCount = promotions.filter(p => p.employee_id === emp.id).length;
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)', cursor: 'pointer' }}
                    onClick={() => onViewEmployee(emp.id)}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {esc(emp.name)}
                      <div style={{ fontSize: 11, fontWeight: 400, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>{esc(emp.psn || '—')}</div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{esc(emp.grade || '—')}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{next ? esc(next) : '—'}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{esc(emp.date_present_appt || '—')}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{fmtDate(info.promotionDate)}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setHistoryEmp(emp); }}
                        style={{ padding: '4px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-secondary)' }}
                      >
                        {historyCount > 0 ? `📜 ${historyCount}` : '＋ Add'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* History / add-promotion modal */}
      {historyEmp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setHistoryEmp(null)}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, maxWidth: 560, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 22 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>{esc(historyEmp.name)}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  {esc(historyEmp.psn || '—')} · {esc(historyEmp.grade || 'grade not set')}
                </div>
              </div>
              <button onClick={() => setHistoryEmp(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
            </div>

            {/* Add promotion */}
            {can('employees.edit') && (
              adding ? (
                <form onSubmit={handleAddPromotion} style={{ margin: '14px 0', padding: 14, border: '1px solid var(--color-border)', borderRadius: 10, background: 'var(--color-surface-warm)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Promotion Date *</span>
                      <input type="date" value={form.promoted_on} onChange={e => setForm(f => ({ ...f, promoted_on: e.target.value }))} style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>To Grade *</span>
                      <input value={form.to_grade} placeholder="GL 09" onChange={e => setForm(f => ({ ...f, to_grade: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>From Grade</span>
                      <input value={form.from_grade} placeholder="GL 08" onChange={e => setForm(f => ({ ...f, from_grade: e.target.value }))} style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Reference</span>
                      <input value={form.reference} placeholder="Letter / committee ref." onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Notes</span>
                    <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional remarks" style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--color-primary)', color: '#fff' }}>
                      {saving ? 'Saving…' : 'Record Promotion'}
                    </button>
                    <button type="button" onClick={() => { setAdding(false); setForm({ promoted_on: '', from_grade: '', to_grade: '', reference: '', notes: '' }); }}
                      style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-secondary)' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setAdding(true)} style={{ margin: '14px 0', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--color-primary)', color: '#fff' }}>
                  ＋ Record Promotion
                </button>
              )
            )}

            {/* History list */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
              Promotion History ({empPromotions.length})
            </div>
            {empPromotions.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '18px 0', textAlign: 'center' }}>
                No promotions recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {empPromotions.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 11, border: '1px solid var(--color-border)', borderRadius: 10, background: '#fff' }}>
                    <div style={{ fontSize: 18 }}>🎖</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {p.from_grade ? `${esc(p.from_grade)} → ` : ''}{esc(p.to_grade)}
                        <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 8 }}>{fmtDate(new Date(p.promoted_on + 'T00:00:00'))}</span>
                      </div>
                      {p.reference && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Ref: {esc(p.reference)}</div>}
                      {p.notes && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{esc(p.notes)}</div>}
                    </div>
                    {can('employees.delete') && (
                      <button onClick={() => handleDelete(p.id)} title="Delete this promotion record"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-error)', padding: 2 }}>
                        🗑
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
