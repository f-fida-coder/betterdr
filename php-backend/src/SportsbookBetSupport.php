<?php

declare(strict_types=1);

final class SportsbookBetSupport
{
    /**
     * @param array<string, mixed> $payload
     */
    public static function payloadHash(array $payload): string
    {
        return hash('sha256', json_encode(self::sortRecursively($payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}');
    }

    public static function normalizeRequestId(string $raw): string
    {
        $requestId = trim($raw);
        if ($requestId === '') {
            return '';
        }
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $requestId) !== 1) {
            throw new ApiException('requestId must be 8-128 characters using letters, numbers, ".", "_", ":", or "-"', 400);
        }
        return $requestId;
    }

    public static function idempotencyDocumentId(string $scope, string $ownerId, string $requestId): string
    {
        return substr(hash('sha256', $scope . '|' . $ownerId . '|' . $requestId), 0, 24);
    }

    public static function ticketRiskAmount(string $betType, float $unitStake): float
    {
        return $betType === 'reverse' ? ($unitStake * 2.0) : $unitStake;
    }

    /**
     * @param array<string, mixed> $rule
     * @param array<int, array<string, mixed>> $validatedSelections
     */
    /**
     * Derive exact decimal odds from a selection document.
     * Prefers the stored oddsAmerican integer (source of truth) when present;
     * falls back to the decimal odds field for legacy records.
     *
     * @param array<string, mixed> $selection
     */
    private static function exactDecimalForSelection(array $selection): float
    {
        $american = isset($selection['oddsAmerican']) && is_int($selection['oddsAmerican'])
            ? $selection['oddsAmerican']
            : (isset($selection['oddsAmerican']) && is_numeric($selection['oddsAmerican']) ? (int) $selection['oddsAmerican'] : 0);
        if ($american !== 0) {
            return self::americanToDecimalExact($american);
        }
        return self::num($selection['odds'] ?? 0);
    }

    public static function calculatePotentialPayout(string $betType, float $unitStake, array $validatedSelections, array $rule): float
    {
        if ($unitStake <= 0 || $validatedSelections === []) {
            return 0.0;
        }

        if ($betType === 'straight') {
            return round($unitStake * self::exactDecimalForSelection($validatedSelections[0]));
        }

        if ($betType === 'parlay' || $betType === 'if_bet') {
            $combined = 1.0;
            foreach ($validatedSelections as $selection) {
                $combined *= self::exactDecimalForSelection($selection);
            }
            return round($unitStake * $combined);
        }

        if ($betType === 'teaser') {
            return round($unitStake * self::teaserMultiplier($rule, count($validatedSelections)));
        }

        if ($betType === 'reverse') {
            $combined = 1.0;
            foreach ($validatedSelections as $selection) {
                $combined *= self::exactDecimalForSelection($selection);
            }
            return round($unitStake * $combined * 2.0);
        }

        return 0.0;
    }

    public static function combinedOdds(float $riskAmount, float $potentialPayout): float
    {
        if ($riskAmount <= 0) {
            return 0.0;
        }
        return round($potentialPayout / $riskAmount, 4);
    }

    /**
     * Convert a decimal odds value to a rounded American integer.
     * decimal ≥ 2.0 → american = round((decimal − 1) × 100)
     * decimal < 2.0 → american = round(−100 / (decimal − 1))
     * Returns 0 for invalid input (decimal ≤ 1).
     */
    public static function decimalToAmericanInt(float $decimal): int
    {
        if (!is_finite($decimal) || $decimal <= 1.0) {
            return 0;
        }
        if ($decimal >= 2.0) {
            return (int) round(($decimal - 1.0) * 100.0);
        }
        $raw = -100.0 / ($decimal - 1.0);
        if (!is_finite($raw)) {
            return 0;
        }
        return (int) round($raw);
    }

    /**
     * Derive the exact decimal odds from a signed American integer.
     * american > 0 → decimal = 1 + (american / 100)
     * american < 0 → decimal = 1 + (100 / |american|)
     * Returns 0.0 for invalid input (zero).
     */
    public static function americanToDecimalExact(int $american): float
    {
        if ($american === 0) {
            return 0.0;
        }
        if ($american > 0) {
            return 1.0 + ($american / 100.0);
        }
        return 1.0 + (100.0 / (float) abs($american));
    }

    /**
     * @param array<int, array<string, mixed>> $validatedSelections
     */
    public static function validateTicketComposition(string $betType, array $validatedSelections): void
    {
        if ($betType === 'straight') {
            return;
        }

        $matchIds = [];
        foreach ($validatedSelections as $selection) {
            $matchId = (string) ($selection['matchId'] ?? '');
            if ($matchId === '') {
                continue;
            }
            if (isset($matchIds[$matchId])) {
                throw new ApiException('Unsupported same-game combination. Select different events.', 400, [
                    'code' => 'INVALID_COMBINATION',
                ]);
            }
            $matchIds[$matchId] = true;
        }

        if ($betType === 'teaser') {
            foreach ($validatedSelections as $selection) {
                $marketType = strtolower((string) ($selection['marketType'] ?? ''));
                if (!in_array($marketType, ['spreads', 'totals'], true)) {
                    throw new ApiException('Teasers only support spread and total markets.', 400, [
                        'code' => 'INVALID_TEASER_MARKET',
                    ]);
                }
            }
        }
    }

    /**
     * Snap a decimal odds value to the cleanest American line that's within
     * tolerance, so what the player sees on the ticket actually matches the
     * Risk/Win math. Upstream feeds frequently store -120 as 1.8333 (4dp
     * truncation) or 1.83000 (3dp); we promote those back to the exact
     * 1 + 100/120 = 1.83333... so 1000-win → 1200-risk to the penny. If the
     * value is genuinely between integer American lines (e.g. real -120.5 →
     * 1.829876…) we leave it alone so the half-point survives end-to-end.
     *
     * Rule: convert decimal → exact American (no rounding); compute the
     * decimal of the *rounded* American integer; if that decimal is within
     * 0.001 of the input, snap. Otherwise keep the input unchanged.
     */
    public static function snapDecimalOdds(mixed $value): float
    {
        $decimal = is_numeric($value) ? (float) $value : 0.0;
        if (!is_finite($decimal) || $decimal <= 1.0) {
            return $decimal;
        }

        $american = $decimal >= 2.0
            ? ($decimal - 1.0) * 100.0
            : -100.0 / ($decimal - 1.0);
        if (!is_finite($american) || $american === 0.0) {
            return $decimal;
        }

        $rounded = (float) round($american);
        if ($rounded === 0.0) {
            return $decimal;
        }
        $integerDecimal = $rounded > 0
            ? 1.0 + ($rounded / 100.0)
            : 1.0 + (100.0 / abs($rounded));

        return abs($decimal - $integerDecimal) < 0.001 ? $integerDecimal : $decimal;
    }

    /**
     * @param array<string, mixed> $validatedSelection
     * @return array<string, mixed>
     */
    public static function applyTeaserAdjustment(array $validatedSelection, float $teaserPoints): array
    {
        if ($teaserPoints <= 0) {
            return $validatedSelection;
        }

        $marketType = strtolower((string) ($validatedSelection['marketType'] ?? ''));
        $point = array_key_exists('point', $validatedSelection) ? $validatedSelection['point'] : null;
        if ($point === null || !is_numeric($point)) {
            throw new ApiException('Teaser requires selections with a valid point spread or total.', 400, [
                'code' => 'INVALID_TEASER_SELECTION',
            ]);
        }

        $originalPoint = (float) $point;
        $adjustedPoint = $originalPoint;
        if ($marketType === 'spreads') {
            $adjustedPoint = $originalPoint + $teaserPoints;
        } elseif ($marketType === 'totals') {
            $selection = strtolower((string) ($validatedSelection['selection'] ?? ''));
            $adjustedPoint = str_contains($selection, 'over')
                ? $originalPoint - $teaserPoints
                : $originalPoint + $teaserPoints;
        } else {
            throw new ApiException('Teaser requires spread or total selections.', 400, [
                'code' => 'INVALID_TEASER_SELECTION',
            ]);
        }

        $validatedSelection['basePoint'] = $originalPoint;
        $validatedSelection['point'] = round($adjustedPoint, 2);
        $validatedSelection['teaserAdjustment'] = round($adjustedPoint - $originalPoint, 2);
        return $validatedSelection;
    }

    /**
     * @param array<string, mixed> $bet
     * @return array<int, array<string, mixed>>
     */
    public static function ensureSelectionRowsForBet(SqlRepository $db, array $bet): array
    {
        $betId = (string) ($bet['id'] ?? '');
        if ($betId === '') {
            return [];
        }

        $rows = $db->findMany('betselections', ['betId' => $betId], ['sort' => ['selectionOrder' => 1]]);
        if ($rows !== []) {
            return $rows;
        }

        $legacySelections = is_array($bet['selections'] ?? null) ? $bet['selections'] : [];
        if ($legacySelections === []) {
            $legacySelections = [[
                'matchId' => $bet['matchId'] ?? null,
                'selection' => $bet['selection'] ?? null,
                'odds' => $bet['odds'] ?? null,
                'marketType' => $bet['type'] ?? 'straight',
                'point' => null,
                'status' => $bet['status'] ?? 'pending',
                'matchSnapshot' => $bet['matchSnapshot'] ?? new stdClass(),
            ]];
        }

        $ticketId = (string) ($bet['ticketId'] ?? $betId);
        $userId = (string) ($bet['userId'] ?? '');
        $betType = (string) ($bet['type'] ?? 'straight');
        $createdAt = (string) ($bet['createdAt'] ?? SqlRepository::nowUtc());
        $updatedAt = (string) ($bet['updatedAt'] ?? $createdAt);
        foreach (array_values($legacySelections) as $index => $selection) {
            if (!is_array($selection)) {
                continue;
            }
            $row = self::selectionRowFromTicket($betId, $ticketId, $userId, $betType, $selection, $index, $createdAt, $updatedAt);
            $db->insertOne('betselections', $row);
        }

        return $db->findMany('betselections', ['betId' => $betId], ['sort' => ['selectionOrder' => 1]]);
    }

    /**
     * @param array<int, array<string, mixed>> $bets
     */
    public static function backfillSelectionRowsForBets(SqlRepository $db, array $bets): void
    {
        foreach ($bets as $bet) {
            if (is_array($bet)) {
                self::ensureSelectionRowsForBet($db, $bet);
            }
        }
    }

    /**
     * @param array<string, mixed> $bet
     * @param array<int, array<string, mixed>> $selectionDocs
     */
    public static function upsertSelectionRowsForBet(SqlRepository $db, array $bet, array $selectionDocs): void
    {
        $betId = (string) ($bet['id'] ?? '');
        if ($betId === '') {
            return;
        }

        $ticketId = (string) ($bet['ticketId'] ?? $betId);
        $userId = (string) ($bet['userId'] ?? '');
        $betType = (string) ($bet['type'] ?? 'straight');
        $createdAt = (string) ($bet['createdAt'] ?? SqlRepository::nowUtc());
        $updatedAt = (string) ($bet['updatedAt'] ?? SqlRepository::nowUtc());
        foreach (array_values($selectionDocs) as $index => $selection) {
            if (!is_array($selection)) {
                continue;
            }
            $db->insertOne('betselections', self::selectionRowFromTicket(
                $betId,
                $ticketId,
                $userId,
                $betType,
                $selection,
                $index,
                $createdAt,
                $updatedAt
            ));
        }
    }

    /**
     * @param array<string, mixed> $bet
     * @param array<int, array<string, mixed>> $selectionRows
     * @return array<string, mixed>
     */
    public static function enrichBetForResponse(array $bet, array $selectionRows): array
    {
        $sorted = self::sortSelectionRows($selectionRows);
        $bet['ticketId'] = (string) ($bet['ticketId'] ?? ($bet['id'] ?? ''));
        // Ticket money fields preserve 2dp precision — these are
        // exact stored values (DECIMAL(14,2)). ceil() previously
        // rounded a Win-mode parlay's $169.49 risk up to $170 in the
        // response, hiding the actual stake. Settlement reads the
        // stored value directly, so display-side ceil was decorative
        // and broke parity with the bet-review modal.
        $bet['riskAmount'] = (float) round(self::riskAmount($bet), 2);
        $bet['unitStake'] = (float) round(self::unitStake($bet), 2);
        $bet['amount'] = (float) round(self::num($bet['amount'] ?? 0), 2);
        $bet['potentialPayout'] = (float) round(self::num($bet['potentialPayout'] ?? 0), 2);
        if (isset($bet['payout']) && is_numeric($bet['payout'])) {
            $bet['payout'] = (float) round(self::num($bet['payout']), 2);
        }
        if (isset($bet['profit']) && is_numeric($bet['profit'])) {
            $bet['profit'] = (float) round(self::num($bet['profit']), 2);
        }
        // Balance snapshots keep ceil — they follow the PPH whole-dollar
        // policy (player should never see a balance lower than what's stored).
        if (isset($bet['balanceBefore']) && is_numeric($bet['balanceBefore'])) {
            $bet['balanceBefore'] = (float) ceil(self::num($bet['balanceBefore']));
        }
        if (isset($bet['balanceAfter']) && is_numeric($bet['balanceAfter'])) {
            $bet['balanceAfter'] = (float) ceil(self::num($bet['balanceAfter']));
        }
        $bet['combinedOdds'] = self::combinedOdds(self::num($bet['riskAmount']), self::num($bet['potentialPayout']));
        $bet['odds'] = self::combinedOdds(self::num($bet['riskAmount']), self::num($bet['potentialPayout']));
        $bet['selections'] = array_map(static fn (array $row): array => self::selectionRowForBetDoc($row), $sorted);
        $bet['description'] = self::descriptionForSelections($sorted);
        return $bet;
    }

    /**
     * @param array<string, mixed> $match
     * @param array<string, mixed> $selection
     */
    public static function selectionResult(array $match, array $selection, ?string $manualWinner = null): string
    {
        $effectiveStatus = SportsMatchStatus::effectiveStatus($match);
        if ($manualWinner !== null) {
            $selectionName = (string) ($selection['selection'] ?? '');
            return $selectionName === $manualWinner ? 'won' : 'lost';
        }

        // Only an explicit cancel signal (operator action OR upstream
        // feed flagging the match as canceled/postponed/abandoned)
        // auto-voids open bets. 'expired' — the catch-all for matches
        // whose feed went quiet past the grace window — used to void
        // here too, but that silently refunded bets we couldn't grade
        // even though the game may have actually been played. Now an
        // expired match stays pending so a human reviews it before
        // money moves. See SportsMatchStatus::effectiveStatus for how
        // 'expired' is produced.
        if ($effectiveStatus === 'canceled') {
            return 'void';
        }

        if ($effectiveStatus !== 'finished') {
            return 'pending';
        }

        $marketType = strtolower((string) ($selection['marketType'] ?? ''));
        $selectionName = (string) ($selection['selection'] ?? '');
        $point = array_key_exists('point', $selection) && is_numeric($selection['point']) ? (float) $selection['point'] : null;
        $homeTeam = (string) ($match['homeTeam'] ?? '');
        $awayTeam = (string) ($match['awayTeam'] ?? '');

        // Resolve the stored marketType (e.g. 'spreads', 'alternate_totals',
        // 'h2h_q1', 'totals_1st_5_innings') into a gradeable base market and
        // an optional period suffix. Returns null for market families we do
        // NOT auto-grade (3-way ML, team totals, BTTS, draw-no-bet, double-
        // chance, player props) — those stay 'pending' for an operator
        // rather than ever risk a wrong auto-grade. Alternate lines collapse
        // to their base (alternate_spreads → spreads); the bet carries its
        // own `point`, so alt grading is identical to the base market.
        $parsed = self::parseGradableMarket($marketType);
        if ($parsed === null) {
            return 'pending';
        }
        $baseMarket = $parsed['base'];     // 'h2h' | 'spreads' | 'totals'
        $periodSuffix = $parsed['suffix']; // null (full game) or 'q1','h1','p2','1st_5_innings', ...

        if ($periodSuffix === null) {
            // Full-game grading. Moneyline uses score_home/score_away as-is
            // (for tennis that is SETS — more sets wins, correct). Spreads/
            // totals use spreadTotalScores() (games for tennis, raw score
            // elsewhere).
            if ($baseMarket === 'h2h') {
                $scoreHome = self::num($match['score']['score_home'] ?? 0);
                $scoreAway = self::num($match['score']['score_away'] ?? 0);
            } else {
                $st = self::spreadTotalScores($match);
                if ($st === null) {
                    return 'pending';
                }
                [$scoreHome, $scoreAway] = $st;
            }
        } else {
            // Period / half / quarter / inning grading. Sum the per-period
            // slice from score_*_by_period. Money-safe: periodScorePair
            // returns null (→ 'pending') whenever the league's period
            // structure is unknown OR the by_period data is too short to
            // cover the requested slice, so a wrong slice can never be
            // graded. Period markets never apply to tennis, so the games-
            // vs-sets distinction above is irrelevant here.
            $ps = self::periodScorePair($match, $periodSuffix);
            if ($ps === null) {
                return 'pending';
            }
            [$scoreHome, $scoreAway] = $ps;
        }

        return self::gradeAgainstScore($baseMarket, $selectionName, $point, $scoreHome, $scoreAway, $homeTeam, $awayTeam);
    }

    /**
     * Grade a single h2h/spreads/totals selection against a resolved score
     * pair. Shared by full-game and period grading so the win/lose/push
     * rules are byte-identical for both. `$point` is the bet's stored line
     * (already buy-points/teaser adjusted upstream).
     */
    private static function gradeAgainstScore(
        string $baseMarket,
        string $selectionName,
        ?float $point,
        float $scoreHome,
        float $scoreAway,
        string $homeTeam,
        string $awayTeam
    ): string {
        if ($baseMarket === 'h2h') {
            $side = self::resolveSelectionSide($selectionName, $homeTeam, $awayTeam);
            if ($scoreHome > $scoreAway) {
                if ($side === 'home') return 'won';
                if ($side === 'away') return 'lost';
                // Decisive result but the pick is neither side: a Draw bet
                // loses; anything else we can't tie to a side stays pending
                // for an operator rather than a wrong auto-loss.
                return strcasecmp($selectionName, 'Draw') === 0 ? 'lost' : 'pending';
            }
            if ($scoreAway > $scoreHome) {
                if ($side === 'away') return 'won';
                if ($side === 'home') return 'lost';
                return strcasecmp($selectionName, 'Draw') === 0 ? 'lost' : 'pending';
            }
            return strcasecmp($selectionName, 'Draw') === 0 ? 'won' : 'void';
        }

        if ($baseMarket === 'spreads' && $point !== null) {
            $side = self::resolveSelectionSide($selectionName, $homeTeam, $awayTeam);
            if ($side === 'home') {
                $adjusted = $scoreHome + $point;
                if ($adjusted > $scoreAway) return 'won';
                if ($adjusted === $scoreAway) return 'void';
                return 'lost';
            }
            if ($side === 'away') {
                $adjusted = $scoreAway + $point;
                if ($adjusted > $scoreHome) return 'won';
                if ($adjusted === $scoreHome) return 'void';
                return 'lost';
            }
            return 'pending'; // couldn't tie the pick to a side
        }

        if ($baseMarket === 'totals' && $point !== null) {
            $total = $scoreHome + $scoreAway;
            $isOver = str_contains(strtolower($selectionName), 'over');
            if ($isOver) {
                if ($total > $point) return 'won';
                if ($total === $point) return 'void';
                return 'lost';
            }
            if ($total < $point) return 'won';
            if ($total === $point) return 'void';
            return 'lost';
        }

        return 'pending';
    }

    /**
     * Split a stored marketType into the gradeable base market + optional
     * period suffix, or null when the market family is not auto-gradeable.
     *
     * Supported (auto-graded): h2h / spreads / totals, their `alternate_`
     * forms, and their period variants (_q1.._q4, _h1/_h2, _p1.._p3,
     * _1st_{1,3,5,7}_innings).
     *
     * NOT auto-graded (→ null → stays pending for an operator): 3-way ML
     * (h2h_3_way*), team totals, BTTS, draw-no-bet, double-chance, corners/
     * cards, and every player prop. These either need a result dimension
     * the score doc doesn't carry (props, corners) or have house-rule
     * nuances (3-way regulation/OT) we will not guess at.
     *
     * @return array{base:string, suffix:?string}|null
     */
    private static function parseGradableMarket(string $marketType): ?array
    {
        $mt = trim(strtolower($marketType));
        if ($mt === '') {
            return null;
        }
        // Alternate lines grade exactly like their base — the differing line
        // is already stored on the bet as `point`.
        if (str_starts_with($mt, 'alternate_')) {
            $mt = substr($mt, strlen('alternate_'));
        }
        // Full-game base markets.
        if (in_array($mt, ['h2h', 'moneyline', 'ml', 'straight'], true)) {
            return ['base' => 'h2h', 'suffix' => null];
        }
        if ($mt === 'spreads') {
            return ['base' => 'spreads', 'suffix' => null];
        }
        if ($mt === 'totals') {
            return ['base' => 'totals', 'suffix' => null];
        }
        // Period variants: base_<suffix>, base ∈ {h2h,spreads,totals} and the
        // suffix is one we know how to map to by_period indices. Anything
        // else under those prefixes (e.g. h2h_3_way, totals_corners) is
        // intentionally rejected.
        $knownSuffixes = [
            'q1', 'q2', 'q3', 'q4',
            'h1', 'h2',
            'p1', 'p2', 'p3',
            '1st_1_innings', '1st_3_innings', '1st_5_innings', '1st_7_innings',
        ];
        foreach (['h2h', 'spreads', 'totals'] as $base) {
            $prefix = $base . '_';
            if (str_starts_with($mt, $prefix)) {
                $suffix = substr($mt, strlen($prefix));
                if (in_array($suffix, $knownSuffixes, true)) {
                    return ['base' => $base, 'suffix' => $suffix];
                }
                return null; // unsupported variant under a known base
            }
        }
        return null;
    }

    /**
     * Resolve the (home, away) score for a period market by summing the
     * appropriate per-period slice of score_*_by_period.
     *
     * Money-safe by construction: returns null (caller leaves the leg
     * pending) whenever
     *   - by_period data is missing/empty,
     *   - the league's period structure for this suffix is unknown, or
     *   - the by_period array is shorter than the period structure requires
     *     (e.g. a halves-only league's 2-element array can never be graded
     *     as quarters — that guard prevents summing the whole game into an
     *     "H1" bet and mis-paying it).
     *
     * @param array<string,mixed> $match
     * @return array{0:float,1:float}|null
     */
    private static function periodScorePair(array $match, string $suffix): ?array
    {
        $score = is_array($match['score'] ?? null) ? $match['score'] : [];
        $homeBy = is_array($score['score_home_by_period'] ?? null) ? array_values($score['score_home_by_period']) : [];
        $awayBy = is_array($score['score_away_by_period'] ?? null) ? array_values($score['score_away_by_period']) : [];
        if ($homeBy === [] || $awayBy === []) {
            return null;
        }
        $plan = self::periodIndices(strtolower((string) ($match['sportKey'] ?? '')), $suffix);
        if ($plan === null) {
            return null;
        }
        [$indices, $minPeriods] = $plan;
        if (count($homeBy) < $minPeriods || count($awayBy) < $minPeriods) {
            return null;
        }
        $home = 0.0;
        $away = 0.0;
        foreach ($indices as $i) {
            if (!array_key_exists($i, $homeBy) || !array_key_exists($i, $awayBy)) {
                return null;
            }
            if (!is_numeric($homeBy[$i]) || !is_numeric($awayBy[$i])) {
                return null;
            }
            $home += (float) $homeBy[$i];
            $away += (float) $awayBy[$i];
        }
        return [$home, $away];
    }

    /**
     * Map a (sportKey, period suffix) to the by_period indices to sum and
     * the minimum array length that proves the league actually uses that
     * period structure. Returns null when we can't be certain.
     *
     * by_period is per-period scoring (points/goals/runs in THAT period,
     * not cumulative) — the same convention the tennis spread/total grading
     * already relies on in production. Period markets exclude overtime by
     * construction: they only sum specific regulation-period indices, while
     * full-game markets use score_home/away (which include OT).
     *
     * @return array{0:int[],1:int}|null  [indices, minPeriods]
     */
    private static function periodIndices(string $sportKey, string $suffix): ?array
    {
        // Hockey periods (NHL plays three 20-min periods).
        $hockey = ['p1' => [0], 'p2' => [1], 'p3' => [2]];
        if (isset($hockey[$suffix])) {
            return [$hockey[$suffix], 3];
        }
        // Quarters (basketball/football leagues that play four quarters).
        $quarters = ['q1' => [0], 'q2' => [1], 'q3' => [2], 'q4' => [3]];
        if (isset($quarters[$suffix])) {
            return [$quarters[$suffix], 4];
        }
        // Baseball inning splits — sum per-inning runs for the first N innings.
        $innings = ['1st_1_innings' => 1, '1st_3_innings' => 3, '1st_5_innings' => 5, '1st_7_innings' => 7];
        if (isset($innings[$suffix])) {
            $n = $innings[$suffix];
            return [range(0, $n - 1), $n];
        }
        // Halves — structure depends on the league's period layout:
        //   • soccer: by_period is two halves           → H1=[0], H2=[1]
        //   • NCAAB: genuinely two 20-min halves         → H1=[0], H2=[1]
        //   • other basketball + football: four quarters → H1=[0,1], H2=[2,3]
        // Unknown sports return null (stay pending) rather than guess. The
        // minPeriods guard (2 for true halves, 4 for quarter-leagues) stops
        // a halves-only array from being graded as quarters.
        if ($suffix === 'h1' || $suffix === 'h2') {
            if (str_starts_with($sportKey, 'soccer') || $sportKey === 'basketball_ncaab') {
                return $suffix === 'h1' ? [[0], 2] : [[1], 2];
            }
            if (str_starts_with($sportKey, 'basketball') || str_starts_with($sportKey, 'americanfootball')) {
                return $suffix === 'h1' ? [[0, 1], 4] : [[2, 3], 4];
            }
            return null;
        }
        return null;
    }

    /**
     * Home/away scores in the units that SPREAD and TOTAL markets are priced
     * in. Most sports: score_home/score_away (points / runs / goals). Tennis:
     * the board spread (e.g. -3.5) and total (e.g. 22.5) are GAMES, but
     * score_home/score_away are SETS — so sum the per-set games from
     * score_*_by_period. Moneyline still uses the set score (more sets wins),
     * so this is ONLY for spreads/totals.
     *
     * Returns null when a games-based sport has no per-period data to sum, so
     * the caller leaves the bet PENDING rather than grading it against the
     * wrong unit. Money-safe: never invent a number.
     *
     * @param array<string,mixed> $match
     * @return array{0:float,1:float}|null
     */
    private static function spreadTotalScores(array $match): ?array
    {
        $score = is_array($match['score'] ?? null) ? $match['score'] : [];
        $sportKey = strtolower((string) ($match['sportKey'] ?? ''));

        if (str_starts_with($sportKey, 'tennis')) {
            $homeBy = is_array($score['score_home_by_period'] ?? null) ? $score['score_home_by_period'] : [];
            $awayBy = is_array($score['score_away_by_period'] ?? null) ? $score['score_away_by_period'] : [];
            if ($homeBy === [] && $awayBy === []) {
                return null;
            }
            $homeGames = 0.0;
            foreach ($homeBy as $g) {
                if (is_numeric($g)) $homeGames += (float) $g;
            }
            $awayGames = 0.0;
            foreach ($awayBy as $g) {
                if (is_numeric($g)) $awayGames += (float) $g;
            }
            return [$homeGames, $awayGames];
        }

        return [self::num($score['score_home'] ?? 0), self::num($score['score_away'] ?? 0)];
    }

    /**
     * Tie a selection name to the home or away side, tolerant to short vs full
     * forms ("Huesler" ↔ "M. Huesler"). Returns 'home', 'away', or null.
     * null whenever resolution is AMBIGUOUS (matches both) or matches neither,
     * so settlement can never grade against the wrong side — a null lands the
     * leg in 'pending' for an operator. Mirrors BetsController::resolveTeamSide.
     */
    private static function resolveSelectionSide(string $selection, string $home, string $away): ?string
    {
        $s = strtolower(trim($selection));
        $h = strtolower(trim($home));
        $a = strtolower(trim($away));
        if ($s === '') {
            return null;
        }
        $matchesHome = $h !== '' && ($s === $h || str_contains($s, $h) || str_contains($h, $s));
        $matchesAway = $a !== '' && ($s === $a || str_contains($s, $a) || str_contains($a, $s));
        if ($matchesHome && !$matchesAway) {
            return 'home';
        }
        if ($matchesAway && !$matchesHome) {
            return 'away';
        }
        return null;
    }

    /**
     * @param array<string, mixed> $bet
     * @param array<int, array<string, mixed>> $selectionRows
     * @param array<string, mixed> $teaserRule
     * @return array{status: string, payout: float}
     */
    public static function evaluateTicket(array $bet, array $selectionRows, array $teaserRule = []): array
    {
        $type = strtolower((string) ($bet['type'] ?? 'straight'));
        $riskAmount = self::riskAmount($bet);
        $unitStake = self::unitStake($bet);
        $rows = self::sortSelectionRows($selectionRows);

        if ($rows === []) {
            return ['status' => 'pending', 'payout' => self::num($bet['potentialPayout'] ?? 0)];
        }

        if ($type === 'straight') {
            $straight = self::settleStraightLeg($rows[0], $riskAmount);
            return ['status' => $straight['status'], 'payout' => round($straight['payout'])];
        }

        if ($type === 'parlay') {
            $statuses = array_map(static fn (array $row): string => (string) ($row['status'] ?? 'pending'), $rows);
            if (in_array('lost', $statuses, true)) {
                return ['status' => 'lost', 'payout' => 0.0];
            }
            if (in_array('pending', $statuses, true)) {
                return ['status' => 'pending', 'payout' => self::num($bet['potentialPayout'] ?? 0)];
            }

            $wonRows = array_values(array_filter($rows, static fn (array $row): bool => (string) ($row['status'] ?? '') === 'won'));
            if ($wonRows === []) {
                return ['status' => 'void', 'payout' => $riskAmount];
            }

            $combined = 1.0;
            foreach ($wonRows as $row) {
                $combined *= self::num($row['odds'] ?? 0);
            }
            return ['status' => 'won', 'payout' => round($riskAmount * $combined)];
        }

        if ($type === 'teaser') {
            // Snapshot ties rule from bet doc (set at placement time so
            // an operator who changes type config later can't retroact-
            // ively flip a placed ticket's push semantics). Default to
            // 'push' for legacy bets without a snapshot — matches the
            // historical behavior where a tie-on-line graded as void
            // and reduced the effective leg count.
            $tiesRule = strtolower((string) ($bet['teaserTiesRule'] ?? 'push'));
            if ($tiesRule === 'lose') {
                // Re-classify void legs as lost in-memory only — the
                // betselections row stays 'void' (the leg WAS a tie),
                // but for grading the WHOLE TICKET we treat it as a
                // loss per the type's rule. The next branch's
                // in_array('lost', ...) shortcut then takes effect.
                $rows = array_map(static function (array $row): array {
                    if ((string) ($row['status'] ?? '') === 'void') {
                        $row['status'] = 'lost';
                    }
                    return $row;
                }, $rows);
            }

            $statuses = array_map(static fn (array $row): string => (string) ($row['status'] ?? 'pending'), $rows);
            if (in_array('lost', $statuses, true)) {
                return ['status' => 'lost', 'payout' => 0.0];
            }
            if (in_array('pending', $statuses, true)) {
                return ['status' => 'pending', 'payout' => self::num($bet['potentialPayout'] ?? 0)];
            }

            $wonCount = count(array_filter($rows, static fn (array $row): bool => (string) ($row['status'] ?? '') === 'won'));
            if ($wonCount === 0) {
                return ['status' => 'void', 'payout' => $riskAmount];
            }
            // Pushes reduce the effective leg count. Below the 2-team
            // minimum a teaser is non-product — refund the stake. Books
            // diverge here (some grade as a single straight at -110);
            // we follow the more conservative refund convention so the
            // player isn't surprised by a tiny payout on a "wreckage"
            // ticket. Matches the spec: "If reduced leg count < 2,
            // void the entire teaser."
            if ($wonCount < 2) {
                return ['status' => 'void', 'payout' => $riskAmount];
            }

            // Type-specific multipliers when the bet snapshotted a
            // teaserTypeId at placement. The fallback rule's
            // payoutProfile only applies to legacy placements that
            // didn't pick a type. Falls through transparently if the
            // type id is unknown (e.g. type was deleted from DB
            // post-placement).
            $effectivePayoutProfile = self::resolveTeaserPayoutProfile($bet, $teaserRule);
            $effectiveRule = is_array($effectivePayoutProfile) && $effectivePayoutProfile !== []
                ? array_merge($teaserRule, ['payoutProfile' => $effectivePayoutProfile])
                : $teaserRule;

            return [
                'status' => 'won',
                'payout' => round($riskAmount * self::teaserMultiplier($effectiveRule, $wonCount)),
            ];
        }

        if ($type === 'if_bet') {
            $result = self::evaluateIfBet($rows, $unitStake);
            return ['status' => $result['status'], 'payout' => round($result['payout'])];
        }

        if ($type === 'reverse') {
            $resultA = self::evaluateIfBet([$rows[0] ?? [], $rows[1] ?? []], $unitStake);
            $resultB = self::evaluateIfBet([$rows[1] ?? [], $rows[0] ?? []], $unitStake);

            if ($resultA['status'] === 'pending' || $resultB['status'] === 'pending') {
                return ['status' => 'pending', 'payout' => self::num($bet['potentialPayout'] ?? 0)];
            }

            $totalPayout = round($resultA['payout'] + $resultB['payout']);
            if ($resultA['status'] === 'void' && $resultB['status'] === 'void') {
                return ['status' => 'void', 'payout' => $riskAmount];
            }
            if ($totalPayout > 0) {
                return ['status' => 'won', 'payout' => $totalPayout];
            }
            return ['status' => 'lost', 'payout' => 0.0];
        }

        return ['status' => 'pending', 'payout' => self::num($bet['potentialPayout'] ?? 0)];
    }

    /**
     * @param array<int, array<string, mixed>> $selectionRows
     */
    public static function descriptionForSelections(array $selectionRows): string
    {
        $sorted = self::sortSelectionRows($selectionRows);
        $lines = [];
        foreach ($sorted as $selection) {
            $snapshot = is_array($selection['matchSnapshot'] ?? null) ? $selection['matchSnapshot'] : [];
            $matchLabel = trim((string) (($snapshot['homeTeam'] ?? 'Match') . ' vs ' . ($snapshot['awayTeam'] ?? '')));
            $marketType = strtoupper((string) ($selection['marketType'] ?? ''));
            $selectionName = (string) ($selection['selection'] ?? 'Selection');
            $pointLabel = self::lineLabel($selection);
            $lines[] = trim($matchLabel . ' | ' . $marketType . ' | ' . $selectionName . ($pointLabel !== '' ? ' ' . $pointLabel : '') . ' @ ' . number_format(self::num($selection['odds'] ?? 0), 2));
        }
        return implode("\n", $lines);
    }

    /**
     * @param array<string, mixed> $bet
     */
    public static function riskAmount(array $bet): float
    {
        $risk = self::num($bet['riskAmount'] ?? 0);
        if ($risk > 0) {
            return $risk;
        }
        $amount = self::num($bet['amount'] ?? 0);
        return $amount > 0 ? $amount : 0.0;
    }

    /**
     * @param array<string, mixed> $bet
     */
    public static function unitStake(array $bet): float
    {
        $unitStake = self::num($bet['unitStake'] ?? 0);
        if ($unitStake > 0) {
            return $unitStake;
        }

        $type = strtolower((string) ($bet['type'] ?? 'straight'));
        $amount = self::num($bet['amount'] ?? 0);
        if ($type === 'reverse') {
            return $amount > 0 ? round($amount / 2.0) : 0.0;
        }
        return $amount;
    }

    /**
     * @param array<string, mixed> $selection
     * @return array<string, mixed>
     */
    public static function selectionRowForBetDoc(array $selection): array
    {
        $americanOdds = isset($selection['oddsAmerican']) && is_numeric($selection['oddsAmerican'])
            ? (int) $selection['oddsAmerican']
            : null;
        return [
            'matchId' => $selection['matchId'] ?? null,
            'selection' => $selection['selection'] ?? null,
            'odds' => self::num($selection['odds'] ?? 0),
            'oddsAmerican' => $americanOdds,
            'marketType' => $selection['marketType'] ?? null,
            'point' => isset($selection['point']) && is_numeric($selection['point']) ? (float) $selection['point'] : null,
            'basePoint' => isset($selection['basePoint']) && is_numeric($selection['basePoint']) ? (float) $selection['basePoint'] : null,
            'teaserAdjustment' => isset($selection['teaserAdjustment']) && is_numeric($selection['teaserAdjustment']) ? (float) $selection['teaserAdjustment'] : null,
            'status' => $selection['status'] ?? 'pending',
            'matchSnapshot' => $selection['matchSnapshot'] ?? new stdClass(),
            // Final scores (populated by BetSettlementService when the match
            // finishes) so the per-leg drill-down can render "Lost (99 — 105)"
            // without a separate match lookup. Null on pending legs.
            'finalHomeScore' => isset($selection['finalHomeScore']) && is_numeric($selection['finalHomeScore'])
                ? (float) $selection['finalHomeScore']
                : null,
            'finalAwayScore' => isset($selection['finalAwayScore']) && is_numeric($selection['finalAwayScore'])
                ? (float) $selection['finalAwayScore']
                : null,
            'settledAt' => $selection['settledAt'] ?? null,
            'note' => isset($selection['note']) ? (string) $selection['note'] : null,
            // Surfacing 'push_tie' here lets the My Bets view render a
            // PUSH badge on tied teaser legs without re-deriving the
            // result from match scores client-side. Null when the leg
            // didn't grade as void or when the void was for an
            // unrelated reason (e.g. early-resolved h2h).
            'gradeReason' => isset($selection['gradeReason']) && is_string($selection['gradeReason'])
                ? $selection['gradeReason']
                : null,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    public static function sortSelectionRows(array $rows): array
    {
        usort($rows, static function (array $a, array $b): int {
            return ((int) ($a['selectionOrder'] ?? 0)) <=> ((int) ($b['selectionOrder'] ?? 0));
        });
        return $rows;
    }

    /**
     * @param array<string, mixed> $bet
     * @param array<int, array<string, mixed>> $selectionRows
     */
    public static function selectionRowsToBetSelections(array $bet, array $selectionRows): array
    {
        $sorted = self::sortSelectionRows($selectionRows);
        return array_map(static fn (array $row): array => self::selectionRowForBetDoc($row), $sorted);
    }

    /**
     * @param array<string, mixed> $selection
     */
    private static function lineLabel(array $selection): string
    {
        if (!isset($selection['point']) || !is_numeric($selection['point'])) {
            return '';
        }
        $marketType = strtolower((string) ($selection['marketType'] ?? ''));
        $point = (float) $selection['point'];
        if ($marketType === 'totals') {
            return '(' . number_format($point, 2) . ')';
        }
        return '(' . ($point > 0 ? '+' : '') . number_format($point, 2) . ')';
    }

    /**
     * @param array<string, mixed> $selection
     * @return array{status: string, payout: float}
     */
    private static function settleStraightLeg(array $selection, float $stake): array
    {
        $status = (string) ($selection['status'] ?? 'pending');
        if ($status === 'pending') {
            return ['status' => 'pending', 'payout' => 0.0];
        }
        if ($status === 'void') {
            return ['status' => 'void', 'payout' => $stake];
        }
        if ($status === 'won') {
            return ['status' => 'won', 'payout' => $stake * self::num($selection['odds'] ?? 0)];
        }
        return ['status' => 'lost', 'payout' => 0.0];
    }

    /**
     * @param array<int, array<string, mixed>> $legs
     * @return array{status: string, payout: float}
     */
    private static function evaluateIfBet(array $legs, float $stake): array
    {
        $first = $legs[0] ?? null;
        $second = $legs[1] ?? null;
        if (!is_array($first) || !is_array($second)) {
            return ['status' => 'pending', 'payout' => 0.0];
        }

        $firstOutcome = self::settleStraightLeg($first, $stake);
        if ($firstOutcome['status'] === 'pending') {
            return ['status' => 'pending', 'payout' => 0.0];
        }
        if ($firstOutcome['status'] === 'lost') {
            return ['status' => 'lost', 'payout' => 0.0];
        }
        if ($firstOutcome['status'] === 'void') {
            return self::settleStraightLeg($second, $stake);
        }

        $secondStatus = (string) ($second['status'] ?? 'pending');
        if ($secondStatus === 'pending') {
            return ['status' => 'pending', 'payout' => 0.0];
        }
        if ($secondStatus === 'lost') {
            return ['status' => 'lost', 'payout' => 0.0];
        }
        if ($secondStatus === 'void') {
            return ['status' => 'won', 'payout' => $stake * self::num($first['odds'] ?? 0)];
        }
        return ['status' => 'won', 'payout' => $stake * self::num($first['odds'] ?? 0) * self::num($second['odds'] ?? 0)];
    }

    /**
     * @param array<string, mixed> $rule
     */
    private static function teaserMultiplier(array $rule, int $legCount): float
    {
        $multipliers = is_array($rule['payoutProfile']['multipliers'] ?? null) ? $rule['payoutProfile']['multipliers'] : [];
        $raw = $multipliers[(string) $legCount] ?? null;
        $value = is_numeric($raw) ? (float) $raw : 1.0;
        return $value > 0 ? $value : 1.0;
    }

    /**
     * Resolve the payoutProfile to use for a teaser bet. Priority:
     *   1. `bet.teaserPayoutSnapshot` — multipliers frozen at placement
     *      so a rule/type edit can never re-price an in-flight bet
     *      (the bettor was promised these odds; we honor them).
     *   2. The matching `teaserTypeId`'s payoutProfile from the live
     *      rule — used for legacy bets placed before the snapshot
     *      field shipped (no `teaserPayoutSnapshot` on the doc).
     *   3. The rule-level payoutProfile fallback — covers bets placed
     *      with no type id at all.
     *
     * @param array<string, mixed> $bet
     * @param array<string, mixed> $teaserRule
     * @return array<string, mixed>
     */
    private static function resolveTeaserPayoutProfile(array $bet, array $teaserRule): array
    {
        $snapshot = $bet['teaserPayoutSnapshot'] ?? null;
        if (is_array($snapshot)
            && isset($snapshot['multipliers'])
            && is_array($snapshot['multipliers'])
            && $snapshot['multipliers'] !== []) {
            return $snapshot;
        }
        $typeId = trim((string) ($bet['teaserTypeId'] ?? ''));
        if ($typeId !== '' && isset($teaserRule['teaserTypes']) && is_array($teaserRule['teaserTypes'])) {
            foreach ($teaserRule['teaserTypes'] as $type) {
                if (!is_array($type)) {
                    continue;
                }
                if ((string) ($type['id'] ?? '') === $typeId
                    && isset($type['payoutProfile'])
                    && is_array($type['payoutProfile'])) {
                    return $type['payoutProfile'];
                }
            }
        }
        return is_array($teaserRule['payoutProfile'] ?? null) ? $teaserRule['payoutProfile'] : [];
    }

    /**
     * For a leg that just graded as 'void', infer the grade reason
     * (`push_tie` for an exact tie on the adjusted line on a finished
     * match, `match_canceled` for a canceled/expired match, null when
     * neither applies). Used by the settlement service to persist a
     * machine-readable reason on the betselections row so the My Bets
     * view can render a "PUSH" badge for tied teaser legs without
     * inferring it from match status at render time.
     *
     * @param array<string, mixed> $match
     * @param array<string, mixed> $leg
     */
    public static function gradeReasonForVoidLeg(array $match, array $leg): ?string
    {
        // Mirrors the cancel-only void policy in selectionResult: only
        // an explicit cancel becomes a void with a 'match_canceled'
        // reason. An expired match shouldn't have graded as void in
        // the first place, but if a legacy void slipped through with
        // effectiveStatus='expired', we still surface a reason rather
        // than leaving the chip without a tooltip.
        $effective = SportsMatchStatus::effectiveStatus($match);
        if ($effective === 'canceled' || $effective === 'expired') {
            return 'match_canceled';
        }
        if ($effective !== 'finished') {
            return null;
        }
        $marketType = strtolower((string) ($leg['marketType'] ?? ''));
        if ($marketType !== 'spreads' && $marketType !== 'totals') {
            return null;
        }
        $point = isset($leg['point']) && is_numeric($leg['point']) ? (float) $leg['point'] : null;
        if ($point === null) {
            return null;
        }
        // Same unit-correct scores as selectionResult (games for tennis).
        $st = self::spreadTotalScores($match);
        if ($st === null) {
            return null;
        }
        [$scoreHome, $scoreAway] = $st;
        if ($marketType === 'spreads') {
            $side = self::resolveSelectionSide(
                (string) ($leg['selection'] ?? ''),
                (string) ($match['homeTeam'] ?? ''),
                (string) ($match['awayTeam'] ?? '')
            );
            if ($side === 'home' && ($scoreHome + $point) === $scoreAway) {
                return 'push_tie';
            }
            if ($side === 'away' && ($scoreAway + $point) === $scoreHome) {
                return 'push_tie';
            }
            return null;
        }
        // totals
        if (($scoreHome + $scoreAway) === $point) {
            return 'push_tie';
        }
        return null;
    }

    /**
     * @param array<string, mixed> $selection
     * @return array<string, mixed>
     */
    private static function selectionRowFromTicket(
        string $betId,
        string $ticketId,
        string $userId,
        string $betType,
        array $selection,
        int $index,
        string $createdAt,
        string $updatedAt
    ): array {
        $rowId = substr(hash('sha256', $betId . '|' . $index), 0, 24);
        $point = isset($selection['point']) && is_numeric($selection['point']) ? (float) $selection['point'] : null;
        $basePoint = isset($selection['basePoint']) && is_numeric($selection['basePoint']) ? (float) $selection['basePoint'] : $point;
        $americanOdds = isset($selection['oddsAmerican']) && is_numeric($selection['oddsAmerican'])
            ? (int) $selection['oddsAmerican']
            : null;
        // Outright bets carry an outrightId pointing at the outrights row.
        // OutrightSettlementService finds pending legs via the
        // idx_betselections_outright_status index on j_outright_id; if we
        // drop the field here, settlement would never find them.
        $outrightId = (string) ($selection['outrightId'] ?? '');
        return [
            'id' => $rowId,
            'betId' => $betId,
            'ticketId' => $ticketId,
            'userId' => $userId,
            'betType' => $betType,
            'selectionOrder' => $index,
            'matchId' => SqlRepository::id((string) ($selection['matchId'] ?? '')),
            'outrightId' => $outrightId !== '' ? SqlRepository::id($outrightId) : null,
            'selection' => (string) ($selection['selection'] ?? ''),
            'odds' => self::num($selection['odds'] ?? 0),
            'oddsAmerican' => $americanOdds,
            'marketType' => (string) ($selection['marketType'] ?? ''),
            'point' => $point,
            'basePoint' => $basePoint,
            'teaserAdjustment' => isset($selection['teaserAdjustment']) && is_numeric($selection['teaserAdjustment']) ? (float) $selection['teaserAdjustment'] : 0.0,
            'status' => (string) ($selection['status'] ?? 'pending'),
            'matchSnapshot' => $selection['matchSnapshot'] ?? new stdClass(),
            'createdAt' => $createdAt,
            'updatedAt' => $updatedAt,
        ];
    }

    /**
     * @param array<string, mixed> $value
     * @return array<string, mixed>
     */
    private static function sortRecursively(array $value): array
    {
        ksort($value);
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                if (array_is_list($item)) {
                    $value[$key] = array_map(static function ($entry) {
                        return is_array($entry) ? self::sortRecursively($entry) : $entry;
                    }, $item);
                } else {
                    $value[$key] = self::sortRecursively($item);
                }
            }
        }
        return $value;
    }

    private static function num(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        if (is_string($value) && $value !== '') {
            return (float) $value;
        }
        if (is_array($value)) {
            if (isset($value['$numberDecimal'])) {
                return (float) $value['$numberDecimal'];
            }
            if (isset($value['value'])) {
                return (float) $value['value'];
            }
        }
        return 0.0;
    }
}
