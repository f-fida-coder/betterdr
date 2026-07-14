<?php

declare(strict_types=1);

/**
 * 3-Card Poker abandoned-round janitor.
 *
 * Force-settles every 'dealt' round older than the 24h abandon window as an
 * AUTO-FOLD (the locked policy): the player never played, so the ante is
 * forfeit and Pair Plus still pays on the dealt hand. The stake was debited at
 * deal and both hands committed, so this only completes the round — it never
 * re-decides it. Each round settles in its own transaction under the user-row
 * lock; an already-settled round is skipped.
 *
 * The same sweep also runs inline on deal, so this cron is a backstop for
 * players who never return to fold/play.
 *
 * Usage:
 *   php php-backend/scripts/3card-poker-janitor.php [--limit=200]
 *
 * Suggested cron (site user): hourly.
 */

require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/ConnectionPool.php';
require_once __DIR__ . '/../src/CircuitBreaker.php';
require_once __DIR__ . '/../src/SqlRepository.php';
require_once __DIR__ . '/../src/CasinoController.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

$opts = getopt('', ['limit::']);
$limit = max(1, min(1000, (int) ($opts['limit'] ?? 200)));

$repo = new SqlRepository('mysql-native', (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting')));
$controller = new CasinoController($repo, (string) Env::get('JWT_SECRET', ''));

$result = $controller->sweepExpired3CardPokerRounds(null, $limit);

echo json_encode([
    'game' => '3card-poker',
    'sweptRounds' => $result['swept'],
    'errors' => $result['errors'],
    'limit' => $limit,
    'ranAt' => gmdate(DATE_ATOM),
], JSON_PRETTY_PRINT) . PHP_EOL;

exit($result['errors'] > 0 ? 1 : 0);
