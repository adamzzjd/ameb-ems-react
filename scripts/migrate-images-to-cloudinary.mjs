#!/usr/bin/env node
/**
 * One-time backfill: move existing images from Supabase into Cloudinary.
 *
 * What it handles:
 *   1. Legacy base64 images stored in the database (cms_gallery, employees,
 *      site_content, cms_team, cms_news)  → uploaded to Cloudinary.
 *   2. Files stored in the public `images` Supabase Storage bucket (URLs in
 *      the same columns) → downloaded, uploaded to Cloudinary, and the row
 *      updated to the Cloudinary URL (optionally deleting the original file).
 *   3. Already-Cloudinary URLs are skipped (no-op).
 *
 * Requires (in .env or environment):
 *   CLOUDINARY_CLOUD_NAME  (or VITE_CLOUDINARY_CLOUD_NAME)
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *   SUPABASE_URL           (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/migrate-images-to-cloudinary.mjs            # dry run (safe)
 *   node scripts/migrate-images-to-cloudinary.mjs --commit   # perform migration
 *   node scripts/migrate-images-to-cloudinary.mjs --commit --delete-originals
 *     # ...and remove the now-migrated files from the Supabase `images` bucket.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import cloudinaryPkg from 'cloudinary';

const cloudinary = cloudinaryPkg.v2;

// ── Load .env (tiny parser — no extra dependency) ──────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const eq = t.indexOf('=');
      const key = t.slice(0, eq).trim();
      let value = t.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch { /* no .env file — rely on the environment */ }
}
loadEnv();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const COMMIT = process.argv.includes('--commit');
const DELETE_ORIGINALS = process.argv.includes('--delete-originals');

if (!COMMIT) console.log('ℹ️  DRY RUN — nothing is uploaded or changed. Re-run with --commit to migrate.\n');

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('❌ Missing Cloudinary credentials.\n   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env or the environment.');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (service-role key, not the anon key).');
  process.exit(1);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ── Configuration ────────────────────────────────────────────────────────────
const IMAGE_BUCKET = 'images';
const SUPABASE_STORAGE_RE = new RegExp(`/storage/v1/object/public/${IMAGE_BUCKET}/`);
const CLOUDINARY_RE = /res\.cloudinary\.com\/.*\/image\/upload\//;

/** Every table+column that can hold an image, with the Cloudinary folder to use. */
const SOURCES = [
  { table: 'cms_gallery',  columns: ['image'],              folder: 'gallery'   },
  { table: 'employees',    columns: ['photo'],              folder: 'employees' },
  { table: 'cms_news',     columns: ['image'],              folder: 'news'      },
  { table: 'cms_team',     columns: ['photo'],              folder: 'team'      },
  { table: 'site_content', columns: ['logo_url', 'hero_image', 'about_image'], folder: 'site' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Embed automatic format + quality optimization, matching the app's uploads. */
const optimizeUrl = (url) => url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');

/**
 * Note: only the secure URL is stored — the Cloudinary public_id is derived
 * from a content hash so re-running the script is idempotent (identical
 * images upload once, never duplicated).
 */
const PUBLIC_ID = (content) => createHash('sha1').update(content).digest('hex').slice(0, 24);

function uploadBuffer(buffer, folder) {
  return new Promise((res, rej) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: PUBLIC_ID(buffer), resource_type: 'image', overwrite: true },
      (err, result) => {
        if (err || !result?.secure_url) return rej(err || new Error('Cloudinary upload failed'));
        res(optimizeUrl(result.secure_url));
      }
    );
    stream.end(buffer);
  });
}

function uploadDataUri(dataUri, folder) {
  // Hash the base64 payload only (skip the data:image/...;base64, prefix).
  const payload = dataUri.slice(dataUri.indexOf(',') + 1);
  return cloudinary
    .uploader.upload(dataUri, { folder, public_id: PUBLIC_ID(payload), resource_type: 'image', overwrite: true })
    .then(r => optimizeUrl(r.secure_url));
}

const isBase64 = (v) => /^data:image\//i.test(v || '');
const isSupabaseUrl = (v) => SUPABASE_STORAGE_RE.test(v || '');
const isCloudinaryUrl = (v) => CLOUDINARY_RE.test(v || '');

// ── Run ──────────────────────────────────────────────────────────────────────
let migrated = 0;
let skipped = 0;
let failed = 0;

for (const { table, columns, folder } of SOURCES) {
  const { data: rows, error } = await supabase.from(table).select(`id, ${columns.join(', ')}`);
  if (error) {
    console.error(`⚠️  ${table}: ${error.message}`);
    failed += 1;
    continue;
  }
  if (!rows?.length) continue;

  for (const row of rows) {
    for (const col of columns) {
      const value = row[col];
      if (!value || isCloudinaryUrl(value)) { skipped += 1; continue; }

      try {
        let newUrl;
        let oldStoragePath = null;

        if (isBase64(value)) {
          if (COMMIT) newUrl = await uploadDataUri(value, folder);
          console.log(`  ${table}.${col} ${row.id.slice(0, 8)}…  base64 (${Math.round(value.length / 1024)} KB) → cloudinary/${folder}`);
        } else if (isSupabaseUrl(value)) {
          const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
          oldStoragePath = value.slice(value.indexOf(marker) + marker.length);
          if (COMMIT) {
            const res = await fetch(value);
            if (!res.ok) throw new Error(`download failed (${res.status})`);
            const buf = Buffer.from(await res.arrayBuffer());
            newUrl = await uploadBuffer(buf, folder);
          }
          console.log(`  ${table}.${col} ${row.id.slice(0, 8)}…  supabase/${oldStoragePath} → cloudinary/${folder}`);
        } else {
          skipped += 1;
          continue;
        }

        // Counted as migrated even in dry-run (the upload+update are what --commit performs).
        migrated += 1;
        if (!COMMIT) continue;

        // Persist the new URL, then optionally free the old storage file.
        const { error: updErr } = await supabase.from(table).update({ [col]: newUrl }).eq('id', row.id);
        if (updErr) throw new Error(`DB update failed: ${updErr.message}`);
        if (DELETE_ORIGINALS && oldStoragePath) {
          // Non-fatal: the row is already migrated, so a failed file removal
          // is logged as a warning rather than counted as a failure.
          const { error: delErr } = await supabase.storage.from(IMAGE_BUCKET).remove([oldStoragePath]);
          if (delErr) console.warn(`⚠️  could not delete ${oldStoragePath}: ${delErr.message} (delete it manually in the Supabase dashboard)`);
        }
      } catch (e) {
        failed += 1;
        console.error(`❌ ${table}.${col} ${row.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
}

console.log('\n── Summary ─────────────────────────────────────────────');
console.log(`  ${COMMIT ? 'Migrated' : 'Would migrate'} : ${migrated}`);
console.log(`  Skipped  : ${skipped} (empty / already on Cloudinary / unrecognised)`);
console.log(`  Failed   : ${failed}`);
if (!COMMIT) console.log('\nRun with --commit to upload and update rows. Add --delete-originals to also remove migrated files from the Supabase images bucket.');
else if (DELETE_ORIGINALS) console.log('\nOriginal Supabase Storage files were deleted after successful migration.');
