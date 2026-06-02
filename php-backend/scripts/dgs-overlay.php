<?php
declare(strict_types=1);

/**
 * dgs-overlay.php — Phase 2: overlay harvested bettorjuice365 (DGS) numbers
 * onto our matches so the board shows their exact lines.
 *
 * MONEY-CRITICAL. Read php-backend money-safety rules before editing.
 *
 * Safety model:
 *  - DEFAULT MODE IS DRY-RUN. It reads + validates + prints planned changes
 *    and WRITES NOTHING. To actually write you must pass --apply AND set
 *    env DGS_OVERLAY_ENABLED=true. Either missing → no writes.
 *  - It does NOT rebuild markets. It OVERWRITES the price/point on our
 *    EXISTING outcomes in place (matched by team / Over-Under), in BOTH
 *    odds.bookmakers[*].markets AND odds.markets — the two representations
 *    display and bet-placement read — so what a player sees == what they
 *    bet == what settles. Outcome names/keys are untouched.
 *  - Prices are converted American→decimal via the canonical
 *    SportsbookBetSupport::americanToDecimalExact (no DIY money math).
 *  - Freshness gate: skips a league whose harvest file is older than
 *    DGS_OVERLAY_MAX_AGE_SECONDS (default 120) → board keeps Rundown lines.
 *  - Poison guard: rejects absurd odds/points before they can touch a match.
 *  - Pending bets are unaffected: they snapshot odds at placement.
 *
 * Usage:
 *   php php-backend/scripts/dgs-overlay.php            # dry-run (default)
 *   php php-backend/scripts/dgs-overlay.php --apply    # writes IF env enabled
 *
 * Env:
 *   DGS_OVERLAY_ENABLED          'true' required for any write
 *   DGS_OVERLAY_SPORTS           csv sportKeys (default basketball_nba)
 *   DGS_OVERLAY_MAX_AGE_SECONDS  harvest freshness window (default 120)
 */

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);
require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
Env::load($projectRoot, $phpBackendDir);

$APPLY     = in_array('--apply', array_slice($argv, 1), true);
$ENABLED   = strtolower((string) Env::get('DGS_OVERLAY_ENABLED', 'false')) === 'true';
$WILL_WRITE = $APPLY && $ENABLED;
$MAX_AGE   = max(15, (int) Env::get('DGS_OVERLAY_MAX_AGE_SECONDS', '120'));
$SPORTS    = array_values(array_filter(array_map('trim',
    explode(',', (string) Env::get('DGS_OVERLAY_SPORTS', 'basketball_nba')))));

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

$liveDir = $phpBackendDir . '/storage/dgs/live';

echo "DGS overlay — mode: " . ($WILL_WRITE ? "APPLY (writing)" : "DRY-RUN (no writes)") . "\n";
echo "  --apply=" . ($APPLY ? 'yes' : 'no') . "  DGS_OVERLAY_ENABLED=" . ($ENABLED ? 'true' : 'false')
   . "  sports=[" . implode(',', $SPORTS) . "]  maxAge={$MAX_AGE}s\n\n";

// ── helpers ──────────────────────────────────────────────────────────────

$norm = static fn (string $s): string => preg_replace('/[^a-z0-9]/', '', strtolower($s)) ?? '';

/** DGS SportSubType → our candidate sportKeys. */
$sportKeysFor = static function (string $sub): array {
    return [
        'NBA'  => ['basketball_nba', 'basketball_nba_playoffs', 'basketball_nba_preseason'],
        'WNBA' => ['basketball_wnba'],
        'MLB'  => ['baseball_mlb', 'baseball_mlb_playoffs'],
        'NHL'  => ['icehockey_nhl', 'icehockey_nhl_playoffs'],
        'NFL'  => ['americanfootball_nfl', 'americanfootball_nfl_playoffs'],
    ][strtoupper(trim($sub))] ?? [];
};

/** Which DGS leagues map onto the enabled sportKeys. */
$enabledLeagues = [];
foreach (['NBA', 'WNBA', 'MLB', 'NHL', 'NFL'] as $lg) {
    foreach ($sportKeysFor($lg) as $sk) {
        if (in_array($sk, $SPORTS, true)) { $enabledLeagues[$lg] = true; break; }
    }
}

/** Poison guard for a signed American odds int. */
$amerOk = static function ($a): bool {
    if (!is_int($a) && !(is_numeric($a) && (float) $a == (int) $a)) return false;
    $a = (int) $a;
    return $a !== 0 && abs($a) >= 100 && abs($a) <= 100000;
};
/** Poison guard for a spread point. */
$spreadPtOk = static fn ($p): bool => is_numeric($p) && abs((float) $p) <= 100.0;
/** Poison guard for a total point. */
$totalPtOk  = static fn ($p): bool => is_numeric($p) && (float) $p > 0.0 && (float) $p <= 500.0;

$toDec = static fn (int $american): float => SportsbookBetSupport::americanToDecimalExact($american);

// ── load DGS games from fresh harvest files for enabled leagues ───────────

$now = time();
$dgsGames = []; // list of normalized game dicts
$leaguesSeen = [];
foreach (array_keys($enabledLeagues) as $league) {
    $file = $liveDir . '/' . $league . '.json';
    if (!is_file($file)) { echo "  [skip] {$league}: no harvest file\n"; continue; }
    $age = $now - (int) filemtime($file);
    if ($age > $MAX_AGE) {
        echo "  [stale] {$league}: harvest {$age}s old (> {$MAX_AGE}s) — leaving Rundown lines\n";
        continue;
    }
    $data = json_decode((string) file_get_contents($file), true);
    $lines = is_array($data['Lines'] ?? null) ? $data['Lines'] : [];
    $leaguesSeen[$league] = ['age' => $age, 'count' => 0];
    foreach ($lines as $ln) {
        if ((int) ($ln['PeriodNumber'] ?? 0) !== 0) continue; // full game only
        $away = trim((string) ($ln['Team1ID'] ?? ''));
        $home = trim((string) ($ln['Team2ID'] ?? ''));
        if ($away === '' || $home === '') continue;
        $favHome = $norm((string) ($ln['FavoredTeamID'] ?? '')) === $norm($home);
        $spread  = $ln['Spread'] ?? null;
        $homePt  = $spread === null ? null : ($favHome ? (float) $spread : -(float) $spread);
        $awayPt  = $homePt === null ? null : -1.0 * $homePt;
        $dgsGames[] = [
            'league'  => $league,
            'home'    => $home,
            'away'    => $away,
            'gdtTs'   => strtotime((string) ($ln['GameDateTime'] ?? '')) ?: 0,
            'spread'  => [
                'home' => ['pt' => $homePt, 'amer' => $favHome ? ($ln['SpreadAdj2'] ?? null) : ($ln['SpreadAdj1'] ?? null)],
                'away' => ['pt' => $awayPt, 'amer' => $favHome ? ($ln['SpreadAdj1'] ?? null) : ($ln['SpreadAdj2'] ?? null)],
            ],
            'ml'      => ['home' => $ln['MoneyLine2'] ?? null, 'away' => $ln['MoneyLine1'] ?? null],
            'total'   => ['pt' => $ln['TotalPoints'] ?? null, 'over' => $ln['TtlPtsAdj1'] ?? null, 'under' => $ln['TtlPtsAdj2'] ?? null],
        ];
        $leaguesSeen[$league]['count']++;
    }
}
foreach ($leaguesSeen as $lg => $info) {
    echo "  [fresh] {$lg}: {$info['count']} games (harvest {$info['age']}s old)\n";
}
echo "\n";
if ($dgsGames === []) {
    echo "No fresh DGS games for enabled sports. Nothing to do.\n";
    exit(0);
}

// ── match each DGS game to our match row ──────────────────────────────────

$matchCache = [];
$loadMatches = static function (array $sportKeys) use (&$matchCache, $repo): array {
    $all = [];
    foreach ($sportKeys as $sk) {
        if (!isset($matchCache[$sk])) {
            $matchCache[$sk] = $repo->findMany('matches', ['sportKey' => $sk], ['limit' => 500]);
        }
        foreach ($matchCache[$sk] as $m) $all[] = $m;
    }
    return $all;
};

/**
 * Overwrite price+point on an outcome list in place from a DGS side-lookup.
 * $kind: 'spreads' | 'h2h' | 'totals'. Returns [changedCount, rejectedCount].
 */
$applyToMarketOutcomes = static function (array &$outcomes, string $kind, array $g, string $homeName, string $awayName)
    use ($norm, $amerOk, $spreadPtOk, $totalPtOk, $toDec): array {
    $changed = 0; $rejected = 0;
    foreach ($outcomes as &$o) {
        $name = (string) ($o['name'] ?? '');
        $n = $norm($name);
        if ($kind === 'totals') {
            $isOver = str_contains(strtolower($name), 'over');
            $amer = $isOver ? ($g['total']['over'] ?? null) : ($g['total']['under'] ?? null);
            $pt   = $g['total']['pt'] ?? null;
            if (!$totalPtOk($pt) || !$amerOk($amer)) { $rejected++; continue; }
            $o['price'] = $toDec((int) $amer);
            $o['point'] = (float) $pt;
            $changed++;
            continue;
        }
        // spreads / h2h: decide home vs away by name
        $side = null;
        if ($n !== '' && ($n === $norm($homeName) || str_contains($n, $norm($homeName)) || str_contains($norm($homeName), $n))) {
            $side = 'home';
        } elseif ($n !== '' && ($n === $norm($awayName) || str_contains($n, $norm($awayName)) || str_contains($norm($awayName), $n))) {
            $side = 'away';
        }
        if ($side === null) { $rejected++; continue; }
        if ($kind === 'h2h') {
            $amer = $g['ml'][$side] ?? null;
            if (!$amerOk($amer)) { $rejected++; continue; }
            $o['price'] = $toDec((int) $amer);
            $changed++;
        } else { // spreads
            $amer = $g['spread'][$side]['amer'] ?? null;
            $pt   = $g['spread'][$side]['pt'] ?? null;
            if (!$spreadPtOk($pt) || !$amerOk($amer)) { $rejected++; continue; }
            $o['price'] = $toDec((int) $amer);
            $o['point'] = (float) $pt;
            $changed++;
        }
    }
    unset($o);
    return [$changed, $rejected];
};

$CORE = ['h2h', 'spreads', 'totals'];
$totalsPaired = 0; $totalsWritten = 0; $totalsRejected = 0; $structReported = false;

foreach ($dgsGames as $g) {
    $cands = $loadMatches($sportKeysFor($g['league']));
    $th = $norm($g['home']); $ta = $norm($g['away']);
    $match = null; $bestGap = PHP_INT_MAX;
    foreach ($cands as $m) {
        $mh = $norm((string) ($m['homeTeam'] ?? '')); $ma = $norm((string) ($m['awayTeam'] ?? ''));
        $hit = ($mh === $th && $ma === $ta)
            || ($mh !== '' && $ma !== '' && str_contains($mh, $th) && str_contains($ma, $ta))
            || ($th !== '' && $ta !== '' && str_contains($th, $mh) && str_contains($ta, $ma));
        if (!$hit) continue;
        $gap = abs($g['gdtTs'] - (strtotime((string) ($m['startTime'] ?? '')) ?: 0));
        if ($gap < $bestGap) { $bestGap = $gap; $match = $m; }
    }
    echo str_repeat('─', 70) . "\n{$g['away']} @ {$g['home']}  [{$g['league']}]\n";
    if ($match === null) { echo "  ⚠ no matching match row — skipped\n"; continue; }
    $totalsPaired++;
    $homeName = (string) ($match['homeTeam'] ?? '');
    $awayName = (string) ($match['awayTeam'] ?? '');

    $odds = is_array($match['odds'] ?? null) ? $match['odds'] : [];
    if (!$structReported) {
        echo "  [structure] odds keys: " . implode(',', array_keys($odds))
           . " | odds.markets=" . (isset($odds['markets']) ? count($odds['markets']) : 'ABSENT')
           . " | odds.bookmakers=" . (isset($odds['bookmakers']) ? count($odds['bookmakers']) : 'ABSENT') . "\n";
        $structReported = true;
    }

    $chg = 0; $rej = 0; $touched = [];

    // representation 1: odds.markets (bet placement / settlement reads this)
    if (isset($odds['markets']) && is_array($odds['markets'])) {
        foreach ($odds['markets'] as &$mk) {
            $key = (string) ($mk['key'] ?? '');
            if (!in_array($key, $CORE, true) || !is_array($mk['outcomes'] ?? null)) continue;
            [$c, $r] = $applyToMarketOutcomes($mk['outcomes'], $key, $g, $homeName, $awayName);
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
                if (!in_array($key, $CORE, true) || !is_array($mk['outcomes'] ?? null)) continue;
                [$c, $r] = $applyToMarketOutcomes($mk['outcomes'], $key, $g, $homeName, $awayName);
                $chg += $c; $rej += $r; if ($c) $touched['book.' . ($bk['key'] ?? '?') . '.' . $key] = $c;
            }
            unset($mk);
        }
        unset($bk);
    }

    echo "  planned: {$chg} outcome prices overwritten, {$rej} rejected/unmatched\n";
    foreach ($touched as $where => $c) echo "    · {$where}: {$c}\n";
    $totalsWritten += $chg; $totalsRejected += $rej;

    if ($WILL_WRITE && $chg > 0) {
        $stampedOdds = $odds;
        $stampedOdds['dgsOverlayAt']     = SqlRepository::nowUtc();
        $stampedOdds['dgsOverlaySource'] = 'bettorjuice365';
        // updateOne takes a FLAT field map (merged into the doc), not a $set wrapper.
        // We do NOT change oddsSource — that would disturb display/freshness gates.
        $repo->updateOne('matches', ['id' => $match['id']], [
            'odds'         => $stampedOdds,
            'dgsOverlayAt' => SqlRepository::nowUtc(),
        ]);
        echo "  ✔ WROTE overlay to match {$match['id']}\n";
    }
}

echo str_repeat('═', 70) . "\n";
echo "paired={$totalsPaired}  prices " . ($WILL_WRITE ? "written" : "would-write") . "={$totalsWritten}  rejected={$totalsRejected}\n";
if (!$WILL_WRITE) {
    echo "DRY-RUN: nothing written. To enable: set DGS_OVERLAY_ENABLED=true in .env.production,"
       . " restart php-fpm, and run with --apply.\n";
}
