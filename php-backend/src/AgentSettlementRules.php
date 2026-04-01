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
     * Settlement order:
     *   1. Net = Agent Collections + House Collections
     *   2. If negative net: entire deficit + player fees → makeup. No profit for anyone.
     *   3. If positive net but makeup exists: pay down makeup first.
     *      Only remainder after makeup is fully cleared becomes commissionable.
     *   4. Commission split (agent % / house %) only on commissionable profit.
     *   5. House Profit = Kick to House + Player Fees (only when commissionable > 0)
     *   6. Balance Owed = previous + House Profit - House Collections
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
        $netCollections = $agentCollections + $houseCollections;
        $totalPlayerFees = max(0.0, $paidPlayerFees) + max(0.0, $unpaidPlayerFees);
        $previousMakeup = max(0.0, $previousMakeup);

        // ── Step 1: Pay down makeup before anything else ──────────────
        $makeupReduction = 0.0;
        $commissionableProfit = 0.0;

        if ($netCollections > 0.0 && $previousMakeup > 0.0) {
            $makeupReduction = round(min($netCollections, $previousMakeup), 2);
            $commissionableProfit = round(max(0.0, $netCollections - $makeupReduction), 2);
        } elseif ($netCollections > 0.0) {
            $commissionableProfit = round($netCollections, 2);
        }
        // If net <= 0: commissionableProfit stays 0, no split for anyone

        // ── Step 2: Commission split ONLY on commissionable profit ────
        $agentSplit = 0.0;
        $kickToHouse = 0.0;
        if ($commissionableProfit > 0.0 && $agentPercent !== null && $agentPercent >= 0 && $agentPercent <= 100) {
            $agentSplit = round($commissionableProfit * $agentPercent / 100, 2);
            $kickToHouse = round($commissionableProfit - $agentSplit, 2);
        } elseif ($commissionableProfit > 0.0) {
            $agentSplit = round($commissionableProfit, 2);
        }

        // ── Step 3: House Profit (only when there is commissionable profit) ──
        // If makeup not cleared → house profit = 0 (no one profits yet)
        $houseProfit = ($commissionableProfit > 0.0)
            ? round($kickToHouse + $totalPlayerFees, 2)
            : 0.0;

        // ── Step 4: Makeup (cumulative) ───────────────────────────────
        // Negative week: deficit + player fees → makeup
        // Positive week but still in makeup: player fees → makeup
        // Positive week, no makeup: no addition
        if ($netCollections <= 0.0) {
            $weeklyMakeupAddition = round(abs($netCollections) + $totalPlayerFees, 2);
        } elseif ($commissionableProfit <= 0.0) {
            // Positive net but fully absorbed by makeup — fees go to makeup
            $weeklyMakeupAddition = round($totalPlayerFees, 2);
        } else {
            $weeklyMakeupAddition = 0.0;
        }
        $cumulativeMakeup = max(0.0, round(
            $previousMakeup - $makeupReduction + $weeklyMakeupAddition,
            2
        ));

        // ── Step 5: Balance Owed ──────────────────────────────────────
        // When no profit (makeup active): agent owes what they're holding = agent collections
        // When profit: House Profit - House Collections
        if ($commissionableProfit > 0.0) {
            $balanceOwed = round($previousBalanceOwed + $houseProfit - $houseCollections, 2);
        } else {
            $balanceOwed = round($previousBalanceOwed + $agentCollections, 2);
        }

        return [
            'agentCollections'     => $agentCollections,
            'houseCollections'     => $houseCollections,
            'netCollections'       => $netCollections,
            'commissionableProfit' => $commissionableProfit,
            'agentSplit'           => $agentSplit,
            'kickToHouse'          => $kickToHouse,
            'houseProfit'          => $houseProfit,
            'previousMakeup'       => $previousMakeup,
            'makeupReduction'      => $makeupReduction,
            'weeklyMakeupAddition' => $weeklyMakeupAddition,
            'cumulativeMakeup'     => $cumulativeMakeup,
            'previousBalanceOwed'  => $previousBalanceOwed,
            'balanceOwed'          => $balanceOwed,
        ];
    }
}
