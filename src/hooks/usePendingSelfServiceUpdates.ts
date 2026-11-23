import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { pendingRequestCount } from '@/supabase/selfService';

// Same cadence as the inbox badge: a modest poll keeps free-tier egress low
// while the admin still sees new submissions appear without a refresh.
const POLL_INTERVAL_MS = 60_000;

/** Fired by the review page after a decision so the badge updates at once. */
export const PENDING_UPDATES_CHANGED_EVENT = 'ameb:selfservice-pending-changed';

export function notifyPendingUpdatesChanged() {
  window.dispatchEvent(new Event(PENDING_UPDATES_CHANGED_EVENT));
}

/**
 * Live count of staff self-service updates waiting for review, used by the
 * sidebar badge. Only reviewers (admin / super_admin) get a non-zero value;
 * the database function returns 0 for anyone else.
 */
export function usePendingSelfServiceUpdates() {
  const { can } = useAuth();
  const [pending, setPending] = useState(0);

  const refresh = useCallback(async () => {
    if (!can('selfservice.review')) {
      setPending(0);
      return;
    }
    setPending(await pendingRequestCount());
  }, [can]);

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener(PENDING_UPDATES_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener(PENDING_UPDATES_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return { pending, refresh };
}
