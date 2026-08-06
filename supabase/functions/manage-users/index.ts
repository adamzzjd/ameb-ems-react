// ============================================================================
// manage-users — Super Admin user management API
// ----------------------------------------------------------------------------
// Powers the "User Management" page. Only a signed-in user whose
// app_metadata.role === 'super_admin' may call this function.
//
// Uses the SERVICE ROLE key internally (never expose it to the client).
//
// DEPLOY:
//   1. supabase link --project-ref <your-project-ref>
//   2. supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
//      (SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically)
//   3. supabase functions deploy manage-users
//
// LOCAL:
//   supabase start
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key> --local
//   supabase functions serve manage-users
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_ROLES = ['super_admin', 'admin', 'data_collector', 'staff'];

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Verify the caller is a signed-in super_admin; returns their user id or null. */
async function authorize(req: Request): Promise<string | null> {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!token) return null;
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.app_metadata?.role === 'super_admin' ? data.user.id : null;
}

function cleanUser(user: { id: string; email?: string; app_metadata?: Record<string, unknown>; created_at: string; last_sign_in_at?: string | null }) {
  return {
    id: user.id,
    email: user.email ?? null,
    role: typeof user.app_metadata?.role === 'string' && VALID_ROLES.includes(user.app_metadata.role)
      ? user.app_metadata.role
      : null,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const callerId = await authorize(req);
  if (!callerId) return json({ error: 'Unauthorized — super administrator access required.' }, 401);

  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json() as { action?: string; [k: string]: unknown };

    switch (body.action) {
      case 'list': {
        const page = Math.max(1, Number(body.page ?? 1));
        const perPage = Math.min(200, Math.max(1, Number(body.per_page ?? 50)));
        const { data, error } = await service.auth.admin.listUsers({ page, perPage });
        if (error) return json({ error: error.message }, 400);
        return json({ users: data.users.map(cleanUser), total: data.total });
      }

      case 'create': {
        const email = String(body.email ?? '').trim().toLowerCase();
        const password = String(body.password ?? '');
        const role = String(body.role ?? '');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'A valid email is required.' }, 400);
        if (password.length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400);
        if (!VALID_ROLES.includes(role)) return json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}.` }, 400);
        const { data, error } = await service.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { role },
        });
        if (error) return json({ error: error.message }, 400);
        return json({ user: cleanUser(data.user) }, 201);
      }

      case 'setRole': {
        const id = String(body.id ?? '');
        const role = String(body.role ?? '');
        if (!VALID_ROLES.includes(role)) return json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}.` }, 400);
        if (id === callerId && role !== 'super_admin') {
          return json({ error: 'You cannot remove your own super administrator role.' }, 400);
        }
        const { data: existing, error: getError } = await service.auth.admin.getUserById(id);
        if (getError || !existing) return json({ error: 'User not found.' }, 404);
        const { data, error } = await service.auth.admin.updateUserById(id, {
          app_metadata: { ...(existing.user.app_metadata ?? {}), role },
        });
        if (error) return json({ error: error.message }, 400);
        return json({ user: cleanUser(data.user) });
      }

      case 'delete': {
        const id = String(body.id ?? '');
        if (id === callerId) return json({ error: 'You cannot delete your own account.' }, 400);
        const { error } = await service.auth.admin.deleteUser(id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, 500);
  }
});
