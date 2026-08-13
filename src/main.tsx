import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { ThemeProvider } from './hooks/useTheme';
import { Toaster } from '@/components/ui/sonner';
import { initSentry } from './lib/sentry';
import './index.css';

// Optional error tracking — no-op unless VITE_SENTRY_DSN is set.
initSentry();

// Optional privacy-friendly site analytics (cookie-less Plausible script) —
// loads only when VITE_PLAUSIBLE_DOMAIN is set, e.g. on the public site.
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
if (PLAUSIBLE_DOMAIN) {
  const s = document.createElement('script');
  s.defer = true;
  s.dataset.domain = PLAUSIBLE_DOMAIN;
  s.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(s);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
          <Toaster position="bottom-right" richColors />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
