<?php

declare(strict_types=1);

/**
 * Server-authoritative pricing for Buy Points (spread/total only).
 *
 * The frontend can SHOW a ladder, but every accepted price must come from
 * here so a tampered client can't grant itself -100 on a -3 → -10 bought
 * line. validateSelection compares the client's submitted American odds
 * to expectedAmericanOdds() and rejects with ODDS_CHANGED on mismatch.
 *
 * Ladder (v1): flat -10 cents of juice per half-point, capped at 5 steps
 * (2.5 points). Matches the industry default for non-key-number buys.
 * Per-sport key-number premiums (NFL 3, 7; NCAAF 3, 7, 10) can layer on
 * top later via expectedAmericanOdds; signature stays stable.
 *
 * Range conventions (kept aligned with SportsbookBetSupport::applyTeaserAdjustment):
 *   - `boughtPoints` is always POSITIVE — it's the magnitude of the buy.
 *   - Direction is implicit: spreads always move +boughtPoints; totals
 *     move -boughtPoints for Over, +boughtPoints for Under. The caller
 *     applies the direction when adjusting the stored `point`.
 */
final class BuyPointsPricing
{
    private const HALF_POINT = 0.5;
    private const MAX_HALF_STEPS = 5;
    private const JUICE_PER_STEP_AMERICAN = 10;
    // US books don't quote inside (-110, +110) — that's the standard
    // "no-go zone" around even money. Landing there during a step snaps
    // to -110 (the canonical entry juice). Matches the frontend ladder
    // in ModeBetPanel.nextAmericanOddsStep so client + server stay
    // in lockstep on every rung.
    private const NO_GO_INTERIOR = 110;

    public static function isAllowedMarket(string $marketType): bool
    {
        $m = strtolower(trim($marketType));
        return $m === 'spreads' || $m === 'totals';
    }

    /**
     * Validate a boughtPoints value. Returns the number of half-point
     * steps (1..MAX_HALF_STEPS) on success, throws on invalid input.
     * boughtPoints==0 returns 0 (no buy; caller short-circuits).
     */
    public static function halfStepsFromBoughtPoints(float $boughtPoints): int
    {
        if ($boughtPoints < 0) {
            throw new ApiException('boughtPoints must be a non-negative half-point value.', 400, [
                'code' => 'INVALID_BUY_POINTS',
            ]);
        }
        if ($boughtPoints === 0.0) {
            return 0;
        }
        // Convert to half-point steps. 0.5 → 1, 1.0 → 2, 2.5 → 5, etc.
        // We accept floating drift up to 1e-6 (e.g. 0.4999999) and snap.
        $stepsFloat = $boughtPoints / self::HALF_POINT;
        $stepsRounded = (int) round($stepsFloat);
        if (abs($stepsFloat - $stepsRounded) > 1e-4) {
            throw new ApiException('boughtPoints must be in 0.5-point increments.', 400, [
                'code' => 'INVALID_BUY_POINTS',
            ]);
        }
        if ($stepsRounded < 1 || $stepsRounded > self::MAX_HALF_STEPS) {
            throw new ApiException(
                sprintf('boughtPoints must be between 0.5 and %.1f.', self::MAX_HALF_STEPS * self::HALF_POINT),
                400,
                ['code' => 'INVALID_BUY_POINTS']
            );
        }
        return $stepsRounded;
    }

    /**
     * Adjusted American odds for `halfSteps` half-points of buy. The result
     * is always *worse* than baseAmerican (juicier in the book's favor).
     *
     * @param string $sportKey unused in v1, kept for future key-number premiums
     * @param string $marketType 'spreads' or 'totals'
     * @param int    $baseAmerican rounded American int for the official line
     * @param int    $halfSteps 0..MAX_HALF_STEPS
     */
    public static function expectedAmericanOdds(string $sportKey, string $marketType, int $baseAmerican, int $halfSteps): int
    {
        if (!self::isAllowedMarket($marketType)) {
            throw new ApiException('Buy Points is only available on spreads and totals.', 400, [
                'code' => 'BUY_POINTS_MARKET_INVALID',
            ]);
        }
        if ($halfSteps === 0) {
            return $baseAmerican;
        }
        if ($baseAmerican === 0) {
            throw new ApiException('Invalid base odds for Buy Points calculation.', 400, [
                'code' => 'INVALID_ODDS',
            ]);
        }
        $current = $baseAmerican;
        for ($i = 0; $i < $halfSteps; $i++) {
            $current = self::stepWorse($current);
        }
        return $current;
    }

    /**
     * One -10c step on the American-odds ladder. Landing inside the
     * (-110, +110) no-go zone snaps to -110 (entry juice). Mirrors
     * ModeBetPanel.nextAmericanOddsStep on the client so frontend and
     * backend ladders never disagree about a price.
     */
    private static function stepWorse(int $american): int
    {
        $next = $american - self::JUICE_PER_STEP_AMERICAN;
        if ($next < self::NO_GO_INTERIOR && $next > -self::NO_GO_INTERIOR) {
            return -110;
        }
        return $next;
    }

    /**
     * Direction-aware signed delta to apply to the stored `point`. Mirrors
     * the spread/total convention used by applyTeaserAdjustment so the two
     * features stay aligned: spreads move +boughtPoints; totals depend on
     * the selected side.
     */
    public static function signedPointDelta(string $marketType, string $selection, float $boughtPoints): float
    {
        $m = strtolower(trim($marketType));
        if ($m === 'spreads') {
            return $boughtPoints;
        }
        if ($m === 'totals') {
            $isOver = str_contains(strtolower($selection), 'over');
            return $isOver ? -$boughtPoints : $boughtPoints;
        }
        throw new ApiException('Buy Points is only available on spreads and totals.', 400, [
            'code' => 'BUY_POINTS_MARKET_INVALID',
        ]);
    }

    public static function maxBoughtPoints(): float
    {
        return self::MAX_HALF_STEPS * self::HALF_POINT;
    }

    /**
     * Build the full buyable-points ladder for one spread/total selection,
     * composing the existing primitives (expectedAmericanOdds +
     * signedPointDelta) — no new pricing math. Returns up to
     * MAX_HALF_STEPS options, one per half-point step, each:
     *   ['points' => float, 'line' => float, 'american' => int]
     * The base (0-point) line is intentionally NOT included — the caller
     * already has it and prepends the original row.
     *
     * Returns [] for ineligible markets or unusable base odds so the caller
     * can simply omit `alternateLines` (the frontend then falls back to its
     * local ladder, and placement stays server-authoritative regardless).
     *
     * @return list<array{points: float, line: float, american: int}>
     */
    public static function buildLadder(string $sportKey, string $marketType, string $selection, int $baseAmerican, float $basePoint): array
    {
        if (!self::isAllowedMarket($marketType) || $baseAmerican === 0) {
            return [];
        }
        $ladder = [];
        for ($steps = 1; $steps <= self::MAX_HALF_STEPS; $steps++) {
            $points = $steps * self::HALF_POINT;
            $american = self::expectedAmericanOdds($sportKey, $marketType, $baseAmerican, $steps);
            $delta = self::signedPointDelta($marketType, $selection, $points);
            $ladder[] = [
                'points' => $points,
                'line' => round($basePoint + $delta, 2),
                'american' => $american,
            ];
        }
        return $ladder;
    }
}
