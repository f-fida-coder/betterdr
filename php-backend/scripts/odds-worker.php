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
require_once $phpBackendDir . '/src/PrematchProbe.php';
require_once $phpBackendDir . '/src/MatchesController.php';

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
$liveScoreEveryT          = max(1,   (int) Env::get('RUNDOWN_LIVE_SCORE_EVERY_TICKS', '4'));         // 20s — fast score+inning sweep
$prematchEveryTicks       = max(1,   (int) Env::get('RUNDOWN_PREMATCH_EVERY_N_TICKS', '18'));         // ~90s
$prematchBatch            = max(1,   (int) Env::get('PREMATCH_MAX_SPORTS_PER_TICK', '8'));
// When the dedicated prematch-worker.php is running, it owns the prematch
// sweep — skip it here so we don't double-fetch (and so this worker stays
// lean for live scores + settlement).
$prematchDedicated        = strtolower((string) Env::get('PREMATCH_DEDICATED_WORKER', 'false')) === 'true';
$settleEveryTicks         = max(1,   (int) Env::get('RUNDOWN_SETTLE_EVERY_N_TICKS', '12'));           // ~60s
$approvalSweepEveryTicks  = max(1,   (int) Env::get('BET_APPROVAL_SWEEP_EVERY_N_TICKS', '12'));       // ~60s
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
// Public board cache warmer — keeps the landing-board shared cache + its
// stale-fallback copy warm out-of-band, so a transient DB statement-timeout
// can never blank the board (it degrades to the last good payload instead).
$boardWarmEnabled         = strtolower((string) Env::get('BOARD_CACHE_WARMER_ENABLED', 'true')) !== 'false';
$boardWarmEveryTicks      = max(1,   (int) Env::get('BOARD_CACHE_WARM_EVERY_N_TICKS', '1'));            // ~5s @ 5s tick
// ─────────────────────────────────────────────────────────────────────

$matchesController = new MatchesController($repo, (string) Env::get('JWT_SECRET', ''));

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
            'scoreSweeps'     => 0,
            'fullRefreshes'   => 0,
            'errors'          => 0,
        ];
        // Matches that flipped to a terminal status (finished/canceled) on
        // this tick. Settled inline below so the player's win/loss lands in
        // seconds instead of waiting up to RUNDOWN_SETTLE_EVERY_N_TICKS.
        $instantSettleIds = [];
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
                    foreach (($r['finishedMatchIds'] ?? []) as $fmid) {
                        $instantSettleIds[(string) $fmid] = true;
                    }
                }

                // Fast score+inning sweep — every Nth tick (default 20s).
                // The event-delta poll above is unbootstrappable at this
                // account's volume (400 "too many events"), so without this
                // scores would only refresh on the slow full sweep. This
                // pulls current score/inning per live sport WITHOUT odds
                // (no affiliate_ids → ~0 data-point cost) and patches score
                // fields only. Skipped on a full-refresh tick (already fresh).
                if (!$needFullRefresh && $tick % $liveScoreEveryT === 0) {
                    $r = RundownSyncService::syncSportLiveScores($repo, $sportKey, $sportId);
                    $liveResult['scoreSweeps'] = ($liveResult['scoreSweeps'] ?? 0) + (int) ($r['updated'] ?? 0);
                    $liveResult['errors']     += (int) ($r['errors'] ?? 0);
                    // The sweep now sees finals (the event-delta poll that
                    // used to feed instant settlement is unbootstrappable),
                    // so games it just flipped to finished/canceled get
                    // graded this tick instead of waiting for the 60s sweep.
                    foreach (($r['finishedMatchIds'] ?? []) as $fmid) {
                        $instantSettleIds[(string) $fmid] = true;
                    }
                }
            }
        }

        // ── 1b. Instant settlement of matches that JUST finished ────
        // Grade the moment Rundown flips status to finished/canceled
        // rather than waiting for the periodic sweep (~60s). Uses the
        // identical, idempotent BetSettlementService::settleMatch path
        // (WHERE status='pending'), so re-running it in the 60s sweep
        // below is a safe no-op. A failure here never blocks the tick —
        // the sweep is the safety net.
        if ($instantSettleIds !== []) {
            $instantSettled = 0;
            foreach (array_keys($instantSettleIds) as $fmid) {
                try {
                    $res = BetSettlementService::settleMatch($repo, $fmid, null, 'instant-finish');
                    $instantSettled += (int) ($res['total'] ?? 0);
                } catch (Throwable $e) {
                    Logger::warning('odds-worker instant settle failed', [
                        'matchId' => $fmid,
                        'error'   => $e->getMessage(),
                    ], 'sportsbook');
                }
            }
            if ($instantSettled > 0) {
                Logger::info('odds-worker instant settlement', [
                    'matches' => count($instantSettleIds),
                    'betsSettled' => $instantSettled,
                ], 'sportsbook');
            }
        }

        // ── 2. Prematch rotation ────────────────────────────────────
        $prematchResult = null;
        if (!$prematchDedicated && $tick % $prematchEveryTicks === 0 && RundownClient::isConfigured()) {
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
            // Keep only keys that map to a Rundown sport_id. canonicalSportKey()
            // leaves unknown/alias keys unchanged, so an unmappable key would
            // make a one-sport-per-tick sweep a silent no-op (sports=0).
            $fcSports = array_values(array_filter(
                $fcSports,
                static fn (string $k): bool => RundownSportMap::sportKeyToSportId($k) !== null
            ));
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
            // Display-only backfill: grade the per-leg W/L of ALREADY-TERMINAL
            // parlays whose sibling legs were closed unrgraded by a decisive
            // loss (informational badges). Zero money contact — writes only
            // leg-level display status, never balance/ledger/ticket outcome.
            // Piggybacks the ~60s settle cadence; own try/catch so a backfill
            // error can never disrupt settlement.
            try {
                BetSettlementService::backfillTerminalLegDisplay($repo, 45, 200);
            } catch (Throwable $e) {
                Logger::warning('odds-worker terminal-leg display backfill failed', ['error' => $e->getMessage()], 'sportsbook');
            }
        }

        // ── 3a2. Bet-approval timeout sweep ─────────────────────────
        // Auto-reject + refund holds past their window so a queued bet never
        // ties up a player's stake indefinitely. No-op while dormant (no
        // pending_approval rows). Env cached at startup — restart to change.
        if ($tick % $approvalSweepEveryTicks === 0) {
            try {
                BetApprovalService::sweepExpired(
                    $repo,
                    SportsbookBetSupport::betApprovalTimeoutMinutes(),
                    SportsbookBetSupport::betApprovalTimeoutMinutesFutures(),
                    200
                );
            } catch (Throwable $e) {
                Logger::warning('odds-worker approval-timeout sweep failed', ['error' => $e->getMessage()], 'sportsbook');
            }
        }

        // ── 3b. Stale-live janitor ──────────────────────────────────
        // A row stuck status='live' that no feed has touched for a day is a
        // fossil (dropped coverage, dead provider key) — no score update will
        // ever flip it to finished, so without this sweep it stays 'live'
        // forever, bloating the live query and the live-sport rotation.
        // Rows with pending bets are never touched here: expiring them would
        // orphan the bets outside the settlement/void path, so they're logged
        // for manual review instead.
        $fossilEveryTicks = max(1, (int) Env::get('LIVE_FOSSIL_SWEEP_EVERY_N_TICKS', '720')); // ~1h @ 5s
        $fossilAgeSeconds = max(3600, (int) Env::get('LIVE_FOSSIL_EXPIRE_SECONDS', '86400'));
        // Also fires on the FIRST tick after boot so a restart clears any
        // fossil backlog immediately instead of waiting out the hourly slot.
        if ($tick === 1 || $tick % $fossilEveryTicks === 0) {
            try {
                $fossilCutoff = time() - $fossilAgeSeconds;
                $fossilExpired = 0;
                $fossilSkippedWithBets = 0;
                foreach ($repo->findMany('matches', ['status' => 'live'], ['limit' => 1000]) as $fossilRow) {
                    $newestTouch = 0;
                    foreach (['updatedAt', 'lastUpdated', 'lastScoreSyncAt', 'lastOddsSyncAt'] as $touchField) {
                        if (!empty($fossilRow[$touchField])) {
                            $touchTs = (int) strtotime((string) $fossilRow[$touchField]);
                            if ($touchTs > $newestTouch) $newestTouch = $touchTs;
                        }
                    }
                    if ($newestTouch >= $fossilCutoff) continue;
                    $fossilId = (string) ($fossilRow['id'] ?? '');
                    if ($fossilId === '') continue;
                    $fossilBets = $repo->findMany('bets', [
                        'status' => 'pending',
                        '$or' => [
                            ['matchId' => SqlRepository::id($fossilId)],
                            ['selections.matchId' => SqlRepository::id($fossilId)],
                        ],
                    ], ['projection' => ['id' => 1], 'limit' => 1]);
                    if (is_array($fossilBets) && $fossilBets !== []) {
                        $fossilSkippedWithBets++;
                        Logger::warning('stale-live janitor: fossil row has pending bets — left for manual review', [
                            'matchId'    => $fossilId,
                            'matchup'    => ($fossilRow['homeTeam'] ?? '?') . ' vs ' . ($fossilRow['awayTeam'] ?? '?'),
                            'staleHours' => $newestTouch > 0 ? (int) floor((time() - $newestTouch) / 3600) : null,
                        ], 'sportsbook');
                        continue;
                    }
                    $repo->updateOne('matches', ['id' => SqlRepository::id($fossilId)], [
                        'status'     => 'expired',
                        'statusNote' => 'stale-live janitor',
                    ]);
                    $fossilExpired++;
                }
                if ($fossilExpired > 0 || $fossilSkippedWithBets > 0) {
                    Logger::info('stale-live janitor', [
                        'expired'          => $fossilExpired,
                        'skippedWithBets'  => $fossilSkippedWithBets,
                        'olderThanSeconds' => $fossilAgeSeconds,
                    ], 'sportsbook');
                }
            } catch (Throwable $e) {
                Logger::warning('stale-live janitor failed', ['error' => $e->getMessage()], 'sportsbook');
            }

            // ── Scheduled-fossil janitor (same hourly slot) ──────────────
            // A row stuck status='scheduled' whose kickoff passed long ago is
            // a fixture the feed abandoned (league left the plan, event id
            // vanished, season-sweep stub never played). Nothing ever flips
            // it, so these accumulated to 3,550 rows (back to February) —
            // 80% of the board query's row set, ~8MB of dead JSON decoded
            // EVERY 5s tick by the cache warmer (the 1.5-3.4s
            // database:query:matches breaker warnings). Guards, mirroring the
            // stale-live janitor:
            //   • kickoff ≥ SCHEDULED_FOSSIL_EXPIRE_SECONDS in the past
            //     (default 48h — a delayed real game re-upserts from the feed
            //     and would be untouched anyway via the freshness guard)
            //   • row untouched for ≥ the same stale window as live fossils
            //     (an active fixture is re-stamped by every prematch pass)
            //   • matches carrying pending/open bets are never expired —
            //     logged for manual review instead (bets prefetched in ONE
            //     query, not per-candidate).
            // 'expired' is display-only here: these rows were already
            // invisible (PHP visibility filters) and unbettable (past
            // kickoff); settlement discovery reads betselections, not match
            // status, so nothing money-touching changes.
            $schedFossilSeconds = max(86400, (int) Env::get('SCHEDULED_FOSSIL_EXPIRE_SECONDS', '172800')); // 48h past kickoff
            try {
                $kickoffCutoff = time() - $schedFossilSeconds;
                $touchCutoff   = time() - $fossilAgeSeconds;
                $schedExpired = 0;
                $schedSkippedWithBets = 0;

                // One query: every matchId referenced by a live ticket.
                $activeBetMatchIds = [];
                foreach ($repo->findMany('bets', [
                    'status' => ['$in' => ['pending', 'open']],
                ], ['projection' => ['matchId' => 1, 'selections' => 1], 'limit' => 2000]) as $activeBet) {
                    $mid = (string) ($activeBet['matchId'] ?? '');
                    if ($mid !== '') $activeBetMatchIds[$mid] = true;
                    foreach ((array) ($activeBet['selections'] ?? []) as $sel) {
                        $smid = is_array($sel) ? (string) ($sel['matchId'] ?? '') : '';
                        if ($smid !== '') $activeBetMatchIds[$smid] = true;
                    }
                }

                foreach ($repo->findMany('matches', ['status' => 'scheduled'], ['limit' => 4000]) as $schedRow) {
                    $startTs = strtotime((string) ($schedRow['startTime'] ?? ''));
                    if ($startTs === false || $startTs <= 0 || $startTs > $kickoffCutoff) continue;
                    $newestTouch = 0;
                    foreach (['updatedAt', 'lastUpdated', 'lastOddsSyncAt'] as $touchField) {
                        if (!empty($schedRow[$touchField])) {
                            $touchTs = (int) strtotime((string) $schedRow[$touchField]);
                            if ($touchTs > $newestTouch) $newestTouch = $touchTs;
                        }
                    }
                    if ($newestTouch >= $touchCutoff) continue;
                    $schedId = (string) ($schedRow['id'] ?? '');
                    if ($schedId === '') continue;
                    if (isset($activeBetMatchIds[$schedId])) {
                        $schedSkippedWithBets++;
                        Logger::warning('scheduled-fossil janitor: row has live bets — left for manual review', [
                            'matchId' => $schedId,
                            'matchup' => ($schedRow['homeTeam'] ?? '?') . ' vs ' . ($schedRow['awayTeam'] ?? '?'),
                            'startTime' => $schedRow['startTime'] ?? null,
                        ], 'sportsbook');
                        continue;
                    }
                    $repo->updateOne('matches', ['id' => SqlRepository::id($schedId)], [
                        'status'     => 'expired',
                        'statusNote' => 'scheduled-fossil janitor',
                    ]);
                    $schedExpired++;
                }
                if ($schedExpired > 0 || $schedSkippedWithBets > 0) {
                    Logger::info('scheduled-fossil janitor', [
                        'expired'         => $schedExpired,
                        'skippedWithBets' => $schedSkippedWithBets,
                        'kickoffOlderThanSeconds' => $schedFossilSeconds,
                    ], 'sportsbook');
                }
            } catch (Throwable $e) {
                Logger::warning('scheduled-fossil janitor failed', ['error' => $e->getMessage()], 'sportsbook');
            }
        }

        // ── 3b. Warm the public board cache ─────────────────────────
        // Runs after this tick's odds writes so the warm copy reflects the
        // freshest prices. Isolated try/catch: a warm failure (e.g. a DB
        // statement-timeout during a contention burst) must never abort the
        // worker tick — the previous warm copy stays in place and the board
        // keeps serving it.
        if ($boardWarmEnabled && ($tick % $boardWarmEveryTicks === 0)) {
            try {
                $matchesController->warmPublicBoardCache();
            } catch (Throwable $e) {
                Logger::warning('board cache warm failed', ['error' => $e->getMessage()], 'sportsbook');
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

    if (count($active) >= $minSports) {
        return $active;
    }
    // Short active list — cheap upcoming-games probe instead of blasting the
    // full catalog at prematch cadence (2026-07-24 waste fix). Mirrors the
    // prematch-worker copy; kept in lockstep. A sport with no games in the
    // window has no bettable market, so skipping it carries no exploit risk.
    $probed = probeUpcomingConfiguredSports($db, $active);
    $merged = array_values(array_unique(array_merge($active, $probed)));
    return $merged !== [] ? $merged : resolveAllConfiguredSports();
}

/**
 * Cheap upcoming-games probe (2026-07-24) — dates-only endpoint (~0 odds
 * datapoints), cached (PREMATCH_PROBE_CACHE_SECONDS, default 300s). Promotes a
 * missing configured sport into rotation only once it has a game inside the
 * lookahead window. Kept in lockstep with the prematch-worker copy.
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
