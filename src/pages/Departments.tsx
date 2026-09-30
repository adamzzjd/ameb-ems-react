import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/ui/Modal';
import type { Department, Employee } from '../types';
import {
  dbLoadDepartments, dbSaveDepartment, dbDeleteDepartment,
} from '../supabase/departments';
import { useToast } from '../hooks/useToast';

interface DepartmentsProps {
  /** Officers register — supplies the "department head" picker and per-dept counts. */
  employees: Employee[];
  onNavigate?: (page: string) => void;
}

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const DEPT_STATUSES = ['active', 'merged', 'closed'] as const;

export function Departments({ employees, onNavigate }: DepartmentsProps) {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false); // setup_hierarchy.sql not run yet

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formHead, setFormHead] = useState('');
  const [formStatus, setFormStatus] = useState<string>('active');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await dbLoadDepartments();
    if (error && typeof (error as { code?: string }).code === 'undefined' && /schema cache|does not exist/i.test(error.message)) {
      setMissing(true);
    } else if (error) {
      setMissing(true); // table absent → degrade to an empty manager + hint
    }
    setDepartments(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const staffCount = (deptId: string) =>
    employees.filter(e => (e as { department_id?: string | null }).department_id === deptId).length;

  const openAdd = () => {
    setEditing(null);
    setFormName(''); setFormCode(''); setFormDescription(''); setFormHead(''); setFormStatus('active');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setFormName(d.name);
    setFormCode(d.code || '');
    setFormDescription(d.description || '');
    setFormHead(d.head_employee_id || '');
    setFormStatus(d.status || 'active');
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) { setFormError('Department name is required'); return; }
    const dup = departments.find(
      d => d.name.trim().toLowerCase() === name.toLowerCase() && d.id !== editing?.id,
    );
    if (dup) { setFormError('A department with this name already exists'); return; }

    setSaving(true);
    const { data, error } = await dbSaveDepartment({
      id: editing?.id,
      name,
      code: formCode.trim() || null,
      description: formDescription.trim(),
      head_employee_id: formHead || null,
      status: formStatus,
    });
    setSaving(false);
    if (error) { toast('Save failed: ' + error.message, true); return; }
    if (data) {
      setDepartments(prev =>
        editing ? prev.map(d => (d.id === data.id ? data : d)) : [...prev, data],
      );
    } else {
      void loadData();
    }
    toast(editing ? '✓ Department updated.' : `✓ Department "${name}" created.`);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await dbDeleteDepartment(id);
    if (error) { toast('Delete failed: ' + error.message, true); return; }
    setDepartments(prev => prev.filter(d => d.id !== id));
    toast('Department deleted.');
    setShowDelete(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
        <div style={{ width: 24, height: 24, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 16px' }} />
        Loading departments…
      </div>
    );
  }

  const activeCount = departments.filter(d => d.status === 'active').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          The Board's units — staff belong to a department; assets and correspondence file under one.
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
          + Add Department
        </button>
      </div>

      {missing && (
        <div style={{
          background: 'rgba(214,158,46,.1)', border: '1px solid rgba(214,158,46,.35)',
          color: 'var(--color-text-secondary)', padding: '10px 14px', borderRadius: 8,
          fontSize: 12.5, marginBottom: 12,
        }}>
          The <strong>departments</strong> table isn't in the database yet — run{' '}
          <code style={{ fontFamily: 'monospace' }}>supabase/setup_hierarchy.sql</code> (README step 13),
          then re-open this page.
        </div>
      )}

      <div style={{
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>{activeCount}</strong> active department{activeCount !== 1 ? 's' : ''}
            {departments.length !== activeCount && <> · {departments.length - activeCount} inactive</>}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Head</th>
                <th style={thStyle}>Staff</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 44 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>🏛</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 5 }}>
                      No departments yet.
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Click "Add Department" to create the Board's first unit.
                    </div>
                  </td>
                </tr>
              ) : departments.map((d, i) => {
                const head = employees.find(e => e.id === d.head_employee_id);
                const count = staffCount(d.id);
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-warm)' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {esc(d.name)}
                      {d.description && (
                        <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {esc(d.description.length > 80 ? d.description.slice(0, 80) + '…' : d.description)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{esc(d.code || '—')}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{head ? esc(head.name) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => onNavigate?.('employees')}
                        title="Open the staff register"
                        style={{
                          border: '1px solid var(--color-border)', background: 'var(--color-surface-warm)',
                          borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '2px 8px',
                          cursor: 'pointer', color: 'var(--color-text-secondary)',
                        }}
                      >
                        {count}
                      </button>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px',
                        padding: '3px 8px', borderRadius: 999,
                        background: d.status === 'active' ? 'rgba(46,125,50,.12)' : 'rgba(142,153,176,.15)',
                        color: d.status === 'active' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      }}>
                        {esc(d.status)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => openEdit(d)} title="Edit" style={{ ...actionBtnStyle, background: 'var(--color-primary)', color: '#fff' }}>✏️</button>
                        <button onClick={() => setShowDelete(d.id)} title="Delete" style={{ ...actionBtnStyle, color: 'var(--color-error)' }}>🗑</button>
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
        title={editing ? 'Edit Department' : 'Add New Department'}
        subtitle="Departments group staff, assets and correspondence"
        maxWidth="520px"
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
              {saving ? 'Saving…' : editing ? '💾 Save Changes' : '+ Add Department'}
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
          <Field label="Department Name *">
            <input
              value={formName} onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Literacy, Planning, Research & Statistics"
              style={inputStyle}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Code">
              <input
                value={formCode} onChange={e => setFormCode(e.target.value)}
                placeholder="e.g. LIT, PLN"
                style={inputStyle}
              />
            </Field>
            <Field label="Status">
              <select value={formStatus} onChange={e => setFormStatus(e.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: 26 }}>
                {DEPT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Department Head">
            <select value={formHead} onChange={e => setFormHead(e.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: 26 }}>
              <option value="">— None yet —</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}{e.cadre ? ` — ${e.cadre}` : ''}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea
              value={formDescription} onChange={e => setFormDescription(e.target.value)}
              rows={2} placeholder="What this unit is responsible for…"
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            />
          </Field>
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
              Delete Department
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: 8 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🗑</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Delete this department?</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {departments.find(d => d.id === showDelete)?.name || 'Unknown'}<br />
            Staff in it will show as "No department assigned" — they are not deleted.
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '9px 11px', border: '1px solid var(--color-border)', borderRadius: 6,
  fontSize: 13, outline: 'none', width: '100%', background: '#fff',
  color: 'var(--color-text-primary)',
};

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
