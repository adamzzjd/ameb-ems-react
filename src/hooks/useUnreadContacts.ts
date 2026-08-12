import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { dbLoadUnreadContactCount } from '@/supabase/cms';

// How often the badge re-checks while the staff portal is open. Kept modest
// like useCmsData's poll so the free-tier egress stays low.
const POLL_INTERVAL_MS = 60_000;

/**
 * Live unread count for the CMS inbox sidebar badge. Only users who can read
 * the inbox (admin/super_admin via cms.edit) will see a non-zero value; the
 * count query is RLS-gated the same way as the inbox itself.
 */
export function useUnreadContacts() {
  const { can } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!can('cms.edit')) {
      setUnread(0);
      return;
    }
    const { count, error } = await dbLoadUnreadContactCount();
    if (!error && typeof count === 'number') setUnread(count);
  }, [can]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  return { unread, refresh };
}
