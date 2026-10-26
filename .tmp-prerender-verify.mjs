import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const DIST = resolve('dist');
const PORT = 4322;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const direct = join(DIST, path);
    const body = await readFile(path.endsWith('/') ? join(direct, 'index.html') : direct).catch(() => readFile(join(DIST, path, 'index.html')));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'text/html; charset=utf-8' });
    res.end(body);
  } catch {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await readFile(join(DIST, 'index.html')));
  }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const ARTICLE = '/news/staff-update-your-record-through-self-service';
const browser = await chromium.launch({ channel: 'chrome', headless: true });

// ── 1. JavaScript disabled: what a non-rendering crawler gets ──
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  for (const path of ['/', '/programs', ARTICLE, '/centres/gss-girei']) {
    const res = await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'domcontentloaded' });
    const info = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim().slice(0, 50),
      jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].length,
      chars: (document.body.innerText || '').length,
      tel: document.querySelectorAll('a[href^="tel:"]').length,
      preload: document.querySelectorAll('link[rel="preload"][as="image"]').length,
    }));
    console.log(`no-JS ${path.padEnd(56)} http=${res.status()} ${JSON.stringify(info)}`);
  }
  await ctx.close();
}

// ── 2. JavaScript enabled: errors, flashes, layout shift ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('pageerror', e => errors.push('pageerror: ' + String(e.message).slice(0, 120)));
  page.on('requestfailed', r => errors.push(`failed: ${r.failure()?.errorText} ${r.url().slice(0, 80)}`));

  await page.addInitScript(() => {
    // Watch for frames where the h1 disappears after having been painted —
    // that is what a "React wipes the snapshot" flash would look like.
    window.__flashes = 0;
    window.__sawH1 = false;
    const tick = () => {
      const h1 = document.querySelector('h1');
      const painted = Boolean(h1 && h1.textContent.trim() && h1.getBoundingClientRect().height > 0);
      if (painted) window.__sawH1 = true;
      else if (window.__sawH1) window.__flashes++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${PORT}${ARTICLE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => ({
    flashes: window.__flashes,
    title: document.title,
    cls: 0,
  }));
  const cls = await page.evaluate(() => new Promise(r => {
    let v = 0;
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; })
      .observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => r(v), 600);
  }));
  console.log(`\nJS-on article: flashes=${out.flashes} CLS=${cls.toFixed(4)} settled=${Date.now() - t0}ms`);
  console.log(`console errors: ${errors.length ? errors.slice(0, 4).join(' | ') : 'none'}`);
  console.log('react adopted the markup =', await page.evaluate(() => (document.getElementById('root')?.innerHTML.length ?? 0) > 2000));
  await ctx.close();
}

await browser.close();
server.close();
