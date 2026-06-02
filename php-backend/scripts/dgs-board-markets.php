<?php
declare(strict_types=1);

/**
 * dgs-board-markets.php — READ-ONLY: what market keys does our board actually
 * carry per sport?
 *
 * The DGS overlay can only mirror a market our board ALREADY has (we never add
 * markets the competitor shows but we don't). To know whether period mirroring
 * (1st half / 1st quarter) is even possible, we need to see which market keys
 * Rundown is currently populating. This prints, per sportKey, the distinct
 * market keys across scheduled matches and how many matches carry each — and
 * flags whether any PERIOD keys (_h1/_q1/_p1/…) exist at all.
 *
 * READS ONLY the matches table. Writes nothing.
 *
 * Usage:
 *   php php-backend/scripts/dgs-board-markets.php                 # default DGS sports
 *   php php-backend/scripts/dgs-board-markets.php basketball_nba  # specific sportKey(s)
 */

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);
require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
Env::load($projectRoot, $phpBackendDir);

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

$sports = array_slice($argv, 1);
if ($sports === []) {
    $sports = [
        'basketball_nba', 'basketball_nba_playoffs',
        'icehockey_nhl', 'icehockey_nhl_playoffs',
        'baseball_mlb', 'baseball_mlb_playoffs',
    ];
}

$isPeriodKey = static fn (string $k): bool =>
    (bool) preg_match('/_(h[12]|q[1-4]|p[1-3]|\d+(st|nd|rd|th)?_\d+_innings|set_\d+|1st_\d+_innings)$/', $k);

foreach ($sports as $sportKey) {
    $matches = $repo->findMany('matches', ['sportKey' => $sportKey], ['limit' => 500]);
    $scheduled = array_values(array_filter($matches, static fn ($m) => ($m['status'] ?? '') === 'scheduled'));

    echo str_repeat('═', 74) . "\n";
    echo "{$sportKey}: " . count($matches) . " matches (" . count($scheduled) . " scheduled)\n";
    if ($scheduled === []) { echo "  (no scheduled matches)\n"; continue; }

    $keyCount = []; // marketKey → #matches carrying it (in bookmakers or markets)
    foreach ($scheduled as $m) {
        $odds = is_array($m['odds'] ?? null) ? $m['odds'] : [];
        $seen = [];
        foreach (($odds['bookmakers'] ?? []) as $b) {
            foreach (($b['markets'] ?? []) as $mk) {
                $k = (string) ($mk['key'] ?? '');
                if ($k !== '') { $seen[$k] = true; }
            }
        }
        foreach (($odds['markets'] ?? []) as $mk) {
            $k = (string) ($mk['key'] ?? '');
            if ($k !== '') { $seen[$k] = true; }
        }
        foreach (array_keys($seen) as $k) {
            $keyCount[$k] = ($keyCount[$k] ?? 0) + 1;
        }
    }
    ksort($keyCount);

    $periodKeys = array_filter(array_keys($keyCount), $isPeriodKey);
    echo "  market keys present (key × #matches):\n";
    foreach ($keyCount as $k => $c) {
        echo "    " . ($isPeriodKey($k) ? '· [PERIOD] ' : '·          ') . str_pad($k, 30) . " ×{$c}\n";
    }
    echo "  → period markets: " . ($periodKeys ? implode(', ', $periodKeys) : 'NONE (period mirroring has nothing to write into)') . "\n";
}
echo str_repeat('═', 74) . "\n";
echo "Read-only. Nothing written.\n";
