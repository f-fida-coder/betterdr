<?php

declare(strict_types=1);

/**
 * Per-API minute-window call cap. Hard ceiling that protects spend on
 * Rundown / OddsAPI when on-demand syncs (Refresh button, sport-tab clicks)
 * could otherwise stack on top of cron ticks under load or during a
 * misbehaving client loop.
 *
 * Storage: SharedFileCache (file-based, no Redis dependency). Keeps a
 * sliding 60s window of call timestamps per api name. Concurrent writers
 * race a little, but the worst case is a count off by 1-2 — acceptable for
 * a hard cap that's already conservative relative to provider quotas.
 *
 * The user-visible behavior: when a tick or on-demand sync would exceed
 * the cap, the caller falls back to cached DB rows and surfaces an
 * X-Sync-Throttled: 1 header. Logged to tick_log as
 * status='skipped_quota_cap' so a misconfigured cap can be detected.
 */
final class ApiQuotaGuard
{
    private const NAMESPACE_PREFIX = 'api-quota-';
    private const KEY = 'minute_window';
    private const WINDOW_SECONDS = 60;

    /**
     * Reserve a slot for one API call. Returns true if the call is allowed
     * (and the slot is recorded), false if the cap was exceeded — caller
     * must NOT make the API call in the latter case.
     *
     * @param string $api    e.g. 'rundown' / 'oddsapi'
     * @param int    $maxPerMinute hard cap; <= 0 disables the guard.
     */
    public static function reserve(string $api, int $maxPerMinute): bool
    {
        if ($maxPerMinute <= 0) return true;
        $now = time();
        $namespace = self::NAMESPACE_PREFIX . $api;
        $entry = SharedFileCache::peek($namespace, self::KEY);
        $window = is_array($entry) && isset($entry['ts']) && is_array($entry['ts']) ? $entry['ts'] : [];
        // Drop entries outside the sliding 60s window.
        $cutoff = $now - self::WINDOW_SECONDS;
        $window = array_values(array_filter($window, static fn($t) => is_int($t) && $t > $cutoff));
        if (count($window) >= $maxPerMinute) {
            // Persist the trimmed window even on rejection so subsequent
            // peek()s don't keep counting expired entries.
            self::persist($namespace, $window);
            return false;
        }
        $window[] = $now;
        self::persist($namespace, $window);
        return true;
    }

    /**
     * Current count of calls in the active 60s window — for diagnostics.
     */
    public static function currentCount(string $api): int
    {
        $now = time();
        $namespace = self::NAMESPACE_PREFIX . $api;
        $entry = SharedFileCache::peek($namespace, self::KEY);
        if (!is_array($entry) || !isset($entry['ts']) || !is_array($entry['ts'])) return 0;
        $cutoff = $now - self::WINDOW_SECONDS;
        return count(array_filter($entry['ts'], static fn($t) => is_int($t) && $t > $cutoff));
    }

    /** @param list<int> $window */
    private static function persist(string $namespace, array $window): void
    {
        $payload = ['ts' => $window];
        SharedFileCache::forget($namespace, self::KEY);
        // 120s TTL is double the window so we never lose data prematurely.
        SharedFileCache::remember($namespace, self::KEY, 120, fn() => $payload);
    }
}
