import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const raw = readFileSync('.env', 'utf8');
const env = {};
for (const line of raw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#') || !t.includes('=')) continue;
  const i = t.indexOf('=');
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const cols = [
  ['site_content', 'logo_url'], ['site_content', 'hero_image'], ['site_content', 'about_image'],
  ['cms_news', 'image'], ['cms_team', 'photo'], ['cms_gallery', 'image'], ['employees', 'photo'],
];
const MISSING_COLUMN_RE = /(column .* does not exist|could not find the .* column)/i;
const count = async (q) => {
  const { count, error } = await q;
  // Postgres: 42703 (undefined column); PostgREST schema cache: "Could not find the 'x' column of 'y' in the schema cache".
  if (error?.code === '42703' || MISSING_COLUMN_RE.test(error?.message ?? '')) {
    return { count: null, error: 'missing column' };
  }
  return { count: count ?? 0, error: error?.message ?? null };
};
let totalBase64 = 0;
for (const [table, col] of cols) {
  const all = await count(supabase.from(table).select('*', { count: 'exact', head: true }));
  if (all.error === 'missing column') {
    console.log(`${table}.${col} | missing column — run supabase/setup_storage.sql to add it`);
    continue;
  }
  const hasVal = await count(supabase.from(table).select('*', { count: 'exact', head: true }).not(col, 'is', null).neq(col, ''));
  const b64 = await count(supabase.from(table).select('*', { count: 'exact', head: true }).ilike(col, 'data:image/%'));
  const stor = await count(supabase.from(table).select('*', { count: 'exact', head: true }).ilike(col, '%/storage/v1/object/public/images/%'));
  const cld = await count(supabase.from(table).select('*', { count: 'exact', head: true }).ilike(col, '%res.cloudinary.com%'));
  totalBase64 += b64.count ?? 0;
  console.log(`${table}.${col} | total=${all.count} hasValue=${hasVal.count} base64=${b64.count} supabaseStorage=${stor.count} cloudinary=${cld.count}`);
}
console.log('\nTOTAL rows with base64 images (should be 0 — Cloudinary-only):', totalBase64);
console.log('Rows with Supabase Storage URLs should also be 0. Any non-zero count means legacy values remain — run supabase/purge_non_cloudinary_images.sql.');
process.exit(0);
