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
        $stats = ['sports' => 0, 'events' => 0, 'inserted' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];
        if (!self::enabled()) {
            return $stats;
        }

        foreach (OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_SOCCER) as $sportKey) {
            $stats['sports']++;
            try {
                $events = OddsApiClient::getOdds($sportKey, OddsApiAllowlist::CATEGORY_SOCCER);
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
                    $stats['skipped']++; // past kickoff / no priced markets / malformed
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
        return $stats;
    }

    /** Outrights tier gate — stays false until the outrights-ingestion chunk lands. */
    public static function outrightsEnabled(): bool
    {
        $flag = strtolower(trim((string) (Env::get('ODDS_API_OUTRIGHTS_SYNC_ENABLED', 'false') ?? 'false')));
        return $flag === 'true' || $flag === '1';
    }

    /**
     * One pass over the allowlisted outright keys.
     *
     * SEASONAL KEYS: The Odds API returns 404 for a *_winner key whose
     * season is inactive (e.g. NBA/NHL championship in July). That is
     * "not in season", NOT a failure — counted as `inactive`, never as an
     * error, so the worker log stays clean across the off-season.
     *
     * STORAGE IS PENDING: fetch + shape handling land here now so the
     * scheduler tier is complete; ingestion into the `outrights` table is
     * the next chunk ("outrights ingestion"). Until it lands, keep
     * ODDS_API_OUTRIGHTS_SYNC_ENABLED=false — with it on, events are
     * fetched and counted but stored=0.
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
            // Outright ingestion (outrights table, provider tag, RAW-American
            // price contract) lands in the next chunk.
        }
        return $stats;
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
