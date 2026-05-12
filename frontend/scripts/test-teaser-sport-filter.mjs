// Mockup test for the teaser-mode sport filter applied in both
// MobileContentView and SportContentView. The reported bug: the
// player had MLB checked in the sidebar, switched to the Teaser
// tab, and the board still showed MLB games — even though MLB
// isn't a teaser-eligible product. After the fix, the board
// drops every non-football / non-basketball match when in
// teaser mode.
//
// Mirror of teaserSportGroup + the filter rule. Two must stay
// in lockstep with the production helper.
//
// Run: node frontend/scripts/test-teaser-sport-filter.mjs
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

// Pure-JS mirror of teaserSportGroup from utils/teaserAdjustment.
const teaserSportGroup = (sportKeyOrId) => {
    const key = String(sportKeyOrId || '').toLowerCase().trim();
    if (key === '') return null;
    if (key.startsWith('americanfootball_') || key === 'football') return 'football';
    if (key.startsWith('basketball_') || key === 'basketball') return 'basketball';
    return null;
};

// Mirror of the filter from MobileContentView / SportContentView.
// Returns the matches that should render given a mode and a list of
// matches with sportKey.
const filterForMode = (matches, mode) => {
    const isTeaser = String(mode || '').toLowerCase() === 'teaser';
    return matches.filter((m) => {
        if (!Array.isArray(m?.markets) || m.markets.length === 0) return false;
        if (isTeaser) {
            const group = teaserSportGroup(m?.sportKey || m?.sport);
            if (!group) return false;
        }
        return true;
    });
};

const mkMatch = (id, sportKey, withMarkets = true) => ({
    id,
    sportKey,
    markets: withMarkets ? [{ key: 'h2h' }] : [],
});

console.log('teaserSportGroup classification covers the products we ship');
{
    expect('NBA → basketball', 'basketball', teaserSportGroup('basketball_nba'));
    expect('WNBA → basketball', 'basketball', teaserSportGroup('basketball_wnba'));
    expect('NFL → football', 'football', teaserSportGroup('americanfootball_nfl'));
    expect('NCAAF → football', 'football', teaserSportGroup('americanfootball_ncaaf'));
    expect('MLB → null (not teaser-eligible)', null, teaserSportGroup('baseball_mlb'));
    expect('NHL → null', null, teaserSportGroup('icehockey_nhl'));
    expect('Soccer EPL → null', null, teaserSportGroup('soccer_epl'));
    expect('Empty → null', null, teaserSportGroup(''));
    expect('Whitespace → null', null, teaserSportGroup('   '));
}

console.log('Reported scenario — MLB checked, switched to Teaser');
{
    const matches = [
        mkMatch('a', 'baseball_mlb'),
        mkMatch('b', 'baseball_mlb'),
        mkMatch('c', 'baseball_mlb'),
    ];
    const result = filterForMode(matches, 'teaser');
    expect('Teaser mode + MLB-only slate → no rows rendered', [], result.map((m) => m.id));
    // Same matches in straight mode pass through.
    const straight = filterForMode(matches, 'straight');
    expect('Straight mode passes MLB through', ['a', 'b', 'c'], straight.map((m) => m.id));
}

console.log('Mixed slate — only football + basketball survive in teaser mode');
{
    const matches = [
        mkMatch('nba1', 'basketball_nba'),
        mkMatch('mlb1', 'baseball_mlb'),
        mkMatch('nfl1', 'americanfootball_nfl'),
        mkMatch('nhl1', 'icehockey_nhl'),
        mkMatch('wnba1', 'basketball_wnba'),
        mkMatch('soccer1', 'soccer_epl'),
    ];
    const result = filterForMode(matches, 'teaser');
    expect(
        'only eligible sports shown',
        ['nba1', 'nfl1', 'wnba1'],
        result.map((m) => m.id),
    );
}

console.log('Edge cases — markets-empty and missing-sport drop cleanly');
{
    const matches = [
        mkMatch('a', 'basketball_nba'),
        mkMatch('b', 'basketball_nba', false), // empty markets → dropped regardless
        mkMatch('c', ''),                       // missing sportKey → dropped in teaser
    ];
    const teaserResult = filterForMode(matches, 'teaser');
    expect('empty-markets dropped + unknown-sport dropped', ['a'], teaserResult.map((m) => m.id));
    const straightResult = filterForMode(matches, 'straight');
    expect(
        'straight mode keeps unknown-sport with markets',
        ['a', 'c'],
        straightResult.map((m) => m.id),
    );
}

console.log('Mode normalization — Teaser / TEASER / teaser all behave the same');
{
    const matches = [mkMatch('mlb', 'baseball_mlb')];
    expect('lowercase teaser filters', [], filterForMode(matches, 'teaser').map((m) => m.id));
    expect('uppercase TEASER filters', [], filterForMode(matches, 'TEASER').map((m) => m.id));
    expect('mixed-case Teaser filters', [], filterForMode(matches, 'Teaser').map((m) => m.id));
    expect(
        'unknown mode falls through to non-teaser (passes MLB)',
        ['mlb'],
        filterForMode(matches, 'parlay').map((m) => m.id),
    );
}

console.log('End-to-end — the user\'s exact slate');
{
    // Screenshot: 2 sports selected, teaser tab, MLB + ??? showing.
    // After fix: only football/basketball cards remain on screen.
    const matches = [
        mkMatch('angels-guardians', 'baseball_mlb'),
        mkMatch('yankees-orioles', 'baseball_mlb'),
        mkMatch('rays-jays', 'baseball_mlb'),
        // Add some BB to show what would survive if the slate was mixed.
        mkMatch('nba-game', 'basketball_nba'),
    ];
    const result = filterForMode(matches, 'teaser');
    expect(
        'every MLB game removed; NBA stays',
        ['nba-game'],
        result.map((m) => m.id),
    );
}

console.log('');
if (failures.length > 0) {
    console.log(`FAIL: ${failures.length} assertion(s) failed (${passes} passed)`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
}
console.log(`PASS: ${passes} assertions, 0 failures`);
process.exit(0);
