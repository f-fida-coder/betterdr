// Tests for the split Straight/Parlay default stake mode (PO 2026-07-19).
// Exercises the PURE resolvers in src/utils/betDefaults.js — the same
// functions ModeBetPanel (betslip seeding) and AccountPanel (settings form)
// use — so the fallback, per-bucket, and don't-stomp rules are covered without
// React/DOM.
//
// Run: node frontend/scripts/test-bet-default-mode.mjs
// Exit 0 = pass, 1 = any failure.

import {
    normalizeStakeMode,
    straightDefaultMode,
    parlayDefaultMode,
    defaultModeForBucket,
    reseedModeForBucket,
} from '../src/utils/betDefaults.js';

let passes = 0;
const failures = [];
function expect(label, expected, actual) {
    const ok = JSON.stringify(expected) === JSON.stringify(actual);
    if (ok) { passes++; console.log(`  ✓ ${label}`); return; }
    failures.push(label);
    console.log(`  ✗ ${label}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
}

// A parlay-like tab key used to exercise the non-straight bucket.
const PARLAY = 'parlay';
const TEASER = 'teaser';
const RR = 'round_robin';

console.log('normalizeStakeMode');
expect('win/risk/bet pass through', ['win', 'risk', 'bet'],
    ['win', 'risk', 'bet'].map((m) => normalizeStakeMode(m, 'risk')));
expect('unknown → fallback', 'risk', normalizeStakeMode('nonsense', 'risk'));
expect('empty → fallback', 'win', normalizeStakeMode('', 'win'));
expect('case-insensitive', 'bet', normalizeStakeMode('BET', 'risk'));

console.log('\nBackward-compat: existing account with NO parlayMode');
{
    // Pre-split account: only `mode` present.
    const legacy = { mode: 'win', straightDefault: 1000, parlayDefault: 100 };
    expect('straight mode = mode', 'win', straightDefaultMode(legacy));
    expect('parlay mode FALLS BACK to mode', 'win', parlayDefaultMode(legacy));
    expect('straight bucket resolves to mode', 'win', defaultModeForBucket(legacy, 'straight'));
    expect('parlay bucket falls back to mode', 'win', defaultModeForBucket(legacy, PARLAY));
    // Missing everything → risk default, both buckets.
    expect('empty defaults → risk straight', 'risk', straightDefaultMode(null));
    expect('empty defaults → risk parlay', 'risk', parlayDefaultMode(undefined));
}

console.log('\nIndependent save/load of both modes');
{
    const split = { mode: 'risk', parlayMode: 'win' };
    expect('straight = risk', 'risk', straightDefaultMode(split));
    expect('parlay = win (independent)', 'win', parlayDefaultMode(split));
    const other = { mode: 'win', parlayMode: 'bet' };
    expect('straight = win', 'win', straightDefaultMode(other));
    expect('parlay = bet (independent)', 'bet', parlayDefaultMode(other));
}

console.log('\nCorrect mode applied per bucket on betslip-open');
{
    const defs = { mode: 'bet', parlayMode: 'win' };
    // Open on Straight tab → seeds `mode`.
    expect('open on straight → bet', 'bet', defaultModeForBucket(defs, 'straight'));
    // Open on Parlay/Teaser/RR (all parlay bucket) → seeds `parlayMode`.
    expect('open on parlay → win', 'win', defaultModeForBucket(defs, PARLAY));
    expect('open on teaser → win', 'win', defaultModeForBucket(defs, TEASER));
    expect('open on round_robin → win', 'win', defaultModeForBucket(defs, RR));
}

console.log('\nRe-seed on straight↔parlay tab-switch (untouched)');
{
    const defs = { mode: 'bet', parlayMode: 'win' };
    // Start on Straight, auto-seeded to 'bet' (mode === lastSeeded).
    const toParlay = reseedModeForBucket({
        stakeMode: 'bet', lastSeeded: 'bet', bucketMode: defaultModeForBucket(defs, PARLAY),
    });
    expect('straight→parlay re-seeds to parlayMode', { mode: 'win', seeded: 'win', changed: true }, toParlay);
    // Now on Parlay (seeded 'win'), switch back to Straight.
    const toStraight = reseedModeForBucket({
        stakeMode: 'win', lastSeeded: 'win', bucketMode: defaultModeForBucket(defs, 'straight'),
    });
    expect('parlay→straight re-seeds to mode', { mode: 'bet', seeded: 'bet', changed: true }, toStraight);
    // Same bucket value on both sides → no visible change but ref stays synced.
    const same = reseedModeForBucket({ stakeMode: 'risk', lastSeeded: 'risk', bucketMode: 'risk' });
    expect('equal bucket modes → changed:false', { mode: 'risk', seeded: 'risk', changed: false }, same);
}

console.log('\nDon\'t stomp a MANUAL selection on tab-switch');
{
    const defs = { mode: 'bet', parlayMode: 'win' };
    // User manually clicked a pill → lastSeeded nulled. Switching buckets must
    // NOT overwrite their choice.
    const manual = reseedModeForBucket({
        stakeMode: 'risk', lastSeeded: null, bucketMode: defaultModeForBucket(defs, PARLAY),
    });
    expect('manual pick preserved (null ref)', { mode: 'risk', seeded: null, changed: false }, manual);
    // User changed mode to something != the last seed (touched, not yet nulled):
    // stakeMode !== lastSeeded also counts as touched → don't re-seed.
    const drifted = reseedModeForBucket({
        stakeMode: 'win', lastSeeded: 'bet', bucketMode: 'risk',
    });
    expect('mode != lastSeeded → treated as manual, not re-seeded', { mode: 'win', seeded: 'bet', changed: false }, drifted);
}

console.log('\nOnboarding shape (mode == parlayMode) loads consistently');
{
    // OnboardingGate sends parlayMode = mode. Both buckets resolve to it.
    const onboarded = { mode: 'win', parlayMode: 'win', straightDefault: 1000, parlayDefault: 100 };
    expect('straight = win', 'win', defaultModeForBucket(onboarded, 'straight'));
    expect('parlay = win', 'win', defaultModeForBucket(onboarded, PARLAY));
}

console.log(`\n${failures.length === 0 ? 'PASS' : 'FAIL'} — ${passes} passed, ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);
