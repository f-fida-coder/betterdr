/**
 * Mock test for the frontend betsForDayIndex day-bucketing fix.
 *
 * Reproduces the two reported symptoms:
 *   1. Sunday bets appear under Monday's drill-down (because the old code
 *      used UTC-midnight boundaries while the backend uses local-TZ midnight).
 *   2. Late-evening bets (7 PM – midnight local) are missing from the day's
 *      drill-down because they fall after UTC midnight.
 *
 * The fix: the backend now embeds startUtc/endUtc in each day object.
 *   The frontend reads those fields instead of computing T00:00:00Z offsets.
 *
 * Run: node frontend/scripts/test-figures-frontend-bucketing.mjs
 */

// ─── helpers ─────────────────────────────────────────────────────────────────

let passes = 0;
const failures = [];

function expect(label, expected, actual) {
    if (expected === actual) {
        console.log(`  ✓ ${label}`);
        passes++;
    } else {
        console.log(`  ✗ ${label}`);
        console.log(`      expected: ${JSON.stringify(expected)}`);
        console.log(`      actual:   ${JSON.stringify(actual)}`);
        failures.push(label);
    }
}

// ─── mirror of the FIXED betsForDayIndex logic ───────────────────────────────
// (no DOM/React needed — pure function extracted for testing)

function betsForDayIndex(data, gradedBets, dayIndex) {
    const dayData = data?.days?.[dayIndex];
    if (!dayData) return [];

    let start, end;
    if (dayData.startUtc && dayData.endUtc) {
        start = new Date(dayData.startUtc);
        end   = new Date(dayData.endUtc);
    } else {
        // Legacy fallback
        if (!data?.weekStart) return [];
        start = new Date(`${data.weekStart}T00:00:00Z`);
        if (isNaN(start.getTime())) return [];
        start.setUTCDate(start.getUTCDate() + dayIndex);
        end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    return gradedBets.filter((bet) => {
        const ts = bet?.settledAt || bet?.updatedAt || bet?.createdAt;
        if (!ts) return false;
        const settled = new Date(ts);
        if (isNaN(settled.getTime())) return false;
        return settled >= start && settled < end;
    });
}

// ─── mirror of the BUGGY old logic (for regression proof) ────────────────────

function betsForDayIndex_OLD(data, gradedBets, dayIndex) {
    if (!data?.weekStart) return [];
    const start = new Date(`${data.weekStart}T00:00:00Z`);
    if (isNaN(start.getTime())) return [];
    start.setUTCDate(start.getUTCDate() + dayIndex);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return gradedBets.filter((bet) => {
        const ts = bet?.settledAt || bet?.updatedAt || bet?.createdAt;
        if (!ts) return false;
        const settled = new Date(ts);
        if (isNaN(settled.getTime())) return false;
        return settled >= start && settled < end;
    });
}

// ─── simulate what the backend NOW returns for week 5/5–5/11 (CT player) ─────
// CT = America/Chicago = UTC-5 (CDT in May)
// Week: Tue 5/5 00:00 CT = 2026-05-05T05:00:00Z
//  day 0 = Tue 5/5  [2026-05-05T05:00:00Z, 2026-05-06T05:00:00Z)
//  day 1 = Wed 5/6  [2026-05-06T05:00:00Z, 2026-05-07T05:00:00Z)
//  day 2 = Thu 5/7  [2026-05-07T05:00:00Z, 2026-05-08T05:00:00Z)
//  day 3 = Fri 5/8  [2026-05-08T05:00:00Z, 2026-05-09T05:00:00Z)
//  day 4 = Sat 5/9  [2026-05-09T05:00:00Z, 2026-05-10T05:00:00Z)
//  day 5 = Sun 5/10 [2026-05-10T05:00:00Z, 2026-05-11T05:00:00Z)
//  day 6 = Mon 5/11 [2026-05-11T05:00:00Z, 2026-05-12T05:00:00Z)

const mockApiResponse = {
    weekStart: '2026-05-05',   // local date, still in the response
    weekEnd:   '2026-05-11',
    carryForward: -3674,
    weekTotal: 2508,
    transactions: 0,
    endBalance: 2634,
    days: [
        { label: 'Tue', date: '5/5',  pl: -1121, startUtc: '2026-05-05T05:00:00Z', endUtc: '2026-05-06T05:00:00Z' },
        { label: 'Wed', date: '5/6',  pl:   997, startUtc: '2026-05-06T05:00:00Z', endUtc: '2026-05-07T05:00:00Z' },
        { label: 'Thu', date: '5/7',  pl:   433, startUtc: '2026-05-07T05:00:00Z', endUtc: '2026-05-08T05:00:00Z' },
        { label: 'Fri', date: '5/8',  pl:     0, startUtc: '2026-05-08T05:00:00Z', endUtc: '2026-05-09T05:00:00Z' },
        { label: 'Sat', date: '5/9',  pl: -1012, startUtc: '2026-05-09T05:00:00Z', endUtc: '2026-05-10T05:00:00Z' },
        { label: 'Sun', date: '5/10', pl:  2980, startUtc: '2026-05-10T05:00:00Z', endUtc: '2026-05-11T05:00:00Z' },
        { label: 'Mon', date: '5/11', pl:   230, startUtc: '2026-05-11T05:00:00Z', endUtc: '2026-05-12T05:00:00Z' },
    ],
};

// Royals and Tigers were LIVE BETs graded Sunday evening CT.
// 10:00 PM CT Sunday 5/10 = 2026-05-11T03:00:00Z  ← this is the bug timestamp
// Backend correctly buckets this in Sunday (day 5).
// Old frontend code would put it in Monday (UTC day crosses midnight).

const royalsBet = {
    id: 'royals-1',
    settledAt: '2026-05-11T03:00:00Z', // 10 PM CT Sun 5/10 → SUNDAY in CT
    status: 'lost',
    amount: 300,
    description: 'Royals +325 LIVE BET L',
};
const tigersBet = {
    id: 'tigers-1',
    settledAt: '2026-05-11T03:30:00Z', // 10:30 PM CT Sun 5/10 → SUNDAY in CT
    status: 'won',
    potentialPayout: 980,
    description: 'Tigers -102 LIVE BET W',
};

// A real Monday 5/11 bet settled 11:45 PM CT (4:45 AM UTC 5/12)
// Old frontend: ends window at 2026-05-12T00:00:00Z → MISSES this bet
// Fixed frontend: ends window at 2026-05-12T05:00:00Z → includes it
const mondayLateBet = {
    id: 'monday-late-1',
    settledAt: '2026-05-12T04:45:00Z', // 11:45 PM CT Mon 5/11 → MONDAY in CT
    status: 'won',
    potentialPayout: 230,
    description: 'Some game Mon 11:45 PM CT',
};

const allGradedBets = [royalsBet, tigersBet, mondayLateBet];

// ─── Bug 1: Sunday bets should NOT appear in Monday's drill-down ─────────────
console.log('\nBug 1: Sunday bets must NOT appear under Monday (CT player)');
{
    const sunBets = betsForDayIndex(mockApiResponse, allGradedBets, 5); // Sun
    const monBets = betsForDayIndex(mockApiResponse, allGradedBets, 6); // Mon

    expect('Royals (Sun 10pm CT) → Sunday drill-down',   true,  sunBets.some(b => b.id === 'royals-1'));
    expect('Tigers (Sun 10:30pm CT) → Sunday drill-down', true,  sunBets.some(b => b.id === 'tigers-1'));
    expect('Royals NOT in Monday drill-down',              false, monBets.some(b => b.id === 'royals-1'));
    expect('Tigers NOT in Monday drill-down',              false, monBets.some(b => b.id === 'tigers-1'));
}

// ─── Bug 2: Late-night Mon bets must appear in Monday's drill-down ────────────
console.log('\nBug 2: Late-evening Monday bets must appear under Monday (CT player)');
{
    const monBets = betsForDayIndex(mockApiResponse, allGradedBets, 6); // Mon
    expect('Late Mon bet (11:45 PM CT) → Monday drill-down', true, monBets.some(b => b.id === 'monday-late-1'));
}

// ─── Prove the OLD code produced both bugs ────────────────────────────────────
console.log('\nRegression proof: OLD code produces the wrong result');
{
    const sunBetsOld = betsForDayIndex_OLD(mockApiResponse, allGradedBets, 5);
    const monBetsOld = betsForDayIndex_OLD(mockApiResponse, allGradedBets, 6);

    // Old code puts Royals/Tigers under Monday (they are 3am UTC Monday)
    const oldBug1_royalsWronglyInMon = monBetsOld.some(b => b.id === 'royals-1');
    const oldBug2_lateMonMissing     = !monBetsOld.some(b => b.id === 'monday-late-1');

    expect('OLD code: Royals incorrectly appears in Monday (proves bug existed)', true,  oldBug1_royalsWronglyInMon);
    expect('OLD code: late-Mon bet missing from Monday (proves bug existed)',     true,  oldBug2_lateMonMissing);
    expect('OLD code: Royals missing from Sunday drill-down (proves bug existed)',false, sunBetsOld.some(b => b.id === 'royals-1'));
}

// ─── Edge: boundary values exactly on startUtc / endUtc ──────────────────────
console.log('\nEdge cases: boundary timestamps');
{
    const exactStartBet = { id: 'edge-start', settledAt: '2026-05-10T05:00:00Z' }; // exactly Sunday start
    const exactEndBet   = { id: 'edge-end',   settledAt: '2026-05-11T05:00:00Z' }; // exactly Sunday end (= Monday start)

    const sunBets = betsForDayIndex(mockApiResponse, [exactStartBet, exactEndBet], 5);
    const monBets = betsForDayIndex(mockApiResponse, [exactStartBet, exactEndBet], 6);

    expect('settledAt == startUtc → included in that day', true,  sunBets.some(b => b.id === 'edge-start'));
    expect('settledAt == endUtc → NOT in that day (half-open)', false, sunBets.some(b => b.id === 'edge-end'));
    expect('settledAt == endUtc → included in NEXT day', true, monBets.some(b => b.id === 'edge-end'));
}

// ─── Legacy fallback: response without startUtc still works (old API) ─────────
console.log('\nLegacy fallback: response without startUtc/endUtc fields');
{
    const legacyResponse = {
        weekStart: '2026-05-05',
        days: mockApiResponse.days.map(({ label, date, pl }) => ({ label, date, pl })), // no UTC bounds
    };
    // For a UTC player the fallback (UTC midnight) is correct.
    const utcBet = { id: 'utc-bet', settledAt: '2026-05-10T12:00:00Z' }; // Sun 5/10 noon UTC
    const sunBets = betsForDayIndex(legacyResponse, [utcBet], 5);
    expect('Legacy (no UTC bounds): UTC-noon bet still lands in correct UTC day', true, sunBets.some(b => b.id === 'utc-bet'));
}

// ─── summary ─────────────────────────────────────────────────────────────────
console.log('');
if (failures.length > 0) {
    console.error(`FAIL: ${failures.length} assertion(s) failed (${passes} passed)`);
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}
console.log(`PASS: ${passes} assertions, 0 failures`);
process.exit(0);
