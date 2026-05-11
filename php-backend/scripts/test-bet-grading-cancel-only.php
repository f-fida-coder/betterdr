<?php

/**
 * Read-only sanity test for the bet-grading policy change: only an
 * explicit 'canceled' status produces a void/refund. 'expired' (the
 * feed-silent catch-all) keeps the bet pending so a human reviews it
 * before money moves.
 *
 * This was the deeper bug behind the user-reported "Sun +650 P /
 * Mystics -108 P" refunds: the matches' feeds went quiet past the
 * 12h grace window, SportsMatchStatus auto-promoted them to
 * 'expired', and SportsbookBetSupport::selectionResult treated that
 * the same as a genuine cancel.
 *
 * Why mirror instead of import: SportsbookBetSupport pulls in DB,
 * env, and shared service deps that make a hermetic test painful.
 * Mirror the rule here. The two must stay in lockstep — change one,
 * update the other.
 *
 * Usage:
 *   php php-backend/scripts/test-bet-grading-cancel-only.php
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
 * Mirror of SportsbookBetSupport::selectionResult after the
 * cancel-only void policy. Reads $effectiveStatus directly so we
 * don't have to re-derive it from raw match status + timestamps;
 * the underlying SportsMatchStatus logic isn't what changed.
 *
 * @param string $effectiveStatus  one of 'scheduled' / 'live' / 'finished' / 'canceled' / 'expired' / 'suspended'
 * @param string $marketType       'h2h' | 'spreads' | 'totals'
 * @param string $selectionName    e.g. 'Connecticut Sun', 'Home -3.5', 'Over 48'
 * @param string $homeTeam
 * @param string $awayTeam
 * @param float  $scoreHome
 * @param float  $scoreAway
 * @param float|null $point        spread / total line, null for h2h
 */
function grade_selection(
    string $effectiveStatus,
    string $marketType,
    string $selectionName,
    string $homeTeam = '',
    string $awayTeam = '',
    float $scoreHome = 0.0,
    float $scoreAway = 0.0,
    ?float $point = null,
): string {
    if ($effectiveStatus === 'canceled') {
        return 'void';
    }
    if ($effectiveStatus !== 'finished') {
        return 'pending';
    }
    $marketType = strtolower($marketType);
    if (in_array($marketType, ['h2h', 'moneyline', 'ml', 'straight'], true)) {
        if ($scoreHome > $scoreAway) return $selectionName === $homeTeam ? 'won' : 'lost';
        if ($scoreAway > $scoreHome) return $selectionName === $awayTeam ? 'won' : 'lost';
        return $selectionName === 'Draw' ? 'won' : 'void';
    }
    if ($marketType === 'spreads' && $point !== null) {
        if ($selectionName === $homeTeam) {
            $adj = $scoreHome + $point;
            if ($adj > $scoreAway) return 'won';
            if ($adj === $scoreAway) return 'void';
            return 'lost';
        }
        if ($selectionName === $awayTeam) {
            $adj = $scoreAway + $point;
            if ($adj > $scoreHome) return 'won';
            if ($adj === $scoreHome) return 'void';
            return 'lost';
        }
    }
    if ($marketType === 'totals' && $point !== null) {
        $isOver = stripos($selectionName, 'over') !== false;
        $total = $scoreHome + $scoreAway;
        if ($isOver) {
            if ($total > $point) return 'won';
            if ($total === $point) return 'void';
            return 'lost';
        }
        if ($total < $point) return 'won';
        if ($total === $point) return 'void';
        return 'lost';
    }
    return 'pending';
}

// ---- The reported regression: expired moneyline no longer auto-voids ----
echo "Expired match — bet stays pending (was auto-voiding before)\n";
expect(
    'WNBA moneyline on an expired match → pending, NOT void',
    'pending',
    grade_selection('expired', 'h2h', 'Connecticut Sun', 'Connecticut Sun', 'Las Vegas Aces'),
);
expect(
    'Expired spread → pending',
    'pending',
    grade_selection('expired', 'spreads', 'Connecticut Sun', 'Connecticut Sun', 'Las Vegas Aces', 0, 0, -3.5),
);
expect(
    'Expired total → pending',
    'pending',
    grade_selection('expired', 'totals', 'Over 165', 'Connecticut Sun', 'Las Vegas Aces', 0, 0, 165.0),
);

// ---- Explicit cancel still voids ----
echo "Canceled match — explicit cancel still voids (refund)\n";
expect(
    'Canceled moneyline → void',
    'void',
    grade_selection('canceled', 'h2h', 'Connecticut Sun', 'Connecticut Sun', 'Las Vegas Aces'),
);
expect(
    'Canceled spread → void',
    'void',
    grade_selection('canceled', 'spreads', 'Home -3.5', 'Home', 'Away', 0, 0, -3.5),
);

// ---- Finished games still grade normally ----
echo "Finished games grade against final score (no regression)\n";
expect(
    'Home team wins → home moneyline = won',
    'won',
    grade_selection('finished', 'h2h', 'Home', 'Home', 'Away', 100, 95),
);
expect(
    'Home team wins → away moneyline = lost',
    'lost',
    grade_selection('finished', 'h2h', 'Away', 'Home', 'Away', 100, 95),
);
expect(
    'Spread covers → won',
    'won',
    grade_selection('finished', 'spreads', 'Home', 'Home', 'Away', 100, 95, -3.5),
);
expect(
    'Spread exact tie on line → void/push',
    'void',
    grade_selection('finished', 'spreads', 'Home', 'Home', 'Away', 100, 95, -5.0),
);
expect(
    'Total exact line → push',
    'void',
    grade_selection('finished', 'totals', 'Over 195', 'Home', 'Away', 100, 95, 195.0),
);

// ---- Scheduled / live games stay pending ----
echo "Pre-game / in-play stays pending\n";
expect('scheduled → pending', 'pending', grade_selection('scheduled', 'h2h', 'Home', 'Home', 'Away'));
expect('live → pending', 'pending', grade_selection('live', 'h2h', 'Home', 'Home', 'Away'));
expect('suspended → pending', 'pending', grade_selection('suspended', 'h2h', 'Home', 'Home', 'Away'));

// ---- End-to-end: user's reported scenario after the fix ----
echo "End-to-end replay of the Sun / Mystics scenario\n";
{
    // Both WNBA moneylines were on matches the feed went quiet on,
    // promoted to effectiveStatus='expired'. After the fix they
    // stay pending for admin review — no silent refund.
    $sun = grade_selection('expired', 'h2h', 'Connecticut Sun', 'Connecticut Sun', 'Las Vegas Aces');
    $mystics = grade_selection('expired', 'h2h', 'Washington Mystics', 'Washington Mystics', 'New York Liberty');
    expect('Sun moneyline stays pending', 'pending', $sun);
    expect('Mystics moneyline stays pending', 'pending', $mystics);
    // If the operator later marks the match canceled, the bets
    // grade as void (refund). If the operator finds the actual final
    // score and updates the match to finished, the bets grade
    // normally. Either way, a human decides.
    $sunAfterCancel = grade_selection('canceled', 'h2h', 'Connecticut Sun', 'Connecticut Sun', 'Las Vegas Aces');
    expect('Manual cancel → void as before', 'void', $sunAfterCancel);
    $sunAfterFinal = grade_selection('finished', 'h2h', 'Connecticut Sun', 'Connecticut Sun', 'Las Vegas Aces', 75, 80);
    expect('Manual final score (lost) grades normally', 'lost', $sunAfterFinal);
    $sunAfterUpset = grade_selection('finished', 'h2h', 'Connecticut Sun', 'Connecticut Sun', 'Las Vegas Aces', 85, 80);
    expect('Manual final score (won) grades normally — no missed payout', 'won', $sunAfterUpset);
}

echo "\n";
if (count($failures) > 0) {
    echo "FAIL: " . count($failures) . " assertion(s) failed ({$passes} passed)\n";
    foreach ($failures as $f) echo "  - {$f}\n";
    exit(1);
}
echo "PASS: {$passes} assertions, 0 failures\n";
exit(0);
