import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const DIST = resolve('dist');
const PORT = 4323;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml; charset=utf-8' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'text/html; charset=utf-8' });
    res.end(body);
  } catch {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await readFile(join(DIST, 'index.html')));
  }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const ARTICLE = '/news/staff-update-your-record-through-self-service';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const absolute = [];
page.on('request', r => { if (r.url().includes('127.0.0.1')) absolute.push(r.url().slice(0, 70)); });

await page.addInitScript(() => {
  window.__samples = [];
  window.__saw = false;
  const tick = () => {
    const root = document.getElementById('root');
    const h1 = document.querySelector('h1');
    const len = (root?.innerText || '').length;
    const spinner = Boolean(document.querySelector('.animate-spin'));
    window.__samples.push({ t: Math.round(performance.now()), len, spinner, h1: Boolean(h1 && h1.textContent.trim()) });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.goto(`http://127.0.0.1:${PORT}${ARTICLE}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const samples = await page.evaluate(() => window.__samples);
// Compress the timeline: only show transitions.
const transitions = [];
let last = null;
for (const s of samples) {
  const key = `${s.len > 2000 ? 'content' : s.len === 0 ? 'empty' : 'short'}|${s.spinner}`;
  if (key !== last) { transitions.push(`${s.t}ms ${key} (len=${s.len})`); last = key; }
}
console.log('root timeline:', transitions.join(' → '));
console.log('absolute localhost requests:', [...new Set(absolute)].slice(0, 8).join(', ') || 'none');

await browser.close();
server.close();
