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

    echo "3) Verifying positive-week settlement math (net = agent + house)...\n";
    $positive = AgentSettlementRules::summarize(300.0, 0.0, 4.0, 0.0, 95.0);
    assertMoney($positive['netCollections'], 300.0, 'positive net collections');
    assertMoney($positive['commissionableProfit'], 296.0, 'positive commissionable profit');
    assertMoney($positive['agentSplit'], 281.2, 'positive agent split');
    assertMoney($positive['kickToHouse'], 14.8, 'positive kick to house');
    assertMoney($positive['houseProfit'], 18.8, 'positive house profit');
    assertMoney($positive['cumulativeMakeup'], 0.0, 'positive makeup');
    assertMoney($positive['balanceOwed'], 18.8, 'positive balance owed');

    echo "4) Verifying previous makeup clears before commissions...\n";
    $withMakeup = AgentSettlementRules::summarize(1000.0, 500.0, 24.0, 16.0, 50.0, 200.0, 100.0);
    assertMoney($withMakeup['netCollections'], 1500.0, 'makeup net collections');
    assertMoney($withMakeup['makeupReduction'], 200.0, 'makeup reduction');
    assertMoney($withMakeup['commissionableProfit'], 1260.0, 'makeup commissionable profit');
    assertMoney($withMakeup['agentSplit'], 630.0, 'makeup agent split');
    assertMoney($withMakeup['kickToHouse'], 630.0, 'makeup kick to house');
    assertMoney($withMakeup['houseProfit'], 670.0, 'makeup house profit');
    assertMoney($withMakeup['cumulativeMakeup'], 0.0, 'makeup cleared');
    assertMoney($withMakeup['balanceOwed'], 270.0, 'makeup balance owed');

    echo "5) Verifying negative-week settlement math...\n";
    $negative = AgentSettlementRules::summarize(200.0, -800.0, 4.0, 16.0, 50.0, 0.0, 500.0);
    assertMoney($negative['netCollections'], -600.0, 'negative net collections');
    assertMoney($negative['agentSplit'], 0.0, 'negative agent split');
    assertMoney($negative['kickToHouse'], 0.0, 'negative kick to house');
    assertMoney($negative['houseProfit'], 0.0, 'negative house profit');
    assertMoney($negative['weeklyMakeupAddition'], 620.0, 'negative makeup addition');
    assertMoney($negative['cumulativeMakeup'], 620.0, 'negative cumulative makeup');
    assertMoney($negative['balanceOwed'], 700.0, 'negative balance owed');

    echo "6) Verifying break-even week keeps fees in makeup...\n";
    $breakEven = AgentSettlementRules::summarize(500.0, -500.0, 8.0, 4.0, 50.0, 200.0, 100.0);
    assertMoney($breakEven['netCollections'], 0.0, 'break-even net');
    assertMoney($breakEven['makeupReduction'], 0.0, 'break-even makeup reduction');
    assertMoney($breakEven['commissionableProfit'], 0.0, 'break-even commissionable');
    assertMoney($breakEven['weeklyMakeupAddition'], 12.0, 'break-even makeup addition');
    assertMoney($breakEven['cumulativeMakeup'], 212.0, 'break-even cumulative makeup');
    assertMoney($breakEven['balanceOwed'], 600.0, 'break-even balance owed');

    echo "7) Verifying no-percent fallback...\n";
    $noPct = AgentSettlementRules::summarize(1000.0, 0.0, 0.0, 0.0, null, 300.0, 0.0);
    assertMoney($noPct['netCollections'], 1000.0, 'no-pct net');
    assertMoney($noPct['makeupReduction'], 300.0, 'no-pct makeup reduction');
    assertMoney($noPct['commissionableProfit'], 700.0, 'no-pct commissionable');
    assertMoney($noPct['agentSplit'], 700.0, 'no-pct agent split (full distributable)');
    assertMoney($noPct['kickToHouse'], 0.0, 'no-pct kick to house');
    assertMoney($noPct['houseProfit'], 0.0, 'no-pct house profit');
    assertMoney($noPct['cumulativeMakeup'], 0.0, 'no-pct makeup cleared');
    assertMoney($noPct['balanceOwed'], 0.0, 'no-pct balance owed');

    echo "\nAll settlement-rule checks passed.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Settlement-rule verification failed: " . $e->getMessage() . "\n");
    exit(1);
}
