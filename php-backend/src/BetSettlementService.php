<?php

declare(strict_types=1);


final class BetSettlementService
{
    public static function settleMatch(MongoRepository $db, string $matchId, ?string $manualWinner = null, string $settledBy = 'system'): array
    {
        if (preg_match('/^[a-f0-9]{24}$/i', $matchId) !== 1) {
            throw new RuntimeException('Match not found');
        }

        $match = $db->findOne('matches', ['_id' => MongoRepository::id($matchId)]);
        if ($match === null) {
            throw new RuntimeException('Match not found');
        }

        $pendingBets = $db->findMany('bets', [
            'status' => 'pending',
            '$or' => [
                ['matchId' => MongoRepository::id($matchId)],
                ['selections.matchId' => MongoRepository::id($matchId)],
            ],
        ]);

        $results = [
            'total' => count($pendingBets),
            'won' => 0,
            'lost' => 0,
            'voided' => 0,
            'errors' => 0,
        ];

        if (count($pendingBets) === 0) {
            return $results;
        }

        $scoreHome = (float) ($match['score']['score_home'] ?? 0);
        $scoreAway = (float) ($match['score']['score_away'] ?? 0);
        $totalScore = $scoreHome + $scoreAway;
        $isFinished = (($match['status'] ?? '') === 'finished');

        foreach ($pendingBets as $bet) {
            if (!isset($bet['userId']) || !is_string($bet['userId']) || preg_match('/^[a-f0-9]{24}$/i', $bet['userId']) !== 1) {
                continue;
            }

            try {
                $db->beginTransaction();

                $user = $db->findOneForUpdate('users', ['_id' => MongoRepository::id($bet['userId'])]);
                if ($user === null) {
                    $db->rollback();
                    continue;
                }

                $betType = strtolower((string) ($bet['type'] ?? 'straight'));
                $selections = is_array($bet['selections'] ?? null) ? $bet['selections'] : [];
                $betDirty = false;

                foreach ($selections as $idx => $leg) {
                    $legMatchId = (string) ($leg['matchId'] ?? '');
                    $legStatus = (string) ($leg['status'] ?? 'pending');

                    if ($legMatchId === $matchId && $legStatus === 'pending') {
                        $res = self::getLegResult($leg, $match, $manualWinner, $isFinished, $scoreHome, $scoreAway, $totalScore);
                        if ($res !== 'pending') {
                            $selections[$idx]['status'] = $res;
                            $betDirty = true;
                        }
                    }
                }

                if (!$betDirty) {
                    $db->rollback();
                    continue;
                }

                $finalStatus = 'pending';
                if ($betType === 'straight') {
                    $finalStatus = (string) ($selections[0]['status'] ?? 'pending');
                } elseif ($betType === 'parlay' || $betType === 'teaser') {
                    $legStatuses = array_map(fn ($l) => (string) ($l['status'] ?? 'pending'), $selections);
                    if (in_array('lost', $legStatuses, true)) {
                        $finalStatus = 'lost';
                    } elseif (self::allWonOrVoid($legStatuses)) {
                        if (self::allVoid($legStatuses)) {
                            $finalStatus = 'void';
                        } elseif (in_array('pending', $legStatuses, true)) {
                            $finalStatus = 'pending';
                        } else {
                            $finalStatus = 'won';
                        }
                    }
                } elseif ($betType === 'if_bet') {
                    foreach ($selections as $i => $leg) {
                        $legStatus = (string) ($leg['status'] ?? 'pending');
                        if ($legStatus === 'lost') {
                            $finalStatus = 'lost';
                            break;
                        }
                        if ($legStatus === 'pending') {
                            $finalStatus = 'pending';
                            break;
                        }
                        if ($i === (count($selections) - 1) && $legStatus === 'won') {
                            $finalStatus = 'won';
                        }
                    }
                }

                if ($finalStatus === 'pending') {
                    $db->updateOne('bets', ['_id' => MongoRepository::id((string) $bet['_id'])], [
                        'selections' => self::normalizeSelectionsForUpdate($selections),
                        'updatedAt' => MongoRepository::nowUtc(),
                    ]);
                    $db->commit();
                    continue;
                }

                $wager = self::num($bet['amount'] ?? 0);
                $balance = self::num($user['balance'] ?? 0);
                $pending = self::num($user['pendingBalance'] ?? 0);
                $potentialPayout = self::num($bet['potentialPayout'] ?? 0);

                if ($finalStatus === 'won' && ($betType === 'parlay' || $betType === 'teaser')) {
                    $legStatuses = array_map(fn ($l) => (string) ($l['status'] ?? 'pending'), $selections);
                    if (in_array('void', $legStatuses, true)) {
                        if ($betType === 'parlay') {
                            $combined = 1.0;
                            foreach ($selections as $leg) {
                                if ((string) ($leg['status'] ?? '') === 'won') {
                                    $combined *= self::num($leg['odds'] ?? 0);
                                }
                            }
                            $potentialPayout = $wager * $combined;
                        } else {
                            $wonCount = 0;
                            foreach ($selections as $leg) {
                                if ((string) ($leg['status'] ?? '') === 'won') {
                                    $wonCount++;
                                }
                            }
                            $teaserRule = self::getTeaserRule($db);
                            $potentialPayout = $wager * self::getTeaserMultiplier($teaserRule, $wonCount);
                        }
                    }
                }

                $db->updateOne('bets', ['_id' => MongoRepository::id((string) $bet['_id'])], [
                    'selections' => self::normalizeSelectionsForUpdate($selections),
                    'status' => $finalStatus,
                    'result' => $finalStatus,
                    'settledAt' => MongoRepository::nowUtc(),
                    'settledBy' => $settledBy,
                    'potentialPayout' => $potentialPayout,
                    'updatedAt' => MongoRepository::nowUtc(),
                ]);

                $now = MongoRepository::nowUtc();
                $userIdStr = MongoRepository::id((string) $user['_id']);
                $betIdStr = MongoRepository::id((string) $bet['_id']);

                if ($finalStatus === 'void') {
                    $newBalance = $balance + $wager;
                    $db->updateOne('users', ['_id' => $userIdStr], [
                        'balance' => $newBalance,
                        'pendingBalance' => max(0, $pending - $wager),
                        'updatedAt' => $now,
                    ]);
                    $db->insertOne('transactions', [
                        'userId' => $userIdStr,
                        'amount' => $wager,
                        'type' => 'bet_void',
                        'status' => 'completed',
                        'balanceBefore' => $balance,
                        'balanceAfter' => $newBalance,
                        'referenceType' => 'Bet',
                        'referenceId' => $betIdStr,
                        'reason' => 'BET_VOID',
                        'description' => strtoupper($betType) . ' bet voided - wager refunded',
                        'createdAt' => $now,
                        'updatedAt' => $now,
                    ]);
                    $results['voided']++;
                } elseif ($finalStatus === 'won') {
                    $newBalance = $balance + $potentialPayout;
                    $db->updateOne('users', ['_id' => $userIdStr], [
                        'balance' => $newBalance,
                        'pendingBalance' => max(0, $pending - $wager),
                        'totalWinnings' => self::num($user['totalWinnings'] ?? 0) + ($potentialPayout - $wager),
                        'updatedAt' => $now,
                    ]);
                    $db->insertOne('transactions', [
                        'userId' => $userIdStr,
                        'amount' => $potentialPayout,
                        'type' => 'bet_won',
                        'status' => 'completed',
                        'balanceBefore' => $balance,
                        'balanceAfter' => $newBalance,
                        'referenceType' => 'Bet',
                        'referenceId' => $betIdStr,
                        'reason' => 'BET_WON',
                        'description' => strtoupper($betType) . ' bet won',
                        'createdAt' => $now,
                        'updatedAt' => $now,
                    ]);
                    $results['won']++;
                } else {
                    $db->updateOne('users', ['_id' => $userIdStr], [
                        'pendingBalance' => max(0, $pending - $wager),
                        'updatedAt' => $now,
                    ]);
                    $db->insertOne('transactions', [
                        'userId' => $userIdStr,
                        'amount' => $wager,
                        'type' => 'bet_lost',
                        'status' => 'completed',
                        'balanceBefore' => $balance,
                        'balanceAfter' => $balance,
                        'referenceType' => 'Bet',
                        'referenceId' => $betIdStr,
                        'reason' => 'BET_LOST',
                        'description' => strtoupper($betType) . ' bet lost',
                        'createdAt' => $now,
                        'updatedAt' => $now,
                    ]);
                    $results['lost']++;
                }

                $db->commit();
            } catch (Throwable $e) {
                $db->rollback();
                $results['errors']++;
            }
        }

        return $results;
    }

    private static function getLegResult(array $leg, array $matchData, ?string $manualWinner, bool $isFinished, float $scoreHome, float $scoreAway, float $totalScore): string
    {
        $selection = (string) ($leg['selection'] ?? '');
        $marketType = strtolower((string) ($leg['marketType'] ?? ''));
        $snapshot = is_array($leg['matchSnapshot'] ?? null) ? $leg['matchSnapshot'] : [];
        $snapshotMarkets = is_array($snapshot['odds']['markets'] ?? null) ? $snapshot['odds']['markets'] : [];

        if ($manualWinner !== null) {
            return $selection === $manualWinner ? 'won' : 'lost';
        }
        if (!$isFinished) {
            return 'pending';
        }

        $homeTeam = (string) ($matchData['homeTeam'] ?? '');
        $awayTeam = (string) ($matchData['awayTeam'] ?? '');

        if (in_array($marketType, ['h2h', 'moneyline', 'ml', 'straight'], true)) {
            if ($scoreHome > $scoreAway) {
                return $selection === $homeTeam ? 'won' : 'lost';
            }
            if ($scoreAway > $scoreHome) {
                return $selection === $awayTeam ? 'won' : 'lost';
            }
            return $selection === 'Draw' ? 'won' : 'lost';
        }

        if ($marketType === 'spreads') {
            $market = self::findMarket($snapshotMarkets, 'spreads');
            $outcome = self::findOutcomeByName(is_array($market['outcomes'] ?? null) ? $market['outcomes'] : [], $selection);
            if ($outcome !== null && isset($outcome['point'])) {
                $point = (float) $outcome['point'];
                if ($selection === $homeTeam) {
                    $adjusted = $scoreHome + $point;
                    if ($adjusted > $scoreAway) {
                        return 'won';
                    }
                    if ($adjusted === $scoreAway) {
                        return 'void';
                    }
                    return 'lost';
                }
                $adjusted = $scoreAway + $point;
                if ($adjusted > $scoreHome) {
                    return 'won';
                }
                if ($adjusted === $scoreHome) {
                    return 'void';
                }
                return 'lost';
            }
        }

        if ($marketType === 'totals') {
            $market = self::findMarket($snapshotMarkets, 'totals');
            $outcome = self::findOutcomeByName(is_array($market['outcomes'] ?? null) ? $market['outcomes'] : [], $selection);
            if ($outcome !== null && isset($outcome['point'])) {
                $point = (float) $outcome['point'];
                $isOver = str_contains(strtolower($selection), 'over');
                if ($isOver) {
                    if ($totalScore > $point) {
                        return 'won';
                    }
                    if ($totalScore === $point) {
                        return 'void';
                    }
                    return 'lost';
                }
                if ($totalScore < $point) {
                    return 'won';
                }
                if ($totalScore === $point) {
                    return 'void';
                }
                return 'lost';
            }
        }

        return 'pending';
    }

    private static function normalizeSelectionsForUpdate(array $selections): array
    {
        $out = [];
        foreach ($selections as $sel) {
            $normalized = $sel;
            if (isset($normalized['matchId']) && is_string($normalized['matchId']) && preg_match('/^[a-f0-9]{24}$/i', $normalized['matchId']) === 1) {
                $normalized['matchId'] = MongoRepository::id($normalized['matchId']);
            }
            $out[] = $normalized;
        }
        return $out;
    }

    private static function getTeaserRule(MongoRepository $db): array
    {
        $rule = $db->findOne('betmoderules', ['mode' => 'teaser', 'isActive' => true]);
        if ($rule !== null) {
            return $rule;
        }
        return BetModeRules::getDefault('teaser') ?? [];
    }

    private static function getTeaserMultiplier(array $rule, int $legCount): float
    {
        $multipliers = $rule['payoutProfile']['multipliers'] ?? [];
        $key = (string) $legCount;
        if (is_array($multipliers) && isset($multipliers[$key]) && is_numeric($multipliers[$key])) {
            $value = (float) $multipliers[$key];
            if ($value > 0) {
                return $value;
            }
        }
        return 1.0;
    }

    private static function allWonOrVoid(array $statuses): bool
    {
        foreach ($statuses as $status) {
            if (!in_array($status, ['won', 'void'], true)) {
                return false;
            }
        }
        return true;
    }

    private static function allVoid(array $statuses): bool
    {
        if (count($statuses) === 0) {
            return false;
        }
        foreach ($statuses as $status) {
            if ($status !== 'void') {
                return false;
            }
        }
        return true;
    }

    private static function findMarket(array $markets, string $key): ?array
    {
        foreach ($markets as $market) {
            if (strtolower((string) ($market['key'] ?? '')) === strtolower($key)) {
                return is_array($market) ? $market : null;
            }
        }
        return null;
    }

    private static function findOutcomeByName(array $outcomes, string $selection): ?array
    {
        foreach ($outcomes as $outcome) {
            if ((string) ($outcome['name'] ?? '') === $selection) {
                return is_array($outcome) ? $outcome : null;
            }
        }
        return null;
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
