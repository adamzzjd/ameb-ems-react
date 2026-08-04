import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/ui/Modal';
import { LGAs } from '../data/constants';
import type { Station } from '../types';
import { dbLoadStations, dbAddStation, dbUpdateStation, dbDeleteStation, dbBulkInsertStations } from '../supabase/stations';
import { STATIONS } from '../data/constants';
import { useToast } from '../hooks/useToast';

interface StationsManagerProps {
  onNavigate?: (page: string) => void;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const STATION_TYPES = [
  'Headquarters', 'Zonal Office', 'LGA Office',
  'Learning Centre', 'MDA (Posted)', 'Other',
];

export function StationsManager({ onNavigate: _onNavigate }: StationsManagerProps) {
  const { toast } = useToast();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [formName, setFormName] = useState('');
  const [formLga, setFormLga] = useState('');
  const [formType, setFormType] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await dbLoadStations();
    if (!error && data && data.length > 0) {
      setStations(data);
    } else {
      // Seed defaults
      try {
        const seedRecords = [...STATIONS].map(name => ({ name, lga: '', type: '' }));
        const { data: seeded, error: seedErr } = await dbBulkInsertStations(seedRecords);
        if (!seedErr && seeded) {
          setStations(seeded);
        } else {
          setStations(seedRecords as Station[]);
        }
      } catch {
        setStations([...STATIONS].map((s, i) => ({ id: String(i), name: s, lga: '', type: '' } as Station)));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormLga('');
    setFormType('');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (s: Station) => {
    setEditing(s);
    setFormName(s.name);
    setFormLga(s.lga || '');
    setFormType(s.type || '');
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) { setFormError('Station name is required'); return; }

    // Check duplicate
    const dup = stations.find(s =>
      s.name.toLowerCase() === name.toLowerCase() && s.id !== editing?.id
    );
    if (dup) { setFormError('A station with this name already exists'); return; }

    setSaving(true);
    if (editing) {
      const { error } = await dbUpdateStation(editing.id, name, formLga || undefined, formType || undefined);
      if (error) { toast('Update failed: ' + error.message, true); setSaving(false); return; }
      setStations(prev => prev.map(s => s.id === editing.id ? { ...s, name, lga: formLga, type: formType } : s));
      toast('✓ Station updated successfully.');
    } else {
      const { data, error } = await dbAddStation(name, formLga || undefined, formType || undefined);
      if (error) { toast('Failed to add station: ' + error.message, true); setSaving(false); return; }
      if (data) setStations(prev => [...prev, data]);
      toast(`✓ Station "${name}" added successfully.`);
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await dbDeleteStation(id);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    setStations(prev => prev.filter(s => s.id !== id));
    toast('Station deleted.');
    setShowDelete(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
        <div style={{ width: 24, height: 24, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 16px' }} />
        Loading stations…
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Manage posting stations for all AMEB staff across Adamawa State.
        </div>
        <button
          onClick={openAdd}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            background: 'var(--color-primary)', color: '#fff',
          }}
        >
          + Add Station
        </button>
      </div>

      <div style={{
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{
          padding: '9px 14px', borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>{stations.length}</strong> station{stations.length !== 1 ? 's' : ''} configured
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Station Name</th>
                <th style={thStyle}>LGA</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>📍</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 5 }}>No stations yet.</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Click "Add Station" to get started.</div>
                  </td>
                </tr>
              ) : stations.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>{esc(s.name)}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{esc(s.lga || '—')}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{esc(s.type || '—')}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(s)} title="Edit" style={{ ...actionBtnStyle, background: 'var(--color-primary)', color: '#fff' }}>✏️</button>
                      <button onClick={() => setShowDelete(s.id)} title="Delete" style={{ ...actionBtnStyle, color: 'var(--color-error)' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Station' : 'Add New Station'}
        subtitle="This station will appear in all employee forms"
        maxWidth="500px"
        footer={
          <>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'transparent', color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: 'var(--color-primary)', color: '#fff', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : editing ? '💾 Save Changes' : '+ Add Station'}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Station Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input
              value={formName} onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Yola (HQ), Mubi North Office"
              style={{ padding: '9px 11px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>LGA</label>
            <select
              value={formLga} onChange={e => setFormLga(e.target.value)}
              style={{ padding: '9px 11px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff', appearance: 'none', paddingRight: 26, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center' }}
            >
              <option value="">— Select LGA —</option>
              {LGAs.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Station Type</label>
            <select
              value={formType} onChange={e => setFormType(e.target.value)}
              style={{ padding: '9px 11px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff', appearance: 'none', paddingRight: 26, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center' }}
            >
              <option value="">— Select Type —</option>
              {STATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        maxWidth="420px"
        footer={
          <>
            <button
              onClick={() => setShowDelete(null)}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'transparent', color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => showDelete && handleDelete(showDelete)}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'var(--color-error)', color: '#fff' }}
            >
              Delete Station
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: 8 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🗑</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            Delete this station?
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {stations.find(s => s.id === showDelete)?.name || 'Unknown'}<br />
            This station will be removed from the system.
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
