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
        if ($method === 'GET' && $path === '/api/debug/rundown-diagnostics') {
            $this->rundownDiagnostics();
            return true;
        }
        if (($method === 'GET' || $method === 'POST') && $path === '/api/internal/rundown-tick') {
            $this->rundownTick();
            return true;
        }
        if ($method === 'POST' && $path === '/api/internal/oddsapi-prematch-tick') {
            $this->oddsApiPrematchTick();
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
        return false;
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

            $result = OddsSyncService::smokeTest();

            Logger::info('Sports API smoke test run', [
                'ok'             => $result['ok'],
                'httpStatus'     => $result['httpStatus'],
                'responseTimeMs' => $result['responseTimeMs'],
                'quotaRemaining' => $result['quotaRemaining'],
                'missingSports'  => $result['missingSports'],
            ], 'sportsbook');

            $httpStatus = $result['ok'] ? 200 : ($result['configured'] ? 502 : 503);
            Response::json($result, $httpStatus);
        } catch (Throwable $e) {
            Logger::exception($e, 'Sports API smoke test error');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * HTTP-callable Rundown live tick. Designed to be called by a cron job
     * on shared hosting (Hostinger) where a long-running `odds-worker.php`
     * daemon isn't viable. Auth is via shared secret (RUNDOWN_TICK_SECRET)
     * so cron jobs can invoke it without a JWT.
     *
     * Per BettorPlays247 business rule: Rundown is the EXCLUSIVE source for
     * live odds. There is no OddsAPI live fallback. Sports that Rundown
     * doesn't cover simply do not appear in Live Now.
     *
     * Hostinger cron line:
     *   * * * * * curl -fsS -X POST -H "X-Tick-Secret: $SECRET" \
     *     https://bettorplays247.com/api/internal/rundown-tick > /dev/null 2>&1
     *
     * Auth, concurrency, and rate-guard via authorizeAndGuardTick().
     */
    private function rundownTick(): void
    {
        $gate = $this->authorizeAndGuardTick('rundown');
        if ($gate !== null) {
            return;
        }
        if (!RundownService::isEnabled()) {
            $this->logTick('rundown', 'failed', null, 'rundown_disabled');
            Response::json(['ok' => false, 'error' => 'rundown_disabled'], 503);
            return;
        }
        $tickLogId = $this->logTickStart('rundown');
        try {
            $start = microtime(true);
            $result = RundownLiveSync::tick($this->db);
            $result['elapsedMs'] = (int) round((microtime(true) - $start) * 1000);
            $this->markTickRan('rundown');
            $this->logTickFinish($tickLogId, 'ok', $result, null);
            Response::json(['ok' => true] + $result);
        } catch (Throwable $e) {
            Logger::exception($e, 'rundown-tick http trigger error');
            $this->logTickFinish($tickLogId, 'failed', null, $e->getMessage());
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        } finally {
            $this->releaseTickLock('rundown');
        }
    }

    /**
     * Cron-callable pre-match (OddsAPI) sync. Hostinger cron line:
     *   *\/5 * * * * curl -fsS -X POST -H "X-Tick-Secret: $SECRET" \
     *     https://bettorplays247.com/api/internal/oddsapi-prematch-tick \
     *     > /dev/null 2>&1
     *
     * Rotates through configured sports (PREMATCH_MAX_SPORTS_PER_TICK at a
     * time) so all are covered within a few ticks regardless of how many
     * sports are configured. Cursor stored in SharedFileCache.
     *
     * NOTE: this is the PRE-MATCH path only. Live odds are EXCLUSIVELY
     * Rundown — see /api/internal/rundown-tick. OddsAPI is never used for
     * live in this codebase.
     */
    private function oddsApiPrematchTick(): void
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
                try {
                    $r = OddsSyncService::syncSingleSport($this->db, $sportKey);
                    $matches = is_array($r['matches'] ?? null) ? $r['matches'] : [];
                    $totalUpdated += count($matches);
                    $apiCalls += 1; // syncSingleSport bundles odds+scores; counted as one logical sport
                    $perSport[$sportKey] = ['updated' => count($matches), 'creditsUsed' => (int) ($r['credits_used'] ?? 0)];
                } catch (Throwable $e) {
                    $errors++;
                    $perSport[$sportKey] = ['error' => $e->getMessage()];
                }
            }

            // Bump cursor so the next tick picks up where we left off.
            self::advanceRotationCursor($sports, count($batch));

            $result = [
                'sportsTried' => count($batch),
                'totalUpdated' => $totalUpdated,
                'apiCalls' => $apiCalls,
                'errors' => $errors,
                'rotation' => ['totalConfigured' => count($sports), 'cursor' => self::peekRotationCursor()],
                'perSport' => $perSport,
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
     * OR shared X-Tick-Secret. Refreshes live odds from OddsAPI and returns
     * the same shape as GET /api/matches?status=live so the frontend can
     * swap one for the other transparently.
     */
    private function userLiveSync(): void
    {
        if (!$this->authorizeUserOrTickSecret()) {
            Response::json(['message' => 'Not authorized'], 401);
            return;
        }
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
            $lockOk = $this->db->acquireNamedLock('live_tick_oddsapi', 0);
            if (!$lockOk) {
                // Concurrent live tick is already running — caller still
                // gets current data, so don't fail.
                $this->logTickFinish($tickLogId, 'skipped_concurrent', null, null);
                $throttled = true;
            } else {
                try {
                    $result = OddsSyncService::syncLiveOdds($this->db);
                    $this->markUserSyncRan($throttleKey);
                    $this->markTickRan('oddsapi_live');
                    $this->logTickFinish($tickLogId, 'ok', [
                        'sportsTried' => (int) ($result['sportsChecked'] ?? 0),
                        'eventsSeen' => (int) ($result['liveScoreEvents'] ?? 0),
                        'updated' => (int) ($result['updated'] ?? 0) + (int) ($result['created'] ?? 0),
                    ], null);
                } catch (Throwable $e) {
                    Logger::exception($e, 'user-live-sync error');
                    $this->logTickFinish($tickLogId, 'failed', null, $e->getMessage());
                } finally {
                    try { $this->db->releaseNamedLock('live_tick_oddsapi'); } catch (Throwable $_) {}
                }
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
                $r = OddsSyncService::syncSingleSport($this->db, $sportKey);
                $matches = is_array($r['matches'] ?? null) ? $r['matches'] : [];
                if (ApiQuotaGuard::currentCount('oddsapi') >= (int) Env::get('ODDSAPI_MAX_CALLS_PER_MINUTE', '60')) {
                    $this->logTickFinish($tickLogId, 'skipped_quota_cap', ['updated' => count($matches)], 'oddsapi_quota');
                    $throttled = true;
                } else {
                    $this->markUserSyncRan($throttleKey);
                    $this->logTickFinish($tickLogId, 'ok', ['updated' => count($matches)], null);
                }
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
     * Auth = either valid JWT (any role) OR matching X-Tick-Secret header.
     * Used by /api/sync/* endpoints which can be called by either a logged-in
     * player from the browser or by an internal cron / admin.
     */
    private function authorizeUserOrTickSecret(): bool
    {
        // Try X-Tick-Secret first (cheap, no DB hit).
        $expected = trim((string) Env::get('RUNDOWN_TICK_SECRET', ''));
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
            $src = strtolower((string) ($m['oddsSource'] ?? ''));
            if ($src !== 'oddsapi') return false;
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
     * double-cron and admin-during-cron races from doubling OddsAPI spend.
     */
    private function authorizeAndGuardTick(string $type): ?string
    {
        $expected = trim((string) Env::get('RUNDOWN_TICK_SECRET', ''));
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
     * @param array<string,mixed>|null $result RundownLiveSync::tick() shape
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
     * empty: shows server time, DB time + timezone, RUNDOWN_* env state,
     * count of rows in each filter bucket the live API filter walks
     * through, plus a sample row so the team-name fuzzy-match path is
     * inspectable. Admin-only.
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

            $rundownEnabled = RundownService::isEnabled();
            $rundownReachable = ['ok' => null, 'sportsCount' => null, 'error' => null];
            if ($rundownEnabled) {
                try {
                    $sports = RundownService::listSports();
                    $rundownReachable = ['ok' => count($sports) > 0, 'sportsCount' => count($sports), 'error' => null];
                } catch (Throwable $e) {
                    $rundownReachable = ['ok' => false, 'sportsCount' => 0, 'error' => $e->getMessage()];
                }
            }

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

            // Quick-glance: last successful Rundown tick. Detailed history
            // (ok/failed/skipped, counters, errors) lives in `lastTicks`
            // below, sourced from the tick_log table.
            $tickLast = [];
            foreach (['rundown', 'prematch'] as $tickType) {
                $entry = SharedFileCache::peek('live-tick-last', $tickType);
                $ts = is_array($entry) && isset($entry['ts']) ? (int) $entry['ts'] : 0;
                $tickLast[$tickType] = [
                    'lastSuccessUtc' => $ts > 0 ? gmdate(DATE_ATOM, $ts) : null,
                    'ageSeconds' => $ts > 0 ? ($now - $ts) : null,
                ];
            }

            // Pre-match (OddsAPI scheduled) freshness breakdown — same shape
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
                'rundown' => [
                    'enabled' => $rundownEnabled,
                    'apiKeyPresent' => Env::get('RUNDOWN_API_KEY', '') !== '',
                    'tickSeconds' => (int) Env::get('RUNDOWN_LIVE_TICK_SECONDS', '0'),
                    'maxSportsPerTick' => (int) Env::get('RUNDOWN_LIVE_MAX_SPORTS_PER_TICK', '0'),
                    'reachable' => $rundownReachable,
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
                    'rundownLastMinute' => ApiQuotaGuard::currentCount('rundown'),
                    'oddsapiLastMinute' => ApiQuotaGuard::currentCount('oddsapi'),
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

    /**
     * Comprehensive Rundown API diagnostics. Checks:
     * - API key configuration
     * - Network connectivity to Rundown
     * - Database state (live matches with rundown source)
     * - Recent tick history and errors
     * - Cache status and invalidation
     * 
     * Returns detailed diagnostic data for troubleshooting Live Now button issues.
     * Admin-only endpoint.
     */
    private function rundownDiagnostics(): void
    {
        try {
            $actor = $this->protectAdminOnly();
            if ($actor === null) {
                return;
            }

            $now = time();
            $diagnostic = [
                'timestamp' => gmdate(DATE_ATOM, $now),
                'configuration' => [],
                'api_connectivity' => [],
                'database' => [],
                'cache' => [],
                'recent_history' => [],
                'recommendations' => [],
            ];

            // 1. Configuration Check
            $apiKey = trim((string) Env::get('RUNDOWN_API_KEY', ''));
            $enabled = strtolower((string) Env::get('RUNDOWN_LIVE_ENABLED', 'false')) === 'true';
            $diagnostic['configuration'] = [
                'enabled' => $enabled,
                'api_key_set' => $apiKey !== '',
                'api_key_length' => strlen($apiKey),
                'max_calls_per_minute' => (int) Env::get('RUNDOWN_MAX_CALLS_PER_MINUTE', '30'),
                'max_sports_per_tick' => (int) Env::get('RUNDOWN_LIVE_MAX_SPORTS_PER_TICK', '20'),
                'request_delay_ms' => (int) Env::get('RUNDOWN_LIVE_REQUEST_DELAY_MS', '1100'),
            ];

            if (!$enabled) {
                $diagnostic['recommendations'][] = 'RUNDOWN_LIVE_ENABLED is false — Live Now button will not return any sports';
                Response::json($diagnostic, 200);
                return;
            }

            if (!$apiKey) {
                $diagnostic['recommendations'][] = 'RUNDOWN_API_KEY is empty — Live odds are disabled';
                Response::json($diagnostic, 200);
                return;
            }

            // 2. API Connectivity Check
            try {
                $start = microtime(true);
                $sports = RundownService::listSports();
                $elapsed = (int) round((microtime(true) - $start) * 1000);
                $diagnostic['api_connectivity'] = [
                    'reachable' => true,
                    'sports_count' => count($sports),
                    'response_time_ms' => $elapsed,
                    'error' => null,
                    'api_quota_current' => ApiQuotaGuard::currentCount('rundown'),
                    'api_quota_limit' => (int) Env::get('RUNDOWN_MAX_CALLS_PER_MINUTE', '30'),
                ];
            } catch (Throwable $e) {
                $diagnostic['api_connectivity'] = [
                    'reachable' => false,
                    'sports_count' => 0,
                    'response_time_ms' => 0,
                    'error' => $e->getMessage(),
                    'api_quota_current' => ApiQuotaGuard::currentCount('rundown'),
                    'api_quota_limit' => (int) Env::get('RUNDOWN_MAX_CALLS_PER_MINUTE', '30'),
                ];
                $diagnostic['recommendations'][] = 'Cannot reach Rundown API: ' . $e->getMessage();
            }

            // 3. Database State Check
            $allLive = $this->db->findMany('matches', ['status' => 'live'], [
                'projection' => ['id' => 1, 'sportKey' => 1, 'oddsSource' => 1, 'lastOddsSyncAt' => 1, 'homeTeam' => 1, 'awayTeam' => 1],
                'limit' => 1000,
            ]);
            $allLiveCount = is_array($allLive) ? count($allLive) : 0;

            $rundownLive = array_filter(
                is_array($allLive) ? $allLive : [],
                static fn($m) => is_array($m) && strtolower((string) ($m['oddsSource'] ?? '')) === 'rundown'
            );
            $rundownLiveCount = count($rundownLive);

            $coveredSports = RundownLiveSync::coveredSportKeysSet();
            $rundownCovered = array_filter(
                $rundownLive,
                static fn($m) => isset($coveredSports[strtolower((string) ($m['sportKey'] ?? ''))])
            );

            // Check freshness of Rundown live rows
            $freshRundownCount = 0;
            $stalestRundownRow = null;
            foreach ($rundownCovered as $row) {
                $last = (string) ($row['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                if ($lastTs === false) continue;
                $sportKey = strtolower((string) ($row['sportKey'] ?? ''));
                $freshness = MatchesController::liveFreshnessSecondsForSport($sportKey);
                $age = $now - $lastTs;
                if ($age <= $freshness) {
                    $freshRundownCount++;
                }
                if ($stalestRundownRow === null || $age > ($now - (strtotime((string) ($stalestRundownRow['lastOddsSyncAt'] ?? '')) ?: 0))) {
                    $stalestRundownRow = [
                        'sport_key' => $sportKey,
                        'home' => (string) ($row['homeTeam'] ?? ''),
                        'away' => (string) ($row['awayTeam'] ?? ''),
                        'age_seconds' => $age,
                        'last_odds_sync_at' => $last,
                    ];
                }
            }

            $diagnostic['database'] = [
                'total_live_rows' => $allLiveCount,
                'rundown_live_rows' => $rundownLiveCount,
                'rundown_covered_sports' => count($rundownCovered),
                'rundown_fresh_rows' => $freshRundownCount,
                'stalest_rundown_row' => $stalestRundownRow,
                'covered_sports_list' => array_keys($coveredSports),
            ];

            if ($rundownLiveCount === 0) {
                $diagnostic['recommendations'][] = 'No live matches with oddsSource=rundown in database — Live Now will return empty';
            } elseif ($freshRundownCount === 0) {
                $diagnostic['recommendations'][] = 'Rundown live rows exist but all are stale (older than freshness window) — check if ticks are running';
            }

            // 4. Cache Status Check
            $cacheKey = 'public-matches:live';
            $cachedLiveMatches = SharedFileCache::peek('matches', $cacheKey);
            $diagnostic['cache'] = [
                'live_matches_cached' => $cachedLiveMatches !== null,
                'cache_age_seconds' => $cachedLiveMatches !== null && isset($cachedLiveMatches['ts']) ? ($now - (int) $cachedLiveMatches['ts']) : null,
                'cache_size_bytes' => $cachedLiveMatches !== null && isset($cachedLiveMatches['data']) ? strlen((string) json_encode($cachedLiveMatches['data'])) : null,
            ];

            // 5. Recent Tick History
            $recentTicks = $this->recentTickLogs(5);
            $diagnostic['recent_history'] = array_map(
                static fn($tick) => [
                    'type' => $tick['tick_type'] ?? null,
                    'started_at' => $tick['started_at'] ?? null,
                    'finished_at' => $tick['finished_at'] ?? null,
                    'status' => $tick['status'] ?? null,
                    'sports_tried' => isset($tick['sports_tried']) ? (int) $tick['sports_tried'] : null,
                    'events_seen' => isset($tick['events_seen']) ? (int) $tick['events_seen'] : null,
                    'updated' => isset($tick['updated']) ? (int) $tick['updated'] : null,
                    'finished' => isset($tick['finished']) ? (int) $tick['finished'] : null,
                    'error' => $tick['error_message'] ?? null,
                ],
                $recentTicks
            );

            // 6. Final Recommendations
            if ($diagnostic['api_connectivity']['reachable'] === false) {
                $diagnostic['recommendations'][] = 'API connectivity issue — verify network access and RUNDOWN_API_KEY';
            }
            if ($freshRundownCount > 0) {
                $diagnostic['recommendations'][] = '✓ System is working correctly — ' . $freshRundownCount . ' fresh Rundown live rows available';
            } elseif ($rundownCovered > 0) {
                $diagnostic['recommendations'][] = 'Rundown rows exist but are stale — trigger manual sync: POST /api/sync/live';
            }

            Response::json($diagnostic, 200);
        } catch (Throwable $e) {
            Logger::exception($e, 'rundown-diagnostics error');
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
