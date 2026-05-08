#!/usr/bin/env node
/**
 * Subsets the FontAwesome 6.5.1 CSS to keep only the icons used in src/.
 * Reads from node_modules/@fortawesome/fontawesome-free/css/all.min.css
 * Writes to public/fonts/fontawesome/all.min.css with relative font URLs.
 *
 * Run: node scripts/subset-fontawesome.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC_CSS = join(ROOT, 'node_modules/@fortawesome/fontawesome-free/css/all.min.css');
const OUT_CSS = join(ROOT, 'public/fonts/fontawesome/all.min.css');
const SCAN_DIR = join(ROOT, 'src');

// Walk src/ and collect every fa-XXX class referenced.
const ICON_RE = /\bfa-([a-z0-9][a-z0-9-]*)\b/g;
const USED_ICONS = new Set();

// Family/utility/sizing/animation classes — keep their CSS rules even though
// they appear as `fa-XXX` in source. Filtering happens against this list.
const NEVER_DROP = new Set([
  'solid', 'regular', 'brands', 'classic', 'sharp', 'light', 'thin', 'duotone',
  'spin', 'spin-pulse', 'spin-reverse', 'pulse', 'beat', 'fade', 'beat-fade',
  'flip', 'flip-horizontal', 'flip-vertical', 'flip-both', 'shake', 'bounce',
  'fw', 'sm', 'xs', '2xs', 'lg', 'xl', '2xl', '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x',
  'rotate-90', 'rotate-180', 'rotate-270', 'rotate-by',
  'pull-left', 'pull-right',
  'border', 'inverse', 'stack', 'stack-1x', 'stack-2x',
  'ul', 'li',
  'layers', 'layers-text', 'layers-counter',
]);

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
      walk(p);
    } else if (/\.(jsx?|tsx?|css|html)$/.test(name)) {
      const text = readFileSync(p, 'utf8');
      let m;
      while ((m = ICON_RE.exec(text)) !== null) {
        if (!NEVER_DROP.has(m[1])) USED_ICONS.add(m[1]);
      }
    }
  }
}
walk(SCAN_DIR);
console.log(`Scanned src/: found ${USED_ICONS.size} unique icon names`);

const css = readFileSync(SRC_CSS, 'utf8');

// CSS is minified — split by `}` so each chunk is one rule.
// Keep the chunk if:
//   - it's an @font-face / @keyframes / :root / media query (no `.fa-NAME:before`)
//   - it doesn't have a `.fa-NAME:before{content:` pattern
//   - or NAME is in USED_ICONS
const ICON_RULE_RE = /\.fa-([a-z0-9-]+):before\{content:/;
const ALIAS_RE = /^\.fa-([a-z0-9-]+):before,\.fa-([a-z0-9-]+):before\{content:/; // alias pairs like .fa-old:before,.fa-new:before{content:"\fXXX"}

let buffer = '';
let depth = 0;
const out = [];

// Walk char-by-char to handle nested braces inside @font-face/@keyframes correctly.
for (let i = 0; i < css.length; i++) {
  const ch = css[i];
  buffer += ch;
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) {
      // Complete top-level rule — decide whether to keep.
      const rule = buffer;
      buffer = '';
      const m = rule.match(ICON_RULE_RE);
      if (!m) {
        out.push(rule); // Utility/font-face/keyframes/etc — always keep.
        continue;
      }
      // Multiple selectors can share one content rule (alias chains).
      // Keep the rule if ANY of the listed names is in USED_ICONS.
      const selectorPart = rule.slice(0, rule.indexOf('{'));
      const names = [...selectorPart.matchAll(/\.fa-([a-z0-9-]+):before/g)].map(x => x[1]);
      if (names.some(n => USED_ICONS.has(n))) out.push(rule);
    }
  }
}

let result = out.join('');

// Drop the .ttf fallback `src:` entries — woff2 is supported by every browser
// PageSpeed targets, and shipping the .ttf files would add ~700 KB.
// Pattern: ,url(../webfonts/...ttf) format("truetype")
result = result.replace(/,url\([^)]+\.ttf\)\s*format\("truetype"\)/g, '');

writeFileSync(OUT_CSS, result);

const before = css.length;
const after = result.length;
console.log(`CSS size: ${(before / 1024).toFixed(1)} KB -> ${(after / 1024).toFixed(1)} KB (${((1 - after / before) * 100).toFixed(1)}% smaller)`);
