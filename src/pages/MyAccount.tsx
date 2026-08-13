import { useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ROLE_LABELS } from '../lib/roles';

const MIN_PASSWORD = 8;

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 6,
  fontSize: 13, outline: 'none', width: '100%', background: '#fff',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)',
};

export function MyAccountPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user?.email) { setError('Not signed in.'); return; }
    if (!current) { setError('Enter your current password.'); return; }
    if (next.length < MIN_PASSWORD) { setError(`New password must be at least ${MIN_PASSWORD} characters.`); return; }
    if (next !== confirm) { setError('New passwords do not match.'); return; }

    setSaving(true);
    // 1) Verify the current password (also refreshes the session so the
    //    subsequent update isn't rejected as an old session).
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email, password: current,
    });
    if (verifyErr) {
      setSaving(false);
      setError('Current password is incorrect.');
      return;
    }
    // 2) Update the password.
    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    setSaving(false);
    if (updateErr) {
      setError('Password update failed: ' + updateErr.message);
      return;
    }
    setCurrent(''); setNext(''); setConfirm('');
    toast('🔒 Password updated successfully.');
  };

  return (
    <div className="max-w-lg">
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
        Your account details and security settings. Only you can change your own password —
        an administrator can reset it if you forget it.
      </div>

      <div style={{
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        {/* Account summary */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-warm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white"
              style={{ background: 'var(--color-primary)' }}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{user?.email || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Role: <strong style={{ color: 'var(--color-primary)' }}>{role ? ROLE_LABELS[role] : 'Viewer'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Change Password</div>

          {error && (
            <div style={{
              background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.15)',
              color: 'var(--color-error)', padding: '10px 14px', borderRadius: 8, fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Current Password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
              autoComplete="current-password" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>New Password</label>
              <input type="password" value={next} onChange={e => setNext(e.target.value)}
                autoComplete="new-password" style={inputStyle} placeholder={`Min ${MIN_PASSWORD} characters`} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
            <button type="submit" disabled={saving}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: 'var(--color-primary)', color: '#fff', opacity: saving ? 0.6 : 1,
              }}>
              {saving ? 'Updating…' : '🔒 Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
