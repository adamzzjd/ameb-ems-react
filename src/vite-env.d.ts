/// <reference types="vite/client" />

// Injected at build time (see vite.config.ts) — the app release stamp used to
// tag Sentry events with the build that produced them.
declare const __APP_RELEASE__: string;
