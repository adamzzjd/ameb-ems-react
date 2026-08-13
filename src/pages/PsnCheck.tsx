/* PSN Check & Register — the admin path for PSNs not yet in the register.
   Paste a list of staff numbers; the page shows which already exist and lets
   you register the new ones as minimal employee records (name + PSN), which
   can be completed later through the standard employee form. */

import { useState } from 'react';
import { dbLoadAll, dbSave } from '../supabase/employees';
import { useToast } from '../hooks/useToast';
import { Search, UserPlus, CheckCircle2, ClipboardPaste } from 'lucide-react';

interface CheckRow {
  psn: string;
  status: 'found' | 'new' | 'registered' | 'error';
  officerName?: string;
  nameInput: string;
}

export function PsnCheckPage() {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [rows, setRows] = useState<CheckRow[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [busyPsn, setBusyPsn] = useState<string | null>(null);

  const handleCheck = async () => {
    const lines = input
      .split(/\n|,|;/)
      .map(l => l.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (lines.length === 0) { toast('Paste at least one PSN to check.', true); return; }

    setChecking(true);
    const { data: employees } = await dbLoadAll();
    setChecking(false);

    const byPsn = new Map<string, { name: string }>();
    for (const e of employees ?? []) {
      if (e.psn) byPsn.set(e.psn.trim().toLowerCase(), { name: e.name });
    }

    const seen = new Set<string>();
    const result: CheckRow[] = [];
    for (const line of lines) {
      const key = line.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const match = byPsn.get(key);
      if (match) {
        result.push({ psn: line, status: 'found', officerName: match.name, nameInput: '' });
      } else {
        result.push({ psn: line, status: 'new', nameInput: '' });
      }
    }
    setRows(result);
    const found = result.filter(r => r.status === 'found').length;
    const fresh = result.length - found;
    toast(`Checked ${result.length} PSN${result.length !== 1 ? 's' : ''} — ${found} found, ${fresh} new.`);
  };

  const updateName = (psn: string, name: string) => {
    setRows(prev => (prev ?? []).map(r => (r.psn === psn ? { ...r, nameInput: name } : r)));
  };

  const registerOne = async (row: CheckRow) => {
    const name = row.nameInput.trim();
    if (!name) { toast(`Enter a name for ${row.psn} before registering.`, true); return; }
    setBusyPsn(row.psn);
    const { data, error } = await dbSave({ name, psn: row.psn, remarks: 'Registered via PSN check.' });
    setBusyPsn(null);
    if (error) {
      toast(`Failed to register ${row.psn}: ${error.message}`, true);
      setRows(prev => (prev ?? []).map(r => (r.psn === row.psn ? { ...r, status: 'error' } : r)));
      return;
    }
    toast(`✓ ${name} registered.`);
    setRows(prev => (prev ?? []).map(r => (r.psn === row.psn ? { ...r, status: 'registered', officerName: data?.name ?? name } : r)));
  };

  const registerAll = async () => {
    if (!rows) return;
    const newRows = rows.filter(r => r.status === 'new');
    const missing = newRows.filter(r => !r.nameInput.trim());
    if (missing.length > 0) {
      toast(`Enter a name for ${missing.length} new PSN${missing.length !== 1 ? 's' : ''} before registering all.`, true);
      return;
    }
    for (const r of newRows) {
      await registerOne(r);
    }
  };

  const counts = rows ? {
    found: rows.filter(r => r.status === 'found').length,
    new: rows.filter(r => r.status === 'new').length,
    registered: rows.filter(r => r.status === 'registered').length,
  } : null;

  const textareaStyle: React.CSSProperties = {
    width: '100%', minHeight: 120, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)',
    fontSize: 13, outline: 'none', resize: 'vertical', background: 'var(--color-surface)', color: 'var(--color-text-primary)',
    fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6,
  };
  const thStyle: React.CSSProperties = {
    padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.4px',
    background: 'var(--color-surface-warm)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = { padding: '9px 12px', fontSize: 13, verticalAlign: 'middle' };

  return (
    <div>
      <div className="text-[13px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Paste the staff numbers you want to check — the page finds which are already in
        the register and lets you register the new ones so they can use the self-service
        portal. You can fill in full details later via <strong>All Employees → Edit</strong>.
      </div>

      {/* Paste box */}
      <div className="rounded-xl border p-4 mb-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Staff numbers (one per line, or comma/semicolon separated)
        </label>
        <textarea value={input} onChange={e => setInput(e.target.value)} style={textareaStyle}
          placeholder={'PS/AM/0001\nps/am/0002\nPS/AM/0003'} />
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={handleCheck} disabled={checking}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white border-none cursor-pointer disabled:opacity-60"
            style={{ background: 'var(--color-primary)' }}>
            <Search size={14} /> {checking ? 'Checking…' : 'Check PSNs'}
          </button>
          {counts && counts.new > 0 && (
            <button onClick={registerAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white border-none cursor-pointer"
              style={{ background: '#16a34a' }}>
              <UserPlus size={14} /> Register all {counts.new} new
            </button>
          )}
        </div>
        {counts && (
          <div className="flex flex-wrap gap-4 mt-3 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            <span><strong style={{ color: '#16a34a' }}>{counts.found}</strong> already in register</span>
            <span><strong style={{ color: 'var(--color-warning)' }}>{counts.new}</strong> new — need names</span>
            <span><strong style={{ color: 'var(--color-text-primary)' }}>{counts.registered}</strong> registered just now</span>
          </div>
        )}
      </div>

      {/* Results */}
      {rows === null ? (
        <div className="rounded-xl border p-10 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🗂</div>
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>No PSNs checked yet</div>
          <div className="text-[12.5px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Paste your list above and click <strong>Check PSNs</strong>.
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border p-10 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <ClipboardPaste size={26} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
          <div className="text-[13.5px]" style={{ color: 'var(--color-text-muted)' }}>Nothing to check — add some PSNs above.</div>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: '#fff', borderColor: 'var(--color-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>PSN</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Officer</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.psn} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{r.psn}</td>
                  <td style={tdStyle}>
                    {r.status === 'found' && <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>In register</span>}
                    {r.status === 'new' && <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(198,138,0,0.14)', color: 'var(--color-warning)' }}>New</span>}
                    {r.status === 'registered' && <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}><CheckCircle2 size={11} /> Registered</span>}
                    {r.status === 'error' && <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(192,57,43,0.1)', color: 'var(--color-error)' }}>Failed</span>}
                  </td>
                  <td style={tdStyle}>
                    {r.status === 'found' || r.status === 'registered' ? (
                      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.officerName}</span>
                    ) : (
                      <input value={r.nameInput} onChange={e => updateName(r.psn, e.target.value)}
                        placeholder="Officer full name"
                        className="w-full max-w-[220px] h-9 px-3 rounded-lg border text-[13px] outline-none"
                        style={{ background: '#fff', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                    )}
                  </td>
                  <td style={tdStyle}>
                    {r.status === 'new' && (
                      <button onClick={() => registerOne(r)} disabled={busyPsn === r.psn}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white border-none cursor-pointer disabled:opacity-60"
                        style={{ background: 'var(--color-primary)' }}>
                        <UserPlus size={13} /> {busyPsn === r.psn ? 'Registering…' : 'Register'}
                      </button>
                    )}
                    {r.status === 'error' && (
                      <button onClick={() => registerOne(r)}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white border-none cursor-pointer"
                        style={{ background: 'var(--color-primary)' }}>
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
