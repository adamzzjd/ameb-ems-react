import { supabase } from '../supabase/client';

/**
 * Best-effort admin notification after a contact message is saved. Calls the
 * `notify-contact` Supabase Edge Function, which emails the admin team via
 * Resend. Never blocks or fails the form submit — any error is swallowed.
 */
export async function notifyAdminsOfContact(contactId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-contact`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contact_id: contactId }),
    });
  } catch {
    // Fire-and-forget — the message is already saved in the inbox.
  }
}
