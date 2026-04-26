<?php

declare(strict_types=1);


final class BetsController
{
    private SqlRepository $db;
    private string $jwtSecret;

    public function __construct(SqlRepository $db, string $jwtSecret)
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
        if ($path === '/api/bets/settle-eligibility' && $method === 'GET') {
            $this->getSettleEligibility();
            return true;
        }

        return false;
    }

    private function placeBet(): void
    {
        $requestDocId = '';
        $requestDocOwned = false;
        try {
            if (RateLimiter::fromEnv($this->db, 'place_bet')) {
                return;
            }

            $user = $this->protect();
            if ($user === null) {
                return;
            }

            $body = Http::jsonBody();
            $requestId = SportsbookBetSupport::normalizeRequestId((string) (($body['requestId'] ?? '') ?: Http::header('x-request-id')));
            if ($requestId === '') {
                throw new ApiException('requestId is required for sportsbook bet placement', 400, [
                    'code' => 'REQUEST_ID_REQUIRED',
                ]);
            }

            $matchId = trim((string) ($body['matchId'] ?? ''));
            $selection = trim((string) ($body['selection'] ?? ''));
            $odds = $body['odds'] ?? null;
            $amount = $body['amount'] ?? null;
            $type = BetModeRules::normalize((string) ($body['type'] ?? 'straight'));
            $marketType = BetModeRules::normalize((string) ($body['marketType'] ?? ''));
            $selections = is_array($body['selections'] ?? null) ? $body['selections'] : [];
            $teaserPoints = (float) ($body['teaserPoints'] ?? 0);

            $betAmount = is_numeric($amount) ? (float) $amount : 0.0;
            if (!is_finite($betAmount) || $betAmount <= 0) {
                throw new ApiException('Bet amount must be positive', 400);
            }

            // useFreeplay: client requests to wager from freeplay balance instead of real balance.
            $useFreeplay = (bool) ($body['useFreeplay'] ?? false);

            $modeRule = $this->getModeRule($type);
            if ($modeRule === null) {
                throw new ApiException('Bet mode ' . $type . ' is not supported', 400);
            }

            if (in_array((string) ($user['status'] ?? ''), ['suspended', 'disabled', 'read only'], true)) {
                throw new ApiException('Account is suspended, disabled, or read-only', 400);
            }

            if (isset($user['minBet']) && $betAmount < (float) $user['minBet']) {
                throw new ApiException('Minimum bet for your account is ' . $user['minBet'], 400);
            }
            if (isset($user['maxBet']) && $betAmount > (float) $user['maxBet']) {
                throw new ApiException('Maximum bet for your account is ' . $user['maxBet'], 400);
            }

            $selectionInputs = [];
            if ($type === 'straight') {
                if (count($selections) > 0) {
                    $first = is_array($selections[0]) ? $selections[0] : [];
                    $selectionInputs = [[
                        'matchId' => $first['matchId'] ?? null,
                        'selection' => $first['selection'] ?? null,
                        'odds' => $first['odds'] ?? null,
                        // Support both betslip forms: explicit marketType or legacy type field.
                        'type' => $first['type'] ?? ($first['marketType'] ?? ($marketType !== '' ? $marketType : $type)),
                    ]];
                } elseif ($matchId !== '' && $selection !== '') {
                    $selectionInputs = [[
                        'matchId' => $matchId,
                        'selection' => $selection,
                        'odds' => $odds,
                        'type' => $marketType !== '' ? $marketType : $type,
                    ]];
                } else {
                    throw new ApiException('Straight bet requires one selection', 400);
                }
            } else {
                if (count($selections) === 0) {
                    throw new ApiException(strtoupper($type) . ' requires selections', 400);
                }
                $selectionInputs = $selections;
            }

            $legCount = count($selectionInputs);
            $minLegs = (int) ($modeRule['minLegs'] ?? 1);
            $maxLegs = (int) ($modeRule['maxLegs'] ?? 1);
            if ($legCount < $minLegs || $legCount > $maxLegs) {
                $range = $minLegs === $maxLegs ? (string) $minLegs : ($minLegs . '-' . $maxLegs);
                throw new ApiException(strtoupper($type) . ' requires ' . $range . ' selections', 400);
            }

            $validatedSelections = [];
            foreach ($selectionInputs as $sel) {
                $validatedSelections[] = $this->validateSelection(
                    trim((string) ($sel['matchId'] ?? '')),
                    trim((string) ($sel['selection'] ?? '')),
                    $sel['odds'] ?? null,
                    BetModeRules::normalize((string) ($sel['type'] ?? ($sel['marketType'] ?? 'straight')))
                );
            }

            if ($type === 'teaser') {
                $allowed = $modeRule['teaserPointOptions'] ?? [];
                if (is_array($allowed) && count($allowed) > 0 && !in_array($teaserPoints, array_map('floatval', $allowed), true)) {
                    throw new ApiException('Invalid teaser points. Allowed: ' . implode(', ', $allowed), 400, [
                        'code' => 'INVALID_TEASER_POINTS',
                    ]);
                }
                foreach ($validatedSelections as $index => $validatedSelection) {
                    $validatedSelections[$index] = SportsbookBetSupport::applyTeaserAdjustment($validatedSelection, $teaserPoints);
                }
            }

            SportsbookBetSupport::validateTicketComposition($type, $validatedSelections);

            $requestFingerprint = SportsbookBetSupport::payloadHash([
                'type' => $type,
                'amount' => round($betAmount, 2),
                'teaserPoints' => round($teaserPoints, 2),
                'selections' => array_map(static function (array $item): array {
                    return [
                        'matchId' => (string) ($item['matchId'] ?? ''),
                        'selection' => (string) ($item['selection'] ?? ''),
                        'odds' => round((float) ($item['odds'] ?? 0), 4),
                        'marketType' => (string) ($item['marketType'] ?? ''),
                        'point' => isset($item['point']) && is_numeric($item['point']) ? round((float) $item['point'], 2) : null,
                    ];
                }, $validatedSelections),
            ]);

            $userId = SqlRepository::id((string) $user['id']);
            $requestDocId = SportsbookBetSupport::idempotencyDocumentId('sportsbook_bet', $userId, $requestId);
            $requestNow = SqlRepository::nowUtc();
            $requestDoc = [
                'id' => $requestDocId,
                'userId' => $userId,
                'requestId' => $requestId,
                'payloadHash' => $requestFingerprint,
                'status' => 'processing',
                'createdAt' => $requestNow,
                'updatedAt' => $requestNow,
            ];

            if (!$this->db->insertOneIfAbsent('betrequests', $requestDoc)) {
                $existingRequest = $this->db->findOne('betrequests', ['id' => SqlRepository::id($requestDocId)]);
                if ($existingRequest === null) {
                    throw new ApiException('Unable to lock request id', 409, ['code' => 'REQUEST_CONFLICT']);
                }
                if ((string) ($existingRequest['payloadHash'] ?? '') !== $requestFingerprint) {
                    throw new ApiException('requestId has already been used for a different sportsbook payload', 409, [
                        'code' => 'REQUEST_ID_REUSED',
                    ]);
                }

                $existingStatus = (string) ($existingRequest['status'] ?? 'processing');
                if ($existingStatus === 'completed') {
                    $betIds = is_array($existingRequest['betIds'] ?? null) ? $existingRequest['betIds'] : [];
                    $existingResponse = $this->buildBetPlacementResponse($betIds, [
                        'requestId' => $requestId,
                        'balance' => $existingRequest['responseBalance'] ?? ($user['balance'] ?? 0),
                        'pendingBalance' => $existingRequest['responsePendingBalance'] ?? ($user['pendingBalance'] ?? 0),
                    ]);
                    $existingResponse['idempotentReplay'] = true;
                    Response::json($existingResponse);
                    return;
                }

                if ($existingStatus === 'processing') {
                    throw new ApiException('This sportsbook request is already being processed', 409, [
                        'code' => 'REQUEST_IN_PROGRESS',
                    ]);
                }

                $this->db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                    'payloadHash' => $requestFingerprint,
                    'status' => 'processing',
                    'error' => null,
                    'updatedAt' => SqlRepository::nowUtc(),
                ]);
            }
            $requestDocOwned = true;

            $totalRisk = SportsbookBetSupport::ticketRiskAmount($type, $betAmount);
            $potentialPayout = SportsbookBetSupport::calculatePotentialPayout($type, $betAmount, $validatedSelections, $modeRule);
            $combinedOdds = SportsbookBetSupport::combinedOdds($totalRisk, $potentialPayout);
            $ticketId = SportsbookBetSupport::idempotencyDocumentId('sportsbook_ticket', $userId, $requestId);
            $selectionDocs = array_map(fn (array $selectionRow): array => $this->selectionForInsert($selectionRow), $validatedSelections);

            $createdBetIds = [];
            $newBalance = 0.0;
            $newPending = 0.0;

            $this->db->beginTransaction();
            try {
                $lockedUser = $this->db->findOneForUpdate('users', ['id' => SqlRepository::id((string) $user['id'])]);
                if ($lockedUser === null) {
                    $this->db->rollback();
                    throw new ApiException('User not found', 404);
                }

                $balance        = $this->num($lockedUser['balance'] ?? 0);
                $pending        = $this->num($lockedUser['pendingBalance'] ?? 0);
                $freeplayBalance = $this->num($lockedUser['freeplayBalance'] ?? 0);
                $available      = max(0, $balance - $pending);

                // ── Freeplay expiry check ──────────────────────────────────────────
                // If freeplayExpiresAt is set and in the past, zero out the balance.
                if ($freeplayBalance > 0) {
                    $fpExpiry = $lockedUser['freeplayExpiresAt'] ?? null;
                    if ($fpExpiry !== null) {
                        $fpExpiryTs = is_numeric($fpExpiry) ? (int) $fpExpiry : strtotime((string) $fpExpiry);
                        if ($fpExpiryTs !== false && $fpExpiryTs > 0 && $fpExpiryTs < time()) {
                            // Expired — zero out silently so the user sees $0 freeplay
                            $this->db->updateOne('users', ['id' => SqlRepository::id((string) $lockedUser['id'])], [
                                'freeplayBalance' => 0.0,
                                'freeplayExpiresAt' => null,
                                'updatedAt' => SqlRepository::nowUtc(),
                            ]);
                            $freeplayBalance = 0.0;
                        }
                    }
                }

                if ($useFreeplay) {
                    // ── Freeplay path ──────────────────────────────────────────────
                    // Freeplay credits are a separate pool — does not touch real balance
                    // or pendingBalance. Winnings credit profit-only to real balance.
                    if ($freeplayBalance <= 0) {
                        $this->db->rollback();
                        throw new ApiException(
                            'Your freeplay credits have expired or been used.',
                            400,
                            ['code' => 'FREEPLAY_EXPIRED']
                        );
                    }
                    if ($freeplayBalance < $totalRisk) {
                        $this->db->rollback();
                        throw new ApiException(
                            'Insufficient freeplay balance. Available: $' . number_format($freeplayBalance, 2),
                            400,
                            ['code' => 'INSUFFICIENT_FREEPLAY_BALANCE']
                        );
                    }
                    $newBalance  = $balance;           // real balance unchanged
                    $newPending  = $pending;           // real pending unchanged
                    $newFreeplay = $freeplayBalance - $totalRisk;

                    $this->db->updateOne('users', ['id' => SqlRepository::id((string) $lockedUser['id'])], [
                        'freeplayBalance' => $newFreeplay,
                        'betCount'        => ((int) ($lockedUser['betCount'] ?? 0)) + 1,
                        'updatedAt'       => SqlRepository::nowUtc(),
                    ]);
                } else {
                    // ── Real-balance path (existing logic) ─────────────────────────
                    if ($available < $totalRisk) {
                        $this->db->rollback();
                        throw new ApiException('Insufficient available balance', 400, [
                            'code' => 'INSUFFICIENT_BALANCE',
                        ]);
                    }

                    // Check gambling loss limits (only applies to real-money bets)
                    $gamblingLimits = is_array($lockedUser['gamblingLimits'] ?? null) ? $lockedUser['gamblingLimits'] : [];
                    $lossLimitMsg = $this->checkLossLimits($lockedUser, $gamblingLimits, $totalRisk);
                    if ($lossLimitMsg !== null) {
                        $this->db->rollback();
                        throw new ApiException($lossLimitMsg, 400);
                    }

                    $newBalance  = $balance - $totalRisk;
                    $newPending  = $pending + $totalRisk;
                    $newFreeplay = $freeplayBalance; // unchanged

                    $this->db->updateOne('users', ['id' => SqlRepository::id((string) $lockedUser['id'])], [
                        'balance'        => $newBalance,
                        'pendingBalance' => $newPending,
                        'betCount'       => ((int) ($lockedUser['betCount'] ?? 0)) + 1,
                        'totalWagered'   => $this->num($lockedUser['totalWagered'] ?? 0) + $totalRisk,
                        'updatedAt'      => SqlRepository::nowUtc(),
                    ]);
                }

                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent');
                $now = SqlRepository::nowUtc();

                $baseBetData = [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'ticketId' => $ticketId,
                    'amount' => $totalRisk,
                    'riskAmount' => $totalRisk,
                    'unitStake' => $betAmount,
                    'type' => $type,
                    'potentialPayout' => $potentialPayout,
                    'combinedOdds' => $combinedOdds,
                    'status' => 'pending',
                    'isFreeplay' => $useFreeplay,
                    'ipAddress' => $ipAddress,
                    'userAgent' => $userAgent,
                    'teaserPoints' => $type === 'teaser' ? $teaserPoints : 0.0,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];

                $single = count($validatedSelections) === 1 ? $validatedSelections[0] : null;
                $doc = array_merge($baseBetData, [
                    'selections' => $selectionDocs,
                    'matchId' => $single ? SqlRepository::id((string) $single['matchId']) : null,
                    'selection' => $single ? $single['selection'] : 'MULTI',
                    'odds' => $single ? (float) $single['odds'] : $combinedOdds,
                    'marketType' => $single ? (string) ($single['marketType'] ?? '') : $type,
                    'description' => SportsbookBetSupport::descriptionForSelections($selectionDocs),
                    'matchSnapshot' => $single ? ($single['matchSnapshot'] ?? new stdClass()) : new stdClass(),
                ]);
                $betId = $this->db->insertOne('bets', $doc);
                $createdBetIds[] = $betId;
                $createdBet = $this->db->findOne('bets', ['id' => SqlRepository::id($betId)]) ?? array_merge($doc, ['id' => $betId]);
                SportsbookBetSupport::upsertSelectionRowsForBet($this->db, $createdBet, $selectionDocs);

                $this->db->insertOne('transactions', [
                    'userId' => $userId,
                    'amount' => $totalRisk,
                    'type' => $useFreeplay ? 'fp_bet_placed' : 'bet_placed',
                    'status' => 'completed',
                    'isFreeplay' => $useFreeplay,
                    'balanceBefore' => $useFreeplay ? $freeplayBalance : $balance,
                    'balanceAfter'  => $useFreeplay ? $newFreeplay  : $newBalance,
                    'referenceType' => 'Bet',
                    'referenceId' => SqlRepository::id($createdBetIds[0]),
                    'reason' => $useFreeplay ? 'FP_BET_PLACED' : 'BET_PLACED',
                    'description' => strtoupper($type) . ($useFreeplay ? ' freeplay' : '') . ' bet placed',
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

            $responsePayload = $this->buildBetPlacementResponse($createdBetIds, [
                'requestId' => $requestId,
                'balance' => $newBalance,
                'pendingBalance' => $newPending,
            ]);

            $this->db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                'status' => 'completed',
                'betIds' => $createdBetIds,
                'ticketId' => $ticketId,
                'responseBalance' => $newBalance,
                'responsePendingBalance' => $newPending,
                'updatedAt' => SqlRepository::nowUtc(),
            ]);
            $requestDocOwned = false;

            // Invalidate user's bet history cache after successful bet placement
            QueryCache::getInstance()->forgetPattern('bets:' . $userId . ':*');

            Response::json($responsePayload, 201);
        } catch (ApiException $e) {
            if ($requestDocOwned && $requestDocId !== '') {
                $this->db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                    'updatedAt' => SqlRepository::nowUtc(),
                ]);
            }
            Response::json(array_merge(['message' => $e->getMessage()], $e->payload()), $e->statusCode());
        } catch (Throwable $e) {
            if ($requestDocOwned && $requestDocId !== '') {
                $this->db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                    'updatedAt' => SqlRepository::nowUtc(),
                ]);
            }
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
        } catch (RuntimeException $e) {
            Response::json(['message' => $e->getMessage() ?: 'Error settling bets'], 400);
        } catch (Throwable $e) {
            Response::json(['message' => $e->getMessage() ?: 'Error settling bets'], 500);
        }
    }

    private function getSettleEligibility(): void
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

            $matchId = trim((string) ($_GET['matchId'] ?? ''));
            if (preg_match('/^[a-f0-9]{24}$/i', $matchId) !== 1) {
                Response::json(['message' => 'Valid matchId is required'], 400);
                return;
            }

            $eligibility = BetSettlementService::manualWinnerEligibility($this->db, $matchId);
            Response::json($eligibility);
        } catch (Throwable $e) {
            Response::json(['message' => $e->getMessage() ?: 'Error checking settle eligibility'], 500);
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
                $normalized['matchId'] = SqlRepository::id($normalized['matchId']);
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

            // Cache user bet history per status filter
            $userId = (string) $user['id'];
            $cacheKey = 'bets:' . $userId . ':' . ($status ?: 'all') . ':' . $limit;
            $cache = QueryCache::getInstance();
            $formatted = $cache->get($cacheKey);
            
            if ($formatted === null) {
                // Use request deduplication to prevent concurrent redundant queries
                $dedup = RequestDeduplicator::getInstance();
                $formatted = $dedup->coalesce($cacheKey . ':compute', fn() => $this->computeUserBets($userId, $status, $limit));
                
                // Cache for 10 seconds - user bet history changes frequently
                $cache->set($cacheKey, $formatted, 10);
            }

            Response::json($formatted);
        } catch (Throwable $e) {
            Response::json(['message' => 'Error fetching bets'], 500);
        }
    }

    private function computeUserBets(string $userId, string $status, int $limit): array
    {
        $query = ['userId' => SqlRepository::id($userId)];
        if ($status !== '' && $status !== 'all') {
            $query['status'] = $status;
        }

        $bets = $this->db->findMany('bets', $query, [
            'sort' => ['createdAt' => -1],
            'limit' => $limit,
        ]);

        $formatted = [];
        foreach ($bets as $bet) {
            if (!is_array($bet)) {
                continue;
            }
            $formatted[] = $this->enrichBetDocument($bet);
        }

        $casinoQuery = ['userId' => SqlRepository::id($userId)];
        $casinoBets = $this->db->findMany('casino_bets', $casinoQuery, [
            'sort' => ['createdAt' => -1],
            'limit' => $limit,
        ]);

        foreach ($casinoBets as $cbet) {
            if (!is_array($cbet)) {
                continue;
            }
            $cStatus = ((float) ($cbet['totalReturn'] ?? 0)) > 0 ? 'won' : 'lost';
            if (((float) ($cbet['totalWager'] ?? 0)) <= 0) {
                $cStatus = 'void';
            }

            if ($status !== '' && $status !== 'all' && $cStatus !== $status) {
                continue; // Skip if it doesn't match the frontend filter
            }

            $formatted[] = [
                'id' => $cbet['id'],
                'ticketId' => ltrim((string) ($cbet['roundId'] ?? ''), 'r_'),
                'type' => 'casino_' . ($cbet['game'] ?? 'game'),
                'status' => $cStatus,
                'createdAt' => $cbet['createdAt'] ?? '',
                'amount' => $cbet['totalWager'] ?? 0,
                'riskAmount' => $cbet['totalWager'] ?? 0,
                'potentialPayout' => max((float) ($cbet['totalWager'] ?? 0), (float) ($cbet['totalReturn'] ?? 0)),
                'description' => ucfirst($cbet['game'] ?? 'casino') . ' Round',
                'selections' => [],
                'combinedOdds' => 1.0,
            ];
        }

        usort($formatted, function (array $a, array $b): int {
            $aTime = strtotime($a['createdAt'] ?? '');
            $bTime = strtotime($b['createdAt'] ?? '');
            return $bTime <=> $aTime; // Descending
        });

        if (count($formatted) > $limit) {
            $formatted = array_slice($formatted, 0, $limit);
        }
        
        return $formatted;
    }

    private function validateSelection(string $matchId, string $selection, mixed $odds, string $type): array
    {
        if (preg_match('/^[a-f0-9]{24}$/i', $matchId) !== 1) {
            throw new ApiException('Match not found: ' . $matchId, 404);
        }

        $match = $this->db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
        if ($match === null) {
            throw new ApiException('Match not found: ' . $matchId, 404);
        }

        // Sharp protection: if this match's odds are older than the bet-time
        // freshness threshold, force a synchronous upstream fetch for the
        // sport before we validate the price. Without this, a sharp could
        // exploit the gap between worker syncs to lock in a stale price the
        // book would have moved off. Goes through the existing per-sport
        // SharedFileCache::remember dedup, so concurrent bets on the same
        // sport share one upstream call.
        $betTimeFreshSecs = max(5, (int) Env::get('BET_TIME_ODDS_FRESH_SECONDS', '30'));
        $sportKey = (string) ($match['sportKey'] ?? '');
        $lastOddsAt = (string) ($match['lastOddsSyncAt'] ?? $match['lastUpdated'] ?? '');
        $oddsAge = $lastOddsAt !== '' ? max(0, time() - (int) strtotime($lastOddsAt)) : PHP_INT_MAX;
        if ($sportKey !== '' && $oddsAge > $betTimeFreshSecs && class_exists('OddsSyncService')) {
            $dedupWindow = max(1, (int) Env::get('ODDS_REFRESH_DEDUP_WINDOW_SECONDS', '20'));
            try {
                SharedFileCache::remember(
                    'sportsbook-on-demand-refresh',
                    $sportKey,
                    $dedupWindow,
                    fn(): array => OddsSyncService::syncSingleSport($this->db, $sportKey)
                );
                // Re-read the now-updated row so the price comparison below
                // sees the freshest odds. If the upstream call failed, the
                // existing row stays in place and validation continues
                // against the older DB price (fail-open on upstream issues
                // is better than blocking all bets when the API hiccups).
                $refreshed = $this->db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
                if (is_array($refreshed)) {
                    $match = $refreshed;
                }
            } catch (Throwable $_) {
                // Swallow upstream errors — proceed with the existing match
                // row. The official-odds check below still runs and ODDS_CHANGED
                // still throws if the price moved beyond the client's quote.
            }
        }

        $match = SportsbookHealth::applyBettingAvailability($this->db, $match);
        if (($match['isBettable'] ?? false) !== true) {
            throw new ApiException((string) (($match['bettingBlockedReason'] ?? null) ?: SportsMatchStatus::placementBlockReason($match) ?: 'Match is not open for betting'), 409, [
                'code' => 'MATCH_NOT_BETTABLE',
                'matchStatus' => $match['status'] ?? null,
            ]);
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
            throw new ApiException('Market ' . $type . ' not available for ' . ($match['homeTeam'] ?? '') . ' vs ' . ($match['awayTeam'] ?? ''), 409, [
                'code' => 'MARKET_UNAVAILABLE',
            ]);
        }

        $marketStatus = strtolower((string) ($market['status'] ?? 'active'));
        $marketActive = !array_key_exists('active', $market) || (bool) $market['active'] === true;
        if (!$marketActive || in_array($marketStatus, ['suspended', 'closed', 'settled', 'canceled', 'cancelled', 'expired', 'inactive'], true)) {
            throw new ApiException('Market ' . $type . ' is not open for betting', 409, [
                'code' => 'MARKET_CLOSED',
            ]);
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
            throw new ApiException('Selection ' . $selection . ' not available for ' . ($match['homeTeam'] ?? '') . ' vs ' . ($match['awayTeam'] ?? ''), 409, [
                'code' => 'SELECTION_UNAVAILABLE',
            ]);
        }

        $outcomeStatus = strtolower((string) ($outcome['status'] ?? 'active'));
        $outcomeActive = !array_key_exists('active', $outcome) || (bool) $outcome['active'] === true;
        if (!$outcomeActive || in_array($outcomeStatus, ['suspended', 'closed', 'settled', 'canceled', 'cancelled', 'expired', 'inactive'], true)) {
            throw new ApiException('Selection ' . $selection . ' is not open for betting', 409, [
                'code' => 'SELECTION_CLOSED',
            ]);
        }

        $officialOdds = (float) $outcome['price'];
        $clientOdds = is_numeric($odds) ? (float) $odds : 0.0;
        if (!is_finite($officialOdds) || $officialOdds <= 0) {
            throw new ApiException('Invalid odds for selection ' . $selection, 409, [
                'code' => 'INVALID_ODDS',
            ]);
        }

        if ($officialOdds > 10000.0) {
            throw new ApiException('Odds exceed maximum allowed value for selection ' . $selection, 409, [
                'code' => 'ODDS_EXCEEDS_MAX',
            ]);
        }

        if ($clientOdds > 0 && abs($officialOdds - $clientOdds) > 0.0001) {
            throw new ApiException('Odds changed. Please review the updated price before placing the bet.', 409, [
                'code' => 'ODDS_CHANGED',
                'officialOdds' => $officialOdds,
                'clientOdds' => $clientOdds,
                'selection' => (string) ($outcome['name'] ?? $selection),
                'matchId' => $matchId,
            ]);
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
            'matchId' => SqlRepository::id((string) $selection['matchId']),
            'selection' => $selection['selection'],
            'odds' => (float) $selection['odds'],
            'marketType' => $selection['marketType'] ?? '',
            'point' => $selection['point'] ?? null,
            'basePoint' => $selection['basePoint'] ?? ($selection['point'] ?? null),
            'teaserAdjustment' => $selection['teaserAdjustment'] ?? 0.0,
            'status' => 'pending',
            'matchSnapshot' => $selection['matchSnapshot'] ?? new stdClass(),
        ];
    }

    /**
     * @param array<int, string> $betIds
     * @param array<string, mixed> $meta
     * @return array<string, mixed>
     */
    private function buildBetPlacementResponse(array $betIds, array $meta): array
    {
        return [
            'message' => 'Bet placed successfully',
            'bets' => $this->loadEnrichedBetsByIds($betIds),
            'requestId' => $meta['requestId'] ?? null,
            'balance' => $this->num($meta['balance'] ?? 0),
            'pendingBalance' => $this->num($meta['pendingBalance'] ?? 0),
        ];
    }

    /**
     * @param array<int, string> $betIds
     * @return array<int, array<string, mixed>>
     */
    private function loadEnrichedBetsByIds(array $betIds): array
    {
        $bets = [];
        foreach ($betIds as $betId) {
            if (!is_string($betId) || preg_match('/^[a-f0-9]{24}$/i', $betId) !== 1) {
                continue;
            }
            $bet = $this->db->findOne('bets', ['id' => SqlRepository::id($betId)]);
            if ($bet !== null) {
                $bets[] = $this->enrichBetDocument($bet);
            }
        }
        return $bets;
    }

    /**
     * @param array<string, mixed> $bet
     * @return array<string, mixed>
     */
    private function enrichBetDocument(array $bet): array
    {
        $selectionRows = SportsbookBetSupport::ensureSelectionRowsForBet($this->db, $bet);
        $enriched = SportsbookBetSupport::enrichBetForResponse($bet, $selectionRows);

        $matchId = (string) ($bet['matchId'] ?? '');
        if ($matchId !== '' && preg_match('/^[a-f0-9]{24}$/i', $matchId) === 1) {
            $match = $this->db->findOne('matches', ['id' => SqlRepository::id($matchId)], [
                'projection' => [
                    'homeTeam' => 1,
                    'awayTeam' => 1,
                    'startTime' => 1,
                    'sport' => 1,
                    'league' => 1,
                    'status' => 1,
                ],
            ]);
            if ($match !== null) {
                $enriched['match'] = SportsbookHealth::applyBettingAvailability($this->db, $match);
            }
        }

        return $enriched;
    }

    private function getModeRule(string $mode): ?array
    {
        $normalized = BetModeRules::normalize($mode);

        // Ensure DB is seeded before reading so rules are always present even if the
        // admin betting-rules endpoint was never called (e.g. fresh install).
        $this->ensureBetModeRulesSeeded($normalized);

        $dbRule = $this->db->findOne('betmoderules', ['mode' => $normalized, 'isActive' => true]);
        if ($dbRule !== null) {
            return $dbRule;
        }
        return BetModeRules::getDefault($normalized);
    }

    private function ensureBetModeRulesSeeded(string $mode): void
    {
        $exists = $this->db->findOne('betmoderules', ['mode' => $mode]);
        if ($exists !== null) {
            return; // already seeded — skip upsert on every bet placement
        }
        $rule = BetModeRules::getDefault($mode);
        if ($rule === null) {
            return;
        }
        $now = SqlRepository::nowUtc();
        try {
            $this->db->updateOneUpsert(
                'betmoderules',
                ['mode' => $mode],
                ['updatedAt' => $now],
                array_merge($rule, ['createdAt' => $now, 'updatedAt' => $now])
            );
        } catch (Throwable $ignored) {
            // Non-fatal: fallback will use BetModeRules::getDefault()
        }
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
            Response::json(['message' => 'Not authorized'], 401);
            return null;
        }

        $role = (string) ($decoded['role'] ?? 'user');
        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $collection = $this->collectionByRole($role);
        $actor = $this->db->findOne($collection, ['id' => SqlRepository::id($id)]);
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
            $userId = SqlRepository::id((string) $user['id']);
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
