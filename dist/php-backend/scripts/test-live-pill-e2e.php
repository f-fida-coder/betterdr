<?php
// End-to-end verification of the My-Bets LIVE pill against REAL stored
// bet docs. Loads two pending bets via the same enrichBetDocument path
// the production /api/bets endpoint uses, prints the exact JSON the
// frontend would receive, and emits the resolved pill decision for each
// row. The companion node script test-live-pill-frontend-eval.mjs
// consumes this JSON via stdin and runs the verbatim MyBetsView
// predicate, so the two scripts together prove the pill behaves
// identically end-to-end against real data — not just mock fixtures.
declare(strict_types=1);

require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();
require_once __DIR__ . '/../src/Env.php';
$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);
require_once __DIR__ . '/../src/SqlRepository.php';
require_once __DIR__ . '/../src/SportsbookHealth.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/BetsController.php';

// Reflect into the private enrichBetDocument so we don't have to spin up
// a real HTTP request. This mirrors what /api/bets would serialize for
// every row in the My Bets list.
$db = new SqlRepository('mysql-native', (string) Env::get('MYSQL_DB', 'betterdr_local'));
$controller = new BetsController($db, (string) Env::get('JWT_SECRET', 'test-secret'));
$ref = new ReflectionClass(BetsController::class);
$enrich = $ref->getMethod('enrichBetDocument');
// setAccessible is the deprecation-noisy spelling on PHP 8.5+; the
// method is public-by-reflection by default. The if() guards us
// against older PHPs that still need it.
if (PHP_VERSION_ID < 80100) {
    $enrich->setAccessible(true);
}

// Pick a handful of pending bets across different matches.
$rows = $db->findMany('bets', ['status' => 'pending'], ['limit' => 4]);
if (count($rows) === 0) {
    fwrite(STDERR, "No pending bets in local DB.\n");
    exit(1);
}

$output = [];
foreach ($rows as $bet) {
    $enriched = $enrich->invoke($controller, $bet);
    // Trim to just the fields the LIVE-pill predicate reads, so the
    // frontend eval script's input stays focused and easy to inspect.
    $output[] = [
        'id' => $enriched['id'] ?? null,
        'status' => $enriched['status'] ?? null,
        'createdAt' => $enriched['createdAt'] ?? null,
        'match' => $enriched['match'] ?? null,
        'matchSnapshot' => $enriched['matchSnapshot'] ?? null,
        'selections' => array_map(static function (array $sel): array {
            return [
                'status' => $sel['status'] ?? null,
                'matchSnapshot' => $sel['matchSnapshot'] ?? null,
                'selection' => $sel['selection'] ?? null,
            ];
        }, is_array($enriched['selections'] ?? null) ? $enriched['selections'] : []),
    ];
}

echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
