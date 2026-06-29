<?php

declare(strict_types=1);

/**
 * Ingest Rundown tournament-winner ("outright" / "futures") events into the
 * `outrights` table that OutrightsView, the public /api/outrights endpoint, and
 * the placement/settlement path all read.
 *
 * WHY this exists separately from RundownEventMapper::toMatchDoc:
 *   toMatchDoc requires a home/away team pair and returns null for the
 *   player-participant tournament-winner events Rundown serves (a single event
 *   with N player/team participants, each priced "to win"). Outrights have no
 *   home/away, so they need their own thin mapper.
 *
 * MONEY CONTRACT (do not break — locked by OutrightOddsConversionTest):
 *   The `outrights.price` field stores the feed's RAW AMERICAN integer
 *   (e.g. 450 = +450, -150 = -150), UNLIKE the matches board which stores
 *   DECIMAL. The placement reader (SportsbookBetSupport::outrightPriceToOdds)
 *   and the display reader (frontend OutrightsView.americanToDecimal) both
 *   convert American -> decimal exactly ONCE at their boundary. This ingester
 *   therefore writes Rundown's price value VERBATIM and NEVER runs it through
 *   priceToDecimal(). If you ever convert here, you must also strip the two
 *   readers' conversions, or you re-introduce the ~100x inflation bug.
 */
final class OutrightIngestService
{
    /**
     * Rundown's dedicated futures market: `tournament_winner` (market_id 1141,
     * confirmed live in the /markets catalog). This is the ONLY market we read
     * for outrights.
     *
     * We deliberately do NOT read the moneyline market (id 1): a normal game's
     * moneyline has exactly two participants, and buildOutrightDoc's ">=2
     * contenders" rule would happily turn every regular head-to-head game into a
     * bogus 2-outcome "outright." 1141 only ever carries a real winner board, so
     * targeting it is both correct and safe.
     */
    private const WINNER_MARKET_IDS = [1141];

    /** Sentinel Rundown uses for an off-the-board price (mirror RundownEventMapper). */
    private const PRICE_OFF_BOARD = -99999;

    /**
     * Build one `outrights`-table doc from a single Rundown event. Returns null
     * when the event is not a usable outright board (no event id, or fewer than
     * two distinct priced contenders — a 0/1-outcome "market" is never bettable
     * and would only clutter the futures page).
     *
     * @param array<string,mixed> $event            one Rundown event object
     * @param list<int>           $preferredBookIds  affiliate ids, best-first; ties break to the first seen
     * @return array<string,mixed>|null
     */
    public static function buildOutrightDoc(array $event, string $sportKey, array $preferredBookIds = []): ?array
    {
        $eventId = trim((string) ($event['event_id'] ?? ''));
        if ($eventId === '') {
            return null;
        }
        $sportKey = strtolower(trim($sportKey));
        if ($sportKey === '') {
            return null;
        }

        $schedule  = is_array($event['schedule'] ?? null) ? $event['schedule'] : [];
        $eventName = trim((string) ($schedule['event_name'] ?? ''));
        if ($eventName === '') {
            $eventName = trim((string) ($event['event_name'] ?? ''));
        }
        if ($eventName === '') {
            // Last resort so the card never renders blank.
            $eventName = ucwords(str_replace('_', ' ', $sportKey)) . ' Winner';
        }

        $commenceTime = trim((string) ($event['event_date'] ?? ''));

        // Best American price per contender name. "Best" = a main-line price
        // beats a non-main-line one; among equals, a more-preferred book wins;
        // among those, first-seen wins (deterministic for a stable feed order).
        /** @var array<string, array{price:int, main:bool, rank:int}> $byName */
        $byName = [];

        $markets = is_array($event['markets'] ?? null) ? $event['markets'] : [];
        foreach ($markets as $market) {
            if (!is_array($market)) {
                continue;
            }
            $marketId = (int) ($market['market_id'] ?? 0);
            if (!in_array($marketId, self::WINNER_MARKET_IDS, true)) {
                continue;
            }

            $participants = is_array($market['participants'] ?? null) ? $market['participants'] : [];
            foreach ($participants as $participant) {
                if (!is_array($participant)) {
                    continue;
                }
                $name = trim((string) ($participant['name'] ?? ''));
                if ($name === '') {
                    continue;
                }

                $lines = is_array($participant['lines'] ?? null) ? $participant['lines'] : [];
                foreach ($lines as $line) {
                    if (!is_array($line)) {
                        continue;
                    }
                    $prices = is_array($line['prices'] ?? null) ? $line['prices'] : [];
                    foreach ($prices as $affiliateIdRaw => $price) {
                        if (!is_array($price)) {
                            continue;
                        }
                        $priceVal = $price['price'] ?? null;
                        if (!is_numeric($priceVal)) {
                            continue;
                        }
                        // RAW AMERICAN — see MONEY CONTRACT above. Round only to
                        // collapse "450.0" floats to the integer the readers expect.
                        $american = (int) round((float) $priceVal);
                        if ($american === 0) {
                            continue;
                        }
                        if (abs($american - self::PRICE_OFF_BOARD) < 1) {
                            continue; // off-the-board sentinel, not a real price
                        }

                        $isMain      = (bool) ($price['is_main_line'] ?? false);
                        $affiliateId = (int) $affiliateIdRaw;
                        $rankIdx     = array_search($affiliateId, $preferredBookIds, true);
                        $rank        = ($rankIdx === false) ? PHP_INT_MAX : (int) $rankIdx;

                        $current = $byName[$name] ?? null;
                        $better  = $current === null
                            || ($isMain && !$current['main'])
                            || ($isMain === $current['main'] && $rank < $current['rank']);
                        if ($better) {
                            $byName[$name] = ['price' => $american, 'main' => $isMain, 'rank' => $rank];
                        }
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
            'eventId'      => $eventId,
            'eventName'    => $eventName,
            'commenceTime' => $commenceTime,
            'status'       => 'open',
            // Single synthetic book so every reader (listOutrights' "first book
            // with markets", validateOutrightSelection's "first 'outrights'
            // market", OutrightsView.extractOutcomes) finds the outcomes the
            // same way. key='outrights' is the market discriminator they match.
            'bookmakers'   => [[
                'key'     => 'rundown',
                'name'    => 'Rundown',
                'markets' => [[
                    'key'      => 'outrights',
                    'outcomes' => $outcomes,
                ]],
            ]],
            'outcomeCount' => count($outcomes),
        ];
    }

    /**
     * Upsert every outright doc derivable from $events for one sport.
     *
     * Idempotent + terminal-safe: a row already 'settled' or 'voided' is left
     * untouched (a graded futures market must never be reopened by a later
     * feed pull). Open rows are refreshed in place; new rows are inserted with
     * a freshly generated 24-hex id (the form OutrightSettlementService and the
     * placement validator both require).
     *
     * This method only ever writes to the `outrights` table — it touches NO
     * money columns (balance/pendingBalance/transactions), so it is safe to run
     * on any cadence.
     *
     * @param list<mixed> $events
     * @param list<int>   $preferredBookIds
     * @return array{ok:bool, sportKey:string, upserted:int, skipped:int, terminal:int}
     */
    public static function ingestSport(SqlRepository $db, string $sportKey, array $events, array $preferredBookIds = []): array
    {
        $sportKey  = strtolower(trim($sportKey));
        $upserted  = 0;
        $skipped   = 0;
        $terminal  = 0;
        $now       = SqlRepository::nowUtc();

        foreach ($events as $event) {
            if (!is_array($event)) {
                $skipped++;
                continue;
            }
            $doc = self::buildOutrightDoc($event, $sportKey, $preferredBookIds);
            if ($doc === null) {
                $skipped++;
                continue;
            }

            $existing = $db->findOne('outrights', ['sportKey' => $sportKey, 'eventId' => $doc['eventId']]);
            if ($existing !== null) {
                $status = strtolower((string) ($existing['status'] ?? 'open'));
                if ($status === 'settled' || $status === 'voided') {
                    $terminal++;
                    continue; // never reopen a graded market
                }
                $existingId = (string) ($existing['id'] ?? '');
                if ($existingId === '') {
                    $skipped++;
                    continue;
                }
                $db->updateOne('outrights', ['id' => $existingId], [
                    'eventName'    => $doc['eventName'],
                    'commenceTime' => $doc['commenceTime'],
                    'bookmakers'   => $doc['bookmakers'],
                    'outcomeCount' => $doc['outcomeCount'],
                    'status'       => 'open',
                    'lastUpdated'  => $now,
                    'updatedAt'    => $now,
                ]);
            } else {
                $doc['lastUpdated'] = $now;
                $doc['createdAt']   = $now;
                $doc['updatedAt']   = $now;
                $db->insertOne('outrights', $doc); // id auto-generated (24-hex)
            }
            $upserted++;
        }

        return [
            'ok'       => true,
            'sportKey' => $sportKey,
            'upserted' => $upserted,
            'skipped'  => $skipped,
            'terminal' => $terminal,
        ];
    }
}
