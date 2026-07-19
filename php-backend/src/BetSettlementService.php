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
            // Player-prop box score, fetched lazily ONCE per match (the first
            // time a prop leg needs it) and cached for the rest of this match's
            // legs. `false` = not yet fetched; null = unavailable/disabled (prop
            // legs then stay pending). See fetchPlayerStatsForMatch().
            $playerStats = false;
            foreach (array_keys($betIds) as $betId) {
                try {
                    $db->beginTransaction();

                    $bet = $db->findOneForUpdate('bets', ['id' => SqlRepository::id($betId)]);
                    if ($bet === null) {
                        $db->rollback();
                        continue;
                    }
                    // Grade ordinary pending tickets, PLUS new-model open
                    // parlays (declared-leg-count "open play"), which are
                    // graded per-leg as their games finish while the ticket is
                    // still status='open'. isGradableOpenTicket() only returns
                    // true for an open parlay carrying a valid targetLegs, so a
                    // LEGACY open ticket (no targetLegs) is still skipped here,
                    // exactly as before — it never auto-settles. The per-leg
                    // open-parlay gating below (shouldSettleNow) keeps an
                    // incomplete ticket open instead of paying it early; the
                    // HARD anti-past-posting gate lives at add-leg time, so a
                    // started game can never have been added to begin with.
                    $betStatus = (string) ($bet['status'] ?? '');
                    $isOpenParlayTicket = OpenParlayService::isGradableOpenTicket($bet);
                    if ($betStatus !== 'pending' && !$isOpenParlayTicket) {
                        // A ticket that is already TERMINAL can still hold
                        // 'pending' selection ROWS (a decisive-loss settle or a
                        // whole-ticket void ends the ticket before every leg's
                        // game finishes). Those rows are grade-dead — no money
                        // can ever move for them — but left pending they pin
                        // their matches into every sweep's candidate set forever
                        // (2026-07-10 fossil loop: ~26 finished matches
                        // re-checked every pass since June). Close them so the
                        // match ages out; the bet doc (the display source) is
                        // untouched and no balance/ledger write happens here.
                        // Legacy open tickets (status 'open', no targetLegs) are
                        // NOT terminal and keep their rows for manual grading.
                        if (in_array($betStatus, ['won', 'lost', 'void'], true)) {
                            $closed = self::closePendingSelectionRowsForTerminalTicket($db, $betId);
                            if ($closed > 0) {
                                $db->commit();
                                Logger::info('closed orphan pending legs of terminal ticket', [
                                    'betId' => $betId,
                                    'betStatus' => $betStatus,
                                    'matchId' => $matchId,
                                    'rowsClosed' => $closed,
                                ], 'settlement');
                                continue;
                            }
                        }
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
                            // Prop leg → make sure the box score is loaded (once
                            // per match, feature-flagged). Non-prop legs ignore it.
                            if ($playerStats === false
                                && PlayerPropSettlement::isGradableProp((string) ($row['marketType'] ?? ''))
                            ) {
                                $playerStats = self::fetchPlayerStatsForMatch($match);
                            }
                            $resolvedDetailed = SportsbookBetSupport::selectionResultDetailed(
                                $match,
                                $row,
                                self::isH2HMarket((string) ($row['marketType'] ?? '')) ? $manualWinner : null,
                                is_array($playerStats) ? $playerStats : null
                            );
                            $resolvedStatus = (string) $resolvedDetailed['status'];
                            // settleFraction: 1.0 for every normal leg, 0.5 for a
                            // soccer Asian quarter half-win/half-loss. Persisted on
                            // the row so the parlay/straight payout (legMultiplier)
                            // pays the correct partial — including on a later
                            // settlement pass that re-reads the stored row.
                            $resolvedFraction = (float) ($resolvedDetailed['settleFraction'] ?? 1.0);

                            // Diagnostics for silently-stuck player props: a prop
                            // leg on a FINISHED match that still won't grade. Logs
                            // the precise reason (legacy bet with no player id,
                            // settlement flag off / box score missing, incomplete
                            // stats, unmapped market, …) so operations can see why
                            // a prop is hanging instead of it failing invisibly.
                            // Pure read — never changes the grade.
                            if ($resolvedStatus === 'pending'
                                && PlayerPropSettlement::isGradableProp((string) ($row['marketType'] ?? ''))
                                && SportsMatchStatus::effectiveStatus($match) === 'finished'
                            ) {
                                $reason = is_array($playerStats)
                                    ? (PlayerPropSettlement::evaluate($row, $playerStats)['reason'] ?: 'unresolved')
                                    : 'settlement_disabled_or_no_boxscore';
                                Logger::warning('player prop stuck pending on finished match', [
                                    'betId' => $betId,
                                    'matchId' => $matchId,
                                    'selectionId' => (string) ($row['id'] ?? ''),
                                    'marketType' => (string) ($row['marketType'] ?? ''),
                                    'selectionPid' => (string) ($row['selectionPid'] ?? ''),
                                    'sportKey' => (string) ($match['sportKey'] ?? ''),
                                    'reason' => $reason,
                                ], 'settlement');
                            }

                            if ($resolvedStatus !== $rowStatus) {
                                $row['status'] = $resolvedStatus;
                                $row['settleFraction'] = $resolvedFraction;
                                $row['updatedAt'] = $now;
                                if ($resolvedStatus !== 'pending') {
                                    $row['settledAt'] = $now;
                                    // Stash the scores this leg was graded on so
                                    // the My Bets per-leg detail panel can show
                                    // "Lost (Houston Rockets 99 — Los Angeles
                                    // Lakers 105)" without a separate fetch. For
                                    // a PERIOD leg (1H/Q1/F5/Set 1/etc.) this is
                                    // the per-period slice it was actually graded
                                    // on — NOT the full-game final — so a
                                    // first-half bet no longer confusingly shows
                                    // the whole-game score. Full-game legs are
                                    // unchanged (slice falls back to the final).
                                    [$legHomeScore, $legAwayScore] = SportsbookBetSupport::settledScorePair($match, $row);
                                    $row['finalHomeScore'] = $legHomeScore;
                                    $row['finalAwayScore'] = $legAwayScore;
                                }
                                // Persist a machine-readable grade reason
                                // for void legs so the UI can distinguish
                                // a teaser tie ("PUSH") from a canceled
                                // match ("Refund — match canceled"). Null
                                // for won/lost grades.
                                $gradeReason = $resolvedStatus === 'void'
                                    ? SportsbookBetSupport::gradeReasonForVoidLeg($match, $row)
                                    : null;
                                if ($gradeReason !== null) {
                                    $row['gradeReason'] = $gradeReason;
                                }
                                // Operator signal: a period leg auto-voided
                                // because the feed never supplied a gradeable
                                // per-period score before the grace window
                                // closed. Surfaced as a warning (with bet/match
                                // ids) so operations can spot a feed coverage
                                // gap and intervene, rather than the refund
                                // happening silently.
                                if ($gradeReason === 'period_unavailable') {
                                    Logger::warning('period leg auto-voided: per-period score never supplied', [
                                        'betId' => $betId,
                                        'matchId' => $matchId,
                                        'selectionId' => (string) ($row['id'] ?? ''),
                                        'marketType' => (string) ($row['marketType'] ?? ''),
                                        'sportKey' => (string) ($match['sportKey'] ?? ''),
                                    ], 'settlement');
                                }
                                $db->updateOne('betselections', ['id' => SqlRepository::id((string) ($row['id'] ?? ''))], [
                                    'status' => $resolvedStatus,
                                    'settleFraction' => $resolvedFraction,
                                    'updatedAt' => $row['updatedAt'],
                                    'settledAt' => $row['settledAt'] ?? null,
                                    'finalHomeScore' => $row['finalHomeScore'] ?? null,
                                    'finalAwayScore' => $row['finalAwayScore'] ?? null,
                                    'gradeReason' => $gradeReason,
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

                    // Placement-time payout-cap snapshot (payoutCapAmount) —
                    // re-applied as a CEILING so a ticket the 3×maxBet /
                    // SGP-multiplier clamp reduced at placement can never
                    // settle above what the player saw and accepted.
                    // MUST run BEFORE the ±$2 pin: capping first makes the
                    // capped recompute equal acceptedPayout, so the pin
                    // reconciles naturally instead of being skipped on the
                    // huge uncapped diff. A void-reduced recompute below the
                    // cap passes through untouched; absent/legacy snapshot is
                    // a no-op (see applyPayoutCapSnapshot).
                    $ticketPayout = SportsbookBetSupport::applyPayoutCapSnapshot($bet, $ticketPayout);

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

                    // Open parlay (new model): an incomplete ticket does NOT
                    // settle on a winning or pushing leg — it banks the leg and
                    // stays open. It settles only when shouldSettleNow() says so:
                    //   • any leg lost            → grade the loss now (handled
                    //                               by evaluateTicket → 'lost');
                    //   • all declared slots filled
                    //     and none still pending  → pay (won) or refund an
                    //                               all-push ticket (void).
                    // Until then we persist the just-graded leg rows and leave
                    // status='open' with NO money movement. A 'void' (push) leg
                    // neither loses nor settles the ticket — it occupies a slot
                    // and drops from the odds math at payout via evaluateTicket.
                    if ($isOpenParlayTicket) {
                        $rowStatuses = array_map(
                            static fn ($r): string => is_array($r) ? (string) ($r['status'] ?? 'pending') : 'pending',
                            $updatedRows
                        );
                        // Parallel settleFraction array (same keys as
                        // $rowStatuses) so a quarter HALF-LOSS leg (status
                        // 'lost', fraction < 1.0) banks its slot instead of
                        // settling an incomplete open parlay early. Non-quarter
                        // legs carry 1.0 → identical to the old binary gating.
                        $rowFractions = array_map(
                            static function ($r): float {
                                if (!is_array($r)) {
                                    return 1.0;
                                }
                                $f = $r['settleFraction'] ?? 1.0;
                                return is_numeric($f) ? (float) $f : 1.0;
                            },
                            $updatedRows
                        );
                        $targetLegs = (int) ($bet['targetLegs'] ?? 0);
                        $filledLegs = count($updatedRows);
                        if (!OpenParlayService::shouldSettleNow($rowStatuses, $targetLegs, $filledLegs, $rowFractions)) {
                            $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                                'selections' => $normalizedSelections,
                                'updatedAt' => $now,
                            ]);
                            $db->commit();
                            // Nudge the player's My Bets so a freshly-banked leg
                            // shows without waiting for the poll. Best-effort,
                            // after commit — a failed broadcast never rolls back.
                            if (class_exists('RealtimeEventBus')) {
                                try {
                                    RealtimeEventBus::publish('bet:leg-settled', [
                                        'userId' => $userId,
                                        'betId' => $betId,
                                        'status' => 'open',
                                        'source' => 'match',
                                        'time' => $now,
                                    ]);
                                } catch (Throwable $_) {
                                    // Polling fallback covers any missed push.
                                }
                            }
                            continue;
                        }
                        // shouldSettleNow → true: fall through to settle. The
                        // ticket flips open → won/lost/void below, freeing the
                        // stake from pendingBalance just like a normal parlay.
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

                    // Ticket is now terminal. A decisive loss can end it while
                    // sibling legs on OTHER matches are still ungraded — close
                    // those rows (same transaction) so their matches don't sit
                    // in the sweep's candidate set forever. Not a grade; the
                    // bet doc above already carries the final leg statuses.
                    self::closePendingSelectionRowsForTerminalTicket($db, $betId);

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
                        $newFreeplayBalance = max(0.0, $freeplayBalance + $freeplayUsed);
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

                    // Invalidate APCu user cache so subsequent requests see
                    // the updated balance immediately (not stale for 15s).
                    if (function_exists('apcu_delete')) {
                        @apcu_delete('ua:users:' . $userId);
                    }

                    // Realtime push so the player's open My Bets list flips
                    // pending → won/lost/void without waiting for the 5s
                    // poll. Fired AFTER commit so a failed broadcast can
                    // never roll back the money-touching write. Pattern
                    // mirrors OutrightSettlementService::publish.
                    if (class_exists('RealtimeEventBus')) {
                        try {
                            RealtimeEventBus::publish('bet:settled', [
                                'userId' => $userId,
                                'betId' => $betId,
                                'status' => $ticketStatus,
                                'source' => 'match',
                                'time' => $now,
                            ]);
                        } catch (Throwable $_) {
                            // Best-effort: bet is durable, polling fallback covers gaps.
                        }
                    }

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
        // Discover match IDs from BOTH ordinary pending tickets AND the user's
        // still-OPEN parlays (open play, status='open'). An open parlay's legs
        // are graded per-leg as their games finish (settleMatch +
        // OpenParlayService::isGradableOpenTicket) while the ticket stays open
        // — but those tickets are status='open', not 'pending', so a
        // pending-only discovery never swept their leg matches. The player then
        // saw a finished, winning leg with no "W" until the background worker
        // happened to grade it. Including 'open' here gives open-parlay legs the
        // same on-read grade + stuck-match heal every pending bet already gets
        // (the worker sweep already covers them via the per-leg betselections
        // query). No money math changes: an incomplete open parlay still only
        // grades its legs and never pays early (shouldSettleNow gates payout).
        $activeBets = $db->findMany('bets', [
            'userId' => SqlRepository::id($userId),
            'status' => ['$in' => ['pending', 'open']],
        ], [
            'projection' => ['id' => 1, 'matchId' => 1, 'selections' => 1],
            'limit' => 200,
        ]);

        $matchIds = [];
        foreach ($activeBets as $bet) {
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
                // Match must have a confirmed outcome before we settle.
                // 'expired' (feed went quiet past grace) is intentionally
                // NOT in this list — it routes into the heal block below so
                // the Rundown re-pull can recover the real final instead of
                // stranding the bet. Kept byte-identical to the cron sweep
                // (settlePendingMatches) so a player loading My Bets heals
                // exactly the same way the background worker does — critical
                // when the cron isn't running yet.
                if (!in_array($status, ['finished', 'canceled'], true)) {
                    // Three heal paths, in order of trust; anything that
                    // still can't be proven finished stays pending for an
                    // operator — money never moves on a guess.
                    //   1. looksProvablyFinished — score already on the row,
                    //      just force the terminal status (local, no HTTP).
                    //   2. tryRundownFinalRefetch — re-pull the FINAL from
                    //      Rundown's single-event endpoint (not excluded by
                    //      STATUS_FINAL), which carries the real score +
                    //      by_period (tennis games). Authoritative source,
                    //      bounded by a 180s per-event cooldown so repeated
                    //      My Bets loads can't hammer the upstream.
                    //   3. FallbackScoreService (ESPN) — last resort for the
                    //      leagues Rundown drops but ESPN covers.
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
                    } elseif (self::shouldTryFallbackScore($match)) {
                        if (self::tryRundownFinalRefetch($db, $match)) {
                            $match = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]) ?? $match;
                            $summary['stuckHealed']++;
                            $summary['rundownHealed'] = ($summary['rundownHealed'] ?? 0) + 1;
                        } elseif (FallbackScoreService::tryHealMatch($db, $match)) {
                            $match = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]) ?? $match;
                            $summary['stuckHealed']++;
                            $summary['fallbackHealed'] = ($summary['fallbackHealed'] ?? 0) + 1;
                        } else {
                            continue;
                        }
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

        // Lose-settle THIS user's dead parlays (decisive-lost leg + unfinished
        // sibling) so a player loading My Bets heals stranded tickets the same
        // way the background sweep does. Scoped to the user; bounded query.
        try {
            $deadParlays = self::settleDecisiveLossParlays($db, 200, $settledBy, $userId);
            $summary['decisiveLossChecked'] = $deadParlays['betsChecked'];
            $summary['decisiveLossSettled'] = $deadParlays['betsSettled'];
            $summary['betsSettled'] += $deadParlays['betsSettled'];
            $summary['errors'] += $deadParlays['errors'];
        } catch (Throwable $e) {
            $summary['errors']++;
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
    /**
     * Decide whether a stuck match is worth pinging ESPN about.
     *
     * Only matches that have been alive long enough for the actual game
     * to have ended (≥ minGameSeconds since start). Skips matches that
     * already have a score — looksProvablyFinished would have handled
     * those. Skips obviously-pre-game rows so we don't burn ESPN quota
     * on tomorrow's slate.
     *
     * @param array<string,mixed> $match
     */
    /**
     * Re-pull a stuck match's FINAL straight from Rundown's single-event
     * endpoint and report whether it now carries a terminal status.
     *
     * Why this exists: the live/date sync sends exclude_status=STATUS_FINAL,
     * so a finished game's final score never lands on the matches row and the
     * bet sits pending indefinitely. getEvent() is NOT excluded, so it returns
     * the real final from the SAME authoritative source the bet was priced on
     * (more accurate than the ESPN backup, and it carries tennis by_period
     * games). Idempotent via syncEventFull's upsert; cooldown-gated so the 60s
     * sweep can't hammer the upstream for the same event.
     *
     * @param array<string,mixed> $match
     */
    private static function tryRundownFinalRefetch(SqlRepository $db, array $match): bool
    {
        $eventId = trim((string) ($match['externalId'] ?? ''));
        $matchId = (string) ($match['id'] ?? '');
        if ($eventId === '' || $matchId === '' || !RundownClient::isConfigured()) {
            return false;
        }
        // At most one upstream getEvent per event per cooldown window, even
        // though the sweep runs every ~60s and may see the same stuck match
        // for hours until the operator or the next final lands.
        SharedFileCache::remember(
            'rundown-final-refetch',
            $eventId,
            180,
            static function () use ($db, $eventId): array {
                try {
                    $r = RundownSyncService::syncEventFull($db, $eventId);
                    return ['ok' => (bool) ($r['ok'] ?? false), 'at' => time()];
                } catch (Throwable $e) {
                    Logger::warning('rundown final refetch failed', [
                        'eventId' => $eventId,
                        'error'   => $e->getMessage(),
                    ], 'bets');
                    return ['ok' => false, 'at' => time()];
                }
            }
        );
        $fresh = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
        $status = strtolower((string) ($fresh['status'] ?? ''));
        return in_array($status, ['finished', 'canceled', 'cancelled'], true);
    }

    /**
     * Final player box score for prop settlement, or null. Feature-flagged
     * (SPORTSBOOK_PROP_SETTLEMENT_ENABLED, default OFF): disabled → returns null
     * so every prop leg stays pending (today's behavior). Cached per event for a
     * short window so a sweep doesn't re-hit the upstream for the same game.
     * Never throws — any failure returns null (→ the prop stays pending, never a
     * guessed grade).
     *
     * @param array<string,mixed> $match
     * @return array<string,mixed>|null
     */
    private static function fetchPlayerStatsForMatch(array $match): ?array
    {
        $flag = strtolower(trim((string) (Env::get('SPORTSBOOK_PROP_SETTLEMENT_ENABLED', 'false') ?? 'false')));
        if ($flag !== 'true' && $flag !== '1') {
            return null; // feature off → props stay pending
        }
        $eventId = trim((string) ($match['externalId'] ?? ''));
        if ($eventId === '' || !RundownClient::isConfigured()) {
            return null;
        }
        try {
            $cached = SharedFileCache::remember(
                'rundown-player-stats',
                $eventId,
                120,
                static function () use ($eventId): array {
                    $stats = RundownClient::getPlayerGameStats($eventId);
                    return ['stats' => is_array($stats) ? $stats : null];
                }
            );
            $stats = $cached['stats'] ?? null;
            return is_array($stats) ? $stats : null;
        } catch (Throwable $e) {
            Logger::warning('player-stats fetch failed', [
                'eventId' => $eventId,
                'error'   => $e->getMessage(),
            ], 'settlement');
            return null;
        }
    }

    private static function shouldTryFallbackScore(array $match, ?int $nowTs = null): bool
    {
        $now = $nowTs ?? time();
        $startTs = strtotime((string) ($match['startTime'] ?? '')) ?: 0;
        if ($startTs <= 0) return false;
        $minGameSeconds = 90 * 60; // shortest realistic game length
        if (($now - $startTs) < $minGameSeconds) return false;
        $homeScore = self::num($match['score']['score_home'] ?? 0);
        $awayScore = self::num($match['score']['score_away'] ?? 0);
        if (($homeScore + $awayScore) > 0) return false;
        return true;
    }

    public static function looksProvablyFinished(array $match, ?int $nowTs = null): bool
    {
        $now = $nowTs ?? time();
        $startTs = strtotime((string) ($match['startTime'] ?? '')) ?: 0;
        $homeScore = self::num($match['score']['score_home'] ?? 0);
        $awayScore = self::num($match['score']['score_away'] ?? 0);
        $hasScore = ($homeScore + $awayScore) > 0;

        $minGameSeconds     = 90 * 60;      // 90 min — shortest realistic game length
        $maxGameSeconds     = 6 * 3600;     // 6 h backstop — past this any real sport is over
        $scoreFrozenSeconds = 30 * 60;      // 30 min of zero score movement

        if (!$hasScore || $startTs <= 0 || ($now - $startTs) < $minGameSeconds) {
            return false;
        }

        // Primary signal: the score itself has not moved for the freeze
        // window. The odds sync bumps lastScoreChangedAt only when the
        // home/away values actually change, so this is robust against the
        // upstream feed re-stamping the same final score every poll — the
        // failure mode that left lastUpdated permanently fresh and kept
        // bets like the KBO Landers ticket stuck pending.
        $changedRaw = (string) ($match['lastScoreChangedAt'] ?? '');
        $changedTs = $changedRaw !== '' ? (strtotime($changedRaw) ?: 0) : 0;
        if ($changedTs > 0 && ($now - $changedTs) >= $scoreFrozenSeconds) {
            return true;
        }

        // Backstop for legacy rows that never received lastScoreChangedAt
        // (pre-tracking) or for feeds that fabricate fresh-score writes
        // even when nothing changed: any match that started ≥ 6 h ago and
        // has a non-zero score is finished by any measure. Combined with
        // the $minGameSeconds + $hasScore guards above this is safe — we
        // grade against the final score already stored in the matches row.
        return ($now - $startTs) >= $maxGameSeconds;
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
            'stuckHealed' => 0,
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
                // Only settle matches that have a confirmed outcome:
                //   'finished' → grade against the final score
                //   'canceled' → void with refund (explicit cancel signal)
                // 'expired' is intentionally excluded — that status is the
                // "feed went quiet past the grace window" catch-all, which
                // used to auto-void any open bet and silently refund. Now
                // those matches stay pending so an operator can confirm
                // the actual outcome and grade manually before money
                // moves. SportsbookBetSupport::selectionResult was updated
                // in lockstep so it no longer returns 'void' for expired.
                if (!in_array($status, ['finished', 'canceled'], true)) {
                    // Stuck-match heal in the cron sweep. Mirrors the
                    // settlePendingMatchesForUser path so background
                    // settlement no longer requires a player to load
                    // My Bets — without this the sweep was checking
                    // the same stuck matches every cycle and settling
                    // none of them, since the upstream feed keeps the
                    // status pinned to 'live' indefinitely after the
                    // real game ended. looksProvablyFinished is
                    // conservative (score frozen 30 min OR started
                    // ≥6 h ago) and settleMatch is idempotent.
                    if (self::looksProvablyFinished($match)) {
                        $db->updateOne('matches', ['id' => SqlRepository::id($matchId)], [
                            'status' => 'finished',
                            'updatedAt' => SqlRepository::nowUtc(),
                            'autoFinishedReason' => 'stuck-pending-heal-sweep',
                        ]);
                        $summary['stuckHealed']++;
                        Logger::info('auto-healed stuck match in cron sweep', [
                            'matchId' => $matchId,
                            'startTime' => $match['startTime'] ?? null,
                            'lastScoreChangedAt' => $match['lastScoreChangedAt'] ?? null,
                            'score' => $match['score'] ?? null,
                        ], 'bets');
                    } elseif (self::shouldTryFallbackScore($match)) {
                        // The live/date sync sets exclude_status=STATUS_FINAL,
                        // so once a game ends its final score never lands on
                        // the row and the bet sits pending forever — tennis
                        // especially, where ESPN's backup often doesn't cover
                        // lower-tier events. So try the PRIMARY source first:
                        // re-pull the event straight from Rundown's single-
                        // event endpoint (getEvent is NOT excluded and returns
                        // the real final + score/by_period). Fall back to ESPN
                        // only if Rundown still has no terminal result. Either
                        // way we then settle on the same tick.
                        if (self::tryRundownFinalRefetch($db, $match)) {
                            $match = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]) ?? $match;
                            $summary['stuckHealed']++;
                            $summary['rundownHealed'] = ($summary['rundownHealed'] ?? 0) + 1;
                        } elseif (FallbackScoreService::tryHealMatch($db, $match)) {
                            $match = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]) ?? $match;
                            $summary['stuckHealed']++;
                            $summary['fallbackHealed'] = ($summary['fallbackHealed'] ?? 0) + 1;
                        } else {
                            continue;
                        }
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

        // Sweep dead parlays: a decisively-lost leg + an unfinished sibling leg.
        // The match loop above only routes matches with PENDING legs, so these
        // tickets would otherwise sit open forever with their risk stuck in
        // pendingBalance. Lose-settle them now (evaluateTicket short-circuits to
        // 'lost'). Failures are counted, never fatal to the sweep summary.
        try {
            $deadParlays = self::settleDecisiveLossParlays($db, $limit, $settledBy);
            $summary['decisiveLossChecked'] = $deadParlays['betsChecked'];
            $summary['decisiveLossSettled'] = $deadParlays['betsSettled'];
            $summary['betsSettled'] += $deadParlays['betsSettled'];
            $summary['errors'] += $deadParlays['errors'];
        } catch (Throwable $e) {
            $summary['errors']++;
        }

        return $summary;
    }

    /**
     * DISPLAY-ONLY backfill of per-leg W/L on ALREADY-TERMINAL combined tickets
     * (PO 2026-07-19). When a decisive loss settles a parlay, the sibling legs
     * are closed (status 'closed', gradeReason 'ticket_terminal') WITHOUT being
     * graded — so a leg whose game finishes later never shows its actual result
     * ("show me what happened on each pick"). This pass grades those orphaned
     * legs for display once their match is final.
     *
     * ⚠️ ZERO MONEY CONTACT — this method must NEVER move money or change a
     * ticket's outcome. It writes ONLY leg-level display fields on
     * `betselections` rows + the bet doc's `selections` array. It does NOT touch
     * users.balance / pendingBalance / freeplayBalance, the `transactions`
     * ledger, or bets.{status,result,payout,potentialPayout,settledAt}; it never
     * calls evaluateTicket, the settle/payout block, or BalanceUpdateService.
     * The ticket is already terminal and its payout is frozen — grading the
     * remaining legs is informational only. Reuses the SAME pure grader the real
     * settle path uses (selectionResultDetailed / settledScorePair).
     *
     * Fossil-loop-safe: a graded leg flips 'closed' → won/lost/void and leaves
     * the candidate set, so it is never re-scanned; a leg whose match is not yet
     * final stays 'closed' and is retried on a later pass.
     *
     * @return array{legsChecked:int, legsGraded:int, betsTouched:int, errors:int}
     */
    public static function backfillTerminalLegDisplay(SqlRepository $db, int $lookbackDays = 45, int $limit = 200): array
    {
        $summary = ['legsChecked' => 0, 'legsGraded' => 0, 'betsTouched' => 0, 'errors' => 0];

        // Candidate legs: orphaned by the terminal-close, within the lookback.
        $since = gmdate('c', time() - max(1, $lookbackDays) * 86400);
        $rows = $db->findMany('betselections', [
            'status'      => 'closed',
            'gradeReason' => 'ticket_terminal',
            'updatedAt'   => ['$gte' => $since],
        ], ['projection' => ['betId' => 1], 'limit' => max(1, $limit)]);

        // Distinct parent bets to process.
        $betIds = [];
        foreach ($rows as $r) {
            $bid = is_array($r) ? (string) ($r['betId'] ?? '') : '';
            if ($bid !== '' && preg_match('/^[a-f0-9]{24}$/i', $bid) === 1) {
                $betIds[$bid] = true;
            }
        }

        $matchCache = [];
        foreach (array_keys($betIds) as $betId) {
            try {
                $db->beginTransaction();
                $bet = $db->findOne('bets', ['id' => SqlRepository::id($betId)]);
                if ($bet === null) {
                    $db->rollback();
                    continue;
                }
                // HARD GUARD: only touch tickets that are ALREADY terminal. A
                // pending/open ticket must go through the real settle path — this
                // display pass must never grade a leg that could move money.
                $betStatus = strtolower((string) ($bet['status'] ?? ''));
                if (!in_array($betStatus, ['won', 'lost', 'void', 'partial'], true)) {
                    $db->rollback();
                    continue;
                }

                $rowsForBet = SportsbookBetSupport::ensureSelectionRowsForBet($db, $bet);
                $dirty = false;
                foreach ($rowsForBet as $idx => $row) {
                    if (!is_array($row) || (string) ($row['status'] ?? '') !== 'closed') {
                        continue;
                    }
                    $matchId = (string) ($row['matchId'] ?? '');
                    if ($matchId === '' || preg_match('/^[a-f0-9]{24}$/i', $matchId) !== 1) {
                        continue;
                    }
                    $summary['legsChecked']++;

                    if (!array_key_exists($matchId, $matchCache)) {
                        $matchCache[$matchId] = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
                    }
                    $match = $matchCache[$matchId];
                    if ($match === null) {
                        continue;
                    }
                    $mStatus = (string) (SportsMatchStatus::annotate($match)['status'] ?? '');
                    if (!in_array($mStatus, ['finished', 'canceled'], true)) {
                        continue; // game not final → leave 'closed', retry later
                    }

                    // Same pure grader the real settle loop uses. playerStats is
                    // null → a prop leg that needs a box score returns 'pending'
                    // and is left closed (team-market legs grade fine).
                    $detailed = SportsbookBetSupport::selectionResultDetailed($match, $row);
                    $status = (string) ($detailed['status'] ?? 'pending');
                    if ($status === 'pending') {
                        continue; // ungradeable → leave closed
                    }
                    $fraction = (float) ($detailed['settleFraction'] ?? 1.0);
                    [$legHome, $legAway] = SportsbookBetSupport::settledScorePair($match, $row);
                    $gradeReason = $status === 'void'
                        ? SportsbookBetSupport::gradeReasonForVoidLeg($match, $row)
                        : null;
                    $gradedAt = SqlRepository::nowUtc();

                    // Leg-level display write on the betselections row.
                    $db->updateOne('betselections', ['id' => SqlRepository::id((string) ($row['id'] ?? ''))], [
                        'status'         => $status,
                        'settleFraction' => $fraction,
                        'finalHomeScore' => $legHome,
                        'finalAwayScore' => $legAway,
                        'gradeReason'    => $gradeReason,
                        'settledAt'      => $gradedAt,
                        'updatedAt'      => $gradedAt,
                    ]);
                    // Reflect in the in-memory row so the bet-doc rebuild sees it.
                    $rowsForBet[$idx]['status'] = $status;
                    $rowsForBet[$idx]['settleFraction'] = $fraction;
                    $rowsForBet[$idx]['finalHomeScore'] = $legHome;
                    $rowsForBet[$idx]['finalAwayScore'] = $legAway;
                    $rowsForBet[$idx]['gradeReason'] = $gradeReason;
                    $rowsForBet[$idx]['settledAt'] = $gradedAt;
                    $dirty = true;
                    $summary['legsGraded']++;
                }

                if ($dirty) {
                    // DISPLAY source: rebuild ONLY the bet doc's selections array
                    // from the graded rows (same helper the settle loop uses).
                    // No other bet field is written — status/payout stay frozen.
                    $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                        'selections' => SportsbookBetSupport::selectionRowsToBetSelections($bet, $rowsForBet),
                        'updatedAt'  => SqlRepository::nowUtc(),
                    ]);
                    $db->commit();
                    $summary['betsTouched']++;
                } else {
                    $db->rollback();
                }
            } catch (Throwable $e) {
                try { $db->rollback(); } catch (Throwable $_) {}
                $summary['errors']++;
                Logger::warning('terminal leg display backfill failed', [
                    'betId' => $betId,
                    'error' => $e->getMessage(),
                ], 'settlement');
            }
        }

        return $summary;
    }

    /**
     * Discovery + settle pass for "zombie" parlays: a parlay (or open parlay)
     * that is already DEAD — it holds a decisively-lost leg (status 'lost',
     * settleFraction >= 1.0) — but still sits status pending/open because a
     * SIBLING leg's game has not finished yet. settlePendingMatches /
     * settlePendingMatchesForUser discover work from PENDING betselections and
     * route through settleMatch, which only grades a match's pending legs; the
     * dead parlay's lost leg is not pending and its surviving leg's match is not
     * finished, so the ticket would never be re-evaluated and stays open forever
     * with its risk stuck in pendingBalance. This pass finds those tickets
     * directly and lose-settles them now — evaluateTicket's decisive-loss
     * short-circuit already returns 'lost', so no further legs need to resolve.
     *
     * Scope: type 'parlay' only (covers ordinary parlays AND open parlays, which
     * are stored type='parlay' status='open'). Straight bets settle on their own
     * match; teaser/if_bet/reverse settle via different paths and are
     * intentionally untouched. A HALF-loss (settleFraction < 1.0, soccer Asian
     * quarter) is NOT decisive (SportsbookBetSupport::isDecisiveLoss) and is
     * never force-settled here.
     *
     * Money safety: a decisive-loss ticket always evaluates to 'lost' (payout
     * $0) — no payout, no balance credit. Settlement only releases the losing
     * stake reservation from pendingBalance (and debits a credit account's
     * balance to record the debt), mirroring settleMatch's LOSS branch. Each
     * ticket is locked FOR UPDATE and re-checked still pending/open before any
     * write, so a ticket already settled by the match path or a concurrent run
     * is skipped — never double-settled, never double-released.
     *
     * @return array<string, mixed>
     */
    public static function settleDecisiveLossParlays(SqlRepository $db, int $limit = 250, string $settledBy = 'system', ?string $userId = null): array
    {
        $summary = ['betsChecked' => 0, 'betsSettled' => 0, 'errors' => 0];

        $criteria = ['status' => ['$in' => ['pending', 'open']], 'type' => 'parlay'];
        if ($userId !== null) {
            if (preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                return $summary;
            }
            $criteria['userId'] = SqlRepository::id($userId);
        }

        $candidates = $db->findMany('bets', $criteria, [
            'projection' => ['id' => 1],
            'limit' => max(1, $limit),
        ]);

        $teaserRule = self::getTeaserRule($db);
        foreach ($candidates as $candidate) {
            $betId = (string) ($candidate['id'] ?? '');
            if ($betId === '' || preg_match('/^[a-f0-9]{24}$/i', $betId) !== 1) {
                continue;
            }
            $summary['betsChecked']++;
            try {
                if (self::settleDecisivelyLostParlay($db, $betId, $teaserRule, $settledBy)) {
                    $summary['betsSettled']++;
                }
            } catch (Throwable $e) {
                $summary['errors']++;
            }
        }

        return $summary;
    }

    /**
     * Lose-settle a single dead parlay (see settleDecisiveLossParlays). Returns
     * true only when the ticket was actually settled this call. All money
     * movement mirrors the LOSS branch of settleMatch and must stay in lockstep
     * with it — if that branch changes, change this too.
     */
    private static function settleDecisivelyLostParlay(SqlRepository $db, string $betId, array $teaserRule, string $settledBy): bool
    {
        $db->beginTransaction();
        try {
            $bet = $db->findOneForUpdate('bets', ['id' => SqlRepository::id($betId)]);
            if ($bet === null) {
                $db->rollback();
                return false;
            }
            // Idempotency / terminal guard, re-checked AFTER the row lock: only an
            // open/pending ticket can settle. A ticket the normal match path (or
            // a concurrent sweep) already settled is skipped — no double-settle.
            $betStatus = (string) ($bet['status'] ?? '');
            $isOpenParlayTicket = OpenParlayService::isGradableOpenTicket($bet);
            if ($betStatus !== 'pending' && !$isOpenParlayTicket) {
                $db->rollback();
                return false;
            }
            if ((string) ($bet['type'] ?? '') !== 'parlay') {
                $db->rollback();
                return false;
            }

            $userId = (string) ($bet['userId'] ?? '');
            if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                $db->rollback();
                return false;
            }
            $user = $db->findOneForUpdate('users', ['id' => SqlRepository::id($userId)]);
            if ($user === null) {
                $db->rollback();
                return false;
            }

            $selectionRows = SportsbookBetSupport::ensureSelectionRowsForBet($db, $bet);

            // Must actually carry a DECISIVE loss — otherwise this is not a dead
            // ticket and money must not move. Half-loss (fraction < 1.0) is not
            // decisive and never triggers here.
            $hasDecisiveLoss = false;
            foreach ($selectionRows as $row) {
                if (is_array($row) && SportsbookBetSupport::isDecisiveLoss($row)) {
                    $hasDecisiveLoss = true;
                    break;
                }
            }
            if (!$hasDecisiveLoss) {
                $db->rollback();
                return false;
            }

            $normalizedSelections = SportsbookBetSupport::selectionRowsToBetSelections($bet, $selectionRows);
            $evaluation = SportsbookBetSupport::evaluateTicket(
                array_merge($bet, ['selections' => $normalizedSelections]),
                $selectionRows,
                $teaserRule
            );
            // Hard safety gate: only settle a CONFIRMED loss. evaluateTicket's
            // decisive-loss short-circuit returns 'lost' for a dead parlay; if it
            // returns anything else, leave the ticket alone — money never moves
            // on a guess.
            if ((string) ($evaluation['status'] ?? '') !== 'lost') {
                $db->rollback();
                return false;
            }

            $now = SqlRepository::nowUtc();
            $ticketPayout = 0.0; // a decisive loss pays nothing

            // ── LOSS settlement — mirrors settleMatch's loss branch ──────────────
            $riskAmount      = SportsbookBetSupport::riskAmount($bet);
            $isFreeplay      = (bool) ($bet['isFreeplay'] ?? false);
            $freeplayUsed    = self::num($bet['freeplayAmountUsed'] ?? ($isFreeplay ? $riskAmount : 0));
            $freeplayUsed    = max(0.0, min($freeplayUsed, $riskAmount));
            $realPortion     = (float) max(0.0, $riskAmount - $freeplayUsed);
            $balance         = self::num($user['balance'] ?? 0);
            $pendingBalance  = self::num($user['pendingBalance'] ?? 0);
            $freeplayBalance = self::num($user['freeplayBalance'] ?? 0);
            $acceptedPayout  = self::num($bet['acceptedPayout'] ?? ($bet['potentialPayout'] ?? 0));

            $creditLimit     = self::num($user['creditLimit'] ?? 0);
            $userRole        = strtolower((string) ($user['role'] ?? 'user'));
            $isCreditAccount = $realPortion > 0 && $userRole === 'user' && $creditLimit > 0;

            // Only the real-balance portion was held in pendingBalance at
            // placement; the freeplay portion never touched pending.
            $newPendingBalance = max(0.0, $pendingBalance - $realPortion);

            $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                'selections'      => $normalizedSelections,
                'status'          => 'lost',
                'result'          => 'lost',
                'settledAt'       => $now,
                'settledBy'       => $settledBy,
                'acceptedPayout'  => $acceptedPayout > 0 ? $acceptedPayout : $ticketPayout,
                'potentialPayout' => $ticketPayout,
                'combinedOdds'    => SportsbookBetSupport::combinedOdds($riskAmount, $ticketPayout),
                'updatedAt'       => $now,
            ]);

            // The unfinished sibling legs are what made this ticket reach this
            // path at all — close their rows (same transaction) so their
            // matches leave the settlement sweep's candidate set for good.
            self::closePendingSelectionRowsForTerminalTicket($db, $betId);

            $userUpdate        = ['pendingBalance' => $newPendingBalance, 'updatedAt' => $now];
            $transactionType   = $isFreeplay ? 'fp_bet_lost' : 'bet_lost';
            $transactionAmount = $riskAmount;
            $balanceBefore     = $isFreeplay ? $freeplayBalance : $balance;
            $balanceAfter      = $isFreeplay ? $freeplayBalance : $balance; // default: no change
            $description       = strtoupper((string) ($bet['type'] ?? 'parlay')) . ($isFreeplay ? ' freeplay' : '') . ' bet lost';

            // Cash accounts already debited the real stake at placement → no-op.
            // Credit accounts held the real stake in pending only and must now
            // debit balance to record the debt. Mirrors settleMatch line ~496.
            if ($isCreditAccount && $realPortion > 0) {
                $balanceBefore = $balance;
                $balanceAfter  = (float) round($balance - $realPortion);
                $userUpdate['balance'] = $balanceAfter;
                $description = strtoupper((string) ($bet['type'] ?? 'parlay')) . ' bet lost - balance debited (credit account)';
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

            $db->commit();

            // Free the pendingBalance from APCu immediately. After commit —
            // best-effort, never rolls back the money write.
            if (function_exists('apcu_delete')) {
                @apcu_delete('ua:users:' . $userId);
            }

            // Realtime push so My Bets flips open/pending → lost without waiting
            // for the poll. After commit — a failed broadcast never rolls back.
            if (class_exists('RealtimeEventBus')) {
                try {
                    RealtimeEventBus::publish('bet:settled', [
                        'userId' => $userId,
                        'betId' => $betId,
                        'status' => 'lost',
                        'source' => 'decisive-loss',
                        'time' => $now,
                    ]);
                } catch (Throwable $_) {
                    // Polling fallback covers any missed push.
                }
            }

            // Keep a Round Robin parent's aggregate status in sync, like the
            // match settle path. Outside the committed write — a recompute
            // failure must not roll back a durable settlement.
            $parentGroupId = (string) ($bet['parentGroupId'] ?? '');
            if ($parentGroupId !== '' && class_exists('RoundRobinService')) {
                try {
                    RoundRobinService::recomputeGroupStatus($db, $parentGroupId);
                } catch (Throwable $rrErr) {
                    // Non-fatal — the child status is already correct.
                }
            }

            return true;
        } catch (Throwable $e) {
            $db->rollback();
            throw $e;
        }
    }

    /**
     * Close every still-'pending' selection ROW of a ticket that has reached a
     * terminal status. betselections is the settlement sweep's discovery index
     * — a leg row left 'pending' after its ticket died keeps that leg's match
     * in settlePendingMatches' candidate set on every pass, forever (the
     * 2026-07-10 fossil-loop incident). Status 'closed' is deliberately NOT a
     * grade: no money moves, graders never read rows of terminal tickets, and
     * the bet doc's selections array (what My Bets renders) is not touched.
     * Runs inside the caller's open transaction so the stamp commits (or rolls
     * back) atomically with the settlement. Filter uses the j_bet_id/j_status
     * generated columns — indexed, bounded by the ticket's leg count.
     */
    private static function closePendingSelectionRowsForTerminalTicket(SqlRepository $db, string $betId): int
    {
        if ($betId === '' || preg_match('/^[a-f0-9]{24}$/i', $betId) !== 1) {
            return 0;
        }
        return $db->updateMany('betselections', [
            'betId' => SqlRepository::id($betId),
            'status' => 'pending',
        ], [
            'status' => 'closed',
            'gradeReason' => 'ticket_terminal',
            'updatedAt' => SqlRepository::nowUtc(),
        ]);
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
