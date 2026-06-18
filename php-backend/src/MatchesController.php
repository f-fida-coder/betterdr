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
    /**
     * Populated by computeMatches() with sport keys whose rows are aged
     * past the soft-refresh threshold (half the freshness window). After
     * the response is flushed, the deferred runner pulls a fresh batch
     * for these sports from Rundown so the very next read sees current
     * odds. Value is `true` if the sport's stale rows are effectively
     * live (use syncSportLive), `false` if prematch (use syncSportPrematch).
     *
     * @var array<string, bool>
     */
    private array $lazyRefreshSportKeys = [];

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

        if ($method === 'GET' && $path === '/api/outrights') {
            $this->listOutrights();
            return true;
        }
        if ($method === 'GET' && $path === '/api/outrights/sports') {
            $this->listOutrightSports();
            return true;
        }

        return false;
    }

    /**
     * GET /api/outrights[?sportKey=X]
     *
     * Returns all open outright/futures events. With ?sportKey filter, scopes
     * to one sport (e.g. golf_masters_winner). Each row carries the full
     * bookmaker → outcomes tree so the client can render a leaderboard.
     */
    private function listOutrights(): void
    {
        try {
            $sportKey = (string) ($_GET['sportKey'] ?? '');
            if ($sportKey !== '' && preg_match('/^[a-z][a-z0-9_]{1,79}$/', $sportKey) !== 1) {
                Response::json(['error' => 'invalid_sport_key'], 400);
                return;
            }

            // Server-side cache to absorb sidebar-mount fan-out. The HTTP
            // cache header still helps repeat clients, but every cold PHP-FPM
            // hit otherwise re-runs the findMany + array_map on the outrights
            // table. Outrights change on the order of minutes (futures move
            // slowly compared to live odds), so 20 s is a generous freshness
            // budget that still avoids stampedes on popular markets.
            $cacheTtl = $this->envInt('SPORTSBOOK_OUTRIGHTS_CACHE_TTL_SECONDS', 20);
            $cacheKey = 'outrights:' . ($sportKey !== '' ? $sportKey : '_all');
            $loader = function () use ($sportKey): array {
                $filter = ['status' => 'open'];
                if ($sportKey !== '') {
                    $filter['sportKey'] = $sportKey;
                }
                $rows = $this->db->findMany('outrights', $filter, ['limit' => 500]);
                // Strip the heavy `bookmakers` field out of the list view; clients
                // can fetch a single outright with full bookmaker data via
                // /api/outrights/{id} (added later if needed).
                return array_map(static function (array $row): array {
                    $books = is_array($row['bookmakers'] ?? null) ? $row['bookmakers'] : [];
                    $primary = null;
                    foreach ($books as $b) {
                        if (is_array($b) && is_array($b['markets'] ?? null)) {
                            $primary = $b;
                            break;
                        }
                    }
                    return [
                        'id' => $row['id'] ?? null,
                        'sportKey' => $row['sportKey'] ?? null,
                        'eventId' => $row['eventId'] ?? null,
                        'eventName' => $row['eventName'] ?? null,
                        'commenceTime' => $row['commenceTime'] ?? null,
                        'status' => $row['status'] ?? 'open',
                        'lastUpdated' => $row['lastUpdated'] ?? null,
                        'primaryBookmaker' => $primary,
                        'bookmakerCount' => count($books),
                    ];
                }, $rows);
            };

            if ($cacheTtl <= 0) {
                $light = $loader();
            } else {
                $light = SharedFileCache::remember(
                    SportsbookCache::outrightsListNamespace(),
                    $cacheKey,
                    $cacheTtl,
                    $loader
                );
            }

            Response::json($light, 200, 'public, max-age=30, stale-while-revalidate=60');
        } catch (Throwable $e) {
            Logger::exception($e, 'listOutrights failed');
            Response::json([], 200, self::NO_STORE_HEADER);
        }
    }

    /**
     * GET /api/outrights/sports
     *
     * Distinct list of sport keys that have at least one open outright,
     * for the futures sidebar.
     */
    private function listOutrightSports(): void
    {
        try {
            $cacheTtl = $this->envInt('SPORTSBOOK_OUTRIGHTS_SPORTS_CACHE_TTL_SECONDS', 60);
            $loader = function (): array {
                $rows = $this->db->findMany('outrights', ['status' => 'open'], ['projection' => ['sportKey' => 1, 'eventName' => 1], 'limit' => 1000]);
                $bySport = [];
                foreach ($rows as $r) {
                    $sk = (string) ($r['sportKey'] ?? '');
                    if ($sk === '') continue;
                    $bySport[$sk] = ($bySport[$sk] ?? 0) + 1;
                }
                $out = [];
                foreach ($bySport as $sportKey => $count) {
                    $out[] = ['sportKey' => $sportKey, 'count' => $count];
                }
                return $out;
            };

            if ($cacheTtl <= 0) {
                $out = $loader();
            } else {
                $out = SharedFileCache::remember(
                    SportsbookCache::outrightsSportsNamespace(),
                    'all',
                    $cacheTtl,
                    $loader
                );
            }

            Response::json($out, 200, 'public, max-age=60, stale-while-revalidate=120');
        } catch (Throwable $e) {
            Logger::exception($e, 'listOutrightSports failed');
            Response::json([], 200, self::NO_STORE_HEADER);
        }
    }

    private function getMatches(): void
    {
        $status = isset($_GET['status']) ? strtolower(trim((string) $_GET['status'])) : '';
        $active = isset($_GET['active']) ? strtolower(trim((string) $_GET['active'])) : '';
        $payloadMode = $this->normalizePayloadMode((string) ($_GET['payload'] ?? 'full'));
        $sportFilter = isset($_GET['sport']) ? trim((string) $_GET['sport']) : '';
        $sportKeyFilter = isset($_GET['sportKey']) ? trim((string) $_GET['sportKey']) : '';
        // ?limit=N — clamp to [1,1500]. Applied AFTER cache read so a single
        // cached row-set serves every limit value cheaply. The default
        // landing view asks for the top 6 freshest rows; the sidebar
        // search index asks for ~1500 (it needs the full live-upcoming
        // window so a query like "city" can hit Man City / Kansas City
        // Royals games that start later in the day — capping at 200 sorted
        // by startTime ASC filled the slot with already-live games and
        // dropped most pre-match rows out of the search index).
        $rawLimit = isset($_GET['limit']) ? (int) $_GET['limit'] : 0;
        $limit = $rawLimit > 0 ? min(1500, $rawLimit) : 0;
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

            // Lazy on-demand refresh — if computeMatches flagged sport
            // keys whose data is going (or already) stale, schedule a
            // deferred pull from Rundown. Skips when a manual-refresh
            // runner is already set so we don't double-fire upstream.
            $this->maybeScheduleLazyRefresh($cacheMeta);

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
        if (($payloadMode === 'core' || $payloadMode === 'light') && $coreSqlProjectionEnabled) {
            $queryOptions['projection'] = [
                'id' => 1,
                'externalId' => 1,
                'homeTeam' => 1,
                'awayTeam' => 1,
                'homeTeamShort' => 1,
                'awayTeamShort' => 1,
                // Canonical full names + team ids (display only) — must be in the
                // core projection or they're dropped and the board falls back to
                // the short/city name.
                'homeTeamFull' => 1,
                'awayTeamFull' => 1,
                'homeTeamId' => 1,
                'awayTeamId' => 1,
                'homeTeamRecord' => 1,
                'awayTeamRecord' => 1,
                // MLB listed starting pitchers — needed by the board's pitcher
                // row and the bet slip's Action toggles. Without these in the
                // core projection the fields are silently dropped and the
                // pitcher row never renders.
                'homePitcher' => 1,
                'awayPitcher' => 1,
                'broadcast' => 1,
                'eventName' => 1,
                'startTime' => 1,
                'sport' => 1,
                'sportKey' => 1,
                'status' => 1,
                'odds' => 1,
                'oddsSource' => 1,
                'score' => 1,
                'eventStatusDetail' => 1,
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
            // UP NEXT (pre-match) view. Requirements: (1) commence_time is
            // still in the future, and (2) odds were refreshed within the
            // generous LISTING window (prematchListingFreshnessSeconds,
            // 1800s default). The hard drop uses the LISTING window — NOT
            // the 300s soft window — so a game stays listed across the whole
            // prematch rotation cycle instead of disappearing/reappearing as
            // the worker rotates back to its sport. Rows older than the soft
            // window are kept but flagged oddsDelayed/oddsStale below so the
            // UI badges them. Same windows as the live-upcoming pre-match
            // branch so the two views stay consistent (and so the sidebar
            // never advertises a sport whose match list then turns up empty).
            $now = time();
            $prematchSoftAge    = max(60, (int) Env::get('PREMATCH_FRESHNESS_SECONDS_DEFAULT', '300'));
            $prematchListingAge = self::prematchListingFreshnessSeconds();
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($now, $prematchListingAge): bool {
                // Source gate: hide rows tagged with a stopped upstream
                // (legacy odds-api leftovers) — kept in the DB for any
                // historical bet refs but excluded from public listings.
                // Allow empty/null + both 'therundown' and the older
                // 'rundown' tag during the migration window.
                $source = strtolower((string) ($match['oddsSource'] ?? ''));
                if ($source === 'oddsapi') return false;
                $startTime = (string) ($match['startTime'] ?? '');
                $parsed = $startTime !== '' ? strtotime($startTime) : false;
                if ($parsed !== false && $parsed <= $now) return false;
                $last = (string) ($match['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                if ($lastTs === false) return false;
                return ($now - $lastTs) <= $prematchListingAge;
            }));
            // Decorate surviving rows so prematch lines older than the soft
            // window render a truthful "odds delayed/updating" badge instead
            // of looking freshly synced. No bet suspension here — prematch
            // bettability is enforced server-side at placement
            // (applyBettingAvailability → matchStaleAfterSeconds).
            $annotated = array_map(static function (array $match) use ($now, $prematchSoftAge): array {
                $f = self::freshnessFor($match);
                $match['oddsAgeSeconds'] = $f['ageSeconds'];
                $match['oddsDelayed'] = $f['ageSeconds'] >= (int) ($prematchSoftAge / 2);
                $match['oddsStale']   = $f['ageSeconds'] >= $prematchSoftAge;
                return $match;
            }, $annotated);
        } elseif ($desiredStatus === 'live') {
            // Live Now acceptance paths:
            //   (1) Status flipped to 'live' by the odds sync.
            //   (2) AUTO-PROMOTED "effectively live": status still='scheduled'
            //       BUT the game's startTime has passed and odds are fresh.
            $now = time();
            $prematchMaxAge = max(60, (int) Env::get('PREMATCH_FRESHNESS_SECONDS_DEFAULT', '300'));
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($now, $prematchMaxAge): bool {
                $status = strtolower((string) ($match['status'] ?? ''));
                $sportKey = strtolower((string) ($match['sportKey'] ?? ''));
                if ($sportKey === '') return false;
                $last = (string) ($match['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                if ($lastTs === false) return false;

                if ($status === 'live') {
                    // Hide rows from the legacy odds-api upstream we've
                    // stopped writing to — keeps their stale snapshots out
                    // of Live Now.
                    $source = strtolower((string) ($match['oddsSource'] ?? ''));
                    if ($source === 'oddsapi') return false;
                    // VISIBILITY window, wider than the bettable window: a
                    // row past per-sport freshness is suspended in place by
                    // the decoration below, not dropped from the board.
                    return ($now - $lastTs) <= self::liveListingVisibilitySeconds($sportKey);
                }

                if ($status === 'scheduled') {
                    // Auto-promote path: kickoff must have actually passed,
                    // and odds must be fresh on the PRE-match cadence (these
                    // rows are synced by the prematch worker, not the live
                    // worker, so the 90s live window would be too tight).
                    // Block only the dead 'oddsapi' tag here; everything
                    // else passes the freshness check below.
                    $source = strtolower((string) ($match['oddsSource'] ?? ''));
                    if ($source === 'oddsapi') return false;
                    $startTime = (string) ($match['startTime'] ?? '');
                    $startTs = $startTime !== '' ? strtotime($startTime) : false;
                    if ($startTs === false || $startTs > $now) return false;
                    return ($now - $lastTs) <= $prematchMaxAge;
                }

                return false;
            }));
            // Decorate each surviving live row with freshness metadata so
            // the UI can show a "delayed" badge for rows whose last sync
            // is older than the soft-stale threshold. Hard-stale rows
            // were already filtered out by the loop above — they never
            // reach the player.
            $annotated = array_map(static function (array $match): array {
                $f = self::freshnessFor($match);
                $match['oddsAgeSeconds'] = $f['ageSeconds'];
                $match['oddsDelayed'] = $f['delayed'];
                $match['oddsStale'] = $f['stale'];
                if ($f['stale'] && ($match['isBettable'] ?? false) === true) {
                    $match['isBettable'] = false;
                    $match['isStale'] = true;
                    $match['bettingBlockedReason'] = 'Live odds are stale ('
                        . $f['ageSeconds'] . 's old). Betting is temporarily suspended.';
                }
                return $match;
            }, $annotated);
        } elseif ($desiredStatus === 'live-upcoming' || $defaultPublicView) {
            // Default landing view ("Sports - Live & Upcoming") and any
            // request that omits the status filter share the same gate:
            // the row's odds must be fresh enough to bet on.
            //
            // Freshness is read from `lastOddsSyncAt` ONLY — NEVER
            // `lastUpdated` or `updatedAt`. Score-only writers must bump
            // lastUpdated/lastScoreSyncAt without touching lastOddsSyncAt,
            // otherwise a score-fresh / odds-stale row would be treated
            // as bet-able. That regression produced the "LIVE · 39m ago"
            // badge in the wild.
            //
            // Window selection:
            //   * status='live' OR (status='scheduled' AND kickoff has
            //     passed)  →  live cadence (per-sport, default 90s).
            //     A scheduled row whose kickoff is in the past is
            //     "effectively live" — frontend will label it LIVE,
            //     so we must hold it to the live freshness window.
            //   * status='scheduled' AND kickoff still in the future
            //     →  pre-match cadence (PREMATCH_FRESHNESS_SECONDS_DEFAULT,
            //     default 300s).
            //
            // The old code applied the 300s window to ALL scheduled
            // rows regardless of whether kickoff had passed, which is
            // how a 2-3 minute old "scheduled" row could survive long
            // after the auto-promote frontend logic had already flipped
            // it to LIVE.
            $now = time();
            // Future-scheduled rows use the generous LISTING window so they
            // don't flap out between rotation cycles; effectively-live rows
            // (status=live OR kickoff passed) keep the tight per-sport live
            // window. The 300s soft window only drives the badge decoration
            // below, never the hard drop for prematch rows.
            $prematchListingAge = self::prematchListingFreshnessSeconds();
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($now, $prematchListingAge): bool {
                $matchStatus = strtolower((string) ($match['status'] ?? ''));
                if (!in_array($matchStatus, ['scheduled', 'live'], true)) return false;
                $last = (string) ($match['lastOddsSyncAt'] ?? '');
                $lastTs = $last !== '' ? strtotime($last) : false;
                if ($lastTs === false) return false;
                $startTime = (string) ($match['startTime'] ?? '');
                $startTs = $startTime !== '' ? strtotime($startTime) : false;
                $kickoffPassed = $startTs !== false && $startTs <= $now;
                $isEffectivelyLive = $matchStatus === 'live' || $kickoffPassed;
                if ($isEffectivelyLive) {
                    // Visibility window (wider than the bettable window) —
                    // see the strict-'live' branch above. The freshness
                    // decoration below suspends 180s+ rows in place.
                    $sportKey = (string) ($match['sportKey'] ?? '');
                    $maxAge = self::liveListingVisibilitySeconds($sportKey);
                } else {
                    $maxAge = $prematchListingAge;
                }
                return ($now - $lastTs) <= $maxAge;
            }));
            // Decorate every surviving row with freshness so the UI can
            // render a truthful badge and so the placement endpoint
            // double-checks bettability.
            //
            // The 90/180s soft/hard thresholds in freshnessFor() are LIVE
            // odds windows. Applying them to a SCHEDULED-future row would
            // produce a false-positive "Live odds are stale" suspend
            // message on perfectly fresh prematch rows (this branch mixes
            // live and prematch rows, unlike the strict-'live' branch
            // above which is already live-only). So switch threshold by
            // row type:
            //   - effectively live (status='live' OR kickoff passed):
            //       LIVE windows — 90s delayed, 180s stale + bet suspend
            //   - prematch (kickoff still future):
            //       PREMATCH windows — half/full PREMATCH_FRESHNESS_SECONDS_DEFAULT
            //       NO live-stale bet suspension; applyBettingAvailability →
            //       matchStaleAfterSeconds (25 min) is the authority for
            //       prematch bettability and runs server-side at placement.
            $prematchMaxAge = max(60, (int) Env::get('PREMATCH_FRESHNESS_SECONDS_DEFAULT', '300'));
            $annotated = array_map(static function (array $match) use ($now, $prematchMaxAge): array {
                $matchStatus = strtolower((string) ($match['status'] ?? ''));
                $startTime = (string) ($match['startTime'] ?? '');
                $startTs = $startTime !== '' ? strtotime($startTime) : false;
                $isEffectivelyLive = $matchStatus === 'live'
                    || ($startTs !== false && $startTs <= $now);

                $f = self::freshnessFor($match);
                $match['oddsAgeSeconds'] = $f['ageSeconds'];

                if ($isEffectivelyLive) {
                    $match['oddsDelayed'] = $f['delayed'];
                    $match['oddsStale']   = $f['stale'];
                    if ($f['stale'] && ($match['isBettable'] ?? false) === true) {
                        $match['isBettable'] = false;
                        $match['isStale'] = true;
                        $match['bettingBlockedReason'] = 'Live odds are stale ('
                            . $f['ageSeconds'] . 's old). Betting is temporarily suspended.';
                    }
                } else {
                    $match['oddsDelayed'] = $f['ageSeconds'] >= (int) ($prematchMaxAge / 2);
                    $match['oddsStale']   = $f['ageSeconds'] >= $prematchMaxAge;
                }
                return $match;
            }, $annotated);
        } elseif ($desiredStatus !== '' && $desiredStatus !== 'all' && !isset($dbFilter['status'])) {
            $annotated = array_values(array_filter($annotated, static function (array $match) use ($desiredStatus): bool {
                return strtolower((string) ($match['status'] ?? '')) === $desiredStatus;
            }));
        } elseif ($active === 'true') {
            $annotated = array_values(array_filter($annotated, static fn (array $match): bool => strtolower((string) ($match['status'] ?? '')) === 'live'));
        }
        // (The previous `defaultPublicView && !isset($dbFilter['status'])`
        // branch was dead code: the dbFilter is always populated for the
        // default public view a few dozen lines up, so the !isset guard
        // never passed. Its intent — gate the public landing to
        // scheduled+live rows — is now handled by folding $defaultPublicView
        // into the live-upcoming branch, which applies the real freshness
        // filter on top.)

        // Hide pre-match rows whose commence_time has passed but which never
        // got promoted to status='live' (so they don't sit in upcoming-style
        // listings forever). Live rows always survive — they're past
        // commence_time by definition. `status=finished` / `status=all` opt
        // out entirely so admin and audit tooling can pull historical rows.
        // `status=live` also opts out: the live branch above already accepted
        // auto-promoted scheduled-but-effectively-live rows (kickoff passed +
        // fresh odds). Those rows still carry status='scheduled' and would
        // otherwise be killed here by the past-startTime check, leaving Live
        // Now empty during peak game time — the exact bug the auto-promote
        // path exists to fix.
        if (!in_array($desiredStatus, ['finished', 'all', 'live'], true)) {
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
        // `sportKey` (upstream slug, e.g. "cricket_ipl"). Substring match
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

        // Build a canonical odds.markets view from bookmakers with optional
        // per-market book preferences (spreads/h2h/totals). This lets us
        // match a client's spread source without forcing ML/totals to switch.
        $annotated = array_map(static function (array $match): array {
            return self::canonicalizeOddsMarkets($match);
        }, $annotated);

        if ($payloadMode === 'core') {
            $annotated = array_map(fn(array $match): array => $this->coreMatchPayload($match), $annotated);
        } elseif ($payloadMode === 'light') {
            $annotated = array_map(fn(array $match): array => $this->lightMatchPayload($match), $annotated);
        }

        // Backfill the short-name fields at serve time so legacy rows
        // written before the normalization layer existed still render with
        // a tidy "Thunder" / "Suns" name on the odds board. Records can
        // only come from the live feed so they're left null when absent —
        // the frontend just suppresses the parenthetical in that case.
        $annotated = array_map(static function (array $match): array {
            return self::backfillTeamDisplayFields($match);
        }, $annotated);

        // Lazy-refresh scheduling — pick up to 3 sport keys that need a
        // fresh upstream pull and remember them for the deferred runner.
        // Two signals trigger inclusion:
        //   (a) the freshness filter DROPPED every row for that sport
        //       (sport was present in $matches but absent from $annotated);
        //       the next read needs Rundown to catch up.
        //   (b) a surviving row is aged past softThreshold = half the
        //       applicable freshness window; refresh proactively before it
        //       falls off the cliff.
        // The runner is wired in getMatches(); kept out of cache misses
        // (computeMatches only runs on miss, so this naturally throttles).
        $this->lazyRefreshSportKeys = self::detectLazyRefreshSportKeys($matches, $annotated);

        return $annotated;
    }

    /**
     * @param iterable<int, array<string, mixed>> $preFilterMatches  Raw DB rows before freshness filtering.
     * @param array<int, array<string, mixed>>    $surviving         Rows that passed all filters.
     * @return array<string, bool>                                   sportKey => isEffectivelyLive (true=use syncSportLive, false=syncSportPrematch)
     */
    private static function detectLazyRefreshSportKeys(iterable $preFilterMatches, array $surviving): array
    {
        $now = time();
        $prematchSoft = max(60, (int) Env::get('PREMATCH_FRESHNESS_SECONDS_DEFAULT', '300'));
        $prematchSoftThreshold = (int) ($prematchSoft / 2);

        // Pre-filter sport keys (so we can detect "lost ALL rows" sports).
        $preFilterByKey = [];
        foreach ($preFilterMatches as $row) {
            if (!is_array($row)) continue;
            $key = strtolower((string) ($row['sportKey'] ?? ''));
            if ($key === '') continue;
            if (strtolower((string) ($row['oddsSource'] ?? '')) === 'oddsapi') continue;
            $preFilterByKey[$key] = true;
        }

        $survivedByKey = [];
        foreach ($surviving as $row) {
            if (!is_array($row)) continue;
            $key = strtolower((string) ($row['sportKey'] ?? ''));
            if ($key === '') continue;
            $survivedByKey[$key] = true;
        }

        $candidates = []; // sportKey => isLive
        $rank = []; // sportKey => age in seconds (older = higher priority)

        // (a) sports that lost ALL their rows to the freshness filter
        foreach ($preFilterByKey as $key => $_) {
            if (!isset($survivedByKey[$key])) {
                // Assume prematch (most common). syncSportPrematch is wider
                // and pulls upcoming events for the next N days; if there
                // were live rows, they'd appear in that response too.
                $candidates[$key] = false;
                $rank[$key] = PHP_INT_MAX;
            }
        }

        // (b) sports with surviving row aged past soft threshold
        foreach ($surviving as $row) {
            if (!is_array($row)) continue;
            $key = strtolower((string) ($row['sportKey'] ?? ''));
            if ($key === '' || isset($candidates[$key])) continue;
            $last = (string) ($row['lastOddsSyncAt'] ?? '');
            $lastTs = $last !== '' ? strtotime($last) : false;
            if ($lastTs === false) continue;
            $age = $now - $lastTs;

            $matchStatus = strtolower((string) ($row['status'] ?? ''));
            $startTime = (string) ($row['startTime'] ?? '');
            $startTs = $startTime !== '' ? strtotime($startTime) : false;
            $isLive = $matchStatus === 'live' || ($startTs !== false && $startTs <= $now);

            $softThreshold = $isLive
                ? max(15, (int) (self::liveFreshnessSecondsForSport($key) / 2))
                : $prematchSoftThreshold;

            if ($age >= $softThreshold) {
                $candidates[$key] = $isLive;
                $rank[$key] = $age;
            }
        }

        if ($candidates === []) {
            return [];
        }

        // Sort by oldest first, take top 3 to bound upstream fan-out.
        $keys = array_keys($candidates);
        usort($keys, static fn (string $a, string $b): int => ($rank[$b] ?? 0) <=> ($rank[$a] ?? 0));
        $keys = array_slice($keys, 0, 3);

        $out = [];
        foreach ($keys as $key) {
            $out[$key] = $candidates[$key];
        }
        return $out;
    }

    /**
     * Ensure every match row served to the frontend carries `homeTeamShort`
     * and `awayTeamShort`. Idempotent — does nothing if the odds sync
     * already populated them.
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
        // Full-name fallback for docs synced before homeTeamFull/awayTeamFull
        // existed: degrade to the short/city name so the UI always has a value
        // to show. Re-sync replaces these with the true "City Mascot".
        if (empty($match['homeTeamFull']) && !empty($match['homeTeam'])) {
            $match['homeTeamFull'] = (string) $match['homeTeam'];
        }
        if (empty($match['awayTeamFull']) && !empty($match['awayTeam'])) {
            $match['awayTeamFull'] = (string) $match['awayTeam'];
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
            $annotated = self::canonicalizeOddsMarkets($annotated);
            $annotated = self::backfillTeamDisplayFields($annotated);
            Response::json($annotated);
        } catch (Throwable $e) {
            Response::json(['message' => 'Server Error fetching match'], 500);
        }
    }

    /**
     * Lazy-load extended markets + player props for a single match.
     *
     * Reads first from the cached match doc (populated by the extended
     * sync pass). If the doc is missing props but the match exists,
     * triggers a synchronous Rundown getEvent() refresh with the full
     * market_ids set to backfill, then re-reads. Fail-open: on upstream
     * failure we still return whatever's currently stored.
     */
    private function getMatchProps(string $id): void
    {
        try {
            $match = $this->db->findOne('matches', ['id' => SqlRepository::id($id)]);
            if ($match === null) {
                Response::json(['matchId' => $id, 'cached' => false, 'extendedMarkets' => [], 'playerProps' => []], 200, self::NO_STORE_HEADER);
                return;
            }
            $extended = is_array($match['extendedMarkets'] ?? null) ? $match['extendedMarkets'] : [];
            if ($extended === [] && is_array($match['odds']['extendedMarkets'] ?? null)) {
                $extended = $match['odds']['extendedMarkets'];
            }
            $props = is_array($match['playerProps'] ?? null) ? $match['playerProps'] : [];

            // If the doc has no props yet but the match is mappable to a
            // Rundown event, backfill on demand. Dedup per-event for 30s
            // so concurrent loads of the prop modal share one upstream call.
            $externalId = (string) ($match['externalId'] ?? '');
            $sportKey   = (string) ($match['sportKey'] ?? '');
            if (
                $props === []
                && $externalId !== ''
                && RundownClient::isConfigured()
                && strtolower((string) ($match['oddsSource'] ?? '')) === RundownEventMapper::ODDS_SOURCE_TAG
            ) {
                $db = $this->db;
                SharedFileCache::remember(
                    'rundown-props-backfill',
                    $externalId,
                    30,
                    static function () use ($db, $externalId, $sportKey): array {
                        $r = RundownSyncService::syncEventFull($db, $externalId, $sportKey !== '' ? $sportKey : null);
                        return ['ok' => (bool) ($r['ok'] ?? false), 'at' => time()];
                    }
                );
                $refreshed = $this->db->findOne('matches', ['id' => SqlRepository::id($id)]);
                if (is_array($refreshed)) {
                    $extended = is_array($refreshed['extendedMarkets'] ?? null) ? $refreshed['extendedMarkets'] : $extended;
                    $props    = is_array($refreshed['playerProps'] ?? null) ? $refreshed['playerProps'] : $props;
                }
            }

            // Canonical base game markets (h2h/spreads/totals with the same
            // per-market preferred-book selection the board applies) so callers
            // that fetch the game list in 'light' mode (no odds) can still
            // render moneyline/handicap/total for the selected game without a
            // second board call — and see identical prices to the board.
            $canonical = self::canonicalizeOddsMarkets($refreshed ?? $match);
            $baseMarkets = is_array($canonical['odds']['markets'] ?? null) ? $canonical['odds']['markets'] : [];
            $bookmakers  = is_array($canonical['odds']['bookmakers'] ?? null) ? $canonical['odds']['bookmakers'] : [];

            // Collapse alt-spread / alt-total / period ladders to one rung per
            // (side, point) at the house-safe price. Ingestion now stores them
            // already-collapsed, but re-applying here is idempotent and fixes
            // docs written before this shipped (and any that bypassed mapping)
            // so the builder never shows the same handicap at multiple juices.
            $extended = RundownEventMapper::dedupeExtendedMarkets($extended);

            // House risk cap: trim each alt ladder to the N rungs nearest the
            // main line, per side (platformsettings.alternateLinesPerSide, env
            // fallback, default 1). Applied to the SHEET response only — Buy
            // Points reads the doc's full ladder in a separate path, so its
            // +/-2.5 range is unaffected. Placement re-derives the same cap.
            $extended = $this->capAlternateLadders($extended, $baseMarkets, $sportKey);

            $payload = [
                'matchId' => $id,
                'cached'  => true,
                'markets' => $baseMarkets,
                'bookmakers' => $bookmakers,
                'extendedMarkets' => $extended,
                'playerProps' => $props,
            ];
            Response::json($payload, 200, self::NO_STORE_HEADER);
        } catch (Throwable $e) {
            Logger::exception($e, 'getMatchProps failed', ['matchId' => $id]);
            Response::json(['message' => 'Server Error fetching props'], 500);
        }
    }

    /**
     * Trim every alternate-ladder market in `$extended` to the N rungs nearest
     * the main line, per side. The main reference comes from the matching core
     * market (alternate_spreads → spreads) in `$baseMarkets`, or a non-alt
     * period market in `$extended`; absent that, AltLineCap falls back to the
     * group median. Now-empty alt markets are dropped. UNLIMITED is a no-op.
     *
     * Display-side only — placement re-derives the same cap from the stored
     * doc (BetsController::validateSelection), so hiding a rung here and
     * rejecting it there stay in lockstep via AltLineCap.
     *
     * @param array<int,array<string,mixed>> $extended
     * @param array<int,array<string,mixed>> $baseMarkets
     * @return array<int,array<string,mixed>>
     */
    private function capAlternateLadders(array $extended, array $baseMarkets, string $sportKey = ''): array
    {
        $settings = null;
        try {
            $settings = $this->db->findOne('platformsettings', []);
        } catch (Throwable $capErr) {
            $settings = null;
        }
        $perSide = AltLineCap::perSideLimit(is_array($settings) ? $settings : null);
        if ($perSide === AltLineCap::UNLIMITED) {
            return $extended;
        }

        // coreKey → outcomes from non-alt markets (core board + period mains)
        // so each alt ladder can locate its main line.
        $coreByKey = [];
        foreach (array_merge($baseMarkets, $extended) as $m) {
            if (!is_array($m)) {
                continue;
            }
            $k = strtolower((string) ($m['key'] ?? ''));
            if ($k === '' || AltLineCap::isAltKey($k) || isset($coreByKey[$k])) {
                continue;
            }
            $coreByKey[$k] = is_array($m['outcomes'] ?? null) ? $m['outcomes'] : [];
        }

        $out = [];
        foreach ($extended as $m) {
            if (!is_array($m) || !AltLineCap::isAltKey((string) ($m['key'] ?? ''))) {
                $out[] = $m;
                continue;
            }
            $altMarketKey = (string) ($m['key'] ?? '');
            $coreOutcomes = $coreByKey[AltLineCap::coreKeyFor($altMarketKey)] ?? [];
            $altOutcomes = is_array($m['outcomes'] ?? null) ? $m['outcomes'] : [];
            $m['outcomes'] = AltLineCap::capOutcomes(
                $altOutcomes,
                $coreOutcomes,
                $perSide,
                $sportKey,
                AltLineCap::coreKeyFor($altMarketKey)
            );
            if ($m['outcomes'] !== []) {
                $out[] = $m;   // drop alt markets emptied by the cap
            }
        }
        return $out;
    }

    /**
     * Synthesize odds.markets from odds.bookmakers with optional market-
     * specific book preferences. Existing odds.markets entries are preserved,
     * but core keys selected from bookmakers override same-key legacy rows.
     *
     * Env overrides (csv, lowercase keys):
     * - SPORTSBOOK_PREFERRED_BOOKS_SPREADS
     * - SPORTSBOOK_PREFERRED_BOOKS_H2H
     * - SPORTSBOOK_PREFERRED_BOOKS_TOTALS
     * Fallback: SPORTSBOOK_PREFERRED_BOOKS
     *
     * @param array<string,mixed> $match
     * @return array<string,mixed>
     */
    private static function canonicalizeOddsMarkets(array $match): array
    {
        $odds = is_array($match['odds'] ?? null) ? $match['odds'] : [];
        $bookmakers = is_array($odds['bookmakers'] ?? null) ? $odds['bookmakers'] : [];
        if ($bookmakers === []) {
            return $match;
        }

        // In-play games can prefer a different book set (e.g. mirror a PPH
        // book's live lines) via SPORTSBOOK_PREFERRED_BOOKS_LIVE. The same
        // flag flows into bet placement (BetsController) so display = bet price.
        $isLive = strtolower((string) ($match['status'] ?? '')) === 'live';
        $selected = self::selectMarketsFromBookmakers($bookmakers, $isLive);
        if ($selected === []) {
            return $match;
        }

        $byKey = [];
        $existing = is_array($odds['markets'] ?? null) ? $odds['markets'] : [];
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

        $odds['markets'] = self::attachBuyPointsLadders(
            array_values($byKey),
            (string) ($match['sportKey'] ?? ''),
            is_array($odds['extendedMarkets'] ?? null) ? $odds['extendedMarkets'] : []
        );
        $match['odds'] = $odds;
        return $match;
    }

    /**
     * Server-authoritative Buy Points display ladder. For every spread/total
     * outcome that carries a numeric line, attach an `alternateLines` list
     * ([{points, line, odds, americanOdds}]) sourced ENTIRELY from the live
     * feed's alt-line prices via BuyPointsPricing::ladderFromFeed — the same
     * single price source placement (validateSelection) reprices against, so a
     * stale or tampered alternate can never be accepted and display == placed.
     * Rungs the feed never priced are omitted (no synthetic ladder).
     *
     * @param list<array<string,mixed>> $markets         core markets (h2h/spreads/totals)
     * @param list<array<string,mixed>> $extendedMarkets feed alt-line ladders
     * @return list<array<string,mixed>>
     */
    private static function attachBuyPointsLadders(array $markets, string $sportKey, array $extendedMarkets = []): array
    {
        // INTERIM SAFETY LOCK (2026-06-16): don't surface a buy-points ladder
        // for sports not yet verified/enabled. Placement rejects them anyway
        // (BUY_POINTS_DISABLED), so emitting them would only mislead.
        if (!BuyPointsPricing::isSportEnabled($sportKey)) {
            return $markets;
        }
        // Single price source: core markets (base line + h2h ML floor) plus
        // the feed's alt-line ladders. ladderFromFeed reads alt prices from
        // this pool; placement reads from the same stored extendedMarkets.
        $pool = array_merge($markets, $extendedMarkets);
        foreach ($markets as $mi => $market) {
            if (!is_array($market)) {
                continue;
            }
            $marketKey = strtolower((string) ($market['key'] ?? ''));
            if (!BuyPointsPricing::isAllowedMarket($marketKey)) {
                continue;
            }
            $outcomes = is_array($market['outcomes'] ?? null) ? $market['outcomes'] : [];
            foreach ($outcomes as $oi => $outcome) {
                if (!is_array($outcome)) {
                    continue;
                }
                $pointRaw = $outcome['point'] ?? null;
                if (!is_numeric($pointRaw)) {
                    continue;
                }
                $ladder = BuyPointsPricing::ladderFromFeed(
                    $sportKey,
                    $marketKey,
                    (string) ($outcome['name'] ?? ''),
                    (float) $pointRaw,
                    $pool
                );
                if ($ladder === []) {
                    continue;
                }
                $alternates = [];
                foreach ($ladder as $rung) {
                    $alternates[] = [
                        'points' => $rung['points'],
                        'line' => $rung['line'],
                        'odds' => $rung['decimal'],
                        'americanOdds' => $rung['american'],
                    ];
                }
                $outcomes[$oi]['alternateLines'] = $alternates;
            }
            $markets[$mi]['outcomes'] = $outcomes;
        }
        return $markets;
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
        // Live (in-play) games take a single dedicated book list when
        // SPORTSBOOK_PREFERRED_BOOKS_LIVE is set — it overrides the per-market
        // and general lists so the whole live board mirrors one book family.
        // Prematch is untouched (falls through to the existing logic).
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
     * Merged + de-duped sport list across the existing tier env vars,
     * used by the manual-fetch / on-demand-refresh code paths to know
     * which sports to walk. Stable ordering so caches/UI snapshots
     * compare equal across invocations.
     *
     * @return list<string>
     */
    private static function resolveConfiguredSportsForManualFetch(): array
    {
        $tier1   = (string) Env::get('ODDS_TIER1_SPORTS', '');
        $tier2   = (string) Env::get('ODDS_TIER2_SPORTS', '');
        $allowed = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
        $merged  = $tier1 . ',' . $tier2 . ',' . $allowed;
        $list    = array_values(array_unique(array_filter(array_map('trim', explode(',', $merged)), static fn ($v) => $v !== '')));
        sort($list);
        return $list;
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
        // Only include sports whose matches will actually surface in
        // computeMatches(). A row must satisfy ALL of:
        //   (a) status IN ('scheduled', 'live')
        //   (b) oddsSource != 'oddsapi'  — legacy upstream we stopped
        //                                  writing to; stale rows linger
        //                                  but must not advertise their sport
        //   (c) startTime > now          — unless status='live' (a row
        //                                  past kickoff is only valid if
        //                                  it's been auto-promoted to live)
        //   (d) lastOddsSyncAt within:
        //         live / effectively-live (past-kickoff scheduled):
        //             self::liveFreshnessSecondsForSport($sportKey) — 90s default
        //         future-scheduled:
        //             self::prematchListingFreshnessSeconds()       — 1800s default
        //             (the generous LISTING window, NOT the 300s soft badge
        //              window — see that helper for why: gating on 300s made
        //              prematch sports flap in/out each rotation cycle)
        //   (e) at least one of:
        //         odds.bookmakers[i].markets — current Rundown shape
        //         odds.markets               — legacy odds-api shape, kept
        //                                      so historical rows that
        //                                      survive (a)-(d) still surface
        //         extendedMarkets            — period markets (Q1-Q4 / F5 /
        //                                      set_1) when no core posted yet
        //
        // Gates (b)-(d) mirror computeMatches() lines 369-393 / 394-450
        // exactly so the sidebar can never advertise a sport whose match
        // list will then turn up empty ("No matches with live odds").
        $matches = $this->db->findMany(
            'matches',
            ['status' => ['$in' => ['scheduled', 'live']]],
            ['projection' => [
                'sport' => 1, 'sportKey' => 1, 'status' => 1,
                'odds' => 1, 'extendedMarkets' => 1,
                'startTime' => 1, 'lastOddsSyncAt' => 1, 'oddsSource' => 1,
                'lastUpdated' => 1, 'updatedAt' => 1, 'score' => 1,
            ]]
        );
        $now                   = time();
        $prematchListingMaxAge = self::prematchListingFreshnessSeconds();
        $sports = [];
        foreach ($matches as $match) {
            if (!is_array($match)) {
                continue;
            }
            $status = strtolower((string) ($match['status'] ?? ''));
            if (!in_array($status, ['scheduled', 'live'], true)) {
                continue;
            }

            // Source gate — drop legacy odds-api leftovers. Empty/null
            // passes (rows pre-dating the field), matching the same rule
            // computeMatches() applies at line 384.
            $source = strtolower((string) ($match['oddsSource'] ?? ''));
            if ($source === 'oddsapi') {
                continue;
            }

            // Public-visibility gate — defer to the same authority the
            // match list uses (SportsMatchStatus::effectiveStatus), so an
            // 'expired' row (past kickoff with no fresh sync, past 8h
            // live, etc.) is dropped here too. Hidden statuses include
            // 'finished', 'expired', 'canceled'. This catches:
            //   - scheduled rows whose startTime passed and aren't being
            //     auto-promoted (no fresh lastUpdated)
            //   - live rows that have been live for >MATCH_LIVE_MAX_DURATION
            //   - live rows whose lastUpdated is older than MATCH_LIVE_STALE_AFTER
            if (!SportsMatchStatus::isPublicVisible($match, $now)) {
                continue;
            }

            // Freshness gate — lastOddsSyncAt must be inside the same
            // window the match-list view applies. Live (or effectively-
            // live: past-kickoff scheduled) rows get the per-sport live
            // budget; future-scheduled rows get the prematch budget.
            $startTime = (string) ($match['startTime'] ?? '');
            $startTs   = $startTime !== '' ? strtotime($startTime) : false;
            $last   = (string) ($match['lastOddsSyncAt'] ?? '');
            $lastTs = $last !== '' ? strtotime($last) : false;
            if ($lastTs === false) {
                continue;
            }
            $effectivelyLive = ($status === 'live') || ($startTs !== false && $startTs <= $now);
            // Future-scheduled rows use the generous LISTING window (not the
            // 300s soft window) so a sport stays in the sidebar across the
            // whole prematch rotation cycle instead of flapping. Live /
            // effectively-live rows keep the tight per-sport live window.
            $maxAge = $effectivelyLive
                ? self::liveFreshnessSecondsForSport((string) ($match['sportKey'] ?? ''))
                : $prematchListingMaxAge;
            if (($now - $lastTs) > $maxAge) {
                continue;
            }

            $odds       = is_array($match['odds'] ?? null) ? $match['odds'] : [];
            $bookmakers = is_array($odds['bookmakers'] ?? null) ? $odds['bookmakers'] : [];
            $markets    = is_array($odds['markets'] ?? null) ? $odds['markets'] : [];
            $ext        = is_array($match['extendedMarkets'] ?? null) ? $match['extendedMarkets'] : [];

            $hasData = false;
            foreach ($bookmakers as $b) {
                if (!is_array($b)) continue;
                $bMarkets = is_array($b['markets'] ?? null) ? $b['markets'] : [];
                if (count($bMarkets) > 0) { $hasData = true; break; }
            }
            if (!$hasData && (count($markets) > 0 || count($ext) > 0)) {
                $hasData = true;
            }
            if (!$hasData) {
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

            $sports = self::resolveConfiguredSportsForManualFetch();
            $perSport = [];
            foreach ($sports as $sportKey) {
                $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                if ($sportId === null) {
                    $perSport[$sportKey] = ['ok' => false, 'skipped' => 'unmapped_sport'];
                    continue;
                }
                $r = RundownSyncService::syncSportPrematch($this->db, $sportKey, $sportId);
                $perSport[$sportKey] = [
                    'ok'         => ($r['errors'] ?? 0) === 0,
                    'eventsSeen' => (int) ($r['eventsSeen'] ?? 0),
                    'updated'    => (int) ($r['created'] ?? 0) + (int) ($r['updated'] ?? 0),
                    'errors'     => (int) ($r['errors'] ?? 0),
                ];
            }
            Response::json(['message' => 'Manual odds fetch ok', 'sports' => count($sports), 'results' => $perSport]);
        } catch (Throwable $e) {
            Response::serverError('Server error manual odds fetch', $e);
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
        $db = $this->db;
        $result = SharedFileCache::remember(
            'sportsbook-on-demand-refresh',
            $sportKey,
            $dedupWindow,
            static function () use ($db, $sportKey): array {
                $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                if ($sportId === null) {
                    return ['success' => false, 'error' => 'unmapped_sport_key'];
                }
                $r = RundownSyncService::syncSportPrematch($db, $sportKey, $sportId);
                return [
                    'success'    => ($r['errors'] ?? 0) === 0,
                    'sportKey'   => $sportKey,
                    'eventsSeen' => (int) ($r['eventsSeen'] ?? 0),
                    'updated'    => (int) ($r['created'] ?? 0) + (int) ($r['updated'] ?? 0),
                    'errors'     => (int) ($r['errors'] ?? 0),
                ];
            }
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
        $db = $this->db;
        foreach ($sportKeys as $sportKey) {
            $result = SharedFileCache::remember(
                'sportsbook-on-demand-refresh',
                $sportKey,
                $dedupWindow,
                static function () use ($db, $sportKey): array {
                    $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                    if ($sportId === null) {
                        return ['success' => false, 'error' => 'unmapped_sport_key'];
                    }
                    $r = RundownSyncService::syncSportPrematch($db, $sportKey, $sportId);
                    return [
                        'success'    => ($r['errors'] ?? 0) === 0,
                        'sportKey'   => $sportKey,
                        'eventsSeen' => (int) ($r['eventsSeen'] ?? 0),
                        'updated'    => (int) ($r['created'] ?? 0) + (int) ($r['updated'] ?? 0),
                        'errors'     => (int) ($r['errors'] ?? 0),
                    ];
                }
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
                        // Deferred async refresh — rotates through configured
                        // sports and pulls prematch for each. Concurrent calls
                        // de-dup via the named lock above.
                        $sports = self::resolveConfiguredSportsForManualFetch();
                        foreach ($sports as $sportKey) {
                            $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                            if ($sportId === null) continue;
                            RundownSyncService::syncSportPrematch($db, $sportKey, $sportId);
                        }
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
                // Synchronous refresh path — rotates through configured
                // sports and pulls prematch for each.
                $sports = self::resolveConfiguredSportsForManualFetch();
                foreach ($sports as $sportKey) {
                    $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                    if ($sportId === null) continue;
                    RundownSyncService::syncSportPrematch($this->db, $sportKey, $sportId);
                }
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

    /**
     * Wire the deferred sync runner for lazy on-demand refresh. Reads
     * the sport-key list populated by computeMatches() and arranges a
     * post-response Rundown pull. Mutates $cacheMeta so emitPublicCacheHeaders
     * sends X-Sportsbook-Sync-Deferred — the frontend listens for that header
     * (api.js, matches:sync-deferred event) and schedules a follow-up refetch
     * ~4 s later, so the next read returns the freshly-synced rows.
     *
     * @param array<string, mixed> $cacheMeta passed by reference; updated with syncDeferred + state hint
     */
    private function maybeScheduleLazyRefresh(array &$cacheMeta): void
    {
        if ($this->deferredSyncRunner !== null) {
            return; // manual-refresh runner already in flight; don't pile on
        }
        if ($this->lazyRefreshSportKeys === []) {
            return;
        }

        $db = $this->db;
        $sportKeys = $this->lazyRefreshSportKeys;
        // Reset so a follow-up request on the same instance starts clean.
        $this->lazyRefreshSportKeys = [];
        $dedupWindow = max(1, (int) Env::get('ODDS_REFRESH_DEDUP_WINDOW_SECONDS', '20'));

        $this->deferredSyncRunner = static function () use ($db, $sportKeys, $dedupWindow): void {
            $anySuccess = false;
            foreach ($sportKeys as $sportKey => $isLive) {
                try {
                    $result = SharedFileCache::remember(
                        'sportsbook-on-demand-refresh',
                        $sportKey,
                        $dedupWindow,
                        static function () use ($db, $sportKey, $isLive): array {
                            $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                            if ($sportId === null) {
                                return ['success' => false, 'error' => 'unmapped_sport_key'];
                            }
                            $r = $isLive
                                ? RundownSyncService::syncSportLive($db, $sportKey, $sportId)
                                : RundownSyncService::syncSportPrematch($db, $sportKey, $sportId);
                            return [
                                'success'    => ((int) ($r['errors'] ?? 0)) === 0,
                                'sportKey'   => $sportKey,
                                'eventsSeen' => (int) ($r['eventsSeen'] ?? 0),
                                'errors'     => (int) ($r['errors'] ?? 0),
                            ];
                        }
                    );
                    if (($result['success'] ?? false) === true) {
                        $anySuccess = true;
                    }
                } catch (Throwable $e) {
                    Logger::warning('lazy odds refresh failed', [
                        'sportKey' => $sportKey,
                        'isLive'   => $isLive,
                        'error'    => $e->getMessage(),
                    ], 'sportsbook');
                }
            }
            if ($anySuccess) {
                // Bust shared caches so the client's follow-up refetch
                // (scheduled ~4 s after the initial response by the
                // matches:sync-deferred handler in api.js) returns the
                // newly synced odds instead of the stale cached payload.
                self::clearSharedPublicCaches();
            }
        };

        $cacheMeta['syncDeferred'] = true;
        $cacheMeta['lazyRefreshSports'] = array_keys($sportKeys);
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
     *   3. Hard default 90s
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
        return $hard;
    }

    /**
     * Live LISTING visibility window in seconds — how long a live row stays
     * on the board after its last odds stamp.
     *
     * Deliberately WIDER than the bettable window: real books suspend a
     * delayed market in place, they don't yank the game off the board.
     * Dropping at the 90s freshness window made live games vanish and
     * reappear one sport at a time as the worker walked its per-sport
     * rotation (and emptied the whole live board for the first seconds
     * after a worker restart). Rows older than the per-sport live window
     * survive here and are decorated by freshnessFor() instead: "delayed"
     * badge at 90s, SUSPENDED (isBettable=false) at 180s. Past this
     * visibility window the row is hidden outright — that's the phantom /
     * dead-feed backstop (quotaExhausted blocks the heartbeat, so a dead
     * feed ages everything out within this window).
     *
     * Floored at the hard-stale suspend threshold and the per-sport live
     * window so it can never be configured tighter than the suspend cliff.
     */
    public static function liveListingVisibilitySeconds(string $sportKey): int
    {
        $configured = (int) Env::get('LIVE_LISTING_VISIBILITY_SECONDS', '300');
        return max($configured, self::ODDS_STALE_HARD_SECONDS, self::liveFreshnessSecondsForSport($sportKey));
    }

    /**
     * Pre-match LISTING freshness window in seconds.
     *
     * This is deliberately MUCH larger than PREMATCH_FRESHNESS_SECONDS_DEFAULT
     * (the soft "odds delayed/stale" badge threshold). A future-scheduled
     * game must stay LISTED — and its sport must stay in the sidebar — even
     * when the prematch rotation hasn't re-synced it recently. The worker
     * walks the full sport catalog on a slow rotation (a single sport is
     * re-synced only once every ~6-8 minutes once the catalog is large),
     * which is longer than the 300s soft window. Gating LISTING on 300s made
     * every prematch sport flap in and out of the sidebar each rotation
     * cycle, and a single transient API failure hid a sport for a full extra
     * cycle. Pre-match lines move slowly and bet placement re-validates odds
     * server-side, so showing a line up to ~30 min old (badged "delayed") is
     * safe; dropping the whole sport is not.
     *
     * Floored at PREMATCH_FRESHNESS_SECONDS_DEFAULT so it can never be
     * configured tighter than the soft badge window.
     */
    public static function prematchListingFreshnessSeconds(): int
    {
        $soft    = max(60, (int) Env::get('PREMATCH_FRESHNESS_SECONDS_DEFAULT', '300'));
        $listing = (int) Env::get('PREMATCH_LISTING_FRESHNESS_SECONDS', '1800');
        return max($soft, $listing);
    }

    /** Soft-stale threshold — UI shows a "delayed" badge past this age. */
    public const ODDS_STALE_SOFT_SECONDS = 90;

    /** Hard-stale threshold — betting is suspended on the match past this age. */
    public const ODDS_STALE_HARD_SECONDS = 180;

    /**
     * Live-odds freshness for a single match row, computed from
     * `lastOddsSyncAt`. Used to decorate the public match payload so
     * the UI can render a truthful "delayed" badge and so bet placement
     * suspends rows whose prices crossed the hard-stale threshold.
     *
     * @param array<string,mixed> $match
     * @return array{ageSeconds:int,delayed:bool,stale:bool}
     */
    public static function freshnessFor(array $match): array
    {
        $last = (string) ($match['lastOddsSyncAt'] ?? '');
        $ageSeconds = $last === '' ? PHP_INT_MAX : max(0, time() - strtotime($last));
        return [
            'ageSeconds' => $ageSeconds,
            'delayed' => $ageSeconds >= self::ODDS_STALE_SOFT_SECONDS,
            'stale' => $ageSeconds >= self::ODDS_STALE_HARD_SECONDS,
        ];
    }

    private function isTruthy(mixed $value): bool
    {
        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
    }

    private function normalizePayloadMode(string $value): string
    {
        $mode = strtolower(trim($value));
        // 'light' drops odds entirely — used by views that only need the game
        // list (e.g. the Prop Builder rail/selector), which then load the
        // selected game's odds on demand via /matches/{id}/props.
        if ($mode === 'light') {
            return 'light';
        }
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

    /**
     * Minimal list payload: everything needed to render a game rail/selector
     * (teams, sport, startTime, status, score, pitchers, bettability) but NO
     * odds. The full live-upcoming board carries ~12 KB of odds per game; a
     * 250-row unscoped pull is ~3 MB and times out on mobile, leaving prop
     * views blank. Consumers load the selected game's odds on demand via
     * /matches/{id}/props (which now returns canonical base markets too).
     */
    private function lightMatchPayload(array $match): array
    {
        unset($match['odds'], $match['extendedMarkets'], $match['playerProps']);
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
