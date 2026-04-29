<?php

declare(strict_types=1);

/**
 * Single source of truth for the short team name + record fields rendered on
 * the public odds board. Both the OddsAPI sync (pre-match feed) and the
 * Rundown live sync push through these helpers so the matches doc always
 * carries `homeTeamShort`, `awayTeamShort`, `homeTeamRecord`, `awayTeamRecord`
 * regardless of which feed last touched the row.
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
     * Compute the short display name for a team. Prefers the explicit
     * override map, falls back to the Rundown-supplied mascot, falls back
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

        // Rundown gives us the mascot directly — strongly preferred over
        // splitting the full name (handles "Trail Blazers" / "Maple Leafs"
        // without needing the override).
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
     * Extract a display record (e.g. "60-22" or "38-22-8") from a Rundown
     * team payload. Returns null when no usable record is present so the
     * frontend can suppress the parenthetical instead of rendering "()".
     *
     * @param array<string, mixed> $team Rundown team object
     */
    public static function recordFromRundownTeam(array $team, string $sportKey): ?string
    {
        $sportKey = strtolower(trim($sportKey));
        $includeTies = isset(self::TIE_SPORTS[$sportKey]);

        // Rundown V2 sometimes ships a flat string ("56-26"), sometimes an
        // object with wins/losses/ties or current_season. Cover both shapes.
        $raw = $team['record'] ?? ($team['records'] ?? null);

        // Case 1: flat string already in W-L or W-L-T form.
        if (is_string($raw)) {
            $clean = self::cleanRecordString($raw, $includeTies);
            return $clean === '' ? null : $clean;
        }

        // Case 2: array of season records — pick the regular/current season.
        if (is_array($raw) && self::isList($raw)) {
            foreach ($raw as $entry) {
                if (!is_array($entry)) continue;
                $type = strtolower((string) ($entry['type'] ?? $entry['name'] ?? ''));
                if ($type !== '' && strpos($type, 'current') === false && strpos($type, 'season') === false && strpos($type, 'regular') === false) {
                    continue;
                }
                $candidate = self::recordFromObject($entry, $includeTies);
                if ($candidate !== null) return $candidate;
            }
            // Fallback to the first entry if none looked "current".
            if (isset($raw[0]) && is_array($raw[0])) {
                return self::recordFromObject($raw[0], $includeTies);
            }
            return null;
        }

        // Case 3: object with wins / losses / (ties) at the top level.
        if (is_array($raw)) {
            return self::recordFromObject($raw, $includeTies);
        }

        // Case 4: no `record` key at all but wins/losses live directly on
        // the team object — happens with some normalized Rundown payloads.
        return self::recordFromObject($team, $includeTies);
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

    /** @param array<string, mixed> $entry */
    private static function recordFromObject(array $entry, bool $includeTies): ?string
    {
        // Prefer pre-formatted strings over numeric reconstruction — less
        // chance of off-by-one across regular-season vs total record.
        foreach (['current_season', 'record', 'season', 'value'] as $field) {
            if (isset($entry[$field]) && is_string($entry[$field])) {
                $clean = self::cleanRecordString($entry[$field], $includeTies);
                if ($clean !== '') return $clean;
            }
        }
        $wins = $entry['wins'] ?? null;
        $losses = $entry['losses'] ?? null;
        if (is_numeric($wins) && is_numeric($losses)) {
            $w = (int) $wins;
            $l = (int) $losses;
            if ($includeTies) {
                $t = $entry['ties'] ?? ($entry['draws'] ?? null);
                if (is_numeric($t)) {
                    return $w . '-' . $l . '-' . (int) $t;
                }
            }
            return $w . '-' . $l;
        }
        return null;
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

    /** @param array<mixed, mixed> $arr */
    private static function isList(array $arr): bool
    {
        if ($arr === []) return true;
        return array_keys($arr) === range(0, count($arr) - 1);
    }
}
