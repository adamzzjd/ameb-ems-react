import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { dbPendingUpdateCount } from '@/supabase/updateRequests';

// How often the badge re-checks while the staff portal is open.
const POLL_INTERVAL_MS = 60_000;

/**
 * Live count of pending self-service update requests for the sidebar badge.
 * Only users with the review permission (admin+) will see a non-zero value;
 * the query is RLS-gated the same way as the review queue itself.
 */
export function usePendingUpdateRequests() {
  const { can } = useAuth();
  const [pending, setPending] = useState(0);

  const refresh = useCallback(async () => {
    if (!can('selfservice.review')) {
      setPending(0);
      return;
    }
    const { count, error } = await dbPendingUpdateCount();
    if (!error && typeof count === 'number') setPending(count);
  }, [can]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  return { pending, refresh };
}
