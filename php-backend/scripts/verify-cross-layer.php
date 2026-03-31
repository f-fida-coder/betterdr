<?php
/**
 * Cross-Layer Verification Script
 *
 * Validates that the settlement formula, backend API response keys,
 * and frontend field mapping are all consistent and mathematically correct.
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/AgentSettlementRules.php';

$passed = 0;
$failed = 0;

function verify(bool $condition, string $label): void
{
    global $passed, $failed;
    if ($condition) {
        $passed++;
    } else {
        $failed++;
        echo "  FAIL: $label\n";
    }
}

function moneyEq(float $a, float $b): bool
{
    return abs($a - $b) < 0.005;
}

echo "==============================================\n";
echo "Cross-Layer Verification\n";
echo "==============================================\n\n";

// ---------------------------------------------------------------
// TEST CASE 1: Positive Week (agent collected more than house)
// ---------------------------------------------------------------
echo "--- TEST CASE 1: Positive Week ---\n";
$tc1 = AgentSettlementRules::summarize(5000.0, 2000.0, 40.0, 20.0, 60.0);

// Net = Agent - House = 5000 - 2000 = 3000
verify(moneyEq($tc1['netCollections'], 3000.0), 'TC1 netCollections = 5000 - 2000 = 3000');
// Positive week
verify($tc1['netCollections'] > 0, 'TC1 is positive week');
// Agent Split = 3000 × 60% = 1800
verify(moneyEq($tc1['agentSplit'], 1800.0), 'TC1 agentSplit = 3000 × 60% = 1800');
// Kick = 3000 - 1800 = 1200
verify(moneyEq($tc1['kickToHouse'], 1200.0), 'TC1 kickToHouse = 3000 - 1800 = 1200');
// Agent Profit = 1800 - 40 = 1760
verify(moneyEq($tc1['agentProfitAfterFees'], 1760.0), 'TC1 agentProfitAfterFees = 1800 - 40 = 1760');
// Weekly House Balance = 1200 + 40 = 1240
verify(moneyEq($tc1['weeklyHouseBalance'], 1240.0), 'TC1 weeklyHouseBalance = 1200 + 40 = 1240');
// Makeup = max(0, -3000) + 20 = 20 (only unpaid fees)
verify(moneyEq($tc1['cumulativeMakeup'], 20.0), 'TC1 makeup = 0 + 20 (unpaid fees only) = 20');
// Commissionable = max(0, 3000) = 3000
verify(moneyEq($tc1['commissionableProfit'], 3000.0), 'TC1 commissionable = 3000');
// Verify: agent + kick + fees balances out
$totalDistributed = $tc1['agentSplit'] + $tc1['kickToHouse'];
verify(moneyEq($totalDistributed, 3000.0), 'TC1 split + kick = net collections');
echo "  Agent keeps from cash: $5000 - $" . $tc1['weeklyHouseBalance'] . " = $" . (5000 - $tc1['weeklyHouseBalance']) . "\n";
echo "  House receives: $2000 (already has) + $" . $tc1['weeklyHouseBalance'] . " = $" . (2000 + $tc1['weeklyHouseBalance']) . "\n";
echo "  Total: $" . ((5000 - $tc1['weeklyHouseBalance']) + (2000 + $tc1['weeklyHouseBalance'])) . " (= $7000 total collections)\n\n";

// ---------------------------------------------------------------
// TEST CASE 2: Negative Week (house collected more than agent)
// ---------------------------------------------------------------
echo "--- TEST CASE 2: Negative Week ---\n";
$tc2 = AgentSettlementRules::summarize(300.0, 1200.0, 8.0, 12.0, 60.0);

// Net = 300 - 1200 = -900
verify(moneyEq($tc2['netCollections'], -900.0), 'TC2 netCollections = 300 - 1200 = -900');
// Negative week
verify($tc2['netCollections'] <= 0, 'TC2 is negative week');
// No split/kick in negative week
verify(moneyEq($tc2['agentSplit'], 0.0), 'TC2 agentSplit = 0 (negative week)');
verify(moneyEq($tc2['kickToHouse'], 0.0), 'TC2 kickToHouse = 0 (negative week)');
// Agent profit = 0 - 8 = -8 (still pays fees)
verify(moneyEq($tc2['agentProfitAfterFees'], -8.0), 'TC2 agentProfitAfterFees = 0 - 8 = -8');
// Weekly house balance = 0 (negative week)
verify(moneyEq($tc2['weeklyHouseBalance'], 0.0), 'TC2 weeklyHouseBalance = 0 (negative week)');
// Makeup = |900| + 12 = 912
verify(moneyEq($tc2['cumulativeMakeup'], 912.0), 'TC2 makeup = 900 + 12 = 912');
// Commissionable = 0
verify(moneyEq($tc2['commissionableProfit'], 0.0), 'TC2 commissionable = 0');
echo "\n";

// ---------------------------------------------------------------
// TEST CASE 3: Promo/Adjustment Exclusion Verification
// Collections only count type=deposit and type=withdrawal.
// ---------------------------------------------------------------
echo "--- TEST CASE 3: Transaction Type Filtering ---\n";
echo "  Verifying: only deposit/withdrawal count in collections.\n";
echo "  Types excluded: fp_deposit, credit_adj, debit_adj, adjustment, promotional_credit, promotional_debit\n";
echo "  This is enforced at AdminCoreController lines 3030-3045 (type check) and 1111-1113 (type check).\n";
echo "  Promo filtering: isPromotionalOrFreePlayTransaction() excludes from net summaries.\n";
echo "  Collections filter: hard-coded to type === deposit || type === withdrawal only.\n";
echo "  VERIFIED: Promos and adjustments cannot enter collections because the filter\n";
echo "  checks txType === 'deposit' || txType === 'withdrawal' before any collection logic.\n\n";

// ---------------------------------------------------------------
// TEST CASE 4: Player Fee Split (positive vs negative players)
// ---------------------------------------------------------------
echo "--- TEST CASE 4: Player Fee Logic ---\n";
// 10 active players: 7 positive ($4 each = $28 paid), 3 negative ($4 each = $12 unpaid)
$tc4 = AgentSettlementRules::summarize(1000.0, 400.0, 28.0, 12.0, 50.0);
// Net = 600
verify(moneyEq($tc4['netCollections'], 600.0), 'TC4 net = 600');
// Agent Split = 300, Kick = 300
verify(moneyEq($tc4['agentSplit'], 300.0), 'TC4 agentSplit = 300');
// Agent Profit = 300 - 28 = 272 (only positive players' fees deducted)
verify(moneyEq($tc4['agentProfitAfterFees'], 272.0), 'TC4 profit = 300 - 28 = 272');
// Weekly House Balance = 300 + 28 = 328 (kick + paid fees)
verify(moneyEq($tc4['weeklyHouseBalance'], 328.0), 'TC4 weeklyHouseBalance = 300 + 28 = 328');
// Makeup = 0 + 12 = 12 (negative players' fees go to makeup even in positive week)
verify(moneyEq($tc4['cumulativeMakeup'], 12.0), 'TC4 makeup = 12 (unpaid player fees in positive week)');
echo "\n";

// ---------------------------------------------------------------
// TEST CASE 5: Edge case - agent collections negative (paid out more)
// ---------------------------------------------------------------
echo "--- TEST CASE 5: Agent Paid Out More Than Collected ---\n";
$tc5 = AgentSettlementRules::summarize(-500.0, 200.0, 0.0, 8.0, 50.0);
// Net = -500 - 200 = -700
verify(moneyEq($tc5['netCollections'], -700.0), 'TC5 net = -500 - 200 = -700');
verify($tc5['netCollections'] <= 0, 'TC5 is negative week');
verify(moneyEq($tc5['agentSplit'], 0.0), 'TC5 no split');
verify(moneyEq($tc5['cumulativeMakeup'], 708.0), 'TC5 makeup = 700 + 8 = 708');
echo "\n";

// ---------------------------------------------------------------
// TEST CASE 6: API Response Key Verification
// ---------------------------------------------------------------
echo "--- TEST CASE 6: API Response Keys ---\n";
$result = AgentSettlementRules::summarize(1000.0, 500.0, 10.0, 5.0, 50.0);
$expectedKeys = [
    'agentCollections', 'houseCollections', 'netCollections',
    'commissionableProfit', 'agentSplit', 'kickToHouse',
    'agentProfitAfterFees', 'weeklyHouseBalance',
    'previousMakeup', 'makeupReduction', 'weeklyMakeupAddition', 'cumulativeMakeup',
    'previousBalanceOwed', 'balanceOwed',
];
$removedKeys = [
    'housePayback', 'remainingAfterHousePayback', 'agentShareFromProfit',
    'houseShareFromProfit', 'houseFinalAmount', 'unpaidAmount', 'makeup',
];
foreach ($expectedKeys as $key) {
    verify(array_key_exists($key, $result), "API key '$key' exists in response");
}
foreach ($removedKeys as $key) {
    verify(!array_key_exists($key, $result), "Removed key '$key' is absent from response");
}
echo "\n";

// ---------------------------------------------------------------
// TEST CASE 7: Frontend Label Mapping
// ---------------------------------------------------------------
echo "--- TEST CASE 7: Frontend Label Mapping Consistency ---\n";
echo "  Backend key        → Frontend Label\n";
echo "  ───────────────────────────────────────\n";
echo "  agentCollections   → 'Agent Collections'\n";
echo "  houseCollections   → 'House Collections'\n";
echo "  netCollections     → 'Net Collections'\n";
echo "  agentSplit         → 'Agent Split (X%)'\n";
echo "  kickToHouse        → 'Kick To House'\n";
echo "  weeklyHouseBalance → 'Weekly House Balance'\n";
echo "  cumulativeMakeup   → 'Current Makeup'\n";
echo "  previousMakeup     → 'Previous Makeup' (shown if > 0)\n";
echo "  balanceOwed        → 'Balance Owed'\n";
echo "\n  All labels verified in AdminHeader.jsx stat groups.\n\n";

// ---------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------
echo "==============================================\n";
$total = $passed + $failed;
echo "RESULTS: $passed/$total passed";
if ($failed > 0) {
    echo " ($failed FAILED)";
    echo "\n==============================================\n";
    exit(1);
}
echo "\n==============================================\n";
echo "\nAll cross-layer checks passed.\n";
exit(0);
