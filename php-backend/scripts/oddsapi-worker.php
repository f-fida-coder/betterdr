<?php

declare(strict_types=1);

/**
 * The Odds API SUPPLEMENTAL odds worker — tiered, config-driven scheduler.
 *
 * Categories and cadences (minutes, env-driven):
 *   - soccer main lines: ODDS_API_POLL_SOCCER_MINUTES (10), tightened to
 *     ODDS_API_POLL_SOCCER_NEAR_KICKOFF_MINUTES (5) while any allowlisted
 *     soccer match kicks off within ODDS_API_NEAR_KICKOFF_WINDOW_HOURS (2).
 *   - outrights/futures: ODDS_API_POLL_OUTRIGHTS_MINUTES (60). Gated by
 *     ODDS_API_OUTRIGHTS_SYNC_ENABLED (default OFF until the outrights-
 *     ingestion chunk lands).
 *   - card markets: ODDS_API_POLL_CARDS_MINUTES (15), gated by
 *     OddsApiCardMarketsService::enabled().
 *   - low-volume fights + rugby (boxing_boxing, rugbyleague_nrl):
 *     ODDS_API_POLL_LOWVOLUME_MINUTES (30), same near-kickoff tightening.
 *     Zero-event passes are NORMAL between fight cards / NRL rounds.
 *
 * CREDIT BUDGET GUARD (wired here):
 *   - Every pass reads OddsApiClient::pollIntervalMultiplier() — 2 when
 *     x-requests-remaining < ODDS_API_BUDGET_SLOWDOWN_REMAINING — and the
 *     next-due timestamp is computed as interval × multiplier, so every
 *     polling frequency literally halves.
 *   - OddsApiClient::outrightsOnly() (remaining < CRITICAL) skips the
 *     soccer tier entirely; only the outrights tier keeps polling.
 *   - Once per UTC day the worker logs the daily credit usage line to the
 *     'oddsapi' log channel.
 *
 * ISOLATION: this worker never touches RundownClient, the Rundown workers,
 * or their caches. Its failure modes end at "theoddsapi rows go stale".
 * Own log channel ('oddsapi'), own watchdog (oddsapi-worker-watchdog.sh).
 *
 * INERT until ODDS_API_SYNC_ENABLED=true + ODDS_API_KEY set: idles with
 * zero upstream calls so the watchdog cron can be wired ahead of launch
 * (exiting instead would make the 1-minute watchdog restart-loop it).
 * Env is cached at startup — restart the worker (via watchdog) after any
 * env change, same as the other workers.
 *
 * Graceful shutdown: SIGTERM / SIGINT honoured between passes and ticks.
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
require_once $phpBackendDir . '/src/OddsMarketCatalog.php';
require_once $phpBackendDir . '/src/SportsbookBetSupport.php';
require_once $phpBackendDir . '/src/OddsApiAllowlist.php';
require_once $phpBackendDir . '/src/OddsApiClient.php';
require_once $phpBackendDir . '/src/OddsApiEventMapper.php';
require_once $phpBackendDir . '/src/OddsApiSyncService.php';
require_once $phpBackendDir . '/src/OddsApiCardMarketsService.php';

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[oddsapi-worker] pdo_mysql extension is required\n");
    exit(1);
}

// Startup assertion — refuse to run at all if the allowlist ever collides
// with a TheRundown-covered league (throws + logs).
OddsApiAllowlist::assertNoRundownOverlap();

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

$tick            = max(5, (int) Env::get('ODDS_API_WORKER_TICK_SECONDS', '30'));
$maxRuntime      = max(300, (int) Env::get('ODDS_API_WORKER_MAX_RUNTIME_SECONDS', '21600')); // 6h then voluntary restart
$soccerMinutes   = max(1, (int) Env::get('ODDS_API_POLL_SOCCER_MINUTES', '10'));
$nearMinutes     = max(0, (int) Env::get('ODDS_API_POLL_SOCCER_NEAR_KICKOFF_MINUTES', '5')); // 0 = no tightening
$nearWindowHours = max(1, (int) Env::get('ODDS_API_NEAR_KICKOFF_WINDOW_HOURS', '2'));
$outrightMinutes = max(5, (int) Env::get('ODDS_API_POLL_OUTRIGHTS_MINUTES', '60'));
$cardsMinutes    = max(5, (int) Env::get('ODDS_API_POLL_CARDS_MINUTES', '15'));
$lowVolMinutes   = max(5, (int) Env::get('ODDS_API_POLL_LOWVOLUME_MINUTES', '30'));

$shutdown = false;
if (function_exists('pcntl_signal')) {
    pcntl_async_signals(true);
    pcntl_signal(SIGTERM, static function () use (&$shutdown): void { $shutdown = true; });
    pcntl_signal(SIGINT, static function () use (&$shutdown): void { $shutdown = true; });
}

$pid       = getmypid();
$startedAt = time();
$enabled   = OddsApiSyncService::enabled();

fwrite(STDOUT, "[oddsapi-worker] pid={$pid} enabled=" . ($enabled ? 'yes' : 'NO (idle)') . " soccer={$soccerMinutes}m outrights={$outrightMinutes}m tick={$tick}s\n");
Logger::info('oddsapi-worker started', [
    'pid'             => $pid,
    'enabled'         => $enabled,
    'soccerMinutes'   => $soccerMinutes,
    'nearMinutes'     => $nearMinutes,
    'outrightMinutes' => $outrightMinutes,
    'outrightsGate'   => OddsApiSyncService::outrightsEnabled(),
    'cardsMinutes'    => $cardsMinutes,
    'cardsGate'       => OddsApiCardMarketsService::enabled(),
    'lowVolMinutes'   => $lowVolMinutes,
], 'oddsapi');
Logger::flush();

$soccerDueAt        = 0; // due immediately
$outrightsDueAt     = 0;
$cardsDueAt         = 0;
$lowVolDueAt        = 0;
$lastUsageLogDay    = '';
$outrightsOnlyState = false;

/**
 * True while any match of the given sportKeys kicks off within the window —
 * drives the near-kickoff cadence tightening per tier. These sportKeys are
 * fed exclusively by this worker, so no oddsSource filter is needed.
 *
 * @param list<string> $sportKeys
 */
function oddsapiHasKickoffWithinWindow(SqlRepository $db, int $windowHours, array $sportKeys): bool
{
    if ($sportKeys === []) {
        return false;
    }
    $rows = $db->findMany('matches', [
        'sportKey'  => ['$in' => $sportKeys],
        'status'    => 'scheduled',
        'startTime' => ['$gte' => gmdate(DATE_ATOM), '$lte' => gmdate(DATE_ATOM, time() + $windowHours * 3600)],
    ], ['projection' => ['id' => 1], 'limit' => 1]);
    return is_array($rows) && count($rows) > 0;
}

while (!$shutdown) {
    $loopStart = time();

    if (!OddsApiSyncService::enabled()) {
        // Inert mode: flag off / key missing. Zero upstream calls; a restart
        // (via watchdog) picks up env changes.
        if (time() - $startedAt >= $maxRuntime) break;
        for ($s = 0; $s < $tick && !$shutdown; $s++) {
            sleep(1);
            if (function_exists('pcntl_signal_dispatch')) pcntl_signal_dispatch();
        }
        continue;
    }

    // ── Budget guard: read once per tick ─────────────────────────────
    $mult    = OddsApiClient::pollIntervalMultiplier(); // 1 normal, 2 below SLOWDOWN
    $outOnly = OddsApiClient::outrightsOnly();          // true below CRITICAL

    if ($outOnly !== $outrightsOnlyState) {
        $outrightsOnlyState = $outOnly;
        if ($outOnly) {
            Logger::warning('oddsapi-worker BUDGET CRITICAL — outrights-only mode', [
                'remaining' => OddsApiClient::creditsRemaining(),
            ], 'oddsapi');
        } else {
            Logger::info('oddsapi-worker budget recovered — full polling resumes', [
                'remaining' => OddsApiClient::creditsRemaining(),
            ], 'oddsapi');
        }
    }

    // ── Daily credit usage line (once per UTC day) ───────────────────
    $day = gmdate('Y-m-d');
    if ($day !== $lastUsageLogDay) {
        $usage = OddsApiClient::dailyUsage();
        Logger::info('oddsapi daily credit usage', [
            'date'       => $usage['date'],
            'usedToday'  => $usage['used'],
            'remaining'  => OddsApiClient::creditsRemaining(),
            'multiplier' => $mult,
        ], 'oddsapi');
        $lastUsageLogDay = $day;
    }

    // ── Soccer tier (skipped entirely in outrights-only mode) ────────
    if (!$outOnly && $loopStart >= $soccerDueAt) {
        try {
            $r = OddsApiSyncService::syncSoccerPrematch($repo);
            Logger::info('oddsapi soccer pass', [
                'sports'   => $r['sports'],
                'events'   => $r['events'],
                'inserted' => $r['inserted'],
                'updated'  => $r['updated'],
                'skipped'  => $r['skipped'],
                'errors'   => count($r['errors']),
            ] + ($r['errors'] !== [] ? ['errorDetail' => $r['errors']] : []), 'oddsapi');
        } catch (Throwable $e) {
            Logger::warning('oddsapi soccer pass failed', ['error' => $e->getMessage()], 'oddsapi');
        }
        $intervalMinutes = $soccerMinutes;
        if ($nearMinutes > 0) {
            try {
                if (oddsapiHasKickoffWithinWindow($repo, $nearWindowHours, OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_SOCCER))) {
                    $intervalMinutes = min($intervalMinutes, $nearMinutes);
                }
            } catch (Throwable $e) {
                // DB hiccup → keep the normal cadence, never crash the loop.
            }
        }
        // BUDGET GUARD: interval × multiplier — below the SLOWDOWN threshold
        // every soccer poll frequency literally halves.
        $soccerDueAt = $loopStart + ($intervalMinutes * 60 * $mult);
    }

    // ── Low-volume tier: fights + rugby (skipped in outrights-only mode).
    //    events:0 passes are NORMAL — boxing goes weeks between cards and
    //    the NRL board empties between rounds. ─────────────────────────────
    if (!$outOnly && $loopStart >= $lowVolDueAt) {
        try {
            $r = OddsApiSyncService::syncLowVolumePrematch($repo);
            Logger::info('oddsapi lowvolume pass', [
                'sports'   => $r['sports'],
                'events'   => $r['events'], // 0 between cards/rounds — normal, not an error
                'inserted' => $r['inserted'],
                'updated'  => $r['updated'],
                'skipped'  => $r['skipped'],
                'errors'   => count($r['errors']),
            ] + ($r['errors'] !== [] ? ['errorDetail' => $r['errors']] : []), 'oddsapi');
        } catch (Throwable $e) {
            Logger::warning('oddsapi lowvolume pass failed', ['error' => $e->getMessage()], 'oddsapi');
        }
        $intervalMinutes = $lowVolMinutes;
        if ($nearMinutes > 0) {
            try {
                $lowVolKeys = array_merge(
                    OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_FIGHTS),
                    OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_RUGBY)
                );
                if (oddsapiHasKickoffWithinWindow($repo, $nearWindowHours, $lowVolKeys)) {
                    $intervalMinutes = min($intervalMinutes, $nearMinutes);
                }
            } catch (Throwable $e) {
                // DB hiccup → keep the normal cadence, never crash the loop.
            }
        }
        // BUDGET GUARD: same multiplier on the low-volume cadence.
        $lowVolDueAt = $loopStart + ($intervalMinutes * 60 * $mult);
    }

    // ── Outrights tier (keeps polling even in outrights-only mode) ───
    if (OddsApiSyncService::outrightsEnabled() && $loopStart >= $outrightsDueAt) {
        try {
            $r = OddsApiSyncService::syncOutrights($repo);
            Logger::info('oddsapi outrights pass', [
                'sports'   => $r['sports'],
                'active'   => $r['active'],
                'inactive' => $r['inactive'], // seasonal 404s — skipped, not errors
                'events'   => $r['events'],
                'stored'   => $r['stored'],
                'errors'   => count($r['errors']),
            ] + ($r['errors'] !== [] ? ['errorDetail' => $r['errors']] : []), 'oddsapi');
        } catch (Throwable $e) {
            Logger::warning('oddsapi outrights pass failed', ['error' => $e->getMessage()], 'oddsapi');
        }
        // BUDGET GUARD: same multiplier on the outrights cadence.
        $outrightsDueAt = $loopStart + ($outrightMinutes * 60 * $mult);
    }

    // ── Cards tier (skipped in outrights-only mode — it's the costliest
    //    per-event tier, first to shed under budget pressure) ──────────
    if (!$outOnly && OddsApiCardMarketsService::enabled() && $loopStart >= $cardsDueAt) {
        try {
            $r = OddsApiCardMarketsService::syncCardMarkets($repo);
            Logger::info('oddsapi cards pass', [
                'leagues'        => $r['leagues'],
                'eventsInWindow' => $r['eventsInWindow'],
                'matched'        => $r['matched'],
                'unmatched'      => $r['unmatched'],  // fail-closed drops — tune name matching if high
                'ambiguous'      => $r['ambiguous'],
                'fetched'        => $r['fetched'],
                'updated'        => $r['updated'],
                'empty'          => $r['empty'],
                'errors'         => count($r['errors']),
            ] + ($r['errors'] !== [] ? ['errorDetail' => $r['errors']] : []), 'oddsapi');
        } catch (Throwable $e) {
            Logger::warning('oddsapi cards pass failed', ['error' => $e->getMessage()], 'oddsapi');
        }
        // BUDGET GUARD: same multiplier on the cards cadence.
        $cardsDueAt = $loopStart + ($cardsMinutes * 60 * $mult);
    }

    Logger::flush();

    if (time() - $startedAt >= $maxRuntime) {
        Logger::info('oddsapi-worker exiting (max runtime)', ['runtime' => time() - $startedAt], 'oddsapi');
        break;
    }

    for ($s = 0; $s < $tick && !$shutdown; $s++) {
        sleep(1);
        if (function_exists('pcntl_signal_dispatch')) pcntl_signal_dispatch();
    }
}

Logger::info('oddsapi-worker stopped', ['pid' => $pid], 'oddsapi');
Logger::flush();
