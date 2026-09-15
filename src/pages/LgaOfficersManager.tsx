import { useState, useEffect, useCallback, useMemo } from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { LGAs } from '../data/constants';
import type { Employee, LgaAreaOfficer } from '../types';
import {
  dbLoadLgaAreaOfficers, dbSetLgaAreaOfficer, dbRemoveLgaAreaOfficer,
} from '../supabase/lgaOfficers';
import { dbLoadAll } from '../supabase/employees';
import { printLgaAreaOfficers } from '../utils/print';
import { useToast } from '../hooks/useToast';

interface LgaOfficersManagerProps {
  onNavigate?: (page: string) => void;
  canManage?: boolean;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Searchable single-select picker over the staff register ──────────────────
function StaffPicker({
  employees, selected, onChange,
}: {
  employees: Employee[];
  selected: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [showList, setShowList] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return employees.filter(e =>
      !q ||
      (e.name || '').toLowerCase().includes(q) ||
      (e.psn || '').toLowerCase().includes(q) ||
      (e.cadre || '').toLowerCase().includes(q) ||
      (e.station || '').toLowerCase().includes(q) ||
      (e.lga || '').toLowerCase().includes(q)
    );
  }, [employees, query]);

  const chosen = employees.find(e => e.id === selected);

  return (
    <div onBlur={() => setTimeout(() => setShowList(false), 150)}>
      {chosen ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', marginBottom: 6, borderRadius: 8, background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.25)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{esc(chosen.name)}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {chosen.psn ? `PSN ${esc(chosen.psn)} · ` : ''}{esc(chosen.cadre || '—')} · {esc(chosen.station || '—')}
            </div>
          </div>
          <span onClick={() => onChange('')} title="Clear" style={{ cursor: 'pointer', fontWeight: 800, fontSize: 15, lineHeight: 1, color: 'var(--color-text-muted)' }}>×</span>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>No staff member selected yet.</div>
      )}

      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setShowList(true); }}
        onFocus={() => setShowList(true)}
        placeholder="Search staff by name, PSN, cadre or station…"
        style={inputStyle}
      />
      {showList && (
        <div style={{ marginTop: 4, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
              No staff match “{esc(query)}”. Officers must already exist in the staff register.
            </div>
          ) : filtered.slice(0, 60).map(e => {
            const checked = e.id === selected;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => { onChange(e.id); setShowList(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13, border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  background: checked ? 'rgba(22,163,74,.08)' : '#fff',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{esc(e.name)}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {e.psn ? `PSN ${esc(e.psn)} · ` : ''}{esc(e.cadre || '—')} · {esc(e.station || '—')}
                  </div>
                </div>
                {checked && <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>}
              </button>
            );
          })}
          {filtered.length > 60 && (
            <div style={{ padding: '7px 12px', fontSize: 11, color: 'var(--color-text-muted)' }}>
              Showing first 60 of {filtered.length} — refine your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LgaOfficersManager({ onNavigate, canManage }: LgaOfficersManagerProps) {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [officers, setOfficers] = useState<LgaAreaOfficer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Assign modal state
  const [assignLga, setAssignLga] = useState<string | null>(null);
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Remove confirmation
  const [showRemove, setShowRemove] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [empRes, offRes] = await Promise.all([
      dbLoadAll(),
      dbLoadLgaAreaOfficers(),
    ]);
    if (!empRes.error && empRes.data) setEmployees(empRes.data);
    if (!offRes.error && offRes.data) setOfficers(offRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // lga → assignment row
  const officerByLga = useMemo(() => {
    const map = new Map<string, LgaAreaOfficer>();
    officers.forEach(o => map.set(o.lga, o));
    return map;
  }, [officers]);

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => map.set(e.id, e));
    return map;
  }, [employees]);

  // Every LGA, with its (optional) officer — the register always lists all 21.
  const rows = useMemo(() => {
    return LGAs.map(lga => ({
      lga,
      officer: officerByLga.get(lga) || null,
      employee: (() => {
        const o = officerByLga.get(lga);
        return o?.employee_id ? employeeById.get(o.employee_id) || null : null;
      })(),
    }));
  }, [officerByLga, employeeById]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      if (statusFilter === 'assigned' && !r.officer) return false;
      if (statusFilter === 'unassigned' && r.officer) return false;
      if (!q) return true;
      return (
        r.lga.toLowerCase().includes(q) ||
        (r.employee?.name || '').toLowerCase().includes(q) ||
        (r.employee?.psn || '').toLowerCase().includes(q) ||
        (r.employee?.cadre || '').toLowerCase().includes(q) ||
        (r.employee?.station || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const assignedCount = rows.filter(r => r.officer).length;

  const openAssign = (lga: string) => {
    const existing = officerByLga.get(lga);
    setAssignLga(lga);
    setFormEmployeeId(existing?.employee_id || '');
    setFormRemarks(existing?.remarks || '');
    setFormError('');
  };

  const handleSave = async () => {
    if (!canManage) { toast('Admin access required to manage area officers.', true); return; }
    if (!assignLga) return;
    if (!formEmployeeId) { setFormError('Select a staff member from the register to assign.'); return; }

    setSaving(true);
    const { data, error } = await dbSetLgaAreaOfficer(assignLga, formEmployeeId, formRemarks.trim());
    if (error) { toast('Assignment failed: ' + error.message, true); setSaving(false); return; }
    if (data) setOfficers(prev => [...prev.filter(o => o.lga !== data.lga), data]);
    toast(`✓ ${employeeById.get(formEmployeeId)?.name || 'Officer'} assigned to ${assignLga}.`);
    setSaving(false);
    setAssignLga(null);
  };

  const handleRemove = async () => {
    if (!showRemove) return;
    if (!canManage) { toast('Admin access required to manage area officers.', true); return; }
    const { error } = await dbRemoveLgaAreaOfficer(showRemove);
    if (error) { toast('Remove failed: ' + error.message, true); return; }
    setOfficers(prev => prev.filter(o => o.id !== showRemove));
    toast('Area officer unassigned.');
    setShowRemove(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
        <div style={{ width: 24, height: 24, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 16px' }} />
        Loading area officers…
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 640 }}>
          Local Government Area Officers across the 21 LGAs of Adamawa State. Each LGA has one
          area officer, assigned from the{' '}
          <span style={{ color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('employees')}>
            staff register
          </span>{' '}
          — the officer's details are read live from their staff record.
        </div>
        {rows.length > 0 && (
          <button
            onClick={() => printLgaAreaOfficers(rows, 'LGA Area Officers', `${assignedCount} of ${rows.length} LGAs covered`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid var(--color-border)', cursor: 'pointer',
              background: 'transparent', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap',
            }}
          >
            <Printer size={14} /> Print
          </button>
        )}
      </div>

      {/* Coverage summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div style={statCardStyle}>
          <div style={statLabelStyle}>LGAs Covered</div>
          <div style={{ ...statValueStyle, color: '#16a34a' }}>{assignedCount}</div>
          <div style={statSubStyle}>of {rows.length} LGAs</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabelStyle}>Unassigned</div>
          <div style={{ ...statValueStyle, color: rows.length - assignedCount > 0 ? '#d97706' : 'var(--color-text-primary)' }}>
            {rows.length - assignedCount}
          </div>
          <div style={statSubStyle}>awaiting an officer</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabelStyle}>Staff Register</div>
          <div style={statValueStyle}>{employees.length}</div>
          <div style={statSubStyle}>officers available</div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14, padding: '11px 14px',
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={filterLabelStyle}>Search</div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="LGA, officer name, PSN, cadre, station…"
            style={{ padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%', background: 'var(--color-surface-warm)' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={filterLabelStyle}>Status</div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} style={{ ...selectStyle, width: 160 }}>
            <option value="all">All LGAs</option>
            <option value="assigned">Assigned only</option>
            <option value="unassigned">Unassigned only</option>
          </select>
        </div>
        <button
          onClick={() => { setSearch(''); setStatusFilter('all'); }}
          style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'transparent', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
        >
          Clear
        </button>
      </div>

      <div style={{
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Showing <strong style={{ color: 'var(--color-text-primary)' }}>{filtered.length}</strong> of {rows.length} LGA{rows.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Local Government Area</th>
                <th style={thStyle}>Area Officer</th>
                <th style={thStyle}>PSN</th>
                <th style={thStyle}>Cadre</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Station</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>🗺</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 5 }}>
                      No LGAs match your filter.
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      <span
                        onClick={() => { setSearch(''); setStatusFilter('all'); }}
                        style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Clear filters
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((r, i) => {
                const emp = r.employee;
                return (
                  <tr key={r.lga} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--color-text-primary)' }}>{esc(r.lga)}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>
                      {emp ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                          <span style={{ fontWeight: 600 }}>{esc(emp.name)}</span>
                        </span>
                      ) : r.officer?.employee_id ? (
                        <span style={{ color: '#d97706', fontSize: 12 }}>Officer record not found in staff register</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>— Unassigned —</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{esc(emp?.psn || '—')}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{esc(emp?.cadre || '—')}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{esc(emp?.phone || '—')}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{esc(emp?.station || '—')}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {canManage && (
                          <button
                            onClick={() => openAssign(r.lga)}
                            title={r.officer ? 'Change officer' : 'Assign officer'}
                            style={{
                              padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              border: '1px solid var(--color-border)', cursor: 'pointer',
                              background: r.officer ? 'transparent' : 'var(--color-primary)',
                              color: r.officer ? 'var(--color-text-secondary)' : '#fff', whiteSpace: 'nowrap',
                            }}
                          >
                            {r.officer ? '🔄 Change' : '+ Assign'}
                          </button>
                        )}
                        {canManage && r.officer && (
                          <button
                            onClick={() => setShowRemove(r.officer!.id)}
                            title="Unassign"
                            style={{ ...actionBtnStyle, color: 'var(--color-error)' }}
                          >
                            🗑
                          </button>
                        )}
                        {!canManage && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign / Change Modal */}
      <Modal
        open={!!assignLga}
        onClose={() => setAssignLga(null)}
        title={officerByLga.get(assignLga || '') ? 'Change Area Officer' : 'Assign Area Officer'}
        subtitle={assignLga ? `${assignLga} Local Government Area — select a staff member` : ''}
        maxWidth="560px"
        footer={
          <>
            <button onClick={() => setAssignLga(null)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : '💾 Save Assignment'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {formError && (
            <div style={{ background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.15)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
              {formError}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>
              Area Officer <span style={{ color: 'var(--color-error)' }}>*</span>{' '}
              <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>(from the staff register)</span>
            </label>
            <StaffPicker employees={employees} selected={formEmployeeId} onChange={id => { setFormEmployeeId(id); setFormError(''); }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Remarks</label>
            <textarea
              value={formRemarks} onChange={e => setFormRemarks(e.target.value)} rows={2}
              placeholder="Optional notes…"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }}
            />
          </div>
        </div>
      </Modal>

      {/* Remove Confirmation */}
      <Modal
        open={!!showRemove}
        onClose={() => setShowRemove(null)}
        maxWidth="420px"
        footer={
          <>
            <button onClick={() => setShowRemove(null)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleRemove} style={{ ...primaryBtnStyle, background: 'var(--color-error)' }}>
              Unassign Officer
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: 8 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🗑</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Remove this area officer?</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {officers.find(o => o.id === showRemove)?.lga || 'Unknown LGA'} will be left without an area officer.
          </div>
        </div>
      </Modal>
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

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 6,
  fontSize: 13, outline: 'none', width: '100%', background: '#fff',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 6,
  fontSize: 13, outline: 'none', background: '#fff',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  border: '1px solid var(--color-border)', cursor: 'pointer',
  background: 'transparent', color: 'var(--color-text-secondary)',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  border: 'none', cursor: 'pointer', background: 'var(--color-primary)', color: '#fff',
};

const statCardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.4px',
};

const statValueStyle: React.CSSProperties = {
  fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 2,
};

const statSubStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1,
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.3px',
};
