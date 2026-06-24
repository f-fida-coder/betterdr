#!/usr/bin/env node
//
// board-parity.mjs — static drift detector for the sportsbook board surfaces.
//
// Read-only, zero-dependency. It does NOT change any component; it parses the
// existing source and asserts two invariants that have silently drifted before:
//
//   1. Bet-mode TAB PARITY — the mobile `tabs-bar` and desktop `bet-type-bar`
//      in DashboardHeader.jsx must expose the same bet-mode ids in the same
//      order. (A mode added to one bar but not the other is a real bug — e.g.
//      the "OPEN" open-parlay tab had to land in both.)
//
//   2. Board COLUMN-VISIBILITY PARITY — for every selectable mode, the desktop
//      board (SportContentView showSpread/showMoneyline/showTotals) and the
//      mobile board (getVisibleMarketsForMode) must agree on which of
//      spread / moneyline / total columns are shown. A mismatch means the same
//      bet mode offers different markets depending on device.
//
// Exit code: 0 = clean (or only allow-listed known divergences), 1 = new drift.
//
// KNOWN_DIVERGENCES is an explicit, documented allowlist so a pre-existing,
// separately-tracked issue does not block CI — while ANY *new* drift fails.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

const HEADER = read('frontend/src/components/DashboardHeader.jsx');
const DESKTOP = read('frontend/src/components/SportContentView.jsx');
const MOBILE = read('frontend/src/components/MobileContentView.jsx');

// Documented, accepted divergences. Key format: "<mode>:<market>".
// Remove an entry once the underlying source is brought back into parity.
const KNOWN_DIVERGENCES = new Set([
  // (empty) — no accepted divergences. Any board/tab drift fails the check.
  // Add an entry "<mode>:<market>" with a comment only to temporarily accept a
  // documented, separately-tracked gap.
]);

let failures = 0;
let warnings = 0;
const fail = (m) => { console.error(`FAIL ${m}`); failures++; };
const warn = (m) => { console.warn(`WARN ${m}`); warnings++; };
const pass = (m) => console.log(`PASS ${m}`);

// --- helpers ---------------------------------------------------------------

// Extract the bet-mode id list from a JSX tab array anchored on a className.
function tabIds(src, className) {
  const i = src.indexOf(`className="${className}"`);
  if (i === -1) return null;
  const rest = src.slice(i);
  const end = rest.indexOf('].map');
  const block = end === -1 ? rest : rest.slice(0, end);
  return [...block.matchAll(/id:\s*'([a-z_]+)'/g)].map((m) => m[1]);
}

// Build a callable predicate (normalizedMode) => boolean from a JS expression
// lifted out of the real source, so we evaluate the actual logic, not a copy.
function predicate(expr) {
  // eslint-disable-next-line no-new-func
  return new Function('normalizedMode', `return (${expr});`);
}

// --- 1. Tab-bar parity -----------------------------------------------------

const mobileTabs = tabIds(HEADER, 'tabs-bar');
const desktopTabs = tabIds(HEADER, 'bet-type-bar');

if (!mobileTabs || !desktopTabs) {
  fail('could not locate tabs-bar / bet-type-bar arrays in DashboardHeader.jsx (markup changed — update this check)');
} else if (JSON.stringify(mobileTabs) !== JSON.stringify(desktopTabs)) {
  fail(
    'bet-mode tab bars diverge:\n' +
    `       mobile  tabs-bar      = [${mobileTabs.join(', ')}]\n` +
    `       desktop bet-type-bar = [${desktopTabs.join(', ')}]`
  );
} else {
  pass(`bet-mode tab bars in parity (${mobileTabs.length}: ${mobileTabs.join(', ')})`);
}

const modes = [...new Set([...(mobileTabs || []), ...(desktopTabs || [])])];

// --- 2. Board column-visibility parity -------------------------------------

function desktopVisibility() {
  const grab = (name) => {
    const m = DESKTOP.match(new RegExp(`const ${name}\\s*=\\s*([^;]+);`));
    return m ? predicate(m[1]) : null;
  };
  return {
    showSpread: grab('showSpread'),
    showMoneyline: grab('showMoneyline'),
    showTotals: grab('showTotals'),
  };
}

function mobileVisibility() {
  const fn = MOBILE.match(/getVisibleMarketsForMode\s*=\s*\(mode\)\s*=>\s*{([\s\S]*?)};/);
  const body = fn ? fn[1] : '';
  const grab = (name) => {
    const m = body.match(new RegExp(`${name}:\\s*([^,\\n]+)`));
    return m ? predicate(m[1].trim()) : null;
  };
  return {
    showSpread: grab('showSpread'),
    showMoneyline: grab('showMoneyline'),
    showTotals: grab('showTotals'),
  };
}

const dv = desktopVisibility();
const mv = mobileVisibility();
const MARKETS = ['showSpread', 'showMoneyline', 'showTotals'];

const missing = MARKETS.filter((mk) => !dv[mk] || !mv[mk]);
if (missing.length) {
  fail(`could not extract board visibility logic for: ${missing.join(', ')} (source shape changed — update this check)`);
}

let boardDrift = 0;
if (!missing.length && modes.length) {
  for (const mode of modes) {
    for (const mk of MARKETS) {
      const d = !!dv[mk](mode);
      const m = !!mv[mk](mode);
      if (d === m) continue;
      const key = `${mode}:${mk}`;
      const msg = `board column ${mk} differs for mode "${mode}": desktop=${d} mobile=${m}`;
      if (KNOWN_DIVERGENCES.has(key)) {
        warn(`${msg}  [known/allow-listed]`);
      } else {
        fail(msg);
      }
      boardDrift++;
    }
  }
  if (boardDrift === 0) {
    pass(`board column visibility in parity across ${modes.length} modes`);
  } else if (failures === 0) {
    pass(`board column visibility: only known/allow-listed divergences (${boardDrift})`);
  }
}

// --- summary ---------------------------------------------------------------

console.log('------------------------------------------------------------');
if (failures === 0) {
  console.log(`board-parity OK${warnings ? ` (${warnings} allow-listed warning${warnings === 1 ? '' : 's'})` : ''}`);
  process.exit(0);
} else {
  console.error(`board-parity FAILED: ${failures} new drift issue${failures === 1 ? '' : 's'} — see FAIL lines above.`);
  process.exit(1);
}
