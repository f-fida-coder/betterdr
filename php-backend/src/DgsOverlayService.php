<?php

declare(strict_types=1);

/**
 * DgsOverlayService — overlay harvested bettorjuice365 (DGS) numbers onto our
 * matches so the board shows their exact lines.
 *
 * MONEY-CRITICAL. This is the single source of truth for the overlay logic;
 * both the CLI inspector (scripts/dgs-overlay.php) and the live odds-worker
 * call it. Read php-backend money-safety rules before editing.
 *
 * Safety model:
 *  - It does NOT touch balances, transactions, or bets. It only rewrites the
 *    price/point on EXISTING outcomes of our match `odds` field, matched by
 *    team / Over-Under, in BOTH odds.bookmakers[*].markets AND odds.markets —
 *    the two representations display and bet-placement read — so what a player
 *    sees == what they bet == what settles. Outcome names/keys are untouched.
 *  - It adds NOTHING: only outcomes we already carry are rewritten. Markets the
 *    competitor shows but we don't (team totals, periods we don't list) are
 *    never created.
 *  - Prices convert American→decimal via the canonical
 *    SportsbookBetSupport::americanToDecimalExact (no DIY money math).
 *  - Freshness gate is PER FILE: a harvest file older than maxAgeSeconds is
 *    skipped. The full game and each period live in separate files
 *    (<LEAGUE>.json, <LEAGUE>_P<n>.json — see /api/dgs/ingest), so a stale
 *    period leaves that period's market on Rundown while the full game stays
 *    mirrored, and a closed browser tab auto-reverts the board to Rundown.
 *  - Poison guard: rejects absurd odds/points before they can touch a match.
 *  - Writes only when a value actually MOVES (epsilon compare) — no hot-table
 *    write amplification, no artificial freshness. Idempotent.
 *  - Pending bets are unaffected: they snapshot odds at placement.
 *
 * Periods (1st half / 1st quarter / …) are gated by opts['periods'] and OFF by
 * default — the full-game overlay is unchanged when periods are off. DGS tags
 * each line with a `PeriodDescription` label ("Game", "1st Half", "1st
 * Quarter"); we map that label to our market-key suffix (h1/q1/…) and apply the
 * same spread/ML/total logic to the matching period market (h2h_q1, spreads_h1,
 * …) IF our board carries it.
 */
final class DgsOverlayService
{
    /** Base market keys we align. Spread / Moneyline / Total only — nothing else. */
    private const CORE_BASES = ['h2h', 'spreads', 'totals'];

    /** DGS SportSubType → our candidate sportKeys (full-game leagues). */
    private const SPORT_KEYS = [
        'NBA'  => ['basketball_nba', 'basketball_nba_playoffs', 'basketball_nba_preseason'],
        'WNBA' => ['basketball_wnba'],
        'MLB'  => ['baseball_mlb', 'baseball_mlb_playoffs'],
        'NHL'  => ['icehockey_nhl', 'icehockey_nhl_playoffs'],
        'NFL'  => ['americanfootball_nfl', 'americanfootball_nfl_playoffs'],
    ];

    /**
     * DGS PeriodDescription (normalized: lowercase, alnum only) → our market-key
     * suffix. '' = full game. Unknown labels are skipped (and logged) so a new
     * DGS label can never be silently mis-routed onto the wrong market.
     */
    private const PERIOD_LABEL_SUFFIX = [
        'game'        => '',
        '1sthalf'     => 'h1', '2ndhalf'     => 'h2',
        'firsthalf'   => 'h1', 'secondhalf'  => 'h2',
        '1stquarter'  => 'q1', '2ndquarter'  => 'q2',
        '3rdquarter'  => 'q3', '4thquarter'  => 'q4',
        '1stperiod'   => 'p1', '2ndperiod'   => 'p2', '3rdperiod' => 'p3',
    ];

    /**
     * Apply (or, in dry-run, plan) the DGS overlay.
     *
     * @param array{
     *   dryRun?:bool, sports?:list<string>, maxAgeSeconds?:int, periods?:bool,
     *   liveDir?:string, log?:callable(string):void
     * } $opts
     * @return array{
     *   willWrite:bool, periods:bool, paired:int, written:int, rejected:int,
     *   leagues:array<string,array{age:int,games:int}>, stale:list<string>,
     *   missing:list<string>, unknownPeriods:list<string>
     * }
     */
    public static function apply(SqlRepository $repo, array $opts = []): array
    {
        $dryRun  = (bool) ($opts['dryRun'] ?? true);
        $maxAge  = max(15, (int) ($opts['maxAgeSeconds'] ?? 120));
        $periods = (bool) ($opts['periods'] ?? false);
        $sports  = array_values(array_filter((array) ($opts['sports'] ?? ['basketball_nba'])));
        $liveDir = (string) ($opts['liveDir'] ?? (dirname(__DIR__) . '/storage/dgs/live'));
        $log     = $opts['log'] ?? static function (string $_): void {};

        $stats = [
            'willWrite'      => !$dryRun,
            'periods'        => $periods,
            'paired'         => 0,
            'written'        => 0,
            'rejected'       => 0,
            'leagues'        => [],
            'stale'          => [],
            'missing'        => [],
            'unknownPeriods' => [],
        ];

        // Which DGS leagues map onto the enabled sportKeys?
        $enabledLeagues = [];
        foreach (self::SPORT_KEYS as $lg => $keys) {
            foreach ($keys as $sk) {
                if (in_array($sk, $sports, true)) { $enabledLeagues[$lg] = true; break; }
            }
        }
        if ($enabledLeagues === []) {
            return $stats;
        }

        // ── load fresh DGS games (full game always; periods only if enabled) ──
        $now = time();
        $games = [];            // gameKey → game dict with ['periods'][suffix]
        $unknown = [];          // set of unknown period labels seen
        foreach (array_keys($enabledLeagues) as $league) {
            // Each period lives in its own file with its own mtime, so freshness
            // is judged per file. Filenames are just for collision/freshness —
            // the period itself is derived from each line's PeriodDescription.
            $candidateFiles = array_merge(
                [$liveDir . '/' . $league . '.json'],
                $periods ? (glob($liveDir . '/' . $league . '_P*.json') ?: []) : []
            );
            $baseExists = false;
            $freshGames = 0;
            $newestAge  = null;
            foreach ($candidateFiles as $file) {
                if (!is_file($file)) { continue; }
                $baseExists = true;
                $age = $now - (int) filemtime($file);
                if ($age > $maxAge) {
                    $stats['stale'][] = basename($file) . " ({$age}s)";
                    $log("  [stale] " . basename($file) . ": {$age}s old (> {$maxAge}s) — leaving Rundown lines");
                    continue;
                }
                $newestAge = $newestAge === null ? $age : min($newestAge, $age);
                $data  = json_decode((string) file_get_contents($file), true);
                $lines = is_array($data['Lines'] ?? null) ? $data['Lines'] : [];
                foreach ($lines as $ln) {
                    if (!is_array($ln)) { continue; }
                    $freshGames += self::ingestLine($games, $league, $ln, $periods, $unknown);
                }
            }
            if (!$baseExists) {
                $stats['missing'][] = $league;
                $log("  [skip] {$league}: no harvest file");
                continue;
            }
            if ($newestAge !== null) {
                $stats['leagues'][$league] = ['age' => $newestAge, 'games' => 0];
            }
        }
        // count distinct games per league for the summary
        foreach ($games as $g) {
            if (isset($stats['leagues'][$g['league']])) {
                $stats['leagues'][$g['league']]['games']++;
            }
        }
        foreach ($stats['leagues'] as $lg => $info) {
            $log("  [fresh] {$lg}: {$info['games']} games (newest harvest {$info['age']}s old)");
        }
        $stats['unknownPeriods'] = array_values(array_unique($unknown));
        foreach ($stats['unknownPeriods'] as $u) {
            $log("  [period?] unmapped PeriodDescription '{$u}' — skipped (add to PERIOD_LABEL_SUFFIX to support)");
        }
        if ($games === []) {
            return $stats;
        }

        // ── pair + overlay ──────────────────────────────────────────────────
        $matchCache = [];
        foreach ($games as $g) {
            $match = self::findMatch($repo, $g, $matchCache);
            $log(str_repeat('─', 70) . "\n{$g['away']} @ {$g['home']}  [{$g['league']}]  periods=[" . implode(',', array_keys($g['periods'])) . "]");
            if ($match === null) { $log("  ⚠ no matching match row — skipped"); continue; }
            $stats['paired']++;

            $homeName = (string) ($match['homeTeam'] ?? '');
            $awayName = (string) ($match['awayTeam'] ?? '');
            $odds     = is_array($match['odds'] ?? null) ? $match['odds'] : [];

            $chg = 0; $rej = 0; $touched = [];

            // representation 1: odds.markets (bet placement / settlement reads this)
            if (isset($odds['markets']) && is_array($odds['markets'])) {
                self::overlayMarketList($odds['markets'], $g, $homeName, $awayName, 'markets', $chg, $rej, $touched);
            }
            // representation 2: odds.bookmakers[*].markets (frontend display reads this)
            if (isset($odds['bookmakers']) && is_array($odds['bookmakers'])) {
                foreach ($odds['bookmakers'] as &$bk) {
                    if (!is_array($bk['markets'] ?? null)) { continue; }
                    self::overlayMarketList($bk['markets'], $g, $homeName, $awayName, 'book.' . ($bk['key'] ?? '?'), $chg, $rej, $touched);
                }
                unset($bk);
            }

            $log("  planned: {$chg} value changes (price/point), {$rej} rejected/unmatched");
            foreach ($touched as $where => $c) { $log("    · {$where}: {$c}"); }
            $stats['written']  += $chg;
            $stats['rejected'] += $rej;

            if (!$dryRun && $chg > 0) {
                $stampedOdds = $odds;
                $stampedOdds['dgsOverlayAt']     = SqlRepository::nowUtc();
                $stampedOdds['dgsOverlaySource'] = 'bettorjuice365';
                // updateOne takes a FLAT field map (merged into the doc). We do
                // NOT change oddsSource — that would disturb display/freshness gates.
                $repo->updateOne('matches', ['id' => $match['id']], [
                    'odds'         => $stampedOdds,
                    'dgsOverlayAt' => SqlRepository::nowUtc(),
                ]);
                $log("  ✔ WROTE overlay to match {$match['id']}");
            }
        }

        return $stats;
    }

    /** @return list<string> the candidate sportKeys for a DGS SportSubType. */
    public static function sportKeysFor(string $sub): array
    {
        return self::SPORT_KEYS[strtoupper(trim($sub))] ?? [];
    }

    // ── internals ───────────────────────────────────────────────────────────

    private static function norm(string $s): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower($s)) ?? '';
    }

    /** Poison guard for a signed American odds int. */
    private static function amerOk(mixed $a): bool
    {
        if (!is_int($a) && !(is_numeric($a) && (float) $a == (int) $a)) { return false; }
        $a = (int) $a;
        return $a !== 0 && abs($a) >= 100 && abs($a) <= 100000;
    }

    private static function spreadPtOk(mixed $p): bool
    {
        return is_numeric($p) && abs((float) $p) <= 100.0;
    }

    private static function totalPtOk(mixed $p): bool
    {
        return is_numeric($p) && (float) $p > 0.0 && (float) $p <= 500.0;
    }

    /**
     * Parse one DGS Lines[] entry and merge it into $games under its game key
     * and period suffix. Returns 1 if it produced a usable period slot, else 0.
     *
     * @param array<string,mixed> $games  by-ref accumulator
     * @param array<string,mixed> $ln
     * @param list<string>        $unknown by-ref set of unmapped labels
     */
    private static function ingestLine(array &$games, string $league, array $ln, bool $periods, array &$unknown): int
    {
        $away = trim((string) ($ln['Team1ID'] ?? ''));   // DGS Team1 = visitor
        $home = trim((string) ($ln['Team2ID'] ?? ''));   // DGS Team2 = home
        if ($away === '' || $home === '') { return 0; }

        // Period suffix from the human label (robust to PeriodNumber renumbering).
        $label = self::norm((string) ($ln['PeriodDescription'] ?? ''));
        if ($label === '') {
            // No label → fall back to PeriodNumber 0 = full game, else unknown.
            $suffix = ((int) ($ln['PeriodNumber'] ?? 0) === 0) ? '' : null;
        } else {
            $suffix = self::PERIOD_LABEL_SUFFIX[$label] ?? null;
        }
        if ($suffix === null) {
            $unknown[] = (string) ($ln['PeriodDescription'] ?? ('PeriodNumber=' . ($ln['PeriodNumber'] ?? '?')));
            return 0;
        }
        if ($suffix !== '' && !$periods) { return 0; } // periods disabled

        $favHome = self::norm((string) ($ln['FavoredTeamID'] ?? '')) === self::norm($home);
        $spread  = $ln['Spread'] ?? null;
        $homePt  = $spread === null ? null : ($favHome ? (float) $spread : -(float) $spread);
        $awayPt  = $homePt === null ? null : -1.0 * $homePt;

        $vals = [
            'spread' => [
                'home' => ['pt' => $homePt, 'amer' => $favHome ? ($ln['SpreadAdj2'] ?? null) : ($ln['SpreadAdj1'] ?? null)],
                'away' => ['pt' => $awayPt, 'amer' => $favHome ? ($ln['SpreadAdj1'] ?? null) : ($ln['SpreadAdj2'] ?? null)],
            ],
            'ml'    => ['home' => $ln['MoneyLine2'] ?? null, 'away' => $ln['MoneyLine1'] ?? null],
            'total' => ['pt' => $ln['TotalPoints'] ?? null, 'over' => $ln['TtlPtsAdj1'] ?? null, 'under' => $ln['TtlPtsAdj2'] ?? null],
        ];

        $key = $league . '|' . self::norm($away) . '|' . self::norm($home);
        if (!isset($games[$key])) {
            $games[$key] = [
                'league'  => $league,
                'home'    => $home,
                'away'    => $away,
                'gdtTs'   => strtotime((string) ($ln['GameDateTime'] ?? '')) ?: 0,
                'periods' => [],
            ];
        }
        // Full-game line sets the canonical start time used for pairing.
        if ($suffix === '' && $games[$key]['gdtTs'] === 0) {
            $games[$key]['gdtTs'] = strtotime((string) ($ln['GameDateTime'] ?? '')) ?: 0;
        }
        $games[$key]['periods'][$suffix] = $vals;
        return 1;
    }

    /**
     * Find our match row for a DGS game: team-name match (either orientation,
     * tolerant), nearest in start time.
     *
     * @param array<string,mixed>                     $g
     * @param array<string,list<array<string,mixed>>> $cache  sportKey → matches
     * @return array<string,mixed>|null
     */
    private static function findMatch(SqlRepository $repo, array $g, array &$cache): ?array
    {
        $sportKeys = self::sportKeysFor((string) $g['league']);
        $cands = [];
        foreach ($sportKeys as $sk) {
            if (!isset($cache[$sk])) {
                $cache[$sk] = $repo->findMany('matches', ['sportKey' => $sk], ['limit' => 500]);
            }
            foreach ($cache[$sk] as $m) { $cands[] = $m; }
        }

        $th = self::norm((string) $g['home']);
        $ta = self::norm((string) $g['away']);
        $match = null; $bestGap = PHP_INT_MAX;
        foreach ($cands as $m) {
            $mh = self::norm((string) ($m['homeTeam'] ?? ''));
            $ma = self::norm((string) ($m['awayTeam'] ?? ''));
            $hit = ($mh === $th && $ma === $ta)
                || ($mh !== '' && $ma !== '' && str_contains($mh, $th) && str_contains($ma, $ta))
                || ($th !== '' && $ta !== '' && str_contains($th, $mh) && str_contains($ta, $ma));
            if (!$hit) { continue; }
            $gap = abs(((int) $g['gdtTs']) - (strtotime((string) ($m['startTime'] ?? '')) ?: 0));
            if ($gap < $bestGap) { $bestGap = $gap; $match = $m; }
        }
        return $match;
    }

    /**
     * Overlay every CORE market in a market list. Resolves each market's
     * (base, period-suffix) from its key and applies the matching DGS period
     * values — skipping markets whose period we don't have from DGS.
     *
     * @param list<array<string,mixed>> $markets by-ref
     * @param array<string,mixed>       $g
     * @param array<string,int>         $touched by-ref tally
     */
    private static function overlayMarketList(array &$markets, array $g, string $homeName, string $awayName, string $where, int &$chg, int &$rej, array &$touched): void
    {
        foreach ($markets as &$mk) {
            $key = (string) ($mk['key'] ?? '');
            [$base, $suffix] = self::parseMarketKey($key);
            if ($base === null) { continue; }                         // not a core market
            if (!isset($g['periods'][$suffix])) { continue; }          // we don't have this period from DGS
            if (!is_array($mk['outcomes'] ?? null)) { continue; }
            [$c, $r] = self::applyToMarketOutcomes($mk['outcomes'], $base, $g['periods'][$suffix], $homeName, $awayName);
            $chg += $c; $rej += $r;
            if ($c) { $touched[$where . '.' . $key] = ($touched[$where . '.' . $key] ?? 0) + $c; }
        }
        unset($mk);
    }

    /**
     * Resolve a market key into [base, periodSuffix], or [null, ''] if it is not
     * a core spread/ML/total market. 'spreads' → ['spreads','']; 'h2h_q1' →
     * ['h2h','q1']. Alternates / 3-way / props return null (left untouched).
     *
     * @return array{0:?string,1:string}
     */
    private static function parseMarketKey(string $key): array
    {
        if (in_array($key, self::CORE_BASES, true)) {
            return [$key, ''];
        }
        if (preg_match('/^(h2h|spreads|totals)_([a-z0-9_]+)$/', $key, $m) === 1) {
            // Only suffixes we actually map to a DGS period; everything else
            // (alternate_*, *_3_way, *_1st_5_innings we don't harvest) is skipped.
            $suffix = $m[2];
            if (in_array($suffix, self::PERIOD_LABEL_SUFFIX, true)) {
                return [$m[1], $suffix];
            }
        }
        return [null, ''];
    }

    /**
     * Overwrite price+point on an outcome list in place from a DGS period's
     * side-lookup. Only writes when a value actually moves.
     *
     * @param list<array<string,mixed>> $outcomes by-ref
     * @param 'spreads'|'h2h'|'totals'  $kind
     * @param array<string,mixed>       $vals  one period's {spread,ml,total}
     * @return array{0:int,1:int} [changedCount, rejectedCount]
     */
    private static function applyToMarketOutcomes(array &$outcomes, string $kind, array $vals, string $homeName, string $awayName): array
    {
        $changed = 0; $rejected = 0;
        foreach ($outcomes as &$o) {
            $name = (string) ($o['name'] ?? '');
            $n = self::norm($name);

            if ($kind === 'totals') {
                $isOver = str_contains(strtolower($name), 'over');
                $amer = $isOver ? ($vals['total']['over'] ?? null) : ($vals['total']['under'] ?? null);
                $pt   = $vals['total']['pt'] ?? null;
                if (!self::totalPtOk($pt) || !self::amerOk($amer)) { $rejected++; continue; }
                $changed += self::setPrice($o, (int) $amer);
                $changed += self::setPoint($o, (float) $pt);
                continue;
            }

            // spreads / h2h: decide home vs away by name
            $side = null;
            if ($n !== '' && ($n === self::norm($homeName) || str_contains($n, self::norm($homeName)) || str_contains(self::norm($homeName), $n))) {
                $side = 'home';
            } elseif ($n !== '' && ($n === self::norm($awayName) || str_contains($n, self::norm($awayName)) || str_contains(self::norm($awayName), $n))) {
                $side = 'away';
            }
            if ($side === null) { $rejected++; continue; }

            if ($kind === 'h2h') {
                $amer = $vals['ml'][$side] ?? null;
                if (!self::amerOk($amer)) { $rejected++; continue; }
                $changed += self::setPrice($o, (int) $amer);
            } else { // spreads
                $amer = $vals['spread'][$side]['amer'] ?? null;
                $pt   = $vals['spread'][$side]['pt'] ?? null;
                if (!self::spreadPtOk($pt) || !self::amerOk($amer)) { $rejected++; continue; }
                $changed += self::setPrice($o, (int) $amer);
                $changed += self::setPoint($o, (float) $pt);
            }
        }
        unset($o);
        return [$changed, $rejected];
    }

    /**
     * Set outcome price from DGS American odds, but only if it actually moves
     * the stored decimal value. Returns 1 if it changed, else 0 — so the caller
     * writes to the DB only when DGS has genuinely moved a line.
     *
     * @param array<string,mixed> $o
     */
    private static function setPrice(array &$o, int $american): int
    {
        $new = SportsbookBetSupport::americanToDecimalExact($american);
        $old = isset($o['price']) && is_numeric($o['price']) ? (float) $o['price'] : null;
        if ($old !== null && abs($old - $new) < 1e-9) { return 0; }
        $o['price'] = $new;
        return 1;
    }

    /**
     * Set outcome point, only if it actually moves the stored value.
     *
     * @param array<string,mixed> $o
     */
    private static function setPoint(array &$o, float $point): int
    {
        $old = isset($o['point']) && is_numeric($o['point']) ? (float) $o['point'] : null;
        if ($old !== null && abs($old - $point) < 1e-9) { return 0; }
        $o['point'] = $point;
        return 1;
    }
}
