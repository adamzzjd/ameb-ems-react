// ============================================================================
// notify-contact — email admins when the public contact form is submitted
// ----------------------------------------------------------------------------
// The public site inserts each contact/enquiry message into cms_contacts, then
// fires this function (best-effort) so the admin team gets an email alert.
//
// Recipients: every signed-up user with role super_admin or admin.
//
// Uses the Resend REST API (https://resend.com/docs/api-reference/emails/send).
// Low volume (a government board's website), so the free tier is plenty.
//
// DEPLOY:
//   1. supabase link --project-ref <your-project-ref>
//   2. supabase secrets set RESEND_API_KEY=<your_resend_api_key>
//   3. supabase functions deploy notify-contact
//
//   If RESEND_API_KEY is not set the function is a no-op (the message still
//   lands in the Contact Inbox), so the public form is never blocked.
//
// LOCAL:
//   supabase start
//   supabase secrets set RESEND_API_KEY=<key> --local
//   supabase functions serve notify-contact
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SENDER_EMAIL = Deno.env.get('NOTIFY_CONTACT_SENDER') ?? 'AME B website <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendEmail(to: string, contact: { name: string; email: string; subject: string; message: string }): Promise<void> {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: SENDER_EMAIL,
      to: [to],
      subject: `📩 New contact form message — ${contact.subject}`,
      text: [
        `You received a new message via the AMEB website contact form.`,
        ``,
        `From: ${contact.name} <${contact.email}>`,
        `Subject: ${contact.subject}`,
        ``,
        contact.message,
        ``,
        `— Reply from the Contact Inbox in the Staff Portal.`,
      ].join('\n'),
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let contactId: string | null = null;
  try {
    const body = await req.json() as { contact_id?: string };
    contactId = body.contact_id ?? null;
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  if (!contactId) return json({ error: 'contact_id is required.' }, 400);

  // Best-effort: without a service-role key or Resend key we simply skip —
  // the message itself is already safe in the cms_contacts inbox.
  if (!SERVICE_ROLE_KEY || !RESEND_API_KEY) return json({ ok: true, skipped: true });

  try {
    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: contact, error: contactError } = await service
      .from('cms_contacts')
      .select('name, email, subject, message')
      .eq('id', contactId)
      .single();
    if (contactError || !contact) return json({ ok: true, skipped: true }); // unknown id — ignore

    // Admin recipients: super_admin + admin roles.
    const { data: users, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) return json({ ok: true, skipped: true });

    const recipients = (users?.users ?? [])
      .map(u => ({ email: u.email, role: u.app_metadata?.role as string | undefined }))
      .filter(u => u.email && (u.role === 'admin' || u.role === 'super_admin'))
      .map(u => u.email as string);

    await Promise.allSettled(recipients.map(to => sendEmail(to, contact)));
    return json({ ok: true, notified: recipients.length });
  } catch {
    return json({ ok: true, skipped: true });
  }
});
