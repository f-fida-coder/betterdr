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
        // Self-healing endpoint for stuck-pending bets — used when the
        // odds feed posted final scores but never flipped a match's
        // `status` to `finished`, leaving the leg (and its parlay) stuck
        // pending forever. Scans the caller's pending bets, force-flips
        // any provably-finished matches, and runs settlement on them.
        if ($path === '/api/bets/regrade-stuck' && $method === 'POST') {
            $this->regradeStuckBets();
            return true;
        }
        // GET /api/bets/group/{24-hex}/children — lazy-loaded child
        // parlays for a Round Robin group. The group row in getMyBets
        // returns just metadata (sizes, parlayCount, totals) so the
        // initial bets list stays a fixed shape; the user clicks the
        // expand chevron and the frontend fetches the children on
        // demand. Auth-gated to the group's owner.
        if ($method === 'GET' && preg_match('#^/api/bets/group/([a-f0-9]{24})/children$#i', $path, $m) === 1) {
            $this->getRoundRobinChildren($m[1]);
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

            $betAmount = is_numeric($amount) ? (float) round((float) $amount) : 0.0;
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

            // min/max bet limits are validated AFTER selections + odds are
            // resolved (see the $winAmount check after potentialPayout is
            // computed below). They apply to the *win* amount, not the
            // risk amount — the agent's exposure on every ticket is the
            // win, so caps gate that, not the user's own credit obligation.
            // Risk is bounded separately by available_credit further down.

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

            // Collect ODDS_CHANGED rejections across all legs into a single
            // 409 response. Throwing on the first mismatch made the user
            // chase moving prices one leg at a time — on a 3-leg parlay
            // with 2 legs moved, they'd hit ODDS_CHANGED, the slip would
            // still hold the stale prices (frontend never read the new
            // official odds out of the error payload), and the next click
            // would fail on the same leg again. Aggregating here lets the
            // client patch every changed leg in one round-trip and the
            // user accepts the whole new ticket with one tap.
            $validatedSelections = [];
            $priceChanges = [];
            foreach ($selectionInputs as $idx => $sel) {
                try {
                    $validatedSelections[] = $this->validateSelection(
                        trim((string) ($sel['matchId'] ?? '')),
                        trim((string) ($sel['selection'] ?? '')),
                        $sel['odds'] ?? null,
                        BetModeRules::normalize((string) ($sel['type'] ?? ($sel['marketType'] ?? 'straight')))
                    );
                } catch (ApiException $e) {
                    $details = $e->payload();
                    if (($details['code'] ?? null) === 'ODDS_CHANGED') {
                        $priceChanges[] = [
                            'index' => $idx,
                            'matchId' => (string) ($details['matchId'] ?? trim((string) ($sel['matchId'] ?? ''))),
                            'selection' => (string) ($details['selection'] ?? trim((string) ($sel['selection'] ?? ''))),
                            'marketType' => BetModeRules::normalize((string) ($sel['type'] ?? ($sel['marketType'] ?? 'straight'))),
                            'officialOdds' => $details['officialOdds'] ?? null,
                            'officialAmericanOdds' => $details['officialAmericanOdds'] ?? null,
                        ];
                        // Keep iterating so we surface every moved leg in
                        // one error. Other validation failures (market
                        // closed, selection unavailable, invalid odds)
                        // still fast-fail because they aren't recoverable
                        // by re-pricing the leg.
                        continue;
                    }
                    throw $e;
                }
            }
            if (count($priceChanges) > 0) {
                $first = $priceChanges[0];
                throw new ApiException('Odds changed. Please review the updated price before placing the bet.', 409, [
                    'code' => 'ODDS_CHANGED',
                    'legs' => $priceChanges,
                    // Legacy single-leg fields kept for older clients that
                    // don't read the legs array yet — they continue to see
                    // the same payload they always did.
                    'officialOdds' => $first['officialOdds'],
                    'officialAmericanOdds' => $first['officialAmericanOdds'],
                    'selection' => $first['selection'],
                    'matchId' => $first['matchId'],
                ]);
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
                'amount' => round($betAmount),
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

            // Round Robin diverges hard from single-ticket placement —
            // it fans out into N child parlay rows + 1 group row inside
            // its own transaction. Everything BEFORE this point (auth,
            // leg validation, idempotency lock) is shared; everything
            // AFTER is the single-ticket flow that the other 5 modes
            // need. Dispatch and return so we don't drag round-robin
            // through code that assumes one bet per placement.
            if ($type === 'round_robin') {
                $this->placeRoundRobin(
                    $user,
                    $userId,
                    $body,
                    $requestId,
                    $requestDocId,
                    $validatedSelections,
                    $modeRule,
                    $useFreeplay,
                    $betAmount
                );
                $requestDocOwned = false; // placeRoundRobin owns the doc closure now
                return;
            }

            $totalRisk = SportsbookBetSupport::ticketRiskAmount($type, $betAmount);
            $potentialPayout = SportsbookBetSupport::calculatePotentialPayout($type, $betAmount, $validatedSelections, $modeRule);

            // Win-mode pinning: when the client typed in Win mode and sent
            // `requestedWin`, lock potentialPayout = totalRisk + requestedWin
            // so the player gets exactly what they typed. Otherwise the
            // round(risk × decimal) recompute drifts to $999/$1001 on a
            // typed $1000 win for non-round odds. Range-checked so a stray
            // / malicious value can't manipulate payout — must be within
            // ±$2 of the computed payout, which is the worst-case rounding
            // drift for any single integer-risk leg.
            $requestedWinRaw = $body['requestedWin'] ?? null;
            if (is_numeric($requestedWinRaw)) {
                $requestedWin = (float) round((float) $requestedWinRaw);
                $pinnedPayout = $totalRisk + $requestedWin;
                if ($requestedWin > 0 && abs($pinnedPayout - $potentialPayout) <= 2.0) {
                    $potentialPayout = $pinnedPayout;
                }
            }

            $combinedOdds = SportsbookBetSupport::combinedOdds($totalRisk, $potentialPayout);

            // Min bet is risk-anchored: every ticket must stake at least
            // $minBet. Max bet stays win-anchored — the operator's exposure
            // is potentialPayout - totalRisk (the profit paid out if the
            // bet hits), and a heavy favorite like -500 can still take a
            // $5,000 risk to win $1,000 against a $3,000 max because the
            // bookie's exposure is only $1,000.
            $winAmount = max(0.0, (float) $potentialPayout - (float) $totalRisk);
            $minBetLimit = isset($user['minBet']) && is_numeric($user['minBet']) ? (float) $user['minBet'] : 0.0;
            $maxBetLimit = isset($user['maxBet']) && is_numeric($user['maxBet']) ? (float) $user['maxBet'] : 0.0;
            if ($minBetLimit > 0 && (float) $totalRisk < $minBetLimit) {
                throw new ApiException(
                    'Min bet is $' . rtrim(rtrim(number_format($minBetLimit, 2, '.', ''), '0'), '.')
                    . ' — this ticket only risks $' . rtrim(rtrim(number_format((float) $totalRisk, 2, '.', ''), '0'), '.'),
                    400,
                    ['code' => 'BELOW_MIN_BET']
                );
            }
            // Combined modes (parlay/teaser/if_bet/reverse) follow a
            // different rule: instead of rejecting bets that win more
            // than maxBet, cap the *payout* at the parlay limit (default
            // 3 × maxBet). The user can still place the bet — they just
            // won't be paid more than the cap if it hits. Straight
            // tickets still hard-block above maxBet, since they're sized
            // one-leg-at-a-time and the operator wants the max-win
            // ceiling enforced per leg.
            $isCombinedMode = in_array($type, ['parlay', 'teaser', 'if_bet', 'reverse'], true);
            if ($isCombinedMode && $maxBetLimit > 0) {
                $parlayPayoutCap = $maxBetLimit * 3.0;
                if ($winAmount > $parlayPayoutCap) {
                    $potentialPayout = (float) $totalRisk + $parlayPayoutCap;
                    $winAmount = $parlayPayoutCap;
                    $combinedOdds = SportsbookBetSupport::combinedOdds($totalRisk, $potentialPayout);
                }
            } elseif ($maxBetLimit > 0 && $winAmount > $maxBetLimit) {
                throw new ApiException(
                    'Max bet to win is $' . rtrim(rtrim(number_format($maxBetLimit, 2, '.', ''), '0'), '.')
                    . ' — this ticket wins $' . rtrim(rtrim(number_format($winAmount, 2, '.', ''), '0'), '.') . ' (over limit)',
                    400,
                    ['code' => 'ABOVE_MAX_BET']
                );
            }
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

                $balance         = $this->num($lockedUser['balance'] ?? 0);
                $pending         = $this->num($lockedUser['pendingBalance'] ?? 0);
                $freeplayBalance = $this->num($lockedUser['freeplayBalance'] ?? 0);
                $creditLimit     = $this->num($lockedUser['creditLimit'] ?? 0);
                $role            = strtolower((string) ($lockedUser['role'] ?? 'user'));
                $isCreditAccount = $role === 'user' && $creditLimit > 0;
                $available       = $isCreditAccount
                    ? max(0.0, $creditLimit + $balance - $pending)
                    : max(0.0, $balance - $pending);

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

                // Partial-freeplay funding: if useFreeplay is checked and the
                // ticket exceeds the freeplay balance, apply the entire
                // freeplay pool first, then charge the remainder from the real
                // balance. The bet record stores `freeplayAmountUsed` so the
                // settlement service can split refunds and payouts correctly
                // between the two pools.
                $freeplayApplied = 0.0;
                if ($useFreeplay) {
                    if ($freeplayBalance <= 0) {
                        $this->db->rollback();
                        throw new ApiException(
                            'Your freeplay credits have expired or been used.',
                            400,
                            ['code' => 'FREEPLAY_EXPIRED']
                        );
                    }
                    $freeplayApplied = min($freeplayBalance, $totalRisk);
                }
                $realPortion = (float) max(0.0, $totalRisk - $freeplayApplied);

                if ($realPortion > 0) {
                    if ($available < $realPortion) {
                        $this->db->rollback();
                        throw new ApiException(
                            $useFreeplay
                                ? 'Bet exceeds freeplay + available balance. Lower the stake or uncheck freeplay.'
                                : 'Insufficient available balance',
                            400,
                            ['code' => 'INSUFFICIENT_BALANCE']
                        );
                    }
                    // Loss limits apply only to the real-money portion. The
                    // freeplay portion is house-funded so it doesn't count
                    // against the player's self-imposed loss caps.
                    $gamblingLimits = is_array($lockedUser['gamblingLimits'] ?? null) ? $lockedUser['gamblingLimits'] : [];
                    $lossLimitMsg = $this->checkLossLimits($lockedUser, $gamblingLimits, $realPortion);
                    if ($lossLimitMsg !== null) {
                        $this->db->rollback();
                        throw new ApiException($lossLimitMsg, 400);
                    }
                }

                // Cash accounts move stake out of `balance` at placement;
                // credit accounts hold it in `pendingBalance` only and never
                // debit `balance` until LOSS settlement (avoids double-
                // charging available credit, which is balance + creditLimit
                // - pending).
                $newBalance  = $isCreditAccount ? $balance : ($balance - $realPortion);
                $newPending  = $pending + $realPortion;
                $newFreeplay = $freeplayBalance - $freeplayApplied;

                $userUpdateFields = [
                    'balance'         => $newBalance,
                    'pendingBalance'  => $newPending,
                    'freeplayBalance' => $newFreeplay,
                    'betCount'        => ((int) ($lockedUser['betCount'] ?? 0)) + 1,
                    'updatedAt'       => SqlRepository::nowUtc(),
                ];
                if ($realPortion > 0) {
                    $userUpdateFields['totalWagered'] = $this->num($lockedUser['totalWagered'] ?? 0) + $realPortion;
                }
                $this->db->updateOne('users', ['id' => SqlRepository::id((string) $lockedUser['id'])], $userUpdateFields);

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
                    // Exact dollars sourced from freeplay. When equal to
                    // riskAmount: pure freeplay ticket. When < riskAmount &&
                    // > 0: partial freeplay (rest came from real balance /
                    // credit). Settlement uses this to split refunds and
                    // pending decrements between pools.
                    'freeplayAmountUsed' => (float) $freeplayApplied,
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
                    'oddsAmerican' => $single && isset($single['oddsAmerican']) ? (int) $single['oddsAmerican'] : null,
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
                    'freeplayAmountUsed' => (float) $freeplayApplied,
                    'balanceBefore' => $useFreeplay ? $freeplayBalance : $balance,
                    'balanceAfter'  => $useFreeplay ? $newFreeplay  : $newBalance,
                    'referenceType' => 'Bet',
                    'referenceId' => SqlRepository::id($createdBetIds[0]),
                    'reason' => $useFreeplay ? 'FP_BET_PLACED' : 'BET_PLACED',
                    'description' => strtoupper($type)
                        . ($useFreeplay ? ' freeplay' : '')
                        . ' bet placed'
                        . ($freeplayApplied > 0 && $realPortion > 0
                            ? ' ($' . number_format($freeplayApplied, 0) . ' fp + $' . number_format($realPortion, 0) . ' bal)'
                            : ''),
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

    /**
     * Round Robin placement — generate N child parlays from the user's
     * selection set + chosen sizes, debit the total stake atomically,
     * write one display-only group row, and return the group + child
     * ids. Each child row in `bets` has type='parlay' so the entire
     * settlement / commission / figures pipeline treats it like any
     * other parlay (financial truth lives in the children, see
     * RoundRobinService doc comment).
     *
     * Freeplay policy (decision 2026-05-05): Round Robin is treated
     * identically to a parlay for freeplay purposes — the entire
     * `totalRisk` is debited from `freeplayBalance`, every child is
     * marked `isFreeplay=true`, and partial wins credit profit
     * per-child to real balance via the existing freeplay branches in
     * BetSettlementService::settleMatch. There is no separate
     * eligibility flag today; if production exposure dictates one, add
     * `freeplayEligible` to BetModeRules instead of branching here.
     *
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     * @param array<int, array<string, mixed>> $validatedSelections
     * @param array<string, mixed> $modeRule
     */
    private function placeRoundRobin(
        array $user,
        string $userId,
        array $body,
        string $requestId,
        string $requestDocId,
        array $validatedSelections,
        array $modeRule,
        bool $useFreeplay,
        float $stakePerParlay
    ): void {
        $selectionCount = count($validatedSelections);

        // ── Parse + validate sizes ───────────────────────────────────────
        $rawSizes = is_array($body['sizes'] ?? null) ? $body['sizes'] : [];
        $sizes = [];
        foreach ($rawSizes as $s) {
            if (!is_numeric($s)) continue;
            $intSize = (int) $s;
            if ($intSize < 2 || $intSize >= $selectionCount) {
                throw new ApiException(
                    'Round Robin sizes must be between 2 and ' . ($selectionCount - 1) . ' for ' . $selectionCount . ' selections',
                    400,
                    ['code' => 'INVALID_ROUND_ROBIN_SIZE']
                );
            }
            $sizes[] = $intSize;
        }
        $sizes = array_values(array_unique($sizes));
        sort($sizes);
        if ($sizes === []) {
            throw new ApiException('Round Robin requires at least one size', 400, [
                'code' => 'ROUND_ROBIN_SIZES_REQUIRED',
            ]);
        }

        // ── Combinations + cap check ─────────────────────────────────────
        $parlayCount = RoundRobinService::combinationCount($selectionCount, $sizes);
        if ($parlayCount === 0) {
            throw new ApiException('Round Robin sizes produced zero combinations', 400);
        }
        $maxParlays = isset($modeRule['maxParlaysPerGroup']) && is_numeric($modeRule['maxParlaysPerGroup'])
            ? (int) $modeRule['maxParlaysPerGroup']
            : 50;
        if ($parlayCount > $maxParlays) {
            throw new ApiException(
                'Round Robin generates ' . $parlayCount . ' parlays — limit is ' . $maxParlays
                . '. Pick fewer sizes or selections.',
                400,
                ['code' => 'MAX_PARLAYS_EXCEEDED']
            );
        }

        // ── Build per-child plans (combo + odds + payout, capped) ─────────
        $maxBetLimit = isset($user['maxBet']) && is_numeric($user['maxBet']) ? (float) $user['maxBet'] : 0.0;
        $minBetLimit = isset($user['minBet']) && is_numeric($user['minBet']) ? (float) $user['minBet'] : 0.0;
        $childPlans = [];
        $totalPayoutMax = 0.0;
        foreach ($sizes as $size) {
            $combinations = RoundRobinService::generateCombinations($validatedSelections, $size);
            foreach ($combinations as $combo) {
                $combinedDecimal = 1.0;
                foreach ($combo as $sel) {
                    $combinedDecimal *= (float) ($sel['odds'] ?? 0);
                }
                if ($combinedDecimal <= 1.0) {
                    throw new ApiException('Round Robin child has non-positive odds', 400);
                }
                $childPayout = round($stakePerParlay * $combinedDecimal, 2);

                // Per-child win cap follows the parlay convention: the
                // operator's exposure on each child is the win amount,
                // not the stake. Mirrors the placeBet $isCombinedMode
                // path so a Round Robin child can't sneak past the
                // 3 × maxBet ceiling that a standalone parlay obeys.
                $childWin = max(0.0, $childPayout - $stakePerParlay);
                if ($maxBetLimit > 0) {
                    $cap = $maxBetLimit * 3.0;
                    if ($childWin > $cap) {
                        $childPayout = $stakePerParlay + $cap;
                        $childWin = $cap;
                    }
                }
                if ($minBetLimit > 0 && (float) $stakePerParlay < $minBetLimit) {
                    throw new ApiException(
                        'Min bet is $' . rtrim(rtrim(number_format($minBetLimit, 2, '.', ''), '0'), '.')
                        . ' — each Round Robin child only risks $' . rtrim(rtrim(number_format((float) $stakePerParlay, 2, '.', ''), '0'), '.'),
                        400,
                        ['code' => 'BELOW_MIN_BET']
                    );
                }
                $totalPayoutMax += $childPayout;
                $childPlans[] = [
                    'selections' => $combo,
                    'combinedDecimal' => $combinedDecimal,
                    'potentialPayout' => $childPayout,
                ];
            }
        }

        $totalRisk = round($stakePerParlay * $parlayCount, 2);
        $ticketId = SportsbookBetSupport::idempotencyDocumentId('sportsbook_ticket', $userId, $requestId);
        $groupId = SportsbookBetSupport::idempotencyDocumentId('rr_group', $userId, $requestId);

        // ── Transaction: balance debit + group + children + ledger ────────
        $createdBetIds = [];
        $newBalance = 0.0;
        $newPending = 0.0;
        $newFreeplay = 0.0;

        $this->db->beginTransaction();
        try {
            $lockedUser = $this->db->findOneForUpdate('users', ['id' => SqlRepository::id((string) $user['id'])]);
            if ($lockedUser === null) {
                $this->db->rollback();
                throw new ApiException('User not found', 404);
            }

            $balance         = $this->num($lockedUser['balance'] ?? 0);
            $pending         = $this->num($lockedUser['pendingBalance'] ?? 0);
            $freeplayBalance = $this->num($lockedUser['freeplayBalance'] ?? 0);
            $creditLimit     = $this->num($lockedUser['creditLimit'] ?? 0);
            $role            = strtolower((string) ($lockedUser['role'] ?? 'user'));
            $isCreditAccount = $role === 'user' && $creditLimit > 0;
            $available       = $isCreditAccount
                ? max(0.0, $creditLimit + $balance - $pending)
                : max(0.0, $balance - $pending);

            // Mirrors placeBet: useFreeplay applies the freeplay pool first
            // (entire balance if it's smaller than the ticket), then charges
            // the remainder from real balance / credit. Each child parlay
            // inherits the per-child split via $childFreeplayApplied below.
            $freeplayApplied = 0.0;
            if ($useFreeplay) {
                if ($freeplayBalance <= 0) {
                    $this->db->rollback();
                    throw new ApiException('Your freeplay credits have expired or been used.', 400, ['code' => 'FREEPLAY_EXPIRED']);
                }
                $freeplayApplied = min($freeplayBalance, $totalRisk);
            }
            $realPortion = (float) max(0.0, $totalRisk - $freeplayApplied);

            if ($realPortion > 0) {
                if ($available < $realPortion) {
                    $this->db->rollback();
                    throw new ApiException(
                        $useFreeplay
                            ? 'Bet exceeds freeplay + available balance. Lower the stake or uncheck freeplay.'
                            : 'Insufficient available balance',
                        400,
                        ['code' => 'INSUFFICIENT_BALANCE']
                    );
                }
                $gamblingLimits = is_array($lockedUser['gamblingLimits'] ?? null) ? $lockedUser['gamblingLimits'] : [];
                $lossLimitMsg = $this->checkLossLimits($lockedUser, $gamblingLimits, $realPortion);
                if ($lossLimitMsg !== null) {
                    $this->db->rollback();
                    throw new ApiException($lossLimitMsg, 400);
                }
            }

            $newBalance  = $isCreditAccount ? $balance : ($balance - $realPortion);
            $newPending  = $pending + $realPortion;
            $newFreeplay = $freeplayBalance - $freeplayApplied;
            $userUpdateFields = [
                'balance'         => $newBalance,
                'pendingBalance'  => $newPending,
                'freeplayBalance' => $newFreeplay,
                'betCount'        => ((int) ($lockedUser['betCount'] ?? 0)) + 1,
                'updatedAt'       => SqlRepository::nowUtc(),
            ];
            if ($realPortion > 0) {
                $userUpdateFields['totalWagered'] = $this->num($lockedUser['totalWagered'] ?? 0) + $realPortion;
            }
            $this->db->updateOne('users', ['id' => SqlRepository::id((string) $lockedUser['id'])], $userUpdateFields);

            // Per-child freeplay share: distribute the applied freeplay pro
            // rata across the N children so each child's freeplayAmountUsed
            // sums back to $freeplayApplied. Stake per child is identical
            // ($stakePerParlay), so the share is just $freeplayApplied / N.
            $childCount = max(1, count($childPlans));
            $childFreeplayApplied = $freeplayApplied > 0 ? round($freeplayApplied / $childCount, 2) : 0.0;

            $ipAddress = IpUtils::clientIp();
            $userAgent = Http::header('user-agent');
            $now = SqlRepository::nowUtc();

            // 1) Group row — display metadata only. Never summed by
            //    accounting code; commissions / figures / settlement all
            //    iterate the child rows in `bets`.
            $this->db->insertOne('round_robin_groups', [
                'id' => $groupId,
                'userId' => $userId,
                'ticketId' => $ticketId,
                'requestId' => $requestId,
                'sizes' => $sizes,
                'selectionCount' => $selectionCount,
                'parlayCount' => $parlayCount,
                'stakePerParlay' => $stakePerParlay,
                'totalRisk' => $totalRisk,
                'totalPotentialPayout' => round($totalPayoutMax, 2),
                'totalPayout' => 0.0,
                'status' => 'pending',
                'isFreeplay' => $useFreeplay,
                'createdAt' => $now,
                'updatedAt' => $now,
            ]);

            // 2) N child parlay rows. type='parlay' so existing settlement,
            //    commission, agent reports, and admin streams treat each
            //    one as the standalone parlay it really is.
            foreach ($childPlans as $idx => $plan) {
                $childCombinedOdds = SportsbookBetSupport::combinedOdds($stakePerParlay, $plan['potentialPayout']);
                $selectionDocs = array_map(fn (array $row): array => $this->selectionForInsert($row), $plan['selections']);
                $childDoc = [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'ticketId' => $ticketId,
                    'parentGroupId' => $groupId,
                    'roundRobinSize' => count($plan['selections']),
                    'roundRobinIndex' => $idx,
                    'amount' => $stakePerParlay,
                    'riskAmount' => $stakePerParlay,
                    'unitStake' => $stakePerParlay,
                    'type' => 'parlay',
                    'potentialPayout' => $plan['potentialPayout'],
                    'combinedOdds' => $childCombinedOdds,
                    'status' => 'pending',
                    'isFreeplay' => $useFreeplay,
                    'freeplayAmountUsed' => (float) min($childFreeplayApplied, $stakePerParlay),
                    'ipAddress' => $ipAddress,
                    'userAgent' => $userAgent,
                    'teaserPoints' => 0.0,
                    'selections' => $selectionDocs,
                    'matchId' => null,
                    'selection' => 'MULTI',
                    'odds' => $childCombinedOdds,
                    'oddsAmerican' => null,
                    'marketType' => 'parlay',
                    'description' => SportsbookBetSupport::descriptionForSelections($selectionDocs),
                    'matchSnapshot' => new stdClass(),
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $childBetId = $this->db->insertOne('bets', $childDoc);
                $createdBetIds[] = $childBetId;
                $createdBet = $this->db->findOne('bets', ['id' => SqlRepository::id($childBetId)]) ?? array_merge($childDoc, ['id' => $childBetId]);
                SportsbookBetSupport::upsertSelectionRowsForBet($this->db, $createdBet, $selectionDocs);
            }

            // 3) Single ledger row for the whole Round Robin debit. The
            //    children are settlement-time entries; this is the user's
            //    record of "I staked $X on a round robin".
            $this->db->insertOne('transactions', [
                'userId' => $userId,
                'amount' => $totalRisk,
                'type' => $useFreeplay ? 'fp_bet_placed' : 'bet_placed',
                'status' => 'completed',
                'isFreeplay' => $useFreeplay,
                'balanceBefore' => $useFreeplay ? $freeplayBalance : $balance,
                'balanceAfter'  => $useFreeplay ? $newFreeplay  : $newBalance,
                'referenceType' => 'RoundRobinGroup',
                'referenceId' => SqlRepository::id($groupId),
                'reason' => $useFreeplay ? 'FP_BET_PLACED' : 'BET_PLACED',
                'description' => 'ROUND ROBIN' . ($useFreeplay ? ' freeplay' : '') . ' — ' . $parlayCount . ' parlays',
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

        // Mark the betrequest as completed so a duplicate POST replays
        // the response instead of double-charging.
        $this->db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
            'status' => 'completed',
            'betIds' => $createdBetIds,
            'groupId' => $groupId,
            'ticketId' => $ticketId,
            'responseBalance' => $newBalance,
            'responsePendingBalance' => $newPending,
            'updatedAt' => SqlRepository::nowUtc(),
        ]);

        QueryCache::getInstance()->forgetPattern('bets:' . $userId . ':*');

        $childResponses = $this->loadEnrichedBetsByIds($createdBetIds);
        $response = [
            'message' => 'Round Robin placed successfully',
            'requestId' => $requestId,
            'group' => [
                'id' => $groupId,
                'ticketId' => $ticketId,
                'sizes' => $sizes,
                'selectionCount' => $selectionCount,
                'parlayCount' => $parlayCount,
                'stakePerParlay' => $stakePerParlay,
                'totalRisk' => $totalRisk,
                'totalPotentialPayout' => round($totalPayoutMax, 2),
                'status' => 'pending',
            ],
            'bets' => $childResponses,
            'balance' => $newBalance,
            'pendingBalance' => $newPending,
        ];
        Response::json($response, 201);
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

    /**
     * Self-healing pass for stuck-pending bets. The normal settlement
     * pipeline only runs on matches whose `status` field is one of
     * `finished` / `canceled` / `expired` (per SportsMatchStatus::
     * effectiveStatus). When the upstream odds feed posts final scores
     * but never flips that status field — a real edge case we've seen on
     * several feeds — the legs and the parent parlay stay pending
     * forever, surfacing as a stuck Pending balance in the header.
     *
     * This endpoint walks the caller's own pending bets, identifies
     * matches that are *provably* over (have non-zero scores AND start
     * time was at least the minimum game duration ago AND haven't been
     * touched by the sync feed for ≥30 min) and force-flips their
     * status to `finished`, then runs the regular settlement service so
     * legs grade and parlays resolve.
     *
     * Auth-gated to the calling user only — never escalates to other
     * users' bets, so safe to call from the player UI.
     */
    private function regradeStuckBets(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            $userId = (string) $actor['id'];

            $pendingBets = $this->db->findMany('bets', [
                'userId' => SqlRepository::id($userId),
                'status' => 'pending',
            ], ['projection' => ['id' => 1, 'matchId' => 1, 'selections' => 1], 'limit' => 200]);

            $matchIds = [];
            foreach ($pendingBets as $bet) {
                $top = (string) ($bet['matchId'] ?? '');
                if ($top !== '' && preg_match('/^[a-f0-9]{24}$/i', $top) === 1) {
                    $matchIds[$top] = true;
                }
                if (is_array($bet['selections'] ?? null)) {
                    foreach ($bet['selections'] as $sel) {
                        if (!is_array($sel)) continue;
                        $mid = (string) ($sel['matchId'] ?? '');
                        if ($mid !== '' && preg_match('/^[a-f0-9]{24}$/i', $mid) === 1) {
                            $matchIds[$mid] = true;
                        }
                    }
                }
            }

            $now = time();
            $forced = [];
            $alreadyDone = [];
            $notDone = [];

            foreach (array_keys($matchIds) as $mid) {
                $match = $this->db->findOne('matches', ['id' => SqlRepository::id($mid)]);
                if ($match === null) continue;
                $effective = SportsMatchStatus::effectiveStatus($match, $now);
                if (in_array($effective, ['finished', 'canceled', 'expired'], true)) {
                    $alreadyDone[] = $mid;
                    continue;
                }

                if (BetSettlementService::looksProvablyFinished($match, $now)) {
                    // All three signals (score posted, started long enough
                    // ago, feed has gone quiet) agree the game is over —
                    // force-finish and let settlement do the rest. Same
                    // criteria the on-read sweep uses, so a player calling
                    // this endpoint can't trigger anything more aggressive
                    // than what runs automatically.
                    $this->db->updateOne('matches', ['id' => SqlRepository::id($mid)], [
                        'status' => 'finished',
                        'updatedAt' => SqlRepository::nowUtc(),
                        'autoFinishedReason' => 'stuck-pending-heal',
                    ]);
                    BetSettlementService::settleMatch($this->db, $mid, null, 'stuck-heal');
                    $forced[] = $mid;
                    Logger::info('regraded stuck match (manual)', [
                        'userId' => $userId,
                        'matchId' => $mid,
                    ], 'bets');
                } else {
                    $startTs = strtotime((string) ($match['startTime'] ?? '')) ?: 0;
                    $lastUpdatedRaw = (string) (($match['lastUpdated'] ?? '') ?: ($match['updatedAt'] ?? ''));
                    $lastUpdatedTs = $lastUpdatedRaw !== '' ? (strtotime($lastUpdatedRaw) ?: 0) : 0;
                    $homeScore = (float) ($match['score']['score_home'] ?? 0);
                    $awayScore = (float) ($match['score']['score_away'] ?? 0);
                    $hasScore = ($homeScore + $awayScore) > 0;
                    $longEnoughAgo = $startTs > 0 && ($now - $startTs) >= 90 * 60;
                    $notDone[] = [
                        'matchId' => $mid,
                        'reason' => !$hasScore ? 'no-score-yet'
                            : (!$longEnoughAgo ? 'started-too-recently'
                            : 'feed-still-syncing'),
                    ];
                }
            }

            Response::json([
                'pendingBetsScanned' => count($pendingBets),
                'matchesScanned' => count($matchIds),
                'forcedFinished' => $forced,
                'alreadyFinal' => $alreadyDone,
                'stillPending' => $notDone,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => $e->getMessage() ?: 'Error regrading stuck bets'], 500);
        }
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

            // Self-healing: opportunistically settle this user's stuck
            // tickets *before* reading. Covers the case where the
            // background worker isn't running on this environment yet —
            // pulling up the My Bets list drains expired/finished
            // matches the user actually has stake in. Cheap when there's
            // nothing to settle (no DB writes); skipped automatically if
            // a recent sweep already touched this user. Throttled to one
            // sweep per user per 30 s so a fast-refresh client doesn't
            // thrash the bets table.
            try {
                $throttleNs = SportsbookCache::userBetSweepNamespace();
                $throttleKey = 'sweep:' . $userId;
                // 30 s TTL — long enough to absorb tab refreshes and
                // poll loops, short enough that a finished match drains
                // within seconds of the user pulling up their bets.
                $recent = SharedFileCache::get($throttleNs, $throttleKey, 30);
                if ($recent === null) {
                    BetSettlementService::settlePendingMatchesForUser($this->db, $userId, 'on-read');
                    SharedFileCache::put($throttleNs, $throttleKey, ['at' => time()]);
                }
            } catch (Throwable $sweepErr) {
                // Fail-open: settlement issues here mustn't block the
                // user from seeing their bets. Logged so an admin can
                // notice if it's failing repeatedly.
                Logger::warn('on-read settlement sweep failed', [
                    'userId' => $userId,
                    'error' => $sweepErr->getMessage(),
                ], 'bets');
            }

            // Pending-balance reconciler. The Pending header in the UI
            // reads `users.pendingBalance`, which is incremented at
            // placement and decremented at settlement inside DB
            // transactions. Across edge cases (canceled placements,
            // partial old data, manual edits) it can drift away from
            // the true sum of riskAmount across pending bets — surfacing
            // as a "stuck $4 pending" header even after every bet has
            // settled. This recomputes from scratch and writes back if
            // the cached aggregate disagrees with truth by ≥ $1.
            // Throttled to once per user per 60 s so a fast-refresh
            // client doesn't hammer the SUM query.
            try {
                $reconcileKey = 'pendrec:' . $userId;
                $recent = SharedFileCache::get($throttleNs, $reconcileKey, 60);
                if ($recent === null) {
                    $pendingBets = $this->db->findMany('bets', [
                        'userId' => SqlRepository::id($userId),
                        'status' => 'pending',
                    ], ['projection' => ['riskAmount' => 1, 'amount' => 1, 'freeplayAmountUsed' => 1, 'isFreeplay' => 1]]);
                    $expectedPending = 0.0;
                    foreach ($pendingBets as $pb) {
                        // Mirror placement-time logic: only the real-balance
                        // portion of a bet sits in pendingBalance — freeplay
                        // dollars never touched it. Pure-freeplay tickets
                        // contribute zero to expected pending.
                        $risk = (float) ($pb['riskAmount'] ?? $pb['amount'] ?? 0);
                        $fpUsed = (float) ($pb['freeplayAmountUsed'] ?? (!empty($pb['isFreeplay']) ? $risk : 0));
                        $real = max(0.0, $risk - $fpUsed);
                        $expectedPending += $real;
                    }
                    $expectedPending = (float) round($expectedPending);
                    // Re-fetch the user — the settlement sweep above may
                    // have just decremented pendingBalance, and `$user`
                    // from $this->protect() is the pre-sweep snapshot. A
                    // stale read would trigger an unnecessary write race.
                    $freshUser = $this->db->findOne('users', ['id' => SqlRepository::id($userId)], [
                        'projection' => ['pendingBalance' => 1],
                    ]);
                    $currentPending = (float) round((float) ($freshUser['pendingBalance'] ?? 0));
                    if (abs($expectedPending - $currentPending) >= 1.0) {
                        $this->db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                            'pendingBalance' => $expectedPending,
                            'updatedAt' => SqlRepository::nowUtc(),
                        ]);
                        Logger::info('pending balance reconciled on read', [
                            'userId' => $userId,
                            'before' => $currentPending,
                            'after' => $expectedPending,
                        ], 'bets');
                    }
                    SharedFileCache::put($throttleNs, $reconcileKey, ['at' => time()]);
                }
            } catch (Throwable $reconErr) {
                Logger::warn('pending balance reconcile failed', [
                    'userId' => $userId,
                    'error' => $reconErr->getMessage(),
                ], 'bets');
            }

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

        // Round Robin children carry parentGroupId. They're real parlay
        // rows for accounting purposes (financial truth lives in them),
        // but the user-facing list rolls them up into a single grouped
        // entry. Pull the children out here, then synthesize one
        // 'round_robin' display row per group below. Other readers of
        // the bets table (commission, agent reports, settlement, admin
        // streams, weekly figures) keep seeing the children unchanged.
        $childrenByGroup = [];
        $standaloneBets = [];
        foreach ($bets as $bet) {
            if (!is_array($bet)) {
                continue;
            }
            $parentGroupId = (string) ($bet['parentGroupId'] ?? '');
            if ($parentGroupId !== '') {
                $childrenByGroup[$parentGroupId][] = $bet;
                continue;
            }
            $standaloneBets[] = $bet;
        }

        $formatted = [];
        foreach ($standaloneBets as $bet) {
            $formatted[] = $this->enrichBetDocument($bet);
        }

        if ($childrenByGroup !== []) {
            // Pull each group's metadata in one swoop. The group row
            // carries display-only fields (sizes, parlayCount, totals,
            // aggregate status); the children stay authoritative for
            // every numeric reader elsewhere.
            $groupIds = array_keys($childrenByGroup);
            $groups = $this->db->findMany('round_robin_groups', [
                'id' => ['$in' => array_map(fn(string $id) => SqlRepository::id($id), $groupIds)],
            ]);
            $groupById = [];
            foreach ($groups as $g) {
                if (is_array($g) && isset($g['id'])) {
                    $groupById[(string) $g['id']] = $g;
                }
            }
            foreach ($childrenByGroup as $groupId => $children) {
                $group = $groupById[$groupId] ?? null;
                if ($group === null) {
                    // Defensive — orphaned children. Treat them as
                    // standalone parlays so the user still sees them.
                    foreach ($children as $bet) {
                        $formatted[] = $this->enrichBetDocument($bet);
                    }
                    continue;
                }
                // Status filter: if the user is filtering pending/won/lost,
                // only show the group when its aggregate matches.
                $groupStatus = (string) ($group['status'] ?? 'pending');
                if ($status !== '' && $status !== 'all' && $groupStatus !== $status) {
                    continue;
                }
                // Sort children deterministically (by roundRobinIndex if
                // present, else createdAt) so the expanded view reads
                // top-to-bottom in placement order.
                usort($children, function (array $a, array $b): int {
                    $ai = isset($a['roundRobinIndex']) ? (int) $a['roundRobinIndex'] : PHP_INT_MAX;
                    $bi = isset($b['roundRobinIndex']) ? (int) $b['roundRobinIndex'] : PHP_INT_MAX;
                    return $ai <=> $bi;
                });
                // Children are NOT embedded here — the frontend fetches
                // them lazily via GET /api/bets/group/:id/children when
                // the user expands the group row. Keeps the My Bets list
                // payload bounded regardless of how many parlays the
                // round robin generated. We do return parlayCount so the
                // collapsed row label ("Round Robin — N Parlays") is
                // correct without a fetch.
                $formatted[] = [
                    'id' => (string) ($group['id'] ?? $groupId),
                    'groupId' => (string) ($group['id'] ?? $groupId),
                    'ticketId' => (string) ($group['ticketId'] ?? ''),
                    'type' => 'round_robin',
                    'status' => $groupStatus,
                    'createdAt' => $group['createdAt'] ?? ($children[0]['createdAt'] ?? ''),
                    'settledAt' => $group['settledAt'] ?? null,
                    'amount' => (float) ($group['totalRisk'] ?? 0),
                    'riskAmount' => (float) ($group['totalRisk'] ?? 0),
                    'potentialPayout' => (float) ($group['totalPotentialPayout'] ?? 0),
                    'payout' => (float) ($group['totalPayout'] ?? 0),
                    'sizes' => is_array($group['sizes'] ?? null) ? array_values($group['sizes']) : [],
                    'selectionCount' => (int) ($group['selectionCount'] ?? 0),
                    'parlayCount' => (int) ($group['parlayCount'] ?? count($children)),
                    'stakePerParlay' => (float) ($group['stakePerParlay'] ?? 0),
                    'isFreeplay' => (bool) ($group['isFreeplay'] ?? false),
                    'description' => 'Round Robin — ' . ($group['parlayCount'] ?? count($children)) . ' parlays',
                    // selections empty + combinedOdds 1.0 keeps shape
                    // compatibility with the multi-leg renderer; children
                    // carry the actual legs (lazy-loaded).
                    'selections' => [],
                    'combinedOdds' => 1.0,
                ];
            }
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

        $oddsRoot = $match['odds'] ?? [];
        $markets = $this->collectMatchMarkets($match);

        $normalizedType = BetModeRules::normalize($type);
        $market = $this->findMarket($markets, $normalizedType);
        if ($market === null && in_array($normalizedType, ['straight', 'moneyline', 'ml', 'h2h'], true)) {
            $market = $this->findMarket($markets, 'h2h')
                ?? $this->findMarket($markets, 'moneyline')
                ?? $this->findMarket($markets, 'ml');
        }

        // Player-prop and alt/period markets aren't pre-loaded onto the match
        // doc — they're filled lazily by ensureEventExtendedOdds() when a
        // user opens the prop builder. If a leg references one of those
        // keys but the match was never expanded (or expansion expired),
        // refresh on demand and re-look up so the user can actually place
        // the bet they were just shown.
        if ($market === null && $this->isExtendedMarketKey($normalizedType) && class_exists('OddsSyncService')) {
            try {
                OddsSyncService::ensureEventExtendedOdds($this->db, (string) ($match['id'] ?? ''));
                $refreshed = $this->db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
                if (is_array($refreshed)) {
                    $match = SportsbookHealth::applyBettingAvailability($this->db, $refreshed);
                    $oddsRoot = $match['odds'] ?? [];
                    $markets = $this->collectMatchMarkets($match);
                    $market = $this->findMarket($markets, $normalizedType);
                }
            } catch (Throwable $_) {
                // Fail-open: leave $market null so the existing UNAVAILABLE
                // error fires below — better than blocking placement on a
                // transient upstream hiccup.
            }
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
        $isPropMarket = $this->isPlayerPropKey($normalizedType);
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
            // Player props: outcomes are {name: 'Over'|'Under', description:
            // <player>, point: <line>, price}. The frontend stitches those
            // into "Chandler Simpson Over 0.5" before sending — match by
            // re-stitching the candidate the same way.
            if ($isPropMarket) {
                $description = (string) ($candidate['description'] ?? '');
                $pointRaw = $candidate['point'] ?? null;
                $pointLabel = '';
                if ($pointRaw !== null && $pointRaw !== '' && is_numeric($pointRaw)) {
                    $pointFloat = (float) $pointRaw;
                    $pointLabel = rtrim(rtrim(number_format($pointFloat, 2, '.', ''), '0'), '.');
                }
                $stitched = trim($description . ' ' . $name . ($pointLabel !== '' ? ' ' . $pointLabel : ''));
                if ($stitched !== '' && strcasecmp($stitched, $selection) === 0) {
                    $outcome = $candidate;
                    break;
                }
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

        // Convert the upstream decimal price to a rounded American integer —
        // this is the canonical source of truth. Re-derive the exact decimal
        // from the integer so Risk/Win arithmetic is always clean (no upstream
        // floating-point noise). E.g. upstream 1.6896 → American −145 →
        // exact decimal 1 + 100/145 = 1.68965517… used in all calculations.
        $snappedOdds = SportsbookBetSupport::snapDecimalOdds($outcome['price']);
        $officialAmericanInt = SportsbookBetSupport::decimalToAmericanInt($snappedOdds);
        if ($officialAmericanInt === 0) {
            throw new ApiException('Invalid odds for selection ' . $selection, 409, [
                'code' => 'INVALID_ODDS',
            ]);
        }
        // Exact decimal derived from American integer — zero floating-point drift.
        $officialOdds = SportsbookBetSupport::americanToDecimalExact($officialAmericanInt);
        if (!is_finite($officialOdds) || $officialOdds <= 1.0) {
            throw new ApiException('Invalid odds for selection ' . $selection, 409, [
                'code' => 'INVALID_ODDS',
            ]);
        }

        if (abs($officialAmericanInt) > 1000000) {
            throw new ApiException('Odds exceed maximum allowed value for selection ' . $selection, 409, [
                'code' => 'ODDS_EXCEEDS_MAX',
            ]);
        }

        // Compare client odds vs official using American integers to avoid
        // decimal floating-point mismatches on the 0.0001 threshold.
        if (is_numeric($odds)) {
            $clientSnapped = SportsbookBetSupport::snapDecimalOdds((float) $odds);
            $clientAmericanInt = SportsbookBetSupport::decimalToAmericanInt($clientSnapped);
            if ($clientAmericanInt !== 0 && $clientAmericanInt !== $officialAmericanInt) {
                throw new ApiException('Odds changed. Please review the updated price before placing the bet.', 409, [
                    'code' => 'ODDS_CHANGED',
                    'officialOdds' => $officialOdds,
                    'officialAmericanOdds' => $officialAmericanInt,
                    'selection' => (string) ($outcome['name'] ?? $selection),
                    'matchId' => $matchId,
                ]);
            }
        }

        return [
            'matchId' => $matchId,
            'selection' => (string) ($outcome['name'] ?? $selection),
            'odds' => $officialOdds,
            'oddsAmerican' => $officialAmericanInt,
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
            'oddsAmerican' => isset($selection['oddsAmerican']) ? (int) $selection['oddsAmerican'] : null,
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
            'balance' => (float) round($this->num($meta['balance'] ?? 0)),
            'pendingBalance' => (float) round($this->num($meta['pendingBalance'] ?? 0)),
        ];
    }

    /**
     * GET /api/bets/group/:groupId/children
     *
     * Lazy-loaded children for a Round Robin group. Returns the array
     * of enriched parlay rows (same shape as a regular parlay in
     * getMyBets) sorted by roundRobinIndex so the expanded view reads
     * top-to-bottom in placement order. Auth-gated to the group's
     * owner — admins go through their own bet listing endpoints.
     */
    private function getRoundRobinChildren(string $groupId): void
    {
        try {
            $user = $this->protect();
            if ($user === null) {
                return;
            }
            if (preg_match('/^[a-f0-9]{24}$/i', $groupId) !== 1) {
                Response::json(['message' => 'Invalid group id'], 400);
                return;
            }

            $group = $this->db->findOne('round_robin_groups', ['id' => SqlRepository::id($groupId)]);
            if ($group === null) {
                Response::json(['message' => 'Round Robin group not found'], 404);
                return;
            }
            // Ownership check — a player can only see their own group's
            // children. Compare as strings to handle both ObjectId-style
            // and plain-hex stored userId values.
            if ((string) ($group['userId'] ?? '') !== (string) ($user['id'] ?? '')) {
                Response::json(['message' => 'Not authorized for this group'], 403);
                return;
            }

            $children = $this->db->findMany('bets', [
                'parentGroupId' => $groupId,
            ]);

            usort($children, function (array $a, array $b): int {
                $ai = isset($a['roundRobinIndex']) ? (int) $a['roundRobinIndex'] : PHP_INT_MAX;
                $bi = isset($b['roundRobinIndex']) ? (int) $b['roundRobinIndex'] : PHP_INT_MAX;
                return $ai <=> $bi;
            });

            $rows = array_map(fn(array $b) => $this->enrichBetDocument($b), $children);

            Response::json([
                'groupId' => $groupId,
                'parlayCount' => (int) ($group['parlayCount'] ?? count($rows)),
                'status' => (string) ($group['status'] ?? 'pending'),
                'children' => $rows,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Error fetching round robin children'], 500);
        }
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

    /**
     * Build the full market lookup pool for a match: core markets, period/
     * alt markets, and player props. Validation needs all three because
     * each can be the source of a leg (h2h/spreads/totals from `odds.markets`,
     * `spreads_h1` etc. from `odds.extendedMarkets`, `batter_*` from
     * `playerProps`).
     *
     * @param array<string, mixed> $match
     * @return list<array<string, mixed>>
     */
    private function collectMatchMarkets(array $match): array
    {
        $pool = [];
        $oddsRoot = $match['odds'] ?? [];
        if (is_array($oddsRoot)) {
            if (isset($oddsRoot['markets']) && is_array($oddsRoot['markets'])) {
                foreach ($oddsRoot['markets'] as $m) {
                    if (is_array($m)) $pool[] = $m;
                }
            }
            if (isset($oddsRoot['extendedMarkets']) && is_array($oddsRoot['extendedMarkets'])) {
                foreach ($oddsRoot['extendedMarkets'] as $m) {
                    if (is_array($m)) $pool[] = $m;
                }
            }
        }
        if (isset($match['playerProps']) && is_array($match['playerProps'])) {
            foreach ($match['playerProps'] as $m) {
                if (is_array($m)) $pool[] = $m;
            }
        }
        return $pool;
    }

    /**
     * Market keys that aren't on the base match doc by default — props,
     * alternates, period markets. Used to decide whether a missing market
     * warrants a lazy per-event refresh against the upstream provider.
     */
    private function isExtendedMarketKey(string $key): bool
    {
        if ($this->isPlayerPropKey($key)) return true;
        if (str_contains($key, 'alternate')) return true;
        // Period suffixes Odds API uses: _h1, _h2, _q1..q4, _p1..p3,
        // _1st_5_innings, _1st_inning, _1st_3_innings, etc.
        if (preg_match('/_(h1|h2|q[1-4]|p[1-3]|\d+(st|nd|rd|th)_)/i', $key) === 1) return true;
        return false;
    }

    private function isPlayerPropKey(string $key): bool
    {
        if (class_exists('OddsMarketCatalog')) {
            return OddsMarketCatalog::isPropMarket(strtolower($key));
        }
        $k = strtolower($key);
        return str_starts_with($k, 'batter_')
            || str_starts_with($k, 'pitcher_')
            || str_starts_with($k, 'player_');
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
        $actor = Jwt::cachedUser($this->db, $collection, $id);
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
