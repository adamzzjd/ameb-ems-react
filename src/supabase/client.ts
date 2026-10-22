import { createClient } from '@supabase/supabase-js';

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether this build has a Supabase project configured.
 *
 * Without it the app still renders — reads simply fail and the public pages
 * fall back to their empty states — instead of crashing at import time with
 * `createClient`'s "supabaseUrl is required". That keeps the marketing site
 * viewable on a build with no secrets (CI, previews, a fresh clone).
 */
export const isSupabaseConfigured = Boolean(SUPA_URL && SUPA_KEY);

const NOT_CONFIGURED =
  'Supabase is not configured for this build. ' +
  'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).';

if (!isSupabaseConfigured) {
  console.error(`Missing Supabase environment variables. ${NOT_CONFIGURED}`);
}

/**
 * Answer every request with a 400 instead of letting it reach the network.
 *
 * 400 rather than 5xx on purpose: supabase-js retries 5xx and network errors
 * with backoff, which would leave pages stuck on their spinner. A client error
 * is returned straight away, so an unconfigured build settles immediately with
 * `{ data: null, error }` and the pages fall back to their empty states.
 */
const unconfiguredFetch: typeof fetch = async () =>
  new Response(JSON.stringify({ message: NOT_CONFIGURED }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });

// `.invalid` is reserved by RFC 2606, so it can never resolve to a real project.
export const supabase = createClient(
  SUPA_URL || 'https://not-configured.supabase.invalid',
  SUPA_KEY || 'anon-key-not-configured',
  isSupabaseConfigured ? undefined : { global: { fetch: unconfiguredFetch } }
);
