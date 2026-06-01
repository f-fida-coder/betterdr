<?php

declare(strict_types=1);

/**
 * Maps TheRundown numeric market_id values to the codebase's
 * odds-api-style market keys.
 *
 * Three categories:
 *   - CORE     : Moneyline, Spread, Total, Team Totals (+ live variants).
 *                Rendered as match.doc.odds.bookmakers[].markets[].
 *   - EXTENDED : period markets (Q1-4, H1/H2, F5/F7 baseball, tennis sets…)
 *                and team_total variants. Rendered as match.doc.extendedMarkets[].
 *   - PROPS    : player markets (TYPE_PLAYER participants). Rendered as
 *                match.doc.playerProps[].
 *
 * The mapping IDs are sourced from
 *   https://docs.therundown.io/reference/markets
 *
 * Sport-specific markets that aren't in the doc snapshot fall through to
 * null and are silently dropped — better to miss a niche prop than to
 * surface a market with the wrong odds-api key.
 */
final class RundownMarketMap
{
    /** @var array<int,string> Core market_id → odds-api key */
    private const CORE_MARKETS = [
        // Prematch
        1  => 'h2h',
        2  => 'spreads',
        3  => 'totals',
        94 => 'team_totals',
        // Live (in-play) variants — same odds-api key, distinct ID upstream
        41 => 'h2h',
        42 => 'spreads',
        43 => 'totals',
        96 => 'team_totals',
    ];

    /**
     * @var array<int,string> Player-prop market_id → odds-api key.
     * Sourced from the NBA / NCAAB / NFL / MLB / NHL prop tables in
     * Rundown's reference docs. Live mirrors are listed in PROP_LIVE_MIRRORS.
     */
    private const PROP_MARKETS = [
        29  => 'player_points',
        33  => 'player_turnovers',
        35  => 'player_rebounds',
        38  => 'player_threes',
        39  => 'player_assists',
        87  => 'player_double_double',
        88  => 'player_triple_double',
        93  => 'player_points_rebounds_assists',
        98  => 'player_blocks',
        99  => 'player_points_assists',
        297 => 'player_points_rebounds',
        298 => 'player_rebounds_assists',
        // Live mirrors of the same player markets.
        90  => 'player_points',
        91  => 'player_assists',
        92  => 'player_threes',
        982 => 'player_rebounds',
        983 => 'player_blocks',
        984 => 'player_turnovers',
        985 => 'player_double_double',
        986 => 'player_triple_double',
        987 => 'player_points_rebounds_assists',
        988 => 'player_points_rebounds',
        989 => 'player_points_assists',
        990 => 'player_rebounds_assists',
    ];

    /**
     * @var array<int, array{0:string,1:string,2:bool}>
     * Period market_id → [base_key, period_token, is_in_play].
     *
     * Period markets are sport-aware in Rundown: market_id=981
     * (`moneyline_first_quarter`) means Q1 for NBA/NFL but P1 for NHL.
     * Rather than emit a single suffix here, we store an abstract
     * `period_token` (e.g. `1st_quarter`) and resolve to the per-sport
     * suffix at `explicitPeriodKey()` time via PERIOD_TOKEN_TO_SUFFIX.
     *
     * Coverage is sourced from the live Rundown payloads for sports we
     * actually serve. IDs Rundown ships but we don't surface (correct
     * scores, race-to, etc.) are intentionally absent.
     */
    private const PERIOD_MARKETS = [
        // ── First half / second half (NBA, NFL, NCAAB, NCAAF, soccer) ──
        4    => ['h2h',         '1st_half', false],
        5    => ['spreads',     '1st_half', false],
        6    => ['totals',      '1st_half', false],
        95   => ['team_totals', '1st_half', false],
        1008 => ['totals',      '2nd_half', false],
        1009 => ['spreads',     '2nd_half', false],
        1010 => ['h2h',         '2nd_half', false],

        // ── Quarters (NBA, NFL, NCAAB, NCAAF) — Rundown reuses these
        // market_ids for NHL P1-P3 with the same numbering. Sport-aware
        // suffix resolution distinguishes _q1 from _p1.
        957  => ['spreads',     '1st_quarter', false],
        958  => ['totals',      '1st_quarter', false],
        981  => ['h2h',         '1st_quarter', false],
        991  => ['team_totals', '1st_quarter', false],
        1011 => ['totals',      '2nd_quarter', false],
        1012 => ['spreads',     '2nd_quarter', false],
        1013 => ['h2h',         '2nd_quarter', false],
        1020 => ['team_totals', '2nd_quarter', false],
        1014 => ['totals',      '3rd_quarter', false],
        1015 => ['spreads',     '3rd_quarter', false],
        1016 => ['h2h',         '3rd_quarter', false],
        1021 => ['team_totals', '3rd_quarter', false],
        1017 => ['totals',      '4th_quarter', false],
        1018 => ['spreads',     '4th_quarter', false],
        1019 => ['h2h',         '4th_quarter', false],
        1022 => ['team_totals', '4th_quarter', false],

        // ── In-play halves (NBA, NFL) ──
        1024 => ['h2h',         '1st_half', true],
        1025 => ['spreads',     '1st_half', true],
        1026 => ['totals',      '1st_half', true],
        1027 => ['team_totals', '1st_half', true],
        1028 => ['h2h',         '2nd_half', true],
        1029 => ['spreads',     '2nd_half', true],
        1030 => ['totals',      '2nd_half', true],
        1031 => ['team_totals', '2nd_half', true],

        // ── In-play quarters (NBA, NFL, NHL periods) ──
        1032 => ['h2h',         '1st_quarter', true],
        1033 => ['spreads',     '1st_quarter', true],
        1034 => ['totals',      '1st_quarter', true],
        1035 => ['team_totals', '1st_quarter', true],
        1036 => ['h2h',         '2nd_quarter', true],
        1037 => ['spreads',     '2nd_quarter', true],
        1038 => ['totals',      '2nd_quarter', true],
        1039 => ['team_totals', '2nd_quarter', true],
        1040 => ['h2h',         '3rd_quarter', true],
        1041 => ['spreads',     '3rd_quarter', true],
        1042 => ['totals',      '3rd_quarter', true],
        1043 => ['team_totals', '3rd_quarter', true],
        1044 => ['h2h',         '4th_quarter', true],
        1045 => ['spreads',     '4th_quarter', true],
        1046 => ['totals',      '4th_quarter', true],
        1047 => ['team_totals', '4th_quarter', true],

        // ── MLB innings ──
        // "first_half_mlb" = first 5 innings in MLB convention.
        769  => ['h2h',     '1st_5_innings', false],
        780  => ['totals',  '1st_5_innings', false],
        791  => ['spreads', '1st_5_innings', false],
        1109 => ['h2h',     '1st_3_innings', false],
        1110 => ['spreads', '1st_3_innings', false],
        1111 => ['totals',  '1st_3_innings', false],
        1112 => ['h2h',     '1st_7_innings', false],
        1113 => ['spreads', '1st_7_innings', false],
        1114 => ['totals',  '1st_7_innings', false],
        // F1 (first inning) — Rundown ships these as separate IDs.
        784  => ['h2h',     '1st_1_innings', false],   // first_inning_result
        766  => ['totals',  '1st_1_innings', false],   // over_under_05_runs_first_inning
        1129 => ['spreads', '1st_1_innings', false],   // first_inning_run_line

        // ── Tennis sets (existing semantics, restated in new schema) ──
        1150 => ['h2h',     'set_1', false],
        1151 => ['spreads', 'set_1', false],
        1152 => ['totals',  'set_1', false],
        1153 => ['h2h',     'set_2', false],
        1154 => ['h2h',     'set_1', true],
        1155 => ['spreads', 'set_1', true],
        1156 => ['totals',  'set_1', true],
        1157 => ['h2h',     'set_2', true],
    ];

    /**
     * @var array<string, array<string,string>>
     * Sport prefix → period_token → suffix (no leading underscore).
     *
     * The sport prefix is the part before the first '_' in a sportKey
     * (basketball_nba → 'basketball'). Hockey reuses Rundown's
     * "quarter" market_ids as periods, so basketball/hockey diverge here.
     */
    private const PERIOD_TOKEN_TO_SUFFIX = [
        'basketball' => [
            '1st_quarter' => 'q1', '2nd_quarter' => 'q2',
            '3rd_quarter' => 'q3', '4th_quarter' => 'q4',
            '1st_half'    => 'h1', '2nd_half'    => 'h2',
        ],
        'americanfootball' => [
            '1st_quarter' => 'q1', '2nd_quarter' => 'q2',
            '3rd_quarter' => 'q3', '4th_quarter' => 'q4',
            '1st_half'    => 'h1', '2nd_half'    => 'h2',
        ],
        'icehockey' => [
            '1st_quarter' => 'p1', '2nd_quarter' => 'p2',
            '3rd_quarter' => 'p3',
        ],
        'baseball' => [
            '1st_1_innings' => '1st_1_innings',
            '1st_3_innings' => '1st_3_innings',
            '1st_5_innings' => '1st_5_innings',
            '1st_7_innings' => '1st_7_innings',
        ],
        'soccer' => [
            '1st_half' => 'h1', '2nd_half' => 'h2',
        ],
        'tennis' => [
            'set_1' => 'set_1', 'set_2' => 'set_2', 'set_3' => 'set_3',
        ],
    ];

    private const PREMATCH_CORE_IDS = [1, 2, 3, 94];
    private const LIVE_CORE_IDS     = [41, 42, 43, 96];

    // ── Core (h2h / spreads / totals / team_totals) ──────────────────

    /** @return list<int> */
    public static function coreMarketIds(): array
    {
        return array_keys(self::CORE_MARKETS);
    }

    /** @return list<int> */
    public static function liveMarketIds(): array
    {
        return self::LIVE_CORE_IDS;
    }

    /** @return list<int> */
    public static function prematchMarketIds(): array
    {
        return self::PREMATCH_CORE_IDS;
    }

    public static function oddsApiKey(int $marketId): ?string
    {
        return self::CORE_MARKETS[$marketId] ?? null;
    }

    public static function isCore(int $marketId): bool
    {
        return isset(self::CORE_MARKETS[$marketId]);
    }

    public static function isLive(int $marketId): bool
    {
        return in_array($marketId, self::LIVE_CORE_IDS, true);
    }

    /**
     * Is this a Rundown core-market live in-play variant (41/42/43/96)?
     * These ship with `period_id=7` (Rundown's "in-play" period), and
     * carry live full-game odds — NOT 7-inning futures. Callers route
     * them into `odds.bookmakers` under the same key as the prematch
     * core, so the live quote supplements the prematch board.
     */
    public static function isLiveCoreVariant(int $marketId): bool
    {
        return in_array($marketId, self::LIVE_CORE_IDS, true);
    }

    // ── Player props ──────────────────────────────────────────────────

    public static function isProp(int $marketId): bool
    {
        return isset(self::PROP_MARKETS[$marketId]);
    }

    public static function propKey(int $marketId): ?string
    {
        return self::PROP_MARKETS[$marketId] ?? null;
    }

    /** @return list<int> */
    public static function propMarketIds(): array
    {
        return array_keys(self::PROP_MARKETS);
    }

    // ── Extended / period markets ────────────────────────────────────

    /**
     * Legacy fallback for core market_ids that ship with a non-zero
     * period_id but aren't otherwise classified via PERIOD_MARKETS.
     *
     * Most period markets come through `explicitPeriodKey()` now — this
     * function only catches edge cases where Rundown attaches a
     * period_id directly to a core market_id (1/2/3/41/42/43/94/96).
     * Caller is responsible for treating in-play variants (41/42/43/96
     * with period_id=7) as live core, NOT as a period extra; this
     * function returns `null` for that case so it doesn't accidentally
     * mislabel them.
     */
    public static function keyForCoreWithPeriod(int $marketId, int $periodId, ?string $sportKey = null): ?string
    {
        $core = self::CORE_MARKETS[$marketId] ?? null;
        if ($core === null || $periodId === 0) {
            return $core;
        }

        // Live in-play variants (41/42/43/96) with period_id=7 are full-
        // game live odds; they must be routed back into the main
        // bookmakers list by the caller, not here. Refuse to label them.
        if (self::isLiveCoreVariant($marketId)) {
            return null;
        }

        if ($core === 'team_totals') {
            return $core;
        }

        $sport    = strtolower((string) $sportKey);
        $isSoccer = str_starts_with($sport, 'soccer_');
        $isHockey = str_starts_with($sport, 'icehockey_');
        $isTennis = str_starts_with($sport, 'tennis_');
        $isMlb    = str_starts_with($sport, 'baseball_');

        // MLB period markets come exclusively via explicit market_ids
        // (769/780/791 for F5, 1109-1114 for F3/F7, etc.). A core market_id
        // with period_id>0 on baseball means an in-play full-game variant
        // we don't classify — drop rather than guess.
        if ($isMlb) {
            return null;
        }

        if ($isSoccer) {
            return match ($periodId) {
                1 => $core . '_h1',
                2 => $core . '_h2',
                default => null,
            };
        }
        if ($isHockey) {
            return match ($periodId) {
                1 => $core . '_p1',
                2 => $core . '_p2',
                3 => $core . '_p3',
                default => null,
            };
        }
        if ($isTennis) {
            return match ($periodId) {
                1 => $core . '_set_1',
                2 => $core . '_set_2',
                3 => $core . '_set_3',
                default => null,
            };
        }

        // Basketball / American football — Rundown does NOT ship period
        // markets on core IDs for these sports today (it uses explicit
        // market_ids like 957/981/1013 covered by PERIOD_MARKETS).
        // Keep the legacy mapping as a safety net but expect no hits.
        return match ($periodId) {
            1 => $core . '_q1',
            2 => $core . '_q2',
            3 => $core . '_q3',
            4 => $core . '_q4',
            5 => $core . '_h1',
            6 => $core . '_h2',
            default => null,
        };
    }

    /**
     * Resolve a Rundown explicit period market_id into the odds-api
     * style key (e.g. `h2h_q1`, `spreads_1st_5_innings`).
     *
     * Sport-aware: the same market_id can mean different things for
     * different sports (e.g. 981 = Q1 for NBA, P1 for NHL). Returns
     * null when the sport prefix doesn't recognise the period token —
     * better to drop than mislabel.
     */
    public static function explicitPeriodKey(int $marketId, ?string $sportKey = null): ?string
    {
        $entry = self::PERIOD_MARKETS[$marketId] ?? null;
        if ($entry === null) {
            return null;
        }
        [$baseKey, $periodToken] = $entry;

        $sport = strtolower((string) $sportKey);
        $prefix = ($sport === '') ? '' : explode('_', $sport, 2)[0];
        if ($prefix === '') {
            return null;
        }
        $suffix = self::PERIOD_TOKEN_TO_SUFFIX[$prefix][$periodToken] ?? null;
        if ($suffix === null) {
            return null;
        }
        return $baseKey . '_' . $suffix;
    }

    // ── CSV helpers for the API's market_ids query param ─────────────

    public static function csvForPrematch(): string
    {
        return implode(',', self::PREMATCH_CORE_IDS);
    }

    public static function csvForLive(): string
    {
        return implode(',', self::LIVE_CORE_IDS);
    }

    public static function csvForCore(): string
    {
        return implode(',', self::coreMarketIds());
    }

    /**
     * Core markets for the full/prematch sync.
     *
     * NOTE (Rundown 12-cap): as of 2026-05 Rundown enforces "market_ids
     * accepts at most 12 IDs per request". core(8)+props(24)=32 → every
     * request 400s and trips the rundown:http circuit breaker, killing ALL
     * odds. We cap to the core 8 (h2h/spreads/totals/team_totals + live
     * variants) so the main board works. Player props are temporarily
     * dropped here — restoring them requires splitting into ≤12-ID batches
     * and merging the per-event markets (see csvForProps + a batched caller).
     */
    public static function csvForFullCoverage(): string
    {
        return self::csvForCore();
    }

    /** Props only. */
    public static function csvForProps(): string
    {
        return implode(',', self::propMarketIds());
    }

    /** @return list<int> Every explicit period market_id (any sport). */
    public static function periodMarketIds(): array
    {
        return array_keys(self::PERIOD_MARKETS);
    }

    /**
     * Market IDs the live delta poll should request.
     *
     * NOTE (Rundown 12-cap): as of 2026-05 Rundown enforces "market_ids
     * accepts at most 12 IDs per request". core(8)+periods(67)=75 → every
     * delta poll 400s and trips the rundown:http circuit breaker, killing
     * ALL live odds. We cap to the core 8 so the live board works. Period
     * markets (Q1-Q4 / H1-H2 / innings) are temporarily dropped from the
     * 5 s delta poll — they cannot be batched into the high-frequency poll
     * without blowing RUNDOWN_MAX_CALLS_PER_MINUTE; restore them on the
     * slower full-refresh path via ≤12-ID batches if needed.
     */
    public static function csvForLivePolling(): string
    {
        return self::csvForCore();
    }
}
