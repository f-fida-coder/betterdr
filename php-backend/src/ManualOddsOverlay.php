<?php

declare(strict_types=1);

/**
 * Admin line override — the single overlay "gate" for manually-set lines.
 *
 * An admin can override a match's moneyline / spread / total (price, and for
 * spread/total the point) sourced from e.g. Vegas. The override is stored as a
 * top-level `manualOdds` array on the match doc, which survives every feed
 * upsert on its own — the feed never writes a `manualOdds` key, so
 * SqlRepository::mergeDocumentKeys preserves it exactly the way it preserves
 * cardMarkets. This class MATERIALIZES that record onto `odds.bookmakers` so
 * every downstream reader (board serve, placement snapshot, and — via the
 * frozen snapshot — settlement) sees the override with zero reader changes.
 *
 * Two invariants:
 *  - Stamp the matching outcome in EVERY book, not just the preferred one.
 *    Display (MatchesController::selectMarketsFromBookmakers) and placement
 *    (BetsController::collectMatchMarkets) each independently pick ONE
 *    preferred book; stamping all books means they can never resolve a
 *    different value for an overridden outcome.
 *  - Price is written VERBATIM — never run through the juice grid rounding
 *    that ingestion applies (RundownEventMapper::priceToDecimal). The admin is
 *    the pricer; an admin -108 stays -108.
 *
 * The stamped outcome carries `source => 'manual'`, which the live delta
 * patcher checks (RundownSyncService::patchBookmakerOutcome /
 * patchExtendedMarketOutcome) to refuse repainting a locked line.
 */
final class ManualOddsOverlay
{
    /** Markets an admin may override in v1: moneyline + spread + total. */
    public const OVERRIDABLE_MARKETS = ['h2h', 'spreads', 'totals'];

    public const SOURCE_TAG = 'manual';

    /**
     * Materialize `$doc['manualOdds']` onto `$doc['odds']['bookmakers']`.
     * Idempotent; a no-op when there are no manual entries or no bookmakers.
     *
     * @param array<string,mixed> $doc a match document
     * @return array<string,mixed>
     */
    public static function apply(array $doc): array
    {
        $entries = is_array($doc['manualOdds'] ?? null) ? $doc['manualOdds'] : [];
        if ($entries === [] || !is_array($doc['odds']['bookmakers'] ?? null)) {
            return $doc;
        }

        $books = $doc['odds']['bookmakers'];
        foreach ($books as $bi => $book) {
            if (!is_array($book) || !is_array($book['markets'] ?? null)) {
                continue;
            }
            foreach ($book['markets'] as $mi => $market) {
                if (!is_array($market)) {
                    continue;
                }
                $marketKey = strtolower((string) ($market['key'] ?? ''));
                if (!in_array($marketKey, self::OVERRIDABLE_MARKETS, true)) {
                    continue;
                }
                if (!is_array($market['outcomes'] ?? null)) {
                    continue;
                }
                foreach ($market['outcomes'] as $oi => $outcome) {
                    if (!is_array($outcome)) {
                        continue;
                    }
                    $entry = self::matchEntry($entries, $marketKey, $outcome);
                    if ($entry === null) {
                        continue;
                    }
                    // Point only for spread/total (moneyline entries carry
                    // point=null and leave the outcome's null point alone).
                    if (isset($entry['point']) && is_numeric($entry['point'])) {
                        $outcome['point'] = (float) $entry['point'];
                    }
                    $outcome['price']  = (float) $entry['price']; // verbatim, un-rounded
                    $outcome['source'] = self::SOURCE_TAG;
                    $books[$bi]['markets'][$mi]['outcomes'][$oi] = $outcome;
                }
            }
        }

        $doc['odds']['bookmakers'] = $books;
        return $doc;
    }

    /**
     * Find the manual entry that owns a given outcome, matched by market key
     * plus stable participant id when present, else canonical outcome name
     * (mirrors the delta patcher's identity logic — stored names are the
     * canonical SHORT form and Over/Under match by name).
     *
     * @param list<array<string,mixed>> $entries
     * @param array<string,mixed>       $outcome
     * @return array<string,mixed>|null
     */
    private static function matchEntry(array $entries, string $marketKey, array $outcome): ?array
    {
        $name = (string) ($outcome['name'] ?? '');
        $pid  = isset($outcome['pid']) ? (string) $outcome['pid'] : '';
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            if (strtolower((string) ($entry['market'] ?? '')) !== $marketKey) {
                continue;
            }
            $byPid  = $pid !== '' && isset($entry['pid']) && (string) $entry['pid'] === $pid;
            $byName = $name !== '' && (string) ($entry['name'] ?? '') === $name;
            if ($byPid || $byName) {
                return $entry;
            }
        }
        return null;
    }

    /**
     * Restore feed values for the entries being released: set each matching
     * outcome back to its snapshotted feedPoint/feedPrice and drop the manual
     * source marker, so the board reflects the feed immediately (rather than
     * waiting for the next worker sync to repopulate). Returns the doc with
     * `odds` restored; the caller removes the entries from `manualOdds`.
     *
     * @param array<string,mixed>       $doc
     * @param list<array<string,mixed>> $released entries being cleared
     * @return array<string,mixed>
     */
    public static function restoreFeed(array $doc, array $released): array
    {
        if ($released === [] || !is_array($doc['odds']['bookmakers'] ?? null)) {
            return $doc;
        }
        $books = $doc['odds']['bookmakers'];
        foreach ($books as $bi => $book) {
            if (!is_array($book) || !is_array($book['markets'] ?? null)) {
                continue;
            }
            foreach ($book['markets'] as $mi => $market) {
                if (!is_array($market) || !is_array($market['outcomes'] ?? null)) {
                    continue;
                }
                $marketKey = strtolower((string) ($market['key'] ?? ''));
                foreach ($market['outcomes'] as $oi => $outcome) {
                    if (!is_array($outcome)) {
                        continue;
                    }
                    $entry = self::matchEntry($released, $marketKey, $outcome);
                    if ($entry === null) {
                        continue;
                    }
                    if (array_key_exists('feedPoint', $entry) && $entry['feedPoint'] !== null) {
                        $outcome['point'] = (float) $entry['feedPoint'];
                    }
                    if (isset($entry['feedPrice']) && is_numeric($entry['feedPrice'])) {
                        $outcome['price'] = (float) $entry['feedPrice'];
                    }
                    unset($outcome['source']);
                    $books[$bi]['markets'][$mi]['outcomes'][$oi] = $outcome;
                }
            }
        }
        $doc['odds']['bookmakers'] = $books;
        return $doc;
    }
}
