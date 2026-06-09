<?php

/**
 * Read-only sanity test for the partial-freeplay split math used at
 * bet placement, plus the placement-response shape. Pure-PHP mirror
 * of the algorithm in BetsController::placeBet — no DB, no HTTP.
 *
 * Why mirror instead of import directly: the real method is private,
 * interleaved with DB transactions, and ApiException flow control.
 * Copying the math into a helper here keeps the test hermetic. The
 * two must stay in lockstep — change one, update both.
 *
 * Coverage:
 *   1. Pure-freeplay placement (entire risk from FP, $0 from balance).
 *   2. Partial-freeplay placement (FP first, remainder from balance).
 *   3. Risk fits inside FP completely with leftover (FP still has
 *      balance afterward).
 *   4. useFreeplay=false → no FP applied even if available.
 *   5. useFreeplay=true with zero FP → rejected (the controller's
 *      FREEPLAY_EXPIRED branch).
 *   6. Placement response shape includes freeplayBalance, balance,
 *      pendingBalance — the three pools the header pills read.
 *
 * Usage:
 *   php php-backend/scripts/test-freeplay-bet-math.php
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
 * Mirror of the partial-freeplay split logic in BetsController::placeBet.
 * Returns the post-placement state (balance, pendingBalance, freeplayBalance,
 * realPortion, freeplayApplied) OR an array with `error` set on rejection.
 *
 * @param array{
 *     balance: float,
 *     pendingBalance: float,
 *     freeplayBalance: float,
 *     creditLimit: float,
 *     isCreditAccount: bool,
 *     totalRisk: float,
 *     useFreeplay: bool
 * } $state
 * @return array<string, mixed>
 */
function freeplay_split(array $state): array
{
    $balance = $state['balance'];
    $pending = $state['pendingBalance'];
    $freeplay = $state['freeplayBalance'];
    $isCredit = $state['isCreditAccount'];
    $creditLimit = $state['creditLimit'];
    $totalRisk = $state['totalRisk'];
    $useFp = $state['useFreeplay'];

    $available = $isCredit
        ? max(0.0, $creditLimit + $balance - $pending)
        : max(0.0, $balance - $pending);

    $freeplayApplied = 0.0;
    if ($useFp) {
        if ($freeplay <= 0) {
            return ['error' => 'FREEPLAY_EXPIRED'];
        }
        $freeplayApplied = min($freeplay, $totalRisk);
    }
    $realPortion = max(0.0, $totalRisk - $freeplayApplied);

    if ($realPortion > 0 && $available < $realPortion) {
        return ['error' => 'INSUFFICIENT_BALANCE'];
    }

    $newBalance = $isCredit ? $balance : ($balance - $realPortion);
    $newPending = $pending + $realPortion;
    $newFreeplay = $freeplay - $freeplayApplied;

    return [
        'balance' => $newBalance,
        'pendingBalance' => $newPending,
        'freeplayBalance' => $newFreeplay,
        'freeplayApplied' => $freeplayApplied,
        'realPortion' => $realPortion,
    ];
}

/**
 * Mirror of BetsController::buildBetPlacementResponse — verifies the
 * three balance fields the client reads to drive the header pills.
 *
 * @param array<string, mixed> $meta
 * @return array<string, mixed>
 */
function build_placement_response(array $meta): array
{
    return [
        'message' => 'Bet placed successfully',
        'bets' => [],
        'requestId' => $meta['requestId'] ?? null,
        'balance' => (float) round((float) ($meta['balance'] ?? 0)),
        'pendingBalance' => (float) round((float) ($meta['pendingBalance'] ?? 0)),
        'freeplayBalance' => (float) round((float) ($meta['freeplayBalance'] ?? 0)),
    ];
}

// ---- Pure freeplay (entire $2500 risk fits inside $3000 FP) ----
echo "Pure freeplay placement (FP covers full risk)\n";
$result = freeplay_split([
    'balance' => -3203.0, 'pendingBalance' => 0.0, 'freeplayBalance' => 3000.0,
    'creditLimit' => 10000.0, 'isCreditAccount' => true,
    'totalRisk' => 2500.0, 'useFreeplay' => true,
]);
expect('no error', false, isset($result['error']));
expect('freeplayApplied = 2500', 2500.0, $result['freeplayApplied']);
expect('realPortion = 0', 0.0, $result['realPortion']);
expect('balance unchanged (credit account)', -3203.0, $result['balance']);
expect('pendingBalance unchanged (no real money used)', 0.0, $result['pendingBalance']);
expect('freeplayBalance = 500 (3000 - 2500)', 500.0, $result['freeplayBalance']);

// ---- Partial freeplay (the user's reported scenario) ----
echo "Partial freeplay placement ($1603 FP + $897 credit on $2500 risk)\n";
$result = freeplay_split([
    'balance' => -3203.0, 'pendingBalance' => 0.0, 'freeplayBalance' => 1603.0,
    'creditLimit' => 10000.0, 'isCreditAccount' => true,
    'totalRisk' => 2500.0, 'useFreeplay' => true,
]);
expect('freeplayApplied = 1603 (entire FP pool consumed)', 1603.0, $result['freeplayApplied']);
expect('realPortion = 897 (remainder from credit)', 897.0, $result['realPortion']);
expect('balance unchanged on credit account', -3203.0, $result['balance']);
expect('pendingBalance += 897', 897.0, $result['pendingBalance']);
expect('freeplayBalance = 0', 0.0, $result['freeplayBalance']);

// ---- Risk fits inside FP with leftover ----
echo "Risk fits inside FP, leftover stays in FP\n";
$result = freeplay_split([
    'balance' => 1000.0, 'pendingBalance' => 0.0, 'freeplayBalance' => 500.0,
    'creditLimit' => 0.0, 'isCreditAccount' => false,
    'totalRisk' => 200.0, 'useFreeplay' => true,
]);
expect('freeplayApplied = 200', 200.0, $result['freeplayApplied']);
expect('realPortion = 0', 0.0, $result['realPortion']);
expect('balance untouched (real money not used)', 1000.0, $result['balance']);
expect('freeplayBalance = 300 leftover', 300.0, $result['freeplayBalance']);

// ---- Real-money placement (useFreeplay false) ----
echo "useFreeplay=false → real money only even if FP available\n";
$result = freeplay_split([
    'balance' => 1000.0, 'pendingBalance' => 100.0, 'freeplayBalance' => 500.0,
    'creditLimit' => 0.0, 'isCreditAccount' => false,
    'totalRisk' => 200.0, 'useFreeplay' => false,
]);
expect('freeplayApplied = 0', 0.0, $result['freeplayApplied']);
expect('realPortion = 200', 200.0, $result['realPortion']);
expect('balance -= 200 (cash account)', 800.0, $result['balance']);
expect('pendingBalance += 200', 300.0, $result['pendingBalance']);
expect('freeplayBalance untouched', 500.0, $result['freeplayBalance']);

// ---- Cash account: balance debits at placement ----
echo "Cash account vs credit account treatment of realPortion\n";
$cashResult = freeplay_split([
    'balance' => 500.0, 'pendingBalance' => 0.0, 'freeplayBalance' => 0.0,
    'creditLimit' => 0.0, 'isCreditAccount' => false,
    'totalRisk' => 200.0, 'useFreeplay' => false,
]);
expect('cash account: balance -= 200', 300.0, $cashResult['balance']);

$creditResult = freeplay_split([
    'balance' => -500.0, 'pendingBalance' => 0.0, 'freeplayBalance' => 0.0,
    'creditLimit' => 1000.0, 'isCreditAccount' => true,
    'totalRisk' => 200.0, 'useFreeplay' => false,
]);
expect('credit account: balance unchanged at placement', -500.0, $creditResult['balance']);
expect('credit account: pending += 200', 200.0, $creditResult['pendingBalance']);

// ---- Edge: useFreeplay true but zero FP balance ----
echo "useFreeplay=true with $0 FP → rejected\n";
$result = freeplay_split([
    'balance' => 1000.0, 'pendingBalance' => 0.0, 'freeplayBalance' => 0.0,
    'creditLimit' => 0.0, 'isCreditAccount' => false,
    'totalRisk' => 100.0, 'useFreeplay' => true,
]);
expect('rejected with FREEPLAY_EXPIRED', 'FREEPLAY_EXPIRED', $result['error'] ?? null);

// ---- Edge: real portion exceeds available ----
echo "Partial freeplay with insufficient real-money remainder → rejected\n";
$result = freeplay_split([
    'balance' => 0.0, 'pendingBalance' => 0.0, 'freeplayBalance' => 100.0,
    'creditLimit' => 0.0, 'isCreditAccount' => false,
    'totalRisk' => 500.0, 'useFreeplay' => true,
]);
expect('rejected with INSUFFICIENT_BALANCE', 'INSUFFICIENT_BALANCE', $result['error'] ?? null);

// ---- Response shape — the three header pills MUST be present ----
echo "Placement response shape carries all three balance fields\n";
$resp = build_placement_response([
    'requestId' => 'req-abc',
    'balance' => -3203.0,
    'pendingBalance' => 897.0,
    'freeplayBalance' => 0.0,
]);
expect('has balance field', true, array_key_exists('balance', $resp));
expect('has pendingBalance field', true, array_key_exists('pendingBalance', $resp));
expect('has freeplayBalance field (regression check)', true, array_key_exists('freeplayBalance', $resp));
expect('freeplayBalance value passes through', 0.0, $resp['freeplayBalance']);
expect('balance value passes through', -3203.0, $resp['balance']);
expect('pendingBalance value passes through', 897.0, $resp['pendingBalance']);

// ---- End-to-end: original screenshot scenario ----
echo "End-to-end replay of the user's reported scenario\n";
// User had: Balance -$3,203, Pending $0, Freeplay $1,603. Placed
// a $2,500 partial-freeplay bet. After the fix the response and
// post-placement state are:
$result = freeplay_split([
    'balance' => -3203.0, 'pendingBalance' => 0.0, 'freeplayBalance' => 1603.0,
    'creditLimit' => 10000.0, 'isCreditAccount' => true,
    'totalRisk' => 2500.0, 'useFreeplay' => true,
]);
$resp = build_placement_response([
    'balance' => $result['balance'],
    'pendingBalance' => $result['pendingBalance'],
    'freeplayBalance' => $result['freeplayBalance'],
]);
expect('Freeplay drops to $0 (was the user-visible bug)', 0.0, $resp['freeplayBalance']);
expect('Pending shows $897 (the credit portion)', 897.0, $resp['pendingBalance']);
expect('Balance unchanged at -$3,203', -3203.0, $resp['balance']);

echo "\n";
if (count($failures) > 0) {
    echo "FAIL: " . count($failures) . " assertion(s) failed ({$passes} passed)\n";
    foreach ($failures as $f) echo "  - {$f}\n";
    exit(1);
}
echo "PASS: {$passes} assertions, 0 failures\n";
exit(0);
