import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../components/ui/Modal';
import { LGAs } from '../data/constants';
import type { Facilitator, Centre, CentreFacilitator } from '../types';
import {
  dbLoadFacilitators, dbAddFacilitator, dbUpdateFacilitator, dbDeleteFacilitator,
  dbLoadCentreFacilitators,
} from '../supabase/facilitators';
import { dbLoadCentres } from '../supabase/centres';
import { useToast } from '../hooks/useToast';

interface FacilitatorsManagerProps {
  onNavigate?: (page: string) => void;
  canManage?: boolean;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
}

const GENDERS = ['Male', 'Female'];

export function FacilitatorsManager({ onNavigate, canManage }: FacilitatorsManagerProps) {
  const { toast } = useToast();
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [links, setLinks] = useState<CentreFacilitator[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Facilitator | null>(null);
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLga, setFormLga] = useState('');
  const [formCommunity, setFormCommunity] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // View modal state
  const [viewFacilitator, setViewFacilitator] = useState<Facilitator | null>(null);
  const [showView, setShowView] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [facRes, centreRes, linkRes] = await Promise.all([
      dbLoadFacilitators(),
      dbLoadCentres(),
      dbLoadCentreFacilitators(),
    ]);
    if (!facRes.error && facRes.data) setFacilitators(facRes.data);
    if (!centreRes.error && centreRes.data) setCentres(centreRes.data);
    if (!linkRes.error && linkRes.data) setLinks(linkRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // facilitatorId → centre names it is assigned to
  const centresByFacilitator = useMemo(() => {
    const centreNames = new Map(centres.map(c => [c.id, c.name]));
    const map = new Map<string, string[]>();
    links.forEach(l => {
      const name = centreNames.get(l.centre_id);
      if (!name) return;
      const list = map.get(l.facilitator_id) || [];
      list.push(name);
      map.set(l.facilitator_id, list);
    });
    map.forEach(list => list.sort((a, b) => a.localeCompare(b)));
    return map;
  }, [centres, links]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return facilitators.filter(f =>
      !q ||
      (f.name || '').toLowerCase().includes(q) ||
      (f.lga || '').toLowerCase().includes(q) ||
      (f.community || '').toLowerCase().includes(q) ||
      (f.phone || '').toLowerCase().includes(q) ||
      (centresByFacilitator.get(f.id) || []).some(n => n.toLowerCase().includes(q))
    );
  }, [facilitators, search, centresByFacilitator]);

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormGender('');
    setFormPhone('');
    setFormLga('');
    setFormCommunity('');
    setFormRemarks('');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (f: Facilitator) => {
    setEditing(f);
    setFormName(f.name);
    setFormGender(f.gender || '');
    setFormPhone(f.phone || '');
    setFormLga(f.lga || '');
    setFormCommunity(f.community || '');
    setFormRemarks(f.remarks || '');
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!canManage) { toast('Admin access required to manage facilitators.', true); return; }
    const name = formName.trim();
    if (!name) { setFormError('Facilitator name is required'); return; }

    setSaving(true);
    const fields = {
      gender: formGender || undefined,
      phone: formPhone.trim() || undefined,
      lga: formLga || undefined,
      community: formCommunity.trim() || undefined,
      remarks: formRemarks.trim() || undefined,
    };

    if (editing) {
      const { data, error } = await dbUpdateFacilitator(editing.id, name, fields);
      if (error) { toast('Update failed: ' + error.message, true); setSaving(false); return; }
      if (data) setFacilitators(prev => prev.map(f => f.id === data.id ? data : f));
      toast('✓ Facilitator updated successfully.');
    } else {
      const { data, error } = await dbAddFacilitator(name, fields);
      if (error) { toast('Failed to add facilitator: ' + error.message, true); setSaving(false); return; }
      if (data) setFacilitators(prev => [...prev, data]);
      toast(`✓ Facilitator "${name}" added successfully.`);
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    if (!canManage) { toast('Admin access required to manage facilitators.', true); return; }
    const { error } = await dbDeleteFacilitator(showDelete);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    setFacilitators(prev => prev.filter(f => f.id !== showDelete));
    setLinks(prev => prev.filter(l => l.facilitator_id !== showDelete));
    toast('Facilitator deleted.');
    setShowDelete(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
        <div style={{ width: 24, height: 24, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 16px' }} />
        Loading facilitators…
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 620 }}>
          Facilitator registry for all learning centres. Assign one or more facilitators per centre from the{' '}
          <span style={{ color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('centres')}>
            Learning Centres
          </span>{' '}
          page — a facilitator can serve multiple centres.
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: 'var(--color-primary)', color: '#fff', whiteSpace: 'nowrap',
            }}
          >
            + Add Facilitator
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14, padding: '11px 14px',
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Search</div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Name, LGA, community, phone, assigned centre…"
            style={{ padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%', background: 'var(--color-surface-warm)' }}
          />
        </div>
        <button onClick={() => setSearch('')} style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'transparent', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
          Clear
        </button>
      </div>

      <div style={{
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Showing <strong style={{ color: 'var(--color-text-primary)' }}>{filtered.length}</strong> of {facilitators.length} facilitator{facilitators.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Gender</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>LGA</th>
                <th style={thStyle}>Community</th>
                <th style={thStyle}>Assigned Centres</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>🧑‍🏫</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 5 }}>
                      {facilitators.length > 0 ? 'No facilitators match your search.' : 'No facilitators yet.'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {facilitators.length > 0
                        ? <span onClick={() => setSearch('')} style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}>Clear search</span>
                        : 'Click "+ Add Facilitator" to register your first facilitator.'}
                    </div>
                  </td>
                </tr>
              ) : filtered.map((f, i) => {
                const assigned = centresByFacilitator.get(f.id) || [];
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer' }}
                      onClick={() => { setViewFacilitator(f); setShowView(true); }}>
                      {esc(f.name)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{esc(f.gender || '—')}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{esc(f.phone || '—')}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{esc(f.lga || '—')}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{esc(f.community || '—')}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>
                      {assigned.length === 0 ? (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      ) : (
                        <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(22,163,74,.1)', color: '#16a34a' }}>
                          {assigned.length} centre{assigned.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => { setViewFacilitator(f); setShowView(true); }} title="View" style={actionBtnStyle}>👁</button>
                        {canManage && (
                          <button onClick={() => openEdit(f)} title="Edit" style={{ ...actionBtnStyle, background: 'var(--color-primary)', color: '#fff' }}>✏️</button>
                        )}
                        {canManage && (
                          <button onClick={() => setShowDelete(f.id)} title="Delete" style={{ ...actionBtnStyle, color: 'var(--color-error)' }}>🗑</button>
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

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Facilitator' : 'Add New Facilitator'}
        subtitle="Facilitators can be assigned to one or more learning centres"
        maxWidth="540px"
        footer={
          <>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'transparent', color: 'var(--color-text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: 'var(--color-primary)', color: '#fff', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : editing ? '💾 Save Changes' : '+ Add Facilitator'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {formError && (
            <div style={{ background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.15)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
              {formError}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Full Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Aisha Bello" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Gender</label>
              <select value={formGender} onChange={e => setFormGender(e.target.value)} style={selectStyle}>
                <option value="">— Select —</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Phone Number</label>
              <input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="080XXXXXXXXX" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>LGA</label>
              <select value={formLga} onChange={e => setFormLga(e.target.value)} style={selectStyle}>
                <option value="">— Select LGA —</option>
                {LGAs.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Community / Address</label>
              <input value={formCommunity} onChange={e => setFormCommunity(e.target.value)} placeholder="e.g. Jambutu" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Remarks</label>
            <textarea value={formRemarks} onChange={e => setFormRemarks(e.target.value)} rows={2} placeholder="Optional notes…" style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }} />
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        open={showView}
        onClose={() => { setShowView(false); setViewFacilitator(null); }}
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            {viewFacilitator && (
              <>
                {canManage && (
                  <button onClick={() => { setShowView(false); openEdit(viewFacilitator); }} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'var(--color-primary)', color: '#fff' }}>
                    ✏️ Edit
                  </button>
                )}
                {canManage && (
                  <button onClick={() => { setShowView(false); setShowDelete(viewFacilitator.id); }} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'transparent', color: 'var(--color-error)', marginLeft: 'auto' }}>
                    🗑 Delete
                  </button>
                )}
              </>
            )}
          </div>
        }
      >
        {viewFacilitator && (
          <div>
            <div style={{ background: 'var(--color-primary)', margin: '-16px -16px 16px', padding: '18px 20px', borderRadius: '12px 12px 0 0' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#e1f5ee', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                Adamawa State Mass Education Board
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{esc(viewFacilitator.name)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {viewFacilitator.gender && (
                  <span style={{ background: 'rgba(255,255,255,.15)', color: '#fff', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {esc(viewFacilitator.gender)}
                  </span>
                )}
                {viewFacilitator.lga && (
                  <span style={{ background: 'rgba(255,255,255,.15)', color: '#fff', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    📍 {esc(viewFacilitator.lga)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                ['Phone', viewFacilitator.phone],
                ['Community', viewFacilitator.community],
              ].map(([label, val]) => (
                <div key={String(label)} style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{String(label)}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2 }}>{val ? esc(val) : '—'}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 7 }}>
                Assigned Centres ({centresByFacilitator.get(viewFacilitator.id)?.length || 0})
              </div>
              {(centresByFacilitator.get(viewFacilitator.id) || []).length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Not assigned to any centre yet.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(centresByFacilitator.get(viewFacilitator.id) || []).map(name => (
                    <span key={name} style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(22,163,74,.1)', color: '#16a34a' }}>
                      🏫 {esc(name)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {viewFacilitator.remarks && (
              <div style={{ background: '#fffbeb', borderTop: '1px solid #fde68a', padding: '10px 14px', fontSize: 12, color: '#78350f', marginTop: 8, borderRadius: 6 }}>
                <strong>Remarks:</strong> {esc(viewFacilitator.remarks)}
              </div>
            )}

            <div style={{ padding: '7px 14px 0', fontSize: 10, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', marginTop: 12, paddingTop: 8 }}>
              <span>AMEB — Facilitator Registry</span>
              <span>Viewed: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        maxWidth="420px"
        footer={
          <>
            <button onClick={() => setShowDelete(null)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'transparent', color: 'var(--color-text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleDelete} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'var(--color-error)', color: '#fff' }}>
              Delete Facilitator
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: 8 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🗑</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            Delete this facilitator?
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {facilitators.find(f => f.id === showDelete)?.name || 'Unknown'}
            {(() => {
              const assigned = centresByFacilitator.get(showDelete || '') || [];
              if (assigned.length === 0) return null;
              return (<>
                <br />
                Assigned to {assigned.length} centre{assigned.length !== 1 ? 's' : ''} — they will be unlinked.
              </>);
            })()}
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
  fontSize: 13, outline: 'none', width: '100%', background: '#fff',
  appearance: 'none', paddingRight: 24,
  backgroundImage: `url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e99b0' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
};
