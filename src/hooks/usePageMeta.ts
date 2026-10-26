import { useEffect } from 'react';
import { applyPageMeta, type PageMeta } from '../lib/seo';

/**
 * Apply this page's title/description/social tags while it is on screen.
 *
 * `meta` is compared by value (JSON), so pages can build it inline without
 * re-running the effect on every render.
 */
export function usePageMeta(meta: PageMeta) {
  const key = JSON.stringify(meta);
  useEffect(() => {
    applyPageMeta(JSON.parse(key) as PageMeta);
  }, [key]);
}
