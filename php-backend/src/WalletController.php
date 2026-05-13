<?php

declare(strict_types=1);


final class WalletController
{
    private SqlRepository $db;
    private string $jwtSecret;

    public function __construct(SqlRepository $db, string $jwtSecret)
    {
        $this->db = $db;
        $this->jwtSecret = $jwtSecret;
    }

    /**
     * Resolve the player's display timezone for day-bucketing in the
     * figures + transactions reports. Resolution order:
     *   1. Client-supplied `tz` query param — the browser's
     *      Intl-detected zone, which reflects where the user actually
     *      is right now even if their saved profile is stale.
     *   2. The saved `settings.timezone` on the user record.
     *   3. The hardcoded fallback (America/New_York), matching the
     *      frontend's DEFAULT_SITE_TZ so an unset profile lands in
     *      the same zone on both sides.
     *
     * Each candidate is validated against the same allowlist the
     * AuthController accepts when saving the profile preference, so a
     * tampered or typo'd query param can't drift the report into a
     * nonsense zone and the user can't be hit with an exception from
     * `new DateTimeZone(...)`.
     */
    private static function resolveReportTimezone(array $actor): DateTimeZone
    {
        $allowed = [
            'America/New_York', 'America/Chicago', 'America/Denver',
            'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage',
            'Pacific/Honolulu', 'UTC',
        ];
        $candidates = [];
        $queryTz = isset($_GET['tz']) ? trim((string) $_GET['tz']) : '';
        if ($queryTz !== '') $candidates[] = $queryTz;
        $settingsTz = is_array($actor['settings'] ?? null)
            && is_string($actor['settings']['timezone'] ?? null)
            ? trim((string) $actor['settings']['timezone'])
            : '';
        if ($settingsTz !== '') $candidates[] = $settingsTz;
        $candidates[] = 'America/New_York';

        foreach ($candidates as $name) {
            if (!in_array($name, $allowed, true)) continue;
            try {
                return new DateTimeZone($name);
            } catch (Throwable) {
                continue;
            }
        }
        // Allowlist guarantees this is reachable; defensive only.
        return new DateTimeZone('America/New_York');
    }

    public function handle(string $method, string $path): bool
    {
        if (($path === '/api/wallet/balance' || $path === '/api/wallet') && $method === 'GET') {
            $this->getBalance();
            return true;
        }
        if ($path === '/api/wallet/transactions' && $method === 'GET') {
            $this->getTransactions();
            return true;
        }
        if ($path === '/api/user/transactions' && $method === 'GET') {
            $this->getUserTransactions();
            return true;
        }
        if ($path === '/api/user/figures' && $method === 'GET') {
            $this->getFigures();
            return true;
        }
        if ($path === '/api/wallet/request-deposit' && $method === 'POST') {
            $this->requestDeposit();
            return true;
        }
        if ($path === '/api/wallet/request-withdrawal' && $method === 'POST') {
            $this->requestWithdrawal();
            return true;
        }
        if ($path === '/api/wallet/deposit' && $method === 'POST') {
            $this->depositDisabled();
            return true;
        }

        return false;
    }

    private function getBalance(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $user = $this->db->findOne('users', ['id' => SqlRepository::id((string) $actor['id'])]);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            $balance = (float) round($this->num($user['balance'] ?? 0));
            $pendingBalance = (float) round($this->num($user['pendingBalance'] ?? 0));
            $availableBalance = max(0, $balance - $pendingBalance);
            $limits = is_array($user['gamblingLimits'] ?? null) ? $user['gamblingLimits'] : [];
            $accountMinBet = isset($user['minBet']) && is_numeric($user['minBet']) && (float) $user['minBet'] > 0
                ? (float) round((float) $user['minBet'])
                : null;
            $accountMaxBet = isset($user['maxBet']) && is_numeric($user['maxBet']) && (float) $user['maxBet'] > 0
                ? (float) round((float) $user['maxBet'])
                : null;

            Response::json([
                'balance' => $balance,
                'pendingBalance' => $pendingBalance,
                'availableBalance' => $availableBalance,
                'minBet' => $accountMinBet,
                'maxBet' => $accountMaxBet,
                'totalWinnings' => (float) round($this->num($user['totalWinnings'] ?? 0)),
                'gamblingLimits' => $limits,
                'remainingLimits' => $this->computeRemainingLimits($user, $limits),
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function getTransactions(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $limitRaw = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
            $limit = min(200, max(1, $limitRaw > 0 ? $limitRaw : 50));
            $type = isset($_GET['type']) ? strtolower(trim((string) $_GET['type'])) : '';
            $status = isset($_GET['status']) ? strtolower(trim((string) $_GET['status'])) : '';

            $query = ['userId' => SqlRepository::id((string) $actor['id'])];
            if ($type !== '') {
                $query['type'] = $type;
            }
            if ($status !== '') {
                $query['status'] = $status;
            }

            $transactions = $this->db->findMany('transactions', $query, [
                'sort' => ['createdAt' => -1],
                'limit' => $limit,
            ]);

            $formatted = array_map(function (array $tx): array {
                return [
                    'id' => $tx['id'] ?? null,
                    'amount' => $this->num($tx['amount'] ?? 0),
                    'type' => $tx['type'] ?? null,
                    'entrySide' => $tx['entrySide'] ?? null,
                    'status' => $tx['status'] ?? null,
                    'description' => $tx['description'] ?? null,
                    'reason' => $tx['reason'] ?? null,
                    'sourceType' => $tx['sourceType'] ?? null,
                    'referenceType' => $tx['referenceType'] ?? null,
                    'referenceId' => $tx['referenceId'] ?? null,
                    'balanceBefore' => array_key_exists('balanceBefore', $tx) && $tx['balanceBefore'] !== null ? $this->num($tx['balanceBefore']) : null,
                    'balanceAfter' => array_key_exists('balanceAfter', $tx) && $tx['balanceAfter'] !== null ? $this->num($tx['balanceAfter']) : null,
                    'createdAt' => $tx['createdAt'] ?? null,
                ];
            }, $transactions);

            Response::json(['transactions' => $formatted]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Player-facing balance change feed: paginated, filtered to types that
     * actually map to one of the human labels rendered on the My Bets
     * Transactions tab. Bet placements with no balance impact (credit
     * accounts) are kept so the player sees their wager activity even
     * though the dollar delta is $0.
     */
    private function getUserTransactions(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $limitRaw = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
            $limit = min(200, max(1, $limitRaw > 0 ? $limitRaw : 50));
            $offsetRaw = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
            $offset = max(0, $offsetRaw);

            // Tuesday-anchored accounting week (matches /api/user/figures)
            // so the Transactions tab and Figures tab show the same window
            // when the player picks a given week. Anchored in the
            // player's display timezone — running the math in UTC made
            // a Sat-evening CT bet show up in Sunday's row because the
            // boundary crossed at 00:00 UTC, not 00:00 local.
            $weekOffset = isset($_GET['week_offset']) ? max(0, min(11, (int) $_GET['week_offset'])) : 0;
            $tz = self::resolveReportTimezone($actor);
            $today = new DateTimeImmutable('today', $tz);
            $todayDow = (int) $today->format('N');
            $daysFromTue = ($todayDow - 2 + 7) % 7;
            $weekStart = $today->modify('-' . ($daysFromTue + ($weekOffset * 7)) . ' days');
            $weekEnd = $weekStart->modify('+7 days'); // exclusive, local time
            $utc = new DateTimeZone('UTC');
            $weekStartIso = $weekStart->setTimezone($utc)->format('Y-m-d\TH:i:s\Z');
            $weekEndIso = $weekEnd->setTimezone($utc)->format('Y-m-d\TH:i:s\Z');

            // Pull one extra row past `limit` so the client can detect that
            // a "Load More" page exists without a separate count query.
            $userId = SqlRepository::id((string) $actor['id']);
            $rows = $this->db->findMany('transactions', [
                'userId' => $userId,
                'type' => ['$in' => [
                    'bet_placed', 'fp_bet_placed',
                    'bet_won', 'fp_bet_won',
                    'bet_lost', 'fp_bet_lost',
                    'bet_void', 'fp_bet_void',
                    'adjustment',
                    'fp_deposit',
                    'casino_bet_debit', 'casino_bet_credit',
                    'bet_placed_admin', 'bet_void_admin', 'fp_bet_void_admin',
                ]],
                'createdAt' => ['$gte' => $weekStartIso, '$lt' => $weekEndIso],
            ], [
                'sort' => ['createdAt' => -1],
                'limit' => $limit + 1,
                'skip' => $offset,
            ]);

            $hasMore = count($rows) > $limit;
            if ($hasMore) {
                $rows = array_slice($rows, 0, $limit);
            }

            $formatted = array_map(function (array $tx): array {
                $type = (string) ($tx['type'] ?? '');
                $balanceBefore = isset($tx['balanceBefore']) ? $this->num($tx['balanceBefore']) : null;
                $balanceAfter = isset($tx['balanceAfter']) ? $this->num($tx['balanceAfter']) : null;
                $delta = ($balanceBefore !== null && $balanceAfter !== null)
                    ? (float) round($balanceAfter - $balanceBefore)
                    : null;
                return [
                    'id' => $tx['id'] ?? null,
                    'type' => $type,
                    'label' => self::transactionLabel($type),
                    'amount' => $this->num($tx['amount'] ?? 0),
                    'delta' => $delta,
                    'balanceAfter' => $balanceAfter,
                    'balanceBefore' => $balanceBefore,
                    'description' => $tx['description'] ?? null,
                    'isFreeplay' => !empty($tx['isFreeplay']),
                    'createdAt' => $tx['createdAt'] ?? null,
                ];
            }, $rows);

            Response::json([
                'transactions' => $formatted,
                'hasMore' => $hasMore,
                'limit' => $limit,
                'offset' => $offset,
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Weekly P/L breakdown for the My Bets → Figures tab.
     *
     * Accounting week is Tuesday → Monday (matches the reference book
     * "bettorjuice365" UI the player is comparing against). week_offset=0
     * is the Tue→Mon window containing today; 1 = previous, up to 11.
     *
     * Per-day P/L is sourced from the `bets` table by `settledAt`:
     *   • won → +(potentialPayout − riskAmount)
     *   • lost → −riskAmount
     *   • void/push → 0
     * This is independent of cash vs credit wallet bookkeeping — the bet
     * outcome is the same either way and that's what the player wants to
     * see on the report.
     */
    private function getFigures(): void
    {
        try {
            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $weekOffset = isset($_GET['week_offset']) ? max(0, min(11, (int) $_GET['week_offset'])) : 0;

            // Resolve the player's display timezone for day-bucketing.
            // Prefers the client-supplied `tz` query param (browser's
            // detected zone) over the saved profile setting so a player
            // who never set their preference still sees their local day
            // even though their settings.timezone defaults to ET. See
            // resolveReportTimezone for the full resolution order.
            $tz = self::resolveReportTimezone($actor);

            // Tuesday-anchored week. PHP's 'N' returns 1=Mon..7=Sun; we want
            // Tuesday as day 1. So daysFromTue = (N - 2 + 7) % 7.
            $today = new DateTimeImmutable('today', $tz);
            $todayDow = (int) $today->format('N');
            $daysFromTue = ($todayDow - 2 + 7) % 7;
            $weekStart = $today->modify('-' . ($daysFromTue + ($weekOffset * 7)) . ' days');
            $weekEnd = $weekStart->modify('+7 days'); // exclusive, local time

            // DB stores `settledAt` as UTC ISO strings, so convert the
            // local-tz boundaries to UTC for the query and the per-day
            // comparisons below. Per-day boundaries are kept as a
            // pre-built array so DST transitions in the middle of a
            // week don't skew bets at the boundary by an hour.
            $utc = new DateTimeZone('UTC');
            $weekStartUtc = $weekStart->setTimezone($utc);
            $weekEndUtc = $weekEnd->setTimezone($utc);
            $weekStartIso = $weekStartUtc->format('Y-m-d\TH:i:s\Z');
            $weekEndIso = $weekEndUtc->format('Y-m-d\TH:i:s\Z');

            // Per-day UTC timestamp ranges, one entry per index 0..6
            // (Tue..Mon). Each entry is [startTs, endTs) — DST-safe
            // because we let the DateTime arithmetic in the local tz
            // do the +1-day work before flattening to UTC.
            $dayBoundsTs = [];
            for ($i = 0; $i < 7; $i++) {
                $startLocal = $weekStart->modify('+' . $i . ' days');
                $endLocal = $weekStart->modify('+' . ($i + 1) . ' days');
                $dayBoundsTs[] = [
                    $startLocal->setTimezone($utc)->getTimestamp(),
                    $endLocal->setTimezone($utc)->getTimestamp(),
                ];
            }
            $assignDayIndex = static function (int $ts) use ($dayBoundsTs): int {
                foreach ($dayBoundsTs as $i => [$startTs, $endTs]) {
                    if ($ts >= $startTs && $ts < $endTs) return $i;
                }
                return -1;
            };

            $userId = SqlRepository::id((string) $actor['id']);

            // Transaction-driven weekly figures. Every real-cash movement
            // is read directly from the ledger and bucketed by the day its
            // transaction was created (player's local tz, DST-safe via the
            // pre-built $dayBoundsTs map). This guarantees a property the
            // old bet-status-driven math broke:
            //
            //   carryForward + weekTotal + transactionsTotal === endBalance
            //   endBalance === next_week.carryForward
            //
            // The earlier algorithm only counted profit on won bets and
            // cash-risk on lost bets, treating voids and casino activity
            // as zero. A void of a pre-week pending bet refunds the
            // stake — `balance` goes up — but the old math recorded $0
            // for that day, leaving a discrepancy between the displayed
            // end balance and the actual ledger snapshot. Casino bets
            // were missed entirely. Both are now captured.
            //
            // FP rows (fp_*, isFreeplay=true, referenceType=FreePlayBonus)
            // snapshot the freeplay pool, not real cash, so they're
            // skipped — same gate as before.
            $weekTx = $this->db->findMany('transactions', [
                'userId' => $userId,
                'status' => 'completed',
                'createdAt' => ['$gte' => $weekStartIso, '$lt' => $weekEndIso],
            ], [
                'sort' => ['createdAt' => 1],
                'projection' => [
                    'amount' => 1, 'type' => 1,
                    'balanceBefore' => 1, 'balanceAfter' => 1,
                    'createdAt' => 1,
                    'isFreeplay' => 1, 'referenceType' => 1,
                ],
            ]);

            // Type sets — Daily P/L absorbs bet + casino movements (the
            // player's gambling P/L). Deposits / Withdrawals absorbs
            // external cash flow only. Anything else (legacy / unknown
            // types) falls into the Deposits bucket so the math still
            // reconciles even if a future migration adds a new type
            // before this code is updated.
            $BET_CASINO_TYPES = [
                'bet_placed', 'bet_placed_admin',
                'bet_won', 'bet_refund',
                'bet_lost',
                'bet_void', 'bet_void_admin',
                'casino_bet_debit', 'casino_bet_credit',
            ];
            $CASH_MOVEMENT_TYPES = [
                'deposit', 'withdrawal', 'adjustment',
                'credit_adj', 'debit_adj', 'credit', 'debit',
                'promotional_credit', 'promotional_debit',
            ];

            // Credit/debit sign map — used as a fallback for legacy rows
            // missing balanceBefore/balanceAfter snapshots (pre-BalanceUpdateService
            // rows or any imported ledger). Modern rows always have both
            // snapshots so the delta path takes precedence; this map only
            // fires on the rare legacy case.
            $CREDIT_TYPES = [
                'deposit', 'bet_won', 'bet_refund',
                'bet_void', 'bet_void_admin',
                'casino_bet_credit',
                'credit', 'credit_adj', 'promotional_credit',
            ];
            $DEBIT_TYPES = [
                'withdrawal', 'bet_placed', 'bet_placed_admin',
                'bet_lost', 'casino_bet_debit',
                'debit', 'debit_adj', 'promotional_debit',
            ];

            $dailyPL = array_fill(0, 7, 0.0);
            $transactionsTotal = 0.0;
            // Running balance starts at carryForward and gets nudged by
            // every counted in-week row. Whenever a row has a real
            // balanceAfter snapshot we *re-anchor* to it (canonical truth
            // from the ledger); otherwise we just add the signed-amount
            // estimate. This guarantees:
            //   - With all-modern rows: runningBalance == lastInWeekBalanceAfter
            //     == carryForward + weekTotal + transactionsTotal.
            //   - With mixed legacy/modern: small drift from missing snapshots
            //     is bounded and the on-screen arithmetic still adds up.
            // (carryForward is computed below; we patch it in after.)
            $runningBalance = null;
            foreach ($weekTx as $tx) {
                if (self::isFreeplayLedgerRow($tx)) continue;
                $createdAt = (string) ($tx['createdAt'] ?? '');
                if ($createdAt === '') continue;
                try {
                    $dt = new DateTimeImmutable($createdAt);
                } catch (Throwable) {
                    continue;
                }
                $diffDays = $assignDayIndex($dt->getTimestamp());
                if ($diffDays < 0 || $diffDays > 6) continue;

                $type = strtolower((string) ($tx['type'] ?? ''));
                $balanceBefore = isset($tx['balanceBefore']) ? $this->num($tx['balanceBefore']) : null;
                $balanceAfter = isset($tx['balanceAfter']) ? $this->num($tx['balanceAfter']) : null;

                // Ground truth: balance delta when both snapshots are
                // present (every modern row). Fall back to signed-amount
                // for legacy rows missing snapshots so they still appear
                // on the report, keeping the display arithmetic consistent.
                if ($balanceBefore !== null && $balanceAfter !== null) {
                    $delta = $balanceAfter - $balanceBefore;
                    $runningBalance = $balanceAfter; // anchor
                } else {
                    $amount = $this->num($tx['amount'] ?? 0);
                    if (in_array($type, $CREDIT_TYPES, true)) {
                        $delta = $amount;
                    } elseif (in_array($type, $DEBIT_TYPES, true)) {
                        $delta = -$amount;
                    } else {
                        continue;
                    }
                    // No anchor available; nudge the running balance by
                    // our best estimate.
                    $runningBalance = ($runningBalance ?? 0.0) + $delta;
                }

                if (in_array($type, $BET_CASINO_TYPES, true)) {
                    $dailyPL[$diffDays] += $delta;
                } else {
                    // Cash movement types AND any unmapped type → Deposits row.
                    $transactionsTotal += $delta;
                }
            }

            // Carry forward = balanceAfter of the most-recent transaction
            // strictly before week start whose balance snapshot reflects
            // REAL CASH (not the FP pool). Default to 0 if no history.
            // Walk a small window so we skip legacy rows where balanceAfter
            // wasn't populated yet AND so we skip FP-only snapshots that
            // would otherwise impersonate a cash balance.
            $priorTx = $this->db->findMany('transactions', [
                'userId' => $userId,
                'createdAt' => ['$lt' => $weekStartIso],
            ], [
                'sort' => ['createdAt' => -1],
                'limit' => 50,
                'projection' => [
                    'balanceAfter' => 1, 'createdAt' => 1, 'type' => 1,
                    'isFreeplay' => 1, 'referenceType' => 1,
                ],
            ]);
            $carryForward = 0.0;
            foreach ($priorTx as $row) {
                if (self::isFreeplayLedgerRow($row)) continue;
                if (isset($row['balanceAfter']) && $row['balanceAfter'] !== null) {
                    $carryForward = $this->num($row['balanceAfter']);
                    break;
                }
            }

            $weekTotal = array_sum($dailyPL);
            // endBalance = runningBalance anchored to the latest balanceAfter
            // ledger snapshot, or carryForward when no in-week activity. For
            // all-modern rows this is exactly the last balanceAfter (and
            // equals next_week.carryForward since both pull the same value
            // from the same row). For mixed legacy/modern rows the anchor
            // re-syncs on every snapshot row, so drift is bounded to the
            // tail of unanchored legacy rows after the last snapshot.
            $endBalance = $runningBalance ?? $carryForward;

            // Day labels Tue, Wed, ..., Mon with their date strings.
            // startUtc / endUtc are the exact half-open UTC bounds used
            // above to bucket the bets — the frontend must use these same
            // values when filtering the drill-down list so it matches the
            // P/L total shown in the row (a UTC-midnight boundary is wrong
            // for players whose local timezone is behind UTC).
            $dayNames = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];
            $days = [];
            for ($i = 0; $i < 7; $i++) {
                $d = $weekStart->modify('+' . $i . ' days');
                $days[] = [
                    'label' => $dayNames[$i],
                    'date' => $d->format('n/j'),
                    'pl' => (float) round($dailyPL[$i]),
                    'startUtc' => (new DateTimeImmutable('@' . $dayBoundsTs[$i][0]))->format('Y-m-d\TH:i:s\Z'),
                    'endUtc' => (new DateTimeImmutable('@' . $dayBoundsTs[$i][1]))->format('Y-m-d\TH:i:s\Z'),
                ];
            }

            Response::json([
                'weekOffset' => $weekOffset,
                'weekStart' => $weekStart->format('Y-m-d'),
                'weekEnd' => $weekEnd->modify('-1 day')->format('Y-m-d'),
                'carryForward' => (float) round($carryForward),
                'days' => $days,
                'weekTotal' => (float) round($weekTotal),
                'transactions' => (float) round($transactionsTotal),
                'endBalance' => (float) round($endBalance),
            ]);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * True if this transaction's balanceBefore/balanceAfter snapshot the
     * FREEPLAY pool rather than real cash. Used by the figures math to
     * avoid counting FP grants as deposits — they share the
     * `transactions` collection but never move the player's real balance.
     */
    private static function isFreeplayLedgerRow(array $tx): bool
    {
        $type = strtolower((string) ($tx['type'] ?? ''));
        if ($type === 'fp_deposit') return true;
        if (!empty($tx['isFreeplay'])) return true;
        if (($tx['referenceType'] ?? '') === 'FreePlayBonus') return true;
        return false;
    }

    private static function transactionLabel(string $type): string
    {
        $type = strtolower($type);
        return match ($type) {
            'bet_placed', 'bet_placed_admin' => 'Bet Placed',
            'fp_bet_placed' => 'Freeplay Used',
            'bet_won' => 'Bet Won',
            'fp_bet_won' => 'Freeplay Won',
            'bet_lost' => 'Bet Lost',
            'fp_bet_lost' => 'Freeplay Lost',
            'bet_void', 'bet_void_admin' => 'Bet Refund',
            'fp_bet_void', 'fp_bet_void_admin' => 'Freeplay Refund',
            'adjustment' => 'Credit Adjusted',
            'fp_deposit' => 'Freeplay Grant',
            'deposit' => 'Deposit',
            'withdrawal' => 'Withdrawal',
            'casino_bet_debit' => 'Casino Bet',
            'casino_bet_credit' => 'Casino Win',
            default => ucwords(str_replace('_', ' ', $type)),
        };
    }

    private function requestDeposit(): void
    {
        try {
            if (RateLimiter::fromEnv($this->db, 'deposit_request')) {
                return;
            }

            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $amount = $this->parseAmount($body['amount'] ?? 0);
            $method = strtolower(trim((string) ($body['method'] ?? 'manual')));

            if ($amount < 10 || $amount > 100000) {
                Response::json(['message' => 'Deposit amount must be between $10 and $100,000'], 400);
                return;
            }

            $limits = is_array($actor['gamblingLimits'] ?? null) ? $actor['gamblingLimits'] : [];
            $depositLimitError = $this->checkDepositLimits($actor, $limits, $amount);
            if ($depositLimitError !== null) {
                Response::json(['message' => $depositLimitError], 400);
                return;
            }

            $now = SqlRepository::nowUtc();
            $doc = [
                'userId' => SqlRepository::id((string) $actor['id']),
                'agentId' => $this->toOptionalId($actor['agentId'] ?? null),
                'amount' => $amount,
                'type' => 'deposit',
                'status' => 'pending',
                'reason' => 'USER_DEPOSIT_REQUEST',
                'referenceType' => 'Adjustment',
                'description' => 'Deposit request via ' . $method,
                'createdAt' => $now,
                'updatedAt' => $now,
            ];

            $transactionId = $this->db->insertOne('transactions', $doc);
            Response::json([
                'message' => 'Deposit request submitted successfully. Your agent/admin will review it.',
                'transactionId' => $transactionId,
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function requestWithdrawal(): void
    {
        try {
            if (RateLimiter::fromEnv($this->db, 'withdrawal_request')) {
                return;
            }

            $actor = $this->protect();
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $amount = $this->parseAmount($body['amount'] ?? 0);
            $method = strtolower(trim((string) ($body['method'] ?? 'manual')));

            $user = $this->db->findOne('users', ['id' => SqlRepository::id((string) $actor['id'])]);
            if ($user === null) {
                Response::json(['message' => 'User not found'], 404);
                return;
            }

            if ($amount < 20 || $amount > 100000) {
                Response::json(['message' => 'Withdrawal amount must be between $20 and $100,000'], 400);
                return;
            }

            $balance = $this->num($user['balance'] ?? 0);
            if ($balance < $amount) {
                Response::json(['message' => 'Insufficient balance for withdrawal request'], 400);
                return;
            }

            $now = SqlRepository::nowUtc();
            $doc = [
                'userId' => SqlRepository::id((string) $actor['id']),
                'agentId' => $this->toOptionalId($actor['agentId'] ?? null),
                'amount' => $amount,
                'type' => 'withdrawal',
                'status' => 'pending',
                'reason' => 'USER_WITHDRAWAL_REQUEST',
                'referenceType' => 'Adjustment',
                'description' => 'Withdrawal request via ' . $method,
                'createdAt' => $now,
                'updatedAt' => $now,
            ];

            $transactionId = $this->db->insertOne('transactions', $doc);
            Response::json([
                'message' => 'Withdrawal request submitted successfully. Processing is pending approval.',
                'transactionId' => $transactionId,
            ], 201);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    private function depositDisabled(): void
    {
        Response::json(['message' => 'Deposits are disabled. Customers use credit only.'], 403);
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

        $ipBlockingEnabled = strtolower((string) Env::get('IP_BLOCKING_ENABLED', 'true')) === 'true';
        $allowlist = IpUtils::parseAllowlist((string) Env::get('IP_ALLOWLIST', ''));
        $ip = IpUtils::clientIp();
        if ($ip !== 'unknown' && $ipBlockingEnabled && !isset($allowlist[$ip])) {
            $whitelist = $this->db->findOne('iplogs', ['ip' => $ip, 'status' => 'whitelisted']);
            if ($whitelist === null) {
                $owner = $this->ownerFilter($actor, $ip);
                $existingIp = $this->db->findOne('iplogs', $owner, ['projection' => ['status' => 1]]);
                if ($existingIp !== null && ($existingIp['status'] ?? '') === 'blocked') {
                    Response::json(['message' => 'Access blocked for this IP address'], 403);
                    return null;
                }
            }
        }

        if ($ip !== 'unknown') {
            // Throttle the lastActive update to at most once per 60 s per user-IP pair.
            $ipTrackKey = 'ip_active:' . (string) ($actor['id'] ?? '') . ':' . $ip;
            $alreadyTracked = function_exists('apcu_fetch') && apcu_fetch($ipTrackKey) !== false;
            if (!$alreadyTracked) {
                $ownerModel = IpUtils::ownerModelForRole((string) ($actor['role'] ?? 'user'));
                $this->db->updateOneUpsert('iplogs', $this->ownerFilter($actor, $ip), [
                    'userAgent' => Http::header('user-agent') !== '' ? Http::header('user-agent') : null,
                    'lastActive' => SqlRepository::nowUtc(),
                    'userModel' => $ownerModel,
                    'updatedAt' => SqlRepository::nowUtc(),
                ], [
                    'country' => 'Unknown',
                    'city' => 'Unknown',
                    'status' => 'active',
                    'createdAt' => SqlRepository::nowUtc(),
                ]);
                if (function_exists('apcu_store')) {
                    apcu_store($ipTrackKey, 1, 60);
                }
            }
        }

        return $actor;
    }

    private function ownerFilter(array $actor, string $ip): array
    {
        $ownerModel = IpUtils::ownerModelForRole((string) ($actor['role'] ?? 'user'));

        return [
            'userId' => SqlRepository::id((string) $actor['id']),
            'ip' => $ip,
            '$or' => [['userModel' => $ownerModel], ['userModel' => ['$exists' => false]]],
        ];
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

    private function parseAmount(mixed $value): float
    {
        $amount = is_numeric($value) ? (float) $value : 0.0;
        return (float) round($amount);
    }

    private function toOptionalId(mixed $value): mixed
    {
        if (!is_string($value)) {
            return null;
        }
        if (preg_match('/^[a-f0-9]{24}$/i', $value) !== 1) {
            return null;
        }
        return SqlRepository::id($value);
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

    private function checkDepositLimits(array $user, array $limits, float $depositAmount): ?string
    {
        $checks = [
            ['depositDaily', 'daily', '-1 day'],
            ['depositWeekly', 'weekly', '-7 days'],
            ['depositMonthly', 'monthly', '-30 days'],
        ];

        $userId = SqlRepository::id((string) ($user['id'] ?? ''));
        foreach ($checks as [$key, $label, $interval]) {
            $limit = isset($limits[$key]) && is_numeric($limits[$key]) ? (float) $limits[$key] : 0.0;
            if ($limit <= 0) {
                continue;
            }

            $since = gmdate(DATE_ATOM, strtotime($interval));
            $deposited = $this->sumDepositsSince($userId, $since);
            if (($deposited + $depositAmount) > $limit) {
                return "This deposit would exceed your {$label} deposit limit of \${$limit}. Current deposits: \${$deposited}.";
            }
        }

        return null;
    }

    private function computeRemainingLimits(array $user, array $limits): array
    {
        $userId = SqlRepository::id((string) ($user['id'] ?? ''));
        $remaining = [
            'depositDaily' => null,
            'depositWeekly' => null,
            'depositMonthly' => null,
            'lossDaily' => null,
            'lossWeekly' => null,
            'lossMonthly' => null,
            'sessionTimeMinutes' => null,
        ];

        $depositChecks = [
            ['depositDaily', '-1 day'],
            ['depositWeekly', '-7 days'],
            ['depositMonthly', '-30 days'],
        ];
        foreach ($depositChecks as [$key, $interval]) {
            $limit = isset($limits[$key]) && is_numeric($limits[$key]) ? (float) $limits[$key] : 0.0;
            if ($limit <= 0) {
                continue;
            }
            $since = gmdate(DATE_ATOM, strtotime($interval));
            $used = $this->sumDepositsSince($userId, $since);
            $remaining[$key] = max(0.0, $limit - $used);
        }

        $lossChecks = [
            ['lossDaily', '-1 day'],
            ['lossWeekly', '-7 days'],
            ['lossMonthly', '-30 days'],
        ];
        foreach ($lossChecks as [$key, $interval]) {
            $limit = isset($limits[$key]) && is_numeric($limits[$key]) ? (float) $limits[$key] : 0.0;
            if ($limit <= 0) {
                continue;
            }
            $since = gmdate(DATE_ATOM, strtotime($interval));
            $netLoss = $this->sumNetLossSince($userId, $since);
            $remaining[$key] = max(0.0, $limit - max(0.0, $netLoss));
        }

        if (isset($limits['sessionTimeMinutes']) && is_numeric($limits['sessionTimeMinutes'])) {
            $sessionLimit = (float) $limits['sessionTimeMinutes'];
            if ($sessionLimit > 0) {
                $remaining['sessionTimeMinutes'] = $sessionLimit;
            }
        }

        return $remaining;
    }

    private function sumDepositsSince(string $userId, string $since): float
    {
        $transactions = $this->db->findMany('transactions', [
            'userId' => $userId,
            'type' => 'deposit',
            'status' => ['$in' => ['pending', 'completed']],
            'createdAt' => ['$gte' => $since],
        ], ['projection' => ['amount' => 1]]);

        $total = 0.0;
        foreach ($transactions as $tx) {
            $total += $this->num($tx['amount'] ?? 0);
        }
        return $total;
    }

    private function sumNetLossSince(string $userId, string $since): float
    {
        $bets = $this->db->findMany('bets', [
            'userId' => $userId,
            'createdAt' => ['$gte' => $since],
        ], ['projection' => ['amount' => 1, 'status' => 1, 'potentialPayout' => 1]]);

        $wagered = 0.0;
        $won = 0.0;
        foreach ($bets as $bet) {
            $wagered += $this->num($bet['amount'] ?? 0);
            if (($bet['status'] ?? '') === 'won') {
                $won += $this->num($bet['potentialPayout'] ?? 0);
            }
        }

        $casinoRounds = $this->db->findMany('casino_bets', [
            'userId' => $userId,
            'createdAt' => ['$gte' => $since],
        ], ['projection' => ['totalWager' => 1, 'totalReturn' => 1]]);

        $casinoWagered = 0.0;
        $casinoReturned = 0.0;
        foreach ($casinoRounds as $round) {
            $casinoWagered += $this->num($round['totalWager'] ?? 0);
            $casinoReturned += $this->num($round['totalReturn'] ?? 0);
        }

        return ($wagered - $won) + ($casinoWagered - $casinoReturned);
    }
}
