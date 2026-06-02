<?php
declare(strict_types=1);

/**
 * dgs-line-compare.php — SHADOW / READ-ONLY line comparator.
 *
 * Compares a competitor DGS feed (bettorjuice365 `Get_LeagueLines2` response)
 * against the lines we currently store in the `matches` table, and prints a
 * side-by-side diff (their value vs ours) for every game it can pair.
 *
 * It NEVER writes anything. It only READS our DB and READS JSON you give it.
 * Nothing here touches the live board, balances, or bets.
 *
 * Input: one or more saved `Get_LeagueLines2` JSON responses. Capture them from
 * the browser DevTools (Network → Get_LeagueLines2 → Response → copy) and save
 * each as a .json file.
 *
 * Usage:
 *   php php-backend/scripts/dgs-line-compare.php <file-or-dir> [file2 ...]
 *
 * Example:
 *   php php-backend/scripts/dgs-line-compare.php /tmp/dgs-nba.json /tmp/dgs-mlb.json
 *   php php-backend/scripts/dgs-line-compare.php /tmp/dgs/        # all *.json in dir
 */

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);
require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
Env::load($projectRoot, $phpBackendDir);

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = null;
try {
    $repo = new SqlRepository('', $dbName);
    $repo->findMany('matches', ['__ping' => '__none'], ['limit' => 1]); // force-connect
} catch (\Throwable $e) {
    fwrite(STDERR, "⚠ DB not reachable ({$e->getMessage()})\n");
    fwrite(STDERR, "  Running in FEED-ONLY preview mode (their numbers only, no comparison).\n");
    fwrite(STDERR, "  Run this on the VPS where the `matches` table lives for the full diff.\n\n");
    $repo = null;
}

// ── helpers ──────────────────────────────────────────────────────────────

/** Decimal price → American integer (mirrors SportsbookBetSupport rounding). */
$decToAmer = static function ($d): ?int {
    $d = (float) $d;
    if ($d <= 1.0) return null;
    if ($d >= 2.0) return (int) round(($d - 1) * 100);
    return (int) round(-100 / ($d - 1));
};

/** American int → "+155" / "-110" string. */
$amerStr = static function ($a): string {
    if ($a === null) return '—';
    $a = (int) $a;
    return ($a > 0 ? '+' : '') . $a;
};

/** Point → "+4.5" / "-4.5" / "8.5" (totals have no sign). */
$ptStr = static function ($p, bool $signed = true): string {
    if ($p === null || $p === '') return '—';
    $p = (float) $p;
    if (!$signed) return rtrim(rtrim(number_format($p, 1, '.', ''), '0'), '.');
    $s = rtrim(rtrim(number_format(abs($p), 1, '.', ''), '0'), '.');
    return ($p > 0 ? '+' : ($p < 0 ? '-' : '')) . $s;
};

/** Normalize a team name for loose matching: lowercase alnum only. */
$norm = static function (string $s): string {
    return preg_replace('/[^a-z0-9]/', '', strtolower($s)) ?? '';
};

/** Map DGS SportSubType → our candidate sportKeys (incl. playoff/preseason variants). */
$sportKeyFor = static function (string $sub): array {
    $sub = strtoupper(trim($sub));
    return [
        'NBA'  => ['basketball_nba', 'basketball_nba_playoffs', 'basketball_nba_preseason', 'basketball_nba_summer_league'],
        'WNBA' => ['basketball_wnba'],
        'MLB'  => ['baseball_mlb', 'baseball_mlb_playoffs', 'baseball_mlb_spring_training'],
        'NHL'  => ['icehockey_nhl', 'icehockey_nhl_playoffs', 'icehockey_nhl_preseason'],
        'NFL'  => ['americanfootball_nfl', 'americanfootball_nfl_playoffs', 'americanfootball_nfl_preseason'],
    ][$sub] ?? [];
};

/**
 * Pull our stored line for a match: first bookmaker WITH markets (mirrors the
 * frontend's getMatchMarkets "first book with markets" selection).
 * Returns ['spreads'=>[name=>['point','amer']], 'h2h'=>..., 'totals'=>...].
 */
$ourLine = static function (array $match) use ($decToAmer): array {
    $out = ['spreads' => [], 'h2h' => [], 'totals' => [], 'book' => null];
    $books = $match['odds']['bookmakers'] ?? [];
    if (!is_array($books)) return $out;
    foreach ($books as $b) {
        $markets = is_array($b['markets'] ?? null) ? $b['markets'] : [];
        if ($markets === []) continue;
        $out['book'] = (string) ($b['key'] ?? '?');
        foreach ($markets as $mk) {
            $key = (string) ($mk['key'] ?? '');
            if (!in_array($key, ['spreads', 'h2h', 'totals'], true)) continue;
            foreach (($mk['outcomes'] ?? []) as $o) {
                $name = (string) ($o['name'] ?? '');
                $out[$key][$name] = [
                    'point' => $o['point'] ?? null,
                    'amer'  => $decToAmer($o['price'] ?? 0),
                ];
            }
        }
        break; // first book with markets only
    }
    return $out;
};

// ── gather input files ───────────────────────────────────────────────────

$inputs = array_slice($argv, 1);
if ($inputs === []) {
    fwrite(STDERR, "Usage: php dgs-line-compare.php <file-or-dir> [more ...]\n");
    exit(2);
}
$files = [];
foreach ($inputs as $p) {
    if (is_dir($p)) {
        foreach (glob(rtrim($p, '/') . '/*.json') ?: [] as $f) $files[] = $f;
    } elseif (is_file($p)) {
        $files[] = $p;
    } else {
        fwrite(STDERR, "skip (not found): {$p}\n");
    }
}
if ($files === []) {
    fwrite(STDERR, "No .json files found.\n");
    exit(2);
}

// ── compare ──────────────────────────────────────────────────────────────

$matchCache = [];   // sportKey => list of matches
$totGames = 0; $paired = 0; $unpaired = 0; $cells = 0; $diffs = 0;

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

foreach ($files as $file) {
    $raw = file_get_contents($file);
    $data = json_decode((string) $raw, true);
    $lines = $data['Lines'] ?? null;
    if (!is_array($lines)) {
        fwrite(STDERR, "skip (no Lines[]): {$file}\n");
        continue;
    }

    foreach ($lines as $ln) {
        if ((int) ($ln['PeriodNumber'] ?? 0) !== 0) continue; // full-game only
        $totGames++;

        $awayName = trim((string) ($ln['Team1ID'] ?? ''));  // DGS: Team1 = visitor
        $homeName = trim((string) ($ln['Team2ID'] ?? ''));  // DGS: Team2 = home
        $sub      = (string) ($ln['SportSubType'] ?? '');
        $sportKey = $sportKeyFor($sub);
        $gdate    = substr((string) ($ln['GameDateTime'] ?? ''), 0, 10);

        // their numbers
        $favHome  = $norm((string) ($ln['FavoredTeamID'] ?? '')) === $norm($homeName);
        $spread   = $ln['Spread'] ?? null;               // favorite's signed point (e.g. -4.5)
        $homePt   = $spread === null ? null : ($favHome ? (float) $spread : -(float) $spread);
        $awayPt   = $spread === null ? null : -1 * $homePt;
        $their = [
            'spread' => [
                'home' => ['point' => $homePt, 'amer' => $favHome ? (int) ($ln['SpreadAdj2'] ?? 0) : (int) ($ln['SpreadAdj1'] ?? 0)],
                'away' => ['point' => $awayPt, 'amer' => $favHome ? (int) ($ln['SpreadAdj1'] ?? 0) : (int) ($ln['SpreadAdj2'] ?? 0)],
            ],
            'ml' => [
                'home' => (int) ($ln['MoneyLine2'] ?? 0),
                'away' => (int) ($ln['MoneyLine1'] ?? 0),
            ],
            'total' => [
                'point' => $ln['TotalPoints'] ?? null,
                'over'  => (int) ($ln['TtlPtsAdj1'] ?? 0),
                'under' => (int) ($ln['TtlPtsAdj2'] ?? 0),
            ],
        ];

        echo str_repeat('─', 78) . "\n";
        printf("%s  %s @ %s  [%s]\n", $gdate, $awayName, $homeName, $sub ? trim($sub) : '?');

        // FEED-ONLY preview (no DB): just show what we parsed from their side.
        if ($repo === null) {
            printf("  spread %-7s %s %s   |   %-7s %s %s\n",
                (string) ($ln['ShortName2'] ?? 'home'), $ptStr($their['spread']['home']['point']), $amerStr($their['spread']['home']['amer']),
                (string) ($ln['ShortName1'] ?? 'away'), $ptStr($their['spread']['away']['point']), $amerStr($their['spread']['away']['amer']));
            printf("  ML     %-7s %s        |   %-7s %s\n",
                (string) ($ln['ShortName2'] ?? 'home'), $amerStr($their['ml']['home']),
                (string) ($ln['ShortName1'] ?? 'away'), $amerStr($their['ml']['away']));
            printf("  total  O %s %s          |   U %s %s\n",
                $ptStr($their['total']['point'], false), $amerStr($their['total']['over']),
                $ptStr($their['total']['point'], false), $amerStr($their['total']['under']));
            continue;
        }

        if ($sportKey === []) {
            echo "  (no sportKey mapping for '{$sub}' — add it to \$sportKeyFor)\n";
            $unpaired++;
            continue;
        }

        // find our match by team names (either orientation); date is NOT required
        // (their GameDateTime is local EST, our startTime is UTC — days can differ).
        // If several team-name hits, keep the one nearest in time to their game.
        $candidates = $loadMatches($sportKey);
        $match = null; $bestGap = PHP_INT_MAX;
        $theirTs = strtotime((string) ($ln['GameDateTime'] ?? '')) ?: 0;
        $th = $norm($homeName); $ta = $norm($awayName);
        foreach ($candidates as $m) {
            $mh = $norm((string) ($m['homeTeam'] ?? ''));
            $ma = $norm((string) ($m['awayTeam'] ?? ''));
            $hit = ($mh === $th && $ma === $ta)
                || ($mh !== '' && $ma !== '' && str_contains($mh, $th) && str_contains($ma, $ta))
                || ($th !== '' && $ta !== '' && str_contains($th, $mh) && str_contains($ta, $ma));
            if (!$hit) continue;
            $gap = abs(($theirTs ?: 0) - (strtotime((string) ($m['startTime'] ?? '')) ?: 0));
            if ($gap < $bestGap) { $bestGap = $gap; $match = $m; }
        }

        if ($match === null) {
            echo "  ⚠ no matching game in our DB (not listed, or different name/date)\n";
            $unpaired++;
            continue;
        }
        $paired++;

        $ours = $ourLine($match);
        $oh = (string) ($match['homeTeam'] ?? '');
        $oa = (string) ($match['awayTeam'] ?? '');
        printf("  ↳ paired: %s @ %s  startTime=%s UTC  status=%s  sportKey=%s\n",
            $oa, $oh, (string) ($match['startTime'] ?? '?'),
            (string) ($match['status'] ?? '?'), (string) ($match['sportKey'] ?? '?'));

        // helper to render one comparison row
        $row = function (string $label, string $theirs, string $oursStr) use (&$cells, &$diffs) {
            $cells++;
            $same = $theirs === $oursStr;
            if (!$same) $diffs++;
            printf("  %-22s theirs %-12s ours %-12s %s\n",
                $label, $theirs, $oursStr, $same ? '✓' : '✗ DIFF');
        };

        // SPREAD (home)
        $ourSpHome = $ours['spreads'][$oh] ?? null;
        $row('spread ' . ($ln['ShortName2'] ?? 'home'),
            $ptStr($their['spread']['home']['point']) . ' ' . $amerStr($their['spread']['home']['amer']),
            $ourSpHome ? ($ptStr($ourSpHome['point']) . ' ' . $amerStr($ourSpHome['amer'])) : '—');
        // SPREAD (away)
        $ourSpAway = $ours['spreads'][$oa] ?? null;
        $row('spread ' . ($ln['ShortName1'] ?? 'away'),
            $ptStr($their['spread']['away']['point']) . ' ' . $amerStr($their['spread']['away']['amer']),
            $ourSpAway ? ($ptStr($ourSpAway['point']) . ' ' . $amerStr($ourSpAway['amer'])) : '—');
        // MONEYLINE
        $ourMlHome = $ours['h2h'][$oh] ?? null;
        $ourMlAway = $ours['h2h'][$oa] ?? null;
        $row('ML ' . ($ln['ShortName2'] ?? 'home'), $amerStr($their['ml']['home']),
            $ourMlHome ? $amerStr($ourMlHome['amer']) : '—');
        $row('ML ' . ($ln['ShortName1'] ?? 'away'), $amerStr($their['ml']['away']),
            $ourMlAway ? $amerStr($ourMlAway['amer']) : '—');
        // TOTAL (over/under) — match by Over/Under outcome name
        $ourOver = $ours['totals']['Over'] ?? null;
        $ourUnder = $ours['totals']['Under'] ?? null;
        $row('total Over', $ptStr($their['total']['point'], false) . ' ' . $amerStr($their['total']['over']),
            $ourOver ? ($ptStr($ourOver['point'], false) . ' ' . $amerStr($ourOver['amer'])) : '—');
        $row('total Under', $ptStr($their['total']['point'], false) . ' ' . $amerStr($their['total']['under']),
            $ourUnder ? ($ptStr($ourUnder['point'], false) . ' ' . $amerStr($ourUnder['amer'])) : '—');

        echo "  (our book shown: " . ($ours['book'] ?? 'none') . ")\n";
    }
}

echo str_repeat('═', 78) . "\n";
printf("Games in feed: %d   paired: %d   unpaired: %d\n", $totGames, $paired, $unpaired);
printf("Compared cells: %d   matching: %d   different: %d", $cells, $cells - $diffs, $diffs);
echo $cells > 0 ? sprintf("   (%.0f%% identical)\n", 100 * ($cells - $diffs) / $cells) : "\n";
