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
    // Generous timeout: the page resolves the CMS data before it can know the
    // slug is unknown, and the suite runs in parallel against a live database.
    await expect(page.getByText('Programme not found')).toBeVisible({ timeout: 15_000 });
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
    await expect(page.getByText('Programme not found')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Portal entry points', () => {
  // The header on every public page links to these two screens. They must open
  // the screen itself, not bounce the visitor back to the landing page.
  test('Staff Portal link opens the login form from a public sub-page', async ({ page }) => {
    await page.goto('/programs');
    await page.locator('a[href="/login"]').first().click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('/login is a real URL (survives a hard refresh)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  });

  test('Staff PSN link opens self-service from a public sub-page', async ({ page }) => {
    await page.goto('/centres');
    await page.locator('a[href="/self-service"]').first().click();

    await expect(page).toHaveURL(/\/self-service$/);
    await expect(page.getByPlaceholder('e.g. PS/AM/0123')).toBeVisible();
  });

  test('/self-service is a real URL (survives a hard refresh)', async ({ page }) => {
    await page.goto('/self-service');
    await expect(page.getByPlaceholder('e.g. PS/AM/0123')).toBeVisible();
  });
});
