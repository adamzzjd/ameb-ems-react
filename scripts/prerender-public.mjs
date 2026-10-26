#!/usr/bin/env node
// ── Pre-render the public pages (postbuild) ─────────────────────────────────
//
// The public site is a single-page app: every URL arrives with the same
// index.html, and each page's title, description, structured data and content
// are produced by JavaScript after it loads. Google renders JavaScript, but it
// is slow to do so, other engines often do not, and nothing paints until the
// bundle and the CMS query are finished.
//
// This build step serves the built site locally, visits each URL in the
// sitemap with a headless browser, and writes the rendered HTML to
// `dist/<path>/index.html`. Vercel serves those files directly, so:
//
//   * a crawler — and a visitor with JavaScript blocked — gets the real title,
//     description, structured data and copy in the first response;
//   * the browser paints the hero image and text straight from the HTML rather
//     than waiting for the bundle and a Supabase round trip.
//
// The app still mounts over the snapshot and re-renders, then takes over with
// live CMS data (polling every 60s). So a snapshot goes stale the moment the
// Board publishes without redeploying — visitors always see the fresh page, but
// the static copy lags until the next build. Re-deploy after a big
// announcement if you want crawlers to see it immediately.
//
// Best-effort: if anything fails for a URL, that page is skipped and Vercel
// falls back to the normal SPA index.html.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const DIST = resolve('dist');
const PORT = Number(process.env.PRERENDER_PORT || 4321);
const BASE = `http://127.0.0.1:${PORT}`;

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('prerender: dist/index.html not found — run vite build first.');
  process.exit(1);
}

// ── 1. A minimal static server with the SPA fallback Vercel uses ────────────
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, BASE).pathname);
  const candidates = [
    join(DIST, path),
    join(DIST, path.replace(/\/$/, ''), 'index.html'),
  ];
  for (const candidate of candidates) {
    try {
      const body = await readFile(candidate);
      res.writeHead(200, { 'Content-Type': TYPES[extname(candidate)] || 'application/octet-stream' });
      res.end(body);
      return;
    } catch { /* try the next candidate */ }
  }
  // SPA fallback, exactly like vercel.json's rewrite.
  try {
    res.writeHead(200, { 'Content-Type': TYPES['.html'] });
    res.end(await readFile(join(DIST, 'index.html')));
  } catch {
    res.writeHead(404).end('not found');
  }
});

await new Promise(r => server.listen(PORT, '127.0.0.1', r));

// ── 2. The URLs to render: the sitemap, plus the entry screens that matter ──
const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8').catch(() => '');
const fromSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(m => new URL(m[1]).pathname)
  .filter(p => p.startsWith('/'));

const STATIC_ASSETS = new Set(['robots.txt', 'sitemap.xml', 'favicon.svg', 'og-image.png', 'assets']);
const extra = (await readdir(DIST))
  .filter(name => !STATIC_ASSETS.has(name) && !name.includes('.'))
  .map(name => `/${name}`);

const paths = [...new Set(['/', ...fromSitemap, ...extra])]
  .filter(p => !['/login', '/self-service'].includes(p));

// ── 3. Render each one ──────────────────────────────────────────────────────
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const written = [];
const skipped = [];

for (const path of paths) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45_000 });

    // Content is in once React has mounted AND the page has stopped rendering
    // its "not found" / placeholder state — the detail pages fall back to a
    // generic title while their rows are still loading, and snapshotting that
    // would ship a wrong page to crawlers.
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      const text = (document.body.innerText || '').trim();
      const generic = /^(Programme|Learning Centre|Announcement|Centre) — Adamawa|^Page not found|^Article not found|^Centre not found/i.test(document.title);
      return Boolean(root && root.querySelectorAll('*').length > 25 && text.length > 500 && !generic);
    }, undefined, { timeout: 30_000 });

    // The cache is what the app renders from on a visitor's first visit; the
    // snapshot seeds it, so it has to exist before the page is captured.
    await page.waitForFunction(() => Boolean(localStorage.getItem('ameb_cms_cache')), undefined, { timeout: 30_000 });
    await page.waitForTimeout(600);

    const snapshot = await page.evaluate(() => ({
      html: document.documentElement.outerHTML,
      // The app reads this cache on first render; seeding it in the snapshot
      // makes React's first render match the markup below, so there is no
      // flash of a loading state over the pre-painted page.
      cache: localStorage.getItem('ameb_cms_cache'),
      title: document.title,
      // The chunks this route actually needs. Public pages are lazy-loaded, so
      // hydration would suspend on the fallback spinner unless the module is
      // already fetched — modulepreload removes that window.
      chunks: [...new Set(
        performance.getEntriesByType('resource')
          .map(r => r.name)
          .filter(n => /\/assets\/.*\.js$/.test(n))
          .map(n => new URL(n).pathname),
      )],
    }));

    if (!snapshot.cache) {
      skipped.push(`${path} (no CMS cache captured)`);
      await page.close();
      continue;
    }

    const seed =
      `<script>(function(){try{if(!localStorage.getItem('ameb_cms_cache')){` +
      `localStorage.setItem('ameb_cms_cache', ${JSON.stringify(snapshot.cache)});}` +
      `}catch(e){}})();</script>`;

    const preloads = snapshot.chunks
      .filter(href => !snapshot.html.includes(`src="${href}"`) && !snapshot.html.includes(`href="${href}"`))
      .map(href => `<link rel="modulepreload" href="${href}" />`)
      .join('');

    const html = snapshot.html
      .replace(/<head([^>]*)>/i, `<head$1>${seed}${preloads}`);

    const target = path === '/'
      ? join(DIST, 'index.html')
      : join(DIST, path.replace(/^\//, ''), 'index.html');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html, 'utf8');

    written.push(path);
    console.log(`  ✓ ${path}  ${Math.round(html.length / 1024)}KB  "${snapshot.title.slice(0, 44)}"`);
  } catch (err) {
    skipped.push(`${path} (${String(err.message).slice(0, 60)})`);
  }
  await page.close();
}

await browser.close();
server.close();

console.log(`\nprerender: ${written.length} pages written to dist/, ${skipped.length} skipped.`);
skipped.forEach(s => console.log(`  - skipped ${s}`));
// Not fatal: the pages that failed simply keep serving the SPA fallback.
process.exit(0);
