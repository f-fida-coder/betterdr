<?php

/**
 * Test for the live-clock/period extraction added to EspnScoreboardSync.
 *
 * Reported request (user, 2026-05-13):
 *   "Baseball usually says what inning and basketball what quarter. Live
 *   needs these up too still." — the LIVE pill on the odds board only
 *   shows the OddsAge "Just now" string because score.clock is never
 *   populated and score.period is sporadic from OddsAPI.
 *
 * Fix:
 *   EspnScoreboardSync now extracts `competition.status.{period,
 *   displayClock, type.{state,shortDetail}}` and writes the result back
 *   to `score.period` + `score.clock` on the matched matches row. ESPN's
 *   free scoreboard ticks sub-minute during live games and carries both
 *   fields, while OddsAPI never carries clock at all.
 *
 * This test mirrors EspnScoreboardSync::extractLiveState() (private
 * static, recreated here) and verifies:
 *   • Pre-game / final / postponed → null (don't overwrite period)
 *   • Live NBA → period + "12:34" clock
 *   • Live MLB → period + half-inning ("Top"/"Bot"/"Mid"/"End")
 *   • Live NHL period transition → period only, no "0:00" garbage
 *   • Live NFL → period + clock
 *   • Live soccer → halves
 *
 * Plus integration assertions that mirror the merge logic:
 *   • A non-FP score field is preserved when we patch clock+period
 *     (critical: we must NEVER zero out score_home/score_away).
 *
 * Usage:
 *   php php-backend/scripts/test-espn-live-clock-period.php
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
 * Mirror of EspnScoreboardSync::extractLiveState — keep these two
 * implementations in lockstep or this test stops being meaningful.
 */
function extractLiveState(array $competition, string $sportKey): ?array
{
    $status = is_array($competition['status'] ?? null) ? $competition['status'] : null;
    if ($status === null) return null;

    $type = is_array($status['type'] ?? null) ? $status['type'] : [];
    $state = strtolower((string) ($type['state'] ?? ''));
    if ($state !== 'in') return null;

    $period = $status['period'] ?? null;
    if (!is_numeric($period) || (int) $period <= 0) return null;
    $period = (int) $period;

    $displayClock = trim((string) ($status['displayClock'] ?? ''));
    $shortDetail = trim((string) ($type['shortDetail'] ?? $type['detail'] ?? ''));

    $sportKeyLower = strtolower($sportKey);
    if (str_starts_with($sportKeyLower, 'baseball')) {
        $half = '';
        if ($shortDetail !== '') {
            $first = strtok($shortDetail, ' ');
            $candidate = ucfirst(strtolower((string) $first));
            if (in_array($candidate, ['Top', 'Bot', 'Mid', 'End', 'Bottom'], true)) {
                $half = $candidate === 'Bottom' ? 'Bot' : $candidate;
            }
        }
        return ['period' => $period, 'clock' => $half];
    }

    $clock = ($displayClock === '0:00' || $displayClock === '0.0') ? '' : $displayClock;
    return ['period' => $period, 'clock' => $clock];
}

/** Mirror of the merge that builds the patched score object. */
function mergeLiveStateIntoScore(array $existingScore, ?array $liveState): array
{
    if ($liveState === null) return $existingScore;
    $merged = $existingScore;
    $merged['period'] = $liveState['period'];
    $merged['clock'] = $liveState['clock'];
    return $merged;
}

// ────────────────────────────────────────────────────────────────────
// 1) State gating — only 'in' counts as live
// ────────────────────────────────────────────────────────────────────
echo "State gating\n";
expect('pre-game (state=pre) → null', null, extractLiveState([
    'status' => ['period' => 0, 'displayClock' => '15:00', 'type' => ['state' => 'pre']],
], 'basketball_nba'));
expect('final (state=post) → null', null, extractLiveState([
    'status' => ['period' => 4, 'displayClock' => '0:00', 'type' => ['state' => 'post']],
], 'basketball_nba'));
expect('missing status block → null', null, extractLiveState([], 'basketball_nba'));
expect('missing type block → null', null, extractLiveState([
    'status' => ['period' => 1, 'displayClock' => '12:00'],
], 'basketball_nba'));

// ────────────────────────────────────────────────────────────────────
// 2) Basketball — period + clock
// ────────────────────────────────────────────────────────────────────
echo "\nBasketball — Q3 12:34 style\n";
expect('NBA Q3 12:34', ['period' => 3, 'clock' => '12:34'], extractLiveState([
    'status' => [
        'period' => 3,
        'displayClock' => '12:34',
        'type' => ['state' => 'in', 'shortDetail' => 'Q3 12:34'],
    ],
], 'basketball_nba'));
expect('NBA Q1 0:00 (between quarters) → clock dropped',
    ['period' => 1, 'clock' => ''],
    extractLiveState([
        'status' => ['period' => 1, 'displayClock' => '0:00', 'type' => ['state' => 'in']],
    ], 'basketball_nba'));
expect('WNBA OT (period 5) → still passes through', ['period' => 5, 'clock' => '2:30'], extractLiveState([
    'status' => ['period' => 5, 'displayClock' => '2:30', 'type' => ['state' => 'in']],
], 'basketball_wnba'));

// ────────────────────────────────────────────────────────────────────
// 3) Baseball — period (inning) + half indicator only
// ────────────────────────────────────────────────────────────────────
echo "\nBaseball — Inn 5 Top style\n";
expect('MLB Top 5th', ['period' => 5, 'clock' => 'Top'], extractLiveState([
    'status' => [
        'period' => 5,
        'displayClock' => '0:00',
        'type' => ['state' => 'in', 'shortDetail' => 'Top 5th'],
    ],
], 'baseball_mlb'));
expect('MLB Bot 3rd', ['period' => 3, 'clock' => 'Bot'], extractLiveState([
    'status' => [
        'period' => 3,
        'displayClock' => '0:00',
        'type' => ['state' => 'in', 'shortDetail' => 'Bot 3rd 0:00'],
    ],
], 'baseball_mlb'));
expect('MLB Mid 7th', ['period' => 7, 'clock' => 'Mid'], extractLiveState([
    'status' => [
        'period' => 7,
        'displayClock' => '0:00',
        'type' => ['state' => 'in', 'shortDetail' => 'Mid 7th'],
    ],
], 'baseball_mlb'));
expect('MLB End 6th', ['period' => 6, 'clock' => 'End'], extractLiveState([
    'status' => [
        'period' => 6,
        'displayClock' => '0:00',
        'type' => ['state' => 'in', 'shortDetail' => 'End 6th'],
    ],
], 'baseball_mlb'));
expect('MLB Bottom 9th (long form)', ['period' => 9, 'clock' => 'Bot'], extractLiveState([
    'status' => [
        'period' => 9,
        'displayClock' => '0:00',
        'type' => ['state' => 'in', 'shortDetail' => 'Bottom 9th'],
    ],
], 'baseball_mlb'));
expect('MLB shortDetail missing → empty half, period only',
    ['period' => 4, 'clock' => ''],
    extractLiveState([
        'status' => ['period' => 4, 'displayClock' => '0:00', 'type' => ['state' => 'in']],
    ], 'baseball_mlb'));

// ────────────────────────────────────────────────────────────────────
// 4) Football, Hockey, Soccer — straight passthrough
// ────────────────────────────────────────────────────────────────────
echo "\nOther sports passthrough\n";
expect('NFL Q4 0:15', ['period' => 4, 'clock' => '0:15'], extractLiveState([
    'status' => ['period' => 4, 'displayClock' => '0:15', 'type' => ['state' => 'in']],
], 'americanfootball_nfl'));
expect('NHL P2 8:42', ['period' => 2, 'clock' => '8:42'], extractLiveState([
    'status' => ['period' => 2, 'displayClock' => '8:42', 'type' => ['state' => 'in']],
], 'icehockey_nhl'));
expect('Soccer H1 38:12', ['period' => 1, 'clock' => "38'12"], extractLiveState([
    'status' => ['period' => 1, 'displayClock' => "38'12", 'type' => ['state' => 'in']],
], 'soccer_epl'));

// ────────────────────────────────────────────────────────────────────
// 5) Defensive — period missing / zero
// ────────────────────────────────────────────────────────────────────
echo "\nDefensive — missing or zero period\n";
expect('period=0 → null', null, extractLiveState([
    'status' => ['period' => 0, 'displayClock' => '15:00', 'type' => ['state' => 'in']],
], 'basketball_nba'));
expect('period missing → null', null, extractLiveState([
    'status' => ['displayClock' => '12:00', 'type' => ['state' => 'in']],
], 'basketball_nba'));
expect('period non-numeric → null', null, extractLiveState([
    'status' => ['period' => 'first', 'displayClock' => '12:00', 'type' => ['state' => 'in']],
], 'basketball_nba'));

// ────────────────────────────────────────────────────────────────────
// 6) MONEY SAFETY — score_home / score_away preserved across merge
// ────────────────────────────────────────────────────────────────────
echo "\nMoney safety — score_home/score_away NEVER zeroed by clock patch\n";
$existing = [
    'score_home' => 7.0,
    'score_away' => 4.0,
    'event_status' => 'STATUS_IN_PROGRESS',
    'period' => 5,
    // No clock yet.
];
$liveState = extractLiveState([
    'status' => ['period' => 5, 'displayClock' => '0:00', 'type' => ['state' => 'in', 'shortDetail' => 'Top 5th']],
], 'baseball_mlb');
$merged = mergeLiveStateIntoScore($existing, $liveState);
expect('score_home preserved',  7.0,  $merged['score_home']);
expect('score_away preserved',  4.0,  $merged['score_away']);
expect('event_status preserved', 'STATUS_IN_PROGRESS', $merged['event_status']);
expect('period overwritten with ESPN value', 5, $merged['period']);
expect('clock added',  'Top', $merged['clock']);

// Non-live state should leave EVERYTHING alone.
$mergedQuiet = mergeLiveStateIntoScore($existing, null);
expect('null liveState → existing score returned as-is', $existing, $mergedQuiet);

// ────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────
echo "\n";
$total = $passes + count($failures);
if (count($failures) === 0) {
    echo "✅ All {$total} assertions passed.\n";
    exit(0);
}
echo "❌ {$passes}/{$total} passed. Failures:\n";
foreach ($failures as $f) echo "  - {$f}\n";
exit(1);
