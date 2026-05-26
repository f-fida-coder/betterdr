<?php

declare(strict_types=1);


final class DebugController
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
        if ($method === 'POST' && $path === '/api/debug/emit-match') {
            $this->emitMatch();
            return true;
        }
        if ($method === 'GET' && $path === '/api/debug/sports-api-smoke-test') {
            $this->sportsApiSmokeTest();
            return true;
        }
        if ($method === 'GET' && $path === '/api/debug/live-status') {
            $this->liveStatus();
            return true;
        }
        if ($method === 'POST' && $path === '/api/internal/prematch-tick') {
            $this->prematchTick();
            return true;
        }
        if ($method === 'POST' && $path === '/api/sync/live') {
            $this->userLiveSync();
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/sync/prematch/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->userPrematchSync((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/sync/recent') {
            $this->syncRecentEvents();
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/debug/events/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->debugEventsForSport((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/debug/event-markets/([a-z][a-z0-9_]{1,79})/([A-Za-z0-9._-]{1,128})$#', $path, $m) === 1) {
            $this->debugEventMarkets((string) $m[1], (string) $m[2]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/odds/participants/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->syncParticipants((string) $m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/odds/outrights/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->syncOutrights((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && $path === '/api/admin/odds/outright-sports') {
            $this->listOutrightSports();
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/odds/historical/odds/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->historicalOdds((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/odds/historical/events/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->historicalEvents((string) $m[1]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/odds/historical/event-odds/([a-z][a-z0-9_]{1,79})/([A-Za-z0-9._-]{1,128})$#', $path, $m) === 1) {
            $this->historicalEventOdds((string) $m[1], (string) $m[2]);
            return true;
        }
        if ($method === 'GET' && preg_match('#^/api/admin/odds/historical/event-markets/([a-z][a-z0-9_]{1,79})/([A-Za-z0-9._-]{1,128})$#', $path, $m) === 1) {
            $this->historicalEventMarkets((string) $m[1], (string) $m[2]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/outrights/([a-f0-9]{24})/settle$#', $path, $m) === 1) {
            $this->settleOutright((string) $m[1]);
            return true;
        }
        if ($method === 'POST' && preg_match('#^/api/admin/outrights/([a-f0-9]{24})/void$#', $path, $m) === 1) {
            $this->voidOutright((string) $m[1]);
            return true;
        }
        return false;
    }

    private function settleOutright(string $outrightId): void
    {
        try {
            $actor = $this->protectAdminOnly();
            if ($actor === null) return;
            $body = Http::jsonBody();
            $winner = is_array($body) ? trim((string) ($body['winner'] ?? $body['winningOutcome'] ?? '')) : '';
            if ($winner === '') {
                Response::json(['ok' => false, 'error' => 'missing_winner'], 400);
                return;
            }
            $settledBy = (string) ($actor['id'] ?? 'admin');
            Response::json(OutrightSettlementService::settleOutright($this->db, $outrightId, $winner, $settledBy));
        } catch (RuntimeException $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Logger::exception($e, 'settleOutright failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function voidOutright(string $outrightId): void
    {
        try {
            $actor = $this->protectAdminOnly();
            if ($actor === null) return;
            $body = Http::jsonBody();
            $reason = is_array($body) ? trim((string) ($body['reason'] ?? '')) : '';
            $settledBy = (string) ($actor['id'] ?? 'admin');
            Response::json(OutrightSettlementService::voidOutright($this->db, $outrightId, $reason, $settledBy));
        } catch (RuntimeException $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            Logger::exception($e, 'voidOutright failed');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function historicalOdds(string $sportKey): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $date = (string) ($_GET['date'] ?? '');
            if ($date === '') { Response::json(['ok' => false, 'error' => 'missing_date'], 400); return; }
            $markets = isset($_GET['markets']) ? (string) $_GET['markets'] : null;
            $regions = isset($_GET['regions']) ? (string) $_GET['regions'] : null;
            // TODO: Rundown — historical odds fetch ($sportKey, $date, $markets, $regions).
            Response::json(['ok' => false, 'pending' => 'rundown']);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function historicalEvents(string $sportKey): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $date = (string) ($_GET['date'] ?? '');
            if ($date === '') { Response::json(['ok' => false, 'error' => 'missing_date'], 400); return; }
            // TODO: Rundown — historical events fetch ($sportKey, $date).
            Response::json(['ok' => false, 'pending' => 'rundown']);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function historicalEventOdds(string $sportKey, string $eventId): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $date = (string) ($_GET['date'] ?? '');
            if ($date === '') { Response::json(['ok' => false, 'error' => 'missing_date'], 400); return; }
            $markets = isset($_GET['markets']) ? (string) $_GET['markets'] : null;
            $regions = isset($_GET['regions']) ? (string) $_GET['regions'] : null;
            // TODO: Rundown — historical event odds fetch.
            Response::json(['ok' => false, 'pending' => 'rundown']);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function historicalEventMarkets(string $sportKey, string $eventId): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            $date = (string) ($_GET['date'] ?? '');
            if ($date === '') { Response::json(['ok' => false, 'error' => 'missing_date'], 400); return; }
            $regions = isset($_GET['regions']) ? (string) $_GET['regions'] : null;
            // TODO: Rundown — historical event-markets fetch.
            Response::json(['ok' => false, 'pending' => 'rundown']);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function syncParticipants(string $sportKey): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            // TODO: Rundown — sync participants for $sportKey.
            Response::json(['ok' => false, 'pending' => 'rundown']);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function syncOutrights(string $sportKey): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            // TODO: Rundown — sync outrights for $sportKey.
            Response::json(['ok' => false, 'pending' => 'rundown']);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function listOutrightSports(): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            // TODO: Rundown — list configured outright sports.
            Response::json(['ok' => true, 'sports' => []]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function debugEventsForSport(string $sportKey): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            // TODO: Rundown — list events for $sportKey.
            Response::json(['ok' => false, 'pending' => 'rundown']);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function debugEventMarkets(string $sportKey, string $eventId): void
    {
        try {
            if ($this->protectAdminOnly() === null) return;
            // TODO: Rundown — list available markets for ($sportKey, $eventId).
            Response::json(['ok' => false, 'pending' => 'rundown']);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function emitMatch(): void
    {
        try {
            $actor = $this->protectAdminOnly();
            if ($actor === null) {
                return;
            }

            $body = Http::jsonBody();
            $payload = (is_array($body) && count($body) > 0)
                ? $body
                : [
                    'id' => 'debug-' . time(),
                    'homeTeam' => 'Debug Home',
                    'awayTeam' => 'Debug Away',
                    'startTime' => gmdate(DATE_ATOM),
                    'sport' => 'debug',
                    'status' => 'live',
                    'score' => ['score_home' => 1, 'score_away' => 2, 'period' => 'Q2', 'event_status' => 'STATUS_IN_PROGRESS'],
                    'odds' => new stdClass(),
                ];

            // Socket emission is still handled by the legacy Node service.
            Response::json(['ok' => true, 'emitted' => $payload]);
        } catch (Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function sportsApiSmokeTest(): void
    {
        try {
            $actor = $this->protectAdminOnly();
            if ($actor === null) {
                return;
            }

            // TODO: Rundown — implement upstream smoke test (auth + reachability).
            $result = [
                'ok' => false,
                'configured' => false,
                'pending' => 'rundown',
            ];
            Response::json($result, 503);
        } catch (Throwable $e) {
            Logger::exception($e, 'Sports API smoke test error');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cron-callable pre-match sync. Hostinger cron line:
     *   *\/5 * * * * curl -fsS -X POST -H "X-Tick-Secret: $SECRET" \
     *     https://bettorplays247.com/api/internal/prematch-tick \
     *     > /dev/null 2>&1
     *
     * Rotates through configured sports (PREMATCH_MAX_SPORTS_PER_TICK at a
     * time) so all are covered within a few ticks regardless of how many
     * sports are configured. Cursor stored in SharedFileCache.
     */
    private function prematchTick(): void
    {
        $gate = $this->authorizeAndGuardTick('prematch');
        if ($gate !== null) {
            return;
        }
        $tickLogId = $this->logTickStart('prematch');
        try {
            $start = microtime(true);
            $sports = self::resolveAllConfiguredSports();
            $maxPerTick = max(1, (int) Env::get('PREMATCH_MAX_SPORTS_PER_TICK', '8'));
            $batch = self::nextRotationBatch($sports, $maxPerTick);

            $perSport = [];
            $totalUpdated = 0;
            $errors = 0;
            $apiCalls = 0;
            foreach ($batch as $sportKey) {
                // TODO: Rundown — per-sport prematch sync goes here.
                $perSport[$sportKey] = ['updated' => 0, 'pending' => 'rundown'];
            }

            // Bump cursor so the next tick picks up where we left off.
            self::advanceRotationCursor($sports, count($batch));

            // TODO: Rundown — extended/period/player-prop market sync for
            // the rotation batch goes here. Default-on via
            // ODDS_EXTENDED_SYNC_ENABLED; tier3 cutout from tierConfig().
            $extended = null;

            // Settlement sweep — grade any matches that flipped to
            // `finished`/`canceled` since the last cron run. On Hostinger
            // the long-running odds-worker doesn't run, and syncSingleSport
            // above intentionally skips settlement, so this is the system
            // -wide grading cadence. Cheap when no pending bets are on
            // finished matches (no DB writes). Failures are non-fatal —
            // the tick's primary job is odds sync, and getMyBets still
            // has the on-read fallback for any user who happens to look.
            $sweep = [
                'matchesChecked' => 0,
                'matchesSettled' => 0,
                'betsSettled' => 0,
                'errors' => 0,
            ];
            try {
                $sweepResult = BetSettlementService::settlePendingMatches($this->db, 250, 'cron');
                $sweep['matchesChecked'] = (int) ($sweepResult['matchesChecked'] ?? 0);
                $sweep['matchesSettled'] = (int) ($sweepResult['matchesSettled'] ?? 0);
                $sweep['betsSettled']    = (int) ($sweepResult['betsSettled'] ?? 0);
                $sweep['errors']         = (int) ($sweepResult['errors'] ?? 0);
            } catch (Throwable $sweepErr) {
                Logger::warning('prematch-tick settlement sweep failed', [
                    'error' => $sweepErr->getMessage(),
                ], 'sportsbook');
                $sweep['errors']++;
            }

            $result = [
                'sportsTried' => count($batch),
                'totalUpdated' => $totalUpdated,
                'apiCalls' => $apiCalls,
                'errors' => $errors,
                'rotation' => ['totalConfigured' => count($sports), 'cursor' => self::peekRotationCursor()],
                'perSport' => $perSport,
                'extended' => $extended,
                'settlementSweep' => $sweep,
                'elapsedMs' => (int) round((microtime(true) - $start) * 1000),
            ];
            $this->markTickRan('prematch');
            // Map shape into tick_log columns where it overlaps.
            $logResult = ['sportsTried' => $result['sportsTried'], 'updated' => $totalUpdated];
            $this->logTickFinish($tickLogId, 'ok', $logResult, null);
            Response::json(['ok' => true] + $result);
        } catch (Throwable $e) {
            Logger::exception($e, 'prematch-tick http trigger error');
            $this->logTickFinish($tickLogId, 'failed', null, $e->getMessage());
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        } finally {
            $this->releaseTickLock('prematch');
        }
    }

    /**
     * User-triggered Live Now refresh. Auth: either valid JWT (any role)
     * OR shared X-Tick-Secret. Refreshes live odds and returns the same
     * shape as GET /api/matches?status=live so the frontend can swap one
     * for the other transparently.
     */
    private function userLiveSync(): void
    {
        if (!$this->authorizeUserOrTickSecret()) {
            Response::json(['message' => 'Not authorized'], 401);
            return;
        }
        // Pull the calling user's id from the JWT (if present) so we can
        // also drain their pending tickets after the live sync. Tick-secret
        // callers won't have a user id — they just get the odds refresh,
        // and the cron-level settlement sweep covers system-wide grading.
        $callerUserId = self::extractJwtUserId($this->jwtSecret);
        $userMin = max(0, (int) Env::get('USER_LIVE_SYNC_MIN_INTERVAL_SECONDS', '15'));
        $throttleKey = self::clientThrottleKey('live');
        $throttled = false;

        if ($userMin > 0) {
            $entry = SharedFileCache::peek('user-sync-last', $throttleKey);
            $lastTs = is_array($entry) && isset($entry['ts']) ? (int) $entry['ts'] : 0;
            if ($lastTs > 0 && (time() - $lastTs) < $userMin) {
                $throttled = true;
            }
        }

        if (!$throttled) {
            $tickLogId = $this->logTickStart('user_live');
            $lockOk = $this->db->acquireNamedLock('live_tick_odds', 0);
            if (!$lockOk) {
                // Concurrent live tick is already running — caller still
                // gets current data, so don't fail.
                $this->logTickFinish($tickLogId, 'skipped_concurrent', null, null);
                $throttled = true;
            } else {
                try {
                    // TODO: Rundown — live odds sync goes here.
                    $this->markUserSyncRan($throttleKey);
                    $this->markTickRan('live');
                    $this->logTickFinish($tickLogId, 'ok', [
                        'sportsTried' => 0,
                        'eventsSeen' => 0,
                        'updated' => 0,
                    ], null);
                } catch (Throwable $e) {
                    Logger::exception($e, 'user-live-sync error');
                    $this->logTickFinish($tickLogId, 'failed', null, $e->getMessage());
                } finally {
                    try { $this->db->releaseNamedLock('live_tick_odds'); } catch (Throwable $_) {}
                }
            }
        }

        // Per-user settlement: grade any of the caller's pending tickets
        // whose match has flipped to finished/canceled since their last
        // sweep. Runs even when the live sync above was throttled — the
        // sync's throttle is about upstream API cost, not DB writes, and
        // settlement is the time-sensitive bit for the player. Shares
        // the same 30s per-user throttle as the on-read sweep in
        // getMyBets() so the two paths don't double-sweep when both
        // fire in the same window. Fail-open: settlement issues here
        // mustn't break the live-sync response.
        if ($callerUserId !== '') {
            try {
                $sweepNs = SportsbookCache::userBetSweepNamespace();
                $sweepKey = 'sweep:' . $callerUserId;
                $recent = SharedFileCache::get($sweepNs, $sweepKey, 30);
                if ($recent === null) {
                    BetSettlementService::settlePendingMatchesForUser($this->db, $callerUserId, 'live-sync');
                    SharedFileCache::put($sweepNs, $sweepKey, ['at' => time()]);
                }
            } catch (Throwable $settleErr) {
                Logger::warning('user-live-sync settlement sweep failed', [
                    'userId' => $callerUserId,
                    'error' => $settleErr->getMessage(),
                ], 'bets');
            }
        }

        if ($throttled) {
            header('X-Sync-Throttled: 1');
        }
        // Always 200 with current live rows — UX guarantee: the user never
        // sees an error from clicking Refresh.
        Response::json(self::currentLiveRows($this->db));
    }

    /**
     * Decode the Bearer JWT (if any) and return the user id, or '' when
     * the request lacks a valid JWT (e.g. tick-secret caller). Returns
     * only after sanity-checking the id shape — settlement helpers reject
     * non-24-hex inputs anyway, so a bad token never produces DB writes.
     */
    private static function extractJwtUserId(string $jwtSecret): string
    {
        $auth = (string) Http::header('authorization');
        if (!str_starts_with($auth, 'Bearer ')) return '';
        try {
            $claims = Jwt::decode(trim(substr($auth, 7)), $jwtSecret);
        } catch (Throwable $_) {
            return '';
        }
        $sub = '';
        if (is_array($claims)) {
            $sub = (string) ($claims['id'] ?? $claims['userId'] ?? $claims['sub'] ?? '');
        }
        return preg_match('/^[a-f0-9]{24}$/i', $sub) === 1 ? $sub : '';
    }

    /**
     * User-triggered pre-match refresh for one sport. Auth: JWT (any role).
     * Per-IP per-sport 30s rate guard. Returns the freshly-synced matches
     * for that sportKey, scheduled-only.
     */
    private function userPrematchSync(string $sportKey): void
    {
        $sportKey = strtolower(trim($sportKey));
        if ($sportKey === '') {
            Response::json(['message' => 'invalid sport key'], 400);
            return;
        }
        if (!$this->authorizeUserOrTickSecret()) {
            Response::json(['message' => 'Not authorized'], 401);
            return;
        }
        $userMin = max(0, (int) Env::get('USER_PREMATCH_SYNC_MIN_INTERVAL_SECONDS', '30'));
        $throttleKey = self::clientThrottleKey('prematch:' . $sportKey);
        $throttled = false;

        if ($userMin > 0) {
            $entry = SharedFileCache::peek('user-sync-last', $throttleKey);
            $lastTs = is_array($entry) && isset($entry['ts']) ? (int) $entry['ts'] : 0;
            if ($lastTs > 0 && (time() - $lastTs) < $userMin) {
                $throttled = true;
            }
        }

        if (!$throttled) {
            $tickLogId = $this->logTickStart('user_prematch:' . $sportKey);
            try {
                // TODO: Rundown — per-sport prematch sync goes here. Apply
                // upstream quota cap and short-circuit with skipped_quota_cap
                // if exhausted.
                $this->markUserSyncRan($throttleKey);
                $this->logTickFinish($tickLogId, 'ok', ['updated' => 0], null);
            } catch (Throwable $e) {
                Logger::exception($e, 'user-prematch-sync error');
                $this->logTickFinish($tickLogId, 'failed', null, $e->getMessage());
            }
        }

        if ($throttled) {
            header('X-Sync-Throttled: 1');
        }
        Response::json(self::currentPrematchRows($this->db, $sportKey));
    }

    /**
     * Lightweight events tail — returns recent entries from the
     * RealtimeEventBus log file so a polling client can detect "the
     * worker wrote new data" within a couple of seconds without doing
     * the heavy /api/matches refetch on every poll.
     *
     * Designed for sub-3s polling: each request is a small file read
     * (no DB, no upstream calls) and returns immediately — there is
     * NO long-polling here, since shared PHP-FPM hosts can't tolerate
     * many held connections. Clients sit on a normal short-poll loop
     * and use the events returned to decide when to refetch /api/matches.
     *
     * Query params:
     *   * since: byte offset cursor from a previous response (default 0
     *     for first call → starts from current EOF so we don't replay
     *     the whole log on every fresh mount). The very first response
     *     advertises the current EOF as `cursor` so the next call
     *     starts from there.
     *   * channels: comma-separated channels to filter on (default:
     *     odds:sport:sync,odds:sport:score). Empty = no filter.
     *   * sports: comma-separated sport keys to filter on. Empty = no
     *     filter.
     *   * limit: cap on events returned per response (default 25, max
     *     100). Prevents a slow client from receiving a huge backlog
     *     after a long disconnect.
     *
     * Response:
     *   {
     *     "cursor": "1234567",             // byte offset for next call
     *     "events": [
     *       { "channel": "...", "payload": {...}, "timestamp": "..." }
     *     ]
     *   }
     *
     * Auth: open (same as /api/matches — anonymous-bettable views are
     * publicly readable). Cheap enough that no rate limiting is
     * strictly required, but we cap response size to bound abuse.
     */
    private function syncRecentEvents(): void
    {
        $sinceRaw = (string) Http::query('since', '');
        $channelsRaw = (string) Http::query('channels', 'odds:sport:sync,odds:sport:score');
        $sportsRaw = (string) Http::query('sports', '');
        $limit = max(1, min(100, (int) Http::query('limit', '25')));

        $channelFilter = [];
        foreach (explode(',', $channelsRaw) as $c) {
            $c = trim($c);
            if ($c !== '') {
                $channelFilter[$c] = true;
            }
        }
        $sportFilter = [];
        foreach (explode(',', $sportsRaw) as $s) {
            $s = strtolower(trim($s));
            if ($s !== '') {
                $sportFilter[$s] = true;
            }
        }

        $path = RealtimeEventBus::eventLogPath();
        if (!is_file($path)) {
            Response::json(['cursor' => '0', 'events' => []]);
            return;
        }

        $size = @filesize($path);
        if (!is_int($size)) {
            Response::json(['cursor' => '0', 'events' => []]);
            return;
        }

        // First call (`since` blank): start from current EOF so the
        // client doesn't replay the entire backlog. Subsequent calls
        // pass the cursor we returned last time.
        $sinceOffset = is_numeric($sinceRaw) ? max(0, (int) $sinceRaw) : -1;
        if ($sinceOffset === -1) {
            Response::json(['cursor' => (string) $size, 'events' => []]);
            return;
        }

        // File rotated since the client last polled (the log shrunk).
        // Reset to start so we don't skip events at the tail of the
        // new file. Worst case the client sees the first events twice
        // — they're idempotent refetch triggers, not commands.
        if ($sinceOffset > $size) {
            $sinceOffset = 0;
        }

        if ($sinceOffset >= $size) {
            // No new bytes since last poll.
            Response::json(['cursor' => (string) $size, 'events' => []]);
            return;
        }

        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            Response::json(['cursor' => (string) $size, 'events' => []]);
            return;
        }

        $events = [];
        $newCursor = $sinceOffset;
        try {
            @fseek($handle, $sinceOffset);
            // Cap how much we read in one response so a long-disconnected
            // client can't flood us with megabytes of backlog. 256KB is
            // ~1000 typical events — plenty for a normal catch-up.
            $maxReadBytes = 262144;
            $buf = @fread($handle, $maxReadBytes);
            if (!is_string($buf) || $buf === '') {
                Response::json(['cursor' => (string) $size, 'events' => []]);
                return;
            }
            // Track the byte position of each line so cursor can advance
            // EXACTLY past whichever lines we processed — never past
            // lines we skipped due to the limit cap, which would lose
            // events on the next poll.
            $bytesProcessed = 0;
            $lines = explode("\n", $buf);
            $lineCount = count($lines);
            foreach ($lines as $i => $line) {
                // Last entry of explode() is the trailing partial line
                // (if any) or '' (if buf ends in \n). Either way, don't
                // count it toward processed bytes — wait for next poll
                // to read it completely.
                $isTrailing = ($i === $lineCount - 1);
                if ($isTrailing) {
                    break;
                }
                $bytesProcessed += strlen($line) + 1; // +1 for the \n
                if ($line === '') continue;
                $row = json_decode($line, true);
                if (!is_array($row)) continue;
                $channel = (string) ($row['channel'] ?? '');
                if ($channelFilter !== [] && !isset($channelFilter[$channel])) continue;
                $payload = is_array($row['payload'] ?? null) ? $row['payload'] : [];
                if ($sportFilter !== []) {
                    $sk = strtolower((string) ($payload['sport_key'] ?? ''));
                    if ($sk === '' || !isset($sportFilter[$sk])) continue;
                }
                $events[] = [
                    'channel' => $channel,
                    'payload' => $payload,
                    'timestamp' => (string) ($row['timestamp'] ?? ''),
                ];
                if (count($events) >= $limit) {
                    // Advance cursor only past this line; the rest of
                    // the buffer is left for the next poll.
                    $newCursor = $sinceOffset + $bytesProcessed;
                    break;
                }
            }
            // Didn't hit the limit — cursor advances past every complete
            // line we read.
            if (count($events) < $limit) {
                $newCursor = $sinceOffset + $bytesProcessed;
            }
        } finally {
            @fclose($handle);
        }

        Response::json([
            'cursor' => (string) $newCursor,
            'events' => $events,
        ]);
    }

    /**
     * Auth = either valid JWT (any role) OR matching X-Tick-Secret header.
     * Used by /api/sync/* endpoints which can be called by either a logged-in
     * player from the browser or by an internal cron / admin.
     */
    private function authorizeUserOrTickSecret(): bool
    {
        // Try X-Tick-Secret first (cheap, no DB hit).
        $expected = trim((string) Env::get('INTERNAL_TICK_SECRET', ''));
        $provided = trim((string) Http::header('x-tick-secret'));
        if ($expected !== '' && $provided !== '' && hash_equals($expected, $provided)) {
            return true;
        }
        // Fall back to JWT — any decoded token is enough; we don't require
        // a specific role because Live Now and pre-match listings are
        // public reads, and the throttle is enforced per-IP regardless.
        $auth = (string) Http::header('authorization');
        if (!str_starts_with($auth, 'Bearer ')) return false;
        try {
            Jwt::decode(trim(substr($auth, 7)), $this->jwtSecret);
            return true;
        } catch (Throwable $_) {
            return false;
        }
    }

    /**
     * Per-IP throttle key for user-triggered sync endpoints. Falls back to
     * a generic key if REMOTE_ADDR is missing — better than no throttle.
     */
    private static function clientThrottleKey(string $bucket): string
    {
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        if ($ip === '') $ip = 'unknown';
        return $bucket . ':' . preg_replace('/[^a-zA-Z0-9.:_-]+/', '_', $ip);
    }

    private function markUserSyncRan(string $throttleKey): void
    {
        $payload = ['ts' => time()];
        SharedFileCache::forget('user-sync-last', $throttleKey);
        SharedFileCache::remember('user-sync-last', $throttleKey, 600, fn() => $payload);
    }

    /** Current live rows shape, mirrors /api/matches?status=live. */
    private static function currentLiveRows(SqlRepository $db): array
    {
        $rows = $db->findMany('matches', ['status' => 'live'], ['limit' => 200]);
        if (!is_array($rows)) return [];
        $now = time();
        return array_values(array_filter($rows, static function ($m) use ($now) {
            if (!is_array($m)) return false;
            $sportKey = strtolower((string) ($m['sportKey'] ?? ''));
            if ($sportKey === '') return false;
            // TODO: Rundown — gate by `oddsSource` once Rundown writes that tag.
            $last = (string) ($m['lastOddsSyncAt'] ?? '');
            $lastTs = $last !== '' ? strtotime($last) : false;
            if ($lastTs === false) return false;
            return ($now - $lastTs) <= MatchesController::liveFreshnessSecondsForSport($sportKey);
        }));
    }

    /** Pre-match rows for one sport, mirrors /api/matches?status=upcoming&sportKey=... */
    private static function currentPrematchRows(SqlRepository $db, string $sportKey): array
    {
        $rows = $db->findMany('matches', [
            'sportKey' => $sportKey,
            'status' => 'scheduled',
        ], ['limit' => 200, 'sort' => ['startTime' => 1]]);
        return is_array($rows) ? array_values($rows) : [];
    }

    /**
     * Configured sport keys for the prematch tick. Stable order so the
     * rotation cursor refers to the same slots across calls.
     *
     * @return list<string>
     */
    private static function resolveAllConfiguredSports(): array
    {
        $tier1 = (string) Env::get('ODDS_TIER1_SPORTS', '');
        $tier2 = (string) Env::get('ODDS_TIER2_SPORTS', '');
        $allowed = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
        $merged = $tier1 . ',' . $tier2 . ',' . $allowed;
        $list = array_values(array_unique(array_filter(array_map('trim', explode(',', $merged)), static fn($v) => $v !== '')));
        sort($list);
        return $list;
    }

    /**
     * Pick the next $maxPerTick sports from the rotation, advancing
     * implicitly via cursor. Wraps at end-of-list.
     *
     * @param list<string> $sports
     * @return list<string>
     */
    private static function nextRotationBatch(array $sports, int $maxPerTick): array
    {
        if ($sports === []) return [];
        $cursor = self::peekRotationCursor();
        $cursor = $cursor % count($sports);
        $batch = [];
        $n = min($maxPerTick, count($sports));
        for ($i = 0; $i < $n; $i++) {
            $batch[] = $sports[($cursor + $i) % count($sports)];
        }
        return $batch;
    }

    private static function peekRotationCursor(): int
    {
        $entry = SharedFileCache::peek('prematch-rotation', 'cursor');
        return is_array($entry) && isset($entry['n']) ? (int) $entry['n'] : 0;
    }

    /** @param list<string> $sports */
    private static function advanceRotationCursor(array $sports, int $by): void
    {
        if ($sports === []) return;
        $next = (self::peekRotationCursor() + max(0, $by)) % count($sports);
        $payload = ['n' => $next];
        SharedFileCache::forget('prematch-rotation', 'cursor');
        SharedFileCache::remember('prematch-rotation', 'cursor', 86400, fn() => $payload);
    }

    /**
     * Shared auth + concurrency + rate-guard for the cron-callable tick
     * endpoints. Returns null on success (caller may proceed) or a string
     * describing the gate failure (response already sent — caller returns).
     *
     * Auth: timing-safe hash_equals() of X-Tick-Secret against
     * <UPPER(TYPE)>_TICK_SECRET (with TICK_SECRET as a shared fallback).
     *
     * Concurrency: MySQL GET_LOCK named "live_tick_<type>" with timeout 0.
     * If another tick of the same type is already running, returns 200 with
     * skipped=true so cron logs success without overlap.
     *
     * Rate guard: skip if a successful tick of the same type ran within
     * LIVE_TICK_MIN_INTERVAL_SECONDS (default 30). Prevents accidental
     * double-cron and admin-during-cron races from doubling upstream spend.
     */
    private function authorizeAndGuardTick(string $type): ?string
    {
        $expected = trim((string) Env::get('INTERNAL_TICK_SECRET', ''));
        $provided = trim((string) Http::header('x-tick-secret'));
        if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
            Response::json(['ok' => false, 'error' => 'unauthorized'], 401);
            return 'unauthorized';
        }

        $minInterval = max(0, (int) Env::get('LIVE_TICK_MIN_INTERVAL_SECONDS', '30'));
        if ($minInterval > 0) {
            $last = SharedFileCache::peek('live-tick-last', $type);
            $lastTs = is_array($last) && isset($last['ts']) ? (int) $last['ts'] : 0;
            if ($lastTs > 0 && (time() - $lastTs) < $minInterval) {
                $this->logTick($type, 'skipped_rate_limited', null, null);
                Response::json([
                    'ok' => true,
                    'skipped' => true,
                    'reason' => 'rate_limited',
                    'lastRunAgeSeconds' => time() - $lastTs,
                ]);
                return 'rate_limited';
            }
        }

        $lockName = 'live_tick_' . $type;
        if (!$this->db->acquireNamedLock($lockName, 0)) {
            $this->logTick($type, 'skipped_concurrent', null, null);
            Response::json([
                'ok' => true,
                'skipped' => true,
                'reason' => 'concurrent',
            ]);
            return 'concurrent';
        }
        return null;
    }

    private function releaseTickLock(string $type): void
    {
        try {
            $this->db->releaseNamedLock('live_tick_' . $type);
        } catch (Throwable $_) {
            // best-effort — lock auto-releases on connection close
        }
    }

    private function markTickRan(string $type): void
    {
        // SharedFileCache uses get-with-callback semantics; we don't want to
        // pre-load on miss, so write directly via a long-TTL get() that
        // memoizes our payload. The TTL is generous (1h) — what we actually
        // care about is the timestamp, which we set manually.
        $payload = ['ts' => time()];
        // forget+remember pattern keeps the file fresh.
        SharedFileCache::forget('live-tick-last', $type);
        SharedFileCache::remember('live-tick-last', $type, 3600, fn() => $payload);
    }

    /**
     * Auto-create the tick_log table if missing. Idempotent — IF NOT EXISTS
     * is cheap. We could move this to a one-shot migration but that adds
     * deploy steps; for an ops-only diagnostic table the runtime ensure is
     * fine. Failures are swallowed because the tick must succeed even if
     * logging breaks.
     */
    private function ensureTickLogTable(): void
    {
        try {
            $pdo = $this->db->getRawPdoForOps();
            $table = $this->db->rawTableName('tick_log');
            $pdo->exec("CREATE TABLE IF NOT EXISTS `{$table}` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tick_type VARCHAR(32) NOT NULL,
                started_at DATETIME NOT NULL,
                finished_at DATETIME NULL,
                status VARCHAR(32) NOT NULL,
                sports_tried INT NULL,
                events_seen INT NULL,
                matched INT NULL,
                updated INT NULL,
                finished INT NULL,
                error_message TEXT NULL,
                INDEX idx_type_started (tick_type, started_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (Throwable $_) {
            // ignore — logging is best-effort
        }
    }

    /**
     * Log the start of a tick (status='ok' as a placeholder; later overwritten
     * by logTickFinish). Returns the row id so the finisher can UPDATE in
     * place. Returns 0 if logging failed — callers must accept "no log row"
     * and continue without persisting metrics.
     */
    private function logTickStart(string $type): int
    {
        $this->ensureTickLogTable();
        try {
            $pdo = $this->db->getRawPdoForOps();
            $table = $this->db->rawTableName('tick_log');
            $stmt = $pdo->prepare("INSERT INTO `{$table}` (tick_type, started_at, status) VALUES (:t, UTC_TIMESTAMP(), 'running')");
            $stmt->execute([':t' => $type]);
            return (int) $pdo->lastInsertId();
        } catch (Throwable $_) {
            return 0;
        }
    }

    /**
     * Update an in-flight tick row with terminal status + counters.
     *
     * @param array<string,mixed>|null $result Tick result keyed by sportsTried/eventsSeen/matched/updated/finished
     */
    private function logTickFinish(int $tickLogId, string $status, ?array $result, ?string $error): void
    {
        if ($tickLogId <= 0) return;
        try {
            $pdo = $this->db->getRawPdoForOps();
            $table = $this->db->rawTableName('tick_log');
            $stmt = $pdo->prepare("UPDATE `{$table}` SET finished_at = UTC_TIMESTAMP(), status = :s, sports_tried = :sp, events_seen = :ev, matched = :m, updated = :u, finished = :f, error_message = :err WHERE id = :id");
            $stmt->execute([
                ':s'   => $status,
                ':sp'  => isset($result['sportsTried']) ? (int) $result['sportsTried'] : null,
                ':ev'  => isset($result['eventsSeen']) ? (int) $result['eventsSeen'] : null,
                ':m'   => isset($result['matched']) ? (int) $result['matched'] : null,
                ':u'   => isset($result['updated']) ? (int) $result['updated'] : null,
                ':f'   => isset($result['finished']) ? (int) $result['finished'] : null,
                ':err' => $error,
                ':id'  => $tickLogId,
            ]);
        } catch (Throwable $_) {
            // ignore
        }
    }

    /**
     * Single-shot log row for skipped paths (rate-limited, concurrent) and
     * for failures discovered before logTickStart could run.
     */
    private function logTick(string $type, string $status, ?array $result, ?string $error): void
    {
        $id = $this->logTickStart($type);
        $this->logTickFinish($id, $status, $result, $error);
    }

    /**
     * Most recent N tick_log rows, newest first. Used by /api/debug/live-status.
     *
     * @return list<array<string,mixed>>
     */
    private function recentTickLogs(int $limit = 10): array
    {
        try {
            $pdo = $this->db->getRawPdoForOps();
            $table = $this->db->rawTableName('tick_log');
            $stmt = $pdo->prepare("SELECT id, tick_type, started_at, finished_at, status, sports_tried, events_seen, matched, updated, finished, error_message FROM `{$table}` ORDER BY id DESC LIMIT :lim");
            $stmt->bindValue(':lim', max(1, $limit), PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return is_array($rows) ? $rows : [];
        } catch (Throwable $_) {
            return [];
        }
    }

    /**
     * Diagnostic snapshot of why Live Now is or isn't populating. Designed
     * to be the first place to look when the production "Live Now" tab is
     * empty: shows server time, count of rows in each filter bucket the
     * live API filter walks through, plus a sample row so the team-name
     * fuzzy-match path is inspectable. Admin-only.
     */
    private function liveStatus(): void
    {
        try {
            $actor = $this->protectAdminOnly();
            if ($actor === null) {
                return;
            }

            $now = time();

            // We can't read MySQL @@time_zone / NOW() through SqlRepository's
            // public API, so we infer drift from a sample row's startTime
            // (stored as ISO-8601 UTC) vs PHP's gmdate. If they're far apart
            // the issue is data freshness, not a tz mismatch — startTime is
            // a string, not a TIMESTAMP column.

            $allLive = $this->db->findMany('matches', ['status' => 'live'], [
                'projection' => ['id' => 1, 'sportKey' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'oddsSource' => 1, 'lastOddsSyncAt' => 1, 'startTime' => 1],
                'limit' => 200,
            ]);
            $liveTotal = is_array($allLive) ? count($allLive) : 0;

            // Per-source totals plus a per-sport breakdown — the per-sport
            // section is the diagnostic the on-call engineer actually needs:
            // it spotlights coverage gaps (sport with N live rows but oldest
            // age > freshness window → no tick is touching it) at a glance.
            $liveBySource = [];
            $liveFreshOverall = 0;
            $liveBySport = [];
            $sample = null;
            foreach ($allLive ?: [] as $row) {
                $src = strtolower((string) ($row['oddsSource'] ?? ''));
                $bucket = $src === '' ? '(none)' : $src;
                $liveBySource[$bucket] = ($liveBySource[$bucket] ?? 0) + 1;

                $sportKey = (string) ($row['sportKey'] ?? '');
                $sportFreshness = MatchesController::liveFreshnessSecondsForSport($sportKey);
                $last = (string) ($row['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                $age = $lastTs !== false ? ($now - $lastTs) : null;
                $isFresh = $age !== null && $age <= $sportFreshness;
                if ($isFresh) {
                    $liveFreshOverall++;
                }

                $sportBucket = $sportKey === '' ? '(no_sport_key)' : $sportKey;
                if (!isset($liveBySport[$sportBucket])) {
                    $liveBySport[$sportBucket] = [
                        'count' => 0,
                        'fresh' => 0,
                        'oldestAgeSec' => null,
                        'newestAgeSec' => null,
                        'sources' => [],
                        'freshnessWindowSec' => $sportFreshness,
                    ];
                }
                $liveBySport[$sportBucket]['count']++;
                if ($isFresh) $liveBySport[$sportBucket]['fresh']++;
                if ($age !== null) {
                    $cur = $liveBySport[$sportBucket]['oldestAgeSec'];
                    if ($cur === null || $age > $cur) $liveBySport[$sportBucket]['oldestAgeSec'] = $age;
                    $cur = $liveBySport[$sportBucket]['newestAgeSec'];
                    if ($cur === null || $age < $cur) $liveBySport[$sportBucket]['newestAgeSec'] = $age;
                }
                $sBucket = $src === '' ? 'none' : $src;
                $liveBySport[$sportBucket]['sources'][$sBucket] = ($liveBySport[$sportBucket]['sources'][$sBucket] ?? 0) + 1;

                if ($sample === null) {
                    $sample = [
                        'sportKey' => $sportKey,
                        'home' => (string) ($row['homeTeam'] ?? ''),
                        'away' => (string) ($row['awayTeam'] ?? ''),
                        'oddsSource' => $row['oddsSource'] ?? null,
                        'lastOddsSyncAt' => $last,
                        'ageSeconds' => $age,
                        'freshnessWindowSec' => $sportFreshness,
                    ];
                }
            }
            // Sort sports by oldest-age desc so coverage gaps surface first.
            uasort($liveBySport, static fn($a, $b) => ($b['oldestAgeSec'] ?? 0) <=> ($a['oldestAgeSec'] ?? 0));

            // Best-effort worker liveness: read the tail of the worker log if
            // we can find it on disk. Doesn't tell us whether the daemon is
            // running, but tells us when it last logged anything.
            $workerLog = dirname(__DIR__) . '/logs/odds-worker.log';
            $lastWorkerLine = null;
            $lastWorkerLineAge = null;
            if (is_file($workerLog) && is_readable($workerLog)) {
                $size = (int) @filesize($workerLog);
                $lastWorkerLineAge = $size > 0 ? ($now - (int) @filemtime($workerLog)) : null;
                $tail = @shell_exec('tail -n 1 ' . escapeshellarg($workerLog));
                if (is_string($tail)) {
                    $lastWorkerLine = trim($tail);
                }
            }

            // Quick-glance: last successful tick of each type. Detailed history
            // (ok/failed/skipped, counters, errors) lives in `lastTicks`
            // below, sourced from the tick_log table.
            $tickLast = [];
            foreach (['live', 'prematch'] as $tickType) {
                $entry = SharedFileCache::peek('live-tick-last', $tickType);
                $ts = is_array($entry) && isset($entry['ts']) ? (int) $entry['ts'] : 0;
                $tickLast[$tickType] = [
                    'lastSuccessUtc' => $ts > 0 ? gmdate(DATE_ATOM, $ts) : null,
                    'ageSeconds' => $ts > 0 ? ($now - $ts) : null,
                ];
            }

            // Pre-match scheduled freshness breakdown — same shape
            // as live.bySport but for status='scheduled' rows that need to
            // stay fresh per the 5-min business rule.
            $prematchFreshDefault = max(60, (int) Env::get('PREMATCH_FRESHNESS_SECONDS_DEFAULT', '300'));
            $prematchRows = $this->db->findMany('matches', ['status' => 'scheduled'], [
                'projection' => ['sportKey' => 1, 'lastOddsSyncAt' => 1, 'startTime' => 1],
                'limit' => 2000,
            ]);
            $prematchBySport = [];
            $prematchFresh = 0;
            foreach (is_array($prematchRows) ? $prematchRows : [] as $row) {
                if (!is_array($row)) continue;
                $sportKey = (string) ($row['sportKey'] ?? '');
                $sportBucket = $sportKey === '' ? '(no_sport_key)' : $sportKey;
                $last = (string) ($row['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                $age = $lastTs !== false ? ($now - $lastTs) : null;
                $isFresh = $age !== null && $age <= $prematchFreshDefault;
                if ($isFresh) $prematchFresh++;
                if (!isset($prematchBySport[$sportBucket])) {
                    $prematchBySport[$sportBucket] = ['count' => 0, 'fresh' => 0, 'oldestAgeSec' => null, 'newestAgeSec' => null];
                }
                $prematchBySport[$sportBucket]['count']++;
                if ($isFresh) $prematchBySport[$sportBucket]['fresh']++;
                if ($age !== null) {
                    $cur = $prematchBySport[$sportBucket]['oldestAgeSec'];
                    if ($cur === null || $age > $cur) $prematchBySport[$sportBucket]['oldestAgeSec'] = $age;
                    $cur = $prematchBySport[$sportBucket]['newestAgeSec'];
                    if ($cur === null || $age < $cur) $prematchBySport[$sportBucket]['newestAgeSec'] = $age;
                }
            }
            uasort($prematchBySport, static fn($a, $b) => ($b['oldestAgeSec'] ?? 0) <=> ($a['oldestAgeSec'] ?? 0));

            Response::json([
                'server' => [
                    'phpNowUtc' => gmdate(DATE_ATOM, $now),
                    'phpTimezone' => date_default_timezone_get(),
                    'appEnv' => Env::get('APP_ENV', 'unknown'),
                    'host' => (string) ($_SERVER['HTTP_HOST'] ?? ''),
                ],
                'liveFreshness' => [
                    'defaultSeconds' => MatchesController::liveFreshnessSecondsForSport(''),
                    'note' => 'Per-sport overrides via LIVE_FRESHNESS_SECONDS_<SPORT_KEY>',
                ],
                'ticks' => $tickLast,
                'lastTicks' => $this->recentTickLogs(10),
                'live' => [
                    'totalRows' => $liveTotal,
                    'bySource' => $liveBySource,
                    'freshOverall' => $liveFreshOverall,
                    'liveNowFilterWouldReturn' => $liveFreshOverall,
                    'bySport' => $liveBySport,
                    'sampleRow' => $sample,
                ],
                'prematch' => [
                    'totalScheduled' => is_array($prematchRows) ? count($prematchRows) : 0,
                    'freshOverall' => $prematchFresh,
                    'freshnessWindowSec' => $prematchFreshDefault,
                    'bySport' => $prematchBySport,
                ],
                'quotaCounts' => [
                    // TODO: Rundown — replace with the new upstream's quota counter.
                    'upstreamLastMinute' => 0,
                ],
                'worker' => [
                    'logExists' => is_file($workerLog),
                    'logLastModifiedAgeSeconds' => $lastWorkerLineAge,
                    'lastLogLine' => $lastWorkerLine,
                ],
            ]);
        } catch (Throwable $e) {
            Logger::exception($e, 'live-status debug error');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function protectAdminOnly(): ?array
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
        if (!in_array($role, ['admin', 'super_agent', 'master_agent'], true)) {
            Response::json(['message' => 'Not authorized as admin or master agent'], 403);
            return null;
        }

        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $collection = ($role === 'admin') ? 'admins' : 'agents';
        $actor = Jwt::cachedUser($this->db, $collection, $id);
        if ($actor === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        return $actor;
    }
}
