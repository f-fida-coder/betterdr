<?php

declare(strict_types=1);

/**
 * House risk control for alternate spread / total ladders.
 *
 * The Rundown feed ships deep alt ladders (~20 rungs per side — e.g. a run
 * line out to +/-8.5 priced at -7000). Surfacing all of them widens the
 * attack surface for stale / mispriced deep rungs and lets near-lock favorites
 * be stacked into parlays. This trims each ladder to the N rungs nearest the
 * main line, per side, and is the SINGLE source of truth for BOTH:
 *   - the display filter (MatchesController::getMatchProps), and
 *   - the placement guard (BetsController::validateSelection),
 * so a capped rung can never be bet via a direct API call either.
 *
 * Pure + deterministic (no DB / no env access in the math): callers resolve
 * `perSide` from platformsettings / env via perSideLimit() and pass it in,
 * which keeps capOutcomes()/isPointAllowed() unit-testable.
 *
 * Buy Points is unaffected: it is built from the match doc's full
 * `extendedMarkets` in a separate path (attachBuyPointsLadders), never from
 * the capped sheet response — so its +/-2.5 ladder stays intact.
 */
final class AltLineCap
{
    /** Default rungs per side when no setting/env is present. */
    public const DEFAULT_PER_SIDE = 1;

    /**
     * Default rungs per side for GAME TOTALS only. Totals have a meaningful
     * range of alt lines (the competitor shows several O/U rungs), so they get
     * a wider default than spreads — whose deep run-line alts are noise. Spreads
     * keep DEFAULT_PER_SIDE.
     */
    public const DEFAULT_TOTALS_PER_SIDE = 4;

    /** Sentinel: no cap (show/accept every rung). */
    public const UNLIMITED = -1;

    private const EPS = 1e-6;

    /**
     * Resolve the per-side limit. platformsettings wins (live, no restart),
     * then env, then the default. A negative value means UNLIMITED.
     *
     * @param array<string,mixed>|null $platformSettings the `platformsettings` doc
     */
    public static function perSideLimit(?array $platformSettings): int
    {
        if (
            is_array($platformSettings)
            && isset($platformSettings['alternateLinesPerSide'])
            && is_numeric($platformSettings['alternateLinesPerSide'])
        ) {
            return self::clamp((int) $platformSettings['alternateLinesPerSide']);
        }
        $env = Env::get('SPORTSBOOK_ALT_LINES_PER_SIDE', '');
        if (is_string($env) && $env !== '' && is_numeric($env)) {
            return self::clamp((int) $env);
        }
        return self::DEFAULT_PER_SIDE;
    }

    /**
     * Per-side limit for GAME TOTALS ladders (alternate_totals and its period
     * variants). platformsettings.alternateTotalsPerSide → env
     * SPORTSBOOK_ALT_TOTALS_PER_SIDE → DEFAULT_TOTALS_PER_SIDE.
     *
     * @param array<string,mixed>|null $platformSettings
     */
    public static function totalsPerSideLimit(?array $platformSettings): int
    {
        if (
            is_array($platformSettings)
            && isset($platformSettings['alternateTotalsPerSide'])
            && is_numeric($platformSettings['alternateTotalsPerSide'])
        ) {
            return self::clamp((int) $platformSettings['alternateTotalsPerSide']);
        }
        $env = Env::get('SPORTSBOOK_ALT_TOTALS_PER_SIDE', '');
        if (is_string($env) && $env !== '' && is_numeric($env)) {
            return self::clamp((int) $env);
        }
        return self::DEFAULT_TOTALS_PER_SIDE;
    }

    /** True for GAME-total ladders (totals, totals_h1, …) — NOT team_totals. */
    public static function isTotalsCoreKey(string $coreKey): bool
    {
        return str_starts_with(strtolower(trim($coreKey)), 'totals');
    }

    /**
     * Single-offset GAME-totals alt selection config. When enabled, the totals
     * alt column shows ONE total line at ~main+offset and surfaces BOTH sides
     * (Over AND Under) of that single line — matching the competitor's one alt
     * total line (e.g. O 11½ +375 / U 11½ −550) — instead of the nearest-N
     * ladder. Resolution: platformsettings (live, no restart) → env → defaults.
     * DEFAULT OFF so production behavior is unchanged until the operator opts in.
     *
     *   - enabled:   altTotalSingleEnabled / SPORTSBOOK_ALT_TOTAL_SINGLE_ENABLED
     *   - offset:    altTotalOffset       / SPORTSBOOK_ALT_TOTAL_OFFSET     (3.0)
     *   - bandLo:    altTotalBandLow      / SPORTSBOOK_ALT_TOTAL_BAND_LOW   (3.0)
     *   - bandHi:    altTotalBandHigh     / SPORTSBOOK_ALT_TOTAL_BAND_HIGH  (3.5)
     *   - direction: altTotalDirection    / SPORTSBOOK_ALT_TOTAL_DIRECTION  (both)
     *     both = O+U at the line; over = Over only; under = Under only.
     *
     * This only PICKS which published feed line to surface; prices stay whatever
     * the feed stored on each side of that line — nothing is synthesized.
     *
     * @param array<string,mixed>|null $platformSettings
     * @return array{enabled:bool,offset:float,bandLo:float,bandHi:float,direction:string}
     */
    public static function totalsAltConfig(?array $platformSettings): array
    {
        $enabled = self::resolveBool(
            $platformSettings,
            'altTotalSingleEnabled',
            'SPORTSBOOK_ALT_TOTAL_SINGLE_ENABLED',
            false
        );
        $offset = self::resolveFloat(
            $platformSettings,
            'altTotalOffset',
            'SPORTSBOOK_ALT_TOTAL_OFFSET',
            3.0
        );
        $bandLo = self::resolveFloat(
            $platformSettings,
            'altTotalBandLow',
            'SPORTSBOOK_ALT_TOTAL_BAND_LOW',
            3.0
        );
        $bandHi = self::resolveFloat(
            $platformSettings,
            'altTotalBandHigh',
            'SPORTSBOOK_ALT_TOTAL_BAND_HIGH',
            3.5
        );
        $direction = strtolower(trim(self::resolveString(
            $platformSettings,
            'altTotalDirection',
            'SPORTSBOOK_ALT_TOTAL_DIRECTION',
            'both'
        )));
        if ($direction !== 'over' && $direction !== 'under') {
            $direction = 'both';
        }
        if ($bandHi < $bandLo) {
            [$bandLo, $bandHi] = [$bandHi, $bandLo];
        }

        return [
            'enabled' => $enabled,
            'offset' => $offset,
            'bandLo' => $bandLo,
            'bandHi' => $bandHi,
            'direction' => $direction,
        ];
    }

    /** Is single-offset totals selection enabled in this config bundle? */
    private static function totalsSingleEnabled(?array $totalsAltConfig): bool
    {
        return is_array($totalsAltConfig) && ($totalsAltConfig['enabled'] ?? false) === true;
    }

    /**
     * @param array<string,mixed>|null $platformSettings
     */
    private static function resolveBool(?array $platformSettings, string $settingKey, string $envKey, bool $default): bool
    {
        if (is_array($platformSettings) && array_key_exists($settingKey, $platformSettings)) {
            return self::truthy($platformSettings[$settingKey]);
        }
        $env = Env::get($envKey, '');
        if (is_string($env) && $env !== '') {
            return self::truthy($env);
        }
        return $default;
    }

    private static function truthy(mixed $v): bool
    {
        if (is_bool($v)) {
            return $v;
        }
        if (is_numeric($v)) {
            return (float) $v != 0.0;
        }
        $s = strtolower(trim((string) $v));
        return $s === 'true' || $s === '1' || $s === 'yes' || $s === 'on';
    }

    /**
     * @param array<string,mixed>|null $platformSettings
     */
    private static function resolveFloat(?array $platformSettings, string $settingKey, string $envKey, float $default): float
    {
        if (
            is_array($platformSettings)
            && isset($platformSettings[$settingKey])
            && is_numeric($platformSettings[$settingKey])
        ) {
            return (float) $platformSettings[$settingKey];
        }
        $env = Env::get($envKey, '');
        if (is_string($env) && $env !== '' && is_numeric($env)) {
            return (float) $env;
        }
        return $default;
    }

    /**
     * @param array<string,mixed>|null $platformSettings
     */
    private static function resolveString(?array $platformSettings, string $settingKey, string $envKey, string $default): string
    {
        if (
            is_array($platformSettings)
            && isset($platformSettings[$settingKey])
            && is_string($platformSettings[$settingKey])
            && trim($platformSettings[$settingKey]) !== ''
        ) {
            return $platformSettings[$settingKey];
        }
        $env = Env::get($envKey, '');
        if (is_string($env) && $env !== '') {
            return $env;
        }
        return $default;
    }

    /**
     * The per-side cap for a specific alt market key: the wider totals cap for
     * game-total ladders, else the spread/default cap. Used by BOTH display
     * (capAlternateLadders) and placement (isPointAllowed guard) so a board-
     * shown rung is always placeable.
     *
     * @param array<string,mixed>|null $platformSettings
     */
    public static function perSideLimitForKey(?array $platformSettings, string $altKey): int
    {
        return self::isTotalsCoreKey(self::coreKeyFor($altKey))
            ? self::totalsPerSideLimit($platformSettings)
            : self::perSideLimit($platformSettings);
    }

    private static function clamp(int $n): int
    {
        return $n < 0 ? self::UNLIMITED : $n;
    }

    /** Is this an alternate-ladder market key (e.g. alternate_spreads)? */
    public static function isAltKey(string $key): bool
    {
        return str_starts_with(strtolower(trim($key)), 'alternate_');
    }

    /** The core market key an alt ladder hangs off (alternate_spreads → spreads). */
    public static function coreKeyFor(string $altKey): string
    {
        $k = strtolower(trim($altKey));
        return self::isAltKey($k) ? substr($k, strlen('alternate_')) : $k;
    }

    /**
     * Select which alternate rungs to surface. Selection is deterministic and
     * feed-anchored (it only PICKS points; prices are whatever the feed stored
     * at those points — nothing is synthesized):
     *
     *   - Full-game run line / puck line (baseball, hockey): exclude the main
     *     point, then surface exactly the REVERSE rung (sign-flipped main) and
     *     the BUY-UP rung (one run further from zero), each looked up at its
     *     exact target point. Missing target → that rung is omitted. Mirrors
     *     competitor baseball style.
     *   - Variable-line spreads (NFL/NBA/…) and ALL totals: exclude the main
     *     point, then keep the nearest `perSide` genuine feed rungs on EACH
     *     side of the main (one above + one below at perSide=1).
     *
     * `coreOutcomes` supplies the main reference point per name; when a name
     * has no core main, the group's median point is used. UNLIMITED returns the
     * outcomes unchanged; 0 returns none. Rungs without a numeric point are
     * dropped (they can't be ranked by distance-to-main).
     *
     * @param array<int,array<string,mixed>> $altOutcomes
     * @param array<int,array<string,mixed>> $coreOutcomes
     * @return array<int,array<string,mixed>>
     */
    public static function capOutcomes(array $altOutcomes, array $coreOutcomes, int $perSide, string $sportKey = '', string $marketType = '', ?array $totalsAltConfig = null): array
    {
        // Single-offset totals selection (config-gated, totals only). Anchored on
        // the board's existing main total; picks ONE published feed rung per
        // direction at ~main±offset. Independent of perSide. Spreads never enter.
        if (self::isTotalsCoreKey($marketType) && self::totalsSingleEnabled($totalsAltConfig)) {
            return self::selectSingleOffsetTotal(
                $altOutcomes,
                $coreOutcomes,
                (float) $totalsAltConfig['offset'],
                (float) $totalsAltConfig['bandLo'],
                (float) $totalsAltConfig['bandHi'],
                (string) $totalsAltConfig['direction']
            );
        }

        if ($perSide === self::UNLIMITED) {
            return $altOutcomes;
        }
        if ($perSide <= 0) {
            return [];
        }

        // Full-game run line / puck line: deterministic reverse + buy-up rungs
        // derived from the main line, NOT "nearest feed point" (which is often
        // the main line re-priced). Period spreads and all totals fall through.
        if (strtolower(trim($marketType)) === 'spreads' && self::isRunLineSport($sportKey)) {
            return self::selectRunLineSpread($altOutcomes, $coreOutcomes);
        }

        return self::selectNearestPerDirection($altOutcomes, $coreOutcomes, $perSide);
    }

    /**
     * Run-line / puck-line sports have a fixed 1.5 main handicap, so genuine
     * alternates are the sign-flip reverse and the +1-run buy-up rather than
     * the "nearest feed point" (which is usually the main line re-priced).
     */
    private static function isRunLineSport(string $sportKey): bool
    {
        $k = strtolower(trim($sportKey));
        return str_starts_with($k, 'baseball_') || str_starts_with($k, 'icehockey_');
    }

    /**
     * Per side: REVERSE (flip the main sign, e.g. -1.5 → +1.5) and BUY-UP (one
     * run further from zero, e.g. -1.5 → -2.5). Each target point is looked up
     * in the stored ladder and kept at its feed price; a target the feed never
     * published is omitted. The main point is never a target, so it can't leak.
     *
     * @param array<int,array<string,mixed>> $altOutcomes
     * @param array<int,array<string,mixed>> $coreOutcomes
     * @return array<int,array<string,mixed>>
     */
    private static function selectRunLineSpread(array $altOutcomes, array $coreOutcomes): array
    {
        $mainByName = self::mainPointByName($coreOutcomes);
        if ($mainByName === []) {
            return [];
        }

        $keep = [];
        foreach ($altOutcomes as $i => $o) {
            if (!is_array($o) || !isset($o['point']) || !is_numeric($o['point'])) {
                continue;
            }
            $name = strtolower(trim((string) ($o['name'] ?? '')));
            if ($name === '' || !isset($mainByName[$name])) {
                continue;
            }
            $main = $mainByName[$name];
            $reverse = -$main;
            $buyUp = $main + ($main < 0 ? -1.0 : 1.0);
            $point = (float) $o['point'];
            if (abs($point - $reverse) <= self::EPS || abs($point - $buyUp) <= self::EPS) {
                $keep[$i] = true;
            }
        }

        return self::keepInOrder($altOutcomes, $keep);
    }

    /**
     * Exclude the main-point rung, then keep the nearest `perSide` genuine feed
     * rungs ABOVE the main and the nearest `perSide` BELOW, per outcome name.
     * When a name has no core main, the group median is the reference.
     *
     * @param array<int,array<string,mixed>> $altOutcomes
     * @param array<int,array<string,mixed>> $coreOutcomes
     * @return array<int,array<string,mixed>>
     */
    private static function selectNearestPerDirection(array $altOutcomes, array $coreOutcomes, int $perSide): array
    {
        $mainByName = self::mainPointByName($coreOutcomes);

        // Group original indices by lowercased outcome name.
        $groups = [];
        foreach ($altOutcomes as $i => $o) {
            if (!is_array($o) || !isset($o['point']) || !is_numeric($o['point'])) {
                continue;
            }
            $name = strtolower(trim((string) ($o['name'] ?? '')));
            if ($name === '') {
                continue;
            }
            $groups[$name][] = $i;
        }

        $keep = [];
        foreach ($groups as $name => $idxs) {
            $ref = $mainByName[$name] ?? self::median(array_map(
                static fn ($i) => (float) $altOutcomes[$i]['point'],
                $idxs
            ));

            $above = [];
            $below = [];
            foreach ($idxs as $i) {
                $p = (float) $altOutcomes[$i]['point'];
                if (abs($p - $ref) <= self::EPS) {
                    continue; // drop the main-point rung (no re-priced echo)
                }
                if ($p > $ref) {
                    $above[] = $i;
                } else {
                    $below[] = $i;
                }
            }
            self::sortByDistance($above, $altOutcomes, $ref);
            self::sortByDistance($below, $altOutcomes, $ref);
            foreach (array_slice($above, 0, $perSide) as $i) {
                $keep[$i] = true;
            }
            foreach (array_slice($below, 0, $perSide) as $i) {
                $keep[$i] = true;
            }
        }

        return self::keepInOrder($altOutcomes, $keep);
    }

    /**
     * Single-offset totals selection. Anchored on the existing main total (from
     * coreOutcomes — NOT re-derived from pricing): pick ONE published Over rung
     * at ~main+offset (ABOVE the main) and ONE published Under rung at ~main-offset
     * (BELOW the main), and surface each side at its real feed price. So a main of
     * 8 with offset 1.5 yields Over 9.5 / Under 6.5 — symmetric, the way a
     * one-alt-line book presents it. `direction` filters which side(s) to show
     * (both | over | under). If the main can't be resolved, return [] (fail safe:
     * no rungs rather than a guessed anchor). Picks the rungs only — prices are
     * the feed's stored prices on each side.
     *
     * @param array<int,array<string,mixed>> $altOutcomes
     * @param array<int,array<string,mixed>> $coreOutcomes
     * @return array<int,array<string,mixed>>
     */
    private static function selectSingleOffsetTotal(array $altOutcomes, array $coreOutcomes, float $offset, float $bandLo, float $bandHi, string $direction): array
    {
        $mainByName = self::mainPointByName($coreOutcomes);
        $main = $mainByName['over'] ?? $mainByName['under'] ?? null;
        if ($main === null) {
            return [];
        }

        $wantOver = $direction !== 'under';
        $wantUnder = $direction !== 'over';

        // Symmetric selection: the Over rung sits ~offset ABOVE the main, the
        // Under rung ~offset BELOW it (e.g. main 8, offset 1.5 -> Over 9.5 /
        // Under 6.5). Each side is the feed's own published rung at that point,
        // so prices stay the stored feed values; we only pick indices.
        $overLine  = $wantOver  ? self::pickOffsetLine($altOutcomes, $main, $offset, $bandLo, $bandHi, true)  : null;
        $underLine = $wantUnder ? self::pickOffsetLine($altOutcomes, $main, $offset, $bandLo, $bandHi, false) : null;
        if ($overLine === null && $underLine === null) {
            return [];
        }

        $keep = [];
        foreach ($altOutcomes as $i => $o) {
            if (!is_array($o) || !isset($o['point']) || !is_numeric($o['point'])) {
                continue;
            }
            $p = (float) $o['point'];
            $name = strtolower(trim((string) ($o['name'] ?? '')));
            if ($name === 'over' && $overLine !== null && abs($p - $overLine) <= self::EPS) {
                $keep[$i] = true;
            } elseif ($name === 'under' && $underLine !== null && abs($p - $underLine) <= self::EPS) {
                $keep[$i] = true;
            }
        }

        return self::keepInOrder($altOutcomes, $keep);
    }

    /**
     * Pick the single published total line ~offset away from the main on the
     * requested side: ABOVE the main for the Over ($over = true), BELOW it for
     * the Under ($over = false). Preference: the in-band line closest to the
     * offset target (main ± offset); else the nearest published line at least
     * `offset` out on that side. Returns the line's point value, or null when
     * the feed published no line that far out on the requested side.
     *
     * @param array<int,array<string,mixed>> $altOutcomes
     */
    private static function pickOffsetLine(array $altOutcomes, float $main, float $offset, float $bandLo, float $bandHi, bool $over): ?float
    {
        $sign = $over ? 1.0 : -1.0;
        $lo = min(abs($bandLo), abs($bandHi));
        $hi = max(abs($bandLo), abs($bandHi));
        $target = $main + $sign * $offset;
        // Band window mirrored onto the requested side of the main.
        $bandNear = $main + $sign * $lo;
        $bandFar  = $main + $sign * $hi;
        $bandMin = min($bandNear, $bandFar);
        $bandMax = max($bandNear, $bandFar);
        $floor = $main + $sign * $offset; // fallback must be at least `offset` out

        $inBand = null;
        $inBandDist = INF;
        $fallback = null;
        $fallbackDist = INF;

        foreach ($altOutcomes as $o) {
            if (!is_array($o) || !isset($o['point']) || !is_numeric($o['point'])) {
                continue;
            }
            $p = (float) $o['point'];
            // The rung must sit on the requested side of the main.
            if ($over ? ($p <= $main + self::EPS) : ($p >= $main - self::EPS)) {
                continue;
            }

            // In-band candidate: closest to the offset target.
            if ($p >= $bandMin - self::EPS && $p <= $bandMax + self::EPS) {
                $d = abs($p - $target);
                if ($d < $inBandDist - self::EPS) {
                    $inBandDist = $d;
                    $inBand = $p;
                }
            }

            // Fallback candidate: at least `offset` out on this side, nearest such.
            $farEnough = $over ? ($p >= $floor - self::EPS) : ($p <= $floor + self::EPS);
            if ($farEnough) {
                $d = abs($p - $target);
                if ($d < $fallbackDist - self::EPS) {
                    $fallbackDist = $d;
                    $fallback = $p;
                }
            }
        }

        return $inBand ?? $fallback;
    }

    /**
     * Sort indices in place by ascending distance from $ref, tie-broken toward
     * pick'em, then by signed point (deterministic).
     *
     * @param array<int,int> $idxs
     * @param array<int,array<string,mixed>> $altOutcomes
     */
    private static function sortByDistance(array &$idxs, array $altOutcomes, float $ref): void
    {
        usort($idxs, static function ($a, $b) use ($altOutcomes, $ref) {
            $pa = (float) $altOutcomes[$a]['point'];
            $pb = (float) $altOutcomes[$b]['point'];
            $da = abs($pa - $ref);
            $db = abs($pb - $ref);
            if (abs($da - $db) > 1e-9) {
                return $da <=> $db;            // nearest to the main line
            }
            if (abs(abs($pa) - abs($pb)) > 1e-9) {
                return abs($pa) <=> abs($pb);  // tie → toward pick'em
            }
            return $pa <=> $pb;                // final deterministic tie-break
        });
    }

    /**
     * Return the kept outcomes in their original ladder order.
     *
     * @param array<int,array<string,mixed>> $altOutcomes
     * @param array<int,bool> $keep
     * @return array<int,array<string,mixed>>
     */
    private static function keepInOrder(array $altOutcomes, array $keep): array
    {
        $out = [];
        foreach ($altOutcomes as $i => $o) {
            if (isset($keep[$i])) {
                $out[] = $o;
            }
        }
        return $out;
    }

    /**
     * Is a specific (name, point) rung within the cap? Used at placement to
     * reject a bet on a rung the display would have trimmed.
     *
     * @param array<int,array<string,mixed>> $altOutcomes  full stored ladder
     * @param array<int,array<string,mixed>> $coreOutcomes
     */
    public static function isPointAllowed(string $name, float $point, array $altOutcomes, array $coreOutcomes, int $perSide, string $sportKey = '', string $marketType = '', ?array $totalsAltConfig = null): bool
    {
        // When single-offset totals selection is active for this market, the
        // perSide sentinels don't apply — membership is decided purely by the
        // single-offset rule (board↔placement parity via the same capOutcomes).
        $totalsSingle = self::isTotalsCoreKey($marketType) && self::totalsSingleEnabled($totalsAltConfig);
        if (!$totalsSingle) {
            if ($perSide === self::UNLIMITED) {
                return true;
            }
            if ($perSide <= 0) {
                return false;
            }
        }
        $kept = self::capOutcomes($altOutcomes, $coreOutcomes, $perSide, $sportKey, $marketType, $totalsAltConfig);
        $nl = strtolower(trim($name));
        foreach ($kept as $o) {
            if (strtolower(trim((string) ($o['name'] ?? ''))) !== $nl) {
                continue;
            }
            if (isset($o['point']) && is_numeric($o['point']) && abs((float) $o['point'] - $point) <= self::EPS) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param array<int,array<string,mixed>> $coreOutcomes
     * @return array<string,float> lowercased name → main point (first seen)
     */
    private static function mainPointByName(array $coreOutcomes): array
    {
        $out = [];
        foreach ($coreOutcomes as $o) {
            if (!is_array($o) || !isset($o['point']) || !is_numeric($o['point'])) {
                continue;
            }
            $name = strtolower(trim((string) ($o['name'] ?? '')));
            if ($name === '' || isset($out[$name])) {
                continue;
            }
            $out[$name] = (float) $o['point'];
        }
        return $out;
    }

    /** @param array<int,float> $nums */
    private static function median(array $nums): float
    {
        if ($nums === []) {
            return 0.0;
        }
        sort($nums);
        $n = count($nums);
        $mid = intdiv($n, 2);
        if ($n % 2 === 1) {
            return (float) $nums[$mid];
        }
        return ((float) $nums[$mid - 1] + (float) $nums[$mid]) / 2.0;
    }
}
