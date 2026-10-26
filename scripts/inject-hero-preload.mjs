#!/usr/bin/env node
// ── Hero image preload (postbuild) ──────────────────────────────────────────
//
// The hero photograph lives in the database, so until it was fixed the browser
// could not start downloading it until the JavaScript had loaded, React had
// mounted, and the site-content query had come back. That chain is the largest
// part of the time to first contentful paint on a phone.
//
// The sitemap generator already reads the CMS at build time, so this does the
// same: it writes the Cloudinary width candidates for the current hero into the
// HTML as a preload, and the browser starts fetching it with the document.
//
// Best-effort: if the credentials are missing, the request fails, or the hero
// is not a Cloudinary image, nothing is injected and the page behaves as before
// (just without the head start).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CLOUDINARY = /res\.cloudinary\.com\/[^/]+\/image\/upload\//;
const FILE = 'dist/index.html';

function loadEnv() {
  const env = {};
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

/** Same transformation the <img> asks for at runtime (src/lib/image.ts). */
function transform(src, width) {
  const cleaned = src.replace(
    /(image\/upload\/)(?:f_auto,q_auto,?|q_auto,f_auto,?|f_auto,?)+\//gi,
    '$1',
  );
  return cleaned.replace(
    CLOUDINARY,
    m => `${m}w_${width},c_limit,f_auto,q_auto,dpr_auto/`,
  );
}

if (!existsSync(FILE)) {
  console.warn(`hero-preload: ${FILE} not found — skipping (run after vite build).`);
  process.exit(0);
}

const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log('hero-preload: no CMS credentials — nothing to preload.');
  process.exit(0);
}

let hero;
try {
  const res = await fetch(`${url}/rest/v1/site_content?select=hero_image`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  hero = rows?.[0]?.hero_image;
} catch (err) {
  console.warn(`hero-preload: could not read the CMS (${err.message}) — nothing injected.`);
  process.exit(0);
}

if (!hero || !CLOUDINARY.test(hero)) {
  console.log('hero-preload: no Cloudinary hero image — nothing to preload.');
  process.exit(0);
}

const widths = [640, 960, 1280, 1600];
const srcset = widths.map(w => `${transform(hero, w)} ${w}w`).join(', ');
const tag =
  `    <link rel="preload" as="image" fetchpriority="high" sizes="100vw" ` +
  `imagesrcset="${srcset}" />\n`;

const html = readFileSync(FILE, 'utf8');
if (html.includes('rel="preload" as="image"')) {
  console.log('hero-preload: preload already present.');
  process.exit(0);
}

writeFileSync(FILE, html.replace(/<\/head>/i, `${tag}  </head>`));
console.log(`hero-preload: injected a ${widths.length}-width preload for the hero.`);
