<?php

/**
 * Read-only sanity test for the max-bet semantics switch:
 * "max bet" now gates the player's RISK (stake), not the
 * operator's WIN (payout). Matches what mainstream sportsbooks
 * mean by max bet — the reported screenshot was a $1,000 risk
 * on a +334 underdog rejected because the win ($3,340) exceeded
 * the $2,000 max bet, even though the stake itself was under
 * the cap.
 *
 * Mirror approach: copy the controller's rule into a pure
 * helper so the test is hermetic. The two must stay in lockstep.
 *
 * Usage:
 *   php php-backend/scripts/test-max-bet-risk-anchored.php
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
 * Mirror of the min/max-bet gate from BetsController::placeBet
 * after the risk-anchored switch. Returns null on accept or an
 * { code, message } array on reject.
 *
 * @param string $type        Bet mode (straight | parlay | teaser | if_bet | reverse | round_robin)
 * @param float  $totalRisk   Stake about to be debited
 * @param float  $potentialPayout  Risk + win (gross payout if the bet hits)
 * @param float  $minBet      Player's $minBet (0 = unset)
 * @param float  $maxBet      Player's $maxBet (0 = unset)
 * @return array{code: string, message: string}|null
 */
function check_bet_limits(string $type, float $totalRisk, float $potentialPayout, float $minBet, float $maxBet): ?array
{
    $winAmount = max(0.0, $potentialPayout - $totalRisk);
    if ($minBet > 0 && $totalRisk < $minBet) {
        return ['code' => 'BELOW_MIN_BET', 'message' => 'Min bet is $' . $minBet . ' — this ticket only risks $' . $totalRisk];
    }
    $isCombined = in_array($type, ['parlay', 'teaser', 'if_bet', 'reverse'], true);
    $capped = false;
    if ($isCombined && $maxBet > 0) {
        $cap = $maxBet * 3.0;
        if ($winAmount > $cap) {
            // payout-cap branch (mutates payout/win, doesn't reject)
            $winAmount = $cap;
            $potentialPayout = $totalRisk + $cap;
            $capped = true;
        }
    }
    if ($maxBet > 0 && $totalRisk > $maxBet) {
        return ['code' => 'ABOVE_MAX_BET', 'message' => 'Max bet is $' . $maxBet . ' — this ticket risks $' . $totalRisk . ' (over limit)'];
    }
    return null;
}

// ---- The reported scenario: $1000 risk + $3340 win + $2000 max bet ----
echo "Reported scenario: \$1000 risk on +334 underdog vs \$2000 max bet\n";
{
    $result = check_bet_limits('straight', 1000.0, 4340.0, 25.0, 2000.0);
    expect('placement is now allowed (was blocked before)', null, $result);
}

// ---- Edge cases: at and just over the max bet ----
echo "Edge cases at the max-bet boundary\n";
{
    expect('risk exactly at max → allowed', null, check_bet_limits('straight', 2000.0, 5000.0, 0.0, 2000.0));
    $over = check_bet_limits('straight', 2001.0, 5000.0, 0.0, 2000.0);
    expect('risk $1 over max → rejected', 'ABOVE_MAX_BET', $over['code'] ?? null);
    expect('error message names risk side', true, str_contains($over['message'] ?? '', 'risks $2001'));
}

// ---- Heavy underdog with monster payout — payout is no longer capped ----
echo "Heavy underdog at max stake — win can exceed max bet\n";
{
    // +900 underdog: $1000 risk → $10,000 payout ($9,000 win).
    // Old (win-anchored) behavior: blocked because win > maxBet.
    // New (risk-anchored): allowed.
    expect(
        '+900 underdog $1000 risk → big win allowed',
        null,
        check_bet_limits('straight', 1000.0, 10000.0, 0.0, 2000.0),
    );
}

// ---- Heavy favorite at huge risk — now CORRECTLY blocked ----
echo "Heavy favorite — risk side still bounds the stake\n";
{
    // -500 favorite: $5000 risk → $6000 payout ($1000 win).
    // Old (win-anchored): allowed because win=$1000 ≤ $2000.
    // New (risk-anchored): rejected because risk=$5000 > $2000.
    // This is the intended trade-off — operators preferring
    // exposure-anchored caps need a separate ceiling; the player-
    // facing "max bet" is and should be risk-anchored.
    $result = check_bet_limits('straight', 5000.0, 6000.0, 0.0, 2000.0);
    expect('-500 favorite $5000 risk → now blocked', 'ABOVE_MAX_BET', $result['code'] ?? null);
}

// ---- Min bet still works on risk side (no regression) ----
echo "Min-bet rejection still fires on the risk side\n";
{
    $under = check_bet_limits('straight', 5.0, 50.0, 25.0, 2000.0);
    expect('risk $5 < min $25 → BELOW_MIN_BET', 'BELOW_MIN_BET', $under['code'] ?? null);
}

// ---- No limits set ----
echo "No limits configured — every bet passes the gate\n";
{
    expect('huge risk with no maxBet → allowed', null, check_bet_limits('straight', 50000.0, 100000.0, 0.0, 0.0));
    expect('tiny risk with no minBet → allowed', null, check_bet_limits('straight', 1.0, 10.0, 0.0, 0.0));
}

// ---- Combined modes: parlay risk-side max applies too ----
echo "Combined modes also enforce the risk-side max-bet rule\n";
{
    // Parlay with $3000 risk + $2000 maxBet: now rejected.
    // The 3× payout ceiling is a separate cap that doesn't make
    // the bet pass the risk-side check.
    $over = check_bet_limits('parlay', 3000.0, 9000.0, 0.0, 2000.0);
    expect('parlay $3000 risk vs $2000 max → blocked', 'ABOVE_MAX_BET', $over['code'] ?? null);
}

// ---- Combined-mode payout cap path still mutates payout ----
echo "Parlay payout cap still applies on top of risk-side check\n";
{
    // Parlay with $1000 risk, $20000 payout ($19k win), $2000 max.
    // Risk side: $1000 < $2000 → allowed.
    // Cap side: $19k win > 3 × $2000 = $6k → payout caps at $7000.
    // Helper returns null (accepted) because the cap mutates, not
    // rejects. The mutation itself is exercised via the controller;
    // here we just confirm the gate doesn't fire spuriously.
    expect('parlay underdog under risk cap → accepted', null, check_bet_limits('parlay', 1000.0, 20000.0, 0.0, 2000.0));
}

// ---- End-to-end: the exact screenshot scenario ----
echo "End-to-end replay of the screenshot's Pirates +334 bet\n";
{
    // The user typed $1000 in Risk mode. Backend computes:
    //   risk = 1000, potential = 1000 + (1000 × 334/100) = 4340
    //   win = 3340
    // Under risk-anchored rules: 1000 ≤ 2000 → allowed.
    // Under old win-anchored rules: 3340 > 2000 → blocked.
    $result = check_bet_limits('straight', 1000.0, 4340.0, 25.0, 2000.0);
    expect('Pirates +334 bet now goes through', null, $result);
    // Sanity: same player at $2500 stake still blocked.
    $over = check_bet_limits('straight', 2500.0, 10850.0, 25.0, 2000.0);
    expect('$2500 stake on the same odds → over max → blocked', 'ABOVE_MAX_BET', $over['code'] ?? null);
    expect('blocked message mentions the risk', true, str_contains($over['message'] ?? '', '$2500'));
}

echo "\n";
if (count($failures) > 0) {
    echo "FAIL: " . count($failures) . " assertion(s) failed ({$passes} passed)\n";
    foreach ($failures as $f) echo "  - {$f}\n";
    exit(1);
}
echo "PASS: {$passes} assertions, 0 failures\n";
exit(0);
