import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { supabase } from '../supabase/client';

interface LoginProps {
  onBackToSite: () => void;
}

const green = '#0f6e56';
const greenDark = '#0b5c47';
const ink = '#27313b';
const slate = '#64748b';
const border = '#e2eae6';

export function Login({ onBackToSite }: LoginProps) {
  const { signIn, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Load the board logo from site content so the login card matches the public site
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('site_content').select('logo_url').single();
        if (!cancelled && data?.logo_url) setLogoUrl(data.logo_url);
      } catch {
        // site_content may not exist yet — keep the 🏛 fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);

    if (signInError) {
      const msg = signInError.message.includes('Invalid login credentials')
        ? 'Incorrect email or password. Please try again.'
        : signInError.message;
      setError(msg);
      return;
    }

    toast('✓ Signed in successfully');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      background: '#eef5f1',
      alignItems: 'center', justifyContent: 'center', zIndex: 999,
      padding: 16,
    }}>
      <div style={{
        background: '#ffffff', border: `1px solid ${border}`,
        borderRadius: 12, padding: 44, width: '100%', maxWidth: 420,
        boxShadow: '0 2px 10px rgba(15,110,86,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60,
            background: logoUrl ? '#fff' : green,
            borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 26, margin: '0 auto 14px',
            color: '#fff', overflow: 'hidden',
            border: logoUrl ? `1px solid ${border}` : 'none',
          }}>
            {logoUrl ? (
              <img src={logoUrl} alt="AMEB logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
            ) : (
              '🏛'
            )}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: green,
            letterSpacing: 2.5, textTransform: 'uppercase',
          }}>
            Adamawa State Government
          </div>
          <div style={{
            fontSize: 20, fontWeight: 800, color: ink,
            marginTop: 6, letterSpacing: '-.4px',
          }}>
            AMEB — Staff Register
          </div>
          <div style={{
            fontSize: 13, color: slate, marginTop: 4,
          }}>
            Employee Management System
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <a
            onClick={onBackToSite}
            style={{
              color: slate, fontSize: 12,
              cursor: 'pointer', transition: 'color .2s',
              textDecoration: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = green)}
            onMouseLeave={e => (e.currentTarget.style.color = slate)}
          >
            ← Back to Website
          </a>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{
              fontSize: 12, fontWeight: 600, color: ink,
              marginBottom: 7, display: 'block', letterSpacing: '.3px',
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="username"
              style={{
                width: '100%', padding: '12px 16px',
                background: '#fff',
                border: `1px solid ${border}`,
                borderRadius: 8, color: ink, fontSize: 15,
                outline: 'none', transition: 'border-color .2s',
              }}
              onFocus={e => { e.target.style.borderColor = green; }}
              onBlur={e => { e.target.style.borderColor = border; }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{
              fontSize: 12, fontWeight: 600, color: ink,
              marginBottom: 7, display: 'block', letterSpacing: '.3px',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: '100%', padding: '12px 16px',
                background: '#fff',
                border: `1px solid ${border}`,
                borderRadius: 8, color: ink, fontSize: 15,
                outline: 'none', transition: 'border-color .2s',
              }}
              onFocus={e => { e.target.style.borderColor = green; }}
              onBlur={e => { e.target.style.borderColor = border; }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || authLoading}
            style={{
              width: '100%', padding: 13,
              background: green,
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 700, cursor: submitting || authLoading ? 'not-allowed' : 'pointer',
              marginTop: 6, transition: 'background .2s', letterSpacing: '.3px',
              opacity: submitting || authLoading ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!submitting && !authLoading) e.currentTarget.style.background = greenDark; }}
            onMouseLeave={e => { e.currentTarget.style.background = green; }}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)',
            color: '#dc2626', padding: '10px 14px', borderRadius: 8,
            fontSize: 13, marginTop: 14,
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
