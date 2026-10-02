import { test, expect } from '@playwright/test';

// Portal tests need a real sign-in, so they only run when a test account is
// configured (E2E_USER_EMAIL / E2E_USER_PASSWORD — see .env.example). The
// account needs at least employees.create/delete, i.e. an admin+ role.
const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;
const runAuth = Boolean(EMAIL && PASSWORD);

// Unique record per run so repeated runs don't collide.
const uid = Date.now().toString(36);
const testName = `E2E Test ${uid}`;

test.describe('Portal (auth-gated)', () => {
  test.skip(!runAuth, 'E2E_USER_EMAIL / E2E_USER_PASSWORD not set — skipping portal tests');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Staff Portal', { exact: false }).first().click();
    await page.getByPlaceholder('your@email.com').fill(EMAIL!);
    await page.getByPlaceholder('••••••••').fill(PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();
    // Phase 29: role-based landing sends every board user to /portal
    // (partners land on /portal/partner-home).
    await expect(page).toHaveURL(/\/portal/, { timeout: 15_000 });
  });

  test('dashboard loads after login', async ({ page }) => {
    // The Phase 29 dashboard is organised into work sections (Today / The
    // Board / Delivery / Partners) rather than a single "Total Officers" tile.
    await expect(page.getByText('Today', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('The Board', { exact: true }).first()).toBeVisible();
  });

  test('creates, edits, and deletes an employee', async ({ page }) => {
    // "+ Add Employee" lives on the Staff Register only — go there first.
    await page.getByText('Staff Register', { exact: false }).first().click();
    await page.getByRole('button', { name: /\+ Add Employee/ }).click();
    await page.getByPlaceholder('Surname Firstname Middlename').fill(testName);
    await page.getByPlaceholder('PS/AM/XXXX').fill(`PS/E2E/${uid}`);
    // Form selects in order: Gender, Grade, Cadre, LGA, Station, Department
    const selects = page.locator('select');
    await selects.nth(1).selectOption('GL 08');
    await selects.nth(2).selectOption({ label: /Adult Education Officer II/ });
    await page.getByRole('button', { name: '➕ Add Employee' }).click();

    // Search for it in the register
    await page.getByPlaceholder('Name, PSN, phone, station…').fill(testName);
    await expect(page.getByText(testName, { exact: false }).first()).toBeVisible();

    // Edit it (open profile → edit → change name)
    await page.getByText(testName, { exact: false }).first().click();
    await page.getByRole('button', { name: /edit/i }).first().click();
    await page.getByPlaceholder('Surname Firstname Middlename').fill(`${testName} Updated`);
    await page.getByRole('button', { name: /save changes/i }).click();

    // Clean up: delete it
    await page.getByPlaceholder('Name, PSN, phone, station…').fill(`${testName} Updated`);
    await page.getByText(`${testName} Updated`, { exact: false }).first().click();
    await page.getByRole('button', { name: /delete/i }).first().click();
    await page.getByRole('button', { name: /delete permanently/i }).click();
    await expect(page.getByText(`${testName} Updated`, { exact: false })).toHaveCount(0);
  });

  test('retirement page shows the projection table', async ({ page }) => {
    await page.getByText('Retirement & Tenure', { exact: false }).first().click();
    await expect(page.getByText('Total Officers', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/Retirement Date/, { exact: false }).first()).toBeVisible();
  });

  test('My Account shows the signed-in email and role', async ({ page }) => {
    await page.getByText('My Account', { exact: false }).first().click();
    await expect(page.getByText(EMAIL!, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/Role:/, { exact: false }).first()).toBeVisible();
  });
});
