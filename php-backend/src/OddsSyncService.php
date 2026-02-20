<?php

declare(strict_types=1);

use MongoDB\BSON\ObjectId;

final class OddsSyncService
{
    public static function updateMatches(MongoRepository $db): array
    {
        $sportsApiEnabled = strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true';
        $apiKey = (string) Env::get('ODDS_API_KEY', '');
        $allowedSportsRaw = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
        $regions = (string) Env::get('ODDS_API_REGIONS', 'us');
        $markets = (string) Env::get('ODDS_API_MARKETS', 'h2h,spreads,totals');
        $oddsFormat = (string) Env::get('ODDS_API_ODDS_FORMAT', 'american');
        $bookmakers = (string) Env::get('ODDS_API_BOOKMAKERS', '');
        $scoresEnabled = strtolower((string) Env::get('ODDS_SCORES_ENABLED', 'true')) === 'true';
        $scoresDaysFrom = max(0, (int) Env::get('ODDS_SCORES_DAYS_FROM', '0'));
        $apiBase = 'https://api.the-odds-api.com/v4';

        $result = [
            'created' => 0,
            'updated' => 0,
            'settled' => 0,
            'apiCalls' => 0,
            'blocked' => false,
        ];

        if (!$sportsApiEnabled || $apiKey === '') {
            $result['blocked'] = true;
            return $result;
        }

        $sports = array_values(array_filter(array_map('trim', explode(',', $allowedSportsRaw)), static fn($v) => $v !== ''));
        $scoresByExternalId = [];

        if ($scoresEnabled) {
            foreach ($sports as $sportKey) {
                $scoreQuery = ['apiKey' => $apiKey, 'dateFormat' => 'iso'];
                if ($scoresDaysFrom > 0) {
                    $scoreQuery['daysFrom'] = $scoresDaysFrom;
                }

                $scoreUrl = $apiBase . '/sports/' . rawurlencode($sportKey) . '/scores?' . http_build_query($scoreQuery);
                $scoreRaw = self::httpGet($scoreUrl);
                if ($scoreRaw === null) {
                    continue;
                }
                $result['apiCalls']++;

                $scoreRows = json_decode($scoreRaw, true);
                if (!is_array($scoreRows)) {
                    continue;
                }
                foreach ($scoreRows as $scoreEvent) {
                    if (!is_array($scoreEvent) || !isset($scoreEvent['id'])) {
                        continue;
                    }
                    $scoresByExternalId[(string) $scoreEvent['id']] = $scoreEvent;
                }
            }
        }

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

            $url = $apiBase . '/sports/' . rawurlencode($sportKey) . '/odds?' . http_build_query($query);
            $raw = self::httpGet($url);
            $result['apiCalls']++;
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

                $doc = [
                    'externalId' => $externalId,
                    'homeTeam' => $homeTeam,
                    'awayTeam' => $awayTeam,
                    'startTime' => $event['commence_time'] ?? null,
                    'sport' => $event['sport_title'] ?? ($event['sport'] ?? $sportKey),
                    'status' => $statusAndScore['status'],
                    'odds' => $oddsData,
                    'score' => $statusAndScore['score'],
                    'lastUpdated' => MongoRepository::nowUtc(),
                    'updatedAt' => MongoRepository::nowUtc(),
                ];

                $existing = $db->findOne('matches', ['externalId' => $externalId], ['projection' => ['_id' => 1]]);
                if ($existing === null) {
                    $doc['createdAt'] = MongoRepository::nowUtc();
                    $createdId = $db->insertOne('matches', $doc);
                    $result['created']++;
                    if ($doc['status'] === 'finished') {
                        try {
                            BetSettlementService::settleMatch($db, $createdId, null, 'system');
                            $result['settled']++;
                        } catch (Throwable $e) {
                            // Keep odds refresh resilient when settlement fails for one match.
                        }
                    }
                } else {
                    $oldStatus = (string) (($db->findOne('matches', ['_id' => new ObjectId((string) $existing['_id'])], ['projection' => ['status' => 1]])['status'] ?? ''));
                    $db->updateOne('matches', ['_id' => new ObjectId((string) $existing['_id'])], $doc);
                    $result['updated']++;
                    if ($doc['status'] === 'finished' && $oldStatus !== 'finished') {
                        try {
                            BetSettlementService::settleMatch($db, (string) $existing['_id'], null, 'system');
                            $result['settled']++;
                        } catch (Throwable $e) {
                            // Keep odds refresh resilient when settlement fails for one match.
                        }
                    }
                }
            }
        }

        return $result;
    }

    private static function httpGet(string $url): ?string
    {
        $ch = curl_init($url);
        if ($ch === false) {
            return null;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false || $status >= 400) {
            return null;
        }

        return (string) $raw;
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

        $statusToken = strtoupper((string) ($eventStatus ?? ''));
        if (str_contains($statusToken, 'IN_PROGRESS') || str_contains($statusToken, 'LIVE') || str_contains($statusToken, 'STATUS_IN_PROGRESS')) {
            $status = 'live';
        } elseif (str_contains($statusToken, 'FINAL') || str_contains($statusToken, 'COMPLETE') || str_contains($statusToken, 'STATUS_CLOSED')) {
            $status = 'finished';
        } elseif (($event['completed'] ?? null) === true) {
            $status = 'finished';
        } elseif (($event['status'] ?? '') === 'live') {
            $status = 'live';
        }

        return [
            'status' => $status,
            'score' => count($score) > 0 ? $score : new stdClass(),
        ];
    }
}
