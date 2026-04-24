<?php

declare(strict_types=1);


final class MatchesController
{
    private const PUBLIC_CACHE_DOC_ID = 'sportsbook_public_matches';
    private const PUBLIC_REFRESH_LOCK_PREFIX = 'sportsbook_public_matches_refresh_';
    private const DEFAULT_PUBLIC_CACHE_TTL_SECONDS = 120;
    private const DEFAULT_PUBLIC_REFRESH_COOLDOWN_SECONDS = 120;
    private const DEFAULT_PUBLIC_REFRESH_LOCK_SECONDS = 30;
    private const DEFAULT_SHARED_MATCHES_CACHE_TTL_SECONDS = 120;
    private const DEFAULT_SHARED_SPORTS_CACHE_TTL_SECONDS = 60;

    private SqlRepository $db;
    private string $jwtSecret;
    private ?Closure $deferredSyncRunner = null;

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

        if ($method === 'GET' && preg_match('#^/api/matches/([a-fA-F0-9]{24})/props$#', $path, $m) === 1) {
            $this->getMatchProps($m[1]);
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

        if ($method === 'POST' && preg_match('#^/api/odds/refresh/([a-z][a-z0-9_]{1,79})$#', $path, $m) === 1) {
            $this->refreshSport($m[1]);
            return true;
        }

        return false;
    }

    private function getMatches(): void
    {
        $status = isset($_GET['status']) ? strtolower(trim((string) $_GET['status'])) : '';
        $active = isset($_GET['active']) ? strtolower(trim((string) $_GET['active'])) : '';
        $payloadMode = $this->normalizePayloadMode((string) ($_GET['payload'] ?? 'full'));
        $sportFilter = isset($_GET['sport']) ? trim((string) $_GET['sport']) : '';
        $sportKeyFilter = isset($_GET['sportKey']) ? trim((string) $_GET['sportKey']) : '';
        $sharedCacheTtl = $this->envInt('SPORTSBOOK_MATCHES_CACHE_TTL_SECONDS', self::DEFAULT_SHARED_MATCHES_CACHE_TTL_SECONDS);
        $cacheNamespace = SportsbookCache::publicMatchesNamespace();
        $sportCacheSegment = ($sportFilter !== '' || $sportKeyFilter !== '')
            ? '|sport:' . strtolower($sportFilter) . '|sportKey:' . strtolower($sportKeyFilter)
            : '';
        $cacheKey = SportsbookCache::publicMatchesKey($status . '|payload:' . $payloadMode . $sportCacheSegment, $active);
        // Read stale data NOW before any TTL-enforcing get() may delete the expired file.
        // This is the fallback used if the fresh-data path throws an exception under load.
        $staleForFallback = SharedFileCache::peek($cacheNamespace, $cacheKey);

        try {
            $cacheMeta = $this->maybeRefreshPublicMatches();
            $annotated = SharedFileCache::get($cacheNamespace, $cacheKey, $sharedCacheTtl);
            $sharedCacheState = is_array($annotated) ? 'hit' : 'miss';

            if (!is_array($annotated)) {
                $annotated = SharedFileCache::remember(
                    $cacheNamespace,
                    $cacheKey,
                    $sharedCacheTtl,
                    fn(): array => $this->computeMatches($status, $active, $payloadMode, $sportFilter, $sportKeyFilter)
                );
            }

            header('X-Matches-Shared-Cache: ' . $sharedCacheState);
            header('X-Cache: ' . ($sharedCacheState === 'hit' ? 'HIT' : 'MISS'));
            header('X-Matches-Payload-Mode: ' . $payloadMode);
            $this->emitPublicCacheHeaders($cacheMeta);
            // Manual-refresh paths are uncacheable by intermediaries: the payload
            // is intentionally the pre-sync snapshot, and a follow-up refetch will
            // pick up the freshly-synced odds.
            if (!empty($cacheMeta['syncDeferred'])) {
                Response::json($annotated, 200, 'private, no-cache, no-store, must-revalidate');
            } else {
                $upstreamCacheTtl = (int) ($cacheMeta['cacheTtlSeconds'] ?? self::DEFAULT_PUBLIC_CACHE_TTL_SECONDS);
                $responseCacheTtl = max(1, min($upstreamCacheTtl, $sharedCacheTtl));
                Response::json($annotated, 200, "public, max-age={$responseCacheTtl}");
            }
            $this->runDeferredSync();
        } catch (Throwable $e) {
            // Fallback to stale cache to keep the public matches endpoint available
            // during transient database contention and avoid 5xx spikes.
            if (is_array($staleForFallback)) {
                header('X-Matches-Fallback: stale-cache');
                header('X-Cache: STALE');
                Response::json($staleForFallback, 200, 'public, max-age=5, stale-while-revalidate=60');
                return;
            }
            Response::json(['message' => 'Server Error fetching matches'], 500);
        }
    }

    private function computeMatches(string $status, string $active, string $payloadMode = 'full', string $sportFilter = '', string $sportKeyFilter = ''): array
    {
        $dbFilter = [];
        $desiredStatus = $status === 'active' ? 'live' : $status;
        $defaultPublicView = ($status === '' && $active === '');
        
        if ($desiredStatus === 'live') {
            // Include DB-scheduled rows so auto-promoted "effectively live"
            // matches (startTime passed + fresh odds) are not filtered out
            // at the SQL layer. Final live-only filtering happens in PHP
            // against the annotated effective status.
            $dbFilter['status'] = ['$in' => ['scheduled', 'live']];
        } elseif ($desiredStatus === 'scheduled') {
            $dbFilter['status'] = 'scheduled';
        } elseif ($desiredStatus === 'finished') {
            $dbFilter['status'] = 'finished';
        } elseif ($desiredStatus === 'upcoming') {
            $dbFilter['status'] = 'scheduled';
        } elseif ($desiredStatus === 'live-upcoming' || $desiredStatus === 'active-upcoming') {
            $dbFilter['status'] = ['$in' => ['scheduled', 'live']];
        } elseif ($defaultPublicView) {
            $dbFilter['status'] = ['$in' => ['scheduled', 'live']];
        }
        
        $queryOptions = ['sort' => ['startTime' => 1]];
        $coreSqlProjectionEnabled = $this->isTruthy(Env::get('SPORTSBOOK_CORE_SQL_PROJECTION', 'false'));
        if ($payloadMode === 'core' && $coreSqlProjectionEnabled) {
            $queryOptions['projection'] = [
                'id' => 1,
                'externalId' => 1,
                'homeTeam' => 1,
                'awayTeam' => 1,
                'startTime' => 1,
                'sport' => 1,
                'sportKey' => 1,
                'status' => 1,
                'odds' => 1,
                'score' => 1,
                'lastUpdated' => 1,
                'lastOddsSyncAt' => 1,
                'lastScoreSyncAt' => 1,
                'updatedAt' => 1,
                'createdAt' => 1,
            ];
        }

        $matches = $this->db->findMany('matches', $dbFilter, $queryOptions);
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
        } elseif ($desiredStatus === 'live') {
            $annotated = array_values(array_filter($annotated, static fn (array $match): bool => strtolower((string) ($match['status'] ?? '')) === 'live'));
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
        } elseif ($defaultPublicView && !isset($dbFilter['status'])) {
            $annotated = array_values(array_filter($annotated, static function (array $match): bool {
                $matchStatus = strtolower((string) ($match['status'] ?? ''));
                return in_array($matchStatus, ['scheduled', 'live'], true);
            }));
        }

        // Once commence_time passes, hide the match from pre-match listings.
        // We don't offer live betting, so a started match has no UI home.
        // Settlement / scores polling runs on a separate path and is not
        // affected. `status=finished` / `status=all` opt out so admin and
        // audit tooling can still pull historical rows.
        if (!in_array($desiredStatus, ['finished', 'all'], true)) {
            $now = time();
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($now): bool {
                $startTime = (string) ($match['startTime'] ?? '');
                $parsed = $startTime !== '' ? strtotime($startTime) : false;
                return $parsed === false || $parsed > $now;
            }));
        }

        // Sport filter: matches either `sport` (title, e.g. "IPL") or
        // `sportKey` (Odds API slug, e.g. "cricket_ipl"). Substring match
        // is intentional so a single keyword catches title variants.
        if ($sportFilter !== '' || $sportKeyFilter !== '') {
            $needleSport = strtolower($sportFilter);
            $needleSportKey = strtolower($sportKeyFilter);
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($needleSport, $needleSportKey): bool {
                $sport = strtolower((string) ($match['sport'] ?? ''));
                $sportKey = strtolower((string) ($match['sportKey'] ?? ''));
                if ($needleSport !== '' && $sport !== '' && strpos($sport, $needleSport) !== false) {
                    return true;
                }
                if ($needleSportKey !== '' && $sportKey !== '' && strpos($sportKey, $needleSportKey) !== false) {
                    return true;
                }
                return false;
            }));
        }

        if ($payloadMode === 'core') {
            $annotated = array_map(fn(array $match): array => $this->coreMatchPayload($match), $annotated);
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
     * Lazy-load extended markets + player props for a single match. Triggers a
     * per-event fetch against The Odds API if the cached props are stale.
     */
    private function getMatchProps(string $id): void
    {
        try {
            $result = OddsSyncService::ensureEventExtendedOdds($this->db, $id);
            $payload = [
                'matchId' => $id,
                'cached' => (bool) ($result['cached'] ?? false),
                'extendedMarkets' => is_array($result['markets'] ?? null) ? $result['markets'] : [],
                'playerProps' => is_array($result['playerProps'] ?? null) ? $result['playerProps'] : [],
            ];
            $ttl = (bool) ($result['cached'] ?? false) ? 60 : 30;
            Response::json($payload, 200, "public, max-age={$ttl}");
        } catch (Throwable $e) {
            Response::json(['message' => 'Server Error fetching props'], 500);
        }
    }

    /**
     * Return distinct sport values from visible matches so the frontend can
     * highlight which categories currently have data.
     */
    private function getAvailableSports(): void
    {
        try {
            $sharedCacheTtl = $this->envInt('SPORTSBOOK_MATCHES_SPORTS_CACHE_TTL_SECONDS', self::DEFAULT_SHARED_SPORTS_CACHE_TTL_SECONDS);
            $sports = SharedFileCache::get(
                SportsbookCache::availableSportsNamespace(),
                SportsbookCache::availableSportsKey(),
                $sharedCacheTtl
            );
            $sharedCacheState = is_array($sports) ? 'hit' : 'miss';

            if (!is_array($sports)) {
                $sports = SharedFileCache::remember(
                    SportsbookCache::availableSportsNamespace(),
                    SportsbookCache::availableSportsKey(),
                    $sharedCacheTtl,
                    fn(): array => $this->computeAvailableSports()
                );
            }

            header('X-Matches-Sports-Shared-Cache: ' . $sharedCacheState);
            header('X-Cache: ' . ($sharedCacheState === 'hit' ? 'HIT' : 'MISS'));
            Response::json($sports, 200, "public, max-age={$sharedCacheTtl}");
        } catch (Throwable $e) {
            Response::json([], 200, 'public, max-age=5');
        }
    }

    /**
     * @return array<int, string>
     */
    private function computeAvailableSports(): array
    {
        // Only include sports whose matches have at least one posted odds
        // market. Upstream (Odds API) frequently returns events for minor
        // leagues with zero bookmaker coverage in the configured region;
        // emitting those in the sidebar leads to empty "CRICKET PSL"
        // style entries that click through to nothing.
        $matches = $this->db->findMany(
            'matches',
            ['status' => ['$in' => ['scheduled', 'live']]],
            ['projection' => ['sport' => 1, 'sportKey' => 1, 'status' => 1, 'odds' => 1]]
        );
        $sports = [];
        foreach ($matches as $match) {
            if (!is_array($match)) {
                continue;
            }
            $status = strtolower((string) ($match['status'] ?? ''));
            if (!in_array($status, ['scheduled', 'live'], true)) {
                continue;
            }
            $odds = $match['odds'] ?? null;
            $markets = is_array($odds) ? ($odds['markets'] ?? null) : null;
            if (!is_array($markets) || count($markets) === 0) {
                continue;
            }
            $sport = (string) ($match['sport'] ?? '');
            $sportKey = (string) ($match['sportKey'] ?? '');
            if ($sport !== '') {
                $sports[$sport] = true;
            }
            if ($sportKey !== '') {
                $sports[$sportKey] = true;
            }
        }

        return array_values(array_keys($sports));
    }

    public static function clearSharedPublicCaches(): void
    {
        SportsbookCache::invalidatePublicMatchCaches();
        SportsbookHealth::invalidateSnapshotCache();
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

    /**
     * Resolve the authenticated actor (user / agent / admin) from the Bearer
     * token. Sends 401/403 directly on failure and returns null.
     *
     * @return array<string,mixed>|null
     */
    private function protectAny(): ?array
    {
        $auth = Http::header('authorization');
        if (!str_starts_with($auth, 'Bearer ')) {
            Response::json(['success' => false, 'error' => 'login_required'], 401);
            return null;
        }
        $token = trim(substr($auth, 7));
        try {
            $decoded = Jwt::decode($token, $this->jwtSecret);
        } catch (Throwable $e) {
            Response::json(['success' => false, 'error' => 'login_required'], 401);
            return null;
        }
        $id = (string) ($decoded['id'] ?? '');
        if ($id === '' || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
            Response::json(['success' => false, 'error' => 'login_required'], 401);
            return null;
        }
        $role = (string) ($decoded['role'] ?? 'user');
        $collection = ($role === 'admin') ? 'admins' : (in_array($role, ['agent', 'master_agent', 'super_agent'], true) ? 'agents' : 'users');
        $actor = $this->db->findOne($collection, ['id' => SqlRepository::id($id)]);
        if ($actor === null) {
            Response::json(['success' => false, 'error' => 'login_required'], 403);
            return null;
        }
        if (($actor['status'] ?? '') === 'suspended') {
            Response::json(['success' => false, 'error' => 'account_suspended'], 403);
            return null;
        }
        $actor['_role'] = $role;
        return $actor;
    }

    /**
     * POST /api/odds/refresh/{sport_key}
     * User-triggered on-demand refresh of a single sport's odds + scores.
     *
     * Rate limits (multi-layer, each sends 429 on block):
     *   - per-IP: 15 per 60s (RATE_LIMIT_REFRESH_ODDS_IP_*)
     *   - per-user: 10 per 60s (RATE_LIMIT_REFRESH_ODDS_USER_*)
     *
     * In-flight dedup: SharedFileCache::remember with a 20s TTL keyed on the
     * sport. Concurrent callers during an in-flight refresh share the result
     * from the first caller's upstream fetch — one credit-consuming call.
     */
    private function refreshSport(string $sportKey): void
    {
        $startedAt = microtime(true);

        $actor = $this->protectAny();
        if ($actor === null) return;
        $userId = (string) ($actor['id'] ?? '');

        $ipMax = max(1, (int) Env::get('ODDS_REFRESH_IP_LIMIT_MAX', '15'));
        $ipWindow = max(1, (int) Env::get('ODDS_REFRESH_IP_LIMIT_WINDOW_SECONDS', '60'));
        $userMax = max(1, (int) Env::get('ODDS_REFRESH_USER_LIMIT_MAX', '10'));
        $userWindow = max(1, (int) Env::get('ODDS_REFRESH_USER_LIMIT_WINDOW_SECONDS', '60'));
        $dedupWindow = max(1, (int) Env::get('ODDS_REFRESH_DEDUP_WINDOW_SECONDS', '20'));

        $ipKey = $this->clientIpKey();
        if (RateLimiter::enforce($this->db, 'refresh_odds_ip', $ipMax, $ipWindow)) {
            return;
        }
        $userAllowed = RateLimiter::checkLimit($this->db, 'user:' . $userId, 'refresh_odds_user', $userMax, $userWindow);
        if (!$userAllowed) {
            $retry = RateLimiter::getRemainingSeconds($this->db, 'user:' . $userId, 'refresh_odds_user', $userWindow);
            Response::json(['success' => false, 'error' => 'rate_limited', 'retry_after_seconds' => max(1, $retry)], 429);
            return;
        }

        // In-flight dedup: first caller runs the upstream fetch; concurrent
        // callers within the 20s window get the cached payload from that call.
        $result = SharedFileCache::remember(
            'sportsbook-on-demand-refresh',
            $sportKey,
            $dedupWindow,
            fn(): array => OddsSyncService::syncSingleSport($this->db, $sportKey)
        );

        $elapsedMs = (int) round((microtime(true) - $startedAt) * 1000);
        $dedupHit = $elapsedMs < 200; // cache hit returned instantly
        $success = (bool) ($result['success'] ?? false);

        Logger::info('odds_on_demand_refresh', [
            'userId' => $userId,
            'role' => (string) ($actor['_role'] ?? ''),
            'sport' => $sportKey,
            'ipHash' => substr(hash('sha256', $ipKey), 0, 16),
            // 4 credits per refresh: odds call (3 markets × 1 region) + scores (1).
            // Header `x-requests-used` reports the cumulative total; per-call cost
            // is deterministic given our markets/regions config, so log that instead.
            'creditsConsumed' => 4,
            'creditsCumulativeAfter' => $result['credits_used'] ?? null,
            'dedupHit' => $dedupHit,
            'success' => $success,
            'responseTimeMs' => $elapsedMs,
            'error' => $result['error'] ?? null,
        ], 'sportsbook');

        $responseBody = [
            'success' => $success,
            'sport_key' => $sportKey,
            'last_updated' => $result['last_updated'] ?? gmdate(DATE_ATOM),
            'matches' => $result['matches'] ?? [],
            'dedup_hit' => $dedupHit,
        ];
        if (!$success && isset($result['error'])) {
            $responseBody['error'] = $result['error'];
        }
        Response::json($responseBody, $success ? 200 : 502);
    }

    private function clientIpKey(): string
    {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $k) {
            $v = (string) ($_SERVER[$k] ?? '');
            if ($v !== '') return trim(explode(',', $v)[0]);
        }
        return 'unknown';
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
        $autoRefreshEnabled = $this->isTruthy(Env::get('SPORTSBOOK_PUBLIC_AUTO_REFRESH', 'false'));
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

        // Protect the public read path under load: refreshes should happen via cron/manual.
        if (!$manualRefresh && !$autoRefreshEnabled) {
            $meta['state'] = 'stale_cached';
            $meta['cooldownRemainingSeconds'] = $cooldownSeconds;
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

            // Manual refresh path: respond immediately with current data and run
            // the (slow) upstream odds sync after the response has been flushed.
            // Hands the named lock off to the deferred runner so a concurrent
            // manual refresh still sees refresh_in_progress until this one ends.
            if ($manualRefresh) {
                $lockHandoff = $ownsLock;
                $ownsLock = false;
                $db = $this->db;
                $this->deferredSyncRunner = function () use (
                    $db,
                    $state,
                    $attemptedAt,
                    $trigger,
                    $cacheTtl,
                    $cooldownSeconds,
                    $lockName,
                    $lockHandoff
                ): void {
                    try {
                        OddsSyncService::updateMatches($db, 'public_matches_async');
                        $finishedAt = SqlRepository::nowUtc();
                        $this->writePublicRefreshState($state, [
                            'lastRefreshAttemptAt' => $attemptedAt,
                            'lastRefreshFinishedAt' => $finishedAt,
                            'lastRefreshSuccessAt' => $finishedAt,
                            'lastRefreshStatus' => 'success',
                            'lastRefreshTrigger' => $trigger,
                            'lastRefreshSource' => 'public_matches_async',
                            'lastRefreshError' => null,
                            'refreshInProgress' => false,
                            'cacheTtlSeconds' => $cacheTtl,
                            'cooldownSeconds' => $cooldownSeconds,
                            'updatedAt' => $finishedAt,
                        ]);
                        // Bust shared caches so the client's follow-up refetch
                        // (scheduled ~4s after the initial response) returns the
                        // newly synced odds instead of the stale cached payload.
                        self::clearSharedPublicCaches();
                    } catch (Throwable $e) {
                        $finishedAt = SqlRepository::nowUtc();
                        $this->writePublicRefreshState($state, [
                            'lastRefreshAttemptAt' => $attemptedAt,
                            'lastRefreshFinishedAt' => $finishedAt,
                            'lastRefreshSuccessAt' => $state['lastRefreshSuccessAt'] ?? null,
                            'lastRefreshStatus' => 'failed',
                            'lastRefreshTrigger' => $trigger,
                            'lastRefreshSource' => 'public_matches_async',
                            'lastRefreshError' => $e->getMessage(),
                            'refreshInProgress' => false,
                            'cacheTtlSeconds' => $cacheTtl,
                            'cooldownSeconds' => $cooldownSeconds,
                            'updatedAt' => $finishedAt,
                        ]);
                        Logger::exception($e, 'Deferred odds sync failed');
                    } finally {
                        if ($lockHandoff) {
                            $db->releaseNamedLock($lockName);
                        }
                    }
                };

                $meta['state'] = 'refresh_deferred';
                $meta['syncDeferred'] = true;
                $meta['refreshed'] = false;
                return $meta;
            }

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
        if (!empty($meta['syncDeferred'])) {
            header('X-Sportsbook-Sync-Deferred: true');
            // CORS preflight already exposes the other X-Sportsbook-* headers,
            // but browsers also need to see this one from a cross-origin fetch.
            header('Access-Control-Expose-Headers: X-Sportsbook-Cache-State, X-Sportsbook-Cache-TTL, X-Sportsbook-Refresh-Cooldown, X-Sportsbook-Refresh-Attempted, X-Sportsbook-Refresh-Trigger, X-Sportsbook-Sync-Age, X-Sportsbook-Sync-Deferred', false);
        }
        if (isset($meta['syncAgeSeconds']) && $meta['syncAgeSeconds'] !== null) {
            header('X-Sportsbook-Sync-Age: ' . (int) $meta['syncAgeSeconds']);
        }
    }

    private function runDeferredSync(): void
    {
        if ($this->deferredSyncRunner === null) {
            return;
        }
        $runner = $this->deferredSyncRunner;
        $this->deferredSyncRunner = null;

        // The PHP built-in server (SAPI "cli-server") buffers the response
        // until the script exits, so there's nothing to gain from "flushing
        // first then syncing" — the client would wait anyway. Run the sync
        // inline in that case so dev behavior stays correct.
        $canFlushEarly = function_exists('fastcgi_finish_request')
            || function_exists('litespeed_finish_request');

        if (!$canFlushEarly) {
            try {
                $runner();
            } catch (Throwable $e) {
                Logger::exception($e, 'Inline sync fallback failed');
            }
            return;
        }

        @ignore_user_abort(true);
        @set_time_limit(0);

        if (function_exists('fastcgi_finish_request')) {
            @fastcgi_finish_request();
        } else {
            @litespeed_finish_request();
        }

        try {
            $runner();
        } catch (Throwable $e) {
            Logger::exception($e, 'Deferred sync runner crashed');
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

    private function normalizePayloadMode(string $value): string
    {
        $mode = strtolower(trim($value));
        return $mode === 'core' ? 'core' : 'full';
    }

    /**
     * Drop heavy fields for list views while preserving the shape needed by UI cards.
     *
     * @param array<string, mixed> $match
     * @return array<string, mixed>
     */
    private function coreMatchPayload(array $match): array
    {
        // playerProps are large and only needed on the match-detail view
        // (fetched via /api/matches/{id}/props). Keep them stripped.
        unset($match['playerProps']);

        // extendedMarkets contains period markets (F1/F5 for baseball,
        // Q1-Q4 for basketball/football, P1-P3 for hockey, alt lines,
        // team totals). The list view needs them so period tabs can
        // render and switch instantly without a per-match fetch.
        return $match;
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
