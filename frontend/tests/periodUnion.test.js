/**
 * Unit tests for the multi-sport period-chip union in
 * frontend/src/components/MobileContentView.jsx —
 * specifically `getPeriodsForSports`.
 *
 * Bug fixed: the chip strip used to read `selectedSports[0]` only, so
 * picking NBA + NHL with NHL first silently dropped Q1–Q4; picking NBA
 * + Tennis (no preset) hid the strip entirely. The new helper unions
 * every checked league's preset so any chip relevant to ANY selected
 * sport is present — the downstream availableSuffixes filter still
 * hides chips whose markets are absent from the returned data.
 *
 * The production logic is replicated inline below — keep it in
 * lockstep with the component when it changes. Same pattern as
 * baseballSituation.test.js / propsFilter.test.js / myBetsLive.test.js.
 *
 * Self-contained: no npm packages required.
 * Usage: node frontend/tests/periodUnion.test.js
 */

import assert from 'node:assert/strict';

// ── Inline replica — mirrors MobileContentView.jsx ────────────────────────────

const FULL_PERIOD = { id: 'full', label: 'Game', suffix: '' };

const BASKETBALL_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
    { id: '2h', label: '2H', suffix: '_h2' },
    { id: '1q', label: '1Q', suffix: '_q1' },
    { id: '2q', label: '2Q', suffix: '_q2' },
    { id: '3q', label: '3Q', suffix: '_q3' },
    { id: '4q', label: '4Q', suffix: '_q4' },
];
const FOOTBALL_PERIODS = BASKETBALL_PERIODS;
const BASEBALL_PERIODS = [
    FULL_PERIOD,
    { id: 'f1', label: 'F1', suffix: '_1st_1_innings' },
    { id: 'f3', label: 'F3', suffix: '_1st_3_innings' },
    { id: 'f5', label: 'F5', suffix: '_1st_5_innings' },
    { id: 'f7', label: 'F7', suffix: '_1st_7_innings' },
];
const HOCKEY_PERIODS = [
    FULL_PERIOD,
    { id: 'p1', label: 'P1', suffix: '_p1' },
    { id: 'p2', label: 'P2', suffix: '_p2' },
    { id: 'p3', label: 'P3', suffix: '_p3' },
];
const SOCCER_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
];

const PERIOD_CONFIG = {
    nba: BASKETBALL_PERIODS,
    'ncaa-basketball': BASKETBALL_PERIODS,
    nfl: FOOTBALL_PERIODS,
    'ncaa-football': FOOTBALL_PERIODS,
    mlb: BASEBALL_PERIODS,
    nhl: HOCKEY_PERIODS,
    soccer: SOCCER_PERIODS,
};

const PERIOD_CONFIG_BY_SLUG_PREFIX = {
    basketball: BASKETBALL_PERIODS,
    americanfootball: FOOTBALL_PERIODS,
    baseball: BASEBALL_PERIODS,
    icehockey: HOCKEY_PERIODS,
    soccer: SOCCER_PERIODS,
};

const PERIOD_CANONICAL_ORDER = [
    'full',
    '1h', '2h',
    '1q', '2q', '3q', '4q',
    'p1', 'p2', 'p3',
    'f1', 'f3', 'f5', 'f7',
];

function getPeriodsForSport(sportId) {
    if (PERIOD_CONFIG[sportId]) return PERIOD_CONFIG[sportId];
    const normalized = String(sportId || '').toLowerCase();
    if (normalized.startsWith('api-')) {
        const category = normalized.slice(4).split('-')[0];
        if (PERIOD_CONFIG_BY_SLUG_PREFIX[category]) return PERIOD_CONFIG_BY_SLUG_PREFIX[category];
    }
    return [FULL_PERIOD];
}

function getPeriodsForSports(realSelected, fallbackSportId) {
    if (!Array.isArray(realSelected) || realSelected.length === 0) {
        return getPeriodsForSport(fallbackSportId);
    }
    const seen = new Map();
    seen.set('full', FULL_PERIOD);
    realSelected.forEach((sportId) => {
        getPeriodsForSport(sportId).forEach((p) => {
            if (!seen.has(p.id)) seen.set(p.id, p);
        });
    });
    return [...seen.values()].sort((a, b) => {
        const ia = PERIOD_CANONICAL_ORDER.indexOf(a.id);
        const ib = PERIOD_CANONICAL_ORDER.indexOf(b.id);
        return (ia === -1 ? Number.POSITIVE_INFINITY : ia)
             - (ib === -1 ? Number.POSITIVE_INFINITY : ib);
    });
}

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        process.stdout.write(`  ✓ ${name}\n`);
    } catch (err) {
        failed++;
        failures.push({ name, err });
        process.stdout.write(`  ✗ ${name}\n`);
    }
}

const ids = (arr) => arr.map((p) => p.id);

// ── Tests ─────────────────────────────────────────────────────────────────────

test('single-sport NBA unchanged: [full, 1h, 2h, 1q, 2q, 3q, 4q]', () => {
    assert.deepEqual(ids(getPeriodsForSports(['nba'], 'nba')),
        ['full', '1h', '2h', '1q', '2q', '3q', '4q']);
});

test('single-sport MLB unchanged: [full, f1, f3, f5, f7]', () => {
    assert.deepEqual(ids(getPeriodsForSports(['mlb'], 'mlb')),
        ['full', 'f1', 'f3', 'f5', 'f7']);
});

test('single-sport NHL unchanged: [full, p1, p2, p3]', () => {
    assert.deepEqual(ids(getPeriodsForSports(['nhl'], 'nhl')),
        ['full', 'p1', 'p2', 'p3']);
});

test('single-sport Soccer unchanged: [full, 1h]', () => {
    assert.deepEqual(ids(getPeriodsForSports(['soccer'], 'soccer')),
        ['full', '1h']);
});

test('multi-sport NBA + NHL: union includes BOTH quarters AND hockey periods', () => {
    const out = ids(getPeriodsForSports(['nba', 'nhl'], 'nba'));
    assert.deepEqual(out, ['full', '1h', '2h', '1q', '2q', '3q', '4q', 'p1', 'p2', 'p3']);
});

test('multi-sport NHL + NBA: SAME chip order regardless of selection order', () => {
    // The original bug: order-dependent — NHL-first would drop quarters.
    // Canonical sort guarantees stability.
    const out = ids(getPeriodsForSports(['nhl', 'nba'], 'nhl'));
    assert.deepEqual(out, ['full', '1h', '2h', '1q', '2q', '3q', '4q', 'p1', 'p2', 'p3']);
});

test('multi-sport NBA + MLB: union includes quarters AND innings', () => {
    const out = ids(getPeriodsForSports(['nba', 'mlb'], 'nba'));
    assert.deepEqual(out,
        ['full', '1h', '2h', '1q', '2q', '3q', '4q', 'f1', 'f3', 'f5', 'f7']);
});

test('multi-sport NBA + Tennis (no preset): quarters survive', () => {
    // Original bug: this case hid the entire chip strip when tennis
    // was first (preset = [FULL_PERIOD] → periods.length === 1).
    const out = ids(getPeriodsForSports(['tennis', 'nba'], 'tennis'));
    assert.deepEqual(out, ['full', '1h', '2h', '1q', '2q', '3q', '4q']);
});

test('multi-sport all four: NBA + NFL + NHL + MLB', () => {
    const out = ids(getPeriodsForSports(['nba', 'nfl', 'nhl', 'mlb'], 'nba'));
    // NBA + NFL share BASKETBALL_PERIODS — dedupe by id keeps one set.
    assert.deepEqual(out, [
        'full', '1h', '2h',
        '1q', '2q', '3q', '4q',
        'p1', 'p2', 'p3',
        'f1', 'f3', 'f5', 'f7',
    ]);
});

test('empty selection falls back to fallbackSportId (Live Now / Up Next virtuals)', () => {
    // These virtual buckets pass selectedSports = ['commercial-live']
    // which realSelected filters out → empty. Helper must not crash and
    // should fall back to the old single-sport path so the LIVE NOW
    // / UP NEXT views render exactly as before.
    assert.deepEqual(ids(getPeriodsForSports([], 'commercial-live')), ['full']);
    assert.deepEqual(ids(getPeriodsForSports([], 'up-next')), ['full']);
    assert.deepEqual(ids(getPeriodsForSports([], 'nba')), ['full', '1h', '2h', '1q', '2q', '3q', '4q']);
});

test('non-array input is treated as empty', () => {
    // Defensive: a future refactor that passes undefined / null must
    // not throw; should fall back like the empty case.
    assert.deepEqual(ids(getPeriodsForSports(null, 'nba')), ['full', '1h', '2h', '1q', '2q', '3q', '4q']);
    assert.deepEqual(ids(getPeriodsForSports(undefined, 'nhl')), ['full', 'p1', 'p2', 'p3']);
});

test('api-slug prefix matching still works inside multi-sport union', () => {
    // Auto-injected sidebar items use `api-baseball-kbo` etc.; the
    // single-sport path strips the prefix and reads BASEBALL_PERIODS.
    // The union path must preserve that resolution.
    const out = ids(getPeriodsForSports(['api-baseball-kbo', 'nba'], 'nba'));
    assert.deepEqual(out,
        ['full', '1h', '2h', '1q', '2q', '3q', '4q', 'f1', 'f3', 'f5', 'f7']);
});

test('canonical order: full FIRST, then halves, then quarters, then hockey, then innings', () => {
    // Locks the canonical ordering — a change in PERIOD_CANONICAL_ORDER
    // (e.g. someone moves quarters before halves) will trip this test
    // so the reviewer notices the UX shift.
    const out = ids(getPeriodsForSports(['nba', 'mlb', 'nhl'], 'nba'));
    assert.deepEqual(out, [
        'full',
        '1h', '2h',
        '1q', '2q', '3q', '4q',
        'p1', 'p2', 'p3',
        'f1', 'f3', 'f5', 'f7',
    ]);
});

test('period objects carry their suffix unchanged (needed for availableSuffixes filter)', () => {
    const out = getPeriodsForSports(['nba', 'nhl'], 'nba');
    const byId = Object.fromEntries(out.map((p) => [p.id, p]));
    assert.equal(byId['1q'].suffix, '_q1');
    assert.equal(byId['p2'].suffix, '_p2');
    assert.equal(byId['full'].suffix, '');
});

// ── Summary ───────────────────────────────────────────────────────────────────

process.stdout.write('\n');
if (failed === 0) {
    process.stdout.write(`  ✓ All ${passed} tests passed\n`);
    process.exit(0);
} else {
    process.stdout.write(`  ${failed} failed / ${passed + failed} total\n`);
    for (const f of failures) {
        process.stdout.write(`    • ${f.name}\n      ${f.err.message}\n`);
    }
    process.exit(1);
}
