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
     * @var array<int,string> Period / tennis-set market_id → odds-api key.
     * Tennis set markets are well-documented; broader period coverage
     * (basketball Q1-4, soccer halves, hockey periods, MLB innings) is
     * derived dynamically from period_id at mapping time — see
     * keyForCoreWithPeriod() — because Rundown encodes those with the
     * core market_id 1/2/3 plus a non-zero period_id, not separate IDs.
     */
    private const PERIOD_MARKETS = [
        1150 => 'h2h_set_1',
        1151 => 'spreads_set_1',
        1152 => 'totals_set_1',
        1153 => 'h2h_set_2',
        1154 => 'h2h_set_1', // live variant
        1155 => 'spreads_set_1',
        1156 => 'totals_set_1',
        1157 => 'h2h_set_2',
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
     * Compute the odds-api-style key for a CORE market_id at a non-zero
     * period_id. Rundown encodes basketball quarters, soccer halves,
     * hockey periods, etc. as (core market_id, period_id > 0) rather
     * than dedicated market IDs.
     *
     * The period_id semantics are sport-dependent; for the most common
     * cases (basketball/football quarters, soccer/basketball halves,
     * hockey periods, MLB innings) we apply a stable convention that
     * matches the existing OddsMarketCatalog keys:
     *   1 -> 1Q, 2 -> 2Q, 3 -> 3Q, 4 -> 4Q for basketball/football
     *   1 -> 1H, 2 -> 2H for soccer (halves)
     *
     * Callers that know the sport context can override; default returns
     * the most-likely key.
     */
    public static function keyForCoreWithPeriod(int $marketId, int $periodId, ?string $sportKey = null): ?string
    {
        $core = self::CORE_MARKETS[$marketId] ?? null;
        if ($core === null || $periodId === 0) {
            return $core;
        }

        // team_totals doesn't have well-defined period variants in the
        // existing catalog — skip period suffixes for them.
        if ($core === 'team_totals') {
            return $core;
        }

        $sport = strtolower((string) $sportKey);
        $isSoccer = str_starts_with($sport, 'soccer_');
        $isHockey = str_starts_with($sport, 'icehockey_');
        $isMlb    = str_starts_with($sport, 'baseball_');
        $isTennis = str_starts_with($sport, 'tennis_');

        // Soccer + hockey only have halves / 3 periods → map small ints.
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
        if ($isMlb) {
            return match ($periodId) {
                5 => $core . '_5_innings',
                7 => $core . '_7_innings',
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

        // Default (basketball, american football) — quarters + halves.
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
     * Lookup against the explicit period market catalog (tennis sets and
     * any future per-sport period market_ids Rundown ships).
     */
    public static function explicitPeriodKey(int $marketId): ?string
    {
        return self::PERIOD_MARKETS[$marketId] ?? null;
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

    /** Core + props (everything except explicit period markets). */
    public static function csvForFullCoverage(): string
    {
        return implode(',', array_unique(array_merge(
            self::coreMarketIds(),
            self::propMarketIds()
        )));
    }

    /** Props only. */
    public static function csvForProps(): string
    {
        return implode(',', self::propMarketIds());
    }
}
