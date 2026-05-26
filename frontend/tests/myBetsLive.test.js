/**
 * Unit tests for the LIVE-badge logic in
 * frontend/src/components/MyBetsView.jsx — specifically `isLiveSnapshot`
 * and its 5-hour kickoff fallback bound.
 *
 * The production logic is replicated inline below — keep it in lockstep
 * with the component when it changes. Same pattern as
 * baseballSituation.test.js / propsFilter.test.js.
 *
 * Self-contained: no npm packages required.
 * Usage: node frontend/tests/myBetsLive.test.js
 */

import assert from 'node:assert/strict';

// ── Inline replicas — mirror MyBetsView.jsx ───────────────────────────────────

const normalizeStatus = (value) => String(value || 'pending').trim().toLowerCase();
const TERMINAL_MATCH_STATUSES = new Set(['finished', 'canceled', 'cancelled', 'expired', 'void', 'abandoned', 'closed', 'settled']);
const LIVE_FALLBACK_MAX_AGE_MS = 5 * 60 * 60 * 1000;

function isLiveSnapshot(snapshot, parentStatus, nowMs) {
    if (!snapshot) return false;
    const status = String(snapshot.status || '').toLowerCase();
    if (status === 'live') return true;
    const eventStatus = String(snapshot?.score?.event_status || '').toUpperCase();
    if (eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE')) return true;
    if (TERMINAL_MATCH_STATUSES.has(status)) return false;
    const startMs = snapshot.startTime ? new Date(snapshot.startTime).getTime() : NaN;
    if (!Number.isFinite(startMs)) return false;
    const sinceKickoffMs = nowMs - startMs;
    if (sinceKickoffMs >= 0
        && sinceKickoffMs <= LIVE_FALLBACK_MAX_AGE_MS
        && normalizeStatus(parentStatus) === 'pending') {
        return true;
    }
    return false;
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

// Anchor "now" for deterministic tests. All offsets below are relative
// to this. Picked an arbitrary timestamp so we don't drift with the
// test-run clock.
const NOW = new Date('2026-05-14T12:20:00Z').getTime();
const isoAt = (offsetMs) => new Date(NOW + offsetMs).toISOString();

// ── Minimal test harness ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(label, fn) {
    try {
        fn();
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m  ${label}`);
    } catch (e) {
        failed++;
        failures.push(`${label}: ${e.message}`);
        console.log(`  \x1b[31m✗\x1b[0m  ${label}`);
        console.log(`       ${e.message}`);
    }
}

function suite(name) {
    console.log(`\n  \x1b[1;34m» ${name}\x1b[0m`);
}

// ── Tests: positive cases (badge SHOULD render) ───────────────────────────────

suite('isLiveSnapshot — positive: legitimate live bets');

test('explicit status="live" → LIVE (canonical signal)', () => {
    const r = isLiveSnapshot({ status: 'live', startTime: isoAt(-30 * 60_000) }, 'pending', NOW);
    assert.equal(r, true);
});

test('score.event_status="STATUS_IN_PROGRESS" → LIVE (raw upstream signal)', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        score: { event_status: 'STATUS_IN_PROGRESS' },
        startTime: isoAt(60 * 60_000), // future kickoff, doesn't matter
    }, 'pending', NOW);
    assert.equal(r, true, 'event_status wins over scheduled status');
});

test('event_status containing "LIVE" → LIVE (case-insensitive)', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        score: { event_status: 'live_inprogress' },
    }, 'pending', NOW);
    assert.equal(r, true);
});

test('kickoff 5 min ago + pending + no other signals → LIVE (the original fallback)', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        startTime: isoAt(-5 * 60_000),
    }, 'pending', NOW);
    assert.equal(r, true, 'short window post-kickoff still surfaces as live');
});

test('kickoff 4h ago + pending → LIVE (within 5h bound — long baseball game)', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        startTime: isoAt(-4 * 60 * 60_000),
    }, 'pending', NOW);
    assert.equal(r, true, 'extra-innings baseball still counts');
});

// ── Tests: regression guards (the bug we just fixed) ──────────────────────────

suite('isLiveSnapshot — regression: stuck-pending bets must NOT badge LIVE');

test('kickoff 6h ago + pending → NOT LIVE (past 5h bound — game must be over)', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        startTime: isoAt(-6 * 60 * 60_000),
    }, 'pending', NOW);
    assert.equal(r, false, 'no game runs 6+ hours; this bet is stuck');
});

test('kickoff 24h ago + pending → NOT LIVE (one day later — definitely stuck)', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        startTime: isoAt(-24 * 60 * 60_000),
    }, 'pending', NOW);
    assert.equal(r, false, 'one-day-old pending bet on a finished game');
});

test('kickoff 7 days ago + pending → NOT LIVE (week-old stuck bet)', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        startTime: isoAt(-7 * 24 * 60 * 60_000),
    }, 'pending', NOW);
    assert.equal(r, false, 'week-old stuck bet — the user-reported scenario');
});

test('exactly 5h post-kickoff + pending → LIVE (boundary inclusive)', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        startTime: isoAt(-5 * 60 * 60_000), // exactly 5h ago
    }, 'pending', NOW);
    assert.equal(r, true, 'exactly at the 5h boundary still counts (<=)');
});

test('5h + 1ms post-kickoff + pending → NOT LIVE (boundary exclusive past it)', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        startTime: isoAt(-(5 * 60 * 60_000 + 1)),
    }, 'pending', NOW);
    assert.equal(r, false, 'just past the 5h boundary');
});

// ── Tests: negative cases (badge should NOT render) ───────────────────────────

suite('isLiveSnapshot — negative: not-yet-live and terminal bets');

test('null snapshot → NOT LIVE (defensive)', () => {
    assert.equal(isLiveSnapshot(null, 'pending', NOW), false);
    assert.equal(isLiveSnapshot(undefined, 'pending', NOW), false);
});

test('future kickoff + pending → NOT LIVE (game hasn\'t started)', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        startTime: isoAt(4 * 60 * 60_000), // 4h in future
    }, 'pending', NOW);
    assert.equal(r, false, 'pregame is not live');
});

test('kickoff passed but parent already settled → NOT LIVE', () => {
    const r = isLiveSnapshot({
        status: 'scheduled',
        startTime: isoAt(-30 * 60_000),
    }, 'won', NOW);
    assert.equal(r, false, 'parent status="won" defeats the fallback');
});

test('terminal match status="finished" + kickoff in past → NOT LIVE', () => {
    const r = isLiveSnapshot({
        status: 'finished',
        startTime: isoAt(-2 * 60 * 60_000),
    }, 'pending', NOW);
    assert.equal(r, false);
});

test('terminal match status="expired" + kickoff in past → NOT LIVE', () => {
    const r = isLiveSnapshot({
        status: 'expired',
        startTime: isoAt(-2 * 60 * 60_000),
    }, 'pending', NOW);
    assert.equal(r, false, 'expired matches do not show LIVE even if pending');
});

test('terminal match status="canceled" → NOT LIVE', () => {
    const r = isLiveSnapshot({ status: 'canceled', startTime: isoAt(-60_000) }, 'pending', NOW);
    assert.equal(r, false);
});

test('missing startTime → NOT LIVE (no fallback possible)', () => {
    const r = isLiveSnapshot({ status: 'scheduled' }, 'pending', NOW);
    assert.equal(r, false, 'no startTime → fallback short-circuits');
});

test('garbage startTime → NOT LIVE', () => {
    const r = isLiveSnapshot({ status: 'scheduled', startTime: 'not a date' }, 'pending', NOW);
    assert.equal(r, false, 'unparsable startTime → NaN guard');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n  ────────────────────────────────────────');
if (failed === 0) {
    console.log(`  \x1b[1;32m✓ All ${passed} tests passed\x1b[0m\n`);
    process.exit(0);
} else {
    console.log(`  \x1b[1;31m✗ ${failed} failed / ${passed + failed} total\x1b[0m\n`);
    for (const f of failures) console.log(`    • ${f}`);
    process.exit(1);
}
