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
        $scoreHome = self::num($match['score']['score_home'] ?? 0);
        $scoreAway = self::num($match['score']['score_away'] ?? 0);
        $total = $scoreHome + $scoreAway;

        if (in_array($marketType, ['h2h', 'moneyline', 'ml', 'straight'], true)) {
            if ($scoreHome > $scoreAway) {
                return $selectionName === $homeTeam ? 'won' : 'lost';
            }
            if ($scoreAway > $scoreHome) {
                return $selectionName === $awayTeam ? 'won' : 'lost';
            }
            return $selectionName === 'Draw' ? 'won' : 'void';
        }

        if ($marketType === 'spreads' && $point !== null) {
            if ($selectionName === $homeTeam) {
                $adjusted = $scoreHome + $point;
                if ($adjusted > $scoreAway) {
                    return 'won';
                }
                if ($adjusted === $scoreAway) {
                    return 'void';
                }
                return 'lost';
            }

            if ($selectionName === $awayTeam) {
                $adjusted = $scoreAway + $point;
                if ($adjusted > $scoreHome) {
                    return 'won';
                }
                if ($adjusted === $scoreHome) {
                    return 'void';
                }
                return 'lost';
            }
        }

        if ($marketType === 'totals' && $point !== null) {
            $isOver = str_contains(strtolower($selectionName), 'over');
            if ($isOver) {
                if ($total > $point) {
                    return 'won';
                }
                if ($total === $point) {
                    return 'void';
                }
                return 'lost';
            }

            if ($total < $point) {
                return 'won';
            }
            if ($total === $point) {
                return 'void';
            }
            return 'lost';
        }

        return 'pending';
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
        $scoreHome = self::num($match['score']['score_home'] ?? 0);
        $scoreAway = self::num($match['score']['score_away'] ?? 0);
        if ($marketType === 'spreads') {
            $homeTeam = (string) ($match['homeTeam'] ?? '');
            $awayTeam = (string) ($match['awayTeam'] ?? '');
            $selectionName = (string) ($leg['selection'] ?? '');
            if ($selectionName === $homeTeam && ($scoreHome + $point) === $scoreAway) {
                return 'push_tie';
            }
            if ($selectionName === $awayTeam && ($scoreAway + $point) === $scoreHome) {
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
