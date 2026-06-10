<?php

declare(strict_types=1);

/**
 * Orchestrates Rundown odds + score sync into the matches collection.
 *
 * Entry points:
 *   - syncSportPrematch(): full event refresh for a sport across the
 *     configured days-ahead window (default 4). Called by the prematch
 *     cron tick once per sport per rotation slot.
 *   - syncSportLive():     full event refresh for today only — picks up
 *     score + status changes plus odds for any newly-live event.
 *     Called by the live cron tick.
 *   - pollDeltasForSport(): /markets/delta cursor-based poll for price
 *     changes only. Optimization layer over syncSportLive for sub-5s
 *     freshness. Auto-rebootstraps when the cursor goes stale.
 *
 * Coverage scope (v1): ALL sport IDs in RundownSportMap. Caller drives
 * the rotation via the existing ODDS_TIER*_SPORTS lists; this service
 * is sport-agnostic.
 */
final class RundownSyncService
{
    private const COLLECTION = 'matches';

    /**
     * Max /markets/delta pages drained in a single live poll. Each page is
     * up to 1000 changes; 5 pages (5000 changes/sport/tick) is far above any
     * real per-tick volume, so this only caps a pathological backlog — the
     * saved cursor lets the next tick resume from where we stopped.
     */
    private const DELTA_MAX_PAGES_PER_POLL = 5;

    /**
     * Statuses that carry a confirmed outcome and are safe to settle on.
     * Mirrors BetSettlementService::settlePendingMatches — 'finished' grades
     * against the final score, 'canceled' voids with refund. 'expired' is
     * intentionally NOT here: that is the "feed went quiet" catch-all and
     * must stay pending for an operator to confirm before money moves.
     */
    private const SETTLE_TERMINAL_STATUSES = ['finished', 'canceled', 'cancelled'];

    /**
     * Per-sport coalesce timestamps (ms) for realtime odds events. The WS
     * daemon's applyWsMessage fires ~1000×/min across all sports, so we MUST
     * NOT write one RealtimeEventBus line per price tick. Instead we emit at
     * most one `odds:sync` event per sport per REALTIME_ODDS_EVENT_MIN_MS
     * window. One event tells the browser "this sport's odds moved — refetch";
     * the actual prices ride the normal /api/matches response. These maps are
     * static so they persist for the lifetime of a long-running daemon (the
     * WS daemon + odds-worker); in PHP-FPM they reset per request, which is
     * fine — at most one event per request there.
     *
     * @var array<string,float>
     */
    private static array $lastOddsEventAtMs = [];

    /**
     * Publish a coalesced realtime "odds moved" signal for a sport. Feeds both
     * the downstream browser WebSocket (ws-server.php tails the same event log
     * and broadcasts to subscribers) AND the REST /api/sync/recent poll
     * fallback — both turn it into a `matches:force-refetch` on the client.
     * Display-only: bet placement still re-validates odds server-side, so a
     * dropped/late event never affects money.
     */
    private static function publishOddsEvent(string $sportKey, array $extra = []): void
    {
        $sportKey = trim($sportKey);
        if ($sportKey === '' || !class_exists('RealtimeEventBus')) {
            return;
        }
        $minIntervalMs = (int) Env::get('REALTIME_ODDS_EVENT_MIN_MS', '1000');
        $now = microtime(true) * 1000.0;
        if ($minIntervalMs > 0) {
            $last = self::$lastOddsEventAtMs[$sportKey] ?? 0.0;
            if (($now - $last) < $minIntervalMs) {
                return;
            }
            self::$lastOddsEventAtMs[$sportKey] = $now;
        }
        try {
            RealtimeEventBus::publish('odds:sync', array_merge([
                'sport_key' => $sportKey,
                'ts'        => gmdate(DATE_ATOM),
            ], $extra));
        } catch (Throwable $e) {
            // Realtime is best-effort; never let it break a sync/bet path.
        }
    }

    /**
     * @return array{
     *     ok:bool,
     *     skipped?:string,
     *     eventsSeen:int,
     *     created:int,
     *     updated:int,
     *     bookmakersAvg:float,
     *     errors:int,
     *     daysCovered:int
     * }
     */
    public static function syncSportPrematch(SqlRepository $db, string $sportKey, int $sportId, ?int $daysAhead = null): array
    {
        if (!RundownClient::isConfigured()) {
            return self::skippedResult('not_configured') + ['bookmakersAvg' => 0.0, 'daysCovered' => 0];
        }
        $days = max(1, $daysAhead ?? (int) Env::get('RUNDOWN_PREMATCH_DAYS_AHEAD', '4'));
        $base = self::baseQueryParams();
        $offsetSeconds = self::offsetSeconds();
        $eventsSeen = $created = $updated = $errors = $bookmakersTotal = 0;
        $daysCovered = 0;
        // DEBUG-RUNDOWN: per-stage drop counters (gated, remove when done).
        $dbgRaw = $dbgUnmapped = $dbgNoOdds = $dbgWithOdds = 0;
        $dbg = self::debugSyncEnabled();

        for ($i = 0; $i < $days; $i++) {
            $date = gmdate('Y-m-d', time() - $offsetSeconds + ($i * 86400));
            try {
                $resp = RundownClient::getEventsForSport($sportId, $date, $base);
                $daysCovered++;
                if (!is_array($resp)) continue;
                $events = is_array($resp['events'] ?? null) ? $resp['events'] : [];
                $dbgRaw += count($events); // DEBUG-RUNDOWN
                foreach ($events as $event) {
                    if (!is_array($event)) continue;
                    $eventsSeen++;
                    $doc = RundownEventMapper::toMatchDoc($event, $sportKey);
                    if ($doc === null) { $dbgUnmapped++; continue; } // DEBUG-RUNDOWN
                    $bmCount = count(is_array($doc['odds']['bookmakers'] ?? null) ? $doc['odds']['bookmakers'] : []);
                    $bookmakersTotal += $bmCount;
                    if ($dbg) { $bmCount > 0 ? $dbgWithOdds++ : $dbgNoOdds++; } // DEBUG-RUNDOWN
                    if (self::upsertMatch($db, $doc)) {
                        $created++;
                    } else {
                        $updated++;
                    }
                }
                // Bootstrap the live delta cursor while we have the
                // events response in hand — only on the first day's
                // call (today), since later days don't contribute to
                // the live cursor.
                if ($i === 0) {
                    $lastId = self::extractDeltaCursor($resp);
                    if ($lastId !== null) {
                        RundownDeltaCursor::set($sportId, $lastId);
                    }
                }
            } catch (Throwable $e) {
                $errors++;
                Logger::warning('rundown.syncSportPrematch error', [
                    'sportKey' => $sportKey,
                    'sportId'  => $sportId,
                    'date'     => $date,
                    'error'    => $e->getMessage(),
                ], 'sportsbook');
            }
        }

        if ($daysCovered > 0 && $errors < $daysCovered) {
            SportsbookHealth::recordOddsSourceSuccess($db, false);
        }
        // DEBUG-RUNDOWN: one line per sport sync showing where events drop.
        // raw = events returned by Rundown across all days fetched;
        // unmapped = dropped by mapper (no teams / bad sport_id);
        // withOdds = mapped rows that carry >=1 bookmaker (will LIST);
        // noOdds = mapped rows with empty bookmakers (stored, but hidden by
        //          the display markets-gate until lines post — see H4).
        if ($dbg) {
            Logger::info('DEBUG-RUNDOWN prematch', [
                'sportKey'    => $sportKey,
                'sportId'     => $sportId,
                'endpoint'    => "/sports/{$sportId}/events/{date}",
                'firstDate'   => gmdate('Y-m-d', time() - $offsetSeconds),
                'daysCovered' => $daysCovered,
                'raw'         => $dbgRaw,
                'unmapped'    => $dbgUnmapped,
                'withOdds'    => $dbgWithOdds,
                'noOdds'      => $dbgNoOdds,
                'created'     => $created,
                'updated'     => $updated,
                'errors'      => $errors,
            ], 'sportsbook');
        }
        $avg = $eventsSeen > 0 ? round($bookmakersTotal / $eventsSeen, 2) : 0.0;
        if (($created + $updated) > 0) {
            // Push so anyone viewing this sport's upcoming board refetches and
            // sees fresh lines without waiting for the ~60s prematch poll.
            self::publishOddsEvent($sportKey, ['src' => 'prematch']);
        }
        return [
            'ok'             => $errors === 0,
            'eventsSeen'     => $eventsSeen,
            'created'        => $created,
            'updated'        => $updated,
            'bookmakersAvg'  => $avg,
            'errors'         => $errors,
            'daysCovered'    => $daysCovered,
        ];
    }

    /**
     * Full event refresh for today only. Picks up score, status, and
     * odds changes for any in-progress event.
     *
     * @return array<string,mixed>
     */
    public static function syncSportLive(SqlRepository $db, string $sportKey, int $sportId): array
    {
        if (!RundownClient::isConfigured()) {
            return self::skippedResult('not_configured');
        }
        $offsetSeconds = self::offsetSeconds();
        $date = gmdate('Y-m-d', time() - $offsetSeconds);
        // RUNDOWN_LIVE_ALL_LINES=true drops main_line=true on the LIVE pull so
        // sports without a main-line flag (tennis et al.) aren't filtered to
        // empty by hide_no_markets — the fix for live tennis/Challenger/ITF
        // events never reaching the board. Prematch/schedule keep main_line.
        $allLines = filter_var(Env::get('RUNDOWN_LIVE_ALL_LINES', 'false'), FILTER_VALIDATE_BOOLEAN);
        $base = self::baseQueryParams($allLines);
        $eventsSeen = $created = $updated = $errors = 0;

        try {
            $resp = RundownClient::getEventsForSport($sportId, $date, $base);
            if (!is_array($resp)) {
                return ['ok' => true, 'eventsSeen' => 0, 'created' => 0, 'updated' => 0, 'errors' => 0];
            }
            $events = is_array($resp['events'] ?? null) ? $resp['events'] : [];
            $dbgRaw = count($events); // DEBUG-RUNDOWN
            $dbgUnmapped = $dbgNoOdds = $dbgWithOdds = 0; // DEBUG-RUNDOWN
            foreach ($events as $event) {
                if (!is_array($event)) continue;
                $eventsSeen++;
                $doc = RundownEventMapper::toMatchDoc($event, $sportKey);
                if ($doc === null) { $dbgUnmapped++; continue; } // DEBUG-RUNDOWN
                // DEBUG-RUNDOWN
                count(is_array($doc['odds']['bookmakers'] ?? null) ? $doc['odds']['bookmakers'] : []) > 0
                    ? $dbgWithOdds++ : $dbgNoOdds++;
                if (self::upsertMatch($db, $doc)) {
                    $created++;
                } else {
                    $updated++;
                }
            }
            $lastId = self::extractDeltaCursor($resp);
            if ($lastId !== null) {
                RundownDeltaCursor::set($sportId, $lastId);
            }
            SportsbookHealth::recordOddsSourceSuccess($db, true);
            if ($eventsSeen > 0) {
                self::publishOddsEvent($sportKey, ['src' => 'live']);
            }
            // DEBUG-RUNDOWN: one line per live sport sync (remove when done).
            if (self::debugSyncEnabled()) {
                Logger::info('DEBUG-RUNDOWN live', [
                    'sportKey' => $sportKey, 'sportId' => $sportId,
                    'endpoint' => "/sports/{$sportId}/events/{$date}",
                    'raw' => $dbgRaw, 'unmapped' => $dbgUnmapped,
                    'withOdds' => $dbgWithOdds, 'noOdds' => $dbgNoOdds,
                    'created' => $created, 'updated' => $updated,
                ], 'sportsbook');
            }
        } catch (Throwable $e) {
            $errors++;
            Logger::warning('rundown.syncSportLive error', [
                'sportKey' => $sportKey,
                'sportId'  => $sportId,
                'error'    => $e->getMessage(),
            ], 'sportsbook');
        }
        return [
            'ok'         => $errors === 0,
            'eventsSeen' => $eventsSeen,
            'created'    => $created,
            'updated'    => $updated,
            'errors'     => $errors,
        ];
    }

    /**
     * Fast, cheap LIVE-SCORE sweep. Pulls current score + inning/clock for a
     * sport's in-progress events from the events endpoint (no affiliate_ids →
     * no odds data-point cost) and patches ONLY the score block via
     * scoreUpdate() — bookmakers/odds are never touched, so it can run far
     * more often than the full sweep without clobbering WS odds or burning
     * Rundown credit. Built because the event-delta poll (/api/v2/delta) is
     * unbootstrappable at this account's volume, leaving scores otherwise
     * stuck on the slow full-refresh cadence.
     *
     * This is also the TERMINAL-STATUS fast path: the upstream query
     * includes finals (every other pull excludes them), so a finished /
     * canceled game flips off the live board within one sweep (~20s)
     * instead of staying live-and-bettable with frozen odds until the
     * reaper (~5 min). Settlement still owns GRADING — this only flips
     * the status that settlement keys on (and feeds it the final score).
     * Rows already terminal in the DB are never rewritten or resurrected
     * from here. Only existing rows are patched (new events are created
     * by the full sync).
     *
     * @return array<string,mixed>
     */
    public static function syncSportLiveScores(SqlRepository $db, string $sportKey, int $sportId): array
    {
        if (!RundownClient::isConfigured()) {
            return self::skippedResult('not_configured');
        }
        $offsetNow = time() - self::offsetSeconds();
        // Late games cross the offset-day boundary (~midnight ET) while
        // still in progress — a 10:30 PM ET tip is on "yesterday's" date
        // endpoint until it ends. For the first 6h after the boundary,
        // sweep yesterday too, or those games get frozen scores, never
        // flip to finished, and age out of the odds heartbeat.
        $dates = [gmdate('Y-m-d', $offsetNow)];
        if ($offsetNow % 86400 < 6 * 3600) {
            array_unshift($dates, gmdate('Y-m-d', $offsetNow - 86400));
        }
        $eventsSeen = $updated = $errors = 0;
        $finishedMatchIds = [];
        try {
            $events = [];
            foreach ($dates as $date) {
                $resp = RundownClient::getEventsForSport($sportId, $date, self::baseQueryParamsScores());
                if (is_array($resp) && is_array($resp['events'] ?? null)) {
                    $events = array_merge($events, $resp['events']);
                }
            }
            foreach ($events as $event) {
                if (!is_array($event)) continue;
                $eventId = trim((string) ($event['event_id'] ?? ''));
                if ($eventId === '') continue;
                $eventsSeen++;
                $matchId = RundownEventMapper::deterministicMatchId($eventId);
                // Patch only — never create here. A missing row means the
                // event hasn't been synced yet; the full/prematch sync owns
                // creation (with odds).
                $row = $db->findOne('matches', ['id' => $matchId]);
                if ($row === null) {
                    continue;
                }
                // Settled/expired rows are closed business: don't rewrite
                // their score every sweep and never resurrect them if the
                // feed briefly reports a final game as in-progress again.
                $rowStatus = strtolower((string) ($row['status'] ?? ''));
                if (in_array($rowStatus, ['finished', 'canceled', 'cancelled', 'expired'], true)) {
                    continue;
                }
                try {
                    $patch = RundownEventMapper::scoreUpdate($event);
                    $db->updateOne('matches', ['id' => $matchId], $patch);
                    $updated++;
                    $newStatus = (string) ($patch['status'] ?? '');
                    if (in_array($newStatus, ['finished', 'canceled'], true)) {
                        $finishedMatchIds[] = $matchId;
                    }
                } catch (Throwable $rowErr) {
                    $errors++;
                }
            }
            if ($updated > 0) {
                SportsbookHealth::recordOddsSourceSuccess($db, false);
                // Tell the browser a score moved → it refetches and shows the
                // new score/inning. App.jsx + useLiveSyncPoll both handle the
                // `odds:sport:score` channel (does NOT advance odds-freshness,
                // so the bet-ability gate stays honest).
                if (class_exists('RealtimeEventBus')) {
                    try {
                        RealtimeEventBus::publish('odds:sport:score', [
                            'sport_key' => $sportKey,
                            'updated'   => $updated,
                            'ts'        => gmdate(DATE_ATOM),
                        ]);
                    } catch (Throwable $pubErr) {
                        // best-effort
                    }
                }
            }
        } catch (Throwable $e) {
            $errors++;
            Logger::warning('rundown.syncSportLiveScores error', [
                'sportKey' => $sportKey,
                'sportId'  => $sportId,
                'error'    => $e->getMessage(),
            ], 'sportsbook');
        }
        return ['ok' => $errors === 0, 'eventsSeen' => $eventsSeen, 'updated' => $updated, 'errors' => $errors, 'finishedMatchIds' => $finishedMatchIds];
    }

    /**
     * Full-market refresh for a single event — pulls core + player props
     * + period markets + alt lines in one /events/{id} call. Heavier than
     * syncSportLive() per event but produces complete prop coverage.
     *
     * @return array<string,mixed>
     */
    public static function syncEventFull(SqlRepository $db, string $eventId, ?string $sportKey = null): array
    {
        if (!RundownClient::isConfigured()) {
            return self::skippedResult('not_configured');
        }
        $params = ['market_ids' => RundownMarketMap::csvForFullCoverage()];
        $affiliateIds = trim((string) Env::get('RUNDOWN_AFFILIATE_IDS', ''));
        if ($affiliateIds !== '') {
            $params['affiliate_ids'] = $affiliateIds;
        }
        try {
            $resp = RundownClient::getEvent($eventId, $params);
            if (!is_array($resp)) {
                return self::skippedResult('upstream_returned_null');
            }
            $events = is_array($resp['events'] ?? null) ? $resp['events'] : [];
            $event  = $events[0] ?? null;
            if (!is_array($event)) {
                return ['ok' => false, 'error' => 'event_not_found'];
            }
            $doc = RundownEventMapper::toMatchDoc($event, $sportKey);
            if ($doc === null) {
                return ['ok' => false, 'error' => 'unmappable_event'];
            }
            $inserted = self::upsertMatch($db, $doc);
            SportsbookHealth::recordOddsSourceSuccess($db, false);
            return [
                'ok'        => true,
                'eventId'   => $eventId,
                'matchId'   => (string) $doc['id'],
                'inserted'  => $inserted,
                'propsCount' => count(is_array($doc['playerProps'] ?? null) ? $doc['playerProps'] : []),
                'extendedCount' => count(is_array($doc['extendedMarkets'] ?? null) ? $doc['extendedMarkets'] : []),
            ];
        } catch (Throwable $e) {
            Logger::warning('rundown.syncEventFull error', [
                'eventId' => $eventId,
                'error'   => $e->getMessage(),
            ], 'sportsbook');
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Sport-wide full sync: walk every event the prematch endpoint
     * returns for the configured days-ahead window, but request the
     * FULL market_ids list (core + props + alts) on each call.
     *
     * More expensive than syncSportPrematch (data-point-wise) but
     * delivers prop + period market coverage in one pass — meant for
     * Ultra-plan deployments where data points are plentiful.
     *
     * @return array<string,mixed>
     */
    public static function syncSportFull(SqlRepository $db, string $sportKey, int $sportId, ?int $daysAhead = null): array
    {
        if (!RundownClient::isConfigured()) {
            return self::skippedResult('not_configured');
        }
        $days = max(1, $daysAhead ?? (int) Env::get('RUNDOWN_PREMATCH_DAYS_AHEAD', '4'));
        $base = self::baseQueryParamsFull();
        $offsetSeconds = self::offsetSeconds();
        $eventsSeen = $created = $updated = $errors = $propsTotal = 0;
        $daysCovered = 0;

        for ($i = 0; $i < $days; $i++) {
            $date = gmdate('Y-m-d', time() - $offsetSeconds + ($i * 86400));
            try {
                $resp = RundownClient::getEventsForSport($sportId, $date, $base);
                $daysCovered++;
                if (!is_array($resp)) continue;
                $events = is_array($resp['events'] ?? null) ? $resp['events'] : [];
                foreach ($events as $event) {
                    if (!is_array($event)) continue;
                    $eventsSeen++;
                    $doc = RundownEventMapper::toMatchDoc($event, $sportKey);
                    if ($doc === null) continue;
                    $propsTotal += count(is_array($doc['playerProps'] ?? null) ? $doc['playerProps'] : []);
                    if (self::upsertMatch($db, $doc)) {
                        $created++;
                    } else {
                        $updated++;
                    }
                }
                if ($i === 0) {
                    $lastId = self::extractDeltaCursor($resp);
                    if ($lastId !== null) {
                        RundownDeltaCursor::set($sportId, $lastId);
                    }
                }
            } catch (Throwable $e) {
                $errors++;
                Logger::warning('rundown.syncSportFull error', [
                    'sportKey' => $sportKey,
                    'sportId'  => $sportId,
                    'date'     => $date,
                    'error'    => $e->getMessage(),
                ], 'sportsbook');
            }
        }

        if ($daysCovered > 0 && $errors < $daysCovered) {
            SportsbookHealth::recordOddsSourceSuccess($db, false);
        }
        return [
            'ok'           => $errors === 0,
            'eventsSeen'   => $eventsSeen,
            'created'      => $created,
            'updated'      => $updated,
            'errors'       => $errors,
            'daysCovered'  => $daysCovered,
            'propsTotal'   => $propsTotal,
        ];
    }

    /**
     * Season-schedule sync for sports whose fixtures are published months
     * ahead (NFL, etc.). Looping every day would be ~100+ mostly-empty calls;
     * instead ask Rundown which dates actually have events (/sports/dates) and
     * fetch only those, bounded by RUNDOWN_SEASON_DAYS_AHEAD (horizon) and
     * RUNDOWN_SEASON_MAX_DATES (credit cap). Additive + fail-safe: every fetch
     * is try/caught so a bad response can never break the daily board.
     *
     * @return array<string,mixed>
     */
    public static function syncSportSchedule(SqlRepository $db, string $sportKey, int $sportId): array
    {
        if (!RundownClient::isConfigured()) {
            return self::skippedResult('not_configured');
        }
        $horizonDays = max(1, (int) Env::get('RUNDOWN_SEASON_DAYS_AHEAD', '180'));
        $maxDates    = max(1, (int) Env::get('RUNDOWN_SEASON_MAX_DATES', '40'));
        $base = self::baseQueryParams(); // core markets only — schedule board

        try {
            $resp  = RundownClient::getDatesForSports([$sportId], ['format' => 'date']);
            $dates = self::extractScheduleDates($resp);
        } catch (Throwable $e) {
            Logger::warning('rundown.syncSportSchedule dates error', [
                'sportKey' => $sportKey, 'sportId' => $sportId, 'error' => $e->getMessage(),
            ], 'sportsbook');
            return ['ok' => false, 'error' => $e->getMessage()];
        }

        $todayYmd = gmdate('Y-m-d', time() - self::offsetSeconds());
        $cutoff   = gmdate('Y-m-d', time() - self::offsetSeconds() + ($horizonDays * 86400));
        $future = [];
        foreach ($dates as $d) {
            $ymd = substr((string) $d, 0, 10);
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $ymd) !== 1) continue;
            if ($ymd < $todayYmd || $ymd > $cutoff) continue;
            $future[$ymd] = true;
        }
        $future = array_keys($future);
        sort($future);
        $future = array_slice($future, 0, $maxDates);

        $eventsSeen = $created = $updated = $errors = $datesFetched = 0;
        foreach ($future as $date) {
            try {
                $r = RundownClient::getEventsForSport($sportId, $date, $base);
                $datesFetched++;
                if (!is_array($r)) continue;
                foreach ((is_array($r['events'] ?? null) ? $r['events'] : []) as $event) {
                    if (!is_array($event)) continue;
                    $eventsSeen++;
                    $doc = RundownEventMapper::toMatchDoc($event, $sportKey);
                    if ($doc === null) continue;
                    if (self::upsertMatch($db, $doc)) { $created++; } else { $updated++; }
                }
            } catch (Throwable $e) {
                $errors++;
                Logger::warning('rundown.syncSportSchedule fetch error', [
                    'sportKey' => $sportKey, 'date' => $date, 'error' => $e->getMessage(),
                ], 'sportsbook');
            }
        }
        if ($datesFetched > 0 && $errors < $datesFetched) {
            SportsbookHealth::recordOddsSourceSuccess($db, false);
        }
        return [
            'ok' => $errors === 0, 'eventsSeen' => $eventsSeen, 'created' => $created,
            'updated' => $updated, 'datesAvailable' => count($future), 'datesFetched' => $datesFetched, 'errors' => $errors,
        ];
    }

    /**
     * Defensive extraction of date strings from a /sports/dates response. The
     * payload may be {dates:[...]}, {data:[...]}, or a bare list; entries may be
     * "YYYY-MM-DD" or full ISO timestamps. Returns whatever date-like strings
     * it can find — empty array on anything unexpected (fail-safe).
     *
     * @param mixed $resp
     * @return list<string>
     */
    private static function extractScheduleDates(mixed $resp): array
    {
        if (!is_array($resp)) return [];

        // Collect every date-list bucket we can find:
        //   - top-level {dates:[...]} or {data:[...]}
        //   - V2 /sports/dates shape, keyed by sport_id: {"2":{"dates":[...]}}
        //   - a bare list
        $buckets = [];
        if (is_array($resp['dates'] ?? null)) $buckets[] = $resp['dates'];
        if (is_array($resp['data'] ?? null))  $buckets[] = $resp['data'];
        foreach ($resp as $v) {
            if (is_array($v) && is_array($v['dates'] ?? null)) {
                $buckets[] = $v['dates'];
            }
        }
        if ($buckets === [] && array_is_list($resp)) $buckets[] = $resp;

        $out = [];
        foreach ($buckets as $list) {
            foreach ($list as $c) {
                if (is_string($c) && $c !== '') {
                    $out[] = $c;
                } elseif (is_array($c)) {
                    $v = $c['date'] ?? $c['date_event'] ?? $c['event_date'] ?? null;
                    if (is_string($v) && $v !== '') $out[] = $v;
                }
            }
        }
        return $out;
    }

    /**
     * /markets/delta cursor-based poll for price changes only.
     * Cheaper than syncSportLive (delta-only payload, no event details).
     * Returns 'cursor_stale_rebootstrapping' when the cursor needs a
     * fresh syncSportLive() pass first.
     *
     * @return array<string,mixed>
     */
    public static function pollDeltasForSport(SqlRepository $db, string $sportKey, int $sportId): array
    {
        if (!RundownClient::isConfigured()) {
            return self::skippedResult('not_configured');
        }
        if (RundownDeltaCursor::isStale($sportId)) {
            return self::skippedResult('cursor_stale_rebootstrapping');
        }
        $lastId = RundownDeltaCursor::get($sportId);
        if ($lastId === null) {
            return self::skippedResult('cursor_missing');
        }

        // NO market_ids filter. The cursor delta returns ONLY prices that
        // moved since $lastId, so pulling every market in one call is cheap
        // and — crucially — lets period lines (Q1-Q4 / H1-H2 / innings / NHL
        // periods / tennis sets) tick at the SAME cadence as the main board,
        // instead of freezing until the next slow full refresh. applyDelta()
        // drops markets we don't render before touching the DB, so the extra
        // prop / correct-score churn costs nothing.
        //
        // We deliberately do NOT pass the explicit period market_ids list:
        // Rundown 400s on large market_ids requests (the documented 12-cap),
        // which is exactly what forced the old core-only filter and froze
        // period prices. Omitting the filter sidesteps the cap entirely and
        // adds zero extra requests (same one delta call per sport per tick).
        $params = ['sport_id' => $sportId];
        $affiliateIds = trim((string) Env::get('RUNDOWN_AFFILIATE_IDS', ''));
        if ($affiliateIds !== '') {
            $params['affiliate_ids'] = $affiliateIds;
        }

        $applied = 0;
        $skipped = 0;
        $errors  = 0;
        try {
            // Drain has_more within the tick so a high-volume pass (many books
            // moving at once) fully catches up to the latest cursor, instead
            // of letting a single 1000-row page truncate and leave core/period
            // changes a tick behind. Bounded so a pathological backlog can't
            // spin — the saved cursor lets the next tick resume cleanly.
            $cursorId = $lastId;
            $pages = 0;
            do {
                $resp = RundownClient::getDelta($cursorId, $params);
                if (!is_array($resp)) {
                    break;
                }
                $deltas = is_array($resp['deltas'] ?? null) ? $resp['deltas'] : [];
                foreach ($deltas as $delta) {
                    if (!is_array($delta)) continue;
                    if (self::applyDelta($db, $delta)) {
                        $applied++;
                    } else {
                        $skipped++;
                    }
                }
                $cursor = $resp['meta']['delta_last_id'] ?? null;
                if (is_numeric($cursor) && (int) $cursor > 0) {
                    $cursorId = (int) $cursor;
                    RundownDeltaCursor::set($sportId, $cursorId);
                }
                $hasMore = (bool) ($resp['meta']['has_more'] ?? false);
                $pages++;
            } while ($hasMore && $pages < self::DELTA_MAX_PAGES_PER_POLL);

            if ($applied > 0) {
                SportsbookHealth::recordOddsSourceSuccess($db, false);
                self::publishOddsEvent($sportKey, ['src' => 'delta', 'applied' => $applied]);
            } elseif (RundownClient::quotaExhausted()) {
                // Credits/datapoints are exhausted: the "clean" 200 above is a
                // dead feed returning an empty delta, NOT a genuinely quiet
                // live minute. Do NOT heartbeat — let lastOddsSyncAt age out so
                // the freshness gate drops these rows and betting suspends,
                // instead of freezing stale odds on screen indefinitely. The
                // global feed-stale gate also keys off lastOddsSyncAt, so a
                // false heartbeat here would silently defeat that too.
                Logger::warning('rundown.pollDeltasForSport heartbeat skipped — quota exhausted', [
                    'sportKey' => $sportKey,
                    'sportId'  => $sportId,
                ], 'sportsbook');
            } else {
                // Heartbeat — the upstream responded cleanly but no prices
                // moved. Bump lastOddsSyncAt on live rows of this sport so
                // the freshness filter keeps them visible. The cursor
                // advancing IS proof that we're actively polling; without
                // this the row would drift past the 90s/180s staleness
                // cliff (and stop being bettable) even though the worker
                // is doing its job. NOTE: lastUpdated is NOT touched here
                // — only the odds-freshness timestamp.
                //
                // Scoped to rows the score sweep has confirmed recently:
                // a game that finished or vanished from the feed stops
                // producing deltas, and an unscoped heartbeat kept badging
                // its frozen odds "fresh" forever — the freshness gates
                // never tripped and the dead line stayed bettable. The
                // sweep stamps lastScoreSyncAt every ~20s per live sport,
                // so 600s tolerates long upstream blips while still
                // letting truly-gone rows age out.
                try {
                    $db->updateMany(
                        'matches',
                        [
                            'sportKey'        => $sportKey,
                            'status'          => 'live',
                            'lastScoreSyncAt' => ['$gt' => gmdate(DATE_ATOM, time() - 600)],
                        ],
                        ['lastOddsSyncAt' => SqlRepository::nowUtc()]
                    );
                } catch (Throwable $heartbeatErr) {
                    Logger::warning('rundown.pollDeltasForSport heartbeat failed', [
                        'sportKey' => $sportKey,
                        'sportId'  => $sportId,
                        'error'    => $heartbeatErr->getMessage(),
                    ], 'sportsbook');
                }
            }
        } catch (Throwable $e) {
            $errors++;
            // Rundown returns 400 when cursor is older than 30 min →
            // force re-bootstrap from the events endpoint next tick.
            if (str_contains($e->getMessage(), '400 bad request')) {
                RundownDeltaCursor::forget($sportId);
            }
            Logger::warning('rundown.pollDeltasForSport error', [
                'sportKey' => $sportKey,
                'sportId'  => $sportId,
                'error'    => $e->getMessage(),
            ], 'sportsbook');
        }
        return ['ok' => $errors === 0, 'applied' => $applied, 'skipped' => $skipped, 'errors' => $errors];
    }

    /**
     * Apply a single market_price WebSocket message to the matches doc.
     *
     * Message shape (per https://docs.therundown.io/api-reference/v2/websocket):
     *   meta: { type: "market_price"|"heartbeat", version, timestamp }
     *   data: { id, event_id, affiliate_id, market_id, line, price,
     *           previous_price, is_main_line, sport_id,
     *           market_participant_id, normalized_market_participant_id,
     *           normalized_market_participant_type, updated_at }
     *
     * Returns true if the matches doc was modified.
     */
    public static function applyWsMessage(SqlRepository $db, array $message): bool
    {
        $meta = is_array($message['meta'] ?? null) ? $message['meta'] : [];
        if (($meta['type'] ?? '') !== 'market_price') return false;

        $data = is_array($message['data'] ?? null) ? $message['data'] : [];
        $eventId = trim((string) ($data['event_id'] ?? ''));
        if ($eventId === '') return false;
        $marketId = (int) ($data['market_id'] ?? 0);
        $affiliateId = (int) ($data['affiliate_id'] ?? 0);
        $marketKey = RundownMarketMap::oddsApiKey($marketId);
        $book = RundownAffiliateMap::lookup($affiliateId);
        if ($marketKey === null || $book === null) return false;

        $priceRaw = $data['price'] ?? null;
        if (!is_numeric($priceRaw)) return false;
        $priceFloat = (float) $priceRaw;
        $offBoard = abs($priceFloat - 0.0001) < 1e-6;
        $isMain = (bool) ($data['is_main_line'] ?? false);
        // v1 WS handler updates only main-line core markets. Alt-line and
        // prop updates would need richer outcome lookup; they still come
        // through REST delta polling on the safety-net cadence.
        if (!$isMain) return false;

        $matchId = RundownEventMapper::deterministicMatchId($eventId);

        // Check if event exists; backfill if not (outside transaction since
        // backfill does its own network I/O + writes).
        $probe = $db->findOne('matches', ['id' => $matchId]);
        if ($probe === null) {
            SharedFileCache::remember(
                'rundown-ws-event-backfill',
                $eventId,
                60,
                static function () use ($db, $eventId): array {
                    $r = RundownSyncService::syncEventFull($db, $eventId);
                    return ['ok' => (bool) ($r['ok'] ?? false), 'at' => time()];
                }
            );
        }

        $pid = $data['normalized_market_participant_id'] ?? $data['market_participant_id'] ?? null;
        $priceId = $data['id'] ?? null;
        $lineRaw = (string) ($data['line'] ?? '');
        $point = ($lineRaw !== '' && is_numeric($lineRaw)) ? (float) $lineRaw : null;

        // Atomic read-modify-write: lock the row to prevent concurrent
        // WS messages from overwriting each other's bookmaker patches.
        $db->beginTransaction();
        try {
            $existing = $db->findOneForUpdate('matches', ['id' => $matchId]);
            if ($existing === null) {
                $db->rollback();
                return false;
            }

            $bookmakers = is_array($existing['odds']['bookmakers'] ?? null) ? $existing['odds']['bookmakers'] : [];
            $changed = false;

            foreach ($bookmakers as $bmIdx => $bm) {
                if (!is_array($bm) || ($bm['key'] ?? '') !== $book['key']) continue;
                $markets = is_array($bm['markets'] ?? null) ? $bm['markets'] : [];
                foreach ($markets as $mIdx => $m) {
                    if (!is_array($m) || ($m['key'] ?? '') !== $marketKey) continue;
                    $outcomes = is_array($m['outcomes'] ?? null) ? $m['outcomes'] : [];
                    foreach ($outcomes as $oIdx => $o) {
                        if (!is_array($o)) continue;
                        $matches = false;
                        if ($priceId !== null && isset($o['priceId']) && (string) $o['priceId'] === (string) $priceId) {
                            $matches = true;
                        }
                        if (!$matches && $pid !== null && isset($o['pid']) && (string) $o['pid'] === (string) $pid) {
                            $matches = true;
                        }
                        if (!$matches && $point !== null && isset($o['point']) && abs(((float) $o['point']) - $point) < 1e-4) {
                            $matches = true;
                        }
                        if (!$matches) continue;

                        if ($offBoard) {
                            unset($outcomes[$oIdx]);
                        } else {
                            $o['price'] = RundownEventMapper::boardPriceDecimal($marketKey, $priceFloat, (string) ($existing['sportKey'] ?? ''));
                            if ($point !== null) {
                                $o['point'] = $point;
                            }
                            $outcomes[$oIdx] = $o;
                        }
                        $markets[$mIdx]['outcomes'] = array_values($outcomes);
                        $changed = true;
                        break;
                    }
                }
                $bm['markets'] = array_values($markets);
                $bm['lastUpdate'] = SqlRepository::nowUtc();
                $bookmakers[$bmIdx] = $bm;
                if ($changed) break;
            }

            if (!$changed) {
                $db->rollback();
                return false;
            }

            $db->updateOne('matches', ['id' => $matchId], [
                'odds'           => ['bookmakers' => $bookmakers],
                'lastOddsSyncAt' => SqlRepository::nowUtc(),
                'lastUpdated'    => SqlRepository::nowUtc(),
                'updatedAt'      => SqlRepository::nowUtc(),
                'oddsSource'     => RundownEventMapper::ODDS_SOURCE_TAG,
            ]);
            $db->commit();
            self::publishOddsEvent((string) ($existing['sportKey'] ?? ''), ['src' => 'ws']);
            return true;
        } catch (Throwable $e) {
            $db->rollback();
            throw $e;
        }
    }

    /**
     * /api/v2/delta event-level delta poll — picks up score, status,
     * and market changes in one call. Cheaper than syncSportLive() and
     * intended for the live-score / status-update path (per the docs'
     * efficient-polling guide).
     *
     * @return array<string,mixed>
     */
    /**
     * Per-sport backoff (unix ts) for the event-delta poll. When the cursor
     * has fallen so far behind that Rundown rejects even the zero-UUID
     * bootstrap with "too many events since last_id", re-bootstrapping every
     * tick is futile and just burns API quota + spams the log. We back off and
     * retry occasionally. Worker-process scoped (resets on restart, which is
     * fine — one 400 re-arms it). Finished detection is NOT lost: the 60s
     * settlement sweep heals finished games via getEvent (tryRundownFinalRefetch)
     * + looksProvablyFinished, and live scores come from syncSportLive.
     *
     * @var array<int,int>
     */
    private static array $eventDeltaBackoffUntil = [];

    /** Seconds to suppress the event-delta poll for a sport after it proves unbootstrappable. */
    private const EVENT_DELTA_BACKOFF_SECONDS = 600;

    public static function pollEventDeltasForSport(SqlRepository $db, string $sportKey, int $sportId): array
    {
        if (!RundownClient::isConfigured()) {
            return self::skippedResult('not_configured');
        }
        // Skip while backed off — the cursor is unbootstrappable for this
        // sport's event volume (see $eventDeltaBackoffUntil).
        if ((self::$eventDeltaBackoffUntil[$sportId] ?? 0) > time()) {
            return self::skippedResult('event_delta_backoff');
        }
        // /api/v2/delta self-bootstraps from the all-zero UUID, so we
        // don't gate on cursor staleness here — getEventCursor()
        // returns the zero UUID when no cursor is stored. If the saved
        // cursor turns out to be too old, Rundown returns 400 and we
        // wipe it so the next tick re-bootstraps cleanly.
        $lastId = RundownDeltaCursor::getEventCursor($sportId);
        $params = ['sport_id' => $sportId];
        $affiliateIds = trim((string) Env::get('RUNDOWN_AFFILIATE_IDS', ''));
        if ($affiliateIds !== '') {
            $params['affiliate_ids'] = $affiliateIds;
        }

        $applied = 0;
        $errors  = 0;
        // Match ids that transitioned into a terminal status on THIS pass.
        // Surfaced to the caller (odds-worker) so it can settle them the
        // instant Rundown flips the game to finished/canceled instead of
        // waiting up to ~60s for the periodic settlement sweep.
        $finishedMatchIds = [];
        try {
            $resp = RundownClient::getEventDelta($lastId, $params);
            if (!is_array($resp)) {
                return ['ok' => true, 'applied' => 0, 'errors' => 0];
            }
            $deltas = is_array($resp['deltas'] ?? null) ? $resp['deltas'] : [];
            foreach ($deltas as $entry) {
                if (!is_array($entry)) continue;
                $dataStr = $entry['data'] ?? '';
                if (!is_string($dataStr) || $dataStr === '') continue;
                $event = json_decode($dataStr, true);
                if (!is_array($event)) continue;

                $eventId = trim((string) ($event['event_id'] ?? ''));
                if ($eventId === '') continue;
                $matchId = RundownEventMapper::deterministicMatchId($eventId);
                $existing = $db->findOne('matches', ['id' => $matchId]);

                if ($existing === null) {
                    // First time we see this event via deltas — full insert
                    // path. Mapper handles minimal-payload edge cases by
                    // returning null when teams aren't present.
                    $doc = RundownEventMapper::toMatchDoc($event, $sportKey);
                    if ($doc !== null) {
                        self::upsertMatch($db, $doc);
                        $applied++;
                    }
                    continue;
                }
                // Existing event — score+status update at minimum. If the
                // delta carries markets, rebuild bookmakers/extended/props
                // too so a single event-delta pass refreshes everything.
                $update = RundownEventMapper::scoreUpdate($event);
                if (is_array($event['markets'] ?? null) && $event['markets'] !== []) {
                    $doc = RundownEventMapper::toMatchDoc($event, $sportKey);
                    if (is_array($doc)) {
                        unset($doc['id'], $doc['createdAt']);
                        $update = array_merge($update, $doc);
                        // The event-delta poll sends no market_ids, so the
                        // rebuilt doc carries empty extendedMarkets/playerProps.
                        // Keep the period + prop markets a full-coverage sync
                        // populated rather than wiping them (period-chip flicker).
                        $update = self::carryForwardExtendedMarkets($update, $existing);
                    }
                }
                // Detect a fresh transition into a terminal status so the
                // worker can grade this match immediately. Mirrors the
                // settlePendingMatches gate (finished/canceled only); 'expired'
                // is deliberately excluded so it stays pending for an operator.
                $prevStatus = strtolower((string) ($existing['status'] ?? ''));
                $nextStatus = strtolower((string) ($update['status'] ?? $prevStatus));
                if (
                    !in_array($prevStatus, self::SETTLE_TERMINAL_STATUSES, true)
                    && in_array($nextStatus, self::SETTLE_TERMINAL_STATUSES, true)
                ) {
                    $finishedMatchIds[$matchId] = true;
                }
                $db->updateOne('matches', ['id' => $matchId], $update);
                $applied++;
            }
            $newCursor = (string) ($resp['meta']['delta_last_id'] ?? '');
            if ($newCursor !== '') {
                RundownDeltaCursor::setEventCursor($sportId, $newCursor);
            }
            if ($applied > 0) {
                SportsbookHealth::recordOddsSourceSuccess($db, true);
            }
        } catch (Throwable $e) {
            $errors++;
            $msg = $e->getMessage();
            if (str_contains($msg, '400 bad request')) {
                RundownDeltaCursor::forgetEventCursor($sportId);
                // "Too many events since last_id" means even the zero-UUID
                // bootstrap is too large for this sport's event volume — there
                // is no recent cursor to recover with (the events endpoint only
                // returns the integer MARKET cursor, not the event UUID). Stop
                // hammering it every tick; back off and let the settlement
                // sweep handle finished games instead.
                if (stripos($msg, 'too many events') !== false) {
                    self::$eventDeltaBackoffUntil[$sportId] = time() + self::EVENT_DELTA_BACKOFF_SECONDS;
                }
            }
            Logger::warning('rundown.pollEventDeltasForSport error', [
                'sportKey' => $sportKey,
                'sportId'  => $sportId,
                'error'    => $msg,
            ], 'sportsbook');
        }
        return [
            'ok' => $errors === 0,
            'applied' => $applied,
            'errors' => $errors,
            'finishedMatchIds' => array_keys($finishedMatchIds),
        ];
    }

    /**
     * Insert or merge-update a match doc. Returns true when inserted.
     *
     * @param array<string,mixed> $doc
     */
    private static function upsertMatch(SqlRepository $db, array $doc): bool
    {
        $id = (string) ($doc['id'] ?? '');
        if ($id === '') {
            return false;
        }
        $existing = $db->findOne(self::COLLECTION, ['id' => $id]);
        if ($existing === null) {
            $db->insertOne(self::COLLECTION, $doc);
            return true;
        }
        // Preserve original createdAt so "match first seen" timestamps
        // survive re-syncs. Everything else is upstream-authoritative.
        $created = (string) ($existing['createdAt'] ?? '');
        if ($created !== '') {
            $doc['createdAt'] = $created;
        }
        // Don't overwrite the saved score if upstream has it as 0/0 and
        // we already have a populated score — protects against a brief
        // moment where Rundown serves a stale snapshot after a status
        // flip. Belt-and-suspenders: status 'finished' results stay
        // settled with the score the settlement service saw.
        if (
            ($existing['status'] ?? '') === 'finished'
            && is_array($existing['score'] ?? null)
            && (int) ($existing['score']['score_home'] ?? 0) > 0
            && (int) ($doc['score']['score_home'] ?? 0) === 0
            && (int) ($doc['score']['score_away'] ?? 0) === 0
        ) {
            $doc['score']  = $existing['score'];
            $doc['status'] = 'finished';
        }
        // Don't let a core-only sync wipe the period markets + props a
        // full-coverage sync populated (the period-chip flicker). See
        // carryForwardExtendedMarkets().
        $doc = self::carryForwardExtendedMarkets($doc, $existing);
        unset($doc['id']);
        $db->updateOne(self::COLLECTION, ['id' => $id], $doc);
        return false;
    }

    /**
     * Carry forward period markets + player props an incoming doc didn't carry.
     *
     * Two high-frequency writers build docs with extendedMarkets=[] /
     * playerProps=[]: the core-only live sync (syncSportLive — Rundown's
     * 12-cap forbids batching periods into the live cadence, see
     * RundownMarketMap::csvForLivePolling) and the event-delta poll
     * (pollEventDeltasForSport, which requests no market_ids). Writing those
     * empties OVERWRITES the period (Q1-Q4 / H1-H2 / F1-F7 innings / P1-P3 /
     * tennis sets) and prop markets that the slower full-coverage path
     * (syncEventFull / baseQueryParamsFull) populated — so the period chips
     * flash in (full sync) then out (next live/delta write) then back in,
     * instead of staying put like the main odds.
     *
     * Rule: when the incoming doc has NO extended/prop markets but the stored
     * doc does, keep the stored ones. A full-coverage doc that actually
     * carries periods is non-empty and replaces cleanly, so fresh period lines
     * still win, and applyDelta()/applyWsMessage() keep period prices ticking
     * in place. Money note: this never changes a price — it only stops
     * deleting a market the core sync never asked about; bet placement
     * re-validates odds freshness server-side at place time.
     *
     * @param array<string,mixed> $doc       incoming doc / update about to be written
     * @param array<string,mixed> $existing  stored doc
     * @return array<string,mixed>           $doc with extended/props backfilled
     */
    private static function carryForwardExtendedMarkets(array $doc, array $existing): array
    {
        $incomingExt = is_array($doc['extendedMarkets'] ?? null) ? $doc['extendedMarkets'] : [];
        if ($incomingExt === [] && is_array($doc['odds']['extendedMarkets'] ?? null)) {
            $incomingExt = $doc['odds']['extendedMarkets'];
        }
        if ($incomingExt === []) {
            $existingExt = is_array($existing['extendedMarkets'] ?? null) ? $existing['extendedMarkets'] : [];
            if ($existingExt === [] && is_array($existing['odds']['extendedMarkets'] ?? null)) {
                $existingExt = $existing['odds']['extendedMarkets'];
            }
            if ($existingExt !== []) {
                if (array_key_exists('extendedMarkets', $doc)) {
                    $doc['extendedMarkets'] = $existingExt;
                }
                if (is_array($doc['odds'] ?? null)) {
                    $doc['odds']['extendedMarkets'] = $existingExt;
                }
            }
        }

        $incomingProps = is_array($doc['playerProps'] ?? null) ? $doc['playerProps'] : [];
        if (
            array_key_exists('playerProps', $doc)
            && $incomingProps === []
            && is_array($existing['playerProps'] ?? null)
            && $existing['playerProps'] !== []
        ) {
            $doc['playerProps'] = $existing['playerProps'];
        }

        return $doc;
    }

    /**
     * Patch one delta record into the matching doc's odds structure.
     * Returns true when a doc was actually modified.
     *
     * @param array<string,mixed> $delta
     */
    private static function applyDelta(SqlRepository $db, array $delta): bool
    {
        $eventId = trim((string) ($delta['event_id'] ?? ''));
        if ($eventId === '') return false;
        $marketId = (int) ($delta['market_id'] ?? 0);
        if ($marketId <= 0) return false;
        // The live delta poll is unfiltered (no market_ids), so it streams
        // every price change including props / correct-score / race-to we
        // never render. Drop those here, BEFORE locking the row — otherwise
        // each irrelevant tick would open a transaction just to roll back.
        // Core + period markets only.
        if (!RundownMarketMap::isLiveDeltaRelevant($marketId)) return false;
        $book = RundownAffiliateMap::lookup((int) ($delta['affiliate_id'] ?? 0));
        if ($book === null) return false;
        $participantName = trim((string) ($delta['participant_name'] ?? ''));
        if ($participantName === '') return false;
        // Normalized participant id (team_id / player_id / result_id) — the
        // ONLY identity shared between the delta feed and stored outcomes.
        // Delta participant_name is the feed's FULL form ("Boston Red Sox")
        // while stored outcome names are the canonical SHORT form, so name
        // matching alone either misses (teams) or, worse, matches the wrong
        // line (Over/Under). Stored core outcomes carry this as `pid`.
        $pidRaw = $delta['participant_id'] ?? null;
        $pid = ($pidRaw === null || $pidRaw === '') ? null
            : (string) (is_numeric($pidRaw) ? (int) $pidRaw : $pidRaw);

        $matchId = RundownEventMapper::deterministicMatchId($eventId);

        $priceRaw = $delta['price'] ?? null;
        if (!is_numeric($priceRaw)) return false;
        $priceFloat = (float) $priceRaw;
        $offBoard   = abs($priceFloat - 0.0001) < 1e-6;

        $lineRaw = (string) ($delta['line'] ?? '');
        $point   = ($lineRaw !== '' && is_numeric($lineRaw)) ? (float) $lineRaw : null;
        $now = SqlRepository::nowUtc();
        $priceDecimal = self::priceToDecimal($priceFloat);

        // Atomic read-modify-write: lock the row so concurrent delta
        // workers cannot overwrite each other's bookmaker patches.
        $db->beginTransaction();
        try {
            $existing = $db->findOneForUpdate(self::COLLECTION, ['id' => $matchId]);
            if ($existing === null) {
                $db->rollback();
                return false;
            }

            $sportKey  = strtolower((string) ($existing['sportKey'] ?? ''));
            $coreKey   = RundownMarketMap::oddsApiKey($marketId);
            $periodKey = RundownMarketMap::explicitPeriodKey($marketId, $sportKey);
            if ($coreKey === null && $periodKey === null) {
                $db->rollback();
                return false;
            }

            $update = [
                'lastOddsSyncAt' => $now,
                'lastUpdated'    => $now,
                'updatedAt'      => $now,
                'oddsSource'     => RundownEventMapper::ODDS_SOURCE_TAG,
            ];
            $changed = false;

            if ($coreKey !== null) {
                $before = is_array($existing['odds']['bookmakers'] ?? null)
                    ? $existing['odds']['bookmakers'] : [];
                $bookmakers = self::patchBookmakerOutcome(
                    $before,
                    $book,
                    $coreKey,
                    $participantName,
                    $pid,
                    $point,
                    $offBoard ? null : [
                        'name'  => $participantName,
                        'price' => RundownEventMapper::boardPriceDecimal($coreKey, $priceFloat, $sportKey),
                        'point' => $point,
                    ],
                    $now
                );
                $changed = $bookmakers !== $before;
                $update['odds'] = [
                    'bookmakers'      => $bookmakers,
                    'extendedMarkets' => is_array($existing['odds']['extendedMarkets'] ?? null)
                        ? $existing['odds']['extendedMarkets'] : [],
                ];
            }

            if ($periodKey !== null) {
                $beforeExt = is_array($existing['extendedMarkets'] ?? null)
                    ? $existing['extendedMarkets'] : [];
                $topExt = self::patchExtendedMarketOutcome(
                    $beforeExt,
                    $book,
                    $periodKey,
                    $participantName,
                    $pid,
                    $point,
                    $offBoard ? null : [
                        'name'  => $participantName,
                        'price' => $priceDecimal,
                        'point' => $point,
                        'book'  => $book['key'],
                    ]
                );
                $changed = $changed || $topExt !== $beforeExt;
                $update['extendedMarkets'] = $topExt;

                $bookmakers = is_array($existing['odds']['bookmakers'] ?? null)
                    ? $existing['odds']['bookmakers'] : [];
                $update['odds'] = [
                    'bookmakers'      => $bookmakers,
                    'extendedMarkets' => $topExt,
                ];
            }

            // No stored outcome matched this delta (alt-line tick, book/market
            // not on our board, or pre-pid legacy doc). Do NOT write: bumping
            // lastOddsSyncAt here would vouch freshness for prices this delta
            // never touched.
            if (!$changed) {
                $db->rollback();
                return false;
            }

            $db->updateOne(self::COLLECTION, ['id' => $matchId], $update);
            $db->commit();
            return true;
        } catch (Throwable $e) {
            $db->rollback();
            throw $e;
        }
    }

    /**
     * Apply one outcome change into an existing flat extendedMarkets[]
     * list. The layout is:
     *   [{ key, outcomes: [{ name, price, point?, book, pid? }] }]
     * Identity for an outcome row is (pid|name, book) plus an exact
     * point match — the delta feed has no is_main_line flag, so a tick
     * whose line differs from the stored point is an alternate line and
     * must be skipped, never applied or appended.
     *
     * Returns the new list (mutated semantically); returns the input
     * unchanged when no stored outcome anchors the delta.
     *
     * @param list<array<string,mixed>>            $extended
     * @param array{key:string,name:string}        $book
     * @param array{name:string,price:int|float,point:?float,book:string}|null $outcome  null = remove this outcome
     * @return list<array<string,mixed>>
     */
    private static function patchExtendedMarketOutcome(array $extended, array $book, string $marketKey, string $participantName, ?string $pid, ?float $deltaPoint, ?array $outcome): array
    {
        $marketIndex = null;
        foreach ($extended as $i => $m) {
            if (is_array($m) && ($m['key'] ?? '') === $marketKey) {
                $marketIndex = $i;
                break;
            }
        }
        // PATCH-ONLY — see patchBookmakerOutcome: deltas carry no
        // is_main_line, so unanchored ticks may be alternate lines.
        // Creation is owned by the full-coverage sync. (Appending here
        // also used to duplicate team outcomes under the feed's FULL
        // name next to the stored canonical SHORT-name row.)
        if ($marketIndex === null) return $extended;

        $outcomes = is_array($extended[$marketIndex]['outcomes'] ?? null)
            ? $extended[$marketIndex]['outcomes'] : [];
        $found = false;
        foreach ($outcomes as $k => $existing) {
            if (!is_array($existing)) continue;
            if (($existing['book'] ?? '') !== $book['key']) continue;
            $idMatch = ($pid !== null && isset($existing['pid']) && (string) $existing['pid'] === $pid)
                || (($existing['name'] ?? '') === $participantName);
            if (!$idMatch) continue;
            if (!self::deltaPointMatches(
                isset($existing['point']) && is_numeric($existing['point']) ? (float) $existing['point'] : null,
                $deltaPoint
            )) continue;
            $found = true;
            if ($outcome === null) {
                unset($outcomes[$k]);
            } else {
                $existing['price'] = $outcome['price'];
                $outcomes[$k] = $existing;
            }
            break;
        }
        if (!$found) return $extended;

        $extended[$marketIndex]['outcomes'] = array_values($outcomes);
        return array_values($extended);
    }

    /**
     * Apply one outcome change into an existing bookmakers[] list.
     * Patch-only: matches a stored outcome by (pid|name) + exact point
     * and updates its price (or removes it when off-board). Never
     * creates bookmakers/markets/outcomes — the delta feed cannot
     * prove a tick is the main line, so unanchored ticks are skipped.
     * Returns the input unchanged when nothing matched.
     *
     * @param list<array<string,mixed>>            $bookmakers
     * @param array{key:string,name:string}        $book
     * @param array{name:string,price:int|float,point:?float}|null $outcome  null = remove this outcome
     * @return list<array<string,mixed>>
     */
    private static function patchBookmakerOutcome(array $bookmakers, array $book, string $marketKey, string $participantName, ?string $pid, ?float $deltaPoint, ?array $outcome, string $now): array
    {
        $bookmakerIndex = null;
        foreach ($bookmakers as $i => $b) {
            if (is_array($b) && ($b['key'] ?? '') === $book['key']) {
                $bookmakerIndex = $i;
                break;
            }
        }
        // PATCH-ONLY: the delta feed carries no is_main_line flag, so a
        // delta we can't anchor to a stored (main-line) outcome may be an
        // alternate line. Never create bookmakers/markets/outcomes here —
        // the full sync (which filters main lines properly) owns creation.
        if ($bookmakerIndex === null) return $bookmakers;

        $markets = is_array($bookmakers[$bookmakerIndex]['markets'] ?? null) ? $bookmakers[$bookmakerIndex]['markets'] : [];
        $marketIndex = null;
        foreach ($markets as $j => $m) {
            if (is_array($m) && ($m['key'] ?? '') === $marketKey) {
                $marketIndex = $j;
                break;
            }
        }
        if ($marketIndex === null) return $bookmakers;

        $outcomes = is_array($markets[$marketIndex]['outcomes'] ?? null) ? $markets[$marketIndex]['outcomes'] : [];
        $found = false;
        foreach ($outcomes as $k => $existing) {
            if (!is_array($existing)) continue;
            // Identity: normalized participant id when both sides have it
            // (stored names are canonical SHORT form, delta names are the
            // feed's FULL form — they rarely string-match for teams);
            // name equality is the legacy fallback for pre-pid docs and
            // works for Over/Under/Draw.
            $idMatch = ($pid !== null && isset($existing['pid']) && (string) $existing['pid'] === $pid)
                || (($existing['name'] ?? '') === $participantName);
            if (!$idMatch) continue;
            // Alt-line guard: same participant, different line value ⇒ an
            // alternate-line tick. Applying it would overwrite the main
            // line's price AND point (and flat-juice repricing would then
            // sell that alt point at house juice — sharp-exploitable).
            // Main-line point moves arrive via the WS path (is_main_line)
            // and the periodic full refresh.
            if (!self::deltaPointMatches(
                isset($existing['point']) && is_numeric($existing['point']) ? (float) $existing['point'] : null,
                $deltaPoint
            )) continue;
            $found = true;
            if ($outcome === null) {
                unset($outcomes[$k]);
            } else {
                $existing['price'] = $outcome['price'];
                $outcomes[$k] = $existing;
            }
            break;
        }
        if (!$found) return $bookmakers;

        $bookmakers[$bookmakerIndex]['lastUpdate'] = $now;
        $markets[$marketIndex]['outcomes'] = array_values($outcomes);
        $bookmakers[$bookmakerIndex]['markets'] = array_values($markets);
        return $bookmakers;
    }

    /**
     * The delta's `line` must equal the stored outcome's point for the
     * delta to apply — anything else is an alternate line for the same
     * participant. Moneyline (no point on either side) always matches.
     */
    private static function deltaPointMatches(?float $storedPoint, ?float $deltaPoint): bool
    {
        if ($storedPoint === null && $deltaPoint === null) return true;
        if ($storedPoint === null || $deltaPoint === null) return false;
        return abs($storedPoint - $deltaPoint) < 1e-4;
    }

    /**
     * @param bool $allLines When true, omit `main_line=true` so the upstream
     *   returns every posted line, not just the main one. Needed for sports
     *   (e.g. tennis) where Rundown does not flag a single "main line" — with
     *   `main_line=true` + `hide_no_markets=true` those events come back EMPTY
     *   and get dropped, which is why most live tennis never reached the board.
     *   Costs more data points (alt lines included), so it is opt-in per call.
     * @return array<string,string|int>
     */
    private static function baseQueryParams(bool $allLines = false): array
    {
        $params = [
            // Request core markets PLUS every explicit period market
            // (Q1-Q4 / H1-H2 / F1/F3/F5/F7 innings / NHL P1-P3 / tennis
            // sets). Without this Rundown only sends the 8 core IDs and
            // every period chip in the UI stays blank.
            'market_ids'       => RundownMarketMap::csvForLivePolling(),
            'hide_no_markets'  => 'true',
            // Skip finished games — they still surface on the date endpoint
            // for events played today, but waste a mapping pass + DB write
            // since BetSettlementService already settled them.
            'exclude_status'   => 'STATUS_FINAL,STATUS_FINAL_AET,STATUS_FINAL_PEN,STATUS_CANCELED,STATUS_FORFEIT',
        ];
        // main_line=true keeps the payload to one line per market (cheap), but
        // some sports have no main-line flag and come back empty under it.
        if (!$allLines) {
            $params['main_line'] = 'true';
        }
        $affiliateIds = trim((string) Env::get('RUNDOWN_AFFILIATE_IDS', ''));
        if ($affiliateIds !== '') {
            $params['affiliate_ids'] = $affiliateIds;
        }
        $offset = (int) Env::get('RUNDOWN_DATE_OFFSET_MINUTES', '300');
        if ($offset > 0) {
            $params['offset'] = $offset;
        }
        return $params;
    }

    /**
     * Full-coverage query — core + props (and via period_id, alt markets).
     * Used by the extended sync path. Drops `main_line=true` so alt lines
     * and prop ladders aren't filtered out at the upstream.
     *
     * @return array<string,string|int>
     */
    private static function baseQueryParamsFull(): array
    {
        $params = [
            'market_ids'      => RundownMarketMap::csvForFullCoverage(),
            'hide_no_markets' => 'true',
            'exclude_status'  => 'STATUS_FINAL,STATUS_FINAL_AET,STATUS_FINAL_PEN,STATUS_CANCELED,STATUS_FORFEIT',
        ];
        $affiliateIds = trim((string) Env::get('RUNDOWN_AFFILIATE_IDS', ''));
        if ($affiliateIds !== '') {
            $params['affiliate_ids'] = $affiliateIds;
        }
        $offset = (int) Env::get('RUNDOWN_DATE_OFFSET_MINUTES', '300');
        if ($offset > 0) {
            $params['offset'] = $offset;
        }
        return $params;
    }

    /**
     * Score-only query for the live-score sweep. NO affiliate_ids (so the
     * upstream returns event + score blocks without expanding bookmaker
     * odds — keeps Rundown data-point cost ~0) and NO market_ids.
     * Deliberately INCLUDES finals: every other pull excludes them, and
     * with the event-delta feed unbootstrappable this sweep is the only
     * fast path that can see a game finish. Without it a finished game
     * stayed `live` (frozen odds, still bettable) for up to ~5 minutes
     * until the reaper/settlement sweep — long enough to bet a known
     * winner.
     *
     * @return array<string,string|int>
     */
    private static function baseQueryParamsScores(): array
    {
        $params = [
            'main_line'      => 'true',
        ];
        $offset = (int) Env::get('RUNDOWN_DATE_OFFSET_MINUTES', '300');
        if ($offset > 0) {
            $params['offset'] = $offset;
        }
        return $params;
    }

    private static function offsetSeconds(): int
    {
        return ((int) Env::get('RUNDOWN_DATE_OFFSET_MINUTES', '300')) * 60;
    }

    // DEBUG-RUNDOWN: gate for the temporary per-sync diagnostic logging.
    // Flip RUNDOWN_DEBUG_SYNC=true on the VPS .env (worker reads it on next
    // tick — no restart needed) to watch event counts per sync run, then set
    // it back to false. Remove this helper + all // DEBUG-RUNDOWN lines once
    // the missing-sports issue is confirmed fixed.
    private static function debugSyncEnabled(): bool
    {
        return strtolower((string) Env::get('RUNDOWN_DEBUG_SYNC', 'false')) === 'true';
    }

    private static function extractDeltaCursor(array $resp): ?int
    {
        $cursor = $resp['meta']['delta_last_id'] ?? null;
        if (!is_numeric($cursor)) return null;
        $id = (int) $cursor;
        return $id > 0 ? $id : null;
    }

    /**
     * Convert a Rundown American-odds price to DECIMAL odds.
     *
     * Mirrors RundownEventMapper::priceToDecimal — Rundown ships American
     * odds (-110, +165) but the whole platform (display, betslip, bet-time
     * pricing, settlement) expects DECIMAL in outcome.price. Convert at the
     * WS / delta ingestion chokepoints so the format stays canonical.
     *   american > 0 -> 1 + american / 100    (+165 -> 2.65)
     *   american < 0 -> 1 + 100 / |american|  (-110 -> 1.9090909...)
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

    /** @return array<string,mixed> */
    private static function skippedResult(string $reason): array
    {
        return [
            'ok'         => true,
            'skipped'    => $reason,
            'eventsSeen' => 0,
            'created'    => 0,
            'updated'    => 0,
            'errors'     => 0,
        ];
    }
}
