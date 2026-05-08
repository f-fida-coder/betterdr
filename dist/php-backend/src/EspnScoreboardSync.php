<?php

declare(strict_types=1);

/**
 * Enriches `matches` rows with team records + broadcast metadata fetched from
 * ESPN's public scoreboard feed
 * (`https://site.api.espn.com/apis/site/v2/sports/{league}/scoreboard`).
 *
 * Scope is intentionally tight:
 *
 *   - Only writes `homeTeamShort`, `awayTeamShort`, `homeTeamRecord`,
 *     `awayTeamRecord`, `broadcast`, `eventName`. Never touches odds, scores,
 *     or status — OddsAPI owns those columns and runs on its own cadence.
 *   - Matches ESPN events to existing rows by sportKey + fuzzy team-name
 *     equality + start-time window. Rows that don't match are dropped
 *     silently.
 *   - Runs entirely off the free, unauthenticated ESPN endpoint. No API key,
 *     no quota counter, no fallback. If ESPN is briefly unreachable the
 *     odds board just renders without the (W-L) parenthetical / TV chip
 *     until the next tick recovers.
 *
 * League map covers the OddsAPI sport keys we surface on the odds board.
 * Adding a new sport is a one-line addition.
 */
final class EspnScoreboardSync
{
    private const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

    /**
     * OddsAPI sport key → ESPN scoreboard URL fragment. Values are the path
     * segment after `/sports/`. Order is informational only — the worker
     * iterates the keys.
     *
     * @var array<string, string>
     */
    private const SPORT_MAP = [
        'basketball_nba'             => 'basketball/nba',
        'basketball_wnba'            => 'basketball/wnba',
        'basketball_ncaab'           => 'basketball/mens-college-basketball',
        'basketball_wncaab'          => 'basketball/womens-college-basketball',
        'americanfootball_nfl'       => 'football/nfl',
        'americanfootball_ncaaf'     => 'football/college-football',
        'baseball_mlb'               => 'baseball/mlb',
        'icehockey_nhl'              => 'hockey/nhl',
        'soccer_epl'                 => 'soccer/eng.1',
        'soccer_usa_mls'             => 'soccer/usa.1',
        'soccer_germany_bundesliga'  => 'soccer/ger.1',
        'soccer_spain_la_liga'       => 'soccer/esp.1',
        'soccer_italy_serie_a'       => 'soccer/ita.1',
        'soccer_france_ligue_one'    => 'soccer/fra.1',
        'soccer_uefa_champs_league'  => 'soccer/uefa.champions',
        'soccer_uefa_europa_league'  => 'soccer/uefa.europa',
    ];

    /**
     * Fetch each enabled league's scoreboard, normalize, and merge metadata
     * onto matched rows.
     *
     * @return array{ok:bool, sportsTried:int, eventsSeen:int, matched:int, updated:int, errors:int}
     */
    public static function tick(SqlRepository $db): array
    {
        $result = ['ok' => false, 'sportsTried' => 0, 'eventsSeen' => 0, 'matched' => 0, 'updated' => 0, 'errors' => 0];
        $touchedSportKeys = [];

        foreach (self::SPORT_MAP as $sportKey => $path) {
            $result['sportsTried']++;
            try {
                $events = self::fetchScoreboard($path);
            } catch (Throwable $e) {
                $result['errors']++;
                Logger::warn('ESPN scoreboard fetch failed', [
                    'sport' => $sportKey,
                    'error' => $e->getMessage(),
                ], 'espn-meta');
                continue;
            }
            if ($events === null) continue;

            foreach ($events as $event) {
                if (!is_array($event)) continue;
                $result['eventsSeen']++;
                $merged = self::mergeMetadataOnly($db, $event, $sportKey);
                if ($merged['matched']) $result['matched']++;
                if ($merged['updated']) {
                    $result['updated']++;
                    $touchedSportKeys[$sportKey] = true;
                }
            }
        }

        if ($result['updated'] > 0) {
            // Bust any matches caches the public endpoint might be holding,
            // matching what OddsSyncService::syncSingleSport does on writes.
            if (class_exists('SportsbookCache')) {
                SportsbookCache::invalidatePublicMatchCaches();
            }
            if (class_exists('RealtimeEventBus')) {
                foreach (array_keys($touchedSportKeys) as $sportKey) {
                    RealtimeEventBus::publish('odds:sport:sync', [
                        'sport_key' => $sportKey,
                        'source'    => 'espn-meta',
                        'time'      => gmdate(DATE_ATOM),
                    ]);
                }
            }
        }

        $result['ok'] = true;
        Logger::info('ESPN scoreboard tick completed', $result, 'espn-meta');
        return $result;
    }

    /**
     * GET ESPN scoreboard for the given league path and return the parsed
     * events list (or null on a non-fatal upstream error).
     *
     * @return list<array<string,mixed>>|null
     */
    private static function fetchScoreboard(string $path): ?array
    {
        $url = self::ESPN_BASE . '/' . $path . '/scoreboard';

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'User-Agent: bettorplays247/1.0',
            ],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($body === false || $err !== '') {
            throw new RuntimeException("curl error: {$err}");
        }
        if ($status !== 200) {
            // ESPN occasionally 404s leagues mid-offseason. Treat any non-200
            // as "no data this tick" rather than a hard error so the worker
            // keeps moving.
            return null;
        }

        $decoded = json_decode((string) $body, true);
        if (!is_array($decoded)) return null;
        $events = $decoded['events'] ?? null;
        return is_array($events) ? array_values($events) : null;
    }

    /**
     * Take an ESPN event payload, locate the matching DB row, and write only
     * the metadata fields. Returns whether the row was matched/updated for
     * the caller's tally.
     *
     * @param array<string,mixed> $event
     * @return array{matched:bool, updated:bool}
     */
    private static function mergeMetadataOnly(SqlRepository $db, array $event, string $sportKey): array
    {
        $competition = self::firstCompetition($event);
        if ($competition === null) return ['matched' => false, 'updated' => false];

        $home = self::extractCompetitor($competition, 'home');
        $away = self::extractCompetitor($competition, 'away');
        if ($home === null || $away === null) return ['matched' => false, 'updated' => false];

        $homeName = trim((string) ($home['team']['displayName'] ?? ''));
        $awayName = trim((string) ($away['team']['displayName'] ?? ''));
        if ($homeName === '' || $awayName === '') return ['matched' => false, 'updated' => false];

        $broadcast = self::extractBroadcast($competition);
        $eventName = self::extractEventName($competition);
        $homeRecord = self::extractOverallRecord($home);
        $awayRecord = self::extractOverallRecord($away);
        $homeShort = TeamNormalizer::shortName($homeName, $sportKey, (string) ($home['team']['shortDisplayName'] ?? $home['team']['name'] ?? ''));
        $awayShort = TeamNormalizer::shortName($awayName, $sportKey, (string) ($away['team']['shortDisplayName'] ?? $away['team']['name'] ?? ''));

        // Skip the DB hit when ESPN gave us nothing actually useful — saves
        // a query for every offseason / inactive league entry.
        if (
            $broadcast === ''
            && $eventName === ''
            && $homeRecord === null
            && $awayRecord === null
            && $homeShort === ''
            && $awayShort === ''
        ) {
            return ['matched' => false, 'updated' => false];
        }

        $eventTs = (int) strtotime((string) ($event['date'] ?? ''));

        $row = self::findMatchingRow($db, $sportKey, $homeName, $awayName, $eventTs);
        if ($row === null) return ['matched' => false, 'updated' => false];

        // No-op fast path — if every field already matches, don't bump
        // updatedAt and bust caches downstream for nothing.
        if (
            (string) ($row['broadcast'] ?? '') === $broadcast
            && (string) ($row['eventName'] ?? '') === $eventName
            && (string) ($row['homeTeamShort'] ?? '') === $homeShort
            && (string) ($row['awayTeamShort'] ?? '') === $awayShort
            && (string) ($row['homeTeamRecord'] ?? '') === ($homeRecord ?? '')
            && (string) ($row['awayTeamRecord'] ?? '') === ($awayRecord ?? '')
        ) {
            return ['matched' => true, 'updated' => false];
        }

        $update = ['updatedAt' => SqlRepository::nowUtc()];
        // Empty-string broadcast means ESPN cleared it (no national TV
        // listed anymore) — propagate the clear, but don't clear records
        // when ESPN omits them (records vanish on offseason/playoff edges
        // where the API serves a partial event payload).
        $update['broadcast'] = $broadcast;
        if ($eventName !== '') $update['eventName'] = $eventName;
        if ($homeShort !== '') $update['homeTeamShort'] = $homeShort;
        if ($awayShort !== '') $update['awayTeamShort'] = $awayShort;
        if ($homeRecord !== null) $update['homeTeamRecord'] = $homeRecord;
        if ($awayRecord !== null) $update['awayTeamRecord'] = $awayRecord;

        $db->updateOne('matches', ['id' => SqlRepository::id((string) $row['id'])], $update);
        return ['matched' => true, 'updated' => true];
    }

    /** @param array<string,mixed> $event */
    private static function firstCompetition(array $event): ?array
    {
        $competitions = $event['competitions'] ?? null;
        if (!is_array($competitions) || $competitions === []) return null;
        $first = $competitions[0];
        return is_array($first) ? $first : null;
    }

    /**
     * Pull the home- or away-side competitor block from an ESPN competition.
     *
     * @param array<string,mixed> $competition
     */
    private static function extractCompetitor(array $competition, string $side): ?array
    {
        $competitors = $competition['competitors'] ?? null;
        if (!is_array($competitors)) return null;
        foreach ($competitors as $c) {
            if (!is_array($c)) continue;
            if (strtolower((string) ($c['homeAway'] ?? '')) === $side) return $c;
        }
        return null;
    }

    /**
     * Prefer the "overall" record summary; fall back to the first record
     * entry the league exposes (some sports only ship "home"/"away" splits).
     *
     * @param array<string,mixed> $competitor
     */
    private static function extractOverallRecord(array $competitor): ?string
    {
        $records = $competitor['records'] ?? null;
        if (!is_array($records)) return null;
        $sportKey = ''; // resolved by caller via TeamNormalizer
        $summary = null;
        foreach ($records as $r) {
            if (!is_array($r)) continue;
            $name = strtolower((string) ($r['type'] ?? $r['name'] ?? ''));
            if ($name === 'overall' || $name === 'total' || $name === 'ytd') {
                $summary = (string) ($r['summary'] ?? '');
                break;
            }
        }
        if ($summary === null) {
            $first = $records[0] ?? null;
            if (is_array($first)) $summary = (string) ($first['summary'] ?? '');
        }
        if ($summary === null || $summary === '') return null;
        // Caller (mergeMetadataOnly) already knows the sportKey; we can't
        // honor tie-sport formatting here without it, but the sport tracker
        // is just for stripping a pointless "-0" tail. The cleaner accepts
        // both shapes, so passing '' (no tie awareness) preserves whatever
        // ESPN shipped. The worker's caller never reformats afterwards.
        return TeamNormalizer::recordFromString($summary, $sportKey);
    }

    /**
     * Compose a single broadcast string from the (potentially multi-market)
     * `competition.broadcasts[]` array. National listings come first, then
     * home, then away — matches what a viewer cares about most.
     *
     * @param array<string,mixed> $competition
     */
    private static function extractBroadcast(array $competition): string
    {
        $entries = $competition['broadcasts'] ?? null;
        if (!is_array($entries)) return '';
        $byMarket = ['national' => [], 'home' => [], 'away' => [], 'other' => []];
        foreach ($entries as $entry) {
            if (!is_array($entry)) continue;
            $market = strtolower((string) ($entry['market'] ?? 'other'));
            if (!isset($byMarket[$market])) $market = 'other';
            $names = $entry['names'] ?? null;
            if (!is_array($names)) continue;
            foreach ($names as $name) {
                $clean = trim((string) $name);
                if ($clean !== '') $byMarket[$market][] = $clean;
            }
        }
        $ordered = array_merge($byMarket['national'], $byMarket['home'], $byMarket['away'], $byMarket['other']);
        $ordered = array_values(array_unique($ordered));
        return implode('/', $ordered);
    }

    /**
     * Surface a meaningful tournament/playoff label only — `notes[].headline`.
     * ESPN omits this field for regular-season games, which is what we want;
     * a placeholder like "Regular Season Game 41" would be visual noise.
     *
     * @param array<string,mixed> $competition
     */
    private static function extractEventName(array $competition): string
    {
        $notes = $competition['notes'] ?? null;
        if (!is_array($notes) || $notes === []) return '';
        foreach ($notes as $note) {
            if (!is_array($note)) continue;
            $headline = trim((string) ($note['headline'] ?? ''));
            if ($headline !== '') return $headline;
        }
        return '';
    }

    /**
     * Resolve an ESPN event to a row in our matches collection by fuzzy
     * team-name equality + a ±90 minute startTime window.
     *
     * @return array<string,mixed>|null
     */
    private static function findMatchingRow(SqlRepository $db, string $sportKey, string $home, string $away, int $eventTs): ?array
    {
        $candidates = $db->findMany('matches', [
            'sportKey' => $sportKey,
            'status' => ['$in' => ['live', 'scheduled']],
        ], [
            'projection' => ['id' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'startTime' => 1, 'broadcast' => 1, 'eventName' => 1, 'homeTeamShort' => 1, 'awayTeamShort' => 1, 'homeTeamRecord' => 1, 'awayTeamRecord' => 1],
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
            // Accept reversed home/away too — some sports (tennis, MMA) and
            // soccer occasionally flip the convention between providers.
            if (!($homeMatch && $awayMatch) && !(self::teamFuzzyEquals($rh, $awayNorm) && self::teamFuzzyEquals($ra, $homeNorm))) {
                continue;
            }
            if ($eventTs > 0 && !empty($row['startTime'])) {
                $rowTs = (int) strtotime((string) $row['startTime']);
                if ($rowTs > 0 && abs($rowTs - $eventTs) > 5400) continue;
            }
            return $row;
        }
        return null;
    }

    private static function normalizeTeam(string $name): string
    {
        $s = strtolower(trim($name));
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
        $aTokens = preg_split('/\s+/', $a) ?: [];
        $bTokens = preg_split('/\s+/', $b) ?: [];
        $aSet = array_flip(array_filter($aTokens, static fn ($t) => $t !== ''));
        $bSet = array_flip(array_filter($bTokens, static fn ($t) => $t !== ''));
        if ($aSet === [] || $bSet === []) return false;
        $shared = array_intersect_key($aSet, $bSet);
        // Full subset in either direction = match. Required tokens >= 1
        // prevents single-letter or empty-set false positives.
        return count($shared) > 0
            && (count($shared) === count($aSet) || count($shared) === count($bSet));
    }
}
