<?php

declare(strict_types=1);

/**
 * Manual grading for soccer CARD bets (alternate_totals_cards /
 * alternate_spreads_cards) — the Cards-3 admin surface.
 *
 * WHY MANUAL, PERMANENTLY: no results feed we use carries card counts, so
 * parseGradableMarket() deliberately returns null for card keys and the
 * settlement sweep leaves card legs pending forever. An operator reads the
 * official match report (FA/league site) and grades here. This service is
 * the MANDATORY gate behind SPORTSBOOK_CARDS_BETTING_ENABLED.
 *
 * SCOPE — deliberately narrow (money-critical):
 *   - ONE bet per call, explicit decision ('won'|'lost'|'void').
 *   - STRAIGHT bets only with EXACTLY ONE pending leg whose marketType ends
 *     '_cards' (cards are straight-only by composition rule, so anything
 *     else here means tampering or drift — refused).
 *   - The money block MIRRORS OutrightSettlementService::
 *     gradePendingBetsForOutright (the proven straight-bet manual-grade
 *     flow): row locks, WHERE status='pending' idempotency, pendingBalance
 *     decremented exactly once, freeplay profit-only wins, credit-account
 *     debit-on-loss, a transactions ledger row for every balance change,
 *     APCu invalidation + realtime push after commit. Keep the two in sync.
 */
final class CardBetGradingService
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
    public static function gradeableCardBetError(?array $bet, array $pendingLegs): ?string
    {
        if ($bet === null) {
            return 'bet_not_found';
        }
        if ((string) ($bet['status'] ?? '') !== 'pending') {
            return 'bet_not_pending';
        }
        if (strtolower((string) ($bet['type'] ?? 'straight')) !== 'straight') {
            return 'bet_not_straight'; // cards are straight-only; anything else is drift
        }
        if (count($pendingLegs) !== 1) {
            return 'bet_leg_count';
        }
        $mt = strtolower((string) ($pendingLegs[0]['marketType'] ?? ''));
        if (!str_ends_with($mt, '_cards')) {
            return 'not_a_card_bet'; // this endpoint can ONLY grade card bets
        }
        return null;
    }

    /**
     * Grade one pending straight card bet. Idempotent: a re-run on an
     * already-terminal bet is a refused no-op (bet_not_pending), never a
     * double payout.
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

            $error = self::gradeableCardBetError($bet, $legs);
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
                'gradeReason' => 'manual_card_grade',
            ]);

            // ── Money block: MIRRORS OutrightSettlementService (straight bet;
            //    leg status === ticket status). Keep the two in sync. ─────────
            $riskAmount      = (float) round((float) ($bet['riskAmount'] ?? 0), 2);
            $potentialPayout = (float) round((float) ($bet['potentialPayout'] ?? 0));
            $acceptedPayout  = (float) round((float) ($bet['acceptedPayout'] ?? $potentialPayout));
            $ticketPayout    = (float) round($potentialPayout);
            if ($decision === 'won' && $acceptedPayout > 0 && abs($acceptedPayout - $ticketPayout) <= 2.0) {
                $ticketPayout = $acceptedPayout; // honor placement-pinned payout within $2
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
                $description = 'STRAIGHT' . ($isFreeplay ? ' freeplay' : '') . ' card bet voided - wager refunded (manual card grade)';
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
                $description = 'STRAIGHT'
                    . ($isFreeplay ? ' freeplay' : '')
                    . ($isCreditAccount && !$isFreeplay
                        ? ' card bet won - profit credited (credit account, manual card grade)'
                        : ' card bet won - profit credited (manual card grade)');
            } else { // lost
                if ($isCreditAccount && $realPortion > 0) {
                    $balanceBefore = $balance;
                    $balanceAfter  = (float) round($balance - $realPortion);
                    $userUpdate['balance'] = $balanceAfter;
                    $description = 'STRAIGHT card bet lost - balance debited (credit account, manual card grade)';
                } else {
                    $description = 'STRAIGHT' . ($isFreeplay ? ' freeplay' : '') . ' card bet lost (manual card grade)';
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

        // Post-commit best-effort side effects (mirrors the outright grader):
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
                    'source' => 'card_manual',
                    'time'   => SqlRepository::nowUtc(),
                ]);
            } catch (Throwable $_) {
                // best-effort; next poll shows the new status
            }
        }

        return ['ok' => true, 'betId' => $betId, 'decision' => $decision];
    }

    /**
     * Pending card bets grouped by match, with everything the operator
     * needs to grade from the official match report: teams, kickoff,
     * match status + final score (context only — goals ≠ cards!), and per
     * bet: user, market, selection, line, odds, risk, payout. Read-only.
     *
     * @return array{matches: list<array<string,mixed>>, betCount:int}
     */
    public static function listPendingCardBets(SqlRepository $db): array
    {
        $cardKeys = array_map('trim', explode(',', OddsApiAllowlist::marketsFor(OddsApiAllowlist::CATEGORY_CARDS)));
        $sels = $db->findMany('betselections', [
            'marketType' => ['$in' => $cardKeys],
            'status'     => 'pending',
        ], ['limit' => 500]);

        $byMatch = [];
        $betCount = 0;
        $userNameCache = [];
        foreach (is_array($sels) ? $sels : [] as $sel) {
            if (!is_array($sel)) continue;
            $betId = (string) ($sel['betId'] ?? '');
            if ($betId === '') continue;
            $bet = $db->findOne('bets', ['id' => SqlRepository::id($betId)]);
            if (!is_array($bet) || (string) ($bet['status'] ?? '') !== 'pending') {
                continue; // ticket already terminal (e.g. voided elsewhere)
            }

            $userId = (string) ($bet['userId'] ?? '');
            if ($userId !== '' && !array_key_exists($userId, $userNameCache)) {
                $u = $db->findOne('users', ['id' => SqlRepository::id($userId)]);
                $userNameCache[$userId] = is_array($u) ? (string) ($u['username'] ?? $u['name'] ?? '') : '';
            }

            $matchId = (string) ($sel['matchId'] ?? '');
            if (!isset($byMatch[$matchId])) {
                $match = $matchId !== '' ? $db->findOne('matches', ['id' => SqlRepository::id($matchId)]) : null;
                $byMatch[$matchId] = [
                    'matchId'     => $matchId,
                    'homeTeam'    => is_array($match) ? (string) ($match['homeTeam'] ?? '') : '',
                    'awayTeam'    => is_array($match) ? (string) ($match['awayTeam'] ?? '') : '',
                    'startTime'   => is_array($match) ? (string) ($match['startTime'] ?? '') : '',
                    'matchStatus' => is_array($match) ? (string) ($match['status'] ?? '') : '',
                    'scoreHome'   => is_array($match) ? (int) ($match['score']['score_home'] ?? 0) : null,
                    'scoreAway'   => is_array($match) ? (int) ($match['score']['score_away'] ?? 0) : null,
                    'bets'        => [],
                ];
            }
            $byMatch[$matchId]['bets'][] = [
                'betId'           => $betId,
                'username'        => $userNameCache[$userId] ?? '',
                'marketType'      => (string) ($sel['marketType'] ?? ''),
                'selection'       => (string) ($sel['selection'] ?? ''),
                'point'           => isset($sel['point']) && is_numeric($sel['point']) ? (float) $sel['point'] : null,
                'odds'            => isset($sel['acceptedPrice']) && is_numeric($sel['acceptedPrice']) ? (float) $sel['acceptedPrice'] : (float) ($bet['odds'] ?? 0),
                'riskAmount'      => (float) ($bet['riskAmount'] ?? 0),
                'potentialPayout' => (float) ($bet['potentialPayout'] ?? 0),
                'isFreeplay'      => (bool) ($bet['isFreeplay'] ?? false),
                'placedAt'        => (string) ($bet['createdAt'] ?? ''),
            ];
            $betCount++;
        }

        $matches = array_values($byMatch);
        usort($matches, static fn (array $a, array $b): int => strcmp($a['startTime'], $b['startTime']));
        return ['matches' => $matches, 'betCount' => $betCount];
    }
}
