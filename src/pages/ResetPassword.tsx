/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { GraduationCap, Shield, Loader2 } from 'lucide-react';

interface ResetPasswordProps {
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Password recovery view — reached when the user clicks the reset link in the
 * Supabase email. The link returns to the app with a `#/reset` hash carrying
 * the recovery tokens; we exchange them for a session and let the user set a
 * new password.
 */
export function ResetPassword({ onDone, onCancel }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Hash looks like: #/reset?access_token=…&refresh_token=…&type=recovery
      const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (!accessToken || !refreshToken) {
        if (!cancelled) setError('This reset link is invalid or has expired. Please request a new one from the sign-in page.');
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (!cancelled) {
        if (sessionError) setError(sessionError.message || 'This reset link is invalid or has expired.');
        else setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) { setError(updateError.message); return; }
    // Clear the recovery tokens from the URL — the user is now signed in.
    window.location.hash = '';
    onDone();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[999] p-4"
      style={{ background: 'var(--color-bg)' }}>

      {/* Government header */}
      <div className="fixed top-0 left-0 right-0 z-[1000] w-full text-[11px] font-medium tracking-wide py-1.5 px-4 flex items-center justify-between border-b"
        style={{ background: 'var(--color-primary-dark)', color: 'var(--color-text-inverse)', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <Shield size={12} className="opacity-60" />
          <span>Federal Republic of Nigeria | Adamawa State Government</span>
        </div>
      </div>

      <div className="w-full max-w-[420px] rounded-2xl border p-10 md:p-11"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 8px 32px var(--color-shadow)',
        }}>

        <div className="text-center mb-7">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3.5"
            style={{ background: 'var(--color-primary)' }}>
            <GraduationCap size={28} className="text-white" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[2.5px] mb-1.5"
            style={{ color: 'var(--color-primary)' }}>
            Adamawa State Government
          </div>
          <div className="font-heading text-xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}>
            Set a New Password
          </div>
          <div className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            AMEB — Staff Register
          </div>
        </div>

        {!ready && !error && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}>
            <Loader2 size={16} className="animate-spin" /> Verifying your reset link…
          </div>
        )}

        {error && (
          <div className="px-3.5 py-3 rounded-lg text-[13px]"
            style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.25)', color: 'var(--color-error)' }}>
            {error}
            <button onClick={onCancel}
              className="block mt-3 text-[12px] cursor-pointer transition-colors hover:text-primary"
              style={{ color: 'var(--color-text-muted)', textDecoration: 'none', background: 'none', border: 'none' }}>
              ← Back to Sign In
            </button>
          </div>
        )}

        {ready && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="text-xs font-semibold block mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}>
                New Password
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters" autoComplete="new-password"
                className="w-full h-12 px-4 rounded-lg border text-[15px] outline-none transition-colors focus:ring-2 focus:ring-ring"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold block mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}>
                Confirm New Password
              </label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter the new password" autoComplete="new-password"
                className="w-full h-12 px-4 rounded-lg border text-[15px] outline-none transition-colors focus:ring-2 focus:ring-ring"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>

            <button type="submit" disabled={submitting}
              className="w-full h-12 rounded-lg text-[15px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)', letterSpacing: '0.3px' }}>
              {submitting ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
