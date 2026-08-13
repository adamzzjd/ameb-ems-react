// ── Favicon ─────────────────────────────────────────────────────────────────
// index.html ships a static /favicon.svg fallback. When the CMS logo
// (site_content.logo_url) is known, we swap it in so the browser tab matches
// the board's actual logo — on the public site, login and the staff portal.
let lastHref: string | null = null;

export function syncFaviconFromLogo(url?: string | null): void {
  const href = url && url.trim() ? url.trim() : '/favicon.svg';
  if (href === lastHref) return;
  lastHref = href;

  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}
