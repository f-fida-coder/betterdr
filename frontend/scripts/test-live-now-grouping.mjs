// Mockup test for the LIVE NOW grouping rules in MobileContentView.
// Mirrors the two behaviours that changed:
//   1. Virtual buckets (commercial-live / up-next) now emit league
//      headers even though `realSelected` is empty.
//   2. The match sort clusters by sportKey alphabetically inside a
//      virtual bucket so the league header only emits once per league,
//      not every few rows.
//
// Run: node frontend/scripts/test-live-now-grouping.mjs
// Exit 0 = pass, 1 = any failure.

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

// Mirror of the grouping helpers from MobileContentView. realSelected
// is the array of leagues the user has checked in the sidebar (which
// excludes virtual buckets); primarySport is the active leftmost
// selection (which IS the virtual bucket when LIVE NOW is open).
function showLeagueHeaders(realSelected, primarySport) {
    const isVirtualBucket = primarySport === 'commercial-live' || primarySport === 'up-next';
    return realSelected.length >= 2 || isVirtualBucket;
}

function sortMatches(matches, realSelected, primarySport) {
    const sportPriority = new Map();
    realSelected.forEach((id, idx) => sportPriority.set(id, idx));
    const priorityFor = (m) => {
        const key = String(m.sportKey || '').toLowerCase();
        return sportPriority.has(key) ? sportPriority.get(key) : Number.POSITIVE_INFINITY;
    };
    const isVirtualBucketSort = primarySport === 'commercial-live' || primarySport === 'up-next';
    return [...matches].sort((a, b) => {
        const pa = priorityFor(a);
        const pb = priorityFor(b);
        if (pa !== pb) return pa - pb;
        if (isVirtualBucketSort) {
            const ka = String(a.sportKey || '').toLowerCase();
            const kb = String(b.sportKey || '').toLowerCase();
            if (ka !== kb) return ka < kb ? -1 : 1;
        }
        return (a.startTime || 0) - (b.startTime || 0);
    });
}

// Build the entries list (interleaved headers + matches) the way
// groupedEntries does in MobileContentView. Returns just the entry
// types in order so we can assert on the shape without dragging in
// React's render tree.
function buildEntries(matches, realSelected, primarySport) {
    const showHeaders = showLeagueHeaders(realSelected, primarySport);
    const sorted = sortMatches(matches, realSelected, primarySport);
    const entries = [];
    let currentLeagueKey = null;
    for (const m of sorted) {
        const leagueKey = String(m.sportKey || '').toLowerCase();
        if (showHeaders && leagueKey && leagueKey !== currentLeagueKey) {
            currentLeagueKey = leagueKey;
            entries.push({ type: 'league', leagueKey });
        }
        entries.push({ type: 'match', leagueKey, id: m.id });
    }
    return entries;
}

console.log('LIVE NOW — headers emit even though realSelected is empty');
{
    // commercial-live = the Live Now virtual bucket. realSelected is
    // empty because the bucket isn't a real league.
    expect('virtual bucket flips headers on', true, showLeagueHeaders([], 'commercial-live'));
    expect('UP NEXT bucket also flips headers on', true, showLeagueHeaders([], 'up-next'));
    expect('single real sport keeps headers off', false, showLeagueHeaders(['basketball_nba'], 'basketball_nba'));
    expect('two real sports always flips headers on', true, showLeagueHeaders(['basketball_nba', 'baseball_mlb'], 'basketball_nba'));
}

console.log('LIVE NOW — matches cluster by sportKey, one header per league');
{
    // Match payload that mirrors the screenshot: WNBA, NBA, soccer,
    // MLB intermixed at various start times. Without the virtual-
    // bucket sort key, sort collapses to start-time only and the
    // league header re-emits row-by-row.
    const matches = [
        { id: 'm1', sportKey: 'basketball_wnba', startTime: 1000 }, // Liberty vs Mystics
        { id: 'm2', sportKey: 'basketball_nba',  startTime: 2000 }, // Knicks vs 76ers
        { id: 'm3', sportKey: 'soccer_argentina_primera_division', startTime: 1500 }, // Club vs Estudiantes
        { id: 'm4', sportKey: 'baseball_mlb',    startTime: 1200 }, // Pirates vs Giants
        { id: 'm5', sportKey: 'basketball_nba',  startTime: 1100 }, // another NBA game earlier
        { id: 'm6', sportKey: 'baseball_mlb',    startTime: 2200 }, // another MLB game later
    ];
    const entries = buildEntries(matches, [], 'commercial-live');
    // Expected: one header per unique sportKey, all of that league's
    // matches contiguous beneath it, alphabetical league order.
    expect(
        'entries cluster by league, one header per league',
        [
            { type: 'league', leagueKey: 'baseball_mlb' },
            { type: 'match', leagueKey: 'baseball_mlb', id: 'm4' },
            { type: 'match', leagueKey: 'baseball_mlb', id: 'm6' },
            { type: 'league', leagueKey: 'basketball_nba' },
            { type: 'match', leagueKey: 'basketball_nba', id: 'm5' },
            { type: 'match', leagueKey: 'basketball_nba', id: 'm2' },
            { type: 'league', leagueKey: 'basketball_wnba' },
            { type: 'match', leagueKey: 'basketball_wnba', id: 'm1' },
            { type: 'league', leagueKey: 'soccer_argentina_primera_division' },
            { type: 'match', leagueKey: 'soccer_argentina_primera_division', id: 'm3' },
        ],
        entries,
    );
    // Spot-check: count of unique header types == count of unique leagues.
    const headerLeagues = entries.filter((e) => e.type === 'league').map((e) => e.leagueKey);
    const uniqueLeagues = new Set(headerLeagues);
    expect('no duplicate headers within the same league', headerLeagues.length, uniqueLeagues.size);
}

console.log('single sport with no virtual bucket — no headers, just matches');
{
    const matches = [
        { id: 'a', sportKey: 'basketball_nba', startTime: 200 },
        { id: 'b', sportKey: 'basketball_nba', startTime: 100 },
    ];
    const entries = buildEntries(matches, ['basketball_nba'], 'basketball_nba');
    expect(
        'no league headers when only one real sport selected',
        [
            { type: 'match', leagueKey: 'basketball_nba', id: 'b' },
            { type: 'match', leagueKey: 'basketball_nba', id: 'a' },
        ],
        entries,
    );
}

console.log('two real sports selected — headers still fire (existing behaviour)');
{
    const matches = [
        { id: 'a', sportKey: 'basketball_nba', startTime: 200 },
        { id: 'b', sportKey: 'baseball_mlb',   startTime: 100 },
    ];
    const entries = buildEntries(matches, ['basketball_nba', 'baseball_mlb'], 'basketball_nba');
    // sportPriority: nba=0, mlb=1. NBA group first.
    expect(
        'two-sport selection groups by user order',
        [
            { type: 'league', leagueKey: 'basketball_nba' },
            { type: 'match', leagueKey: 'basketball_nba', id: 'a' },
            { type: 'league', leagueKey: 'baseball_mlb' },
            { type: 'match', leagueKey: 'baseball_mlb', id: 'b' },
        ],
        entries,
    );
}

console.log('LIVE NOW with an empty match list — no crash, no orphan headers');
{
    expect('empty matches → empty entries', [], buildEntries([], [], 'commercial-live'));
}

console.log('');
if (failures.length > 0) {
    console.log(`FAIL: ${failures.length} assertion(s) failed (${passes} passed)`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
}
console.log(`PASS: ${passes} assertions, 0 failures`);
process.exit(0);
