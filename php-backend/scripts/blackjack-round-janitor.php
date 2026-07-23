<?php

declare(strict_types=1);

/**
 * Blackjack abandoned-round janitor.
 *
 * Force-settles every 'playing' staged round older than the 24h abandon
 * window: declines any pending insurance decision and stands every open hand
 * (the legacy auto_stand policy), then settles through the SAME credit +
 * audit path as a live action. The stake was debited at deal (and on every
 * double/split/insurance), so this only COMPLETES the round — abandonment
 * can never dodge a loss. Each round settles in its own transaction under
 * the user-row lock; an already-settled round is skipped.
 *
 * The same sweep also runs inline on every staged blackjack request, so this
 * cron is a backstop for players who never return.
 *
 * Usage:
 *   php php-backend/scripts/blackjack-round-janitor.php [--limit=200]
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

$result = $controller->sweepExpiredBlackjackRounds(null, $limit);

echo json_encode([
    'game' => 'blackjack',
    'sweptRounds' => $result['swept'],
    'errors' => $result['errors'],
    'limit' => $limit,
    'ranAt' => gmdate(DATE_ATOM),
], JSON_PRETTY_PRINT) . PHP_EOL;

exit($result['errors'] > 0 ? 1 : 0);
