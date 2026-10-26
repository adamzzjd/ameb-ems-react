import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { ScrollManager } from './lib/scrollManager';
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

const container = document.getElementById('root')!;

const tree = (
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ScrollManager />
            <App />
            <Toaster position="bottom-right" richColors />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// The public pages are pre-rendered at build time (scripts/prerender-public.mjs),
// so the container already holds the real markup in the first response — that is
// what a crawler and a visitor with JavaScript blocked see. Adopt it by
// hydrating rather than mounting: createRoot empties the container on its first
// commit, which would blank a painted page for a few frames.
if (container.hasChildNodes()) {
  ReactDOM.hydrateRoot(container, tree);
} else {
  ReactDOM.createRoot(container).render(tree);
}
