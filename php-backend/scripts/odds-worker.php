<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/Logger.php';
require_once __DIR__ . '/../src/Http.php';
require_once __DIR__ . '/../src/ApiException.php';
require_once __DIR__ . '/../src/Response.php';
require_once __DIR__ . '/../src/CircuitBreaker.php';
require_once __DIR__ . '/../src/ConnectionPool.php';
require_once __DIR__ . '/../src/QueryCache.php';
require_once __DIR__ . '/../src/RequestDeduplicator.php';
require_once __DIR__ . '/../src/SharedFileCache.php';
require_once __DIR__ . '/../src/SportsbookCache.php';
require_once __DIR__ . '/../src/SqlRepository.php';
require_once __DIR__ . '/../src/BetModeRules.php';
require_once __DIR__ . '/../src/AgentSettlementRules.php';
require_once __DIR__ . '/../src/SportsMatchStatus.php';
require_once __DIR__ . '/../src/SportsbookHealth.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/BetSettlementService.php';
require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/ApiQuotaGuard.php';
require_once __DIR__ . '/../src/TeamNormalizer.php';
require_once __DIR__ . '/../src/OddsSyncService.php';
require_once __DIR__ . '/../src/RundownLiveService.php';
require_once __DIR__ . '/../src/RealtimeEventBus.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
$runOnce = in_array('--once', $argv ?? [], true);

$logWorker = static function (string $level, string $message) use ($phpBackendDir): void {
    $line = sprintf("[%s] [%s] %s\n", gmdate(DATE_ATOM), strtoupper($level), $message);
    $stream = $level === 'error' ? STDERR : STDOUT;
    fwrite($stream, $line);
    $logDir = $phpBackendDir . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0775, true);
    }
    @file_put_contents($logDir . '/odds-worker.log', $line, FILE_APPEND);
};

$manualRawOverride = getenv('MANUAL_FETCH_MODE');
Env::load($projectRoot, $phpBackendDir);

$manualRaw = $manualRawOverride;
if ($manualRaw === false || $manualRaw === null || $manualRaw === '') {
    $manualRaw = (string) Env::get('MANUAL_FETCH_MODE', 'false');
}
$manualMode = strtolower((string) $manualRaw) === 'true';
if ($manualMode) {
    $logWorker('info', 'MANUAL_FETCH_MODE=true, odds worker is disabled.');
    exit(0);
}

if (!SqlRepository::isAvailable()) {
    $logWorker('error', 'pdo_mysql extension is required for odds worker.');
    exit(1);
}

$dbUri = 'mysql-native';
$dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
if ($dbName === '') {
    $dbName = 'sports_betting';
}

// Worker updates DB every 90 seconds (1.5 minutes) by default.
// This ensures live odds are never >90s stale and reduces gaps between
// updates. Set ODDS_CRON_MINUTES in .env to override (e.g. '5' = 5 min).
// For sub-20s Live Now syncs, this combines with RUNDOWN_LIVE_TICK_SECONDS.
$minutes = max(0.5, (float) Env::get('ODDS_CRON_MINUTES', '1.5'));
$intervalSeconds = max(30, (int) round($minutes * 60));

$logWorker('info', "PHP odds worker started. interval={$minutes}m db={$dbName} once=" . ($runOnce ? 'true' : 'false'));

while (true) {
    $started = microtime(true);
    $ts = gmdate(DATE_ATOM);
    try {
        $repo = new SqlRepository($dbUri, $dbName);
        $result = OddsSyncService::updateMatches($repo, 'worker');
        $logWorker('info', sprintf(
            "[%s] update ok created=%d updated=%d scoreOnly=%d settled=%d calls=%d failed=%d blocked=%s",
            $ts,
            (int) ($result['created'] ?? 0),
            (int) ($result['updated'] ?? 0),
            (int) ($result['scoreOnlyUpdates'] ?? 0),
            (int) ($result['settled'] ?? 0),
            (int) ($result['apiCalls'] ?? 0),
            (int) ($result['failedCalls'] ?? 0),
            (($result['blocked'] ?? false) ? 'true' : 'false')
        ));
        // Phase 3a: extended-sync visibility. Before this, the only signal
        // an operator had that "1Q tabs are missing" was the user noticing.
        // Now every cycle logs fresh vs preserved per-match counts so a
        // multi-cycle empty streak (the silent-failure mode that caused
        // period tabs to feel flaky) is obvious in the worker log.
        $extended = is_array($result['extended'] ?? null) ? $result['extended'] : null;
        if ($extended !== null) {
            $preservedBySport = is_array($extended['preservedBySport'] ?? null) ? $extended['preservedBySport'] : [];
            $logWorker('info', sprintf(
                "[%s] extended sync fresh=%d preserved=%d errors=%d calls=%d preservedBySport=%s",
                $ts,
                (int) ($extended['freshMatches'] ?? 0),
                (int) ($extended['preservedMatches'] ?? 0),
                (int) ($extended['errors'] ?? 0),
                (int) ($extended['apiCalls'] ?? 0),
                $preservedBySport === [] ? '{}' : json_encode($preservedBySport, JSON_UNESCAPED_SLASHES)
            ));
        }
    } catch (Throwable $e) {
        $logWorker('error', sprintf("[%s] update failed: %s", $ts, $e->getMessage()));
    }

    // Outrights + participants run on long cadences (6h / 24h by default)
    // and self-throttle via state files — calling them every cycle is cheap.
    // They live OUTSIDE the main updateMatches path so a stalled prematch
    // sync doesn't also stall futures, and so quota for futures is metered
    // separately from the live odds path.
    try {
        $repoOutrights = new SqlRepository($dbUri, $dbName);
        $outright = OddsSyncService::updateOutrights($repoOutrights);
        if (($outright['attempted'] ?? []) !== []) {
            $logWorker('info', sprintf(
                "[%s] outrights tick attempted=%d skipped=%d",
                $ts,
                count($outright['attempted'] ?? []),
                (int) ($outright['skipped'] ?? 0)
            ));
        }
        unset($repoOutrights);
    } catch (Throwable $e) {
        $logWorker('error', sprintf("[%s] outrights tick failed: %s", $ts, $e->getMessage()));
    }

    try {
        $repoParticipants = new SqlRepository($dbUri, $dbName);
        $participants = OddsSyncService::updateParticipants($repoParticipants);
        if (($participants['attempted'] ?? []) !== []) {
            $logWorker('info', sprintf(
                "[%s] participants tick attempted=%d skipped=%d",
                $ts,
                count($participants['attempted'] ?? []),
                (int) ($participants['skipped'] ?? 0)
            ));
        }
        unset($repoParticipants);
    } catch (Throwable $e) {
        $logWorker('error', sprintf("[%s] participants tick failed: %s", $ts, $e->getMessage()));
    }

    // Run the settlement sweep on its own, independent of the odds-sync
    // outcome above. The sweep inside OddsSyncService::updateMatches only
    // fires when upstream calls succeed — if the API is down, rate-limited,
    // or the circuit breaker is open, finished matches were never voided
    // and tickets piled up "Pending" forever. Running it here every tick
    // means yesterday's games drain on time even when the odds feed is
    // misbehaving.
    try {
        $repoSettle = new SqlRepository($dbUri, $dbName);
        $sweep = BetSettlementService::settlePendingMatches($repoSettle, 250, 'worker');
        $logWorker('info', sprintf(
            "[%s] settle sweep checked=%d settled=%d bets=%d errors=%d",
            $ts,
            (int) ($sweep['matchesChecked'] ?? 0),
            (int) ($sweep['matchesSettled'] ?? 0),
            (int) ($sweep['betsSettled'] ?? 0),
            (int) ($sweep['errors'] ?? 0)
        ));
        unset($repoSettle);
    } catch (Throwable $e) {
        $logWorker('error', sprintf("[%s] settle sweep failed: %s", $ts, $e->getMessage()));
    }

    // Worker health alert: if no successful odds tick in WORKER_HEALTH_ALERT_SECONDS
    // (default 600s = 10 min), log a critical row. Threshold + audit row are
    // owned by SportsbookHealth so admins can also surface this in dashboards.
    try {
        $repoHealth = new SqlRepository($dbUri, $dbName);
        if (SportsbookHealth::checkWorkerHealth($repoHealth)) {
            $logWorker('error', sprintf(
                "[%s] worker health alert: no successful odds sync in > %ds — upstream sync stalled",
                $ts,
                max(60, (int) Env::get('WORKER_HEALTH_ALERT_SECONDS', '600'))
            ));
        }
        // Phase 3a: extended-sync watchdog. Fires once per "empty streak"
        // when alt/period markets stop coming back over several cycles.
        // Distinct from the main worker-health alert above — the main odds
        // feed can be healthy while extended sync silently dies.
        if (SportsbookHealth::checkExtendedSyncHealth($repoHealth)) {
            $logWorker('warn', sprintf(
                "[%s] extended sync health alert: no fresh alt/period markets in > %d cycles — players will see Phase-1 'no lines' banners on 1Q/1H/etc.",
                $ts,
                max(1, (int) Env::get('EXTENDED_SYNC_ALERT_CYCLES', '6'))
            ));
        }
        unset($repoHealth);
    } catch (Throwable $e) {
        $logWorker('error', 'worker health check failed: ' . $e->getMessage());
    }

    unset($repo);

    if ($runOnce) {
        break;
    }

    // Sleep until the next main-cycle tick, but interleave TWO live
    // OddsAPI sub-sweeps so in-progress matches refresh much faster
    // than the main worker's per-tier cadence.
    //
    //   * FULL sweep (`syncLiveOdds`): /scores + /odds for every sport
    //     with a live event. Heavy — runs at RUNDOWN_LIVE_TICK_SECONDS
    //     (default 70s) which matches OddsAPI's roughly-30-60s upstream
    //     cache plus a safety margin. This is the only path that
    //     refreshes the bookmaker PRICE on a live row, so it owns
    //     `lastOddsSyncAt`.
    //
    //   * SCORES-ONLY sweep (`syncLiveScoresOnly`): just /scores, and
    //     only for sports that have a scheduled-or-live match in the
    //     active window. Cheap. Runs every LIVE_SCORES_TICK_SECONDS
    //     (default 20s), so the SCORE the player sees on the board is
    //     never more than ~20s behind whatever OddsAPI's /scores feed
    //     reports. Deliberately does NOT touch `lastOddsSyncAt` — a
    //     score-fresh / odds-stale row would otherwise look bet-able
    //     to the live-upcoming freshness gate.
    //
    // Pre-match / scheduled odds remain owned by the main
    // OddsSyncService::updateMatches call earlier in this loop.
    $elapsed = (int) max(0, round(microtime(true) - $started));
    $remaining = max(1, $intervalSeconds - $elapsed);
    $fullLiveTickSeconds = max(5, (int) Env::get('RUNDOWN_LIVE_TICK_SECONDS', '10'));
    // Fast scores cadence. Clamped so it can never run slower than the
    // full sweep (defeats the purpose) and never faster than 5s (would
    // pummel /scores with no actual data movement to show for it,
    // since upstream caches at ~30s anyway).
    $scoresTickSeconds = max(5, min($fullLiveTickSeconds, (int) Env::get('LIVE_SCORES_TICK_SECONDS', '20')));
    // Phase 3 starvation sweep cadence. Runs alongside the scores tick
    // and catches rows whose `lastOddsSyncAt` has aged past the live
    // freshness window (default 90s) despite the main tier scheduler
    // and live sub-ticks. Cheap when system is healthy — the DB query
    // returns zero rows and no upstream calls are made. Set to 0 to
    // disable the sweep entirely (not recommended outside debugging).
    $starvedSweepTickSeconds = max(0, (int) Env::get('STARVED_SWEEP_TICK_SECONDS', '30'));
    // Live-odds source toggle. Hybrid mode:
    //   RUNDOWN_LIVE_ENABLED=true  → Rundown handles the sports it
    //     covers (NBA, NFL, MLB, NHL, top soccer leagues, IPL, etc.),
    //     OddsAPI live writer fills the gaps (tennis, boxing,
    //     euroleague, cricket ODI, plus anything else not in Rundown's
    //     /sports list). Each writer filters by sport so they never
    //     update the same matches row.
    //   RUNDOWN_LIVE_ENABLED=false → OddsAPI writes ALL live odds
    //     (legacy behaviour, unchanged).
    $rundownLiveOn = strtolower((string) Env::get('RUNDOWN_LIVE_ENABLED', 'false')) === 'true'
        && (string) Env::get('RUNDOWN_API_KEY', '') !== '';
    $oddsApiLiveOn = strtolower((string) Env::get('LIVE_ODDS_ODDSAPI', 'true')) === 'true'
        && strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true'
        && (string) Env::get('ODDS_API_KEY', '') !== '';
    // In hybrid mode the OddsAPI live writer skips the sports Rundown
    // is handling so the two never fight for the same match.
    $rundownSupportedSports = $rundownLiveOn ? RundownLiveService::supportedSportKeys() : [];
    $deadline = microtime(true) + $remaining;
    // Track when the FULL sweep last ran so we can do a full pass on the
    // very first chunk after entering the inner loop, then space subsequent
    // full sweeps `$fullLiveTickSeconds` apart while the scores-only sweep
    // runs every chunk.
    $lastFullSweepAt = 0.0;
    // Starvation sweep: independent cadence from the full sweep so it
    // can fire between full sweeps and catch rows that age out
    // mid-cycle. First tick fires immediately on inner-loop entry.
    $lastStarvedSweepAt = 0.0;
    while (microtime(true) < $deadline) {
        $chunkStart = microtime(true);
        $doFullSweep = ($chunkStart - $lastFullSweepAt) >= $fullLiveTickSeconds;
        $doStarvedSweep = $oddsApiLiveOn
            && $starvedSweepTickSeconds > 0
            && ($chunkStart - $lastStarvedSweepAt) >= $starvedSweepTickSeconds;

        if ($doFullSweep) {
            $lastFullSweepAt = $chunkStart;
            if ($rundownLiveOn) {
                try {
                    $repoLive = new SqlRepository($dbUri, $dbName);
                    $r = RundownLiveService::syncLiveOdds($repoLive);
                    if (($r['updated'] ?? 0) > 0 || ($r['errors'] ?? 0) > 0 || ($r['liveEvents'] ?? 0) > 0) {
                        $logWorker('info', sprintf(
                            "rundown live tick sports=%d live=%d calls=%d updated=%d skipped=%d errors=%d",
                            (int) ($r['sportsChecked'] ?? 0),
                            (int) ($r['liveEvents'] ?? 0),
                            (int) ($r['oddsCalls'] ?? 0),
                            (int) ($r['updated'] ?? 0),
                            (int) ($r['skipped'] ?? 0),
                            (int) ($r['errors'] ?? 0)
                        ));
                    }
                    unset($repoLive);
                } catch (Throwable $e) {
                    $logWorker('error', 'rundown live tick failed: ' . $e->getMessage());
                }
            }
            if ($oddsApiLiveOn) {
                try {
                    $repoLive = new SqlRepository($dbUri, $dbName);
                    // Hybrid mode: pass Rundown's covered sports so OddsAPI
                    // skips them. Plain mode ($rundownSupportedSports = []):
                    // OddsAPI handles everything as before.
                    $r = OddsSyncService::syncLiveOdds($repoLive, $rundownSupportedSports);
                    if (($r['updated'] ?? 0) > 0 || ($r['created'] ?? 0) > 0 || ($r['errors'] ?? 0) > 0 || ($r['liveScoreEvents'] ?? 0) > 0) {
                        $logWorker('info', sprintf(
                            "oddsapi live tick sports=%d live=%d withOdds=%d changed=%d errors=%d mode=%s",
                            (int) ($r['sportsChecked'] ?? 0),
                            (int) ($r['liveScoreEvents'] ?? 0),
                            count((array) ($r['matches'] ?? [])),
                            (int) ($r['updated'] ?? 0) + (int) ($r['created'] ?? 0),
                            (int) ($r['errors'] ?? 0),
                            $rundownLiveOn ? 'hybrid-gap-fill' : 'standalone'
                        ));
                    }
                    unset($repoLive);
                } catch (Throwable $e) {
                    $logWorker('error', 'oddsapi live tick failed: ' . $e->getMessage());
                }
            }
        } elseif ($oddsApiLiveOn) {
            // Scores-only sub-tick. Runs in the gaps between full sweeps
            // — typically 2-3 times per full sweep depending on the
            // configured cadences. Updates `score`/`status`/`lastScoreSyncAt`
            // on existing matches via OddsAPI's /scores endpoint; never
            // touches `lastOddsSyncAt`, so the live-upcoming freshness
            // gate keeps using the slower full-sweep cadence as the
            // odds-truth signal.
            try {
                $repoScores = new SqlRepository($dbUri, $dbName);
                $r = OddsSyncService::syncLiveScoresOnly($repoScores, $rundownSupportedSports);
                if (($r['updated'] ?? 0) > 0 || ($r['errors'] ?? 0) > 0 || ($r['finished'] ?? 0) > 0) {
                    $logWorker('info', sprintf(
                        "oddsapi scores tick polled=%d/%d events=%d updated=%d finished=%d settled=%d errors=%d",
                        (int) ($r['sportsPolled'] ?? 0),
                        (int) ($r['sportsChecked'] ?? 0),
                        (int) ($r['scoreEvents'] ?? 0),
                        (int) ($r['updated'] ?? 0),
                        (int) ($r['finished'] ?? 0),
                        (int) ($r['settled'] ?? 0),
                        (int) ($r['errors'] ?? 0)
                    ));
                }
                unset($repoScores);
            } catch (Throwable $e) {
                $logWorker('error', 'oddsapi scores tick failed: ' . $e->getMessage());
            }
        }

        if ($doStarvedSweep) {
            // Phase 3: starvation sweep. Catches matches whose
            // `lastOddsSyncAt` has aged past the live freshness window
            // — the rows that previously flickered in and out of Live
            // Now between worker ticks. Self-rate-limits via per-sport
            // cooldown + max-per-tick cap so a major outage can't blow
            // through the entire quota in one sweep.
            $lastStarvedSweepAt = $chunkStart;
            try {
                $repoSweep = new SqlRepository($dbUri, $dbName);
                $s = OddsSyncService::sweepStarvedLiveMatches($repoSweep, $rundownSupportedSports);
                // Only log when there was actually starvation to talk
                // about — a clean zero-row sweep adds noise without
                // signal. The `starved > 0` line is the signal that
                // the main sync is falling behind.
                if (($s['starvedMatches'] ?? 0) > 0 || ($s['errors'] ?? 0) > 0) {
                    $logWorker('info', sprintf(
                        "oddsapi starved sweep starved=%d sports=%d swept=%d cooldown_skip=%d overflow=%d calls=%d updated=%d errors=%d",
                        (int) ($s['starvedMatches'] ?? 0),
                        (int) ($s['starvedSports'] ?? 0),
                        (int) ($s['sportsSwept'] ?? 0),
                        (int) ($s['sportsCooldownSkipped'] ?? 0),
                        (int) ($s['sportsOverflowSkipped'] ?? 0),
                        (int) ($s['oddsCalls'] ?? 0),
                        (int) ($s['updated'] ?? 0),
                        (int) ($s['errors'] ?? 0)
                    ));
                }
                unset($repoSweep);
            } catch (Throwable $e) {
                $logWorker('error', 'oddsapi starved sweep failed: ' . $e->getMessage());
            }
        }

        $chunkElapsed = microtime(true) - $chunkStart;
        $sleepFor = max(1, $scoresTickSeconds - (int) round($chunkElapsed));
        $remainingToDeadline = $deadline - microtime(true);
        if ($remainingToDeadline <= 0) break;
        sleep((int) min($sleepFor, $remainingToDeadline));
    }
}
