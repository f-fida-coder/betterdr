<?php

declare(strict_types=1);

/**
 * Rundown WebSocket real-time daemon.
 *
 * Long-running CLI process that holds a persistent connection to
 * wss://therundown.io/api/v2/ws/markets and applies every market_price
 * message into the matches collection. Sub-second odds freshness for
 * the books / sports / markets configured via env.
 *
 * Designed to be started by scripts/rundown-ws-watchdog.sh — a 1-min
 * cron line restarts the daemon if it dies. Same operational pattern
 * as odds-worker.php.
 *
 * If RUNDOWN_WS_ENABLED=false (default in production until ops opts in)
 * or RUNDOWN_API_KEY is blank, the daemon exits cleanly so the watchdog
 * doesn't loop-restart.
 *
 * Reconnect strategy:
 *   - exponential backoff capped at RUNDOWN_WS_RECONNECT_MAX_SECONDS
 *   - on prolonged silence (no frames for > 60 s) the connection is
 *     considered dead and we reconnect (Rundown sends heartbeats every
 *     15 s, so 60 s of silence is anomalous)
 *
 * REST polling stays running alongside this — WS is a freshness booster
 * over the 5 s market-delta poll, NOT a replacement. Upstream's 256-
 * message per-client buffer can drop messages on slow links; the REST
 * gap-filler catches anything WS misses.
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
require_once $phpBackendDir . '/src/RundownWsClient.php';

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

$enabled = strtolower((string) Env::get('RUNDOWN_WS_ENABLED', 'true')) !== 'false';
$apiKey  = trim((string) Env::get('RUNDOWN_API_KEY', ''));

if (!$enabled) {
    fwrite(STDOUT, "[rundown-ws] RUNDOWN_WS_ENABLED=false; exiting cleanly\n");
    exit(0);
}
if ($apiKey === '') {
    fwrite(STDOUT, "[rundown-ws] RUNDOWN_API_KEY not set; exiting (watchdog will retry)\n");
    sleep(30);
    exit(0);
}
if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[rundown-ws] pdo_mysql extension required\n");
    exit(1);
}

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

// Filters from env. Empty values omitted in WS URL.
$wsUrl = trim((string) Env::get('RUNDOWN_WS_URL', 'wss://therundown.io/api/v2/ws/markets'));
$filters = [
    'sport_ids'     => trim((string) Env::get('RUNDOWN_WS_SPORT_IDS', '')),
    'market_ids'    => trim((string) Env::get('RUNDOWN_WS_MARKET_IDS', RundownMarketMap::csvForCore())),
    'affiliate_ids' => trim((string) Env::get('RUNDOWN_WS_AFFILIATE_IDS', (string) Env::get('RUNDOWN_AFFILIATE_IDS', ''))),
    'event_ids'     => trim((string) Env::get('RUNDOWN_WS_EVENT_IDS', '')),
];

$silenceTimeoutSec       = max(30,  (int) Env::get('RUNDOWN_WS_SILENCE_TIMEOUT_SECONDS', '60'));
$reconnectMinSec         = max(1,   (int) Env::get('RUNDOWN_WS_RECONNECT_MIN_SECONDS', '2'));
$reconnectMaxSec         = max(5,   (int) Env::get('RUNDOWN_WS_RECONNECT_MAX_SECONDS', '60'));
$readTimeoutMs           = max(100, (int) Env::get('RUNDOWN_WS_READ_TIMEOUT_MS', '1000'));
$logEverySec             = max(10,  (int) Env::get('RUNDOWN_WS_LOG_EVERY_SECONDS', '60'));
$maxRuntimeSec           = max(300, (int) Env::get('RUNDOWN_WS_MAX_RUNTIME_SECONDS', '21600')); // 6h

$shutdown = false;
if (function_exists('pcntl_signal')) {
    pcntl_async_signals(true);
    pcntl_signal(SIGTERM, static function () use (&$shutdown): void { $shutdown = true; });
    pcntl_signal(SIGINT,  static function () use (&$shutdown): void { $shutdown = true; });
}

$pid       = getmypid();
$startedAt = time();
$backoff   = $reconnectMinSec;
$applied   = 0;
$heartbeats = 0;
$skipped   = 0;
$lastStatusLog = time();

fwrite(STDOUT, "[rundown-ws] pid={$pid} starting\n");
Logger::info('rundown-ws daemon started', [
    'pid'     => $pid,
    'filters' => $filters,
    'url'     => preg_replace('#key=[^&]+#', 'key=[redacted]', $wsUrl),
], 'sportsbook');
Logger::flush();

while (!$shutdown) {
    if ((time() - $startedAt) >= $maxRuntimeSec) {
        Logger::info('rundown-ws voluntary restart (max runtime)', ['runtime' => time() - $startedAt], 'sportsbook');
        Logger::flush();
        break;
    }

    $client = new RundownWsClient($apiKey, $filters, $wsUrl);
    if (!$client->connect()) {
        Logger::warning('rundown-ws connect failed', [
            'error'   => $client->lastError(),
            'backoff' => $backoff,
        ], 'sportsbook');
        Logger::flush();
        sleep(min($backoff, $reconnectMaxSec));
        $backoff = min($backoff * 2, $reconnectMaxSec);
        continue;
    }
    Logger::info('rundown-ws connected', $client->describe(), 'sportsbook');
    Logger::flush();
    $backoff = $reconnectMinSec; // reset on successful connect

    while (!$shutdown && $client->isConnected()) {
        // Drain any queued frames from the previous read first.
        $msg = $client->drain();
        if ($msg === null) {
            $msg = $client->read($readTimeoutMs);
        }

        if ($msg !== null) {
            $type = (string) ($msg['meta']['type'] ?? '');
            if ($type === 'heartbeat') {
                $heartbeats++;
            } elseif ($type === 'market_price') {
                try {
                    if (RundownSyncService::applyWsMessage($repo, $msg)) {
                        $applied++;
                    } else {
                        $skipped++;
                    }
                } catch (Throwable $e) {
                    Logger::warning('rundown-ws apply error', [
                        'error' => $e->getMessage(),
                    ], 'sportsbook');
                }
            }
        }

        // Silence detection — Rundown sends a heartbeat every 15 s, so
        // 60 s with no frames means the connection is wedged. Reconnect.
        $age = $client->lastFrameAgeSeconds();
        if ($age > $silenceTimeoutSec) {
            Logger::warning('rundown-ws silence timeout', [
                'lastFrameAgeSec' => $age,
                'applied'         => $applied,
            ], 'sportsbook');
            $client->close();
            break;
        }

        // Periodic status line.
        if ((time() - $lastStatusLog) >= $logEverySec) {
            Logger::info('rundown-ws status', [
                'applied'     => $applied,
                'skipped'     => $skipped,
                'heartbeats'  => $heartbeats,
                'lastFrameAgeSec' => $age,
                'quota'       => RundownClient::latestQuotaSnapshot(),
            ], 'sportsbook');
            Logger::flush();
            $lastStatusLog = time();
        }
    }

    $client->close();
    if (!$shutdown) {
        Logger::info('rundown-ws disconnected, reconnecting', [
            'backoff' => $backoff,
            'lastError' => $client->lastError(),
        ], 'sportsbook');
        Logger::flush();
        sleep($backoff);
        $backoff = min($backoff * 2, $reconnectMaxSec);
    }
}

fwrite(STDOUT, "[rundown-ws] pid={$pid} exiting cleanly (applied={$applied})\n");
Logger::info('rundown-ws daemon exiting', [
    'applied' => $applied,
    'skipped' => $skipped,
    'heartbeats' => $heartbeats,
    'runtime' => time() - $startedAt,
], 'sportsbook');
Logger::flush();
exit(0);
