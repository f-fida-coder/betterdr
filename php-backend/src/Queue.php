<?php

declare(strict_types=1);

/**
 * Queue — Tier C async work dispatcher.
 *
 * Purpose: get non-critical work (emails, audit logs, ledger fan-out,
 * bonus accrual, webhooks, snapshot refresh) off the request hot path.
 * If the work doesn't need to complete before the user sees a 200, it
 * belongs here.
 *
 * Architecture:
 *   - Producers call Queue::push('handler.name', ['payload' => ...]).
 *   - When Redis is available (REDIS_HOST set + reachable), the job is
 *     LPUSH'd to a Redis list keyed by queue name. A long-running worker
 *     (scripts/queue-worker.php) BRPOPs the list and dispatches.
 *   - When Redis is NOT available, the job is executed SYNCHRONOUSLY
 *     in-process. This preserves current behavior on day 1: nothing
 *     is faster, but nothing is broken either. As soon as Redis is
 *     enabled and the worker is running, the same calls become async.
 *
 * Handler registration:
 *   Queue::register('email.send', function (array $payload) {
 *       (new EmailService())->send($payload['to'], $payload['template'], $payload['data']);
 *   });
 *
 * SAFETY:
 *   - Adding this file does nothing on its own. No caller uses it yet.
 *   - The fallback to synchronous execution means even if a controller
 *     starts using Queue::push() and Redis goes down, the work still
 *     happens — just inline. No data is lost.
 *   - Jobs that throw are NOT silently swallowed in sync mode (errors
 *     bubble to the caller, same as today's inline code).
 *   - In async mode, throwing jobs are logged and pushed to a `failed`
 *     list for human review. They are NOT auto-retried by default to
 *     avoid storms; see Queue::retry() for explicit retry.
 */
final class Queue
{
    /** @var array<string, callable(array<string,mixed>):void> */
    private static array $handlers = [];

    /** @var array<int, string> Default queue names polled by the worker. */
    private const DEFAULT_QUEUES = ['default', 'email', 'audit', 'ledger', 'webhook'];

    private const REDIS_KEY_PREFIX = 'queue:';
    private const FAILED_KEY = 'queue:failed';

    /**
     * Register a handler for a job name. Idempotent — re-registering
     * the same name silently overwrites the prior handler (useful in
     * tests where you may inject a stub).
     *
     * @param callable(array<string,mixed>):void $handler
     */
    public static function register(string $jobName, callable $handler): void
    {
        self::$handlers[$jobName] = $handler;
    }

    /**
     * Push a job onto the queue. Returns true on enqueue OR on synchronous
     * completion. Returns false if the handler is missing AND no Redis is
     * available — caller should treat this as a programming error.
     *
     * @param array<string,mixed> $payload
     */
    public static function push(string $jobName, array $payload = [], string $queue = 'default'): bool
    {
        $job = [
            'job' => $jobName,
            'payload' => $payload,
            'queuedAt' => microtime(true),
            'attempts' => 0,
        ];

        if (self::redisAvailable()) {
            $key = self::REDIS_KEY_PREFIX . $queue;
            $encoded = json_encode($job, JSON_UNESCAPED_SLASHES);
            if ($encoded === false) {
                return false;
            }
            $client = self::redisClient();
            try {
                $client->lpush($key, $encoded);
                return true;
            } catch (\Throwable $e) {
                self::logFailure('push', $jobName, $e);
                // Fall through to sync execution as the safety net.
            }
        }

        return self::runSync($jobName, $payload);
    }

    /**
     * Pop one job and dispatch it. Used by the worker loop. Returns
     * null if the queue was empty within $blockSeconds, or the job
     * envelope (post-execution) if one was processed.
     *
     * @return array<string,mixed>|null
     */
    public static function popAndRun(array $queues = self::DEFAULT_QUEUES, int $blockSeconds = 5): ?array
    {
        if (!self::redisAvailable()) {
            // Without Redis there's nothing to pop — sleep briefly so
            // a misconfigured worker doesn't busy-loop the CPU.
            sleep(max(1, $blockSeconds));
            return null;
        }

        $keys = array_map(fn(string $q): string => self::REDIS_KEY_PREFIX . $q, $queues);
        $client = self::redisClient();

        try {
            // BRPOP blocks for up to $blockSeconds, returns [key, value].
            $popped = $client->brpop($keys, $blockSeconds);
        } catch (\Throwable $e) {
            self::logFailure('brpop', '*', $e);
            sleep(1);
            return null;
        }

        if (!is_array($popped) || count($popped) < 2) {
            return null;
        }
        $raw = (string) $popped[1];
        $job = json_decode($raw, true);
        if (!is_array($job) || !isset($job['job'])) {
            self::logFailure('decode', '?', new \RuntimeException('malformed job: ' . substr($raw, 0, 200)));
            return null;
        }

        $jobName = (string) $job['job'];
        $payload = is_array($job['payload'] ?? null) ? $job['payload'] : [];
        $job['startedAt'] = microtime(true);

        try {
            self::runSync($jobName, $payload);
            $job['completedAt'] = microtime(true);
            $job['durationMs'] = (int) round(($job['completedAt'] - $job['startedAt']) * 1000);
            return $job;
        } catch (\Throwable $e) {
            $job['attempts'] = (int) ($job['attempts'] ?? 0) + 1;
            $job['error'] = $e->getMessage();
            $job['failedAt'] = microtime(true);
            self::logFailure('run', $jobName, $e);
            try {
                $client->lpush(self::FAILED_KEY, (string) json_encode($job, JSON_UNESCAPED_SLASHES));
            } catch (\Throwable $_) {
                // failed-list push failed too — log already emitted above.
            }
            return $job;
        }
    }

    /**
     * Re-enqueue a job from the failed list. Caller passes the JSON
     * envelope they read out of the failed list (e.g., via redis-cli).
     */
    public static function retry(string $rawJob, string $queue = 'default'): bool
    {
        $decoded = json_decode($rawJob, true);
        if (!is_array($decoded) || !isset($decoded['job'])) {
            return false;
        }
        return self::push((string) $decoded['job'], (array) ($decoded['payload'] ?? []), $queue);
    }

    /**
     * For health checks / admin endpoints.
     *
     * @return array<string,mixed>
     */
    public static function status(array $queues = self::DEFAULT_QUEUES): array
    {
        if (!self::redisAvailable()) {
            return [
                'mode' => 'sync',
                'reason' => 'Redis unavailable; jobs run inline',
                'queues' => [],
                'failed' => 0,
                'handlers' => array_keys(self::$handlers),
            ];
        }
        $client = self::redisClient();
        $depths = [];
        try {
            foreach ($queues as $q) {
                $depths[$q] = (int) $client->llen(self::REDIS_KEY_PREFIX . $q);
            }
            $failed = (int) $client->llen(self::FAILED_KEY);
        } catch (\Throwable $e) {
            return ['mode' => 'sync', 'reason' => 'Redis error: ' . $e->getMessage()];
        }

        return [
            'mode' => 'async',
            'queues' => $depths,
            'failed' => $failed,
            'handlers' => array_keys(self::$handlers),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param array<string,mixed> $payload
     */
    private static function runSync(string $jobName, array $payload): bool
    {
        $handler = self::$handlers[$jobName] ?? null;
        if ($handler === null) {
            self::logFailure('dispatch', $jobName, new \RuntimeException('No handler registered'));
            return false;
        }
        $handler($payload);
        return true;
    }

    private static function redisAvailable(): bool
    {
        if (!class_exists('RedisCache')) {
            return false;
        }
        $status = RedisCache::status();
        return ($status['enabled'] ?? false) === true;
    }

    /**
     * Reach into RedisCache for the underlying \Redis client. We read
     * via reflection rather than adding a public getter to RedisCache
     * because we don't want random callers grabbing the connection.
     */
    private static function redisClient(): \Redis
    {
        $ref = new \ReflectionClass(RedisCache::class);
        $prop = $ref->getProperty('client');
        $prop->setAccessible(true);
        $client = $prop->getValue();
        if (!$client instanceof \Redis) {
            throw new \RuntimeException('Redis client unavailable');
        }
        return $client;
    }

    private static function logFailure(string $op, string $jobName, \Throwable $e): void
    {
        if (!class_exists('Logger')) {
            return;
        }
        try {
            Logger::warning('queue_' . $op, [
                'job' => $jobName,
                'error' => $e->getMessage(),
                'class' => get_class($e),
            ]);
        } catch (\Throwable $_) {
            // logger failed — intentionally silent
        }
    }
}
