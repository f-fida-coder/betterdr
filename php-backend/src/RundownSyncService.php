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
        $base = self::baseQueryParams();
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

        $params = ['sport_id' => $sportId, 'market_ids' => RundownMarketMap::csvForLivePolling()];
        $affiliateIds = trim((string) Env::get('RUNDOWN_AFFILIATE_IDS', ''));
        if ($affiliateIds !== '') {
            $params['affiliate_ids'] = $affiliateIds;
        }

        $applied = 0;
        $skipped = 0;
        $errors  = 0;
        try {
            $resp = RundownClient::getDelta($lastId, $params);
            if (!is_array($resp)) {
                return ['ok' => true, 'applied' => 0, 'skipped' => 0, 'errors' => 0];
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
                RundownDeltaCursor::set($sportId, (int) $cursor);
            }
            if ($applied > 0) {
                SportsbookHealth::recordOddsSourceSuccess($db, false);
            } else {
                // Heartbeat — the upstream responded cleanly but no prices
                // moved. Bump lastOddsSyncAt on every live row of this
                // sport so the freshness filter keeps them visible. The
                // cursor advancing IS proof that we're actively polling;
                // without this the row would drift past the 90s/180s
                // staleness cliff (and stop being bettable) even though
                // the worker is doing its job. NOTE: lastUpdated is NOT
                // touched here — only the odds-freshness timestamp.
                // Score/status changes still need a real upstream event.
                try {
                    $db->updateMany(
                        'matches',
                        ['sportKey' => $sportKey, 'status' => 'live'],
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
        $existing = $db->findOne('matches', ['id' => $matchId]);
        if ($existing === null) {
            // First time we see this event via WS — the event hasn't
            // been synced yet (just-posted lines, or a sport we're
            // not actively polling). Fetch the full event from
            // /events/{id} so we can populate the matches doc. Dedup
            // per-event for 60 s so a burst of WS messages for the
            // same new event only triggers one upstream fetch.
            SharedFileCache::remember(
                'rundown-ws-event-backfill',
                $eventId,
                60,
                static function () use ($db, $eventId): array {
                    $r = RundownSyncService::syncEventFull($db, $eventId);
                    return ['ok' => (bool) ($r['ok'] ?? false), 'at' => time()];
                }
            );
            $existing = $db->findOne('matches', ['id' => $matchId]);
            if ($existing === null) {
                // Backfill failed (network error, unmappable event, etc.).
                // Drop the message — next REST tick will discover the event.
                return false;
            }
        }

        $pid = $data['normalized_market_participant_id'] ?? $data['market_participant_id'] ?? null;
        $priceId = $data['id'] ?? null;
        $lineRaw = (string) ($data['line'] ?? '');
        $point = ($lineRaw !== '' && is_numeric($lineRaw)) ? (float) $lineRaw : null;

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
                    // 1. Exact priceId match — most reliable.
                    if ($priceId !== null && isset($o['priceId']) && (string) $o['priceId'] === (string) $priceId) {
                        $matches = true;
                    }
                    // 2. Participant id match.
                    if (!$matches && $pid !== null && isset($o['pid']) && (string) $o['pid'] === (string) $pid) {
                        $matches = true;
                    }
                    // 3. Last-resort point match (for h2h where neither side
                    //    has a point, ambiguous; we skip rather than guess).
                    if (!$matches && $point !== null && isset($o['point']) && abs(((float) $o['point']) - $point) < 1e-4) {
                        // Only useful when there's exactly one outcome at
                        // this point on this side — leave it as a tiebreaker.
                        $matches = true;
                    }
                    if (!$matches) continue;

                    if ($offBoard) {
                        unset($outcomes[$oIdx]);
                    } else {
                        // Core main-line update: route through the shared board
                        // normalizer so live price patches keep the house flat
                        // juice on spreads/totals (h2h/team_totals pass through).
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

        if (!$changed) return false;

        $db->updateOne('matches', ['id' => $matchId], [
            'odds'           => ['bookmakers' => $bookmakers],
            'lastOddsSyncAt' => SqlRepository::nowUtc(),
            'lastUpdated'    => SqlRepository::nowUtc(),
            'updatedAt'      => SqlRepository::nowUtc(),
            'oddsSource'     => RundownEventMapper::ODDS_SOURCE_TAG,
        ]);
        return true;
    }

    /**
     * /api/v2/delta event-level delta poll — picks up score, status,
     * and market changes in one call. Cheaper than syncSportLive() and
     * intended for the live-score / status-update path (per the docs'
     * efficient-polling guide).
     *
     * @return array<string,mixed>
     */
    public static function pollEventDeltasForSport(SqlRepository $db, string $sportKey, int $sportId): array
    {
        if (!RundownClient::isConfigured()) {
            return self::skippedResult('not_configured');
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
                    }
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
            if (str_contains($e->getMessage(), '400 bad request')) {
                RundownDeltaCursor::forgetEventCursor($sportId);
            }
            Logger::warning('rundown.pollEventDeltasForSport error', [
                'sportKey' => $sportKey,
                'sportId'  => $sportId,
                'error'    => $e->getMessage(),
            ], 'sportsbook');
        }
        return ['ok' => $errors === 0, 'applied' => $applied, 'errors' => $errors];
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
        unset($doc['id']);
        $db->updateOne(self::COLLECTION, ['id' => $id], $doc);
        return false;
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
        $book = RundownAffiliateMap::lookup((int) ($delta['affiliate_id'] ?? 0));
        if ($book === null) return false;
        $participantName = trim((string) ($delta['participant_name'] ?? ''));
        if ($participantName === '') return false;

        $matchId = RundownEventMapper::deterministicMatchId($eventId);
        $existing = $db->findOne(self::COLLECTION, ['id' => $matchId]);
        if ($existing === null) return false;

        $priceRaw = $delta['price'] ?? null;
        if (!is_numeric($priceRaw)) return false;
        $priceFloat = (float) $priceRaw;
        $offBoard   = abs($priceFloat - 0.0001) < 1e-6;

        $lineRaw = (string) ($delta['line'] ?? '');
        $point   = ($lineRaw !== '' && is_numeric($lineRaw)) ? (float) $lineRaw : null;
        $now = SqlRepository::nowUtc();
        $priceDecimal = self::priceToDecimal($priceFloat);

        // Resolve which bucket this delta belongs in.
        //   - Core key  (h2h/spreads/totals/team_totals) → odds.bookmakers
        //   - Period key (h2h_q1, spreads_1st_5_innings, …) → extendedMarkets
        // A delta is one or the other, never both. Period IDs are sport-
        // aware, so we have to read sportKey from the existing doc.
        $sportKey  = strtolower((string) ($existing['sportKey'] ?? ''));
        $coreKey   = RundownMarketMap::oddsApiKey($marketId);
        $periodKey = RundownMarketMap::explicitPeriodKey($marketId, $sportKey);
        if ($coreKey === null && $periodKey === null) {
            return false;
        }

        $update = [
            'lastOddsSyncAt' => $now,
            'lastUpdated'    => $now,
            'updatedAt'      => $now,
            'oddsSource'     => RundownEventMapper::ODDS_SOURCE_TAG,
        ];

        if ($coreKey !== null) {
            $bookmakers = is_array($existing['odds']['bookmakers'] ?? null)
                ? $existing['odds']['bookmakers'] : [];
            $bookmakers = self::patchBookmakerOutcome(
                $bookmakers,
                $book,
                $coreKey,
                $participantName,
                $offBoard ? null : [
                    'name'  => $participantName,
                    // Core board write → house flat juice on spreads/totals
                    // (sport-gated: football/basketball only; run/puck lines pass through).
                    'price' => RundownEventMapper::boardPriceDecimal($coreKey, $priceFloat, $sportKey),
                    'point' => $point,
                ],
                $now
            );
            // Preserve existing odds.extendedMarkets so the partial write
            // doesn't drop the period bucket the mapper populated.
            $update['odds'] = [
                'bookmakers'      => $bookmakers,
                'extendedMarkets' => is_array($existing['odds']['extendedMarkets'] ?? null)
                    ? $existing['odds']['extendedMarkets'] : [],
            ];
        }

        if ($periodKey !== null) {
            // The mapper writes extendedMarkets in two places (legacy
            // nested + top-level). Patch both so consumers reading either
            // path see the same state.
            $topExt = is_array($existing['extendedMarkets'] ?? null)
                ? $existing['extendedMarkets'] : [];
            $topExt = self::patchExtendedMarketOutcome(
                $topExt,
                $book,
                $periodKey,
                $participantName,
                $offBoard ? null : [
                    'name'  => $participantName,
                    'price' => $priceDecimal,
                    'point' => $point,
                    'book'  => $book['key'],
                ]
            );
            $update['extendedMarkets'] = $topExt;

            $bookmakers = is_array($existing['odds']['bookmakers'] ?? null)
                ? $existing['odds']['bookmakers'] : [];
            $update['odds'] = [
                'bookmakers'      => $bookmakers,
                'extendedMarkets' => $topExt,
            ];
        }

        $db->updateOne(self::COLLECTION, ['id' => $matchId], $update);
        return true;
    }

    /**
     * Apply one outcome change into an existing flat extendedMarkets[]
     * list. The layout is:
     *   [{ key, outcomes: [{ name, price, point?, book }] }]
     * Identity for an outcome row is (name, book) — same participant
     * can have prices at multiple bookmakers, each gets its own row.
     *
     * Returns the new list (mutated semantically).
     *
     * @param list<array<string,mixed>>            $extended
     * @param array{key:string,name:string}        $book
     * @param array{name:string,price:int|float,point:?float,book:string}|null $outcome  null = remove this outcome
     * @return list<array<string,mixed>>
     */
    private static function patchExtendedMarketOutcome(array $extended, array $book, string $marketKey, string $participantName, ?array $outcome): array
    {
        $marketIndex = null;
        foreach ($extended as $i => $m) {
            if (is_array($m) && ($m['key'] ?? '') === $marketKey) {
                $marketIndex = $i;
                break;
            }
        }
        if ($marketIndex === null) {
            if ($outcome === null) return $extended;
            $extended[] = ['key' => $marketKey, 'outcomes' => []];
            $marketIndex = array_key_last($extended);
        }

        $outcomes = is_array($extended[$marketIndex]['outcomes'] ?? null)
            ? $extended[$marketIndex]['outcomes'] : [];
        $found = false;
        foreach ($outcomes as $k => $existing) {
            if (!is_array($existing)) continue;
            if (($existing['name'] ?? '') !== $participantName) continue;
            if (($existing['book'] ?? '') !== $book['key']) continue;
            $found = true;
            if ($outcome === null) {
                unset($outcomes[$k]);
            } else {
                $existing['price'] = $outcome['price'];
                if ($outcome['point'] !== null) {
                    $existing['point'] = $outcome['point'];
                } else {
                    unset($existing['point']);
                }
                $existing['book'] = $book['key'];
                $outcomes[$k] = $existing;
            }
            break;
        }
        if (!$found && $outcome !== null) {
            $row = [
                'name'  => $outcome['name'],
                'price' => $outcome['price'],
                'book'  => $book['key'],
            ];
            if ($outcome['point'] !== null) {
                $row['point'] = $outcome['point'];
            }
            $outcomes[] = $row;
        }

        $extended[$marketIndex]['outcomes'] = array_values($outcomes);
        return array_values($extended);
    }

    /**
     * Apply one outcome change into an existing bookmakers[] list.
     * Mutates the structure in-place semantically; returns the new list.
     *
     * @param list<array<string,mixed>>            $bookmakers
     * @param array{key:string,name:string}        $book
     * @param array{name:string,price:int|float,point:?float}|null $outcome  null = remove this outcome
     * @return list<array<string,mixed>>
     */
    private static function patchBookmakerOutcome(array $bookmakers, array $book, string $marketKey, string $participantName, ?array $outcome, string $now): array
    {
        $bookmakerIndex = null;
        foreach ($bookmakers as $i => $b) {
            if (is_array($b) && ($b['key'] ?? '') === $book['key']) {
                $bookmakerIndex = $i;
                break;
            }
        }
        if ($bookmakerIndex === null) {
            if ($outcome === null) return $bookmakers;
            $bookmakers[] = ['key' => $book['key'], 'name' => $book['name'], 'lastUpdate' => $now, 'markets' => []];
            $bookmakerIndex = array_key_last($bookmakers);
        }
        $bookmakers[$bookmakerIndex]['lastUpdate'] = $now;

        $markets = is_array($bookmakers[$bookmakerIndex]['markets'] ?? null) ? $bookmakers[$bookmakerIndex]['markets'] : [];
        $marketIndex = null;
        foreach ($markets as $j => $m) {
            if (is_array($m) && ($m['key'] ?? '') === $marketKey) {
                $marketIndex = $j;
                break;
            }
        }
        if ($marketIndex === null) {
            if ($outcome === null) {
                $bookmakers[$bookmakerIndex]['markets'] = $markets;
                return $bookmakers;
            }
            $markets[] = ['key' => $marketKey, 'outcomes' => []];
            $marketIndex = array_key_last($markets);
        }

        $outcomes = is_array($markets[$marketIndex]['outcomes'] ?? null) ? $markets[$marketIndex]['outcomes'] : [];
        $found = false;
        foreach ($outcomes as $k => $existing) {
            if (!is_array($existing) || ($existing['name'] ?? '') !== $participantName) continue;
            $found = true;
            if ($outcome === null) {
                unset($outcomes[$k]);
            } else {
                $existing['price'] = $outcome['price'];
                if ($outcome['point'] !== null) {
                    $existing['point'] = $outcome['point'];
                } else {
                    unset($existing['point']);
                }
                $outcomes[$k] = $existing;
            }
            break;
        }
        if (!$found && $outcome !== null) {
            $row = ['name' => $outcome['name'], 'price' => $outcome['price']];
            if ($outcome['point'] !== null) {
                $row['point'] = $outcome['point'];
            }
            $outcomes[] = $row;
        }

        $markets[$marketIndex]['outcomes'] = array_values($outcomes);
        $bookmakers[$bookmakerIndex]['markets'] = array_values($markets);
        return $bookmakers;
    }

    /** @return array<string,string|int> */
    private static function baseQueryParams(): array
    {
        $params = [
            // Request core markets PLUS every explicit period market
            // (Q1-Q4 / H1-H2 / F1/F3/F5/F7 innings / NHL P1-P3 / tennis
            // sets). Without this Rundown only sends the 8 core IDs and
            // every period chip in the UI stays blank.
            'market_ids'       => RundownMarketMap::csvForLivePolling(),
            'main_line'        => 'true',
            'hide_no_markets'  => 'true',
            // Skip finished games — they still surface on the date endpoint
            // for events played today, but waste a mapping pass + DB write
            // since BetSettlementService already settled them.
            'exclude_status'   => 'STATUS_FINAL,STATUS_FINAL_AET,STATUS_FINAL_PEN,STATUS_CANCELED,STATUS_FORFEIT',
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
