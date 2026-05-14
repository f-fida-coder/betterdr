/**
 * Unit tests for the live-MLB situation normalizer that lives inline in
 * frontend/src/components/MobileContentView.jsx (around lines ~820-870,
 * the block that builds `baseballSituation` from `match.score.outs`
 * + `match.score.bases`).
 *
 * The production logic is replicated inline below — keep the two in
 * lockstep when MobileContentView changes (same pattern as the PHP-side
 * LiveFilterTest stub).
 *
 * Self-contained: no npm packages required.
 * Usage: node frontend/tests/baseballSituation.test.js
 */

import assert from 'node:assert/strict';

// ── Inline replica — mirrors MobileContentView.jsx situation builder ──────────

const ordinalSuffix = (n) => {
    const v = Math.abs(Math.trunc(Number(n) || 0));
    const last2 = v % 100;
    if (last2 >= 11 && last2 <= 13) return 'th';
    switch (v % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
};

/**
 * Pure function form of the inline block in MobileContentView. Inputs
 * mirror what the normalizer sees on each match. Returns null when the
 * UI should NOT render the situation badge (between innings, pre-game,
 * non-baseball, etc).
 */
function deriveBaseballSituation({ isLive, isBaseball, periodNum, clockText, scoreOuts, scoreBases }) {
    if (!isLive || !isBaseball || !(periodNum > 0)) return null;
    const halfLower = String(clockText || '').toLowerCase();
    const isPlayingHalf = halfLower === 'top' || halfLower === 'bot';
    const outs = (scoreOuts !== null && scoreOuts !== undefined && scoreOuts !== ''
        && Number.isFinite(Number(scoreOuts)))
        ? Math.max(0, Math.min(3, Number(scoreOuts)))
        : null;
    const bases = (typeof scoreBases === 'string' && /^[01]{3}$/.test(scoreBases))
        ? scoreBases : null;
    if (!isPlayingHalf) return null;
    if (outs === null && bases === null) return null;
    return {
        half: halfLower === 'top' ? 'top' : 'bot',
        inning: periodNum,
        inningLabel: `${periodNum}${ordinalSuffix(periodNum)}`,
        outs,
        bases,
    };
}

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

// ── Tests ─────────────────────────────────────────────────────────────────────

suite('deriveBaseballSituation — happy paths');
test('live MLB top 6th, 2 outs, runners on 1B + 2B → full badge', () => {
    const s = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 6, clockText: 'Top',
        scoreOuts: 2, scoreBases: '110',
    });
    assert.equal(s.half, 'top', 'half = top');
    assert.equal(s.inning, 6, 'inning = 6');
    assert.equal(s.inningLabel, '6th', 'label = 6th');
    assert.equal(s.outs, 2, 'outs = 2');
    assert.equal(s.bases, '110', 'bases = 110');
});

test('live MLB bottom 9th, bases loaded, 1 out → full badge', () => {
    const s = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 9, clockText: 'Bot',
        scoreOuts: 1, scoreBases: '111',
    });
    assert.equal(s.half, 'bot');
    assert.equal(s.inningLabel, '9th');
    assert.equal(s.bases, '111', 'bases loaded encoded as 111');
});

test('ordinal suffixes pick up 1st / 2nd / 3rd / 11th / 21st', () => {
    assert.equal(deriveBaseballSituation({ isLive: true, isBaseball: true, periodNum: 1, clockText: 'Top', scoreOuts: 0, scoreBases: '000' }).inningLabel, '1st');
    assert.equal(deriveBaseballSituation({ isLive: true, isBaseball: true, periodNum: 2, clockText: 'Top', scoreOuts: 0, scoreBases: '000' }).inningLabel, '2nd');
    assert.equal(deriveBaseballSituation({ isLive: true, isBaseball: true, periodNum: 3, clockText: 'Top', scoreOuts: 0, scoreBases: '000' }).inningLabel, '3rd');
    assert.equal(deriveBaseballSituation({ isLive: true, isBaseball: true, periodNum: 11, clockText: 'Top', scoreOuts: 0, scoreBases: '000' }).inningLabel, '11th');
    assert.equal(deriveBaseballSituation({ isLive: true, isBaseball: true, periodNum: 21, clockText: 'Top', scoreOuts: 0, scoreBases: '000' }).inningLabel, '21st');
});

suite('deriveBaseballSituation — hide branches (returns null)');
test('not live → null (no badge on pre-game / scheduled)', () => {
    const s = deriveBaseballSituation({
        isLive: false, isBaseball: true, periodNum: 0, clockText: '',
        scoreOuts: null, scoreBases: null,
    });
    assert.equal(s, null, 'non-live row hides badge');
});

test('not baseball → null (NBA / NFL / soccer never get diamond)', () => {
    const s = deriveBaseballSituation({
        isLive: true, isBaseball: false, periodNum: 3, clockText: '7:21',
        scoreOuts: 2, scoreBases: '110',
    });
    assert.equal(s, null, 'non-baseball hides badge even if stray data leaks in');
});

test('period = 0 → null (live but no inning yet, edge case)', () => {
    const s = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 0, clockText: 'Top',
        scoreOuts: 0, scoreBases: '000',
    });
    assert.equal(s, null, 'period=0 hides badge');
});

test('between innings (Mid / End) → null (outs reset, diamond clears)', () => {
    const sMid = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 7, clockText: 'Mid',
        scoreOuts: 3, scoreBases: '000',
    });
    assert.equal(sMid, null, 'Mid → no badge');

    const sEnd = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 6, clockText: 'End',
        scoreOuts: 3, scoreBases: '000',
    });
    assert.equal(sEnd, null, 'End → no badge');
});

test('outs + bases both null → null (situation block missing)', () => {
    const s = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 5, clockText: 'Top',
        scoreOuts: null, scoreBases: null,
    });
    assert.equal(s, null, 'no situation data → no badge (prevents empty diamond)');
});

suite('deriveBaseballSituation — defensive coercion');
test('outs out of range (5) clamps to 3', () => {
    const s = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 4, clockText: 'Top',
        scoreOuts: 5, scoreBases: '100',
    });
    assert.equal(s.outs, 3, 'outs clamped to 3 (UI never renders "5 Outs")');
});

test('outs as numeric string coerced', () => {
    const s = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 4, clockText: 'Top',
        scoreOuts: '2', scoreBases: '100',
    });
    assert.equal(s.outs, 2, '"2" coerced to int 2');
});

test('bases with garbage chars rejected (null), outs still renders', () => {
    const s = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 4, clockText: 'Top',
        scoreOuts: 1, scoreBases: '1X0',
    });
    assert.equal(s.bases, null, 'malformed bases → null (no diamond)');
    assert.equal(s.outs, 1, 'outs still surfaces');
});

test('bases too short → null', () => {
    const s = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 4, clockText: 'Top',
        scoreOuts: 1, scoreBases: '11',
    });
    assert.equal(s.bases, null, '"11" rejected — must be exactly 3 chars');
});

test('outs missing but bases present → renders bases-only badge', () => {
    const s = deriveBaseballSituation({
        isLive: true, isBaseball: true, periodNum: 4, clockText: 'Bot',
        scoreOuts: null, scoreBases: '010',
    });
    assert.notEqual(s, null, 'badge still shows when only bases known');
    assert.equal(s.outs, null, 'outs left null');
    assert.equal(s.bases, '010', 'bases preserved');
});

test('clockText case-insensitive (TOP / top / Top all accepted)', () => {
    for (const c of ['Top', 'TOP', 'top', 'tOp']) {
        const s = deriveBaseballSituation({
            isLive: true, isBaseball: true, periodNum: 3, clockText: c,
            scoreOuts: 1, scoreBases: '100',
        });
        assert.equal(s.half, 'top', `clockText "${c}" → half=top`);
    }
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
