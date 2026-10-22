// ── Public URL helpers ──────────────────────────────────────────────────────
// The public site uses real routes (shareable, refresh-safe, SEO-friendly).
// Programmes, news and centres have no stored slug column, so their URL slug is
// derived from the title / name at read time. Links therefore stay stable as
// long as the title does, and detail pages also accept the raw row id so older
// or externally shared links keep working.

/**
 * Convert arbitrary text into a URL-safe slug.
 *   "Adult Literacy & Numeracy" → "adult-literacy-numeracy"
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[^a-z0-9]+/g, '-')       // non-alphanumerics → hyphen
    .replace(/^-+|-+$/g, '')           // trim leading/trailing hyphens
    .slice(0, 80);
}

/** Single source of truth for public URLs — use these instead of string literals. */
export const paths = {
  home: '/',
  programs: '/programs',
  program: (slug: string) => `/programs/${slug}`,
  centres: '/centres',
  news: '/news',
  newsArticle: (slug: string) => `/news/${slug}`,
  login: '/login',
  selfService: '/self-service',
  portal: (page = 'dashboard') => `/portal/${page}`,
} as const;

/**
 * Find an item by its derived slug, falling back to a raw id match so links
 * shared before a rename (or built from an id) still resolve.
 */
export function findBySlug<T extends { id: string }>(
  items: readonly T[],
  slug: string,
  getLabel: (item: T) => string
): T | undefined {
  const target = slug.toLowerCase();
  return (
    items.find(item => slugify(getLabel(item)) === target) ??
    items.find(item => item.id === slug)
  );
}
