// Mockup test for the live-score extraction in MobileContentView.
// Mirrors the rawHome/rawAway → team1Score/team2Score derivation that
// drives the new live-score badge on each match card. Pulled out so we
// can pin the edge cases (null / empty / non-numeric / "0") that
// determine whether the card prints a score, a zero, or nothing.
//
// Run: node frontend/scripts/test-live-score-extraction.mjs
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

// Mirror of the score derivation in MobileContentView. Returns
// `{ team1Score, team2Score, shouldRender }` where shouldRender is
// the same check the JSX uses (isLive + score !== null && !== undefined).
function deriveScores(match) {
    const homeName = match.homeTeam || match.home_team || '';
    const awayName = match.awayTeam || match.away_team || '';
    const eventStatus = (match.score?.event_status || '').toString().toUpperCase();
    const isLive = match.status === 'live' || eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE');

    const rawHome = match?.score?.score_home;
    const rawAway = match?.score?.score_away;
    const homeScore = (rawHome !== null && rawHome !== '' && Number.isFinite(Number(rawHome)))
        ? Number(rawHome) : null;
    const awayScore = (rawAway !== null && rawAway !== '' && Number.isFinite(Number(rawAway)))
        ? Number(rawAway) : null;

    return {
        isLive,
        team1Score: awayScore,
        team2Score: homeScore,
        // Render flag the JSX uses: live AND score is not null/undefined.
        team1ShouldRender: isLive && awayScore !== null && awayScore !== undefined,
        team2ShouldRender: isLive && homeScore !== null && homeScore !== undefined,
        homeName,
        awayName,
    };
}

console.log('live game with both scores set');
{
    const result = deriveScores({
        status: 'live',
        homeTeam: '76ers', awayTeam: 'Knicks',
        score: { score_home: 92, score_away: 84, event_status: 'IN_PROGRESS', period: 4, clock: '5:43' },
    });
    expect('isLive=true', true, result.isLive);
    expect('away score = 84', 84, result.team1Score);
    expect('home score = 92', 92, result.team2Score);
    expect('away render gated true', true, result.team1ShouldRender);
    expect('home render gated true', true, result.team2ShouldRender);
}

console.log('live game with zero score (start of game)');
{
    const result = deriveScores({
        status: 'live',
        homeTeam: 'Spurs', awayTeam: 'Wolves',
        // 0 is a legitimate live score (tip-off / opening minute) so
        // the card must render "0", not blank it out.
        score: { score_home: 0, score_away: 0, period: 1, clock: '11:58' },
    });
    expect('zero away score still renders', true, result.team1ShouldRender);
    expect('zero home score still renders', true, result.team2ShouldRender);
    expect('zero coerces to numeric 0', 0, result.team1Score);
}

console.log('pre-game with no score data');
{
    const result = deriveScores({
        status: 'scheduled',
        homeTeam: 'Cavaliers', awayTeam: 'Pistons',
        // Pre-game match docs sometimes ship a score object with empty
        // string fields. The card must NOT render scores yet.
        score: { score_home: '', score_away: '' },
    });
    expect('isLive=false', false, result.isLive);
    expect('empty string → null', null, result.team1Score);
    expect('render gated off when not live', false, result.team1ShouldRender);
    expect('render gated off for home too', false, result.team2ShouldRender);
}

console.log('pre-game with no score object at all');
{
    const result = deriveScores({
        status: 'scheduled',
        homeTeam: 'Cavaliers', awayTeam: 'Pistons',
    });
    expect('missing score → null scores', null, result.team1Score);
    expect('missing score → null home', null, result.team2Score);
    expect('render gated off', false, result.team1ShouldRender);
}

console.log('live detection via event_status fallback');
{
    // Some feeds leave status='scheduled' even after tip-off and only
    // flag the live state via score.event_status. The card must
    // still treat these as live.
    const result = deriveScores({
        status: 'scheduled',
        homeTeam: 'Thunder', awayTeam: 'Lakers',
        score: { score_home: 45, score_away: 38, event_status: 'STATUS_IN_PROGRESS' },
    });
    expect('event_status promotes to live', true, result.isLive);
    expect('away score renders', true, result.team1ShouldRender);
}

console.log('non-numeric score (defensive: feed corruption)');
{
    const result = deriveScores({
        status: 'live',
        homeTeam: 'Heat', awayTeam: 'Celtics',
        score: { score_home: 'TBD', score_away: null },
    });
    expect('non-numeric → null (no render)', null, result.team2Score);
    expect('null → null', null, result.team1Score);
    expect('render gated off for bad data', false, result.team1ShouldRender);
    expect('render gated off for non-numeric', false, result.team2ShouldRender);
}

console.log('finished match still has scores but isLive=false');
{
    // A graded match no longer renders the live score in this lane
    // (final scores belong to settlement screens, not the live board).
    // Test: the card-level render gate is off even though scores exist.
    const result = deriveScores({
        status: 'finished',
        homeTeam: 'Mavericks', awayTeam: 'Nuggets',
        score: { score_home: 104, score_away: 99, event_status: 'STATUS_FINAL' },
    });
    expect('isLive=false on finished', false, result.isLive);
    expect('numeric scores still parse', 99, result.team1Score);
    expect('render gated off when not live', false, result.team1ShouldRender);
}

console.log('end-to-end replay of the screenshot');
{
    // Knicks vs 76ers in the screenshot — LIVE badge present but no
    // score shown. After this change the card renders 84 / 92 next
    // to the team names.
    const result = deriveScores({
        status: 'live',
        homeTeam: '76ers', awayTeam: 'Knicks',
        score: { score_home: 92, score_away: 84, event_status: 'IN_PROGRESS' },
    });
    expect('Knicks 84 renders', 84, result.team1Score);
    expect('76ers 92 renders', 92, result.team2Score);
    expect('both gates open', true, result.team1ShouldRender && result.team2ShouldRender);
}

console.log('');
if (failures.length > 0) {
    console.log(`FAIL: ${failures.length} assertion(s) failed (${passes} passed)`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
}
console.log(`PASS: ${passes} assertions, 0 failures`);
process.exit(0);
