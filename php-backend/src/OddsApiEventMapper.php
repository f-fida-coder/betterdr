<?php

declare(strict_types=1);

/**
 * Convert a The Odds API v4 event JSON payload into the codebase's existing
 * matches.doc shape — the SAME shape RundownEventMapper produces, so the
 * board, betslip, placement validation, and settlement all work unchanged.
 * No new shape: soccer 3-way moneyline is a plain 'h2h' market whose third
 * outcome is named 'Draw', exactly what SportsbookBetSupport::
 * gradeAgainstScore() already grades (equal scores → Draw wins, sides void).
 *
 * Differences from a Rundown doc, by design:
 *   - externalId is NAMESPACED: 'toa_' + The Odds API event id, so it can
 *     never collide with a Rundown event_id. The 24-hex doc id hashes a
 *     'theoddsapi:' prefix for the same reason.
 *   - No Rundown team ids → homeTeamId/awayTeamId are '' (no logos, by
 *     scope) and team names are stored VERBATIM as the feed sends them
 *     (full names). homeTeam == the h2h/spreads outcome names, which is the
 *     only equality placement and settlement side-resolution need.
 *   - PREMATCH ONLY: an event at/past kickoff maps to null, and stored rows
 *     are hard-suspended at kickoff via isPastKickoff() (wired into
 *     SportsbookHealth::applyBettingAvailability). This feed is polled on a
 *     minutes-scale cadence and has no live status/score signal — serving
 *     its prices as "live" odds would hand out minutes-stale in-play lines.
 *     Money-critical.
 *   - Prices arrive AMERICAN (client forces oddsFormat=american) and run
 *     through RundownEventMapper::boardPriceDecimal() — the identical
 *     battle-tested conversion + flat-juice path the Rundown board uses.
 */
final class OddsApiEventMapper
{
    public const ODDS_SOURCE_TAG = 'theoddsapi';
    public const EXTERNAL_ID_PREFIX = 'toa_';

    /** Board market keys this mapper accepts — anything else is dropped. */
    private const ALLOWED_MARKET_KEYS = ['h2h', 'spreads', 'totals'];

    /**
     * sportKey → sidebar/board display name for the approved Odds API soccer
     * leagues (RundownSportMap::displayName() only knows Rundown sports).
     */
    private const SPORT_DISPLAY_NAMES = [
        'soccer_efl_champ'                     => 'EFL Championship',
        'soccer_england_league1'               => 'EFL League One',
        'soccer_england_league2'               => 'EFL League Two',
        'soccer_fa_cup'                        => 'FA Cup',
        'soccer_england_efl_cup'               => 'EFL Cup',
        'soccer_spain_segunda_division'        => 'La Liga 2',
        'soccer_italy_serie_b'                 => 'Serie B',
        'soccer_germany_bundesliga2'           => '2. Bundesliga',
        'soccer_france_ligue_two'              => 'Ligue 2',
        'soccer_netherlands_eredivisie'        => 'Eredivisie',
        'soccer_portugal_primeira_liga'        => 'Primeira Liga',
        'soccer_spl'                           => 'Scottish Premiership',
        'soccer_mexico_ligamx'                 => 'Liga MX',
        'soccer_brazil_campeonato'             => 'Brazil Serie A',
        'soccer_brazil_serie_b'                => 'Brazil Serie B',
        'soccer_argentina_primera_division'    => 'Argentina Primera',
        'soccer_uefa_europa_conference_league' => 'UEFA Conference League',
        'soccer_conmebol_copa_libertadores'    => 'Copa Libertadores',
        'soccer_conmebol_copa_sudamericana'    => 'Copa Sudamericana',
    ];

    /**
     * @param array<string,mixed> $event    Raw The Odds API event payload
     * @param string              $sportKey Allowlisted sport key (also the doc sportKey)
     * @param string|null         $nowIso   Test seam; null = SqlRepository::nowUtc()
     * @return array<string,mixed>|null     matches.doc-shaped array, or null if unmappable
     */
    public static function toMatchDoc(array $event, string $sportKey, ?string $nowIso = null): ?array
    {
        $eventId  = trim((string) ($event['id'] ?? ''));
        $homeTeam = trim((string) ($event['home_team'] ?? ''));
        $awayTeam = trim((string) ($event['away_team'] ?? ''));
        $commence = trim((string) ($event['commence_time'] ?? ''));
        $sportKey = strtolower(trim($sportKey));
        if ($eventId === '' || $homeTeam === '' || $awayTeam === '' || $commence === '' || $sportKey === '') {
            return null;
        }

        $now = $nowIso ?? SqlRepository::nowUtc();
        $commenceTs = strtotime($commence);
        $nowTs = strtotime($now);
        if ($commenceTs === false || $nowTs === false || $commenceTs <= $nowTs) {
            // At/past kickoff → refuse. This feed has no live status/score
            // signal and polls on a minutes cadence; the row must never be
            // served as an in-play price. Stored copies are hard-suspended
            // at kickoff too — see isPastKickoff().
            return null;
        }

        $bookmakers = self::mapBookmakers(
            is_array($event['bookmakers'] ?? null) ? $event['bookmakers'] : [],
            $sportKey,
            $homeTeam,
            $awayTeam
        );
        if ($bookmakers === []) {
            return null; // no priced markets → nothing to store (avoids empty-odds row bloat)
        }

        return [
            'id'                => self::deterministicMatchId($eventId),
            'externalId'        => self::EXTERNAL_ID_PREFIX . $eventId,
            // VERBATIM feed names on BOTH short and full fields: there is no
            // Rundown-style short form for these leagues, and every h2h/spreads
            // outcome name below is emitted from the same strings, so
            // placement string-matching and settlement side-resolution hold.
            'homeTeam'          => $homeTeam,
            'awayTeam'          => $awayTeam,
            'homeTeamShort'     => '',
            'awayTeamShort'     => '',
            'homeTeamFull'      => $homeTeam,
            'awayTeamFull'      => $awayTeam,
            'homeTeamId'        => '',
            'awayTeamId'        => '',
            'homeTeamRecord'    => '',
            'awayTeamRecord'    => '',
            'homePitcher'       => null,
            'awayPitcher'       => null,
            'broadcast'         => '',
            'eventName'         => $awayTeam . ' at ' . $homeTeam,
            'startTime'         => $commence,
            'sport'             => self::displayName($sportKey),
            'sportKey'          => $sportKey,
            'status'            => 'scheduled',
            'odds'              => [
                'bookmakers'      => $bookmakers,
                'extendedMarkets' => [],
            ],
            'extendedMarkets'   => [],
            'playerProps'       => [],
            'oddsSource'        => self::ODDS_SOURCE_TAG,
            'venueName'         => '',
            'venueLocation'     => '',
            'eventStatusDetail' => '',
            'leagueName'        => trim((string) ($event['sport_title'] ?? '')),
            'seasonType'        => '',
            'score'             => [
                'score_home'           => 0,
                'score_away'           => 0,
                'score_home_by_period' => [],
                'score_away_by_period' => [],
                'game_clock'           => null,
                'display_clock'        => '',
                'game_period'          => 0,
                'event_status'         => 'STATUS_SCHEDULED',
            ],
            'lastUpdated'       => $now,
            'lastOddsSyncAt'    => $now,
            'lastScoreSyncAt'   => $now,
            'pitchersSyncedAt'  => $now,
            'updatedAt'         => $now,
            'createdAt'         => $now,
        ];
    }

    /** Deterministic 24-hex match id — provider-prefixed so it can never collide with a Rundown id. */
    public static function deterministicMatchId(string $oddsApiEventId): string
    {
        return substr(sha1('theoddsapi:' . $oddsApiEventId), 0, 24);
    }

    /** Board display name for an approved Odds API soccer league. */
    public static function displayName(string $sportKey): string
    {
        return self::SPORT_DISPLAY_NAMES[strtolower(trim($sportKey))] ?? $sportKey;
    }

    /**
     * True when a theoddsapi-sourced match is at/past its scheduled kickoff.
     *
     * This feed is prematch-only (no live status/score signal), so once
     * kickoff passes the stored price is a blind in-play line. Wired into
     * SportsbookHealth::applyBettingAvailability — which feeds BOTH the
     * board projection and the placement MATCH_NOT_BETTABLE check — to
     * hard-suspend betting at commence time (an ACTIVE close; staleness
     * ageout alone would leave a post-kickoff window at the last prematch
     * price). Always false for any other provider's rows: Rundown matches
     * flip to a real live status with live prices and are never touched.
     *
     * Fail-closed: a theoddsapi row with no parseable startTime is treated
     * as past kickoff (the mapper always writes one; missing = corrupt →
     * do not take bets on it).
     */
    public static function isPastKickoff(array $match, ?int $nowTs = null): bool
    {
        if (strtolower(trim((string) ($match['oddsSource'] ?? ''))) !== self::ODDS_SOURCE_TAG) {
            return false;
        }
        $startTs = strtotime((string) ($match['startTime'] ?? ''));
        if ($startTs === false || $startTs <= 0) {
            return true;
        }
        return $startTs <= ($nowTs ?? time());
    }

    /** Hard ceiling on the provider freshness override (user ruling 2026-07-05: 12-15 min, never unlimited). */
    private const PREMATCH_SOFT_FRESHNESS_CAP_SECONDS = 900;
    private const PREMATCH_SOFT_FRESHNESS_DEFAULT_SECONDS = 720;

    /**
     * Prematch soft-staleness window for a match row. theoddsapi rows are
     * polled on a ~10-minute cadence (vs Rundown's ~75s), so the platform
     * default (120-300s) would badge them "delayed/stale" most of the time.
     * For OUR rows only, widen to ODDS_API_PREMATCH_FRESHNESS_SECONDS
     * (default 720s), hard-capped at 900s — the cap is a constant, not env,
     * so config can never stretch it further. Any other provider's row gets
     * the passed-in default back UNTOUCHED — Rundown freshness gates are
     * not this function's business.
     */
    public static function prematchSoftFreshnessSeconds(array $match, int $defaultSeconds): int
    {
        if (strtolower(trim((string) ($match['oddsSource'] ?? ''))) !== self::ODDS_SOURCE_TAG) {
            return $defaultSeconds;
        }
        $raw = (int) Env::get('ODDS_API_PREMATCH_FRESHNESS_SECONDS', (string) self::PREMATCH_SOFT_FRESHNESS_DEFAULT_SECONDS);
        if ($raw <= 0) {
            $raw = self::PREMATCH_SOFT_FRESHNESS_DEFAULT_SECONDS;
        }
        return max($defaultSeconds, min(self::PREMATCH_SOFT_FRESHNESS_CAP_SECONDS, $raw));
    }

    // ── markets mapping ──────────────────────────────────────────────

    /**
     * The Odds API bookmakers[] → the stored bookmakers shape
     * ([{key,name,lastUpdate,markets:[{key,outcomes:[{name,price,point?}]}]}]).
     *
     * Outcome names are trusted only when they match the event's own teams
     * (or 'Draw' / Over / Under) — an unmatched name would place fine but
     * settle 'pending' forever, so it is dropped at ingestion instead.
     *
     * @param list<array<string,mixed>> $bookmakers
     * @return list<array<string,mixed>>
     */
    private static function mapBookmakers(array $bookmakers, string $sportKey, string $homeTeam, string $awayTeam): array
    {
        $out = [];
        foreach ($bookmakers as $bm) {
            if (!is_array($bm)) continue;
            $bookKey = strtolower(trim((string) ($bm['key'] ?? '')));
            if ($bookKey === '') continue;
            $markets = [];
            foreach ((is_array($bm['markets'] ?? null) ? $bm['markets'] : []) as $market) {
                if (!is_array($market)) continue;
                $marketKey = strtolower(trim((string) ($market['key'] ?? '')));
                if (!in_array($marketKey, self::ALLOWED_MARKET_KEYS, true)) continue;
                $outcomes = [];
                foreach ((is_array($market['outcomes'] ?? null) ? $market['outcomes'] : []) as $o) {
                    $mapped = self::mapOutcome($o, $marketKey, $sportKey, $homeTeam, $awayTeam);
                    if ($mapped !== null) {
                        $outcomes[] = $mapped;
                    }
                }
                if ($outcomes !== []) {
                    $markets[] = ['key' => $marketKey, 'outcomes' => $outcomes];
                }
            }
            if ($markets === []) continue;
            $out[] = [
                'key'        => $bookKey,
                'name'       => trim((string) ($bm['title'] ?? $bookKey)),
                'lastUpdate' => trim((string) ($bm['last_update'] ?? '')),
                'markets'    => $markets,
            ];
        }

        // Preferred-book display order — same convention as
        // RundownEventMapper::materializeBookmakers (frontend renders the
        // first bookmaker with markets).
        $pref = self::preferredBookOrder();
        if ($pref !== [] && count($out) > 1) {
            $rank = static function (array $bm) use ($pref): int {
                $i = array_search((string) ($bm['key'] ?? ''), $pref, true);
                return $i === false ? PHP_INT_MAX : (int) $i;
            };
            usort($out, static fn (array $a, array $b): int => $rank($a) <=> $rank($b));
        }

        // Same interim quarter-line policy as the Rundown soccer board:
        // quarter (.25/.75) Asian mains are hidden + placement-blocked, so
        // promote the cleanest priced whole/half line instead of blanking.
        $out = self::promoteSoccerMainLineCleanRung($out, 'spreads');
        $out = self::promoteSoccerMainLineCleanRung($out, 'totals');
        return $out;
    }

    /**
     * One The Odds API outcome → stored outcome {name, price(decimal), point?}.
     * Returns null (drop) on any shape/name/price problem — never guesses.
     *
     * @param mixed $o
     * @return array<string,mixed>|null
     */
    private static function mapOutcome(mixed $o, string $marketKey, string $sportKey, string $homeTeam, string $awayTeam): ?array
    {
        if (!is_array($o)) return null;
        $name = trim((string) ($o['name'] ?? ''));
        $priceRaw = $o['price'] ?? null;
        if ($name === '' || !is_numeric($priceRaw)) return null;
        $american = (float) $priceRaw;
        // American odds are integers with |value| >= 100. A decimal-looking
        // value here means the feed ignored oddsFormat=american — converting
        // it would fabricate a wildly wrong price. Drop, never guess.
        if (abs(round($american)) < 100) return null;

        if ($marketKey === 'h2h') {
            $isSide = strcasecmp($name, $homeTeam) === 0 || strcasecmp($name, $awayTeam) === 0;
            $isDraw = strcasecmp($name, 'Draw') === 0;
            if (!$isSide && !$isDraw) return null;
            return [
                'name'  => $isDraw ? 'Draw' : $name,
                'price' => RundownEventMapper::boardPriceDecimal('h2h', $american, $sportKey),
            ];
        }

        $point = $o['point'] ?? null;
        if (!is_numeric($point)) return null; // spreads/totals are meaningless without a line

        if ($marketKey === 'spreads') {
            if (strcasecmp($name, $homeTeam) !== 0 && strcasecmp($name, $awayTeam) !== 0) return null;
            return [
                'name'  => $name,
                'point' => (float) $point,
                'price' => RundownEventMapper::boardPriceDecimal('spreads', $american, $sportKey),
            ];
        }

        // totals
        $side = ucfirst(strtolower($name));
        if ($side !== 'Over' && $side !== 'Under') return null;
        return [
            'name'  => $side,
            'point' => (float) $point,
            'price' => RundownEventMapper::boardPriceDecimal('totals', $american, $sportKey),
        ];
    }

    /**
     * Mirror of RundownEventMapper::promoteSoccerMainLineCleanRung (private
     * there; duplicated so this mapper never reaches into the Rundown
     * pipeline's internals — keep the two in sync if the quarter policy
     * changes). Reference = first book whose market is fully non-quarter;
     * books with a quarter main get that book's whole outcome set.
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
     * SPORTSBOOK_PREFERRED_BOOKS keys, lowercased. Public: the outright
     * builder (OddsApiSyncService::buildOutrightDoc) ranks books by the same
     * order when picking one price per contender.
     *
     * @return list<string>
     */
    public static function preferredBookOrder(): array
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
