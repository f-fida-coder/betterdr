#!/usr/bin/env node
/**
 * Bundle-size budget check (Phase 12).
 *
 * Reads sibling .gz files (produced by vite-plugin-compression) for each
 * critical chunk and fails the build if any exceeds its budget. Run after
 * `vite build` — exits 1 on regression so a CI hook can block the deploy.
 *
 * Edit BUDGETS to add/remove chunks. Use the gzipped size as the truth —
 * raw bytes don't represent what the wire actually sees.
 *
 * Usage: node scripts/check-bundle-budget.mjs
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const ASSETS = join(ROOT, '../dist/assets');
const CHUNKS = join(ASSETS, 'chunks');

// Budgets are gzipped KB. Pick numbers ~10% above current actual so the alarm
// fires on real regressions, not noise. Recompute after intentional growth.
const BUDGETS = {
  // Entry — everything the landing page parses synchronously.
  entry:           { glob: /^index-.+\.js\.gz$/,             dir: ASSETS, maxKB: 12  },
  // Vendor: react + react-dom. Won't shrink without a major rewrite, but
  // shouldn't grow either.
  vendorReact:     { glob: /^vendor-react-.+\.js\.gz$/,      dir: CHUNKS, maxKB: 70  },
  vendorRouting:   { glob: /^vendor-routing-.+\.js\.gz$/,    dir: CHUNKS, maxKB: 18  },
  vendorCommon:    { glob: /^vendor-common-.+\.js\.gz$/,     dir: CHUNKS, maxKB: 16  },
  // Shared utilities loaded with the entry.
  utilsShared:     { glob: /^utils-shared-.+\.js\.gz$/,      dir: CHUNKS, maxKB: 22  },
  appApi:          { glob: /^app-api-.+\.js\.gz$/,           dir: CHUNKS, maxKB: 14  },
  // Lazy route chunks — looser budgets, but a 2x balloon should still fail.
  dashboardViews:  { glob: /^dashboard-views-.+\.js\.gz$/,   dir: CHUNKS, maxKB: 75  },
  adminViews:      { glob: /^admin-views-.+\.js\.gz$/,       dir: CHUNKS, maxKB: 50  },
  casinoViews:     { glob: /^casino-views-.+\.js\.gz$/,      dir: CHUNKS, maxKB: 22  },
  // Render-blocking entry CSS.
  entryCss:        { glob: /^index-.+\.css\.gz$/,            dir: ASSETS, maxKB: 8   },
};

let failed = 0;
console.log('Bundle budget check (gzipped KB):\n');
console.log('  Chunk            Actual   Budget   Status');
console.log('  ---------------- -------- -------- ------');

for (const [name, { glob, dir, maxKB }] of Object.entries(BUDGETS)) {
  let entries;
  try {
    entries = readdirSync(dir).filter((f) => glob.test(f));
  } catch {
    console.log(`  ${name.padEnd(16)} -        ${String(maxKB).padStart(4)} KB MISSING DIR ${dir}`);
    failed++;
    continue;
  }
  if (entries.length === 0) {
    console.log(`  ${name.padEnd(16)} -        ${String(maxKB).padStart(4)} KB NO MATCH (run vite build first?)`);
    failed++;
    continue;
  }
  if (entries.length > 1) {
    console.log(`  ${name.padEnd(16)} ?        ${String(maxKB).padStart(4)} KB AMBIGUOUS (${entries.length} files)`);
    failed++;
    continue;
  }
  const sizeBytes = statSync(join(dir, entries[0])).size;
  const sizeKB = sizeBytes / 1024;
  const ok = sizeKB <= maxKB;
  if (!ok) failed++;
  const status = ok ? 'OK' : 'OVER';
  console.log(`  ${name.padEnd(16)} ${sizeKB.toFixed(1).padStart(6)} KB ${String(maxKB).padStart(4)} KB ${status}`);
}

console.log('');
if (failed > 0) {
  console.error(`✗ ${failed} chunk(s) over budget. Investigate the regression before deploy.`);
  console.error('  - Open dist/stats.html in a browser to see the treemap.');
  console.error('  - If the growth is intentional, raise the budget in scripts/check-bundle-budget.mjs.');
  process.exit(1);
}
console.log('✓ All chunks within budget.');
