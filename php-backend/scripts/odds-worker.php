<?php

declare(strict_types=1);

/**
 * Long-running odds-sync daemon for the Rundown integration.
 *
 * Designed to be started by scripts/odds-worker-watchdog.sh, which a
 * 1-minute cron line invokes; the watchdog re-launches this script
 * whenever the process disappears. On Hostinger / shared hosting this
 * is the safety-net pattern for daemons whose PIDs can be reaped.
 *
 * Polling cadence follows TheRundown's efficient-polling guide
 * (https://docs.therundown.io/guides/efficient-polling):
 *
 *   Live odds (price changes)  → /markets/delta   every 5 s
 *   Live scores (status+score) → /api/v2/delta    every 15 s
 *   Safety-net full refresh    → /sports/{id}/events/{date}
 *                                every 5 min OR when a delta cursor
 *                                goes stale (>25 min)
 *   Pre-match odds (rotation)  → /sports/{id}/events/{date}
 *                                every ~90 s, batching
 *                                PREMATCH_MAX_SPORTS_PER_TICK sports
 *   Settlement sweep           → every 60 s
 *
 * If RUNDOWN_API_KEY is missing, every Rundown call short-circuits to
 * null and the worker stays alive, idling. That way the watchdog
 * doesn't loop-restart while ops finishes configuration.
 *
 * Graceful shutdown: SIGTERM / SIGINT are honoured between ticks so a
 * deployment restart doesn't kill mid-write.
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
require_once $phpBackendDir . '/src/BetSettlementService.php';
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
    fwrite(STDERR, "[odds-worker] pdo_mysql extension is required\n");
    exit(1);
}

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

// ── Knobs (defaults match the Rundown efficient-polling guide) ─────
$tickSeconds              = max(2,   (int) Env::get('RUNDOWN_WORKER_TICK_SECONDS', '5'));
$liveMarketDeltaEveryT    = max(1,   (int) Env::get('RUNDOWN_LIVE_MARKET_DELTA_EVERY_TICKS', '1'));  // 5s
$liveEventDeltaEveryT     = max(1,   (int) Env::get('RUNDOWN_LIVE_EVENT_DELTA_EVERY_TICKS', '3'));   // 15s
$liveFullRefreshEveryT    = max(1,   (int) Env::get('RUNDOWN_LIVE_FULL_REFRESH_EVERY_TICKS', '60')); // 5 min
$prematchEveryTicks       = max(1,   (int) Env::get('RUNDOWN_PREMATCH_EVERY_N_TICKS', '18'));         // ~90s
$prematchBatch            = max(1,   (int) Env::get('PREMATCH_MAX_SPORTS_PER_TICK', '8'));
$settleEveryTicks         = max(1,   (int) Env::get('RUNDOWN_SETTLE_EVERY_N_TICKS', '12'));           // ~60s
$logEveryTicks            = max(1,   (int) Env::get('RUNDOWN_LOG_EVERY_N_TICKS', '12'));              // ~60s
$maxRuntimeSeconds        = max(60,  (int) Env::get('RUNDOWN_WORKER_MAX_RUNTIME_SECONDS', '21600'));  // 6h then voluntary restart
// Full-coverage sweep (periods + props for the board). OFF by default —
// fetches the full 75-ID market set (core+props+periods), so it REQUIRES
// RUNDOWN_MARKET_IDS_BATCH=true to split into ≤12-ID batches, and that
// extra volume is what tripped the 12-cap breaker before. Kept slow + one
// sport per tick to bound API usage.
$fullCoverageEnabled      = strtolower((string) Env::get('RUNDOWN_FULL_COVERAGE_ENABLED', 'false')) === 'true';
$fullCoverageEveryTicks   = max(1,   (int) Env::get('RUNDOWN_FULL_COVERAGE_EVERY_N_TICKS', '60'));    // ~5 min @ 5s
$fullCoverageBatch        = max(1,   (int) Env::get('RUNDOWN_FULL_COVERAGE_SPORTS_PER_TICK', '1'));
$fullCoverageDaysAhead    = max(1,   (int) Env::get('RUNDOWN_FULL_DAYS_AHEAD', '2'));
// ─────────────────────────────────────────────────────────────────────

// Signal handling — gracefully drop out between ticks.
$shutdown = false;
if (function_exists('pcntl_signal')) {
    pcntl_async_signals(true);
    pcntl_signal(SIGTERM, static function () use (&$shutdown): void {
        $shutdown = true;
    });
    pcntl_signal(SIGINT, static function () use (&$shutdown): void {
        $shutdown = true;
    });
}

$pid       = getmypid();
$startedAt = time();
$tick      = 0;
$rotationCursor = 0;
$fullCoverageCursor = 0;

fwrite(STDOUT, "[odds-worker] pid={$pid} tickSeconds={$tickSeconds} prematchEvery={$prematchEveryTicks}t settleEvery={$settleEveryTicks}t fullCoverage=" . ($fullCoverageEnabled ? "on/{$fullCoverageEveryTicks}t" : 'off') . "\n");
Logger::info('odds-worker started', [
    'pid' => $pid,
    'tickSeconds' => $tickSeconds,
    'configured' => RundownClient::isConfigured(),
], 'sportsbook');
Logger::flush();

while (!$shutdown) {
    $tick++;
    $tickStart = microtime(true);

    try {
        // ── 1. Live tick — three cadences (per Rundown polling guide) ─
        // Every tick (5 s):   /markets/delta  → price changes
        // Every 3 ticks (15 s): /api/v2/delta → score/status changes
        // Every 60 ticks (5 min) OR cursor missing: full /events refresh
        $liveSportKeys = distinctLiveOrSoonSportKeys($repo);
        $liveResult = [
            'sportsTried'     => 0,
            'marketDeltas'    => 0,
            'eventDeltas'     => 0,
            'fullRefreshes'   => 0,
            'errors'          => 0,
        ];
        if (RundownClient::isConfigured()) {
            foreach ($liveSportKeys as $sportKey) {
                $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                if ($sportId === null) continue;
                $liveResult['sportsTried']++;

                // Safety-net full refresh: every Nth tick OR whenever
                // the market-delta cursor is missing/stale (first run,
                // 30-min cursor expiry, prior 400). This call resets
                // the market cursor as a side effect.
                $needFullRefresh = ($tick % $liveFullRefreshEveryT === 0)
                    || RundownDeltaCursor::isStale($sportId);
                if ($needFullRefresh) {
                    $r = RundownSyncService::syncSportLive($repo, $sportKey, $sportId);
                    $liveResult['fullRefreshes']++;
                    $liveResult['errors'] += (int) ($r['errors'] ?? 0);
                }

                // Market-delta poll for price changes — every tick.
                if (!$needFullRefresh && $tick % $liveMarketDeltaEveryT === 0) {
                    $r = RundownSyncService::pollDeltasForSport($repo, $sportKey, $sportId);
                    $liveResult['marketDeltas'] += (int) ($r['applied'] ?? 0);
                    $liveResult['errors']       += (int) ($r['errors'] ?? 0);
                }

                // Event-delta poll for score/status changes — every 3 ticks.
                if ($tick % $liveEventDeltaEveryT === 0) {
                    $r = RundownSyncService::pollEventDeltasForSport($repo, $sportKey, $sportId);
                    $liveResult['eventDeltas'] += (int) ($r['applied'] ?? 0);
                    $liveResult['errors']      += (int) ($r['errors'] ?? 0);
                }
            }
        }

        // ── 2. Prematch rotation ────────────────────────────────────
        $prematchResult = null;
        if ($tick % $prematchEveryTicks === 0 && RundownClient::isConfigured()) {
            // Phase 1 credit-save: rotate only sports that actually have
            // games (recent or upcoming). Falls back to the full catalog
            // if RUNDOWN_PREMATCH_ACTIVE_SPORTS_ONLY=false or if too few
            // sports are in DB (fresh deploy / wiped state).
            $activeOnly = strtolower((string) Env::get('RUNDOWN_PREMATCH_ACTIVE_SPORTS_ONLY', 'true')) !== 'false';
            $sports = $activeOnly
                ? activeSportsForPrematchRotation($repo)
                : resolveAllConfiguredSports();
            if ($sports !== []) {
                $rotationCursor = $rotationCursor % count($sports);
                $batch = [];
                for ($i = 0; $i < min($prematchBatch, count($sports)); $i++) {
                    $batch[] = $sports[($rotationCursor + $i) % count($sports)];
                }
                $rotationCursor = ($rotationCursor + count($batch)) % count($sports);

                $prematchResult = ['sportsTried' => 0, 'eventsSeen' => 0, 'updated' => 0, 'errors' => 0];
                foreach ($batch as $sportKey) {
                    $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                    if ($sportId === null) continue;
                    $r = RundownSyncService::syncSportPrematch($repo, $sportKey, $sportId);
                    $prematchResult['sportsTried']++;
                    $prematchResult['eventsSeen'] += (int) ($r['eventsSeen'] ?? 0);
                    $prematchResult['updated']    += (int) ($r['created'] ?? 0) + (int) ($r['updated'] ?? 0);
                    $prematchResult['errors']     += (int) ($r['errors'] ?? 0);
                }
            }
        }

        // ── 2a. Full-coverage sweep (periods + props for the BOARD) ──────
        // syncSportPrematch (above) fetches CORE markets only; period markets
        // (1st half / quarters / innings) and player props come exclusively
        // via syncSportFull (baseQueryParamsFull → core+props+periods). The
        // worker otherwise never calls it, so without this sweep the board
        // list has no period tabs. Gated OFF by default and rate-limited to a
        // slow cadence + one sport per tick: full coverage = 75 market_ids →
        // ~7 ≤12-ID batches per request (needs RUNDOWN_MARKET_IDS_BATCH=true),
        // and that volume is what tripped the 12-cap circuit breaker before.
        $fullCoverageResult = null;
        if ($fullCoverageEnabled && $tick % $fullCoverageEveryTicks === 0 && RundownClient::isConfigured()) {
            $fcActiveOnly = strtolower((string) Env::get('RUNDOWN_PREMATCH_ACTIVE_SPORTS_ONLY', 'true')) !== 'false';
            $fcSports = $fcActiveOnly
                ? activeSportsForPrematchRotation($repo)
                : resolveAllConfiguredSports();
            if ($fcSports !== []) {
                $fullCoverageCursor = $fullCoverageCursor % count($fcSports);
                $fcBatch = [];
                for ($i = 0; $i < min($fullCoverageBatch, count($fcSports)); $i++) {
                    $fcBatch[] = $fcSports[($fullCoverageCursor + $i) % count($fcSports)];
                }
                $fullCoverageCursor = ($fullCoverageCursor + count($fcBatch)) % count($fcSports);

                $fullCoverageResult = ['sportsTried' => 0, 'eventsSeen' => 0, 'updated' => 0, 'errors' => 0];
                foreach ($fcBatch as $sportKey) {
                    $sportId = RundownSportMap::sportKeyToSportId($sportKey);
                    if ($sportId === null) continue;
                    try {
                        $r = RundownSyncService::syncSportFull($repo, $sportKey, $sportId, $fullCoverageDaysAhead);
                    } catch (Throwable $e) {
                        Logger::warning('odds-worker full-coverage sweep failed', ['sportKey' => $sportKey, 'error' => $e->getMessage()], 'sportsbook');
                        $fullCoverageResult['errors']++;
                        continue;
                    }
                    $fullCoverageResult['sportsTried']++;
                    $fullCoverageResult['eventsSeen'] += (int) ($r['eventsSeen'] ?? 0);
                    $fullCoverageResult['updated']    += (int) ($r['created'] ?? 0) + (int) ($r['updated'] ?? 0);
                    $fullCoverageResult['errors']     += (int) ($r['errors'] ?? 0);
                }
                fwrite(STDOUT, sprintf(
                    "[odds-worker] full-coverage sweep: sports=%d events=%d updated=%d errors=%d\n",
                    $fullCoverageResult['sportsTried'],
                    $fullCoverageResult['eventsSeen'],
                    $fullCoverageResult['updated'],
                    $fullCoverageResult['errors']
                ));
            }
        }

        // ── 2b. Season-schedule sweep (NFL etc. — fixtures months ahead) ─
        // Gated by RUNDOWN_SEASON_SPORTS (comma sportKeys, default empty=off).
        // Runs on a slow cadence since season schedules change rarely.
        $seasonSports = array_values(array_filter(array_map(
            'trim',
            explode(',', strtolower((string) Env::get('RUNDOWN_SEASON_SPORTS', '')))
        )));
        $seasonEveryTicks = max(1, (int) Env::get('RUNDOWN_SEASON_EVERY_N_TICKS', '720')); // ~1h @ 5s
        if ($seasonSports !== [] && $tick % $seasonEveryTicks === 0 && RundownClient::isConfigured()) {
            foreach ($seasonSports as $sk) {
                $sid = RundownSportMap::sportKeyToSportId($sk);
                if ($sid === null) continue;
                try {
                    RundownSyncService::syncSportSchedule($repo, $sk, $sid);
                } catch (Throwable $e) {
                    Logger::warning('odds-worker season sweep failed', ['sportKey' => $sk, 'error' => $e->getMessage()], 'sportsbook');
                }
            }
        }

        // ── 3. Settlement sweep ─────────────────────────────────────
        $settleResult = null;
        if ($tick % $settleEveryTicks === 0) {
            try {
                $settleResult = BetSettlementService::settlePendingMatches($repo, 250, 'worker');
            } catch (Throwable $e) {
                Logger::warning('odds-worker settlement sweep failed', ['error' => $e->getMessage()], 'sportsbook');
            }
        }

        // ── 4. Periodic status line ─────────────────────────────────
        if ($tick % $logEveryTicks === 0) {
            Logger::info('odds-worker tick', [
                'tick' => $tick,
                'live' => $liveResult,
                'prematch' => $prematchResult,
                'settle' => $settleResult,
                'tickMs' => (int) ((microtime(true) - $tickStart) * 1000),
                'quota' => RundownClient::latestQuotaSnapshot(),
            ], 'sportsbook');
        }
    } catch (Throwable $e) {
        Logger::exception($e, 'odds-worker tick failed');

        // If MySQL dropped our connection, the worker can't recover in-place
        // (SqlRepository holds a single PDO across ticks). Exit so the
        // watchdog restarts us with a fresh connection on its next 1-minute
        // poll. Otherwise we'd loop forever logging identical "server has
        // gone away" errors and odds would never refresh.
        $msg = (string) $e->getMessage();
        $isConnLost =
            str_contains($msg, '2006')                  // MySQL server has gone away
            || str_contains($msg, 'server has gone away')
            || str_contains($msg, '2013')               // Lost connection during query
            || str_contains($msg, 'Lost connection');
        if ($isConnLost) {
            Logger::error('odds-worker exiting: DB connection lost, watchdog will restart', [
                'tick' => $tick,
                'runtime' => time() - $startedAt,
            ], 'sportsbook');
            Logger::flush();
            exit(2);
        }
    }

    // Force-flush logs and check for voluntary restart.
    Logger::flush();
    if ((time() - $startedAt) >= $maxRuntimeSeconds) {
        Logger::info('odds-worker voluntary restart (max runtime reached)', ['runtime' => time() - $startedAt], 'sportsbook');
        Logger::flush();
        break;
    }
    if ($shutdown) break;

    // Sleep for the remainder of the tick interval (subtracting work
    // already done so a long live sync doesn't compound into drift).
    $elapsed = microtime(true) - $tickStart;
    $sleepFor = max(0.0, (float) $tickSeconds - $elapsed);
    if ($sleepFor > 0) {
        usleep((int) ($sleepFor * 1_000_000));
    }
}

fwrite(STDOUT, "[odds-worker] pid={$pid} exiting cleanly after tick={$tick}\n");
Logger::info('odds-worker exiting', ['tick' => $tick, 'runtime' => time() - $startedAt], 'sportsbook');
Logger::flush();
exit(0);

// ─── helpers ────────────────────────────────────────────────────────

/**
 * Sport keys with at least one row in the matches collection that's
 * live OR scheduled within the active polling window (default 24 h).
 *
 * This is the delta-poll target — any sport with an active or imminent
 * game gets price-change updates every tick via /markets/delta, not
 * just sports with live games. That closes the freshness gap for
 * "upcoming odds for a sport with no live games right now."
 *
 * @return list<string>
 */
function distinctLiveOrSoonSportKeys(SqlRepository $db): array
{
    $windowHours = max(1, (int) Env::get('RUNDOWN_ACTIVE_WINDOW_HOURS', '24'));
    $now  = gmdate(DATE_ATOM);
    $soon = gmdate(DATE_ATOM, time() + ($windowHours * 3600));
    $live = $db->findMany('matches', ['status' => 'live'], ['projection' => ['sportKey' => 1], 'limit' => 1000]);
    $soonRows = $db->findMany('matches', [
        'status'    => 'scheduled',
        'startTime' => ['$gte' => $now, '$lte' => $soon],
    ], ['projection' => ['sportKey' => 1], 'limit' => 1000]);
    $keys = [];
    foreach (array_merge(is_array($live) ? $live : [], is_array($soonRows) ? $soonRows : []) as $row) {
        $k = strtolower((string) ($row['sportKey'] ?? ''));
        // Canonicalize DB-derived keys: tournament aliases (e.g.
        // tennis_wta_madrid_open) all map to one Rundown sport_id with no
        // league filtering, so polling under the alias re-pulls the whole
        // sport and re-labels every match under the phantom group. Fold each
        // key to its canonical sportKey so live/delta polling matches the
        // prematch rotation (resolveAllConfiguredSports) and never resurrects
        // out-of-season tournament groups. (Prematch path already canonicalizes;
        // this closes the same leak on the live/delta-poll target.)
        if ($k !== '') $keys[RundownSportMap::canonicalSportKey($k)] = true;
    }
    return array_keys($keys);
}

/**
 * Sport list for the daemon's prematch rotation.
 *
 * Default (RUNDOWN_SYNC_ALL_SPORTS=true): the full Rundown catalog —
 * every sport_id we know — with optional exclusion via
 * RUNDOWN_SYNC_EXCLUDE_SPORT_IDS (comma-separated ids).
 *
 * Override (RUNDOWN_SYNC_ALL_SPORTS=false): the legacy tier-list union.
 *
 * Stable ordering in both branches so the rotation cursor is consistent
 * across daemon restarts.
 *
 * @return list<string>
 */
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

/**
 * Sport keys that have at least one match in the last 14 days OR the
 * next 14 days. Used as the prematch-rotation target so the worker
 * stops hammering Rundown for sports that are mid-offseason (NBA in
 * July, NFL in March, NHL in August). Typically cuts prematch credit
 * spend by ~70% during off-peak periods.
 *
 * The 14-day lookback keeps recently-active sports on the rotation so
 * a single-day gap doesn't drop them — the next game discovery is then
 * caught on the very next rotation.
 *
 * Discovery fallback: if fewer than $minSports come back (fresh deploy,
 * wiped DB, all sports out of season), fall back to the full configured
 * catalog so the worker doesn't end up polling nothing. Controlled by
 * RUNDOWN_PREMATCH_ACTIVE_SPORTS_ONLY env (default true). Set to false
 * to fully restore the legacy "rotate all sports" behavior.
 *
 * @return list<string>
 */
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
        // Collapse tournament aliases (cricket_psl/odi, tennis_*_open, …) to
        // the canonical key for their Rundown sport_id. Without this, a stale
        // alias row in the DB keeps the worker syncing that alias — sport_id 21
        // under 'cricket_psl' re-pulls all county T20 and re-labels it PSL,
        // resurrecting an out-of-season phantom group every rotation.
        $keys[RundownSportMap::canonicalSportKey($k)] = true;
    }
    $active = array_keys($keys);
    sort($active);

    if (count($active) < $minSports) {
        return resolveAllConfiguredSports();
    }
    return $active;
}
