// ── Image sizing for the public site ───────────────────────────────────────
//
// CMS images are uploaded to Cloudinary at full camera resolution; the site
// used to render them as-is, so a phone downloaded 1400px-wide photos for a
// 340px card. These helpers ask Cloudinary for the width actually needed
// (`f_auto` also converts to WebP/AVIF where the browser supports it).
//
// Non-Cloudinary URLs (data URIs, other hosts, Supabase storage) are returned
// untouched, so this is safe to apply everywhere.

const UPLOAD_PATH = /res\.cloudinary\.com\/[^/]+\/image\/upload\//;

/** True when the URL can be resized through Cloudinary's delivery URL. */
export function isCloudinaryImage(src: string | null | undefined): boolean {
  return typeof src === 'string' && UPLOAD_PATH.test(src);
}

/**
 * A Cloudinary URL constrained to `width` px.
 *
 * `c_limit` never upscales, so small originals stay sharp. `dpr_auto` serves
 * 2x to high-density screens without a second URL.
 */
export function cdnImage(
  src: string | null | undefined,
  width: number,
  options: { height?: number; quality?: 'auto' | 'auto:eco' | 'auto:good' } = {},
): string {
  if (!src) return '';
  if (!isCloudinaryImage(src)) return src;

  const { height, quality = 'auto' } = options;
  const parts = [`w_${Math.round(width)}`, 'c_limit'];
  if (height) parts.push(`h_${Math.round(height)}`);
  parts.push('f_auto', 'q_' + quality, 'dpr_auto');

  return src.replace(UPLOAD_PATH, match => `${match}${parts.join(',')}/`);
}

/**
 * A `srcset` across the given widths, for `<img srcSet=… sizes=…>`.
 * Returns undefined for non-Cloudinary sources so the browser just uses `src`.
 */
export function cdnSrcSet(src: string | null | undefined, widths: number[]): string | undefined {
  if (!isCloudinaryImage(src) || widths.length === 0) return undefined;
  return widths
    .slice()
    .sort((a, b) => a - b)
    .map(w => `${cdnImage(src, w)} ${w}w`)
    .join(', ');
}
