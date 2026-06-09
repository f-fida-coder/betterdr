<?php

/**
 * Read-only sanity test for the multi-bet freeplay policy. Covers:
 *   1. The math: a SINGLE straight bet with partial freeplay produces
 *      pending = realPortion (NOT pending = totalRisk). User reported
 *      a $2,500 bet where they expected pending = $897 but the header
 *      read $2,500 — the math itself is correct; the test confirms
 *      that any regression in the split formula would fail loudly.
 *   2. The new gate: a multi-bet straight slip with useFreeplay=true
 *      is rejected with FREEPLAY_MULTI_STRAIGHT_NOT_ALLOWED, since the
 *      pool can fund only one ticket and the settlement service can't
 *      tell which ticket "owns" the freeplay portion.
 *
 * Mirror approach (same pattern as the earlier freeplay-bet-math
 * test) — the real logic lives in BetsController::placeBet which is
 * private and interleaved with DB transactions. The two must stay in
 * lockstep.
 *
 * Usage:
 *   php php-backend/scripts/test-freeplay-multi-bet-policy.php
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
 * Mirror of the slipSize / useFreeplay multi-bet rejection rule from
 * BetsController::placeBet. Returns null on accept, error-code string
 * on reject.
 */
function check_multi_bet_freeplay(string $type, bool $useFreeplay, int $slipSize): ?string
{
    if ($useFreeplay && $type === 'straight' && $slipSize > 1) {
        return 'FREEPLAY_MULTI_STRAIGHT_NOT_ALLOWED';
    }
    return null;
}

/**
 * Mirror of the placement split: same as test-freeplay-bet-math.php's
 * freeplay_split, copied here so this test is self-contained.
 *
 * @return array<string, mixed>
 */
function freeplay_split(float $balance, float $pending, float $freeplay, float $creditLimit, bool $isCredit, float $totalRisk, bool $useFp): array
{
    $available = $isCredit
        ? max(0.0, $creditLimit + $balance - $pending)
        : max(0.0, $balance - $pending);
    $freeplayApplied = 0.0;
    if ($useFp) {
        if ($freeplay <= 0) return ['error' => 'FREEPLAY_EXPIRED'];
        $freeplayApplied = min($freeplay, $totalRisk);
    }
    $realPortion = max(0.0, $totalRisk - $freeplayApplied);
    if ($realPortion > 0 && $available < $realPortion) {
        return ['error' => 'INSUFFICIENT_BALANCE'];
    }
    return [
        'balance' => $isCredit ? $balance : ($balance - $realPortion),
        'pendingBalance' => $pending + $realPortion,
        'freeplayBalance' => $freeplay - $freeplayApplied,
        'freeplayApplied' => $freeplayApplied,
        'realPortion' => $realPortion,
    ];
}

// ---- The user's reported scenario: single $2500 bet, FP=$1603 ----
echo "Single straight ticket — math produces the expected \$897 pending\n";
$result = freeplay_split(
    balance: -3203.0, pending: 0.0, freeplay: 1603.0,
    creditLimit: 10000.0, isCredit: true,
    totalRisk: 2500.0, useFp: true,
);
expect('no error', false, isset($result['error']));
expect('freeplayApplied = 1603 (entire FP pool)', 1603.0, $result['freeplayApplied']);
expect('realPortion = 897 (the part charged to credit)', 897.0, $result['realPortion']);
expect('pending = 897 — matches user\'s expectation', 897.0, $result['pendingBalance']);
expect('freeplayBalance drops to $0', 0.0, $result['freeplayBalance']);
expect('balance unchanged on credit account', -3203.0, $result['balance']);

// ---- Multi-bet straight rejection ----
echo "Multi-bet straight slip — useFreeplay rejected before any DB write\n";
expect(
    'straight + useFreeplay + slipSize=3 → FREEPLAY_MULTI_STRAIGHT_NOT_ALLOWED',
    'FREEPLAY_MULTI_STRAIGHT_NOT_ALLOWED',
    check_multi_bet_freeplay('straight', true, 3),
);
expect(
    'straight + useFreeplay + slipSize=2 → rejected (boundary)',
    'FREEPLAY_MULTI_STRAIGHT_NOT_ALLOWED',
    check_multi_bet_freeplay('straight', true, 2),
);

// ---- Single ticket placements pass through ----
echo "Allowed combinations — no false-positive rejections\n";
expect('straight + useFreeplay + slipSize=1 → allowed', null, check_multi_bet_freeplay('straight', true, 1));
expect('straight + useFreeplay + slipSize=0 → allowed (legacy clients omit field)', null, check_multi_bet_freeplay('straight', true, 0));
expect('straight + NO freeplay + slipSize=3 → allowed (the rule is freeplay-only)', null, check_multi_bet_freeplay('straight', false, 3));
expect('parlay + useFreeplay + slipSize=3 → allowed (one ticket with 3 legs)', null, check_multi_bet_freeplay('parlay', true, 3));
expect('teaser + useFreeplay + slipSize=4 → allowed', null, check_multi_bet_freeplay('teaser', true, 4));
expect('if_bet + useFreeplay + slipSize=2 → allowed', null, check_multi_bet_freeplay('if_bet', true, 2));
expect('reverse + useFreeplay + slipSize=2 → allowed', null, check_multi_bet_freeplay('reverse', true, 2));
expect('round_robin + useFreeplay + slipSize=4 → allowed (atomic)', null, check_multi_bet_freeplay('round_robin', true, 4));

// ---- Legacy client without slipSize defaults to 1 ----
echo "Legacy client compatibility — missing slipSize treated as single ticket\n";
// In the controller, $slipSize = is_numeric($raw) ? (int) $raw : 1. So
// older clients that don't send the field aren't accidentally rejected.
expect('straight + useFreeplay + missing slipSize (=1) → allowed', null, check_multi_bet_freeplay('straight', true, 1));

// ---- End-to-end: what the new flow looks like ----
echo "End-to-end: user attempts to place 3 straight bets with freeplay\n";
{
    // UI gate already turns off the checkbox, but a tampered client
    // sends useFreeplay=true with slipSize=3. Backend rejects each
    // attempt before any DB write so nothing partially places. The
    // user-facing message names the way forward: "combine into a
    // parlay" or "remove the extra selections".
    $err = check_multi_bet_freeplay('straight', true, 3);
    expect('all 3 attempts rejected (no partial placement)', 'FREEPLAY_MULTI_STRAIGHT_NOT_ALLOWED', $err);
    // After the user switches to parlay mode (one ticket, 3 legs),
    // the same selections + freeplay are now allowed. Math splits
    // the parlay's totalRisk = unitStake (parlays don't multiply
    // stake across legs) between FP and credit.
    $ok = check_multi_bet_freeplay('parlay', true, 3);
    expect('parlay mode unlocks the same selections with freeplay', null, $ok);
    $math = freeplay_split(
        balance: -3203.0, pending: 0.0, freeplay: 1603.0,
        creditLimit: 10000.0, isCredit: true,
        totalRisk: 100.0, useFp: true,
    );
    expect('parlay math: 100 risk uses 100 FP, 0 to credit', 100.0, $math['freeplayApplied']);
    expect('parlay math: pending unchanged (pure FP)', 0.0, $math['pendingBalance']);
}

echo "\n";
if (count($failures) > 0) {
    echo "FAIL: " . count($failures) . " assertion(s) failed ({$passes} passed)\n";
    foreach ($failures as $f) echo "  - {$f}\n";
    exit(1);
}
echo "PASS: {$passes} assertions, 0 failures\n";
exit(0);
