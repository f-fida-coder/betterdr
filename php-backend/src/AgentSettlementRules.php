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
    ): string {
        $normalizedRole = strtolower(trim((string) $approverRole));
        $normalizedId = trim((string) $approverId);

        if ($strictLinkedScope && $normalizedId !== '') {
            return isset($linkedApproverIds[$normalizedId]) ? 'agent' : 'admin';
        }

        if (in_array($normalizedRole, ['agent', 'master_agent', 'super_agent'], true)) {
            return 'agent';
        }

        // Default to house for admin role, unknown role, or missing role.
        // Deposits/withdrawals with no identifiable agent approver are
        // treated as house-side (e.g. Stripe auto-deposits).
        return 'admin';
    }

    /**
     * Multi-week settlement with cumulative makeup and carry-forward.
     *
     * Settlement order (CRITICAL):
     *   1. Compute Net = Agent Collections - House Collections
     *   2. If positive week AND previousMakeup > 0:
     *        reduce makeup first, remainder becomes commissionable profit
     *   3. Commission split only applies to commissionable profit
     *   4. Negative-player fees ALWAYS go to makeup (never to balance)
     *   5. Weekly House Balance = kick + paid fees (this week only)
     *   6. Balance Owed = previous + houseCollections + weeklyHouseBalance
     *
     * @return array<string, float>
     */
    public static function summarize(
        float $agentCollections,
        float $houseCollections,
        float $paidPlayerFees,
        float $unpaidPlayerFees,
        ?float $agentPercent = null,
        float $previousMakeup = 0.0,
        float $previousBalanceOwed = 0.0
    ): array {
        $netCollections = $agentCollections - $houseCollections;
        $isPositiveWeek = $netCollections > 0.0;

        $normalizedPaidFees = max(0.0, $paidPlayerFees);
        $normalizedUnpaidFees = max(0.0, $unpaidPlayerFees);
        $previousMakeup = max(0.0, $previousMakeup);

        // ── Settlement order ───────────────────────────────────────────
        // Step 1: In a positive week, reduce makeup before distributing
        $makeupReduction = 0.0;
        $commissionableProfit = 0.0;

        if ($isPositiveWeek) {
            if ($previousMakeup > 0.0) {
                // Use net to pay down makeup first
                $makeupReduction = round(min($netCollections, $previousMakeup), 2);
                $commissionableProfit = round(max(0.0, $netCollections - $makeupReduction), 2);
            } else {
                $commissionableProfit = round($netCollections, 2);
            }
        }

        // Step 2: Commission split ONLY on profit remaining after makeup
        if ($commissionableProfit > 0.0 && $agentPercent !== null && $agentPercent >= 0 && $agentPercent <= 100) {
            $agentSplit = round($commissionableProfit * $agentPercent / 100, 2);
            $kickToHouse = round($commissionableProfit - $agentSplit, 2);
        } elseif ($commissionableProfit > 0.0) {
            $agentSplit = round($commissionableProfit, 2);
            $kickToHouse = 0.0;
        } else {
            $agentSplit = 0.0;
            $kickToHouse = 0.0;
        }

        // Step 3: Agent profit after paid player fees
        $agentProfitAfterFees = round($agentSplit - $normalizedPaidFees, 2);

        // ── Weekly House Balance (THIS WEEK ONLY) ──────────────────────
        // kick + paid player fees; does NOT include previous balance or makeup
        $weeklyHouseBalance = ($commissionableProfit > 0.0)
            ? round($kickToHouse + $normalizedPaidFees, 2)
            : 0.0;

        // ── Makeup (cumulative) ────────────────────────────────────────
        // Negative-player fees ALWAYS add to makeup (positive or negative week)
        // Negative net adds the deficit; positive net reduces via makeupReduction
        $weeklyMakeupAddition = round(max(0.0, -$netCollections) + $normalizedUnpaidFees, 2);
        $cumulativeMakeup = max(0.0, round(
            $previousMakeup - $makeupReduction + $weeklyMakeupAddition,
            2
        ));

        // ── Balance Owed (cumulative) ──────────────────────────────────
        // Running total: previous + house collections this week + weekly settlement
        // paymentsMade defaults to 0 (tracked separately when payment feature exists)
        $balanceOwed = round($previousBalanceOwed + $houseCollections + $weeklyHouseBalance, 2);

        return [
            'agentCollections'     => $agentCollections,
            'houseCollections'     => $houseCollections,
            'netCollections'       => $netCollections,
            'commissionableProfit' => $commissionableProfit,
            'agentSplit'           => $agentSplit,
            'kickToHouse'          => $kickToHouse,
            'agentProfitAfterFees' => $agentProfitAfterFees,
            'weeklyHouseBalance'   => $weeklyHouseBalance,
            'previousMakeup'       => $previousMakeup,
            'makeupReduction'      => $makeupReduction,
            'weeklyMakeupAddition' => $weeklyMakeupAddition,
            'cumulativeMakeup'     => $cumulativeMakeup,
            'previousBalanceOwed'  => $previousBalanceOwed,
            'balanceOwed'          => $balanceOwed,
        ];
    }
}
