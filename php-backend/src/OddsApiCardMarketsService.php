<?php

declare(strict_types=1);

/**
 * Soccer CARD markets (yellow/red card totals + card handicap) from The
 * Odds API, attached to TheRundown-owned match rows.
 *
 * THE ONE-RULE NUANCE (rulings 2026-07-05): the six CARDS_ONLY leagues are
 * Rundown-fed for main lines — cards are allowed from The Odds API ONLY
 * because Rundown carries no card markets at all. This service therefore:
 *
 *   - NEVER creates match rows and NEVER touches a TheRundown-owned key.
 *     writeCardMarkets() persists exactly THREE namespaced keys
 *     (cardMarkets / cardMarketsSyncedAt / cardMarketsSource) via
 *     SqlRepository::updateOne, whose top-level MERGE semantics (locked by
 *     SqlRepositoryMergeTest) guarantee the write is structurally incapable
 *     of altering Rundown data — and, symmetrically, that Rundown's own
 *     re-syncs never drop the card keys.
 *
 *   - Matches events FAIL-CLOSED: a The Odds API event attaches to a
 *     Rundown row only when sportKey matches, kickoff times agree within
 *     MATCH_TIME_TOLERANCE_SECONDS, and BOTH team names match in the
 *     correct home/away orientation. Zero candidates OR more than one →
 *     the event's cards are dropped and logged, never guessed.
 *
 *   - Is PREMATCH-ONLY by construction here (only future events fetched)
 *     and at serve time (Cards-2 gates the read paths on kickoff +
 *     cardMarketsSyncedAt freshness).
 *
 *   - Costs credits per event on the per-event endpoint, so the FREE
 *     /events call pre-filters to the kickoff window and the (also free)
 *     matcher runs BEFORE any paid fetch — unmatchable events never burn
 *     credits.
 *
 * Settlement: card bets can never auto-grade (parseGradableMarket returns
 * null for both card keys — verified) and are straight-only (Cards-2 gate);
 * manual grading UI is Cards-3, a mandatory gate before the betting flag.
 */
final class OddsApiCardMarketsService
{
    private const COLLECTION = 'matches';
    private const CACHE_NS = 'theoddsapi-cards';
    /** toa event id → matched Rundown match id (avoids re-matching every poll). */
    private const MAP_CACHE_TTL_SECONDS = 172800; // 48h — the fetch window
    /** Suppress repeat "unmatched" log lines for the same event. */
    private const LOG_ONCE_TTL_SECONDS = 86400;
    private const MATCH_TIME_TOLERANCE_SECONDS = 300;

    /** Cards go dark this many seconds after the last successful sync (= 2 missed polls). */
    private const DEFAULT_SERVE_STALE_SECONDS = 1200; // 2 missed 10-min polls (was 1800 @ 15-min cadence)

    public static function enabled(): bool
    {
        $flag = strtolower(trim((string) (Env::get('ODDS_API_CARDS_SYNC_ENABLED', 'false') ?? 'false')));
        return ($flag === 'true' || $flag === '1') && OddsApiClient::isConfigured();
    }

    /** Master player-facing gate — OFF until the Cards-3 manual-grading admin UI is live (ruling 2026-07-05). */
    public static function bettingEnabled(): bool
    {
        $flag = strtolower(trim((string) (Env::get('SPORTSBOOK_CARDS_BETTING_ENABLED', 'false') ?? 'false')));
        return $flag === 'true' || $flag === '1';
    }

    /**
     * THE single serve-time gate for card markets. Both read paths call this
     * one method — display (MatchesController::getMatchProps) and placement
     * (BetsController::collectMatchMarkets) — so a card market is VISIBLE
     * exactly when it is PLACEABLE, by construction. Returns [] (cards dark
     * on both surfaces) unless ALL hold:
     *   - SPORTSBOOK_CARDS_BETTING_ENABLED — display and betting flip
     *     TOGETHER; a visible-but-unplaceable (or reverse) state can't exist
     *   - the row carries theoddsapi-tagged card markets
     *   - kickoff is still in the future — the ACTIVE post-kickoff close
     *     (this feed has no live signal; market-level, so the match itself
     *     stays bettable on its Rundown main lines)
     *   - cardMarketsSyncedAt within ODDS_API_CARDS_STALE_SECONDS (1200s
     *     default): the worker polls every 10 min, so two missed polls or a
     *     dead worker → cards vanish rather than serve stale prices
     *
     * @param array<string,mixed> $match
     * @return list<array<string,mixed>>
     */
    public static function servableCardMarkets(array $match, ?int $nowTs = null): array
    {
        if (!self::bettingEnabled()) {
            return [];
        }
        $markets = $match['cardMarkets'] ?? null;
        if (!is_array($markets) || $markets === []) {
            return [];
        }
        if (strtolower((string) ($match['cardMarketsSource'] ?? '')) !== OddsApiEventMapper::ODDS_SOURCE_TAG) {
            return [];
        }
        $now = $nowTs ?? time();
        $startTs = strtotime((string) ($match['startTime'] ?? ''));
        if ($startTs === false || $startTs <= $now) {
            return []; // kickoff passed → dark everywhere, fail closed
        }
        $syncedTs = strtotime((string) ($match['cardMarketsSyncedAt'] ?? ''));
        $staleAfter = max(60, (int) Env::get('ODDS_API_CARDS_STALE_SECONDS', (string) self::DEFAULT_SERVE_STALE_SECONDS));
        if ($syncedTs === false || ($now - $syncedTs) > $staleAfter) {
            return []; // stale → dark everywhere, fail closed
        }
        return array_values(array_filter($markets, 'is_array'));
    }

    /**
     * One pass: for each cards-only league, list events (free), keep those
     * inside the kickoff window, resolve each to its Rundown match row
     * (free, fail-closed), and only then spend credits on the per-event
     * card odds and persist them.
     *
     * @return array{leagues:int, eventsInWindow:int, matched:int, unmatched:int, ambiguous:int, fetched:int, updated:int, empty:int, errors:array<string,string>}
     */
    public static function syncCardMarkets(SqlRepository $db): array
    {
        $stats = [
            'leagues' => 0, 'eventsInWindow' => 0, 'matched' => 0, 'unmatched' => 0,
            'ambiguous' => 0, 'fetched' => 0, 'updated' => 0, 'empty' => 0, 'errors' => [],
        ];
        if (!self::enabled()) {
            return $stats;
        }

        $now = time();
        $windowSeconds = max(1, (int) Env::get('ODDS_API_CARDS_WINDOW_HOURS', '48')) * 3600;

        foreach (OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_CARDS) as $sportKey) {
            $stats['leagues']++;
            try {
                $events = OddsApiClient::getEvents($sportKey, OddsApiAllowlist::CATEGORY_CARDS);
            } catch (Throwable $e) {
                $stats['errors'][$sportKey] = $e->getMessage();
                continue; // isolation: one league failing never aborts the pass
            }
            if (!is_array($events)) {
                continue;
            }
            foreach ($events as $event) {
                if (!is_array($event)) continue;
                $commenceTs = strtotime(trim((string) ($event['commence_time'] ?? '')));
                if ($commenceTs === false || $commenceTs <= $now || $commenceTs > $now + $windowSeconds) {
                    continue; // outside the paid-fetch window (or already kicked off)
                }
                $stats['eventsInWindow']++;

                $match = self::resolveRundownMatch($db, $sportKey, $event, $stats);
                if ($match === null) {
                    continue; // counted as unmatched/ambiguous inside the resolver
                }
                $stats['matched']++;

                try {
                    $resp = OddsApiClient::getEventOdds($sportKey, (string) ($event['id'] ?? ''));
                } catch (Throwable $e) {
                    $stats['errors'][$sportKey . ':' . (string) ($event['id'] ?? '?')] = $e->getMessage();
                    continue;
                }
                if (!is_array($resp)) {
                    continue;
                }
                $stats['fetched']++;

                $markets = self::buildCardMarkets(
                    $resp,
                    (string) ($match['homeTeam'] ?? ''),
                    (string) ($match['homeTeamFull'] ?? ''),
                    (string) ($match['awayTeam'] ?? ''),
                    (string) ($match['awayTeamFull'] ?? '')
                );
                if ($markets === []) {
                    $stats['empty']++; // no priced card outcomes right now — nothing to store
                    continue;
                }
                try {
                    self::writeCardMarkets($db, (string) ($match['id'] ?? ''), $markets);
                    $stats['updated']++;
                } catch (Throwable $e) {
                    $stats['errors'][$sportKey . ':' . (string) ($event['id'] ?? '?')] = $e->getMessage();
                }
            }
        }
        return $stats;
    }

    /**
     * FAIL-CLOSED matcher: The Odds API event → the one Rundown match row.
     * Same sportKey (identical key strings across both feeds for the six
     * leagues), kickoff within tolerance, both team names matched in the
     * correct home/away orientation, and the row must be TheRundown-owned,
     * scheduled, and in the future. Ambiguity (2+ candidates) is a refusal,
     * not a coin flip — wrong-match card odds on a betting surface are
     * worse than no card odds.
     *
     * @param array<string,mixed> $event
     * @param array<string,int|array> $stats mutated: unmatched/ambiguous counters
     * @return array<string,mixed>|null the matched match row
     */
    public static function resolveRundownMatch(SqlRepository $db, string $sportKey, array $event, array &$stats): ?array
    {
        $toaId   = trim((string) ($event['id'] ?? ''));
        $toaHome = trim((string) ($event['home_team'] ?? ''));
        $toaAway = trim((string) ($event['away_team'] ?? ''));
        $commenceTs = strtotime(trim((string) ($event['commence_time'] ?? '')));
        if ($toaId === '' || $toaHome === '' || $toaAway === '' || $commenceTs === false) {
            $stats['unmatched']++;
            return null;
        }

        // Cached mapping from a previous pass — verify the row is still eligible.
        $cached = SharedFileCache::get(self::CACHE_NS, 'map-' . $toaId, self::MAP_CACHE_TTL_SECONDS);
        if (is_array($cached) && ($cached['matchId'] ?? '') !== '') {
            $row = $db->findOne(self::COLLECTION, ['id' => SqlRepository::id((string) $cached['matchId'])]);
            if (is_array($row) && self::rowEligible($row)) {
                return $row;
            }
        }

        // NO startTime range filter here — DELIBERATE (2026-07-05 incident).
        // The live matches.j_start_time_dt generated column predates
        // SqlRepository's DATETIME definition (it is a legacy VARCHAR of the
        // raw ISO string, 'T'/'Z' included), so mysql-format range bounds
        // string-compare 'T' > ' ' and a same-day window matches NOTHING —
        // every WC card event logged candidates:0 against perfect rows.
        // Filter the kickoff window in PHP instead; a league's scheduled
        // rows are few. Revert to a ranged query only after the Part-2
        // column migration lands (worker startup logs a drift canary).
        $rows = $db->findMany(self::COLLECTION, [
            'sportKey' => strtolower(trim($sportKey)),
            'status'   => 'scheduled',
        ], ['limit' => 200]);

        $candidates = [];
        foreach (is_array($rows) ? $rows : [] as $row) {
            if (!is_array($row) || !self::rowEligible($row)) continue;
            $rowTs = strtotime((string) ($row['startTime'] ?? ''));
            if ($rowTs === false || abs($rowTs - $commenceTs) > self::MATCH_TIME_TOLERANCE_SECONDS) continue;
            $homeOk = self::sideMatches($toaHome, (string) ($row['homeTeam'] ?? ''), (string) ($row['homeTeamFull'] ?? ''));
            $awayOk = self::sideMatches($toaAway, (string) ($row['awayTeam'] ?? ''), (string) ($row['awayTeamFull'] ?? ''));
            if ($homeOk && $awayOk) {
                $candidates[] = $row;
            }
        }

        if (count($candidates) !== 1) {
            $isAmbiguous = count($candidates) > 1;
            $stats[$isAmbiguous ? 'ambiguous' : 'unmatched']++;
            self::logOnce($toaId, $isAmbiguous ? 'oddsapi cards ambiguous match' : 'oddsapi cards unmatched event', [
                'sportKey' => $sportKey,
                'toaHome'  => $toaHome,
                'toaAway'  => $toaAway,
                'kickoff'  => gmdate(DATE_ATOM, $commenceTs),
                'candidates' => count($candidates),
            ]);
            return null;
        }

        SharedFileCache::forget(self::CACHE_NS, 'map-' . $toaId);
        SharedFileCache::remember(
            self::CACHE_NS,
            'map-' . $toaId,
            self::MAP_CACHE_TTL_SECONDS,
            static fn (): array => ['matchId' => (string) ($candidates[0]['id'] ?? '')]
        );
        return $candidates[0];
    }

    /** Cards attach ONLY to TheRundown-owned, still-scheduled, future matches. */
    public static function rowEligible(array $row): bool
    {
        $source = strtolower(trim((string) ($row['oddsSource'] ?? '')));
        if ($source !== 'therundown') {
            return false;
        }
        if (strtolower((string) ($row['status'] ?? '')) !== 'scheduled') {
            return false;
        }
        $startTs = strtotime((string) ($row['startTime'] ?? ''));
        return $startTs !== false && $startTs > time();
    }

    /**
     * One side's name match: The Odds API full club name vs the Rundown
     * row's short + full forms. Normalized (lowercase, accents stripped,
     * non-alphanumerics removed) equality, or containment either way when
     * long enough to be unambiguous ("manchesterunited" ⊃ "manchester").
     */
    public static function sideMatches(string $toaName, string $rundownShort, string $rundownFull): bool
    {
        $toa = self::normalizeName($toaName);
        if ($toa === '') return false;
        foreach ([$rundownShort, $rundownFull] as $candidate) {
            $r = self::normalizeName($candidate);
            if ($r === '') continue;
            if ($r === $toa) return true;
            if (strlen($r) >= 5 && str_contains($toa, $r)) return true;
            if (strlen($toa) >= 5 && str_contains($r, $toa)) return true;
        }
        return false;
    }

    /**
     * Post-normalization aliases for names whose common short form is too
     * short for the containment rules (< 5 chars). National teams only —
     * The Odds API says "USA", Rundown says "United States" (WC 2026).
     */
    private const NAME_ALIASES = [
        'usa' => 'unitedstates',
    ];

    private static function normalizeName(string $name): string
    {
        $s = trim($name);
        if ($s === '') return '';
        $translit = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
        if (is_string($translit) && $translit !== '') {
            $s = $translit;
        }
        $out = (string) preg_replace('/[^a-z0-9]/', '', strtolower($s));
        return self::NAME_ALIASES[$out] ?? $out;
    }

    /**
     * Per-event card odds response → the stored cardMarkets shape:
     * [{key, outcomes:[{name, point, price(decimal), book}]}], deduped to one
     * house-safe rung per (name, point) via the SAME collapse the Rundown
     * alt-line ladders use (RundownEventMapper::dedupeExtendedMarkets).
     *
     * MONEY NOTES:
     *   - Prices arrive AMERICAN (client forces oddsFormat=american) and are
     *     converted to DECIMAL here via RundownEventMapper::boardPriceDecimal
     *     — cards are BOARD markets (decimal contract), unlike outrights.
     *     The card keys are not flat-juice markets, so the feed price passes
     *     through the same battle-tested conversion untouched.
     *   - Card-handicap outcome names are canonicalized to the Rundown row's
     *     OWN team names (the strings placement + display already speak);
     *     an outcome naming neither team is dropped, never guessed.
     *
     * @param array<string,mixed> $event per-event odds response
     * @return list<array{key:string, outcomes:list<array<string,mixed>>}>
     */
    public static function buildCardMarkets(array $event, string $homeTeam, string $homeTeamFull, string $awayTeam, string $awayTeamFull): array
    {
        $allowedKeys = array_map('trim', explode(',', OddsApiAllowlist::marketsFor(OddsApiAllowlist::CATEGORY_CARDS)));

        /** @var array<string, list<array<string,mixed>>> $byKey */
        $byKey = [];
        foreach ((is_array($event['bookmakers'] ?? null) ? $event['bookmakers'] : []) as $bm) {
            if (!is_array($bm)) continue;
            $bookKey = strtolower(trim((string) ($bm['key'] ?? '')));
            if ($bookKey === '') continue;
            foreach ((is_array($bm['markets'] ?? null) ? $bm['markets'] : []) as $market) {
                if (!is_array($market)) continue;
                $marketKey = strtolower(trim((string) ($market['key'] ?? '')));
                if (!in_array($marketKey, $allowedKeys, true)) continue;
                foreach ((is_array($market['outcomes'] ?? null) ? $market['outcomes'] : []) as $o) {
                    if (!is_array($o)) continue;
                    $name = trim((string) ($o['name'] ?? ''));
                    $priceRaw = $o['price'] ?? null;
                    $point = $o['point'] ?? null;
                    if ($name === '' || !is_numeric($priceRaw) || !is_numeric($point)) continue;
                    $american = (float) $priceRaw;
                    // American odds have |value| >= 100 — a decimal leak is
                    // dropped, never converted (same guard as the match mapper).
                    if (abs(round($american)) < 100) continue;

                    if (in_array($marketKey, ['alternate_totals_cards', 'alternate_totals_corners'], true)) {
                        $side = ucfirst(strtolower($name));
                        if ($side !== 'Over' && $side !== 'Under') continue;
                        $outName = $side;
                    } else {
                        // Card/corner handicap: canonicalize to the Rundown row's
                        // team strings so the bet leg speaks the backend's language.
                        if (self::sideMatches($name, $homeTeam, $homeTeamFull)) {
                            $outName = $homeTeam;
                        } elseif (self::sideMatches($name, $awayTeam, $awayTeamFull)) {
                            $outName = $awayTeam;
                        } else {
                            continue; // names neither team → drop, never guess
                        }
                    }

                    $byKey[$marketKey][] = [
                        'name'  => $outName,
                        'point' => (float) $point,
                        'price' => RundownEventMapper::boardPriceDecimal($marketKey, $american, null),
                        'book'  => $bookKey,
                    ];
                }
            }
        }

        $flat = [];
        foreach ($byKey as $key => $outcomes) {
            $flat[] = ['key' => $key, 'outcomes' => $outcomes];
        }
        return RundownEventMapper::dedupeExtendedMarkets($flat);
    }

    /**
     * THE NARROW WRITE — the only card-data writer in the codebase. Persists
     * exactly three namespaced keys on a TheRundown-owned match row and
     * nothing else; SqlRepository::updateOne's top-level MERGE semantics
     * (locked by SqlRepositoryMergeTest) make it structurally impossible for
     * this call to alter any Rundown-owned field. Never widen this $set —
     * that is the whole ownership contract.
     *
     * @param list<array<string,mixed>> $markets
     */
    public static function writeCardMarkets(SqlRepository $db, string $matchId, array $markets): void
    {
        if ($matchId === '') {
            return;
        }
        $db->updateOne(self::COLLECTION, ['id' => SqlRepository::id($matchId)], [
            'cardMarkets'         => $markets,
            'cardMarketsSyncedAt' => SqlRepository::nowUtc(),
            'cardMarketsSource'   => OddsApiEventMapper::ODDS_SOURCE_TAG,
        ]);
    }

    /** Log a matcher refusal once per event (24h) instead of every 15-min poll. */
    private static function logOnce(string $toaEventId, string $message, array $context): void
    {
        $key = 'log-' . $toaEventId;
        $seen = SharedFileCache::get(self::CACHE_NS, $key, self::LOG_ONCE_TTL_SECONDS);
        if (is_array($seen)) {
            return;
        }
        SharedFileCache::remember(self::CACHE_NS, $key, self::LOG_ONCE_TTL_SECONDS, static fn (): array => ['at' => time()]);
        Logger::info($message, $context, 'oddsapi');
    }
}
