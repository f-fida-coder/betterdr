<?php

declare(strict_types=1);


final class BetsController
{
    private MongoRepository $db;
    private string $jwtSecret;

    public function __construct(MongoRepository $db, string $jwtSecret)
    {
        $this->db = $db;
        $this->jwtSecret = $jwtSecret;
    }

    public function handle(string $method, string $path): bool
    {
        if ($path === '/api/bets/place' && $method === 'POST') {
            $this->placeBet();
            return true;
        }
        if ($path === '/api/bets/my-bets' && $method === 'GET') {
            $this->getMyBets();
            return true;
        }
        if ($path === '/api/bets/settle' && $method === 'POST') {
            $this->settleMatch();
            return true;
        }

        return false;
    }

    private function placeBet(): void
    {
        try {
            if (RateLimiter::enforce($this->db, 'place_bet', 10, 60)) {
                return;
            }

            $user = $this->protect();
            if ($user === null) {
                return;
            }

            $body = Http::jsonBody();
            $matchId = trim((string) ($body['matchId'] ?? ''));
            $selection = trim((string) ($body['selection'] ?? ''));
            $odds = $body['odds'] ?? null;
            $amount = $body['amount'] ?? null;
            $type = BetModeRules::normalize((string) ($body['type'] ?? 'straight'));
            $selections = is_array($body['selections'] ?? null) ? $body['selections'] : [];
            $teaserPoints = (float) ($body['teaserPoints'] ?? 0);

            $betAmount = is_numeric($amount) ? (float) $amount : 0.0;
            if (!is_finite($betAmount) || $betAmount <= 0) {
                Response::json(['message' => 'Bet amount must be positive'], 400);
                return;
            }

            $modeRule = $this->getModeRule($type);
            if ($modeRule === null) {
                Response::json(['message' => 'Bet mode ' . $type . ' is not supported'], 400);
                return;
            }

            if (in_array((string) ($user['status'] ?? ''), ['suspended', 'disabled', 'read only'], true)) {
                Response::json(['message' => 'Account is suspended, disabled, or read-only'], 400);
                return;
            }

            if (isset($user['minBet']) && $betAmount < (float) $user['minBet']) {
                Response::json(['message' => 'Minimum bet for your account is ' . $user['minBet']], 400);
                return;
            }
            if (isset($user['maxBet']) && $betAmount > (float) $user['maxBet']) {
                Response::json(['message' => 'Maximum bet for your account is ' . $user['maxBet']], 400);
                return;
            }

            $selectionInputs = [];
            if ($type === 'straight') {
                if (count($selections) > 0) {
                    $selectionInputs = [$selections[0]];
                } elseif ($matchId !== '' && $selection !== '') {
                    $selectionInputs = [[
                        'matchId' => $matchId,
                        'selection' => $selection,
                        'odds' => $odds,
                        'type' => $type,
                    ]];
                } else {
                    Response::json(['message' => 'Straight bet requires one selection'], 400);
                    return;
                }
            } else {
                if (count($selections) === 0) {
                    Response::json(['message' => strtoupper($type) . ' requires selections'], 400);
                    return;
                }
                $selectionInputs = $selections;
            }

            $legCount = count($selectionInputs);
            $minLegs = (int) ($modeRule['minLegs'] ?? 1);
            $maxLegs = (int) ($modeRule['maxLegs'] ?? 1);
            if ($legCount < $minLegs || $legCount > $maxLegs) {
                $range = $minLegs === $maxLegs ? (string) $minLegs : ($minLegs . '-' . $maxLegs);
                Response::json(['message' => strtoupper($type) . ' requires ' . $range . ' selections'], 400);
                return;
            }

            $validatedSelections = [];
            foreach ($selectionInputs as $sel) {
                $validatedSelections[] = $this->validateSelection(
                    trim((string) ($sel['matchId'] ?? '')),
                    trim((string) ($sel['selection'] ?? '')),
                    $sel['odds'] ?? null,
                    BetModeRules::normalize((string) ($sel['type'] ?? 'straight'))
                );
            }

            if ($type === 'teaser') {
                $allowed = $modeRule['teaserPointOptions'] ?? [];
                if (is_array($allowed) && count($allowed) > 0 && !in_array($teaserPoints, array_map('floatval', $allowed), true)) {
                    Response::json(['message' => 'Invalid teaser points. Allowed: ' . implode(', ', $allowed)], 400);
                    return;
                }
            }

            // Use transaction with row-level lock to prevent race conditions
            $this->db->beginTransaction();
            try {
                $lockedUser = $this->db->findOneForUpdate('users', ['_id' => MongoRepository::id((string) $user['_id'])]);
                if ($lockedUser === null) {
                    $this->db->rollback();
                    Response::json(['message' => 'User not found'], 404);
                    return;
                }

                $balance = $this->num($lockedUser['balance'] ?? 0);
                $pending = $this->num($lockedUser['pendingBalance'] ?? 0);
                $available = max(0, $balance - $pending);
                $totalRisk = $type === 'reverse' ? ($betAmount * 2) : $betAmount;

                if ($available < $totalRisk) {
                    $this->db->rollback();
                    Response::json(['message' => 'Insufficient available balance'], 400);
                    return;
                }

                // Check gambling loss limits
                $gamblingLimits = is_array($lockedUser['gamblingLimits'] ?? null) ? $lockedUser['gamblingLimits'] : [];
                $lossLimitMsg = $this->checkLossLimits($lockedUser, $gamblingLimits, $totalRisk);
                if ($lossLimitMsg !== null) {
                    $this->db->rollback();
                    Response::json(['message' => $lossLimitMsg], 400);
                    return;
                }

                $potentialPayout = 0.0;
                if ($type === 'straight') {
                    $potentialPayout = $betAmount * ((float) ($validatedSelections[0]['odds'] ?? 0));
                } elseif ($type === 'parlay') {
                    $combined = 1.0;
                    foreach ($validatedSelections as $sel) {
                        $combined *= (float) ($sel['odds'] ?? 0);
                    }
                    $potentialPayout = $betAmount * $combined;
                } elseif ($type === 'teaser') {
                    $potentialPayout = $betAmount * $this->getTeaserMultiplier($modeRule, $legCount);
                } elseif ($type === 'if_bet' || $type === 'reverse') {
                    $potentialPayout = $betAmount
                        * ((float) ($validatedSelections[0]['odds'] ?? 0))
                        * ((float) ($validatedSelections[1]['odds'] ?? 0));
                }

                $newBalance = $balance - $totalRisk;
                $newPending = $pending + $totalRisk;

                $this->db->updateOne('users', ['_id' => MongoRepository::id((string) $lockedUser['_id'])], [
                    'balance' => $newBalance,
                    'pendingBalance' => $newPending,
                    'betCount' => ((int) ($lockedUser['betCount'] ?? 0)) + ($type === 'reverse' ? 2 : 1),
                    'totalWagered' => $this->num($lockedUser['totalWagered'] ?? 0) + $totalRisk,
                    'updatedAt' => MongoRepository::nowUtc(),
                ]);

                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent');
                $now = MongoRepository::nowUtc();
                $userId = MongoRepository::id((string) $lockedUser['_id']);

                $baseBetData = [
                    'userId' => $userId,
                    'amount' => $betAmount,
                    'type' => $type,
                    'potentialPayout' => $potentialPayout,
                    'status' => 'pending',
                    'ipAddress' => $ipAddress,
                    'userAgent' => $userAgent,
                    'teaserPoints' => $teaserPoints,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];

                $createdBetIds = [];
                if ($type === 'reverse') {
                    $doc1 = array_merge($baseBetData, [
                        'type' => 'if_bet',
                        'selections' => [$this->selectionForInsert($validatedSelections[0]), $this->selectionForInsert($validatedSelections[1])],
                        'potentialPayout' => $potentialPayout / 2,
                        'selection' => 'MULTI',
                        'odds' => 0,
                        'matchSnapshot' => new stdClass(),
                    ]);
                    $doc2 = array_merge($baseBetData, [
                        'type' => 'if_bet',
                        'selections' => [$this->selectionForInsert($validatedSelections[1]), $this->selectionForInsert($validatedSelections[0])],
                        'potentialPayout' => $potentialPayout / 2,
                        'selection' => 'MULTI',
                        'odds' => 0,
                        'matchSnapshot' => new stdClass(),
                    ]);

                    $createdBetIds[] = $this->db->insertOne('bets', $doc1);
                    $createdBetIds[] = $this->db->insertOne('bets', $doc2);
                } else {
                    $single = count($validatedSelections) === 1 ? $validatedSelections[0] : null;
                    $doc = array_merge($baseBetData, [
                        'selections' => array_map(fn ($s) => $this->selectionForInsert($s), $validatedSelections),
                        'matchId' => $single ? MongoRepository::id((string) $single['matchId']) : null,
                        'selection' => $single ? $single['selection'] : 'MULTI',
                        'odds' => $single ? (float) $single['odds'] : 0,
                        'matchSnapshot' => $single ? ($single['matchSnapshot'] ?? new stdClass()) : new stdClass(),
                    ]);
                    $createdBetIds[] = $this->db->insertOne('bets', $doc);
                }

                $this->db->insertOne('transactions', [
                    'userId' => $userId,
                    'amount' => $totalRisk,
                    'type' => 'bet_placed',
                    'status' => 'completed',
                    'balanceBefore' => $balance,
                    'balanceAfter' => $newBalance,
                    'referenceType' => 'Bet',
                    'referenceId' => MongoRepository::id($createdBetIds[0]),
                    'reason' => 'BET_PLACED',
                    'description' => strtoupper($type) . ' bet placed',
                    'ipAddress' => $ipAddress,
                    'userAgent' => $userAgent,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ]);

                $this->db->commit();
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }

            $createdBets = [];
            foreach ($createdBetIds as $id) {
                $found = $this->db->findOne('bets', ['_id' => MongoRepository::id($id)]);
                if ($found !== null) {
                    $createdBets[] = $found;
                }
            }

            Response::json([
                'message' => 'Bet placed successfully',
                'bets' => $createdBets,
                'balance' => $newBalance,
                'pendingBalance' => $newPending,
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => $e->getMessage()], 400);
        }
    }

    private function settleMatch(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            if ((string) ($actor['role'] ?? '') !== 'admin') {
                Response::json(['message' => 'User role ' . ($actor['role'] ?? 'unknown') . ' is not authorized to access this route'], 403);
                return;
            }

            $body = Http::jsonBody();
            $matchId = trim((string) ($body['matchId'] ?? ''));
            $winner = trim((string) ($body['winner'] ?? ''));
            $manualWinner = $winner === '' ? null : $winner;

            $results = $this->internalSettleMatch($matchId, $manualWinner, 'admin');
            Response::json([
                'message' => 'Settlement complete',
                'results' => $results,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => $e->getMessage() ?: 'Error settling bets'], 500);
        }
    }

    private function internalSettleMatch(string $matchId, ?string $manualWinner, string $settledBy): array
    {
        return BetSettlementService::settleMatch($this->db, $matchId, $manualWinner, $settledBy);
    }

    private function getLegResult(array $leg, array $matchData, ?string $manualWinner, bool $isFinished, float $scoreHome, float $scoreAway, float $totalScore): string
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
            $market = $this->findMarket($snapshotMarkets, 'spreads');
            $outcome = $this->findOutcomeByName(is_array($market['outcomes'] ?? null) ? $market['outcomes'] : [], $selection);
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
            $market = $this->findMarket($snapshotMarkets, 'totals');
            $outcome = $this->findOutcomeByName(is_array($market['outcomes'] ?? null) ? $market['outcomes'] : [], $selection);
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

    private function allWonOrVoid(array $statuses): bool
    {
        foreach ($statuses as $status) {
            if (!in_array($status, ['won', 'void'], true)) {
                return false;
            }
        }
        return true;
    }

    private function allVoid(array $statuses): bool
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

    private function normalizeSelectionsForUpdate(array $selections): array
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

    private function getMyBets(): void
    {
        try {
            $user = $this->protect();
            if ($user === null) {
                return;
            }

            $status = isset($_GET['status']) ? trim((string) $_GET['status']) : '';
            $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
            $limit = $limit > 0 ? $limit : 50;

            $query = ['userId' => MongoRepository::id((string) $user['_id'])];
            if ($status !== '' && $status !== 'all') {
                $query['status'] = $status;
            }

            $bets = $this->db->findMany('bets', $query, [
                'sort' => ['createdAt' => -1],
                'limit' => $limit,
            ]);

            foreach ($bets as &$bet) {
                if (isset($bet['matchId']) && is_string($bet['matchId']) && preg_match('/^[a-f0-9]{24}$/i', $bet['matchId']) === 1) {
                    $match = $this->db->findOne('matches', ['_id' => MongoRepository::id($bet['matchId'])], [
                        'projection' => [
                            'homeTeam' => 1,
                            'awayTeam' => 1,
                            'startTime' => 1,
                            'sport' => 1,
                            'league' => 1,
                        ],
                    ]);
                    if ($match !== null) {
                        $bet['matchId'] = $match;
                    }
                }
            }
            unset($bet);

            Response::json($bets);
        } catch (Throwable $e) {
            Response::json(['message' => 'Error fetching bets'], 500);
        }
    }

    private function validateSelection(string $matchId, string $selection, mixed $odds, string $type): array
    {
        if (preg_match('/^[a-f0-9]{24}$/i', $matchId) !== 1) {
            throw new RuntimeException('Match not found: ' . $matchId);
        }

        $match = $this->db->findOne('matches', ['_id' => MongoRepository::id($matchId)]);
        if ($match === null) {
            throw new RuntimeException('Match not found: ' . $matchId);
        }

        $status = (string) ($match['status'] ?? '');
        if (!in_array($status, ['scheduled', 'live'], true)) {
            throw new RuntimeException('Match ' . ($match['homeTeam'] ?? '') . ' vs ' . ($match['awayTeam'] ?? '') . ' is not open for betting');
        }

        $startTime = strtotime((string) ($match['startTime'] ?? ''));
        if ($status === 'scheduled' && $startTime !== false && $startTime <= time()) {
            throw new RuntimeException('Betting is closed for ' . ($match['homeTeam'] ?? '') . ' vs ' . ($match['awayTeam'] ?? ''));
        }

        $markets = [];
        $oddsRoot = $match['odds'] ?? [];
        if (is_array($oddsRoot) && isset($oddsRoot['markets']) && is_array($oddsRoot['markets'])) {
            $markets = $oddsRoot['markets'];
        }

        $normalizedType = BetModeRules::normalize($type);
        $market = $this->findMarket($markets, $normalizedType);
        if ($market === null && in_array($normalizedType, ['straight', 'moneyline', 'ml', 'h2h'], true)) {
            $market = $this->findMarket($markets, 'h2h')
                ?? $this->findMarket($markets, 'moneyline')
                ?? $this->findMarket($markets, 'ml');
        }

        if ($market === null && is_array($oddsRoot) && !isset($oddsRoot['markets'])) {
            $outcomes = [];
            if (isset($oddsRoot['home_win'])) {
                $outcomes[] = ['name' => (string) ($match['homeTeam'] ?? ''), 'price' => (float) $oddsRoot['home_win']];
            }
            if (isset($oddsRoot['away_win'])) {
                $outcomes[] = ['name' => (string) ($match['awayTeam'] ?? ''), 'price' => (float) $oddsRoot['away_win']];
            }
            if (isset($oddsRoot['draw'])) {
                $outcomes[] = ['name' => 'Draw', 'price' => (float) $oddsRoot['draw']];
            }
            if (count($outcomes) > 0) {
                $market = ['key' => 'h2h', 'outcomes' => $outcomes];
            }
        }

        if ($market === null || !is_array($market['outcomes'] ?? null) || count($market['outcomes']) === 0) {
            throw new RuntimeException('Market ' . $type . ' not available for ' . ($match['homeTeam'] ?? '') . ' vs ' . ($match['awayTeam'] ?? ''));
        }

        $outcome = null;
        foreach (($market['outcomes'] ?? []) as $candidate) {
            $name = (string) ($candidate['name'] ?? '');
            if ($name === $selection) {
                $outcome = $candidate;
                break;
            }
            if ($normalizedType === 'totals' && str_contains(strtolower($name), strtolower($selection))) {
                $outcome = $candidate;
                break;
            }
        }

        if (!is_array($outcome) || !isset($outcome['price'])) {
            throw new RuntimeException('Selection ' . $selection . ' not available for ' . ($match['homeTeam'] ?? '') . ' vs ' . ($match['awayTeam'] ?? ''));
        }

        $officialOdds = (float) $outcome['price'];
        $clientOdds = is_numeric($odds) ? (float) $odds : 0.0;
        if (!is_finite($officialOdds) || $officialOdds <= 0) {
            throw new RuntimeException('Invalid odds for selection ' . $selection);
        }

        // Keep parity with Node behavior: tolerate mild client odds drift.
        if ($clientOdds > 0 && abs($officialOdds - $clientOdds) > 0.1) {
            // tolerated
        }

        return [
            'matchId' => $matchId,
            'selection' => (string) ($outcome['name'] ?? $selection),
            'odds' => $officialOdds,
            'marketType' => (string) ($market['key'] ?? ''),
            'point' => isset($outcome['point']) ? (float) $outcome['point'] : null,
            'matchSnapshot' => $match,
        ];
    }

    private function selectionForInsert(array $selection): array
    {
        return [
            'matchId' => MongoRepository::id((string) $selection['matchId']),
            'selection' => $selection['selection'],
            'odds' => (float) $selection['odds'],
            'marketType' => $selection['marketType'] ?? '',
            'point' => $selection['point'] ?? null,
            'status' => 'pending',
            'matchSnapshot' => $selection['matchSnapshot'] ?? new stdClass(),
        ];
    }

    private function getModeRule(string $mode): ?array
    {
        $normalized = BetModeRules::normalize($mode);
        $dbRule = $this->db->findOne('betmoderules', ['mode' => $normalized, 'isActive' => true]);
        if ($dbRule !== null) {
            return $dbRule;
        }
        return BetModeRules::getDefault($normalized);
    }

    private function getTeaserMultiplier(array $rule, int $legCount): float
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

    private function findMarket(array $markets, string $key): ?array
    {
        foreach ($markets as $market) {
            if (strtolower((string) ($market['key'] ?? '')) === strtolower($key)) {
                return is_array($market) ? $market : null;
            }
        }
        return null;
    }

    private function findOutcomeByName(array $outcomes, string $selection): ?array
    {
        foreach ($outcomes as $outcome) {
            if ((string) ($outcome['name'] ?? '') === $selection) {
                return is_array($outcome) ? $outcome : null;
            }
        }
        return null;
    }

    private function protect(): ?array
    {
        $auth = Http::header('authorization');
        if (!str_starts_with($auth, 'Bearer ')) {
            Response::json(['message' => 'Not authorized, no token'], 401);
            return null;
        }

        $token = trim(substr($auth, 7));
        try {
            $decoded = Jwt::decode($token, $this->jwtSecret);
        } catch (Throwable $e) {
            Response::json(['message' => 'Not authorized, token failed: ' . $e->getMessage()], 401);
            return null;
        }

        $role = (string) ($decoded['role'] ?? 'user');
        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $collection = $this->collectionByRole($role);
        $actor = $this->db->findOne($collection, ['_id' => MongoRepository::id($id)]);
        if ($actor === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        if (($actor['status'] ?? '') === 'suspended') {
            Response::json(['message' => 'Not authorized, account suspended'], 403);
            return null;
        }

        return $actor;
    }

    private function collectionByRole(string $role): string
    {
        if ($role === 'admin') {
            return 'admins';
        }
        if ($role === 'agent' || $role === 'master_agent' || $role === 'super_agent') {
            return 'agents';
        }
        return 'users';
    }

    private function num(mixed $value): float
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

    private function checkLossLimits(array $user, array $limits, float $wagerAmount): ?string
    {
        $checks = [
            ['lossDaily', 'daily', '-1 day'],
            ['lossWeekly', 'weekly', '-7 days'],
            ['lossMonthly', 'monthly', '-30 days'],
        ];

        foreach ($checks as [$key, $label, $interval]) {
            $limit = isset($limits[$key]) && is_numeric($limits[$key]) ? (float) $limits[$key] : 0;
            if ($limit <= 0) {
                continue;
            }

            $since = gmdate(DATE_ATOM, strtotime($interval));
            $userId = MongoRepository::id((string) $user['_id']);
            $bets = $this->db->findMany('bets', [
                'userId' => $userId,
                'createdAt' => ['$gte' => $since],
            ]);

            $totalWagered = 0.0;
            $totalWon = 0.0;
            foreach ($bets as $bet) {
                $totalWagered += $this->num($bet['amount'] ?? 0);
                if (($bet['status'] ?? '') === 'won') {
                    $totalWon += $this->num($bet['potentialPayout'] ?? 0);
                }
            }

            $netLoss = $totalWagered - $totalWon;
            if (($netLoss + $wagerAmount) > $limit) {
                return "This bet would exceed your {$label} loss limit of \${$limit}. Current net loss: \${$netLoss}.";
            }
        }

        return null;
    }
}
