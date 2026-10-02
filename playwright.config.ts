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
 *
 * PORT: E2E gets its own port (5199) so it can never collide with a dev
 * server you already have open — if `npm run dev` is running, Vite takes
 * 5174 and used to leave Playwright waiting on 5173 forever. `--strictPort`
 * means a genuine collision fails loudly instead of silently testing the
 * wrong server, and `reuseExistingServer: false` stops a stale, hours-old dev
 * server from being reused (that one served stale modules and hung on
 * "Loading…").
 */
const PORT = Number(process.env.E2E_PORT || 5199);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  // The CMS pages fetch live data on mount; a cold dev server compiles each
  // route on first hit, which used to blow past the 5s default and fail
  // intermittently (the classic "CI E2E is flaky" symptom).
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI serves the production build (no on-demand transforms, deterministic
    // timings); locally the dev server stays instant to iterate on.
    command: process.env.CI
      ? `npm run build && npx vite preview --port ${PORT} --strictPort`
      : `npx vite --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
