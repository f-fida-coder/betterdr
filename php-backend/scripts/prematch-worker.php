<?php

declare(strict_types=1);

/**
 * Dedicated PRE-MATCH (upcoming) odds worker.
 *
 * Runs SEPARATELY from odds-worker.php so a full all-sports prematch sweep
 * never blocks live scores / settlement (which share the odds-worker tick).
 * Each cycle fetches EVERY active/configured sport's upcoming odds in ONE pass
 * (no 8-at-a-time rotation), then sleeps PREMATCH_WORKER_INTERVAL_SECONDS
 * (default 75s) — so every upcoming sport stays refreshed within ~60-90s.
 *
 * Pairs with prematch-worker-watchdog.sh (1-minute cron). When this worker is
 * enabled, set PREMATCH_DEDICATED_WORKER=true in .env so odds-worker.php SKIPS
 * its own prematch rotation (otherwise both fetch prematch = double cost).
 *
 * Graceful shutdown: SIGTERM / SIGINT honoured between sports and cycles.
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
require_once $phpBackendDir . '/src/SportsbookHealth.php';
require_once $phpBackendDir . '/src/RundownClient.php';
require_once $phpBackendDir . '/src/RundownSportMap.php';
require_once $phpBackendDir . '/src/RundownAffiliateMap.php';
require_once $phpBackendDir . '/src/RundownMarketMap.php';
require_once $phpBackendDir . '/src/RundownEventMapper.php';
require_once $phpBackendDir . '/src/RundownDeltaCursor.php';
require_once $phpBackendDir . '/src/RundownSyncService.php';

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[prematch-worker] pdo_mysql extension is required\n");
    exit(1);
}

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

$interval   = max(15,  (int) Env::get('PREMATCH_WORKER_INTERVAL_SECONDS', '75'));      // sweep all sports this often
$maxRuntime = max(300, (int) Env::get('PREMATCH_WORKER_MAX_RUNTIME_SECONDS', '21600')); // 6h then voluntary restart

$shutdown = false;
if (function_exists('pcntl_signal')) {
    pcntl_async_signals(true);
    pcntl_signal(SIGTERM, static function () use (&$shutdown): void { $shutdown = true; });
    pcntl_signal(SIGINT, static function () use (&$shutdown): void { $shutdown = true; });
}

$pid       = getmypid();
$startedAt = time();

fwrite(STDOUT, "[prematch-worker] pid={$pid} interval={$interval}s\n");
Logger::info('prematch-worker started', [
    'pid'        => $pid,
    'interval'   => $interval,
    'configured' => RundownClient::isConfigured(),
], 'sportsbook');
Logger::flush();

while (!$shutdown) {
    $cycleStart = microtime(true);
    $result = ['sportsTried' => 0, 'eventsSeen' => 0, 'updated' => 0, 'errors' => 0];

    if (RundownClient::isConfigured()) {
        // Active-only by default (skip off-season sports to save credit); set
        // RUNDOWN_PREMATCH_ACTIVE_SPORTS_ONLY=false to sweep the full catalog.
        $activeOnly = strtolower((string) Env::get('RUNDOWN_PREMATCH_ACTIVE_SPORTS_ONLY', 'true')) !== 'false';
        $sports = $activeOnly
            ? activeSportsForPrematchRotation($repo)
            : resolveAllConfiguredSports();

        foreach ($sports as $sportKey) {
            if ($shutdown) break;
            $sportId = RundownSportMap::sportKeyToSportId($sportKey);
            if ($sportId === null) continue;
            try {
                $r = RundownSyncService::syncSportPrematch($repo, $sportKey, $sportId);
                $result['sportsTried']++;
                $result['eventsSeen'] += (int) ($r['eventsSeen'] ?? 0);
                $result['updated']    += (int) ($r['created'] ?? 0) + (int) ($r['updated'] ?? 0);
                $result['errors']     += (int) ($r['errors'] ?? 0);
            } catch (Throwable $e) {
                $result['errors']++;
                Logger::warning('prematch-worker sync error', [
                    'sportKey' => $sportKey,
                    'error'    => $e->getMessage(),
                ], 'sportsbook');
            }
            if (function_exists('pcntl_signal_dispatch')) {
                pcntl_signal_dispatch();
            }
        }
    }

    $cycleMs = (int) round((microtime(true) - $cycleStart) * 1000);
    Logger::info('prematch-worker cycle', ['cycleMs' => $cycleMs] + $result, 'sportsbook');
    Logger::flush();

    if (time() - $startedAt >= $maxRuntime) {
        Logger::info('prematch-worker exiting (max runtime)', ['runtime' => time() - $startedAt], 'sportsbook');
        break;
    }

    // Sleep the remainder of the interval, waking each second so a SIGTERM
    // during a deploy is honoured promptly instead of after the full sleep.
    $sleepFor = max(1, $interval - (int) round(microtime(true) - $cycleStart));
    for ($s = 0; $s < $sleepFor && !$shutdown; $s++) {
        sleep(1);
        if (function_exists('pcntl_signal_dispatch')) {
            pcntl_signal_dispatch();
        }
    }
}

Logger::info('prematch-worker stopped', ['pid' => $pid], 'sportsbook');
Logger::flush();

// ── Helpers mirrored from odds-worker.php ─────────────────────────────────
// Kept identical to odds-worker.php's copies on purpose: this worker is a
// drop-in replacement for that script's prematch rotation. If you change the
// sport-selection logic, update BOTH.

function resolveAllConfiguredSports(): array
{
    $syncAll = strtolower((string) Env::get('RUNDOWN_SYNC_ALL_SPORTS', 'true')) !== 'false';
    if ($syncAll) {
        $excludeRaw = (string) Env::get('RUNDOWN_SYNC_EXCLUDE_SPORT_IDS', '');
        $exclude = array_values(array_filter(array_map('intval', explode(',', $excludeRaw)), static fn ($v) => $v > 0));
        return RundownSportMap::canonicalSportKeys($exclude);
    }
    $tier1   = (string) Env::get('ODDS_TIER1_SPORTS', '');
    $tier2   = (string) Env::get('ODDS_TIER2_SPORTS', '');
    $allowed = (string) Env::get('ODDS_ALLOWED_SPORTS', '');
    $merged  = $tier1 . ',' . $tier2 . ',' . $allowed;
    $list    = array_values(array_unique(array_filter(array_map('trim', explode(',', $merged)), static fn ($v) => $v !== '')));
    sort($list);
    return $list;
}

function activeSportsForPrematchRotation(SqlRepository $db, int $minSports = 4): array
{
    $past   = gmdate(DATE_ATOM, time() - (14 * 86400));
    $future = gmdate(DATE_ATOM, time() + (14 * 86400));

    $rows = $db->findMany('matches', [
        'startTime' => ['$gte' => $past, '$lte' => $future],
    ], ['projection' => ['sportKey' => 1], 'limit' => 5000]);

    $keys = [];
    foreach (is_array($rows) ? $rows : [] as $row) {
        $k = strtolower((string) ($row['sportKey'] ?? ''));
        if ($k === '') continue;
        $keys[RundownSportMap::canonicalSportKey($k)] = true;
    }
    $active = array_keys($keys);
    sort($active);

    if (count($active) < $minSports) {
        return resolveAllConfiguredSports();
    }
    return $active;
}
