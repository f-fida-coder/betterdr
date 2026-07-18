#!/usr/bin/env node
//
// gen-version.mjs — post-build step (runs after `vite build`).
//
// Emits dist/version.json carrying the ENTRY bundle's content hash as the
// deploy's version id, e.g. { "build": "index-DT8wbsMt" }.
//
// WHY: iOS webviews wrap the SPA and can keep executing an old cached bundle
// indefinitely — they never re-fetch index.html on in-app navigation, so a
// deploy goes unnoticed and users run stale JS (this caused a repeated
// false-alarm bug report). The running app reads its OWN entry hash from the
// <script> tag it loaded and compares it against this file (fetched no-store);
// a mismatch means a newer deploy is live and it shows an "Update available"
// prompt.
//
// The entry hash is ideal as the id: Vite embeds every lazy chunk's hashed
// filename into the entry chunk, so ANY code change flows into the entry hash,
// and it's deterministic (same source -> same hash), so identical rebuilds do
// NOT churn the committed dist/version.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// scripts/ lives under frontend/; the build output is the repo-level dist/.
const DIST = resolve(HERE, '../../dist');
const INDEX = resolve(DIST, 'index.html');
const OUT = resolve(DIST, 'version.json');

let html;
try {
  html = readFileSync(INDEX, 'utf8');
} catch {
  console.error(`gen-version: ${INDEX} not found — run after \`vite build\`.`);
  process.exit(1);
}

const match = html.match(/\/assets\/(index-[A-Za-z0-9_-]+)\.js/);
if (!match) {
  console.error('gen-version: could not find the entry bundle hash in index.html');
  process.exit(1);
}

const build = match[1]; // e.g. "index-DT8wbsMt"
writeFileSync(OUT, JSON.stringify({ build }) + '\n');
console.log(`gen-version: wrote dist/version.json (build=${build})`);
