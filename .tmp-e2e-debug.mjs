import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';

const env = {};
for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
page.on('requestfailed', r => console.log('FAILED', r.url().slice(0, 90), r.failure()?.errorText));
page.on('response', r => { if (r.url().includes('supabase')) console.log('RESP', r.status(), r.url().slice(0, 90)); });
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await page.goto('http://localhost:5173/programs/does-not-exist');
for (const t of [2000, 5000, 10000, 20000]) {
  await page.waitForTimeout(t === 2000 ? 2000 : 3000);
  const txt = await page.locator('main').innerText();
  console.log(`--- after ${t}ms:`, txt.replace(/\s+/g, ' ').slice(0, 160));
}
// probe direct fetch from page
const probe = await page.evaluate(async (url) => {
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/cms_programs?select=title`, { headers: { apikey: 'x' } });
    return { ms: Date.now() - t0, status: res.status };
  } catch (e) { return { ms: Date.now() - t0, error: String(e) }; }
}, env.VITE_SUPABASE_URL);
console.log('direct probe:', probe);
await browser.close();
