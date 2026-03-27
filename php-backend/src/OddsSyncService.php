<?php

declare(strict_types=1);


final class OddsSyncService
{
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
        $sportsApiEnabled = strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true';
        $apiKey = (string) Env::get('ODDS_API_KEY', '');
        if (!$sportsApiEnabled || $apiKey === '') {
            return [];
        }

        $allowedSportsRaw = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
        $regions = (string) Env::get('ODDS_API_REGIONS', 'us');
        $markets = (string) Env::get('ODDS_API_MARKETS', 'h2h,spreads,totals');
        $oddsFormat = (string) Env::get('ODDS_API_ODDS_FORMAT', 'american');
        $bookmakers = (string) Env::get('ODDS_API_BOOKMAKERS', '');
        $scoresEnabled = strtolower((string) Env::get('ODDS_SCORES_ENABLED', 'true')) === 'true';
        $scoresDaysFrom = self::scoresDaysFrom();
        $apiBase = 'https://api.the-odds-api.com/v4';

        $sports = array_values(array_filter(array_map('trim', explode(',', $allowedSportsRaw)), static fn($v) => $v !== ''));
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

                $oddsData = [];
                if (isset($event['bookmakers']) && is_array($event['bookmakers']) && count($event['bookmakers']) > 0 && is_array($event['bookmakers'][0])) {
                    $main = $event['bookmakers'][0];
                    $oddsData = [
                        'bookmaker' => $main['title'] ?? null,
                        'markets' => $main['markets'] ?? [],
                    ];
                }

                $snapshot[] = [
                    'id' => $externalId,
                    'externalId' => $externalId,
                    'homeTeam' => $homeTeam,
                    'awayTeam' => $awayTeam,
                    'startTime' => $event['commence_time'] ?? null,
                    'sport' => $event['sport_title'] ?? ($event['sport'] ?? $sportKey),
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

        return $snapshot;
    }

    public static function updateMatches(MongoRepository $db, string $source = 'system'): array
    {
        $sportsApiEnabled = strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true';
        $apiKey = (string) Env::get('ODDS_API_KEY', '');
        $allowedSportsRaw = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
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
            'rateLimit' => [
                'minRemaining' => null,
                'maxUsed' => null,
                'sports' => new stdClass(),
            ],
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

            $sports = array_values(array_filter(array_map('trim', explode(',', $allowedSportsRaw)), static fn($v) => $v !== ''));
            $scoresByExternalId = [];
            $processedExternalIds = [];

            if ($scoresEnabled) {
                $scoreUrlsBySport = [];
                foreach ($sports as $sportKey) {
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

                    $existing = $db->findOne('matches', ['externalId' => $externalId], ['projection' => ['id' => 1, 'status' => 1]]);
                    if ($existing === null) {
                        $doc['createdAt'] = MongoRepository::nowUtc();
                        $createdId = $db->insertOne('matches', $doc);
                        $result['created']++;
                        $result['settled'] += self::maybeSettleMatch($db, $createdId, $doc['status'] ?? '');
                    } else {
                        $oldStatus = (string) ($existing['status'] ?? '');
                        $db->updateOne('matches', ['id' => MongoRepository::id((string) $existing['id'])], $doc);
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

            if ((int) ($result['successfulCalls'] ?? 0) === 0) {
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

            $sweep = BetSettlementService::settlePendingMatches($db, 250, 'system');
            $result['settlementSweep'] = $sweep;

            SportsbookHealth::recordSyncSuccess($db, $runId, $source, $result);
            return $result;
        } catch (Throwable $e) {
            SportsbookHealth::recordSyncFailure($db, $runId, $source, $e, $result);
            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $event
     * @param array<string, mixed> $statusAndScore
     * @return array<string, mixed>
     */
    private static function buildOddsDocument(array $event, string $sportKey, string $externalId, string $homeTeam, string $awayTeam, array $statusAndScore): array
    {
        $oddsData = [];
        if (isset($event['bookmakers']) && is_array($event['bookmakers']) && count($event['bookmakers']) > 0 && is_array($event['bookmakers'][0])) {
            $main = $event['bookmakers'][0];
            $oddsData = [
                'bookmaker' => $main['title'] ?? null,
                'markets' => $main['markets'] ?? [],
            ];
        }

        $now = MongoRepository::nowUtc();
        return [
            'externalId' => $externalId,
            'homeTeam' => $homeTeam,
            'awayTeam' => $awayTeam,
            'startTime' => $event['commence_time'] ?? null,
            'sport' => $event['sport_title'] ?? ($event['sport'] ?? $sportKey),
            'status' => $statusAndScore['status'],
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
    private static function updateExistingMatchFromScoreEvent(MongoRepository $db, string $externalId, array $scoreEvent): array
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
        $now = MongoRepository::nowUtc();

        $db->updateOne('matches', ['id' => MongoRepository::id((string) $existing['id'])], [
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

    private static function maybeSettleMatch(MongoRepository $db, string $matchId, string $status): int
    {
        if ($status !== 'finished') {
            return 0;
        }
        if ($db->countDocuments('betselections', ['matchId' => MongoRepository::id($matchId), 'status' => 'pending']) === 0) {
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
