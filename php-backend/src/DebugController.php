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
        if (($method === 'GET' || $method === 'POST') && $path === '/api/internal/rundown-tick') {
            $this->rundownTick();
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
     * so cron jobs can invoke it without a JWT. Hostinger cron's minimum
     * granularity is 1/min, so target tick interval should be 60-90s.
     *
     * Recommended cron line on Hostinger:
     *   * * * * * curl -fsS -X POST -H "X-Tick-Secret: $SECRET" \
     *     https://bettorplays247.com/api/internal/rundown-tick > /dev/null 2>&1
     */
    private function rundownTick(): void
    {
        $expected = trim((string) Env::get('RUNDOWN_TICK_SECRET', ''));
        $provided = trim((string) Http::header('x-tick-secret'));
        if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
            Response::json(['ok' => false, 'error' => 'unauthorized'], 401);
            return;
        }
        if (!RundownService::isEnabled()) {
            Response::json(['ok' => false, 'error' => 'rundown_disabled'], 503);
            return;
        }
        try {
            $start = microtime(true);
            $result = RundownLiveSync::tick($this->db);
            $result['elapsedMs'] = (int) round((microtime(true) - $start) * 1000);
            Response::json(['ok' => true] + $result);
        } catch (Throwable $e) {
            Logger::exception($e, 'rundown-tick http trigger error');
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
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
            $maxAge = max(60, (int) Env::get('RUNDOWN_LIVE_FRESHNESS_SECONDS', '300'));

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

            $liveBySource = [];
            $liveFresh = 0;
            $sample = null;
            foreach ($allLive ?: [] as $row) {
                $src = strtolower((string) ($row['oddsSource'] ?? ''));
                $bucket = $src === '' ? '(none)' : $src;
                $liveBySource[$bucket] = ($liveBySource[$bucket] ?? 0) + 1;
                $last = (string) ($row['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                $isFresh = $lastTs !== false && ($now - $lastTs) <= $maxAge;
                if ($src === 'rundown' && $isFresh) {
                    $liveFresh++;
                }
                if ($sample === null) {
                    $sample = [
                        'sportKey' => (string) ($row['sportKey'] ?? ''),
                        'home' => (string) ($row['homeTeam'] ?? ''),
                        'away' => (string) ($row['awayTeam'] ?? ''),
                        'oddsSource' => $row['oddsSource'] ?? null,
                        'lastOddsSyncAt' => $last,
                        'ageSeconds' => $lastTs ? ($now - $lastTs) : null,
                    ];
                }
            }

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
                    'freshnessSeconds' => $maxAge,
                    'maxSportsPerTick' => (int) Env::get('RUNDOWN_LIVE_MAX_SPORTS_PER_TICK', '0'),
                    'reachable' => $rundownReachable,
                ],
                'live' => [
                    'totalRows' => $liveTotal,
                    'bySource' => $liveBySource,
                    'rundownFresh' => $liveFresh,
                    'sampleRow' => $sample,
                    'liveNowFilterWouldReturn' => $liveFresh,
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
        $actor = $this->db->findOne($collection, ['id' => SqlRepository::id($id)]);
        if ($actor === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        return $actor;
    }
}
