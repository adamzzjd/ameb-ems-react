// ── Sentry (error tracking) ─────────────────────────────────────────────────
// Optional — everything here is a no-op unless VITE_SENTRY_DSN is set, so
// local dev and builds without Sentry are unaffected and the SDK chunk is
// only downloaded when a DSN is configured.
//
// Setup:
//   1. Create a project at https://sentry.io and copy its DSN (Client Keys).
//   2. Add VITE_SENTRY_DSN=... to your .env (and to Vercel env vars).
//   3. The SDK captures uncaught exceptions, unhandled promise rejections and
//      errors reported by the app's ErrorBoundary.
const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let captureException: ((error: unknown, context?: Record<string, unknown>) => void) | undefined;

/** Initialize Sentry. No-op (and loads no code) when no DSN is configured. */
export async function initSentry(): Promise<void> {
  if (!DSN) return;
  const { init, captureException: capture } = await import('@sentry/react');
  init({
    dsn: DSN,
    environment: import.meta.env.PROD ? 'production' : 'development',
    // Minimal sampling — this is an internal system, we care about errors
    // more than performance traces.
    tracesSampleRate: 0.1,
    // Don't ship PII (staff emails, names) to Sentry.
    beforeSend(event) {
      if (event.user) delete event.user.email;
      return event;
    },
  });
  captureException = capture;
}

/** Report an error to Sentry. No-op when Sentry isn't configured. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  captureException?.(error, context);
}
