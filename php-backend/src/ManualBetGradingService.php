<?php

declare(strict_types=1);

/**
 * Manual grading for MANUAL/WRITE-IN bets (type='manual') — the Manual Bets
 * admin inbox. Sibling of CardBetGradingService with the fence swapped from
 * "leg marketType ends '_cards'" to "type='manual' + leg marketType='manual'".
 *
 * WHY MANUAL, PERMANENTLY: a write-in bet has no matchId and no feed market —
 * the settlement sweep can never select it (matchId IS NULL) and
 * parseGradableMarket('manual') resolves to nothing. An operator reads the
 * real-world result and grades here. This endpoint is the ONLY route to
 * settlement for these bets.
 *
 * SCOPE — deliberately narrow (money-critical):
 *   - ONE bet per call, explicit decision ('won'|'lost'|'void').
 *   - type='manual' STRAIGHT-shaped tickets only, EXACTLY ONE pending leg
 *     whose marketType is 'manual' (write-ins are single-leg by construction
 *     — ManualBetService — so anything else here means tampering or drift).
 *   - The money block MIRRORS CardBetGradingService::gradeBet (which itself
 *     mirrors OutrightSettlementService): row locks, WHERE status='pending'
 *     idempotency, pendingBalance decremented exactly once, freeplay
 *     profit-only wins (defensive — v1 write-ins are never freeplay),
 *     credit-account debit-on-loss, a transactions ledger row for every
 *     balance change, APCu invalidation + realtime push after commit.
 *     Keep the three in sync.
 */
final class ManualBetGradingService
{
    private const DECISIONS = ['won', 'lost', 'void'];

    /**
     * Pure pre-flight check — the reason a (bet, pending-legs) pair cannot
     * be graded here, or null when gradable. Public + pure so the guard
     * matrix is unit-locked without a DB.
     *
     * @param array<string,mixed>|null $bet
     * @param list<array<string,mixed>> $pendingLegs
     */
    public static function gradeableManualBetError(?array $bet, array $pendingLegs): ?string
    {
        if ($bet === null) {
            return 'bet_not_found';
        }
        if ((string) ($bet['status'] ?? '') !== 'pending') {
            return 'bet_not_pending';
        }
        if (strtolower((string) ($bet['type'] ?? '')) !== ManualBetService::BET_TYPE) {
            return 'bet_not_manual'; // this endpoint can ONLY grade write-ins
        }
        if (count($pendingLegs) !== 1) {
            return 'bet_leg_count'; // write-ins are single-leg by construction
        }
        $mt = strtolower((string) ($pendingLegs[0]['marketType'] ?? ''));
        if ($mt !== ManualBetService::MARKET_TYPE) {
            return 'not_a_manual_bet';
        }
        return null;
    }

    /**
     * Grade one pending manual bet. Idempotent: a re-run on an already-
     * terminal bet is a refused no-op (bet_not_pending), never a double
     * payout.
     *
     * @return array{ok:bool, betId:string, decision:string, error?:string}
     */
    public static function gradeBet(SqlRepository $db, string $betId, string $decision, string $gradedBy): array
    {
        $decision = strtolower(trim($decision));
        if (!in_array($decision, self::DECISIONS, true)) {
            throw new RuntimeException('Invalid decision — expected won, lost, or void');
        }
        if ($betId === '' || preg_match('/^[a-f0-9]{24}$/i', $betId) !== 1) {
            throw new RuntimeException('Invalid bet id');
        }

        $db->beginTransaction();
        try {
            $bet = $db->findOneForUpdate('bets', ['id' => SqlRepository::id($betId)]);
            $legs = $db->findMany('betselections', [
                'betId'  => SqlRepository::id($betId),
                'status' => 'pending',
            ]);
            $legs = array_values(array_filter(is_array($legs) ? $legs : [], 'is_array'));

            $error = self::gradeableManualBetError($bet, $legs);
            if ($error !== null) {
                $db->rollback();
                return ['ok' => false, 'betId' => $betId, 'decision' => $decision, 'error' => $error];
            }

            $userId = (string) ($bet['userId'] ?? '');
            if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                $db->rollback();
                return ['ok' => false, 'betId' => $betId, 'decision' => $decision, 'error' => 'invalid_user'];
            }
            $user = $db->findOneForUpdate('users', ['id' => SqlRepository::id($userId)]);
            if ($user === null) {
                $db->rollback();
                return ['ok' => false, 'betId' => $betId, 'decision' => $decision, 'error' => 'user_not_found'];
            }

            $now = SqlRepository::nowUtc();
            $leg = $legs[0];
            $legId = (string) ($leg['id'] ?? '');
            if ($legId === '') {
                $db->rollback();
                return ['ok' => false, 'betId' => $betId, 'decision' => $decision, 'error' => 'invalid_leg'];
            }
            $db->updateOne('betselections', ['id' => SqlRepository::id($legId)], [
                'status'      => $decision,
                'updatedAt'   => $now,
                'settledAt'   => $now,
                'gradeReason' => 'manual_bet_grade',
            ]);

            // ── Money block: MIRRORS CardBetGradingService (straight-shaped
            //    bet; leg status === ticket status). Keep the two in sync. ────
            $riskAmount      = (float) round((float) ($bet['riskAmount'] ?? 0), 2);
            $potentialPayout = (float) round((float) ($bet['potentialPayout'] ?? 0));
            $acceptedPayout  = (float) round((float) ($bet['acceptedPayout'] ?? $potentialPayout));
            $ticketPayout    = (float) round($potentialPayout);
            if ($decision === 'won' && $acceptedPayout > 0 && abs($acceptedPayout - $ticketPayout) <= 2.0) {
                $ticketPayout = $acceptedPayout; // honor placement-pinned payout within $2
            }

            // v1 write-ins are never freeplay (ManualBetService), but the
            // split is kept so the mirror stays exact and a v2 freeplay
            // write-in cannot silently misgrade.
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

            if ($decision === 'void') {
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
                $description = 'MANUAL' . ($isFreeplay ? ' freeplay' : '') . ' write-in bet voided - wager refunded (manual grade)';
            } elseif ($decision === 'won') {
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
                $description = 'MANUAL'
                    . ($isFreeplay ? ' freeplay' : '')
                    . ($isCreditAccount && !$isFreeplay
                        ? ' write-in bet won - profit credited (credit account, manual grade)'
                        : ' write-in bet won - profit credited (manual grade)');
            } else { // lost
                if ($isCreditAccount && $realPortion > 0) {
                    $balanceBefore = $balance;
                    $balanceAfter  = (float) round($balance - $realPortion);
                    $userUpdate['balance'] = $balanceAfter;
                    $description = 'MANUAL write-in bet lost - balance debited (credit account, manual grade)';
                } else {
                    $description = 'MANUAL' . ($isFreeplay ? ' freeplay' : '') . ' write-in bet lost (manual grade)';
                }
                $transactionType   = $isFreeplay ? 'fp_bet_lost' : 'bet_lost';
                $transactionAmount = $riskAmount;
            }

            $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                'status'          => $decision,
                'result'          => $decision,
                'settledAt'       => $now,
                'settledBy'       => $gradedBy,
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
        } catch (Throwable $e) {
            try { $db->rollback(); } catch (Throwable) {}
            throw $e;
        }

        // Post-commit best-effort side effects (mirrors the card grader):
        // a failed cache purge / broadcast can never roll back money.
        if (function_exists('apcu_delete')) {
            @apcu_delete('ua:users:' . $userId);
        }
        if (class_exists('RealtimeEventBus')) {
            try {
                RealtimeEventBus::publish('bet:settled', [
                    'userId' => $userId,
                    'betId'  => $betId,
                    'status' => $decision,
                    'source' => 'manual_bet',
                    'time'   => SqlRepository::nowUtc(),
                ]);
            } catch (Throwable $_) {
                // best-effort; next poll shows the new status
            }
        }

        return ['ok' => true, 'betId' => $betId, 'decision' => $decision];
    }

    /**
     * Pending write-in bets, oldest first (FIFO inbox), with everything the
     * operator needs to grade: player, the free-text description, odds,
     * risk → payout, who wrote it in and when. Read-only.
     *
     * @return array{bets: list<array<string,mixed>>, betCount:int}
     */
    public static function listPendingManualBets(SqlRepository $db): array
    {
        $rows = $db->findMany('bets', [
            'type'   => ManualBetService::BET_TYPE,
            'status' => 'pending',
        ], ['limit' => 500]);

        $out = [];
        $userNameCache = [];
        foreach (is_array($rows) ? $rows : [] as $bet) {
            if (!is_array($bet)) continue;
            $userId = (string) ($bet['userId'] ?? '');
            if ($userId !== '' && !array_key_exists($userId, $userNameCache)) {
                $u = $db->findOne('users', ['id' => SqlRepository::id($userId)]);
                $userNameCache[$userId] = is_array($u) ? (string) ($u['username'] ?? $u['name'] ?? '') : '';
            }
            $out[] = [
                'betId'             => (string) ($bet['id'] ?? ''),
                'username'          => $userNameCache[$userId] ?? '',
                'description'       => (string) ($bet['description'] ?? $bet['selection'] ?? ''),
                'oddsAmerican'      => isset($bet['oddsAmerican']) && is_numeric($bet['oddsAmerican']) ? (int) $bet['oddsAmerican'] : null,
                'odds'              => (float) ($bet['odds'] ?? 0),
                'riskAmount'        => (float) ($bet['riskAmount'] ?? 0),
                'potentialPayout'   => (float) ($bet['potentialPayout'] ?? 0),
                'enteredByUsername' => (string) ($bet['enteredByUsername'] ?? ''),
                'placedAt'          => (string) ($bet['createdAt'] ?? ''),
            ];
        }

        usort($out, static fn (array $a, array $b): int => strcmp($a['placedAt'], $b['placedAt']));
        return ['bets' => $out, 'betCount' => count($out)];
    }
}
