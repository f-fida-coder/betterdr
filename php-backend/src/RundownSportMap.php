<?php

declare(strict_types=1);

/**
 * Sport-identity bridge between the codebase's odds-api-style sportKey
 * strings (basketball_nba, soccer_epl, …) and TheRundown numeric sport IDs.
 *
 * The forward map (sportKey → sport_id) is the load-bearing table — the
 * cron rotation iterates over the codebase's existing tier lists, and
 * each iteration needs to know "which Rundown sport_id do I request?".
 *
 * The reverse map (sport_id → sportKey) is canonical: one preferred
 * sportKey per sport_id, used when discovering Rundown sports that
 * weren't in the existing tier lists.
 *
 * Source-of-truth: https://docs.therundown.io/reference/sports
 */
final class RundownSportMap
{
    /** @var array<string,int> sportKey => Rundown sport_id */
    private const SPORT_KEY_TO_ID = [
        // Basketball
        'basketball_nba'                  => 4,
        'basketball_nba_preseason'        => 23,
        'basketball_nba_playoffs'         => 24,
        'basketball_nba_summer_league'    => 32,
        'basketball_ncaab'                => 5,
        'basketball_wnba'                 => 8,
        // basketball_euroleague — Rundown does not cover EuroLeague.

        // American football
        'americanfootball_nfl'            => 2,
        'americanfootball_nfl_preseason'  => 25,
        'americanfootball_nfl_playoffs'   => 26,
        'americanfootball_ncaaf'          => 1,
        'americanfootball_cfl'            => 9,

        // Baseball
        'baseball_mlb'                    => 3,
        'baseball_mlb_spring_training'    => 30,
        'baseball_mlb_playoffs'           => 31,

        // Ice hockey
        'icehockey_nhl'                   => 6,
        'icehockey_nhl_preseason'         => 27,
        'icehockey_nhl_playoffs'          => 28,

        // MMA
        'mma_mixed_martial_arts'          => 7,
        // boxing_boxing — Rundown does not cover boxing.

        // Soccer — leagues map 1:1 onto Rundown sport_ids.
        'soccer_usa_mls'                  => 10,
        'soccer_epl'                      => 11,
        'soccer_france_ligue_one'         => 12,
        'soccer_germany_bundesliga'       => 13,
        'soccer_spain_la_liga'            => 14,
        'soccer_italy_serie_a'            => 15,
        'soccer_uefa_champs_league'       => 16,
        'soccer_uefa_europa_league'       => 33,
        'soccer_uefa_euro'                => 17,
        'soccer_japan_j_league'           => 19,
        'soccer_fifa_world_cup'           => 18,

        // Cricket — Rundown has IPL (20) and T20 (21). PSL/ODI events
        // surface under T20's umbrella; tournament filtering happens
        // downstream via the event payload's league_name.
        'cricket_ipl'                     => 20,
        'cricket_t20'                     => 21,
        'cricket_psl'                     => 21,
        'cricket_odi'                     => 21,

        // Tennis — Rundown collapses tournaments into ATP (38) / WTA (39).
        // Tournament filtering happens via the event payload's league_name.
        'tennis_atp'                      => 38,
        'tennis_atp_madrid_open'          => 38,
        'tennis_atp_french_open'          => 38,
        'tennis_atp_us_open'              => 38,
        'tennis_atp_wimbledon'            => 38,
        'tennis_atp_aus_open'             => 38,
        'tennis_wta'                      => 39,
        'tennis_wta_madrid_open'          => 39,
        'tennis_wta_french_open'          => 39,
        'tennis_wta_us_open'              => 39,
        'tennis_wta_wimbledon'            => 39,
        'tennis_wta_aus_open'             => 39,

        // Politics — single Rundown bucket.
        'politics_2026'                   => 22,
    ];

    /** @var array<int,string> Rundown sport_id => canonical sportKey */
    private const ID_TO_SPORT_KEY = [
        1  => 'americanfootball_ncaaf',
        2  => 'americanfootball_nfl',
        3  => 'baseball_mlb',
        4  => 'basketball_nba',
        5  => 'basketball_ncaab',
        6  => 'icehockey_nhl',
        7  => 'mma_mixed_martial_arts',
        8  => 'basketball_wnba',
        9  => 'americanfootball_cfl',
        10 => 'soccer_usa_mls',
        11 => 'soccer_epl',
        12 => 'soccer_france_ligue_one',
        13 => 'soccer_germany_bundesliga',
        14 => 'soccer_spain_la_liga',
        15 => 'soccer_italy_serie_a',
        16 => 'soccer_uefa_champs_league',
        17 => 'soccer_uefa_euro',
        18 => 'soccer_fifa_world_cup',
        19 => 'soccer_japan_j_league',
        20 => 'cricket_ipl',
        21 => 'cricket_t20',
        22 => 'politics_2026',
        23 => 'basketball_nba_preseason',
        24 => 'basketball_nba_playoffs',
        25 => 'americanfootball_nfl_preseason',
        26 => 'americanfootball_nfl_playoffs',
        27 => 'icehockey_nhl_preseason',
        28 => 'icehockey_nhl_playoffs',
        30 => 'baseball_mlb_spring_training',
        31 => 'baseball_mlb_playoffs',
        32 => 'basketball_nba_summer_league',
        33 => 'soccer_uefa_europa_league',
        38 => 'tennis_atp',
        39 => 'tennis_wta',
    ];

    /** @var array<int,string> Rundown sport_id => human-readable name */
    private const ID_TO_DISPLAY_NAME = [
        1  => 'NCAA Football',           2  => 'NFL',
        3  => 'MLB',                     4  => 'NBA',
        5  => 'NCAA Basketball',         6  => 'NHL',
        7  => 'UFC/MMA',                 8  => 'WNBA',
        9  => 'CFL',                     10 => 'MLS',
        11 => 'English Premier League',  12 => 'Ligue 1',
        13 => 'Bundesliga',              14 => 'La Liga',
        15 => 'Serie A',                 16 => 'UEFA Champions League',
        17 => 'UEFA Euro',               18 => 'FIFA',
        19 => 'J-League',                20 => 'IPL',
        21 => 'T20',                     22 => 'Politics',
        23 => 'NBA Preseason',           24 => 'NBA Playoffs',
        25 => 'NFL Preseason',           26 => 'NFL Playoffs',
        27 => 'NHL Preseason',           28 => 'NHL Playoffs',
        30 => 'MLB Spring Training',     31 => 'MLB Playoffs',
        32 => 'NBA Summer League',       33 => 'UEFA Europa League',
        38 => 'ATP Tennis',              39 => 'WTA Tennis',
    ];

    public static function sportKeyToSportId(string $sportKey): ?int
    {
        $key = strtolower(trim($sportKey));
        return self::SPORT_KEY_TO_ID[$key] ?? null;
    }

    public static function sportIdToSportKey(int $sportId): ?string
    {
        return self::ID_TO_SPORT_KEY[$sportId] ?? null;
    }

    /**
     * Collapse a sportKey to the single CANONICAL key for its Rundown
     * sport_id. Multiple aliases share one sport_id (e.g. cricket_psl /
     * cricket_odi / cricket_t20 → 21 → 'cricket_t20'; tennis_atp_madrid_open
     * → 38 → 'tennis_atp'). Rundown has no per-tournament split and we do
     * no league_name filtering, so syncing/storing under an alias just
     * re-labels the SAME events (deterministicMatchId is per-event, not
     * per-sportKey) — producing phantom groups like an out-of-season "PSL"
     * full of county cricket. Canonicalizing at sync time prevents that.
     * Returns the input lowercased if the key is unknown.
     */
    public static function canonicalSportKey(string $sportKey): string
    {
        $key = strtolower(trim($sportKey));
        $id  = self::SPORT_KEY_TO_ID[$key] ?? null;
        if ($id === null) {
            return $key;
        }
        return self::ID_TO_SPORT_KEY[$id] ?? $key;
    }

    public static function displayName(int $sportId): string
    {
        return self::ID_TO_DISPLAY_NAME[$sportId] ?? ('Sport #' . $sportId);
    }

    /** @return list<int> Every Rundown sport_id this map knows. */
    public static function allSupportedSportIds(): array
    {
        return array_keys(self::ID_TO_SPORT_KEY);
    }

    /** @return list<string> Every odds-api-style sportKey this map can forward. */
    public static function allKnownSportKeys(): array
    {
        return array_keys(self::SPORT_KEY_TO_ID);
    }

    /**
     * Distinct Rundown sport_ids referenced by a list of sportKeys.
     * Silently skips unknown / unsupported keys.
     *
     * @param iterable<string> $sportKeys
     * @return list<int>
     */
    public static function sportIdsForKeys(iterable $sportKeys): array
    {
        $ids = [];
        foreach ($sportKeys as $key) {
            $id = self::sportKeyToSportId((string) $key);
            if ($id !== null) {
                $ids[$id] = true;
            }
        }
        return array_keys($ids);
    }

    /**
     * Pairs of (sportKey, sport_id) for the given keys, in order, with
     * unknown keys dropped. Useful when a worker needs both the canonical
     * sportKey (for matches.doc.sportKey) and the upstream sport_id.
     *
     * @param iterable<string> $sportKeys
     * @return list<array{sportKey:string, sportId:int}>
     */
    public static function pairsForKeys(iterable $sportKeys): array
    {
        $out = [];
        foreach ($sportKeys as $key) {
            $k = strtolower(trim((string) $key));
            if ($k === '') continue;
            $id = self::SPORT_KEY_TO_ID[$k] ?? null;
            if ($id === null) continue;
            $out[] = ['sportKey' => $k, 'sportId' => $id];
        }
        return $out;
    }

    /**
     * One canonical (sportKey, sport_id) pair for every Rundown sport_id
     * we know — sorted by sport_id for stable rotation cursoring. Used
     * when the worker is configured to sync EVERY sport Rundown carries
     * (RUNDOWN_SYNC_ALL_SPORTS=true) rather than only the tier-list subset.
     *
     * @param list<int> $excludeSportIds  optional ids to skip
     * @return list<array{sportKey:string, sportId:int}>
     */
    public static function canonicalRotationPairs(array $excludeSportIds = []): array
    {
        $excluded = array_flip($excludeSportIds);
        $out = [];
        foreach (self::ID_TO_SPORT_KEY as $sportId => $sportKey) {
            if (isset($excluded[$sportId])) continue;
            $out[] = ['sportKey' => $sportKey, 'sportId' => $sportId];
        }
        usort($out, static fn (array $a, array $b): int => $a['sportId'] <=> $b['sportId']);
        return $out;
    }

    /**
     * Canonical sportKey list for every Rundown sport_id we know,
     * suitable as the rotation source when RUNDOWN_SYNC_ALL_SPORTS is on.
     *
     * @param list<int> $excludeSportIds
     * @return list<string>
     */
    public static function canonicalSportKeys(array $excludeSportIds = []): array
    {
        return array_map(static fn (array $p): string => $p['sportKey'], self::canonicalRotationPairs($excludeSportIds));
    }
}
