<?php

/**
 * Read-only sanity test for AuthController::pendingRiskForUser
 * after the cash-only summation switch. The reported bug: header
 * PENDING tile showed $6,000 when the player had a $5,000 cash
 * Rockies bet + a $1,000 Guardians ticket funded $700 FP + $300
 * cash. Correct exposure is $5,300 (only the cash portion of each
 * pending bet ties up credit). The old query summed
 * `j_risk_amount` directly, which conflated cash + FP.
 *
 * Mirror approach (same pattern as the other backend tests in this
 * session): copy the per-bet split rule into a hermetic helper.
 * Two must stay in lockstep.
 *
 * Usage:
 *   php php-backend/scripts/test-pending-cash-only.php
 */

declare(strict_types=1);

$passes = 0;
$failures = [];
function expect(string $label, $expected, $actual): void
{
    global $passes, $failures;
    if (is_float($expected) || is_float($actual)) {
        $ok = abs((float) $expected - (float) $actual) < 0.0001;
    } else {
        $ok = $expected === $actual;
    }
    if ($ok) { $passes++; echo "  ✓ {$label}\n"; return; }
    $failures[] = $label;
    echo "  ✗ {$label}\n";
    echo "      expected: " . var_export($expected, true) . "\n";
    echo "      actual:   " . var_export($actual, true) . "\n";
}

/**
 * Mirror of pendingRiskForUser's per-bet aggregation after the
 * cash-only fix. Iterates pending bets, subtracts the FP slice
 * (or the legacy isFreeplay-as-pure-FP fallback), clamps and
 * sums the remainder. Returns the dollar amount the header
 * should display.
 *
 * @param array<int, array<string, mixed>> $pendingBets
 */
function pending_cash_sum(array $pendingBets): float
{
    $sum = 0.0;
    foreach ($pendingBets as $b) {
        $risk = (float) ($b['riskAmount'] ?? $b['amount'] ?? 0);
        if ($risk <= 0) continue;
        $fpRaw = $b['freeplayAmountUsed'] ?? null;
        $fp = (is_numeric($fpRaw) && (float) $fpRaw > 0)
            ? (float) $fpRaw
            : (!empty($b['isFreeplay']) ? $risk : 0.0);
        $fp = max(0.0, min($fp, $risk));
        $sum += ($risk - $fp);
    }
    return $sum;
}

// ---- The reported scenario: $5,000 cash + $1,000 partial-FP ----
echo "Reported scenario — Rockies cash + Guardians partial-FP\n";
{
    $bets = [
        ['riskAmount' => 5000, 'freeplayAmountUsed' => 0, 'isFreeplay' => false],
        ['riskAmount' => 1000, 'freeplayAmountUsed' => 700, 'isFreeplay' => true],
    ];
    expect('PENDING = $5,300 (was inflating to $6,000)', 5300.0, pending_cash_sum($bets));
}

// ---- Pure FP bet contributes nothing ----
echo "Pure freeplay bet contributes $0 to PENDING\n";
{
    $bets = [
        ['riskAmount' => 500, 'freeplayAmountUsed' => 500, 'isFreeplay' => true],
    ];
    expect('pure FP → $0 pending', 0.0, pending_cash_sum($bets));
}

// ---- Legacy bet (isFreeplay=true, no freeplayAmountUsed) ----
echo "Legacy FP bet treated as pure FP (matches old conservative default)\n";
{
    $bets = [
        ['riskAmount' => 250, 'isFreeplay' => true],
    ];
    expect('legacy FP → $0 pending', 0.0, pending_cash_sum($bets));
}

// ---- Mixed scenarios ----
echo "Mixed: cash + partial-FP + pure-FP + legacy-FP\n";
{
    $bets = [
        ['riskAmount' => 100, 'isFreeplay' => false],                              // pure cash → 100
        ['riskAmount' => 200, 'freeplayAmountUsed' => 50, 'isFreeplay' => true],   // partial → 150
        ['riskAmount' => 80,  'freeplayAmountUsed' => 80, 'isFreeplay' => true],   // pure FP → 0
        ['riskAmount' => 60,  'isFreeplay' => true],                                // legacy FP → 0
    ];
    expect('summed cash portions', 250.0, pending_cash_sum($bets));
}

// ---- Defensive: bad data doesn't crash, doesn't inflate or deflate wildly ----
echo "Defensive: bad data clamps cleanly\n";
{
    expect('empty list → 0', 0.0, pending_cash_sum([]));
    expect('zero-risk bet skipped', 0.0, pending_cash_sum([
        ['riskAmount' => 0, 'freeplayAmountUsed' => 100],
    ]));
    expect('negative fp clamps to 0 (full cash)', 100.0, pending_cash_sum([
        ['riskAmount' => 100, 'freeplayAmountUsed' => -50],
    ]));
    expect('over-fp clamps to risk (no negative cash)', 0.0, pending_cash_sum([
        ['riskAmount' => 100, 'freeplayAmountUsed' => 300],
    ]));
    expect('non-numeric fp falls back via isFreeplay flag', 100.0, pending_cash_sum([
        ['riskAmount' => 100, 'freeplayAmountUsed' => 'TBD'],
    ]));
}

// ---- End-to-end replay of the screenshot ----
echo "End-to-end replay — the user's exact two-bet slip\n";
{
    $bets = [
        ['riskAmount' => 5000, 'amount' => 5000, 'isFreeplay' => false],
        ['riskAmount' => 1000, 'amount' => 1000, 'freeplayAmountUsed' => 700, 'isFreeplay' => true],
    ];
    $pending = pending_cash_sum($bets);
    expect('PENDING tile shows $5,300 (matches client expectation)', 5300.0, $pending);
    // Available = creditLimit + balance - pending. For a $9000 credit
    // limit and -$523 balance, available should be 9000 - 523 - 5300 =
    // $3,177 — not the displayed $3,477 (which the old $6,000 pending
    // pulled down by an extra $700).
    $creditLimit = 9000.0;
    $balance = -523.0;
    $available = $creditLimit + $balance - $pending;
    expect('Available recovers $700 of credit', 3177.0, $available);
}

echo "\n";
if (count($failures) > 0) {
    echo "FAIL: " . count($failures) . " assertion(s) failed ({$passes} passed)\n";
    foreach ($failures as $f) echo "  - {$f}\n";
    exit(1);
}
echo "PASS: {$passes} assertions, 0 failures\n";
exit(0);
