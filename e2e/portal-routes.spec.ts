import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

// The portal needs a real account, which CI does not have. These tests stub the
// password grant so the URL behaviour can be checked on its own: the app is
// driven by the session it receives, not by who signed in.
const NOW = Math.floor(Date.now() / 1000);
const b64 = (o: object) =>
  Buffer.from(JSON.stringify(o)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const USER = {
  id: '00000000-0000-0000-0000-0000000000aa',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'probe@example.com',
  app_metadata: { role: 'admin' },
  user_metadata: {},
  created_at: new Date().toISOString(),
};

const SESSION = {
  access_token: [
    b64({ alg: 'HS256', typ: 'JWT' }),
    b64({ sub: USER.id, role: USER.role, aud: USER.aud, email: USER.email, exp: NOW + 3600, iat: NOW, app_metadata: USER.app_metadata }),
    'signature',
  ].join('.'),
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: NOW + 3600,
  refresh_token: 'probe-refresh',
  user: USER,
};

/**
 * These tests need a configured Supabase client, because the stub only replaces
 * the HTTP call — an unconfigured build answers from a local fetch shim and
 * never reaches the network. Skip rather than fail in that case.
 */
function hasSupabaseEnv(): boolean {
  if (process.env.VITE_SUPABASE_URL) return true;
  return ['.env', '.env.local'].some(file => {
    if (!fs.existsSync(file)) return false;
    return /^VITE_SUPABASE_URL=\S+/m.test(fs.readFileSync(file, 'utf8'));
  });
}

async function stubAuth(page: Page) {
  await page.route('**/auth/v1/token?grant_type=password', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION) }));
  await page.route('**/auth/v1/user', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }));
}

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('your@email.com').fill('probe@example.com');
  await page.getByPlaceholder('••••••••').fill('irrelevant');
  await page.getByRole('button', { name: /sign in/i }).click();
}

test.describe('Portal URLs', () => {
  test.skip(!hasSupabaseEnv(), 'Requires VITE_SUPABASE_URL — sign-in cannot be stubbed without a real client.');

  test('signing in leaves /login for the portal', async ({ page }) => {
    await stubAuth(page);
    await signIn(page);

    await expect(page).toHaveURL(/\/portal\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByText('Overview', { exact: false }).first()).toBeVisible();
  });

  test('portal screens have their own URLs and survive a reload', async ({ page }) => {
    await stubAuth(page);
    await signIn(page);
    await expect(page).toHaveURL(/\/portal\/dashboard$/, { timeout: 15_000 });

    await page.getByText('All Employees', { exact: false }).first().click();
    await expect(page).toHaveURL(/\/portal\/employees$/);

    await page.reload();
    await expect(page).toHaveURL(/\/portal\/employees$/);
    await expect(page.getByText('Overview', { exact: false }).first()).toBeVisible();
  });

  test('browse views are nested under All Employees, not their own section', async ({ page }) => {
    await stubAuth(page);
    await signIn(page);
    await expect(page).toHaveURL(/\/portal\/dashboard$/, { timeout: 15_000 });

    // The old sidebar section is gone...
    await expect(page.getByText('Browse By')).toHaveCount(0);

    // ...and its views open as a submenu of All Employees.
    const allEmployees = page.getByRole('button', { name: /All Employees/ }).first();
    await expect(allEmployees).toHaveAttribute('aria-expanded', 'false');
    await allEmployees.click();

    await expect(page).toHaveURL(/\/portal\/employees$/);
    await expect(allEmployees).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('button', { name: 'Present Station' }).click();
    await expect(page).toHaveURL(/\/portal\/station$/);
    await expect(page.getByRole('button', { name: 'Present Station' })).toBeVisible();
  });

  test('the learners register opens from its URL', async ({ page }) => {
    await stubAuth(page);
    await signIn(page);
    await expect(page).toHaveURL(/\/portal\/dashboard$/, { timeout: 15_000 });

    await page.goto('/portal/learners');
    await expect(page.getByText('Learners Register').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /add learner/i })).toBeVisible();

    // The sidebar entry points at the same screen.
    await page.getByRole('button', { name: 'Learners', exact: true }).first().click();
    await expect(page).toHaveURL(/\/portal\/learners$/);
  });

  test('a portal URL shows the login form to a signed-out visitor', async ({ page }) => {
    await page.goto('/portal/dashboard');
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  });
});
