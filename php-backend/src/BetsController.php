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
        // Open Parlay ("open play"): commit a parlay in status='open' with
        // 1+ legs, then add more legs before any leg's game starts. Stake is
        // reserved at create exactly like a normal parlay (no new money path).
        if ($path === '/api/bets/open-parlay/create' && $method === 'POST') {
            $this->placeOpenParlay();
            return true;
        }
        if ($path === '/api/bets/open-parlay/add-leg' && $method === 'POST') {
            $this->addOpenParlayLeg();
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
        // Admin-only inbox of long-stuck pending bets — the operator-
        // facing list of tickets the auto-settle paths couldn't grade
        // safely (no score recorded, feed went quiet, etc.). The list
        // is grouped by matchId so one home/away/void decision settles
        // every affected player at once.
        if ($path === '/api/bets/admin/stuck' && $method === 'GET') {
            $this->getStuckBetsInbox();
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
            // Optional structured teaser-type selection (new picker flow).
            // Legacy clients omit this field and pass only `teaserPoints` —
            // those placements keep working via the rule-level multiplier
            // table. When set, the type's pointsBySport authoritatively
            // determines the teaserPoints applied to each leg, and the
            // type's own payoutProfile (multipliers) overrides the
            // rule-level fallback at payout-calculation time.
            $teaserTypeIdRaw = $body['teaserTypeId'] ?? null;
            $teaserTypeId = is_string($teaserTypeIdRaw) && $teaserTypeIdRaw !== ''
                ? trim($teaserTypeIdRaw)
                : null;
            // Initialised here so the bet-doc construction below can
            // reference it unconditionally; populated inside the teaser
            // validation block when teaserTypeId resolves to an active type.
            $resolvedTeaserType = null;

            // Keep 2dp precision. PHP's round() with no precision arg rounds
            // to integer — that broke Win-mode pinning: a typed $1000 win on
            // +590 needs Risk = $169.49, but integer rounding stored Risk =
            // $169 → potentialPayout = round(169 × 6.9) = $1166, off by $3
            // from the pinned $1169 → pin tolerance (±$2) rejected, so the
            // bet paid $997 profit instead of the typed $1000.
            // bets.riskAmount / potentialPayout columns are DECIMAL(14,2),
            // so 2dp survives schema round-trip.
            $betAmount = is_numeric($amount) ? (float) round((float) $amount, 2) : 0.0;
            if (!is_finite($betAmount) || $betAmount <= 0) {
                throw new ApiException('Bet amount must be positive', 400);
            }

            // useFreeplay: client requests to wager from freeplay balance instead of real balance.
            $useFreeplay = (bool) ($body['useFreeplay'] ?? false);

            // slipSize: how many tickets the client is about to place in
            // this slip submission. Optional (legacy clients omit it).
            // Used solely to block useFreeplay on a multi-bet straight
            // slip — the freeplay pool can only fund one ticket, so a
            // 3-bet slip with useFreeplay=true would silently apply FP
            // to the first ticket and charge full credit on the rest,
            // and the win/loss accounting at settlement can't tell which
            // ticket "owns" the freeplay portion. UI also gates this,
            // but a tampered client must not be able to bypass.
            $slipSizeRaw = $body['slipSize'] ?? null;
            $slipSize = is_numeric($slipSizeRaw) ? (int) $slipSizeRaw : 1;
            if ($useFreeplay && $type === 'straight' && $slipSize > 1) {
                throw new ApiException(
                    'Freeplay can only be used on a single ticket. Combine your selections into a parlay or place them without freeplay.',
                    400,
                    ['code' => 'FREEPLAY_MULTI_STRAIGHT_NOT_ALLOWED']
                );
            }

            $modeRule = $this->getModeRule($type);
            if ($modeRule === null) {
                throw new ApiException('Bet mode ' . $type . ' is not supported', 400);
            }

            // Same-Game Parlay config (live, no restart). sgpEnabled=false ⇒ the
            // full hard same-game block stays in force. Read once; the same %s
            // gate validation, drive the haircut, and get SNAPSHOTTED onto the
            // bet so settlement reprices identically.
            $sgpCfg = SportsbookBetSupport::sgpConfig($this->db->findOne('platformsettings', []));

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
                        // Buy Points (spread/total only). Optional — legacy
                        // clients omit it and behave exactly as before.
                        'boughtPoints' => $first['boughtPoints'] ?? null,
                        // Exact alt rung point. This rebuild is a WHITELIST —
                        // omitting the field here silently disabled rung-pinning
                        // for every STRAIGHT alt-line bet (cards, alt spreads/
                        // totals) → SELECTION_UNAVAILABLE at placement while the
                        // board happily displayed the rung (found 2026-07-05 via
                        // the WC cards money test; parlays never lost it because
                        // the multi-leg path passes selections through raw).
                        'point' => $first['point'] ?? null,
                        // MLB listed-pitcher Action waiver — same whitelist drop:
                        // straights silently reverted to void-on-scratch even
                        // when the player checked Action.
                        'pitcherAction' => $first['pitcherAction'] ?? null,
                    ]];
                } elseif ($matchId !== '' && $selection !== '') {
                    $selectionInputs = [[
                        'matchId' => $matchId,
                        'selection' => $selection,
                        'odds' => $odds,
                        'type' => $marketType !== '' ? $marketType : $type,
                        'boughtPoints' => $body['boughtPoints'] ?? null,
                        'point' => $body['point'] ?? null,
                        'pitcherAction' => $body['pitcherAction'] ?? null,
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
            // Odds-acceptance policy (per-user, env-defaulted). Decides whether
            // a live line move auto-places at the current price or returns
            // ODDS_CHANGED. Resolved once and applied uniformly to every leg of
            // every bet type, so a parlay and a straight gate identically.
            $acceptance = SportsbookBetSupport::resolveOddsAcceptance(
                is_array($user['settings'] ?? null) ? $user['settings'] : null
            );
            foreach ($selectionInputs as $idx => $sel) {
                $boughtPointsRaw = $sel['boughtPoints'] ?? null;
                $boughtPoints = is_numeric($boughtPointsRaw) ? (float) $boughtPointsRaw : 0.0;
                // Defence-in-depth: Buy Points is not a teaser-mode product
                // (the slip already hides the picker). Reject before we
                // touch the pricing helper so a tampered client can't
                // stack a paid-juice buy on top of a tease.
                if (abs($boughtPoints) > 1e-9 && $type === 'teaser') {
                    throw new ApiException('Buy Points is not available in teaser mode.', 400, [
                        'code' => 'BUY_POINTS_NOT_ALLOWED_IN_TEASER',
                    ]);
                }
                try {
                    $selType = BetModeRules::normalize((string) ($sel['type'] ?? ($sel['marketType'] ?? 'straight')));
                    if ($selType === 'outrights') {
                        // Outright legs bypass the match-doc lookup entirely;
                        // they're priced off the `outrights` table and have
                        // no live status / freshness gate to worry about.
                        $validatedSelections[] = $this->validateOutrightSelection(
                            trim((string) ($sel['matchId'] ?? ($sel['outrightId'] ?? ''))),
                            trim((string) ($sel['selection'] ?? '')),
                            $sel['odds'] ?? null,
                            $acceptance['policy'],
                            $acceptance['bandCents']
                        );
                    } else {
                        $validated = $this->validateSelection(
                            trim((string) ($sel['matchId'] ?? '')),
                            trim((string) ($sel['selection'] ?? '')),
                            $sel['odds'] ?? null,
                            $selType,
                            $boughtPoints,
                            $acceptance['policy'],
                            $acceptance['bandCents'],
                            (isset($sel['point']) && is_numeric($sel['point'])) ? (float) $sel['point'] : null
                        );
                        // MLB listed-pitcher "Action" choice (per side). When a
                        // side is NOT marked Action, the bet voids if that
                        // listed starting pitcher is scratched (honored at
                        // settlement, see SportsbookBetSupport::listedPitcherVoid).
                        // Server-derived from the leg's own snapshot, so a
                        // tampered client can't fabricate pitchers; we only
                        // record which sides the player waived the void on.
                        $validated['pitcherAction'] = self::normalizePitcherAction($sel['pitcherAction'] ?? null);
                        $validatedSelections[] = $validated;
                    }
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
                // Step 1 — every leg must be a teaser-eligible sport
                // (football or basketball). BetModeRules::teaserSportGroup
                // is the single source of truth for that grouping. Other
                // sports' spreads don't move enough for a teaser to be
                // meaningful, so we reject before doing any work.
                $legGroups = [];
                foreach ($validatedSelections as $index => $validatedSelection) {
                    $sportKey = strtolower((string) ($validatedSelection['matchSnapshot']['sportKey'] ?? ''));
                    $group = BetModeRules::teaserSportGroup($sportKey);
                    if ($group === null) {
                        throw new ApiException(
                            'Teasers are only available on football and basketball. Leg ' . ($index + 1) . ' (' . ($sportKey !== '' ? $sportKey : 'unknown sport') . ') is not eligible.',
                            400,
                            ['code' => 'TEASER_SPORT_NOT_ALLOWED', 'sportKey' => $sportKey, 'leg' => $index + 1]
                        );
                    }
                    $legGroups[$index] = $group;
                }

                // Step 2 — all legs must share the same sport group. Real
                // sportsbooks don't accept mixed-sport teasers because the
                // teaser point values differ between football (6/6.5/7)
                // and basketball (4/4.5/5); merging them in one ticket is
                // a non-product. Reject with a clear message naming the
                // groups so the user knows which legs to remove.
                $uniqueGroups = array_values(array_unique($legGroups));
                if (count($uniqueGroups) > 1) {
                    throw new ApiException(
                        'Teasers cannot mix sports. This ticket has ' . implode(' + ', $uniqueGroups) . ' legs — split into separate teasers per sport.',
                        400,
                        ['code' => 'TEASER_MIXED_SPORTS', 'sports' => $uniqueGroups]
                    );
                }
                $teaserSportGroup = $uniqueGroups[0];

                // Defence-in-depth: when the rule ships a structured
                // teaserTypes catalog, every placement MUST identify
                // which type it's playing against. The frontend
                // already gates the Place button on this; the backend
                // check protects against direct API calls (curl /
                // tampered client) that would otherwise place a teaser
                // bet without a type snapshot, leaving settlement to
                // grade against the rule-level fallback multipliers
                // and losing the audit trail. Falls through for truly
                // legacy DB rows whose teaserTypes is empty — those
                // keep the pre-picker placement flow intact.
                $hasTeaserCatalog = !empty($modeRule['teaserTypes'])
                    && is_array($modeRule['teaserTypes']);
                if ($hasTeaserCatalog && $teaserTypeId === null) {
                    throw new ApiException(
                        'A teaser type must be selected.',
                        400,
                        ['code' => 'TEASER_TYPE_REQUIRED']
                    );
                }

                // Step 3a — if the new picker sent a teaserTypeId, resolve
                // it to a structured type definition and let it drive the
                // points + payout. The submitted `teaserPoints` must agree
                // with the type's points for this sport (defence in depth:
                // a tampered client can't pick standard_7_5 and submit 6
                // to claim 7-pt protection on a 6-pt payout).
                if ($teaserTypeId !== null) {
                    $resolvedTeaserType = BetModeRules::findTeaserType($teaserTypeId, $modeRule);
                    if ($resolvedTeaserType === null || ($resolvedTeaserType['isActive'] ?? true) !== true) {
                        throw new ApiException(
                            'Selected teaser type is not available. Pick another type.',
                            400,
                            ['code' => 'INVALID_TEASER_TYPE', 'teaserTypeId' => $teaserTypeId]
                        );
                    }
                    // Type-specific leg-count bounds. Stricter than the
                    // rule-level minLegs/maxLegs (already checked above
                    // for the teaser mode itself). Super Teasers restrict
                    // to 3+ legs because their multiplier table starts at
                    // 3 — without this gate a 2-leg ticket would fall
                    // through to a missing key in calculatePotentialPayout
                    // and grade as $0. Names prefixed with `type` to
                    // avoid shadowing the rule-level $minLegs/$maxLegs.
                    $typeMinLegs = isset($resolvedTeaserType['minLegs']) && is_numeric($resolvedTeaserType['minLegs'])
                        ? (int) $resolvedTeaserType['minLegs']
                        : null;
                    $typeMaxLegs = isset($resolvedTeaserType['maxLegs']) && is_numeric($resolvedTeaserType['maxLegs'])
                        ? (int) $resolvedTeaserType['maxLegs']
                        : null;
                    $typeLabel = (string) ($resolvedTeaserType['label'] ?? 'Teaser type');
                    if ($typeMinLegs !== null && $legCount < $typeMinLegs) {
                        throw new ApiException(
                            sprintf('%s requires at least %d teams.', $typeLabel, $typeMinLegs),
                            400,
                            ['code' => 'TEASER_LEG_COUNT_BELOW_MIN', 'minLegs' => $typeMinLegs, 'actual' => $legCount]
                        );
                    }
                    if ($typeMaxLegs !== null && $legCount > $typeMaxLegs) {
                        throw new ApiException(
                            sprintf('%s allows at most %d teams.', $typeLabel, $typeMaxLegs),
                            400,
                            ['code' => 'TEASER_LEG_COUNT_ABOVE_MAX', 'maxLegs' => $typeMaxLegs, 'actual' => $legCount]
                        );
                    }
                    $expectedPoints = isset($resolvedTeaserType['pointsBySport'][$teaserSportGroup])
                        && is_numeric($resolvedTeaserType['pointsBySport'][$teaserSportGroup])
                        ? (float) $resolvedTeaserType['pointsBySport'][$teaserSportGroup]
                        : null;
                    if ($expectedPoints === null) {
                        throw new ApiException(
                            'Selected teaser type does not cover ' . $teaserSportGroup . '. Pick a different type.',
                            400,
                            ['code' => 'TEASER_TYPE_SPORT_UNSUPPORTED', 'teaserTypeId' => $teaserTypeId, 'sport' => $teaserSportGroup]
                        );
                    }
                    if (abs((float) $teaserPoints - $expectedPoints) > 0.001) {
                        throw new ApiException(
                            'Teaser points do not match selected type. Type expects ' . rtrim(rtrim(number_format($expectedPoints, 2, '.', ''), '0'), '.') . ' for ' . $teaserSportGroup . '.',
                            400,
                            ['code' => 'TEASER_POINTS_MISMATCH', 'expected' => $expectedPoints, 'submitted' => (float) $teaserPoints]
                        );
                    }
                    // Swap the rule's payoutProfile to the type-specific
                    // table so calculatePotentialPayout picks the right
                    // multipliers. Settlement reads back via the bet doc's
                    // teaserTypeId, so this only affects placement-time
                    // payout math (the stored `potentialPayout` is the
                    // source of truth at grade-time).
                    if (isset($resolvedTeaserType['payoutProfile']) && is_array($resolvedTeaserType['payoutProfile'])) {
                        $modeRule['payoutProfile'] = $resolvedTeaserType['payoutProfile'];
                    }
                }

                // Step 3b — teaserPoints must be in the per-sport allowed
                // list. NFL = 6/6.5/7, NBA = 4/4.5/5. The legacy flat
                // `teaserPointOptions` on the rule (loaded from DB) is
                // ignored here: we trust BetModeRules over a possibly
                // stale DB row, and emitting one consistent error message
                // beats two ways the bet can be rejected on points.
                $allowedForSport = BetModeRules::teaserPointOptionsForSport($teaserSportGroup);
                if (count($allowedForSport) === 0 || !in_array((float) $teaserPoints, $allowedForSport, true)) {
                    $allowedFmt = implode(', ', array_map(static fn ($v) => rtrim(rtrim(number_format((float) $v, 2, '.', ''), '0'), '.'), $allowedForSport));
                    throw new ApiException(
                        'Invalid teaser points for ' . $teaserSportGroup . '. Allowed: ' . $allowedFmt,
                        400,
                        ['code' => 'INVALID_TEASER_POINTS', 'sport' => $teaserSportGroup, 'allowed' => $allowedForSport]
                    );
                }

                foreach ($validatedSelections as $index => $validatedSelection) {
                    $validatedSelections[$index] = SportsbookBetSupport::applyTeaserAdjustment($validatedSelection, $teaserPoints);
                }
            }

            SportsbookBetSupport::validateTicketComposition($type, $validatedSelections, $sgpCfg);

            // Same-game ticket detection (≥2 legs share a matchId). Drives the
            // SGP leg cap, the haircut snapshot, and the tighter payout ceiling.
            // False for every cross-game parlay → those stay completely untouched.
            $isSameGame = $type === 'parlay'
                && !empty($sgpCfg['enabled'])
                && SportsbookBetSupport::isSameGameTicket($validatedSelections);
            if ($isSameGame && count($validatedSelections) > (int) $sgpCfg['maxLegs']) {
                throw new ApiException(
                    'Same-game parlays allow at most ' . (int) $sgpCfg['maxLegs'] . ' legs.',
                    400,
                    ['code' => 'SGP_TOO_MANY_LEGS', 'maxLegs' => (int) $sgpCfg['maxLegs'], 'actual' => count($validatedSelections)]
                );
            }

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
                        'freeplayBalance' => $existingRequest['responseFreeplayBalance'] ?? ($user['freeplayBalance'] ?? 0),
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
            // SGP haircut rates flow in here; sameGameHaircutFraction inside
            // returns 0 for cross-game tickets, so non-SGP payouts are identical
            // to before. The SAME rates are snapshotted onto the bet doc below.
            $potentialPayout = SportsbookBetSupport::calculatePotentialPayout(
                $type,
                $betAmount,
                $validatedSelections,
                $modeRule,
                (float) $sgpCfg['haircutPct'],
                (float) $sgpCfg['propHaircutPct']
            );

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

            // Both min and max are risk-anchored — they cap the player's
            // stake, not the operator's payout. This matches what every
            // mainstream sportsbook (and the books our players compare
            // us to) means by "max bet": the most you can put down on
            // one ticket. Win amount stays uncapped on straight tickets
            // so a +334 underdog at the max stake can still pay out
            // however much the odds resolve to. Parlays keep a separate
            // payout-cap ceiling further down (operator exposure on
            // multi-leg long shots).
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
            // Combined modes (parlay/teaser/if_bet/reverse) get a payout
            // ceiling separate from max bet: capped at 3 × maxBet so a
            // big multi-leg long shot can still be placed but the
            // payout-side exposure stays bounded. The risk-side maxBet
            // check still applies (further down) so a $5k risk on a
            // parlay still gets blocked if maxBet is $2k. This 3×
            // ceiling is operator policy, not a per-player setting —
            // change here if you want to expose it as a column.
            $isCombinedMode = in_array($type, ['parlay', 'teaser', 'if_bet', 'reverse'], true);
            if ($isCombinedMode && $maxBetLimit > 0) {
                // 3× maxBet ceiling; for a same-game ticket tighten to
                // sgpMaxPayoutMultiplier when it is stricter than 3×.
                $payoutMultiplier = $isSameGame
                    ? min(3.0, (float) $sgpCfg['maxPayoutMultiplier'])
                    : 3.0;
                $parlayPayoutCap = $maxBetLimit * $payoutMultiplier;
                if ($winAmount > $parlayPayoutCap) {
                    $potentialPayout = (float) $totalRisk + $parlayPayoutCap;
                    $winAmount = $parlayPayoutCap;
                    $combinedOdds = SportsbookBetSupport::combinedOdds($totalRisk, $potentialPayout);
                }
            }
            if ($maxBetLimit > 0 && (float) $totalRisk > $maxBetLimit) {
                throw new ApiException(
                    'Max bet is $' . rtrim(rtrim(number_format($maxBetLimit, 2, '.', ''), '0'), '.')
                    . ' — this ticket risks $' . rtrim(rtrim(number_format((float) $totalRisk, 2, '.', ''), '0'), '.') . ' (over limit)',
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
                // SELECT ... FOR UPDATE acquires a row-level lock inside this
                // transaction.  Any concurrent request for the same user will
                // block here until this transaction commits/rolls back, so the
                // balance/pending values we read below are guaranteed fresh
                // and exclusive — eliminating the double-spend race condition.
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

                $newFreeplay = max(0.0, $newFreeplay);

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
                    // Snapshot the picked type id and tiesRule onto the
                    // bet doc so settlement grades against the rule that
                    // was in force at placement time, not whatever the
                    // betmoderules row says today (operator may edit
                    // later — we don't want yesterday's bet to silently
                    // change push-vs-lose semantics). Null on legacy
                    // placements; settlement falls back to the loss
                    // semantics it has always used in that case.
                    'teaserTypeId' => $type === 'teaser' ? $teaserTypeId : null,
                    'teaserTiesRule' => ($type === 'teaser' && $resolvedTeaserType !== null && isset($resolvedTeaserType['tiesRule']))
                        ? (string) $resolvedTeaserType['tiesRule']
                        : null,
                    // Freeze the payoutProfile in effect at placement so a
                    // later rule/type edit never re-prices this bet at
                    // settlement. resolveTeaserPayoutProfile prefers this
                    // snapshot over the live rule. $modeRule['payoutProfile']
                    // was already swapped to the type-specific profile above
                    // (line ~324) when a teaserTypeId was supplied, so this
                    // captures the exact multipliers calculatePotentialPayout
                    // used a few lines later.
                    'teaserPayoutSnapshot' => ($type === 'teaser' && isset($modeRule['payoutProfile']) && is_array($modeRule['payoutProfile']))
                        ? $modeRule['payoutProfile']
                        : null,
                    // SGP haircut SNAPSHOT — frozen at placement so a later
                    // platformsettings edit can never re-price a settled ticket.
                    // Present only on same-game parlays; absent (null) elsewhere,
                    // so settlement applies no haircut to cross-game/legacy bets.
                    // evaluateTicket reads these exact rates and re-runs the same
                    // detection on the surviving won legs.
                    'sgpHaircutPct' => $isSameGame ? (float) $sgpCfg['haircutPct'] : null,
                    'sgpPropHaircutPct' => $isSameGame ? (float) $sgpCfg['propHaircutPct'] : null,
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];

                $single = count($validatedSelections) === 1 ? $validatedSelections[0] : null;
                $doc = array_merge($baseBetData, [
                    'selections' => $selectionDocs,
                    'matchId' => $single ? SqlRepository::id((string) $single['matchId']) : null,
                    'selection' => $single ? $single['selection'] : 'MULTI',
                    // Full display name for the single-leg ticket (combined
                    // tickets read per-leg selectionFull from betselections).
                    'selectionFull' => $single ? (string) ($single['selectionFull'] ?? $single['selection'] ?? '') : 'MULTI',
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
                'freeplayBalance' => $newFreeplay,
            ]);

            $this->db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                'status' => 'completed',
                'betIds' => $createdBetIds,
                'ticketId' => $ticketId,
                'responseBalance' => $newBalance,
                'responsePendingBalance' => $newPending,
                'responseFreeplayBalance' => $newFreeplay,
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
            Response::serverError('Error placing bet', $e, 400);
        }
    }

    /**
     * Create an Open Parlay ("open play"). Commits a plain parlay in
     * status='open' with a declared target leg count (`targetLegs`, 2..8) and
     * 1+ starting legs, reserving the FULL stake in pendingBalance exactly like
     * a normal parlay (no new money path). The player fills the remaining slots
     * over time via addOpenParlayLeg() — each leg must start in the future, and
     * adding a leg moves no money. There is no kickoff lock and no expiry: the
     * ticket stays open until every declared slot is filled, then settles via
     * the per-leg open-parlay grading in BetSettlementService.
     *
     * Differences from placeBet: type is forced to 'parlay', freeplay is
     * disallowed (v1), a per-player open-ticket cap applies, every leg passes
     * a HARD commenceTime>now() anti-past-posting gate, and acceptedPayout is
     * never pinned (payout is always recomputed authoritatively from legs).
     */
    private function placeOpenParlay(): void
    {
        $requestDocId = '';
        $requestDocOwned = false;
        try {
            if (RateLimiter::fromEnv($this->db, 'place_bet')) {
                return;
            }
            if (!OpenParlayService::isEnabled()) {
                throw new ApiException('Open parlays are not currently available.', 400, ['code' => 'OPEN_PARLAY_DISABLED']);
            }

            $user = $this->protect();
            if ($user === null) {
                return;
            }

            $body = Http::jsonBody();
            $requestId = SportsbookBetSupport::normalizeRequestId((string) (($body['requestId'] ?? '') ?: Http::header('x-request-id')));
            if ($requestId === '') {
                throw new ApiException('requestId is required for open parlay creation', 400, ['code' => 'REQUEST_ID_REQUIRED']);
            }

            // Open parlays are plain parlays only (M7) and never freeplay-funded (Addition 1).
            $type = 'parlay';
            if (!empty($body['useFreeplay'])) {
                throw new ApiException('Freeplay cannot be used on open parlays.', 400, ['code' => 'OPEN_PARLAY_NO_FREEPLAY']);
            }

            $amount = $body['amount'] ?? null;
            $betAmount = is_numeric($amount) ? (float) round((float) $amount, 2) : 0.0;
            if (!is_finite($betAmount) || $betAmount <= 0) {
                throw new ApiException('Bet amount must be positive', 400);
            }

            $selections = is_array($body['selections'] ?? null) ? $body['selections'] : [];
            if (count($selections) < 1) {
                throw new ApiException('An open parlay needs at least one starting leg.', 400, ['code' => 'OPEN_PARLAY_NO_LEGS']);
            }
            if (count($selections) > OpenParlayService::MAX_LEGS) {
                throw new ApiException('An open parlay can hold at most ' . OpenParlayService::MAX_LEGS . ' legs.', 400, ['code' => 'OPEN_PARLAY_TOO_MANY_LEGS']);
            }

            // Declared leg count (new model): the player picks up front how
            // many legs this ticket will ultimately have. Min 2, max MAX_LEGS.
            // The full stake is committed now and slots are filled over time.
            $targetLegsRaw = $body['targetLegs'] ?? null;
            $targetLegs = is_numeric($targetLegsRaw) ? (int) $targetLegsRaw : 0;
            if ($targetLegs < OpenParlayService::MIN_TARGET_LEGS || $targetLegs > OpenParlayService::MAX_LEGS) {
                throw new ApiException(
                    'Choose how many legs this open parlay will have (' . OpenParlayService::MIN_TARGET_LEGS . '–' . OpenParlayService::MAX_LEGS . ').',
                    400,
                    ['code' => 'OPEN_PARLAY_TARGET_LEGS_INVALID']
                );
            }
            if (count($selections) > $targetLegs) {
                throw new ApiException(
                    'You picked more starting legs (' . count($selections) . ') than the declared count (' . $targetLegs . ').',
                    400,
                    ['code' => 'OPEN_PARLAY_TOO_MANY_START_LEGS']
                );
            }

            $modeRule = $this->getModeRule($type);
            if ($modeRule === null) {
                throw new ApiException('Parlay mode is not supported', 400);
            }

            if (in_array((string) ($user['status'] ?? ''), ['suspended', 'disabled', 'read only'], true)) {
                throw new ApiException('Account is suspended, disabled, or read-only', 400);
            }

            $userId = SqlRepository::id((string) $user['id']);

            // Per-player open-ticket cap (M6).
            $openCount = $this->db->countDocuments('bets', ['userId' => $userId, 'type' => 'parlay', 'status' => 'open']);
            $maxOpen = OpenParlayService::maxOpenPerUser();
            if ($openCount >= $maxOpen) {
                throw new ApiException(
                    'You already have ' . $openCount . ' open parlays (max ' . $maxOpen . '). Finish or let one close before opening another.',
                    400,
                    ['code' => 'OPEN_PARLAY_LIMIT_REACHED', 'open' => $openCount, 'max' => $maxOpen]
                );
            }

            // Validate every starting leg: odds-change handshake + HARD past-post gate.
            $acceptance = SportsbookBetSupport::resolveOddsAcceptance(is_array($user['settings'] ?? null) ? $user['settings'] : null);
            $validatedSelections = [];
            $priceChanges = [];
            foreach ($selections as $idx => $sel) {
                if (!is_array($sel)) {
                    throw new ApiException('Invalid selection at index ' . $idx, 400);
                }
                $boughtPointsRaw = $sel['boughtPoints'] ?? null;
                $boughtPoints = is_numeric($boughtPointsRaw) ? (float) $boughtPointsRaw : 0.0;
                $selType = BetModeRules::normalize((string) ($sel['type'] ?? ($sel['marketType'] ?? 'straight')));
                if ($selType === 'outrights') {
                    throw new ApiException('Outright legs are not allowed on open parlays.', 400, ['code' => 'OPEN_PARLAY_OUTRIGHT_NOT_ALLOWED']);
                }
                try {
                    $validated = $this->validateSelection(
                        trim((string) ($sel['matchId'] ?? '')),
                        trim((string) ($sel['selection'] ?? '')),
                        $sel['odds'] ?? null,
                        $selType,
                        $boughtPoints,
                        $acceptance['policy'],
                        $acceptance['bandCents'],
                        (isset($sel['point']) && is_numeric($sel['point'])) ? (float) $sel['point'] : null
                    );
                } catch (ApiException $e) {
                    $details = $e->payload();
                    if (($details['code'] ?? null) === 'ODDS_CHANGED') {
                        $priceChanges[] = [
                            'index' => $idx,
                            'matchId' => (string) ($details['matchId'] ?? trim((string) ($sel['matchId'] ?? ''))),
                            'selection' => (string) ($details['selection'] ?? trim((string) ($sel['selection'] ?? ''))),
                            'marketType' => $selType,
                            'officialOdds' => $details['officialOdds'] ?? null,
                            'officialAmericanOdds' => $details['officialAmericanOdds'] ?? null,
                        ];
                        continue;
                    }
                    throw $e;
                }
                // HARD anti-past-posting gate — never trust isBettable alone (M1).
                OpenParlayService::assertLegStartsInFuture(is_array($validated['matchSnapshot'] ?? null) ? $validated['matchSnapshot'] : []);
                $validated['pitcherAction'] = self::normalizePitcherAction($sel['pitcherAction'] ?? null);
                $validatedSelections[] = $validated;
            }
            if (count($priceChanges) > 0) {
                $first = $priceChanges[0];
                throw new ApiException('Odds changed. Please review the updated price before placing the bet.', 409, [
                    'code' => 'ODDS_CHANGED',
                    'legs' => $priceChanges,
                    'officialOdds' => $first['officialOdds'],
                    'officialAmericanOdds' => $first['officialAmericanOdds'],
                    'selection' => $first['selection'],
                    'matchId' => $first['matchId'],
                ]);
            }

            SportsbookBetSupport::validateTicketComposition('parlay', $validatedSelections);

            $minBetLimit = isset($user['minBet']) && is_numeric($user['minBet']) ? (float) $user['minBet'] : 0.0;
            $maxBetLimit = isset($user['maxBet']) && is_numeric($user['maxBet']) ? (float) $user['maxBet'] : 0.0;
            $totalRisk = SportsbookBetSupport::ticketRiskAmount($type, $betAmount);
            $payoutCalc = OpenParlayService::recomputePayout($betAmount, $validatedSelections, $modeRule, $maxBetLimit);
            $potentialPayout = $payoutCalc['potentialPayout'];
            $combinedOdds = $payoutCalc['combinedOdds'];

            if ($minBetLimit > 0 && $totalRisk < $minBetLimit) {
                throw new ApiException(
                    'Min bet is $' . rtrim(rtrim(number_format($minBetLimit, 2, '.', ''), '0'), '.')
                    . ' — this ticket only risks $' . rtrim(rtrim(number_format($totalRisk, 2, '.', ''), '0'), '.'),
                    400,
                    ['code' => 'BELOW_MIN_BET']
                );
            }
            if ($maxBetLimit > 0 && $totalRisk > $maxBetLimit) {
                throw new ApiException(
                    'Max bet is $' . rtrim(rtrim(number_format($maxBetLimit, 2, '.', ''), '0'), '.')
                    . ' — this ticket risks $' . rtrim(rtrim(number_format($totalRisk, 2, '.', ''), '0'), '.') . ' (over limit)',
                    400,
                    ['code' => 'ABOVE_MAX_BET']
                );
            }

            $requestFingerprint = SportsbookBetSupport::payloadHash([
                'kind' => 'open_parlay_create',
                'type' => $type,
                'amount' => round($betAmount, 2),
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

            $requestDocId = SportsbookBetSupport::idempotencyDocumentId('open_parlay_create', $userId, $requestId);
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
                    throw new ApiException('requestId has already been used for a different open parlay payload', 409, ['code' => 'REQUEST_ID_REUSED']);
                }
                $existingStatus = (string) ($existingRequest['status'] ?? 'processing');
                if ($existingStatus === 'completed') {
                    $betIds = is_array($existingRequest['betIds'] ?? null) ? $existingRequest['betIds'] : [];
                    $existingResponse = $this->buildBetPlacementResponse($betIds, [
                        'requestId' => $requestId,
                        'balance' => $existingRequest['responseBalance'] ?? ($user['balance'] ?? 0),
                        'pendingBalance' => $existingRequest['responsePendingBalance'] ?? ($user['pendingBalance'] ?? 0),
                        'freeplayBalance' => $existingRequest['responseFreeplayBalance'] ?? ($user['freeplayBalance'] ?? 0),
                    ]);
                    $existingResponse['idempotentReplay'] = true;
                    Response::json($existingResponse);
                    return;
                }
                if ($existingStatus === 'processing') {
                    throw new ApiException('This open parlay request is already being processed', 409, ['code' => 'REQUEST_IN_PROGRESS']);
                }
                $this->db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                    'payloadHash' => $requestFingerprint,
                    'status' => 'processing',
                    'error' => null,
                    'updatedAt' => SqlRepository::nowUtc(),
                ]);
            }
            $requestDocOwned = true;

            $ticketId = SportsbookBetSupport::idempotencyDocumentId('open_parlay_ticket', $userId, $requestId);
            $selectionDocs = array_map(fn (array $row): array => $this->selectionForInsert($row), $validatedSelections);

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

                // No freeplay on open parlays — the whole stake is real money.
                $realPortion = $totalRisk;
                if ($available < $realPortion) {
                    $this->db->rollback();
                    throw new ApiException('Insufficient available balance', 400, ['code' => 'INSUFFICIENT_BALANCE']);
                }
                $gamblingLimits = is_array($lockedUser['gamblingLimits'] ?? null) ? $lockedUser['gamblingLimits'] : [];
                $lossLimitMsg = $this->checkLossLimits($lockedUser, $gamblingLimits, $realPortion);
                if ($lossLimitMsg !== null) {
                    $this->db->rollback();
                    throw new ApiException($lossLimitMsg, 400);
                }

                // Cash accounts move stake out of `balance` at create; credit
                // accounts hold it in `pendingBalance` only (mirrors placeBet).
                $newBalance  = $isCreditAccount ? $balance : ($balance - $realPortion);
                $newPending  = $pending + $realPortion;
                $newFreeplay = max(0.0, $freeplayBalance);

                $this->db->updateOne('users', ['id' => SqlRepository::id((string) $lockedUser['id'])], [
                    'balance'        => $newBalance,
                    'pendingBalance' => $newPending,
                    'betCount'       => ((int) ($lockedUser['betCount'] ?? 0)) + 1,
                    'totalWagered'   => $this->num($lockedUser['totalWagered'] ?? 0) + $realPortion,
                    'updatedAt'      => SqlRepository::nowUtc(),
                ]);

                $ipAddress = IpUtils::clientIp();
                $userAgent = Http::header('user-agent');
                $now = SqlRepository::nowUtc();

                $createEvent = [
                    'event' => 'create',
                    'at' => $now,
                    'by' => $userId,
                    'requestId' => $requestId,
                    'legCount' => count($selectionDocs),
                    'targetLegs' => $targetLegs,
                    'combinedOdds' => $combinedOdds,
                    'potentialPayout' => $potentialPayout,
                ];

                $doc = [
                    'userId' => $userId,
                    'requestId' => $requestId,
                    'ticketId' => $ticketId,
                    'amount' => $totalRisk,
                    'riskAmount' => $totalRisk,
                    'unitStake' => $betAmount,
                    'type' => 'parlay',
                    'isOpenParlay' => true,
                    'targetLegs' => $targetLegs,
                    'potentialPayout' => $potentialPayout,
                    'combinedOdds' => $combinedOdds,
                    'status' => 'open',
                    'isFreeplay' => false,
                    'freeplayAmountUsed' => 0.0,
                    'ipAddress' => $ipAddress,
                    'userAgent' => $userAgent,
                    'teaserPoints' => 0.0,
                    'openParlayLegEvents' => [$createEvent],
                    'selections' => $selectionDocs,
                    'matchId' => null,
                    'selection' => 'MULTI',
                    'selectionFull' => 'MULTI',
                    'odds' => $combinedOdds,
                    'oddsAmerican' => null,
                    'marketType' => 'parlay',
                    'description' => SportsbookBetSupport::descriptionForSelections($selectionDocs),
                    'matchSnapshot' => new stdClass(),
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ];
                $betId = $this->db->insertOne('bets', $doc);
                $createdBetIds[] = $betId;
                $createdBet = $this->db->findOne('bets', ['id' => SqlRepository::id($betId)]) ?? array_merge($doc, ['id' => $betId]);
                SportsbookBetSupport::upsertSelectionRowsForBet($this->db, $createdBet, $selectionDocs);

                $this->db->insertOne('transactions', [
                    'userId' => $userId,
                    'amount' => $totalRisk,
                    'type' => 'bet_placed',
                    'status' => 'completed',
                    'isFreeplay' => false,
                    'freeplayAmountUsed' => 0.0,
                    'balanceBefore' => $balance,
                    'balanceAfter' => $newBalance,
                    'referenceType' => 'Bet',
                    'referenceId' => SqlRepository::id($betId),
                    'reason' => 'OPEN_PARLAY_PLACED',
                    'description' => 'PARLAY open play created (' . count($selectionDocs) . ' leg' . (count($selectionDocs) === 1 ? '' : 's') . ')',
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
                'freeplayBalance' => $newFreeplay,
            ]);

            $this->db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                'status' => 'completed',
                'betIds' => $createdBetIds,
                'ticketId' => $ticketId,
                'responseBalance' => $newBalance,
                'responsePendingBalance' => $newPending,
                'responseFreeplayBalance' => $newFreeplay,
                'updatedAt' => SqlRepository::nowUtc(),
            ]);
            $requestDocOwned = false;

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
            Response::serverError('Error creating open parlay', $e, 400);
        }
    }

    /**
     * Add one leg to an existing open parlay. Risk is FIXED at create —
     * adding a leg never moves money — so this method takes only the bet's
     * row lock (not the user row): no balance/pending mutation happens here.
     * The leg passes the same odds-change handshake and the HARD
     * commenceTime>now() anti-past-posting gate, payout is recomputed
     * authoritatively from all locked legs with the 3xmaxBet cap re-applied
     * (M3/M4), an audit event is appended, and a dedicated idempotency key
     * (M5) makes a double-tap a no-op.
     */
    private function addOpenParlayLeg(): void
    {
        $requestDocId = '';
        $requestDocOwned = false;
        try {
            if (RateLimiter::fromEnv($this->db, 'place_bet')) {
                return;
            }
            if (!OpenParlayService::isEnabled()) {
                throw new ApiException('Open parlays are not currently available.', 400, ['code' => 'OPEN_PARLAY_DISABLED']);
            }

            $user = $this->protect();
            if ($user === null) {
                return;
            }

            $body = Http::jsonBody();
            $requestId = SportsbookBetSupport::normalizeRequestId((string) (($body['requestId'] ?? '') ?: Http::header('x-request-id')));
            if ($requestId === '') {
                throw new ApiException('requestId is required to add a leg', 400, ['code' => 'REQUEST_ID_REQUIRED']);
            }

            $betId = trim((string) ($body['betId'] ?? ($body['ticketId'] ?? '')));
            if (preg_match('/^[a-f0-9]{24}$/i', $betId) !== 1) {
                throw new ApiException('A valid open parlay ticket id is required.', 400, ['code' => 'OPEN_PARLAY_TICKET_INVALID']);
            }

            $leg = is_array($body['leg'] ?? null) ? $body['leg'] : [];
            if ($leg === []) {
                throw new ApiException('A leg object is required.', 400, ['code' => 'OPEN_PARLAY_LEG_REQUIRED']);
            }
            $boughtPointsRaw = $leg['boughtPoints'] ?? null;
            $boughtPoints = is_numeric($boughtPointsRaw) ? (float) $boughtPointsRaw : 0.0;
            $selType = BetModeRules::normalize((string) ($leg['type'] ?? ($leg['marketType'] ?? 'straight')));
            if ($selType === 'outrights') {
                throw new ApiException('Outright legs are not allowed on open parlays.', 400, ['code' => 'OPEN_PARLAY_OUTRIGHT_NOT_ALLOWED']);
            }

            $acceptance = SportsbookBetSupport::resolveOddsAcceptance(is_array($user['settings'] ?? null) ? $user['settings'] : null);
            try {
                $validated = $this->validateSelection(
                    trim((string) ($leg['matchId'] ?? '')),
                    trim((string) ($leg['selection'] ?? '')),
                    $leg['odds'] ?? null,
                    $selType,
                    $boughtPoints,
                    $acceptance['policy'],
                    $acceptance['bandCents'],
                    (isset($leg['point']) && is_numeric($leg['point'])) ? (float) $leg['point'] : null
                );
            } catch (ApiException $e) {
                $details = $e->payload();
                if (($details['code'] ?? null) === 'ODDS_CHANGED') {
                    throw new ApiException('Odds changed. Please review the updated price before adding this leg.', 409, [
                        'code' => 'ODDS_CHANGED',
                        'officialOdds' => $details['officialOdds'] ?? null,
                        'officialAmericanOdds' => $details['officialAmericanOdds'] ?? null,
                        'selection' => $details['selection'] ?? trim((string) ($leg['selection'] ?? '')),
                        'matchId' => $details['matchId'] ?? trim((string) ($leg['matchId'] ?? '')),
                    ]);
                }
                throw $e;
            }
            // HARD anti-past-posting gate (M1) — independent of isBettable.
            OpenParlayService::assertLegStartsInFuture(is_array($validated['matchSnapshot'] ?? null) ? $validated['matchSnapshot'] : []);
            $validated['pitcherAction'] = self::normalizePitcherAction($leg['pitcherAction'] ?? null);
            $newLegDoc = $this->selectionForInsert($validated);

            $userId = SqlRepository::id((string) $user['id']);

            // Dedicated add-leg idempotency (M5).
            $requestFingerprint = SportsbookBetSupport::payloadHash([
                'kind' => 'open_parlay_addleg',
                'betId' => $betId,
                'matchId' => (string) ($validated['matchId'] ?? ''),
                'selection' => (string) ($validated['selection'] ?? ''),
                'odds' => round((float) ($validated['odds'] ?? 0), 4),
                'marketType' => (string) ($validated['marketType'] ?? ''),
                'point' => isset($validated['point']) && is_numeric($validated['point']) ? round((float) $validated['point'], 2) : null,
            ]);
            $requestDocId = SportsbookBetSupport::idempotencyDocumentId('open_parlay_addleg', $userId, $requestId);
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
                    throw new ApiException('requestId has already been used for a different add-leg payload', 409, ['code' => 'REQUEST_ID_REUSED']);
                }
                $existingStatus = (string) ($existingRequest['status'] ?? 'processing');
                if ($existingStatus === 'completed') {
                    $existingResponse = $this->buildBetPlacementResponse([$betId], [
                        'requestId' => $requestId,
                        'balance' => $existingRequest['responseBalance'] ?? ($user['balance'] ?? 0),
                        'pendingBalance' => $existingRequest['responsePendingBalance'] ?? ($user['pendingBalance'] ?? 0),
                        'freeplayBalance' => $existingRequest['responseFreeplayBalance'] ?? ($user['freeplayBalance'] ?? 0),
                    ]);
                    $existingResponse['idempotentReplay'] = true;
                    Response::json($existingResponse);
                    return;
                }
                if ($existingStatus === 'processing') {
                    throw new ApiException('This add-leg request is already being processed', 409, ['code' => 'REQUEST_IN_PROGRESS']);
                }
                $this->db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                    'payloadHash' => $requestFingerprint,
                    'status' => 'processing',
                    'error' => null,
                    'updatedAt' => SqlRepository::nowUtc(),
                ]);
            }
            $requestDocOwned = true;

            $modeRule = $this->getModeRule('parlay') ?? [];
            $maxBetLimit = isset($user['maxBet']) && is_numeric($user['maxBet']) ? (float) $user['maxBet'] : 0.0;

            $this->db->beginTransaction();
            try {
                $bet = $this->db->findOneForUpdate('bets', ['id' => SqlRepository::id($betId)]);
                if ($bet === null) {
                    $this->db->rollback();
                    throw new ApiException('Open parlay not found.', 404, ['code' => 'OPEN_PARLAY_NOT_FOUND']);
                }
                if ((string) ($bet['userId'] ?? '') !== $userId) {
                    $this->db->rollback();
                    throw new ApiException('This open parlay does not belong to you.', 403, ['code' => 'OPEN_PARLAY_FORBIDDEN']);
                }
                if ((string) ($bet['status'] ?? '') !== 'open' || (string) ($bet['type'] ?? '') !== 'parlay') {
                    $this->db->rollback();
                    throw new ApiException('This ticket is no longer open for adding legs.', 409, ['code' => 'OPEN_PARLAY_NOT_OPEN']);
                }

                $existingLegs = is_array($bet['selections'] ?? null) ? array_values($bet['selections']) : [];
                $legCount = count($existingLegs);
                // Cap at the ticket's declared target (never above MAX_LEGS).
                // Legacy open tickets without a stored targetLegs fall back to
                // the hard MAX_LEGS ceiling. Enforced server-side — the UI cap
                // is advisory only.
                $targetLegs = (int) ($bet['targetLegs'] ?? 0);
                $legCap = ($targetLegs >= OpenParlayService::MIN_TARGET_LEGS && $targetLegs <= OpenParlayService::MAX_LEGS)
                    ? $targetLegs
                    : OpenParlayService::MAX_LEGS;
                if ($legCount >= $legCap) {
                    $this->db->rollback();
                    throw new ApiException(
                        'This open parlay is already full (' . $legCap . ' leg' . ($legCap === 1 ? '' : 's') . ').',
                        400,
                        ['code' => 'OPEN_PARLAY_FULL']
                    );
                }
                // Cards/corners are straight-only — mirrors
                // validateTicketComposition (this add-leg path enforces
                // composition inline rather than calling it; keep in sync).
                $addLegMt = strtolower((string) ($validated['marketType'] ?? ''));
                if (str_ends_with($addLegMt, '_cards') || str_ends_with($addLegMt, '_corners')) {
                    $this->db->rollback();
                    throw new ApiException('Card and corner markets are available as straight bets only.', 400, [
                        'code' => 'CARDS_STRAIGHT_ONLY',
                    ]);
                }
                // No same-game / duplicate-event leg (mirrors validateTicketComposition).
                $newMatchId = (string) ($validated['matchId'] ?? '');
                foreach ($existingLegs as $existing) {
                    if (is_array($existing) && (string) ($existing['matchId'] ?? '') === $newMatchId) {
                        $this->db->rollback();
                        throw new ApiException('That game is already on this parlay. Pick a different event.', 400, ['code' => 'INVALID_COMBINATION']);
                    }
                }

                $updatedLegs = array_merge($existingLegs, [$newLegDoc]);
                $unitStake = $this->num($bet['unitStake'] ?? ($bet['riskAmount'] ?? ($bet['amount'] ?? 0)));
                $payoutCalc = OpenParlayService::recomputePayout($unitStake, $updatedLegs, $modeRule, $maxBetLimit);
                $potentialPayout = $payoutCalc['potentialPayout'];
                $combinedOdds = $payoutCalc['combinedOdds'];

                $now = SqlRepository::nowUtc();
                $events = is_array($bet['openParlayLegEvents'] ?? null) ? array_values($bet['openParlayLegEvents']) : [];
                $events[] = [
                    'event' => 'add_leg',
                    'at' => $now,
                    'by' => $userId,
                    'requestId' => $requestId,
                    'legIndex' => $legCount,
                    'matchId' => $newMatchId,
                    'selection' => (string) ($validated['selection'] ?? ''),
                    'oddsAmerican' => isset($validated['oddsAmerican']) ? (int) $validated['oddsAmerican'] : null,
                    'odds' => round((float) ($validated['odds'] ?? 0), 4),
                    'legCount' => $legCount + 1,
                    'combinedOdds' => $combinedOdds,
                    'potentialPayout' => $potentialPayout,
                    'capped' => $payoutCalc['capped'],
                ];

                $this->db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                    'selections' => $updatedLegs,
                    'potentialPayout' => $potentialPayout,
                    'combinedOdds' => $combinedOdds,
                    'odds' => $combinedOdds,
                    'description' => SportsbookBetSupport::descriptionForSelections($updatedLegs),
                    'openParlayLegEvents' => $events,
                    'updatedAt' => $now,
                ]);

                // Insert ONLY the new leg row at index=legCount (upsert would
                // duplicate the legs already stored).
                SportsbookBetSupport::appendSelectionRowForBet($this->db, array_merge($bet, ['id' => $betId]), $newLegDoc, $legCount);

                $this->db->commit();
            } catch (Throwable $txErr) {
                $this->db->rollback();
                throw $txErr;
            }

            // Adding a leg moves no money; surface the user's current balances unchanged.
            $responsePayload = $this->buildBetPlacementResponse([$betId], [
                'requestId' => $requestId,
                'balance' => $user['balance'] ?? 0,
                'pendingBalance' => $user['pendingBalance'] ?? 0,
                'freeplayBalance' => $user['freeplayBalance'] ?? 0,
            ]);

            $this->db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                'status' => 'completed',
                'betIds' => [$betId],
                'responseBalance' => $this->num($user['balance'] ?? 0),
                'responsePendingBalance' => $this->num($user['pendingBalance'] ?? 0),
                'responseFreeplayBalance' => $this->num($user['freeplayBalance'] ?? 0),
                'updatedAt' => SqlRepository::nowUtc(),
            ]);
            $requestDocOwned = false;

            QueryCache::getInstance()->forgetPattern('bets:' . $userId . ':*');
            Response::json($responsePayload);
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
            Response::serverError('Error adding open parlay leg', $e, 400);
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
            // Distribute freeplay evenly across children. Assign the
            // rounding remainder to the last child so the sum equals $freeplayApplied exactly.
            $childFreeplayBase = $freeplayApplied > 0 ? floor($freeplayApplied / $childCount * 100) / 100 : 0.0;
            $childFreeplayRemainder = $freeplayApplied > 0
                ? round($freeplayApplied - $childFreeplayBase * $childCount, 2)
                : 0.0;

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
                    'freeplayAmountUsed' => (float) min(
                        $idx === count($childPlans) - 1
                            ? $childFreeplayBase + $childFreeplayRemainder
                            : $childFreeplayBase,
                        $stakePerParlay
                    ),
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
            // Round Robin replays were missing this — straight + parlay
            // both store it, so a retried RR placement would fall back
            // to the *current* freeplayBalance on the user record at
            // replay time, which can have drifted (admin grants, other
            // placements) since the original response was returned.
            'responseFreeplayBalance' => $newFreeplay,
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
            Response::serverError('Error settling bets', $e, 400);
        } catch (Throwable $e) {
            Response::serverError('Error settling bets', $e);
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
            Response::serverError('Error checking settle eligibility', $e);
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
            $regraded = [];
            $notDone = [];

            // Batch-fetch matches once instead of one findOne per match — a
            // user with 50 pending bets across 50 matches would otherwise
            // fire 50 sequential queries.
            $allMids = array_keys($matchIds);
            $matchById = [];
            if ($allMids !== []) {
                $matchObjectIds = array_map(static fn(string $id) => SqlRepository::id($id), $allMids);
                $matchDocs = $this->db->findMany('matches', ['id' => ['$in' => $matchObjectIds]]);
                foreach ($matchDocs as $md) {
                    $matchById[(string) ($md['id'] ?? '')] = $md;
                }
            }

            foreach ($allMids as $mid) {
                $match = $matchById[$mid] ?? null;
                if ($match === null) continue;
                $effective = SportsMatchStatus::effectiveStatus($match, $now);
                if (in_array($effective, ['finished', 'canceled'], true)) {
                    // Match outcome is known but the user's bet is still
                    // pending — the on-read sweep must have missed it
                    // (silent failure, throttle race, or pre-fix backlog).
                    // Force-call settleMatch so a manual /regrade-stuck
                    // request can actually rescue these tickets instead of
                    // reporting "alreadyFinal" while the bet stays stuck.
                    // settleMatch is idempotent (UPDATE ... WHERE status='pending')
                    // so calling it on an already-graded match is a no-op.
                    try {
                        $result = BetSettlementService::settleMatch($this->db, $mid, null, 'manual-regrade');
                        $betsSettled = (int) (count($result['settledBetIds'] ?? []));
                        if ($betsSettled > 0) {
                            $regraded[] = ['matchId' => $mid, 'betsSettled' => $betsSettled];
                            Logger::info('manual-regrade settled stuck bets', [
                                'userId' => $userId,
                                'matchId' => $mid,
                                'betsSettled' => $betsSettled,
                            ], 'bets');
                        } else {
                            $alreadyDone[] = $mid;
                        }
                    } catch (Throwable $e) {
                        Logger::warn('manual-regrade settle attempt failed', [
                            'userId' => $userId,
                            'matchId' => $mid,
                            'error' => $e->getMessage(),
                        ], 'bets');
                        $alreadyDone[] = $mid;
                    }
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
                } elseif ($effective === 'expired') {
                    // Expired matches with no provable outcome stay pending
                    // by design — operator must confirm before money moves.
                    // looksProvablyFinished already handled the "has score
                    // + started long enough ago" case above, so reaching
                    // here means the feed never recorded a score and we
                    // can't grade safely from the cron sweep.
                    $alreadyDone[] = $mid;
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
                'regraded' => $regraded,
                'alreadyFinal' => $alreadyDone,
                'stillPending' => $notDone,
            ]);
        } catch (Throwable $e) {
            Response::serverError('Error regrading stuck bets', $e);
        }
    }

    /**
     * Admin-only inbox of stuck pending tickets the auto-settle paths
     * couldn't grade. Returns one row per match (not per bet) since the
     * settle decision is per-match — one home/away/void choice cascades
     * to every affected player.
     *
     * Default threshold: matches that started ≥ HOURS hours ago (env
     * STUCK_BET_INBOX_HOURS, default 6). Query param ?hours=N overrides.
     */
    private function getStuckBetsInbox(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }
            if ((string) ($actor['role'] ?? '') !== 'admin') {
                Response::json(['message' => 'Admin role required'], 403);
                return;
            }

            $defaultHours = (int) Env::get('STUCK_BET_INBOX_HOURS', '6');
            $hours = isset($_GET['hours']) && is_numeric($_GET['hours'])
                ? max(1, (int) $_GET['hours'])
                : max(1, $defaultHours);

            $pendingSelections = $this->db->findMany('betselections', ['status' => 'pending'], [
                'projection' => ['matchId' => 1, 'betId' => 1, 'selection' => 1, 'marketType' => 1],
                'limit' => 2000,
            ]);
            if ($pendingSelections === []) {
                Response::json(['hours' => $hours, 'matches' => []]);
                return;
            }

            $betIdsByMatch = [];
            $selectionsByMatch = [];
            foreach ($pendingSelections as $sel) {
                $mid = (string) ($sel['matchId'] ?? '');
                $bid = (string) ($sel['betId'] ?? '');
                if ($mid === '' || $bid === '') continue;
                if (preg_match('/^[a-f0-9]{24}$/i', $mid) !== 1) continue;
                if (preg_match('/^[a-f0-9]{24}$/i', $bid) !== 1) continue;
                $betIdsByMatch[$mid][$bid] = true;
                $selectionsByMatch[$mid][] = $sel;
            }

            $now = time();
            $cutoffTs = $now - ($hours * 3600);
            $out = [];

            // Batch-fetch matches, bets, and users once instead of per-row
            // findOne calls inside the nested loop. Previous behavior was
            // 1 + N + (N * M) queries (N = matches, M = bets per match);
            // 50 matches × 10 bets = 501 queries vs. 3 with batching.
            $allMids = array_keys($betIdsByMatch);
            $matchById = [];
            if ($allMids !== []) {
                $matchObjectIds = array_map(static fn(string $id) => SqlRepository::id($id), $allMids);
                $matchDocs = $this->db->findMany('matches', ['id' => ['$in' => $matchObjectIds]]);
                foreach ($matchDocs as $md) {
                    $matchById[(string) ($md['id'] ?? '')] = $md;
                }
            }

            $allBetIds = [];
            foreach ($betIdsByMatch as $betIdSet) {
                foreach (array_keys($betIdSet) as $bid) {
                    $allBetIds[$bid] = true;
                }
            }
            $betById = [];
            $userIdsNeeded = [];
            if ($allBetIds !== []) {
                $betObjectIds = array_map(static fn(string $id) => SqlRepository::id($id), array_keys($allBetIds));
                $betDocs = $this->db->findMany('bets', ['id' => ['$in' => $betObjectIds]], [
                    'projection' => ['id' => 1, 'userId' => 1, 'amount' => 1, 'riskAmount' => 1, 'potentialPayout' => 1, 'type' => 1],
                ]);
                foreach ($betDocs as $bd) {
                    $betById[(string) ($bd['id'] ?? '')] = $bd;
                    $uid = (string) ($bd['userId'] ?? '');
                    if ($uid !== '') {
                        $userIdsNeeded[$uid] = true;
                    }
                }
            }

            $userById = [];
            if ($userIdsNeeded !== []) {
                $userObjectIds = array_map(static fn(string $id) => SqlRepository::id($id), array_keys($userIdsNeeded));
                $userDocs = $this->db->findMany('users', ['id' => ['$in' => $userObjectIds]], [
                    'projection' => ['id' => 1, 'username' => 1],
                ]);
                foreach ($userDocs as $ud) {
                    $userById[(string) ($ud['id'] ?? '')] = $ud;
                }
            }

            foreach ($betIdsByMatch as $mid => $betIdSet) {
                $match = $matchById[$mid] ?? null;
                if ($match === null) continue;

                $startTs = strtotime((string) ($match['startTime'] ?? '')) ?: 0;
                if ($startTs <= 0 || $startTs > $cutoffTs) {
                    continue;
                }

                $eff = SportsMatchStatus::effectiveStatus($match, $now);
                $score = is_array($match['score'] ?? null) ? $match['score'] : [];
                $sh = is_numeric($score['score_home'] ?? null) ? (float) $score['score_home'] : null;
                $sa = is_numeric($score['score_away'] ?? null) ? (float) $score['score_away'] : null;
                $lastScoreChanged = (string) ($match['lastScoreChangedAt'] ?? '');
                $probablyFinished = BetSettlementService::looksProvablyFinished($match, $now);

                $bets = [];
                $riskTotal = 0.0;
                foreach (array_keys($betIdSet) as $bid) {
                    $bet = $betById[$bid] ?? null;
                    if ($bet === null) continue;
                    $uid = (string) ($bet['userId'] ?? '');
                    $user = $uid !== '' ? ($userById[$uid] ?? null) : null;
                    $risk = (float) ($bet['riskAmount'] ?? $bet['amount'] ?? 0);
                    $riskTotal += $risk;
                    $bets[] = [
                        'betId' => $bid,
                        'userId' => $uid,
                        'username' => (string) ($user['username'] ?? ''),
                        'risk' => $risk,
                        'toWin' => max(0, (float) ($bet['potentialPayout'] ?? 0) - $risk),
                        'type' => (string) ($bet['type'] ?? 'straight'),
                    ];
                }

                $marketTypes = [];
                foreach ($selectionsByMatch[$mid] ?? [] as $sel) {
                    $mt = strtolower((string) ($sel['marketType'] ?? ''));
                    if ($mt !== '') $marketTypes[$mt] = true;
                }
                $h2hOnly = array_keys($marketTypes) === array_filter(array_keys($marketTypes), static fn($m) => in_array($m, ['h2h', 'moneyline', 'ml'], true));

                $out[] = [
                    'matchId' => $mid,
                    'homeTeam' => (string) ($match['homeTeam'] ?? ''),
                    'awayTeam' => (string) ($match['awayTeam'] ?? ''),
                    'sport' => (string) ($match['sport'] ?? ($match['sportKey'] ?? '')),
                    'startTime' => (string) ($match['startTime'] ?? ''),
                    'ageHours' => round(($now - $startTs) / 3600, 1),
                    'rawStatus' => (string) ($match['status'] ?? ''),
                    'effectiveStatus' => $eff,
                    'scoreHome' => $sh,
                    'scoreAway' => $sa,
                    'lastScoreChangedAt' => $lastScoreChanged,
                    'looksProvablyFinished' => $probablyFinished,
                    'h2hOnly' => $h2hOnly,
                    'marketTypes' => array_keys($marketTypes),
                    'bets' => $bets,
                    'totalRisk' => round($riskTotal, 2),
                    'betCount' => count($bets),
                ];
            }

            usort($out, static fn($a, $b) => ($b['ageHours'] ?? 0) <=> ($a['ageHours'] ?? 0));

            Response::json([
                'hours' => $hours,
                'matches' => $out,
                'matchCount' => count($out),
            ]);
        } catch (Throwable $e) {
            Response::serverError('Error loading stuck-bet inbox', $e);
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
            // a recent sweep already touched this user. Throttled to 5 s
            // to align with frontend polling frequency (matches settle
            // within seconds of user pulling up bets).
            try {
                $throttleNs = SportsbookCache::userBetSweepNamespace();
                $throttleKey = 'sweep:' . $userId;
                // 5 s TTL — allows settlement check on every poll while
                // preventing thrash on the bets table. When frontend polls
                // every 5s for pending bets, this ensures near-real-time
                // settlement feedback.
                $recent = SharedFileCache::get($throttleNs, $throttleKey, 5);
                if ($recent === null) {
                    // Set cache BEFORE settlement so concurrent requests within the
                    // 5s window don't trigger duplicate settlement sweeps. If settlement
                    // fails, the cache entry is set anyway, but this is acceptable
                    // because settlement is idempotent and the next 5s window will retry.
                    SharedFileCache::put($throttleNs, $throttleKey, ['at' => time()]);
                    BetSettlementService::settlePendingMatchesForUser($this->db, $userId, 'on-read');
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
                    // Live tickets that still hold a stake reservation: straight/
                    // simple bets sit in 'pending'; multi-leg parlays sit in
                    // 'open' until the whole ticket resolves. BOTH reserved their
                    // full real stake in pendingBalance at placement, so BOTH must
                    // be summed here. Excluding 'open' zeroed the reservation for
                    // any user whose only live risk was an open parlay — the
                    // reconciler itself overwrote a correct pendingBalance with 0,
                    // inflating available balance (money drift).
                    $pendingBets = $this->db->findMany('bets', [
                        'userId' => SqlRepository::id($userId),
                        'status' => ['$in' => ['pending', 'open']],
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
                    // Keep cent precision. Integer rounding caused the 60s
                    // reconciler to shave/boost pending by up to $0.99,
                    // which surfaced as sudden pending/available jumps.
                    $expectedPending = (float) round($expectedPending, 2);
                    // Re-fetch the user — the settlement sweep above may
                    // have just decremented pendingBalance, and `$user`
                    // from $this->protect() is the pre-sweep snapshot. A
                    // stale read would trigger an unnecessary write race.
                    $freshUser = $this->db->findOne('users', ['id' => SqlRepository::id($userId)], [
                        'projection' => ['pendingBalance' => 1],
                    ]);
                    $currentPending = (float) round((float) ($freshUser['pendingBalance'] ?? 0), 2);
                    if (abs($expectedPending - $currentPending) >= 0.01) {
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

    /**
     * Outright bet validator. Distinct from validateSelection() because:
     *   - Looks up `outrights` table, not `matches`.
     *   - No betting-availability / freshness refresh path (no live status).
     *   - Outcomes live under primaryBookmaker.markets[0].outcomes (the
     *     'outrights' market) rather than match.odds.markets.
     *
     * Returns the same shape as validateSelection() so the placement loop
     * can treat outright legs identically downstream.
     *
     * @return array<string, mixed>
     */
    // MMA/UFC betting is closed at placement time because settlement is not
    // implemented yet: moneyline would grade by score_home vs score_away
    // (0/0 for a fight → wrong/tie) and round-totals are ungradeable. A bet
    // placed now would settle incorrectly and pay (or seize) real money, so
    // we reject every MMA selection here — server-side — until settlement
    // ships and is verified. canonicalSportKey collapses any MMA alias to the
    // one canonical key so the gate can't be sidestepped by a key variant.
    // The sportKey is always read from our own DB row (never client input),
    // so a tampered client cannot get an MMA bet past this check.
    private static function assertMmaBettingClosed(string $sportKey): void
    {
        if (RundownSportMap::canonicalSportKey($sportKey) === 'mma_mixed_martial_arts') {
            throw new ApiException('MMA/UFC betting is currently unavailable.', 400, [
                'code' => 'MMA_BETTING_UNAVAILABLE',
                'sportKey' => $sportKey,
            ]);
        }
    }

    /**
     * Master gate for real-money futures/outright placement. Default OFF so the
     * code ships inert on every environment; an operator turns futures betting
     * on by setting SPORTSBOOK_OUTRIGHTS_BETTING_ENABLED=true (after verifying
     * the `outrights` table is populated with correctly-priced rows on prod).
     */
    private static function outrightsBettingEnabled(): bool
    {
        if (!OddsApiEventMapper::masterEnabled()) {
            return false; // ODDS_API_MASTER_ENABLED=false — whole provider off
        }
        $flag = strtolower(trim((string) (Env::get('SPORTSBOOK_OUTRIGHTS_BETTING_ENABLED', 'false') ?? 'false')));
        return $flag === 'true' || $flag === '1';
    }

    private function validateOutrightSelection(string $outrightId, string $selection, mixed $odds, string $acceptancePolicy = 'exact', int $acceptanceBandCents = 0): array
    {
        // KILL-SWITCH: futures betting is OFF until an operator opts in via
        // SPORTSBOOK_OUTRIGHTS_BETTING_ENABLED. This is the single placement
        // chokepoint for outrights (the open-parlay paths already reject
        // outright legs before reaching this method), so the flag gates ALL
        // real-money futures placement.
        //
        // The historical odds-inflation bug (price stored American, read as
        // decimal → decimalToAmericanInt(450)=44900) is FIXED: the price below
        // is read as American via SportsbookBetSupport::outrightPriceToOdds()
        // and locked by OutrightOddsConversionTest, and the ingester
        // (OddsApiSyncService::buildOutrightDoc — The Odds API is the sole
        // futures source) writes prices in that same RAW American form.
        // The flag stays default-OFF so the feature only goes live after data
        // is verified on prod — flip SPORTSBOOK_OUTRIGHTS_BETTING_ENABLED=true.
        if (!self::outrightsBettingEnabled()) {
            throw new ApiException('Futures betting is temporarily unavailable.', 409, [
                'code' => 'OUTRIGHTS_TEMPORARILY_UNAVAILABLE',
            ]);
        }

        if (preg_match('/^[a-f0-9]{24}$/i', $outrightId) !== 1) {
            throw new ApiException('Outright not found: ' . $outrightId, 404);
        }
        $outright = $this->db->findOne('outrights', ['id' => SqlRepository::id($outrightId)]);
        if ($outright === null) {
            throw new ApiException('Outright not found: ' . $outrightId, 404);
        }
        self::assertMmaBettingClosed((string) ($outright['sportKey'] ?? ''));
        $status = strtolower((string) ($outright['status'] ?? 'open'));
        if ($status !== 'open') {
            throw new ApiException('Outright market is not open for betting', 409, [
                'code' => 'OUTRIGHT_NOT_BETTABLE',
                'outrightStatus' => $status,
            ]);
        }

        // Pull outcomes from the first bookmaker that posted an 'outrights'
        // market — same picker the public listOutrights endpoint uses.
        $books = is_array($outright['bookmakers'] ?? null) ? $outright['bookmakers'] : [];
        $outcomes = [];
        foreach ($books as $book) {
            $markets = is_array($book['markets'] ?? null) ? $book['markets'] : [];
            foreach ($markets as $m) {
                if (is_array($m) && ($m['key'] ?? '') === 'outrights' && is_array($m['outcomes'] ?? null)) {
                    $outcomes = $m['outcomes'];
                    break 2;
                }
            }
        }
        if ($outcomes === []) {
            throw new ApiException('No outright prices posted for this event', 409, [
                'code' => 'OUTRIGHT_MARKET_UNAVAILABLE',
            ]);
        }

        $outcome = null;
        foreach ($outcomes as $candidate) {
            if (!is_array($candidate)) continue;
            $name = (string) ($candidate['name'] ?? '');
            if ($name !== '' && strcasecmp($name, $selection) === 0) {
                $outcome = $candidate;
                break;
            }
        }
        if (!is_array($outcome) || !isset($outcome['price'])) {
            throw new ApiException('Selection ' . $selection . ' not available for ' . ($outright['eventName'] ?? 'this market'), 409, [
                'code' => 'SELECTION_UNAVAILABLE',
            ]);
        }

        // The `outrights` table's `price` is the feed's AMERICAN odds (e.g.
        // 450 = +450), NOT decimal like the matches board — see the CONTRACT
        // note on outrightPriceToOdds(). Treating it as decimal inflated odds
        // ~100x (decimalToAmericanInt(450) = 44900). Locked by
        // OutrightOddsConversionTest.
        $official = SportsbookBetSupport::outrightPriceToOdds($outcome['price']);
        $officialAmericanInt = $official['american'];
        if ($officialAmericanInt === 0) {
            throw new ApiException('Invalid odds for selection ' . $selection, 409, ['code' => 'INVALID_ODDS']);
        }
        $officialOdds = $official['decimal'];
        if (!is_finite($officialOdds) || $officialOdds <= 1.0) {
            throw new ApiException('Invalid odds for selection ' . $selection, 409, ['code' => 'INVALID_ODDS']);
        }
        if (abs($officialAmericanInt) > 1000000) {
            throw new ApiException('Odds exceed maximum allowed value for selection ' . $selection, 409, ['code' => 'ODDS_EXCEEDS_MAX']);
        }

        $clientOddsAmerican = null;
        if (is_numeric($odds)) {
            $clientSnapped = SportsbookBetSupport::snapDecimalOdds((float) $odds);
            $clientAmericanInt = SportsbookBetSupport::decimalToAmericanInt($clientSnapped);
            // Audit-only slip-price snapshot when booking repriced the leg —
            // same contract as the match path (never read by settlement).
            if ($clientAmericanInt !== 0 && $clientAmericanInt !== $officialAmericanInt) {
                $clientOddsAmerican = $clientAmericanInt;
            }
            // Gate by the acceptance policy, not raw inequality: a favorable
            // move or a small adverse move (within the band) auto-places at the
            // official price below; only a policy-breaching move prompts.
            if (!SportsbookBetSupport::oddsAcceptable($clientAmericanInt, $officialAmericanInt, $acceptancePolicy, $acceptanceBandCents)) {
                throw new ApiException('Odds changed. Please review the updated price before placing the bet.', 409, [
                    'code' => 'ODDS_CHANGED',
                    'officialOdds' => $officialOdds,
                    'officialAmericanOdds' => $officialAmericanInt,
                    // Echo the client's own selection string so the frontend
                    // can match-and-patch the moved leg (see validateSelection).
                    'selection' => $selection,
                    'matchId' => $outrightId,
                ]);
            }
        }

        // Stash a minimal snapshot so receipts / settlement audits can
        // reconstruct what the user saw at placement without re-fetching
        // the (eventually overwritten) outrights row.
        // homeTeam/awayTeam mirror match-bet shape so descriptionForSelections
        // and the My Bets renderer don't print "Match vs ". For an outright,
        // there's no second team — we put the event name in homeTeam and the
        // picked outcome in awayTeam so the description reads as
        // "NFL Super Bowl Winner vs Los Angeles Rams | OUTRIGHTS | ...".
        $eventName = (string) ($outright['eventName'] ?? '');
        $snapshot = [
            'id' => (string) ($outright['id'] ?? $outrightId),
            'sportKey' => (string) ($outright['sportKey'] ?? ''),
            'eventId' => (string) ($outright['eventId'] ?? ''),
            'eventName' => $eventName,
            'commenceTime' => $outright['commenceTime'] ?? null,
            'status' => 'open',
            'homeTeam' => $eventName,
            'awayTeam' => (string) ($outcome['name'] ?? $selection),
        ];

        return [
            // Reuse `matchId` as the source-row pointer so the existing
            // betselections.j_match_id index still locates rows; the
            // separate `outrightId` field is the canonical futures pointer
            // for OutrightSettlementService.
            'matchId' => $outrightId,
            'outrightId' => $outrightId,
            'selection' => (string) ($outcome['name'] ?? $selection),
            // Outright competitor/event names are already the full form, so the
            // display label IS the selection. selectionPid carries the stable
            // outcome id when present (display/audit only).
            'selectionFull' => (string) ($outcome['name'] ?? $selection),
            'selectionPid' => $outcome['pid'] ?? null,
            'odds' => $officialOdds,
            'oddsAmerican' => $officialAmericanInt,
            'clientOddsAmerican' => $clientOddsAmerican,
            'marketType' => 'outrights',
            'point' => null,
            'matchSnapshot' => $snapshot,
            'isOutright' => true,
        ];
    }

    private function validateSelection(string $matchId, string $selection, mixed $odds, string $type, float $boughtPoints = 0.0, string $acceptancePolicy = 'exact', int $acceptanceBandCents = 0, ?float $submittedPoint = null): array
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
        // Live bets get a much tighter window than prematch: in-play prices
        // move pitch-by-pitch, so a live bet must never validate against a
        // price older than ~5s (sharps exploit exactly that gap). Prematch
        // lines move slowly — the wider window keeps those placements
        // instant instead of forcing an upstream round-trip per bet.
        $matchIsLive = strtolower((string) ($match['status'] ?? '')) === 'live';
        $betTimeFreshSecs = $matchIsLive
            ? max(2, (int) Env::get('BET_TIME_ODDS_FRESH_SECONDS_LIVE', '5'))
            : max(5, (int) Env::get('BET_TIME_ODDS_FRESH_SECONDS', '30'));
        $sportKey = (string) ($match['sportKey'] ?? '');
        // Close the MMA/UFC betting hole before doing any pricing work — a
        // placed MMA bet cannot be graded correctly yet (see helper).
        self::assertMmaBettingClosed($sportKey);
        $lastOddsAt = (string) ($match['lastOddsSyncAt'] ?? $match['lastUpdated'] ?? '');
        $oddsAge = $lastOddsAt !== '' ? max(0, time() - (int) strtotime($lastOddsAt)) : PHP_INT_MAX;
        // Sharp protection: if odds for this match's sport are stale, do a
        // synchronous Rundown refresh BEFORE we compare the user's accepted
        // price to the official one. Dedup'd via SharedFileCache so
        // concurrent bets on the same sport share one upstream call. Fail-
        // open on upstream errors — better to risk a stale price than to
        // block a real bet.
        if ($sportKey !== '' && $oddsAge > $betTimeFreshSecs && RundownClient::isConfigured()) {
            try {
                $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                if ($sportId !== null) {
                    $dedup = SharedFileCache::remember(
                        'bet-time-rundown-refresh',
                        $sportKey,
                        max(5, (int) ($betTimeFreshSecs / 2)),
                        static function () use ($sportKey, $sportId): array {
                            // closure captures $this implicitly via $db below
                            return ['at' => time()];
                        }
                    );
                    // Only the first caller in the dedup window actually
                    // refreshes; later callers get the cached marker.
                    if (is_array($dedup) && (int) ($dedup['at'] ?? 0) >= (time() - 2)) {
                        RundownSyncService::syncSportLive($this->db, $sportKey, $sportId);
                        $match = $this->db->findOne('matches', ['id' => SqlRepository::id($matchId)]) ?? $match;
                    }
                }
            } catch (Throwable $betTimeRefreshErr) {
                Logger::warning('bet-time rundown refresh failed', [
                    'matchId'  => $matchId,
                    'sportKey' => $sportKey,
                    'error'    => $betTimeRefreshErr->getMessage(),
                ], 'sportsbook');
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
        // Phase 2 (deferred): lazy fetch of player-prop / alt-period markets.
        // v1 of the Rundown integration ships core markets only (h2h /
        // spreads / totals / team_totals) — see RundownMarketMap. The
        // legacy extendedMarkets cache is intentionally not populated;
        // bets referencing extended keys will fall through to the
        // standard market lookup below and 404 cleanly.

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

        // ── Alt-line point authentication ─────────────────────────────────
        // When the client submits an explicit `point` (an alt spread/total
        // rung from the alt-lines sheet), the ladder holds many same-name
        // outcomes at different points — so matching by name alone can resolve
        // the WRONG rung, or be ambiguous. Pin the exact rung by (outcome-name
        // prefix + exact point) and reject if that point is not currently
        // offered, so a bet can never be priced or settled off a line other
        // than the one the user actually clicked. Core/main-line and Buy Points
        // selections send no `point`, so they keep their existing match path.
        if ($submittedPoint !== null && !$isPropMarket) {
            $rungSel = trim($selection);
            $rungMatch = null;
            $rungAmbiguous = false;
            foreach (($market['outcomes'] ?? []) as $candidate) {
                if (!is_array($candidate) || !isset($candidate['point']) || !is_numeric($candidate['point'])) {
                    continue;
                }
                if (abs((float) $candidate['point'] - $submittedPoint) > 1e-6) {
                    continue;
                }
                $rungName = (string) ($candidate['name'] ?? '');
                if ($rungName === '' || stripos($rungSel, $rungName) !== 0) {
                    continue;
                }
                if (is_array($rungMatch)) {
                    $rungAmbiguous = true;
                    break;
                }
                $rungMatch = $candidate;
            }
            if ($rungAmbiguous) {
                throw new ApiException('Selection ' . $selection . ' is ambiguous at this line', 409, [
                    'code' => 'SELECTION_AMBIGUOUS',
                ]);
            }
            if (!is_array($rungMatch)) {
                // Defense-in-depth: the open-parlay resume flow historically
                // over-sent a `point` on MAIN lines (App.jsx confirmResumeAddLeg),
                // forcing them into this strict alt-rung lookup and hard-rejecting
                // valid main-line placements ("Line X is no longer offered"). For a
                // CORE main market (spreads/totals main — NOT an alt key) with no
                // bought points, fall through to the lenient name-match +
                // team-reconciliation path below — the same path normal straight
                // placement already uses — instead of rejecting. Genuine alt
                // markets and Buy Points still REQUIRE an exact rung (the ladder
                // holds many same-name rungs), so they keep the strict rejection.
                $isAltMarketKey = AltLineCap::isAltKey(strtolower((string) ($market['key'] ?? '')));
                if ($isAltMarketKey || abs($boughtPoints) > 1e-9) {
                    throw new ApiException('Line ' . $selection . ' is no longer offered', 409, [
                        'code' => 'LINE_NOT_OFFERED',
                    ]);
                }
                // Core main line, no bought points → leave $outcome null so the
                // lenient match loop below resolves it. The alt risk-cap block
                // just below is a no-op here (it only runs for alt keys).
            }
            $outcome = is_array($rungMatch) ? $rungMatch : null;

            // House risk cap — reject rungs beyond the configured
            // nearest-to-main limit, by exact point, using the SAME AltLineCap
            // logic that filters the display. Enforced here (not just hidden in
            // the UI) so a capped rung can't be placed via a direct API call.
            // The limit is read from platformsettings live (no restart).
            $altKey = strtolower((string) ($market['key'] ?? ''));
            // Card markets are EXEMPT from the alt-ladder risk cap. The cap
            // exists to stop cherry-picking rungs far from a core market's
            // MAIN line — cards have no core/main line at all, so the cap's
            // median fallback would trim the whole product to one rung per
            // side (default perSide=1). Card ladders are already house-safe:
            // ingestion collapses each rung to the preferred-book/median
            // price, and the strict rung-exists check ABOVE still rejects any
            // point not currently stored. Display is symmetric (cards merge
            // after capAlternateLadders in getMatchProps), so no
            // show-but-reject window opens.
            if (AltLineCap::isAltKey($altKey) && !str_ends_with($altKey, '_cards') && !str_ends_with($altKey, '_corners')) {
                $capSettings = null;
                try {
                    $capSettings = $this->db->findOne('platformsettings', []);
                } catch (Throwable $capSettingsErr) {
                    $capSettings = null;
                }
                $capSettingsArr = is_array($capSettings) ? $capSettings : null;
                $perSide = AltLineCap::perSideLimitForKey($capSettingsArr, $altKey);
                // Same single-offset totals bundle the board uses, so placement
                // accepts exactly the rung the board surfaced (no show-but-reject).
                $totalsAltCfg = AltLineCap::totalsAltConfig($capSettingsArr);
                $coreMarket = $this->findMarket($markets, AltLineCap::coreKeyFor($altKey));
                $coreOutcomes = is_array($coreMarket['outcomes'] ?? null) ? $coreMarket['outcomes'] : [];
                $altOutcomes = is_array($market['outcomes'] ?? null) ? $market['outcomes'] : [];
                if (!AltLineCap::isPointAllowed((string) ($rungMatch['name'] ?? ''), $submittedPoint, $altOutcomes, $coreOutcomes, $perSide, $sportKey, AltLineCap::coreKeyFor($altKey), $totalsAltCfg)) {
                    throw new ApiException('That alternate line is not currently available.', 400, [
                        'code' => 'ALT_LINE_CAPPED',
                    ]);
                }
            }
        }

        // If point-authentication already resolved the exact rung, iterate an
        // empty set so the name-based loop below can't overwrite it.
        foreach ((is_array($outcome) ? [] : ($market['outcomes'] ?? [])) as $candidate) {
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

        // Team-name reconciliation fallback. The exact-name loop above fails
        // when the odds source names an outcome with the FULL team name
        // ("Boston Red Sox") while the card/betslip sends the SHORT name
        // ("Boston", the homeTeam/awayTeam form that settlement grades on).
        // For 2-sided team markets (h2h / spreads + period variants), resolve
        // the selection and each outcome to a home/away side and match by
        // side. We read the PRICE from the matched outcome but DO NOT change
        // the stored selection — it stays the short name so settlement still
        // grades it correctly. Strict + unambiguous (resolveTeamSide returns
        // null on any ambiguity), so a leg can never be priced off the wrong
        // team. Over/Under/Draw selections resolve to null here and fall
        // through to the rejection below, unchanged.
        if (!is_array($outcome) && !$isPropMarket) {
            $homeTeam = (string) ($match['homeTeam'] ?? '');
            $awayTeam = (string) ($match['awayTeam'] ?? '');
            $selSide = $this->resolveTeamSide($selection, $homeTeam, $awayTeam);
            if ($selSide !== null) {
                $sideMatch = null;
                $sideAmbiguous = false;
                foreach (($market['outcomes'] ?? []) as $candidate) {
                    if (!is_array($candidate)) {
                        continue;
                    }
                    if ($this->resolveTeamSide((string) ($candidate['name'] ?? ''), $homeTeam, $awayTeam) === $selSide) {
                        if ($sideMatch !== null) {
                            $sideAmbiguous = true;
                            break;
                        }
                        $sideMatch = $candidate;
                    }
                }
                if (!$sideAmbiguous && is_array($sideMatch)) {
                    $outcome = $sideMatch;
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

        // ── Buy Points repricing ────────────────────────────────────────
        // When boughtPoints > 0, we re-derive the expected American odds
        // server-side via BuyPointsPricing (server is sole pricing
        // authority — the client's juice ladder is for display only).
        // The downstream ODDS_CHANGED comparison then runs against the
        // *adjusted* price, so a tampered client sending -100 on a -3 →
        // -10 bought line will be rejected.
        $marketKey = (string) ($market['key'] ?? '');
        $effectiveAmerican = $officialAmericanInt;
        $effectiveDecimal = $officialOdds;
        $adjustedPoint = isset($outcome['point']) ? (float) $outcome['point'] : null;
        $originalPoint = $adjustedPoint;
        $appliedBoughtPoints = 0.0;
        $signedPointDelta = 0.0;
        if (abs($boughtPoints) > 1e-9) {
            // Buy-points is gated per sport (interim lock 2026-06-16: default
            // OFF until each sport's feed-anchored pricing is verified).
            // boughtPoints is SIGNED: + buys (easier), - sells (harder).
            // Base lines (boughtPoints == 0) are unaffected.
            if (!BuyPointsPricing::isSportEnabled((string) ($match['sportKey'] ?? ''))) {
                throw new ApiException('Buy Points is temporarily unavailable. Please place the base line instead.', 400, [
                    'code' => 'BUY_POINTS_DISABLED',
                ]);
            }
            if (!BuyPointsPricing::isAllowedMarket($marketKey)) {
                throw new ApiException('Buy Points is only available on spread and total markets.', 400, [
                    'code' => 'BUY_POINTS_MARKET_INVALID',
                    'marketType' => $marketKey,
                ]);
            }
            if ($originalPoint === null) {
                // Defensive: spreads/totals must carry a `point`. If the
                // upstream row is missing one (sync hiccup), refuse the
                // buy rather than guess.
                throw new ApiException('This selection has no line — Buy Points cannot be applied.', 409, [
                    'code' => 'BUY_POINTS_NO_BASE_LINE',
                ]);
            }
            // Validate the half-point grid + range (throws on bad input).
            BuyPointsPricing::halfStepsFromBoughtPoints($boughtPoints);
            // Price the rung from the SAME source the display ladder uses
            // ($markets includes the feed's extendedMarkets): feed alt prices
            // when present, else the house-safe synthetic ladder for no-alt-feed
            // sports (basketball). Single source → display == placed == settled.
            // No price for this exact rung (e.g. unsupported sport) → reject.
            $rung = BuyPointsPricing::priceBoughtPointFromFeed(
                (string) ($match['sportKey'] ?? ''),
                $marketKey,
                (string) ($outcome['name'] ?? $selection),
                $originalPoint,
                $boughtPoints,
                $markets
            );
            if ($rung === null) {
                throw new ApiException('Buy Points is unavailable for this line right now. Please place the base line instead.', 409, [
                    'code' => 'BUY_POINTS_NO_FEED_PRICE',
                ]);
            }
            $signedPointDelta = BuyPointsPricing::signedPointDelta(
                $marketKey,
                (string) ($outcome['name'] ?? $selection),
                $boughtPoints
            );
            // The feed-matched rung line equals originalPoint + signedPointDelta;
            // use the rung's own (already rounded) line so it can never diverge
            // from the priced point.
            $adjustedPoint = round((float) $rung['line'], 2);
            $effectiveAmerican = (int) $rung['american'];
            $effectiveDecimal = (float) $rung['decimal'];
            if (!is_finite($effectiveDecimal) || $effectiveDecimal <= 1.0) {
                throw new ApiException('Invalid adjusted odds for Buy Points.', 409, [
                    'code' => 'INVALID_ODDS',
                ]);
            }
            $appliedBoughtPoints = $boughtPoints;
        }

        // ── Interim quarter-line (Asian split handicap) placement block ───
        // Rundown ships soccer Asian handicaps (and some alt totals) as
        // "quarter" lines whose point ends in .25/.75 (e.g. -0.25, 1.25). A
        // quarter line settles as HALF the stake on each adjacent half/whole
        // line, but the live single-line grader (gradeAgainstScore) settles
        // them as a full win/loss — a real money mis-grade on draw/boundary
        // results. Until quarter-aware grading ships, refuse to PLACE new
        // bets on quarter lines for spread/total markets (incl. their
        // alternate_/period variants and team totals). Half/whole lines
        // (.0/.5) grade correctly today and stay bettable. Player props use a
        // different settlement path and are unaffected.
        if (!$isPropMarket && SportsbookBetSupport::isQuarterPoint($adjustedPoint)) {
            $quarterBase = strtolower($marketKey);
            if (str_starts_with($quarterBase, 'alternate_')) {
                $quarterBase = substr($quarterBase, strlen('alternate_'));
            }
            $isSpreadOrTotalFamily = str_contains($quarterBase, 'spread') || str_contains($quarterBase, 'total');
            if ($isSpreadOrTotalFamily) {
                throw new ApiException('This line is temporarily unavailable for betting. Please choose a different line.', 409, [
                    'code' => 'QUARTER_LINE_UNAVAILABLE',
                    'marketType' => $marketKey,
                    'point' => $adjustedPoint,
                ]);
            }
        }

        // ── Baseball PK (0-run) spread placement block ─────────────────────
        // Belt-and-braces mirror of the ingestion suppression
        // (RundownEventMapper::isSuppressedPkSpreadRung): in baseball a 0-run
        // spread is the SAME outcome as the moneyline (no ties), so a "PK"
        // spread is a duplicate ML at different juice — an arb against our own
        // board. Ingestion no longer stores these rungs, but a stale client
        // slip or a doc written before that gate could still submit one;
        // refuse it here so it can never book. Spread family only (game +
        // period + alternate_); totals/h2h/props unaffected. Soccer & hockey
        // PK handicaps are legitimate distinct products (draw refunds stake)
        // and are NOT gated — baseball sportKeys only.
        if (
            !$isPropMarket
            && $adjustedPoint !== null
            && (float) $adjustedPoint == 0.0
            && str_starts_with(strtolower(trim((string) ($match['sportKey'] ?? ''))), 'baseball')
        ) {
            $pkBase = strtolower($marketKey);
            if (str_starts_with($pkBase, 'alternate_')) {
                $pkBase = substr($pkBase, strlen('alternate_'));
            }
            if ($pkBase === 'spreads' || str_starts_with($pkBase, 'spreads_')) {
                throw new ApiException('This line is unavailable — use the moneyline for a pick\'em price.', 409, [
                    'code' => 'PK_SPREAD_UNAVAILABLE',
                    'marketType' => $marketKey,
                    'point' => $adjustedPoint,
                ]);
            }
        }

        // Compare client odds vs official using American integers to avoid
        // decimal floating-point mismatches on the 0.0001 threshold.
        // For Buy Points legs, "official" here means the server's repriced
        // ladder value (not the base market price).
        $clientOddsAmerican = null;
        if (is_numeric($odds)) {
            $clientSnapped = SportsbookBetSupport::snapDecimalOdds((float) $odds);
            $clientAmericanInt = SportsbookBetSupport::decimalToAmericanInt($clientSnapped);
            // Audit-only snapshot of the price the CLIENT's slip carried when
            // it differs from the booked official price (favorable move or
            // in-band adverse move auto-accepted below). Never read by any
            // payout/settlement math — those use odds/oddsAmerican only. Lets
            // receipts and Pending show "line moved -210 → -220" instead of a
            // silent reprice the player has to escalate to understand.
            if ($clientAmericanInt !== 0 && $clientAmericanInt !== $effectiveAmerican) {
                $clientOddsAmerican = $clientAmericanInt;
            }
            // Gate by the acceptance policy, not raw inequality: a favorable
            // move or a small adverse move (within the band) auto-places at the
            // official price below; only a policy-breaching move prompts. For
            // Buy Points legs, "official" is the server's repriced ladder value.
            if (!SportsbookBetSupport::oddsAcceptable($clientAmericanInt, $effectiveAmerican, $acceptancePolicy, $acceptanceBandCents)) {
                throw new ApiException('Odds changed. Please review the updated price before placing the bet.', 409, [
                    'code' => 'ODDS_CHANGED',
                    'officialOdds' => $effectiveDecimal,
                    'officialAmericanOdds' => $effectiveAmerican,
                    // Echo the client's OWN selection string (the stitched
                    // "Player Over 0.5" for props, the short team name for
                    // h2h/spreads) — NOT $outcome['name'], which for props is
                    // just "Over"/"Under" and for full-name odds sources is the
                    // long team name. The frontend patches the moved leg by
                    // matching this against the slip's selection; if it doesn't
                    // match verbatim the patch silently no-ops and the user is
                    // stuck in an unbreakable "Odds updated — tap PLACE" loop.
                    'selection' => $selection,
                    'marketType' => $normalizedType,
                    'matchId' => $matchId,
                ]);
            }
        }

        return [
            'matchId' => $matchId,
            // `selection` stays the SHORT canonical (= the normalized outcome
            // name, which equals homeTeam/awayTeam for team markets). This is
            // the stable match key settlement and the odds-change handshake run
            // on — do NOT replace it with the full name.
            'selection' => (string) ($outcome['name'] ?? $selection),
            // selectionFull: the full "City Mascot" team name for team markets,
            // or the player-inclusive label ("Aaron Judge Over 0.5") for props
            // so the slip/MyBets show WHO the bet is on (and prop settlement has
            // a name fallback). selectionPid: the stable team_id (team markets)
            // or PLAYER id (props) — prop settlement matches the box score on
            // this id, never the display name.
            'selectionFull' => $isPropMarket
                ? trim(
                    (string) ($outcome['description'] ?? '')
                    . ' ' . (string) ($outcome['name'] ?? '')
                    . ($adjustedPoint !== null ? ' ' . rtrim(rtrim(number_format((float) $adjustedPoint, 2, '.', ''), '0'), '.') : '')
                )
                : $this->fullSelectionLabel($match, $outcome, $selection),
            'selectionPid' => $outcome['pid'] ?? null,
            // Player-prop only: which side of the matchup the player is on, so
            // the pending-bets row shows a SINGLE team crest (the player's own
            // team) instead of both. Best-effort — null on non-props or any
            // unresolved lookup, and the UI falls back to both matchup crests
            // (legacy behavior). Resolved once here off selectionPid + the
            // snapshot's team ids; never re-derived from the display name.
            'playerTeamSide' => $isPropMarket
                ? PlayerPropTeam::side(isset($outcome['pid']) ? (string) $outcome['pid'] : null, is_array($match) ? $match : [])
                : null,
            // Team totals canonical fields (null on every other market). The
            // outcome carries these structured from the mapper; settlement
            // grades the picked team's score on teamSide + side and NEVER
            // parses the display `name`/`selection`. Stored on the leg so
            // grading has them without re-reading the live doc.
            'teamSide' => $outcome['teamSide'] ?? null,
            'side' => $outcome['side'] ?? null,
            'odds' => $effectiveDecimal,
            'oddsAmerican' => $effectiveAmerican,
            // Audit-only: the slip's price when booking repriced the leg
            // (null when unchanged). Display reads it; settlement never does.
            'clientOddsAmerican' => $clientOddsAmerican,
            'marketType' => $marketKey,
            'point' => $adjustedPoint,
            // Audit fields — present whenever Buy Points applied. Settlement
            // reads `point` (already adjusted), so these are for the bet
            // doc / receipts / customer-service rebuild rather than grading.
            'originalPoint' => $originalPoint,
            'boughtPoints' => $appliedBoughtPoints,
            'pointAdjustment' => round($signedPointDelta, 2),
            'matchSnapshot' => $match,
        ];
    }

    /**
     * Coerce a client-supplied pitcherAction blob into a strict
     * {home:bool, away:bool} shape. Anything missing/garbage → false (the
     * conservative default: the listed pitcher applies, so the leg voids if
     * that pitcher is scratched). Returning a plain bool[] keeps the stored
     * shape tiny and JSON-stable.
     *
     * @return array{home:bool,away:bool}
     */
    private static function normalizePitcherAction(mixed $raw): array
    {
        $home = false;
        $away = false;
        if (is_array($raw)) {
            $home = !empty($raw['home']);
            $away = !empty($raw['away']);
        }
        return ['home' => $home, 'away' => $away];
    }

    private function selectionForInsert(array $selection): array
    {
        $isOutright = ($selection['marketType'] ?? '') === 'outrights' || !empty($selection['isOutright']);
        return [
            'matchId' => SqlRepository::id((string) $selection['matchId']),
            // Mirror matchId into outrightId for outright legs so
            // OutrightSettlementService can lookup via the indexed
            // j_outright_id column (idx_betselections_outright_status).
            // Null on non-outright legs — keeps the index sparse.
            'outrightId' => $isOutright ? SqlRepository::id((string) ($selection['outrightId'] ?? $selection['matchId'])) : null,
            'selection' => $selection['selection'],
            // Full display name + stable outcome id snapshot (display/audit only;
            // settlement still grades off `selection` + the matchSnapshot).
            'selectionFull' => (string) ($selection['selectionFull'] ?? $selection['selection'] ?? ''),
            'selectionPid' => $selection['selectionPid'] ?? null,
            'odds' => (float) $selection['odds'],
            'oddsAmerican' => isset($selection['oddsAmerican']) ? (int) $selection['oddsAmerican'] : null,
            // Audit-only slip price when booking repriced this leg (else null).
            'clientOddsAmerican' => isset($selection['clientOddsAmerican']) && is_numeric($selection['clientOddsAmerican'])
                ? (int) $selection['clientOddsAmerican']
                : null,
            'marketType' => $selection['marketType'] ?? '',
            // Team totals canonical grading fields. Null on every non-team-total
            // leg; settlement reads these (NOT the display name) to grade the
            // picked team's score against `point`.
            'teamSide' => $selection['teamSide'] ?? null,
            'side' => $selection['side'] ?? null,
            // Player-prop only: which matchup side the player is on ('home'/
            // 'away'), so the pending-bets row shows a single team crest. Null
            // on every non-prop or unresolved leg (UI then shows both crests).
            // Display-only — never read by settlement.
            'playerTeamSide' => $selection['playerTeamSide'] ?? null,
            'point' => $selection['point'] ?? null,
            // basePoint preserves the pregame line BEFORE teaser shift OR
            // buy-points shift. originalPoint mirrors basePoint for buy
            // points but stays distinct so settlement / receipts can tell
            // which feature moved the line (or both, if the rule ever
            // allowed stacking — currently it doesn't).
            'basePoint' => $selection['basePoint'] ?? ($selection['originalPoint'] ?? ($selection['point'] ?? null)),
            'originalPoint' => $selection['originalPoint'] ?? ($selection['basePoint'] ?? ($selection['point'] ?? null)),
            'teaserAdjustment' => $selection['teaserAdjustment'] ?? 0.0,
            // Buy Points audit. Zero on every leg that didn't buy a point
            // so downstream consumers can filter cleanly. `pointAdjustment`
            // is signed; `boughtPoints` is the magnitude (matches the
            // value the client submitted).
            'boughtPoints' => isset($selection['boughtPoints']) ? (float) $selection['boughtPoints'] : 0.0,
            'pointAdjustment' => isset($selection['pointAdjustment']) ? (float) $selection['pointAdjustment'] : 0.0,
            // Explicit flag so downstream consumers (receipts, settlement
            // audit, reporting) can filter buy-points legs without
            // re-deriving from boughtPoints. Derived here from the magnitude
            // the validator already vetted, so it stays in lockstep.
            'isBuyPoints' => (isset($selection['boughtPoints']) && abs((float) $selection['boughtPoints']) > 1e-9),
            'status' => 'pending',
            // MLB listed-pitcher Action waiver (per side). Settlement reads
            // this alongside the leg's matchSnapshot to decide whether a
            // pitcher change voids the leg. Defaults to no-action (void on
            // change) for every non-baseball / legacy leg.
            'pitcherAction' => self::normalizePitcherAction($selection['pitcherAction'] ?? null),
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
        // freeplayBalance is included so the client can apply an
        // optimistic update without waiting for the /auth/me refetch
        // round-trip. The mobile header's freeplay pill was reading
        // stale data after partial-freeplay bets because nothing in
        // the placement response surfaced the deducted pool — the
        // refetch eventually caught up, but the window of "freeplay
        // still shows pre-bet value" was confusing the user.
        return [
            'message' => 'Bet placed successfully',
            'bets' => $this->loadEnrichedBetsByIds($betIds),
            'requestId' => $meta['requestId'] ?? null,
            'balance' => (float) round($this->num($meta['balance'] ?? 0)),
            'pendingBalance' => (float) round($this->num($meta['pendingBalance'] ?? 0)),
            'freeplayBalance' => (float) round($this->num($meta['freeplayBalance'] ?? 0)),
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
                    // Include score so the LIVE pill on pending bets can
                    // pick up event_status=IN_PROGRESS during the brief
                    // window when the scoreboard worker flips event_status
                    // but the matches.status field hasn't been bumped to
                    // 'live' yet (worker race). Without `score` the only
                    // signals on bet.match were status + startTime, and a
                    // pre-game placement's bet.match would only flip to
                    // live after the slower status-sync ran.
                    'score' => 1,
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
     * Decide whether a team-market name — a market outcome name OR a user's
     * selection — refers to the home side, the away side, or neither. Tolerant
     * to short vs full forms ("Boston" ↔ "Boston Red Sox") because the match
     * doc carries SHORT names in homeTeam/awayTeam (which settlement grades
     * against) while some odds sources name outcomes with the FULL team name.
     *
     * Returns 'home', 'away', or null. null is returned whenever resolution is
     * AMBIGUOUS (matches both sides) or matches neither — so a name can never
     * silently resolve to the wrong side, which on a spread/ML market would
     * mean pricing a bet off the opponent's line. Money-critical: keep this
     * strict.
     */
    private function resolveTeamSide(string $name, string $home, string $away): ?string
    {
        $n = strtolower(trim($name));
        $h = strtolower(trim($home));
        $a = strtolower(trim($away));
        if ($n === '') {
            return null;
        }
        $matchesHome = $h !== '' && ($n === $h || str_contains($n, $h) || str_contains($h, $n));
        $matchesAway = $a !== '' && ($n === $a || str_contains($n, $a) || str_contains($a, $n));
        if ($matchesHome && !$matchesAway) {
            return 'home';
        }
        if ($matchesAway && !$matchesHome) {
            return 'away';
        }
        return null;
    }

    /**
     * Full DISPLAY label for a validated selection. Team markets (h2h / spreads
     * and their period variants) resolve the matched outcome's side to the
     * match's full "City Mascot" name; Over/Under, player props, and any
     * unresolved side fall back to the short selection verbatim. Display only —
     * the stored `selection` stays the short canonical match key.
     *
     * @param array<string,mixed> $match
     * @param array<string,mixed> $outcome
     */
    private function fullSelectionLabel(array $match, array $outcome, string $selection): string
    {
        $name = (string) ($outcome['name'] ?? $selection);
        $side = $this->resolveTeamSide($name, (string) ($match['homeTeam'] ?? ''), (string) ($match['awayTeam'] ?? ''));
        if ($side === 'home') {
            $full = trim((string) ($match['homeTeamFull'] ?? ''));
            if ($full !== '') {
                return $full;
            }
        } elseif ($side === 'away') {
            $full = trim((string) ($match['awayTeamFull'] ?? ''));
            if ($full !== '') {
                return $full;
            }
        }
        return $name;
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
        // Mirror MatchesController: in-play games select markets from the live
        // book list so the bet price matches exactly what the player saw.
        $isLive = strtolower((string) ($match['status'] ?? '')) === 'live';
        if (is_array($oddsRoot)) {
            $oddsRoot = self::canonicalizeOddsMarketsFromBookmakers($oddsRoot, $isLive);
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
        // Soccer card markets — the SAME single gate as display
        // (MatchesController::getMatchProps), so a card leg prices exactly
        // when the player can see it, and rejects (market not found) the
        // moment kickoff passes or the card data goes stale. Fail-closed on
        // both surfaces.
        foreach (OddsApiCardMarketsService::servableCardMarkets($match) as $cardMarket) {
            $pool[] = $cardMarket;
        }
        return $pool;
    }

    /**
     * Build a canonical odds.markets list out of odds.bookmakers with
     * optional market-specific book preferences. Keeps existing markets and
     * overrides same-key rows with bookmaker-selected core markets.
     *
     * @param array<string,mixed> $oddsRoot
     * @return array<string,mixed>
     */
    private static function canonicalizeOddsMarketsFromBookmakers(array $oddsRoot, bool $isLive = false): array
    {
        $bookmakers = is_array($oddsRoot['bookmakers'] ?? null) ? $oddsRoot['bookmakers'] : [];
        if ($bookmakers === []) {
            return $oddsRoot;
        }

        $selected = self::selectMarketsFromBookmakers($bookmakers, $isLive);
        if ($selected === []) {
            return $oddsRoot;
        }

        $byKey = [];
        $existing = is_array($oddsRoot['markets'] ?? null) ? $oddsRoot['markets'] : [];
        foreach ($existing as $market) {
            if (!is_array($market)) continue;
            $key = strtolower((string) ($market['key'] ?? ''));
            if ($key === '') continue;
            $byKey[$key] = $market;
        }
        foreach ($selected as $market) {
            $key = strtolower((string) ($market['key'] ?? ''));
            if ($key === '') continue;
            $byKey[$key] = $market;
        }

        $oddsRoot['markets'] = array_values($byKey);
        return $oddsRoot;
    }

    /**
     * @param list<array<string,mixed>> $bookmakers
     * @return list<array<string,mixed>>
     */
    private static function selectMarketsFromBookmakers(array $bookmakers, bool $isLive = false): array
    {
        /** @var array<string, list<array{book:string,market:array<string,mixed>}>> $candidates */
        $candidates = [];

        foreach ($bookmakers as $book) {
            if (!is_array($book)) continue;
            $bookKey = strtolower((string) ($book['key'] ?? ''));
            $markets = is_array($book['markets'] ?? null) ? $book['markets'] : [];
            foreach ($markets as $market) {
                if (!is_array($market)) continue;
                $marketKey = strtolower((string) ($market['key'] ?? ''));
                if ($marketKey === '') continue;
                $outcomes = is_array($market['outcomes'] ?? null) ? $market['outcomes'] : [];
                if ($outcomes === []) continue;
                $candidates[$marketKey] ??= [];
                $candidates[$marketKey][] = [
                    'book' => $bookKey,
                    'market' => $market,
                ];
            }
        }

        if ($candidates === []) {
            return [];
        }

        $selected = [];
        foreach ($candidates as $marketKey => $rows) {
            $preferredBooks = self::preferredBooksForMarket($marketKey, $isLive);
            $chosen = null;

            foreach ($preferredBooks as $bookKey) {
                foreach ($rows as $row) {
                    if (($row['book'] ?? '') === $bookKey) {
                        $chosen = $row['market'];
                        break 2;
                    }
                }
            }

            if ($chosen === null) {
                $chosen = $rows[0]['market'] ?? null;
            }
            if (is_array($chosen)) {
                $selected[] = $chosen;
            }
        }

        return $selected;
    }

    /**
     * @return list<string>
     */
    private static function preferredBooksForMarket(string $marketKey, bool $isLive = false): array
    {
        // Live (in-play) games use SPORTSBOOK_PREFERRED_BOOKS_LIVE when set,
        // overriding per-market + general lists. Must match MatchesController
        // exactly so the bet price equals the displayed price. Prematch falls
        // through unchanged.
        if ($isLive) {
            $live = self::parsePreferredBookList((string) Env::get('SPORTSBOOK_PREFERRED_BOOKS_LIVE', ''));
            if ($live !== []) {
                return $live;
            }
        }

        $family = self::marketFamily($marketKey);
        $envKey = match ($family) {
            'spreads' => 'SPORTSBOOK_PREFERRED_BOOKS_SPREADS',
            'h2h' => 'SPORTSBOOK_PREFERRED_BOOKS_H2H',
            'totals' => 'SPORTSBOOK_PREFERRED_BOOKS_TOTALS',
            default => '',
        };

        if ($envKey !== '') {
            $specific = self::parsePreferredBookList((string) Env::get($envKey, ''));
            if ($specific !== []) {
                return $specific;
            }
        }

        return self::parsePreferredBookList((string) Env::get('SPORTSBOOK_PREFERRED_BOOKS', ''));
    }

    private static function marketFamily(string $marketKey): string
    {
        $key = strtolower(trim($marketKey));
        if (str_starts_with($key, 'spreads')) return 'spreads';
        if (str_starts_with($key, 'totals')) return 'totals';
        if (str_starts_with($key, 'h2h') || str_starts_with($key, 'moneyline') || str_starts_with($key, 'ml')) {
            return 'h2h';
        }
        return 'other';
    }

    /**
     * @return list<string>
     */
    private static function parsePreferredBookList(string $raw): array
    {
        if (trim($raw) === '') {
            return [];
        }
        return array_values(array_filter(
            array_map(static fn ($part): string => strtolower(trim((string) $part)), explode(',', $raw)),
            static fn (string $part): bool => $part !== ''
        ));
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
        // Period suffixes the upstream uses: _h1, _h2, _q1..q4, _p1..p3,
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
