<?php

/**
 * Read-only sanity test for the local-timezone day-bucketing fix in
 * WalletController::getFigures. The reported bug: a Sat-night
 * Blue Jays bet (CT) settling around midnight CT showed up under
 * Sunday's row because the original code bucketed by UTC day, which
 * crosses at 19:00 / 20:00 CT.
 *
 * Mirror approach (same pattern as the other backend tests in this
 * session): the production helper is interleaved with DB calls, so
 * we copy the boundary-building + assignment math here.
 *
 * Usage:
 *   php php-backend/scripts/test-figures-day-bucketing.php
 */

declare(strict_types=1);

$passes = 0;
$failures = [];
function expect(string $label, $expected, $actual): void
{
    global $passes, $failures;
    $ok = $expected === $actual;
    if ($ok) { $passes++; echo "  ✓ {$label}\n"; return; }
    $failures[] = $label;
    echo "  ✗ {$label}\n";
    echo "      expected: " . var_export($expected, true) . "\n";
    echo "      actual:   " . var_export($actual, true) . "\n";
}

/**
 * Mirror of getFigures' day-bucketing pipeline.
 *
 * @param string $todayIso Tuesday-anchor reference, ISO 8601 in UTC
 *                         (e.g. '2026-05-13T12:00:00Z' for a query
 *                         placed during the Tue 5/12 → Mon 5/18 week).
 * @param string $userTzName User's display timezone.
 * @return array{
 *   weekStartIso: string,
 *   weekEndIso: string,
 *   assign: callable(string): int  // settledAt ISO → day index 0..6 or -1
 * }
 */
function build_figures_window(string $todayIso, string $userTzName): array
{
    try {
        $tz = new DateTimeZone($userTzName);
    } catch (Throwable) {
        $tz = new DateTimeZone('America/New_York');
    }
    // Anchor "today" in the user's local tz, exactly like the
    // controller does. The test injects a fixed instant so this is
    // deterministic regardless of when the script runs.
    $nowUtc = new DateTimeImmutable($todayIso, new DateTimeZone('UTC'));
    $todayLocal = new DateTimeImmutable($nowUtc->setTimezone($tz)->format('Y-m-d 00:00:00'), $tz);
    $todayDow = (int) $todayLocal->format('N');
    $daysFromTue = ($todayDow - 2 + 7) % 7;
    $weekStart = $todayLocal->modify('-' . $daysFromTue . ' days');
    $weekEnd = $weekStart->modify('+7 days');
    $utc = new DateTimeZone('UTC');

    $bounds = [];
    for ($i = 0; $i < 7; $i++) {
        $s = $weekStart->modify('+' . $i . ' days')->setTimezone($utc)->getTimestamp();
        $e = $weekStart->modify('+' . ($i + 1) . ' days')->setTimezone($utc)->getTimestamp();
        $bounds[] = [$s, $e];
    }

    return [
        'weekStartIso' => $weekStart->setTimezone($utc)->format('Y-m-d\TH:i:s\Z'),
        'weekEndIso' => $weekEnd->setTimezone($utc)->format('Y-m-d\TH:i:s\Z'),
        'assign' => static function (string $iso) use ($bounds): int {
            // Empty-string is filtered by the caller in WalletController
            // before assign() is reached; mirror that here so the test
            // matches production behavior (PHP otherwise parses '' as
            // "now" and silently lands the row in today's bucket).
            if ($iso === '') return -1;
            try {
                $ts = (new DateTimeImmutable($iso))->getTimestamp();
            } catch (Throwable) {
                return -1;
            }
            foreach ($bounds as $i => [$start, $end]) {
                if ($ts >= $start && $ts < $end) return $i;
            }
            return -1;
        },
    ];
}

$DAY_NAMES = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];

echo "Reported Jays scenario — Sat 11pm CT bet lands in Sat, not Sun\n";
{
    // Query placed Sunday 5/10 at noon CT (=17:00 UTC).
    $win = build_figures_window('2026-05-10T17:00:00Z', 'America/Chicago');
    // Bet settled Sat 5/9 at 11:30 PM CT = 04:30 UTC Sun 5/10.
    $idx = ($win['assign'])('2026-05-10T04:30:00Z');
    expect('Sat 11:30 PM CT bet → Sat row', 4, $idx); // 0=Tue ... 4=Sat
    expect('Sat 11:30 PM CT bet label is Sat', 'Sat', $DAY_NAMES[$idx]);
}

echo "Boundary cases around CT midnight (no UTC contamination)\n";
{
    $win = build_figures_window('2026-05-10T17:00:00Z', 'America/Chicago');
    // 11:59 PM CT Sat = 04:59 UTC Sun → Sat
    expect('CT 11:59 PM Sat → Sat', 4, ($win['assign'])('2026-05-10T04:59:00Z'));
    // 00:01 AM CT Sun = 05:01 UTC Sun → Sun
    expect('CT 00:01 AM Sun → Sun', 5, ($win['assign'])('2026-05-10T05:01:00Z'));
    // 11:59 PM CT Sun = 04:59 UTC Mon → Sun
    expect('CT 11:59 PM Sun → Sun', 5, ($win['assign'])('2026-05-11T04:59:00Z'));
    // 00:01 AM CT Mon = 05:01 UTC Mon → Mon
    expect('CT 00:01 AM Mon → Mon', 6, ($win['assign'])('2026-05-11T05:01:00Z'));
}

echo "ET player — same instant lands on the appropriate ET day\n";
{
    $win = build_figures_window('2026-05-10T17:00:00Z', 'America/New_York');
    // Sat 11:30 PM ET = 03:30 UTC Sun → Sat in ET too.
    expect('Sat 11:30 PM ET → Sat', 4, ($win['assign'])('2026-05-10T03:30:00Z'));
    // 00:30 AM ET Sun = 04:30 UTC Sun → Sun in ET.
    expect('Sun 00:30 AM ET → Sun', 5, ($win['assign'])('2026-05-10T04:30:00Z'));
    // CT player would have placed this at 11:30 PM Sat — bucket
    // depends on which player is viewing the figures (ET vs CT).
}

echo "PT player — wider offset confirms tz follows the user\n";
{
    $win = build_figures_window('2026-05-10T17:00:00Z', 'America/Los_Angeles');
    // PT is UTC-7 in May (PDT). 11:30 PM PT Sat = 06:30 UTC Sun → Sat.
    expect('Sat 11:30 PM PT → Sat', 4, ($win['assign'])('2026-05-10T06:30:00Z'));
    expect('Sun 12:30 AM PT → Sun', 5, ($win['assign'])('2026-05-10T07:30:00Z'));
}

echo "UTC player — old behavior preserved as a special case\n";
{
    $win = build_figures_window('2026-05-10T17:00:00Z', 'UTC');
    // For a UTC-set player, midnight UTC IS midnight local. The same
    // input that fixed CT above (04:30 UTC Sun) should land on Sun
    // here because the player sees calendar dates in UTC.
    expect('UTC: 04:30 UTC Sun → Sun', 5, ($win['assign'])('2026-05-10T04:30:00Z'));
    expect('UTC: 23:59 UTC Sat → Sat', 4, ($win['assign'])('2026-05-09T23:59:00Z'));
}

echo "Defensive: bad input doesn't crash\n";
{
    $win = build_figures_window('2026-05-10T17:00:00Z', 'America/Chicago');
    expect('garbage ISO → -1 (skip)', -1, ($win['assign'])('not-a-date'));
    expect('empty ISO → -1', -1, ($win['assign'])(''));
}

echo "Week-window ISO bounds straddle the user's local Tuesday midnight\n";
{
    // CT player. The Tue-anchor week containing 2026-05-10 (Sun) is
    // Tue 5/5 → Mon 5/11. Tue 5/5 00:00 CT = 05:00 UTC. Next Tue
    // 5/12 00:00 CT = 05:00 UTC.
    $win = build_figures_window('2026-05-10T17:00:00Z', 'America/Chicago');
    expect('weekStartIso = 2026-05-05T05:00:00Z', '2026-05-05T05:00:00Z', $win['weekStartIso']);
    expect('weekEndIso = 2026-05-12T05:00:00Z', '2026-05-12T05:00:00Z', $win['weekEndIso']);
}

echo "End-to-end replay: Diamondbacks + Jays bets land on the right rows\n";
{
    // Diamondbacks bet placed 5/10 3:11pm CT, graded Sun evening CT.
    // Jays bet placed late Sat 5/9, graded around midnight (just
    // before 00:00 CT) → must land on Sat, not Sun.
    $win = build_figures_window('2026-05-10T20:00:00Z', 'America/Chicago');
    $diamondbacksDay = ($win['assign'])('2026-05-10T22:30:00Z'); // 5:30pm CT Sun
    $jaysDay = ($win['assign'])('2026-05-10T04:45:00Z');         // 11:45pm CT Sat
    expect('Diamondbacks Sun bet → Sun row', 5, $diamondbacksDay);
    expect('Jays Sat bet → Sat row (was incorrectly Sun)', 4, $jaysDay);
    expect('Jays bet day label is Sat', 'Sat', $DAY_NAMES[$jaysDay]);
}

echo "\n";
if (count($failures) > 0) {
    echo "FAIL: " . count($failures) . " assertion(s) failed ({$passes} passed)\n";
    foreach ($failures as $f) echo "  - {$f}\n";
    exit(1);
}
echo "PASS: {$passes} assertions, 0 failures\n";
exit(0);
