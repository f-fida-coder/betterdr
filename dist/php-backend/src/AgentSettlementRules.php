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
     *   4. Commission split (agent % / house %) on commissionable profit.
     *   5. Player fees deducted from agent's share AFTER the split:
     *      Agent Final = (commissionable × agent%) - playerFees
     *      House Final = (commissionable × house%) + playerFees
     *   6. If agent's share can't cover fees, uncovered fees → makeup.
     *   7. Balance Owed = previous + House Profit - House Collections
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

        // ── Step 1: Pay down makeup from positive net ─────────────────
        $makeupReduction = 0.0;
        $commissionableProfit = 0.0;

        if ($netCollections > 0.0 && $previousMakeup > 0.0) {
            $makeupReduction = round(min($netCollections, $previousMakeup), 2);
            $commissionableProfit = round(max(0.0, $netCollections - $makeupReduction), 2);
        } elseif ($netCollections > 0.0) {
            $commissionableProfit = round($netCollections, 2);
        }

        // ── Step 2: Split commissionable profit (agent% / house%) ─────
        $agentSplit = 0.0;
        $kickToHouse = 0.0;
        if ($commissionableProfit > 0.0 && $agentPercent !== null && $agentPercent >= 0 && $agentPercent <= 100) {
            $agentSplit = round($commissionableProfit * $agentPercent / 100, 2);
            $kickToHouse = round($commissionableProfit - $agentSplit, 2);
        } elseif ($commissionableProfit > 0.0) {
            $agentSplit = round($commissionableProfit, 2);
        }

        // ── Step 3: Deduct player fees from agent's share AFTER split ─
        $uncoveredFees = 0.0;
        if ($commissionableProfit > 0.0) {
            if ($agentSplit >= $totalPlayerFees) {
                // Agent's share covers all fees
                $agentSplit = round($agentSplit - $totalPlayerFees, 2);
            } elseif ($commissionableProfit >= $totalPlayerFees) {
                // Agent's share alone can't cover, but full profit can —
                // agent earns nothing, no makeup needed
                $agentSplit = 0.0;
            } else {
                // Even full profit can't cover fees — real deficit → makeup
                $uncoveredFees = round($totalPlayerFees - $commissionableProfit, 2);
                $agentSplit = 0.0;
            }
        }

        // ── Step 4: House Profit ──────────────────────────────────────
        // House gets everything agent doesn't
        $houseProfit = ($commissionableProfit > 0.0)
            ? round($commissionableProfit - $agentSplit, 2)
            : 0.0;

        // ── Step 5: Makeup (cumulative) ───────────────────────────────
        if ($netCollections <= 0.0) {
            // Negative week: full deficit + fees → makeup
            $weeklyMakeupAddition = round(abs($netCollections) + $totalPlayerFees, 2);
        } elseif ($commissionableProfit <= 0.0) {
            // Positive net but no commissionable profit — fees → makeup
            $weeklyMakeupAddition = $totalPlayerFees;
        } else {
            // In profit — only uncovered fees (if agent split couldn't cover) → makeup
            $weeklyMakeupAddition = $uncoveredFees;
        }
        $cumulativeMakeup = max(0.0, round(
            $previousMakeup - $makeupReduction + $weeklyMakeupAddition,
            2
        ));

        // ── Step 6: Balance Owed ──────────────────────────────────────
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
