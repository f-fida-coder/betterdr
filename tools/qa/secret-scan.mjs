#!/usr/bin/env node
//
// secret-scan.mjs — pre-commit / CI guard against leaking secrets into git.
//
// Read-only, zero-dependency. It scans ONLY git-tracked files (so it can't be
// fooled by local junk and won't scan node_modules) and fails the build if it
// finds either:
//
//   1. A real environment file committed to the repo (anything matching
//      `.env` / `.env.<x>` EXCEPT the `*.env.example` templates). On a money
//      platform a committed `.env.production` leaks the DB password, JWT secret,
//      Stripe live key, and the Rundown API key in one shot.
//
//   2. A hard secret signature in source (Stripe live/test key, Stripe webhook
//      secret, AWS access key id, Google API key, a PEM private-key header), or
//      a real (non-placeholder) value assigned to a known-sensitive key inside a
//      tracked `.env*` file.
//
// Exit 0 = clean, 1 = at least one finding (printed with file:line).
//
// Scope note: content scanning skips build artifacts (dist/, *.min.js, *.map),
// lockfiles, and binaries — they are minified/generated and produce noise, and
// the real risk surface is source + env files. The committed-env-file rule (1)
// still applies to EVERY tracked path regardless of scope.

import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const SELF = 'tools/qa/secret-scan.mjs';

// --- gather tracked files ---------------------------------------------------
let tracked = [];
try {
  tracked = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
} catch (e) {
  console.error('FAIL secret-scan: could not run `git ls-files` —', e.message);
  process.exit(1);
}

const findings = [];
const add = (file, line, what) => findings.push({ file, line, what });

// --- rule 1: no real env file committed -------------------------------------
// Allow only the *.env.example templates. Everything else that looks like an
// env file is a leak.
const ENV_LIKE = /(^|\/)\.env(\.[A-Za-z0-9_.-]+)?$/;
const ENV_ALLOW = /(^|\/)\.env\.example$/;
for (const f of tracked) {
  if (ENV_LIKE.test(f) && !ENV_ALLOW.test(f)) {
    add(f, 0, 'real environment file committed to git (only *.env.example may be tracked)');
  }
}

// --- content signatures -----------------------------------------------------
// Built from fragments so this scanner file does not itself trip the patterns.
const SIG = [
  { name: 'Stripe live secret key', re: new RegExp('sk' + '_live_' + '[0-9A-Za-z]{16,}') },
  { name: 'Stripe test secret key', re: new RegExp('sk' + '_test_' + '[0-9A-Za-z]{16,}') },
  { name: 'Stripe restricted key',  re: new RegExp('rk' + '_live_' + '[0-9A-Za-z]{16,}') },
  { name: 'Stripe webhook secret',  re: new RegExp('wh' + 'sec_' + '[0-9A-Za-z]{16,}') },
  { name: 'AWS access key id',      re: new RegExp('AKIA' + '[0-9A-Z]{16}') },
  { name: 'Google API key',         re: new RegExp('AIza' + '[0-9A-Za-z_\\-]{35}') },
  { name: 'PEM private key',        re: new RegExp('-----BEGIN' + ' [A-Z ]*PRIVATE KEY-----') },
];

// A match is a placeholder (safe) if it carries one of these tokens.
const PLACEHOLDER = /REPLACE|CHANGE_ME|EXAMPLE|YOUR_|XXXX|<[^>]+>|REDACTED|DUMMY|TEST_?KEY|placeholder/i;

// Sensitive env keys: a non-placeholder, non-empty value in a tracked .env*
// file is a leak (protects .env.example from getting real values pasted in).
const SENSITIVE_ENV = new RegExp(
  '^(JWT_SECRET|MYSQL_PASSWORD|REDIS_PASSWORD|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET'
  + '|RUNDOWN_API_KEY|INTERNAL_TICK_SECRET|METRICS_API_KEY|WS_PUBLISH_KEY)\\s*=\\s*(.+?)\\s*$'
);

// Skip these for CONTENT scanning (rule 1 already covered paths).
const SKIP_CONTENT = [
  /^dist\//, /(^|\/)frontend\/dist\//,
  /\.min\.(js|css)$/, /\.map$/,
  /(^|\/)package-lock\.json$/, /(^|\/)yarn\.lock$/, /(^|\/)pnpm-lock\.yaml$/,
  /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot|pdf|zip|gz|br|mp4|mp3|wasm)$/i,
];
const MAX_BYTES = 2 * 1024 * 1024; // skip files larger than 2MB

const isEnvFile = (f) => ENV_LIKE.test(f);

for (const f of tracked) {
  if (f === SELF) continue;
  if (SKIP_CONTENT.some((re) => re.test(f))) continue;
  try {
    if (statSync(f).size > MAX_BYTES) continue;
  } catch { continue; }

  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  if (text.includes('\u0000')) continue; // binary

  const lines = text.split('\n');
  const envFile = isEnvFile(f);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const s of SIG) {
      const m = s.re.exec(line);
      if (m && !PLACEHOLDER.test(m[0])) {
        add(f, i + 1, s.name);
      }
    }

    if (envFile) {
      const m = SENSITIVE_ENV.exec(line);
      if (m) {
        const val = m[2];
        if (val && !PLACEHOLDER.test(val) && !/^['"]?\s*['"]?$/.test(val)) {
          add(f, i + 1, `real value for sensitive key ${m[1]} in a tracked env file`);
        }
      }
    }
  }
}

// --- report -----------------------------------------------------------------
if (findings.length === 0) {
  console.log(`secret-scan OK — ${tracked.length} tracked files, no secrets or committed env files.`);
  process.exit(0);
}

console.error(`secret-scan FAILED: ${findings.length} potential leak(s):`);
for (const x of findings) {
  console.error(`  FAIL ${x.file}${x.line ? ':' + x.line : ''} — ${x.what}`);
}
console.error('\nIf a finding is a false positive, use an obvious placeholder token');
console.error('(REPLACE_ME / CHANGE_ME / <your-key>) or move the real value into an');
console.error('untracked .env file (only *.env.example may be committed).');
process.exit(1);
