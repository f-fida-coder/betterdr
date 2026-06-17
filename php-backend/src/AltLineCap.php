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
     * Keep only the `perSide` rungs nearest the main line, per side (grouped
     * by outcome name). `coreOutcomes` supplies the main reference point per
     * name; when a name has no core main, the group's median point is used.
     * UNLIMITED returns the outcomes unchanged; 0 returns none. Rungs without
     * a numeric point are dropped (they can't be ranked by distance-to-main).
     *
     * @param array<int,array<string,mixed>> $altOutcomes
     * @param array<int,array<string,mixed>> $coreOutcomes
     * @return array<int,array<string,mixed>>
     */
    public static function capOutcomes(array $altOutcomes, array $coreOutcomes, int $perSide): array
    {
        if ($perSide === self::UNLIMITED) {
            return $altOutcomes;
        }
        if ($perSide <= 0) {
            return [];
        }

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
            foreach (array_slice($idxs, 0, $perSide) as $i) {
                $keep[$i] = true;
            }
        }

        // Preserve original ladder order for the kept rungs.
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
    public static function isPointAllowed(string $name, float $point, array $altOutcomes, array $coreOutcomes, int $perSide): bool
    {
        if ($perSide === self::UNLIMITED) {
            return true;
        }
        if ($perSide <= 0) {
            return false;
        }
        $kept = self::capOutcomes($altOutcomes, $coreOutcomes, $perSide);
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
