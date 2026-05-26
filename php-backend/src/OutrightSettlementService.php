<?php

declare(strict_types=1);

/**
 * Settlement for outright (futures / championship-winner) bets.
 *
 * Why a separate service from BetSettlementService:
 *   BetSettlementService is keyed on `matchId` — it grades selections by reading
 *   the match's score / status. Outright bets have no matchId; the winner is
 *   determined externally (an admin marks the tournament). This service walks
 *   pending bets via `betselections.outrightId` and grades each leg by
 *   comparing `selection` to the admin-supplied `winningOutcome`.
 *
 * EXPECTED outright bet schema (read by this service; produced by the
 * placement code that the slip integration will add later):
 *
 *   bets row:
 *     - type: 'straight'           (parlays of outrights are deferred)
 *     - selections: [{ ... }]      (single leg for straight)
 *     - riskAmount, potentialPayout, acceptedPayout — same as match bets
 *     - isFreeplay, freeplayAmountUsed — same semantics as match bets
 *
 *   betselections row:
 *     - matchType: 'outrights'     (distinguishes from h2h/spreads/totals)
 *     - matchId: ''                (outright legs have no match)
 *     - outrightId: <outrights.id> (links back to the outrights row)
 *     - outrightEventId: <event_id> (upstream event id, for audits)
 *     - selection: 'Los Angeles Rams' (the outcome name picked)
 *     - acceptedPrice: 8.0         (decimal odds at placement)
 *     - status: 'pending'
 *
 * Money safety:
 *   - Idempotent: `WHERE status='pending'` guard + check-affected-rows means
 *     re-running settlement for the same outright is a no-op for already-
 *     settled bets.
 *   - Per-bet transaction with row lock on (users, bets) — the standard
 *     pattern from BetSettlementService::settleMatch.
 *   - pendingBalance is decremented exactly once per bet on first terminal
 *     transition.
 *   - Every balance change writes a `transactions` ledger row.
 */
final class OutrightSettlementService
{
    /**
     * Mark an outright as settled with a winning outcome and grade every
     * pending bet on it. Pure idempotent: calling twice with the same
     * winning outcome leaves already-graded bets alone.
     *
     * @return array{ok:bool, outrightId:string, total:int, won:int, lost:int, voided:int, errors:int, betIds:list<string>}
     */
    public static function settleOutright(SqlRepository $db, string $outrightId, string $winningOutcome, string $settledBy = 'system'): array
    {
        if ($outrightId === '' || preg_match('/^[a-f0-9]{24}$/i', $outrightId) !== 1) {
            throw new RuntimeException('Invalid outright id');
        }
        $winningOutcome = trim($winningOutcome);
        if ($winningOutcome === '') {
            throw new RuntimeException('Winning outcome required');
        }

        $outright = $db->findOne('outrights', ['id' => SqlRepository::id($outrightId)]);
        if ($outright === null) {
            throw new RuntimeException('Outright not found');
        }

        // Persist the winner on the outright row first so settlement is
        // recoverable if the per-bet pass dies halfway: a re-run reads the
        // same winningOutcome and continues from where it stopped.
        $now = SqlRepository::nowUtc();
        if (($outright['status'] ?? '') !== 'settled') {
            $db->updateOne('outrights', ['id' => SqlRepository::id($outrightId)], [
                'status' => 'settled',
                'winningOutcome' => $winningOutcome,
                'settledAt' => $now,
                'settledBy' => $settledBy,
                'updatedAt' => $now,
            ]);
        }

        return self::gradePendingBetsForOutright($db, $outrightId, $winningOutcome, /*void:*/ false, $settledBy);
    }

    /**
     * Void an outright (e.g. tournament canceled). Refunds the wager on every
     * pending bet and marks the outright row 'voided'.
     *
     * @return array{ok:bool, outrightId:string, total:int, won:int, lost:int, voided:int, errors:int, betIds:list<string>}
     */
    public static function voidOutright(SqlRepository $db, string $outrightId, string $reason = '', string $settledBy = 'system'): array
    {
        if ($outrightId === '' || preg_match('/^[a-f0-9]{24}$/i', $outrightId) !== 1) {
            throw new RuntimeException('Invalid outright id');
        }
        $outright = $db->findOne('outrights', ['id' => SqlRepository::id($outrightId)]);
        if ($outright === null) {
            throw new RuntimeException('Outright not found');
        }

        $now = SqlRepository::nowUtc();
        if (($outright['status'] ?? '') !== 'voided' && ($outright['status'] ?? '') !== 'settled') {
            $db->updateOne('outrights', ['id' => SqlRepository::id($outrightId)], [
                'status' => 'voided',
                'voidReason' => $reason !== '' ? $reason : 'admin_voided',
                'settledAt' => $now,
                'settledBy' => $settledBy,
                'updatedAt' => $now,
            ]);
        }

        return self::gradePendingBetsForOutright($db, $outrightId, /*winningOutcome:*/ '', /*void:*/ true, $settledBy);
    }

    /**
     * Walk pending betselections.outrightId = X, group by betId, settle each
     * unique bet. Only straight (single-leg) bets are supported in this first
     * version — parlays mixing outrights with match selections are deferred.
     *
     * @return array{ok:bool, outrightId:string, total:int, won:int, lost:int, voided:int, errors:int, betIds:list<string>}
     */
    private static function gradePendingBetsForOutright(
        SqlRepository $db,
        string $outrightId,
        string $winningOutcome,
        bool $void,
        string $settledBy
    ): array {
        $pendingSelections = $db->findMany(
            'betselections',
            ['outrightId' => $outrightId, 'status' => 'pending'],
            ['projection' => ['betId' => 1, 'selection' => 1]]
        );

        $betIds = [];
        foreach ($pendingSelections as $s) {
            $bid = (string) ($s['betId'] ?? '');
            if ($bid !== '' && preg_match('/^[a-f0-9]{24}$/i', $bid) === 1) {
                $betIds[$bid] = true;
            }
        }

        $results = [
            'ok' => true,
            'outrightId' => $outrightId,
            'total' => count($betIds),
            'won' => 0,
            'lost' => 0,
            'voided' => 0,
            'errors' => 0,
            'betIds' => array_keys($betIds),
        ];

        if ($betIds === []) {
            return $results;
        }

        foreach (array_keys($betIds) as $betId) {
            try {
                $db->beginTransaction();

                // Lock the bet first; if it's already terminal, skip.
                $bet = $db->findOneForUpdate('bets', ['id' => SqlRepository::id($betId)]);
                if ($bet === null || (string) ($bet['status'] ?? '') !== 'pending') {
                    $db->rollback();
                    continue;
                }

                // Defensive: only grade single-leg straight outright bets in
                // this first version. A parlay with a mix of match + outright
                // legs needs the parlay re-evaluation in BetSettlementService;
                // mark and skip rather than half-grade.
                $betType = strtolower((string) ($bet['type'] ?? 'straight'));
                if ($betType !== 'straight') {
                    $db->rollback();
                    $results['errors']++;
                    continue;
                }

                $userId = (string) ($bet['userId'] ?? '');
                if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                    $db->rollback();
                    $results['errors']++;
                    continue;
                }

                $user = $db->findOneForUpdate('users', ['id' => SqlRepository::id($userId)]);
                if ($user === null) {
                    $db->rollback();
                    $results['errors']++;
                    continue;
                }

                // Find this bet's leg(s) on the outright. Straight bets have
                // exactly one leg; we still iterate so a future schema with
                // optional metadata legs degrades gracefully.
                $legs = $db->findMany('betselections', [
                    'betId' => SqlRepository::id($betId),
                    'outrightId' => $outrightId,
                    'status' => 'pending',
                ]);
                if ($legs === []) {
                    $db->rollback();
                    continue;
                }

                $now = SqlRepository::nowUtc();
                $legStatus = 'pending';
                if ($void) {
                    $legStatus = 'void';
                } else {
                    $picked = strtolower(trim((string) ($legs[0]['selection'] ?? '')));
                    $winner = strtolower(trim($winningOutcome));
                    $legStatus = ($picked !== '' && $picked === $winner) ? 'won' : 'lost';
                }

                foreach ($legs as $leg) {
                    $legId = (string) ($leg['id'] ?? '');
                    if ($legId === '') continue;
                    $db->updateOne('betselections', ['id' => SqlRepository::id($legId)], [
                        'status' => $legStatus,
                        'updatedAt' => $now,
                        'settledAt' => $now,
                        'gradeReason' => $void ? 'outright_voided' : null,
                    ]);
                }

                // For straight bets, leg status === ticket status. Compute
                // payout based on the bet's accepted/potential payout (set at
                // placement). On wins we honor the placement-pinned payout
                // within $2 to avoid recompute drift, mirroring settleMatch.
                $riskAmount      = (float) round((float) ($bet['riskAmount'] ?? 0), 2);
                $potentialPayout = (float) round((float) ($bet['potentialPayout'] ?? 0));
                $acceptedPayout  = (float) round((float) ($bet['acceptedPayout'] ?? $potentialPayout));
                $ticketPayout    = (float) round($potentialPayout);
                if ($legStatus === 'won' && $acceptedPayout > 0 && abs($acceptedPayout - $ticketPayout) <= 2.0) {
                    $ticketPayout = $acceptedPayout;
                }

                $isFreeplay   = (bool) ($bet['isFreeplay'] ?? false);
                $freeplayUsed = (float) ($bet['freeplayAmountUsed'] ?? ($isFreeplay ? $riskAmount : 0));
                $freeplayUsed = max(0.0, min($freeplayUsed, $riskAmount));
                $realPortion  = (float) max(0.0, $riskAmount - $freeplayUsed);

                $balance         = (float) ($user['balance'] ?? 0);
                $pendingBalance  = (float) ($user['pendingBalance'] ?? 0);
                $freeplayBalance = (float) ($user['freeplayBalance'] ?? 0);
                $creditLimit     = (float) ($user['creditLimit'] ?? 0);
                $userRole        = strtolower((string) ($user['role'] ?? 'user'));
                $isCreditAccount = $realPortion > 0 && $userRole === 'user' && $creditLimit > 0;

                // pendingBalance only ever held the real portion at placement.
                $newPendingBalance = max(0.0, $pendingBalance - $realPortion);

                $userUpdate    = ['pendingBalance' => $newPendingBalance, 'updatedAt' => $now];
                $balanceBefore = $balance;
                $balanceAfter  = $balance;
                $transactionType = '';
                $transactionAmount = 0.0;
                $description = '';

                if ($legStatus === 'void') {
                    // Refund pools to source. Mirrors BetSettlementService.
                    $newFreeplayBalance = $freeplayBalance + $freeplayUsed;
                    $balanceRefund = $isCreditAccount ? 0.0 : $realPortion;
                    if ($freeplayUsed > 0) {
                        $userUpdate['freeplayBalance'] = (float) round($newFreeplayBalance);
                    }
                    if ($balanceRefund > 0) {
                        $userUpdate['balance'] = (float) round($balance + $balanceRefund);
                    }
                    $balanceBefore = $isFreeplay && $realPortion <= 0 ? $freeplayBalance : $balance;
                    $balanceAfter  = $isFreeplay && $realPortion <= 0
                        ? (float) round($newFreeplayBalance)
                        : (float) round($balance + $balanceRefund);
                    $transactionType   = $isFreeplay ? 'fp_bet_void' : 'bet_void';
                    $transactionAmount = $riskAmount;
                    $description = 'STRAIGHT' . ($isFreeplay ? ' freeplay' : '') . ' outright bet voided - wager refunded';
                    $results['voided']++;
                } elseif ($legStatus === 'won') {
                    $profit        = (float) round(max(0.0, $ticketPayout - $riskAmount));
                    $balanceCredit = (float) round(max(0.0, $ticketPayout - $freeplayUsed));
                    if ($isCreditAccount) {
                        $balanceCredit = (float) round(max(0.0, $balanceCredit - $realPortion));
                    }
                    $balanceBefore = $balance;
                    $balanceAfter  = (float) round($balance + $balanceCredit);
                    $userUpdate['balance'] = $balanceAfter;
                    $userUpdate['totalWinnings'] = (float) round((float) ($user['totalWinnings'] ?? 0) + $profit);
                    $transactionType   = $isFreeplay ? 'fp_bet_won' : 'bet_won';
                    $transactionAmount = $isFreeplay || $isCreditAccount ? $profit : $ticketPayout;
                    $description = 'STRAIGHT'
                        . ($isFreeplay ? ' freeplay' : '')
                        . ($isCreditAccount && !$isFreeplay
                            ? ' outright bet won - profit credited (credit account)'
                            : ' outright bet won - profit credited');
                    $results['won']++;
                } else { // lost
                    if ($isCreditAccount && $realPortion > 0) {
                        $balanceBefore = $balance;
                        $balanceAfter  = (float) round($balance - $realPortion);
                        $userUpdate['balance'] = $balanceAfter;
                        $description = 'STRAIGHT outright bet lost - balance debited (credit account)';
                    } else {
                        $description = 'STRAIGHT' . ($isFreeplay ? ' freeplay' : '') . ' outright bet lost';
                    }
                    $transactionType   = $isFreeplay ? 'fp_bet_lost' : 'bet_lost';
                    $transactionAmount = $riskAmount;
                    $results['lost']++;
                }

                $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                    'status'          => $legStatus,
                    'result'          => $legStatus,
                    'settledAt'       => $now,
                    'settledBy'       => $settledBy,
                    'acceptedPayout'  => $acceptedPayout > 0 ? $acceptedPayout : $ticketPayout,
                    'potentialPayout' => $ticketPayout,
                    'updatedAt'       => $now,
                ]);

                $db->updateOne('users', ['id' => SqlRepository::id($userId)], $userUpdate);

                $db->insertOne('transactions', [
                    'userId'        => SqlRepository::id($userId),
                    'amount'        => $transactionAmount,
                    'type'          => $transactionType,
                    'status'        => 'completed',
                    'isFreeplay'    => $isFreeplay,
                    'balanceBefore' => $balanceBefore,
                    'balanceAfter'  => $balanceAfter,
                    'referenceType' => 'Bet',
                    'referenceId'   => SqlRepository::id($betId),
                    'reason'        => strtoupper($transactionType),
                    'description'   => $description,
                    'createdAt'     => $now,
                    'updatedAt'     => $now,
                ]);

                $db->commit();

                // Invalidate APCu user cache so subsequent requests see
                // the updated balance immediately (not stale for 15s).
                if (function_exists('apcu_delete')) {
                    @apcu_delete('ua:users:' . $userId);
                }

                // Realtime push so the player's open My Bets list flips
                // pending → won/lost/void without a refresh. Fired AFTER
                // commit so a failed broadcast can never roll back the
                // money-touching write. class_exists guard mirrors the
                // pattern in the odds sync — settlement must keep working
                // in environments where the realtime module is absent.
                if (class_exists('RealtimeEventBus')) {
                    try {
                        RealtimeEventBus::publish('bet:settled', [
                            'userId' => $userId,
                            'betId' => $betId,
                            'status' => $legStatus,
                            'source' => 'outright',
                            'outrightId' => $outrightId,
                            'time' => $now,
                        ]);
                    } catch (Throwable $_) {
                        // Realtime is best-effort; the bet is already
                        // committed and the user will see the new status
                        // on the next polling tick.
                    }
                }
            } catch (Throwable $e) {
                try { $db->rollback(); } catch (Throwable) {}
                $results['errors']++;
                if (class_exists('Logger')) {
                    Logger::warning('outright_settlement_failed', [
                        'outrightId' => $outrightId,
                        'betId' => $betId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        return $results;
    }
}
