<?php

declare(strict_types=1);

/**
 * Live-only odds sync from TheRundown.io. Runs every ~10s inside the
 * existing odds-worker daemon loop. Steps:
 *
 *   1. Discover sport IDs from TheRundown (cached 1h).
 *   2. For each sport, fetch today's events; keep only STATUS_IN_PROGRESS.
 *   3. For each live event, locate the matching row in the local matches
 *      table by fuzzy team-name + sport family + start-time window.
 *   4. Overwrite odds + score on the matched row, mark oddsSource='rundown',
 *      bump lastOddsSyncAt + lastScoreSyncAt.
 *   5. Invalidate the public matches cache and publish a per-sport realtime
 *      event so connected clients refetch immediately.
 *
 * Pre-match / scheduled rows are NEVER touched here — that's still The Odds
 * API's territory. When a game finishes, this service just stops touching
 * the row and The Odds API's next worker tick takes back over.
 */
final class RundownLiveSync
{
    /**
     * Map TheRundown numeric sport_id → list of OddsAPI sport_keys we look
     * up to find candidate match rows. Verified against TheRundown's
     * docs/reference/sports — see https://docs.therundown.io/reference/sports.md.
     * Season-variant IDs (preseason/playoff/spring training: 23-32) map to
     * the same OddsAPI keys as their parent sport.
     *
     * Note: TheRundown does NOT cover Boxing, Tennis, Golf, AFL, or Rugby,
     * so those sports remain solely on The Odds API path with no live
     * overlay from this service.
     *
     * @var array<int, list<string>>
     */
    private const SPORT_ID_TO_ODDS_KEYS = [
        1  => ['americanfootball_ncaaf'],
        2  => ['americanfootball_nfl'],
        3  => ['baseball_mlb'],
        4  => ['basketball_nba'],
        5  => ['basketball_ncaab'],
        6  => ['icehockey_nhl'],
        7  => ['mma_mixed_martial_arts'],
        8  => ['basketball_wnba'],
        9  => ['americanfootball_cfl'],
        10 => ['soccer_usa_mls'],
        11 => ['soccer_epl'],
        12 => ['soccer_france_ligue_one'],
        13 => ['soccer_germany_bundesliga'],
        14 => ['soccer_spain_la_liga'],
        15 => ['soccer_italy_serie_a'],
        16 => ['soccer_uefa_champs_league'],
        17 => ['soccer_uefa_europa_league'],
        18 => ['soccer_fifa_world_cup'],
        19 => ['soccer_japan_j_league'],
        20 => ['cricket_ipl'],
        21 => ['cricket_psl', 'cricket_odi', 'cricket_t20', 'cricket_international_t20'],
        // Season variants (preseason / playoff / spring training).
        23 => ['basketball_nba'],            // NBA preseason
        24 => ['basketball_nba'],            // NBA playoffs
        25 => ['americanfootball_nfl'],      // NFL preseason
        26 => ['americanfootball_nfl'],      // NFL playoffs
        27 => ['icehockey_nhl'],             // NHL preseason
        28 => ['icehockey_nhl'],             // NHL playoffs
        30 => ['baseball_mlb'],              // MLB spring training
        32 => ['basketball_nba'],            // NBA summer league
    ];

    /**
     * Map of old-format `sport` field values (short display names stored by
     * The Odds API sync) → canonical OddsAPI sportKey strings used by the
     * Rundown sync. Needed because some DB rows were written before sportKey
     * was standardised, so doc.sportKey is NULL while doc.sport has a value.
     *
     * @var array<string, string>
     */
    private const LEGACY_SPORT_NAME_TO_KEY = [
        'nba'                    => 'basketball_nba',
        'basketball nba'         => 'basketball_nba',
        'nfl'                    => 'americanfootball_nfl',
        'american football nfl'  => 'americanfootball_nfl',
        'ncaaf'                  => 'americanfootball_ncaaf',
        'mlb'                    => 'baseball_mlb',
        'baseball mlb'           => 'baseball_mlb',
        'nhl'                    => 'icehockey_nhl',
        'ice hockey nhl'         => 'icehockey_nhl',
        'mma'                    => 'mma_mixed_martial_arts',
        'mma/ufc'                => 'mma_mixed_martial_arts',
        'ufc'                    => 'mma_mixed_martial_arts',
        'wnba'                   => 'basketball_wnba',
        'cfl'                    => 'americanfootball_cfl',
        'mls'                    => 'soccer_usa_mls',
        'soccer mls'             => 'soccer_usa_mls',
        'epl'                    => 'soccer_epl',
        'premier league'         => 'soccer_epl',
        'english premier league' => 'soccer_epl',
        'ligue 1'                => 'soccer_france_ligue_one',
        'ligue1'                 => 'soccer_france_ligue_one',
        'bundesliga'             => 'soccer_germany_bundesliga',
        'la liga'                => 'soccer_spain_la_liga',
        'la liga - spain'        => 'soccer_spain_la_liga',
        'serie a'                => 'soccer_italy_serie_a',
        'serie a - italy'        => 'soccer_italy_serie_a',
        'champions league'       => 'soccer_uefa_champs_league',
        'uefa champions league'  => 'soccer_uefa_champs_league',
        'europa league'          => 'soccer_uefa_europa_league',
        'uefa europa league'     => 'soccer_uefa_europa_league',
        'fifa world cup'         => 'soccer_fifa_world_cup',
        'world cup'              => 'soccer_fifa_world_cup',
        'j-league'               => 'soccer_japan_j_league',
        'j league'               => 'soccer_japan_j_league',
        'cricket ipl'            => 'cricket_ipl',
        'ipl'                    => 'cricket_ipl',
        'cricket psl'            => 'cricket_psl',
        'psl'                    => 'cricket_psl',
        'cricket odi'            => 'cricket_odi',
        'odi'                    => 'cricket_odi',
        'cricket t20'            => 'cricket_t20',
        't20'                    => 'cricket_t20',
        'international t20'      => 'cricket_international_t20',
        'ncaab'                  => 'basketball_ncaab',
    ];

    /**
     * Resolve a canonical sportKey from a match row, handling both current
     * rows (doc.sportKey is set) and legacy rows (doc.sport is set but
     * doc.sportKey is absent/null).
     */
    public static function resolveSportKey(array $row): string
    {
        $key = strtolower(trim((string) ($row['sportKey'] ?? '')));
        if ($key !== '') return $key;
        // Fallback: map legacy short sport name → canonical sportKey
        $legacyName = strtolower(trim((string) ($row['sport'] ?? '')));
        return self::LEGACY_SPORT_NAME_TO_KEY[$legacyName] ?? '';
    }

    /**
     * Set of OddsAPI sportKeys that the Rundown live overlay can cover —
     * derived from SPORT_ID_TO_ODDS_KEYS. Used by the live API filter to
     * exclude sports that Rundown can't service (Tennis WTA/ATP, NCAA
     * Baseball, lower-tier soccer, women's leagues outside top flights)
     * BEFORE checking freshness, so we never serve a stale row from an
     * uncovered sport.
     *
     * @return array<string, true>
     */
    public static function coveredSportKeysSet(): array
    {
        static $set = null;
        if ($set === null) {
            $set = [];
            foreach (self::SPORT_ID_TO_ODDS_KEYS as $keys) {
                foreach ($keys as $k) {
                    $set[strtolower($k)] = true;
                }
            }
        }
        return $set;
    }

    /** @return array{ok:bool, sportsTried:int, eventsSeen:int, matched:int, updated:int, finished:int, errors:int} */
    public static function tick(SqlRepository $db): array
    {
        $result = ['ok' => false, 'sportsTried' => 0, 'eventsSeen' => 0, 'matched' => 0, 'updated' => 0, 'finished' => 0, 'errors' => 0];
        if (!RundownService::isEnabled()) {
            Logger::info('Rundown live sync skipped: service disabled', [], 'rundown');
            return $result;
        }

        // Only poll Rundown for sports that actually have a live or imminent
        // game in our local matches table. TheRundown bills per request, not
        // per live event returned, so blindly polling every sport every tick
        // burns data points during quiet hours. When nothing is live or about
        // to start, skip the entire tick.
        $activeKeys = self::activeSportKeys($db);
        if ($activeKeys === []) {
            Logger::info('Rundown live sync: no active sports', [], 'rundown');
            $result['ok'] = true;
            return $result;
        }

        Logger::info('Rundown live sync tick started', ['activeSports' => count($activeKeys)], 'rundown');
        
        $sports = RundownService::listSports();
        if ($sports === []) {
            Logger::error('Rundown live sync failed: no sports list available', [], 'rundown');
            $result['errors']++;
            return $result;
        }

        $maxSports = max(1, (int) Env::get('RUNDOWN_LIVE_MAX_SPORTS_PER_TICK', '20'));
        // Throttle to respect TheRundown's per-second rate limit (1 req/s on
        // free tier, higher on paid). 1100ms between sport requests keeps
        // us under the limit on free tier; paid tiers will easily absorb this.
        $perRequestDelayUs = max(0, (int) Env::get('RUNDOWN_LIVE_REQUEST_DELAY_MS', '1100')) * 1000;
        $touchedSportKeys = [];
        $first = true;
        foreach ($sports as $sport) {
            if ($result['sportsTried'] >= $maxSports) break;
            $sportId = (int) ($sport['id'] ?? 0);
            if ($sportId <= 0) continue;
            // Skip sports we know we don't cover at all (Politics) — saves a
            // wasted request and a guaranteed empty match attempt.
            if (!isset(self::SPORT_ID_TO_ODDS_KEYS[$sportId])) continue;
            // Skip sports with no live/imminent match in our DB.
            $relevant = false;
            foreach (self::SPORT_ID_TO_ODDS_KEYS[$sportId] as $k) {
                if (isset($activeKeys[$k])) { $relevant = true; break; }
            }
            if (!$relevant) continue;
            $result['sportsTried']++;

            if (!$first && $perRequestDelayUs > 0) usleep($perRequestDelayUs);
            $first = false;

            $resp = RundownService::liveEventsForSport($sportId);
            if (!$resp['ok']) {
                $result['errors']++;
                continue;
            }

            $oddsKeys = self::SPORT_ID_TO_ODDS_KEYS[$sportId] ?? [];

            // Pass 1 — in-progress events: refresh odds + bump lastOddsSyncAt.
            foreach ($resp['live'] ?? [] as $event) {
                $result['eventsSeen']++;
                $merged = self::mergeEvent($db, $event, $oddsKeys);
                if ($merged['matched']) $result['matched']++;
                if ($merged['updated']) {
                    $result['updated']++;
                    if ($merged['sportKey'] !== '') $touchedSportKeys[$merged['sportKey']] = true;
                }
            }

            // Pass 2 — concluded events: flip status='finished' on any DB
            // row currently sitting at status='live' for this game. Without
            // this flip, ended games linger in Live Now until something else
            // (which never runs on prod) marks them done.
            foreach ($resp['finished'] ?? [] as $event) {
                $result['eventsSeen']++;
                $finalized = self::finalizeEvent($db, $event, $oddsKeys);
                if ($finalized['matched']) $result['matched']++;
                if ($finalized['finalized']) {
                    $result['finished']++;
                    if ($finalized['sportKey'] !== '') $touchedSportKeys[$finalized['sportKey']] = true;
                }
            }

            // Pass 3 — upcoming events: write only broadcast/eventName/
            // shortName/record metadata onto the matched row. Doesn't
            // disturb odds/status (OddsAPI still owns prematch). The
            // odds-board card needs broadcast info before tip-off, not
            // only once the game's already live, so we piggyback on the
            // same Rundown response we already fetched for live odds.
            foreach ($resp['upcoming'] ?? [] as $event) {
                $result['eventsSeen']++;
                $merged = self::mergeBroadcastOnly($db, $event, $oddsKeys);
                if ($merged['matched']) $result['matched']++;
                if ($merged['updated']) {
                    $result['updated']++;
                    if ($merged['sportKey'] !== '') $touchedSportKeys[$merged['sportKey']] = true;
                }
            }
        }

        if ($result['updated'] > 0 || $result['finished'] > 0) {
            // Bump global feed health + invalidate caches just like
            // OddsSyncService::syncSingleSport does so the staleness gate
            // and public matches endpoint reflect the fresh writes.
            SportsbookHealth::recordOddsApiSuccess($db, false);
            SportsbookCache::invalidatePublicMatchCaches();
            Logger::info('Rundown live sync: cache invalidated', ['updated' => $result['updated'], 'finished' => $result['finished']], 'rundown');
            if (class_exists('RealtimeEventBus')) {
                foreach (array_keys($touchedSportKeys) as $sportKey) {
                    RealtimeEventBus::publish('odds:sport:sync', [
                        'sport_key' => $sportKey,
                        'source' => 'rundown-live',
                        'time' => gmdate(DATE_ATOM),
                    ]);
                }
            }
        }

        $result['ok'] = true;
        Logger::info('Rundown live sync tick completed', [
            'sportsTried' => $result['sportsTried'],
            'eventsSeen' => $result['eventsSeen'],
            'matched' => $result['matched'],
            'updated' => $result['updated'],
            'finished' => $result['finished'],
            'errors' => $result['errors'],
        ], 'rundown');
        return $result;
    }

    /**
     * Set of OddsAPI sport keys with a live or imminent match in our DB.
     * Anything `status='live'` is included regardless of time (long games like
     * cricket / extra-innings baseball can run hours past their startTime).
     * For `status='scheduled'`, only games starting within the next 30 minutes
     * count, so we don't poll Rundown for tomorrow's NFL game right now.
     *
     * @return array<string, true>
     */
    private static function activeSportKeys(SqlRepository $db): array
    {
        $set = [];
        $imminentEnd = gmdate('Y-m-d\TH:i:s\Z', time() + 30 * 60);

        $live = $db->findMany('matches', ['status' => 'live'], [
            'projection' => ['sportKey' => 1, 'sport' => 1],
            'limit' => 500,
        ]);
        if (is_array($live)) {
            foreach ($live as $row) {
                $k = self::resolveSportKey($row);
                if ($k !== '') $set[$k] = true;
            }
        }

        $scheduled = $db->findMany('matches', [
            'status' => 'scheduled',
            'startTime' => ['$lte' => $imminentEnd],
        ], [
            'projection' => ['sportKey' => 1, 'sport' => 1],
            'limit' => 500,
        ]);
        if (is_array($scheduled)) {
            foreach ($scheduled as $row) {
                $k = self::resolveSportKey($row);
                if ($k !== '') $set[$k] = true;
            }
        }

        return $set;
    }

    /**
     * @param array<string,mixed> $event
     * @param list<string> $oddsKeys
     * @return array{matched:bool, updated:bool, sportKey:string}
     */
    private static function mergeEvent(SqlRepository $db, array $event, array $oddsKeys): array
    {
        $rundownEventId = trim((string) ($event['event_id'] ?? ''));

        $teams = is_array($event['teams'] ?? null) ? $event['teams'] : [];
        $homeName = '';
        $awayName = '';
        $homeTeam = null;
        $awayTeam = null;
        foreach ($teams as $team) {
            if (!is_array($team)) continue;
            $name = trim((string) ($team['name'] ?? ''));
            $mascot = trim((string) ($team['mascot'] ?? ''));
            $full = trim($name . ' ' . $mascot);
            if (($team['is_home'] ?? false) === true) {
                $homeName = $full !== '' ? $full : $name;
                $homeTeam = $team;
            } elseif (($team['is_away'] ?? false) === true) {
                $awayName = $full !== '' ? $full : $name;
                $awayTeam = $team;
            }
        }

        $eventDate = (string) ($event['event_date'] ?? '');
        $eventTs = $eventDate !== '' ? (int) strtotime($eventDate) : 0;

        // Stable identity first: if we've ever bound this Rundown event_id
        // to a row, look it up directly. Avoids team-name-fuzzy drift across
        // ticks (mid-game team-name updates, transliteration changes,
        // sponsor name swaps) that previously caused live rows to silently
        // age out of the freshness window.
        $row = self::findRowByRundownEventId($db, $rundownEventId);
        if ($row === null) {
            if ($homeName === '' || $awayName === '') {
                return ['matched' => false, 'updated' => false, 'sportKey' => ''];
            }
            $row = self::findMatchingRow($db, $homeName, $awayName, $oddsKeys, $eventTs);
            if ($row === null) {
                return ['matched' => false, 'updated' => false, 'sportKey' => ''];
            }
        }

        $oddsDoc = self::buildOddsFromRundown($event['markets'] ?? [], $homeName, $awayName);
        $score = self::buildScoreFromRundown($event['score'] ?? []);
        $now = SqlRepository::nowUtc();
        // Resolve the canonical sportKey — may be null on legacy rows that
        // only have doc.sport (short name). We backfill it here so every
        // subsequent tick can use the fast sportKey index path.
        $resolvedSportKey = self::resolveSportKey($row);
        $update = [
            'odds' => $oddsDoc,
            'score' => $score,
            'status' => 'live',
            'oddsSource' => 'rundown',
            'lastUpdated' => $now,
            'lastOddsSyncAt' => $now,
            'lastScoreSyncAt' => $now,
            'updatedAt' => $now,
        ];
        // Broadcast / event metadata from Rundown — used for the "[TIME]
        // EST - [GAME CONTEXT] - [NETWORK]" row above each odds-board card.
        // Rundown provides `broadcast` (string) and `event_name` (e.g.
        // "WEST 1ST ROUND GAME 5"). For live events Rundown is the source
        // of truth: when it returns no broadcast, we explicitly CLEAR the
        // field so stale prematch placeholders ("MLB.TV", "TBD") don't
        // leak onto the in-play card. Letting OddsAPI's prematch value
        // survive caused every MLB live game to flash an "MLB.TV" chip
        // even though Rundown didn't actually report any network.
        $broadcast = self::extractBroadcast($event);
        $update['broadcast'] = $broadcast !== '' ? $broadcast : '';
        $eventName = trim((string) ($event['event_name'] ?? ''));
        if ($eventName !== '') $update['eventName'] = $eventName;
        // Push the short display name + current win-loss record onto the row
        // so the public odds board can render "Thunder (64-18)" without
        // re-deriving anything client-side. Rundown is the authoritative
        // source for both — the OddsAPI feed only carries full names, no
        // records — so we let it overwrite whatever was there before.
        $sportKeyForNorm = $resolvedSportKey !== '' ? $resolvedSportKey : (string) ($oddsKeys[0] ?? '');
        if ($homeTeam !== null) {
            $homeShort = TeamNormalizer::shortName($homeName, $sportKeyForNorm, (string) ($homeTeam['mascot'] ?? ''));
            $homeRecord = TeamNormalizer::recordFromRundownTeam($homeTeam, $sportKeyForNorm);
            if ($homeShort !== '') $update['homeTeamShort'] = $homeShort;
            if ($homeRecord !== null) $update['homeTeamRecord'] = $homeRecord;
        }
        if ($awayTeam !== null) {
            $awayShort = TeamNormalizer::shortName($awayName, $sportKeyForNorm, (string) ($awayTeam['mascot'] ?? ''));
            $awayRecord = TeamNormalizer::recordFromRundownTeam($awayTeam, $sportKeyForNorm);
            if ($awayShort !== '') $update['awayTeamShort'] = $awayShort;
            if ($awayRecord !== null) $update['awayTeamRecord'] = $awayRecord;
        }
        // Backfill sportKey on legacy rows that lacked it so the freshness
        // filter and future ticks can use the canonical key.
        if ($resolvedSportKey !== '' && empty($row['sportKey'])) {
            $update['sportKey'] = $resolvedSportKey;
        }
        // Bind/refresh the Rundown event_id on every successful match so
        // subsequent ticks bypass fuzzy-match entirely. updateOne is a JSON
        // merge, so this is additive — won't clobber unrelated fields.
        if ($rundownEventId !== '') {
            $update['rundownEventId'] = $rundownEventId;
        }
        try {
            $db->updateOne('matches', ['id' => SqlRepository::id((string) $row['id'])], $update);
            return ['matched' => true, 'updated' => true, 'sportKey' => $resolvedSportKey];
        } catch (Throwable $_) {
            return ['matched' => true, 'updated' => false, 'sportKey' => $resolvedSportKey];
        }
    }

    /**
     * Flip an ended game's row from status='live' → 'finished', persist final
     * scores, and pin oddsSource so the live filter stops counting it as
     * fresh. Idempotent — re-running on an already-finished row is a no-op.
     *
     * @param array<string,mixed> $event
     * @param list<string> $oddsKeys
     * @return array{matched:bool, finalized:bool, sportKey:string}
     */
    private static function finalizeEvent(SqlRepository $db, array $event, array $oddsKeys): array
    {
        $rundownEventId = trim((string) ($event['event_id'] ?? ''));

        $teams = is_array($event['teams'] ?? null) ? $event['teams'] : [];
        $homeName = '';
        $awayName = '';
        $homeTeam = null;
        $awayTeam = null;
        foreach ($teams as $team) {
            if (!is_array($team)) continue;
            $name = trim((string) ($team['name'] ?? ''));
            $mascot = trim((string) ($team['mascot'] ?? ''));
            $full = trim($name . ' ' . $mascot);
            if (($team['is_home'] ?? false) === true) {
                $homeName = $full !== '' ? $full : $name;
                $homeTeam = $team;
            } elseif (($team['is_away'] ?? false) === true) {
                $awayName = $full !== '' ? $full : $name;
                $awayTeam = $team;
            }
        }

        $eventDate = (string) ($event['event_date'] ?? '');
        $eventTs = $eventDate !== '' ? (int) strtotime($eventDate) : 0;

        $row = self::findRowByRundownEventId($db, $rundownEventId);
        if ($row === null) {
            if ($homeName === '' || $awayName === '') {
                return ['matched' => false, 'finalized' => false, 'sportKey' => ''];
            }
            $row = self::findMatchingRow($db, $homeName, $awayName, $oddsKeys, $eventTs);
            if ($row === null) {
                return ['matched' => false, 'finalized' => false, 'sportKey' => ''];
            }
        }

        // Skip if already finished — keeps the tick idempotent and the
        // 'updated' counter honest.
        if (strtolower((string) ($row['status'] ?? '')) === 'finished') {
            return ['matched' => true, 'finalized' => false, 'sportKey' => (string) ($row['sportKey'] ?? '')];
        }

        $score = self::buildScoreFromRundown($event['score'] ?? []);
        $now = SqlRepository::nowUtc();
        $update = [
            'status' => 'finished',
            'score' => $score,
            'oddsSource' => 'rundown',
            'lastUpdated' => $now,
            'lastScoreSyncAt' => $now,
            'updatedAt' => $now,
        ];
        // Capture the post-game record so the row stays display-correct in
        // the finished list (e.g. a "Final" card in scoreboards) even after
        // we stop touching it on subsequent ticks.
        $sportKeyForNorm = self::resolveSportKey($row);
        if ($sportKeyForNorm === '') $sportKeyForNorm = (string) ($oddsKeys[0] ?? '');
        if ($homeTeam !== null) {
            $homeShort = TeamNormalizer::shortName($homeName, $sportKeyForNorm, (string) ($homeTeam['mascot'] ?? ''));
            $homeRecord = TeamNormalizer::recordFromRundownTeam($homeTeam, $sportKeyForNorm);
            if ($homeShort !== '') $update['homeTeamShort'] = $homeShort;
            if ($homeRecord !== null) $update['homeTeamRecord'] = $homeRecord;
        }
        if ($awayTeam !== null) {
            $awayShort = TeamNormalizer::shortName($awayName, $sportKeyForNorm, (string) ($awayTeam['mascot'] ?? ''));
            $awayRecord = TeamNormalizer::recordFromRundownTeam($awayTeam, $sportKeyForNorm);
            if ($awayShort !== '') $update['awayTeamShort'] = $awayShort;
            if ($awayRecord !== null) $update['awayTeamRecord'] = $awayRecord;
        }
        // Preserve the broadcast/event metadata onto the finished row so a
        // user opening Scoreboards can still see "ESPN — WEST 1ST ROUND
        // GAME 5" on a just-ended game.
        $broadcast = self::extractBroadcast($event);
        if ($broadcast !== '') $update['broadcast'] = $broadcast;
        $eventName = trim((string) ($event['event_name'] ?? ''));
        if ($eventName !== '') $update['eventName'] = $eventName;
        if ($rundownEventId !== '') {
            $update['rundownEventId'] = $rundownEventId;
        }
        try {
            $db->updateOne('matches', ['id' => SqlRepository::id((string) $row['id'])], $update);
            return ['matched' => true, 'finalized' => true, 'sportKey' => (string) ($row['sportKey'] ?? '')];
        } catch (Throwable $_) {
            return ['matched' => true, 'finalized' => false, 'sportKey' => (string) ($row['sportKey'] ?? '')];
        }
    }

    /**
     * Lightweight metadata-only merge for not-yet-started events. Writes
     * only the broadcast/eventName/team-short/team-record fields onto a
     * matched DB row — never touches odds, score, or status. This way
     * the OddsAPI prematch flow remains the source of truth for prematch
     * odds while we get to enrich the card with broadcast info from
     * Rundown.
     *
     * @param array<string,mixed> $event
     * @param list<string> $oddsKeys
     * @return array{matched:bool, updated:bool, sportKey:string}
     */
    private static function mergeBroadcastOnly(SqlRepository $db, array $event, array $oddsKeys): array
    {
        $rundownEventId = trim((string) ($event['event_id'] ?? ''));

        $teams = is_array($event['teams'] ?? null) ? $event['teams'] : [];
        $homeName = '';
        $awayName = '';
        $homeTeam = null;
        $awayTeam = null;
        foreach ($teams as $team) {
            if (!is_array($team)) continue;
            $name = trim((string) ($team['name'] ?? ''));
            $mascot = trim((string) ($team['mascot'] ?? ''));
            $full = trim($name . ' ' . $mascot);
            if (($team['is_home'] ?? false) === true) {
                $homeName = $full !== '' ? $full : $name;
                $homeTeam = $team;
            } elseif (($team['is_away'] ?? false) === true) {
                $awayName = $full !== '' ? $full : $name;
                $awayTeam = $team;
            }
        }

        $broadcast = self::extractBroadcast($event);
        $eventName = trim((string) ($event['event_name'] ?? ''));
        // If Rundown didn't ship any of the fields we'd write, skip the
        // DB hit entirely. records/short names alone aren't worth a
        // round-trip when the live merge already keeps them fresh.
        if ($broadcast === '' && $eventName === '' && $homeTeam === null && $awayTeam === null) {
            return ['matched' => false, 'updated' => false, 'sportKey' => ''];
        }

        $eventDate = (string) ($event['event_date'] ?? '');
        $eventTs = $eventDate !== '' ? (int) strtotime($eventDate) : 0;

        $row = self::findRowByRundownEventId($db, $rundownEventId);
        if ($row === null) {
            if ($homeName === '' || $awayName === '') {
                return ['matched' => false, 'updated' => false, 'sportKey' => ''];
            }
            $row = self::findMatchingRow($db, $homeName, $awayName, $oddsKeys, $eventTs);
            if ($row === null) {
                return ['matched' => false, 'updated' => false, 'sportKey' => ''];
            }
        }

        // No-op fast path: if the row already has the same broadcast +
        // eventName, skip the write so we don't bump updatedAt and bust
        // unrelated downstream caches.
        if (
            $broadcast !== ''
            && $eventName !== ''
            && (string) ($row['broadcast'] ?? '') === $broadcast
            && (string) ($row['eventName'] ?? '') === $eventName
        ) {
            return ['matched' => true, 'updated' => false, 'sportKey' => (string) ($row['sportKey'] ?? '')];
        }

        $now = SqlRepository::nowUtc();
        $update = ['updatedAt' => $now];
        if ($broadcast !== '') $update['broadcast'] = $broadcast;
        if ($eventName !== '') $update['eventName'] = $eventName;

        $sportKeyForNorm = self::resolveSportKey($row);
        if ($sportKeyForNorm === '') $sportKeyForNorm = (string) ($oddsKeys[0] ?? '');
        if ($homeTeam !== null) {
            $homeShort = TeamNormalizer::shortName($homeName, $sportKeyForNorm, (string) ($homeTeam['mascot'] ?? ''));
            $homeRecord = TeamNormalizer::recordFromRundownTeam($homeTeam, $sportKeyForNorm);
            if ($homeShort !== '') $update['homeTeamShort'] = $homeShort;
            if ($homeRecord !== null) $update['homeTeamRecord'] = $homeRecord;
        }
        if ($awayTeam !== null) {
            $awayShort = TeamNormalizer::shortName($awayName, $sportKeyForNorm, (string) ($awayTeam['mascot'] ?? ''));
            $awayRecord = TeamNormalizer::recordFromRundownTeam($awayTeam, $sportKeyForNorm);
            if ($awayShort !== '') $update['awayTeamShort'] = $awayShort;
            if ($awayRecord !== null) $update['awayTeamRecord'] = $awayRecord;
        }
        if ($rundownEventId !== '') {
            $update['rundownEventId'] = $rundownEventId;
        }

        if (count($update) <= 1) {
            return ['matched' => true, 'updated' => false, 'sportKey' => (string) ($row['sportKey'] ?? '')];
        }
        try {
            $db->updateOne('matches', ['id' => SqlRepository::id((string) $row['id'])], $update);
            return ['matched' => true, 'updated' => true, 'sportKey' => (string) ($row['sportKey'] ?? '')];
        } catch (Throwable $_) {
            return ['matched' => true, 'updated' => false, 'sportKey' => (string) ($row['sportKey'] ?? '')];
        }
    }

    /**
     * Pull a broadcast string from a Rundown event payload. Rundown
     * exposes it under different shapes across endpoints — sometimes a
     * top-level `broadcast` string, sometimes a `tv_broadcast` array, and
     * occasionally nested under `score.broadcast`. Coalesce to the first
     * non-empty value we find so the merge code can stay agnostic.
     *
     * @param array<string,mixed> $event
     */
    private static function extractBroadcast(array $event): string
    {
        $candidates = [];
        if (isset($event['broadcast'])) $candidates[] = $event['broadcast'];
        if (isset($event['tv_broadcast'])) $candidates[] = $event['tv_broadcast'];
        if (isset($event['score']['broadcast'])) $candidates[] = $event['score']['broadcast'];
        foreach ($candidates as $candidate) {
            if (is_string($candidate)) {
                $trimmed = trim($candidate);
                if ($trimmed !== '') return $trimmed;
            }
            if (is_array($candidate) && !empty($candidate)) {
                $first = $candidate[0] ?? null;
                if (is_string($first)) {
                    $trimmed = trim($first);
                    if ($trimmed !== '') return $trimmed;
                }
                if (is_array($first) && isset($first['name']) && is_string($first['name'])) {
                    $trimmed = trim($first['name']);
                    if ($trimmed !== '') return $trimmed;
                }
            }
        }
        return '';
    }

    /**
     * Direct lookup by previously-bound rundownEventId. Returns null if no
     * binding exists yet — caller falls back to fuzzy team-name matching
     * for the first-ever pairing of an event to a row.
     *
     * @return array<string,mixed>|null
     */
    private static function findRowByRundownEventId(SqlRepository $db, string $rundownEventId): ?array
    {
        if ($rundownEventId === '') return null;
        $row = $db->findOne('matches', ['rundownEventId' => $rundownEventId], [
            'projection' => ['id' => 1, 'status' => 1, 'sportKey' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'startTime' => 1],
        ]);
        return is_array($row) ? $row : null;
    }

    /**
     * Locate our local match by team names + sport family + ±90 min start
     * window. Returns null if no confident match.
     *
     * @param list<string> $oddsKeys
     * @return array<string,mixed>|null
     */
    private static function findMatchingRow(SqlRepository $db, string $home, string $away, array $oddsKeys, int $eventTs): ?array
    {
        // First pass: query by canonical sportKey (new-format rows)
        $filter = [];
        if ($oddsKeys !== []) {
            $filter['sportKey'] = ['$in' => $oddsKeys];
        }
        $filter['status'] = ['$in' => ['live', 'scheduled']];

        $candidates = $db->findMany('matches', $filter, [
            'projection' => ['id' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'sportKey' => 1, 'sport' => 1, 'startTime' => 1],
            'limit' => 200,
        ]);

        // Second pass: if nothing found by sportKey, also search legacy rows
        // that have doc.sport (short name) instead of doc.sportKey.
        if ((!is_array($candidates) || $candidates === []) && $oddsKeys !== []) {
            $legacyFilter = ['status' => ['$in' => ['live', 'scheduled']]];
            $all = $db->findMany('matches', $legacyFilter, [
                'projection' => ['id' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'sportKey' => 1, 'sport' => 1, 'startTime' => 1],
                'limit' => 500,
            ]);
            if (is_array($all)) {
                $candidates = array_values(array_filter($all, function ($row) use ($oddsKeys) {
                    $resolved = self::resolveSportKey(is_array($row) ? $row : []);
                    return $resolved !== '' && in_array($resolved, $oddsKeys, true);
                }));
            }
        }

        if (!is_array($candidates) || $candidates === []) return null;

        $homeNorm = self::normalizeTeam($home);
        $awayNorm = self::normalizeTeam($away);
        foreach ($candidates as $row) {
            if (!is_array($row)) continue;
            $rh = self::normalizeTeam((string) ($row['homeTeam'] ?? ''));
            $ra = self::normalizeTeam((string) ($row['awayTeam'] ?? ''));
            $homeMatch = self::teamFuzzyEquals($rh, $homeNorm);
            $awayMatch = self::teamFuzzyEquals($ra, $awayNorm);
            // Also accept reversed home/away — Rundown's is_home/is_away can
            // disagree with The Odds API's home_team/away_team for sports
            // without a strong "home" concept (tennis, MMA).
            if (!($homeMatch && $awayMatch) && !(self::teamFuzzyEquals($rh, $awayNorm) && self::teamFuzzyEquals($ra, $homeNorm))) {
                continue;
            }
            if ($eventTs > 0 && !empty($row['startTime'])) {
                $rowTs = (int) strtotime((string) $row['startTime']);
                if ($rowTs > 0 && abs($rowTs - $eventTs) > 5400) continue; // 90 min
            }
            return $row;
        }
        return null;
    }

    private static function normalizeTeam(string $name): string
    {
        $s = strtolower(trim($name));
        // Strip common suffixes / prefixes that one provider uses but the
        // other doesn't (e.g. "FC", "AFC", "United", parentheticals).
        $s = preg_replace('/\s*\([^)]*\)/', '', $s) ?? $s;
        $s = preg_replace('/\b(fc|cf|afc|sc|ac|us|club|the)\b/u', '', $s) ?? $s;
        $s = preg_replace('/[^a-z0-9 ]+/u', ' ', $s) ?? $s;
        $s = preg_replace('/\s+/', ' ', $s) ?? $s;
        return trim($s);
    }

    private static function teamFuzzyEquals(string $a, string $b): bool
    {
        if ($a === '' || $b === '') return false;
        if ($a === $b) return true;
        // Token-overlap: either name's tokens are a subset of the other's.
        $ta = explode(' ', $a);
        $tb = explode(' ', $b);
        if ($ta === [] || $tb === []) return false;
        $shared = array_intersect($ta, $tb);
        if (count($shared) === 0) return false;
        $minLen = min(count($ta), count($tb));
        return count($shared) >= max(1, (int) ceil($minLen / 2));
    }

    /**
     * Translate TheRundown V2 markets to our internal ['markets'=>[...]] shape.
     * Converts American odds → decimal so we stay consistent with The Odds API.
     *
     * @param mixed $markets
     * @return array{bookmaker:?string, markets:list<array<string,mixed>>}
     */
    private static function buildOddsFromRundown(mixed $markets, string $home, string $away): array
    {
        if (!is_array($markets)) return ['bookmaker' => 'TheRundown', 'markets' => []];
        $h2hOutcomes = [];
        $spreadOutcomes = [];
        $totalOutcomes = [];

        foreach ($markets as $market) {
            if (!is_array($market)) continue;
            $marketId = (int) ($market['market_id'] ?? 0);
            $period = (int) ($market['period_id'] ?? 0);
            if ($period !== 0) continue; // full-game only on the live overlay
            $participants = is_array($market['participants'] ?? null) ? $market['participants'] : [];
            foreach ($participants as $part) {
                if (!is_array($part)) continue;
                $partName = (string) ($part['name'] ?? '');
                $lines = is_array($part['lines'] ?? null) ? $part['lines'] : [];
                foreach ($lines as $line) {
                    if (!is_array($line)) continue;
                    $value = (string) ($line['value'] ?? '');
                    $price = self::pickFirstPrice($line['prices'] ?? null);
                    if ($price === null) continue;
                    $decimal = self::americanToDecimal($price);
                    if ($decimal === null) continue;
                    if ($marketId === 1) {
                        $h2hOutcomes[] = ['name' => $partName, 'price' => $decimal];
                    } elseif ($marketId === 2 && $value !== '') {
                        $spreadOutcomes[] = ['name' => $partName, 'price' => $decimal, 'point' => (float) $value];
                    } elseif ($marketId === 3 && $value !== '') {
                        // Rundown emits "Over"/"Under" as participant names already.
                        $totalOutcomes[] = ['name' => $partName, 'price' => $decimal, 'point' => (float) $value];
                    }
                }
            }
        }

        $out = [];
        if ($h2hOutcomes !== []) $out[] = ['key' => 'h2h', 'outcomes' => $h2hOutcomes];
        if ($spreadOutcomes !== []) $out[] = ['key' => 'spreads', 'outcomes' => $spreadOutcomes];
        if ($totalOutcomes !== []) $out[] = ['key' => 'totals', 'outcomes' => $totalOutcomes];
        return ['bookmaker' => 'TheRundown', 'markets' => $out];
    }

    /**
     * Pick the first numeric price from a Rundown prices map. Skips the
     * 0.0001 sentinel ("off the board"). Could be smarter (best line shop)
     * but for live updates the first available price is fine — UI will
     * refetch within seconds anyway.
     */
    private static function pickFirstPrice(mixed $prices): ?float
    {
        if (!is_array($prices) || $prices === []) return null;
        foreach ($prices as $book) {
            if (!is_array($book)) continue;
            $raw = $book['price'] ?? null;
            if (!is_numeric($raw)) continue;
            $f = (float) $raw;
            if ($f === 0.0001 || $f === 0.0) continue;
            return $f;
        }
        return null;
    }

    private static function americanToDecimal(float $american): ?float
    {
        if ($american === 0.0) return null;
        // Keep full-precision conversion (no 4-decimal truncation) and let
        // the shared snap helper decide whether to keep it as a clean
        // integer-American decimal or pass through a half-point as-is. A
        // pre-snap round() to 4dp drops 1 + 100/120 = 1.83333… to 1.8333,
        // which made every -120 stake compute Risk = $1200.05 instead of
        // exactly $1200.
        $decimal = $american > 0
            ? 1.0 + ($american / 100.0)
            : 1.0 + (100.0 / abs($american));
        return SportsbookBetSupport::snapDecimalOdds($decimal);
    }

    /**
     * @param mixed $score
     * @return array<string,mixed>
     */
    private static function buildScoreFromRundown(mixed $score): array
    {
        if (!is_array($score)) return [];
        // Canonical score keys are score_home / score_away — that's what
        // SportsbookBetSupport::selectionResult reads to grade H2H,
        // spread, and total bets, what OddsSyncService writes for the
        // OddsAPI path, and what every frontend scoreboard reads. Older
        // versions of this builder stored `home` / `away`, which silently
        // resolved as 0-0 in the grader and voided every Rundown-finalized
        // ticket. Keep the JSON shape aligned across both feed paths so
        // either source can drive settlement end-to-end.
        $out = [
            'event_status' => (string) ($score['event_status'] ?? ''),
            'score_home' => (int) ($score['score_home'] ?? 0),
            'score_away' => (int) ($score['score_away'] ?? 0),
            'period' => (int) ($score['game_period'] ?? 0),
            'clock' => (string) ($score['game_clock'] ?? ''),
            'updated_at' => (string) ($score['updated_at'] ?? ''),
        ];
        return $out;
    }
}
