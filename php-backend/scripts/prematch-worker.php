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
require_once $phpBackendDir . '/src/PrematchProbe.php';

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

// ── Tiered near/far cadence (2026-07-24) ─────────────────────────────────────
// NEAR days (0..NEAR-1) get a full all-books refresh EVERY cycle. FAR days
// (NEAR..DAYS-1) get a full all-books refresh only every FAR_FULL_SECONDS;
// between those, a cheap Pinnacle-only watch runs every cycle and triggers an
// immediate full refresh for any game whose Pinnacle line moves past
// threshold. The 4-day lookahead window is fully preserved (Advance feature).
$daysAhead     = max(1, (int) Env::get('RUNDOWN_PREMATCH_DAYS_AHEAD', '4'));
$nearDays      = max(0, min($daysAhead, (int) Env::get('PREMATCH_NEAR_DAYS', '2')));
$farFullEvery  = max($interval, (int) Env::get('PREMATCH_FAR_FULL_SECONDS', '300'));
$hasFarTier    = $nearDays < $daysAhead;
$lastFarFullAt = 0; // force a far full refresh on the very first cycle

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
    $result = ['sportsTried' => 0, 'eventsSeen' => 0, 'updated' => 0, 'errors' => 0, 'farFull' => 0, 'watched' => 0, 'triggered' => 0];
    // Is the far tier due for its periodic full all-books refresh this cycle?
    $farFullDue = $hasFarTier && (time() - $lastFarFullAt >= $farFullEvery);

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
                // NEAR days: full all-books refresh every cycle (unchanged).
                $r = RundownSyncService::syncSportPrematch($repo, $sportKey, $sportId, $daysAhead, 0, $nearDays);
                $result['sportsTried']++;
                $result['eventsSeen'] += (int) ($r['eventsSeen'] ?? 0);
                $result['updated']    += (int) ($r['created'] ?? 0) + (int) ($r['updated'] ?? 0);
                $result['errors']     += (int) ($r['errors'] ?? 0);

                // FAR days: full all-books when due, else the cheap Pinnacle
                // watch (which self-triggers a full refresh on a sharp move).
                if ($hasFarTier) {
                    if ($farFullDue) {
                        $rf = RundownSyncService::syncSportPrematch($repo, $sportKey, $sportId, $daysAhead, $nearDays, $daysAhead);
                        $result['farFull']  += (int) ($rf['created'] ?? 0) + (int) ($rf['updated'] ?? 0);
                        $result['eventsSeen'] += (int) ($rf['eventsSeen'] ?? 0);
                        $result['errors']   += (int) ($rf['errors'] ?? 0);
                    } else {
                        $rw = RundownSyncService::pinnacleWatchFarDays($repo, $sportKey, $sportId, $nearDays, $daysAhead);
                        $result['watched']   += (int) ($rw['watched'] ?? 0);
                        $result['triggered'] += (int) ($rw['triggered'] ?? 0);
                        $result['errors']    += (int) ($rw['errors'] ?? 0);
                    }
                }
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

    // Advance the far-full clock only after a cycle that actually ran one, so
    // a config-not-ready cycle doesn't silently skip the next far refresh.
    if ($farFullDue && RundownClient::isConfigured()) {
        $lastFarFullAt = time();
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

    if (count($active) >= $minSports) {
        return $active;
    }
    // Short active list — do NOT blast every configured sport at full prematch
    // cadence (the old datapoint waste, 2026-07-24). Cheaply probe which
    // configured sports actually have upcoming games (dates-only, ~0 odds
    // points) and promote just those. A sport with no games in the window has
    // no bettable market, so skipping it is not a stale-line/exploit risk —
    // only a discovery question, which the probe answers. Belt-and-suspenders:
    // if the merged list is still empty (cold start / probe failure), fall
    // back to the full catalog so the board can never go dark.
    $probed = probeUpcomingConfiguredSports($db, $active);
    $merged = array_values(array_unique(array_merge($active, $probed)));
    return $merged !== [] ? $merged : resolveAllConfiguredSports();
}

/**
 * Cheap upcoming-games probe for configured sports missing from the active
 * rotation (2026-07-24). Uses the dates-only endpoint (~0 odds datapoints) so
 * a quiet period no longer triggers a full-catalog prematch blast; a sport is
 * promoted only once it actually has a game inside the lookahead window.
 * Cached (PREMATCH_PROBE_CACHE_SECONDS, default 300s) to bound request volume.
 *
 * @param list<string> $alreadyActive
 * @return list<string>
 */
function probeUpcomingConfiguredSports(SqlRepository $db, array $alreadyActive): array
{
    $ttl = max(60, (int) Env::get('PREMATCH_PROBE_CACHE_SECONDS', '300'));
    $cached = SharedFileCache::get('prematch-probe', 'upcoming', $ttl);
    if (is_array($cached['sports'] ?? null)) {
        return $cached['sports'];
    }
    $horizonDays = max(1, (int) Env::get('RUNDOWN_PREMATCH_DAYS_AHEAD', '4'));
    $today  = gmdate('Y-m-d');
    $cutoff = gmdate('Y-m-d', time() + $horizonDays * 86400);
    $missing = array_values(array_diff(resolveAllConfiguredSports(), $alreadyActive));
    $found = [];
    foreach ($missing as $sportKey) {
        $sportId = RundownSportMap::sportKeyToSportId($sportKey);
        if ($sportId === null) {
            continue;
        }
        try {
            $resp = RundownClient::getDatesForSports([$sportId], ['format' => 'date']);
            if (PrematchProbe::hasUpcomingWithin(PrematchProbe::datesFromResponse($resp, $sportId), $today, $cutoff)) {
                $found[] = $sportKey;
            }
        } catch (Throwable $e) {
            Logger::warning('prematch probe error', ['sportKey' => $sportKey, 'error' => $e->getMessage()], 'sportsbook');
        }
    }
    SharedFileCache::put('prematch-probe', 'upcoming', ['sports' => $found, 'at' => time()]);
    return $found;
}
