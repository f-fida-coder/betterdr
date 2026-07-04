<?php

declare(strict_types=1);

/**
 * The Odds API supplemental soccer sync — ONE prematch pass over the
 * allowlisted soccer leagues (see OddsApiAllowlist::CATEGORY_SOCCER).
 * On-demand / cron-safe runner until the dedicated worker (Chunk 3) lands.
 *
 * SAFETY:
 *   - Gated by ODDS_API_SYNC_ENABLED (default OFF) — with the flag off this
 *     exits 0 immediately, so shipping it changes nothing until an operator
 *     explicitly opts in.
 *   - Exits cleanly when MySQL or ODDS_API_KEY is unavailable.
 *   - TheRundown pipeline is untouched: separate client, circuit breaker,
 *     rate-limit state, and quota cache; upsert refuses non-'theoddsapi' rows.
 *
 * Usage:
 *   php php-backend/scripts/sync-oddsapi-soccer.php
 *
 * CLI args are accepted only as a sanity check (each must be on the soccer
 * allowlist or the script refuses) — the pass itself always walks the full
 * allowlist so config/args can never widen the fetch surface.
 */

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);

require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
require_once $phpBackendDir . '/src/Logger.php';
require_once $phpBackendDir . '/src/SharedFileCache.php';
require_once $phpBackendDir . '/src/CircuitBreaker.php';
require_once $phpBackendDir . '/src/ConnectionPool.php';
require_once $phpBackendDir . '/src/SqlRepository.php';
require_once $phpBackendDir . '/src/RundownSportMap.php';
require_once $phpBackendDir . '/src/RundownEventMapper.php';
require_once $phpBackendDir . '/src/OddsApiAllowlist.php';
require_once $phpBackendDir . '/src/OddsApiClient.php';
require_once $phpBackendDir . '/src/OddsApiEventMapper.php';
require_once $phpBackendDir . '/src/OddsApiSyncService.php';

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

// ── Kill switch ────────────────────────────────────────────────────────────
if (!OddsApiSyncService::enabled()) {
    echo "[oddsapi] ODDS_API_SYNC_ENABLED off or ODDS_API_KEY missing — nothing to do\n";
    exit(0);
}
if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[oddsapi] pdo_mysql extension required\n");
    exit(0); // exit 0: nothing to sync, not a hard failure for a cron
}

// Startup assertion: refuse to run at all if the allowlist ever collides
// with a TheRundown-covered league (throws + logs).
OddsApiAllowlist::assertNoRundownOverlap();

// Optional CLI args — every arg must be on the soccer allowlist; anything
// else is refused loudly rather than silently fetched.
$argSports = array_values(array_unique(array_map('strtolower', array_slice($argv, 1))));
foreach ($argSports as $arg) {
    if (!OddsApiAllowlist::isAllowed($arg, OddsApiAllowlist::CATEGORY_SOCCER)) {
        fwrite(STDERR, "[oddsapi] '{$arg}' is not on the soccer allowlist — refusing\n");
        exit(1);
    }
}

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

echo "[oddsapi] soccer prematch pass starting\n";
$stats = OddsApiSyncService::syncSoccerPrematch($repo);

echo sprintf(
    "[oddsapi] done — sports=%d events=%d inserted=%d updated=%d skipped=%d errors=%d\n",
    $stats['sports'],
    $stats['events'],
    $stats['inserted'],
    $stats['updated'],
    $stats['skipped'],
    count($stats['errors'])
);
foreach ($stats['errors'] as $where => $msg) {
    echo "  - ERROR {$where}: {$msg}\n";
}

$quota = OddsApiClient::latestQuotaSnapshot();
if ($quota !== []) {
    $usage = OddsApiClient::dailyUsage();
    echo sprintf(
        "[oddsapi] credits: remaining=%s usedToday=%d lastCallCost=%s\n",
        (string) ($quota['requestsRemaining'] ?? '?'),
        (int) $usage['used'],
        (string) ($quota['requestsLast'] ?? '?')
    );
}
exit(count($stats['errors']) > 0 ? 1 : 0);
