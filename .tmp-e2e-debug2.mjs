import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const t0 = Date.now();
await page.goto('http://localhost:5173/centres/does-not-exist');
try {
  await page.getByText(/centre not found|centre directory unavailable/i).waitFor({ timeout: 45000 });
  console.log('centre empty state appeared after', Date.now() - t0, 'ms');
} catch {
  console.log('STILL NOT RESOLVED after', Date.now() - t0, 'ms');
  console.log((await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 200));
}
await browser.close();
