<?php

declare(strict_types=1);

/**
 * Two-tier query-result cache.
 *
 * Previously an in-process array — useful only within a single request,
 * and on a 60-worker shared-hosting setup this meant each worker built
 * its own cache from scratch. The same hot read was executed up to 60
 * times before all workers warmed up.
 *
 * Now APCu (PHP shared memory) is the primary store, so a single read
 * populates the cache for every worker on the server. The in-process
 * array is kept as a tiny L1 to skip APCu overhead when the same key
 * is looked up repeatedly in one request.
 *
 * Usage (unchanged):
 *   $cache = QueryCache::getInstance();
 *   $results = $cache->remember('matches:all', 30, fn() => $db->findMany('matches', []));
 */
final class QueryCache
{
    private static ?self $instance = null;

    /** L1: per-request in-process cache. */
    /** @var array<string, array{data: mixed, expires_at: int}> */
    private array $l1 = [];

    /** @var bool */
    private bool $apcu;

    private const MAX_L1_ENTRIES = 256;

    private function __construct()
    {
        $this->apcu = function_exists('apcu_enabled') && apcu_enabled();
    }

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
     * @param string $key
     * @param int $ttlSeconds
     * @param callable(): T $callback
     * @return T
     */
    public function remember(string $key, int $ttlSeconds, callable $callback): mixed
    {
        $cached = $this->get($key);
        if ($cached !== null) {
            return $cached;
        }

        $value = $callback();
        $this->set($key, $value, $ttlSeconds);
        return $value;
    }

    /**
     * Store a value. TTL applies to both tiers.
     */
    public function set(string $key, mixed $value, int $ttlSeconds): void
    {
        $expiresAt = time() + $ttlSeconds;

        if (count($this->l1) >= self::MAX_L1_ENTRIES) {
            array_shift($this->l1);
        }
        $this->l1[$key] = ['data' => $value, 'expires_at' => $expiresAt];

        if ($this->apcu) {
            // A null sentinel lets us distinguish a cached null from a miss.
            apcu_store($this->apcuKey($key), ['v' => $value], $ttlSeconds);
        }
    }

    /**
     * Get cached value or null on miss.
     * Returns null for both "not cached" and "cached null" — callers using
     * remember() don't need to distinguish.
     */
    public function get(string $key): mixed
    {
        if (isset($this->l1[$key])) {
            $entry = $this->l1[$key];
            if (time() < $entry['expires_at']) {
                return $entry['data'];
            }
            unset($this->l1[$key]);
        }

        if ($this->apcu) {
            $success = false;
            $raw = apcu_fetch($this->apcuKey($key), $success);
            if ($success && is_array($raw) && array_key_exists('v', $raw)) {
                $value = $raw['v'];
                $this->l1[$key] = ['data' => $value, 'expires_at' => time() + 5];
                return $value;
            }
        }

        return null;
    }

    public function has(string $key): bool
    {
        if (isset($this->l1[$key]) && time() < $this->l1[$key]['expires_at']) {
            return true;
        }
        return $this->apcu && apcu_exists($this->apcuKey($key));
    }

    public function forget(string $key): void
    {
        unset($this->l1[$key]);
        if ($this->apcu) {
            apcu_delete($this->apcuKey($key));
        }
    }

    /**
     * Clear all cache entries matching a glob-style pattern (e.g., 'bets:123:*').
     */
    public function forgetPattern(string $pattern): void
    {
        $regex = '/^' . str_replace('\*', '.*', preg_quote($pattern, '/')) . '$/';

        foreach (array_keys($this->l1) as $key) {
            if (preg_match($regex, $key)) {
                unset($this->l1[$key]);
            }
        }

        if ($this->apcu && class_exists('APCuIterator')) {
            $prefix = $this->apcuPrefix();
            $apcuRegex = '/^' . preg_quote($prefix, '/')
                . str_replace('\*', '.*', preg_quote($pattern, '/')) . '$/';
            $iterator = new APCuIterator($apcuRegex, APC_ITER_KEY);
            foreach ($iterator as $item) {
                apcu_delete($item['key']);
            }
        }
    }

    public function flush(): void
    {
        $this->l1 = [];
        if ($this->apcu && class_exists('APCuIterator')) {
            $prefix = $this->apcuPrefix();
            $iterator = new APCuIterator('/^' . preg_quote($prefix, '/') . '/', APC_ITER_KEY);
            foreach ($iterator as $item) {
                apcu_delete($item['key']);
            }
        }
    }

    public function stats(): array
    {
        $now = time();
        $active = 0;
        foreach ($this->l1 as $entry) {
            if ($now < $entry['expires_at']) {
                $active++;
            }
        }
        return [
            'l1_entries'  => count($this->l1),
            'l1_active'   => $active,
            'l1_max'      => self::MAX_L1_ENTRIES,
            'apcu_enabled' => $this->apcu,
        ];
    }

    private function apcuPrefix(): string
    {
        return 'qc:';
    }

    private function apcuKey(string $key): string
    {
        return $this->apcuPrefix() . $key;
    }
}
