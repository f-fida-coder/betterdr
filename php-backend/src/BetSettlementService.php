<?php

declare(strict_types=1);

final class BetSettlementService
{
    public static function manualWinnerEligibility(SqlRepository $db, string $matchId): array
    {
        self::assertValidMatchId($matchId);

        $match = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
        if ($match === null) {
            throw new RuntimeException('Match not found');
        }

        $match = SportsMatchStatus::annotate($match);
        if ((string) ($match['status'] ?? '') === 'finished') {
            return [
                'manualWinnerAllowed' => true,
                'reason' => null,
                'isFinished' => true,
                'blockedLegCount' => 0,
            ];
        }

        self::backfillPendingSelectionsForMatch($db, $matchId);
        $pendingSelections = $db->findMany('betselections', [
            'matchId' => SqlRepository::id($matchId),
            'status' => 'pending',
        ], [
            'projection' => ['marketType' => 1],
        ]);

        $blockedLegCount = 0;
        foreach ($pendingSelections as $selection) {
            if (!self::isH2HMarket((string) ($selection['marketType'] ?? ''))) {
                $blockedLegCount++;
            }
        }

        if ($blockedLegCount > 0) {
            return [
                'manualWinnerAllowed' => false,
                'reason' => 'Manual winner is H2H-only until the match is finished. Pending spread/total legs found.',
                'isFinished' => false,
                'blockedLegCount' => $blockedLegCount,
            ];
        }

        return [
            'manualWinnerAllowed' => true,
            'reason' => null,
            'isFinished' => false,
            'blockedLegCount' => 0,
        ];
    }

    public static function settleMatch(SqlRepository $db, string $matchId, ?string $manualWinner = null, string $settledBy = 'system'): array
    {
        try {
            self::assertValidMatchId($matchId);

            $match = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
            if ($match === null) {
                throw new RuntimeException('Match not found');
            }
            $match = SportsMatchStatus::annotate($match);

            if ($manualWinner !== null) {
                $eligibility = self::manualWinnerEligibility($db, $matchId);
                if (($eligibility['manualWinnerAllowed'] ?? false) !== true) {
                    throw new RuntimeException((string) ($eligibility['reason'] ?? 'Manual winner is not allowed for this match.'));
                }
            }

            self::backfillPendingSelectionsForMatch($db, $matchId);
            $pendingSelections = $db->findMany('betselections', [
                'matchId' => SqlRepository::id($matchId),
                'status' => 'pending',
            ], [
                'projection' => ['betId' => 1],
            ]);

            $betIds = [];
            foreach ($pendingSelections as $selection) {
                $betId = (string) ($selection['betId'] ?? '');
                if ($betId !== '' && preg_match('/^[a-f0-9]{24}$/i', $betId) === 1) {
                    $betIds[$betId] = true;
                }
            }

            $results = [
                'matchId' => $matchId,
                'matchStatus' => (string) ($match['status'] ?? ''),
                'total' => count($betIds),
                'won' => 0,
                'lost' => 0,
                'voided' => 0,
                'errors' => 0,
                'betIds' => array_keys($betIds),
                'settledBetIds' => [],
            ];

            if ($betIds === []) {
                SportsbookHealth::recordSettlementSuccess($db, $matchId, $settledBy, $results);
                return $results;
            }

            $teaserRule = self::getTeaserRule($db);
            foreach (array_keys($betIds) as $betId) {
                try {
                    $db->beginTransaction();

                    $bet = $db->findOneForUpdate('bets', ['id' => SqlRepository::id($betId)]);
                    if ($bet === null || (string) ($bet['status'] ?? '') !== 'pending') {
                        $db->rollback();
                        continue;
                    }

                    $userId = (string) ($bet['userId'] ?? '');
                    if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                        $db->rollback();
                        continue;
                    }

                    $user = $db->findOneForUpdate('users', ['id' => SqlRepository::id($userId)]);
                    if ($user === null) {
                        $db->rollback();
                        continue;
                    }

                    $selectionRows = SportsbookBetSupport::ensureSelectionRowsForBet($db, $bet);
                    $updatedRows = [];
                    $selectionDirty = false;
                    $now = SqlRepository::nowUtc();

                    foreach ($selectionRows as $row) {
                        if (!is_array($row)) {
                            continue;
                        }

                        $rowMatchId = (string) ($row['matchId'] ?? '');
                        $rowStatus = (string) ($row['status'] ?? 'pending');
                        if ($rowMatchId === $matchId && $rowStatus === 'pending') {
                            $resolvedStatus = SportsbookBetSupport::selectionResult(
                                $match,
                                $row,
                                self::isH2HMarket((string) ($row['marketType'] ?? '')) ? $manualWinner : null
                            );

                            if ($resolvedStatus !== $rowStatus) {
                                $row['status'] = $resolvedStatus;
                                $row['updatedAt'] = $now;
                                if ($resolvedStatus !== 'pending') {
                                    $row['settledAt'] = $now;
                                    // Stash the final scores on the leg so the
                                    // My Bets per-leg detail panel can show
                                    // "Lost (Houston Rockets 99 — Los Angeles
                                    // Lakers 105)" without a separate fetch.
                                    // Match.score is the live score doc; once
                                    // the match is finished it's the final.
                                    $row['finalHomeScore'] = self::num($match['score']['score_home'] ?? 0);
                                    $row['finalAwayScore'] = self::num($match['score']['score_away'] ?? 0);
                                }
                                $db->updateOne('betselections', ['id' => SqlRepository::id((string) ($row['id'] ?? ''))], [
                                    'status' => $resolvedStatus,
                                    'updatedAt' => $row['updatedAt'],
                                    'settledAt' => $row['settledAt'] ?? null,
                                    'finalHomeScore' => $row['finalHomeScore'] ?? null,
                                    'finalAwayScore' => $row['finalAwayScore'] ?? null,
                                ]);
                                $selectionDirty = true;
                            }
                        }

                        $updatedRows[] = $row;
                    }

                    if (!$selectionDirty) {
                        $db->rollback();
                        continue;
                    }

                    $normalizedSelections = SportsbookBetSupport::selectionRowsToBetSelections($bet, $updatedRows);
                    $evaluation = SportsbookBetSupport::evaluateTicket(
                        array_merge($bet, ['selections' => $normalizedSelections]),
                        $updatedRows,
                        $teaserRule
                    );

                    $ticketStatus = (string) ($evaluation['status'] ?? 'pending');
                    // Whole-dollar settlement (PPH convention): cash settles in
                    // physical bills between agent and player, so balances must
                    // never carry cents. Round payout to nearest dollar at grade
                    // time so balance reads identical everywhere downstream
                    // (header, transaction list, agent figures).
                    $ticketPayout = (float) round(self::num($evaluation['payout'] ?? 0));

                    // Honor the placement-time pinned payout for fully-won
                    // tickets so a player who typed "Win $1,000" gets exactly
                    // $1,000 instead of $999/$1,001 from combined-odds
                    // recompute drift. Mirrors the ±$2 win-mode pin in
                    // BetsController::placeBet so settlement matches the
                    // amount the player saw and accepted. Reads
                    // `acceptedPayout` first (the placement-pinned value
                    // stashed by line 237 below; survives re-grades that
                    // overwrite `potentialPayout`) and falls back to
                    // `potentialPayout` for first-time settlements before
                    // `acceptedPayout` was populated. Skipped when a leg
                    // pushes — the parlay reduces and the new payout is
                    // intentionally different from the accepted value, so the
                    // diff exceeds tolerance and we keep the recomputed value.
                    if ($ticketStatus === 'won') {
                        $pinnedPayout = (float) round(self::num($bet['acceptedPayout'] ?? $bet['potentialPayout'] ?? 0));
                        if ($pinnedPayout > 0 && abs($pinnedPayout - $ticketPayout) <= 2.0) {
                            $ticketPayout = $pinnedPayout;
                        }
                    }

                    if ($ticketStatus === 'pending') {
                        $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                            'selections' => $normalizedSelections,
                            'updatedAt' => $now,
                        ]);
                        $db->commit();
                        continue;
                    }

                    $riskAmount     = SportsbookBetSupport::riskAmount($bet);
                    $isFreeplay     = (bool) ($bet['isFreeplay'] ?? false);
                    // Exact freeplay dollars applied at placement. Pure
                    // freeplay tickets equal riskAmount; partial-freeplay
                    // tickets are < riskAmount; non-freeplay tickets are 0.
                    // Legacy bets predating this column have isFreeplay set
                    // but no stored amount — fall back to riskAmount so old
                    // pure-freeplay tickets still settle correctly.
                    $freeplayUsed = self::num($bet['freeplayAmountUsed'] ?? ($isFreeplay ? $riskAmount : 0));
                    $freeplayUsed = max(0.0, min($freeplayUsed, $riskAmount));
                    $realPortion  = (float) max(0.0, $riskAmount - $freeplayUsed);
                    $balance        = self::num($user['balance'] ?? 0);
                    $pendingBalance = self::num($user['pendingBalance'] ?? 0);
                    $freeplayBalance = self::num($user['freeplayBalance'] ?? 0);
                    $acceptedPayout = self::num($bet['acceptedPayout'] ?? ($bet['potentialPayout'] ?? 0));

                    // Mirror the placement-time branch in BetsController.php:244 — credit
                    // accounts (creditLimit > 0) reserve stake in pendingBalance only and
                    // never debit `balance` at placement, so settlement must:
                    //  • LOSS  → debit `balance` by realPortion (user now owes the house)
                    //  • WIN   → credit `balance` by *profit only* (stake was never debited)
                    //  • VOID  → leave `balance` alone (nothing to refund)
                    // Cash accounts (creditLimit = 0) keep the existing semantics because
                    // their stake was already moved out of `balance` at placement.
                    // The freeplay portion follows the freeplay rules regardless of role.
                    $creditLimit     = self::num($user['creditLimit'] ?? 0);
                    $userRole        = strtolower((string) ($user['role'] ?? 'user'));
                    $isCreditAccount = $realPortion > 0 && $userRole === 'user' && $creditLimit > 0;

                    // Only the real-balance portion was held in pendingBalance
                    // at placement; the freeplay portion never touched pending.
                    $newPendingBalance = max(0.0, $pendingBalance - $realPortion);

                    $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                        'selections'    => $normalizedSelections,
                        'status'        => $ticketStatus,
                        'result'        => $ticketStatus,
                        'settledAt'     => $now,
                        'settledBy'     => $settledBy,
                        'acceptedPayout' => $acceptedPayout > 0 ? $acceptedPayout : $ticketPayout,
                        'potentialPayout' => $ticketPayout,
                        'combinedOdds'  => SportsbookBetSupport::combinedOdds($riskAmount, $ticketPayout),
                        'updatedAt'     => $now,
                    ]);

                    $userUpdate       = ['pendingBalance' => $newPendingBalance, 'updatedAt' => $now];
                    $transactionType  = $isFreeplay ? 'fp_bet_lost' : 'bet_lost';
                    $transactionAmount = $riskAmount;
                    $balanceBefore    = $isFreeplay ? $freeplayBalance : $balance;
                    $balanceAfter     = $isFreeplay ? $freeplayBalance : $balance; // default: no change
                    $description      = strtoupper((string) ($bet['type'] ?? 'straight')) . ($isFreeplay ? ' freeplay' : '') . ' bet lost';

                    if ($ticketStatus === 'void') {
                        // Refund each pool to its source. Freeplay portion
                        // returns to freeplayBalance; real portion returns
                        // to balance for cash accounts (credit accounts'
                        // real portion was held in pending only, so freeing
                        // pending alone is the correct restore).
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
                        $transactionAmount = $riskAmount;
                        $transactionType = $isFreeplay ? 'fp_bet_void' : 'bet_void';
                        $description = strtoupper((string) ($bet['type'] ?? 'straight')) . ($isFreeplay ? ' freeplay' : '') . ' bet voided - wager refunded';
                        $results['voided']++;
                    } elseif ($ticketStatus === 'won') {
                        // Mixed-pool win: credit (ticketPayout - freeplayUsed)
                        // to real balance. That's the freeplay's profit-only
                        // share + the real portion's full return (stake +
                        // profit). When freeplayUsed=0 it collapses to the
                        // standard cash-account credit (full payout); when
                        // freeplayUsed=riskAmount it's pure profit.
                        $profit       = (float) round(max(0.0, $ticketPayout - $riskAmount));
                        $balanceCredit = (float) round(max(0.0, $ticketPayout - $freeplayUsed));
                        // Credit accounts never debited balance at placement,
                        // so the real portion's stake should not be re-credited
                        // here — only its profit. Subtract realPortion from the
                        // mixed credit to leave just (freeplayProfit + realProfit).
                        if ($isCreditAccount) {
                            $balanceCredit = (float) round(max(0.0, $balanceCredit - $realPortion));
                        }
                        $balanceBefore = $balance;
                        $balanceAfter  = (float) round($balance + $balanceCredit);
                        $userUpdate['balance'] = $balanceAfter;
                        $userUpdate['totalWinnings'] = (float) round(self::num($user['totalWinnings'] ?? 0) + $profit);
                        $transactionType  = $isFreeplay ? 'fp_bet_won' : 'bet_won';
                        $transactionAmount = $isFreeplay || $isCreditAccount ? $profit : $ticketPayout;
                        $description = strtoupper((string) ($bet['type'] ?? 'straight'))
                            . ($isFreeplay ? ' freeplay' : '')
                            . ($isCreditAccount && !$isFreeplay ? ' bet won - profit credited (credit account)' : ' bet won - profit credited');
                        $results['won']++;
                    } else {
                        // LOSS. Freeplay portion: stake is gone (already
                        // deducted at placement), nothing to do. Real portion:
                        // cash accounts already had stake debited at placement
                        // → no-op; credit accounts held the real stake in
                        // pending only and must now debit balance to record
                        // the debt.
                        if ($isCreditAccount && $realPortion > 0) {
                            $balanceBefore = $balance;
                            $balanceAfter  = (float) round($balance - $realPortion);
                            $userUpdate['balance'] = $balanceAfter;
                            $description = strtoupper((string) ($bet['type'] ?? 'straight')) . ' bet lost - balance debited (credit account)';
                        }
                        $results['lost']++;
                    }

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

                    $results['settledBetIds'][] = $betId;
                    $db->commit();

                    // If this child belongs to a Round Robin group,
                    // recompute the group's aggregate status so the
                    // user's grouped view (won/lost/partial/void)
                    // tracks the children as they settle. Runs outside
                    // the per-bet transaction — the child write is
                    // already durable, and a recompute failure here
                    // mustn't roll back a successful settlement.
                    $parentGroupId = (string) ($bet['parentGroupId'] ?? '');
                    if ($parentGroupId !== '' && class_exists('RoundRobinService')) {
                        try {
                            RoundRobinService::recomputeGroupStatus($db, $parentGroupId);
                        } catch (Throwable $rrErr) {
                            // Logged but not fatal — the per-child
                            // status is already correct in `bets`. The
                            // group display row will catch up on the
                            // next sibling's settlement or a manual
                            // recompute trigger.
                        }
                    }
                } catch (Throwable $e) {
                    $db->rollback();
                    $results['errors']++;
                }
            }

            SportsbookHealth::recordSettlementSuccess($db, $matchId, $settledBy, $results);
            return $results;
        } catch (Throwable $e) {
            SportsbookHealth::recordSettlementFailure($db, $matchId, $settledBy, $e);
            throw $e;
        }
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * Per-user variant of settlePendingMatches. Scopes the sweep to the
     * matches THIS user has pending bets on so an opportunistic call from
     * getMyBets() doesn't thrash through every other player's queue.
     * Used as a self-healing fallback for environments where the
     * background worker isn't running yet — viewing your own bets list
     * triggers settlement of any expired/finished matches you have a
     * stake in. No-op when the user has no pending tickets.
     *
     * @return array<string, mixed>
     */
    public static function settlePendingMatchesForUser(SqlRepository $db, string $userId, string $settledBy = 'system'): array
    {
        if (preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
            return ['matchesChecked' => 0, 'matchesSettled' => 0, 'betsSettled' => 0, 'errors' => 0, 'matchIds' => []];
        }
        $pendingBets = $db->findMany('bets', [
            'userId' => SqlRepository::id($userId),
            'status' => 'pending',
        ], [
            'projection' => ['id' => 1, 'matchId' => 1, 'selections' => 1],
            'limit' => 200,
        ]);

        $matchIds = [];
        foreach ($pendingBets as $bet) {
            // Straight: top-level matchId.
            $mid = (string) ($bet['matchId'] ?? '');
            if ($mid !== '' && preg_match('/^[a-f0-9]{24}$/i', $mid) === 1) {
                $matchIds[$mid] = true;
            }
            // Combined modes (parlay/teaser/if_bet/reverse): each leg
            // carries its own matchId in the selections array.
            $sels = $bet['selections'] ?? null;
            if (is_array($sels)) {
                foreach ($sels as $sel) {
                    if (!is_array($sel)) continue;
                    $smid = (string) ($sel['matchId'] ?? '');
                    if ($smid !== '' && preg_match('/^[a-f0-9]{24}$/i', $smid) === 1) {
                        $matchIds[$smid] = true;
                    }
                }
            }
        }

        $summary = ['matchesChecked' => 0, 'matchesSettled' => 0, 'betsSettled' => 0, 'errors' => 0, 'matchIds' => array_keys($matchIds), 'stuckHealed' => 0];
        foreach (array_keys($matchIds) as $matchId) {
            try {
                $match = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
                if ($match === null) continue;
                $summary['matchesChecked']++;
                $annotated = SportsMatchStatus::annotate($match);
                $status = (string) ($annotated['status'] ?? '');
                if (!in_array($status, ['finished', 'canceled', 'expired'], true)) {
                    // Stuck-match heal: the upstream feed sometimes posts
                    // final scores but never flips event_status to
                    // FINAL/COMPLETE, leaving the match permanently in
                    // `live`/`scheduled` and every dependent leg stuck
                    // pending forever. Detect that with three independent
                    // signals — non-zero score, started ≥90 min ago, and
                    // no sync touch for ≥30 min — and force-finish so
                    // settlement can run. All three must agree to avoid
                    // misclassifying a live game whose score is in flux.
                    if (self::looksProvablyFinished($match)) {
                        $db->updateOne('matches', ['id' => SqlRepository::id($matchId)], [
                            'status' => 'finished',
                            'updatedAt' => SqlRepository::nowUtc(),
                            'autoFinishedReason' => 'stuck-pending-heal',
                        ]);
                        $summary['stuckHealed']++;
                        Logger::info('auto-healed stuck match before settle', [
                            'userId' => $userId,
                            'matchId' => $matchId,
                            'startTime' => $match['startTime'] ?? null,
                            'lastUpdated' => ($match['lastUpdated'] ?? null) ?: ($match['updatedAt'] ?? null),
                            'score' => $match['score'] ?? null,
                        ], 'bets');
                    } else {
                        continue;
                    }
                }
                $result = self::settleMatch($db, $matchId, null, $settledBy);
                if (((int) ($result['total'] ?? 0)) > 0) {
                    $summary['matchesSettled']++;
                    $summary['betsSettled'] += count((array) ($result['settledBetIds'] ?? []));
                }
            } catch (Throwable $e) {
                $summary['errors']++;
            }
        }
        return $summary;
    }

    /**
     * Three-signal check that a match is over even though its `status`
     * field hasn't been flipped to `finished` by the upstream feed.
     * Conservative on purpose — every signal must agree, otherwise we
     * risk grading a live game whose score is still moving. Used by both
     * the on-read settlement sweep and the manual /api/bets/regrade-stuck
     * endpoint so the heal criteria are identical in both paths.
     */
    public static function looksProvablyFinished(array $match, ?int $nowTs = null): bool
    {
        $now = $nowTs ?? time();
        $startTs = strtotime((string) ($match['startTime'] ?? '')) ?: 0;
        $lastUpdatedRaw = (string) (($match['lastUpdated'] ?? '') ?: ($match['updatedAt'] ?? ''));
        $lastUpdatedTs = $lastUpdatedRaw !== '' ? (strtotime($lastUpdatedRaw) ?: 0) : 0;
        $homeScore = self::num($match['score']['score_home'] ?? 0);
        $awayScore = self::num($match['score']['score_away'] ?? 0);
        $hasScore = ($homeScore + $awayScore) > 0;
        $minGameSeconds = 90 * 60;   // 90 min — shortest realistic game length
        $staleSeconds   = 30 * 60;   // 30 min since last sync touch
        $longEnoughAgo  = $startTs > 0 && ($now - $startTs) >= $minGameSeconds;
        $feedQuiet      = $lastUpdatedTs > 0 && ($now - $lastUpdatedTs) >= $staleSeconds;
        return $hasScore && $longEnoughAgo && $feedQuiet;
    }

    public static function settlePendingMatches(SqlRepository $db, int $limit = 250, string $settledBy = 'system'): array
    {
        $pendingSelections = $db->findMany('betselections', [
            'status' => 'pending',
        ], [
            'projection' => ['matchId' => 1],
            'limit' => max(1, $limit * 10),
        ]);

        $matchIds = [];
        foreach ($pendingSelections as $selection) {
            $matchId = (string) ($selection['matchId'] ?? '');
            if ($matchId !== '' && preg_match('/^[a-f0-9]{24}$/i', $matchId) === 1) {
                $matchIds[$matchId] = true;
                if (count($matchIds) >= $limit) {
                    break;
                }
            }
        }

        $summary = [
            'matchesChecked' => 0,
            'matchesSettled' => 0,
            'betsSettled' => 0,
            'errors' => 0,
            'matchIds' => array_keys($matchIds),
        ];

        foreach (array_keys($matchIds) as $matchId) {
            try {
                $match = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
                if ($match === null) {
                    continue;
                }
                $summary['matchesChecked']++;
                $annotated = SportsMatchStatus::annotate($match);
                $status = (string) ($annotated['status'] ?? '');
                // 'expired' = past startTime + grace with no upstream data —
                // selectionResult voids these, so settleMatch refunds stakes.
                // Skipping them here was the bug that left tickets pending
                // forever once the upstream feed dropped a game.
                if (!in_array($status, ['finished', 'canceled', 'expired'], true)) {
                    continue;
                }

                $result = self::settleMatch($db, $matchId, null, $settledBy);
                if (((int) ($result['total'] ?? 0)) > 0) {
                    $summary['matchesSettled']++;
                    $summary['betsSettled'] += count((array) ($result['settledBetIds'] ?? []));
                }
            } catch (Throwable $e) {
                $summary['errors']++;
            }
        }

        return $summary;
    }

    private static function assertValidMatchId(string $matchId): void
    {
        if (preg_match('/^[a-f0-9]{24}$/i', $matchId) !== 1) {
            throw new RuntimeException('Match not found');
        }
    }

    private static function backfillPendingSelectionsForMatch(SqlRepository $db, string $matchId): void
    {
        $pendingBets = $db->findMany('bets', [
            'status' => 'pending',
            '$or' => [
                ['matchId' => SqlRepository::id($matchId)],
                ['selections.matchId' => SqlRepository::id($matchId)],
            ],
        ], [
            'projection' => [
                'id' => 1,
                'userId' => 1,
                'ticketId' => 1,
                'type' => 1,
                'amount' => 1,
                'riskAmount' => 1,
                'unitStake' => 1,
                'potentialPayout' => 1,
                'status' => 1,
                'selections' => 1,
                'matchId' => 1,
                'selection' => 1,
                'odds' => 1,
                'matchSnapshot' => 1,
                'createdAt' => 1,
                'updatedAt' => 1,
            ],
        ]);
        SportsbookBetSupport::backfillSelectionRowsForBets($db, $pendingBets);
    }

    private static function isH2HMarket(string $marketType): bool
    {
        return in_array(strtolower(trim($marketType)), ['h2h', 'moneyline', 'ml', 'straight', ''], true);
    }

    /**
     * @return array<string, mixed>
     */
    private static function getTeaserRule(SqlRepository $db): array
    {
        $rule = $db->findOne('betmoderules', ['mode' => 'teaser', 'isActive' => true]);
        if ($rule !== null) {
            return $rule;
        }
        return BetModeRules::getDefault('teaser') ?? [];
    }

    private static function num(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        if (is_string($value)) {
            return (float) $value;
        }
        if (is_array($value)) {
            if (isset($value['$numberDecimal'])) {
                return (float) $value['$numberDecimal'];
            }
            if (isset($value['value'])) {
                return (float) $value['value'];
            }
        }
        if (is_object($value) && method_exists($value, '__toString')) {
            return (float) $value->__toString();
        }
        return 0.0;
    }
}
