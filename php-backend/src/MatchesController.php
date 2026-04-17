<?php

declare(strict_types=1);


final class MatchesController
{
    private const PUBLIC_CACHE_DOC_ID = 'sportsbook_public_matches';
    private const PUBLIC_REFRESH_LOCK_PREFIX = 'sportsbook_public_matches_refresh_';
    private const DEFAULT_PUBLIC_CACHE_TTL_SECONDS = 120;
    private const DEFAULT_PUBLIC_REFRESH_COOLDOWN_SECONDS = 120;
    private const DEFAULT_PUBLIC_REFRESH_LOCK_SECONDS = 30;

    private SqlRepository $db;
    private string $jwtSecret;

    public function __construct(SqlRepository $db, string $jwtSecret)
    {
        $this->db = $db;
        $this->jwtSecret = $jwtSecret;
    }

    public function handle(string $method, string $path): bool
    {
        if ($method === 'GET' && $path === '/api/matches') {
            $this->getMatches();
            return true;
        }

        if ($method === 'GET' && preg_match('#^/api/matches/([a-fA-F0-9]{24})$#', $path, $m) === 1) {
            $this->getMatchById($m[1]);
            return true;
        }

        if ($method === 'POST' && $path === '/api/matches/fetch-odds') {
            $this->fetchOddsPublic();
            return true;
        }

        if ($method === 'GET' && $path === '/api/matches/stream') {
            $this->streamMatches();
            return true;
        }

        if ($method === 'GET' && $path === '/api/matches/sports') {
            $this->getAvailableSports();
            return true;
        }

        return false;
    }

    private function getMatches(): void
    {
        try {
            $cacheMeta = $this->maybeRefreshPublicMatches();
            $status = isset($_GET['status']) ? strtolower(trim((string) $_GET['status'])) : '';
            $active = isset($_GET['active']) ? strtolower(trim((string) $_GET['active'])) : '';
            
            // Generate cache key based on query parameters
            $cacheKey = 'matches:' . ($status ?: 'all') . ':' . ($active ?: '0');
            $cacheTtl = 15; // 15 second cache for frequently accessed data
            
            // Try to get from cache first
            $cache = QueryCache::getInstance();
            $annotated = $cache->get($cacheKey);
            
            if ($annotated === null) {
                // Use request deduplication to prevent redundant computation
                // when multiple concurrent requests hit same endpoint
                $dedup = RequestDeduplicator::getInstance();
                $annotated = $dedup->coalesce($cacheKey . ':compute', fn() => $this->computeMatches($status, $active));
                
                // Store in cache
                $cache->set($cacheKey, $annotated, $cacheTtl);
            }

            $this->emitPublicCacheHeaders($cacheMeta);
            $ttl = (int) ($cacheMeta['cacheTtlSeconds'] ?? self::DEFAULT_PUBLIC_CACHE_TTL_SECONDS);
            Response::json($annotated, 200, "public, max-age={$ttl}");
        } catch (Throwable $e) {
            Response::json(['message' => 'Server Error fetching matches'], 500);
        }
    }

    private function computeMatches(string $status, string $active): array
    {
        $dbFilter = [];
        $desiredStatus = $status === 'active' ? 'live' : $status;
        
        if ($desiredStatus === 'live') {
            $dbFilter['status'] = 'live';
        } elseif ($desiredStatus === 'scheduled') {
            $dbFilter['status'] = 'scheduled';
        } elseif ($desiredStatus === 'finished') {
            $dbFilter['status'] = 'finished';
        } elseif ($desiredStatus === 'upcoming') {
            $dbFilter['status'] = 'scheduled';
        }
        
        $matches = $this->db->findMany('matches', $dbFilter, ['sort' => ['startTime' => 1]]);
        $snapshot = SportsbookHealth::sportsbookSnapshot($this->db);
        $annotated = [];
        foreach ($matches as $match) {
            if (!is_array($match)) {
                continue;
            }
            $row = SportsbookHealth::applyBettingAvailability($this->db, $match, $snapshot);
            if (($row['isPublicVisible'] ?? false) !== true) {
                continue;
            }
            $annotated[] = $row;
        }

        // Apply remaining filters in PHP
        if ($desiredStatus === 'upcoming') {
            $now = time();
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($now): bool {
                $startTime = (string) ($match['startTime'] ?? '');
                $parsed = $startTime !== '' ? strtotime($startTime) : false;
                return $parsed === false || $parsed > $now;
            }));
        } elseif ($desiredStatus === 'live-upcoming') {
            $annotated = array_values(array_filter($annotated, static function (array $match): bool {
                $matchStatus = strtolower((string) ($match['status'] ?? ''));
                return in_array($matchStatus, ['scheduled', 'live'], true);
            }));
        } elseif ($desiredStatus !== '' && $desiredStatus !== 'all' && !isset($dbFilter['status'])) {
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($desiredStatus): bool {
                return strtolower((string) ($match['status'] ?? '')) === $desiredStatus;
            }));
        } elseif ($active === 'true') {
            $annotated = array_values(array_filter($annotated, static fn (array $match): bool => strtolower((string) ($match['status'] ?? '')) === 'live'));
        } elseif ($status === '' && $active === '') {
            $annotated = array_values(array_filter($annotated, static function (array $match): bool {
                $matchStatus = strtolower((string) ($match['status'] ?? ''));
                return in_array($matchStatus, ['scheduled', 'live'], true);
            }));
        }
        
        return $annotated;
    }

    private function getMatchById(string $id): void
    {
        try {
            $match = $this->db->findOne('matches', ['id' => SqlRepository::id($id)]);
            if ($match === null) {
                Response::json(['message' => 'Match not found'], 404);
                return;
            }
            $annotated = SportsbookHealth::applyBettingAvailability($this->db, $match);
            if (($annotated['isPublicVisible'] ?? false) !== true) {
                Response::json(['message' => 'Match not available'], 404);
                return;
            }
            Response::json($annotated);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server Error fetching match'], 500);
        }
    }

    /**
     * Return distinct sport values from visible matches so the frontend can
     * highlight which categories currently have data.
     */
    private function getAvailableSports(): void
    {
        try {
            $matches = $this->db->findMany('matches', [], ['projection' => ['sport' => 1, 'sportKey' => 1, 'status' => 1]]);
            $sports = [];
            foreach ($matches as $match) {
                if (!is_array($match)) continue;
                $status = strtolower((string) ($match['status'] ?? ''));
                if (!in_array($status, ['scheduled', 'live'], true)) continue;
                $sport = (string) ($match['sport'] ?? '');
                $sportKey = (string) ($match['sportKey'] ?? '');
                if ($sport !== '') $sports[$sport] = true;
                if ($sportKey !== '') $sports[$sportKey] = true;
            }
            Response::json(array_keys($sports));
        } catch (Throwable $e) {
            Response::json([], 200);
        }
    }

    private function fetchOddsPublic(): void
    {
        try {
            $admin = $this->protectAdmin();
            if ($admin === null) {
                return;
            }
            if (RateLimiter::enforce($this->db, 'matches_fetch_odds_admin', 3, 60)) {
                return;
            }

            $allowPublicRefresh = strtolower((string) Env::get('PUBLIC_ODDS_REFRESH', 'false')) === 'true';
            if (!$allowPublicRefresh) {
                Response::json(['message' => 'Public odds refresh route is disabled. Use admin refresh endpoint.'], 403);
                return;
            }

            $results = OddsSyncService::updateMatches($this->db, 'public_admin');
            Response::json(['message' => 'Manual odds fetch completed', 'results' => $results]);
        } catch (Throwable $e) {
            Response::json(['message' => $e->getMessage() ?: 'Server error manual odds fetch'], 500);
        }
    }

    private function protectAdmin(): ?array
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

        if ((string) ($decoded['role'] ?? '') !== 'admin') {
            Response::json(['message' => 'Only admin can refresh odds from this route'], 403);
            return null;
        }

        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['message' => 'Not authorized, token failed: invalid user id'], 401);
            return null;
        }

        $admin = $this->db->findOne('admins', ['id' => SqlRepository::id($id)]);
        if ($admin === null) {
            Response::json(['message' => 'Not authorized, user not found'], 403);
            return null;
        }

        if (($admin['status'] ?? '') === 'suspended') {
            Response::json(['message' => 'Not authorized, account suspended'], 403);
            return null;
        }

        return $admin;
    }

    /**
     * @return array<string, mixed>
     */
    private function maybeRefreshPublicMatches(): array
    {
        $trigger = strtolower(trim((string) ($_GET['trigger'] ?? 'view')));
        if ($trigger === '') {
            $trigger = 'view';
        }
        $manualRefresh = $this->isTruthy($_GET['refresh'] ?? null) || $trigger === 'manual';
        $cacheTtl = $this->envInt('SPORTSBOOK_PUBLIC_CACHE_TTL_SECONDS', self::DEFAULT_PUBLIC_CACHE_TTL_SECONDS);
        $cooldownSeconds = $this->envInt('SPORTSBOOK_PUBLIC_REFRESH_COOLDOWN_SECONDS', self::DEFAULT_PUBLIC_REFRESH_COOLDOWN_SECONDS);
        $lockSeconds = $this->envInt('SPORTSBOOK_PUBLIC_REFRESH_LOCK_SECONDS', self::DEFAULT_PUBLIC_REFRESH_LOCK_SECONDS);
        $lockSeconds = max(5, min($lockSeconds, $cooldownSeconds));

        $snapshot = SportsbookHealth::sportsbookSnapshot($this->db);
        $syncAgeSeconds = $this->safeInt($snapshot['oddsSync']['syncAgeSeconds'] ?? null);
        $lastSuccessAt = (string) ($snapshot['oddsSync']['lastSuccessAt'] ?? '');
        $isFresh = $syncAgeSeconds !== null && $syncAgeSeconds <= $cacheTtl;

        $meta = [
            'state' => 'cache_hit',
            'trigger' => $trigger,
            'manual' => $manualRefresh,
            'refreshed' => false,
            'attempted' => false,
            'cacheTtlSeconds' => $cacheTtl,
            'cooldownSeconds' => $cooldownSeconds,
            'cooldownRemainingSeconds' => 0,
            'syncAgeSeconds' => $syncAgeSeconds,
            'lastSuccessAt' => $lastSuccessAt !== '' ? $lastSuccessAt : null,
        ];

        if ($isFresh && !$manualRefresh) {
            return $meta;
        }

        $lockName = $this->publicRefreshLockName();
        $ownsLock = $this->db->acquireNamedLock($lockName, 0);
        try {
            if (!$ownsLock) {
                $ownsLock = $this->db->acquireNamedLock($lockName, $lockSeconds);
                if (!$ownsLock) {
                    $state = $this->publicRefreshState();
                    $meta['state'] = 'refresh_in_progress';
                    $meta['cooldownRemainingSeconds'] = $this->refreshInProgressRemainingSeconds($state, $lockSeconds);
                    return $meta;
                }

                $postWait = $this->refreshSnapshotMeta($cacheTtl);
                $meta['syncAgeSeconds'] = $postWait['syncAgeSeconds'];
                $meta['lastSuccessAt'] = $postWait['lastSuccessAt'];

                if (($postWait['isFresh'] ?? false) === true) {
                    $meta['state'] = 'refreshed_by_peer';
                    $meta['refreshed'] = true;
                    return $meta;
                }
            }

            $state = $this->publicRefreshState();
            $latest = $this->refreshSnapshotMeta($cacheTtl);
            $meta['syncAgeSeconds'] = $latest['syncAgeSeconds'];
            $meta['lastSuccessAt'] = $latest['lastSuccessAt'];

            if (($latest['isFresh'] ?? false) === true && !$manualRefresh) {
                return $meta;
            }

            $cooldownRemaining = $this->refreshCooldownRemaining($state, $cooldownSeconds);
            if (!$manualRefresh && $cooldownRemaining > 0) {
                $meta['state'] = 'stale_cached';
                $meta['cooldownRemainingSeconds'] = $cooldownRemaining;
                return $meta;
            }

            $attemptedAt = SqlRepository::nowUtc();
            $this->writePublicRefreshState($state, [
                'lastRefreshAttemptAt' => $attemptedAt,
                'lastRefreshStatus' => 'running',
                'lastRefreshTrigger' => $trigger,
                'lastRefreshSource' => 'public_matches',
                'lastRefreshError' => null,
                'refreshInProgress' => true,
                'cacheTtlSeconds' => $cacheTtl,
                'cooldownSeconds' => $cooldownSeconds,
                'updatedAt' => $attemptedAt,
            ]);

            $meta['attempted'] = true;

            try {
                OddsSyncService::updateMatches($this->db, 'public_matches');
                $finishedAt = SqlRepository::nowUtc();
                $postSnapshot = $this->refreshSnapshotMeta($cacheTtl);

                $this->writePublicRefreshState($state, [
                    'lastRefreshAttemptAt' => $attemptedAt,
                    'lastRefreshFinishedAt' => $finishedAt,
                    'lastRefreshSuccessAt' => $postSnapshot['lastSuccessAt'] ?? $finishedAt,
                    'lastRefreshStatus' => 'success',
                    'lastRefreshTrigger' => $trigger,
                    'lastRefreshSource' => 'public_matches',
                    'lastRefreshError' => null,
                    'refreshInProgress' => false,
                    'cacheTtlSeconds' => $cacheTtl,
                    'cooldownSeconds' => $cooldownSeconds,
                    'updatedAt' => $finishedAt,
                ]);

                $meta['state'] = 'refreshed';
                $meta['refreshed'] = true;
                $meta['syncAgeSeconds'] = $postSnapshot['syncAgeSeconds'];
                $meta['lastSuccessAt'] = $postSnapshot['lastSuccessAt'];
                return $meta;
            } catch (Throwable $e) {
                $finishedAt = SqlRepository::nowUtc();
                $this->writePublicRefreshState($state, [
                    'lastRefreshAttemptAt' => $attemptedAt,
                    'lastRefreshFinishedAt' => $finishedAt,
                    'lastRefreshSuccessAt' => $state['lastRefreshSuccessAt'] ?? null,
                    'lastRefreshStatus' => 'failed',
                    'lastRefreshTrigger' => $trigger,
                    'lastRefreshSource' => 'public_matches',
                    'lastRefreshError' => $e->getMessage(),
                    'refreshInProgress' => false,
                    'cacheTtlSeconds' => $cacheTtl,
                    'cooldownSeconds' => $cooldownSeconds,
                    'updatedAt' => $finishedAt,
                ]);

                $meta['state'] = 'refresh_failed';
                $meta['error'] = $e->getMessage();
                $meta['cooldownRemainingSeconds'] = $manualRefresh ? 0 : $cooldownSeconds;
                return $meta;
            }
        } finally {
            if ($ownsLock) {
                $this->db->releaseNamedLock($lockName);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function publicRefreshState(): array
    {
        $existing = $this->db->findOne('sportsbookcache', ['id' => self::PUBLIC_CACHE_DOC_ID]);
        if (is_array($existing)) {
            return $existing;
        }

        $createdAt = SqlRepository::nowUtc();
        $this->db->insertOneIfAbsent('sportsbookcache', [
            'id' => self::PUBLIC_CACHE_DOC_ID,
            'lastRefreshAttemptAt' => null,
            'lastRefreshFinishedAt' => null,
            'lastRefreshSuccessAt' => null,
            'lastRefreshStatus' => 'idle',
            'lastRefreshTrigger' => null,
            'lastRefreshSource' => null,
            'lastRefreshError' => null,
            'refreshInProgress' => false,
            'createdAt' => $createdAt,
            'updatedAt' => $createdAt,
        ]);

        return $this->db->findOne('sportsbookcache', ['id' => self::PUBLIC_CACHE_DOC_ID]) ?? [];
    }

    /**
     * @param array<string, mixed> $state
     * @param array<string, mixed> $changes
     */
    private function writePublicRefreshState(array $state, array $changes): void
    {
        $createdAt = (string) ($state['createdAt'] ?? '');
        $doc = array_merge($state, $changes, [
            'id' => self::PUBLIC_CACHE_DOC_ID,
            'createdAt' => $createdAt !== '' ? $createdAt : SqlRepository::nowUtc(),
        ]);
        $this->db->insertOne('sportsbookcache', $doc);
    }

    /**
     * @return array{syncAgeSeconds: ?int, lastSuccessAt: ?string, isFresh: bool}
     */
    private function refreshSnapshotMeta(int $cacheTtl): array
    {
        $snapshot = SportsbookHealth::sportsbookSnapshot($this->db);
        $syncAgeSeconds = $this->safeInt($snapshot['oddsSync']['syncAgeSeconds'] ?? null);
        $lastSuccessAt = (string) ($snapshot['oddsSync']['lastSuccessAt'] ?? '');

        return [
            'syncAgeSeconds' => $syncAgeSeconds,
            'lastSuccessAt' => $lastSuccessAt !== '' ? $lastSuccessAt : null,
            'isFresh' => $syncAgeSeconds !== null && $syncAgeSeconds <= $cacheTtl,
        ];
    }

    private function refreshCooldownRemaining(array $state, int $cooldownSeconds): int
    {
        $lastAttemptAt = (string) ($state['lastRefreshAttemptAt'] ?? '');
        $lastAttemptAge = $this->ageSeconds($lastAttemptAt);
        return $lastAttemptAge === null ? 0 : max(0, $cooldownSeconds - $lastAttemptAge);
    }

    private function refreshInProgressRemainingSeconds(array $state, int $lockSeconds): int
    {
        $lastAttemptAt = (string) ($state['lastRefreshAttemptAt'] ?? '');
        $lastAttemptAge = $this->ageSeconds($lastAttemptAt);
        if ($lastAttemptAge === null) {
            return $lockSeconds;
        }

        return max(1, $lockSeconds - $lastAttemptAge);
    }

    private function publicRefreshLockName(): string
    {
        $dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
        return self::PUBLIC_REFRESH_LOCK_PREFIX . substr(sha1($dbName), 0, 12);
    }

    /**
     * @param array<string, mixed> $meta
     */
    private function emitPublicCacheHeaders(array $meta): void
    {
        header('X-Sportsbook-Cache-State: ' . (string) ($meta['state'] ?? 'unknown'));
        header('X-Sportsbook-Cache-TTL: ' . (int) ($meta['cacheTtlSeconds'] ?? self::DEFAULT_PUBLIC_CACHE_TTL_SECONDS));
        header('X-Sportsbook-Refresh-Cooldown: ' . (int) ($meta['cooldownRemainingSeconds'] ?? 0));
        header('X-Sportsbook-Refresh-Attempted: ' . (($meta['attempted'] ?? false) ? 'true' : 'false'));
        header('X-Sportsbook-Refresh-Trigger: ' . (string) ($meta['trigger'] ?? 'view'));
        if (isset($meta['syncAgeSeconds']) && $meta['syncAgeSeconds'] !== null) {
            header('X-Sportsbook-Sync-Age: ' . (int) $meta['syncAgeSeconds']);
        }
    }

    private function safeInt(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }

    private function ageSeconds(?string $value): ?int
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        $parsed = strtotime($value);
        if ($parsed === false) {
            return null;
        }
        return max(0, time() - $parsed);
    }

    private function envInt(string $key, int $default): int
    {
        $raw = Env::get($key, (string) $default);
        return is_numeric($raw) ? max(1, (int) $raw) : $default;
    }

    private function isTruthy(mixed $value): bool
    {
        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
    }

    private function streamMatches(): void
    {
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');

        $maxRuntime = 55;
        $pollSeconds = 2;
        $startedAt = time();
        $lastSeen = SqlRepository::nowUtc();

        echo ": stream-open\n\n";
        @ob_flush();
        @flush();

        while ((time() - $startedAt) < $maxRuntime) {
            try {
                $updated = $this->db->findMany('matches', ['updatedAt' => ['$gte' => $lastSeen]], ['sort' => ['updatedAt' => 1]]);
                $snapshot = SportsbookHealth::sportsbookSnapshot($this->db);
                foreach ($updated as $match) {
                    if (!is_array($match)) {
                        continue;
                    }
                    $annotated = SportsbookHealth::applyBettingAvailability($this->db, $match, $snapshot);
                    if (($annotated['isPublicVisible'] ?? false) !== true) {
                        continue;
                    }
                    echo "event: matchUpdate\n";
                    echo 'data: ' . json_encode($annotated, JSON_UNESCAPED_SLASHES) . "\n\n";
                }
            } catch (Throwable $e) {
                // Keep stream alive even if one poll fails.
            }

            $lastSeen = SqlRepository::nowUtc();
            echo ": ping\n\n";
            @ob_flush();
            @flush();
            sleep($pollSeconds);
        }
    }
}
