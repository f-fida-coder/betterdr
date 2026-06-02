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
 * Safety model (unchanged from the original Phase-2 script):
 *  - It does NOT touch balances, transactions, or bets. It only rewrites the
 *    price/point on EXISTING outcomes of our match `odds` field, matched by
 *    team / Over-Under, in BOTH odds.bookmakers[*].markets AND odds.markets —
 *    the two representations display and bet-placement read — so what a player
 *    sees == what they bet == what settles. Outcome names/keys are untouched.
 *  - It adds NOTHING: only outcomes we already carry are rewritten. Markets the
 *    competitor shows but we don't (team totals, etc.) are never created.
 *  - Prices convert American→decimal via the canonical
 *    SportsbookBetSupport::americanToDecimalExact (no DIY money math).
 *  - Freshness gate: a league whose harvest file is older than maxAgeSeconds is
 *    skipped → the board keeps its Rundown lines. So if the harvesting browser
 *    closes and the feed goes stale, the board AUTO-REVERTS to Rundown.
 *  - Poison guard: rejects absurd odds/points before they can touch a match.
 *  - Idempotent: re-running overwrites to the same DGS value; no ledger, no
 *    accumulation. Safe to call every worker tick.
 *  - Pending bets are unaffected: they snapshot odds at placement.
 *
 * The worker calls apply($repo, ['dryRun'=>false, ...]) as the last step of a
 * tick, re-laying DGS on top of the Rundown lines just synced. dryRun (default)
 * computes + reports planned changes and WRITES NOTHING.
 */
final class DgsOverlayService
{
    /** CORE market keys we align. Spread / Moneyline / Total only — nothing else. */
    private const CORE = ['h2h', 'spreads', 'totals'];

    /** DGS SportSubType → our candidate sportKeys (full-game leagues). */
    private const SPORT_KEYS = [
        'NBA'  => ['basketball_nba', 'basketball_nba_playoffs', 'basketball_nba_preseason'],
        'WNBA' => ['basketball_wnba'],
        'MLB'  => ['baseball_mlb', 'baseball_mlb_playoffs'],
        'NHL'  => ['icehockey_nhl', 'icehockey_nhl_playoffs'],
        'NFL'  => ['americanfootball_nfl', 'americanfootball_nfl_playoffs'],
    ];

    /**
     * Apply (or, in dry-run, plan) the DGS overlay.
     *
     * @param array{
     *   dryRun?:bool, sports?:list<string>, maxAgeSeconds?:int,
     *   liveDir?:string, log?:callable(string):void
     * } $opts
     * @return array{
     *   willWrite:bool, paired:int, written:int, rejected:int,
     *   leagues:array<string,array{age:int,count:int}>, stale:list<string>, missing:list<string>
     * }
     */
    public static function apply(SqlRepository $repo, array $opts = []): array
    {
        $dryRun   = (bool) ($opts['dryRun'] ?? true);
        $maxAge   = max(15, (int) ($opts['maxAgeSeconds'] ?? 120));
        $sports   = array_values(array_filter((array) ($opts['sports'] ?? ['basketball_nba'])));
        $liveDir  = (string) ($opts['liveDir'] ?? (dirname(__DIR__) . '/storage/dgs/live'));
        $log      = $opts['log'] ?? static function (string $_): void {};

        $stats = [
            'willWrite' => !$dryRun,
            'paired'    => 0,
            'written'   => 0,
            'rejected'  => 0,
            'leagues'   => [],
            'stale'     => [],
            'missing'   => [],
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

        // ── load fresh DGS games ────────────────────────────────────────────
        $now = time();
        $dgsGames = [];
        foreach (array_keys($enabledLeagues) as $league) {
            $file = $liveDir . '/' . $league . '.json';
            if (!is_file($file)) { $stats['missing'][] = $league; $log("  [skip] {$league}: no harvest file"); continue; }
            $age = $now - (int) filemtime($file);
            if ($age > $maxAge) {
                $stats['stale'][] = $league;
                $log("  [stale] {$league}: harvest {$age}s old (> {$maxAge}s) — leaving Rundown lines");
                continue;
            }
            $data  = json_decode((string) file_get_contents($file), true);
            $lines = is_array($data['Lines'] ?? null) ? $data['Lines'] : [];
            $count = 0;
            foreach ($lines as $ln) {
                $g = self::normalizeGameLine($league, is_array($ln) ? $ln : []);
                if ($g !== null) { $dgsGames[] = $g; $count++; }
            }
            $stats['leagues'][$league] = ['age' => $age, 'count' => $count];
            $log("  [fresh] {$league}: {$count} games (harvest {$age}s old)");
        }
        if ($dgsGames === []) {
            return $stats;
        }

        // ── pair + overlay ──────────────────────────────────────────────────
        $matchCache = [];
        foreach ($dgsGames as $g) {
            $match = self::findMatch($repo, $g, $matchCache);
            $log(str_repeat('─', 70) . "\n{$g['away']} @ {$g['home']}  [{$g['league']}]");
            if ($match === null) { $log("  ⚠ no matching match row — skipped"); continue; }
            $stats['paired']++;

            $homeName = (string) ($match['homeTeam'] ?? '');
            $awayName = (string) ($match['awayTeam'] ?? '');
            $odds     = is_array($match['odds'] ?? null) ? $match['odds'] : [];

            $chg = 0; $rej = 0; $touched = [];

            // representation 1: odds.markets (bet placement / settlement reads this)
            if (isset($odds['markets']) && is_array($odds['markets'])) {
                foreach ($odds['markets'] as &$mk) {
                    $key = (string) ($mk['key'] ?? '');
                    if (!in_array($key, self::CORE, true) || !is_array($mk['outcomes'] ?? null)) continue;
                    [$c, $r] = self::applyToMarketOutcomes($mk['outcomes'], $key, $g, $homeName, $awayName);
                    $chg += $c; $rej += $r; if ($c) $touched['markets.' . $key] = $c;
                }
                unset($mk);
            }
            // representation 2: odds.bookmakers[*].markets (frontend display reads this)
            if (isset($odds['bookmakers']) && is_array($odds['bookmakers'])) {
                foreach ($odds['bookmakers'] as &$bk) {
                    if (!is_array($bk['markets'] ?? null)) continue;
                    foreach ($bk['markets'] as &$mk) {
                        $key = (string) ($mk['key'] ?? '');
                        if (!in_array($key, self::CORE, true) || !is_array($mk['outcomes'] ?? null)) continue;
                        [$c, $r] = self::applyToMarketOutcomes($mk['outcomes'], $key, $g, $homeName, $awayName);
                        $chg += $c; $rej += $r; if ($c) $touched['book.' . ($bk['key'] ?? '?') . '.' . $key] = $c;
                    }
                    unset($mk);
                }
                unset($bk);
            }

            $log("  planned: {$chg} value changes (price/point), {$rej} rejected/unmatched");
            foreach ($touched as $where => $c) $log("    · {$where}: {$c}");
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
        if (!is_int($a) && !(is_numeric($a) && (float) $a == (int) $a)) return false;
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
     * Normalize one DGS `Lines[]` entry into our overlay shape, or null if it
     * isn't a usable full-game line.
     *
     * @return array<string,mixed>|null
     */
    private static function normalizeGameLine(string $league, array $ln): ?array
    {
        if ((int) ($ln['PeriodNumber'] ?? 0) !== 0) return null; // full game only (periods: future work)
        $away = trim((string) ($ln['Team1ID'] ?? ''));
        $home = trim((string) ($ln['Team2ID'] ?? ''));
        if ($away === '' || $home === '') return null;

        $favHome = self::norm((string) ($ln['FavoredTeamID'] ?? '')) === self::norm($home);
        $spread  = $ln['Spread'] ?? null;
        $homePt  = $spread === null ? null : ($favHome ? (float) $spread : -(float) $spread);
        $awayPt  = $homePt === null ? null : -1.0 * $homePt;

        return [
            'league' => $league,
            'home'   => $home,
            'away'   => $away,
            'gdtTs'  => strtotime((string) ($ln['GameDateTime'] ?? '')) ?: 0,
            'spread' => [
                'home' => ['pt' => $homePt, 'amer' => $favHome ? ($ln['SpreadAdj2'] ?? null) : ($ln['SpreadAdj1'] ?? null)],
                'away' => ['pt' => $awayPt, 'amer' => $favHome ? ($ln['SpreadAdj1'] ?? null) : ($ln['SpreadAdj2'] ?? null)],
            ],
            'ml'    => ['home' => $ln['MoneyLine2'] ?? null, 'away' => $ln['MoneyLine1'] ?? null],
            'total' => ['pt' => $ln['TotalPoints'] ?? null, 'over' => $ln['TtlPtsAdj1'] ?? null, 'under' => $ln['TtlPtsAdj2'] ?? null],
        ];
    }

    /**
     * Find our match row for a DGS game: team-name match (either orientation,
     * tolerant), nearest in start time. Their GameDateTime is local EST and our
     * startTime is UTC, so we don't require the same calendar date.
     *
     * @param array<string,mixed>                  $g
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
            foreach ($cache[$sk] as $m) $cands[] = $m;
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
            if (!$hit) continue;
            $gap = abs(((int) $g['gdtTs']) - (strtotime((string) ($m['startTime'] ?? '')) ?: 0));
            if ($gap < $bestGap) { $bestGap = $gap; $match = $m; }
        }
        return $match;
    }

    /**
     * Overwrite price+point on an outcome list in place from a DGS side-lookup.
     *
     * @param list<array<string,mixed>> $outcomes
     * @param 'spreads'|'h2h'|'totals'  $kind
     * @param array<string,mixed>       $g
     * @return array{0:int,1:int} [changedCount, rejectedCount]
     */
    private static function applyToMarketOutcomes(array &$outcomes, string $kind, array $g, string $homeName, string $awayName): array
    {
        $changed = 0; $rejected = 0;
        foreach ($outcomes as &$o) {
            $name = (string) ($o['name'] ?? '');
            $n = self::norm($name);

            if ($kind === 'totals') {
                $isOver = str_contains(strtolower($name), 'over');
                $amer = $isOver ? ($g['total']['over'] ?? null) : ($g['total']['under'] ?? null);
                $pt   = $g['total']['pt'] ?? null;
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
                $amer = $g['ml'][$side] ?? null;
                if (!self::amerOk($amer)) { $rejected++; continue; }
                $changed += self::setPrice($o, (int) $amer);
            } else { // spreads
                $amer = $g['spread'][$side]['amer'] ?? null;
                $pt   = $g['spread'][$side]['pt'] ?? null;
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
     * the stored decimal value. Returns 1 if it changed the value, else 0 — so
     * the caller writes to the DB only when DGS has genuinely moved a line,
     * not on every idempotent re-apply.
     *
     * @param array<string,mixed> $o
     */
    private static function setPrice(array &$o, int $american): int
    {
        $new = SportsbookBetSupport::americanToDecimalExact($american);
        $old = isset($o['price']) && is_numeric($o['price']) ? (float) $o['price'] : null;
        if ($old !== null && abs($old - $new) < 1e-9) return 0;
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
        if ($old !== null && abs($old - $point) < 1e-9) return 0;
        $o['point'] = $point;
        return 1;
    }
}
