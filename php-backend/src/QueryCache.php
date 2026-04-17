<?php

declare(strict_types=1);

/**
 * Simple in-memory query result cache with TTL support.
 * Reduces database load during high concurrency by caching frequently-accessed data.
 * 
 * Usage:
 *   $cache = QueryCache::getInstance();
 *   $results = $cache->remember('matches:all', 30, fn() => $db->findMany('matches', []));
 */
final class QueryCache
{
    private static ?self $instance = null;
    /** @var array<string, array{data: mixed, expires_at: int}> */
    private array $store = [];
    private const MAX_ENTRIES = 1000;

    private function __construct() {}

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get cached value or compute and cache it.
     * 
     * @template T
     * @param string $key Cache key
     * @param int $ttlSeconds Time to live in seconds
     * @param callable(): T $callback Function to compute value if not cached
     * @return T
     */
    public function remember(string $key, int $ttlSeconds, callable $callback): mixed
    {
        // Check if key exists and hasn't expired
        if (isset($this->store[$key])) {
            $entry = $this->store[$key];
            if (time() < $entry['expires_at']) {
                return $entry['data'];
            }
            // Expired, remove it
            unset($this->store[$key]);
        }

        // Compute new value
        $value = $callback();

        // Store with expiration
        $this->set($key, $value, $ttlSeconds);

        return $value;
    }

    /**
     * Store a value in cache.
     */
    public function set(string $key, mixed $value, int $ttlSeconds): void
    {
        // Prevent cache bloat - simple LRU eviction
        if (count($this->store) >= self::MAX_ENTRIES) {
            array_shift($this->store);
        }

        $this->store[$key] = [
            'data' => $value,
            'expires_at' => time() + $ttlSeconds,
        ];
    }

    /**
     * Get cached value directly.
     */
    public function get(string $key): mixed
    {
        if (!isset($this->store[$key])) {
            return null;
        }

        $entry = $this->store[$key];
        if (time() >= $entry['expires_at']) {
            unset($this->store[$key]);
            return null;
        }

        return $entry['data'];
    }

    /**
     * Check if key exists and is not expired.
     */
    public function has(string $key): bool
    {
        return $this->get($key) !== null;
    }

    /**
     * Remove a cached value.
     */
    public function forget(string $key): void
    {
        unset($this->store[$key]);
    }

    /**
     * Clear all cache entries matching a pattern.
     * 
     * @param string $pattern Pattern to match keys against (e.g., 'matches:*')
     */
    public function forgetPattern(string $pattern): void
    {
        $regex = str_replace('\*', '.*', preg_quote($pattern, '/'));
        foreach (array_keys($this->store) as $key) {
            if (preg_match('/^' . $regex . '$/', $key)) {
                unset($this->store[$key]);
            }
        }
    }

    /**
     * Clear all cache.
     */
    public function flush(): void
    {
        $this->store = [];
    }

    /**
     * Get cache statistics for monitoring.
     */
    public function stats(): array
    {
        $entries = count($this->store);
        $expired = 0;
        $now = time();

        foreach ($this->store as $entry) {
            if ($now >= $entry['expires_at']) {
                $expired++;
            }
        }

        return [
            'total_entries' => $entries,
            'expired_entries' => $expired,
            'active_entries' => $entries - $expired,
            'max_entries' => self::MAX_ENTRIES,
            'usage_percent' => $entries > 0 ? round(($entries / self::MAX_ENTRIES) * 100, 2) : 0,
        ];
    }
}
