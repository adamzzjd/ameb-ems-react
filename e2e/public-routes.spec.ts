import { test, expect } from '@playwright/test';

// Public sub-pages (Phase 20) — real shareable routes rendered inside the
// PublicShell. They read CMS content with the anon key, so they run anywhere
// (including CI without secrets) and render their empty states on a fresh DB.
test.describe('Public routes', () => {
  test('programs catalogue renders and links to detail pages', async ({ page }) => {
    await page.goto('/programs');

    await expect(page.getByRole('heading', { name: /program/i }).first()).toBeVisible();
    await expect(page.getByText('Adamawa State Mass Education Board').first()).toBeVisible();

    // When programmes exist, each card links to its shareable slug page.
    const firstCard = page.locator('a[href^="/programs/"]').first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await expect(page).toHaveURL(/\/programs\/.+/);
      await expect(page.getByText('Find a Learning Centre').first()).toBeVisible();
    }
  });

  test('programme detail page shows a friendly empty state for unknown slugs', async ({ page }) => {
    await page.goto('/programs/does-not-exist');
    await expect(page.getByText('Programme not found')).toBeVisible();
    await expect(page.getByRole('link', { name: /browse all programmes/i })).toBeVisible();
  });

  test('news listing renders and links to article pages when items exist', async ({ page }) => {
    await page.goto('/news');
    await expect(page.getByText('Adamawa State Mass Education Board').first()).toBeVisible();

    // On a fresh DB there are no articles — only assert the link shape when
    // the CMS actually has news (same pattern as the gallery slideshow test).
    const firstCard = page.locator('a[href^="/news/"]').first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await expect(page).toHaveURL(/\/news\/.+/);
    }
  });

  test('centres directory renders search and LGA filter', async ({ page }) => {
    await page.goto('/centres');
    await expect(page.getByRole('heading', { name: /find a learning centre/i })).toBeVisible();
    await expect(page.getByLabel('Search learning centres')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All LGAs' })).toBeVisible();
  });

  test('deep links survive a hard refresh (SPA fallback)', async ({ page }) => {
    // A direct server hit (no client-side navigation) must still render the app.
    await page.goto('/programs/does-not-exist');
    await expect(page.getByText('Programme not found')).toBeVisible();
  });
});
