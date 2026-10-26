#!/usr/bin/env node
// ── Search Console verification tag (postbuild) ─────────────────────────────
//
// Google Search Console can verify ownership with a meta tag in the document
// head. The token belongs to the Board's Google account and must not be
// hard-coded, so it comes from an environment variable:
//
//   VITE_GOOGLE_SITE_VERIFICATION=<token from Search Console>
//
// (or GOOGLE_SITE_VERIFICATION). Vercel → Project → Settings → Environment
// Variables, then redeploy.
//
// Nothing is written when the variable is absent, so a build without it stays
// exactly as it is rather than shipping a placeholder tag.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const TAG_NAME = 'google-site-verification';
const token = process.env.VITE_GOOGLE_SITE_VERIFICATION || process.env.GOOGLE_SITE_VERIFICATION;
const file = 'dist/index.html';

if (!existsSync(file)) {
  console.warn(`site-verification: ${file} not found — skipping (run after vite build).`);
  process.exit(0);
}

if (!token) {
  console.log('site-verification: no verification token set — nothing to inject.');
  process.exit(0);
}

const html = readFileSync(file, 'utf8');
if (html.includes(`name="${TAG_NAME}"`)) {
  console.log('site-verification: tag already present.');
  process.exit(0);
}

const tag = `    <meta name="${TAG_NAME}" content="${token.replace(/"/g, '&quot;')}" />\n`;
const out = html.replace(/<\/head>/i, `${tag}  </head>`);
if (out === html) {
  console.warn('site-verification: could not find </head> — nothing injected.');
  process.exit(0);
}

writeFileSync(file, out);
console.log(`site-verification: injected ${TAG_NAME} meta tag into ${file}.`);
