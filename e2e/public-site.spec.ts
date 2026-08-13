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
    await page.locator('#gallery').scrollIntoViewIfNeeded();

    // Counter (n / n) and navigation buttons appear once images exist
    await expect(page.getByLabel('Next')).toBeVisible();
    await expect(page.getByLabel('Previous')).toBeVisible();
  });
});
