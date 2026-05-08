<?php

declare(strict_types=1);

/**
 * queue-worker.php — Tier C async job consumer.
 *
 * Run this as a long-lived process (systemd, supervisord, or a tmux
 * session for testing) on the same box as Redis. It blocks on BRPOP,
 * dispatches jobs through Queue::popAndRun(), and exits cleanly on
 * SIGTERM so deploys can rotate workers without losing in-flight work.
 *
 * USAGE:
 *   php scripts/queue-worker.php                          # all default queues
 *   php scripts/queue-worker.php --queues=email,audit     # subset
 *   php scripts/queue-worker.php --max-jobs=1000          # exit after N jobs
 *   php scripts/queue-worker.php --max-runtime=3600       # exit after N seconds
 *
 * OPERATIONS:
 *   - Worker exits 0 on graceful shutdown (signal or limit). Your
 *     supervisor should restart it.
 *   - Worker exits 1 on unrecoverable startup error (Redis unavailable,
 *     handlers failed to register). Check stderr.
 *   - The --max-jobs and --max-runtime flags exist so workers can be
 *     recycled before they leak memory or hold a stale Redis connection.
 *
 * RECOMMENDED systemd UNIT (place at /etc/systemd/system/betterdr-worker.service):
 *
 *     [Unit]
 *     Description=Betterdr async queue worker
 *     After=redis.service
 *     Requires=redis.service
 *
 *     [Service]
 *     Type=simple
 *     User=www-data
 *     WorkingDirectory=/var/www/betterdr/php-backend
 *     ExecStart=/usr/bin/php scripts/queue-worker.php --max-jobs=2000 --max-runtime=900
 *     Restart=always
 *     RestartSec=2
 *     StandardOutput=append:/var/log/betterdr/queue-worker.log
 *     StandardError=append:/var/log/betterdr/queue-worker.err
 *
 *     [Install]
 *     WantedBy=multi-user.target
 *
 * SAFETY:
 *   - If Redis is not available, Queue::popAndRun() sleeps and returns
 *     null. The worker stays alive but does no work — same outcome as
 *     not running it at all.
 *   - Existing controllers do NOT use Queue yet. This worker only
 *     processes jobs once you start calling Queue::push() somewhere.
 */

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);

require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
require_once $phpBackendDir . '/src/Logger.php';
require_once $phpBackendDir . '/src/RedisCache.php';
require_once $phpBackendDir . '/src/Queue.php';

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

// ─── Argument parsing ────────────────────────────────────────────────────────
$opts = getopt('', ['queues::', 'max-jobs::', 'max-runtime::']) ?: [];
$queues = isset($opts['queues']) && $opts['queues'] !== ''
    ? array_values(array_filter(array_map('trim', explode(',', (string) $opts['queues']))))
    : ['default', 'email', 'audit', 'ledger', 'webhook'];
$maxJobs = isset($opts['max-jobs']) ? max(1, (int) $opts['max-jobs']) : 0;
$maxRuntime = isset($opts['max-runtime']) ? max(1, (int) $opts['max-runtime']) : 0;

// ─── Register handlers ───────────────────────────────────────────────────────
// Each handler is a small closure that calls into existing services. To
// add a new job type:
//   1. Implement the handler logic in a service class
//   2. Register it here with a unique job name
//   3. Producers call Queue::push('your.job.name', $payload)
//
// As of Tier C ship, no handlers are wired in yet — the queue exists,
// the worker exists, but the rest of the codebase still calls these
// services synchronously. Wire handlers gradually, one at a time, with
// monitoring at each step.

Queue::register('noop.ping', static function (array $payload): void {
    // Used by tests + monitoring to confirm the worker is alive.
    fwrite(STDERR, sprintf("[worker] noop.ping payload=%s\n", json_encode($payload)));
});

// Example handlers — uncomment when ready to wire in. Each one needs the
// matching service class to exist and the producer to switch from inline
// to Queue::push().
//
// Queue::register('email.send', static function (array $payload): void {
//     EmailService::send($payload);
// });
//
// Queue::register('audit.write', static function (array $payload): void {
//     AuditLogger::record($payload);
// });
//
// Queue::register('ledger.fanout', static function (array $payload): void {
//     LedgerFanout::process($payload);
// });

// ─── Signal handling ─────────────────────────────────────────────────────────
$shouldStop = false;
if (function_exists('pcntl_signal') && function_exists('pcntl_async_signals')) {
    pcntl_async_signals(true);
    $shutdown = static function (int $sig) use (&$shouldStop): void {
        fwrite(STDERR, sprintf("[worker] received signal=%d, draining\n", $sig));
        $shouldStop = true;
    };
    pcntl_signal(SIGTERM, $shutdown);
    pcntl_signal(SIGINT, $shutdown);
}

// ─── Main loop ───────────────────────────────────────────────────────────────
$status = Queue::status($queues);
fwrite(STDERR, sprintf("[worker] starting mode=%s queues=%s\n",
    $status['mode'] ?? 'unknown', implode(',', $queues)));

if (($status['mode'] ?? 'sync') === 'sync') {
    fwrite(STDERR, "[worker] Redis unavailable — worker will idle. Set REDIS_HOST and restart.\n");
    // Don't exit 1 — supervisor would restart-loop. Idle is the safe state.
}

$startedAt = time();
$processed = 0;

while (!$shouldStop) {
    if ($maxJobs > 0 && $processed >= $maxJobs) {
        fwrite(STDERR, sprintf("[worker] max-jobs=%d reached, exiting\n", $maxJobs));
        break;
    }
    if ($maxRuntime > 0 && (time() - $startedAt) >= $maxRuntime) {
        fwrite(STDERR, sprintf("[worker] max-runtime=%ds reached, exiting\n", $maxRuntime));
        break;
    }

    $job = Queue::popAndRun($queues, 5);
    if ($job === null) {
        continue;
    }
    $processed++;
    if (isset($job['error'])) {
        fwrite(STDERR, sprintf("[worker] FAILED job=%s error=%s\n",
            $job['job'] ?? '?', $job['error']));
    } else {
        $duration = $job['durationMs'] ?? 0;
        fwrite(STDERR, sprintf("[worker] OK job=%s duration_ms=%d\n",
            $job['job'] ?? '?', $duration));
    }
}

fwrite(STDERR, sprintf("[worker] shutdown processed=%d uptime_s=%d\n",
    $processed, time() - $startedAt));
exit(0);
