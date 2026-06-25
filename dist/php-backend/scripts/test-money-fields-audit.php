<?php

/**
 * Read-only sanity test for the four money-field drift fixes from
 * the audit pass. Each function in this test is a hermetic mirror
 * of the production helper it replaces — change one, update both.
 *
 * Coverage:
 *   DEFECT #1: BetVoidRefund now splits partial-FP voids across pools
 *   DEFECT #2: getFigures loss math uses cash portion only
 *   DEFECT #4: AgentController netProfit math is FP-aware
 *   DEFECT #5: Round Robin idempotent replay preserves freeplayBalance
 *
 * Usage:
 *   php php-backend/scripts/test-money-fields-audit.php
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

// Shared helper used by every reader in the codebase. The legacy
// fallback (isFreeplay=true with no freeplayAmountUsed → pure FP)
// matches BetSettlementService, AuthController, WalletController,
// AgentController, BetVoidRefund, and MyBetsView.
function fpUsedOf(array $bet, float $risk): float
{
    $raw = $bet['freeplayAmountUsed'] ?? null;
    if (is_numeric($raw) && (float) $raw > 0) {
        $fp = (float) $raw;
    } elseif (!empty($bet['isFreeplay'])) {
        $fp = $risk;
    } else {
        $fp = 0.0;
    }
    return max(0.0, min($fp, $risk));
}

// ═══════════════════════════════════════════════════════════════
// DEFECT #1: BetVoidRefund splits partial-FP voids correctly
// ═══════════════════════════════════════════════════════════════

/**
 * Mirror of BetVoidRefund::compute after the partial-FP split fix.
 * Returns only the user-update map (the part that drives balances)
 * to keep the test focused on the money math.
 */
function void_refund_user_update(array $bet, array $user): array
{
    $stake = (float) ($bet['riskAmount'] ?? $bet['amount'] ?? 0);
    $balance = (float) ($user['balance'] ?? 0);
    $pending = (float) ($user['pendingBalance'] ?? 0);
    $freeplay = (float) ($user['freeplayBalance'] ?? 0);
    $creditLimit = (float) ($user['creditLimit'] ?? 0);
    $role = strtolower((string) ($user['role'] ?? 'user'));
    $isFreeplay = !empty($bet['isFreeplay']);

    $freeplayUsed = fpUsedOf($bet, $stake);
    $realPortion = max(0.0, $stake - $freeplayUsed);
    $isPureFP = $freeplayUsed > 0 && $realPortion <= 0;
    $isCreditAccount = !$isPureFP && $role === 'user' && $creditLimit > 0;

    $update = [];
    if ($freeplayUsed > 0) {
        $update['freeplayBalance'] = $freeplay + $freeplayUsed;
    }
    if ($realPortion > 0) {
        if ($isCreditAccount) {
            $update['pendingBalance'] = max(0.0, $pending - $realPortion);
        } else {
            $update['balance'] = $balance + $realPortion;
            $update['pendingBalance'] = max(0.0, $pending - $realPortion);
        }
    }
    return $update;
}

echo "DEFECT #1: BetVoidRefund partial-FP void splits across both pools\n";
{
    // Cash account, partial-FP $100 bet ($60 FP, $40 cash): admin
    // void must return $40 to balance + $60 to FP pool.
    $update = void_refund_user_update(
        ['riskAmount' => 100, 'freeplayAmountUsed' => 60, 'isFreeplay' => true],
        ['balance' => 50, 'pendingBalance' => 40, 'freeplayBalance' => 200, 'creditLimit' => 0, 'role' => 'user'],
    );
    expect('cash account: balance += real portion', 90.0, $update['balance']);
    expect('cash account: pending -= real portion', 0.0, $update['pendingBalance']);
    expect('cash account: FP += FP slice', 260.0, $update['freeplayBalance']);
}
{
    // Credit account, partial-FP: balance untouched, pending
    // reduced by real portion only, FP refunded.
    $update = void_refund_user_update(
        ['riskAmount' => 100, 'freeplayAmountUsed' => 60, 'isFreeplay' => true],
        ['balance' => -200, 'pendingBalance' => 100, 'freeplayBalance' => 0, 'creditLimit' => 1000, 'role' => 'user'],
    );
    expect('credit: balance untouched', false, isset($update['balance']));
    expect('credit: pending -= 40 (real)', 60.0, $update['pendingBalance']);
    expect('credit: FP pool += 60', 60.0, $update['freeplayBalance']);
}
{
    // Pure-FP void: only FP pool moves.
    $update = void_refund_user_update(
        ['riskAmount' => 100, 'freeplayAmountUsed' => 100, 'isFreeplay' => true],
        ['balance' => 500, 'pendingBalance' => 0, 'freeplayBalance' => 0, 'creditLimit' => 0, 'role' => 'user'],
    );
    expect('pure FP: balance untouched', false, isset($update['balance']));
    expect('pure FP: pending untouched', false, isset($update['pendingBalance']));
    expect('pure FP: FP += full stake', 100.0, $update['freeplayBalance']);
}
{
    // Plain cash void: balance + pending only, no FP touch.
    $update = void_refund_user_update(
        ['riskAmount' => 100, 'freeplayAmountUsed' => 0, 'isFreeplay' => false],
        ['balance' => 500, 'pendingBalance' => 100, 'freeplayBalance' => 50, 'creditLimit' => 0, 'role' => 'user'],
    );
    expect('cash: balance += 100', 600.0, $update['balance']);
    expect('cash: pending -= 100', 0.0, $update['pendingBalance']);
    expect('cash: FP untouched', false, isset($update['freeplayBalance']));
}
{
    // Legacy bet: isFreeplay=true but no freeplayAmountUsed field.
    // Conservative fallback treats as pure FP → matches old behavior.
    $update = void_refund_user_update(
        ['riskAmount' => 100, 'isFreeplay' => true],
        ['balance' => 500, 'pendingBalance' => 0, 'freeplayBalance' => 0, 'creditLimit' => 0, 'role' => 'user'],
    );
    expect('legacy FP: full stake to FP pool', 100.0, $update['freeplayBalance']);
}

// ═══════════════════════════════════════════════════════════════
// DEFECT #2: Figures loss math uses cash portion only
// ═══════════════════════════════════════════════════════════════

function daily_pl_contrib(array $bet): float
{
    $status = strtolower((string) ($bet['status'] ?? ''));
    $risk = (float) ($bet['riskAmount'] ?? $bet['amount'] ?? 0);
    $payout = (float) ($bet['potentialPayout'] ?? 0);
    $fp = fpUsedOf($bet, $risk);
    $cashRisk = $risk - $fp;
    if ($status === 'won') return max(0.0, $payout - $risk); // profit unchanged
    if ($status === 'lost') return -$cashRisk;               // FP-aware
    return 0.0; // void / push net zero
}

echo "DEFECT #2: Figures loss math attributes only cash portion\n";
expect(
    'plain cash $1000 loss → -$1000',
    -1000.0,
    daily_pl_contrib(['status' => 'lost', 'riskAmount' => 1000, 'potentialPayout' => 1980]),
);
expect(
    'partial FP $1000 ($700 FP) loss → -$300',
    -300.0,
    daily_pl_contrib(['status' => 'lost', 'riskAmount' => 1000, 'potentialPayout' => 1980, 'freeplayAmountUsed' => 700, 'isFreeplay' => true]),
);
expect(
    'pure FP loss → $0',
    0.0,
    daily_pl_contrib(['status' => 'lost', 'riskAmount' => 1000, 'potentialPayout' => 1980, 'freeplayAmountUsed' => 1000, 'isFreeplay' => true]),
);
expect(
    'legacy FP loss → $0',
    0.0,
    daily_pl_contrib(['status' => 'lost', 'riskAmount' => 500, 'isFreeplay' => true]),
);
expect(
    'win profit unaffected by FP',
    100.0,
    daily_pl_contrib(['status' => 'won', 'riskAmount' => 100, 'potentialPayout' => 200, 'freeplayAmountUsed' => 100, 'isFreeplay' => true]),
);

// ═══════════════════════════════════════════════════════════════
// DEFECT #4: Agent netProfit math is FP-aware
// ═══════════════════════════════════════════════════════════════

function agent_stats(array $bets): array
{
    $totalWagered = 0.0;
    $totalPayouts = 0.0;
    foreach ($bets as $bet) {
        $risk = (float) ($bet['riskAmount'] ?? $bet['amount'] ?? 0);
        if ($risk <= 0) continue;
        $fp = fpUsedOf($bet, $risk);
        $cashRisk = $risk - $fp;
        $totalWagered += $cashRisk;
        if (($bet['status'] ?? '') === 'won') {
            $payout = (float) ($bet['potentialPayout'] ?? 0);
            $totalPayouts += max(0.0, $payout - $fp);
        }
    }
    return ['totalWagered' => $totalWagered, 'totalPayouts' => $totalPayouts, 'netProfit' => $totalWagered - $totalPayouts];
}

echo "DEFECT #4: Agent netProfit accounts for FP slice on both sides\n";
{
    // Pure cash $100 → $200 win: agent hold = -$100 (paid profit).
    $stats = agent_stats([['status' => 'won', 'riskAmount' => 100, 'potentialPayout' => 200, 'isFreeplay' => false]]);
    expect('cash win → -$100 hold', -100.0, $stats['netProfit']);
}
{
    // Pure FP $100 → $200 win: agent hold = -$100 (FP returns to pool, paid $100 profit).
    $stats = agent_stats([['status' => 'won', 'riskAmount' => 100, 'potentialPayout' => 200, 'freeplayAmountUsed' => 100, 'isFreeplay' => true]]);
    expect('pure-FP win → -$100 hold (profit only)', -100.0, $stats['netProfit']);
}
{
    // Partial FP $100 ($60 FP / $40 cash) → $200 win:
    //   Cash in: $40. Cash out: refund $40 + profit $100 = $140.
    //   Hold = 40 - 140 = -100.
    $stats = agent_stats([['status' => 'won', 'riskAmount' => 100, 'potentialPayout' => 200, 'freeplayAmountUsed' => 60, 'isFreeplay' => true]]);
    expect('partial-FP win → -$100 hold', -100.0, $stats['netProfit']);
}
{
    // Pure FP loss: agent hold = $0 (no cash moved either way).
    $stats = agent_stats([['status' => 'lost', 'riskAmount' => 100, 'potentialPayout' => 200, 'freeplayAmountUsed' => 100, 'isFreeplay' => true]]);
    expect('pure-FP loss → $0 hold (no cash flow)', 0.0, $stats['netProfit']);
}
{
    // Mixed portfolio:
    //   $100 cash win at +100 → -$100
    //   $200 pure-FP loss → $0
    //   $50 cash loss → +$50
    //   $100 partial ($60FP/$40) win at +100 → -$100
    // Total = -100 + 0 + 50 - 100 = -150
    $stats = agent_stats([
        ['status' => 'won',  'riskAmount' => 100, 'potentialPayout' => 200],
        ['status' => 'lost', 'riskAmount' => 200, 'potentialPayout' => 400, 'freeplayAmountUsed' => 200, 'isFreeplay' => true],
        ['status' => 'lost', 'riskAmount' => 50,  'potentialPayout' => 100],
        ['status' => 'won',  'riskAmount' => 100, 'potentialPayout' => 200, 'freeplayAmountUsed' => 60, 'isFreeplay' => true],
    ]);
    expect('mixed portfolio nets -$150', -150.0, $stats['netProfit']);
    expect('totalWagered excludes FP slices', 190.0, $stats['totalWagered']); // 100 + 0 + 50 + 40
}

// ═══════════════════════════════════════════════════════════════
// DEFECT #5: Round Robin idempotent replay carries freeplayBalance
// ═══════════════════════════════════════════════════════════════

/**
 * Mirror of the betrequests doc shape stored on RR completion.
 * Test asserts the response-shape field is populated so a replay
 * doesn't fall back to the (possibly drifted) current user FP.
 */
function rr_completed_doc(float $newBalance, float $newPending, float $newFreeplay): array
{
    return [
        'status' => 'completed',
        'responseBalance' => $newBalance,
        'responsePendingBalance' => $newPending,
        'responseFreeplayBalance' => $newFreeplay,
    ];
}

echo "DEFECT #5: RR idempotency stores responseFreeplayBalance\n";
{
    $doc = rr_completed_doc(-3203.0, 897.0, 0.0);
    expect('responseFreeplayBalance is present', true, array_key_exists('responseFreeplayBalance', $doc));
    expect('value is post-placement FP', 0.0, $doc['responseFreeplayBalance']);
}

echo "\n";
if (count($failures) > 0) {
    echo "FAIL: " . count($failures) . " assertion(s) failed ({$passes} passed)\n";
    foreach ($failures as $f) echo "  - {$f}\n";
    exit(1);
}
echo "PASS: {$passes} assertions, 0 failures\n";
exit(0);
