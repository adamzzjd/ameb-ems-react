// ── Contact links ──────────────────────────────────────────────────────────
//
// Most visitors reach this site on a phone. A phone number and an email
// address rendered as plain text force them to copy it by hand (or give up),
// so they are turned into `tel:` and `mailto:` links wherever they appear.
//
// Numbers are kept in the CMS with the spacing people read ("+234 803 123
// 4567"); dialers need the digits only.

/** `tel:` href for a CMS phone number, or null when there is nothing usable. */
export function telHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Extensions and notes after a number ("… ext 12", "… (office)") are dropped.
  const digits = trimmed.replace(/[^\d+]/g, '');
  const normalised = digits.startsWith('+')
    ? `+${digits.slice(1).replace(/\+/g, '')}`
    : digits.replace(/\+/g, '');
  if (normalised.replace(/\D/g, '').length < 7) return null;
  return `tel:${normalised}`;
}

/** `mailto:` href for a CMS email address, or null when it is not an address. */
export function mailtoHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const address = raw.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) return null;
  return `mailto:${address}`;
}

/** Display helper: CMS address text with empty comma segments removed. */
export function cleanAddress(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .join(', ');
}
