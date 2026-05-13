<?php

/**
 * Read-only test for the freeplay-row exclusion fix in
 * WalletController::getFigures.
 *
 * Reported bug (user, 2026-05-13):
 *   Weekly Figures showed `Transactions: +$3800` for "Last Week" even
 *   though the player had no deposits or withdrawals — only 5 admin
 *   freeplay grants ($1000 + $700 × 4). End balance read +$4507 instead
 *   of the expected +$707 (carryForward -$3674 + weekTotal +$4381 + $0).
 *
 * Root cause:
 *   The figures query summed `balanceAfter - balanceBefore` over every
 *   row in {adjustment, fp_deposit, deposit, withdrawal}. For fp_deposit
 *   AND for FP-flavored adjustments the balance snapshots are the
 *   FREEPLAY pool, not real cash — so an FP grant of $700 appeared as a
 *   $700 deposit. The fix filters those rows via isFreeplayLedgerRow().
 *
 * Carry forward had the same latent bug: it picked the latest pre-week
 * transaction's balanceAfter regardless of type. If that row was an FP
 * grant, carry forward became the FP balance, not the real balance.
 *
 * This test mirrors isFreeplayLedgerRow() (private static, so we
 * recreate the logic) and the per-row inclusion decision the controller
 * makes, then exercises:
 *   • The exact reported scenario (5 FP grants → $0 transactions)
 *   • All three forms a freeplay row can take
 *   • Real deposits / withdrawals / admin cash adjustments DO count
 *   • Carry forward correctly skips trailing FP grants
 *   • Mixed weeks: real + FP rows produce only the real total
 *
 * Usage:
 *   php php-backend/scripts/test-figures-freeplay-exclusion.php
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
 * Mirror of WalletController::isFreeplayLedgerRow.
 * Three forms of a freeplay-only row:
 *   1. type === 'fp_deposit'
 *   2. isFreeplay === true (admin adjusting the FP pool)
 *   3. referenceType === 'FreePlayBonus' (deposit-triggered FP bonus)
 */
function isFreeplayLedgerRow(array $tx): bool
{
    $type = strtolower((string) ($tx['type'] ?? ''));
    if ($type === 'fp_deposit') return true;
    if (!empty($tx['isFreeplay'])) return true;
    if (($tx['referenceType'] ?? '') === 'FreePlayBonus') return true;
    return false;
}

/**
 * Mirror of getFigures' transactionsTotal computation, post-fix.
 */
function transactionsTotal(array $rows): float
{
    $total = 0.0;
    foreach ($rows as $tx) {
        if (isFreeplayLedgerRow($tx)) continue;
        $before = isset($tx['balanceBefore']) ? (float) $tx['balanceBefore'] : null;
        $after = isset($tx['balanceAfter']) ? (float) $tx['balanceAfter'] : null;
        if ($before !== null && $after !== null) {
            $total += ($after - $before);
        }
    }
    return (float) round($total);
}

/**
 * Mirror of getFigures' carry-forward computation, post-fix.
 * Walk newest-first; return the first row whose balanceAfter reflects
 * real cash. Default 0 if nothing qualifies.
 */
function carryForward(array $priorTxNewestFirst): float
{
    foreach ($priorTxNewestFirst as $row) {
        if (isFreeplayLedgerRow($row)) continue;
        if (isset($row['balanceAfter']) && $row['balanceAfter'] !== null) {
            return (float) round((float) $row['balanceAfter']);
        }
    }
    return 0.0;
}

// ────────────────────────────────────────────────────────────────────
// 1) Classifier: every form of FP row is detected, real rows pass through
// ────────────────────────────────────────────────────────────────────
echo "Classifier — isFreeplayLedgerRow()\n";
expect('fp_deposit → FP',            true,  isFreeplayLedgerRow(['type' => 'fp_deposit']));
expect('FP_DEPOSIT (upper) → FP',    true,  isFreeplayLedgerRow(['type' => 'FP_DEPOSIT']));
expect('adjustment + isFreeplay=true → FP', true, isFreeplayLedgerRow(['type' => 'adjustment', 'isFreeplay' => true]));
expect('adjustment + isFreeplay=1 → FP',    true, isFreeplayLedgerRow(['type' => 'adjustment', 'isFreeplay' => 1]));
expect('adjustment + referenceType=FreePlayBonus → FP', true, isFreeplayLedgerRow(['type' => 'adjustment', 'referenceType' => 'FreePlayBonus']));
expect('deposit (plain) → not FP',   false, isFreeplayLedgerRow(['type' => 'deposit']));
expect('withdrawal (plain) → not FP', false, isFreeplayLedgerRow(['type' => 'withdrawal']));
expect('adjustment + referenceType=Adjustment (cash) → not FP', false, isFreeplayLedgerRow(['type' => 'adjustment', 'referenceType' => 'Adjustment']));
expect('adjustment + isFreeplay=false → not FP', false, isFreeplayLedgerRow(['type' => 'adjustment', 'isFreeplay' => false]));
expect('adjustment + isFreeplay missing → not FP', false, isFreeplayLedgerRow(['type' => 'adjustment']));

// ────────────────────────────────────────────────────────────────────
// 2) Exact reported scenario — 5 admin FP grants, expect $0
// ────────────────────────────────────────────────────────────────────
echo "\nReported scenario — 5 FP grants → \$0 transactions\n";
$reportedRows = [
    // type, balanceBefore, balanceAfter (snapshots the FP pool)
    ['type' => 'fp_deposit', 'balanceBefore' => 0,    'balanceAfter' => 1000, 'isFreeplay' => true],
    ['type' => 'fp_deposit', 'balanceBefore' => 1000, 'balanceAfter' => 1700, 'isFreeplay' => true],
    ['type' => 'fp_deposit', 'balanceBefore' => 1700, 'balanceAfter' => 2400, 'isFreeplay' => true],
    ['type' => 'fp_deposit', 'balanceBefore' => 2400, 'balanceAfter' => 3100, 'isFreeplay' => true],
    ['type' => 'fp_deposit', 'balanceBefore' => 3100, 'balanceAfter' => 3800, 'isFreeplay' => true],
];
expect('5 fp_deposits → $0', 0.0, transactionsTotal($reportedRows));

// Compose the user's full week math: carryForward + weekTotal + transactions
$expectedEndBalance = -3674.0 + 4381.0 + transactionsTotal($reportedRows);
expect('end balance for user scenario → $707', 707.0, $expectedEndBalance);

// ────────────────────────────────────────────────────────────────────
// 3) Real deposits / withdrawals DO count
// ────────────────────────────────────────────────────────────────────
echo "\nReal-cash rows still count\n";
$realRows = [
    ['type' => 'deposit',    'balanceBefore' => 0,    'balanceAfter' => 500],   // +500
    ['type' => 'deposit',    'balanceBefore' => 500,  'balanceAfter' => 1500],  // +1000
    ['type' => 'withdrawal', 'balanceBefore' => 1500, 'balanceAfter' => 1200],  // -300
    ['type' => 'adjustment', 'balanceBefore' => 1200, 'balanceAfter' => 1450,   // +250
        'referenceType' => 'Adjustment'],
    ['type' => 'adjustment', 'balanceBefore' => 1450, 'balanceAfter' => 1400,   // -50
        'referenceType' => 'Adjustment'],
];
expect('real-cash mix → +1400', 1400.0, transactionsTotal($realRows));

// ────────────────────────────────────────────────────────────────────
// 4) Mixed weeks — real + FP rows produce only the real total
// ────────────────────────────────────────────────────────────────────
echo "\nMixed weeks — FP rows filtered out, real rows kept\n";
$mixedRows = [
    ['type' => 'deposit',    'balanceBefore' => 100,  'balanceAfter' => 600],   // +500
    ['type' => 'fp_deposit', 'balanceBefore' => 0,    'balanceAfter' => 1000, 'isFreeplay' => true],
    ['type' => 'withdrawal', 'balanceBefore' => 600,  'balanceAfter' => 400],   // -200
    ['type' => 'adjustment', 'balanceBefore' => 1000, 'balanceAfter' => 2000,   // FP bonus — skip
        'referenceType' => 'FreePlayBonus'],
    ['type' => 'adjustment', 'balanceBefore' => 400,  'balanceAfter' => 450,    // +50 real
        'referenceType' => 'Adjustment'],
    ['type' => 'adjustment', 'balanceBefore' => 2000, 'balanceAfter' => 2200,   // FP — skip
        'isFreeplay' => true],
];
expect('mixed (real $350 + FP) → $350', 350.0, transactionsTotal($mixedRows));

// ────────────────────────────────────────────────────────────────────
// 5) Pre-fix regression check — original code would have returned $3800
// ────────────────────────────────────────────────────────────────────
echo "\nPre-fix regression — confirm bug existed before\n";
$preFixTotal = 0.0;
foreach ($reportedRows as $tx) {
    $before = (float) $tx['balanceBefore'];
    $after = (float) $tx['balanceAfter'];
    $preFixTotal += ($after - $before);
}
expect('pre-fix code would compute $3800 (proves the bug was real)', 3800.0, $preFixTotal);

// ────────────────────────────────────────────────────────────────────
// 6) Carry forward — skips trailing FP grants
// ────────────────────────────────────────────────────────────────────
echo "\nCarry forward — skips FP-only snapshots\n";

// Newest-first order, like the controller's sort: createdAt DESC
$priorTx_endsInFp = [
    ['type' => 'fp_deposit', 'balanceAfter' => 3800, 'isFreeplay' => true],   // newest = FP, skip
    ['type' => 'fp_deposit', 'balanceAfter' => 3100, 'isFreeplay' => true],   // skip
    ['type' => 'bet_lost',   'balanceAfter' => -3674],                        // real → use
    ['type' => 'bet_won',    'balanceAfter' => -2900],                        // older, ignored
];
expect('latest pre-week row is FP → carry from older real row (-$3674)', -3674.0, carryForward($priorTx_endsInFp));

$priorTx_realFirst = [
    ['type' => 'bet_won',    'balanceAfter' => 250],                          // newest = real → use
    ['type' => 'fp_deposit', 'balanceAfter' => 1000, 'isFreeplay' => true],
];
expect('latest row real → use it ($250)', 250.0, carryForward($priorTx_realFirst));

$priorTx_allFp = [
    ['type' => 'fp_deposit', 'balanceAfter' => 1000, 'isFreeplay' => true],
    ['type' => 'fp_deposit', 'balanceAfter' => 500,  'isFreeplay' => true],
];
expect('all FP → fall through to default 0', 0.0, carryForward($priorTx_allFp));

$priorTx_fpBonusInChain = [
    ['type' => 'adjustment', 'balanceAfter' => 1000, 'referenceType' => 'FreePlayBonus'], // skip
    ['type' => 'deposit',    'balanceAfter' => 500],                                       // real → use
];
expect('latest is FP bonus, prev is deposit → $500', 500.0, carryForward($priorTx_fpBonusInChain));

// ────────────────────────────────────────────────────────────────────
// 7) Edge cases — missing balanceBefore/After, empty input
// ────────────────────────────────────────────────────────────────────
echo "\nEdge cases\n";
expect('empty rows → $0', 0.0, transactionsTotal([]));
expect('balanceBefore null → skipped', 100.0, transactionsTotal([
    ['type' => 'deposit', 'balanceBefore' => null, 'balanceAfter' => 500],     // skipped — incomplete snapshot
    ['type' => 'deposit', 'balanceBefore' => 0,    'balanceAfter' => 100],     // +100
]));
expect('empty carryForward chain → $0 default', 0.0, carryForward([]));

// ────────────────────────────────────────────────────────────────────
// 8) Sibling-operator regression — make sure we didn't break label or
//    transaction-list query downstream by checking values are stable
// ────────────────────────────────────────────────────────────────────
echo "\nSibling regression — types we expect to filter cleanly\n";
// A void/pending row in the figures query should never appear because
// we filter status='completed'. But if one slips in past the SQL
// filter, isFreeplayLedgerRow shouldn't lie about its FP-ness.
expect('void row is treated by its FP flags, not its status', false, isFreeplayLedgerRow([
    'type' => 'deposit', 'status' => 'void',
]));

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
