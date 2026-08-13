/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { supabase } from '../supabase/client';
import { syncFaviconFromLogo } from '../lib/favicon';
import { GraduationCap, Shield } from 'lucide-react';

interface LoginProps {
  onBackToSite: () => void;
  onSelfService: () => void;
}

export function Login({ onBackToSite, onSelfService }: LoginProps) {
  const { signIn, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [resetSent, setResetSent] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('site_content').select('logo_url').single();
        if (!cancelled && data?.logo_url) {
          setLogoUrl(data.logo_url);
          syncFaviconFromLogo(data.logo_url);
        }
      } catch { /* keep fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      const msg = signInError.message.includes('Invalid login credentials')
        ? 'Incorrect email or password. Please try again.' : signInError.message;
      setError(msg);
      return;
    }
    toast('✓ Signed in successfully');
  };

  // Send a password-reset email. Supabase emails a recovery link that returns
  // to the app with a `#/reset` hash carrying the recovery tokens.
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Please enter the email address for your account.'); return; }
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSent(true);
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

        {/* Logo & branding */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3.5 overflow-hidden"
            style={{
              background: logoUrl ? 'var(--color-surface)' : 'var(--color-primary)',
              border: logoUrl ? '1px solid var(--color-border)' : 'none',
            }}>
            {logoUrl ? (
              <img src={logoUrl} alt="AMEB logo" className="w-full h-full object-contain p-1.5" />
            ) : (
              <GraduationCap size={28} className="text-white" />
            )}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[2.5px] mb-1.5"
            style={{ color: 'var(--color-primary)' }}>
            Adamawa State Government
          </div>
          <div className="font-heading text-xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}>
            AMEB — Staff Register
          </div>
          <div className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Employee Management System
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mb-5">
          <a onClick={onBackToSite}
            className="text-[12px] cursor-pointer transition-colors hover:text-primary"
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            ← Back to Website
          </a>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}>
              Email Address
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" autoComplete="username"
              className="w-full h-12 px-4 rounded-lg border text-[15px] outline-none transition-colors focus:ring-2 focus:ring-ring"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
          </div>

          <div className="mb-5">
            <label className="text-xs font-semibold block mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}>
              Password
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password"
              className="w-full h-12 px-4 rounded-lg border text-[15px] outline-none transition-colors focus:ring-2 focus:ring-ring"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
          </div>

          <button type="submit" disabled={submitting || authLoading}
            className="w-full h-12 rounded-lg text-[15px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)', letterSpacing: '0.3px' }}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>

          <button type="button" onClick={() => { setMode('reset'); setError(''); }}
            className="block mx-auto mt-3.5 text-[12px] cursor-pointer transition-colors hover:text-primary"
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none', background: 'none', border: 'none' }}>
            Forgot password?
          </button>
        </form>

        {/* Employee self-service — no account needed, just your PSN */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Are you an AMEB officer?
            </div>
            <button type="button" onClick={onSelfService}
              className="text-[13px] font-semibold cursor-pointer transition-colors hover:text-primary"
              style={{ color: 'var(--color-primary)', textDecoration: 'none', background: 'none', border: 'none' }}>
              Update your details with your PSN →
            </button>
            <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              No password needed — changes apply directly; new staff are approved by the board office.
            </div>
          </div>
        </div>

        {mode === 'reset' && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {resetSent ? (
              <div className="text-center py-2">
                <div className="text-4xl mb-3">📧</div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Check your email</div>
                <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  If <strong>{email}</strong> is a registered account, a password-reset link is on its way.
                </p>
                <button type="button" onClick={() => { setMode('signin'); setResetSent(false); }}
                  className="mt-4 text-[12px] cursor-pointer transition-colors hover:text-primary"
                  style={{ color: 'var(--color-text-muted)', textDecoration: 'none', background: 'none', border: 'none' }}>
                  ← Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset}>
                <div className="text-[13px] mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Enter your account email and we'll send you a link to set a new password.
                </div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoComplete="username"
                  className="w-full h-12 px-4 rounded-lg border text-[15px] outline-none transition-colors focus:ring-2 focus:ring-ring mb-4"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                <button type="submit" disabled={submitting}
                  className="w-full h-12 rounded-lg text-[15px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'var(--color-primary)', letterSpacing: '0.3px' }}>
                  {submitting ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button type="button" onClick={() => { setMode('signin'); setError(''); }}
                  className="block mx-auto mt-3.5 text-[12px] cursor-pointer transition-colors hover:text-primary"
                  style={{ color: 'var(--color-text-muted)', textDecoration: 'none', background: 'none', border: 'none' }}>
                  ← Back to Sign In
                </button>
              </form>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3.5 px-3.5 py-2.5 rounded-lg text-[13px]"
            style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.25)', color: 'var(--color-error)' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
