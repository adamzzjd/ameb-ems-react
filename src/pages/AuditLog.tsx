import { useState, useEffect, useCallback, useMemo } from 'react';
import { dbLoadAuditLog } from '../supabase/audit';
import type { AuditLog } from '../types';

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await dbLoadAuditLog();
    if (error) {
      setLoadError(
        error.message.includes('audit_log')
          ? 'The audit_log table does not exist yet — run supabase/setup_audit.sql in the Supabase SQL Editor.'
          : 'Failed to load the audit log: ' + error.message
      );
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const tables = useMemo(
    () => [...new Set(entries.map(e => e.table_name))].sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e => {
      if (tableFilter && e.table_name !== tableFilter) return false;
      if (!q) return true;
      return (
        (e.user_email || '').toLowerCase().includes(q) ||
        (e.user_role || '').toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.table_name.toLowerCase().includes(q) ||
        (e.row_id || '').toLowerCase().includes(q) ||
        JSON.stringify(e.details).toLowerCase().includes(q)
      );
    });
  }, [entries, search, tableFilter]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
        <div style={{ width: 24, height: 24, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 16px' }} />
        Loading audit log…
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 680, marginBottom: 14 }}>
        Accountability trail of every admin/editor write — who did what, when, and on which record.
        Append-only; readable by Super Administrators only. The most recent 500 entries are shown.
      </div>

      {loadError && (
        <div style={{
          background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.15)',
          color: 'var(--color-error)', padding: '12px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14,
        }}>
          {loadError}
        </div>
      )}

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14, padding: '11px 14px',
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Search</div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Email, action, table, details…"
            style={{ padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%', background: 'var(--color-surface-warm)' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Table</div>
          <select
            value={tableFilter} onChange={e => setTableFilter(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, outline: 'none', background: 'var(--color-surface-warm)', minWidth: 160 }}
          >
            <option value="">All tables</option>
            {tables.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(''); setTableFilter(''); }} style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'transparent', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
          Clear
        </button>
        <button onClick={loadData} style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'var(--color-primary)', color: '#fff', whiteSpace: 'nowrap' }}>
          ⟳ Refresh
        </button>
      </div>

      <div style={{
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Showing <strong style={{ color: 'var(--color-text-primary)' }}>{filtered.length}</strong> of {entries.length} logged action{entries.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>When</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Table</th>
                <th style={thStyle}>Details</th>
                <th style={thStyle}>Row ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>🕵️</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 5 }}>
                      {entries.length > 0 ? 'No actions match your filters.' : 'No audit entries yet.'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {entries.length > 0
                        ? <span onClick={() => { setSearch(''); setTableFilter(''); }} style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}>Clear filters</span>
                        : 'Actions will appear here as soon as records are created, edited, deleted or imported.'}
                    </div>
                  </td>
                </tr>
              ) : filtered.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                  <td style={{ ...tdStyle, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(e.created_at).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {esc(e.user_email || '—')}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>
                    {e.user_role ? <RoleChip role={e.user_role} /> : '—'}
                  </td>
                  <td style={tdStyle}>
                    <ActionBadge action={e.action} />
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{esc(e.table_name)}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>
                    {Object.keys(e.details || {}).length > 0
                      ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          {esc(JSON.stringify(e.details))}
                        </span>
                      : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>
                    {e.row_id
                      ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }} title={e.row_id}>
                          {e.row_id.length > 12 ? e.row_id.slice(0, 12) + '…' : e.row_id}
                        </span>
                      : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
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

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const ACTION_COLORS: Record<string, string> = {
  create: '#16a34a',
  update: '#2563eb',
  delete: '#dc2626',
  import: '#7c3aed',
  reset: '#ea580c',
  assign: '#0d9488',
  mark_read: '#64748b',
};

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] || '#64748b';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px',
      background: color + '1a', color,
    }}>
      {action}
    </span>
  );
}

function RoleChip({ role }: { role: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11,
      fontWeight: 700, background: 'rgba(100,116,139,.12)', color: 'var(--color-text-secondary)',
    }}>
      {role}
    </span>
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
