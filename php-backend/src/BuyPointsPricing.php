<?php

declare(strict_types=1);

/**
 * Server-authoritative pricing for Buy Points (spread/total only).
 *
 * SINGLE PRICE SOURCE: every bought-point rung is priced from the live feed's
 * own alternate-line ladder (alternate_spreads / alternate_totals) — the exact
 * same prices surfaced by "Alt Lines & Totals". There is NO synthetic ladder:
 * if the feed never published a price for a rung, that rung does not exist
 * (display omits it; placement rejects it with BUY_POINTS_NO_FEED_PRICE).
 *
 * Both display (MatchesController::attachBuyPointsLadders) and placement
 * (BetsController::validateSelection) call ladderFromFeed()/
 * priceBoughtPointFromFeed() so the price a player SEES is provably the price
 * they GET and the price that SETTLES.
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

    public static function isAllowedMarket(string $marketType): bool
    {
        $m = strtolower(trim($marketType));
        return $m === 'spreads' || $m === 'totals';
    }

    // Half-point window matching the no-tie "effectively win" zone: a spread
    // whose magnitude is below this is equivalent (or near-equivalent) to the
    // moneyline on a sport that can't tie. We omit these rungs (D2) — a
    // bettor who only wants "just win" takes the moneyline.
    private const NO_TIE_WIN_ZONE = 1.0;

    // Sports that can't end level within the bet's scope, so a near-zero
    // spread/run-line/puck-line/point-spread collapses to the moneyline ("just
    // win the game"): the win zone is priced at the ML and the ±1 push rung is
    // feed-or-interpolated. For tie-possible sports the win zone stays omitted.
    //
    // Prefix-matched no-tie families (extra innings / OT / shootout always
    // produce a winner):
    //   baseball_*   — MLB et al (no ties)
    //   icehockey_*  — NHL et al (OT + shootout)
    //   basketball_* — NBA, WNBA, NCAAB men's & women's, etc (OT)
    // College football (americanfootball_ncaaf*) is no-tie too (OT rules
    // guarantee a winner) and is matched explicitly in isNoTieSport().
    //
    // DELIBERATELY EXCLUDED — a real draw/tie makes -0.5/0/+0.5 distinct
    // lose/push/win outcomes AND pushes the moneyline, so the zone cannot
    // collapse to one ML price:
    //   - soccer_* / any 3-way sport — a draw is its own outcome (also D3).
    //   - americanfootball_nfl — a regulation+OT tie is rare but possible.
    //   - everything else defaults to tie-possible (fail safe).
    private const NO_TIE_SPORT_PREFIXES = ['baseball_', 'icehockey_', 'basketball_'];

    /**
     * Three-way moneyline sports (a draw is a distinct outcome). The 2-way
     * "never below the ML" floor is undefined here, so buy-points is not
     * offered at all (D3); the alt-line ladder still surfaces handicap
     * variations. Currently soccer.
     */
    private static function isThreeWaySport(string $sportKey): bool
    {
        return str_starts_with(strtolower(trim($sportKey)), 'soccer_')
            || strtolower(trim($sportKey)) === 'soccer';
    }

    private static function isNoTieSport(string $sportKey): bool
    {
        $k = strtolower(trim($sportKey));
        // College football: OT always produces a winner. Matched explicitly so
        // pro football (americanfootball_nfl) — which can still tie — does NOT
        // qualify and keeps its win zone omitted.
        if (str_starts_with($k, 'americanfootball_ncaaf')) {
            return true;
        }
        foreach (self::NO_TIE_SPORT_PREFIXES as $prefix) {
            if (str_starts_with($k, $prefix)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Whether buy-points is currently enabled for the given sport. Server-
     * authoritative gate consulted at placement; display also suppresses the
     * ladder for disabled sports so display == placed == settled.
     *
     * Driven by the BUY_POINTS_ENABLED_SPORTS env allowlist (csv of lowercase
     * sportKeys). DEFAULT EMPTY = buy-points globally locked (interim safety
     * lock 2026-06-16): the data path is feed-anchored, but each sport must be
     * verified before its money flow is re-opened. Re-enable sport-by-sport by
     * adding its key to the env — no redeploy needed. Three-way sports (soccer)
     * are never eligible regardless of the env (D3).
     */
    public static function isSportEnabled(string $sportKey): bool
    {
        $k = strtolower(trim($sportKey));
        if ($k === '' || self::isThreeWaySport($k)) {
            return false;
        }
        $csv = (string) Env::get('BUY_POINTS_ENABLED_SPORTS', '');
        if ($csv === '') {
            return false;
        }
        foreach (explode(',', $csv) as $entry) {
            if (strtolower(trim($entry)) === $k) {
                return true;
            }
        }
        return false;
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
     * Build the buyable-points ladder for one spread/total selection ENTIRELY
     * from the live feed's alternate-line prices. This is the single price
     * source for both display and placement.
     *
     * Rules:
     *  - Walk half-point steps 1..MAX_HALF_STEPS in the buy direction
     *    (signedPointDelta). Target line = basePoint + delta.
     *  - D1: a rung exists ONLY if the feed published an alt price at that
     *    exact (side, point). No feed price → OMIT (no synthesis ever). A gap
     *    at one rung does not truncate higher rungs — each is independent.
     *  - D2: on no-tie sports (baseball run line / hockey puck line), OMIT any
     *    spread rung inside the no-tie win zone (|line| < 1.0) — book-standard
     *    -1 → +1 skip; the bettor takes the moneyline.
     *  - House-safe on duplicate (side, point) feed rows: keep the LOWEST
     *    decimal (worst payout) so a pre-dedupe doc can't leak a generous price.
     *  - ML FLOOR (spreads only): once a bought spread crosses onto the
     *    bettor-favorable side (line >= 0 — a cushion that's easier than an
     *    outright win), it may never pay MORE than that side's moneyline. If
     *    the feed rung's decimal exceeds the side ML decimal (or the ML is
     *    missing), OMIT it. A favorite still laying points (line < 0) is HARDER
     *    than the ML and legitimately pays more, so the floor does not bind.
     *    Totals have no ML equivalent, so no floor applies.
     *
     * @param list<array<string,mixed>> $pool combined market pool (core +
     *        extendedMarkets): must contain 'alternate_spreads'/'alternate_totals'
     *        for rungs and 'h2h' for the spread ML floor.
     * @return list<array{points: float, line: float, decimal: float, american: int}>
     */
    public static function ladderFromFeed(string $sportKey, string $marketType, string $selection, float $basePoint, array $pool): array
    {
        if (!self::isAllowedMarket($marketType) || !self::isSportEnabled($sportKey)) {
            return [];
        }
        $m = strtolower(trim($marketType));
        $altOutcomes = self::outcomesForKey($pool, 'alternate_' . $m);
        if ($altOutcomes === []) {
            return [];
        }
        $priceByPoint = self::feedPriceByPoint($altOutcomes, $m, $selection);
        if ($priceByPoint === []) {
            return [];
        }

        $isSpread = $m === 'spreads';
        $noTie = self::isNoTieSport($sportKey);
        // Side ML decimal (spreads only) — the floor a bettor-favorable bought
        // line may not beat. Null when absent → such rungs fail safe (omitted).
        $mlDecimal = $isSpread ? self::sideMoneylineDecimal($pool, $selection) : null;

        $ladder = [];
        for ($steps = 1; $steps <= self::MAX_HALF_STEPS; $steps++) {
            $points = $steps * self::HALF_POINT;
            $delta = self::signedPointDelta($m, $selection, $points);
            $line = round($basePoint + $delta, 2);

            // D2: no-tie win-zone spreads are omitted (book-standard skip).
            if ($isSpread && $noTie && abs($line) < self::NO_TIE_WIN_ZONE) {
                continue;
            }

            $key = self::pointKey($line);
            if (!array_key_exists($key, $priceByPoint)) {
                continue; // D1: no feed price → no rung.
            }
            $decimal = SportsbookBetSupport::snapDecimalOdds($priceByPoint[$key]);
            $american = SportsbookBetSupport::decimalToAmericanInt($decimal);
            if ($american === 0) {
                continue;
            }
            $exactDecimal = SportsbookBetSupport::americanToDecimalExact($american);
            if (!is_finite($exactDecimal) || $exactDecimal <= 1.0) {
                continue;
            }

            // ML floor: a bettor-favorable bought spread (line >= 0) can't pay
            // more than the side moneyline. Missing ML → fail safe, omit.
            if ($isSpread && $line >= -1e-9) {
                if ($mlDecimal === null || $exactDecimal > $mlDecimal + 1e-9) {
                    continue;
                }
            }

            $ladder[] = [
                'points' => $points,
                'line' => $line,
                'decimal' => $exactDecimal,
                'american' => $american,
            ];
        }

        // No-tie spreads: the feed ladder above OMITS the win zone (|line| < 1)
        // and may lack the ±1 push-adjusted rungs. Fill them from the side
        // moneyline so a bettor can always buy down to "just win the game".
        // (Totals have no ML anchor; 3-way/real-tie sports keep real ±0 lines.)
        if ($isSpread && $noTie) {
            $ladder = self::fillNoTieWinZone($ladder, $basePoint, $priceByPoint, $mlDecimal);
        }

        return $ladder;
    }

    /**
     * No-tie sports only: fill the near-pick'em rungs the feed-anchored ladder
     * can't, anchored on the side MONEYLINE (the "win the game" price).
     *
     *  - {-0.5, 0, +0.5} all equal "win the game" = the side ML. Surface ONE
     *    half-point rung at the ML (not three identical lines).
     *  - ±1 = win-the-game adjusted for the 1-run push. Prefer the feed price
     *    (kept by the main loop already); otherwise SYNTHESIZE by interpolating
     *    in implied-probability space at the midpoint between the ML rung (the
     *    win-the-game half-point) and the nearest feed half-point rung (±1.5).
     *
     * Then enforce, house-safe (payouts only ever clamped DOWN):
     *  - strict monotonicity — a more bettor-favorable line never pays MORE
     *    than a less favorable one (seeded by the base feed price so no buy
     *    beats the un-bought line); and
     *  - the ML floor — no line >= 0 (a cushion easier than the outright win)
     *    pays more than the ML.
     *
     * Without the ML anchor the win zone can't be priced → the feed ladder is
     * returned untouched (fail safe, no guessed prices). Because this runs
     * inside ladderFromFeed, both display (attachBuyPointsLadders) and
     * placement (priceBoughtPointFromFeed) get the identical filled ladder.
     *
     * @param list<array{points:float,line:float,decimal:float,american:int}> $ladder
     * @param array<string,float> $priceByPoint house-safe feed decimals for THIS side
     * @return list<array{points:float,line:float,decimal:float,american:int}>
     */
    private static function fillNoTieWinZone(array $ladder, float $basePoint, array $priceByPoint, ?float $mlDecimal): array
    {
        if ($mlDecimal === null) {
            return $ladder; // no anchor → can't price the win zone; leave as-is.
        }
        $mlAmerican = SportsbookBetSupport::decimalToAmericanInt($mlDecimal);
        if ($mlAmerican === 0) {
            return $ladder;
        }

        // Index existing (feed) rungs by line — feed price always wins.
        $byLine = [];
        foreach ($ladder as $rung) {
            $byLine[self::pointKey($rung['line'])] = $rung;
        }

        // boughtPoints for a target line in the spread buy direction
        // (line = base + boughtPoints). Null if it isn't a forward buy in range.
        $pointsFor = static function (float $line) use ($basePoint): ?float {
            $pts = round($line - $basePoint, 2);
            $steps = (int) round($pts / self::HALF_POINT);
            if ($steps < 1 || $steps > self::MAX_HALF_STEPS
                || abs($pts - $steps * self::HALF_POINT) > 1e-6) {
                return null;
            }
            return $steps * self::HALF_POINT;
        };

        // 1) Win-the-game: the FIRST non-zero half-point inside the win zone,
        //    priced at the ML. Collapses the -0.5/0/+0.5 triple to one rung.
        for ($steps = 1; $steps <= self::MAX_HALF_STEPS; $steps++) {
            $line = round($basePoint + $steps * self::HALF_POINT, 2);
            if (abs($line) >= self::NO_TIE_WIN_ZONE) {
                continue;
            }
            if (abs($line) < 1e-9) {
                continue; // skip the 0 line (push ambiguity); prefer ±0.5.
            }
            if (!array_key_exists(self::pointKey($line), $byLine)) {
                $byLine[self::pointKey($line)] = [
                    'points' => $steps * self::HALF_POINT,
                    'line' => $line,
                    'decimal' => $mlDecimal,
                    'american' => $mlAmerican,
                ];
            }
            break;
        }

        // 2) ±1 push-adjusted rungs (only when the feed didn't price them).
        foreach ([-1.0, 1.0] as $line) {
            $pts = $pointsFor($line);
            if ($pts === null || array_key_exists(self::pointKey($line), $byLine)) {
                continue; // out of range, or feed already priced it.
            }
            $anchorKey = self::pointKey($line < 0 ? -1.5 : 1.5);
            if (!array_key_exists($anchorKey, $priceByPoint)) {
                continue; // no ±1.5 feed anchor → can't synthesize, omit.
            }
            $anchorDecimal = SportsbookBetSupport::snapDecimalOdds($priceByPoint[$anchorKey]);
            if (!is_finite($anchorDecimal) || $anchorDecimal <= 1.0) {
                continue;
            }
            // Midpoint in implied-prob space between the ML (the win-the-game
            // half-point) and the ±1.5 feed rung — ±1 sits exactly halfway.
            $p = (1.0 / $mlDecimal + 1.0 / $anchorDecimal) / 2.0;
            if ($p <= 0.0 || $p >= 1.0) {
                continue;
            }
            $american = SportsbookBetSupport::decimalToAmericanInt(
                SportsbookBetSupport::snapDecimalOdds(1.0 / $p)
            );
            if ($american === 0) {
                continue;
            }
            $exact = SportsbookBetSupport::americanToDecimalExact($american);
            if (!is_finite($exact) || $exact <= 1.0) {
                continue;
            }
            $byLine[self::pointKey($line)] = [
                'points' => $pts,
                'line' => $line,
                'decimal' => $exact,
                'american' => $american,
            ];
        }

        // Order by line ascending (= buy direction) for the monotonic pass.
        $rungs = array_values($byLine);
        usort($rungs, static fn(array $a, array $b): int => $a['line'] <=> $b['line']);

        // Seed the payout ceiling with the base feed price so no buy ever pays
        // more than the un-bought line. Then clamp each successive (more
        // favorable) rung to <= the previous payout, and apply the ML floor.
        $baseKey = self::pointKey($basePoint);
        $ceil = array_key_exists($baseKey, $priceByPoint)
            ? SportsbookBetSupport::snapDecimalOdds($priceByPoint[$baseKey])
            : INF;

        $out = [];
        foreach ($rungs as $rung) {
            $dec = $rung['decimal'];
            if ($dec > $ceil + 1e-9) {
                $dec = $ceil; // monotonicity: never beat a less-favorable rung.
            }
            if ($rung['line'] >= -1e-9 && $dec > $mlDecimal + 1e-9) {
                $dec = $mlDecimal; // ML floor on bettor-favorable cushions.
            }
            $american = SportsbookBetSupport::decimalToAmericanInt($dec);
            if ($american === 0) {
                continue;
            }
            $exact = SportsbookBetSupport::americanToDecimalExact($american);
            if (!is_finite($exact) || $exact <= 1.0) {
                continue;
            }
            $rung['decimal'] = $exact;
            $rung['american'] = $american;
            $out[] = $rung;
            $ceil = min($ceil, $exact); // tighten the ceiling for the next rung.
        }

        // Hand back in boughtPoints order (smallest buy first) for the consumer.
        usort($out, static fn(array $a, array $b): int => $a['points'] <=> $b['points']);
        return $out;
    }

    /**
     * The single feed-priced rung for a specific boughtPoints buy, or null if
     * the feed has no price for it (caller throws BUY_POINTS_NO_FEED_PRICE).
     *
     * @param list<array<string,mixed>> $pool combined market pool
     * @return array{points: float, line: float, decimal: float, american: int}|null
     */
    public static function priceBoughtPointFromFeed(string $sportKey, string $marketType, string $selection, float $basePoint, float $boughtPoints, array $pool): ?array
    {
        $ladder = self::ladderFromFeed($sportKey, $marketType, $selection, $basePoint, $pool);
        foreach ($ladder as $rung) {
            if (abs($rung['points'] - $boughtPoints) < 1e-6) {
                return $rung;
            }
        }
        return null;
    }

    /**
     * Outcomes of the first market in the pool whose key matches (lowercased).
     *
     * @param list<array<string,mixed>> $pool
     * @return list<array<string,mixed>>
     */
    private static function outcomesForKey(array $pool, string $key): array
    {
        $key = strtolower(trim($key));
        foreach ($pool as $market) {
            if (!is_array($market)) {
                continue;
            }
            if (strtolower(trim((string) ($market['key'] ?? ''))) === $key) {
                return is_array($market['outcomes'] ?? null) ? array_values($market['outcomes']) : [];
            }
        }
        return [];
    }

    /**
     * Lowest-payout (house-safe) feed decimal per matching (side, point).
     *
     * @param list<array<string,mixed>> $altOutcomes
     * @return array<string, float> point-key => decimal
     */
    private static function feedPriceByPoint(array $altOutcomes, string $marketType, string $selection): array
    {
        $byPoint = [];
        foreach ($altOutcomes as $o) {
            if (!is_array($o) || !self::sideMatches($marketType, $selection, (string) ($o['name'] ?? ''))) {
                continue;
            }
            $pointRaw = $o['point'] ?? null;
            $priceRaw = $o['price'] ?? null;
            if (!is_numeric($pointRaw) || !is_numeric($priceRaw)) {
                continue;
            }
            $price = (float) $priceRaw;
            if ($price <= 1.0) {
                continue;
            }
            $key = self::pointKey((float) $pointRaw);
            if (!array_key_exists($key, $byPoint) || $price < $byPoint[$key]) {
                $byPoint[$key] = $price;
            }
        }
        return $byPoint;
    }

    /**
     * Whether a feed alt outcome is on the same betting side as the selection.
     * Spreads match by canonical name (both come from the same name source);
     * totals match Over↔Over / Under↔Under.
     */
    private static function sideMatches(string $marketType, string $selection, string $outcomeName): bool
    {
        if ($marketType === 'spreads') {
            return strcasecmp(trim($selection), trim($outcomeName)) === 0;
        }
        $sel = strtolower($selection);
        $out = strtolower($outcomeName);
        if (str_contains($sel, 'over') && str_contains($out, 'over')) {
            return true;
        }
        return str_contains($sel, 'under') && str_contains($out, 'under');
    }

    /**
     * Stable half-point key so float drift can't miss a rung lookup.
     */
    private static function pointKey(float $line): string
    {
        return number_format(round($line * 2) / 2, 1, '.', '');
    }

    /**
     * Exact moneyline decimal for the selection's side, or null if absent.
     *
     * @param list<array<string,mixed>> $pool
     */
    private static function sideMoneylineDecimal(array $pool, string $selection): ?float
    {
        foreach (self::outcomesForKey($pool, 'h2h') as $o) {
            if (!is_array($o)) {
                continue;
            }
            if (strcasecmp(trim((string) ($o['name'] ?? '')), trim($selection)) !== 0) {
                continue;
            }
            $price = $o['price'] ?? null;
            if (!is_numeric($price) || (float) $price <= 1.0) {
                return null;
            }
            $snapped = SportsbookBetSupport::snapDecimalOdds((float) $price);
            $american = SportsbookBetSupport::decimalToAmericanInt($snapped);
            if ($american === 0) {
                return null;
            }
            $exact = SportsbookBetSupport::americanToDecimalExact($american);
            return (is_finite($exact) && $exact > 1.0) ? $exact : null;
        }
        return null;
    }
}
