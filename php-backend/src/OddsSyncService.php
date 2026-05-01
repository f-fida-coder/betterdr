<?php

declare(strict_types=1);


final class OddsSyncService
{
    private static array $apiCache = [];
    private static ?array $tierCache = null;
    private const CACHE_TTL_SECONDS = 1800; // 30 minutes
    private const EVENT_PROPS_TTL_SECONDS = 300; // 5 minutes per-event refresh threshold
    private const EVENT_PROPS_MAX_CONCURRENT = 8; // curl_multi fan-out per batch
    private const UPSTREAM_MAX_CONCURRENT = 8; // cap on parallel /odds + /scores calls; higher triggers upstream 429s
    private const SPORT_DISCOVERY_TTL_SECONDS = 3600; // 1 hour — in-process cache for /sports
    private const TIER_DUE_TOLERANCE_SECONDS = 30; // allow a cycle firing up to 30s early to still count as due

    /**
     * Returns the list of Odds API sport keys this sync should cover.
     *
     * When ODDS_AUTO_DISCOVER_SPORTS=true, we call the /v4/sports endpoint
     * (filtered to currently-active sports) and use whatever it returns —
     * so new seasons auto-appear in the sidebar with zero config change.
     * The list is cached in-process for 1 hour so we don't spam /sports.
     *
     * When false (default), falls back to the static ODDS_ALLOWED_SPORTS
     * env var, preserving previous behaviour for anyone who wants an
     * explicit whitelist.
     *
     * @return list<string>
     */
    private static function resolveSportsList(string $apiKey, string $apiBase): array
    {
        $autoDiscover = strtolower((string) Env::get('ODDS_AUTO_DISCOVER_SPORTS', 'false')) === 'true';
        if (!$autoDiscover || $apiKey === '') {
            $raw = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
            return array_values(array_filter(array_map('trim', explode(',', $raw)), static fn($v) => $v !== ''));
        }

        $cacheKey = 'sports_discovery';
        $now = time();
        if (isset(self::$apiCache[$cacheKey])
            && isset(self::$apiCache[$cacheKey]['timestamp'])
            && ($now - self::$apiCache[$cacheKey]['timestamp']) < self::SPORT_DISCOVERY_TTL_SECONDS
            && is_array(self::$apiCache[$cacheKey]['data'] ?? null)
        ) {
            return self::$apiCache[$cacheKey]['data'];
        }

        // Pull only currently-active sports. Passing all=false avoids
        // hammering the API with off-season keys that return nothing.
        $url = $apiBase . '/sports?' . http_build_query(['apiKey' => $apiKey, 'all' => 'false']);
        $response = self::httpGetDetailed($url);
        $body = $response['body'] ?? null;
        if (!is_string($body) || $body === '') {
            // Discovery failed — fall back to env list so sync still runs.
            $raw = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
            return array_values(array_filter(array_map('trim', explode(',', $raw)), static fn($v) => $v !== ''));
        }

        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            $raw = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
            return array_values(array_filter(array_map('trim', explode(',', $raw)), static fn($v) => $v !== ''));
        }

        $keys = [];
        foreach ($decoded as $row) {
            if (!is_array($row)) continue;
            $k = isset($row['key']) ? (string) $row['key'] : '';
            if ($k === '') continue;
            // Outright-only markets (championship winners, futures, etc.)
            // don't accept markets=h2h,spreads,totals and return HTTP 422.
            // The discovery payload is inconsistent about has_markets, so
            // match the key suffix as a reliable fallback.
            if (preg_match('/_winner$/', $k) === 1) continue;
            if (array_key_exists('has_markets', $row) && empty($row['has_markets']) && !empty($row['has_outrights'])) continue;
            $keys[] = $k;
        }
        // Optional exclusion list for sports you never want synced
        // (e.g. politics) even in auto-discover mode.
        $excludeRaw = (string) Env::get('ODDS_DISCOVERY_EXCLUDE', '');
        if ($excludeRaw !== '') {
            $excludes = array_flip(array_map('trim', explode(',', strtolower($excludeRaw))));
            $keys = array_values(array_filter($keys, static fn($k) => !isset($excludes[strtolower($k)])));
        }

        self::$apiCache[$cacheKey] = ['data' => $keys, 'timestamp' => $now];
        return $keys;
    }

    /**
     * Resolve active sports for the live sweep. Uses the batched HTTP helper
     * so Live Now is not constrained by the prematch quota guard.
     *
     * @return list<string>
     */
    private static function resolveSportsListForLive(string $apiKey, string $apiBase): array
    {
        $url = $apiBase . '/sports?' . http_build_query(['apiKey' => $apiKey, 'all' => 'false']);
        $responses = self::httpGetManyDetailed(['sports' => $url]);
        $body = $responses['sports']['body'] ?? null;
        if (!is_string($body) || $body === '') {
            return self::resolveSportsList($apiKey, $apiBase);
        }

        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            return self::resolveSportsList($apiKey, $apiBase);
        }

        $keys = [];
        foreach ($decoded as $row) {
            if (!is_array($row)) {
                continue;
            }
            $key = isset($row['key']) ? (string) $row['key'] : '';
            if ($key === '' || preg_match('/_winner$/', $key) === 1) {
                continue;
            }
            if (array_key_exists('has_markets', $row) && empty($row['has_markets']) && !empty($row['has_outrights'])) {
                continue;
            }
            $keys[] = $key;
        }

        return array_values(array_unique($keys));
    }

    /**
     * Tier configuration parsed from env.
     * Returns sport→tier map, per-tier cadence in seconds, and tier3 extended-sync flag.
     *
     * Any sport not explicitly listed in ODDS_TIER1_SPORTS / ODDS_TIER2_SPORTS falls to tier3.
     * If both lists are empty, tiering is effectively disabled and every sport is treated as tier3
     * with the tier3 cadence — giving backwards compatibility with a blanket cron minutes setting.
     *
     * @return array{tier1: list<string>, tier2: list<string>, sportTier: array<string,string>, cadences: array{tier1:int,tier2:int,tier3:int}, tier3ExtendedSync: bool, tieringActive: bool}
     */
    private static function tierConfig(): array
    {
        if (self::$tierCache !== null) return self::$tierCache;

        $parseList = static function (string $envKey): array {
            $raw = (string) Env::get($envKey, '');
            return array_values(array_filter(array_map('trim', explode(',', $raw)), static fn($v) => $v !== ''));
        };

        $tier1 = $parseList('ODDS_TIER1_SPORTS');
        $tier2 = $parseList('ODDS_TIER2_SPORTS');

        $sportTier = [];
        foreach ($tier1 as $s) $sportTier[$s] = 'tier1';
        foreach ($tier2 as $s) $sportTier[$s] = 'tier2';

        self::$tierCache = [
            'tier1' => $tier1,
            'tier2' => $tier2,
            'sportTier' => $sportTier,
            'cadences' => [
                'tier1' => max(1, (int) Env::get('ODDS_TIER1_CRON_MINUTES', '15')) * 60,
                'tier2' => max(1, (int) Env::get('ODDS_TIER2_CRON_MINUTES', '15')) * 60,
                'tier3' => max(1, (int) Env::get('ODDS_TIER3_CRON_MINUTES', '30')) * 60,
            ],
            'tier3ExtendedSync' => strtolower((string) Env::get('ODDS_TIER3_EXTENDED_SYNC', 'true')) === 'true',
            'tieringActive' => ($tier1 !== [] || $tier2 !== []),
        ];
        return self::$tierCache;
    }

    private static function tierForSport(string $sportKey): string
    {
        $cfg = self::tierConfig();
        return $cfg['sportTier'][$sportKey] ?? 'tier3';
    }

    private static function sportSyncStatePath(): string
    {
        return dirname(__DIR__) . '/cache/odds-tier-sync-state.json';
    }

    /** @return array<string,string> */
    private static function loadSportSyncState(): array
    {
        $path = self::sportSyncStatePath();
        if (!is_file($path)) return [];
        $raw = @file_get_contents($path);
        if (!is_string($raw) || $raw === '') return [];
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /** @param array<string,string> $state */
    private static function saveSportSyncState(array $state): void
    {
        $path = self::sportSyncStatePath();
        $dir = dirname($path);
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        @file_put_contents($path, json_encode($state, JSON_UNESCAPED_SLASHES), LOCK_EX);
    }

    /**
     * From the full sport list, return only sports "due" this cycle based on their tier cadence.
     * Also returns per-tier candidate/due counts for logging.
     *
     * @param list<string> $sports
     * @return array{due: list<string>, counts: array<string, array{candidate:int, due:int}>}
     */
    private static function filterDueSports(array $sports): array
    {
        $cfg = self::tierConfig();
        $state = self::loadSportSyncState();
        $now = time();
        $due = [];
        $counts = [
            'tier1' => ['candidate' => 0, 'due' => 0],
            'tier2' => ['candidate' => 0, 'due' => 0],
            'tier3' => ['candidate' => 0, 'due' => 0],
        ];

        foreach ($sports as $s) {
            $tier = $cfg['sportTier'][$s] ?? 'tier3';
            $counts[$tier]['candidate']++;
            $cadenceSeconds = $cfg['cadences'][$tier];
            $lastEpoch = 0;
            $lastIso = $state[$s] ?? null;
            if (is_string($lastIso) && $lastIso !== '') {
                $ts = strtotime($lastIso);
                if ($ts !== false) $lastEpoch = $ts;
            }
            if (($now - $lastEpoch) >= ($cadenceSeconds - self::TIER_DUE_TOLERANCE_SECONDS)) {
                $counts[$tier]['due']++;
                $due[] = $s;
            }
        }

        return ['due' => $due, 'counts' => $counts];
    }

    public static function handleMatchesFallbackRoute(string $method, string $path): bool
    {
        if ($method === 'GET' && $path === '/api/matches') {
            $status = isset($_GET['status']) ? strtolower(trim((string) $_GET['status'])) : '';
            $active = isset($_GET['active']) ? strtolower(trim((string) $_GET['active'])) : '';

            $matches = self::fetchMatchesSnapshotFromApi();
            if ($status !== '') {
                $desired = $status === 'active' ? 'live' : $status;
                $matches = array_values(array_filter($matches, static fn(array $m): bool => strtolower((string) ($m['status'] ?? '')) === $desired));
            } elseif ($active === 'true') {
                $matches = array_values(array_filter($matches, static fn(array $m): bool => strtolower((string) ($m['status'] ?? '')) === 'live'));
            }

            Response::json($matches);
            return true;
        }

        if ($method === 'POST' && $path === '/api/matches/fetch-odds') {
            $matches = self::fetchMatchesSnapshotFromApi();
            Response::json([
                'message' => 'Manual odds fetch completed (API fallback mode)',
                'results' => [
                    'created' => 0,
                    'updated' => 0,
                    'settled' => 0,
                    'apiCalls' => count($matches) > 0 ? 1 : 0,
                    'blocked' => count($matches) === 0,
                    'fallback' => true,
                    'matches' => count($matches),
                ],
            ]);
            return true;
        }

        return false;
    }

    /**
     * Returns a matches list without touching DB, used when DB is unavailable.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function fetchMatchesSnapshotFromApi(): array
    {
        $cacheKey = 'matches_snapshot';
        $now = time();

        if (isset(self::$apiCache[$cacheKey]) && 
            isset(self::$apiCache[$cacheKey]['data']) && 
            isset(self::$apiCache[$cacheKey]['timestamp']) &&
            ($now - self::$apiCache[$cacheKey]['timestamp']) < self::CACHE_TTL_SECONDS) {
            return self::$apiCache[$cacheKey]['data'];
        }

        $sportsApiEnabled = strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true';
        $apiKey = (string) Env::get('ODDS_API_KEY', '');
        if (!$sportsApiEnabled || $apiKey === '') {
            return [];
        }

        $regions = (string) Env::get('ODDS_API_REGIONS', 'us');
        $markets = (string) Env::get('ODDS_API_MARKETS', 'h2h,spreads,totals');
        $oddsFormat = (string) Env::get('ODDS_API_ODDS_FORMAT', 'american');
        $bookmakers = (string) Env::get('ODDS_API_BOOKMAKERS', '');
        $scoresEnabled = strtolower((string) Env::get('ODDS_SCORES_ENABLED', 'true')) === 'true';
        $scoresDaysFrom = self::scoresDaysFrom();
        $apiBase = 'https://api.the-odds-api.com/v4';

        $sports = self::resolveSportsList($apiKey, $apiBase);
        if ($sports === []) {
            return [];
        }

        $scoresByExternalId = [];
        if ($scoresEnabled) {
            $scoreUrlsBySport = [];
            foreach ($sports as $sportKey) {
                $scoreQuery = ['apiKey' => $apiKey, 'dateFormat' => 'iso'];
                if ($scoresDaysFrom > 0) {
                    $scoreQuery['daysFrom'] = $scoresDaysFrom;
                }
                $scoreUrlsBySport[$sportKey] = $apiBase . '/sports/' . rawurlencode($sportKey) . '/scores?' . http_build_query($scoreQuery);
            }

            $scoreResponses = self::httpGetMany($scoreUrlsBySport);
            foreach ($scoreResponses as $scoreRaw) {
                if ($scoreRaw === null) {
                    continue;
                }
                $rows = json_decode($scoreRaw, true);
                if (!is_array($rows)) {
                    continue;
                }
                foreach ($rows as $scoreEvent) {
                    if (!is_array($scoreEvent) || !isset($scoreEvent['id'])) {
                        continue;
                    }
                    $scoresByExternalId[(string) $scoreEvent['id']] = $scoreEvent;
                }
            }
        }

        $oddsUrlsBySport = [];
        foreach ($sports as $sportKey) {
            $query = [
                'apiKey' => $apiKey,
                'regions' => $regions,
                'markets' => $markets,
                'oddsFormat' => $oddsFormat,
            ];
            if ($bookmakers !== '') {
                $query['bookmakers'] = $bookmakers;
            }
            $oddsUrlsBySport[$sportKey] = $apiBase . '/sports/' . rawurlencode($sportKey) . '/odds?' . http_build_query($query);
        }

        $snapshot = [];
        $oddsResponses = self::httpGetMany($oddsUrlsBySport);
        foreach ($oddsResponses as $sportKey => $raw) {
            if ($raw === null) {
                continue;
            }

            $events = json_decode($raw, true);
            if (!is_array($events)) {
                continue;
            }

            foreach ($events as $event) {
                if (!is_array($event)) {
                    continue;
                }

                $homeTeam = (string) ($event['home_team'] ?? 'Unknown Home');
                $awayTeam = (string) ($event['away_team'] ?? 'Unknown Away');
                $externalId = (string) ($event['id'] ?? '');
                if ($externalId === '') {
                    $externalId = sha1($sportKey . '|' . (string) ($event['commence_time'] ?? '') . '|' . $homeTeam . '|' . $awayTeam);
                }

                $mergedEvent = $event;
                if (isset($scoresByExternalId[$externalId]) && is_array($scoresByExternalId[$externalId])) {
                    $mergedEvent = array_merge($mergedEvent, $scoresByExternalId[$externalId]);
                }

                $statusAndScore = self::extractScoreAndStatus($mergedEvent, $homeTeam, $awayTeam);

                $oddsData = self::pickPrimaryBookmakerOdds($event['bookmakers'] ?? null);

                $snapshot[] = [
                    'id' => $externalId,
                    'externalId' => $externalId,
                    'homeTeam' => $homeTeam,
                    'awayTeam' => $awayTeam,
                    'startTime' => $event['commence_time'] ?? null,
                    'sport' => $event['sport_title'] ?? ($event['sport'] ?? $sportKey),
                    'sportKey' => $sportKey,
                    'status' => $statusAndScore['status'],
                    'odds' => $oddsData,
                    'score' => $statusAndScore['score'],
                    'lastUpdated' => gmdate(DATE_ATOM),
                    'lastOddsSyncAt' => gmdate(DATE_ATOM),
                    'lastScoreSyncAt' => count((array) ($statusAndScore['score'] ?? [])) > 0 ? gmdate(DATE_ATOM) : null,
                    'updatedAt' => gmdate(DATE_ATOM),
                ];
            }
        }

        usort($snapshot, static function (array $a, array $b): int {
            return strcmp((string) ($a['startTime'] ?? ''), (string) ($b['startTime'] ?? ''));
        });

        // Cache the result
        self::$apiCache[$cacheKey] = [
            'data' => $snapshot,
            'timestamp' => $now,
        ];

        return $snapshot;
    }

    public static function updateMatches(SqlRepository $db, string $source = 'system'): array
    {
        $sportsApiEnabled = strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true';
        $apiKey = (string) Env::get('ODDS_API_KEY', '');
        $regions = (string) Env::get('ODDS_API_REGIONS', 'us');
        $markets = (string) Env::get('ODDS_API_MARKETS', 'h2h,spreads,totals');
        $oddsFormat = (string) Env::get('ODDS_API_ODDS_FORMAT', 'american');
        $bookmakers = (string) Env::get('ODDS_API_BOOKMAKERS', '');
        $scoresEnabled = strtolower((string) Env::get('ODDS_SCORES_ENABLED', 'true')) === 'true';
        $scoresDaysFrom = self::scoresDaysFrom();
        $apiBase = 'https://api.the-odds-api.com/v4';

        $result = [
            'created' => 0,
            'updated' => 0,
            'settled' => 0,
            'apiCalls' => 0,
            'blocked' => false,
            'successfulCalls' => 0,
            'failedCalls' => 0,
            'oddsCallsOk' => 0,
            'scoresCallsOk' => 0,
            'scoreOnlyUpdates' => 0,
            'upstreamErrors' => [],
            'emptyEventsBySport' => [],
            'tiersFetched' => [
                'tier1' => ['candidate' => 0, 'due' => 0],
                'tier2' => ['candidate' => 0, 'due' => 0],
                'tier3' => ['candidate' => 0, 'due' => 0],
            ],
            'rateLimit' => [
                'minRemaining' => null,
                'maxUsed' => null,
                'sports' => new stdClass(),
            ],
            'circuitBreaker' => self::circuitSnapshot(),
        ];
        $runId = SportsbookHealth::recordSyncStart($db, $source, [
            'sportsEnabled' => $sportsApiEnabled,
            'scoresEnabled' => $scoresEnabled,
        ]);

        try {
            if (!$sportsApiEnabled || $apiKey === '') {
                $result['blocked'] = true;
                SportsbookHealth::recordSyncSuccess($db, $runId, $source, $result);
                return $result;
            }

            $breaker = self::circuitSnapshot();
            if (($breaker['state'] ?? 'closed') === 'open') {
                $result['blocked'] = true;
                $result['circuitBreaker'] = $breaker;
                $result['upstreamErrors'][] = [
                    'sport' => 'all',
                    'feed' => 'odds',
                    'status' => 0,
                    'error' => 'Circuit breaker open; skipping upstream odds sync until cooldown ends',
                ];
                SportsbookHealth::recordSyncSuccess($db, $runId, $source, $result);
                return $result;
            }

            $sports = self::resolveSportsList($apiKey, $apiBase);
            $tierPlan = self::filterDueSports($sports);
            $dueSports = $tierPlan['due'];
            $result['tiersFetched'] = $tierPlan['counts'];
            $scoresByExternalId = [];
            $processedExternalIds = [];

            if ($scoresEnabled) {
                $scoreUrlsBySport = [];
                foreach ($dueSports as $sportKey) {
                    $scoreQuery = ['apiKey' => $apiKey, 'dateFormat' => 'iso'];
                    if ($scoresDaysFrom > 0) {
                        $scoreQuery['daysFrom'] = $scoresDaysFrom;
                    }

                    $scoreUrlsBySport[$sportKey] = $apiBase . '/sports/' . rawurlencode($sportKey) . '/scores?' . http_build_query($scoreQuery);
                }

                $scoreResponses = self::httpGetManyDetailed($scoreUrlsBySport);
                foreach ($scoreResponses as $sportKey => $scoreResponse) {
                    self::registerApiResponse($result, $sportKey, 'scores', $scoreResponse);
                    $scoreRaw = $scoreResponse['body'] ?? null;
                    if (!is_string($scoreRaw) || $scoreRaw === '') {
                        continue;
                    }

                    $scoreRows = json_decode($scoreRaw, true);
                    if (!is_array($scoreRows)) {
                        $result['failedCalls']++;
                        $result['upstreamErrors'][] = [
                            'sport' => $sportKey,
                            'feed' => 'scores',
                            'status' => $scoreResponse['status'] ?? 0,
                            'error' => 'Invalid JSON payload from scores feed',
                        ];
                        continue;
                    }
                    if ($scoreRows === [] && (int) ($scoreResponse['status'] ?? 0) === 200) {
                        $result['emptyEventsBySport'][] = ['sport' => $sportKey, 'feed' => 'scores'];
                    }
                    foreach ($scoreRows as $scoreEvent) {
                        if (!is_array($scoreEvent) || !isset($scoreEvent['id'])) {
                            continue;
                        }
                        $scoreEvent['_sportKey'] = $sportKey;
                        $scoresByExternalId[(string) $scoreEvent['id']] = $scoreEvent;
                    }
                }
            }

            $oddsUrlsBySport = [];
            foreach ($dueSports as $sportKey) {
                $query = [
                    'apiKey' => $apiKey,
                    'regions' => $regions,
                    'markets' => $markets,
                    'oddsFormat' => $oddsFormat,
                ];
                if ($bookmakers !== '') {
                    $query['bookmakers'] = $bookmakers;
                }

                $oddsUrlsBySport[$sportKey] = $apiBase . '/sports/' . rawurlencode($sportKey) . '/odds?' . http_build_query($query);
            }

            $oddsResponses = self::httpGetManyDetailed($oddsUrlsBySport);
            foreach ($oddsResponses as $sportKey => $oddsResponse) {
                self::registerApiResponse($result, $sportKey, 'odds', $oddsResponse);
                $raw = $oddsResponse['body'] ?? null;
                if (!is_string($raw) || $raw === '') {
                    continue;
                }

                $events = json_decode($raw, true);
                if (!is_array($events)) {
                    $result['failedCalls']++;
                    $result['upstreamErrors'][] = [
                        'sport' => $sportKey,
                        'feed' => 'odds',
                        'status' => $oddsResponse['status'] ?? 0,
                        'error' => 'Invalid JSON payload from odds feed',
                    ];
                    continue;
                }
                if ($events === [] && (int) ($oddsResponse['status'] ?? 0) === 200) {
                    $result['emptyEventsBySport'][] = ['sport' => $sportKey, 'feed' => 'odds'];
                }

                foreach ($events as $event) {
                    if (!is_array($event)) {
                        continue;
                    }
                    $homeTeam = (string) ($event['home_team'] ?? 'Unknown Home');
                    $awayTeam = (string) ($event['away_team'] ?? 'Unknown Away');
                    $externalId = (string) ($event['id'] ?? '');
                    if ($externalId === '') {
                        $externalId = sha1($sportKey . '|' . (string) ($event['commence_time'] ?? '') . '|' . $homeTeam . '|' . $awayTeam);
                    }
                    $processedExternalIds[$externalId] = true;

                    $mergedEvent = $event;
                    if (isset($scoresByExternalId[$externalId]) && is_array($scoresByExternalId[$externalId])) {
                        $mergedEvent = array_merge($mergedEvent, $scoresByExternalId[$externalId]);
                    }

                    $statusAndScore = self::extractScoreAndStatus($mergedEvent, $homeTeam, $awayTeam);
                    $doc = self::buildOddsDocument($event, $sportKey, $externalId, $homeTeam, $awayTeam, $statusAndScore);

                    $existing = $db->findOne('matches', ['externalId' => $externalId], ['projection' => ['id' => 1, 'status' => 1, 'odds' => 1, 'oddsSource' => 1, 'lastOddsSyncAt' => 1, 'playerProps' => 1, 'lastPropsSyncAt' => 1]]);
                    if ($existing === null) {
                        $doc['createdAt'] = SqlRepository::nowUtc();
                        $createdId = $db->insertOne('matches', $doc);
                        $result['created']++;
                        $result['settled'] += self::maybeSettleMatch($db, $createdId, $doc['status'] ?? '');
                    } elseif (self::isRundownLiveOwned($existing)) {
                        // Rundown is currently the live source for this row —
                        // skip the OddsAPI overwrite so live odds stay 100%
                        // Rundown-driven. OddsAPI takes back over once Rundown
                        // stops touching the row (game ended / lost feed).
                        $result['skippedRundownLive'] = ($result['skippedRundownLive'] ?? 0) + 1;
                    } else {
                        $oldStatus = (string) ($existing['status'] ?? '');
                        // Preserve extendedMarkets (period markets, alt
                        // lines, team totals) that the per-event sync
                        // populated — the bulk /odds feed never returns
                        // these, so replacing the whole `odds` field
                        // with just h2h/spreads/totals would wipe them.
                        $existingOdds = is_array($existing['odds'] ?? null) ? $existing['odds'] : [];
                        if (isset($existingOdds['extendedMarkets']) && is_array($existingOdds['extendedMarkets'])) {
                            $doc['odds']['extendedMarkets'] = $existingOdds['extendedMarkets'];
                        }
                        $db->updateOne('matches', ['id' => SqlRepository::id((string) $existing['id'])], $doc);
                        $result['updated']++;
                        if (($doc['status'] ?? '') === 'finished' || $oldStatus === 'finished') {
                            $result['settled'] += self::maybeSettleMatch($db, (string) $existing['id'], (string) ($doc['status'] ?? ''));
                        }
                    }
                }
            }

            foreach ($scoresByExternalId as $externalId => $scoreEvent) {
                if (!is_array($scoreEvent) || isset($processedExternalIds[$externalId])) {
                    continue;
                }
                $updated = self::updateExistingMatchFromScoreEvent($db, $externalId, $scoreEvent);
                if (($updated['updated'] ?? false) !== true) {
                    continue;
                }
                $result['updated']++;
                $result['scoreOnlyUpdates']++;
                $result['settled'] += (int) ($updated['settled'] ?? 0);
            }

            // Record successful attempts in the tier-sync state so the next cycle
            // can skip them until their cadence elapses. We mark every attempted
            // sport (regardless of outcome) — a 429 shouldn't trigger an immediate
            // retry; the tier cadence is the retry gate.
            if ($dueSports !== []) {
                $state = self::loadSportSyncState();
                $nowIso = gmdate(DATE_ATOM);
                foreach ($dueSports as $s) {
                    $state[$s] = $nowIso;
                }
                self::saveSportSyncState($state);
            }

            if ((int) ($result['apiCalls'] ?? 0) > 0 && (int) ($result['successfulCalls'] ?? 0) === 0) {
                $result['settlementSweep'] = [
                    'skipped' => true,
                    'reason' => 'upstream_unavailable',
                    'matchesChecked' => 0,
                    'matchesSettled' => 0,
                    'betsSettled' => 0,
                    'errors' => 0,
                    'matchIds' => [],
                ];
                throw new RuntimeException('Odds sync failed: all upstream API requests failed');
            }

            self::recordCircuitSuccess();
            $result['circuitBreaker'] = self::circuitSnapshot();

            $sweep = BetSettlementService::settlePendingMatches($db, 250, 'system');
            $result['settlementSweep'] = $sweep;

            $extendedEnabled = strtolower((string) Env::get('ODDS_EXTENDED_SYNC_ENABLED', 'false')) === 'true';
            if ($extendedEnabled) {
                $activeMatches = $db->findMany(
                    'matches',
                    ['status' => ['$in' => ['scheduled', 'live']]],
                    ['projection' => ['id' => 1, 'externalId' => 1, 'sportKey' => 1, 'odds' => 1, 'playerProps' => 1, 'lastPropsSyncAt' => 1]]
                );
                $cfg = self::tierConfig();
                if ($cfg['tieringActive'] && !$cfg['tier3ExtendedSync']) {
                    $sportTier = $cfg['sportTier'];
                    $activeMatches = array_values(array_filter($activeMatches, static function ($m) use ($sportTier) {
                        $sk = (string) ($m['sportKey'] ?? '');
                        $tier = $sportTier[$sk] ?? 'tier3';
                        return $tier !== 'tier3';
                    }));
                }
                $extendedResult = self::syncEventExtendedForMatches($db, $activeMatches);
                $result['extended'] = $extendedResult;
            }

            if (class_exists('RealtimeEventBus')) {
                RealtimeEventBus::publish('odds:sync', [
                    'source' => $source,
                    'created' => (int) ($result['created'] ?? 0),
                    'updated' => (int) ($result['updated'] ?? 0),
                    'settled' => (int) ($result['settled'] ?? 0),
                    'scoreOnlyUpdates' => (int) ($result['scoreOnlyUpdates'] ?? 0),
                    'successfulCalls' => (int) ($result['successfulCalls'] ?? 0),
                    'failedCalls' => (int) ($result['failedCalls'] ?? 0),
                    'time' => gmdate(DATE_ATOM),
                ]);
            }

            SportsbookHealth::recordSyncSuccess($db, $runId, $source, $result);
            SportsbookCache::invalidatePublicMatchCaches();
            return $result;
        } catch (Throwable $e) {
            self::recordCircuitFailure($e->getMessage());
            $result['circuitBreaker'] = self::circuitSnapshot();
            if (class_exists('RealtimeEventBus')) {
                RealtimeEventBus::publish('odds:sync:error', [
                    'source' => $source,
                    'message' => $e->getMessage(),
                    'time' => gmdate(DATE_ATOM),
                ]);
            }
            SportsbookHealth::recordSyncFailure($db, $runId, $source, $e, $result);
            throw $e;
        }
    }

    /**
     * Fetch odds + scores for a single sport and persist match rows. Intended
     * for user-triggered on-demand refresh — lighter than updateMatches(): no
     * settlement sweep, no extended-odds pass, no tier-sync-state updates, no
     * circuit-breaker short-circuit. The main cron continues to own those.
     *
     * @return array{success:bool, sport_key:string, last_updated?:string, matches:list<array<string,mixed>>, error?:string, credits_used?:int, http_status?:array{odds:int, scores:int}}
     */
    public static function syncSingleSport(SqlRepository $db, string $sportKey): array
    {
        $apiKey = (string) Env::get('ODDS_API_KEY', '');
        $sportsApiEnabled = strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true';
        if (!$sportsApiEnabled || $apiKey === '' || $sportKey === '') {
            return ['success' => false, 'sport_key' => $sportKey, 'matches' => [], 'error' => 'odds_api_disabled'];
        }

        $apiBase = 'https://api.the-odds-api.com/v4';
        $regions = (string) Env::get('ODDS_API_REGIONS', 'us');
        $markets = (string) Env::get('ODDS_API_MARKETS', 'h2h,spreads,totals');
        $oddsFormat = (string) Env::get('ODDS_API_ODDS_FORMAT', 'decimal');
        $bookmakers = (string) Env::get('ODDS_API_BOOKMAKERS', '');
        $scoresEnabled = strtolower((string) Env::get('ODDS_SCORES_ENABLED', 'true')) === 'true';
        $scoresDaysFrom = self::scoresDaysFrom();

        $urls = [];
        $oddsQuery = [
            'apiKey' => $apiKey,
            'regions' => $regions,
            'markets' => $markets,
            'oddsFormat' => $oddsFormat,
        ];
        if ($bookmakers !== '') $oddsQuery['bookmakers'] = $bookmakers;
        $urls['odds'] = $apiBase . '/sports/' . rawurlencode($sportKey) . '/odds?' . http_build_query($oddsQuery);

        if ($scoresEnabled) {
            $scoreQuery = ['apiKey' => $apiKey, 'dateFormat' => 'iso'];
            if ($scoresDaysFrom > 0) $scoreQuery['daysFrom'] = $scoresDaysFrom;
            $urls['scores'] = $apiBase . '/sports/' . rawurlencode($sportKey) . '/scores?' . http_build_query($scoreQuery);
        }

        $responses = self::httpGetManyDetailed($urls);

        $oddsResp = $responses['odds'] ?? null;
        $oddsStatus = (int) ($oddsResp['status'] ?? 0);
        if (!is_array($oddsResp) || $oddsStatus !== 200 || !is_string($oddsResp['body'] ?? null) || $oddsResp['body'] === '') {
            return [
                'success' => false,
                'sport_key' => $sportKey,
                'matches' => [],
                'error' => $oddsStatus === 429 ? 'upstream_rate_limited' : 'upstream_fetch_failed',
                'http_status' => ['odds' => $oddsStatus, 'scores' => (int) ($responses['scores']['status'] ?? 0)],
            ];
        }
        $events = json_decode($oddsResp['body'], true);
        if (!is_array($events)) {
            return ['success' => false, 'sport_key' => $sportKey, 'matches' => [], 'error' => 'upstream_invalid_json'];
        }

        $scoresByExternalId = [];
        $scoresStatus = 0;
        if ($scoresEnabled && isset($responses['scores'])) {
            $scoresStatus = (int) ($responses['scores']['status'] ?? 0);
            if ($scoresStatus === 200 && is_string($responses['scores']['body'] ?? null)) {
                $scoreRows = json_decode($responses['scores']['body'], true);
                if (is_array($scoreRows)) {
                    foreach ($scoreRows as $scoreEvent) {
                        if (is_array($scoreEvent) && isset($scoreEvent['id'])) {
                            $scoreEvent['_sportKey'] = $sportKey;
                            $scoresByExternalId[(string) $scoreEvent['id']] = $scoreEvent;
                        }
                    }
                }
            }
        }

        $updated = [];
        $now = time();
        foreach ($events as $event) {
            if (!is_array($event)) continue;
            $homeTeam = (string) ($event['home_team'] ?? 'Unknown Home');
            $awayTeam = (string) ($event['away_team'] ?? 'Unknown Away');
            $externalId = (string) ($event['id'] ?? '');
            if ($externalId === '') {
                $externalId = sha1($sportKey . '|' . (string) ($event['commence_time'] ?? '') . '|' . $homeTeam . '|' . $awayTeam);
            }
            $mergedEvent = $event;
            if (isset($scoresByExternalId[$externalId]) && is_array($scoresByExternalId[$externalId])) {
                $mergedEvent = array_merge($mergedEvent, $scoresByExternalId[$externalId]);
            }
            $statusAndScore = self::extractScoreAndStatus($mergedEvent, $homeTeam, $awayTeam);
            $doc = self::buildOddsDocument($event, $sportKey, $externalId, $homeTeam, $awayTeam, $statusAndScore);

            $existing = $db->findOne('matches', ['externalId' => $externalId], ['projection' => ['id' => 1, 'odds' => 1, 'oddsSource' => 1, 'lastOddsSyncAt' => 1, 'status' => 1]]);
            if ($existing === null) {
                $doc['createdAt'] = SqlRepository::nowUtc();
                $db->insertOne('matches', $doc);
            } elseif (self::isRundownLiveOwned($existing)) {
                // See bulk-sync path: skip overwriting rows that Rundown is
                // actively updating, so live odds remain Rundown-only.
            } else {
                $existingOdds = is_array($existing['odds'] ?? null) ? $existing['odds'] : [];
                if (isset($existingOdds['extendedMarkets']) && is_array($existingOdds['extendedMarkets'])) {
                    $doc['odds']['extendedMarkets'] = $existingOdds['extendedMarkets'];
                }
                $db->updateOne('matches', ['id' => SqlRepository::id((string) $existing['id'])], $doc);
            }
            // Only surface future-commence matches to the caller — the frontend
            // refresh button renders into the pre-match listing, which hides
            // started matches (see Step 1 in MatchesController::computeMatches).
            $parsed = isset($doc['startTime']) ? strtotime((string) $doc['startTime']) : false;
            if ($parsed === false || $parsed > $now) {
                $updated[] = $doc;
            }
        }

        // Bump the global odds-feed health timestamp so SportsbookHealth's
        // staleness gate stops blocking betting. Without this, a fresh
        // user-triggered refresh writes new match rows but the public
        // sportsbookSnapshot still reads the worker's last-success timestamp,
        // which can be older than SPORTSBOOK_MAX_SYNC_AGE_SECONDS — every
        // match then renders with "Sportsbook odds feed is stale (Xs old)"
        // even though the upstream call we just made succeeded.
        SportsbookHealth::recordOddsApiSuccess($db, $scoresStatus === 200);
        // Invalidate the public /api/matches cache so the next poll sees fresh rows.
        SportsbookCache::invalidatePublicMatchCaches();

        // Push a per-sport realtime event so subscribed clients viewing
        // this sport's matches refetch immediately (instead of waiting
        // for their 30s auto-poll). Cheap: just appends a line to the
        // ws-events log; the WS server tail-broadcasts to listeners.
        if (class_exists('RealtimeEventBus')) {
            RealtimeEventBus::publish('odds:sport:sync', [
                'sport_key' => $sportKey,
                'updated' => count($updated),
                'time' => gmdate(DATE_ATOM),
            ]);
        }

        $creditsUsedBefore = isset($oddsResp['headers']['x-requests-used']) ? (int) $oddsResp['headers']['x-requests-used'] : null;
        $scoresUsed = isset($responses['scores']['headers']['x-requests-used']) ? (int) $responses['scores']['headers']['x-requests-used'] : null;
        return [
            'success' => true,
            'sport_key' => $sportKey,
            'last_updated' => gmdate(DATE_ATOM),
            'matches' => $updated,
            'credits_used' => ($creditsUsedBefore !== null && $scoresUsed !== null) ? max($creditsUsedBefore, $scoresUsed) : null,
            'http_status' => ['odds' => $oddsStatus, 'scores' => $scoresStatus],
        ];
    }

    /**
     * Fetch every currently-live OddsAPI event with odds and persist it for
     * Live Now. This intentionally ignores the prematch tier cadence: live
     * odds need a full upstream sweep whenever the Live Now path refreshes.
     *
     * @return array{ok:bool,sportsChecked:int,liveScoreEvents:int,liveSports:int,oddsCalls:int,created:int,updated:int,finished:int,errors:int,matches:list<array<string,mixed>>,perSport:array<string,array<string,int>>}
     */
    public static function syncLiveOdds(SqlRepository $db): array
    {
        $apiKey = (string) Env::get('ODDS_API_KEY', '');
        $sportsApiEnabled = strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true';
        $result = [
            'ok' => false,
            'sportsChecked' => 0,
            'liveScoreEvents' => 0,
            'liveSports' => 0,
            'oddsCalls' => 0,
            'created' => 0,
            'updated' => 0,
            'finished' => 0,
            'errors' => 0,
            'matches' => [],
            'perSport' => [],
        ];

        if (!$sportsApiEnabled || $apiKey === '') {
            $result['errors']++;
            return $result;
        }

        $apiBase = 'https://api.the-odds-api.com/v4';
        $sports = self::resolveSportsListForLive($apiKey, $apiBase);
        $result['sportsChecked'] = count($sports);
        if ($sports === []) {
            $result['ok'] = true;
            return $result;
        }

        $scoreUrlsBySport = [];
        foreach ($sports as $sportKey) {
            $scoreQuery = ['apiKey' => $apiKey, 'dateFormat' => 'iso'];
            $scoreQuery['daysFrom'] = self::scoresDaysFrom();
            $scoreUrlsBySport[$sportKey] = $apiBase . '/sports/' . rawurlencode($sportKey) . '/scores?' . http_build_query($scoreQuery);
        }

        $liveScoresBySport = [];
        foreach (self::httpGetManyDetailed($scoreUrlsBySport) as $sportKey => $scoreResponse) {
            $raw = $scoreResponse['body'] ?? null;
            if (!is_string($raw) || $raw === '') {
                $result['errors']++;
                continue;
            }
            $scoreRows = json_decode($raw, true);
            if (!is_array($scoreRows)) {
                $result['errors']++;
                continue;
            }
            foreach ($scoreRows as $scoreEvent) {
                if (!self::isOddsApiLiveScoreEvent($scoreEvent)) {
                    continue;
                }
                $externalId = (string) ($scoreEvent['id'] ?? '');
                if ($externalId === '') {
                    continue;
                }
                $scoreEvent['_sportKey'] = $sportKey;
                $liveScoresBySport[$sportKey][$externalId] = $scoreEvent;
                $result['liveScoreEvents']++;
            }
        }

        $result['liveSports'] = count($liveScoresBySport);
        if ($liveScoresBySport === []) {
            $result['ok'] = true;
            return $result;
        }

        $regions = (string) Env::get('ODDS_API_REGIONS', 'us');
        $markets = (string) Env::get('ODDS_API_MARKETS', 'h2h,spreads,totals');
        $oddsFormat = (string) Env::get('ODDS_API_ODDS_FORMAT', 'decimal');
        $bookmakers = (string) Env::get('ODDS_API_BOOKMAKERS', '');

        $oddsUrlsBySport = [];
        foreach (array_keys($liveScoresBySport) as $sportKey) {
            $query = [
                'apiKey' => $apiKey,
                'regions' => $regions,
                'markets' => $markets,
                'oddsFormat' => $oddsFormat,
            ];
            if ($bookmakers !== '') {
                $query['bookmakers'] = $bookmakers;
            }
            $oddsUrlsBySport[$sportKey] = $apiBase . '/sports/' . rawurlencode($sportKey) . '/odds?' . http_build_query($query);
        }

        foreach (self::httpGetManyDetailed($oddsUrlsBySport) as $sportKey => $oddsResponse) {
            $result['oddsCalls']++;
            $raw = $oddsResponse['body'] ?? null;
            if (!is_string($raw) || $raw === '') {
                $result['errors']++;
                continue;
            }
            $events = json_decode($raw, true);
            if (!is_array($events)) {
                $result['errors']++;
                continue;
            }

            $result['perSport'][$sportKey] ??= ['live' => count($liveScoresBySport[$sportKey] ?? []), 'withOdds' => 0, 'created' => 0, 'updated' => 0];
            foreach ($events as $event) {
                if (!is_array($event)) {
                    continue;
                }
                $externalId = (string) ($event['id'] ?? '');
                if ($externalId === '' || !isset($liveScoresBySport[$sportKey][$externalId])) {
                    continue;
                }
                if (!is_array($event['bookmakers'] ?? null) || count($event['bookmakers']) === 0) {
                    continue;
                }

                $homeTeam = (string) ($event['home_team'] ?? ($liveScoresBySport[$sportKey][$externalId]['home_team'] ?? 'Unknown Home'));
                $awayTeam = (string) ($event['away_team'] ?? ($liveScoresBySport[$sportKey][$externalId]['away_team'] ?? 'Unknown Away'));
                $mergedEvent = array_merge($event, $liveScoresBySport[$sportKey][$externalId]);
                $statusAndScore = self::extractScoreAndStatus($mergedEvent, $homeTeam, $awayTeam);
                $statusAndScore['status'] = 'live';
                $doc = self::buildOddsDocument($event, $sportKey, $externalId, $homeTeam, $awayTeam, $statusAndScore);
                $doc['status'] = 'live';
                $doc['oddsSource'] = 'oddsapi';

                $existing = $db->findOne('matches', ['externalId' => $externalId], ['projection' => ['id' => 1, 'odds' => 1, 'status' => 1]]);
                if ($existing === null) {
                    $doc['createdAt'] = SqlRepository::nowUtc();
                    $db->insertOne('matches', $doc);
                    $result['created']++;
                    $result['perSport'][$sportKey]['created']++;
                } else {
                    $existingOdds = is_array($existing['odds'] ?? null) ? $existing['odds'] : [];
                    if (isset($existingOdds['extendedMarkets']) && is_array($existingOdds['extendedMarkets'])) {
                        $doc['odds']['extendedMarkets'] = $existingOdds['extendedMarkets'];
                    }
                    $db->updateOne('matches', ['id' => SqlRepository::id((string) $existing['id'])], $doc);
                    $result['updated']++;
                    $result['perSport'][$sportKey]['updated']++;
                }

                $result['perSport'][$sportKey]['withOdds']++;
                $result['matches'][] = $doc;
            }
        }

        SportsbookHealth::recordOddsApiSuccess($db, true);
        SportsbookCache::invalidatePublicMatchCaches();

        if (class_exists('RealtimeEventBus')) {
            foreach (array_keys($liveScoresBySport) as $sportKey) {
                RealtimeEventBus::publish('odds:sport:sync', [
                    'sport_key' => $sportKey,
                    'source' => 'oddsapi-live',
                    'time' => gmdate(DATE_ATOM),
                ]);
            }
        }

        $result['ok'] = true;
        return $result;
    }

    /**
     * @return array<string,mixed>
     */
    private static function circuitSnapshot(): array
    {
        $state = self::readCircuitState();
        $now = time();
        $openUntil = (int) ($state['openUntilEpoch'] ?? 0);
        $openedAt = (int) ($state['openedAtEpoch'] ?? 0);
        $failureCount = (int) ($state['failureCount'] ?? 0);
        $threshold = max(1, (int) Env::get('ODDS_CB_FAILURE_THRESHOLD', '5'));

        $status = 'closed';
        if ($openUntil > $now) {
            $status = 'open';
        } elseif ($openedAt > 0 && $openUntil > 0 && $openUntil <= $now) {
            $status = 'half-open';
        }

        return [
            'state' => $status,
            'failureCount' => $failureCount,
            'threshold' => $threshold,
            'lastFailureAt' => isset($state['lastFailureAt']) ? (string) $state['lastFailureAt'] : null,
            'openedAt' => $openedAt > 0 ? gmdate(DATE_ATOM, $openedAt) : null,
            'openUntil' => $openUntil > 0 ? gmdate(DATE_ATOM, $openUntil) : null,
            'cooldownSeconds' => max(10, (int) Env::get('ODDS_CB_COOLDOWN_SECONDS', '180')),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public static function getCircuitBreakerStatus(): array
    {
        return self::circuitSnapshot();
    }

    /**
     * Force-open the upstream circuit breaker for manual operations.
     *
     * @return array<string,mixed>
     */
    public static function forceOpenCircuitBreaker(int $cooldownSeconds, string $reason = 'manual_open'): array
    {
        $now = time();
        $threshold = max(1, (int) Env::get('ODDS_CB_FAILURE_THRESHOLD', '5'));
        $seconds = max(30, min(86400, $cooldownSeconds));

        self::writeCircuitState([
            'failureCount' => $threshold,
            'lastFailureAt' => gmdate(DATE_ATOM, $now),
            'lastFailureMessage' => $reason,
            'openedAtEpoch' => $now,
            'openUntilEpoch' => $now + $seconds,
        ]);

        Logger::warning('Odds circuit breaker manually opened', [
            'reason' => $reason,
            'cooldownSeconds' => $seconds,
            'openedAt' => gmdate(DATE_ATOM, $now),
        ], 'sportsbook');

        return self::circuitSnapshot();
    }

    /**
     * @return array<string,mixed>
     */
    public static function resetCircuitBreaker(string $reason = 'manual_reset'): array
    {
        self::writeCircuitState([
            'failureCount' => 0,
            'lastFailureAt' => null,
            'lastFailureMessage' => $reason,
            'openedAtEpoch' => 0,
            'openUntilEpoch' => 0,
        ]);

        Logger::info('Odds circuit breaker manually reset', [
            'reason' => $reason,
            'resetAt' => gmdate(DATE_ATOM),
        ], 'sportsbook');

        return self::circuitSnapshot();
    }

    private static function recordCircuitFailure(string $message): void
    {
        $state = self::readCircuitState();
        $now = time();
        $threshold = max(1, (int) Env::get('ODDS_CB_FAILURE_THRESHOLD', '5'));
        $cooldownSeconds = max(10, (int) Env::get('ODDS_CB_COOLDOWN_SECONDS', '180'));

        $nextFailures = max(0, (int) ($state['failureCount'] ?? 0)) + 1;
        $openUntilEpoch = (int) ($state['openUntilEpoch'] ?? 0);
        if ($nextFailures >= $threshold) {
            $openUntilEpoch = $now + $cooldownSeconds;
            $state['openedAtEpoch'] = $now;
            $state['openUntilEpoch'] = $openUntilEpoch;
        }

        $state['failureCount'] = $nextFailures;
        $state['lastFailureAt'] = gmdate(DATE_ATOM, $now);
        $state['lastFailureMessage'] = $message;
        self::writeCircuitState($state);
    }

    private static function recordCircuitSuccess(): void
    {
        self::writeCircuitState([
            'failureCount' => 0,
            'lastFailureAt' => null,
            'lastFailureMessage' => null,
            'openedAtEpoch' => 0,
            'openUntilEpoch' => 0,
            'updatedAt' => gmdate(DATE_ATOM),
        ]);
    }

    /**
     * @return array<string,mixed>
     */
    private static function readCircuitState(): array
    {
        $file = self::circuitStateFile();
        if (!is_file($file)) {
            return [];
        }
        $raw = @file_get_contents($file);
        if (!is_string($raw) || $raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string,mixed> $state
     */
    private static function writeCircuitState(array $state): void
    {
        $file = self::circuitStateFile();
        $dir = dirname($file);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $state['updatedAt'] = gmdate(DATE_ATOM);
        $encoded = json_encode($state, JSON_UNESCAPED_SLASHES);
        if (!is_string($encoded)) {
            return;
        }
        @file_put_contents($file, $encoded, LOCK_EX);
    }

    private static function circuitStateFile(): string
    {
        return dirname(__DIR__) . '/cache/odds-circuit-breaker.json';
    }

    /**
     * Fetch extended markets + player props for a single event via per-event endpoint.
     * Returns ['markets' => [...], 'playerProps' => [...], 'quota' => [...]].
     *
     * @return array<string, mixed>
     */
    public static function fetchEventExtendedOdds(string $sportKey, string $externalId): array
    {
        $apiKey = (string) Env::get('ODDS_API_KEY', '');
        $sportsApiEnabled = strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true';
        if (!$sportsApiEnabled || $apiKey === '' || $externalId === '') {
            return ['markets' => [], 'playerProps' => [], 'quota' => []];
        }

        $regions = (string) Env::get('ODDS_API_REGIONS', 'us');
        $oddsFormat = (string) Env::get('ODDS_API_ODDS_FORMAT', 'american');
        $bookmakers = (string) Env::get('ODDS_API_BOOKMAKERS', '');
        $apiBase = 'https://api.the-odds-api.com/v4';

        $perEventMarkets = OddsMarketCatalog::perEventMarkets($sportKey);
        if ($perEventMarkets === []) {
            return ['markets' => [], 'playerProps' => [], 'quota' => []];
        }

        // The Odds API accepts many markets per request but splitting keeps payloads
        // sane and avoids the 10-market-per-call recommendation for props.
        $chunks = array_chunk($perEventMarkets, 10);
        $urls = [];
        foreach ($chunks as $idx => $chunk) {
            $query = [
                'apiKey' => $apiKey,
                'regions' => $regions,
                'markets' => implode(',', $chunk),
                'oddsFormat' => $oddsFormat,
            ];
            if ($bookmakers !== '') {
                $query['bookmakers'] = $bookmakers;
            }
            $urls['chunk_' . $idx] = $apiBase . '/sports/' . rawurlencode($sportKey)
                . '/events/' . rawurlencode($externalId) . '/odds?' . http_build_query($query);
        }

        $responses = self::httpGetManyDetailed($urls);

        $mergedMarkets = [];
        $quota = [];
        foreach ($responses as $chunkKey => $response) {
            $headers = is_array($response['headers'] ?? null) ? $response['headers'] : [];
            if (isset($headers['x-requests-remaining'])) {
                $quota['remaining'] = (int) $headers['x-requests-remaining'];
            }
            if (isset($headers['x-requests-used'])) {
                $quota['used'] = (int) $headers['x-requests-used'];
            }

            $body = $response['body'] ?? null;
            if (!is_string($body) || $body === '') {
                continue;
            }
            $decoded = json_decode($body, true);
            if (!is_array($decoded) || !isset($decoded['bookmakers']) || !is_array($decoded['bookmakers'])) {
                continue;
            }
            // Iterate every bookmaker — the first one often hasn't posted
            // period/prop markets (esp. for games starting soon). First-seen
            // wins per market key so the primary book still takes precedence
            // when multiple books carry the same market.
            foreach ($decoded['bookmakers'] as $bookmaker) {
                if (!is_array($bookmaker) || !isset($bookmaker['markets']) || !is_array($bookmaker['markets'])) {
                    continue;
                }
                foreach ($bookmaker['markets'] as $market) {
                    if (!is_array($market) || !isset($market['key'])) {
                        continue;
                    }
                    $key = (string) $market['key'];
                    if (!isset($mergedMarkets[$key])) {
                        $mergedMarkets[$key] = $market;
                    }
                }
            }
        }

        $markets = [];
        $playerProps = [];
        foreach ($mergedMarkets as $key => $market) {
            if (OddsMarketCatalog::isPropMarket((string) $key)) {
                $playerProps[] = $market;
            } else {
                $markets[] = $market;
            }
        }

        return [
            'markets' => $markets,
            'playerProps' => $playerProps,
            'quota' => $quota,
        ];
    }

    /**
     * Sync extended markets + player props for a batch of match documents.
     * Updates each match doc's odds.extendedMarkets and playerProps fields.
     *
     * @param list<array<string, mixed>> $matches
     * @return array{updated: int, apiCalls: int, quotaRemaining: ?int}
     */
    public static function syncEventExtendedForMatches(SqlRepository $db, array $matches): array
    {
        $updated = 0;
        $apiCalls = 0;
        $quotaRemaining = null;

        foreach ($matches as $match) {
            if (!is_array($match)) {
                continue;
            }
            $matchId = (string) ($match['id'] ?? '');
            $sportKey = (string) ($match['sportKey'] ?? '');
            $externalId = (string) ($match['externalId'] ?? '');
            if ($matchId === '' || $sportKey === '' || $externalId === '') {
                continue;
            }

            $result = self::fetchEventExtendedOdds($sportKey, $externalId);
            $apiCalls += count(OddsMarketCatalog::perEventMarkets($sportKey)) > 0
                ? max(1, (int) ceil(count(OddsMarketCatalog::perEventMarkets($sportKey)) / 10))
                : 0;
            $quota = is_array($result['quota'] ?? null) ? $result['quota'] : [];
            if (isset($quota['remaining']) && is_numeric($quota['remaining'])) {
                $remaining = (int) $quota['remaining'];
                $quotaRemaining = $quotaRemaining === null ? $remaining : min($quotaRemaining, $remaining);
            }

            $extendedMarkets = is_array($result['markets'] ?? null) ? $result['markets'] : [];
            $playerProps = is_array($result['playerProps'] ?? null) ? $result['playerProps'] : [];

            $now = SqlRepository::nowUtc();
            $existingOdds = is_array($match['odds'] ?? null) ? $match['odds'] : [];
            $existingExtended = is_array($existingOdds['extendedMarkets'] ?? null) ? $existingOdds['extendedMarkets'] : [];
            $existingPlayerProps = is_array($match['playerProps'] ?? null) ? $match['playerProps'] : [];

            // Preserve prior data when a fetch cycle returns nothing. The
            // Odds API sporadically returns empty chunks (rate limits, book
            // filter mismatches, transient 422s) and unconditionally
            // overwriting would wipe out period/prop markets we'd already
            // captured on earlier cycles.
            $hadAnyData = count($extendedMarkets) > 0 || count($playerProps) > 0;
            $existingOdds['extendedMarkets'] = $hadAnyData ? $extendedMarkets : $existingExtended;
            $nextPlayerProps = $hadAnyData ? $playerProps : $existingPlayerProps;

            try {
                $db->updateOne('matches', ['id' => SqlRepository::id($matchId)], [
                    'odds' => $existingOdds,
                    'playerProps' => $nextPlayerProps,
                    'lastPropsSyncAt' => $now,
                    'updatedAt' => $now,
                ]);
                $updated++;
            } catch (Throwable $_e) {
                // swallow — individual failures shouldn't halt the batch
            }
        }

        return ['updated' => $updated, 'apiCalls' => $apiCalls, 'quotaRemaining' => $quotaRemaining];
    }

    /**
     * Fetch + cache extended odds for a single match on-demand. Returns cached
     * props if they were synced within EVENT_PROPS_TTL_SECONDS, otherwise hits
     * the API and persists fresh data.
     *
     * @return array{markets: list<array<string, mixed>>, playerProps: list<array<string, mixed>>, cached: bool}
     */
    public static function ensureEventExtendedOdds(SqlRepository $db, string $matchId): array
    {
        $match = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
        if ($match === null) {
            return ['markets' => [], 'playerProps' => [], 'cached' => false];
        }

        $lastSync = (string) ($match['lastPropsSyncAt'] ?? '');
        $fresh = false;
        if ($lastSync !== '') {
            $syncedAt = strtotime($lastSync);
            if ($syncedAt !== false && (time() - $syncedAt) < self::EVENT_PROPS_TTL_SECONDS) {
                $fresh = true;
            }
        }

        if ($fresh) {
            $odds = is_array($match['odds'] ?? null) ? $match['odds'] : [];
            return [
                'markets' => is_array($odds['extendedMarkets'] ?? null) ? $odds['extendedMarkets'] : [],
                'playerProps' => is_array($match['playerProps'] ?? null) ? $match['playerProps'] : [],
                'cached' => true,
            ];
        }

        self::syncEventExtendedForMatches($db, [$match]);
        $refreshed = $db->findOne('matches', ['id' => SqlRepository::id($matchId)]);
        $odds = is_array($refreshed['odds'] ?? null) ? $refreshed['odds'] : [];
        return [
            'markets' => is_array($odds['extendedMarkets'] ?? null) ? $odds['extendedMarkets'] : [],
            'playerProps' => is_array($refreshed['playerProps'] ?? null) ? $refreshed['playerProps'] : [],
            'cached' => false,
        ];
    }

    /**
     * Pick the first bookmaker that is actually offering lines for this
     * event. The Odds API sometimes orders bookmakers by freshness rather
     * than by market coverage, so `bookmakers[0]` can legitimately have an
     * empty `markets` array — particularly on in-play games where a single
     * book has pulled its lines. Falling back through the list avoids
     * rendering a full row of "—" dashes when another book has data.
     *
     * @param mixed $bookmakers
     * @return array{bookmaker: ?string, markets: array<int, mixed>}
     */
    private static function pickPrimaryBookmakerOdds(mixed $bookmakers): array
    {
        if (!is_array($bookmakers) || $bookmakers === []) {
            return ['bookmaker' => null, 'markets' => []];
        }

        $fallback = null;
        foreach ($bookmakers as $book) {
            if (!is_array($book)) {
                continue;
            }
            if ($fallback === null) {
                $fallback = $book;
            }
            $markets = $book['markets'] ?? null;
            if (is_array($markets) && $markets !== []) {
                return [
                    'bookmaker' => isset($book['title']) ? (string) $book['title'] : null,
                    'markets' => $markets,
                ];
            }
        }

        // Every bookmaker came back with empty markets. Preserve the
        // primary book's title so downstream UI still shows "N/A via
        // <book>" rather than null — and so we don't mask a feed issue
        // as a data issue.
        return [
            'bookmaker' => is_array($fallback) && isset($fallback['title']) ? (string) $fallback['title'] : null,
            'markets' => [],
        ];
    }

    /**
     * @param array<string, mixed> $event
     * @param array<string, mixed> $statusAndScore
     * @return array<string, mixed>
     */
    private static function buildOddsDocument(array $event, string $sportKey, string $externalId, string $homeTeam, string $awayTeam, array $statusAndScore): array
    {
        $oddsData = self::pickPrimaryBookmakerOdds($event['bookmakers'] ?? null);

        $now = SqlRepository::nowUtc();
        return [
            'externalId' => $externalId,
            'homeTeam' => $homeTeam,
            'awayTeam' => $awayTeam,
            // Short display names so the public odds board can render
            // "Thunder" / "Suns" instead of the full city+mascot. Records
            // come from the Rundown live feed (OddsAPI doesn't carry them)
            // and are merged in by RundownLiveSync without being touched here.
            'homeTeamShort' => TeamNormalizer::shortName($homeTeam, $sportKey),
            'awayTeamShort' => TeamNormalizer::shortName($awayTeam, $sportKey),
            'startTime' => $event['commence_time'] ?? null,
            'sport' => $event['sport_title'] ?? ($event['sport'] ?? $sportKey),
            'sportKey' => $sportKey,
            'status' => $statusAndScore['status'],
            'oddsSource' => 'oddsapi',
            'odds' => $oddsData,
            'score' => $statusAndScore['score'],
            'lastUpdated' => $now,
            'lastOddsSyncAt' => $now,
            'lastScoreSyncAt' => count((array) ($statusAndScore['score'] ?? [])) > 0 ? $now : null,
            'updatedAt' => $now,
        ];
    }

    /**
     * @param array<string, mixed> $scoreEvent
     * @return array{updated: bool, settled: int}
     */
    private static function updateExistingMatchFromScoreEvent(SqlRepository $db, string $externalId, array $scoreEvent): array
    {
        $existing = $db->findOne('matches', ['externalId' => $externalId], ['projection' => [
            'id' => 1,
            'status' => 1,
            'homeTeam' => 1,
            'awayTeam' => 1,
            'startTime' => 1,
            'sport' => 1,
        ]]);
        if ($existing === null) {
            return ['updated' => false, 'settled' => 0];
        }

        $homeTeam = (string) ($scoreEvent['home_team'] ?? ($existing['homeTeam'] ?? 'Unknown Home'));
        $awayTeam = (string) ($scoreEvent['away_team'] ?? ($existing['awayTeam'] ?? 'Unknown Away'));
        $statusAndScore = self::extractScoreAndStatus($scoreEvent, $homeTeam, $awayTeam);
        $now = SqlRepository::nowUtc();

        $db->updateOne('matches', ['id' => SqlRepository::id((string) $existing['id'])], [
            'homeTeam' => $homeTeam,
            'awayTeam' => $awayTeam,
            'startTime' => $scoreEvent['commence_time'] ?? ($existing['startTime'] ?? null),
            'sport' => $scoreEvent['sport_title'] ?? ($existing['sport'] ?? ($scoreEvent['_sportKey'] ?? '')),
            'status' => $statusAndScore['status'],
            'score' => $statusAndScore['score'],
            'lastUpdated' => $now,
            'lastScoreSyncAt' => $now,
            'updatedAt' => $now,
        ]);

        $settled = 0;
        if (($statusAndScore['status'] ?? '') === 'finished' || (string) ($existing['status'] ?? '') === 'finished') {
            $settled = self::maybeSettleMatch($db, (string) $existing['id'], (string) ($statusAndScore['status'] ?? ''));
        }

        return ['updated' => true, 'settled' => $settled];
    }

    private static function maybeSettleMatch(SqlRepository $db, string $matchId, string $status): int
    {
        if ($status !== 'finished') {
            return 0;
        }
        if ($db->countDocuments('betselections', ['matchId' => SqlRepository::id($matchId), 'status' => 'pending']) === 0) {
            return 0;
        }
        try {
            $settlement = BetSettlementService::settleMatch($db, $matchId, null, 'system');
            return ((int) ($settlement['total'] ?? 0)) > 0 ? 1 : 0;
        } catch (Throwable $e) {
            return 0;
        }
    }

    /**
     * @param array<string, mixed> $result
     * @param array<string, mixed> $response
     */
    private static function registerApiResponse(array &$result, string $sportKey, string $feed, array $response): void
    {
        $result['apiCalls']++;
        $status = (int) ($response['status'] ?? 0);
        $body = $response['body'] ?? null;
        $error = (string) ($response['error'] ?? '');
        $headers = is_array($response['headers'] ?? null) ? $response['headers'] : [];
        $remaining = isset($headers['x-requests-remaining']) && is_numeric($headers['x-requests-remaining']) ? (int) $headers['x-requests-remaining'] : null;
        $used = isset($headers['x-requests-used']) && is_numeric($headers['x-requests-used']) ? (int) $headers['x-requests-used'] : null;

        if ($remaining !== null) {
            $currentMin = $result['rateLimit']['minRemaining'];
            $result['rateLimit']['minRemaining'] = $currentMin === null ? $remaining : min((int) $currentMin, $remaining);
        }
        if ($used !== null) {
            $currentMax = $result['rateLimit']['maxUsed'];
            $result['rateLimit']['maxUsed'] = $currentMax === null ? $used : max((int) $currentMax, $used);
        }
        if (!($result['rateLimit']['sports'] instanceof stdClass)) {
            $result['rateLimit']['sports'] = new stdClass();
        }
        $result['rateLimit']['sports']->{$feed . '_' . $sportKey} = [
            'status' => $status,
            'remaining' => $remaining,
            'used' => $used,
        ];

        if (is_string($body) && $body !== '' && $status > 0 && $status < 400) {
            $result['successfulCalls']++;
            if ($feed === 'odds') {
                $result['oddsCallsOk']++;
            } else {
                $result['scoresCallsOk']++;
            }
            return;
        }

        $result['failedCalls']++;
        $result['upstreamErrors'][] = [
            'sport' => $sportKey,
            'feed' => $feed,
            'status' => $status,
            'error' => $error !== '' ? $error : 'Upstream request failed',
        ];
    }

    private static function scoresDaysFrom(): int
    {
        $raw = Env::get('ODDS_SCORES_DAYS_FROM', '1');
        return is_numeric($raw) ? max(1, (int) $raw) : 1;
    }

    private static function isOddsApiLiveScoreEvent(mixed $scoreEvent): bool
    {
        if (!is_array($scoreEvent)) {
            return false;
        }
        if (($scoreEvent['completed'] ?? null) === true) {
            return false;
        }
        $scores = $scoreEvent['scores'] ?? null;
        return is_array($scores) && count($scores) > 0;
    }

    /**
     * @param array<string, string> $urlsByKey
     * @return array<string, string|null>
     */
    private static function httpGetMany(array $urlsByKey): array
    {
        $responses = [];
        foreach (self::httpGetManyDetailed($urlsByKey) as $key => $response) {
            $responses[$key] = isset($response['body']) && is_string($response['body']) ? $response['body'] : null;
        }
        return $responses;
    }

    /**
     * @param array<string, string> $urlsByKey
     * @return array<string, array{body: ?string, status: int, error: ?string, headers: array<string, string>}>
     */
    private static function httpGetManyDetailed(array $urlsByKey): array
    {
        if ($urlsByKey === []) {
            return [];
        }
        $responses = [];
        foreach (array_chunk($urlsByKey, self::UPSTREAM_MAX_CONCURRENT, true) as $chunk) {
            foreach (self::httpGetManyDetailedChunk($chunk) as $key => $response) {
                $responses[$key] = $response;
            }
        }
        return $responses;
    }

    /**
     * @param array<string, string> $urlsByKey
     * @return array<string, array{body: ?string, status: int, error: ?string, headers: array<string, string>}>
     */
    private static function httpGetManyDetailedChunk(array $urlsByKey): array
    {
        $responses = [];
        if ($urlsByKey === []) {
            return $responses;
        }

        $multi = curl_multi_init();
        if ($multi === false) {
            foreach ($urlsByKey as $key => $url) {
                $responses[$key] = self::httpGetDetailed($url);
            }
            return $responses;
        }

        $handles = [];
        $headersByKey = [];
        try {
            foreach ($urlsByKey as $key => $url) {
                $ch = curl_init($url);
                if ($ch === false) {
                    $responses[$key] = ['body' => null, 'status' => 0, 'error' => 'Unable to initialize cURL handle', 'headers' => []];
                    continue;
                }

                $headersByKey[$key] = [];
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 20,
                    CURLOPT_CONNECTTIMEOUT => 5,
                    CURLOPT_HEADERFUNCTION => static function ($curl, string $headerLine) use (&$headersByKey, $key): int {
                        $trimmed = trim($headerLine);
                        if ($trimmed === '' || !str_contains($trimmed, ':')) {
                            return strlen($headerLine);
                        }
                        [$name, $value] = explode(':', $trimmed, 2);
                        $headersByKey[$key][strtolower(trim($name))] = trim($value);
                        return strlen($headerLine);
                    },
                ]);

                $handles[$key] = $ch;
                curl_multi_add_handle($multi, $ch);
            }

            do {
                $status = curl_multi_exec($multi, $running);
                if ($status > CURLM_OK) {
                    break;
                }
                if ($running > 0) {
                    $selectResult = curl_multi_select($multi, 1.0);
                    if ($selectResult === -1) {
                        usleep(10000);
                    }
                }
            } while ($running > 0);

            foreach ($handles as $key => $ch) {
                $raw = curl_multi_getcontent($ch);
                $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $error = curl_error($ch);
                $responses[$key] = [
                    'body' => ($raw !== false && $statusCode > 0 && $statusCode < 400) ? (string) $raw : null,
                    'status' => $statusCode,
                    'error' => $error !== '' ? $error : null,
                    'headers' => $headersByKey[$key] ?? [],
                ];
            }
        } finally {
            foreach ($handles as $key => $ch) {
                curl_multi_remove_handle($multi, $ch);
                self::disposeCurlHandle($ch);
                unset($handles[$key]);
            }
            curl_multi_close($multi);
        }

        foreach ($urlsByKey as $key => $_url) {
            if (!array_key_exists($key, $responses)) {
                $responses[$key] = ['body' => null, 'status' => 0, 'error' => 'No response', 'headers' => []];
            }
        }

        return $responses;
    }

    private static function httpGet(string $url): ?string
    {
        $response = self::httpGetDetailed($url);
        return isset($response['body']) && is_string($response['body']) ? $response['body'] : null;
    }

    /**
     * @return array{body: ?string, status: int, error: ?string, headers: array<string, string>}
     */
    private static function httpGetDetailed(string $url): array
    {
        // Hard cap on OddsAPI calls per minute. Mirrors the Rundown guard
        // — protects monthly quota from runaway loops or burst spike.
        $cap = (int) Env::get('ODDSAPI_MAX_CALLS_PER_MINUTE', '60');
        if (!ApiQuotaGuard::reserve('oddsapi', $cap)) {
            return ['body' => null, 'status' => 0, 'error' => 'quota_capped', 'headers' => []];
        }
        $ch = curl_init($url);
        if ($ch === false) {
            return ['body' => null, 'status' => 0, 'error' => 'Unable to initialize cURL handle', 'headers' => []];
        }

        $headers = [];
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HEADERFUNCTION => static function ($curl, string $headerLine) use (&$headers): int {
                $trimmed = trim($headerLine);
                if ($trimmed === '' || !str_contains($trimmed, ':')) {
                    return strlen($headerLine);
                }
                [$name, $value] = explode(':', $trimmed, 2);
                $headers[strtolower(trim($name))] = trim($value);
                return strlen($headerLine);
            },
        ]);

        try {
            $raw = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);

            return [
                'body' => ($raw !== false && $status > 0 && $status < 400) ? (string) $raw : null,
                'status' => $status,
                'error' => $error !== '' ? $error : null,
                'headers' => $headers,
            ];
        } finally {
            self::disposeCurlHandle($ch);
        }
    }

    private static function disposeCurlHandle(mixed &$handle): void
    {
        if (!is_object($handle) && !is_resource($handle)) {
            $handle = null;
            return;
        }

        if (PHP_VERSION_ID < 80000 && function_exists('curl_close')) {
            curl_close($handle);
        }

        $handle = null;
    }

    /**
     * Whether a match row is currently being driven by the Rundown live
     * overlay — used to gate OddsAPI overwrites so live odds stay
     * Rundown-only. A row is "Rundown-owned" if it has oddsSource='rundown'
     * AND its lastOddsSyncAt is fresh (within RUNDOWN_LIVE_FRESHNESS_SECONDS).
     * Once Rundown stops touching the row (game ends / feed lost) the row
     * goes stale and OddsAPI takes back over on the next tick.
     */
    private static function isRundownLiveOwned(array $existing): bool
    {
        if (strtolower((string) ($existing['oddsSource'] ?? '')) !== 'rundown') {
            return false;
        }
        $last = (string) ($existing['lastOddsSyncAt'] ?? '');
        $lastTs = $last !== '' ? strtotime($last) : false;
        if ($lastTs === false) return false;
        $maxAge = max(60, (int) Env::get('RUNDOWN_LIVE_FRESHNESS_SECONDS', '300'));
        return (time() - $lastTs) <= $maxAge;
    }

    private static function extractScoreAndStatus(array $event, string $homeTeam, string $awayTeam): array
    {
        $score = [];
        $status = 'scheduled';

        $evScore = is_array($event['score'] ?? null) ? $event['score'] : [];
        $scoresArray = is_array($event['scores'] ?? null) ? $event['scores'] : (is_array($evScore['scores'] ?? null) ? $evScore['scores'] : []);

        $scoreHome = $evScore['score_home'] ?? $evScore['home_score'] ?? $evScore['homeScore'] ?? $event['home_score'] ?? $event['homeScore'] ?? null;
        $scoreAway = $evScore['score_away'] ?? $evScore['away_score'] ?? $evScore['awayScore'] ?? $event['away_score'] ?? $event['awayScore'] ?? null;

        if (($scoreHome === null || $scoreAway === null) && count($scoresArray) > 0) {
            foreach ($scoresArray as $row) {
                if (!is_array($row)) {
                    continue;
                }
                if (($row['name'] ?? null) === $homeTeam && isset($row['score'])) {
                    $scoreHome = $row['score'];
                }
                if (($row['name'] ?? null) === $awayTeam && isset($row['score'])) {
                    $scoreAway = $row['score'];
                }
            }
        }

        if ($scoreHome !== null || $scoreAway !== null) {
            $score['score_home'] = is_numeric($scoreHome) ? (float) $scoreHome : 0.0;
            $score['score_away'] = is_numeric($scoreAway) ? (float) $scoreAway : 0.0;
        }

        $period = $evScore['period'] ?? $evScore['periodName'] ?? $evScore['period_name'] ?? $event['period'] ?? null;
        if ($period !== null) {
            $score['period'] = $period;
        }

        $eventStatus = $evScore['event_status'] ?? $evScore['status'] ?? $evScore['eventStatus'] ?? $event['event_status'] ?? $event['status'] ?? null;
        if ($eventStatus !== null) {
            $score['event_status'] = $eventStatus;
        }

        $status = SportsMatchStatus::normalize((string) ($event['status'] ?? ''), is_scalar($eventStatus) ? (string) $eventStatus : null);
        if (($event['completed'] ?? null) === false && is_array($scoresArray) && count($scoresArray) > 0) {
            $status = 'live';
        }
        if (($event['completed'] ?? null) === true) {
            $status = 'finished';
        }

        return [
            'status' => $status,
            'score' => count($score) > 0 ? $score : new stdClass(),
        ];
    }

    /**
     * Smoke-test the Odds API: performs one cheap /sports call, verifies the
     * response shape, checks quota, and confirms that configured sports exist.
     *
     * @return array<string, mixed>
     */
    public static function smokeTest(): array
    {
        $result = [
            'ok'                => false,
            'configured'        => false,
            'sportsApiEnabled'  => false,
            'apiKeyPresent'     => false,
            'httpStatus'        => null,
            'responseTimeMs'    => null,
            'quotaRemaining'    => null,
            'quotaUsed'         => null,
            'totalSportsInApi'  => null,
            'configuredSports'  => [],
            'missingSports'     => [],
            'sampleSports'      => [],
            'error'             => null,
        ];

        $sportsApiEnabled = strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true';
        $result['sportsApiEnabled'] = $sportsApiEnabled;

        $apiKey = (string) Env::get('ODDS_API_KEY', '');
        $result['apiKeyPresent'] = $apiKey !== '';

        if (!$sportsApiEnabled) {
            $result['error'] = 'SPORTS_API_ENABLED is false — API is disabled by config.';
            return $result;
        }
        if ($apiKey === '') {
            $result['error'] = 'ODDS_API_KEY is not set.';
            return $result;
        }

        $result['configured'] = true;

        // ── Hit the /sports endpoint (cheapest call — lists available sports) ──
        $apiBase  = 'https://api.the-odds-api.com/v4';
        $url      = $apiBase . '/sports?' . http_build_query(['apiKey' => $apiKey, 'all' => 'false']);
        $start    = microtime(true);
        $response = self::httpGetDetailed($url);
        $result['responseTimeMs'] = round((microtime(true) - $start) * 1000, 1);
        $result['httpStatus']     = $response['status'];

        // Quota headers
        $headers = $response['headers'] ?? [];
        if (isset($headers['x-requests-remaining'])) {
            $result['quotaRemaining'] = (int) $headers['x-requests-remaining'];
        }
        if (isset($headers['x-requests-used'])) {
            $result['quotaUsed'] = (int) $headers['x-requests-used'];
        }

        if ($response['body'] === null) {
            $result['error'] = 'HTTP ' . $response['status'] . ': ' . ($response['error'] ?? 'empty response');
            return $result;
        }

        $decoded = json_decode((string) $response['body'], true);
        if (!is_array($decoded)) {
            $result['error'] = 'Response is not valid JSON.';
            return $result;
        }

        // The /sports endpoint returns an array of sport objects
        if (!array_is_list($decoded)) {
            // Might be an error object from the API
            $result['error'] = (string) ($decoded['message'] ?? 'Unexpected response shape from /sports endpoint.');
            return $result;
        }

        $result['totalSportsInApi'] = count($decoded);
        $result['sampleSports']     = array_slice(array_map(
            static fn(array $s): string => (string) ($s['key'] ?? ''),
            $decoded
        ), 0, 10);

        // ── Verify configured sports exist in the API ─────────────────────────
        $allowedSportsRaw  = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
        $configuredSports  = array_values(array_filter(array_map('trim', explode(',', $allowedSportsRaw))));
        $result['configuredSports'] = $configuredSports;

        $apiSportKeys = array_flip(array_map(
            static fn(array $s): string => strtolower((string) ($s['key'] ?? '')),
            $decoded
        ));

        $missing = [];
        foreach ($configuredSports as $sportKey) {
            if (!isset($apiSportKeys[strtolower($sportKey)])) {
                $missing[] = $sportKey;
            }
        }
        $result['missingSports'] = $missing;

        $result['ok'] = $missing === [];
        if ($missing !== []) {
            $result['error'] = 'Sports not found in API: ' . implode(', ', $missing) . '. They may be off-season or the key is wrong.';
        }

        return $result;
    }
}
