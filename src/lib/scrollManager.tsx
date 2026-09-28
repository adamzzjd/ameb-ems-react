import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Scroll behaviour for route changes on the public site:
 * - navigations with a hash (`/#about`) scroll to the element;
 * - plain route changes scroll back to the top.
 * Must be rendered inside the Router.
 */
export function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // The target section may render after the first paint (lazy page chunk),
      // so retry briefly before giving up.
      let tries = 0;
      const id = window.setInterval(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.clearInterval(id);
        } else if (++tries > 20) {
          window.clearInterval(id);
        }
      }, 100);
      return () => window.clearInterval(id);
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}
