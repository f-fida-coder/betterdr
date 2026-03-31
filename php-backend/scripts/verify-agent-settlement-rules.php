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

    echo "3) Verifying positive-week settlement math...\n";
    $positive = AgentSettlementRules::summarize(7300.0, 7000.0, 4.0, 0.0, 95.0);
    assertMoney($positive['netCollections'], 14300.0, 'positive net collections');
    assertMoney($positive['agentShareFromProfit'], 13585.0, 'positive agent share');
    assertMoney($positive['houseShareFromProfit'], 715.0, 'positive house share');
    assertMoney($positive['agentProfitAfterFees'], 13581.0, 'positive agent profit after fees');
    assertMoney($positive['makeup'], 0.0, 'positive makeup');
    assertMoney($positive['houseFinalAmount'], 719.0, 'positive settlement balance');

    echo "4) Verifying negative-week settlement math...\n";
    $negative = AgentSettlementRules::summarize(1200.0, -2500.0, 4.0, 8.0, 95.0);
    assertMoney($negative['netCollections'], -1300.0, 'negative net collections');
    assertMoney($negative['makeup'], -1308.0, 'negative makeup includes unpaid fees');
    assertMoney($negative['houseFinalAmount'], 1200.0, 'negative balance uses positive agent collections');
    assertMoney($negative['agentProfitAfterFees'], 0.0, 'negative agent profit after fees');

    echo "5) Verifying negative week with no positive agent collections...\n";
    $noCarry = AgentSettlementRules::summarize(-300.0, -900.0, 0.0, 12.0, 95.0);
    assertMoney($noCarry['makeup'], -1212.0, 'negative makeup with no carry');
    assertMoney($noCarry['houseFinalAmount'], 0.0, 'no positive agent collections balance');

    echo "\nAll settlement-rule checks passed.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Settlement-rule verification failed: " . $e->getMessage() . "\n");
    exit(1);
}
