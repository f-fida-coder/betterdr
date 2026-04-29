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
    public static function calculatePotentialPayout(string $betType, float $unitStake, array $validatedSelections, array $rule): float
    {
        if ($unitStake <= 0 || $validatedSelections === []) {
            return 0.0;
        }

        if ($betType === 'straight') {
            return round($unitStake * self::num($validatedSelections[0]['odds'] ?? 0));
        }

        if ($betType === 'parlay' || $betType === 'if_bet') {
            $combined = 1.0;
            foreach ($validatedSelections as $selection) {
                $combined *= self::num($selection['odds'] ?? 0);
            }
            return round($unitStake * $combined);
        }

        if ($betType === 'teaser') {
            return round($unitStake * self::teaserMultiplier($rule, count($validatedSelections)));
        }

        if ($betType === 'reverse') {
            $combined = 1.0;
            foreach ($validatedSelections as $selection) {
                $combined *= self::num($selection['odds'] ?? 0);
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
        $bet['riskAmount'] = (float) ceil(self::riskAmount($bet));
        $bet['unitStake'] = (float) ceil(self::unitStake($bet));
        $bet['amount'] = (float) ceil(self::num($bet['amount'] ?? 0));
        $bet['potentialPayout'] = (float) ceil(self::num($bet['potentialPayout'] ?? 0));
        if (isset($bet['payout']) && is_numeric($bet['payout'])) {
            $bet['payout'] = (float) ceil(self::num($bet['payout']));
        }
        if (isset($bet['profit']) && is_numeric($bet['profit'])) {
            $bet['profit'] = (float) ceil(self::num($bet['profit']));
        }
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

        if (in_array($effectiveStatus, ['canceled', 'expired'], true)) {
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

            return [
                'status' => 'won',
                'payout' => round($riskAmount * self::teaserMultiplier($teaserRule, $wonCount)),
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
        return [
            'matchId' => $selection['matchId'] ?? null,
            'selection' => $selection['selection'] ?? null,
            'odds' => self::num($selection['odds'] ?? 0),
            'marketType' => $selection['marketType'] ?? null,
            'point' => isset($selection['point']) && is_numeric($selection['point']) ? (float) $selection['point'] : null,
            'basePoint' => isset($selection['basePoint']) && is_numeric($selection['basePoint']) ? (float) $selection['basePoint'] : null,
            'teaserAdjustment' => isset($selection['teaserAdjustment']) && is_numeric($selection['teaserAdjustment']) ? (float) $selection['teaserAdjustment'] : null,
            'status' => $selection['status'] ?? 'pending',
            'matchSnapshot' => $selection['matchSnapshot'] ?? new stdClass(),
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
        return [
            'id' => $rowId,
            'betId' => $betId,
            'ticketId' => $ticketId,
            'userId' => $userId,
            'betType' => $betType,
            'selectionOrder' => $index,
            'matchId' => SqlRepository::id((string) ($selection['matchId'] ?? '')),
            'selection' => (string) ($selection['selection'] ?? ''),
            'odds' => self::num($selection['odds'] ?? 0),
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
