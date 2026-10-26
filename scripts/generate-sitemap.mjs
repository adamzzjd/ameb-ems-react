#!/usr/bin/env node
// ── Generate public/sitemap.xml before the production build ─────────────────
//
// The detail pages (/programs/<slug>, /centres/<slug>, /news/<slug>) come from
// the database, so a hand-written sitemap would go stale. This runs as npm's
// `prebuild`, reads the public tables with the anon key, and writes the map to
// public/ — which Vite then copies into dist/.
//
// Best-effort on purpose: if the credentials are missing or the request fails,
// the static top-level routes are still written, so a build never fails over a
// sitemap.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SITE = (process.env.VITE_SITE_URL || 'https://asmeb.vercel.app').replace(/\/+$/, '');

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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const key = env.VITE_SUPABASE_ANON_KEY;

// path → lastmod. Every page used to claim `lastmod` = today, which tells
// crawlers the whole site changed on every deploy and teaches them to ignore
// the field. A news article now reports its own publication date.
const today = new Date().toISOString().slice(0, 10);
const paths = new Map([
  ['/', today],
  ['/programs', today],
  ['/centres', today],
  ['/news', today],
]);

async function collect(table, select, toPath, toLastmod) {
  if (!url || !key) return;
  const res = await fetch(`${url}/rest/v1/${table}?select=${select}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  const rows = await res.json();
  for (const row of rows) {
    const p = toPath(row);
    if (!p) continue;
    const lastmod = toLastmod?.(row);
    paths.set(p, lastmod && /^\d{4}-\d{2}-\d{2}/.test(lastmod) ? lastmod.slice(0, 10) : today);
  }
}

// cms_news stores its date as free text (YYYY-MM-DD), hence the guard above.
try {
  await collect('cms_programs', 'title', r => `/programs/${slugify(r.title)}`);
  await collect('cms_news', 'title,date', r => `/news/${slugify(r.title)}`, r => r.date);
  await collect('public_centres', 'name', r => `/centres/${slugify(r.name)}`);
} catch (err) {
  console.warn(`sitemap: using static routes only (${err.message})`);
}

const body = [...paths]
  .map(([p, lastmod]) => `  <url>\n    <loc>${SITE}${p}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${p === '/' ? 'weekly' : 'monthly'}</changefreq>\n  </url>`)
  .join('\n');

writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
console.log(`sitemap: ${paths.size} URLs written to public/sitemap.xml`);
