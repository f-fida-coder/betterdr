<?php

declare(strict_types=1);

/**
 * Bet-approval-queue actions: list / approve / reject bets sitting in
 * status='pending_approval' (Chunk 2 producer). The stake is already HELD in
 * pendingBalance at submit — approve just releases the ticket live at its
 * FROZEN submit-time odds (no re-price); reject reverses the exact hold via
 * BetVoidRefund and marks the ticket 'rejected' (never went live).
 *
 * Scoping mirrors AdminCoreController::canActorDeleteUserTransaction:
 *   admin → any; agent/master/super → owner.agentId within their downline
 *   (listManagedAgentIds — the SAME resolver the agent-scoped views use).
 */
final class BetApprovalService
{
    /** Reserved actor id for system-initiated (timeout-sweep) rejects. A real
     *  auth token can NEVER yield this: protectRoles() gates actor.id to a
     *  24-hex string, and 'system' is not 24-hex. */
    private const SYSTEM_ACTOR_ID = 'system';

    private static function systemActor(): array
    {
        return ['id' => self::SYSTEM_ACTOR_ID, 'role' => 'system', 'username' => 'timeout-sweep'];
    }

    /** Approve: release a held ticket live at its already-frozen submit odds. */
    public static function approve(SqlRepository $db, string $betId, array $actor): array
    {
        if ($betId === '' || preg_match('/^[a-f0-9]{24}$/i', $betId) !== 1) {
            return ['ok' => false, 'error' => 'invalid_bet_id', 'status' => 400];
        }
        $db->beginTransaction();
        try {
            $bet = $db->findOneForUpdate('bets', ['id' => SqlRepository::id($betId)]);
            if ($bet === null) { $db->rollback(); return ['ok' => false, 'error' => 'bet_not_found', 'status' => 404]; }
            if ((string) ($bet['status'] ?? '') !== SportsbookBetSupport::STATUS_PENDING_APPROVAL) {
                $db->rollback();
                // Idempotent: already approved / rejected / expired. Guards
                // double-approve and the approve-vs-timeout-sweep race.
                return ['ok' => false, 'error' => 'not_pending_approval', 'status' => 409, 'currentStatus' => (string) ($bet['status'] ?? '')];
            }
            $deny = self::scopeDenial($db, $actor, $bet);
            if ($deny !== null) { $db->rollback(); return $deny; }

            $now = SqlRepository::nowUtc();
            // INVARIANT — DO NOT CHANGE (test-locked by BetApprovalOddsTest):
            // approve books the FROZEN submit-time odds already stored on the
            // bet. It takes no odds input and must never read/apply current
            // odds. The inbox's live delta (quoteStoredBetCurrentOdds) is
            // ADVISORY DISPLAY ONLY. Wiring approve to book current odds would
            // silently re-price a ticket the player already agreed to — a
            // money-integrity break. Only status flips here; legs are already
            // 'pending' so the next sweep grades at the frozen odds.
            $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                'status'         => 'pending',
                'approvedBy'     => (string) ($actor['id'] ?? ''),
                'approvedByRole' => (string) ($actor['role'] ?? ''),
                'approvedAt'     => $now,
                'updatedAt'      => $now,
            ]);
            $db->commit();
        } catch (Throwable $e) {
            try { $db->rollback(); } catch (Throwable) {}
            throw $e;
        }
        self::postCommit($db, (string) ($bet['userId'] ?? ''), $betId, 'pending');
        self::audit($db, $actor, 'bet_approval_approve', $betId, (string) ($bet['userId'] ?? ''), null);
        return ['ok' => true, 'betId' => $betId, 'status' => 'pending'];
    }

    /** Reject: reverse the exact submit-time hold and mark the ticket rejected. */
    public static function reject(SqlRepository $db, string $betId, array $actor, string $reason = '', string $auditAction = 'bet_approval_reject'): array
    {
        if ($betId === '' || preg_match('/^[a-f0-9]{24}$/i', $betId) !== 1) {
            return ['ok' => false, 'error' => 'invalid_bet_id', 'status' => 400];
        }
        $db->beginTransaction();
        try {
            $bet = $db->findOneForUpdate('bets', ['id' => SqlRepository::id($betId)]);
            if ($bet === null) { $db->rollback(); return ['ok' => false, 'error' => 'bet_not_found', 'status' => 404]; }
            if ((string) ($bet['status'] ?? '') !== SportsbookBetSupport::STATUS_PENDING_APPROVAL) {
                $db->rollback();
                return ['ok' => false, 'error' => 'not_pending_approval', 'status' => 409, 'currentStatus' => (string) ($bet['status'] ?? '')];
            }
            $deny = self::scopeDenial($db, $actor, $bet);
            if ($deny !== null) { $db->rollback(); return $deny; }

            $userId = (string) ($bet['userId'] ?? '');
            if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                $db->rollback(); return ['ok' => false, 'error' => 'invalid_user', 'status' => 400];
            }
            $owner = $db->findOneForUpdate('users', ['id' => SqlRepository::id($userId)]);
            if ($owner === null) { $db->rollback(); return ['ok' => false, 'error' => 'user_not_found', 'status' => 404]; }

            $now = SqlRepository::nowUtc();
            // Same pure math the void path uses → can't drift from placement:
            // FP slice back to freeplayBalance, cash slice back to balance +
            // released from pendingBalance.
            $r = BetVoidRefund::compute($bet, $owner);
            $userUpdate = $r['userUpdate'];
            $userUpdate['updatedAt'] = $now;
            $db->updateOne('users', ['id' => SqlRepository::id($userId)], $userUpdate);

            $isFp = (bool) $r['isFreeplay']; // pure-freeplay discriminator
            $db->insertOne('transactions', [
                'userId'             => SqlRepository::id($userId),
                'amount'             => $r['stake'],
                'type'               => $isFp ? 'fp_bet_approval_rejected' : 'bet_approval_rejected',
                'status'             => 'completed',
                'isFreeplay'         => $isFp,
                'freeplayAmountUsed' => $r['freeplayUsed'],
                'balanceBefore'      => $isFp ? $r['freeplayBefore'] : $r['balanceBefore'],
                'balanceAfter'       => $isFp ? $r['freeplayAfter']  : $r['balanceAfter'],
                'referenceType'      => 'Bet',
                'referenceId'        => SqlRepository::id($betId),
                'reason'             => $isFp ? 'FP_BET_APPROVAL_REJECTED' : 'BET_APPROVAL_REJECTED',
                'description'        => 'Bet rejected in approval queue — stake refunded'
                    . ($reason !== '' ? ' (' . $reason . ')' : ''),
                'createdAt'          => $now,
                'updatedAt'          => $now,
            ]);
            // Mark the ticket + its legs rejected so settlement never revisits
            // them (parent-status guard already skips, but this keeps legs from
            // lingering as 'pending' forever).
            $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                'status'         => SportsbookBetSupport::STATUS_REJECTED,
                'rejectedReason' => $reason !== '' ? $reason : null,
                'rejectedBy'     => (string) ($actor['id'] ?? ''),
                'rejectedByRole' => (string) ($actor['role'] ?? ''),
                'rejectedAt'     => $now,
                'updatedAt'      => $now,
            ]);
            $db->updateMany('betselections', ['betId' => SqlRepository::id($betId)], [
                'status'    => SportsbookBetSupport::STATUS_REJECTED,
                'updatedAt' => $now,
            ]);
            $db->commit();
        } catch (Throwable $e) {
            try { $db->rollback(); } catch (Throwable) {}
            throw $e;
        }
        self::postCommit($db, (string) ($bet['userId'] ?? ''), $betId, 'rejected');
        self::audit($db, $actor, $auditAction, $betId, (string) ($bet['userId'] ?? ''), $reason);
        return ['ok' => true, 'betId' => $betId, 'status' => 'rejected'];
    }

    /**
     * Scoped pending-approval queue for this actor. $priceCurrent, when given,
     * is an injected READ-ONLY repricer (BetsController::quoteStoredBetCurrentOdds)
     * that attaches an advisory live-odds delta per bet — NEVER the price a bet
     * books at (approve() releases the frozen submit odds).
     */
    public static function listPendingApprovals(SqlRepository $db, array $actor, ?callable $priceCurrent = null): array
    {
        $criteria = ['status' => SportsbookBetSupport::STATUS_PENDING_APPROVAL];
        if (strtolower((string) ($actor['role'] ?? '')) !== 'admin') {
            $managed = self::listManagedAgentIds($db, (string) ($actor['id'] ?? ''));
            if (count($managed) === 0) return ['bets' => [], 'betCount' => 0];
            $managedObj = array_map(static fn (string $id): string => SqlRepository::id($id), $managed);
            $owners = $db->findMany('users', ['agentId' => ['$in' => $managedObj]], ['projection' => ['id' => 1]]);
            $ownerIds = [];
            foreach (is_array($owners) ? $owners : [] as $u) {
                $uid = (string) ($u['id'] ?? '');
                if ($uid !== '') $ownerIds[] = SqlRepository::id($uid);
            }
            if (count($ownerIds) === 0) return ['bets' => [], 'betCount' => 0];
            $criteria['userId'] = ['$in' => $ownerIds];
        }
        $bets = $db->findMany('bets', $criteria, ['sort' => ['createdAt' => 1], 'limit' => 500]);
        $out = [];
        $nameCache = [];
        foreach (is_array($bets) ? $bets : [] as $bet) {
            if (!is_array($bet)) continue;
            $uid = (string) ($bet['userId'] ?? '');
            if ($uid !== '' && !array_key_exists($uid, $nameCache)) {
                $u = $db->findOne('users', ['id' => SqlRepository::id($uid)], ['projection' => ['username' => 1]]);
                $nameCache[$uid] = (string) ($u['username'] ?? '');
            }
            $out[] = [
                'betId'             => (string) ($bet['id'] ?? ''),
                'userId'            => $uid,
                'username'          => $nameCache[$uid] ?? '',
                'type'              => (string) ($bet['type'] ?? 'straight'),
                'stake'             => (float) round((float) ($bet['riskAmount'] ?? $bet['amount'] ?? 0), 2),
                'potentialPayout'   => (float) round((float) ($bet['potentialPayout'] ?? 0), 2),
                'combinedOdds'      => (float) ($bet['combinedOdds'] ?? $bet['odds'] ?? 0),
                'selection'         => (string) ($bet['selection'] ?? ''),
                'description'       => (string) ($bet['description'] ?? ''),
                'selections'        => is_array($bet['selections'] ?? null) ? $bet['selections'] : [],
                'isFreeplay'        => (bool) ($bet['isFreeplay'] ?? false),
                'approvalReason'    => (string) ($bet['approvalReason'] ?? ''),
                'approvalThreshold' => $bet['approvalThreshold'] ?? null,
                'submittedAt'       => (string) ($bet['approvalRequestedAt'] ?? $bet['createdAt'] ?? ''),
            ];
            // Advisory-only live odds delta (injected read-only repricer). NEVER
            // the price this bet books at — approve() releases the frozen odds.
            if ($priceCurrent !== null) {
                try { $out[count($out) - 1]['current'] = $priceCurrent($bet); }
                catch (Throwable) { $out[count($out) - 1]['current'] = null; }
            }
        }
        return ['bets' => $out, 'betCount' => count($out)];
    }

    /** null = allowed; otherwise a 403 result array. Mirrors canActorDeleteUserTransaction. */
    private static function scopeDenial(SqlRepository $db, array $actor, array $bet): ?array
    {
        // System-initiated (timeout sweep) — allowed before any DB/owner lookup.
        // Unreachable from HTTP: no token can produce actor.id === 'system'
        // (protectRoles gates actor.id to a 24-hex string).
        if (($actor['id'] ?? '') === self::SYSTEM_ACTOR_ID) return null;
        if (strtolower((string) ($actor['role'] ?? '')) === 'admin') return null;
        $owner = $db->findOne('users', ['id' => SqlRepository::id((string) ($bet['userId'] ?? ''))], ['projection' => ['agentId' => 1]]);
        $ownerAgentId = trim((string) ($owner['agentId'] ?? ''));
        if ($ownerAgentId === '' || preg_match('/^[a-f0-9]{24}$/i', $ownerAgentId) !== 1) {
            return ['ok' => false, 'error' => 'forbidden', 'status' => 403];
        }
        $managed = array_flip(self::listManagedAgentIds($db, (string) ($actor['id'] ?? '')));
        return isset($managed[$ownerAgentId]) ? null : ['ok' => false, 'error' => 'forbidden', 'status' => 403];
    }

    /**
     * Downline agent-id set (self + all descendants). Byte-identical BFS to
     * AdminCoreController::listManagedAgentIds / AgentController::listManagedAgentIds
     * — keep in sync; do NOT loosen.
     */
    private static function listManagedAgentIds(SqlRepository $db, string $rootAgentId): array
    {
        if ($rootAgentId === '' || preg_match('/^[a-f0-9]{24}$/i', $rootAgentId) !== 1) return [];
        $seen = [];
        $queue = [$rootAgentId];
        while (count($queue) > 0) {
            $currentId = array_shift($queue);
            if (!is_string($currentId) || $currentId === '' || isset($seen[$currentId])) continue;
            $seen[$currentId] = true;
            $children = $db->findMany('agents', ['createdBy' => SqlRepository::id($currentId), 'createdByModel' => 'Agent'], ['projection' => ['id' => 1]]);
            foreach (is_array($children) ? $children : [] as $child) {
                $childId = (string) ($child['id'] ?? '');
                if ($childId !== '' && !isset($seen[$childId])) $queue[] = $childId;
            }
        }
        return array_keys($seen);
    }

    /** A ticket is "futures" if ANY leg is an outright (mixed parlay counts). */
    public static function isFuturesBet(array $bet): bool
    {
        if (($bet['marketType'] ?? '') === 'outrights' || !empty($bet['isOutright'])) return true;
        foreach ((is_array($bet['selections'] ?? null) ? $bet['selections'] : []) as $sel) {
            if (is_array($sel) && (($sel['marketType'] ?? '') === 'outrights' || !empty($sel['isOutright']))) return true;
        }
        return false;
    }

    /** Applicable timeout window (minutes) for this ticket; 0 = disabled. Any
     *  futures leg → the LONGER futures window (a mixed ticket must not expire
     *  on the live clock while a futures leg is still under review). */
    public static function timeoutWindowMinutes(array $bet, int $liveMin, int $futuresMin): int
    {
        return self::isFuturesBet($bet) ? max(0, $futuresMin) : max(0, $liveMin);
    }

    /** Pure cutoff check — true only when the hold is past its window. */
    public static function isExpired(array $bet, int $nowTs, int $liveMin, int $futuresMin): bool
    {
        $window = self::timeoutWindowMinutes($bet, $liveMin, $futuresMin);
        if ($window <= 0) return false;
        $createdTs = strtotime((string) ($bet['createdAt'] ?? ($bet['approvalRequestedAt'] ?? '')));
        if ($createdTs === false || $createdTs <= 0) return false;
        return $createdTs <= $nowTs - $window * 60;
    }

    /**
     * Auto-reject holds past their timeout. Reuses the SINGLE reject() path so
     * the refund is byte-identical to an admin reject (BetVoidRefund), with a
     * distinct audit action ('bet_approval_timeout') + reason ('timeout').
     * Idempotent/race-safe by construction: reject() row-locks and re-checks
     * status='pending_approval', so an admin action in the gap wins and the
     * sweep no-ops (409). Returns the count expired.
     */
    public static function sweepExpired(SqlRepository $db, int $liveMin, int $futuresMin, int $limit = 200): int
    {
        if ($liveMin <= 0 && $futuresMin <= 0) return 0; // both windows disabled
        $candidates = $db->findMany('bets', ['status' => SportsbookBetSupport::STATUS_PENDING_APPROVAL], ['limit' => max(1, $limit), 'sort' => ['createdAt' => 1]]);
        $nowTs = time();
        $expired = 0;
        foreach (is_array($candidates) ? $candidates : [] as $bet) {
            if (!is_array($bet) || !self::isExpired($bet, $nowTs, $liveMin, $futuresMin)) continue;
            $betId = (string) ($bet['id'] ?? '');
            if ($betId === '' || preg_match('/^[a-f0-9]{24}$/i', $betId) !== 1) continue;
            try {
                $res = self::reject($db, $betId, self::systemActor(), 'timeout', 'bet_approval_timeout');
                if (!empty($res['ok'])) $expired++;
                // 409 not_pending_approval = admin/another sweep beat us — benign.
            } catch (Throwable $e) {
                Logger::warning('bet-approval timeout reject failed', ['betId' => $betId, 'error' => $e->getMessage()], 'sportsbook');
            }
        }
        return $expired;
    }

    /** Post-commit best-effort: cache purge + realtime nudge. Never rolls back money. */
    private static function postCommit(SqlRepository $db, string $userId, string $betId, string $status): void
    {
        if ($userId === '') return;
        try { QueryCache::getInstance()->forgetPattern('bets:' . $userId . ':*'); } catch (Throwable) {}
        if (function_exists('apcu_delete')) { @apcu_delete('ua:users:' . $userId); }
        if (class_exists('RealtimeEventBus')) {
            try {
                RealtimeEventBus::publish('bet:approval', [
                    'userId' => $userId, 'betId' => $betId, 'status' => $status,
                    'source' => 'bet_approval', 'time' => SqlRepository::nowUtc(),
                ]);
            } catch (Throwable) {}
        }
    }

    private static function audit(SqlRepository $db, array $actor, string $action, string $betId, string $ownerId, ?string $reason): void
    {
        try {
            $db->insertOne('admin_audit_log', [
                'action'        => $action,
                'actorId'       => (string) ($actor['id'] ?? ''),
                'actorUsername' => (string) ($actor['username'] ?? ''),
                'actorRole'     => (string) ($actor['role'] ?? ''),
                'targetId'      => $betId,
                'market'        => 'bet_approval',
                'oldValue'      => ['ownerId' => $ownerId],
                'newValue'      => ['reason' => $reason],
                'ip'            => IpUtils::clientIp(),
                'timestamp'     => time(),
                'createdAt'     => SqlRepository::nowUtc(),
            ]);
        } catch (Throwable) { /* audit best-effort */ }
    }
}
