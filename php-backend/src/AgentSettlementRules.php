<?php

declare(strict_types=1);

final class AgentSettlementRules
{
    /**
     * Resolve the same-person counterpart username for an agent/master-agent pair.
     */
    public static function linkedCounterpartUsername(string $username, string $role): ?string
    {
        $normalizedUsername = strtoupper(trim($username));
        $normalizedRole = strtolower(trim($role));

        if ($normalizedUsername === '') {
            return null;
        }

        if (in_array($normalizedRole, ['master_agent', 'super_agent'], true) && str_ends_with($normalizedUsername, 'MA')) {
            return substr($normalizedUsername, 0, -2) ?: null;
        }

        if ($normalizedRole === 'agent') {
            return $normalizedUsername . 'MA';
        }

        return null;
    }

    /**
     * Bucket a scoped deposit/withdrawal approver as either the actor-side collection
     * or the house-side collection.
     */
    public static function classifyScopedApprover(
        ?string $approverRole,
        ?string $approverId,
        array $linkedApproverIds = [],
        bool $strictLinkedScope = false
    ): ?string {
        $normalizedRole = strtolower(trim((string) $approverRole));
        $normalizedId = trim((string) $approverId);

        if ($strictLinkedScope && $normalizedId !== '') {
            return isset($linkedApproverIds[$normalizedId]) ? 'agent' : 'admin';
        }

        if (in_array($normalizedRole, ['agent', 'master_agent', 'super_agent'], true)) {
            return 'agent';
        }

        if ($normalizedRole === 'admin') {
            return 'admin';
        }

        return null;
    }

    /**
     * @return array<string, float>
     */
    public static function summarize(
        float $agentCollections,
        float $houseCollections,
        float $paidPlayerFees,
        float $unpaidPlayerFees,
        ?float $agentPercent = null
    ): array {
        $netCollections = $agentCollections + $houseCollections;
        $commissionableProfit = max(0.0, $agentCollections);

        if ($agentPercent !== null && $agentPercent >= 0 && $agentPercent <= 100) {
            $agentShareFromProfit = round($netCollections * $agentPercent / 100, 2);
            $houseShareFromProfit = round($netCollections - $agentShareFromProfit, 2);
        } else {
            $agentShareFromProfit = $commissionableProfit;
            $houseShareFromProfit = 0.0;
        }

        $normalizedPaidFees = max(0.0, $paidPlayerFees);
        $normalizedUnpaidFees = max(0.0, $unpaidPlayerFees);
        $housePayback = 0.0;
        $remainingAfterHousePayback = $agentCollections;
        $makeup = $netCollections < 0.0
            ? round($netCollections - $normalizedUnpaidFees, 2)
            : 0.0;
        $agentProfitAfterFees = max(0.0, round($agentShareFromProfit - $normalizedPaidFees, 2));

        $positiveAgentCollections = max(0.0, $agentCollections);
        $houseFinalAmount = $netCollections >= 0.0
            ? round(max(0.0, $houseShareFromProfit) + $normalizedPaidFees, 2)
            : round($positiveAgentCollections, 2);
        $unpaidAmount = max(0.0, $houseFinalAmount);

        return [
            'agentCollections' => $agentCollections,
            'houseCollections' => $houseCollections,
            'netCollections' => $netCollections,
            'housePayback' => $housePayback,
            'remainingAfterHousePayback' => $remainingAfterHousePayback,
            'commissionableProfit' => $commissionableProfit,
            'houseShareFromProfit' => $houseShareFromProfit,
            'agentShareFromProfit' => $agentShareFromProfit,
            'houseFinalAmount' => $houseFinalAmount,
            'agentProfitAfterFees' => $agentProfitAfterFees,
            'makeup' => $makeup,
            'unpaidAmount' => $unpaidAmount,
        ];
    }
}
