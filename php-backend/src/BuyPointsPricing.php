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
    // Up to 6 half-points (±3.0) in EITHER direction. 6 (not 5) so a base run
    // line of ±1.5 can reach the opposite main line (e.g. -1.5 → +1.5).
    private const MAX_HALF_STEPS = 6;

    // ── Synthetic ladder (no-feed-alt-lines fallback) ───────────────────────
    // Some sports (basketball) ship NO alternate-line ladder, so the feed-
    // anchored path produces nothing and buy-points is unavailable. For these
    // sports ONLY, we synthesize a house-safe ladder from the base line's own
    // price using a fixed implied-probability cost per half-point.
    //
    // HOUSE SAFETY: every synthesized rung pays strictly LESS than the base
    // line (and than the previous rung) — buying points can only ever worsen
    // the payout. The flat per-step probability is set at/above the fair near-
    // line marginal value; because the real marginal value of a point DECREASES
    // as you move off the line, a flat step over-charges the bettor on every
    // rung past the first, so the house never under-prices. Only used when the
    // feed has no alt ladder; feed prices always win when present.
    private const SYNTH_SPORT_PREFIXES = ['basketball_'];
    private const DEFAULT_SYNTH_PROB_STEP = 0.022; // win-prob added per half-point
    private const SYNTH_MAX_PROB = 0.97;           // payout floor; beyond this a buy is meaningless

    // ── Flat-cents buy-points model (competitor parity) ─────────────────────
    // The dropdown is priced off the BASE line's own price with a fixed per-½
    // juice cost, capped at 2 points, instead of the feed's irregular alt
    // prices (which leak free points — e.g. -3½ and -2½ both at -110). Two
    // flavours:
    //
    //   BASKETBALL (spreads + totals): a FLAT +10 American cents per ½-point —
    //     matching the competitor (-4 -110 → -3½ -120 → -3 -130 → -2½ -140 →
    //     -2 -150). Basketball margins are near-continuous (no key numbers), so a
    //     flat charge is house-safe.
    //
    //   FOOTBALL (spreads only): KEY-NUMBER-AWARE. +10 cents per ½-step normally;
    //     a ½-step that lands on or leaves a KEY NUMBER (3, 4, 6, 7, 10, 14) costs
    //     +15 cents instead; charged CUMULATIVELY off the base price. Per Nicky/
    //     Mitchell's half-point-value table (the margins NFL games most land on).
    //     Examples: -3½ → -3 -125, -2½ -140, -2 -150, -1½ -160;  -4 → -3½ -125,
    //     -3 -140, -2½ -155, -2 -165;  -7 → -6½ -125, -6 -140, -5½ -155, -5 -165;
    //     -10 → -9½ -125, -9 -135, -8½ -145, -8 -155. The premium is env-tunable
    //     (BUY_POINTS_KEY_NUMBER_CENTS, default 15). NOT bettorjuice365-exact —
    //     they premium only 3/7 — but the team chose this fuller key set.
    //
    // Both REPLACE the feed-anchored alt prices (buy DOWN only). Football TOTALS
    // and run/puck lines (baseball/hockey ±1.5) stay feed-anchored — their key
    // numbers differ and a spread-style flat charge wouldn't fit.
    private const FLAT_CENTS_PER_HALF = 10;      // base American cents per ½ point
    private const FLAT_MAX_HALF_STEPS = 4;       // cap at 2.0 points (4 half-steps)
    // Football key numbers: a ½-step touching ANY of these costs the key premium
    // (default +15c); every other ½-step is +10c. Per Nicky/Mitchell's table — the
    // margins NFL games most often land on. (NOT bettorjuice365-exact: they premium
    // only 3/7, but the team chose this fuller set.)
    private const KEY_NUMBER_CENTS_SPORT_PREFIXES = ['americanfootball_'];
    private const KEY_NUMBERS = [3.0, 4.0, 6.0, 7.0, 10.0, 14.0];
    // Premium American cents on/adjacent a key number. Default 15; env-tunable via
    // BUY_POINTS_KEY_NUMBER_CENTS, clamped to [base, 50] so a key step is never
    // cheaper than a normal one and can't be set absurdly high.
    private const DEFAULT_KEY_NUMBER_CENTS_PER_HALF = 15;
    private const MAX_KEY_NUMBER_CENTS_PER_HALF = 50;

    // Run/puck-line "reference lines" cap. On baseball/hockey the meaningful
    // run/puck lines cluster near pick'em (±1, ±1.5, ±2, ±2.5); deeper alts
    // (+3, +3.5, +4 …) are noise that clutters the buy-points dropdown. For
    // run/puck-line sports ONLY, drop any rung whose |line| exceeds this cap so
    // the dropdown shows the reference band, not the whole feed ladder. Env-
    // tunable (BUY_POINTS_REFERENCE_LINE_CAP). Other sports (basketball, NFL)
    // have large spreads, so no absolute cap applies to them.
    private const DEFAULT_REFERENCE_LINE_CAP = 2.5;

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
     * Run-line / puck-line sports (baseball, hockey) whose mainline spread is
     * conventionally fixed at ±1.5. On these the half-point win-zone rung
     * (±0.5) is just the moneyline ("win the game by any margin") — books do
     * NOT list it as a buyable run/puck line, so we never synthesize it. The
     * ±1 push-adjusted rung (win by 2+) IS real and stays. Tie-zone sports
     * with continuous spreads (basketball, NCAAF) keep ±0.5: a close game
     * genuinely sits there, so it's a real spread, not a moneyline alias.
     */
    private static function isRunLineSport(string $sportKey): bool
    {
        $k = strtolower(trim($sportKey));
        return str_starts_with($k, 'baseball_') || str_starts_with($k, 'icehockey_');
    }

    /**
     * Whether a rung's line is outside the run/puck-line "reference band" and
     * should be dropped from the dropdown (run/puck-line sports only). Keeps the
     * dropdown to the meaningful near-pick'em lines instead of the deep alt
     * ladder. Env-tunable via BUY_POINTS_REFERENCE_LINE_CAP (clamped to a sane
     * 1.5–5.0 range).
     */
    private static function exceedsReferenceBand(string $sportKey, float $line): bool
    {
        if (!self::isRunLineSport($sportKey)) {
            return false;
        }
        $raw = Env::get('BUY_POINTS_REFERENCE_LINE_CAP', '');
        $cap = is_numeric($raw) ? (float) $raw : self::DEFAULT_REFERENCE_LINE_CAP;
        if (!is_finite($cap) || $cap < 1.5) {
            $cap = self::DEFAULT_REFERENCE_LINE_CAP;
        }
        if ($cap > 5.0) {
            $cap = 5.0;
        }
        return abs($line) > $cap + 1e-9;
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
     * Validate a boughtPoints value. Returns the SIGNED number of half-point
     * steps on success, throws on invalid input. The sign is the direction:
     * positive = buy (easier/cheaper line), negative = sell (harder line for a
     * better payout). boughtPoints==0 returns 0 (no move; caller short-circuits).
     */
    public static function halfStepsFromBoughtPoints(float $boughtPoints): int
    {
        if ($boughtPoints === 0.0) {
            return 0;
        }
        // Convert to half-point steps. 0.5 → 1, -1.0 → -2, 2.5 → 5, etc.
        // We accept floating drift up to 1e-4 (e.g. 0.4999999) and snap.
        $stepsFloat = $boughtPoints / self::HALF_POINT;
        $stepsRounded = (int) round($stepsFloat);
        if (abs($stepsFloat - $stepsRounded) > 1e-4) {
            throw new ApiException('boughtPoints must be in 0.5-point increments.', 400, [
                'code' => 'INVALID_BUY_POINTS',
            ]);
        }
        $magnitude = abs($stepsRounded);
        if ($magnitude < 1 || $magnitude > self::MAX_HALF_STEPS) {
            throw new ApiException(
                sprintf('boughtPoints must be between -%.1f and %.1f.', self::MAX_HALF_STEPS * self::HALF_POINT, self::MAX_HALF_STEPS * self::HALF_POINT),
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
        $priceByPoint = $altOutcomes === [] ? [] : self::feedPriceByPoint($altOutcomes, $m, $selection);

        // Flat-cents pricing (basketball spreads+totals, football spreads):
        // price every ½-point off the base line's OWN price with a fixed cumulative
        // juice cost — +10c/½ flat for basketball, key-number-aware (+25c/½ on the
        // 3/7, +10c/½ elsewhere) for football — capped at 2 points, instead of the
        // feed's irregular alts, and it works even with no alt feed. NOT used for
        // football totals or run/puck-line sports (those stay feed-anchored). Every
        // house-safety guard in the loop below (no-tie skip, ML floor) STILL applies.
        $flat = self::usesFlatCents($sportKey, $m);
        $baseDecimal = ($flat || $priceByPoint === []) ? self::baseLineDecimal($pool, $m, $selection, $basePoint) : null;

        if (!$flat && $priceByPoint === []) {
            // No feed alt ladder for this selection. Configured no-alt-feed
            // sports synthesize a house-safe ladder from the base line's own
            // price; every other sport gets nothing (the "never guess a price"
            // rule). (Basketball is also a flat-cents sport, so it never reaches
            // here — this stays for any future synth-only, non-flat sport.)
            if (self::isSynthSport($sportKey) && $baseDecimal !== null) {
                return self::synthesizeLadder($m, $selection, $basePoint, $baseDecimal);
            }
            return [];
        }
        if ($flat && $baseDecimal === null) {
            return []; // no base-line price → can't anchor the flat ladder
        }
        $baseAmerican = $flat ? SportsbookBetSupport::decimalToAmericanInt($baseDecimal) : 0;

        $isSpread = $m === 'spreads';
        $noTie = self::isNoTieSport($sportKey);
        // Side ML decimal (spreads only) — the floor a bettor-favorable bought
        // line may not beat. Null when absent → such rungs fail safe (omitted).
        $mlDecimal = $isSpread ? self::sideMoneylineDecimal($pool, $selection) : null;

        $maxSteps = $flat ? self::FLAT_MAX_HALF_STEPS : self::MAX_HALF_STEPS;
        $ladder = [];
        for ($steps = 1; $steps <= $maxSteps; $steps++) {
            $points = $steps * self::HALF_POINT;
            $delta = self::signedPointDelta($m, $selection, $points);
            $line = round($basePoint + $delta, 2);

            // D2: no-tie win-zone spreads are omitted (book-standard skip).
            if ($isSpread && $noTie && abs($line) < self::NO_TIE_WIN_ZONE) {
                continue;
            }
            // Reference-band cap: drop deep run/puck-line alts (keeps the
            // dropdown to the near-pick'em reference lines).
            if ($isSpread && self::exceedsReferenceBand($sportKey, $line)) {
                continue;
            }

            if ($flat) {
                // Cumulative juice off the base price: +10c/½ (basketball, and
                // football ½-steps clear of a key number), or the football
                // key-number premium (default +15c) on a step touching a key
                // number (3, 4, 6, 7, 10, 14).
                $cents = self::cumulativeFlatCents($sportKey, $m, $selection, $basePoint, $steps);
                $american = self::worsenAmericanByCents($baseAmerican, $cents);
                if ($american === 0) {
                    continue;
                }
            } else {
                $key = self::pointKey($line);
                if (!array_key_exists($key, $priceByPoint)) {
                    continue; // D1: no feed price → no rung.
                }
                $decimal = SportsbookBetSupport::snapDecimalOdds($priceByPoint[$key]);
                $american = SportsbookBetSupport::decimalToAmericanInt($decimal);
                if ($american === 0) {
                    continue;
                }
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
        // Run/puck-line sports (baseball, hockey) DON'T get the ±0.5 win-the-game
        // rung — there it's just the moneyline, not a real run/puck line — but
        // they still get the ±1 push-adjusted rung.
        if ($isSpread && $noTie) {
            $ladder = self::fillNoTieWinZone(
                $ladder,
                $basePoint,
                $priceByPoint,
                $mlDecimal,
                !self::isRunLineSport($sportKey)
            );
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
    private static function fillNoTieWinZone(array $ladder, float $basePoint, array $priceByPoint, ?float $mlDecimal, bool $synthesizeWinHalfPoint = true): array
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
        //    Skipped for run/puck-line sports (baseball, hockey), where ±0.5 is
        //    just the moneyline and is not offered as a buyable run/puck line.
        for ($steps = 1; $synthesizeWinHalfPoint && $steps <= self::MAX_HALF_STEPS; $steps++) {
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
     * The "sell" (harder-line) half of the ladder: feed-priced rungs in the
     * OPPOSITE direction to a buy — laying more points / a tougher total for a
     * better payout. `points` is NEGATIVE (the sign carries the direction, same
     * convention as signedPointDelta). Feed-only: no synthesis, no win-zone fill
     * (a harder line is never the pick'em zone). House-safe: rungs that land on
     * the bettor-favorable side (spread line >= 0, e.g. a dog laying fewer
     * points) still can't beat the side moneyline (same ML floor as buys).
     *
     * @param list<array<string,mixed>> $pool combined market pool
     * @return list<array{points: float, line: float, decimal: float, american: int}>
     */
    public static function sellLadderFromFeed(string $sportKey, string $marketType, string $selection, float $basePoint, array $pool): array
    {
        if (!self::isAllowedMarket($marketType) || !self::isSportEnabled($sportKey)) {
            return [];
        }
        $m = strtolower(trim($marketType));
        $altOutcomes = self::outcomesForKey($pool, 'alternate_' . $m);
        if ($altOutcomes === []) {
            return []; // sells are feed-only — never synthesized.
        }
        $priceByPoint = self::feedPriceByPoint($altOutcomes, $m, $selection);
        if ($priceByPoint === []) {
            return [];
        }

        $isSpread = $m === 'spreads';
        $noTie = self::isNoTieSport($sportKey);
        $mlDecimal = $isSpread ? self::sideMoneylineDecimal($pool, $selection) : null;

        $ladder = [];
        for ($steps = 1; $steps <= self::MAX_HALF_STEPS; $steps++) {
            $points = -($steps * self::HALF_POINT); // NEGATIVE = sell direction
            $line = round($basePoint + self::signedPointDelta($m, $selection, $points), 2);

            // No-tie spreads never surface the win zone, in either direction.
            if ($isSpread && $noTie && abs($line) < self::NO_TIE_WIN_ZONE) {
                continue;
            }
            // Reference-band cap: drop deep run/puck-line alts.
            if ($isSpread && self::exceedsReferenceBand($sportKey, $line)) {
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
            // ML floor on any bettor-favorable rung (line >= 0), same as buys.
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
        return $ladder;
    }

    /**
     * The full bidirectional dropdown ladder: buys (positive points) + sells
     * (negative points), sorted ascending by signed points. SINGLE SOURCE for
     * both display (attachBuyPointsLadders) and placement
     * (priceBoughtPointFromFeed) so what shows == what places == what settles.
     *
     * @param list<array<string,mixed>> $pool combined market pool
     * @return list<array{points: float, line: float, decimal: float, american: int}>
     */
    public static function fullLadderFromFeed(string $sportKey, string $marketType, string $selection, float $basePoint, array $pool): array
    {
        $buys = self::ladderFromFeed($sportKey, $marketType, $selection, $basePoint, $pool);
        $sells = self::sellLadderFromFeed($sportKey, $marketType, $selection, $basePoint, $pool);
        $all = array_merge($sells, $buys);
        usort($all, static fn(array $a, array $b): int => $a['points'] <=> $b['points']);
        return $all;
    }

    /**
     * The single feed-priced rung for a specific boughtPoints move (buy when
     * positive, sell when negative), or null if there's no price for it (caller
     * throws BUY_POINTS_NO_FEED_PRICE).
     *
     * @param list<array<string,mixed>> $pool combined market pool
     * @return array{points: float, line: float, decimal: float, american: int}|null
     */
    public static function priceBoughtPointFromFeed(string $sportKey, string $marketType, string $selection, float $basePoint, float $boughtPoints, array $pool): ?array
    {
        // BUY-ONLY policy (Nicky): price only buy-down rungs. The buy ladder
        // contains positive boughtPoints only, so a sell (negative boughtPoints)
        // matches no rung and returns null → caller rejects with
        // BUY_POINTS_NO_FEED_PRICE. Mirrors attachBuyPointsLadders' display
        // ladder exactly (display == placed == settled).
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

    /**
     * Whether this sport uses the synthetic ladder fallback (no feed alt
     * lines). Basketball only, for now.
     */
    private static function isSynthSport(string $sportKey): bool
    {
        $k = strtolower(trim($sportKey));
        foreach (self::SYNTH_SPORT_PREFIXES as $prefix) {
            if (str_starts_with($k, $prefix)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Whether this (sport, market) is priced by the flat-cents model off the
     * base line instead of the feed's alt ladder. Basketball uses it for spreads
     * AND totals (continuous margins); football uses it for SPREADS ONLY (the
     * key-number-aware variant) — football totals and every other sport stay
     * feed-anchored.
     */
    private static function usesFlatCents(string $sportKey, string $marketType): bool
    {
        $k = strtolower(trim($sportKey));
        if (str_starts_with($k, 'basketball_')) {
            return true;
        }
        if (str_starts_with($k, 'americanfootball_')) {
            return strtolower(trim($marketType)) === 'spreads';
        }
        return false;
    }

    /** Whether this sport prices key-number ½-steps at the premium rate (football). */
    private static function isKeyNumberSport(string $sportKey): bool
    {
        $k = strtolower(trim($sportKey));
        foreach (self::KEY_NUMBER_CENTS_SPORT_PREFIXES as $prefix) {
            if (str_starts_with($k, $prefix)) {
                return true;
            }
        }
        return false;
    }

    /** Whether a line sits exactly on one of the given key numbers (|line| ∈ $set). */
    private static function touchesKey(float $line, array $set): bool
    {
        $abs = abs($line);
        foreach ($set as $k) {
            if (abs($abs - $k) < 1e-9) {
                return true;
            }
        }
        return false;
    }

    /**
     * Premium American cents charged on a key-number ½-step. Default 15
     * (competitor parity); env-tunable via BUY_POINTS_KEY_NUMBER_CENTS and
     * clamped to [FLAT_CENTS_PER_HALF, MAX_KEY_NUMBER_CENTS_PER_HALF] so a key
     * step is never cheaper than a normal one and a mis-set value can't run wild.
     */
    private static function keyNumberCentsPerHalf(): int
    {
        return self::clampKeyCents(Env::get('BUY_POINTS_KEY_NUMBER_CENTS', ''), self::DEFAULT_KEY_NUMBER_CENTS_PER_HALF);
    }

    /** Parse a key-cents env value, falling back to $default, clamped to [base, MAX]. */
    private static function clampKeyCents(?string $raw, int $default): int
    {
        $v = is_numeric($raw) ? (int) round((float) $raw) : $default;
        if ($v < self::FLAT_CENTS_PER_HALF) {
            $v = self::FLAT_CENTS_PER_HALF;
        }
        if ($v > self::MAX_KEY_NUMBER_CENTS_PER_HALF) {
            $v = self::MAX_KEY_NUMBER_CENTS_PER_HALF;
        }
        return $v;
    }

    /**
     * Cumulative American cents of juice for buying `steps` half-points off the
     * base line, walking each ½-step from the base in the buy direction. Each
     * step costs FLAT_CENTS_PER_HALF, except — on key-number sports (football) —
     * a step whose FROM or TO line sits on a key number (3/7), which costs the
     * KEY_NUMBER_CENTS_PER_HALF premium. Non-key sports (basketball) reduce to a
     * flat steps × FLAT_CENTS_PER_HALF.
     */
    private static function cumulativeFlatCents(string $sportKey, string $marketType, string $selection, float $basePoint, int $steps): int
    {
        $keySport = self::isKeyNumberSport($sportKey);
        $cents = 0;
        for ($s = 1; $s <= $steps; $s++) {
            $perStep = self::FLAT_CENTS_PER_HALF;
            if ($keySport) {
                $from = round($basePoint + self::signedPointDelta($marketType, $selection, ($s - 1) * self::HALF_POINT), 2);
                $to = round($basePoint + self::signedPointDelta($marketType, $selection, $s * self::HALF_POINT), 2);
                if (self::touchesKey($from, self::KEY_NUMBERS) || self::touchesKey($to, self::KEY_NUMBERS)) {
                    $perStep = self::keyNumberCentsPerHalf();
                }
            }
            $cents += $perStep;
        }
        return $cents;
    }

    /**
     * Make an American line WORSE for the bettor by $cents American cents. Works
     * continuously across even money (+100 == -100) so e.g. +120 worsened by 30
     * → +110 → even → -110. Positive juice direction = more negative for a
     * favorite. Returns 0 for an invalid base.
     */
    private static function worsenAmericanByCents(int $american, int $cents): int
    {
        if ($american === 0) {
            return 0;
        }
        // Map to a single continuous "juice" scale where higher = worse for the
        // bettor and even money is 0: favorites (a<=-100) → -100-a (positive),
        // dogs (a>=+100) → 100-a (negative).
        $j = $american <= -100 ? (-100 - $american) : (100 - $american);
        $j += $cents;
        // Map back: j>=0 → favorite side (-100-j), j<0 → dog side (100-j).
        return $j >= 0 ? (-100 - $j) : (100 - $j);
    }

    /**
     * Win-probability cost per half-point for the synthetic ladder. Env-tunable
     * via BUY_POINTS_SYNTH_PROB_STEP, clamped to a sane house-safe band so a
     * mis-set value can't make buys absurdly cheap (too low) or worthless (too
     * high).
     */
    private static function synthProbStep(): float
    {
        $raw = Env::get('BUY_POINTS_SYNTH_PROB_STEP', '');
        $v = is_numeric($raw) ? (float) $raw : self::DEFAULT_SYNTH_PROB_STEP;
        if (!is_finite($v) || $v < 0.005) {
            $v = self::DEFAULT_SYNTH_PROB_STEP;
        }
        if ($v > 0.10) {
            $v = 0.10;
        }
        return $v;
    }

    /**
     * Exact base-line decimal for the selection's main spread/total rung, or
     * null if absent. Anchors the synthetic ladder. Matches the same side
     * (sideMatches) AND the exact base point so we never price off a different
     * line than the one the bettor is buying from.
     *
     * @param list<array<string,mixed>> $pool
     */
    private static function baseLineDecimal(array $pool, string $marketType, string $selection, float $basePoint): ?float
    {
        $m = strtolower(trim($marketType));
        $baseKey = self::pointKey($basePoint);
        foreach (self::outcomesForKey($pool, $m) as $o) {
            if (!is_array($o) || !self::sideMatches($m, $selection, (string) ($o['name'] ?? ''))) {
                continue;
            }
            $pt = $o['point'] ?? null;
            if (!is_numeric($pt) || self::pointKey((float) $pt) !== $baseKey) {
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

    /**
     * Build a house-safe synthetic buy-points ladder from the base line's own
     * price. Each half-point adds a fixed win-probability (synthProbStep) and
     * the rung is repriced at the new, higher probability. Every rung is
     * clamped to pay strictly LESS than the base line and than the previous
     * rung — buying points can only worsen the payout, never improve it.
     *
     * @return list<array{points: float, line: float, decimal: float, american: int}>
     */
    private static function synthesizeLadder(string $marketType, string $selection, float $basePoint, float $baseDecimal): array
    {
        $p0 = 1.0 / $baseDecimal; // vigged win prob implied by the base line price
        if (!is_finite($p0) || $p0 <= 0.0 || $p0 >= 1.0) {
            return [];
        }
        $step = self::synthProbStep();

        $ladder = [];
        $prevDecimal = $baseDecimal; // ceiling: no rung may pay >= the base line
        for ($s = 1; $s <= self::MAX_HALF_STEPS; $s++) {
            $p = $p0 + $s * $step;
            if ($p > self::SYNTH_MAX_PROB) {
                break; // payout floor reached; further buys are meaningless.
            }
            $snapped = SportsbookBetSupport::snapDecimalOdds(1.0 / $p);
            $american = SportsbookBetSupport::decimalToAmericanInt($snapped);
            if ($american === 0) {
                continue;
            }
            $exact = SportsbookBetSupport::americanToDecimalExact($american);
            if (!is_finite($exact) || $exact <= 1.0) {
                continue;
            }
            // House safety: must strictly worsen the payout vs the previous
            // (less-favorable) rung. Rounding can collapse two steps onto the
            // same price — skip those rather than emit a duplicate/looser rung.
            if ($exact >= $prevDecimal - 1e-9) {
                continue;
            }
            $points = $s * self::HALF_POINT;
            $line = round($basePoint + self::signedPointDelta($marketType, $selection, $points), 2);
            $ladder[] = [
                'points' => $points,
                'line' => $line,
                'decimal' => $exact,
                'american' => $american,
            ];
            $prevDecimal = $exact;
        }
        return $ladder;
    }
}
