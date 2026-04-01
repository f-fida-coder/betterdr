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

        // ── Step 1: Pay down makeup from positive net ─────────────────
        $makeupReduction = 0.0;
        $afterMakeup = 0.0;

        if ($netCollections > 0.0 && $previousMakeup > 0.0) {
            $makeupReduction = round(min($netCollections, $previousMakeup), 2);
            $afterMakeup = round(max(0.0, $netCollections - $makeupReduction), 2);
        } elseif ($netCollections > 0.0) {
            $afterMakeup = round($netCollections, 2);
        }

        // ── Step 2: Cover player fees BEFORE profit split ─────────────
        // Only what remains after fees is distributable profit
        $distributableProfit = round(max(0.0, $afterMakeup - $totalPlayerFees), 2);

        // ── Step 3: Commission split on distributable profit only ──────
        $agentSplit = 0.0;
        $kickToHouse = 0.0;
        if ($distributableProfit > 0.0 && $agentPercent !== null && $agentPercent >= 0 && $agentPercent <= 100) {
            $agentSplit = round($distributableProfit * $agentPercent / 100, 2);
            $kickToHouse = round($distributableProfit - $agentSplit, 2);
        } elseif ($distributableProfit > 0.0) {
            $agentSplit = round($distributableProfit, 2);
        }

        // ── Step 4: House Profit (only when distributable profit exists) ──
        $houseProfit = ($distributableProfit > 0.0)
            ? round($kickToHouse + $totalPlayerFees, 2)
            : 0.0;

        // ── Step 5: Makeup (cumulative) ───────────────────────────────
        if ($netCollections <= 0.0) {
            // Negative week: full deficit + fees → makeup
            $weeklyMakeupAddition = round(abs($netCollections) + $totalPlayerFees, 2);
        } elseif ($distributableProfit <= 0.0) {
            // Positive net but no distributable profit — uncovered fees → makeup
            $uncoveredFees = round(max(0.0, $totalPlayerFees - $afterMakeup), 2);
            $weeklyMakeupAddition = $uncoveredFees;
        } else {
            // In profit — fees fully covered, no makeup addition
            $weeklyMakeupAddition = 0.0;
        }
        $cumulativeMakeup = max(0.0, round(
            $previousMakeup - $makeupReduction + $weeklyMakeupAddition,
            2
        ));

        // ── Step 6: Balance Owed ──────────────────────────────────────
        // In profit: House Profit - House Collections (negative = house owes agent)
        // No profit: agent owes what they're holding (agent collections)
        if ($distributableProfit > 0.0) {
            $balanceOwed = round($previousBalanceOwed + $houseProfit - $houseCollections, 2);
        } else {
            $balanceOwed = round($previousBalanceOwed + $agentCollections, 2);
        }

        return [
            'agentCollections'     => $agentCollections,
            'houseCollections'     => $houseCollections,
            'netCollections'       => $netCollections,
            'commissionableProfit' => $distributableProfit,
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
