/* The Board Office keeps the editable Word master in docs/ — it must never be
   served from the website. Vite copies everything in public/ into dist/, so
   this postbuild step drops any Office document (and Word's ~$ lock files)
   that ended up in the build output. */

import { readdirSync, statSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const OFFICE = /\.(docx?|xlsx?|pptx?)$/i;
const LOCKFILE = /^~\$/;

function walk(dir) {
  let removed = 0;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      removed += walk(full);
      continue;
    }
    if (OFFICE.test(name) || LOCKFILE.test(name)) {
      rmSync(full, { force: true });
      console.log(`strip-office: removed ${relative(DIST, full)}`);
      removed++;
    }
  }
  return removed;
}

const removed = walk(DIST);
console.log(
  removed === 0
    ? 'strip-office: no Office documents in dist'
    : `strip-office: ${removed} Office file(s) kept out of the website`,
);
