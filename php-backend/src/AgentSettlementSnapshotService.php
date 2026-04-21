<?php

declare(strict_types=1);

/**
 * Shared lazy-close service for weekly agent settlements.
 *
 * The House dashboard reads agent rows from /api/admin/agent-cuts. Historically
 * snapshots were only ensured from the agent profile/header summary path, so
 * Balance Owed and Makeup changed only after clicking into each agent. This
 * service lets every dashboard row ensure the same previous-week snapshot first.
 */
final class AgentSettlementSnapshotService
{
    private const FEE_PER_PLAYER = 4.0;

    private SqlRepository $db;

    public function __construct(SqlRepository $db)
    {
        $this->db = $db;
    }

    /**
     * @param array<string, array<string, mixed>> $allAgents
     * @param array<string, string> $userIdToAgentId
     */
    public function ensurePreviousWeekSnapshotsForAgentRows(
        array $allAgents,
        array $userIdToAgentId,
        DateTimeImmutable $currentWeekStart
    ): void {
        $usernameToAgentId = [];
        $rowAgentIds = [];
        foreach ($allAgents as $agentId => $agent) {
            $username = strtoupper(trim((string) ($agent['username'] ?? '')));
            if ($username !== '') {
                $usernameToAgentId[$username] = $agentId;
            }
            if (strtolower(trim((string) ($agent['role'] ?? ''))) === 'agent') {
                $rowAgentIds[$agentId] = true;
            }
        }

        if ($rowAgentIds === []) {
            return;
        }

        $scopedUserIdsByAgent = [];
        foreach ($userIdToAgentId as $userId => $agentId) {
            if (!isset($rowAgentIds[$agentId]) || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                continue;
            }
            if (!isset($scopedUserIdsByAgent[$agentId])) {
                $scopedUserIdsByAgent[$agentId] = [];
            }
            $scopedUserIdsByAgent[$agentId][] = SqlRepository::id($userId);
        }

        $linkedApproverIdsByAgent = [];
        foreach (array_keys($rowAgentIds) as $agentId) {
            $linkedApproverIdsByAgent[$agentId] = [$agentId => true];
            $linkedName = AgentSettlementRules::linkedCounterpartUsername(
                (string) ($allAgents[$agentId]['username'] ?? ''),
                (string) ($allAgents[$agentId]['role'] ?? '')
            );
            $linkedId = $linkedName !== null ? ($usernameToAgentId[$linkedName] ?? '') : '';
            if ($linkedId !== '' && preg_match('/^[a-f0-9]{24}$/i', $linkedId) === 1) {
                $linkedApproverIdsByAgent[$agentId][$linkedId] = true;
            }
        }

        foreach (array_keys($rowAgentIds) as $agentId) {
            $this->ensurePreviousWeekSnapshot(
                $agentId,
                $allAgents[$agentId] ?? [],
                $currentWeekStart,
                $scopedUserIdsByAgent[$agentId] ?? [],
                $linkedApproverIdsByAgent[$agentId] ?? [$agentId => true]
            );
        }
    }

    /**
     * Ensure a settlement snapshot exists for the week BEFORE $currentWeekStart.
     *
     * @param array<string, mixed> $agentDoc
     * @param array<int, string> $scopedUserIds
     * @param array<string, bool> $linkedApproverIds
     */
    public function ensurePreviousWeekSnapshot(
        string $agentId,
        array $agentDoc,
        DateTimeImmutable $currentWeekStart,
        array $scopedUserIds,
        array $linkedApproverIds,
        bool $strictLinkedScope = true
    ): void {
        if ($agentId === '' || preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
            return;
        }

        $prevWeekStart = $currentWeekStart->modify('-7 days');
        $prevWeekEnd = $currentWeekStart;
        $prevWeekStartStr = $prevWeekStart->format('Y-m-d\TH:i:s\Z');

        $existing = $this->db->findOne('settlement_snapshots', [
            'agentId' => $agentId,
            'weekStartStr' => $prevWeekStartStr,
        ], [
            'projection' => [
                'id' => 1,
                'manuallyFinalized' => 1,
                'closingBalanceOwed' => 1,
                'closingMakeup' => 1,
                'agentCollections' => 1,
                'houseCollections' => 1,
                'paidPlayerFees' => 1,
            ],
        ]);

        if ($existing !== null && !empty($existing['manuallyFinalized'])) {
            return;
        }

        if ($existing !== null) {
            $hoursSinceWeekEnd = (time() - $currentWeekStart->getTimestamp()) / 3600;
            if ($hoursSinceWeekEnd > 48) {
                return;
            }
        }

        if (count($scopedUserIds) === 0) {
            if ($existing !== null && !$this->snapshotHasActivity($existing)) {
                $this->db->deleteOne('settlement_snapshots', ['id' => SqlRepository::id((string) ($existing['id'] ?? ''))]);
            }
            return;
        }

        $prevTx = $this->db->findMany('transactions', [
            'status' => 'completed',
            'createdAt' => [
                '$gte' => SqlRepository::utcFromMillis($prevWeekStart->getTimestamp() * 1000),
                '$lt' => SqlRepository::utcFromMillis($prevWeekEnd->getTimestamp() * 1000),
            ],
            'userId' => ['$in' => $scopedUserIds],
        ], [
            'projection' => [
                'userId' => 1,
                'amount' => 1,
                'type' => 1,
                'entrySide' => 1,
                'reason' => 1,
                'description' => 1,
                'balanceBefore' => 1,
                'balanceAfter' => 1,
                'approvedByRole' => 1,
                'adminId' => 1,
                'referenceType' => 1,
            ],
            'sort' => ['createdAt' => 1],
        ]);

        $missingRoleAdminIds = [];
        $activeUserNets = [];
        foreach ($prevTx as $tx) {
            $txType = strtolower(trim((string) ($tx['type'] ?? '')));
            $txUserId = (string) ($tx['userId'] ?? '');
            if (($txType === 'deposit' || $txType === 'withdrawal') && !$this->isAgentFundingTransaction($tx)) {
                $approverRole = trim((string) ($tx['approvedByRole'] ?? ''));
                if ($approverRole === '') {
                    $adminId = (string) ($tx['adminId'] ?? '');
                    if ($adminId !== '' && preg_match('/^[a-f0-9]{24}$/i', $adminId) === 1) {
                        $missingRoleAdminIds[$adminId] = true;
                    }
                }
            }
            if ($txUserId !== '' && $this->isWeeklyActiveTransaction($tx)) {
                $activeUserNets[$txUserId] = ($activeUserNets[$txUserId] ?? 0.0) + $this->getComprehensiveSignedTransactionAmount($tx);
            }
        }

        $activeUserIds = [];
        foreach ($activeUserNets as $userId => $net) {
            if (abs($net) > 0.001) {
                $activeUserIds[$userId] = true;
            }
        }

        $resolvedRoles = $this->resolveMissingApproverRoles(array_keys($missingRoleAdminIds));

        $agentDeposits = 0.0;
        $agentWithdrawals = 0.0;
        $houseDeposits = 0.0;
        $houseWithdrawals = 0.0;
        foreach ($prevTx as $tx) {
            $txType = strtolower(trim((string) ($tx['type'] ?? '')));
            if (($txType !== 'deposit' && $txType !== 'withdrawal') || $this->isAgentFundingTransaction($tx)) {
                continue;
            }

            $approverRole = strtolower(trim((string) ($tx['approvedByRole'] ?? '')));
            $adminId = (string) ($tx['adminId'] ?? '');
            if ($approverRole === '') {
                $approverRole = $resolvedRoles[$adminId] ?? '';
            }

            $amount = $this->num($tx['amount'] ?? 0);
            $bucket = AgentSettlementRules::classifyScopedApprover(
                $approverRole,
                $adminId,
                $linkedApproverIds,
                $strictLinkedScope
            );
            if ($bucket === 'agent') {
                if ($txType === 'deposit') {
                    $agentDeposits += $amount;
                } else {
                    $agentWithdrawals += $amount;
                }
            } else {
                if ($txType === 'deposit') {
                    $houseDeposits += $amount;
                } else {
                    $houseWithdrawals += $amount;
                }
            }
        }

        $usersForBalance = $this->db->findMany('users', [
            'id' => ['$in' => $scopedUserIds],
        ], [
            'projection' => ['id' => 1, 'balance' => 1],
        ]);

        $weekEndingBalanceMap = [];
        foreach ($prevTx as $tx) {
            $userId = (string) ($tx['userId'] ?? '');
            if ($userId === '' || !isset($activeUserIds[$userId]) || !array_key_exists('balanceAfter', $tx)) {
                continue;
            }
            $weekEndingBalanceMap[$userId] = $this->num($tx['balanceAfter']);
        }

        $userBalanceMap = [];
        foreach ($usersForBalance as $user) {
            $userId = (string) ($user['id'] ?? '');
            if ($userId !== '') {
                $userBalanceMap[$userId] = $weekEndingBalanceMap[$userId] ?? $this->num($user['balance'] ?? 0);
            }
        }

        $activePositive = 0;
        $activeNonPositive = 0;
        foreach ($activeUserIds as $userId => $flag) {
            $balance = $userBalanceMap[$userId] ?? 0.0;
            if ($balance > 0) {
                $activePositive++;
            } else {
                $activeNonPositive++;
            }
        }

        $paidPlayerFees = $activePositive * self::FEE_PER_PLAYER;
        $unpaidPlayerFees = $activeNonPositive * self::FEE_PER_PLAYER;
        $carryForward = $this->resolveSettlementCarryForward($agentId, $prevWeekStart);

        $agentPercent = isset($agentDoc['agentPercent']) ? (float) $agentDoc['agentPercent'] : null;
        $summary = AgentSettlementRules::summarize(
            $agentDeposits - $agentWithdrawals,
            $houseDeposits - $houseWithdrawals,
            $paidPlayerFees,
            $unpaidPlayerFees,
            $agentPercent,
            $carryForward['previousMakeup'],
            $carryForward['previousBalanceOwed']
        );
        $summary = $this->applySettlementBalanceAdjustments($summary, $agentId, $prevWeekStart);
        $fundingAdjustment = $this->getAgentFundingAdjustment($agentId, $prevWeekStart, $prevWeekEnd);
        $summary['fundingAdjustment'] = $fundingAdjustment;
        $summary['balanceOwed'] = round($this->num($summary['balanceOwed'] ?? 0) - $fundingAdjustment, 2);

        if ($existing !== null && $this->snapshotHasActivity($existing) && $this->summaryHasNoActivity($summary, $paidPlayerFees)) {
            return;
        }

        $now = SqlRepository::nowUtc();
        $this->db->updateOneUpsert('settlement_snapshots', [
            'agentId' => $agentId,
            'weekStartStr' => $prevWeekStartStr,
        ], [
            'closingMakeup' => $summary['cumulativeMakeup'],
            'closingBalanceOwed' => $summary['balanceOwed'],
            'agentCollections' => $summary['agentCollections'],
            'houseCollections' => $summary['houseCollections'],
            'netCollections' => $summary['netCollections'],
            'agentSplit' => $summary['agentSplit'],
            'kickToHouse' => $summary['kickToHouse'],
            'paidPlayerFees' => $paidPlayerFees,
            'unpaidPlayerFees' => $unpaidPlayerFees,
            'previousMakeup' => $carryForward['previousMakeup'],
            'previousBalanceOwed' => $carryForward['previousBalanceOwed'],
            'fundingAdjustment' => $fundingAdjustment,
            'computedBalanceOwed' => $summary['computedBalanceOwed'],
            'balanceAdjustment' => $summary['balanceAdjustment'],
            'updatedAt' => $now,
        ], [
            'agentId' => $agentId,
            'weekStartStr' => $prevWeekStartStr,
            'weekStart' => SqlRepository::utcFromMillis($prevWeekStart->getTimestamp() * 1000),
            'createdAt' => $now,
        ]);

        $autoCloseUpdates = [
            'settlementMakeup' => $summary['cumulativeMakeup'],
            'settlementBalanceOwed' => $summary['balanceOwed'],
            'settlementFinalizedAt' => $now,
            'updatedAt' => $now,
        ];
        $this->db->updateOne('agents', ['id' => SqlRepository::id($agentId)], $autoCloseUpdates);

        $linkedName = AgentSettlementRules::linkedCounterpartUsername(
            (string) ($agentDoc['username'] ?? ''),
            (string) ($agentDoc['role'] ?? '')
        );
        if ($linkedName !== null) {
            $this->db->updateMany('agents', ['username' => $linkedName], $autoCloseUpdates);
        }
    }

    /** @return array{previousMakeup: float, previousBalanceOwed: float} */
    private function resolveSettlementCarryForward(string $agentId, DateTimeImmutable $currentWeekStart): array
    {
        $snapshots = $this->db->findMany('settlement_snapshots', [
            'agentId' => $agentId,
            'weekStartStr' => ['$lt' => $currentWeekStart->format('Y-m-d\TH:i:s\Z')],
        ], [
            'sort' => ['weekStartStr' => -1],
            'limit' => 1,
            'projection' => ['closingMakeup' => 1, 'closingBalanceOwed' => 1],
        ]);

        if (count($snapshots) > 0) {
            return [
                'previousMakeup' => $this->num($snapshots[0]['closingMakeup'] ?? 0),
                'previousBalanceOwed' => $this->num($snapshots[0]['closingBalanceOwed'] ?? 0),
            ];
        }

        return [
            'previousMakeup' => 0.0,
            'previousBalanceOwed' => 0.0,
        ];
    }

    /** @return array<string, string> */
    private function resolveMissingApproverRoles(array $adminIds): array
    {
        $validIds = [];
        foreach ($adminIds as $adminId) {
            if (is_string($adminId) && preg_match('/^[a-f0-9]{24}$/i', $adminId) === 1) {
                $validIds[] = SqlRepository::id($adminId);
            }
        }
        if ($validIds === []) {
            return [];
        }

        $resolvedRoles = [];
        $foundAgents = $this->db->findMany('agents', ['id' => ['$in' => $validIds]], [
            'projection' => ['id' => 1, 'role' => 1],
        ]);
        foreach ($foundAgents as $agent) {
            $resolvedRoles[(string) ($agent['id'] ?? '')] = strtolower(trim((string) ($agent['role'] ?? 'agent')));
        }

        $foundAdmins = $this->db->findMany('admins', ['id' => ['$in' => $validIds]], [
            'projection' => ['id' => 1],
        ]);
        foreach ($foundAdmins as $admin) {
            $resolvedRoles[(string) ($admin['id'] ?? '')] = 'admin';
        }

        return $resolvedRoles;
    }

    /** @param array<string, mixed> $summary */
    private function applySettlementBalanceAdjustments(array $summary, string $agentId, DateTimeImmutable $weekStart): array
    {
        $computedBalanceOwed = $this->num($summary['balanceOwed'] ?? 0);
        $balanceAdjustment = $this->getSettlementBalanceAdjustmentTotal($agentId, $weekStart);
        $summary['computedBalanceOwed'] = $computedBalanceOwed;
        $summary['balanceAdjustment'] = $balanceAdjustment;
        $summary['balanceOwed'] = round($computedBalanceOwed + $balanceAdjustment, 2);

        return $summary;
    }

    private function getSettlementBalanceAdjustmentTotal(string $agentId, DateTimeImmutable $weekStart): float
    {
        if ($agentId === '' || preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
            return 0.0;
        }

        $rows = $this->db->findMany('settlement_adjustments', [
            'agentId' => $agentId,
            'weekStartStr' => $weekStart->format('Y-m-d\TH:i:s\Z'),
        ], [
            'projection' => ['amount' => 1],
        ]);

        $total = 0.0;
        foreach ($rows as $row) {
            $total += $this->num($row['amount'] ?? 0);
        }

        return round($total, 2);
    }

    private function getAgentFundingAdjustment(string $agentId, DateTimeImmutable $weekStart, ?DateTimeImmutable $weekEnd = null): float
    {
        if ($agentId === '' || preg_match('/^[a-f0-9]{24}$/i', $agentId) !== 1) {
            return 0.0;
        }

        $query = [
            'agentId' => SqlRepository::id($agentId),
            'referenceType' => 'AgentFunding',
            'status' => 'completed',
            'createdAt' => ['$gte' => SqlRepository::utcFromMillis($weekStart->getTimestamp() * 1000)],
        ];
        if ($weekEnd instanceof DateTimeImmutable) {
            $query['createdAt']['$lt'] = SqlRepository::utcFromMillis($weekEnd->getTimestamp() * 1000);
        }

        $rows = $this->db->findMany('transactions', $query, [
            'projection' => ['amount' => 1, 'type' => 1, 'entrySide' => 1],
        ]);

        $net = 0.0;
        foreach ($rows as $row) {
            $amount = $this->num($row['amount'] ?? 0);
            $type = strtolower(trim((string) ($row['type'] ?? '')));
            if ($type === 'deposit') {
                $net += $amount;
            } elseif ($type === 'withdrawal') {
                $net -= $amount;
            } else {
                $side = strtoupper(trim((string) ($row['entrySide'] ?? '')));
                if ($side === 'CREDIT') {
                    $net += $amount;
                } elseif ($side === 'DEBIT') {
                    $net -= $amount;
                }
            }
        }

        return round($net, 2);
    }

    private function snapshotHasActivity(array $snapshot): bool
    {
        return abs($this->num($snapshot['closingBalanceOwed'] ?? 0)) > 0.001
            || abs($this->num($snapshot['closingMakeup'] ?? 0)) > 0.001
            || abs($this->num($snapshot['agentCollections'] ?? 0)) > 0.001
            || abs($this->num($snapshot['houseCollections'] ?? 0)) > 0.001
            || $this->num($snapshot['paidPlayerFees'] ?? 0) > 0.001;
    }

    /** @param array<string, mixed> $summary */
    private function summaryHasNoActivity(array $summary, float $paidPlayerFees): bool
    {
        return abs($this->num($summary['balanceOwed'] ?? 0)) < 0.001
            && abs($this->num($summary['cumulativeMakeup'] ?? 0)) < 0.001
            && abs($this->num($summary['agentCollections'] ?? 0)) < 0.001
            && abs($this->num($summary['houseCollections'] ?? 0)) < 0.001
            && $paidPlayerFees < 0.001;
    }

    private function isAgentFundingTransaction(array $transaction): bool
    {
        return trim((string) ($transaction['referenceType'] ?? '')) === 'AgentFunding';
    }

    private function isPromotionalOrFreePlayTransaction(array $transaction): bool
    {
        $type = strtolower(trim((string) ($transaction['type'] ?? '')));
        if ($type === 'fp_deposit') {
            return true;
        }

        $reason = strtoupper(trim((string) ($transaction['reason'] ?? '')));
        if ($reason !== '' && (str_contains($reason, 'PROMOTIONAL') || str_contains($reason, 'FREEPLAY'))) {
            return true;
        }

        $description = strtolower(trim((string) ($transaction['description'] ?? '')));
        if ($description !== '' && (str_contains($description, 'promotional') || str_contains($description, 'freeplay') || str_contains($description, 'free play'))) {
            return true;
        }

        return false;
    }

    private function isWeeklyActiveTransaction(array $transaction): bool
    {
        $type = strtolower(trim((string) ($transaction['type'] ?? '')));
        if ($type === 'deposit' || $type === 'withdrawal') {
            return false;
        }

        if ($this->isPromotionalOrFreePlayTransaction($transaction)) {
            return false;
        }

        if ($type === 'adjustment') {
            $reason = strtoupper(trim((string) ($transaction['reason'] ?? '')));
            $explicitCreditDebitReasons = [
                'ADMIN_CREDIT_ADJUSTMENT',
                'ADMIN_DEBIT_ADJUSTMENT',
                'CASHIER_CREDIT_ADJUSTMENT',
                'CASHIER_DEBIT_ADJUSTMENT',
            ];
            if (in_array($reason, $explicitCreditDebitReasons, true)) {
                $beforeRaw = $transaction['balanceBefore'] ?? null;
                $afterRaw = $transaction['balanceAfter'] ?? null;
                if ($beforeRaw !== null && $afterRaw !== null && is_numeric($beforeRaw) && is_numeric($afterRaw)) {
                    return abs(((float) $afterRaw) - ((float) $beforeRaw)) > 0.00001;
                }
                return true;
            }
            if (str_contains($reason, 'ADMIN')) {
                return false;
            }
            $beforeRaw = $transaction['balanceBefore'] ?? null;
            $afterRaw = $transaction['balanceAfter'] ?? null;
            if ($beforeRaw !== null && $afterRaw !== null && is_numeric($beforeRaw) && is_numeric($afterRaw)) {
                return abs(((float) $afterRaw) - ((float) $beforeRaw)) > 0.00001;
            }
            return true;
        }

        return in_array($type, [
            'bet_placed',
            'bet_placed_admin',
            'bet_won',
            'bet_refund',
            'bet_lost',
            'casino_bet_debit',
            'casino_bet_credit',
            'credit_adj',
            'debit_adj',
            'credit',
            'debit',
        ], true);
    }

    private function getComprehensiveSignedTransactionAmount(array $transaction): float
    {
        $amount = $this->num($transaction['amount'] ?? 0);
        $entrySide = strtoupper(trim((string) ($transaction['entrySide'] ?? '')));
        if ($entrySide === 'DEBIT') {
            return -$amount;
        }
        if ($entrySide === 'CREDIT') {
            return $amount;
        }

        $type = strtolower(trim((string) ($transaction['type'] ?? '')));
        if ($type === 'adjustment') {
            $beforeRaw = $transaction['balanceBefore'] ?? null;
            $afterRaw = $transaction['balanceAfter'] ?? null;
            if ($beforeRaw !== null && $afterRaw !== null && is_numeric($beforeRaw) && is_numeric($afterRaw)) {
                return ((float) $afterRaw) - ((float) $beforeRaw);
            }
        }

        return match ($type) {
            'deposit', 'bet_won', 'bet_refund', 'casino_bet_credit', 'fp_deposit', 'credit', 'credit_adj', 'promotional_credit' => $amount,
            'withdrawal', 'bet_placed', 'bet_placed_admin', 'casino_bet_debit', 'bet_lost', 'debit', 'debit_adj', 'promotional_debit' => -$amount,
            default => 0.0,
        };
    }

    private function num(mixed $value): float
    {
        return is_numeric($value) ? (float) $value : 0.0;
    }
}
