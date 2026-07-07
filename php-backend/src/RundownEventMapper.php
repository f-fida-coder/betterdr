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
     * Core board markets whose two-way juice is normalized to a single
     * house-standard flat line (e.g. -110) when SPORTSBOOK_FLAT_JUICE_AMERICAN
     * is configured. Moneyline (h2h) and team_totals are intentionally left
     * on the live feed price.
     */
    private const FLAT_JUICE_MARKETS = ['spreads', 'totals'];

    /**
     * Rundown event_status → matches.doc.status.
     *
     * Defaults for anything NOT listed: toMatchDoc() falls back to
     * 'scheduled'; scoreUpdate() writes NO status (keeps the row's current
     * one). That second default means an unmapped TERMINAL status leaves a
     * live row live FOREVER — exactly the 2026-07-06 incident (see
     * STATUS_FULL_TIME below). When Rundown adds a status, classify it here
     * AND extend the RundownEventMapperTest full-map lock.
     *
     * Audited 2026-07-06 against docs.therundown.io/reference/event-statuses.
     */
    private const STATUS_MAP = [
        'STATUS_SCHEDULED'          => 'scheduled',
        'STATUS_TBD'                => 'scheduled',
        'STATUS_DELAYED'            => 'scheduled',
        'STATUS_RAIN_DELAY'         => 'scheduled',
        'STATUS_NOT_AVAILABLE'      => 'scheduled',
        'STATUS_POSTPONED'          => 'canceled',
        'STATUS_CANCELED'           => 'canceled',
        // Match stopped and will not resume (crowd trouble, weather, etc.) —
        // void/refund like a cancel. Was previously UNMAPPED: a live row hit
        // by ABANDONED kept status 'live' forever (same bug class as
        // FULL_TIME below).
        'STATUS_ABANDONED'          => 'canceled',
        'STATUS_FORFEIT'            => 'finished',
        'STATUS_FINAL'              => 'finished',
        'STATUS_FINAL_AET'          => 'finished',
        'STATUS_FINAL_PEN'          => 'finished',
        // Soccer regulation full time — TERMINAL for us. Rundown's docs say
        // "the match may continue to extra time", but (a) our soccer markets
        // grade at regulation like every mainstream book, and (b) Rundown
        // parks non-knockout games on FULL_TIME indefinitely: mapping it
        // 'live' kept a decided World Cup game (Norway–Brazil 2-1) on the
        // board with open betting for 17+ hours (2026-07-06 incident).
        // Knockout ET is deliberately not offered live — the row finishes at
        // 90' and grades on the regulation score.
        'STATUS_FULL_TIME'          => 'finished',
        'STATUS_IN_PROGRESS'        => 'live',
        'STATUS_HALFTIME'           => 'live',
        // Halftime of extra time (soccer knockout). Was previously UNMAPPED.
        // Only reachable if the row never saw FULL_TIME (feed raced straight
        // into ET statuses) — in-play, so 'live'.
        'STATUS_HALFTIME_ET'        => 'live',
        'STATUS_END_PERIOD'         => 'live',
        'STATUS_FIRST_HALF'         => 'live',
        'STATUS_SECOND_HALF'        => 'live',
        'STATUS_OVERTIME'           => 'live',
        'STATUS_SHOOTOUT'           => 'live',
        'STATUS_END_OF_REGULATION'  => 'live',
        // Deliberate split-brain: the MAP keeps a suspended row 'live' so
        // score updates keep flowing, while SportsMatchStatus::normalize()
        // reads score.event_status ('...SUSPEND...') as 'suspended' at serve
        // time → betting blocked but the row stays warm for a resume.
        'STATUS_SUSPENDED'          => 'live',
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

        // team_id → canonical (short) team name, so partitionMarkets can
        // rewrite full odds participant names ("Boston Red Sox") to the same
        // homeTeam/awayTeam form the rest of the backend uses ("Boston").
        $teamNamesById = [];
        foreach ([$home, $away] as $team) {
            $teamId = $team['team_id'] ?? null;
            if ($teamId !== null && $teamId !== '') {
                $teamNamesById[(string) $teamId] = (string) ($team['name'] ?? '');
            }
        }

        // team_id → 'home'|'away'. Team totals carry the team as the
        // participant; settlement grades each side against score_home /
        // score_away, so the ingest stamps the side here (by stable team_id,
        // never by name) and the rest of the pipeline never has to string-
        // match a team name to figure out which score to grade against.
        $teamSideById = [];
        $homeTeamId = (string) ($home['team_id'] ?? '');
        $awayTeamId = (string) ($away['team_id'] ?? '');
        if ($homeTeamId !== '') {
            $teamSideById[$homeTeamId] = 'home';
        }
        if ($awayTeamId !== '') {
            $teamSideById[$awayTeamId] = 'away';
        }

        $partitioned = self::partitionMarkets(
            is_array($event['markets'] ?? null) ? $event['markets'] : [],
            $resolvedSportKey,
            $teamNamesById,
            $teamSideById
        );
        $now = SqlRepository::nowUtc();

        return [
            'id'                => self::deterministicMatchId($eventId),
            'externalId'        => $eventId,
            // homeTeam/awayTeam stay the SHORT canonical (Rundown `name` = the
            // city, e.g. "Los Angeles") — this is the stable match key the rest
            // of the backend keys on (outcome normalization by team_id,
            // placement, settlement side-resolution). DO NOT switch these to the
            // full name; matching depends on them matching the outcome names.
            'homeTeam'          => (string) ($home['name'] ?? ''),
            'awayTeam'          => (string) ($away['name'] ?? ''),
            'homeTeamShort'     => (string) ($home['abbreviation'] ?? ''),
            'awayTeamShort'     => (string) ($away['abbreviation'] ?? ''),
            // Canonical full name ("City Mascot", e.g. "Los Angeles Angels"),
            // derived from the feed — DISPLAY ONLY. Plus the stable team_id so
            // bets/snapshots can carry an id-anchor independent of any name.
            'homeTeamFull'      => self::deriveFullTeamName($home),
            'awayTeamFull'      => self::deriveFullTeamName($away),
            'homeTeamId'        => (string) ($home['team_id'] ?? ''),
            'awayTeamId'        => (string) ($away['team_id'] ?? ''),
            'homeTeamRecord'    => (string) ($home['record'] ?? ''),
            'awayTeamRecord'    => (string) ($away['record'] ?? ''),
            // Listed starting pitchers (MLB). Rundown returns pitcher_home /
            // pitcher_away only for baseball events; null elsewhere. Drives the
            // "listed pitcher / Action" rule — a bet voids if a listed pitcher
            // is scratched unless the player took Action on that side. Stored on
            // the match doc so the placement snapshot captures who was listed at
            // bet time, and settlement can compare against the actual starter.
            'homePitcher'       => self::extractPitcher($event['pitcher_home'] ?? null),
            'awayPitcher'       => self::extractPitcher($event['pitcher_away'] ?? null),
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
            // When homePitcher/awayPitcher were last written from a FULL event
            // sync. The live score tick (scoreUpdate) refreshes the score and
            // bumps lastUpdated WITHOUT touching pitchers, so lastUpdated cannot
            // prove pitcher freshness. The listed-pitcher void uses this stamp
            // to require that the actual starter was captured at/after first
            // pitch before it ever refunds a bet (see listedPitcherVoid).
            'pitchersSyncedAt'  => $now,
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
        $statusRaw = (string) ($score['event_status'] ?? '');
        // Only write `status` when the feed sent a status we recognize.
        // The old `?? 'scheduled'` default meant a malformed or
        // sport-specific payload DEMOTED a live row back to scheduled.
        $status = self::STATUS_MAP[$statusRaw] ?? null;
        $now = SqlRepository::nowUtc();
        $update = [
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
        if ($status !== null) {
            $update['status'] = $status;
        }
        return $update;
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
    private static function partitionMarkets(array $markets, string $sportKey, array $teamNamesById = [], array $teamSideById = []): array
    {
        /** @var array<int, array{key:string,name:string,lastUpdate:string,markets:array<string, array{prematch?:list<array<string,mixed>>,live?:list<array<string,mixed>>}>}> $bookmakersById */
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

                // Canonical team name. Rundown's odds participant name is the
                // FULL form ("Boston Red Sox"), but the match doc's
                // homeTeam/awayTeam use the team `name` field ("Boston") — and
                // settlement, stored bet selections, and the betslip all run on
                // that short form. Normalize team outcome names to it, matched
                // by team_id (participant.id === teams[].team_id), so the whole
                // backend speaks ONE name and a short/full mismatch can't
                // reject a valid bet or mis-grade one. Non-team participants
                // (Over/Under, players) aren't in the map and keep their raw
                // name.
                $participantTeamKey = (($participant['id'] ?? null) === null || ($participant['id'] ?? '') === '')
                    ? ''
                    : (string) $participant['id'];
                $canonicalTeamName = ($participantTeamKey !== '' && isset($teamNamesById[$participantTeamKey]))
                    ? $teamNamesById[$participantTeamKey]
                    : $rawParticipantName;

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
                        $priceDecimal = self::priceToDecimal($priceFloat);
                        $updatedAt = (string) ($price['updated_at'] ?? '');

                        // ── Route 0: team totals ────────────────────
                        // Rundown encodes team totals UNLIKE game totals: the
                        // participant IS the team (TYPE_TEAM), and the over/under
                        // direction + the line are packed into line.value as a
                        // string ("Over 4.5" / "Under 4.5") — there is no numeric
                        // point and no "Over"/"Under" participant. Parse the
                        // direction/point out, anchor the team to home/away by
                        // stable team_id, and emit STRUCTURED fields so neither
                        // the frontend nor settlement ever parse a display name.
                        // Only IDs 94 (prematch) / 96 (live) reach here — period
                        // team-total IDs aren't core, so they fall through to the
                        // extended route unchanged (period TT is out of scope).
                        if ($isCore && RundownMarketMap::oddsApiKey($marketId) === 'team_totals') {
                            $tt = self::parseTeamTotalLine($lineValueRaw);
                            if ($tt === null) continue;                 // unparseable direction/point → drop
                            $teamSide = $teamSideById[$participantTeamKey] ?? null;
                            if ($teamSide === null) continue;           // no home/away anchor → cannot grade → drop
                            [$ttSide, $ttPoint] = $tt;
                            $ttOutcome = [
                                // name is DISPLAY ONLY — never parsed downstream.
                                'name'     => trim($canonicalTeamName . ' ' . ($ttSide === 'over' ? 'Over' : 'Under')),
                                'team'     => $canonicalTeamName,
                                'teamSide' => $teamSide,
                                'side'     => $ttSide,
                                'point'    => $ttPoint,
                                // team_totals is NOT a flat-juice market — passes
                                // through at the feed price (see boardPriceDecimal).
                                'price'    => self::boardPriceDecimal('team_totals', $priceFloat, $sportKey),
                            ];
                            $ttPid = $participant['id'] ?? null;
                            if ($ttPid !== null && $ttPid !== '') {
                                $ttOutcome['pid'] = is_numeric($ttPid) ? (int) $ttPid : (string) $ttPid;
                            }
                            $ttPriceId = $price['id'] ?? null;
                            if ($ttPriceId !== null && $ttPriceId !== '') {
                                $ttOutcome['priceId'] = is_numeric($ttPriceId) ? (int) $ttPriceId : (string) $ttPriceId;
                            }
                            // Main line → core board (same prematch/live source
                            // bucketing as the other cores). Non-main rungs →
                            // alternate_team_totals: STORED so the data is captured,
                            // but not surfaced in the listing UI yet (per scope).
                            if ($isMain && ($periodId === 0 || $isLiveCore)) {
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
                                $marketSource = $isLiveCore ? 'live' : 'prematch';
                                $bookmakersById[$affiliateId]['markets']['team_totals'][$marketSource] ??= [];
                                $bookmakersById[$affiliateId]['markets']['team_totals'][$marketSource][] = $ttOutcome;
                            } else {
                                $ttOutcome['book'] = $book['key'];
                                $extendedByKey['alternate_team_totals'][] = $ttOutcome;
                            }
                            continue;
                        }

                        // ── Route 1: player prop ────────────────────
                        // ONE main line per player per prop. The full-coverage
                        // pull omits main_line=true (it MUST, to keep the core
                        // alt-line/period ladders Buy Points reads from the same
                        // shared request), so Rundown returns the whole prop
                        // ladder here. Rundown's main_line is request-wide, not
                        // per-market, so we can't filter props at the fetch
                        // without dropping those core alt lines. Instead gate on
                        // the per-price is_main_line flag at ingestion: this
                        // yields exactly one rung (its O/U sides) per player per
                        // prop, at zero extra data-point cost. Non-main prop
                        // rungs are never stored, so they're never offered — a
                        // deliberate risk control on prop ladders. Existing
                        // pending bets are unaffected (settlement grades the line
                        // stored on the bet leg, not the live doc).
                        if ($isProp || $participantType === 'TYPE_PLAYER') {
                            // Drop generic Rundown result placeholders that leak
                            // into scorer prop markets as bare "Yes"/"No"
                            // (TYPE_RESULT, not a player) — meaningless as a
                            // player bet. The real 0-0 outcome is the NAMED
                            // "No goal" participant, which is kept.
                            $pnLower = strtolower(trim($rawParticipantName));
                            if ($pnLower === 'yes' || $pnLower === 'no') continue;
                            $isSoccer = str_starts_with(strtolower($sportKey), 'soccer_');
                            $propKey = RundownMarketMap::propKey($marketId) ?? 'player_unknown';
                            // US sports ship one is_main_line=true rung per player
                            // per prop — keep only that (a deliberate risk control).
                            // Soccer ships EVERY prop as is_main_line=false (one rung
                            // per player, no ladder), so the same gate would drop the
                            // whole soccer prop board — bypass it for soccer only.
                            // EXCEPTION (Nicky): HR is an OVER-ONLY 1+/2+ ladder to
                            // match BettorJuice. Over 0.5 + Over 1.5 ride market 72 as
                            // is_main_line=false rungs, so admit batter_home_runs OVER
                            // rungs with point <= 1.5 (Over 0.5/1.5 only; Over 2.5+
                            // rejected; the Under-drop below still kills every Under).
                            // The 2+ rung is single-book (DraftKings) so expect gaps —
                            // never synthesize a price to fill them.
                            if (!$isMain && !$isSoccer && !self::isHrOverLadderRung($propKey, $lineValueRaw)) continue;
                            // Player id (Rundown participant.id for a TYPE_PLAYER
                            // participant) — carried as `pid` so settlement can
                            // match this leg to the player's box-score stats by a
                            // STABLE id, never by name. Empty → null.
                            $playerId = ($participantTeamKey !== '') ? $participantTeamKey : null;
                            // Soccer "N or more" booking markets carry no per-line
                            // value; grade them as a synthetic Over (N-0.5) so the
                            // proven over/under grader settles them off the box score.
                            $thresholdPoint = $isSoccer ? RundownMarketMap::soccerThresholdPoint($marketId) : null;
                            $propOutcome = self::buildPropOutcome($rawParticipantName, $lineValueRaw, $point, $priceDecimal, $playerId, $thresholdPoint, $isSoccer);
                            if ($propOutcome !== null) {
                                // HR is OVER 0.5 ONLY by design (Nicky): the Under 0.5
                                // side hits ~85-95% (HR is a low-probability event), so
                                // offering it invites a "parlay all the Unders" near-lock
                                // exploit. Drop the Under side at ingestion so it's never
                                // stored, displayed, or bettable — prematch (72) AND live
                                // (71) both reach here via the same path. Do NOT re-add.
                                $isHrUnder = $propKey === 'batter_home_runs'
                                    && strtolower((string) ($propOutcome['name'] ?? '')) === 'under';
                                if (!$isHrUnder) {
                                    $propsByKey[$propKey][] = $propOutcome + ['book' => $book['key']];
                                }
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
                            // Baseball 0-run ("PK") spreads are the moneyline in
                            // disguise — never stored (see isSuppressedPkSpreadRung).
                            if (self::isSuppressedPkSpreadRung($marketKey, $point, $sportKey)) continue;
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
                            // Pre-match cores (market 2/3/94…) and live in-play
                            // variants (41/42/43/96) share the same odds-api key
                            // (e.g. 'spreads'). Bucket them by source so live can
                            // FULLY supersede the stale pre-match line at
                            // materialization. Previously both were appended into
                            // one list and the consumer picked the first match —
                            // which surfaced dead pre-match numbers (e.g. NYY +1
                            // while up 8-1) on in-progress games. Money-critical.
                            $marketSource = $isLiveCore ? 'live' : 'prematch';
                            $bookmakersById[$affiliateId]['markets'][$marketKey][$marketSource] ??= [];
                            // Spreads/totals get the house flat juice; h2h/team_totals
                            // pass through. Point is taken from $point (feed) unchanged.
                            $outcome = ['name' => $canonicalTeamName, 'price' => self::boardPriceDecimal($marketKey, $priceFloat, $sportKey)];
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
                            $bookmakersById[$affiliateId]['markets'][$marketKey][$marketSource][] = $outcome;
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
                        // Baseball PK suppression covers period spreads
                        // (spreads_1st_5_innings…) and alternate_spreads too —
                        // Rundown genuinely marks point=0 as the F5 main line,
                        // and a 0 rung anywhere in the ladder is a bettable
                        // ML-arb duplicate (see isSuppressedPkSpreadRung).
                        if (self::isSuppressedPkSpreadRung($extKey, $point, $sportKey)) continue;

                        $outcome = ['name' => $canonicalTeamName, 'price' => $priceDecimal, 'book' => $book['key']];
                        if ($point !== null) {
                            $outcome['point'] = $point;
                        }
                        // pid = normalized participant id, same id-space as the
                        // delta feed's participant_id — lets the delta patcher
                        // anchor period-market ticks without name-matching
                        // (stored names are canonical SHORT form, delta names
                        // are the feed's FULL form).
                        $extPid = $participant['id'] ?? null;
                        if ($extPid !== null && $extPid !== '') {
                            $outcome['pid'] = is_numeric($extPid) ? (int) $extPid : (string) $extPid;
                        }
                        $extendedByKey[$extKey][] = $outcome;
                    }
                }
            }
        }

        $bookmakers = self::materializeBookmakers($bookmakersById);
        // Soccer Asian-handicap (spread) AND total main lines: some books (e.g.
        // Pinnacle) price these on a QUARTER grid and mark a .25/.75 rung as
        // is_main_line (spread -2.25, total 3.25), while others (DraftKings/
        // HardRock) mark a clean whole/half/PK main on the SAME event (-2.5, 3.5).
        // Quarter lines are hidden + placement-blocked (interim policy), so a
        // quarter main would blank the cell even though a real priced whole/half
        // line exists. Promote the cleanest priced rung so the board shows a
        // clean line that is genuinely bettable + settleable.
        if (str_starts_with(strtolower($sportKey), 'soccer_')) {
            $bookmakers = self::promoteSoccerMainLineCleanRung($bookmakers, 'spreads');
            $bookmakers = self::promoteSoccerMainLineCleanRung($bookmakers, 'totals');
        }

        return [
            'bookmakers'      => $bookmakers,
            // Collapse alt-spread / alt-total / period LADDERS to one rung per
            // (side, point) at the house-safe price — Rundown sends one outcome
            // per book per rung, which otherwise shows "Germany -4.5" once per
            // book. Player props are NOT collapsed here: they key on the player
            // (description) and are deduped to the preferred book client-side.
            'extendedMarkets' => self::dedupeExtendedMarkets(self::materializeFlatMarkets($extendedByKey), $sportKey),
            'playerProps'     => self::materializeFlatMarkets($propsByKey),
        ];
    }

    /**
     * @param array<int, array{key:string,name:string,lastUpdate:string,markets:array<string, array{prematch?:list<array<string,mixed>>,live?:list<array<string,mixed>>}>}> $bookmakersById
     * @return list<array<string,mixed>>
     */
    private static function materializeBookmakers(array $bookmakersById): array
    {
        $out = [];
        foreach ($bookmakersById as $book) {
            $markets = [];
            foreach ($book['markets'] as $marketKey => $bySource) {
                // Live in-play odds fully supersede the pre-match line for the
                // same market; fall back to pre-match only when no live variant
                // is present. This is what stops an in-progress game from
                // showing its dead pre-match spread/total/moneyline.
                $outcomes = !empty($bySource['live'])
                    ? $bySource['live']
                    : ($bySource['prematch'] ?? []);
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
        // Order by configured display priority so the frontend's "first
        // bookmaker with markets" lands on the preferred (sharpest/broadest)
        // book. usort is stable on PHP 8, so unranked books keep upstream order.
        $pref = self::preferredBookOrder();
        if ($pref !== [] && count($out) > 1) {
            $rank = static function (array $bm) use ($pref): int {
                $i = array_search((string) ($bm['key'] ?? ''), $pref, true);
                return $i === false ? PHP_INT_MAX : (int) $i;
            };
            usort($out, static fn (array $a, array $b): int => $rank($a) <=> $rank($b));
        }
        return $out;
    }

    /**
     * Soccer main-line markets ('spreads' = Asian handicap, 'totals' = O/U):
     * replace any book's QUARTER (.25/.75) main line with the cleanest available
     * whole/half/PK line the feed actually prices for the same event.
     *
     * WHY: both the board (MatchesController::selectMarketsFromBookmakers builds
     * odds.markets) and placement (BetsController::collectMatchMarkets →
     * selectMarketsFromBookmakers) select the market from THESE stored
     * bookmakers. A quarter main is hidden on the board and blocked at placement
     * (interim quarter-line policy), so it would blank the cell. Other books
     * mark a clean main on the same event (e.g. Pinnacle spread -2.25 / total
     * 3.25 main, DraftKings/HardRock -2.5 / 3.5 main), so a real, priced,
     * coherent line exists — for totals the Over and Under stay pinned to the
     * SAME point because we copy ONE book's whole market (never a mismatched
     * O 3.5 / U 3.25).
     *
     * HOW: pick the first book (preferred order) whose main for $marketKey is
     * FULLY non-quarter as the reference, then overwrite every book whose main
     * for that market contains a quarter with that reference. Because every
     * reader picks from the same stored bookmakers, the promoted line is what is
     * shown, bet, AND graded — display == stored == bettable == settled. We copy
     * a REAL priced outcome set; nothing is fabricated or rounded. If NO book
     * prices a non-quarter line for the event, leave it untouched (board blanks —
     * last-resort fallback). The quarter HIDE + placement BLOCK stay fully intact
     * for every other path. Soccer + this market only; never touches team_totals
     * or any other market.
     *
     * @param list<array<string,mixed>> $bookmakers
     * @param 'spreads'|'totals'        $marketKey
     * @return list<array<string,mixed>>
     */
    private static function promoteSoccerMainLineCleanRung(array $bookmakers, string $marketKey): array
    {
        $hasQuarter = static function (array $market): bool {
            foreach (($market['outcomes'] ?? []) as $o) {
                $pt = is_array($o) ? ($o['point'] ?? null) : null;
                if (is_numeric($pt) && SportsbookBetSupport::isQuarterPoint((float) $pt)) {
                    return true;
                }
            }
            return false;
        };

        // Reference = first book (already preferred-ordered) whose main for this
        // market is fully non-quarter and actually priced.
        $clean = null;
        foreach ($bookmakers as $bm) {
            foreach ((is_array($bm['markets'] ?? null) ? $bm['markets'] : []) as $m) {
                if (!is_array($m) || strtolower((string) ($m['key'] ?? '')) !== $marketKey) continue;
                $outs = is_array($m['outcomes'] ?? null) ? $m['outcomes'] : [];
                if ($outs === []) continue;
                if (!$hasQuarter($m)) { $clean = $outs; break 2; }
            }
        }
        if ($clean === null) {
            return $bookmakers; // no clean line anywhere → leave (blank fallback)
        }

        foreach ($bookmakers as $bi => $bm) {
            foreach ((is_array($bm['markets'] ?? null) ? $bm['markets'] : []) as $mi => $m) {
                if (!is_array($m) || strtolower((string) ($m['key'] ?? '')) !== $marketKey) continue;
                if ($hasQuarter($m)) {
                    $bookmakers[$bi]['markets'][$mi]['outcomes'] = $clean;
                }
            }
        }
        return $bookmakers;
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
     * Collapse handicap/total LADDER markets to ONE outcome per rung.
     *
     * Rundown ships an alternate-spread / alternate-total / period market as
     * one outcome PER SPORTSBOOK for every (side, point) — so "Germany -4.5"
     * arrives once per book, each with its own juice. Stored raw, the builder
     * shows the same handicap many times at different prices and (worse) lets a
     * player cherry-pick the most generous book's line. We collapse each
     * (side name, point) rung to a single, house-safe price:
     *   1) the highest-ranked SPORTSBOOK_PREFERRED_BOOKS book that priced the
     *      rung — keeps the ladder consistent with how the mainline is priced; else
     *   2) the MEDIAN price across the books that priced it (consensus, never
     *      the best-for-player line; even counts take the lower-payout middle).
     * Grouping is per market key, so different periods / market families
     * (alternate_spreads vs alternate_spreads_h1) never merge. Rungs with no
     * usable price are dropped. Public so the read path (MatchesController)
     * can apply the same collapse to docs stored before this shipped.
     *
     * When $sportKey identifies a baseball sport, spread-family markets also
     * get (a) PK suppression — point=0 rungs dropped, same rule as ingestion,
     * so docs stored before the ingestion gate shipped are cleaned on read —
     * and (b) deterministic rung ordering: the complementary pair (+p / −p on
     * opposite sides) with the most balanced juice is moved to the front.
     * The board renders the FIRST outcome matching each team's name
     * (getMarketOutcomeByName), so without (b) the F5/F1 spread cell shows an
     * arbitrary rung per side — the two sides could even show different
     * points from different books. Non-baseball sports are untouched.
     *
     * @param array<int, array{key:string, outcomes:array<int,array<string,mixed>>}> $flatMarkets
     * @return array<int, array{key:string, outcomes:array<int,array<string,mixed>>}>
     */
    public static function dedupeExtendedMarkets(array $flatMarkets, ?string $sportKey = null): array
    {
        $rank = [];
        foreach (array_values(self::preferredBookOrder()) as $i => $bookKey) {
            $rank[$bookKey] = $i;
        }
        $rankOf = static function (array $o) use ($rank): int {
            $book = strtolower(trim((string) ($o['book'] ?? '')));
            return $rank[$book] ?? PHP_INT_MAX;
        };

        $out = [];
        foreach ($flatMarkets as $market) {
            $key = (string) ($market['key'] ?? '');
            $outcomes = is_array($market['outcomes'] ?? null) ? $market['outcomes'] : [];
            if ($key === '' || $outcomes === []) {
                continue;
            }
            $isBaseballSpreadFamily = self::isBaseballSpreadMarket($key, $sportKey);

            // Bucket every book's outcome for the same (side name, point),
            // preserving first-seen rung order so the ladder stays stable.
            $byRung = [];
            $order = [];
            foreach ($outcomes as $o) {
                if (!is_array($o) || !isset($o['price'])) {
                    continue;
                }
                $name = (string) ($o['name'] ?? '');
                $point = array_key_exists('point', $o) && $o['point'] !== null && $o['point'] !== '' && is_numeric($o['point'])
                    ? (string) (0 + $o['point'])
                    : '';
                // Read-path PK suppression: same rule as ingestion, applied
                // here too so docs stored BEFORE the ingestion gate shipped
                // never surface a baseball PK rung.
                if ($isBaseballSpreadFamily && $point !== '' && (float) $point == 0.0) {
                    continue;
                }
                $rungKey = strtolower($name) . '|' . $point;
                if (!isset($byRung[$rungKey])) {
                    $byRung[$rungKey] = [];
                    $order[] = $rungKey;
                }
                $byRung[$rungKey][] = $o;
            }

            $deduped = [];
            foreach ($order as $rungKey) {
                $cands = $byRung[$rungKey];
                // 1) Best-ranked preferred book that priced this rung.
                $chosen = null;
                $chosenRank = PHP_INT_MAX;
                foreach ($cands as $o) {
                    $r = $rankOf($o);
                    if ($r < $chosenRank) {
                        $chosenRank = $r;
                        $chosen = $o;
                    }
                }
                // 2) No preferred book priced it → median (house-safe consensus).
                if ($chosen === null || $chosenRank === PHP_INT_MAX) {
                    $chosen = self::medianByPrice($cands);
                }
                if (is_array($chosen) && isset($chosen['price'])) {
                    $deduped[] = $chosen;
                }
            }

            if ($isBaseballSpreadFamily) {
                $deduped = self::orderBalancedSpreadPairFirst($deduped);
            }

            if ($deduped !== []) {
                $out[] = ['key' => $key, 'outcomes' => array_values($deduped)];
            }
        }
        return $out;
    }

    /**
     * True when this market key is a spread-family market for a baseball
     * sport (baseball_mlb / baseball_npb / baseball_kbo / …). Spread family =
     * 'spreads', any period variant ('spreads_1st_5_innings', 'spreads_h1'…)
     * and their 'alternate_' forms. In baseball a 0-run spread ("PK") is the
     * SAME outcome as the moneyline — MLB can't tie — so a PK rung is a
     * duplicate ML at different juice: it reads as broken on the board
     * (Yankees ML −102 next to Yankees PK −114) and invites ML-vs-PK price
     * shopping. The real baseball spread product is the runline (±1.5 game,
     * ±0.5 F5). Soccer and hockey PK/level handicaps are legitimate products
     * (a draw refunds the stake — a DIFFERENT bet than their 3-way/OT-inclusive
     * moneylines) and MUST NOT be gated by any of this.
     */
    private static function isBaseballSpreadMarket(string $marketKey, ?string $sportKey): bool
    {
        if ($sportKey === null || !str_starts_with(strtolower(trim($sportKey)), 'baseball')) {
            return false;
        }
        $base = strtolower($marketKey);
        if (str_starts_with($base, 'alternate_')) {
            $base = substr($base, strlen('alternate_'));
        }
        return $base === 'spreads' || str_starts_with($base, 'spreads_');
    }

    /**
     * True for a spread rung that must never be stored: baseball, spread
     * family, point=0. Shared by every ingestion route (core board, period,
     * alternate ladder) and mirrored on the read path in
     * dedupeExtendedMarkets, so a PK rung can't reach display, placement,
     * or Buy Points from any direction.
     */
    private static function isSuppressedPkSpreadRung(?string $marketKey, ?float $point, ?string $sportKey): bool
    {
        if ($marketKey === null || $point === null || $point != 0.0) {
            return false;
        }
        return self::isBaseballSpreadMarket($marketKey, $sportKey);
    }

    /**
     * Move the most balanced COMPLEMENTARY rung pair to the front of a
     * deduped spread ladder: two outcomes on opposite sides (different
     * names) at mirrored points (+p / −p) whose decimal prices are closest
     * together — that pair is the de-facto main line. Ties break to the
     * smaller |point| (nearest the true main), then first-seen order, so
     * the result is deterministic for identical input. The board's
     * first-match-per-name render then shows BOTH sides of the SAME line
     * from the pair, fixing the cross-book side-mismatch (e.g. Washington
     * −0.5 FanDuel next to Houston 0 Pinnacle). No pair → order unchanged.
     * Pure reorder: never drops, reprices, or fabricates an outcome.
     *
     * @param list<array<string,mixed>> $outcomes
     * @return list<array<string,mixed>>
     */
    private static function orderBalancedSpreadPairFirst(array $outcomes): array
    {
        $n = count($outcomes);
        if ($n < 2) {
            return $outcomes;
        }
        $bestI = null;
        $bestJ = null;
        $bestDiff = null;
        $bestAbsPoint = null;
        for ($i = 0; $i < $n; $i++) {
            $a = $outcomes[$i];
            if (!is_array($a) || !isset($a['price']) || !is_numeric($a['price'])) continue;
            $pa = (isset($a['point']) && is_numeric($a['point'])) ? (float) $a['point'] : null;
            if ($pa === null) continue;
            for ($j = $i + 1; $j < $n; $j++) {
                $b = $outcomes[$j];
                if (!is_array($b) || !isset($b['price']) || !is_numeric($b['price'])) continue;
                $pb = (isset($b['point']) && is_numeric($b['point'])) ? (float) $b['point'] : null;
                if ($pb === null) continue;
                if (strcasecmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? '')) === 0) continue;
                if (abs($pa + $pb) > 1e-9) continue; // complementary pair: pb == -pa
                $diff = abs((float) $a['price'] - (float) $b['price']);
                $absPoint = abs($pa);
                if (
                    $bestDiff === null
                    || $diff < $bestDiff - 1e-12
                    || (abs($diff - $bestDiff) <= 1e-12 && $absPoint < $bestAbsPoint)
                ) {
                    $bestDiff = $diff;
                    $bestAbsPoint = $absPoint;
                    $bestI = $i;
                    $bestJ = $j;
                }
            }
        }
        if ($bestI === null || $bestJ === null) {
            return $outcomes;
        }
        $front = [$outcomes[$bestI], $outcomes[$bestJ]];
        $rest = [];
        foreach ($outcomes as $k => $o) {
            if ($k !== $bestI && $k !== $bestJ) {
                $rest[] = $o;
            }
        }
        return array_merge($front, $rest);
    }

    /**
     * Median-priced outcome (by decimal price) from a rung's candidates.
     * Deterministic + house-safe: an even count takes the LOWER-payout of the
     * two middle prices, so the player never gets the most generous duplicate.
     *
     * @param array<int, array<string,mixed>> $candidates
     * @return array<string,mixed>|null
     */
    private static function medianByPrice(array $candidates): ?array
    {
        $valid = array_values(array_filter(
            $candidates,
            static fn ($o): bool => is_array($o) && isset($o['price']) && is_numeric($o['price'])
        ));
        if ($valid === []) {
            return null;
        }
        usort($valid, static fn ($a, $b): int => ((float) $a['price']) <=> ((float) $b['price']));
        // Lower-middle index → house-safe on even counts (lower decimal = lower payout).
        return $valid[intdiv(count($valid) - 1, 2)];
    }

    /**
     * True for a non-main HR rung we deliberately admit past the main-line
     * gate: batter_home_runs, side OVER, point <= 1.5 (Over 0.5 / Over 1.5).
     * Everything else — Over 2.5+, any Under, any other prop — stays gated.
     * This keeps the Over-only 1+/2+ HR ladder (Nicky) without reopening
     * alt-line ladders for any other US prop. The line value carries the side
     * and point together ("Over 1.5"), exactly as market 72 ships it.
     */
    private static function isHrOverLadderRung(string $propKey, string $lineValueRaw): bool
    {
        if ($propKey !== 'batter_home_runs') {
            return false;
        }
        if (preg_match('/^over\s+([0-9]+(?:\.[0-9]+)?)$/i', trim($lineValueRaw), $m) !== 1) {
            return false;
        }
        return ((float) $m[1]) <= 1.5;
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
    /**
     * Normalize one Rundown player-prop price into the outcome shape the
     * prop modal renders and BetsController validates against:
     *   { name: 'Over'|'Under'|<side label>, description: <player>, point, price }
     *
     * Rundown ships O/U player props with the PLAYER on the participant
     * ("Luke Kornet", type TYPE_PLAYER) and the SIDE + LINE together in the
     * line value string ("Over 1.5" / "Under 23.5"). The point is therefore
     * NOT a numeric line value (so $pointNumeric, parsed from a numeric
     * line.value upstream, is null here) — it has to be pulled out of that
     * string. The old code looked for an Over/Under prefix on the participant
     * name and a numeric line value, found neither, and collapsed every
     * player to one lineless price. Parse the line value first; fall back to
     * the legacy participant-name prefix and bare-numeric shapes.
     */
    private static function buildPropOutcome(string $participantName, string $lineValueRaw, ?float $pointNumeric, int|float $price, ?string $playerId = null, ?float $thresholdPoint = null, bool $soccerYesNo = false): ?array
    {
        if ($participantName === '') return null;

        // Stable player id (Rundown participant.id) so settlement matches the
        // player's box-score stats by id, not by display name. Stamped on every
        // shape; null when the feed didn't carry one.
        $pid = ($playerId !== null && $playerId !== '') ? ['pid' => $playerId] : [];

        $lineValue = trim($lineValueRaw);

        // Primary shape: line value carries the side + point, e.g. "Over 1.5".
        if (preg_match('/^(over|under)\s+([+-]?\d+(?:\.\d+)?)$/i', $lineValue, $m) === 1) {
            return [
                'name'        => ucfirst(strtolower($m[1])),
                'description' => $participantName,
                'price'       => $price,
                'point'       => (float) $m[2],
            ] + $pid;
        }

        // Legacy shape: the participant name itself carries the O/U prefix
        // ("Over 1.5 Luke Kornet"). Keep supporting it.
        if (preg_match('/^(over|under)\s+(.+)$/i', $participantName, $m) === 1) {
            return [
                'name'        => ucfirst(strtolower($m[1])),
                'description' => trim($m[2]),
                'price'       => $price,
                'point'       => $pointNumeric,
            ] + $pid;
        }

        // Soccer "N or more" booking market (no per-line value): synthesize an
        // Over (N-0.5) leg so the existing over/under grader settles it against
        // the player's box-score stat (stat > N-0.5 ⟺ stat ≥ N). One-sided —
        // the feed only offers the "Yes" side, which is exactly this Over.
        if ($thresholdPoint !== null) {
            return [
                'name'        => 'Over',
                'description' => $participantName,
                'price'       => $price,
                'point'       => $thresholdPoint,
            ] + $pid;
        }

        // Non-O/U side label (e.g. "Yes"/"No" for double-double, scorer
        // buckets): use the label as the side, player as the description.
        if ($lineValue !== '' && !is_numeric($lineValue)) {
            return [
                'name'        => $lineValue,
                'description' => $participantName,
                'price'       => $price,
                'point'       => $pointNumeric,
            ] + $pid;
        }

        // Soccer one-sided market with no threshold (first / last goal scorer):
        // the side IS "Yes" (this player to do it). Emit "Yes" so the betslip
        // reads "Lionel Messi Yes", not the player name twice. These have no
        // box-score ordering data, so settlement leaves them 'pending' (manual).
        if ($soccerYesNo) {
            return [
                'name'        => 'Yes',
                'description' => $participantName,
                'price'       => $price,
                'point'       => null,
            ] + $pid;
        }

        // Bare player prop: numeric or empty line value, no side. Prefer the
        // numeric line value as the point when present.
        return [
            'name'        => $participantName,
            'description' => $participantName,
            'price'       => $price,
            'point'       => $pointNumeric ?? ($lineValue !== '' && is_numeric($lineValue) ? (float) $lineValue : null),
        ] + $pid;
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
     * Canonical DISPLAY full name from a Rundown team object. Rundown gives
     * `name` = city/location ("Los Angeles") and `mascot` = "Angels", so the
     * full name is "City Mascot". Derived, never hardcoded. Guards the rare
     * case where `name` already contains the mascot (avoid "Angels Angels"),
     * and falls back to name → abbreviation when a field is missing. This is a
     * display string only — nothing matches on it.
     */
    private static function deriveFullTeamName(array $team): string
    {
        $name = trim((string) ($team['name'] ?? ''));
        $mascot = trim((string) ($team['mascot'] ?? ''));
        if ($name !== '' && $mascot !== '' && stripos($name, $mascot) === false) {
            return $name . ' ' . $mascot;
        }
        if ($name !== '') {
            return $name;
        }
        if ($mascot !== '') {
            return $mascot;
        }
        return trim((string) ($team['abbreviation'] ?? ''));
    }

    /**
     * Normalize a Rundown pitcher_home / pitcher_away object into the compact
     * shape the rest of the app stores and renders:
     *   ['id' => int, 'name' => string, 'hand' => 'R'|'L'|'']
     * `hand` is the throwing hand shown next to the pitcher ("- R" / "- L").
     * Returns null when no pitcher is listed (so non-baseball events and
     * not-yet-announced games carry a clean null rather than an empty shell).
     *
     * @param mixed $pitcher Raw Rundown pitcher object (or null).
     * @return array{id:int,name:string,hand:string}|null
     */
    private static function extractPitcher(mixed $pitcher): ?array
    {
        if (!is_array($pitcher)) {
            return null;
        }
        $name = trim((string) ($pitcher['name'] ?? ''));
        $id   = (int) ($pitcher['id'] ?? 0);
        if ($name === '' && $id <= 0) {
            return null;
        }
        $hand = '';
        if (($pitcher['throws_right_handed'] ?? null) === true) {
            $hand = 'R';
        } elseif (($pitcher['throws_left_handed'] ?? null) === true) {
            $hand = 'L';
        }
        return ['id' => $id, 'name' => $name, 'hand' => $hand];
    }

    /**
     * Convert a Rundown American-odds price to DECIMAL odds.
     *
     * Rundown sends American odds (e.g. -110, +165) in the price field, but
     * every downstream consumer expects DECIMAL odds in outcome.price:
     *   - frontend odds display (formatOdds) + betslip payout math
     *   - bet-time pricing (BetsController -> SportsbookBetSupport::snapDecimalOdds,
     *     which treats price as decimal and rejects values <= 1.0)
     *   - settlement grading
     * Converting at this single ingestion chokepoint keeps exactly one
     * canonical odds format across the platform. American odds are always
     * integers with |value| >= 100, so there is no overlap with the decimal
     * range and the conversion is unambiguous.
     *   american > 0 -> 1 + american / 100    (+165 -> 2.65)
     *   american < 0 -> 1 + 100 / |american|  (-110 -> 1.9090909...)
     * Returns 0.0 for a 0 input; callers already skip non-numeric / off-board
     * prices, and downstream rejects odds <= 1.0.
     */
    private static function priceToDecimal(float $american): float
    {
        $a = round($american);
        if ($a == 0.0) {
            return 0.0;
        }
        if ($a > 0) {
            return 1.0 + ($a / 100.0);
        }
        return 1.0 + (100.0 / abs($a));
    }

    /**
     * House-standard flat American juice for a two-way board market, or null
     * when normalization is off / not applicable. Configured via
     * SPORTSBOOK_FLAT_JUICE_AMERICAN (e.g. -110). Unset / 0 / non-juice value
     * (> -100) disables it. Only 'spreads' and 'totals' are ever flattened.
     *
     * Sport gate: flat juice is a POINT-SPREAD-sport convention (football,
     * basketball → -110 main line). Baseball run lines and hockey puck lines
     * (±1.5) and their totals carry real, moneyline-derived juice and must NOT
     * be flattened — a run line is genuinely +1.5/-160-ish, not -110. So when a
     * sportKey is supplied we only flatten for the configured spread sports.
     * Passing $sportKey = null preserves the legacy "flatten regardless" path.
     */
    /**
     * Parse a Rundown team-total line value into [side, point].
     *
     * Team totals pack the direction and the line into one string:
     * "Over 4.5", "Under 3.5" (case / whitespace tolerant). Returns
     * ['over'|'under', float] or null when the value is not a recognizable
     * team-total line (e.g. a plain numeric game-total value, or off-shape
     * data) — the caller drops null rather than guess a side.
     *
     * @return array{0:string,1:float}|null
     */
    private static function parseTeamTotalLine(string $value): ?array
    {
        if (!preg_match('/^\s*(over|under)\s+(-?\d+(?:\.\d+)?)\s*$/i', $value, $m)) {
            return null;
        }
        return [strtolower($m[1]), (float) $m[2]];
    }

    private static function flatJuiceAmerican(string $marketKey, ?string $sportKey = null): ?int
    {
        if (!in_array($marketKey, self::FLAT_JUICE_MARKETS, true)) {
            return null;
        }
        if ($sportKey !== null && !self::sportGetsFlatJuice($sportKey)) {
            return null;
        }
        $raw = (int) Env::get('SPORTSBOOK_FLAT_JUICE_AMERICAN', '0');
        return $raw <= -100 ? $raw : null;
    }

    /**
     * Whether a sport's spreads/totals get the house flat juice. Configured via
     * SPORTSBOOK_FLAT_JUICE_SPORTS — a comma-separated list of sportKey prefixes
     * (default 'americanfootball,basketball' = the point-spread sports). Empty
     * string means "all sports" (legacy behavior). Baseball, hockey, soccer,
     * tennis, MMA, cricket, etc. are excluded by default so their run/puck lines
     * and totals keep the real feed juice (matches standard sportsbook display).
     */
    private static function sportGetsFlatJuice(string $sportKey): bool
    {
        $sportKey = strtolower(trim($sportKey));
        $raw = trim((string) Env::get('SPORTSBOOK_FLAT_JUICE_SPORTS', 'americanfootball,basketball'));
        if ($raw === '') {
            return true;
        }
        foreach (explode(',', $raw) as $prefix) {
            $prefix = strtolower(trim($prefix));
            if ($prefix !== '' && str_starts_with($sportKey, $prefix)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Decimal price for a CORE board outcome. Moneyline (h2h) and team_totals
     * pass through at the live feed price; spreads/totals are re-priced to the
     * house flat juice when SPORTSBOOK_FLAT_JUICE_AMERICAN is set — the LINE
     * (point) always stays from the feed, only the vig is standardized.
     *
     * Applied at every ingestion write path so the STORED outcome.price is the
     * single source of truth. Bet placement (BetsController::validateSelection
     * reads outcome.price and rejects on drift) and settlement (placement
     * snapshot) therefore always agree with what the player sees. Money-critical.
     */
    public static function boardPriceDecimal(string $marketKey, float $rawAmerican, ?string $sportKey = null): float
    {
        $flat = self::flatJuiceAmerican($marketKey, $sportKey);
        return self::priceToDecimal($flat !== null ? (float) $flat : $rawAmerican);
    }

    /**
     * Display priority for bookmakers, by book key (e.g. "pinnacle,draftkings").
     * The frontend renders the FIRST bookmaker that has markets, so ordering
     * the sharper / broader-coverage book first makes it the one players see.
     * Configured via SPORTSBOOK_PREFERRED_BOOKS; empty preserves upstream order.
     *
     * @return list<string>
     */
    private static function preferredBookOrder(): array
    {
        $raw = trim((string) Env::get('SPORTSBOOK_PREFERRED_BOOKS', ''));
        if ($raw === '') {
            return [];
        }
        return array_values(array_filter(
            array_map(static fn ($s): string => strtolower(trim((string) $s)), explode(',', $raw)),
            static fn (string $s): bool => $s !== ''
        ));
    }
}
