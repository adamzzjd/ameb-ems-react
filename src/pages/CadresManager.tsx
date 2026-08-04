import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/ui/Modal';
import type { Cadre } from '../types';
import { dbLoadCadres, dbAddCadre, dbUpdateCadre, dbDeleteCadre, dbBulkInsertCadres } from '../supabase/cadres';
import { CADRES } from '../data/constants';
import { useToast } from '../hooks/useToast';

interface CadresManagerProps {
  onNavigate?: (page: string) => void;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CATEGORIES = [
  'Senior Management', 'Professional', 'Technical',
  'Administrative', 'Support Staff', 'Other',
];

export function CadresManager({ onNavigate: _onNavigate }: CadresManagerProps) {
  const { toast } = useToast();
  const [cadres, setCadres] = useState<Cadre[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cadre | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await dbLoadCadres();
    if (!error && data && data.length > 0) {
      setCadres(data);
    } else {
      // Seed defaults
      try {
        const seedRecords = [...CADRES].map(name => ({ name, category: '' }));
        const { data: seeded, error: seedErr } = await dbBulkInsertCadres(seedRecords);
        if (!seedErr && seeded) {
          setCadres(seeded);
        } else {
          setCadres(seedRecords as Cadre[]);
        }
      } catch {
        setCadres([...CADRES].map((c, i) => ({ id: String(i), name: c, category: '' } as Cadre)));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormCategory('');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (c: Cadre) => {
    setEditing(c);
    setFormName(c.name);
    setFormCategory(c.category || '');
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) { setFormError('Cadre name is required'); return; }

    const dup = cadres.find(c =>
      c.name.toLowerCase() === name.toLowerCase() && c.id !== editing?.id
    );
    if (dup) { setFormError('A cadre with this name already exists'); return; }

    setSaving(true);
    if (editing) {
      const { error } = await dbUpdateCadre(editing.id, name, formCategory || undefined);
      if (error) { toast('Update failed: ' + error.message, true); setSaving(false); return; }
      setCadres(prev => prev.map(c => c.id === editing.id ? { ...c, name, category: formCategory } : c));
      toast('✓ Cadre updated successfully.');
    } else {
      const { data, error } = await dbAddCadre(name, formCategory || undefined);
      if (error) { toast('Failed to add cadre: ' + error.message, true); setSaving(false); return; }
      if (data) setCadres(prev => [...prev, data]);
      toast(`✓ Cadre "${name}" added successfully.`);
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await dbDeleteCadre(id);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    setCadres(prev => prev.filter(c => c.id !== id));
    toast('Cadre deleted.');
    setShowDelete(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
        <div style={{ width: 24, height: 24, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 16px' }} />
        Loading cadres…
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Manage cadres for all AMEB staff. Cadres added here appear in the employee form automatically.
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
          + Add Cadre
        </button>
      </div>

      <div style={{
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>{cadres.length}</strong> cadre{cadres.length !== 1 ? 's' : ''} configured
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Cadre Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cadres.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>📋</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 5 }}>No cadres yet.</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Click "Add Cadre" to get started.</div>
                  </td>
                </tr>
              ) : cadres.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>{esc(c.name)}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{esc(c.category || '—')}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(c)} title="Edit" style={{ ...actionBtnStyle, background: 'var(--color-primary)', color: '#fff' }}>✏️</button>
                      <button onClick={() => setShowDelete(c.id)} title="Delete" style={{ ...actionBtnStyle, color: 'var(--color-error)' }}>🗑</button>
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
        title={editing ? 'Edit Cadre' : 'Add New Cadre'}
        subtitle="This cadre will appear in all employee forms"
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
              {saving ? 'Saving…' : editing ? '💾 Save Changes' : '+ Add Cadre'}
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
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Cadre Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input
              value={formName} onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Adult Education Officer III"
              style={{ padding: '9px 11px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Category</label>
            <select
              value={formCategory} onChange={e => setFormCategory(e.target.value)}
              style={{ padding: '9px 11px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', background: '#fff', appearance: 'none', paddingRight: 26, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center' }}
            >
              <option value="">— Select Category —</option>
              {CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
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
              Delete Cadre
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: 8 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🗑</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            Delete this cadre?
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {cadres.find(c => c.id === showDelete)?.name || 'Unknown'}<br />
            This cadre will be removed from the system.
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
