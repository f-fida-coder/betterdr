<?php
/**
 * Multi-Week Settlement Verification
 *
 * Proves carry-forward makeup, settlement order, and balance-owed
 * accumulation across a realistic multi-week simulation.
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

// Agent: 50% split, $4/player fees
$pct = 50.0;

// ── TEST 1: Previous Makeup exists + positive week → reduces first ──
echo "--- TEST 1: Previous makeup + positive week (makeup reduces first) ---\n";
// previousMakeup=500, net=800
// Step 1: reduce makeup by min(800,500)=500, remainder=300
// commissionable=300, split=150, kick=150
$t1 = AgentSettlementRules::summarize(1000.0, 200.0, 20.0, 8.0, $pct, 500.0, 100.0);
v(eq($t1['netCollections'], 800.0), 'T1: net=1000-200=800');
v(eq($t1['makeupReduction'], 500.0), 'T1: makeup reduction=500 (full previous)');
v(eq($t1['commissionableProfit'], 300.0), 'T1: commissionable=800-500=300');
v(eq($t1['agentSplit'], 150.0), 'T1: agent split=300*50%=150');
v(eq($t1['kickToHouse'], 150.0), 'T1: kick=300-150=150');
v(eq($t1['weeklyHouseBalance'], 170.0), 'T1: weeklyHouseBal=150+20=170');
v(eq($t1['cumulativeMakeup'], 8.0), 'T1: cumMakeup=500-500+0+8=8 (only unpaid fees)');
v(eq($t1['balanceOwed'], 470.0), 'T1: balanceOwed=100+200+170=470');
echo "\n";

// ── TEST 2: Previous Makeup LARGER than net → no commission ──
echo "--- TEST 2: Makeup larger than net (no commission) ---\n";
// previousMakeup=1000, net=400
// makeup reduction=400, remainder=0
$t2 = AgentSettlementRules::summarize(600.0, 200.0, 12.0, 4.0, $pct, 1000.0, 200.0);
v(eq($t2['netCollections'], 400.0), 'T2: net=400');
v(eq($t2['makeupReduction'], 400.0), 'T2: reduction=min(400,1000)=400');
v(eq($t2['commissionableProfit'], 0.0), 'T2: commissionable=0 (all went to makeup)');
v(eq($t2['agentSplit'], 0.0), 'T2: no split');
v(eq($t2['kickToHouse'], 0.0), 'T2: no kick');
v(eq($t2['weeklyHouseBalance'], 0.0), 'T2: weeklyHouseBal=0 (no commissionable)');
v(eq($t2['cumulativeMakeup'], 604.0), 'T2: cumMakeup=1000-400+0+4=604');
v(eq($t2['balanceOwed'], 400.0), 'T2: balanceOwed=200+200+0=400');
echo "\n";

// ── TEST 3: No makeup + positive week → normal split ──
echo "--- TEST 3: No makeup + positive week (normal split) ---\n";
$t3 = AgentSettlementRules::summarize(2000.0, 500.0, 24.0, 16.0, $pct, 0.0, 0.0);
v(eq($t3['netCollections'], 1500.0), 'T3: net=1500');
v(eq($t3['makeupReduction'], 0.0), 'T3: no reduction needed');
v(eq($t3['commissionableProfit'], 1500.0), 'T3: full net is commissionable');
v(eq($t3['agentSplit'], 750.0), 'T3: split=750');
v(eq($t3['kickToHouse'], 750.0), 'T3: kick=750');
v(eq($t3['weeklyHouseBalance'], 774.0), 'T3: weeklyHouseBal=750+24=774');
v(eq($t3['cumulativeMakeup'], 16.0), 'T3: cumMakeup=0+0+16=16 (unpaid fees only)');
v(eq($t3['balanceOwed'], 1274.0), 'T3: balanceOwed=0+500+774=1274');
echo "\n";

// ── TEST 4: Negative week → makeup increases, no split ──
echo "--- TEST 4: Negative week (makeup increases) ---\n";
$t4 = AgentSettlementRules::summarize(200.0, 800.0, 8.0, 12.0, $pct, 100.0, 500.0);
v(eq($t4['netCollections'], -600.0), 'T4: net=-600');
v(eq($t4['makeupReduction'], 0.0), 'T4: no reduction (negative week)');
v(eq($t4['commissionableProfit'], 0.0), 'T4: no commissionable');
v(eq($t4['agentSplit'], 0.0), 'T4: no split');
v(eq($t4['weeklyHouseBalance'], 0.0), 'T4: no weekly balance');
v(eq($t4['cumulativeMakeup'], 712.0), 'T4: cumMakeup=100-0+600+12=712');
// previousBalanceOwed=500, houseCollections=800 (house collected $800), weeklyHouseBal=0
v(eq($t4['balanceOwed'], 1300.0), 'T4: balanceOwed=500+800+0=1300');
echo "\n";

// ── TEST 5: Mixed player fees ──
echo "--- TEST 5: Mixed player fees (positive to house, negative to makeup) ---\n";
// 5 positive @ $4 = $20 paid, 3 negative @ $4 = $12 unpaid
$t5 = AgentSettlementRules::summarize(1000.0, 300.0, 20.0, 12.0, $pct, 0.0, 0.0);
v(eq($t5['netCollections'], 700.0), 'T5: net=700');
v(eq($t5['agentSplit'], 350.0), 'T5: split=350');
v(eq($t5['agentProfitAfterFees'], 330.0), 'T5: profit=350-20=330');
v(eq($t5['kickToHouse'], 350.0), 'T5: kick=350');
v(eq($t5['weeklyHouseBalance'], 370.0), 'T5: weeklyHouseBal=350+20=370 (paid fees to house)');
v(eq($t5['cumulativeMakeup'], 12.0), 'T5: cumMakeup=0+0+12=12 (unpaid fees to makeup)');
echo "\n";

// ── TEST 6: 3-Week Simulation (carry-forward proof) ──
echo "--- TEST 6: 3-Week Simulation ---\n";

// Week 1: Negative week → builds makeup
echo "  Week 1 (negative):\n";
$w1 = AgentSettlementRules::summarize(300.0, 900.0, 8.0, 16.0, $pct, 0.0, 0.0);
v(eq($w1['netCollections'], -600.0), '  W1: net=-600');
v(eq($w1['cumulativeMakeup'], 616.0), '  W1: cumMakeup=0+600+16=616');
v(eq($w1['agentSplit'], 0.0), '  W1: no split');
v(eq($w1['weeklyHouseBalance'], 0.0), '  W1: no weekly balance');
v(eq($w1['balanceOwed'], 900.0), '  W1: balanceOwed=0+900+0=900');
// After W1: admin finalizes → settlementMakeup=616, settlementBalanceOwed=900

// Week 2: Positive week, but not enough to clear makeup
echo "  Week 2 (positive, partial makeup clear):\n";
$w2 = AgentSettlementRules::summarize(800.0, 300.0, 12.0, 4.0, $pct, 616.0, 900.0);
v(eq($w2['netCollections'], 500.0), '  W2: net=500');
v(eq($w2['makeupReduction'], 500.0), '  W2: reduction=min(500,616)=500');
v(eq($w2['commissionableProfit'], 0.0), '  W2: commissionable=0 (all to makeup)');
v(eq($w2['agentSplit'], 0.0), '  W2: no split');
v(eq($w2['weeklyHouseBalance'], 0.0), '  W2: no weekly balance');
v(eq($w2['cumulativeMakeup'], 120.0), '  W2: cumMakeup=616-500+0+4=120');
v(eq($w2['balanceOwed'], 1200.0), '  W2: balanceOwed=900+300+0=1200');
// After W2: admin finalizes → settlementMakeup=120, settlementBalanceOwed=1200

// Week 3: Positive week, clears remaining makeup + commission
echo "  Week 3 (positive, makeup clears, commission flows):\n";
$w3 = AgentSettlementRules::summarize(1500.0, 200.0, 20.0, 8.0, $pct, 120.0, 1200.0);
v(eq($w3['netCollections'], 1300.0), '  W3: net=1300');
v(eq($w3['makeupReduction'], 120.0), '  W3: reduction=min(1300,120)=120');
v(eq($w3['commissionableProfit'], 1180.0), '  W3: commissionable=1300-120=1180');
v(eq($w3['agentSplit'], 590.0), '  W3: split=1180*50%=590');
v(eq($w3['kickToHouse'], 590.0), '  W3: kick=590');
v(eq($w3['agentProfitAfterFees'], 570.0), '  W3: profit=590-20=570');
v(eq($w3['weeklyHouseBalance'], 610.0), '  W3: weeklyHouseBal=590+20=610');
v(eq($w3['cumulativeMakeup'], 8.0), '  W3: cumMakeup=120-120+0+8=8');
v(eq($w3['balanceOwed'], 2010.0), '  W3: balanceOwed=1200+200+610=2010');

echo "\n  3-Week audit trail:\n";
echo "    W1: makeup 0→616, balOwed 0→900\n";
echo "    W2: makeup 616→120, balOwed 900→1200\n";
echo "    W3: makeup 120→8, balOwed 1200→2010\n";
echo "    Agent earned commission ONLY in W3 (after makeup cleared)\n";
echo "\n";

// ── TEST 7: Break-even week (net=0) with existing makeup ──
echo "--- TEST 7: Break-even with existing makeup ---\n";
$t7 = AgentSettlementRules::summarize(500.0, 500.0, 8.0, 4.0, $pct, 200.0, 100.0);
v(eq($t7['netCollections'], 0.0), 'T7: net=0');
v(eq($t7['makeupReduction'], 0.0), 'T7: no reduction (not positive)');
v(eq($t7['commissionableProfit'], 0.0), 'T7: no commissionable');
v(eq($t7['cumulativeMakeup'], 204.0), 'T7: cumMakeup=200+0+4=204 (grew by unpaid)');
v(eq($t7['weeklyHouseBalance'], 0.0), 'T7: no weekly balance');
v(eq($t7['balanceOwed'], 600.0), 'T7: balOwed=100+500+0=600');
echo "\n";

// ── TEST 8: Agent percent = null (no split config) ──
echo "--- TEST 8: No agent percent with previous makeup ---\n";
$t8 = AgentSettlementRules::summarize(1000.0, 200.0, 0.0, 0.0, null, 300.0, 0.0);
v(eq($t8['netCollections'], 800.0), 'T8: net=800');
v(eq($t8['makeupReduction'], 300.0), 'T8: reduction=300');
v(eq($t8['commissionableProfit'], 500.0), 'T8: commissionable=500');
v(eq($t8['agentSplit'], 500.0), 'T8: agent gets all (no pct → full net)');
v(eq($t8['kickToHouse'], 0.0), 'T8: no kick');
v(eq($t8['cumulativeMakeup'], 0.0), 'T8: makeup cleared');
echo "\n";

// ── SUMMARY ──
echo "==============================================\n";
$total = $passed + $failed;
echo "RESULTS: $passed/$total passed";
if ($failed > 0) {
    echo " ($failed FAILED)";
    echo "\n==============================================\n";
    exit(1);
}
echo "\n==============================================\n";
echo "\nAll multi-week settlement checks passed.\n";
echo "\nThis system now behaves like a real betting settlement engine.\n";
exit(0);
