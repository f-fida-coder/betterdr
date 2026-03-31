<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/AgentSettlementRules.php';

function assertSameValue(mixed $actual, mixed $expected, string $label): void
{
    if ($actual !== $expected) {
        throw new RuntimeException($label . ' expected ' . var_export($expected, true) . ' but got ' . var_export($actual, true));
    }
}

function assertMoney(float $actual, float $expected, string $label): void
{
    if (abs($actual - $expected) > 0.00001) {
        throw new RuntimeException($label . ' expected ' . number_format($expected, 2) . ' but got ' . number_format($actual, 2));
    }
}

echo "==============================================\n";
echo "Agent Settlement Rules Verification\n";
echo "==============================================\n\n";

try {
    echo "1) Verifying linked counterpart resolution...\n";
    assertSameValue(
        AgentSettlementRules::linkedCounterpartUsername('NJG365', 'agent'),
        'NJG365MA',
        'agent linked counterpart'
    );
    assertSameValue(
        AgentSettlementRules::linkedCounterpartUsername('NJG365MA', 'master_agent'),
        'NJG365',
        'master agent linked counterpart'
    );
    assertSameValue(
        AgentSettlementRules::linkedCounterpartUsername('HOUSE365', 'admin'),
        null,
        'admin linked counterpart'
    );

    echo "2) Verifying strict linked-pair approver bucketing...\n";
    $linkedPairIds = [
        'agent-1' => true,
        'agent-ma-1' => true,
    ];
    assertSameValue(
        AgentSettlementRules::classifyScopedApprover('agent', 'agent-1', $linkedPairIds, true),
        'agent',
        'linked agent approver bucket'
    );
    assertSameValue(
        AgentSettlementRules::classifyScopedApprover('master_agent', 'agent-ma-1', $linkedPairIds, true),
        'agent',
        'linked MA approver bucket'
    );
    assertSameValue(
        AgentSettlementRules::classifyScopedApprover('agent', 'other-agent', $linkedPairIds, true),
        'admin',
        'other agent approver bucket'
    );
    assertSameValue(
        AgentSettlementRules::classifyScopedApprover('admin', 'house-1', $linkedPairIds, true),
        'admin',
        'house approver bucket'
    );

    // ---------------------------------------------------------------
    // Test 3: Positive week (Net = Agent - House > 0)
    //   Agent collected 7300, House collected 7000
    //   Net = 7300 - 7000 = 300
    //   Agent Split = 300 × 95% = 285
    //   Kick To House = 300 - 285 = 15
    //   Agent Profit = 285 - 4 (paid fees) = 281
    //   Makeup = max(0, -300) + 0 (unpaid fees) = 0
    //   Weekly House Balance = 15 + 4 = 19
    // ---------------------------------------------------------------
    echo "3) Verifying positive-week settlement math (Net = Agent - House)...\n";
    $positive = AgentSettlementRules::summarize(7300.0, 7000.0, 4.0, 0.0, 95.0);
    assertMoney($positive['netCollections'], 300.0, 'positive net collections');
    assertMoney($positive['agentSplit'], 285.0, 'positive agent split');
    assertMoney($positive['kickToHouse'], 15.0, 'positive kick to house');
    assertMoney($positive['agentProfitAfterFees'], 281.0, 'positive agent profit after fees');
    assertMoney($positive['cumulativeMakeup'], 0.0, 'positive makeup');
    assertMoney($positive['weeklyHouseBalance'], 19.0, 'positive weekly house balance');
    assertMoney($positive['commissionableProfit'], 300.0, 'positive commissionable profit');

    // ---------------------------------------------------------------
    // Test 4: Positive week with 50/50 split + player fees
    //   Agent collected 2000, House collected 500
    //   Net = 2000 - 500 = 1500
    //   Agent Split = 1500 × 50% = 750
    //   Kick = 1500 - 750 = 750
    //   Agent Profit = 750 - 24 (paid fees) = 726
    //   Makeup = max(0, -1500) + 16 (unpaid fees) = 16
    //   Weekly House Balance = 750 + 24 = 774
    // ---------------------------------------------------------------
    echo "4) Verifying positive week with 50/50 split and player fees...\n";
    $split50 = AgentSettlementRules::summarize(2000.0, 500.0, 24.0, 16.0, 50.0);
    assertMoney($split50['netCollections'], 1500.0, '50/50 net collections');
    assertMoney($split50['agentSplit'], 750.0, '50/50 agent split');
    assertMoney($split50['kickToHouse'], 750.0, '50/50 kick to house');
    assertMoney($split50['agentProfitAfterFees'], 726.0, '50/50 agent profit after fees');
    assertMoney($split50['cumulativeMakeup'], 16.0, '50/50 makeup (unpaid fees only)');
    assertMoney($split50['weeklyHouseBalance'], 774.0, '50/50 weekly house balance');

    // ---------------------------------------------------------------
    // Test 5: Negative week (Net = Agent - House < 0)
    //   Agent collected 200, House collected 800
    //   Net = 200 - 800 = -600
    //   Agent Split = 0 (negative week)
    //   Kick = 0 (negative week)
    //   Agent Profit = 0 - 4 (paid fees) = -4
    //   Makeup = |600| + 16 (unpaid fees) = 616
    //   Weekly House Balance = 0 (negative week)
    // ---------------------------------------------------------------
    echo "5) Verifying negative-week settlement math...\n";
    $negative = AgentSettlementRules::summarize(200.0, 800.0, 4.0, 16.0, 50.0);
    assertMoney($negative['netCollections'], -600.0, 'negative net collections');
    assertMoney($negative['agentSplit'], 0.0, 'negative agent split');
    assertMoney($negative['kickToHouse'], 0.0, 'negative kick to house');
    assertMoney($negative['agentProfitAfterFees'], -4.0, 'negative agent profit after fees');
    assertMoney($negative['cumulativeMakeup'], 616.0, 'negative makeup = |net| + unpaid fees');
    assertMoney($negative['weeklyHouseBalance'], 0.0, 'negative weekly house balance');
    assertMoney($negative['commissionableProfit'], 0.0, 'negative commissionable profit');

    // ---------------------------------------------------------------
    // Test 6: Both sides negative (agent paid out, house paid out)
    //   Agent collected -300, House collected -100
    //   Net = -300 - (-100) = -200
    //   Negative week → no split, no kick
    //   Makeup = |200| + 12 = 212
    // ---------------------------------------------------------------
    echo "6) Verifying both-sides-negative settlement...\n";
    $bothNeg = AgentSettlementRules::summarize(-300.0, -100.0, 0.0, 12.0, 95.0);
    assertMoney($bothNeg['netCollections'], -200.0, 'both negative net');
    assertMoney($bothNeg['agentSplit'], 0.0, 'both negative agent split');
    assertMoney($bothNeg['cumulativeMakeup'], 212.0, 'both negative makeup');
    assertMoney($bothNeg['weeklyHouseBalance'], 0.0, 'both negative house balance');

    // ---------------------------------------------------------------
    // Test 7: Zero net (exactly break-even)
    //   Agent collected 500, House collected 500
    //   Net = 0 → not a positive week
    //   No split, no kick, no house balance
    //   Makeup = only unpaid fees
    // ---------------------------------------------------------------
    echo "7) Verifying break-even (zero net)...\n";
    $breakEven = AgentSettlementRules::summarize(500.0, 500.0, 8.0, 4.0, 50.0);
    assertMoney($breakEven['netCollections'], 0.0, 'break-even net');
    assertMoney($breakEven['agentSplit'], 0.0, 'break-even agent split');
    assertMoney($breakEven['kickToHouse'], 0.0, 'break-even kick');
    assertMoney($breakEven['weeklyHouseBalance'], 0.0, 'break-even house balance');
    assertMoney($breakEven['cumulativeMakeup'], 4.0, 'break-even makeup = unpaid fees only');

    // ---------------------------------------------------------------
    // Test 8: No agent percent (fallback: agent gets all net, house gets nothing)
    // ---------------------------------------------------------------
    echo "8) Verifying no-percent fallback...\n";
    $noPct = AgentSettlementRules::summarize(1000.0, 200.0, 0.0, 0.0, null);
    assertMoney($noPct['netCollections'], 800.0, 'no-pct net');
    assertMoney($noPct['agentSplit'], 800.0, 'no-pct agent split (full net)');
    assertMoney($noPct['kickToHouse'], 0.0, 'no-pct kick to house');
    assertMoney($noPct['weeklyHouseBalance'], 0.0, 'no-pct house balance');

    echo "\nAll settlement-rule checks passed.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Settlement-rule verification failed: " . $e->getMessage() . "\n");
    exit(1);
}
