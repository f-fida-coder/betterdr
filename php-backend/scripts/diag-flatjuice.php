<?php
declare(strict_types=1);

// Decisive write-path test: run the REAL sync write path (syncEventFull) for
// one event in this CLI runtime, then re-read to see if the stored spread is
// flattened. If CLI flattens but the running worker doesn't, the worker is
// serving stale OPcache bytecode.
// Usage: php php-backend/scripts/diag-flatjuice.php <eventId>

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);
require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
Env::load($projectRoot, $phpBackendDir);

$eventId = (string) ($argv[1] ?? 'be4297e41d3ca7bc4aa5ead62c01cbe7');
$dbName  = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo    = new SqlRepository('', $dbName);

$amer = static function ($d): string {
    $d = (float) $d;
    if ($d <= 1.0) return 'n/a';
    if ($d >= 2.0) return '+' . (string) (int) round(($d - 1) * 100);
    return (string) (int) round(-100 / ($d - 1));
};
$showSpread = static function (array $m) use ($amer): void {
    $books = is_array($m['odds']['bookmakers'] ?? null) ? $m['odds']['bookmakers'] : [];
    foreach ($books as $b) {
        if (($b['key'] ?? '') !== 'pinnacle') continue;
        foreach (is_array($b['markets'] ?? null) ? $b['markets'] : [] as $mk) {
            if (($mk['key'] ?? '') !== 'spreads') continue;
            foreach ($mk['outcomes'] as $o) {
                printf("      pinnacle spreads %-20s dec=%-10s amer=%s pt=%s\n",
                    (string) ($o['name'] ?? ''), (string) ($o['price'] ?? ''), $amer($o['price'] ?? 0), (string) ($o['point'] ?? ''));
            }
        }
    }
};

$id = RundownEventMapper::deterministicMatchId($eventId);

echo "FLAT_JUICE env = " . var_export(Env::get('SPORTSBOOK_FLAT_JUICE_AMERICAN'), true) . "\n";
echo "boardPriceDecimal('spreads',-105) = " . RundownEventMapper::boardPriceDecimal('spreads', -105.0) . " (flat=1.9091)\n\n";

$before = $repo->findOne('matches', ['id' => $id]);
echo "BEFORE (current stored pinnacle spread):\n";
if (is_array($before)) $showSpread($before);

echo "\n>>> Running RundownSyncService::syncEventFull() for event {$eventId} ...\n";
$r = RundownSyncService::syncEventFull($repo, $eventId);
echo "    result: " . json_encode($r) . "\n\n";

$after = $repo->findOne('matches', ['id' => $id]);
echo "AFTER (re-read pinnacle spread):\n";
if (is_array($after)) $showSpread($after);
echo "\nIf AFTER shows amer=-110 → deployed write path is correct; the running worker/php-fpm is stale (OPcache).\n";
echo "If AFTER still shows raw (-105/-107) → genuine write-path bug.\n";
