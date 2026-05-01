<?php

declare(strict_types=1);


final class MatchesController
{
    private const PUBLIC_CACHE_DOC_ID = 'sportsbook_public_matches';
    private const PUBLIC_REFRESH_LOCK_PREFIX = 'sportsbook_public_matches_refresh_';
    // Odds (matches) cache is intentionally 0 — live betting must always
    // read fresh odds from the database. This value must NOT be increased.
    private const DEFAULT_PUBLIC_CACHE_TTL_SECONDS = 0;
    private const DEFAULT_PUBLIC_REFRESH_COOLDOWN_SECONDS = 0;
    private const DEFAULT_PUBLIC_REFRESH_LOCK_SECONDS = 30; // refresh lock is concurrency, not staleness — keep
    private const DEFAULT_SHARED_MATCHES_CACHE_TTL_SECONDS = 5;
    // Sports list is just sport *names* (e.g. "NFL", "NBA") — no odds, no
    // prices. Caching at 30 s cuts the sidebar query from 20k * 1/30 = ~667
    // DB reads/sec to ~1 DB read per 30 s, with no risk of stale odds.
    private const DEFAULT_SHARED_SPORTS_CACHE_TTL_SECONDS = 30;
    private const NO_STORE_HEADER = 'no-store, no-cache, must-revalidate, max-age=0, private';

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

        if ($method === 'POST' && $path === '/api/odds/refresh-multi') {
            $this->refreshSports();
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
        // ?limit=N — clamp to [1,200]. Applied AFTER cache read so a single
        // cached row-set serves every limit value cheaply. Used by the
        // default landing view to ask for just the top 6 freshest rows.
        $rawLimit = isset($_GET['limit']) ? (int) $_GET['limit'] : 0;
        $limit = $rawLimit > 0 ? min(200, $rawLimit) : 0;
        $sharedCacheTtl = $this->envInt('SPORTSBOOK_MATCHES_CACHE_TTL_SECONDS', self::DEFAULT_SHARED_MATCHES_CACHE_TTL_SECONDS);
        $cacheNamespace = SportsbookCache::publicMatchesNamespace();
        $sportCacheSegment = ($sportFilter !== '' || $sportKeyFilter !== '')
            ? '|sport:' . strtolower($sportFilter) . '|sportKey:' . strtolower($sportKeyFilter)
            : '';
        $cacheKey = SportsbookCache::publicMatchesKey($status . '|payload:' . $payloadMode . $sportCacheSegment, $active);
        $staleNamespace = SportsbookCache::publicMatchesStaleNamespace();
        // Read stale data NOW before any TTL-enforcing get() may delete the expired file.
        // Two sources, in priority order:
        //   1. The dedicated stale-fallback namespace, written on every successful
        //      compute regardless of live TTL — this is the resilient path that
        //      survives the current TTL=0 (no-cache) configuration.
        //   2. The legacy live cache, only useful when TTL>0.
        $staleForFallback = SharedFileCache::peek($staleNamespace, $cacheKey)
            ?? ($sharedCacheTtl > 0 ? SharedFileCache::peek($cacheNamespace, $cacheKey) : null);

        try {
            $cacheMeta = $this->maybeRefreshPublicMatches();

            // Operators can still force a read-through mode with TTL <= 0.
            // Production defaults to a tiny shared cache so large public
            // traffic bursts do not stampede MySQL while odds drift remains
            // bounded to a few seconds.
            if ($sharedCacheTtl <= 0) {
                $annotated = $this->computeMatches($status, $active, $payloadMode, $sportFilter, $sportKeyFilter);
                $sharedCacheState = 'bypass';
            } else {
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
            }

            // Refresh the stale-fallback copy with this successful response.
            // Independent of $sharedCacheTtl so the fallback exists even when
            // live caching is disabled.
            if (is_array($annotated)) {
                SharedFileCache::put($staleNamespace, $cacheKey, $annotated);
            }

            header('X-Matches-Shared-Cache: ' . $sharedCacheState);
            header('X-Cache: ' . ($sharedCacheState === 'hit' ? 'HIT' : 'MISS'));
            header('X-Matches-Payload-Mode: ' . $payloadMode);
            $this->emitPublicCacheHeaders($cacheMeta);

            // Apply ?limit=N here. The cache key intentionally does NOT include limit.
            $payload = $annotated;
            if ($limit > 0 && is_array($payload) && count($payload) > $limit) {
                $payload = array_slice($payload, 0, $limit);
                header('X-Matches-Limit-Applied: ' . $limit);
            }

            // Always send no-store: live betting platform, no intermediary caching.
            Response::json($payload, 200, self::NO_STORE_HEADER);
            $this->runDeferredSync();
        } catch (Throwable $e) {
            Logger::exception($e, 'getMatches failed; ' . (is_array($staleForFallback) ? 'served stale fallback' : 'no stale fallback available'));
            // Fallback to stale cache (either the dedicated stale namespace
            // or, where applicable, the legacy live cache) so transient DB
            // / upstream failures don't surface as an empty list.
            if (is_array($staleForFallback)) {
                $stalePayload = $staleForFallback;
                if ($limit > 0 && count($stalePayload) > $limit) {
                    $stalePayload = array_slice($stalePayload, 0, $limit);
                }
                header('X-Matches-Fallback: stale-cache');
                header('X-Cache: STALE');
                Response::json($stalePayload, 200, self::NO_STORE_HEADER);
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
                'homeTeamShort' => 1,
                'awayTeamShort' => 1,
                'homeTeamRecord' => 1,
                'awayTeamRecord' => 1,
                'broadcast' => 1,
                'eventName' => 1,
                'startTime' => 1,
                'sport' => 1,
                'sportKey' => 1,
                'status' => 1,
                'odds' => 1,
                'oddsSource' => 1,
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
        if ($desiredStatus === 'upcoming' || $desiredStatus === 'scheduled') {
            // UP NEXT (pre-match) view. Two requirements: (1) commence_time
            // is still in the future, and (2) odds were refreshed within
            // PREMATCH_FRESHNESS_SECONDS_DEFAULT (300s by default). Stale
            // rows are dropped, not flagged — the user only ever sees lines
            // they can actually bet on. Same threshold as the live-upcoming
            // pre-match branch so the two views stay consistent.
            $now = time();
            $prematchMaxAge = max(60, (int) Env::get('PREMATCH_FRESHNESS_SECONDS_DEFAULT', '300'));
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($now, $prematchMaxAge): bool {
                $startTime = (string) ($match['startTime'] ?? '');
                $parsed = $startTime !== '' ? strtotime($startTime) : false;
                if ($parsed !== false && $parsed <= $now) return false;
                $last = (string) ($match['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                if ($lastTs === false) return false;
                return ($now - $lastTs) <= $prematchMaxAge;
            }));
        } elseif ($desiredStatus === 'live') {
            // Live Now is RUNDOWN-EXCLUSIVE per business rule. A row passes
            // only if all three hold:
            //   1. status='live'
            //   2. sportKey is in Rundown's coverage set (defense in depth
            //      so a stale row from a sport we removed from the Rundown
            //      map cannot leak in)
            //   3. oddsSource='rundown' AND lastOddsSyncAt within the
            //      per-sport freshness window (LIVE_FRESHNESS_SECONDS_<KEY>,
            //      LIVE_FRESHNESS_SECONDS_DEFAULT, or RUNDOWN_LIVE_FRESHNESS_SECONDS;
            //      hard-defaults to 90s but production typically sets 300s).
            //
            // Mirrors DebugController::currentLiveRows() so GET /api/matches?status=live
            // returns the same shape as POST /api/sync/live — auto-poll and
            // user-triggered Refresh land on identical filter logic.
            $now = time();
            $coveredKeys = RundownLiveSync::coveredSportKeysSet();
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($now, $coveredKeys): bool {
                if (strtolower((string) ($match['status'] ?? '')) !== 'live') return false;
                $sportKey = strtolower((string) ($match['sportKey'] ?? ''));
                if ($sportKey === '' || !isset($coveredKeys[$sportKey])) return false;
                if (strtolower((string) ($match['oddsSource'] ?? '')) !== 'rundown') return false;
                $last = (string) ($match['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                if ($lastTs === false) return false;
                $maxAge = self::liveFreshnessSecondsForSport($sportKey);
                return ($now - $lastTs) <= $maxAge;
            }));
        } elseif ($desiredStatus === 'live-upcoming') {
            // Default landing view. Drop rows whose odds are stale outright
            // — pre-match window is PREMATCH_FRESHNESS_SECONDS_DEFAULT (300s
            // by default), live window is the per-sport live freshness
            // value (default 90s). We previously kept stale rows with an
            // `oddsStale: true` flag so the UI could render a "betting
            // suspended" badge, but the product call is to hide stale
            // matches entirely so the user only sees bet-able odds.
            $now = time();
            $prematchMaxAge = max(60, (int) Env::get('PREMATCH_FRESHNESS_SECONDS_DEFAULT', '300'));
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($now, $prematchMaxAge): bool {
                $matchStatus = strtolower((string) ($match['status'] ?? ''));
                if (!in_array($matchStatus, ['scheduled', 'live'], true)) return false;
                $last = (string) ($match['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                if ($lastTs === false) return false;
                if ($matchStatus === 'live') {
                    $sportKey = (string) ($match['sportKey'] ?? '');
                    $maxAge = self::liveFreshnessSecondsForSport($sportKey);
                } else {
                    $maxAge = $prematchMaxAge;
                }
                return ($now - $lastTs) <= $maxAge;
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

        // Hide pre-match rows whose commence_time has passed but which never
        // got promoted to status='live' (so they don't sit in upcoming-style
        // listings forever). Live rows always survive — they're past
        // commence_time by definition. `status=finished` / `status=all` opt
        // out entirely so admin and audit tooling can pull historical rows.
        if (!in_array($desiredStatus, ['finished', 'all'], true)) {
            $now = time();
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($now): bool {
                if (strtolower((string) ($match['status'] ?? '')) === 'live') {
                    return true;
                }
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

        // Backfill the short-name fields at serve time so legacy rows
        // written before the normalization layer existed still render with
        // a tidy "Thunder" / "Suns" name on the odds board. Records can
        // only come from the live feed so they're left null when absent —
        // the frontend just suppresses the parenthetical in that case.
        $annotated = array_map(static function (array $match): array {
            return self::backfillTeamDisplayFields($match);
        }, $annotated);

        return $annotated;
    }

    /**
     * Ensure every match row served to the frontend carries `homeTeamShort`
     * and `awayTeamShort`. Idempotent — does nothing if the writer (Rundown
     * or OddsAPI sync) already populated them.
     *
     * @param array<string, mixed> $match
     * @return array<string, mixed>
     */
    private static function backfillTeamDisplayFields(array $match): array
    {
        $sportKey = (string) ($match['sportKey'] ?? '');
        if (empty($match['homeTeamShort']) && !empty($match['homeTeam'])) {
            $match['homeTeamShort'] = TeamNormalizer::shortName((string) $match['homeTeam'], $sportKey);
        }
        if (empty($match['awayTeamShort']) && !empty($match['awayTeam'])) {
            $match['awayTeamShort'] = TeamNormalizer::shortName((string) $match['awayTeam'], $sportKey);
        }
        return $match;
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
            $annotated = self::backfillTeamDisplayFields($annotated);
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
            // Match props are live odds too — never serve from CDN/browser cache.
            Response::json($payload, 200, self::NO_STORE_HEADER);
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

            // Operators can force read-through with TTL <= 0. By default the
            // sport-name list is shared briefly because it contains no odds
            // or prices and otherwise fans out on every public page mount.
            if ($sharedCacheTtl <= 0) {
                $sports = $this->computeAvailableSports();
                $sharedCacheState = 'bypass';
            } else {
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
            }

            // Refresh the stale-fallback copy on every successful response.
            // Independent of the live TTL so transient DB failures on the
            // next call surface a known-good list instead of [].
            SharedFileCache::put(
                SportsbookCache::availableSportsStaleNamespace(),
                SportsbookCache::availableSportsKey(),
                $sports
            );

            header('X-Matches-Sports-Shared-Cache: ' . $sharedCacheState);
            header('X-Cache: ' . ($sharedCacheState === 'hit' ? 'HIT' : 'MISS'));
            // Sports list contains only sport names (e.g. "NFL", "NBA") — no odds,
            // no prices. Safe to cache publicly for 10 s with stale-while-revalidate=20.
            // This eliminates the PHP boot cost for ~20k concurrent sidebar mounts
            // within the same 10 s window.
            Response::json($sports, 200, 'public, max-age=10, stale-while-revalidate=20');
        } catch (Throwable $e) {
            $stale = SharedFileCache::peek(
                SportsbookCache::availableSportsStaleNamespace(),
                SportsbookCache::availableSportsKey()
            );
            Logger::exception($e, 'getAvailableSports failed; ' . (is_array($stale) ? 'served stale fallback' : 'no stale fallback available'));
            if (is_array($stale)) {
                header('X-Matches-Sports-Shared-Cache: stale-fallback');
                header('X-Cache: STALE');
                // Stale fallback — age is unknown, don't let clients cache it.
                Response::json($stale, 200, self::NO_STORE_HEADER);
                return;
            }
            Response::json([], 200, self::NO_STORE_HEADER);
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
        $actor = Jwt::cachedUser($this->db, $collection, $id);
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

        // Bust the shared public-matches file cache so the very next
        // GET /api/matches returns freshly-synced DB rows, not the
        // stale 120s-TTL snapshot. Without this, force-refetch events
        // from the frontend still read old data from the shared cache.
        if ($success && !$dedupHit) {
            SportsbookCache::invalidatePublicMatchCaches();
        }

        Response::json($responseBody, $success ? 200 : 502);
    }

    /**
     * Multi-sport on-demand refresh. Same auth + rate-limit posture as
     * refreshSport() — counts as ONE call regardless of how many sport
     * keys are in the body — so the user can refresh a view that mixes
     * leagues (e.g. NBA + WNBA, or several soccer leagues) in a single
     * round-trip without burning the per-user RATE_LIMIT_REFRESH_ODDS
     * budget. Each sport key still goes through the per-sport in-flight
     * dedup, so concurrent callers asking for the same sport share the
     * upstream call.
     *
     * Body: {"sport_keys": ["basketball_nba", "basketball_wnba", ...]}
     * Caps at 8 keys per request to keep upstream credit burn bounded.
     */
    private function refreshSports(): void
    {
        $startedAt = microtime(true);

        $actor = $this->protectAny();
        if ($actor === null) return;
        $userId = (string) ($actor['id'] ?? '');

        $body = Http::jsonBody();
        $rawKeys = $body['sport_keys'] ?? null;
        if (!is_array($rawKeys) || $rawKeys === []) {
            Response::json(['success' => false, 'error' => 'sport_keys required'], 400);
            return;
        }

        // Normalize, dedupe, validate, and cap.
        $sportKeys = [];
        foreach ($rawKeys as $rawKey) {
            if (!is_string($rawKey)) continue;
            $key = strtolower(trim($rawKey));
            if (preg_match('/^[a-z][a-z0-9_]{1,79}$/', $key) !== 1) continue;
            $sportKeys[$key] = true;
        }
        $sportKeys = array_keys($sportKeys);
        if ($sportKeys === []) {
            Response::json(['success' => false, 'error' => 'no_valid_sport_keys'], 400);
            return;
        }
        $maxKeys = max(1, (int) Env::get('ODDS_REFRESH_MULTI_MAX_KEYS', '8'));
        if (count($sportKeys) > $maxKeys) {
            $sportKeys = array_slice($sportKeys, 0, $maxKeys);
        }

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

        // Per-sport in-flight dedup is preserved by reusing the same
        // SharedFileCache namespace + key as refreshSport() does.
        $perSport = [];
        $anySuccess = false;
        $allMatches = [];
        $latestUpdated = null;
        foreach ($sportKeys as $sportKey) {
            $result = SharedFileCache::remember(
                'sportsbook-on-demand-refresh',
                $sportKey,
                $dedupWindow,
                fn(): array => OddsSyncService::syncSingleSport($this->db, $sportKey)
            );
            $success = (bool) ($result['success'] ?? false);
            if ($success) {
                $anySuccess = true;
                if (is_array($result['matches'] ?? null)) {
                    foreach ($result['matches'] as $m) $allMatches[] = $m;
                }
                $lu = (string) ($result['last_updated'] ?? '');
                if ($lu !== '' && ($latestUpdated === null || $lu > $latestUpdated)) {
                    $latestUpdated = $lu;
                }
            }
            $perSport[] = [
                'sport_key' => $sportKey,
                'success' => $success,
                'error' => $result['error'] ?? null,
                'last_updated' => $result['last_updated'] ?? null,
            ];
        }

        $elapsedMs = (int) round((microtime(true) - $startedAt) * 1000);

        Logger::info('odds_on_demand_refresh_multi', [
            'userId' => $userId,
            'role' => (string) ($actor['_role'] ?? ''),
            'sportCount' => count($sportKeys),
            'sports' => $sportKeys,
            'ipHash' => substr(hash('sha256', $ipKey), 0, 16),
            'anySuccess' => $anySuccess,
            'responseTimeMs' => $elapsedMs,
        ], 'sportsbook');

        // Bust the shared public-matches file cache (same as single-sport
        // path above) so the force-refetch that the frontend fires after
        // this call reads DB rows, not the 120s stale shared cache.
        if ($anySuccess) {
            SportsbookCache::invalidatePublicMatchCaches();
        }

        Response::json([
            'success' => $anySuccess,
            'sport_keys' => $sportKeys,
            'last_updated' => $latestUpdated ?? gmdate(DATE_ATOM),
            'matches' => $allMatches,
            'per_sport' => $perSport,
        ], $anySuccess ? 200 : 502);
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

    /**
     * Live freshness window in seconds for a given sportKey.
     *
     * Lookup order:
     *   1. LIVE_FRESHNESS_SECONDS_<UPPERCASED_SPORT_KEY>  (e.g.
     *      LIVE_FRESHNESS_SECONDS_CRICKET_IPL)
     *   2. LIVE_FRESHNESS_SECONDS_DEFAULT
     *   3. RUNDOWN_LIVE_FRESHNESS_SECONDS  (legacy fallback — earlier
     *      releases used this single knob; respected for back-compat)
     *   4. Hard default 90s
     *
     * Sport keys with non-alnum characters (dots, dashes) are normalized to
     * underscores so the env name is always a valid identifier.
     */
    public static function liveFreshnessSecondsForSport(string $sportKey): int
    {
        $hard = 90;
        $key = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '_', trim($sportKey)) ?? '');
        if ($key !== '') {
            $perSport = (int) Env::get('LIVE_FRESHNESS_SECONDS_' . $key, '0');
            if ($perSport > 0) return $perSport;
        }
        $default = (int) Env::get('LIVE_FRESHNESS_SECONDS_DEFAULT', '0');
        if ($default > 0) return $default;
        $legacy = (int) Env::get('RUNDOWN_LIVE_FRESHNESS_SECONDS', '0');
        if ($legacy > 0) return $legacy;
        return $hard;
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
                    $annotated = self::backfillTeamDisplayFields($annotated);
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
