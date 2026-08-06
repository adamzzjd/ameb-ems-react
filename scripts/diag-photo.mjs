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
// Test 1: minimal columns (no photo)
let t0 = Date.now();
const r1 = await supabase.from('employees').select('id, name, psn').limit(5);
console.log('WITHOUT photo:', r1.error?.message ?? 'OK (' + (r1.data?.length ?? 0) + ' rows)', '|', Date.now() - t0, 'ms');
// Test 2: with photo column
if (r1.data?.[0]?.id) {
  t0 = Date.now();
  const r2 = await supabase.from('employees').select('id, photo').eq('id', r1.data[0].id).single();
  const len = r2.data?.photo?.length ?? 0;
  console.log('WITH photo (1 row):', r2.error?.message ?? 'OK', '| photo length:', len, '|', Date.now() - t0, 'ms');
}
// Test 3: count how many have photo values, and sizes of a few
const { data: sizes, error: e3 } = await supabase.from('employees').select('id, photo').limit(200);
if (e3) console.log('sizes query error:', e3.message);
else {
  const withPhoto = (sizes ?? []).filter(r => r.photo && String(r.photo).length > 50);
  console.log('of', sizes?.length ?? 0, 'rows,', withPhoto.length, 'have photo values');
  const lens = withPhoto.slice(0, 5).map(r => String(r.photo).length);
  console.log('sample photo sizes (chars):', lens);
}
process.exit(0);
