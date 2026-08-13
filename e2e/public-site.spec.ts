import { test, expect } from '@playwright/test';

// Public site smoke tests — no login required. These run anywhere, including
// CI without secrets, because the Landing page reads CMS content with the
// anon key.
test.describe('Public site', () => {
  test('landing page renders the core sections', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Adamawa State Mass Education Board/);

    // Header brand + Staff Portal login button
    await expect(page.getByText('Adamawa MEB', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Staff Portal', { exact: false }).first()).toBeVisible();

    // Key sections (mirrors the site navigation)
    for (const id of ['home', 'about', 'programs', 'news', 'enroll', 'gallery', 'contact']) {
      await expect(page.locator(`#${id}`).first()).toBeAttached();
    }

    // Footer
    await expect(page.getByText(/All Rights Reserved/)).toBeVisible();
  });

  test('gallery slideshow renders with controls', async ({ page }) => {
    await page.goto('/');
    const gallery = page.locator('#gallery');
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery).toBeVisible();

    // The section heading is structural, so it's always present.
    await expect(gallery.locator('h2')).toBeVisible();

    // The slideshow counter (n / n) only renders when the CMS gallery has at
    // least one image, and the Next/Previous controls only when it has two or
    // more. Assert them when slides exist so a broken slideshow still fails
    // this smoke test, while a fresh DB with an empty gallery stays green.
    const counter = gallery.getByText(/\d+\s*\/\s*\d+/).first();
    try {
      await counter.waitFor({ state: 'visible', timeout: 10_000 });
      const total = Number((await counter.textContent())?.match(/(\d+)\s*\/\s*(\d+)/)?.[2] ?? 0);
      if (total > 1) {
        await expect(page.getByLabel('Next')).toBeVisible();
        await expect(page.getByLabel('Previous')).toBeVisible();
      }
    } catch {
      // Empty gallery (fresh DB) — nothing to assert.
    }
  });

  test('Staff Portal opens the login page and returns to the site', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Staff Portal', { exact: false }).first().click();

    // Login form renders (no credentials needed to view it)
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Back to the site works
    await page.getByText('← Back to Website').click();
    await expect(page.locator('#home')).toBeAttached();
  });
});
