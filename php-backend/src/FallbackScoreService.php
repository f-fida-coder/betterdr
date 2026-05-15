<?php

declare(strict_types=1);

/**
 * Backup score lookup for matches OddsAPI's /scores feed never filled in.
 *
 * The primary failure mode this fixes is "the game ended hours ago but our
 * matches row still has score_home/score_away = null". When that happens the
 * cron sweep can't grade because BetSettlementService::looksProvablyFinished
 * requires hasScore=true. Without a fallback the ticket just sits in the
 * stuck-bet inbox until an operator hand-grades it.
 *
 * Strategy: hit ESPN's public scoreboard JSON for the same sport+date, match
 * by normalized team name, and write the final score back onto our matches
 * row. ESPN covers KBO, NPB, every US major, plus a long tail of niche
 * leagues — the exact gap OddsAPI sometimes leaves open.
 *
 * Money safety: this service NEVER calls BetSettlementService directly. It
 * only writes the score onto the match row + sets status='finished' when
 * ESPN reports STATUS_FINAL. The next cron sweep tick grades via the same
 * transactional path every other settlement uses (looksProvablyFinished →
 * settleMatch). No new code path touches transactions or pendingBalance.
 */
final class FallbackScoreService
{
    /**
     * OddsAPI sport_key → ESPN scoreboard path (`sport/league` segment).
     *
     * Sports without ESPN coverage are simply absent from this map; the
     * service returns null for them so the caller falls back to "operator
     * must confirm" without making any HTTP call. Confirmed against
     * site.api.espn.com/apis/site/v2/sports/<sport>/<league>/scoreboard.
     *
     * @var array<string, string>
     */
    private const SPORT_TO_ESPN = [
        'baseball_mlb'              => 'baseball/mlb',
        'baseball_kbo'              => 'baseball/kbo',
        'baseball_npb'              => 'baseball/npb',
        'basketball_nba'            => 'basketball/nba',
        'basketball_wnba'           => 'basketball/wnba',
        'basketball_ncaab'          => 'basketball/mens-college-basketball',
        'basketball_euroleague'     => 'basketball/euroleague',
        'americanfootball_nfl'      => 'football/nfl',
        'americanfootball_ncaaf'    => 'football/college-football',
        'icehockey_nhl'             => 'hockey/nhl',
        'soccer_epl'                => 'soccer/eng.1',
        'soccer_spain_la_liga'      => 'soccer/esp.1',
        'soccer_germany_bundesliga' => 'soccer/ger.1',
        'soccer_italy_serie_a'      => 'soccer/ita.1',
        'soccer_france_ligue_one'   => 'soccer/fra.1',
        'soccer_uefa_champs_league' => 'soccer/uefa.champions',
        'soccer_uefa_europa_league' => 'soccer/uefa.europa',
        'soccer_usa_mls'            => 'soccer/usa.1',
        'mma_mixed_martial_arts'    => 'mma/ufc',
    ];

    private const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

    /** Cache TTL for scoreboard responses to avoid hammering ESPN. */
    private const CACHE_TTL_SECONDS = 300;

    /** @var array<string, array{at:int, body:string}> */
    private static array $cache = [];

    /**
     * Look up a final score for a single match. Returns the canonical
     * shape OddsSyncService::extractScoreAndStatus produces, or null when
     * no fallback exists or the score isn't published yet.
     *
     * @param array<string,mixed> $match
     * @return array{status:string, score:array{score_home:float, score_away:float, event_status?:string}}|null
     */
    public static function lookupFinalScore(array $match): ?array
    {
        if (strtolower((string) Env::get('FALLBACK_SCORES_ENABLED', 'true')) !== 'true') {
            return null;
        }
        $sportKey = (string) ($match['sportKey'] ?? '');
        if ($sportKey === '') {
            return null;
        }
        $espnPath = self::SPORT_TO_ESPN[$sportKey] ?? null;
        if ($espnPath === null) {
            return null;
        }
        $home = trim((string) ($match['homeTeam'] ?? ''));
        $away = trim((string) ($match['awayTeam'] ?? ''));
        $startRaw = (string) ($match['startTime'] ?? '');
        if ($home === '' || $away === '' || $startRaw === '') {
            return null;
        }
        $startTs = strtotime($startRaw) ?: 0;
        if ($startTs <= 0) {
            return null;
        }

        // Game day in UTC. ESPN's scoreboard ?dates=YYYYMMDD is forgiving —
        // it serves the slate that day, including events whose local kickoff
        // crossed midnight. We try the calendar day and the prior day to
        // cover late-night ET starts that ESPN slots under the next day.
        $candidates = [
            gmdate('Ymd', $startTs),
            gmdate('Ymd', $startTs - 86400),
            gmdate('Ymd', $startTs + 86400),
        ];

        foreach ($candidates as $dateKey) {
            $url = self::ESPN_BASE . '/' . $espnPath . '/scoreboard?dates=' . $dateKey;
            $body = self::httpGetCached($url);
            if ($body === null) {
                continue;
            }
            $decoded = json_decode($body, true);
            if (!is_array($decoded) || !isset($decoded['events']) || !is_array($decoded['events'])) {
                continue;
            }
            $hit = self::findMatchInEvents($decoded['events'], $home, $away, $startTs);
            if ($hit !== null) {
                return $hit;
            }
        }
        return null;
    }

    /**
     * Look up a match and write the score onto our matches row when ESPN
     * reports a final. Returns true if the row was updated (and is now
     * settle-ready), false otherwise.
     *
     * Designed to be called once per match per sweep — the caller decides
     * the cadence. Cheap when ESPN is cached or the sport isn't mapped.
     *
     * @param array<string,mixed> $match
     */
    public static function tryHealMatch(SqlRepository $db, array $match): bool
    {
        $matchId = (string) ($match['id'] ?? '');
        if ($matchId === '' || preg_match('/^[a-f0-9]{24}$/i', $matchId) !== 1) {
            return false;
        }
        $hit = self::lookupFinalScore($match);
        if ($hit === null) {
            return false;
        }
        $status = (string) ($hit['status'] ?? '');
        if ($status !== 'finished') {
            return false;
        }
        $now = SqlRepository::nowUtc();
        $db->updateOne('matches', ['id' => SqlRepository::id($matchId)], [
            'status' => 'finished',
            'score' => $hit['score'],
            'lastUpdated' => $now,
            'lastScoreSyncAt' => $now,
            'lastScoreChangedAt' => $now,
            'updatedAt' => $now,
            'fallbackScoreSource' => 'espn',
            'fallbackScoreAt' => $now,
        ]);
        Logger::info('fallback score healed match from ESPN', [
            'matchId' => $matchId,
            'sportKey' => (string) ($match['sportKey'] ?? ''),
            'homeTeam' => (string) ($match['homeTeam'] ?? ''),
            'awayTeam' => (string) ($match['awayTeam'] ?? ''),
            'finalScore' => $hit['score'],
        ], 'bets');
        return true;
    }

    /**
     * Find a specific home/away matchup in an ESPN events array. Returns
     * the canonical score+status shape, or null if no event matches both
     * teams within a 24h window of the expected start.
     *
     * @param list<array<string,mixed>> $events
     * @return array{status:string, score:array{score_home:float, score_away:float, event_status:string}}|null
     */
    private static function findMatchInEvents(array $events, string $home, string $away, int $startTs): ?array
    {
        $homeNorm = self::norm($home);
        $awayNorm = self::norm($away);

        foreach ($events as $event) {
            if (!is_array($event)) continue;
            $competitions = is_array($event['competitions'] ?? null) ? $event['competitions'] : [];
            $competition = is_array($competitions[0] ?? null) ? $competitions[0] : null;
            if ($competition === null) continue;

            $competitors = is_array($competition['competitors'] ?? null) ? $competition['competitors'] : [];
            if (count($competitors) < 2) continue;

            $espnHome = null;
            $espnAway = null;
            foreach ($competitors as $c) {
                if (!is_array($c)) continue;
                $isHome = (string) ($c['homeAway'] ?? '') === 'home';
                $name = (string) ($c['team']['displayName'] ?? $c['team']['name'] ?? '');
                $shortName = (string) ($c['team']['shortDisplayName'] ?? '');
                $score = isset($c['score']) ? (float) $c['score'] : null;
                $row = ['name' => $name, 'shortName' => $shortName, 'score' => $score];
                if ($isHome) {
                    $espnHome = $row;
                } else {
                    $espnAway = $row;
                }
            }
            if ($espnHome === null || $espnAway === null) continue;

            $eHomeNames = [self::norm((string) $espnHome['name']), self::norm((string) $espnHome['shortName'])];
            $eAwayNames = [self::norm((string) $espnAway['name']), self::norm((string) $espnAway['shortName'])];
            $forwardMatch = self::nameContainsAny($homeNorm, $eHomeNames) && self::nameContainsAny($awayNorm, $eAwayNames);
            $reverseMatch = self::nameContainsAny($homeNorm, $eAwayNames) && self::nameContainsAny($awayNorm, $eHomeNames);
            if (!$forwardMatch && !$reverseMatch) continue;

            $eventDate = (string) ($event['date'] ?? ($competition['date'] ?? ''));
            $eventTs = $eventDate !== '' ? (strtotime($eventDate) ?: 0) : 0;
            if ($eventTs > 0 && abs($eventTs - $startTs) > 86400) continue;

            $statusName = (string) ($event['status']['type']['name'] ?? ($competition['status']['type']['name'] ?? ''));
            $statusCompleted = (bool) ($event['status']['type']['completed'] ?? ($competition['status']['type']['completed'] ?? false));
            $normalized = SportsMatchStatus::normalize($statusName, $statusName);
            if (!$statusCompleted && $normalized !== 'finished') {
                continue;
            }

            // Map ESPN's score onto OUR home/away orientation. ESPN's home
            // team isn't always ours (international feeds invert), so we
            // re-orient based on the matched direction.
            $ourHomeScore = $forwardMatch ? (float) $espnHome['score'] : (float) $espnAway['score'];
            $ourAwayScore = $forwardMatch ? (float) $espnAway['score'] : (float) $espnHome['score'];

            return [
                'status' => 'finished',
                'score' => [
                    'score_home' => $ourHomeScore,
                    'score_away' => $ourAwayScore,
                    'event_status' => $statusName !== '' ? $statusName : 'STATUS_FINAL',
                ],
            ];
        }
        return null;
    }

    /**
     * Loose name match: do the two normalized strings share at least one
     * non-trivial token? Catches "SSG Landers" vs "Landers" and "New York
     * Yankees" vs "Yankees" without false-positiving on "Real Madrid" vs
     * "Real Sociedad" (the shared token "real" is filtered).
     *
     * @param list<string> $candidates
     */
    private static function nameContainsAny(string $needle, array $candidates): bool
    {
        if ($needle === '') return false;
        foreach ($candidates as $cand) {
            if ($cand === '') continue;
            if ($needle === $cand) return true;
            if (str_contains($needle, $cand) || str_contains($cand, $needle)) return true;
            // Token overlap — require at least one distinctive token (≥4 chars,
            // not a common cluster like "real", "fc", "city", "united").
            $needleTokens = self::distinctiveTokens($needle);
            $candTokens = array_flip(self::distinctiveTokens($cand));
            foreach ($needleTokens as $tok) {
                if (isset($candTokens[$tok])) return true;
            }
        }
        return false;
    }

    /** @return list<string> */
    private static function distinctiveTokens(string $s): array
    {
        $skip = ['real', 'city', 'united', 'club', 'team', 'fc', 'sc', 'cf', 'afc', 'cfc', 'football', 'soccer', 'baseball'];
        $out = [];
        foreach (preg_split('/\s+/', $s) ?: [] as $tok) {
            $tok = trim($tok);
            if ($tok === '' || strlen($tok) < 4) continue;
            if (in_array($tok, $skip, true)) continue;
            $out[] = $tok;
        }
        return $out;
    }

    private static function norm(string $s): string
    {
        $s = strtolower(trim($s));
        // Strip accents (rough — no transliterator dependency).
        $s = strtr($s, [
            'á'=>'a','à'=>'a','â'=>'a','ä'=>'a','ã'=>'a','å'=>'a',
            'é'=>'e','è'=>'e','ê'=>'e','ë'=>'e',
            'í'=>'i','ì'=>'i','î'=>'i','ï'=>'i',
            'ó'=>'o','ò'=>'o','ô'=>'o','ö'=>'o','õ'=>'o',
            'ú'=>'u','ù'=>'u','û'=>'u','ü'=>'u',
            'ñ'=>'n','ç'=>'c',
        ]);
        // Drop punctuation, collapse whitespace.
        $s = preg_replace('/[^a-z0-9\s]/', ' ', $s) ?? $s;
        $s = preg_replace('/\s+/', ' ', $s) ?? $s;
        return trim($s);
    }

    private static function httpGetCached(string $url): ?string
    {
        $now = time();
        if (isset(self::$cache[$url]) && ($now - self::$cache[$url]['at']) < self::CACHE_TTL_SECONDS) {
            return self::$cache[$url]['body'];
        }
        $ch = curl_init($url);
        if ($ch === false) return null;
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 6,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_USERAGENT => 'bettorplays247/1.0 fallback-score',
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if (!is_string($body) || $body === '' || $status < 200 || $status >= 300) {
            return null;
        }
        self::$cache[$url] = ['at' => $now, 'body' => $body];
        return $body;
    }
}
