<?php

declare(strict_types=1);

final class SharedFileCache
{
    private const APCU_KEY_PREFIX = 'shared_file_cache:';

    /**
     * @return array<string, mixed>|null
     */
    public static function get(string $namespace, string $key, int $ttlSeconds): ?array
    {
        $apcuKey = self::apcuKey($namespace, $key);
        if ($apcuKey !== null) {
            $ok = false;
            $cached = apcu_fetch($apcuKey, $ok);
            if ($ok && is_array($cached)) {
                return $cached;
            }
        }

        $cacheFile = self::cacheFile($namespace, $key);
        if (!is_file($cacheFile)) {
            return null;
        }

        $modifiedAt = @filemtime($cacheFile);
        if (!is_int($modifiedAt) || (time() - $modifiedAt) > max(1, $ttlSeconds)) {
            @unlink($cacheFile);
            return null;
        }

        $raw = @file_get_contents($cacheFile);
        if (!is_string($raw) || $raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            @unlink($cacheFile);
            return null;
        }

        if ($apcuKey !== null) {
            @apcu_store($apcuKey, $decoded, max(1, $ttlSeconds));
        }

        return $decoded;
    }

    /**
     * Read cached data without enforcing TTL or deleting the file.
     * Useful as a stale-cache fallback when fresh data is unavailable.
     *
     * @return array<string, mixed>|null
     */
    public static function peek(string $namespace, string $key): ?array
    {
        $cacheFile = self::cacheFile($namespace, $key);
        if (!is_file($cacheFile)) {
            return null;
        }
        $raw = @file_get_contents($cacheFile);
        if (!is_string($raw) || $raw === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param callable(): array<string, mixed> $callback
     * @return array<string, mixed>
     */
    public static function remember(string $namespace, string $key, int $ttlSeconds, callable $callback): array
    {
        $cached = self::get($namespace, $key, $ttlSeconds);
        if (is_array($cached)) {
            return $cached;
        }

        self::ensureCacheDir();
        $lockHandle = @fopen(self::lockFile($namespace, $key), 'c');
        if ($lockHandle === false) {
            return self::store($namespace, $key, $callback());
        }

        try {
            // Non-blocking attempt first: if another worker already holds the lock,
            // return stale data immediately rather than queuing all workers behind one DB query.
            if (!@flock($lockHandle, LOCK_EX | LOCK_NB)) {
                $stale = self::peek($namespace, $key);
                if (is_array($stale)) {
                    return $stale;
                }
                // Cold start — no stale data exists yet. Block-wait for the first worker.
                if (!@flock($lockHandle, LOCK_EX)) {
                    return self::store($namespace, $key, $callback());
                }
            }

            // Double-check: another worker may have written while we waited.
            $cached = self::get($namespace, $key, $ttlSeconds);
            if (is_array($cached)) {
                return $cached;
            }

            return self::store($namespace, $key, $callback());
        } finally {
            @flock($lockHandle, LOCK_UN);
            @fclose($lockHandle);
        }
    }

    /**
     * Force-write a payload to the cache without going through the
     * remember() lock dance. Used for stale-fallback namespaces where
     * we want every successful upstream response to refresh the
     * fallback copy regardless of any existing entry.
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public static function put(string $namespace, string $key, array $payload): array
    {
        return self::store($namespace, $key, $payload);
    }

    public static function forget(string $namespace, string $key): void
    {
        $apcuKey = self::apcuKey($namespace, $key);
        if ($apcuKey !== null) {
            @apcu_delete($apcuKey);
        }
        @unlink(self::cacheFile($namespace, $key));
        @unlink(self::lockFile($namespace, $key));
    }

    public static function forgetNamespace(string $namespace): void
    {
        $pattern = self::cacheDir() . '/' . self::safeNamespace($namespace) . '__*';
        $matches = glob($pattern);
        if (!is_array($matches)) {
            return;
        }

        foreach ($matches as $path) {
            if (is_string($path) && $path !== '') {
                @unlink($path);
            }
        }

        if (self::apcuEnabled()) {
            $prefix = self::APCU_KEY_PREFIX . self::safeNamespace($namespace) . '__';
            $iterator = new APCUIterator('/^' . preg_quote($prefix, '/') . '/');
            foreach ($iterator as $entry) {
                if (isset($entry['key']) && is_string($entry['key'])) {
                    @apcu_delete($entry['key']);
                }
            }
        }
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private static function store(string $namespace, string $key, array $payload): array
    {
        self::ensureCacheDir();
        $cacheFile = self::cacheFile($namespace, $key);
        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($encoded)) {
            return $payload;
        }

        $tempFile = $cacheFile . '.tmp.' . uniqid('', true);
        // No LOCK_EX needed: the temp filename is unique per-process via uniqid(),
        // so no other worker can access it before the atomic rename.
        @file_put_contents($tempFile, $encoded);
        @rename($tempFile, $cacheFile);

        $apcuKey = self::apcuKey($namespace, $key);
        if ($apcuKey !== null) {
            // Keep APCu reasonably fresh; authoritative source remains file cache.
            @apcu_store($apcuKey, $payload, 120);
        }

        return $payload;
    }

    private static function ensureCacheDir(): void
    {
        $cacheDir = self::cacheDir();
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0775, true);
        }
    }

    private static function cacheDir(): string
    {
        return dirname(__DIR__) . '/cache';
    }

    private static function cacheFile(string $namespace, string $key): string
    {
        return self::cacheDir() . '/' . self::safeNamespace($namespace) . '__' . self::safeKey($key) . '.json';
    }

    private static function lockFile(string $namespace, string $key): string
    {
        return self::cacheDir() . '/' . self::safeNamespace($namespace) . '__' . self::safeKey($key) . '.lock';
    }

    private static function safeNamespace(string $namespace): string
    {
        return preg_replace('/[^a-zA-Z0-9._-]+/', '-', $namespace) ?: 'cache';
    }

    private static function safeKey(string $key): string
    {
        $prefix = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $key) ?: 'key';
        $prefix = substr($prefix, 0, 48);
        return $prefix . '__' . sha1($key);
    }

    private static function apcuKey(string $namespace, string $key): ?string
    {
        if (!self::apcuEnabled()) {
            return null;
        }
        return self::APCU_KEY_PREFIX . self::safeNamespace($namespace) . '__' . self::safeKey($key);
    }

    private static function apcuEnabled(): bool
    {
        return function_exists('apcu_fetch') && function_exists('apcu_store') && function_exists('apcu_delete') && class_exists('APCUIterator');
    }
}
