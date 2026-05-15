<?php

declare(strict_types=1);

/**
 * Single source of truth for the short team name + record fields rendered on
 * the public odds board. The OddsAPI sync (pre-match feed) pushes through
 * these helpers so the matches doc always carries `homeTeamShort` /
 * `awayTeamShort` regardless of which feed last touched the row.
 */
final class TeamNormalizer
{
    /**
     * Per-sport overrides for full-name → short-name mapping. Covers the
     * cases where the trailing-token heuristic produces something wrong
     * (multi-word mascots like Trail Blazers / Maple Leafs / Red Sox) and
     * the cases where two leagues share a mascot and need a city-prefix to
     * stay unambiguous on the same odds board (NY Giants vs SF Giants,
     * LA Kings vs Sacramento Kings, etc.).
     *
     * Keys are lowercased full team strings; values are the display short
     * name. Sport-specific entries take precedence via the `__SPORT__`
     * sub-map; the global map is consulted as a fallback.
     *
     * @var array<string, array<string, string>>
     */
    private const OVERRIDES = [
        '__GLOBAL__' => [
            // Multi-word mascots — last-token would only return the trailing word.
            'portland trail blazers'  => 'T Blazers',
            'toronto maple leafs'     => 'Maple Leafs',
            'boston red sox'          => 'Red Sox',
            'chicago white sox'       => 'White Sox',
        ],
        'americanfootball_nfl' => [
            'new york giants' => 'NY Giants',
            'new york jets'   => 'NY Jets',
            'los angeles rams'    => 'LA Rams',
            'los angeles chargers' => 'LA Chargers',
        ],
        'baseball_mlb' => [
            'san francisco giants' => 'SF Giants',
            'new york yankees'     => 'NY Yankees',
            'new york mets'        => 'NY Mets',
            'los angeles dodgers'  => 'LA Dodgers',
            'los angeles angels'   => 'LA Angels',
            'chicago cubs'         => 'Cubs',
        ],
        'basketball_nba' => [
            'los angeles lakers'   => 'LA Lakers',
            'los angeles clippers' => 'LA Clippers',
            'sacramento kings'     => 'Sac Kings',
        ],
        'icehockey_nhl' => [
            'los angeles kings'    => 'LA Kings',
            'new york rangers'     => 'NY Rangers',
            'new york islanders'   => 'NY Islanders',
        ],
    ];

    /**
     * Sports whose record format includes ties (W-L-T). Everything else
     * renders as W-L. NFL and NHL keep ties (NFL very rarely, NHL via OT
     * losses tracked separately), the rest are pure W-L.
     *
     * @var array<string, true>
     */
    private const TIE_SPORTS = [
        'americanfootball_nfl' => true,
        'americanfootball_ncaaf' => true,
        'americanfootball_cfl' => true,
        'icehockey_nhl' => true,
        'soccer_epl' => true,
        'soccer_france_ligue_one' => true,
        'soccer_germany_bundesliga' => true,
        'soccer_spain_la_liga' => true,
        'soccer_italy_serie_a' => true,
        'soccer_uefa_champs_league' => true,
        'soccer_uefa_europa_league' => true,
        'soccer_fifa_world_cup' => true,
        'soccer_japan_j_league' => true,
        'soccer_usa_mls' => true,
    ];

    /**
     * Normalise a flat record string ("46-20" / "(46-20)" / "Record: 46-20-2")
     * into the canonical W-L (or W-L-T for tie sports) shape, or null if the
     * input doesn't parse. Lets feeds that ship a pre-formatted summary
     * string hand it straight to this helper without copying the cleaning
     * logic.
     */
    public static function recordFromString(?string $raw, string $sportKey): ?string
    {
        if ($raw === null) return null;
        $sportKey = strtolower(trim($sportKey));
        $includeTies = isset(self::TIE_SPORTS[$sportKey]);
        $clean = self::cleanRecordString($raw, $includeTies);
        return $clean === '' ? null : $clean;
    }

    /**
     * Compute the short display name for a team. Prefers the explicit
     * override map, falls back to a feed-supplied mascot, falls back
     * again to the trailing-token of the full name. Always returns a
     * non-empty string when given a non-empty input.
     */
    public static function shortName(string $fullName, string $sportKey, ?string $mascot = null): string
    {
        $full = trim($fullName);
        if ($full === '' && ($mascot === null || trim($mascot) === '')) return '';

        $sportKey = strtolower(trim($sportKey));
        $key = strtolower($full);

        $sportMap = self::OVERRIDES[$sportKey] ?? [];
        if (isset($sportMap[$key])) return $sportMap[$key];

        $globalMap = self::OVERRIDES['__GLOBAL__'];
        if (isset($globalMap[$key])) return $globalMap[$key];

        // Some feeds ship the mascot directly — strongly preferred over
        // splitting the full name (handles "Trail Blazers" / "Maple Leafs"
        // without the override).
        if ($mascot !== null) {
            $m = trim($mascot);
            if ($m !== '') return $m;
        }

        if ($full === '') return '';

        // Heuristic: the mascot is whatever follows the city. Cities can be
        // 1, 2, or 3 words ("New York City FC"), so just take the last
        // non-empty token. The override map handles the multi-word mascots.
        $tokens = preg_split('/\s+/', $full) ?: [];
        $tokens = array_values(array_filter($tokens, static fn ($t) => $t !== ''));
        if ($tokens === []) return $full;
        return (string) end($tokens);
    }

    /**
     * Detect whether the OddsAPI sportKey sport tracks ties separately so
     * frontends can decide on display formatting if they ever build a
     * record string from a wins/losses/ties tuple themselves.
     */
    public static function sportTracksTies(string $sportKey): bool
    {
        return isset(self::TIE_SPORTS[strtolower(trim($sportKey))]);
    }

    /**
     * Normalise an upstream record string. Strips whitespace, validates the
     * shape (digits and dashes only), and trims trailing tie segment when
     * the sport doesn't track ties so e.g. an MLB row never renders "60-22-0".
     */
    private static function cleanRecordString(string $raw, bool $includeTies): string
    {
        $s = trim($raw);
        if ($s === '') return '';
        // Tolerate the occasional "(56-26)" or "Record: 56-26" wrapper.
        if (preg_match('/(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?/', $s, $m) === 1) {
            $w = (int) $m[1];
            $l = (int) $m[2];
            $t = isset($m[3]) ? (int) $m[3] : null;
            if ($includeTies && $t !== null) {
                return $w . '-' . $l . '-' . $t;
            }
            return $w . '-' . $l;
        }
        return '';
    }
}
