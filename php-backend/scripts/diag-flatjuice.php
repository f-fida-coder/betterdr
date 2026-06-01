<?php
declare(strict_types=1);

// Diagnostic: dump stored spread/total/moneyline for ALL games matching a
// team needle that actually have odds — so we can see if the main board
// carries flat juice (-110) or raw.
// Usage: php php-backend/scripts/diag-flatjuice.php Spurs

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);
require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
Env::load($projectRoot, $phpBackendDir);

$needle = strtolower((string) ($argv[1] ?? 'Spurs'));
$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

echo "FLAT_JUICE env = " . var_export(Env::get('SPORTSBOOK_FLAT_JUICE_AMERICAN'), true) . "\n";
echo "PREFERRED_BOOKS env = " . var_export(Env::get('SPORTSBOOK_PREFERRED_BOOKS'), true) . "\n\n";

$amer = static function ($d): string {
    $d = (float) $d;
    if ($d <= 1.0) return 'n/a';
    if ($d >= 2.0) return '+' . (string) (int) round(($d - 1) * 100);
    return (string) (int) round(-100 / ($d - 1));
};

$rows = $repo->findMany('matches', ['status' => ['$in' => ['scheduled', 'live']]], ['limit' => 8000]);
$hits = 0;
foreach (is_array($rows) ? $rows : [] as $game) {
    $h = strtolower((string) ($game['homeTeam'] ?? ''));
    $a = strtolower((string) ($game['awayTeam'] ?? ''));
    if (!str_contains($h, $needle) && !str_contains($a, $needle)) continue;

    $books = is_array($game['odds']['bookmakers'] ?? null) ? $game['odds']['bookmakers'] : [];
    $nBooks = count($books);
    $sportKey = (string) ($game['sportKey'] ?? '');
    echo "=== {$game['awayTeam']} @ {$game['homeTeam']}  status={$game['status']} sportKey={$sportKey} books={$nBooks} ===\n";
    if ($nBooks === 0) { echo "   (no odds on this row)\n\n"; continue; }
    $hits++;
    echo "   bookmakers order: " . implode(', ', array_map(static fn ($b) => (string) ($b['key'] ?? '?'), $books)) . "\n";
    foreach ($books as $b) {
        foreach (is_array($b['markets'] ?? null) ? $b['markets'] : [] as $mk) {
            if (!in_array($mk['key'] ?? '', ['spreads', 'totals', 'h2h'], true)) continue;
            foreach (is_array($mk['outcomes'] ?? null) ? $mk['outcomes'] : [] as $o) {
                $pt = isset($o['point']) ? (' pt=' . $o['point']) : '';
                printf("   %-10s %-8s %-22s dec=%-8s amer=%s%s\n",
                    (string) ($b['key'] ?? ''), $mk['key'], (string) ($o['name'] ?? ''),
                    (string) ($o['price'] ?? ''), $amer($o['price'] ?? 0), $pt);
            }
        }
    }
    echo "\n";
}
if ($hits === 0) echo "No game with odds matched '$needle'.\n";
