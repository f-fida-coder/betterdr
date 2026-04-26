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

    /** @return array{ok:bool, sportsTried:int, eventsSeen:int, matched:int, updated:int, errors:int} */
    public static function tick(SqlRepository $db): array
    {
        $result = ['ok' => false, 'sportsTried' => 0, 'eventsSeen' => 0, 'matched' => 0, 'updated' => 0, 'errors' => 0];
        if (!RundownService::isEnabled()) {
            return $result;
        }
        $sports = RundownService::listSports();
        if ($sports === []) {
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
            $result['sportsTried']++;

            if (!$first && $perRequestDelayUs > 0) usleep($perRequestDelayUs);
            $first = false;

            $resp = RundownService::liveEventsForSport($sportId);
            if (!$resp['ok']) {
                $result['errors']++;
                continue;
            }
            if ($resp['events'] === []) continue;

            $oddsKeys = self::SPORT_ID_TO_ODDS_KEYS[$sportId] ?? [];
            foreach ($resp['events'] as $event) {
                $result['eventsSeen']++;
                $merged = self::mergeEvent($db, $event, $oddsKeys);
                if ($merged['matched']) $result['matched']++;
                if ($merged['updated']) {
                    $result['updated']++;
                    if ($merged['sportKey'] !== '') $touchedSportKeys[$merged['sportKey']] = true;
                }
            }
        }

        if ($result['updated'] > 0) {
            // Bump global feed health + invalidate caches just like
            // OddsSyncService::syncSingleSport does so the staleness gate
            // and public matches endpoint reflect the fresh writes.
            SportsbookHealth::recordOddsApiSuccess($db, false);
            SportsbookCache::invalidatePublicMatchCaches();
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
        return $result;
    }

    /**
     * @param array<string,mixed> $event
     * @param list<string> $oddsKeys
     * @return array{matched:bool, updated:bool, sportKey:string}
     */
    private static function mergeEvent(SqlRepository $db, array $event, array $oddsKeys): array
    {
        $teams = is_array($event['teams'] ?? null) ? $event['teams'] : [];
        $homeName = '';
        $awayName = '';
        foreach ($teams as $team) {
            if (!is_array($team)) continue;
            $name = trim((string) ($team['name'] ?? ''));
            $mascot = trim((string) ($team['mascot'] ?? ''));
            $full = trim($name . ' ' . $mascot);
            if (($team['is_home'] ?? false) === true) $homeName = $full !== '' ? $full : $name;
            elseif (($team['is_away'] ?? false) === true) $awayName = $full !== '' ? $full : $name;
        }
        if ($homeName === '' || $awayName === '') {
            return ['matched' => false, 'updated' => false, 'sportKey' => ''];
        }

        $eventDate = (string) ($event['event_date'] ?? '');
        $eventTs = $eventDate !== '' ? (int) strtotime($eventDate) : 0;

        $row = self::findMatchingRow($db, $homeName, $awayName, $oddsKeys, $eventTs);
        if ($row === null) {
            return ['matched' => false, 'updated' => false, 'sportKey' => ''];
        }

        $oddsDoc = self::buildOddsFromRundown($event['markets'] ?? [], $homeName, $awayName);
        $score = self::buildScoreFromRundown($event['score'] ?? []);
        $now = SqlRepository::nowUtc();
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
        try {
            $db->updateOne('matches', ['id' => SqlRepository::id((string) $row['id'])], $update);
            return ['matched' => true, 'updated' => true, 'sportKey' => (string) ($row['sportKey'] ?? '')];
        } catch (Throwable $_) {
            return ['matched' => true, 'updated' => false, 'sportKey' => (string) ($row['sportKey'] ?? '')];
        }
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
        $filter = [];
        if ($oddsKeys !== []) {
            $filter['sportKey'] = ['$in' => $oddsKeys];
        }
        // Constrain to anything currently live OR scheduled within a ±90min
        // window of the rundown event time. Avoids scanning the whole table.
        $filter['status'] = ['$in' => ['live', 'scheduled']];

        $candidates = $db->findMany('matches', $filter, [
            'projection' => ['id' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'sportKey' => 1, 'startTime' => 1],
            'limit' => 200,
        ]);
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
        if ($american > 0) return round(1 + ($american / 100), 4);
        return round(1 + (100 / abs($american)), 4);
    }

    /**
     * @param mixed $score
     * @return array<string,mixed>
     */
    private static function buildScoreFromRundown(mixed $score): array
    {
        if (!is_array($score)) return [];
        $out = [
            'event_status' => (string) ($score['event_status'] ?? ''),
            'home' => (int) ($score['score_home'] ?? 0),
            'away' => (int) ($score['score_away'] ?? 0),
            'period' => (int) ($score['game_period'] ?? 0),
            'clock' => (string) ($score['game_clock'] ?? ''),
            'updated_at' => (string) ($score['updated_at'] ?? ''),
        ];
        return $out;
    }
}
