<?php

declare(strict_types=1);

/**
 * Manual / write-in bets ("phone bets") — an ADMIN books a custom bet on a
 * player's account for a market we don't carry (the player phoned it in or
 * saw it elsewhere). The bet has NO matchId and NO feed marketType; it is a
 * free-text description priced at admin-entered American odds, and it is
 * graded manually later (ManualBetGradingService — the CardBetGradingService
 * sibling).
 *
 * WHY IT CAN NEVER AUTO-SETTLE: the settlement sweep selects pending legs by
 * matchId (always null here) AND parseGradableMarket('manual') resolves to
 * nothing — double structural protection. The manual grading endpoint is the
 * ONLY route to settlement, exactly like card bets.
 *
 * SCOPE — deliberately narrow (money-critical):
 *   - STRAIGHT-ONLY, single leg, real money only (no freeplay in v1 — that
 *     halves the money-path surface; the grading block already knows how to
 *     handle freeplay if v2 ever allows it).
 *   - Admin role ONLY (protectAdminOnly(true) at the endpoint) — agents can
 *     neither place nor see these.
 *   - The money block MIRRORS BetsController::placeBet's transaction: row
 *     lock, credit-account available formula, pendingBalance hold, ledger
 *     row, loss limits on the real portion. Keep the two in sync.
 *   - Idempotent via the same betrequests machinery as player placement: an
 *     admin double-click with the same requestId replays the first response
 *     instead of booking a second bet.
 *
 * LEDGER TAGGING: transactions use the ALREADY-WHITELISTED type
 * 'bet_placed_admin' (weekly figures aggregate transactions through explicit
 * type whitelists — a brand-new type would be invisible money) with the
 * distinct reason 'MANUAL_BET_PLACED' so manual bets stay distinguishable in
 * reporting without touching any whitelist.
 */
final class ManualBetService
{
    public const MARKET_TYPE = 'manual';
    public const BET_TYPE = 'manual';

    /** American odds sanity bounds: |odds| < 100 is not a valid American
     * price, and anything past ±50000 is a typo, not a line. */
    public const MIN_ABS_AMERICAN = 100;
    public const MAX_ABS_AMERICAN = 50000;

    public const MIN_STAKE = 1.0;
    public const DEFAULT_MAX_STAKE = 500.0;
    public const DESCRIPTION_MAX_CHARS = 500;

    public static function enabled(): bool
    {
        $flag = strtolower(trim((string) (Env::get('MANUAL_BETS_ENABLED', 'false') ?? 'false')));
        return in_array($flag, ['1', 'true', 'yes', 'on'], true);
    }

    public static function maxStake(): float
    {
        $raw = Env::get('MANUAL_BET_MAX_STAKE', null);
        $max = is_numeric($raw) ? (float) $raw : self::DEFAULT_MAX_STAKE;
        return $max > 0 ? $max : self::DEFAULT_MAX_STAKE;
    }

    /**
     * Whole-dollar payout for a stake at an American price. Whole dollars is
     * the platform's payout convention (see the card grading service's
     * round() pinning); acceptedPayout stores this exact number so grading
     * honors it within its ±$2 pin window.
     */
    public static function payoutFor(float $stake, int $american): float
    {
        $decimal = SportsbookBetSupport::americanToDecimalExact($american);
        if ($decimal <= 1.0) {
            return 0.0;
        }
        return (float) round($stake * $decimal);
    }

    /**
     * Pure input validation (no user, no DB) — everything checkable before we
     * even reserve the requestId. Returns ['code','message'] or null.
     *
     * @return array{code:string, message:string}|null
     */
    public static function inputError(string $description, mixed $oddsAmerican, mixed $stake, float $maxStake): ?array
    {
        $description = trim($description);
        if ($description === '') {
            return ['code' => 'DESCRIPTION_REQUIRED', 'message' => 'A bet description is required.'];
        }
        if (mb_strlen($description) > self::DESCRIPTION_MAX_CHARS) {
            return ['code' => 'DESCRIPTION_TOO_LONG', 'message' => 'Description is limited to ' . self::DESCRIPTION_MAX_CHARS . ' characters.'];
        }

        // American odds must be a whole number (±100 … ±50000). A fractional
        // value is a typo or a decimal-odds paste — refuse rather than guess.
        if (!is_numeric($oddsAmerican) || (float) $oddsAmerican !== (float) (int) $oddsAmerican) {
            return ['code' => 'INVALID_ODDS', 'message' => 'Odds must be a whole American number like -110 or +150.'];
        }
        $american = (int) $oddsAmerican;
        if (abs($american) < self::MIN_ABS_AMERICAN || abs($american) > self::MAX_ABS_AMERICAN) {
            return ['code' => 'INVALID_ODDS', 'message' => 'American odds must be between ±' . self::MIN_ABS_AMERICAN . ' and ±' . self::MAX_ABS_AMERICAN . '.'];
        }

        if (!is_numeric($stake)) {
            return ['code' => 'INVALID_STAKE', 'message' => 'Stake must be a number.'];
        }
        $stakeF = round((float) $stake, 2);
        if ($stakeF < self::MIN_STAKE) {
            return ['code' => 'BELOW_MIN_STAKE', 'message' => 'Minimum manual bet stake is $' . number_format(self::MIN_STAKE, 0) . '.'];
        }
        if ($stakeF > $maxStake) {
            return ['code' => 'ABOVE_MAX_STAKE', 'message' => 'Manual bet stake is capped at $' . number_format($maxStake, 0) . ' (MANUAL_BET_MAX_STAKE).'];
        }
        return null;
    }

    /**
     * Pure per-player validation against the LOCKED user row. The per-user
     * maxBet still applies (an admin cannot exceed the player's own ceiling);
     * per-user minBet deliberately does NOT (the $1 floor governs — the
     * write-in is admin discretion, min-bet is a player-facing slip rule).
     *
     * @param array<string,mixed>|null $user
     * @return array{code:string, message:string}|null
     */
    public static function userError(?array $user, float $stake): ?array
    {
        if ($user === null || strtolower((string) ($user['role'] ?? '')) !== 'user') {
            return ['code' => 'USER_NOT_FOUND', 'message' => 'Player not found.'];
        }
        if (strtolower((string) ($user['status'] ?? 'active')) === 'suspended') {
            return ['code' => 'USER_SUSPENDED', 'message' => 'This player account is suspended.'];
        }
        $maxBet = isset($user['maxBet']) && is_numeric($user['maxBet']) ? (float) $user['maxBet'] : 0.0;
        if ($maxBet > 0 && $stake > $maxBet) {
            return ['code' => 'ABOVE_MAX_BET', 'message' => 'Stake exceeds this player\'s max bet of $' . number_format($maxBet, 0) . '.'];
        }
        return null;
    }

    /**
     * Book a manual bet on a player's account. Money movement is identical to
     * a self-placed pending straight: cash accounts move stake out of balance,
     * credit accounts hold it in pendingBalance only, and one ledger row
     * records the hold.
     *
     * @param array{id:string, role:string, username:string} $actor   the ADMIN placing it
     * @param array<string,mixed>                            $body    request body
     * @param array{ipAddress?:string, userAgent?:string}    $context HTTP context (kept out of the service's reach otherwise)
     * @return array<string,mixed> ok/status/code/message or the booked-bet payload
     */
    public static function placeBet(SqlRepository $db, array $actor, array $body, array $context = []): array
    {
        if (!self::enabled()) {
            return ['ok' => false, 'status' => 403, 'code' => 'MANUAL_BETS_DISABLED', 'message' => 'Manual bets are disabled (MANUAL_BETS_ENABLED).'];
        }

        $userId = trim((string) ($body['userId'] ?? ''));
        if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
            return ['ok' => false, 'status' => 400, 'code' => 'INVALID_USER_ID', 'message' => 'A valid player id is required.'];
        }

        try {
            $requestId = SportsbookBetSupport::normalizeRequestId((string) ($body['requestId'] ?? ''));
        } catch (ApiException $e) {
            return ['ok' => false, 'status' => 400, 'code' => 'INVALID_REQUEST_ID', 'message' => $e->getMessage()];
        }
        if ($requestId === '') {
            // The double-click guard is mandatory — the confirm modal helps,
            // but the SERVER refuses to book without an idempotency key.
            return ['ok' => false, 'status' => 400, 'code' => 'REQUEST_ID_REQUIRED', 'message' => 'requestId is required for manual bet placement.'];
        }

        $description = trim((string) ($body['description'] ?? ''));
        $oddsRaw = $body['oddsAmerican'] ?? null;
        $stakeRaw = $body['stake'] ?? ($body['amount'] ?? null);

        $inputError = self::inputError($description, $oddsRaw, $stakeRaw, self::maxStake());
        if ($inputError !== null) {
            return ['ok' => false, 'status' => 400] + $inputError;
        }
        $american = (int) $oddsRaw;
        $stake = round((float) $stakeRaw, 2);
        $decimal = SportsbookBetSupport::americanToDecimalExact($american);
        $potentialPayout = self::payoutFor($stake, $american);
        $toWin = (float) round($potentialPayout - $stake, 2);

        // ── requestId idempotency (same betrequests machinery as placeBet):
        //    one requestId books at most one bet, ever. ───────────────────────
        $requestDocId = SportsbookBetSupport::idempotencyDocumentId('manual_bet', $userId, $requestId);
        $requestFingerprint = SportsbookBetSupport::payloadHash([
            'userId' => $userId,
            'description' => $description,
            'oddsAmerican' => $american,
            'stake' => $stake,
        ]);
        $requestNow = SqlRepository::nowUtc();
        if (!$db->insertOneIfAbsent('betrequests', [
            'id' => $requestDocId,
            'userId' => $userId,
            'requestId' => $requestId,
            'payloadHash' => $requestFingerprint,
            'scope' => 'manual_bet',
            'status' => 'processing',
            'createdAt' => $requestNow,
            'updatedAt' => $requestNow,
        ])) {
            $existing = $db->findOne('betrequests', ['id' => SqlRepository::id($requestDocId)]);
            if ($existing === null) {
                return ['ok' => false, 'status' => 409, 'code' => 'REQUEST_CONFLICT', 'message' => 'Unable to lock request id.'];
            }
            if ((string) ($existing['payloadHash'] ?? '') !== $requestFingerprint) {
                return ['ok' => false, 'status' => 409, 'code' => 'REQUEST_ID_REUSED', 'message' => 'requestId has already been used for a different manual bet.'];
            }
            $existingStatus = (string) ($existing['status'] ?? 'processing');
            if ($existingStatus === 'completed') {
                $betIds = is_array($existing['betIds'] ?? null) ? $existing['betIds'] : [];
                return [
                    'ok' => true,
                    'status' => 200,
                    'idempotentReplay' => true,
                    'betId' => (string) ($betIds[0] ?? ''),
                    'riskAmount' => $stake,
                    'potentialPayout' => $potentialPayout,
                    'toWin' => $toWin,
                    'balance' => $existing['responseBalance'] ?? null,
                    'pendingBalance' => $existing['responsePendingBalance'] ?? null,
                ];
            }
            if ($existingStatus === 'processing') {
                return ['ok' => false, 'status' => 409, 'code' => 'REQUEST_IN_PROGRESS', 'message' => 'This manual bet is already being processed.'];
            }
            // failed → take over and retry under the same key.
            $db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                'payloadHash' => $requestFingerprint,
                'status' => 'processing',
                'error' => null,
                'updatedAt' => SqlRepository::nowUtc(),
            ]);
        }

        $failRequest = static function (SqlRepository $db, string $requestDocId, string $error): void {
            try {
                $db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
                    'status' => 'failed',
                    'error' => $error,
                    'updatedAt' => SqlRepository::nowUtc(),
                ]);
            } catch (Throwable) {
                // best-effort — the row staying 'processing' only delays a retry
            }
        };

        $db->beginTransaction();
        try {
            // Row lock — same double-spend guard as player placement: any
            // concurrent placement/settlement for this user blocks here.
            $lockedUser = $db->findOneForUpdate('users', ['id' => SqlRepository::id($userId)]);

            $userError = self::userError($lockedUser, $stake);
            if ($userError !== null) {
                $db->rollback();
                $failRequest($db, $requestDocId, $userError['code']);
                return ['ok' => false, 'status' => $userError['code'] === 'USER_NOT_FOUND' ? 404 : 400] + $userError;
            }

            $balance = (float) ($lockedUser['balance'] ?? 0);
            $pending = (float) ($lockedUser['pendingBalance'] ?? 0);
            $creditLimit = (float) ($lockedUser['creditLimit'] ?? 0);
            $isCreditAccount = $creditLimit > 0; // role already proven 'user' by userError()
            $available = $isCreditAccount
                ? max(0.0, $creditLimit + $balance - $pending)
                : max(0.0, $balance - $pending);

            // The admin cannot write a bet the player couldn't place themselves.
            if ($available < $stake) {
                $db->rollback();
                $failRequest($db, $requestDocId, 'INSUFFICIENT_BALANCE');
                return ['ok' => false, 'status' => 400, 'code' => 'INSUFFICIENT_BALANCE', 'message' => 'Player has insufficient available balance for this stake.'];
            }

            $gamblingLimits = is_array($lockedUser['gamblingLimits'] ?? null) ? $lockedUser['gamblingLimits'] : [];
            $lossLimitMsg = self::lossLimitError($db, $lockedUser, $gamblingLimits, $stake);
            if ($lossLimitMsg !== null) {
                $db->rollback();
                $failRequest($db, $requestDocId, 'LOSS_LIMIT');
                return ['ok' => false, 'status' => 400, 'code' => 'LOSS_LIMIT', 'message' => $lossLimitMsg];
            }

            // Cash accounts move stake out of balance at placement; credit
            // accounts hold it in pendingBalance only (mirrors placeBet).
            $newBalance = $isCreditAccount ? $balance : ($balance - $stake);
            $newPending = $pending + $stake;
            $now = SqlRepository::nowUtc();

            $db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                'balance' => $newBalance,
                'pendingBalance' => $newPending,
                'betCount' => ((int) ($lockedUser['betCount'] ?? 0)) + 1,
                'totalWagered' => (float) ($lockedUser['totalWagered'] ?? 0) + $stake,
                'updatedAt' => $now,
            ]);

            $ipAddress = (string) ($context['ipAddress'] ?? '');
            $userAgent = (string) ($context['userAgent'] ?? '');
            $ticketId = SportsbookBetSupport::idempotencyDocumentId('manual_ticket', $userId, $requestId);
            $leg = [
                'matchId' => '',
                'selection' => $description,
                'selectionFull' => $description,
                'odds' => $decimal,
                'oddsAmerican' => $american,
                'marketType' => self::MARKET_TYPE,
                'point' => null,
                'status' => 'pending',
            ];
            $doc = [
                'userId' => SqlRepository::id($userId),
                'requestId' => $requestId,
                'ticketId' => $ticketId,
                'amount' => $stake,
                'riskAmount' => $stake,
                'unitStake' => $stake,
                'type' => self::BET_TYPE,
                'marketType' => self::MARKET_TYPE,
                'matchId' => null,
                'selection' => $description,
                'selectionFull' => $description,
                'description' => $description,
                'odds' => $decimal,
                'oddsAmerican' => $american,
                'combinedOdds' => $decimal,
                'potentialPayout' => $potentialPayout,
                // Whole-dollar pin: grading honors this exact payout within ±$2.
                'acceptedPayout' => $potentialPayout,
                'status' => 'pending',
                'isFreeplay' => false,
                'freeplayAmountUsed' => 0.0,
                'selections' => [$leg],
                'matchSnapshot' => new stdClass(),
                // Full audit: WHO wrote the bet in (gradedBy lands as
                // settledBy/settledAt at grading time, mirroring cards).
                'enteredBy' => (string) ($actor['id'] ?? ''),
                'enteredByRole' => (string) ($actor['role'] ?? 'admin'),
                'enteredByUsername' => (string) ($actor['username'] ?? ''),
                'ipAddress' => $ipAddress,
                'userAgent' => $userAgent,
                'createdAt' => $now,
                'updatedAt' => $now,
            ];
            $betId = $db->insertOne('bets', $doc);
            $createdBet = $db->findOne('bets', ['id' => SqlRepository::id($betId)]) ?? array_merge($doc, ['id' => $betId]);
            SportsbookBetSupport::upsertSelectionRowsForBet($db, $createdBet, [$leg]);

            $db->insertOne('transactions', [
                'userId' => SqlRepository::id($userId),
                'amount' => $stake,
                // 'bet_placed_admin' is already in every reporting whitelist
                // (weekly figures / statements). The MANUAL_BET_PLACED reason
                // is what makes these rows distinguishable — do NOT mint a new
                // type here without updating the whitelists.
                'type' => 'bet_placed_admin',
                'status' => 'completed',
                'isFreeplay' => false,
                'freeplayAmountUsed' => 0.0,
                'balanceBefore' => $balance,
                'balanceAfter' => $newBalance,
                'referenceType' => 'Bet',
                'referenceId' => SqlRepository::id($betId),
                'reason' => 'MANUAL_BET_PLACED',
                'description' => 'MANUAL bet placed by admin (write-in): ' . mb_substr($description, 0, 120),
                'createdBy' => (string) ($actor['id'] ?? ''),
                'createdByRole' => (string) ($actor['role'] ?? 'admin'),
                'createdByUsername' => (string) ($actor['username'] ?? ''),
                'ipAddress' => $ipAddress,
                'userAgent' => $userAgent,
                'createdAt' => $now,
                'updatedAt' => $now,
            ]);

            $db->commit();
        } catch (Throwable $e) {
            try { $db->rollback(); } catch (Throwable) {}
            $failRequest($db, $requestDocId, $e->getMessage());
            throw $e;
        }

        $db->updateOne('betrequests', ['id' => SqlRepository::id($requestDocId)], [
            'status' => 'completed',
            'betIds' => [$betId],
            'ticketId' => $ticketId,
            'responseBalance' => $newBalance,
            'responsePendingBalance' => $newPending,
            'updatedAt' => SqlRepository::nowUtc(),
        ]);

        // Post-commit best-effort cache invalidation (mirrors placeBet); a
        // failure here can never roll back money.
        if (function_exists('apcu_delete')) {
            @apcu_delete('ua:users:' . $userId);
        }
        if (class_exists('QueryCache')) {
            try {
                QueryCache::getInstance()->forgetPattern('bets:' . $userId . ':*');
            } catch (Throwable) {
                // best-effort
            }
        }

        return [
            'ok' => true,
            'status' => 201,
            'betId' => (string) $betId,
            'riskAmount' => $stake,
            'oddsAmerican' => $american,
            'potentialPayout' => $potentialPayout,
            'toWin' => $toWin,
            'description' => $description,
            'balance' => $newBalance,
            'pendingBalance' => $newPending,
        ];
    }

    /**
     * Player loss limits (daily/weekly/monthly net loss) — manual bets count
     * exactly like self-placed ones. COPY of BetsController::checkLossLimits
     * (private there; CasinoController carries the same copy) — keep all
     * three in sync.
     *
     * @param array<string,mixed> $user
     * @param array<string,mixed> $limits
     */
    private static function lossLimitError(SqlRepository $db, array $user, array $limits, float $wagerAmount): ?string
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
            $bets = $db->findMany('bets', [
                'userId' => SqlRepository::id((string) $user['id']),
                'createdAt' => ['$gte' => $since],
            ]);

            $totalWagered = 0.0;
            $totalWon = 0.0;
            foreach ($bets as $bet) {
                $totalWagered += (float) ($bet['amount'] ?? 0);
                if (($bet['status'] ?? '') === 'won') {
                    $totalWon += (float) ($bet['potentialPayout'] ?? 0);
                }
            }

            $netLoss = $totalWagered - $totalWon;
            if (($netLoss + $wagerAmount) > $limit) {
                return "This bet would exceed the player's {$label} loss limit of \${$limit}. Current net loss: \${$netLoss}.";
            }
        }

        return null;
    }
}
