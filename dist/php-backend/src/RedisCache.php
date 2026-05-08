<?php

declare(strict_types=1);

/**
 * RedisCache — lightweight, optional Redis layer that NEVER fails the request.
 *
 * Design contract (Tier B):
 *   1. If the Redis extension is missing OR REDIS_HOST is unset OR Redis is
 *      unreachable, every method becomes a NO-OP and `get()` returns null.
 *      Callers ALWAYS treat null as a cache miss and fall through to their
 *      existing data source (DB, SharedFileCache, etc).
 *   2. The wrapper never throws. Connection errors, serialization errors,
 *      and TTL conflicts are all logged once and swallowed.
 *   3. The connection is established lazily on first use and reused for the
 *      life of the request. We do NOT keep persistent connections — that's
 *      a future optimization once we know the access pattern.
 *
 * SAFETY:
 *   - Adding this file does nothing on its own. No controller imports it yet.
 *   - To enable in a controller, replace the read path with:
 *         $cached = RedisCache::get($key);
 *         if ($cached !== null) return $cached;
 *         $value = $existingDbReadCode();
 *         RedisCache::set($key, $value, 30);
 *         return $value;
 *   - To disable globally with zero code change, set REDIS_HOST='' in env
 *     and reload php-fpm. Every call becomes a no-op.
 *
 * ENV VARIABLES:
 *   REDIS_HOST       (default: '' — meaning "Redis disabled")
 *   REDIS_PORT       (default: 6379)
 *   REDIS_PASSWORD   (default: '' — no auth)
 *   REDIS_DATABASE   (default: 0)
 *   REDIS_PREFIX     (default: 'betterdr:' — keeps keys namespaced if you
 *                    share the Redis instance with another app)
 *   REDIS_TIMEOUT_MS (default: 100 — conservative; we'd rather miss the
 *                    cache than block the request on a slow Redis)
 */
final class RedisCache
{
    /** @var \Redis|null */
    private static $client = null;
    /** @var bool|null  null=untried, true=connected, false=disabled/failed */
    private static ?bool $available = null;
    private static bool $loggedFailure = false;

    /**
     * Read a key. Returns null on miss, on disable, or on any error.
     *
     * @return mixed
     */
    public static function get(string $key)
    {
        if (!self::isAvailable()) {
            return null;
        }
        try {
            $raw = self::$client->get(self::prefixedKey($key));
            if (!is_string($raw) || $raw === '') {
                return null;
            }
            $decoded = self::decode($raw);
            return $decoded === false ? null : $decoded;
        } catch (\Throwable $e) {
            self::logOnce('get', $e);
            return null;
        }
    }

    /**
     * Write a key with TTL in seconds. Silently no-ops if Redis is unavailable.
     *
     * @param mixed $value
     */
    public static function set(string $key, $value, int $ttlSeconds): bool
    {
        if (!self::isAvailable() || $ttlSeconds <= 0) {
            return false;
        }
        try {
            $encoded = self::encode($value);
            if ($encoded === false) {
                return false;
            }
            return (bool) self::$client->setex(
                self::prefixedKey($key),
                max(1, $ttlSeconds),
                $encoded
            );
        } catch (\Throwable $e) {
            self::logOnce('set', $e);
            return false;
        }
    }

    /**
     * Read-through: hit cache, on miss invoke $callback, write the result,
     * return it. Mirrors SharedFileCache::remember() so swap-over is
     * mechanical: just change the class name in the caller.
     *
     * If Redis is unavailable, simply invokes $callback every time without
     * caching — preserves correctness, sacrifices the optimization.
     *
     * @param callable(): mixed $callback
     * @return mixed
     */
    public static function remember(string $key, int $ttlSeconds, callable $callback)
    {
        $cached = self::get($key);
        if ($cached !== null) {
            return $cached;
        }
        $value = $callback();
        if ($value !== null) {
            self::set($key, $value, $ttlSeconds);
        }
        return $value;
    }

    /**
     * Delete a key. Returns true if Redis acknowledged the delete OR if
     * Redis is disabled (the key trivially doesn't exist there).
     */
    public static function delete(string $key): bool
    {
        if (!self::isAvailable()) {
            return true;
        }
        try {
            self::$client->del(self::prefixedKey($key));
            return true;
        } catch (\Throwable $e) {
            self::logOnce('delete', $e);
            return false;
        }
    }

    /**
     * Bulk delete by prefix (useful for invalidating "user:123:*" patterns).
     * Uses SCAN to avoid blocking the Redis instance with KEYS.
     */
    public static function deletePrefix(string $prefix): int
    {
        if (!self::isAvailable()) {
            return 0;
        }
        $pattern = self::prefixedKey($prefix) . '*';
        $deleted = 0;
        try {
            $cursor = null;
            // SCAN signature: client->scan(&$cursor, $pattern, $count)
            while (($keys = self::$client->scan($cursor, $pattern, 200)) !== false) {
                if (is_array($keys) && count($keys) > 0) {
                    $deleted += (int) self::$client->del($keys);
                }
                if ($cursor === 0 || $cursor === null) {
                    break;
                }
            }
        } catch (\Throwable $e) {
            self::logOnce('deletePrefix', $e);
        }
        return $deleted;
    }

    /**
     * For health checks / admin status pages.
     *
     * @return array<string, mixed>
     */
    public static function status(): array
    {
        $host = (string) Env::get('REDIS_HOST', '');
        if ($host === '') {
            return ['enabled' => false, 'reason' => 'REDIS_HOST not set'];
        }
        if (!class_exists('\\Redis')) {
            return ['enabled' => false, 'reason' => 'phpredis extension missing'];
        }
        if (!self::isAvailable()) {
            return ['enabled' => false, 'reason' => 'connection failed'];
        }
        try {
            $info = self::$client->info('server');
            return [
                'enabled' => true,
                'host' => $host,
                'version' => $info['redis_version'] ?? 'unknown',
                'uptime_sec' => (int) ($info['uptime_in_seconds'] ?? 0),
            ];
        } catch (\Throwable $e) {
            return ['enabled' => false, 'reason' => 'INFO failed: ' . $e->getMessage()];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    private static function isAvailable(): bool
    {
        if (self::$available !== null) {
            return self::$available;
        }
        $host = trim((string) Env::get('REDIS_HOST', ''));
        if ($host === '' || !class_exists('\\Redis')) {
            self::$available = false;
            return false;
        }
        try {
            $client = new \Redis();
            $port = (int) Env::get('REDIS_PORT', '6379');
            $timeoutMs = (int) Env::get('REDIS_TIMEOUT_MS', '100');
            $timeoutSec = max(0.01, $timeoutMs / 1000.0);

            $connected = @$client->connect($host, $port > 0 ? $port : 6379, $timeoutSec);
            if (!$connected) {
                self::$available = false;
                return false;
            }
            $password = (string) Env::get('REDIS_PASSWORD', '');
            if ($password !== '' && !@$client->auth($password)) {
                self::$available = false;
                return false;
            }
            $database = (int) Env::get('REDIS_DATABASE', '0');
            if ($database !== 0) {
                @$client->select($database);
            }
            self::$client = $client;
            self::$available = true;
            return true;
        } catch (\Throwable $e) {
            self::logOnce('connect', $e);
            self::$available = false;
            return false;
        }
    }

    private static function prefixedKey(string $key): string
    {
        $prefix = (string) Env::get('REDIS_PREFIX', 'betterdr:');
        return $prefix . $key;
    }

    /**
     * @param mixed $value
     * @return string|false
     */
    private static function encode($value)
    {
        // Use json for arrays/scalars (interoperable, debuggable in redis-cli).
        // Fall back to serialize() only when JSON would lose data (e.g.,
        // objects). We keep encoded values prefixed with a 1-char tag so
        // decode can route correctly.
        if (is_array($value) || is_scalar($value) || $value === null) {
            $json = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($json === false) {
                return false;
            }
            return 'J' . $json;
        }
        $serialized = @serialize($value);
        return $serialized === false ? false : 'S' . $serialized;
    }

    /**
     * @return mixed|false
     */
    private static function decode(string $raw)
    {
        if ($raw === '') {
            return false;
        }
        $tag = $raw[0];
        $body = substr($raw, 1);
        if ($tag === 'J') {
            $decoded = json_decode($body, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : false;
        }
        if ($tag === 'S') {
            $decoded = @unserialize($body, ['allowed_classes' => false]);
            return $decoded === false && $body !== 'b:0;' ? false : $decoded;
        }
        // Legacy / untagged value — try JSON, then return raw as last resort.
        $decoded = json_decode($raw, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $raw;
    }

    private static function logOnce(string $op, \Throwable $e): void
    {
        if (self::$loggedFailure) {
            return;
        }
        self::$loggedFailure = true;
        if (class_exists('Logger')) {
            try {
                Logger::warning('redis_cache_' . $op, [
                    'error' => $e->getMessage(),
                    'class' => get_class($e),
                ]);
            } catch (\Throwable $_) {
                // logger itself failing — give up silently
            }
        }
    }
}
