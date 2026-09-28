// ============================================================================
// manage-users — Super Admin user management API
// ----------------------------------------------------------------------------
// Powers the "User Management" page. Only a signed-in user whose
// app_metadata.role === 'super_admin' may call this function.
//
// Uses the SERVICE ROLE key internally (never expose it to the client).
//
// Partner organisations: accounts for external organisations (NGO / LGA / CSO)
// are provisioned here too. A user is bound to a tenant by an
// `organisation_members` row — written with the service role, because the
// browser must never be able to create memberships (see supabase/setup_rls.sql,
// which makes organisation_members read-only to clients).
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

// Keep in sync with src/lib/roles.ts (ROLES).
const VALID_ROLES = [
  'super_admin', 'admin', 'meb_officer', 'lga_officer', 'enumerator',
  'data_collector', 'partner_admin', 'partner_editor', 'partner_viewer',
  'mne_viewer', 'staff',
];

// Roles that must be attached to a partner organisation.
const PARTNER_ROLES = ['partner_admin', 'partner_editor', 'partner_viewer'];

const VALID_ORG_ROLES = ['org_admin', 'org_editor', 'org_viewer'];

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

function cleanUser(user: {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  created_at: string;
  last_sign_in_at?: string | null;
}) {
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

/** Attach / replace a user's organisation membership. Returns an error string. */
async function setMembership(
  service: ReturnType<typeof createClient>,
  userId: string,
  organisationId: string | null,
  orgRole: string,
): Promise<string | null> {
  // Always clear existing links first: one organisation per user.
  const { error: delError } = await service
    .from('organisation_members')
    .delete()
    .eq('user_id', userId);
  if (delError) return delError.message;

  if (!organisationId) return null;

  const { error: insError } = await service
    .from('organisation_members')
    .insert({
      id: crypto.randomUUID(),
      organisation_id: organisationId,
      user_id: userId,
      org_role: VALID_ORG_ROLES.includes(orgRole) ? orgRole : 'org_viewer',
      status: 'active',
    });
  return insError ? insError.message : null;
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

        // Attach organisation membership so the UI can show which tenant a
        // partner user belongs to. Failure is non-fatal (tables may not exist
        // yet on a fresh database).
        let memberships: { user_id: string; organisation_id: string; org_role: string }[] = [];
        let orgNames = new Map<string, string>();
        const { data: members } = await service
          .from('organisation_members')
          .select('user_id, organisation_id, org_role');
        if (members) memberships = members as typeof memberships;

        const { data: orgs } = await service
          .from('partner_organisations')
          .select('id, name');
        if (orgs) orgNames = new Map((orgs as { id: string; name: string }[]).map(o => [o.id, o.name]));

        const byUser = new Map(memberships.map(m => [m.user_id, m]));
        const users = data.users.map(u => {
          const m = byUser.get(u.id);
          return {
            ...cleanUser(u),
            organisation_id: m?.organisation_id ?? null,
            organisation_name: m ? (orgNames.get(m.organisation_id) ?? null) : null,
            org_role: m?.org_role ?? null,
          };
        });
        return json({ users, total: data.total });
      }

      case 'create': {
        const email = String(body.email ?? '').trim().toLowerCase();
        const password = String(body.password ?? '');
        const role = String(body.role ?? '');
        const organisationId = body.organisation_id ? String(body.organisation_id) : null;
        const orgRole = String(body.org_role ?? 'org_viewer');

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'A valid email is required.' }, 400);
        if (password.length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400);
        if (!VALID_ROLES.includes(role)) return json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}.` }, 400);
        if (PARTNER_ROLES.includes(role) && !organisationId) {
          return json({ error: 'A partner role requires an organisation to be selected.' }, 400);
        }

        const { data, error } = await service.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { role },
        });
        if (error) return json({ error: error.message }, 400);

        const membershipError = await setMembership(service, data.user.id, organisationId, orgRole);
        if (membershipError) {
          // Roll the account back so we never leave a partner user with no tenant.
          await service.auth.admin.deleteUser(data.user.id);
          return json({ error: `User created but organisation link failed: ${membershipError}` }, 400);
        }

        return json({
          user: {
            ...cleanUser(data.user),
            organisation_id: organisationId,
            organisation_name: null,
            org_role: organisationId ? orgRole : null,
          },
        }, 201);
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

      case 'setOrg': {
        const id = String(body.id ?? '');
        const organisationId = body.organisation_id ? String(body.organisation_id) : null;
        const orgRole = String(body.org_role ?? 'org_viewer');
        const { data: existing, error: getError } = await service.auth.admin.getUserById(id);
        if (getError || !existing) return json({ error: 'User not found.' }, 404);
        const membershipError = await setMembership(service, id, organisationId, orgRole);
        if (membershipError) return json({ error: membershipError }, 400);
        return json({ ok: true, organisation_id: organisationId, org_role: organisationId ? orgRole : null });
      }

      case 'delete': {
        const id = String(body.id ?? '');
        if (id === callerId) return json({ error: 'You cannot delete your own account.' }, 400);
        // Clear tenant links first — user_id is a plain uuid column, so the
        // cascade from auth.users does not reach it.
        await service.from('organisation_members').delete().eq('user_id', id);
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
