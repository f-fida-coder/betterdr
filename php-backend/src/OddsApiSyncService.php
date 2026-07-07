<?php

declare(strict_types=1);

/**
 * Ingestion for The Odds API SUPPLEMENTAL soccer feed: fetch main lines for
 * every allowlisted soccer league and upsert matches.doc rows tagged
 * oddsSource='theoddsapi'.
 *
 * Isolation guarantees:
 *   - Gated by ODDS_API_SYNC_ENABLED (default OFF) + ODDS_API_KEY presence;
 *     with either missing this is a no-op.
 *   - One league failing never aborts the pass (per-sport try/catch).
 *   - upsertMatch() REFUSES to overwrite a row whose oddsSource is not
 *     'theoddsapi' — ids are provider-prefixed so a collision is already
 *     impossible, but the guard makes cross-provider overwrite structurally
 *     impossible even if that ever changed. The One Rule, enforced at the
 *     write path too.
 */
final class OddsApiSyncService
{
    private const COLLECTION = 'matches';

    public static function enabled(): bool
    {
        if (!OddsApiEventMapper::masterEnabled()) {
            return false; // ODDS_API_MASTER_ENABLED=false — whole provider off
        }
        $flag = strtolower(trim((string) (Env::get('ODDS_API_SYNC_ENABLED', 'false') ?? 'false')));
        return ($flag === 'true' || $flag === '1') && OddsApiClient::isConfigured();
    }

    /**
     * One prematch pass over every allowlisted soccer league.
     *
     * @return array{sports:int, events:int, inserted:int, updated:int, skipped:int, errors:array<string,string>}
     */
    public static function syncSoccerPrematch(SqlRepository $db): array
    {
        $stats = self::emptyPrematchStats();
        if (!self::enabled()) {
            return $stats;
        }
        self::runPrematchCategory($db, OddsApiAllowlist::CATEGORY_SOCCER, $stats);
        return $stats;
    }

    /**
     * One prematch pass over the low-volume categories (fights + rugby,
     * approved 2026-07-05). ZERO EVENTS IS NORMAL here — boxing goes weeks
     * between cards and the NRL board empties between rounds. An empty
     * response is a clean events:0 stat line, never an error.
     *
     * @return array{sports:int, events:int, inserted:int, updated:int, skipped:int, errors:array<string,string>}
     */
    public static function syncLowVolumePrematch(SqlRepository $db): array
    {
        $stats = self::emptyPrematchStats();
        if (!self::enabled()) {
            return $stats;
        }
        self::runPrematchCategory($db, OddsApiAllowlist::CATEGORY_FIGHTS, $stats);
        self::runPrematchCategory($db, OddsApiAllowlist::CATEGORY_RUGBY, $stats);
        return $stats;
    }

    /** @return array{sports:int, events:int, inserted:int, updated:int, skipped:int, errors:array<string,string>} */
    private static function emptyPrematchStats(): array
    {
        return ['sports' => 0, 'events' => 0, 'inserted' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];
    }

    /**
     * Fetch + upsert every allowlisted key of one main-lines category,
     * accumulating into $stats. Shared by the soccer and low-volume passes —
     * markets and regions are hard-set per category inside the client.
     *
     * @param array{sports:int, events:int, inserted:int, updated:int, skipped:int, errors:array<string,string>} $stats
     */
    private static function runPrematchCategory(SqlRepository $db, string $category, array &$stats): void
    {
        foreach (OddsApiAllowlist::keysFor($category) as $sportKey) {
            $stats['sports']++;
            try {
                $events = OddsApiClient::getOdds($sportKey, $category);
            } catch (Throwable $e) {
                // Isolation: log-and-continue. An Odds API outage degrades to
                // "these leagues go stale" — it can never touch Rundown rows.
                $stats['errors'][$sportKey] = $e->getMessage();
                continue;
            }
            if (!is_array($events)) {
                continue; // feed disabled / key missing → clean no-op
            }
            foreach ($events as $event) {
                if (!is_array($event)) continue;
                $stats['events']++;
                $doc = OddsApiEventMapper::toMatchDoc($event, $sportKey);
                if ($doc === null) {
                    $stats['skipped']++; // past kickoff / no priced markets / speculative fight / malformed
                    continue;
                }
                try {
                    if (self::upsertMatch($db, $doc)) {
                        $stats['inserted']++;
                    } else {
                        $stats['updated']++;
                    }
                } catch (Throwable $e) {
                    $stats['errors'][$sportKey . ':' . (string) ($event['id'] ?? '?')] = $e->getMessage();
                }
            }
        }
    }

    /** Outrights tier gate — sync only; player-facing betting is separately gated by SPORTSBOOK_OUTRIGHTS_BETTING_ENABLED. */
    public static function outrightsEnabled(): bool
    {
        $flag = strtolower(trim((string) (Env::get('ODDS_API_OUTRIGHTS_SYNC_ENABLED', 'false') ?? 'false')));
        return $flag === 'true' || $flag === '1';
    }

    /**
     * One pass over the allowlisted outright keys: fetch each key's outright
     * board and upsert it into the `outrights` table (the same table
     * OutrightsView, /api/outrights, placement, and OutrightSettlementService
     * read — all provider-agnostic).
     *
     * SEASONAL KEYS: The Odds API returns 404 for a *_winner key whose
     * season is inactive (e.g. NBA/NHL championship in July). That is
     * "not in season", NOT a failure — counted as `inactive`, never as an
     * error, so the worker log stays clean across the off-season.
     *
     * @return array{sports:int, active:int, inactive:int, events:int, stored:int, errors:array<string,string>}
     */
    public static function syncOutrights(SqlRepository $db): array
    {
        $stats = ['sports' => 0, 'active' => 0, 'inactive' => 0, 'events' => 0, 'stored' => 0, 'errors' => []];
        if (!self::enabled() || !self::outrightsEnabled()) {
            return $stats;
        }
        foreach (OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_OUTRIGHTS) as $sportKey) {
            $stats['sports']++;
            try {
                $events = OddsApiClient::getOdds($sportKey, OddsApiAllowlist::CATEGORY_OUTRIGHTS);
            } catch (Throwable $e) {
                if (str_contains($e->getMessage(), '404')) {
                    $stats['inactive']++; // seasonal key, out of season — skip, not error
                    continue;
                }
                $stats['errors'][$sportKey] = $e->getMessage();
                continue;
            }
            if (!is_array($events)) {
                continue;
            }
            $stats['active']++;
            $stats['events'] += count($events);

            // Idempotent + terminal-safe upsert (mirrors the retired Rundown
            // OutrightIngestService::ingestSport): a row already settled or
            // voided is NEVER reopened by a later feed pull; open rows refresh
            // in place; new rows insert with an auto-generated 24-hex id (the
            // form OutrightSettlementService and the placement validator both
            // require). Touches NO money columns — safe on any cadence.
            $now = SqlRepository::nowUtc();
            foreach ($events as $event) {
                if (!is_array($event)) continue;
                $doc = self::buildOutrightDoc($event, $sportKey);
                if ($doc === null) continue;
                try {
                    $existing = $db->findOne('outrights', ['sportKey' => $sportKey, 'eventId' => $doc['eventId']]);
                    if ($existing !== null) {
                        $status = strtolower((string) ($existing['status'] ?? 'open'));
                        if ($status === 'settled' || $status === 'voided') {
                            continue; // never reopen a graded futures market
                        }
                        // Provider ownership guard — toa_ ids make a collision
                        // with a legacy Rundown row impossible, but refuse
                        // structurally anyway (same rule as the matches upsert).
                        $owner = strtolower((string) ($existing['oddsSource'] ?? ''));
                        if ($owner !== '' && $owner !== OddsApiEventMapper::ODDS_SOURCE_TAG) {
                            $stats['errors'][$sportKey . ':' . $doc['eventId']] = "refusing to overwrite outright owned by '" . $owner . "'";
                            continue;
                        }
                        $existingId = (string) ($existing['id'] ?? '');
                        if ($existingId === '') continue;
                        $db->updateOne('outrights', ['id' => $existingId], [
                            'eventName'    => $doc['eventName'],
                            'commenceTime' => $doc['commenceTime'],
                            'bookmakers'   => $doc['bookmakers'],
                            'outcomeCount' => $doc['outcomeCount'],
                            'oddsSource'   => $doc['oddsSource'],
                            'status'       => 'open',
                            'lastUpdated'  => $now,
                            'updatedAt'    => $now,
                        ]);
                    } else {
                        $doc['lastUpdated'] = $now;
                        $doc['createdAt']   = $now;
                        $doc['updatedAt']   = $now;
                        $db->insertOne('outrights', $doc);
                    }
                    $stats['stored']++;
                } catch (Throwable $e) {
                    $stats['errors'][$sportKey . ':' . (string) ($event['id'] ?? '?')] = $e->getMessage();
                }
            }
        }
        return $stats;
    }

    /**
     * Build one `outrights`-table doc from a The Odds API outright event.
     *
     * MONEY CONTRACT — RAW AMERICAN, VERBATIM (mirrors the retired Rundown
     * OutrightIngestService; locked by OddsApiOutrightIngestTest):
     *   outrights.price stores the feed's RAW AMERICAN integer (450 = +450,
     *   -150 = -150), UNLIKE the matches board which stores DECIMAL. The
     *   placement reader (SportsbookBetSupport::outrightPriceToOdds) and the
     *   display reader (frontend OutrightsView.americanToDecimal) each convert
     *   American → decimal exactly ONCE at their boundary. OddsApiClient
     *   already forces oddsFormat=american, so this builder writes the price
     *   VERBATIM and NEVER calls priceToDecimal()/boardPriceDecimal(). If you
     *   ever convert here you must strip both readers' conversions too, or
     *   you re-introduce the ~100x inflation bug.
     *
     * Returns null when the event is not a usable board (no id, or fewer than
     * two distinct priced contenders — same rule as the retired ingester; a
     * 0/1-outcome "market" is never bettable).
     *
     * @param array<string,mixed> $event one The Odds API event object
     * @return array<string,mixed>|null
     */
    public static function buildOutrightDoc(array $event, string $sportKey): ?array
    {
        $rawId    = trim((string) ($event['id'] ?? ''));
        $sportKey = strtolower(trim($sportKey));
        if ($rawId === '' || $sportKey === '') {
            return null;
        }

        $eventName = trim((string) ($event['sport_title'] ?? ''));
        if ($eventName === '') {
            $eventName = ucwords(str_replace('_', ' ', $sportKey)); // never render blank
        }
        $commenceTime = trim((string) ($event['commence_time'] ?? ''));

        // Best RAW AMERICAN price per contender. The Odds API has no
        // is_main_line concept, so "best" = the most-preferred book that
        // priced the contender (SPORTSBOOK_PREFERRED_BOOKS order); equal or
        // unranked books keep the FIRST-SEEN price — deterministic and never
        // the best-for-player line.
        $rankByBook = array_flip(OddsApiEventMapper::preferredBookOrder());

        /** @var array<string, array{price:int, rank:int}> $byName */
        $byName = [];
        foreach ((is_array($event['bookmakers'] ?? null) ? $event['bookmakers'] : []) as $bm) {
            if (!is_array($bm)) continue;
            $bookKey = strtolower(trim((string) ($bm['key'] ?? '')));
            $rank = $rankByBook[$bookKey] ?? PHP_INT_MAX;
            foreach ((is_array($bm['markets'] ?? null) ? $bm['markets'] : []) as $market) {
                if (!is_array($market)) continue;
                if (strtolower((string) ($market['key'] ?? '')) !== 'outrights') continue;
                foreach ((is_array($market['outcomes'] ?? null) ? $market['outcomes'] : []) as $o) {
                    if (!is_array($o)) continue;
                    $name = trim((string) ($o['name'] ?? ''));
                    $priceVal = $o['price'] ?? null;
                    if ($name === '' || !is_numeric($priceVal)) continue;
                    // RAW AMERICAN — round only collapses "450.0" floats to the
                    // integer the readers expect. NO odds conversion, ever.
                    $american = (int) round((float) $priceVal);
                    if ($american === 0) continue;
                    // American odds always have |value| >= 100. Anything smaller
                    // is a DECIMAL price that leaked past oddsFormat=american —
                    // stored raw it would misprice the contender at the readers.
                    // Drop, never guess (anti-inflation guard).
                    if (abs($american) < 100) continue;
                    // House juice rounding — the outrights table stores RAW
                    // AMERICAN (bypasses the matches-board decimal choke point
                    // in RundownEventMapper::priceToDecimal), so the same
                    // SPORTSBOOK_JUICE_ROUND_ENABLED grid is applied here at
                    // storage. Display, placement, and settlement all read the
                    // stored integer, so they inherit it with no second round.
                    // AFTER the guard above: rounding never repairs garbage.
                    if (RundownEventMapper::juiceRoundingEnabled()) {
                        $american = RundownEventMapper::roundAmericanHouseFavorable($american);
                    }

                    $current = $byName[$name] ?? null;
                    if ($current === null || $rank < $current['rank']) {
                        $byName[$name] = ['price' => $american, 'rank' => $rank];
                    }
                }
            }
        }

        if (count($byName) < 2) {
            return null;
        }

        $outcomes = [];
        foreach ($byName as $name => $info) {
            $outcomes[] = ['name' => $name, 'price' => $info['price']];
        }

        return [
            'sportKey'     => $sportKey,
            // toa_-namespaced like match externalIds — can never collide with
            // any legacy Rundown outright row.
            'eventId'      => OddsApiEventMapper::EXTERNAL_ID_PREFIX . $rawId,
            'eventName'    => $eventName,
            'commenceTime' => $commenceTime,
            'status'       => 'open',
            'oddsSource'   => OddsApiEventMapper::ODDS_SOURCE_TAG,
            // Single synthetic book so every reader (listOutrights' "first book
            // with markets", validateOutrightSelection's "first 'outrights'
            // market", OutrightsView.extractOutcomes) finds the outcomes the
            // same way. key='outrights' is the market discriminator they match.
            'bookmakers'   => [[
                'key'     => 'theoddsapi',
                'name'    => 'The Odds API',
                'markets' => [[
                    'key'      => 'outrights',
                    'outcomes' => $outcomes,
                ]],
            ]],
            'outcomeCount' => count($outcomes),
        ];
    }

    /**
     * Mirror of RundownSyncService::upsertMatch semantics (preserve createdAt,
     * never regress terminal state) plus the provider ownership guard.
     * Returns true on insert, false on update.
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

        // Provider ownership guard — never overwrite another provider's row.
        $owner = strtolower(trim((string) ($existing['oddsSource'] ?? '')));
        if ($owner !== OddsApiEventMapper::ODDS_SOURCE_TAG) {
            throw new RuntimeException(
                'OddsApiSyncService: refusing to overwrite match ' . $id
                . " owned by provider '" . $owner . "' — TheRundown data is never touched"
            );
        }

        // Preserve original createdAt so "first seen" survives re-syncs.
        $created = (string) ($existing['createdAt'] ?? '');
        if ($created !== '') {
            $doc['createdAt'] = $created;
        }

        // Never regress state a later pipeline stage owns: this writer only
        // knows prematch. If a score sync / operator marked the row live,
        // finished, or canceled, keep that status AND its score — a fresh
        // prematch doc always carries 'scheduled' + 0-0 and must not undo it.
        $existingStatus = (string) ($existing['status'] ?? '');
        if (in_array($existingStatus, ['live', 'finished', 'canceled'], true)) {
            $doc['status'] = $existingStatus;
            if (is_array($existing['score'] ?? null)) {
                $doc['score'] = $existing['score'];
            }
        }

        unset($doc['id']);
        $db->updateOne(self::COLLECTION, ['id' => $id], $doc);
        return false;
    }
}
