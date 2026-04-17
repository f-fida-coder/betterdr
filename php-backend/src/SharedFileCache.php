<?php

declare(strict_types=1);

final class SharedFileCache
{
    /**
     * @return array<string, mixed>|null
     */
    public static function get(string $namespace, string $key, int $ttlSeconds): ?array
    {
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

    public static function forget(string $namespace, string $key): void
    {
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
        @file_put_contents($tempFile, $encoded, LOCK_EX);
        @rename($tempFile, $cacheFile);

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
}
