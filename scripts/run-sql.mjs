#!/usr/bin/env node
// ── Run the hand-ordered SQL setup scripts against the project database ─────
//
// Usage:
//   node scripts/run-sql.mjs supabase/setup_centre_staff.sql
//   node scripts/run-sql.mjs --read-only supabase/verify_centre_staff.sql
//   node scripts/run-sql.mjs -e "select count(*) from public.centres"
//   node scripts/run-sql.mjs --json /tmp/snapshot.json supabase/snapshot.sql
//
// Credentials are read from .env.local → .env → the environment, in that order,
// and are never printed:
//
//   SUPABASE_DB_URL           postgres://…   direct connection (transactions,
//                                             NOTICEs, multiple result sets)
//   SUPABASE_ACCESS_TOKEN     sbp_…          Management API token (runs as the
//   SUPABASE_PROJECT_REF      <ref>          postgres role; used when no DB URL)
//
// With only a token and one project on the account, the project ref is
// discovered automatically.
//
// `--read-only` refuses to run the file unless every statement is a read: on the
// direct connection it uses a read-only transaction; on the API it wraps the run
// in `begin read only … rollback`.
//
// `--json <path>` writes every row set to a file — used to snapshot tables
// before a destructive migration.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const argv = process.argv.slice(2);
const readOnly = argv.includes('--read-only');

const jsonFlag = argv.indexOf('--json');
const jsonPath = jsonFlag >= 0 ? argv[jsonFlag + 1] : null;
if (jsonFlag >= 0 && !jsonPath) fail('--json needs a path, e.g. --json /tmp/snapshot.json');

const exprFlag = argv.indexOf('-e');
const inlineSql = exprFlag >= 0 ? argv[exprFlag + 1] : null;
if (exprFlag >= 0 && !inlineSql) fail('-e needs a SQL string');

// Values belonging to flags are not file names. Only exclude them when the
// flag is actually present (jsonFlag/exprFlag are -1 otherwise).
const valueIndexes = new Set();
if (jsonFlag >= 0) valueIndexes.add(jsonFlag + 1);
if (exprFlag >= 0) valueIndexes.add(exprFlag + 1);

const files = argv.filter((a, i) => !a.startsWith('--') && !valueIndexes.has(i));

if (files.length === 0 && !inlineSql) {
  fail('Usage: node scripts/run-sql.mjs [--read-only] [--json out.json] <file.sql| -e "sql">');
}

// ── Credentials ─────────────────────────────────────────────────────────────
function readEnvFile(name) {
  if (!existsSync(name)) return {};
  const out = {};
  for (const line of readFileSync(name, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local'), ...process.env };
const dbUrl = env.SUPABASE_DB_URL;
const token = env.SUPABASE_ACCESS_TOKEN;
let projectRef = env.SUPABASE_PROJECT_REF;

// ── Work out what to run ────────────────────────────────────────────────────
// A unit's SQL must end in a semicolon before a transaction wrapper is appended.
const terminate = sql => (/;\s*$/.test(sql) ? sql : `${sql};`);

const units = inlineSql
  ? [{ label: '(inline SQL)', sql: terminate(inlineSql) }]
  : files.map(f => ({ label: f, sql: terminate(readFileSync(f, 'utf8')) }));

const snapshot = {};
let failed = false;

try {
  if (dbUrl) {
    await runDirect();
  } else if (token) {
    await runApi();
  } else {
    fail(
      'No credentials found. Set SUPABASE_DB_URL or SUPABASE_ACCESS_TOKEN in .env.local.'
    );
  }
} catch (err) {
  failed = true;
  console.error(`\n✗ ${err.message}`);
  if (err.detail) console.error(`  detail: ${err.detail}`);
  if (err.hint) console.error(`  hint:   ${err.hint}`);
  if (err.code) console.error(`  code:   ${err.code}`);
}

if (jsonPath && !failed) {
  writeFileSync(jsonPath, JSON.stringify({ exportedAt: new Date().toISOString(), snapshot }, null, 2));
  console.log(`Snapshot written to ${jsonPath}`);
}

if (!failed) console.log(`\n${readOnly ? 'Read-only — no changes applied.' : 'Applied.'}`);
process.exit(failed ? 1 : 0);

// ── Direct Postgres connection ──────────────────────────────────────────────
async function runDirect() {
  const require = createRequire(import.meta.url);
  let pg;
  try {
    pg = require('pg');
  } catch {
    fail(
      'The `pg` driver is not installed. Run this once (it does not touch\n' +
      'package.json or package-lock.json):\n\n  npm install --no-save pg\n'
    );
  }

  try {
    const u = new URL(dbUrl);
    console.log(`Target: ${u.hostname}:${u.port || 5432}${u.pathname}  (direct)${readOnly ? '  — READ ONLY' : ''}`);
  } catch {
    fail('SUPABASE_DB_URL is not a valid connection string.');
  }

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  client.on('notice', n => {
    const msg = n && typeof n === 'object' && 'message' in n ? n.message : String(n);
    if (msg) console.log(`  NOTICE  ${msg}`);
  });

  await client.connect();
  try {
    await client.query(readOnly ? 'begin read only' : 'begin');
    for (const unit of units) {
      console.log(`\n▶ ${unit.label}`);
      const result = await client.query(unit.sql);
      const sets = Array.isArray(result) ? result : [result];
      for (const set of sets) if (set.rows?.length) console.table(set.rows);
      if (jsonPath) snapshot[unit.label] = sets.map(s => s.rows ?? []).flat();
      console.log('  OK');
    }
    await client.query(readOnly ? 'rollback' : 'commit');
  } catch (err) {
    await client.query('rollback').catch(() => {});
    console.error('\nRolled back — nothing was applied.');
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

// ── Management API ──────────────────────────────────────────────────────────
async function runApi() {
  const api = 'https://api.supabase.com/v1';

  if (!projectRef) {
    const res = await fetch(`${api}/projects`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Could not list projects (HTTP ${res.status}): ${await res.text()}`);
    const projects = await res.json();
    if (!Array.isArray(projects) || projects.length !== 1) {
      fail(
        `Set SUPABASE_PROJECT_REF — the token can see ${projects?.length ?? 0} projects, ` +
        'so the target is ambiguous.'
      );
    }
    projectRef = projects[0].id;
    console.log(`Project: ${projects[0].name} (${projectRef})`);
  }

  console.log(`Target: ${projectRef}  (Management API, runs as postgres)${readOnly ? '  — READ ONLY' : ''}`);

  for (const unit of units) {
    console.log(`\n▶ ${unit.label}`);

    // One request per script: the API executes the text on a single connection,
    // so a transaction wrapper gives the same all-or-nothing guarantee as the
    // direct path.
    // The API rejects `rollback` as a statement, so a read-only run commits a
    // read-only transaction instead — which applies nothing.
    const wrapped = readOnly
      ? `begin read only;\n${unit.sql}\ncommit;`
      : `begin;\n${unit.sql}\ncommit;`;

    const res = await fetch(`${api}/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: wrapped }),
    });

    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        const parsed = JSON.parse(text);
        detail = parsed.message || parsed.error || text;
      } catch { /* keep raw text */ }
      throw new Error(`HTTP ${res.status} — ${detail}`);
    }

    let rows = [];
    try {
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed) ? parsed : parsed?.result ?? [];
    } catch {
      rows = [];
    }

    if (Array.isArray(rows) && rows.length) console.table(rows);
    if (jsonPath) snapshot[unit.label] = rows;
    console.log(`  OK (HTTP ${res.status})`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
