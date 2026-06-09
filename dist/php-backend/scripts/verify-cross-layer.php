<?php
/**
 * Cross-Layer Verification Script
 *
 * Validates that the settlement formula, backend response keys, and frontend
 * field names all line up with the current business rules.
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

echo "--- TEST CASE 1: Positive Week ---\n";
$tc1 = AgentSettlementRules::summarize(5000.0, 2000.0, 40.0, 20.0, 60.0);
verify(moneyEq($tc1['netCollections'], 7000.0), 'TC1 netCollections = 5000 + 2000 = 7000');
verify(moneyEq($tc1['commissionableProfit'], 6940.0), 'TC1 commissionable = 7000 - 60');
verify(moneyEq($tc1['agentSplit'], 4164.0), 'TC1 agentSplit = 6940 × 60%');
verify(moneyEq($tc1['kickToHouse'], 2776.0), 'TC1 kickToHouse = 6940 - 4164');
verify(moneyEq($tc1['houseProfit'], 2836.0), 'TC1 houseProfit = 2776 + 60');
verify(moneyEq($tc1['cumulativeMakeup'], 0.0), 'TC1 makeup clears to zero');
verify(moneyEq($tc1['balanceOwed'], 836.0), 'TC1 balanceOwed = 2836 - 2000');
echo "\n";

echo "--- TEST CASE 2: Negative Week ---\n";
$tc2 = AgentSettlementRules::summarize(300.0, -1200.0, 8.0, 12.0, 60.0);
verify(moneyEq($tc2['netCollections'], -900.0), 'TC2 netCollections = 300 + (-1200) = -900');
verify(moneyEq($tc2['agentSplit'], 0.0), 'TC2 agentSplit = 0 on negative week');
verify(moneyEq($tc2['kickToHouse'], 0.0), 'TC2 kickToHouse = 0 on negative week');
verify(moneyEq($tc2['houseProfit'], 0.0), 'TC2 houseProfit = 0 on negative week');
verify(moneyEq($tc2['cumulativeMakeup'], 920.0), 'TC2 makeup = |net| + total fees = 900 + 20');
verify(moneyEq($tc2['balanceOwed'], 300.0), 'TC2 balanceOwed = agentCollections only');
echo "\n";

echo "--- TEST CASE 3: Player Fee Logic ---\n";
$tc3 = AgentSettlementRules::summarize(1000.0, 400.0, 28.0, 12.0, 50.0);
verify(moneyEq($tc3['netCollections'], 1400.0), 'TC3 net = 1400');
verify(moneyEq($tc3['commissionableProfit'], 1360.0), 'TC3 commissionable = 1400 - 40');
verify(moneyEq($tc3['agentSplit'], 680.0), 'TC3 agentSplit = 680');
verify(moneyEq($tc3['kickToHouse'], 680.0), 'TC3 kick = 680');
verify(moneyEq($tc3['houseProfit'], 720.0), 'TC3 houseProfit = kick + fees = 720');
verify(moneyEq($tc3['cumulativeMakeup'], 0.0), 'TC3 no makeup when fees are fully covered');
echo "\n";

echo "--- TEST CASE 4: API Response Keys ---\n";
$result = AgentSettlementRules::summarize(1000.0, 500.0, 10.0, 5.0, 50.0);
$expectedKeys = [
    'agentCollections', 'houseCollections', 'netCollections',
    'commissionableProfit', 'agentSplit', 'kickToHouse', 'houseProfit',
    'previousMakeup', 'makeupReduction', 'weeklyMakeupAddition', 'cumulativeMakeup',
    'previousBalanceOwed', 'balanceOwed',
];
$removedKeys = [
    'agentProfitAfterFees', 'weeklyHouseBalance', 'housePayback',
    'remainingAfterHousePayback', 'agentShareFromProfit', 'houseShareFromProfit',
    'houseFinalAmount', 'unpaidAmount', 'makeup',
];
foreach ($expectedKeys as $key) {
    verify(array_key_exists($key, $result), "API key '$key' exists in response");
}
foreach ($removedKeys as $key) {
    verify(!array_key_exists($key, $result), "Removed key '$key' is absent from response");
}
echo "\n";

echo "--- TEST CASE 5: Frontend Label Mapping ---\n";
echo "  Backend key        → Frontend Label\n";
echo "  ───────────────────────────────────────\n";
echo "  agentCollections   → 'Agent Collections'\n";
echo "  houseCollections   → 'House Collections'\n";
echo "  netCollections     → 'Net Collections'\n";
echo "  agentSplit         → 'Agent Split (X%)'\n";
echo "  kickToHouse        → 'Kick to House'\n";
echo "  houseProfit        → 'House Profit'\n";
echo "  cumulativeMakeup   → 'Remaining Makeup'\n";
echo "  previousBalanceOwed → 'Previous Balance'\n";
echo "  balanceOwed        → 'Balance Owed'\n\n";

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
