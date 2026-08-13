import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

// Optional Sentry source-map upload (PRODUCTION DEBUGGING)
// Only active when the Sentry auth env vars are set (e.g. in CI). Without them
// the plugin is skipped entirely, so local/other builds are unaffected.
//   SENTRY_AUTH_TOKEN  → Settings → Auth Tokens (project:releases + project:read)
//   SENTRY_ORG         → your Sentry org slug
//   SENTRY_PROJECT     → your Sentry project slug
const sentryPlugin =
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        release: { create: true },
        sourcemaps: { assets: 'dist/**' },
        telemetry: false,
      })
    : null

// Release stamp inlined into the app so Sentry events are tagged per build
// (set VITE_APP_RELEASE, e.g. the git SHA, in CI).
const APP_RELEASE = process.env.VITE_APP_RELEASE || ''

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(sentryPlugin ? [sentryPlugin] : [])],
  define: {
    __APP_RELEASE__: JSON.stringify(APP_RELEASE),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
  },
})
