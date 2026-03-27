<?php

declare(strict_types=1);

final class BetSettlementService
{
    public static function manualWinnerEligibility(MongoRepository $db, string $matchId): array
    {
        self::assertValidMatchId($matchId);

        $match = $db->findOne('matches', ['id' => MongoRepository::id($matchId)]);
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
            'matchId' => MongoRepository::id($matchId),
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

    public static function settleMatch(MongoRepository $db, string $matchId, ?string $manualWinner = null, string $settledBy = 'system'): array
    {
        try {
            self::assertValidMatchId($matchId);

            $match = $db->findOne('matches', ['id' => MongoRepository::id($matchId)]);
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
                'matchId' => MongoRepository::id($matchId),
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

                    $bet = $db->findOneForUpdate('bets', ['id' => MongoRepository::id($betId)]);
                    if ($bet === null || (string) ($bet['status'] ?? '') !== 'pending') {
                        $db->rollback();
                        continue;
                    }

                    $userId = (string) ($bet['userId'] ?? '');
                    if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                        $db->rollback();
                        continue;
                    }

                    $user = $db->findOneForUpdate('users', ['id' => MongoRepository::id($userId)]);
                    if ($user === null) {
                        $db->rollback();
                        continue;
                    }

                    $selectionRows = SportsbookBetSupport::ensureSelectionRowsForBet($db, $bet);
                    $updatedRows = [];
                    $selectionDirty = false;
                    $now = MongoRepository::nowUtc();

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
                                }
                                $db->updateOne('betselections', ['id' => MongoRepository::id((string) ($row['id'] ?? ''))], [
                                    'status' => $resolvedStatus,
                                    'updatedAt' => $row['updatedAt'],
                                    'settledAt' => $row['settledAt'] ?? null,
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
                    $ticketPayout = round(self::num($evaluation['payout'] ?? 0));

                    if ($ticketStatus === 'pending') {
                        $db->updateOne('bets', ['id' => MongoRepository::id($betId)], [
                            'selections' => $normalizedSelections,
                            'updatedAt' => $now,
                        ]);
                        $db->commit();
                        continue;
                    }

                    $riskAmount     = SportsbookBetSupport::riskAmount($bet);
                    $isFreeplay     = (bool) ($bet['isFreeplay'] ?? false);
                    $balance        = self::num($user['balance'] ?? 0);
                    $pendingBalance = self::num($user['pendingBalance'] ?? 0);
                    $freeplayBalance = self::num($user['freeplayBalance'] ?? 0);
                    $acceptedPayout = self::num($bet['acceptedPayout'] ?? ($bet['potentialPayout'] ?? 0));

                    // Freeplay bets never touched pendingBalance at placement, so don't adjust it.
                    $newPendingBalance = $isFreeplay
                        ? $pendingBalance
                        : max(0.0, $pendingBalance - $riskAmount);

                    $db->updateOne('bets', ['id' => MongoRepository::id($betId)], [
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
                        if ($isFreeplay) {
                            // Refund the freeplay stake back to freeplayBalance
                            $balanceAfter = $freeplayBalance + $riskAmount;
                            $userUpdate['freeplayBalance'] = $balanceAfter;
                            $transactionType = 'fp_bet_void';
                        } else {
                            $balanceAfter = $balance + $riskAmount;
                            $userUpdate['balance'] = $balanceAfter;
                            $transactionType = 'bet_void';
                        }
                        $transactionAmount = $riskAmount;
                        $description = strtoupper((string) ($bet['type'] ?? 'straight')) . ($isFreeplay ? ' freeplay' : '') . ' bet voided - wager refunded';
                        $results['voided']++;
                    } elseif ($ticketStatus === 'won') {
                        if ($isFreeplay) {
                            // Freeplay win: credit PROFIT ONLY to real balance (stake is not returned).
                            // e.g. $10 freeplay wins $25 payout → user gets $15 profit in real balance.
                            $profit = max(0.0, $ticketPayout - $riskAmount);
                            $balanceBefore = $balance;
                            $balanceAfter  = $balance + $profit;
                            $userUpdate['balance'] = $balanceAfter;
                            $userUpdate['totalWinnings'] = self::num($user['totalWinnings'] ?? 0) + $profit;
                            $transactionType  = 'fp_bet_won';
                            $transactionAmount = $profit;
                            $description = strtoupper((string) ($bet['type'] ?? 'straight')) . ' freeplay bet won - profit credited';
                        } else {
                            $balanceBefore = $balance;
                            $balanceAfter  = $balance + $ticketPayout;
                            $userUpdate['balance'] = $balanceAfter;
                            $userUpdate['totalWinnings'] = self::num($user['totalWinnings'] ?? 0) + max(0, $ticketPayout - $riskAmount);
                            $transactionType  = 'bet_won';
                            $transactionAmount = $ticketPayout;
                            $description = strtoupper((string) ($bet['type'] ?? 'straight')) . ' bet won';
                        }
                        $results['won']++;
                    } else {
                        $results['lost']++;
                    }

                    $db->updateOne('users', ['id' => MongoRepository::id($userId)], $userUpdate);
                    $db->insertOne('transactions', [
                        'userId'        => MongoRepository::id($userId),
                        'amount'        => $transactionAmount,
                        'type'          => $transactionType,
                        'status'        => 'completed',
                        'isFreeplay'    => $isFreeplay,
                        'balanceBefore' => $balanceBefore,
                        'balanceAfter'  => $balanceAfter,
                        'referenceType' => 'Bet',
                        'referenceId'   => MongoRepository::id($betId),
                        'reason'        => strtoupper($transactionType),
                        'description'   => $description,
                        'createdAt'     => $now,
                        'updatedAt'     => $now,
                    ]);

                    $results['settledBetIds'][] = $betId;
                    $db->commit();
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
    public static function settlePendingMatches(MongoRepository $db, int $limit = 250, string $settledBy = 'system'): array
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
            'expiredSkipped' => 0,
            'matchIds' => array_keys($matchIds),
        ];

        foreach (array_keys($matchIds) as $matchId) {
            try {
                $match = $db->findOne('matches', ['id' => MongoRepository::id($matchId)]);
                if ($match === null) {
                    continue;
                }
                $summary['matchesChecked']++;
                $annotated = SportsMatchStatus::annotate($match);
                $status = (string) ($annotated['status'] ?? '');
                if ($status === 'expired') {
                    $summary['expiredSkipped']++;
                    continue;
                }
                if (!in_array($status, ['finished', 'canceled'], true)) {
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

    private static function backfillPendingSelectionsForMatch(MongoRepository $db, string $matchId): void
    {
        $pendingBets = $db->findMany('bets', [
            'status' => 'pending',
            '$or' => [
                ['matchId' => MongoRepository::id($matchId)],
                ['selections.matchId' => MongoRepository::id($matchId)],
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
    private static function getTeaserRule(MongoRepository $db): array
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
