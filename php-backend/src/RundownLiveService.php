<?php

declare(strict_types=1);

/**
 * RundownLiveService — live-only odds writer using Rundown API.
 *
 * Toggle via env RUNDOWN_LIVE_ENABLED=true|false. When true, the odds
 * worker calls this instead of OddsSyncService::syncLiveOdds(). When
 * false, behaviour is unchanged (OddsAPI keeps writing live).
 *
 * Pre-match odds are NEVER touched by this service — OddsAPI remains the
 * source of truth for scheduled matches. Rundown only updates rows whose
 * status is already 'live' (or eligible for live promotion based on the
 * Rundown event_status).
 *
 * Quota model (Starter $49 plan, 2M points/mo, 2 req/sec, 60s data delay):
 *   - 1 call returns all live events for a sport
 *   - Worker tick = 70s → matches the 60s data delay (no point polling faster)
 *   - Only ticks sports flagged live by ESPN meta tick (free signal)
 *   - At ~5 avg live sports × 70s cadence × 24h × 30d = ~185k calls/mo
 */
final class RundownLiveService
{
    /** Soft stale threshold — show "delayed" badge in UI. */
    public const STALE_SOFT_SECONDS = 90;

    /** Hard stale threshold — pause betting on that match. */
    public const STALE_HARD_SECONDS = 180;

    /** Default tick interval — aligns with Starter plan's 60s data delay + 10s buffer. */
    public const DEFAULT_TICK_SECONDS = 70;

    /**
     * Sport keys this service can cover. The odds worker passes this set
     * to OddsSyncService so the OddsAPI live writer skips the sports
     * Rundown is handling — enabling the "hybrid" mode where Rundown
     * does the heavy-traffic US/EU sports and OddsAPI fills the gaps
     * for tennis / boxing / niche cricket / euroleague.
     *
     * @return list<string>
     */
    public static function supportedSportKeys(): array
    {
        return array_keys(self::SPORT_KEY_TO_RUNDOWN_ID);
    }

    /**
     * Map OddsAPI sport keys → Rundown numeric sport IDs.
     *
     * Verified 2026-05-13 against TheRundown /sports endpoint. Sports
     * not present in this map are SKIPPED when Rundown is the active
     * live writer — those sports won't show live odds. Add to the map
     * if Rundown adds coverage later (e.g. tennis, boxing).
     */
    private const SPORT_KEY_TO_RUNDOWN_ID = [
        'americanfootball_ncaaf'    => 1,    // NCAA Football
        'americanfootball_nfl'      => 2,    // NFL
        'baseball_mlb'              => 3,    // MLB
        'basketball_nba'            => 4,    // NBA
        'basketball_ncaab'          => 5,    // NCAA Men's Basketball
        'icehockey_nhl'             => 6,    // NHL
        'mma_mixed_martial_arts'    => 7,    // UFC/MMA
        'basketball_wnba'           => 8,    // WNBA
        'soccer_usa_mls'            => 10,   // MLS
        'soccer_epl'                => 11,   // EPL
        'soccer_france_ligue_one'   => 12,   // FRA1 (Ligue 1)
        'soccer_germany_bundesliga' => 13,   // GER1 (Bundesliga)
        'soccer_spain_la_liga'      => 14,   // ESP1 (La Liga)
        'soccer_italy_serie_a'      => 15,   // ITA1 (Serie A)
        'soccer_uefa_champs_league' => 16,   // UEFA CL
        'cricket_ipl'               => 20,   // IPL
        'cricket_psl'               => 21,   // T20 (PSL is a T20 league)
        // Not covered by Rundown (will fall through and be skipped):
        // - tennis_*  → not present in /sports list
        // - boxing_boxing → not present
        // - basketball_euroleague → not present
        // - cricket_odi → only T20 listed
    ];

    /**
     * Main entry — called by the odds worker.
     *
     * @return array{ok:bool,sportsChecked:int,liveEvents:int,oddsCalls:int,
     *               updated:int,skipped:int,errors:int,matches:list<array<string,mixed>>,
     *               perSport:array<string,array<string,int>>}
     */
    public static function syncLiveOdds(SqlRepository $db): array
    {
        $result = [
            'ok' => false,
            'sportsChecked' => 0,
            'liveEvents' => 0,
            'oddsCalls' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
            'matches' => [],
            'perSport' => [],
        ];

        $apiKey = trim((string) Env::get('RUNDOWN_API_KEY', ''));
        $enabled = strtolower((string) Env::get('RUNDOWN_LIVE_ENABLED', 'false')) === 'true';
        if (!$enabled || $apiKey === '') {
            $result['ok'] = true;
            return $result;
        }

        $liveSportKeys = self::resolveLiveSportKeys($db);
        $result['sportsChecked'] = count($liveSportKeys);
        if ($liveSportKeys === []) {
            // No live sports detected → no API calls made → quota preserved.
            $result['ok'] = true;
            return $result;
        }

        foreach ($liveSportKeys as $sportKey) {
            $rundownSportId = self::SPORT_KEY_TO_RUNDOWN_ID[$sportKey] ?? null;
            if ($rundownSportId === null) {
                $result['skipped']++;
                continue;
            }

            try {
                $events = self::fetchLiveEventsForSport($rundownSportId, $apiKey);
                $result['oddsCalls']++;
            } catch (Throwable $e) {
                $result['errors']++;
                Logger::warning('rundown live fetch failed', [
                    'sportKey' => $sportKey,
                    'rundownSportId' => $rundownSportId,
                    'error' => $e->getMessage(),
                ]);
                continue;
            }

            $perSport = ['live' => 0, 'updated' => 0, 'skipped' => 0];
            foreach ($events as $rundownEvent) {
                if (!self::isLiveEvent($rundownEvent)) {
                    continue;
                }
                $perSport['live']++;
                $result['liveEvents']++;

                $existing = self::findExistingMatch($db, $rundownEvent, $sportKey);
                if ($existing === null) {
                    // Rundown reports a live event we have no pre-match
                    // record for — don't create it; OddsAPI is the source
                    // of truth for the matches catalog. Skip silently.
                    $perSport['skipped']++;
                    $result['skipped']++;
                    continue;
                }

                $doc = self::buildOddsDocument($rundownEvent, $existing, $sportKey);
                $db->updateOne(
                    'matches',
                    ['id' => SqlRepository::id((string) $existing['id'])],
                    $doc
                );
                $result['matches'][] = $doc;
                $result['updated']++;
                $perSport['updated']++;
            }
            $result['perSport'][$sportKey] = $perSport;
        }

        SportsbookHealth::recordOddsApiSuccess($db, true);
        SportsbookCache::invalidatePublicMatchCaches();

        if (class_exists('RealtimeEventBus')) {
            foreach ($liveSportKeys as $sportKey) {
                RealtimeEventBus::publish('odds:sport:sync', [
                    'sport_key' => $sportKey,
                    'source' => 'rundown-live',
                    'time' => gmdate(DATE_ATOM),
                ]);
            }
        }

        $result['ok'] = true;
        return $result;
    }

    /**
     * Which sports actually have live games right now?
     *
     * Reads from the matches table — sports with at least one row that
     * is currently 'live' or whose startTime has passed within the last
     * X minutes. This is the free signal that gates Rundown calls so we
     * never spend quota on sports with nothing live.
     *
     * @return list<string> sport keys (e.g. 'basketball_nba')
     */
    private static function resolveLiveSportKeys(SqlRepository $db): array
    {
        $windowSeconds = max(60, (int) Env::get('RUNDOWN_LIVE_GATE_WINDOW_SECONDS', '3600'));
        $cutoff = gmdate(DATE_ATOM, time() - $windowSeconds);
        $rows = $db->find('matches', [
            '$or' => [
                ['status' => 'live'],
                ['status' => 'scheduled', 'startTime' => ['$gte' => $cutoff, '$lte' => gmdate(DATE_ATOM)]],
            ],
        ], ['projection' => ['sportKey' => 1], 'limit' => 500]);

        $set = [];
        foreach ($rows as $row) {
            $key = (string) ($row['sportKey'] ?? '');
            if ($key !== '') {
                $set[$key] = true;
            }
        }
        return array_values(array_keys($set));
    }

    /**
     * Fetch live events for one Rundown sport.
     * Confirmed 2026-05-13 against TheRundown v2 API at therundown.io.
     * Response shape: { meta: {...}, events: [{...}, ...] }
     *
     * Filtering affiliate_ids is CRITICAL for cost. Rundown charges per
     * "data point" — each affiliate × market × line in the response.
     * Unfiltered, a single /events call returns ~16 books × 3 markets ×
     * multiple lines = ~1,000+ data points. Passing affiliate_ids cuts
     * that ~4x by only returning the books we display.
     *
     * @return list<array<string,mixed>>
     */
    private static function fetchLiveEventsForSport(int $rundownSportId, string $apiKey): array
    {
        $base = rtrim((string) Env::get('RUNDOWN_API_BASE', 'https://therundown.io/api/v2'), '/');
        $today = gmdate('Y-m-d');

        $query = ['include' => 'scores'];
        $affiliates = trim((string) Env::get('RUNDOWN_AFFILIATE_IDS', ''));
        if ($affiliates !== '') {
            $query['affiliate_ids'] = $affiliates;
        }
        $url = $base . '/sports/' . $rundownSportId . '/events/' . $today . '?' . http_build_query($query);

        $authHeader = (string) Env::get('RUNDOWN_AUTH_HEADER', 'X-TheRundown-Key');
        $headers = [$authHeader . ': ' . $apiKey];
        $rapidHost = trim((string) Env::get('RUNDOWN_RAPID_HOST', ''));
        if ($rapidHost !== '') {
            $headers[] = 'X-RapidAPI-Host: ' . $rapidHost;
        }

        $ch = curl_init($url);
        if ($ch === false) return [];
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_HTTPHEADER => $headers,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!is_string($body) || $body === '' || $status < 200 || $status >= 300) {
            return [];
        }
        $decoded = json_decode($body, true);
        if (!is_array($decoded) || !isset($decoded['events']) || !is_array($decoded['events'])) {
            return [];
        }
        return array_values(array_filter($decoded['events'], 'is_array'));
    }

    /**
     * Is this Rundown event currently in-progress?
     *
     * TODO(rundown-key): Confirm the status enum values. TheRundown uses
     * STATUS_IN_PROGRESS / STATUS_SCHEDULED / STATUS_FINAL. Other providers
     * may use lowercase 'live' or numeric codes.
     */
    private static function isLiveEvent(array $event): bool
    {
        $status = (string) (
            $event['score']['event_status'] ?? (
                $event['event_status'] ?? ($event['status'] ?? '')
            )
        );
        $statusUpper = strtoupper($status);
        return $statusUpper === 'STATUS_IN_PROGRESS'
            || $statusUpper === 'IN_PROGRESS'
            || $statusUpper === 'LIVE'
            || $statusUpper === 'INPROGRESS';
    }

    /**
     * Match a Rundown event to an existing matches row.
     *
     * Strategy:
     *   1. If we've already stored the rundownEventId on this match, use that.
     *   2. Otherwise fuzzy-match by sportKey + normalized team names +
     *      startTime within ±30 minutes.
     */
    private static function findExistingMatch(SqlRepository $db, array $rundownEvent, string $sportKey): ?array
    {
        $rundownEventId = (string) ($rundownEvent['event_id'] ?? ($rundownEvent['event_uuid'] ?? ''));

        if ($rundownEventId !== '') {
            $byId = $db->findOne('matches', ['rundownEventId' => $rundownEventId], [
                'projection' => ['id' => 1, 'odds' => 1, 'status' => 1, 'homeTeam' => 1, 'awayTeam' => 1],
            ]);
            if ($byId !== null) {
                return $byId;
            }
        }

        $teams = self::extractTeamsFromRundownEvent($rundownEvent);
        if ($teams === null) {
            return null;
        }

        $homeNorm = TeamNormalizer::normalize($teams['home'], $sportKey);
        $awayNorm = TeamNormalizer::normalize($teams['away'], $sportKey);

        $candidates = $db->find('matches', [
            'sportKey' => $sportKey,
            'status' => ['$in' => ['live', 'scheduled']],
        ], ['projection' => ['id' => 1, 'odds' => 1, 'status' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'startTime' => 1], 'limit' => 200]);

        $eventStart = (string) ($rundownEvent['event_date'] ?? '');
        $eventStartTs = $eventStart !== '' ? strtotime($eventStart) : 0;

        foreach ($candidates as $cand) {
            $candHome = TeamNormalizer::normalize((string) ($cand['homeTeam'] ?? ''), $sportKey);
            $candAway = TeamNormalizer::normalize((string) ($cand['awayTeam'] ?? ''), $sportKey);
            $teamsMatch = ($candHome === $homeNorm && $candAway === $awayNorm)
                || ($candHome === $awayNorm && $candAway === $homeNorm);
            if (!$teamsMatch) {
                continue;
            }
            if ($eventStartTs > 0 && !empty($cand['startTime'])) {
                $candTs = strtotime((string) $cand['startTime']);
                if ($candTs > 0 && abs($candTs - $eventStartTs) > 1800) {
                    continue;
                }
            }
            // Lazily backfill rundownEventId so the next tick is O(1).
            if ($rundownEventId !== '') {
                $db->updateOne('matches', ['id' => SqlRepository::id((string) $cand['id'])], [
                    'rundownEventId' => $rundownEventId,
                ]);
            }
            return $cand;
        }
        return null;
    }

    /**
     * Extract home/away team full names from a Rundown v2 event.
     * v2 stores `teams: [{name, mascot, is_home, is_away, ...}]` where
     * `name` is just the city — full name = `name + " " + mascot`.
     *
     * @return array{home:string,away:string,homeId:?int,awayId:?int}|null
     */
    private static function extractTeamsFromRundownEvent(array $event): ?array
    {
        $teams = is_array($event['teams'] ?? null) ? $event['teams'] : null;
        if (!$teams) return null;
        $home = '';
        $away = '';
        $homeId = null;
        $awayId = null;
        foreach ($teams as $t) {
            if (!is_array($t)) continue;
            $city = trim((string) ($t['name'] ?? ''));
            $mascot = trim((string) ($t['mascot'] ?? ''));
            $full = trim($city . ' ' . $mascot);
            if ($full === '') $full = $city;
            $isHome = ($t['is_home'] ?? false) === true || ($t['is_home'] ?? 0) === 1;
            if ($isHome) {
                $home = $full;
                $homeId = isset($t['team_id']) ? (int) $t['team_id'] : null;
            } else {
                $away = $full;
                $awayId = isset($t['team_id']) ? (int) $t['team_id'] : null;
            }
        }
        if ($home === '' || $away === '') return null;
        return ['home' => $home, 'away' => $away, 'homeId' => $homeId, 'awayId' => $awayId];
    }

    /**
     * Build the matches-row update document. Preserves the schema that
     * OddsSyncService writes so MatchesController doesn't need to know
     * which source produced the odds.
     *
     * @param array<string,mixed> $rundownEvent
     * @param array<string,mixed> $existing
     */
    private static function buildOddsDocument(array $rundownEvent, array $existing, string $sportKey): array
    {
        $now = SqlRepository::nowUtc();
        $oddsData = self::parseRundownOdds($rundownEvent);

        // Preserve existing extended markets (1Q, 1H, alt lines) — Rundown
        // Starter tier doesn't carry these, and OddsAPI already wrote them.
        $existingOdds = is_array($existing['odds'] ?? null) ? $existing['odds'] : [];
        if (isset($existingOdds['extendedMarkets']) && is_array($existingOdds['extendedMarkets'])) {
            $oddsData['extendedMarkets'] = $existingOdds['extendedMarkets'];
        }

        return [
            'status' => 'live',
            'oddsSource' => 'rundown',
            'odds' => $oddsData,
            'score' => self::parseRundownScore($rundownEvent),
            'lastUpdated' => $now,
            'lastOddsSyncAt' => $now,
            'lastScoreSyncAt' => $now,
            'updatedAt' => $now,
            'rundownEventId' => (string) ($rundownEvent['event_id'] ?? ($rundownEvent['event_uuid'] ?? '')),
        ];
    }

    /**
     * Convert Rundown v2 `markets` → the OddsAPI v4 bookmaker shape so
     * MatchesController / frontend can consume it unchanged.
     *
     * Rundown v2 markets structure:
     *   markets: [
     *     { name: "moneyline", period_id: 0, participants: [
     *         { id: 46, name: "Baltimore Orioles", lines: [
     *             { prices: { "23": {price: 140, is_main_line: true, updated_at: "..."}, ... } }
     *         ] },
     *         { id: 48, name: "New York Yankees", lines: [...] }
     *     ]},
     *     { name: "handicap", period_id: 0, participants: [...] },  // spread
     *     { name: "totals",   period_id: 0, participants: [
     *         { id: 9, name: "Over",  lines: [{value: 10.5, prices: {...}}, ...] },
     *         { id: 10, name: "Under", lines: [...] }
     *     ]}
     *   ]
     *
     * Output shape (matches existing OddsSyncService format):
     *   [bookmaker => 'DraftKings', markets => [
     *     {key: 'h2h',     outcomes: [{name, price}, ...]},
     *     {key: 'spreads', outcomes: [{name, price, point}, ...]},
     *     {key: 'totals',  outcomes: [{name: 'Over'|'Under', price, point}]},
     *   ]]
     *
     * Prices are American (e.g. -110, +140); we convert to decimal here
     * since the existing store uses decimal (ODDS_API_ODDS_FORMAT=decimal)
     * and BetsController re-derives American server-side at bet placement.
     */
    private static function parseRundownOdds(array $event): array
    {
        $markets = is_array($event['markets'] ?? null) ? $event['markets'] : [];
        if ($markets === []) {
            return ['bookmaker' => null, 'markets' => []];
        }

        $teams = self::extractTeamsFromRundownEvent($event);
        if ($teams === null) {
            return ['bookmaker' => null, 'markets' => []];
        }

        // Affiliate to use — first preferred-id that has prices anywhere
        // in this event's markets. Without this we'd pick a different
        // book per market on the same event, which jumps the displayed
        // book around as the player navigates markets.
        $affiliateId = self::pickAffiliateIdFromMarkets($markets);
        if ($affiliateId === null) {
            return ['bookmaker' => null, 'markets' => []];
        }
        $affKey = (string) $affiliateId;

        $outMarkets = [];

        foreach ($markets as $m) {
            if (!is_array($m) || (int) ($m['period_id'] ?? -1) !== 0) {
                continue; // only main-game (period 0) for the live tab
            }
            $name = strtolower((string) ($m['name'] ?? ''));
            $participants = is_array($m['participants'] ?? null) ? $m['participants'] : [];
            if ($participants === []) continue;

            if ($name === 'moneyline') {
                $out = self::parseMoneylineMarket($participants, $affKey, $teams);
                if ($out !== null) $outMarkets[] = $out;
            } elseif ($name === 'handicap') {
                $out = self::parseHandicapMarket($participants, $affKey, $teams);
                if ($out !== null) $outMarkets[] = $out;
            } elseif ($name === 'totals') {
                $out = self::parseTotalsMarket($participants, $affKey);
                if ($out !== null) $outMarkets[] = $out;
            }
        }

        return [
            'bookmaker' => self::affiliateDisplayName($affiliateId),
            'markets' => $outMarkets,
        ];
    }

    /**
     * Pick the first preferred affiliate ID that has at least one price
     * anywhere in the event's markets. Falls back to whatever affiliate
     * appears first if no preferred match.
     *
     * @param list<array<string,mixed>> $markets
     */
    private static function pickAffiliateIdFromMarkets(array $markets): ?int
    {
        $available = self::collectAffiliateIds($markets);
        if ($available === []) return null;

        foreach (self::preferredAffiliateIds() as $aid) {
            if (isset($available[$aid])) return $aid;
        }
        return array_key_first($available);
    }

    /**
     * @param list<array<string,mixed>> $markets
     * @return array<int,bool>
     */
    private static function collectAffiliateIds(array $markets): array
    {
        $ids = [];
        foreach ($markets as $m) {
            if (!is_array($m)) continue;
            foreach ((array) ($m['participants'] ?? []) as $p) {
                if (!is_array($p)) continue;
                foreach ((array) ($p['lines'] ?? []) as $line) {
                    if (!is_array($line)) continue;
                    foreach ((array) ($line['prices'] ?? []) as $aid => $_) {
                        $ids[(int) $aid] = true;
                    }
                }
            }
        }
        return $ids;
    }

    /**
     * @param list<array<string,mixed>> $participants
     * @param array{home:string,away:string,homeId:?int,awayId:?int} $teams
     */
    private static function parseMoneylineMarket(array $participants, string $affKey, array $teams): ?array
    {
        $homePrice = null;
        $awayPrice = null;
        $lastUpdate = '';
        foreach ($participants as $p) {
            if (!is_array($p)) continue;
            $pid = isset($p['id']) ? (int) $p['id'] : null;
            $mainLine = self::findMainLine($p, $affKey);
            if ($mainLine === null) continue;
            $price = self::americanToDecimal($mainLine['prices'][$affKey]['price'] ?? null);
            if ($price === null) continue;
            $upd = (string) ($mainLine['prices'][$affKey]['updated_at'] ?? '');
            if ($upd !== '' && $upd > $lastUpdate) $lastUpdate = $upd;
            if ($pid !== null && $pid === $teams['homeId']) {
                $homePrice = $price;
            } elseif ($pid !== null && $pid === $teams['awayId']) {
                $awayPrice = $price;
            } else {
                // Fallback by name compare
                $pname = (string) ($p['name'] ?? '');
                if (stripos($pname, (string) $teams['home']) !== false || stripos((string) $teams['home'], $pname) !== false) {
                    $homePrice = $price;
                } else {
                    $awayPrice = $price;
                }
            }
        }
        if ($homePrice === null || $awayPrice === null) return null;
        return [
            'key' => 'h2h',
            'last_update' => $lastUpdate,
            'outcomes' => [
                ['name' => $teams['home'], 'price' => $homePrice],
                ['name' => $teams['away'], 'price' => $awayPrice],
            ],
        ];
    }

    /**
     * @param list<array<string,mixed>> $participants
     * @param array{home:string,away:string,homeId:?int,awayId:?int} $teams
     */
    private static function parseHandicapMarket(array $participants, string $affKey, array $teams): ?array
    {
        $homeRow = null; $awayRow = null;
        $lastUpdate = '';
        foreach ($participants as $p) {
            if (!is_array($p)) continue;
            $pid = isset($p['id']) ? (int) $p['id'] : null;
            $mainLine = self::findMainLine($p, $affKey);
            if ($mainLine === null) continue;
            $price = self::americanToDecimal($mainLine['prices'][$affKey]['price'] ?? null);
            $point = isset($mainLine['value']) ? (float) $mainLine['value'] : null;
            if ($price === null || $point === null) continue;
            $upd = (string) ($mainLine['prices'][$affKey]['updated_at'] ?? '');
            if ($upd !== '' && $upd > $lastUpdate) $lastUpdate = $upd;
            $row = ['price' => $price, 'point' => $point];
            if ($pid !== null && $pid === $teams['homeId']) {
                $homeRow = $row;
            } else {
                $awayRow = $row;
            }
        }
        if ($homeRow === null || $awayRow === null) return null;
        return [
            'key' => 'spreads',
            'last_update' => $lastUpdate,
            'outcomes' => [
                ['name' => $teams['home'], 'price' => $homeRow['price'], 'point' => $homeRow['point']],
                ['name' => $teams['away'], 'price' => $awayRow['price'], 'point' => $awayRow['point']],
            ],
        ];
    }

    /**
     * @param list<array<string,mixed>> $participants
     */
    private static function parseTotalsMarket(array $participants, string $affKey): ?array
    {
        $overRow = null; $underRow = null;
        $lastUpdate = '';
        foreach ($participants as $p) {
            if (!is_array($p)) continue;
            $side = strtolower((string) ($p['name'] ?? ''));
            $mainLine = self::findMainLine($p, $affKey);
            if ($mainLine === null) continue;
            $price = self::americanToDecimal($mainLine['prices'][$affKey]['price'] ?? null);
            $point = isset($mainLine['value']) ? (float) $mainLine['value'] : null;
            if ($price === null || $point === null) continue;
            $upd = (string) ($mainLine['prices'][$affKey]['updated_at'] ?? '');
            if ($upd !== '' && $upd > $lastUpdate) $lastUpdate = $upd;
            $row = ['price' => $price, 'point' => $point];
            if ($side === 'over') $overRow = $row;
            elseif ($side === 'under') $underRow = $row;
        }
        if ($overRow === null || $underRow === null) return null;
        return [
            'key' => 'totals',
            'last_update' => $lastUpdate,
            'outcomes' => [
                ['name' => 'Over',  'price' => $overRow['price'],  'point' => $overRow['point']],
                ['name' => 'Under', 'price' => $underRow['price'], 'point' => $underRow['point']],
            ],
        ];
    }

    /**
     * Find the main line for a participant at the given affiliate. The
     * main line has `is_main_line=true` in its price entry. If no main
     * line is flagged, fall back to the first line that has a price.
     *
     * @param array<string,mixed> $participant
     */
    private static function findMainLine(array $participant, string $affKey): ?array
    {
        $lines = is_array($participant['lines'] ?? null) ? $participant['lines'] : [];
        $fallback = null;
        foreach ($lines as $line) {
            if (!is_array($line)) continue;
            $p = $line['prices'][$affKey] ?? null;
            if (!is_array($p)) continue;
            if (($p['is_main_line'] ?? false) === true) {
                return $line;
            }
            if ($fallback === null) $fallback = $line;
        }
        return $fallback;
    }

    /**
     * American → decimal conversion. Rundown returns integers (or null).
     *   -110 → 1.909
     *   +130 → 2.30
     * Returns null when the input is null/zero/malformed.
     */
    private static function americanToDecimal(mixed $american): ?float
    {
        if ($american === null || $american === '' || $american === 0) {
            return null;
        }
        $val = (int) $american;
        if ($val === 0) return null;
        $decimal = $val > 0 ? ($val / 100.0) + 1.0 : (100.0 / abs($val)) + 1.0;
        return round($decimal, 4);
    }

    /**
     * @return list<int>
     */
    private static function preferredAffiliateIds(): array
    {
        $raw = trim((string) Env::get('RUNDOWN_AFFILIATE_IDS', ''));
        if ($raw === '') return [];
        $out = [];
        foreach (explode(',', $raw) as $part) {
            $id = (int) trim($part);
            if ($id > 0) $out[] = $id;
        }
        return $out;
    }

    /**
     * Map TheRundown v2 affiliate IDs → display titles. Verified
     * 2026-05-13 against /affiliates endpoint. Override per-id via env:
     *   RUNDOWN_AFFILIATE_NAME_19=DraftKings
     */
    private static function affiliateDisplayName(?int $affiliateId): ?string
    {
        if ($affiliateId === null) return null;
        $envOverride = (string) Env::get('RUNDOWN_AFFILIATE_NAME_' . $affiliateId, '');
        if ($envOverride !== '') return $envOverride;
        $defaults = [
            2  => 'Bovada',
            3  => 'Pinnacle',
            4  => 'Sportsbetting',
            6  => 'BetOnline',
            11 => 'Lowvig',
            12 => 'Bodog',
            14 => 'Intertops',
            16 => 'Matchbook',
            18 => 'YouWager',
            19 => 'DraftKings',
            21 => 'Unibet',
            22 => 'BetMGM',
            23 => 'FanDuel',
            24 => 'theScore Bet',
            25 => 'Kalshi',
            26 => 'Polymarket',
        ];
        return $defaults[$affiliateId] ?? ('Affiliate ' . $affiliateId);
    }

    /**
     * Convert Rundown's `score` block → the shape MatchesController +
     * frontend already expect (homeScore/awayScore + period + clock).
     *
     * Rundown sends: { event_status, score_home, score_away, game_clock,
     *                  game_period, broadcast, winner_home, winner_away }
     * @return array<string,mixed>
     */
    private static function parseRundownScore(array $event): array
    {
        $score = is_array($event['score'] ?? null) ? $event['score'] : [];
        $homeFromTeams = null;
        $awayFromTeams = null;
        if (isset($event['teams_normalized']) && is_array($event['teams_normalized'])) {
            foreach ($event['teams_normalized'] as $t) {
                if (!is_array($t)) continue;
                $isHome = ($t['is_home'] ?? false) === true || ($t['is_home'] ?? 0) === 1;
                if ($isHome) {
                    $homeFromTeams = $t['score'] ?? null;
                } else {
                    $awayFromTeams = $t['score'] ?? null;
                }
            }
        }
        return [
            'homeScore' => $score['score_home'] ?? $homeFromTeams,
            'awayScore' => $score['score_away'] ?? $awayFromTeams,
            'period' => $score['game_period'] ?? null,
            'clock' => $score['game_clock'] ?? null,
            'status' => $score['event_status'] ?? null,
            'broadcast' => $score['broadcast'] ?? null,
            'winnerHome' => $score['winner_home'] ?? null,
            'winnerAway' => $score['winner_away'] ?? null,
        ];
    }

    /**
     * Public helper — given a match row, return its live-odds freshness.
     * Used by MatchesController to flag rows as delayed/stale in the
     * response so the UI can show a badge and disable betting.
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
            'delayed' => $ageSeconds >= self::STALE_SOFT_SECONDS,
            'stale' => $ageSeconds >= self::STALE_HARD_SECONDS,
        ];
    }
}
