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
  ['cms_gallery', 'image'], ['employees', 'photo'], ['cms_news', 'image'],
  ['cms_team', 'photo'], ['site_content', 'logo_url'], ['site_content', 'hero_image'], ['site_content', 'about_image'],
];
const count = async (q) => { const { count, error } = await q; return { count: count ?? 0, error: error?.message ?? null }; };
let totalBase64 = 0;
for (const [table, col] of cols) {
  const base = supabase.from(table).select('*', { count: 'exact', head: true });
  const all = await count(base);
  const hasVal = await count(supabase.from(table).select('*', { count: 'exact', head: true }).not(col, 'is', null).neq(col, ''));
  const b64 = await count(supabase.from(table).select('*', { count: 'exact', head: true }).ilike(col, 'data:image/%'));
  const stor = await count(supabase.from(table).select('*', { count: 'exact', head: true }).ilike(col, '%/storage/v1/object/public/images/%'));
  const cld = await count(supabase.from(table).select('*', { count: 'exact', head: true }).ilike(col, '%res.cloudinary.com%'));
  totalBase64 += b64.count;
  console.log(`${table}.${col} | total=${all.count} hasValue=${hasVal.count} base64=${b64.count} supabaseStorage=${stor.count} cloudinary=${cld.count}`);
}
console.log('\nTOTAL rows with base64 images (to migrate):', totalBase64);
process.exit(0);
