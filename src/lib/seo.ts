// ── Page metadata for the public site ───────────────────────────────────────
// The site is a single-page app, so every page shares index.html's tags until
// React mounts. This helper rewrites the head after mount: title, description,
// canonical, Open Graph/Twitter cards and optional JSON-LD.
//
// Note on crawlers: Google renders JS and will pick these up. Social networks
// (WhatsApp, Facebook, X) do not — they read the static tags in index.html, so
// every shared link falls back to the site-wide card there.

export const SITE_NAME = 'Adamawa State Mass Education Board';
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '') ||
  'https://asmeb.vercel.app';

export const DEFAULT_TITLE = `${SITE_NAME} — Official Government Website`;
export const DEFAULT_DESCRIPTION =
  'Adamawa State Mass Education Board — adult literacy, non-formal education and vocational training across all 21 LGAs of Adamawa State, Nigeria.';
export const DEFAULT_IMAGE = '/og-image.png';

export interface PageMeta {
  /** Page title. Omit on the landing page to keep the site-wide default. */
  title?: string;
  description?: string;
  /** Canonical path (defaults to the current pathname). */
  path?: string;
  /** Absolute URL or a path inside /public. */
  image?: string;
  type?: 'website' | 'article';
  /** Keep the page out of search results (login, self-service). */
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

function absolute(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return SITE_URL + (url.startsWith('/') ? url : `/${url}`);
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Apply a page's metadata. Safe to call on every render — tags are reused. */
export function applyPageMeta(meta: PageMeta = {}) {
  const title = meta.title ? `${meta.title} — ${SITE_NAME}` : DEFAULT_TITLE;
  const description = meta.description || DEFAULT_DESCRIPTION;
  const path = meta.path ?? window.location.pathname;
  const url = SITE_URL + (path === '/' ? '' : path.replace(/\/+$/, ''));
  const image = absolute(meta.image || DEFAULT_IMAGE);

  document.title = title;
  setMeta('name', 'description', description);
  setMeta('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');
  setLink('canonical', path === '/' ? `${SITE_URL}/` : url);

  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:type', meta.type || 'website');
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', image);

  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);

  const existing = document.getElementById('ameb-jsonld');
  if (meta.jsonLd) {
    const script = existing ?? document.createElement('script');
    script.id = 'ameb-jsonld';
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(meta.jsonLd);
    if (!existing) document.head.appendChild(script);
  } else if (existing) {
    existing.remove();
  }
}

export interface Crumb {
  name: string;
  path: string;
}

/** Breadcrumb trail, so search results can show Home › News › <title>. */
export function breadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

/** Structured data for a news announcement. */
export function articleJsonLd(article: {
  title: string;
  description?: string;
  path: string;
  image?: string;
  /** ISO date (YYYY-MM-DD) as stored in the CMS. */
  date?: string;
}): Record<string, unknown> {
  const published = article.date && /^\d{4}-\d{2}-\d{2}/.test(article.date)
    ? article.date.slice(0, 10)
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    ...(article.description ? { description: article.description } : {}),
    ...(published ? { datePublished: published, dateModified: published } : {}),
    ...(article.image ? { image: [absolute(article.image)] } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': absolute(article.path) },
    author: { '@type': 'GovernmentOrganization', name: SITE_NAME },
    publisher: {
      '@type': 'GovernmentOrganization',
      name: SITE_NAME,
      ...(absolute(DEFAULT_IMAGE) ? { logo: { '@type': 'ImageObject', url: absolute(DEFAULT_IMAGE) } } : {}),
    },
    inLanguage: 'en-NG',
  };
}

/** Structured data for a programme page. */
export function programmeJsonLd(programme: {
  title: string;
  description?: string;
  path: string;
  image?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: programme.title,
    ...(programme.description ? { description: programme.description } : {}),
    ...(programme.image ? { image: absolute(programme.image) } : {}),
    url: absolute(programme.path),
    provider: { '@type': 'GovernmentOrganization', name: SITE_NAME, sameAs: SITE_URL },
    inLanguage: 'en-NG',
  };
}

/** Structured data for a learning centre. */
export function centreJsonLd(centre: {
  name: string;
  path: string;
  lga?: string | null;
  ward?: string | null;
  phone?: string | null;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: centre.name,
    url: absolute(centre.path),
    ...(centre.phone ? { telephone: centre.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(centre.ward ? { addressLocality: centre.ward } : {}),
      ...(centre.lga ? { addressRegion: centre.lga } : {}),
      addressCountry: 'NG',
    },
    parentOrganization: { '@type': 'GovernmentOrganization', name: SITE_NAME, sameAs: SITE_URL },
  };
}

/** Several JSON-LD nodes on one page, in a single `@graph`. */
export function jsonLdGraph(...nodes: Record<string, unknown>[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.map(({ '@context': _ctx, ...rest }) => rest),
  };
}

/** Structured data for the board itself (landing page). */
export function organisationJsonLd(contact: {
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    name: SITE_NAME,
    alternateName: 'AMEB',
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    ...(contact.logo ? { logo: absolute(contact.logo) } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.address
      ? { address: { '@type': 'PostalAddress', streetAddress: contact.address, addressRegion: 'Adamawa State', addressCountry: 'NG' } }
      : {}),
    areaServed: { '@type': 'AdministrativeArea', name: 'Adamawa State, Nigeria' },
  };
}
