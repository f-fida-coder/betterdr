<?php
/**
 * Multi-Week Settlement Verification
 *
 * Proves carry-forward makeup, settlement order, and balance-owed accumulation
 * using the current rule set:
 *   net = agentCollections + houseCollections
 *   positive net pays down makeup first
 *   fees are covered before commission
 *   break-even / negative weeks push fees into makeup
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/AgentSettlementRules.php';

$passed = 0;
$failed = 0;

function v(bool $ok, string $label): void
{
    global $passed, $failed;
    if ($ok) {
        $passed++;
    } else {
        $failed++;
        echo "  FAIL: $label\n";
    }
}

function eq(float $a, float $b): bool
{
    return abs($a - $b) < 0.005;
}

echo "==============================================\n";
echo "Multi-Week Settlement Verification\n";
echo "==============================================\n\n";

$pct = 50.0;

echo "--- TEST 1: Previous makeup + positive week ---\n";
$t1 = AgentSettlementRules::summarize(1000.0, 200.0, 20.0, 8.0, $pct, 500.0, 100.0);
v(eq($t1['netCollections'], 1200.0), 'T1: net = 1000 + 200 = 1200');
v(eq($t1['makeupReduction'], 500.0), 'T1: prior makeup fully reduced');
v(eq($t1['commissionableProfit'], 672.0), 'T1: distributable = 1200 - 500 - 28 = 672');
v(eq($t1['agentSplit'], 336.0), 'T1: agent split = 336');
v(eq($t1['kickToHouse'], 336.0), 'T1: kick = 336');
v(eq($t1['houseProfit'], 364.0), 'T1: house profit = kick + fees = 364');
v(eq($t1['cumulativeMakeup'], 0.0), 'T1: makeup cleared');
v(eq($t1['balanceOwed'], 264.0), 'T1: balance owed = 100 + 364 - 200 = 264');
echo "\n";

echo "--- TEST 2: Previous makeup larger than week net ---\n";
$t2 = AgentSettlementRules::summarize(600.0, -200.0, 12.0, 4.0, $pct, 1000.0, 200.0);
v(eq($t2['netCollections'], 400.0), 'T2: net = 400');
v(eq($t2['makeupReduction'], 400.0), 'T2: reduction = min(400, 1000)');
v(eq($t2['commissionableProfit'], 0.0), 'T2: no commission while makeup remains');
v(eq($t2['weeklyMakeupAddition'], 16.0), 'T2: uncovered fees return to makeup');
v(eq($t2['cumulativeMakeup'], 616.0), 'T2: remaining makeup = 1000 - 400 + 16');
v(eq($t2['balanceOwed'], 800.0), 'T2: no-profit balance owed = previous + agent cash = 200 + 600');
echo "\n";

echo "--- TEST 3: Negative week ---\n";
$t3 = AgentSettlementRules::summarize(200.0, -800.0, 8.0, 12.0, $pct, 100.0, 500.0);
v(eq($t3['netCollections'], -600.0), 'T3: net = -600');
v(eq($t3['commissionableProfit'], 0.0), 'T3: negative week has no commissionable profit');
v(eq($t3['weeklyMakeupAddition'], 620.0), 'T3: deficit + total fees go to makeup');
v(eq($t3['cumulativeMakeup'], 720.0), 'T3: cumulative makeup = 100 + 620');
v(eq($t3['houseProfit'], 0.0), 'T3: house profit = 0 on negative week');
v(eq($t3['balanceOwed'], 700.0), 'T3: balance owed = previous + agent cash = 500 + 200');
echo "\n";

echo "--- TEST 4: Positive week with fees fully covered ---\n";
$t4 = AgentSettlementRules::summarize(1000.0, 300.0, 20.0, 12.0, $pct, 0.0, 0.0);
v(eq($t4['netCollections'], 1300.0), 'T4: net = 1300');
v(eq($t4['commissionableProfit'], 1268.0), 'T4: distributable = 1300 - 32');
v(eq($t4['agentSplit'], 634.0), 'T4: agent split = 634');
v(eq($t4['kickToHouse'], 634.0), 'T4: kick = 634');
v(eq($t4['houseProfit'], 666.0), 'T4: house profit = 634 + 32');
v(eq($t4['cumulativeMakeup'], 0.0), 'T4: no makeup when all fees covered');
v(eq($t4['balanceOwed'], 366.0), 'T4: balance owed = 666 - 300 = 366');
echo "\n";

echo "--- TEST 5: Break-even week with existing makeup ---\n";
$t5 = AgentSettlementRules::summarize(500.0, -500.0, 8.0, 4.0, $pct, 200.0, 100.0);
v(eq($t5['netCollections'], 0.0), 'T5: net = 0');
v(eq($t5['makeupReduction'], 0.0), 'T5: no reduction when net is not positive');
v(eq($t5['weeklyMakeupAddition'], 12.0), 'T5: all fees stay in makeup on break-even week');
v(eq($t5['cumulativeMakeup'], 212.0), 'T5: cumulative makeup grows by total fees');
v(eq($t5['balanceOwed'], 600.0), 'T5: no-profit balance owed = previous + agent cash');
echo "\n";

echo "--- TEST 6: Three-week carry-forward audit trail ---\n";
$w1 = AgentSettlementRules::summarize(300.0, -900.0, 8.0, 16.0, $pct, 0.0, 0.0);
$w2 = AgentSettlementRules::summarize(800.0, -300.0, 12.0, 4.0, $pct, $w1['cumulativeMakeup'], $w1['balanceOwed']);
$w3 = AgentSettlementRules::summarize(1500.0, 200.0, 20.0, 8.0, $pct, $w2['cumulativeMakeup'], $w2['balanceOwed']);

v(eq($w1['cumulativeMakeup'], 624.0), 'W1: week 1 builds makeup');
v(eq($w1['balanceOwed'], 300.0), 'W1: week 1 balance owed = 300');
v(eq($w2['makeupReduction'], 500.0), 'W2: week 2 partially reduces makeup');
v(eq($w2['cumulativeMakeup'], 140.0), 'W2: week 2 leaves makeup = 140');
v(eq($w2['balanceOwed'], 1100.0), 'W2: week 2 balance owed = 1100');
v(eq($w3['makeupReduction'], 140.0), 'W3: week 3 clears remaining makeup first');
v(eq($w3['commissionableProfit'], 1532.0), 'W3: week 3 distributable = 1700 - 140 - 28');
v(eq($w3['houseProfit'], 794.0), 'W3: week 3 house profit = 766 + 28');
v(eq($w3['cumulativeMakeup'], 0.0), 'W3: week 3 clears all makeup');
v(eq($w3['balanceOwed'], 1694.0), 'W3: week 3 balance owed = 1100 + 794 - 200');

echo "\n==============================================\n";
$total = $passed + $failed;
echo "RESULTS: $passed/$total passed";
if ($failed > 0) {
    echo " ($failed FAILED)";
    echo "\n==============================================\n";
    exit(1);
}
echo "\n==============================================\n";
echo "\nAll multi-week settlement checks passed.\n";
exit(0);
