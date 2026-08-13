import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke tests for the critical user journeys.
 *
 * Uses the SYSTEM-installed Chrome (`channel: 'chrome'`) so no Playwright
 * browser download is required — works locally on machines that already have
 * Chrome and on GitHub Actions runners (which ship Chrome preinstalled).
 *
 * Auth-gated tests skip gracefully when E2E_USER_EMAIL / E2E_USER_PASSWORD
 * aren't set (CI without secrets, or local without a test account), so the
 * public-site spec alone still runs everywhere.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel: 'chrome',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: process.env.E2E_BASE_URL || 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
