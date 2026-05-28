<?php

declare(strict_types=1);

/**
 * Convert a TheRundown event JSON payload into the codebase's existing
 * matches.doc shape.
 *
 * Three output buckets per event:
 *   - bookmakers[]      — core markets, main lines, period_id=0
 *                         (h2h / spreads / totals / team_totals).
 *                         Rendered by the main odds UI.
 *   - extendedMarkets[] — period markets (Q1-4 / H1-H2 / 5-inning /
 *                         set 1-3) and alt lines on core markets.
 *                         Rendered by the period tab bar / alt lines.
 *   - playerProps[]     — TYPE_PLAYER markets (player_points, etc.).
 *                         Rendered by the prop-builder modal.
 *
 * All three buckets are flat in JSON (no upstream-specific structure)
 * so existing frontend components keep working unchanged.
 */
final class RundownEventMapper
{
    public const ODDS_SOURCE_TAG = 'therundown';
    private const PRICE_OFF_BOARD = 0.0001;

    /**
     * Rundown event_status → matches.doc.status.
     * Anything not listed defaults to 'scheduled' (safer than blocking a row).
     */
    private const STATUS_MAP = [
        'STATUS_SCHEDULED'          => 'scheduled',
        'STATUS_TBD'                => 'scheduled',
        'STATUS_DELAYED'            => 'scheduled',
        'STATUS_RAIN_DELAY'         => 'scheduled',
        'STATUS_NOT_AVAILABLE'      => 'scheduled',
        'STATUS_POSTPONED'          => 'canceled',
        'STATUS_CANCELED'           => 'canceled',
        'STATUS_FORFEIT'            => 'finished',
        'STATUS_FINAL'              => 'finished',
        'STATUS_FINAL_AET'          => 'finished',
        'STATUS_FINAL_PEN'          => 'finished',
        'STATUS_IN_PROGRESS'        => 'live',
        'STATUS_HALFTIME'           => 'live',
        'STATUS_END_PERIOD'         => 'live',
        'STATUS_FIRST_HALF'         => 'live',
        'STATUS_SECOND_HALF'        => 'live',
        'STATUS_OVERTIME'           => 'live',
        'STATUS_SHOOTOUT'           => 'live',
        'STATUS_END_OF_REGULATION'  => 'live',
        'STATUS_SUSPENDED'          => 'live',
        'STATUS_FULL_TIME'          => 'live',
    ];

    /**
     * @param array<string,mixed> $event       Raw Rundown event payload
     * @param string|null         $sportKey    Override sportKey (else derived from sport_id)
     * @return array<string,mixed>|null        matches.doc-shaped array, or null if event is unmappable
     */
    public static function toMatchDoc(array $event, ?string $sportKey = null): ?array
    {
        $eventId = trim((string) ($event['event_id'] ?? ''));
        if ($eventId === '') {
            return null;
        }
        $sportId = (int) ($event['sport_id'] ?? 0);
        if ($sportId <= 0) {
            return null;
        }

        $resolvedSportKey = $sportKey !== null && $sportKey !== ''
            ? strtolower(trim($sportKey))
            : (string) RundownSportMap::sportIdToSportKey($sportId);
        if ($resolvedSportKey === '') {
            return null;
        }

        $teams = is_array($event['teams'] ?? null) ? $event['teams'] : [];
        $home  = self::findTeam($teams, 'home');
        $away  = self::findTeam($teams, 'away');
        if ($home === null || $away === null) {
            return null;
        }

        $score     = is_array($event['score'] ?? null) ? $event['score'] : [];
        $statusRaw = (string) ($score['event_status'] ?? 'STATUS_SCHEDULED');
        $status    = self::STATUS_MAP[$statusRaw] ?? 'scheduled';

        $schedule  = is_array($event['schedule'] ?? null) ? $event['schedule'] : [];
        $eventName = (string) ($schedule['event_name'] ?? '');
        if ($eventName === '') {
            $eventName = trim(((string) ($away['name'] ?? '')) . ' at ' . ((string) ($home['name'] ?? '')));
        }

        $partitioned = self::partitionMarkets(
            is_array($event['markets'] ?? null) ? $event['markets'] : [],
            $resolvedSportKey
        );
        $now = SqlRepository::nowUtc();

        return [
            'id'                => self::deterministicMatchId($eventId),
            'externalId'        => $eventId,
            'homeTeam'          => (string) ($home['name'] ?? ''),
            'awayTeam'          => (string) ($away['name'] ?? ''),
            'homeTeamShort'     => (string) ($home['abbreviation'] ?? ''),
            'awayTeamShort'     => (string) ($away['abbreviation'] ?? ''),
            'homeTeamRecord'    => (string) ($home['record'] ?? ''),
            'awayTeamRecord'    => (string) ($away['record'] ?? ''),
            'broadcast'         => trim((string) ($score['broadcast'] ?? '')),
            'eventName'         => $eventName,
            'startTime'         => (string) ($event['event_date'] ?? $now),
            'sport'             => RundownSportMap::displayName($sportId),
            'sportKey'          => $resolvedSportKey,
            'status'            => $status,
            'odds'              => [
                'bookmakers'       => $partitioned['bookmakers'],
                'extendedMarkets'  => $partitioned['extendedMarkets'],
            ],
            'extendedMarkets'   => $partitioned['extendedMarkets'],
            'playerProps'       => $partitioned['playerProps'],
            'oddsSource'        => self::ODDS_SOURCE_TAG,
            'rundownSportId'    => $sportId,
            'rundownEventUuid'  => (string) ($event['event_uuid'] ?? ''),
            'venueName'         => trim((string) ($score['venue_name'] ?? '')),
            'venueLocation'     => trim((string) ($score['venue_location'] ?? '')),
            'eventStatusDetail' => trim((string) ($score['event_status_detail'] ?? '')),
            'leagueName'        => trim((string) ($schedule['league_name'] ?? '')),
            'seasonType'        => trim((string) ($schedule['season_type'] ?? '')),
            'score'             => [
                'score_home'           => (int) ($score['score_home'] ?? 0),
                'score_away'           => (int) ($score['score_away'] ?? 0),
                'score_home_by_period' => is_array($score['score_home_by_period'] ?? null) ? $score['score_home_by_period'] : [],
                'score_away_by_period' => is_array($score['score_away_by_period'] ?? null) ? $score['score_away_by_period'] : [],
                'game_clock'           => $score['game_clock'] ?? null,
                'display_clock'        => (string) ($score['display_clock'] ?? ''),
                'game_period'          => (int) ($score['game_period'] ?? 0),
                'event_status'         => $statusRaw,
            ],
            'lastUpdated'       => $now,
            'lastOddsSyncAt'    => $now,
            'lastScoreSyncAt'   => $now,
            'updatedAt'         => $now,
            'createdAt'         => $now,
        ];
    }

    /**
     * Score-only update payload — used by the live tick when we want to
     * refresh score/status without rewriting the bookmakers array (delta
     * polling brings price changes; score updates come from the full
     * event payload's score block).
     *
     * @return array<string,mixed>
     */
    public static function scoreUpdate(array $event): array
    {
        $score = is_array($event['score'] ?? null) ? $event['score'] : [];
        $statusRaw = (string) ($score['event_status'] ?? 'STATUS_SCHEDULED');
        $status    = self::STATUS_MAP[$statusRaw] ?? 'scheduled';
        $now = SqlRepository::nowUtc();
        return [
            'status'            => $status,
            'eventStatusDetail' => trim((string) ($score['event_status_detail'] ?? '')),
            'score'             => [
                'score_home'           => (int) ($score['score_home'] ?? 0),
                'score_away'           => (int) ($score['score_away'] ?? 0),
                'score_home_by_period' => is_array($score['score_home_by_period'] ?? null) ? $score['score_home_by_period'] : [],
                'score_away_by_period' => is_array($score['score_away_by_period'] ?? null) ? $score['score_away_by_period'] : [],
                'game_clock'           => $score['game_clock'] ?? null,
                'display_clock'        => (string) ($score['display_clock'] ?? ''),
                'game_period'          => (int) ($score['game_period'] ?? 0),
                'event_status'         => $statusRaw,
            ],
            'lastScoreSyncAt'   => $now,
            'lastUpdated'       => $now,
            'updatedAt'         => $now,
        ];
    }

    /** Deterministic 24-hex match id from a Rundown event_id (re-sync-safe). */
    public static function deterministicMatchId(string $rundownEventId): string
    {
        return substr(sha1('rundown:' . $rundownEventId), 0, 24);
    }

    // ── markets routing ──────────────────────────────────────────────

    /**
     * Walk Rundown markets[] once and partition outcomes into:
     *   - bookmakers[]       core markets (main lines, period_id=0)
     *   - extendedMarkets[]  periods + alt lines on core markets
     *   - playerProps[]      player markets
     *
     * @param list<array<string,mixed>> $markets
     * @return array{
     *     bookmakers: list<array<string,mixed>>,
     *     extendedMarkets: list<array<string,mixed>>,
     *     playerProps: list<array<string,mixed>>
     * }
     */
    private static function partitionMarkets(array $markets, string $sportKey): array
    {
        /** @var array<int, array{key:string,name:string,lastUpdate:string,markets:array<string, list<array<string,mixed>>>}> $bookmakersById */
        $bookmakersById = [];
        /** @var array<string, list<array<string,mixed>>> $extendedByKey  flat-key buckets */
        $extendedByKey  = [];
        /** @var array<string, list<array<string,mixed>>> $propsByKey     flat-key buckets */
        $propsByKey     = [];

        foreach ($markets as $market) {
            if (!is_array($market)) continue;
            $marketId = (int) ($market['market_id'] ?? 0);
            $periodId = (int) ($market['period_id'] ?? 0);
            if ($marketId <= 0) continue;

            // Classify the market by ID first.
            $isCore          = RundownMarketMap::isCore($marketId);
            $isLiveCore      = RundownMarketMap::isLiveCoreVariant($marketId);
            $isProp          = RundownMarketMap::isProp($marketId);
            $explicitPeriodKey = RundownMarketMap::explicitPeriodKey($marketId, $sportKey);

            $participants = is_array($market['participants'] ?? null) ? $market['participants'] : [];

            foreach ($participants as $participant) {
                if (!is_array($participant)) continue;
                $rawParticipantName = trim((string) ($participant['name'] ?? ''));
                $participantType    = (string) ($participant['type'] ?? '');

                $lines = is_array($participant['lines'] ?? null) ? $participant['lines'] : [];
                foreach ($lines as $line) {
                    if (!is_array($line)) continue;
                    $lineValueRaw = (string) ($line['value'] ?? '');
                    $point        = ($lineValueRaw !== '' && is_numeric($lineValueRaw)) ? (float) $lineValueRaw : null;
                    $prices       = is_array($line['prices'] ?? null) ? $line['prices'] : [];

                    foreach ($prices as $affiliateIdRaw => $price) {
                        if (!is_array($price)) continue;
                        $affiliateId = (int) $affiliateIdRaw;
                        $book = RundownAffiliateMap::lookup($affiliateId);
                        if ($book === null) continue;
                        $priceVal = $price['price'] ?? null;
                        if (!is_numeric($priceVal)) continue;
                        $priceFloat = (float) $priceVal;
                        if (abs($priceFloat - self::PRICE_OFF_BOARD) < 1e-6) continue;
                        $isMain = (bool) ($price['is_main_line'] ?? false);
                        $priceInt = self::normalizeAmericanOdds($priceFloat);
                        $updatedAt = (string) ($price['updated_at'] ?? '');

                        // ── Route 1: player prop ────────────────────
                        if ($isProp || $participantType === 'TYPE_PLAYER') {
                            $propKey = RundownMarketMap::propKey($marketId) ?? 'player_unknown';
                            $propOutcome = self::buildPropOutcome($rawParticipantName, $priceInt, $point);
                            if ($propOutcome !== null) {
                                $propsByKey[$propKey][] = $propOutcome + ['book' => $book['key']];
                            }
                            continue;
                        }

                        // ── Route 2: core market (main board) ───────
                        // Pre-match cores: period_id=0, is_main_line=true.
                        // Live in-play variants (market_id 41/42/43/96)
                        // ship with period_id=7 but they ARE the full-game
                        // live h2h/spreads/totals/team_totals — route them
                        // into the same bookmakers list so live odds
                        // supplement the prematch board for the same row.
                        if ($isCore && $isMain && ($periodId === 0 || $isLiveCore)) {
                            $marketKey = RundownMarketMap::oddsApiKey($marketId);
                            if ($marketKey === null || $rawParticipantName === '') continue;
                            if (!isset($bookmakersById[$affiliateId])) {
                                $bookmakersById[$affiliateId] = [
                                    'key'        => $book['key'],
                                    'name'       => $book['name'],
                                    'lastUpdate' => $updatedAt,
                                    'markets'    => [],
                                ];
                            } elseif ($updatedAt !== '' && $updatedAt > $bookmakersById[$affiliateId]['lastUpdate']) {
                                $bookmakersById[$affiliateId]['lastUpdate'] = $updatedAt;
                            }
                            $bookmakersById[$affiliateId]['markets'][$marketKey] ??= [];
                            $outcome = ['name' => $rawParticipantName, 'price' => $priceInt];
                            if ($point !== null) {
                                $outcome['point'] = $point;
                            }
                            // pid = Rundown participant.id (team_id / player_id),
                            // priceId = unique price row id. Both let the WS handler
                            // patch this exact outcome from a market_price message
                            // without name-matching.
                            $pid = $participant['id'] ?? null;
                            if ($pid !== null) {
                                $outcome['pid'] = is_numeric($pid) ? (int) $pid : (string) $pid;
                            }
                            $priceId = $price['id'] ?? null;
                            if ($priceId !== null) {
                                $outcome['priceId'] = is_numeric($priceId) ? (int) $priceId : (string) $priceId;
                            }
                            $bookmakersById[$affiliateId]['markets'][$marketKey][] = $outcome;
                            continue;
                        }

                        // ── Route 3: extended (period or alt line) ──
                        $extKey = null;
                        if ($explicitPeriodKey !== null) {
                            $extKey = $explicitPeriodKey;
                        } elseif ($isCore && $periodId > 0) {
                            $extKey = RundownMarketMap::keyForCoreWithPeriod($marketId, $periodId, $sportKey);
                        } elseif ($isCore && $periodId === 0 && !$isMain) {
                            $extKey = 'alternate_' . (string) RundownMarketMap::oddsApiKey($marketId);
                        }
                        if ($extKey === null || $rawParticipantName === '') continue;

                        $outcome = ['name' => $rawParticipantName, 'price' => $priceInt, 'book' => $book['key']];
                        if ($point !== null) {
                            $outcome['point'] = $point;
                        }
                        $extendedByKey[$extKey][] = $outcome;
                    }
                }
            }
        }

        return [
            'bookmakers'      => self::materializeBookmakers($bookmakersById),
            'extendedMarkets' => self::materializeFlatMarkets($extendedByKey),
            'playerProps'     => self::materializeFlatMarkets($propsByKey),
        ];
    }

    /**
     * @param array<int, array{key:string,name:string,lastUpdate:string,markets:array<string, list<array<string,mixed>>>}> $bookmakersById
     * @return list<array<string,mixed>>
     */
    private static function materializeBookmakers(array $bookmakersById): array
    {
        $out = [];
        foreach ($bookmakersById as $book) {
            $markets = [];
            foreach ($book['markets'] as $marketKey => $outcomes) {
                if ($outcomes === []) continue;
                $markets[] = [
                    'key'      => $marketKey,
                    'outcomes' => $outcomes,
                ];
            }
            if ($markets === []) continue;
            $out[] = [
                'key'        => $book['key'],
                'name'       => $book['name'],
                'lastUpdate' => $book['lastUpdate'] !== '' ? $book['lastUpdate'] : SqlRepository::nowUtc(),
                'markets'    => $markets,
            ];
        }
        return $out;
    }

    /**
     * Flatten the keyed buckets into the flat `[{key, outcomes:[…]}]`
     * shape the frontend (PropBuilderModal, MatchDetailView) consumes.
     *
     * @param array<string, list<array<string,mixed>>> $byKey
     * @return list<array<string,mixed>>
     */
    private static function materializeFlatMarkets(array $byKey): array
    {
        $out = [];
        foreach ($byKey as $key => $outcomes) {
            if ($outcomes === []) continue;
            $out[] = [
                'key'      => $key,
                'outcomes' => $outcomes,
            ];
        }
        return $out;
    }

    /**
     * Build a player-prop outcome from a Rundown participant name.
     *
     * Rundown's prop participants typically encode the over/under side in
     * the participant name itself ("Over LeBron James" / "Under LeBron James")
     * because the same player has separate prices for each side. We parse
     * that prefix so the frontend gets the canonical {name, description}
     * shape it already knows from the old odds-api integration.
     *
     * @return array{name:string,description:string,price:int|float,point:?float}|null
     */
    private static function buildPropOutcome(string $participantName, int|float $price, ?float $point): ?array
    {
        if ($participantName === '') return null;

        if (preg_match('/^(over|under)\s+(.+)$/i', $participantName, $m) === 1) {
            return [
                'name'        => ucfirst(strtolower($m[1])),
                'description' => trim($m[2]),
                'price'       => $price,
                'point'       => $point,
            ];
        }

        // No Over/Under prefix detected — keep the player name in
        // description so the prop modal still groups by player.
        return [
            'name'        => $participantName,
            'description' => $participantName,
            'price'       => $price,
            'point'       => $point,
        ];
    }

    /**
     * @param list<array<string,mixed>> $teams
     * @param 'home'|'away' $side
     * @return array<string,mixed>|null
     */
    private static function findTeam(array $teams, string $side): ?array
    {
        foreach ($teams as $team) {
            if (!is_array($team)) continue;
            if ($side === 'home' && (bool) ($team['is_home'] ?? false)) return $team;
            if ($side === 'away' && (bool) ($team['is_away'] ?? false)) return $team;
        }
        return null;
    }

    /**
     * Cast a numeric American-odds value to an integer when whole;
     * existing matches.doc stores integers so downstream comparators
     * (BetsController bet-time price check) match equally.
     */
    private static function normalizeAmericanOdds(float $value): int|float
    {
        if (abs($value - round($value)) < 1e-4) {
            return (int) round($value);
        }
        return $value;
    }
}
