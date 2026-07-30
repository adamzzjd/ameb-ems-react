import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

interface LoginProps {
  onBackToSite: () => void;
}

export function Login({ onBackToSite }: LoginProps) {
  const { signIn, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      background: 'linear-gradient(165deg,#080812 0%,#0d0d1a 50%,#12121f 100%)',
      alignItems: 'center', justifyContent: 'center', zIndex: 999,
    }}>
      <div style={{
        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20, padding: 44, width: '100%', maxWidth: 420,
        backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(145deg,#c9a84c,#dbb668 50%,#b8860b)',
            borderRadius: 16, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 28, margin: '0 auto 14px',
            color: '#0b0b14', boxShadow: '0 4px 20px rgba(201,168,76,.2)',
          }}>
            🏛
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#dbb668',
            letterSpacing: 2.5, textTransform: 'uppercase',
          }}>
            Adamawa State Government
          </div>
          <div style={{
            fontSize: 20, fontWeight: 800, color: '#fff',
            marginTop: 6, letterSpacing: '-.4px',
          }}>
            AMEB — Staff Register
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,.3)', marginTop: 4,
          }}>
            Employee Management System
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <a
            onClick={onBackToSite}
            style={{
              color: 'rgba(255,255,255,.3)', fontSize: 12,
              cursor: 'pointer', transition: 'color .2s',
              textDecoration: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#dbb668')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.3)')}
          >
            ← Back to Website
          </a>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{
              fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.45)',
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
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 10, color: '#fff', fontSize: 15,
                outline: 'none', transition: 'all .2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#c9a84c'; e.target.style.boxShadow = '0 0 0 4px rgba(201,168,76,.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.08)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{
              fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.45)',
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
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 10, color: '#fff', fontSize: 15,
                outline: 'none', transition: 'all .2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#c9a84c'; e.target.style.boxShadow = '0 0 0 4px rgba(201,168,76,.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.08)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || authLoading}
            style={{
              width: '100%', padding: 13,
              background: submitting || authLoading
                ? 'linear-gradient(145deg,#c9a84c,#dbb668 50%,#b8860b)'
                : 'linear-gradient(145deg,#c9a84c,#dbb668 50%,#b8860b)',
              color: '#0b0b14', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 800, cursor: submitting || authLoading ? 'not-allowed' : 'pointer',
              marginTop: 6, transition: 'all .3s', letterSpacing: '.3px',
              boxShadow: '0 4px 16px rgba(201,168,76,.2)',
              opacity: submitting || authLoading ? 0.6 : 1,
            }}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {error && (
          <div style={{
            background: 'rgba(192,57,43,.12)', border: '1px solid rgba(192,57,43,.2)',
            color: '#fca5a5', padding: '10px 14px', borderRadius: 8,
            fontSize: 13, marginTop: 14,
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
