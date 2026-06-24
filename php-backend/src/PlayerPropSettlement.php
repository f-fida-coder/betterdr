<?php

declare(strict_types=1);

/**
 * Player-prop settlement grader (PURE — no DB, no balance, no HTTP).
 *
 * Given a stored prop leg and a Rundown player-game-stats response, returns
 * 'won' | 'lost' | 'push' | 'pending'. The caller (BetSettlementService) does
 * the actual money settlement through its existing won/lost/push/payout path —
 * a graded prop leg is just another leg.
 *
 * MONEY-SAFETY: this never guesses. It returns 'pending' on ANY uncertainty —
 * unknown market, missing player id, player/stat not found in the box score,
 * incomplete (non-final) stats, or an over/under side it can't read. A wrong
 * auto-grade pays out a real ticket incorrectly; staying pending just defers to
 * the next sweep / a human. Matching is by STABLE player id (leg.selectionPid →
 * stats player.id), never by display name.
 *
 * The stat map is alias-based (matched case-insensitively against the feed's
 * stat name / abbreviation / display_name) so a slightly different stat label
 * still resolves; an unrecognized label resolves to nothing → 'pending' (safe),
 * never the wrong stat. Composite props (PRA, hits+runs+rbis) sum components and
 * require EVERY component present (any missing → pending).
 */
final class PlayerPropSettlement
{
    /**
     * prop marketType => ['cat' => batting|pitching|null, 'components' => [ [aliases...], ... ]].
     * Each component is a list of acceptable stat labels (lowercased). The
     * player's graded value is the SUM of component values. `cat` disambiguates
     * two-way players (a pitcher's "hits allowed" vs a batter's "hits").
     *
     * Yes/no props (double_double, triple_double) are deliberately ABSENT →
     * they stay pending (not an over/under shape).
     */
    private const STAT_MAP = [
        // ── NBA / basketball ────────────────────────────────────────────────
        'player_points'   => ['cat' => null, 'components' => [['points', 'pts']]],
        'player_rebounds' => ['cat' => null, 'components' => [['rebounds', 'reb', 'total rebounds', 'trb', 'tot reb']]],
        'player_assists'  => ['cat' => null, 'components' => [['assists', 'ast', 'goal assists', 'goalassists']]],
        'player_threes'   => ['cat' => null, 'components' => [['three point field goals made', 'three pointers made', 'three point field goals', 'threes', '3pm', 'fg3m', '3pt made']]],
        'player_blocks'   => ['cat' => null, 'components' => [['blocks', 'blk', 'blocked shots']]],
        'player_turnovers' => ['cat' => null, 'components' => [['turnovers', 'tov', 'to']]],
        'player_points_rebounds_assists' => ['cat' => null, 'components' => [['points', 'pts'], ['rebounds', 'reb', 'total rebounds', 'trb'], ['assists', 'ast']]],
        'player_points_rebounds'        => ['cat' => null, 'components' => [['points', 'pts'], ['rebounds', 'reb', 'total rebounds', 'trb']]],
        'player_points_assists'         => ['cat' => null, 'components' => [['points', 'pts'], ['assists', 'ast']]],
        'player_rebounds_assists'       => ['cat' => null, 'components' => [['rebounds', 'reb', 'total rebounds', 'trb'], ['assists', 'ast']]],

        // ── MLB batting ─────────────────────────────────────────────────────
        'batter_home_runs'    => ['cat' => 'batting', 'components' => [['home runs', 'home run', 'hr', 'homeruns']]],
        'batter_total_bases'  => ['cat' => 'batting', 'components' => [['total bases', 'tb']]],
        'batter_hits'         => ['cat' => 'batting', 'components' => [['hits', 'h']]],
        'batter_doubles'      => ['cat' => 'batting', 'components' => [['doubles', 'double', '2b']]],
        'batter_triples'      => ['cat' => 'batting', 'components' => [['triples', 'triple', '3b']]],
        'batter_singles'      => ['cat' => 'batting', 'components' => [['singles', 'single', '1b']]],
        'batter_runs_scored'  => ['cat' => 'batting', 'components' => [['runs', 'runs scored', 'r']]],
        'batter_rbis'         => ['cat' => 'batting', 'components' => [['rbi', 'rbis', 'runs batted in']]],
        'batter_stolen_bases' => ['cat' => 'batting', 'components' => [['stolen bases', 'sb']]],
        'batter_walks'        => ['cat' => 'batting', 'components' => [['walks', 'walk', 'base on balls', 'bb']]],
        'batter_hits_runs_rbis' => ['cat' => 'batting', 'components' => [['hits', 'h'], ['runs', 'runs scored', 'r'], ['rbi', 'rbis', 'runs batted in']]],

        // ── MLB pitching ────────────────────────────────────────────────────
        'pitcher_strikeouts'   => ['cat' => 'pitching', 'components' => [['strikeouts', 'strikeout', 'strike outs', 'k', 'so']]],
        'pitcher_hits_allowed' => ['cat' => 'pitching', 'components' => [['hits allowed', 'hits', 'ha']]],
        'pitcher_outs'         => ['cat' => 'pitching', 'components' => [['outs', 'outs recorded']]],
        'pitcher_earned_runs'  => ['cat' => 'pitching', 'components' => [['earned runs', 'er']]],
        'pitcher_walks'        => ['cat' => 'pitching', 'components' => [['walks', 'walk', 'base on balls', 'bb']]],

        // ── Soccer ──────────────────────────────────────────────────────────
        // Aliases match the Rundown box-score stat names/display-names:
        //   totalGoals "Total Goals" · goalAssists "Assists" · totalShots "Shots"
        //   shotsOnTarget "Shots On Goal" · foulsCommitted "Fouls Committed" · saves "Saves"
        // The "N or more" markets reach here as an Over (N-0.5) leg (see
        // RundownMarketMap::SOCCER_PROP_THRESHOLDS), so the over/under compare
        // grades stat ≥ N. First/last goal scorer are deliberately ABSENT (no
        // box-score ordering data) → they stay 'pending' for manual settlement.
        'player_goals'          => ['cat' => null, 'components' => [['total goals', 'totalgoals', 'goals', 'tg']]],
        'player_shots_on_target' => ['cat' => null, 'components' => [['shots on goal', 'shots on target', 'shotsontarget', 'sog']]],
        'player_shots'          => ['cat' => null, 'components' => [['shots', 'totalshots', 'total shots']]],
        'player_fouls'          => ['cat' => null, 'components' => [['fouls committed', 'foulscommitted', 'fouls', 'fc']]],
        'player_saves'          => ['cat' => null, 'components' => [['saves', 'sv']]],
        // To score OR assist: goals + assists ≥ 1 (each ≥ 0, so the sum is exact).
        'player_goals_assists'  => ['cat' => null, 'components' => [['total goals', 'totalgoals', 'goals'], ['assists', 'ast', 'goal assists', 'goalassists']]],
    ];

    /** Whether this market is a prop we know how to grade (over/under shape). */
    public static function isGradableProp(string $marketType): bool
    {
        return array_key_exists(strtolower(trim($marketType)), self::STAT_MAP);
    }

    /**
     * Grade one prop leg against a Rundown player-game-stats response.
     *
     * @param array<string,mixed> $leg     stored betselections row (selectionPid, marketType, point, selection)
     * @param array<string,mixed> $stats   decoded RundownClient::getPlayerGameStats() response
     * @return 'won'|'lost'|'push'|'pending'
     */
    public static function grade(array $leg, array $stats): string
    {
        return self::evaluate($leg, $stats)['status'];
    }

    /**
     * Same grading logic as grade(), but also returns a short machine-readable
     * reason WHY a leg stayed 'pending' (empty string once graded). Used by the
     * settlement sweep to log silently-stuck props without changing the grade
     * contract. The reason set is closed and stable for log-grepping:
     *   unknown_market | no_over_under_side | no_line | no_player_id |
     *   no_box_score | stats_incomplete | missing_stat_component
     *
     * @param array<string,mixed> $leg
     * @param array<string,mixed> $stats
     * @return array{status:string, reason:string}
     */
    public static function evaluate(array $leg, array $stats): array
    {
        $marketType = strtolower(trim((string) ($leg['marketType'] ?? '')));
        $map = self::STAT_MAP[$marketType] ?? null;
        if ($map === null) {
            return ['status' => 'pending', 'reason' => 'unknown_market']; // unknown / yes-no prop → never guess
        }

        // Over/Under side from the stored "Over"/"Under" selection.
        $side = self::sideOf($leg);
        if ($side === null) {
            return ['status' => 'pending', 'reason' => 'no_over_under_side'];
        }

        // Line.
        if (!isset($leg['point']) || !is_numeric($leg['point'])) {
            return ['status' => 'pending', 'reason' => 'no_line'];
        }
        $point = (float) $leg['point'];

        // Stable player id — REQUIRED. Legs placed before player-id capture have
        // none → they stay pending (manual settlement), never mis-graded. This is
        // the legacy-bet case: the player was never recorded on the leg.
        $playerId = trim((string) ($leg['selectionPid'] ?? ''));
        if ($playerId === '') {
            return ['status' => 'pending', 'reason' => 'no_player_id'];
        }

        $rows = self::flattenStatRows($stats);
        if ($rows === []) {
            return ['status' => 'pending', 'reason' => 'no_box_score']; // no box score yet → defer
        }

        // Only grade off FINAL/complete stats when the feed tells us.
        if (self::statsIncomplete($stats, $playerId, $rows)) {
            return ['status' => 'pending', 'reason' => 'stats_incomplete'];
        }

        // Sum components; ANY missing component → pending (don't guess a 0).
        $total = 0.0;
        foreach ($map['components'] as $aliases) {
            $v = self::statValue($rows, $playerId, $aliases, $map['cat']);
            if ($v === null) {
                return ['status' => 'pending', 'reason' => 'missing_stat_component'];
            }
            $total += $v;
        }

        return ['status' => self::compare($side, $total, $point), 'reason' => ''];
    }

    /** 'over' | 'under' | null from the leg's stored selection / full label. */
    private static function sideOf(array $leg): ?string
    {
        foreach (['selection', 'selectionFull'] as $k) {
            $s = strtolower((string) ($leg[$k] ?? ''));
            if (str_contains($s, 'under')) {
                return 'under';
            }
            if (str_contains($s, 'over')) {
                return 'over';
            }
        }
        return null;
    }

    /** Win/lose/push for an over/under value vs the line. */
    private static function compare(string $side, float $value, float $point): string
    {
        $eps = 1e-9;
        if (abs($value - $point) < $eps) {
            return 'push'; // exact landing (whole-number lines)
        }
        $over = $value > $point;
        if ($side === 'over') {
            return $over ? 'won' : 'lost';
        }
        return $over ? 'lost' : 'won';
    }

    /**
     * Flatten the stats response into rows: [{playerId, labels[], category, value}].
     * Defensive about shape: `items` may be a list of per-player objects each
     * with a `stats[]` array, or a single object, or the stat rows directly.
     *
     * @return list<array{playerId:string, labels:list<string>, category:string, value:float}>
     */
    private static function flattenStatRows(array $stats): array
    {
        $items = $stats['items'] ?? $stats;
        // Single associative object → wrap so the loop handles it uniformly.
        if (is_array($items) && (isset($items['player']) || isset($items['stats']))) {
            $items = [$items];
        }
        if (!is_array($items)) {
            return [];
        }

        $rows = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $itemPlayerId = self::idOf($item['player'] ?? null);
            $statList = $item['stats'] ?? null;
            // Item may itself BE a stat row (stats directly under items).
            if (!is_array($statList) && (isset($item['stat']) || isset($item['value']))) {
                $statList = [$item];
            }
            if (!is_array($statList)) {
                continue;
            }
            foreach ($statList as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $playerId = self::idOf($row['player'] ?? null);
                if ($playerId === '') {
                    $playerId = $itemPlayerId;
                }
                if ($playerId === '' || !array_key_exists('value', $row) || !is_numeric($row['value'])) {
                    continue;
                }
                $stat = is_array($row['stat'] ?? null) ? $row['stat'] : [];
                $labels = [];
                foreach (['name', 'abbreviation', 'display_name'] as $f) {
                    $lbl = strtolower(trim((string) ($stat[$f] ?? '')));
                    if ($lbl !== '') {
                        $labels[] = $lbl;
                    }
                }
                $rows[] = [
                    'playerId' => $playerId,
                    'labels'   => $labels,
                    'category' => strtolower(trim((string) ($stat['category'] ?? ''))),
                    'value'    => (float) $row['value'],
                ];
            }
        }
        return $rows;
    }

    private static function idOf(mixed $player): string
    {
        if (is_array($player) && isset($player['id'])) {
            return trim((string) $player['id']);
        }
        return '';
    }

    /**
     * The value of a stat for a player, or null if not present. Prefers a row
     * whose category matches the hint (batting vs pitching) so a two-way
     * player's wrong-side stat is never used; falls back to any aliased match.
     *
     * @param list<array{playerId:string, labels:list<string>, category:string, value:float}> $rows
     * @param list<string> $aliases lowercased acceptable labels
     */
    private static function statValue(array $rows, string $playerId, array $aliases, ?string $categoryHint): ?float
    {
        $fallback = null;
        foreach ($rows as $row) {
            if ($row['playerId'] !== $playerId) {
                continue;
            }
            if (!self::labelMatches($row['labels'], $aliases)) {
                continue;
            }
            if ($categoryHint !== null && $row['category'] !== '' && str_contains($row['category'], $categoryHint)) {
                return $row['value']; // exact category match wins
            }
            if ($fallback === null) {
                $fallback = $row['value'];
            }
        }
        return $fallback;
    }

    /** Exact (normalized) match of any row label against any alias. */
    private static function labelMatches(array $labels, array $aliases): bool
    {
        foreach ($labels as $label) {
            $norm = self::norm($label);
            foreach ($aliases as $alias) {
                if ($norm === self::norm($alias)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static function norm(string $s): string
    {
        return str_replace(['_', '-', ' ', '.'], '', strtolower(trim($s)));
    }

    /**
     * True when the feed signals the player's stats aren't final/complete yet
     * (so we defer instead of grading a partial line). Only blocks on an
     * EXPLICIT incomplete flag — absence of the flag is treated as complete
     * (the caller already gated on the match being finished).
     */
    private static function statsIncomplete(array $stats, string $playerId, array $rows): bool
    {
        $items = $stats['items'] ?? $stats;
        if (is_array($items) && (isset($items['player']) || isset($items['stats']))) {
            $items = [$items];
        }
        if (!is_array($items)) {
            return false;
        }
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            if (self::idOf($item['player'] ?? null) !== $playerId) {
                continue;
            }
            $meta = $item['meta'] ?? null;
            if (is_array($meta) && array_key_exists('complete', $meta) && $meta['complete'] === false) {
                return true;
            }
        }
        return false;
    }
}
