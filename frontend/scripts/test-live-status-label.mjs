#!/usr/bin/env node
/**
 * Mockup test for the live-status label formatter used by MobileContentView.
 *
 * Reference: user-supplied screenshot from bettorjuice365.com showing
 *   "9TH INN" / "8TH INN" / "7TH INN" on live MLB rows. The board's
 *   live label was rebuilt to match that ordinal style across sports:
 *     MLB     → "9TH INN" (optional " TOP"/" BOT" half indicator)
 *     NBA/NFL → "3RD QTR 12:34"
 *     NHL     → "2ND PRD 8:42"
 *     Soccer  → "1ST H 38'12"
 *
 * The production label builder is interleaved with React render flow,
 * so this test mirrors the algorithm here. Keep both implementations
 * in lockstep or the test stops being meaningful.
 *
 * Usage:
 *   node frontend/scripts/test-live-status-label.mjs
 */

let passes = 0;
const failures = [];

function expect(label, expected, actual) {
    const ok = expected === actual;
    if (ok) { passes++; console.log(`  ✓ ${label}`); return; }
    failures.push(label);
    console.log(`  ✗ ${label}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
}

// Mirror of MobileContentView.jsx::ordinalSuffix
function ordinalSuffix(n) {
    const v = Math.abs(Math.trunc(n));
    const lastTwo = v % 100;
    if (lastTwo >= 11 && lastTwo <= 13) return 'TH';
    switch (v % 10) {
        case 1: return 'ST';
        case 2: return 'ND';
        case 3: return 'RD';
        default: return 'TH';
    }
}

// Mirror of the label-building branch inside the formatted-match map.
function buildLiveStatusLabel({ sportKey, period, clock, eventStatus = '', isLive = true }) {
    if (!isLive) return '';
    const periodNum = Number(period || 0);
    const clockText = String(clock || '').trim();
    const sportKeyLower = String(sportKey || '').toLowerCase();
    const periodSuffix = sportKeyLower.startsWith('icehockey') ? 'PRD'
        : sportKeyLower.startsWith('soccer') ? 'H'
            : sportKeyLower.startsWith('baseball') ? 'INN'
                : 'QTR';
    const isBaseball = sportKeyLower.startsWith('baseball');

    if (periodNum > 0) {
        const ord = ordinalSuffix(periodNum);
        const periodPart = `${periodNum}${ord} ${periodSuffix}`;
        if (isBaseball) {
            return clockText ? `${periodPart} ${clockText.toUpperCase()}` : periodPart;
        }
        return clockText ? `${periodPart} ${clockText}` : periodPart;
    }
    if (clockText) return clockText;
    return String(eventStatus || '')
        .replace(/^STATUS_/, '')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────
// 1) Ordinal helper — covers the edge cases that trip people up
// ─────────────────────────────────────────────────────────
console.log('Ordinal suffix');
expect('1 → ST',  'ST', ordinalSuffix(1));
expect('2 → ND',  'ND', ordinalSuffix(2));
expect('3 → RD',  'RD', ordinalSuffix(3));
expect('4 → TH',  'TH', ordinalSuffix(4));
expect('5 → TH',  'TH', ordinalSuffix(5));
expect('9 → TH',  'TH', ordinalSuffix(9));
expect('10 → TH', 'TH', ordinalSuffix(10));
expect('11 → TH (not ST)', 'TH', ordinalSuffix(11));
expect('12 → TH (not ND)', 'TH', ordinalSuffix(12));
expect('13 → TH (not RD)', 'TH', ordinalSuffix(13));
expect('21 → ST', 'ST', ordinalSuffix(21));
expect('22 → ND', 'ND', ordinalSuffix(22));
expect('23 → RD', 'RD', ordinalSuffix(23));
expect('111 → TH (teens rule wins)', 'TH', ordinalSuffix(111));
expect('113 → TH', 'TH', ordinalSuffix(113));
expect('121 → ST', 'ST', ordinalSuffix(121));

// ─────────────────────────────────────────────────────────
// 2) Reference book screenshot — exact matches
// ─────────────────────────────────────────────────────────
console.log('\nReference screenshot — pin exact strings');
expect('MLB 9th inning → 9TH INN', '9TH INN', buildLiveStatusLabel({
    sportKey: 'baseball_mlb', period: 9,
}));
expect('MLB 8th inning → 8TH INN', '8TH INN', buildLiveStatusLabel({
    sportKey: 'baseball_mlb', period: 8,
}));
expect('MLB 7th inning → 7TH INN', '7TH INN', buildLiveStatusLabel({
    sportKey: 'baseball_mlb', period: 7,
}));

// ─────────────────────────────────────────────────────────
// 3) Baseball half-inning indicator (ESPN-supplied)
// ─────────────────────────────────────────────────────────
console.log('\nBaseball half-inning indicator');
expect('5th inning Top → 5TH INN TOP', '5TH INN TOP', buildLiveStatusLabel({
    sportKey: 'baseball_mlb', period: 5, clock: 'Top',
}));
expect('3rd inning Bot → 3RD INN BOT', '3RD INN BOT', buildLiveStatusLabel({
    sportKey: 'baseball_mlb', period: 3, clock: 'Bot',
}));
expect('7th inning Mid → 7TH INN MID', '7TH INN MID', buildLiveStatusLabel({
    sportKey: 'baseball_mlb', period: 7, clock: 'Mid',
}));

// ─────────────────────────────────────────────────────────
// 4) Time-based sports — clock appended
// ─────────────────────────────────────────────────────────
console.log('\nTime-based sports');
expect('NBA Q3 12:34 → 3RD QTR 12:34', '3RD QTR 12:34', buildLiveStatusLabel({
    sportKey: 'basketball_nba', period: 3, clock: '12:34',
}));
expect('NFL Q4 0:15 → 4TH QTR 0:15', '4TH QTR 0:15', buildLiveStatusLabel({
    sportKey: 'americanfootball_nfl', period: 4, clock: '0:15',
}));
expect('NHL P2 8:42 → 2ND PRD 8:42', '2ND PRD 8:42', buildLiveStatusLabel({
    sportKey: 'icehockey_nhl', period: 2, clock: '8:42',
}));
expect('Soccer H1 38\'12 → 1ST H 38\'12', "1ST H 38'12", buildLiveStatusLabel({
    sportKey: 'soccer_epl', period: 1, clock: "38'12",
}));
expect('NBA between-quarters (no clock) → 3RD QTR', '3RD QTR', buildLiveStatusLabel({
    sportKey: 'basketball_nba', period: 3, clock: '',
}));

// ─────────────────────────────────────────────────────────
// 5) Edge cases — missing data, OT, pre-period fallback
// ─────────────────────────────────────────────────────────
console.log('\nEdge cases');
expect('NBA OT period 5 → 5TH QTR (frontend tolerates beyond-regulation)', '5TH QTR', buildLiveStatusLabel({
    sportKey: 'basketball_nba', period: 5,
}));
expect('No period, no clock → event-status fallback', 'In Progress', buildLiveStatusLabel({
    sportKey: 'basketball_nba', period: 0, eventStatus: 'STATUS_IN_PROGRESS',
}));
expect('Not live → empty string', '', buildLiveStatusLabel({
    sportKey: 'basketball_nba', period: 3, clock: '12:34', isLive: false,
}));
expect('Clock-only fallback when period absent', 'HT', buildLiveStatusLabel({
    sportKey: 'soccer_epl', period: 0, clock: 'HT',
}));

// ─────────────────────────────────────────────────────────
// 6) Negative regression — old "Q3", "Inn 5" formats should NOT appear
// ─────────────────────────────────────────────────────────
console.log('\nNegative regression — old format must be gone');
const nba = buildLiveStatusLabel({ sportKey: 'basketball_nba', period: 3, clock: '12:34' });
expect('NBA no longer starts with "Q"', false, nba.startsWith('Q3 '));
const mlb = buildLiveStatusLabel({ sportKey: 'baseball_mlb', period: 5 });
expect('MLB no longer starts with "Inn "', false, mlb.startsWith('Inn '));

// ─────────────────────────────────────────────────────────
console.log('');
const total = passes + failures.length;
if (failures.length === 0) {
    console.log(`✅ All ${total} assertions passed.`);
    process.exit(0);
}
console.log(`❌ ${passes}/${total} passed. Failures:`);
failures.forEach((f) => console.log(`  - ${f}`));
process.exit(1);
