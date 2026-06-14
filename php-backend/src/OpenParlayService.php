<?php

declare(strict_types=1);

/**
 * Open Parlay ("open play") support.
 *
 * An open parlay is a plain `type='parlay'` ticket that a player commits
 * with a stake and one-or-more locked legs, then adds more legs to before
 * any leg's game starts. The stake is reserved in `pendingBalance` at OPEN
 * exactly like a normal parlay — no new money path — and the ticket sits in
 * `status='open'` until its earliest leg is about to start.
 *
 * Money + integrity rules enforced here (see also BetsController create /
 * add-leg endpoints which call these helpers):
 *
 *   - Anti-past-posting (M1): a leg may only be added while its own event
 *     start (`matchSnapshot.startTime`) is strictly in the future. This is a
 *     HARD server-side time check, independent of the `isBettable` flag
 *     (which can fail-open during a status-sync gap). assertLegStartsInFuture
 *     is the single gate; the controller calls it for every initial and
 *     added leg.
 *
 *   - Triple-layer skip: (1) the settlement grader refuses to grade any leg
 *     on an 'open' ticket (BetSettlementService::settleMatch guards on
 *     status==='pending'); (2) the finalizer flips open→pending at closesAt;
 *     (3) even if the finalizer never ran, an 'open' ticket is never graded.
 *
 *   - Incomplete-at-close void (M2): at close, if the ticket never reached
 *     the minimum leg count (2), the finalizer VOIDS + REFUNDS the whole
 *     ticket BEFORE it can enter 'pending' / settlement, so the grader never
 *     sees a 1-leg open parlay. A valid >=2-leg ticket flips to 'pending'
 *     and from then on follows the existing settlement / reduce-on-void path
 *     unchanged.
 *
 *   - Payout recompute + cap (M3/M4): payout is recomputed authoritatively
 *     from the locked legs on every add (under the caller's FOR UPDATE lock)
 *     and the 3xmaxBet parlay payout cap is re-applied each time. Risk is
 *     fixed at OPEN and never changes. acceptedPayout pinning is disabled for
 *     open tickets (the controller never sets it), so the recompute is always
 *     authoritative.
 *
 *   - Freeplay is disallowed on open parlays for v1 (Addition 1).
 *   - Only plain parlays are eligible — RR/teaser/if_bet/reverse rejected (M7).
 */
final class OpenParlayService
{
    /** A ticket must reach this many legs by close or it's voided + refunded. */
    public const MIN_LEGS_TO_FINALIZE = 2;

    /** Hard ceiling on legs, mirrors the parlay rule's maxLegs default. */
    public const MAX_LEGS = 12;

    private const DEFAULT_MAX_OPEN_PER_USER = 3;

    public static function isEnabled(): bool
    {
        return (string) Env::get('OPEN_PARLAY_ENABLED', '1') !== '0';
    }

    /** Per-player cap on simultaneously-open parlays (M6). */
    public static function maxOpenPerUser(): int
    {
        $raw = (int) Env::get('OPEN_PARLAY_MAX_OPEN_PER_USER', (string) self::DEFAULT_MAX_OPEN_PER_USER);
        return $raw > 0 ? $raw : self::DEFAULT_MAX_OPEN_PER_USER;
    }

    /**
     * HARD anti-past-posting gate. A leg may only join an open parlay while
     * its own event start is strictly in the future. Independent of
     * isBettable so a fail-open status-sync gap can't let a player add a leg
     * to a game already in progress.
     *
     * @param array<string, mixed> $matchSnapshot the leg's matchSnapshot
     *                                             (validateSelection returns
     *                                             the full match doc, which
     *                                             carries `startTime`)
     */
    public static function assertLegStartsInFuture(array $matchSnapshot, ?int $nowTs = null): void
    {
        $now = $nowTs ?? time();
        $startRaw = (string) ($matchSnapshot['startTime'] ?? '');
        $startTs = $startRaw !== '' ? strtotime($startRaw) : false;
        if ($startTs === false || $startTs <= 0) {
            throw new ApiException('Cannot determine this game\'s start time, so it can\'t be added to an open parlay.', 409, [
                'code' => 'OPEN_PARLAY_NO_START_TIME',
            ]);
        }
        if ($startTs <= $now) {
            throw new ApiException('This game has already started and cannot be added to an open parlay.', 409, [
                'code' => 'OPEN_PARLAY_LEG_STARTED',
            ]);
        }
    }

    /**
     * Earliest leg start across a set of legs, as an ISO-8601 string, or null
     * when no leg carries a parseable start time. This becomes the ticket's
     * `closesAt` — the moment the finalizer flips open→pending (or voids).
     *
     * @param array<int, array<string, mixed>> $selections each may carry a
     *                                                      `matchSnapshot` with
     *                                                      a `startTime`
     */
    public static function earliestStart(array $selections): ?string
    {
        $minTs = null;
        foreach ($selections as $sel) {
            if (!is_array($sel)) {
                continue;
            }
            $snapshot = is_array($sel['matchSnapshot'] ?? null) ? $sel['matchSnapshot'] : [];
            $startRaw = (string) ($snapshot['startTime'] ?? '');
            if ($startRaw === '') {
                continue;
            }
            $ts = strtotime($startRaw);
            if ($ts === false || $ts <= 0) {
                continue;
            }
            if ($minTs === null || $ts < $minTs) {
                $minTs = $ts;
            }
        }
        return $minTs === null ? null : gmdate(DATE_ATOM, $minTs);
    }

    /**
     * Authoritatively recompute an open parlay's payout from its locked legs
     * and re-apply the 3xmaxBet parlay payout cap. Risk is fixed; only the
     * payout side moves as legs are added.
     *
     * @param array<int, array<string, mixed>> $legs locked legs (selectionForInsert shape)
     * @param array<string, mixed>             $modeRule the parlay mode rule
     * @return array{potentialPayout: float, combinedOdds: float, winAmount: float, capped: bool}
     */
    public static function recomputePayout(float $unitStake, array $legs, array $modeRule, float $maxBet): array
    {
        $risk = $unitStake; // a parlay risks exactly its unit stake
        $payout = SportsbookBetSupport::calculatePotentialPayout('parlay', $unitStake, $legs, $modeRule);
        $winAmount = max(0.0, $payout - $risk);
        $capped = false;
        if ($maxBet > 0) {
            $cap = $maxBet * 3.0;
            if ($winAmount > $cap) {
                $payout = $risk + $cap;
                $winAmount = $cap;
                $capped = true;
            }
        }
        return [
            'potentialPayout' => (float) $payout,
            'combinedOdds' => SportsbookBetSupport::combinedOdds($risk, $payout),
            'winAmount' => (float) $winAmount,
            'capped' => $capped,
        ];
    }

    /**
     * Finalizer (cron/worker). Find every open parlay whose closesAt has
     * passed and either:
     *   - VOID + REFUND the whole ticket when it never reached MIN_LEGS, or
     *   - flip it open→pending so the normal settlement pipeline can grade it.
     *
     * Each ticket is processed inside its own row-locked transaction; the
     * status guard (`WHERE status='open'` re-checked under FOR UPDATE) makes
     * a concurrent finalizer tick a no-op the second time, so this is safe to
     * run from both the worker and a cron safety-net.
     *
     * Freeplay is disallowed on open parlays, so the void refund only ever
     * touches the real-money portion (riskAmount). Credit accounts held the
     * stake in pendingBalance only — freeing pending alone restores them;
     * cash accounts also get the stake back in `balance`.
     *
     * @return array{checked:int, flipped:int, voided:int, errors:int, ticketIds:array<int,string>}
     */
    public static function finalizeDueTickets(SqlRepository $db, int $limit = 250, string $finalizedBy = 'open-parlay-finalizer', ?int $nowTs = null): array
    {
        $now = $nowTs ?? time();
        $results = ['checked' => 0, 'flipped' => 0, 'voided' => 0, 'errors' => 0, 'ticketIds' => []];

        $candidates = $db->findMany('bets', [
            'type' => 'parlay',
            'status' => 'open',
        ], [
            'limit' => $limit,
            'projection' => ['id' => 1, 'closesAt' => 1],
        ]);

        foreach ($candidates as $candidate) {
            if (!is_array($candidate)) {
                continue;
            }
            $closesAtRaw = (string) ($candidate['closesAt'] ?? '');
            $closesTs = $closesAtRaw !== '' ? strtotime($closesAtRaw) : false;
            // No closesAt (defensive) → treat as due so it can't get stuck open
            // forever. A real ticket always has one set at create time.
            if ($closesTs !== false && $closesTs > $now) {
                continue;
            }
            $betId = (string) ($candidate['id'] ?? '');
            if ($betId === '' || preg_match('/^[a-f0-9]{24}$/i', $betId) !== 1) {
                continue;
            }
            $results['checked']++;
            try {
                $outcome = self::finalizeOne($db, $betId, $finalizedBy);
                if ($outcome === 'void') {
                    $results['voided']++;
                    $results['ticketIds'][] = $betId;
                } elseif ($outcome === 'pending') {
                    $results['flipped']++;
                    $results['ticketIds'][] = $betId;
                }
            } catch (Throwable $e) {
                $results['errors']++;
                Logger::warning('open-parlay finalize failed', [
                    'betId' => $betId,
                    'error' => $e->getMessage(),
                ], 'sportsbook');
            }
        }

        return $results;
    }

    /**
     * Finalize a single open parlay under a row lock. Returns 'void',
     * 'pending', or 'skip' (already finalized by a concurrent tick).
     */
    private static function finalizeOne(SqlRepository $db, string $betId, string $finalizedBy): string
    {
        $db->beginTransaction();
        try {
            $bet = $db->findOneForUpdate('bets', ['id' => SqlRepository::id($betId)]);
            // Re-check under the lock: a concurrent finalizer (or a manual
            // admin action) may have already flipped/voided this ticket.
            if ($bet === null || (string) ($bet['status'] ?? '') !== 'open' || (string) ($bet['type'] ?? '') !== 'parlay') {
                $db->rollback();
                return 'skip';
            }

            $now = SqlRepository::nowUtc();
            $legs = is_array($bet['selections'] ?? null) ? array_values($bet['selections']) : [];
            $legCount = count($legs);

            if ($legCount >= self::MIN_LEGS_TO_FINALIZE) {
                // Enough legs — hand the ticket to the normal settlement
                // pipeline. From here it's an ordinary pending parlay; the
                // existing reduce-on-void / partial-void behaviour applies.
                $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                    'status' => 'pending',
                    'finalizedAt' => $now,
                    'finalizedBy' => $finalizedBy,
                    'updatedAt' => $now,
                ]);
                $db->commit();
                return 'pending';
            }

            // Incomplete at close — VOID + REFUND the whole ticket before it
            // could ever enter settlement (M2). Freeplay is disallowed on
            // open parlays, so the entire risk is real money.
            $userId = (string) ($bet['userId'] ?? '');
            if ($userId === '' || preg_match('/^[a-f0-9]{24}$/i', $userId) !== 1) {
                $db->rollback();
                return 'skip';
            }
            $user = $db->findOneForUpdate('users', ['id' => SqlRepository::id($userId)]);
            if ($user === null) {
                $db->rollback();
                return 'skip';
            }

            $riskAmount = self::num($bet['riskAmount'] ?? ($bet['amount'] ?? 0));
            $balance = self::num($user['balance'] ?? 0);
            $pendingBalance = self::num($user['pendingBalance'] ?? 0);
            $creditLimit = self::num($user['creditLimit'] ?? 0);
            $role = strtolower((string) ($user['role'] ?? 'user'));
            $isCreditAccount = $riskAmount > 0 && $role === 'user' && $creditLimit > 0;

            $newPending = max(0.0, $pendingBalance - $riskAmount);
            $balanceRefund = $isCreditAccount ? 0.0 : $riskAmount;

            $userUpdate = [
                'pendingBalance' => $newPending,
                'updatedAt' => $now,
            ];
            if ($balanceRefund > 0) {
                $userUpdate['balance'] = (float) round($balance + $balanceRefund);
            }
            $db->updateOne('users', ['id' => SqlRepository::id($userId)], $userUpdate);

            $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
                'status' => 'void',
                'result' => 'void',
                'settledAt' => $now,
                'settledBy' => $finalizedBy,
                'finalizedAt' => $now,
                'finalizedBy' => $finalizedBy,
                'voidReason' => 'OPEN_PARLAY_INCOMPLETE',
                'updatedAt' => $now,
            ]);

            // Mark every leg row void too so the My Bets per-leg view is
            // honest (updateMany — a partial open parlay can still hold one
            // leg row).
            $db->updateMany('betselections', ['betId' => $betId], [
                'status' => 'void',
                'gradeReason' => 'Refund — open parlay never reached 2 legs',
                'updatedAt' => $now,
            ]);

            $db->insertOne('transactions', [
                'userId' => $userId,
                'amount' => $riskAmount,
                'type' => 'bet_void',
                'status' => 'completed',
                'isFreeplay' => false,
                'freeplayAmountUsed' => 0.0,
                'balanceBefore' => $balance,
                'balanceAfter' => $balanceRefund > 0 ? (float) round($balance + $balanceRefund) : $balance,
                'referenceType' => 'Bet',
                'referenceId' => SqlRepository::id($betId),
                'reason' => 'OPEN_PARLAY_VOID',
                'description' => 'PARLAY open play voided - never reached 2 legs, wager refunded',
                'createdAt' => $now,
                'updatedAt' => $now,
            ]);

            $db->commit();
            return 'void';
        } catch (Throwable $e) {
            $db->rollback();
            throw $e;
        }
    }

    /**
     * Numeric coercion mirroring the money parsing used elsewhere — handles
     * {$numberDecimal}/{value} JSON wrappers and stringified decimals so the
     * finalizer reads DECIMAL columns without floating-point surprises.
     */
    private static function num(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        if (is_string($value) && $value !== '') {
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
        return 0.0;
    }
}
