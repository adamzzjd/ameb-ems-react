import { defineConfig, loadEnv } from 'vite'
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

// ── Required-env guard ─────────────────────────────────────────────────────
// Vercel sets VERCEL=1 during deploys. If a required VITE_ var is missing
// there, the build fails LOUDLY instead of shipping an app with silently
// broken uploads/auth (the Cloudinary incident). Local and CI builds are
// unaffected — they only get a console warning.
const REQUIRED_VITE_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_CLOUDINARY_CLOUD_NAME',
  'VITE_CLOUDINARY_UPLOAD_PRESET',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (process.env.VERCEL === '1') {
    const missing = REQUIRED_VITE_VARS.filter(key => !env[key])
    if (missing.length > 0) {
      throw new Error(
        `Build failed: missing required environment variables (add them in Vercel → Settings → Environment Variables, then Redeploy): ${missing.join(', ')}`
      )
    }
  } else {
    const missing = REQUIRED_VITE_VARS.filter(key => !env[key])
    if (missing.length > 0) {
      console.warn(
        `[vite] Warning: missing env vars (${missing.join(', ')}). The build will still succeed locally/CI, but uploads and auth will be broken at runtime.`
      )
    }
  }

  return {
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
  }
})
