<?php

declare(strict_types=1);

/**
 * Per-sport delta cursor persistence — handles BOTH Rundown delta endpoints:
 *
 *   - /api/v2/markets/delta — integer cursor, market-level price changes
 *   - /api/v2/delta         — 36-char UUID cursor, event-level changes
 *                              (score / status / markets)
 *
 * Both cursors advance forward in time and Rundown rejects either if
 * older than 30 minutes; we treat anything older than 25 min as stale
 * so the next tick re-bootstraps via the full events endpoint instead
 * of getting a 400.
 */
final class RundownDeltaCursor
{
    private const NAMESPACE = 'rundown-delta-cursor';
    private const EVENT_NAMESPACE = 'rundown-event-delta-cursor';
    private const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
    private const STALE_AFTER_SECONDS = 1500; // 25 min, under Rundown's 30 min hard limit
    private const TTL_SECONDS = 1800;

    public static function get(int $sportId): ?int
    {
        $entry = SharedFileCache::peek(self::NAMESPACE, (string) $sportId);
        if (!is_array($entry)) return null;
        $lastId = $entry['lastId'] ?? null;
        return is_numeric($lastId) ? (int) $lastId : null;
    }

    public static function set(int $sportId, int $lastId): void
    {
        $payload = [
            'lastId'   => $lastId,
            'updated'  => time(),
        ];
        SharedFileCache::forget(self::NAMESPACE, (string) $sportId);
        SharedFileCache::remember(self::NAMESPACE, (string) $sportId, self::TTL_SECONDS, static fn (): array => $payload);
    }

    public static function isStale(int $sportId): bool
    {
        $entry = SharedFileCache::peek(self::NAMESPACE, (string) $sportId);
        if (!is_array($entry)) return true;
        $ts = (int) ($entry['updated'] ?? 0);
        if ($ts <= 0) return true;
        return (time() - $ts) > self::STALE_AFTER_SECONDS;
    }

    public static function forget(int $sportId): void
    {
        SharedFileCache::forget(self::NAMESPACE, (string) $sportId);
    }

    /**
     * @return array{lastId:?int, ageSeconds:?int}
     */
    public static function snapshot(int $sportId): array
    {
        $entry = SharedFileCache::peek(self::NAMESPACE, (string) $sportId);
        if (!is_array($entry)) {
            return ['lastId' => null, 'ageSeconds' => null];
        }
        $lastId = is_numeric($entry['lastId'] ?? null) ? (int) $entry['lastId'] : null;
        $ts = (int) ($entry['updated'] ?? 0);
        return [
            'lastId'     => $lastId,
            'ageSeconds' => $ts > 0 ? (time() - $ts) : null,
        ];
    }

    // ── /api/v2/delta (event delta, UUID cursor) ─────────────────────

    public static function getEventCursor(int $sportId): string
    {
        $entry = SharedFileCache::peek(self::EVENT_NAMESPACE, (string) $sportId);
        if (!is_array($entry)) return self::ZERO_UUID;
        $cursor = $entry['cursor'] ?? '';
        return (is_string($cursor) && $cursor !== '') ? $cursor : self::ZERO_UUID;
    }

    public static function setEventCursor(int $sportId, string $cursor): void
    {
        if ($cursor === '') return;
        $payload = ['cursor' => $cursor, 'updated' => time()];
        SharedFileCache::forget(self::EVENT_NAMESPACE, (string) $sportId);
        SharedFileCache::remember(self::EVENT_NAMESPACE, (string) $sportId, self::TTL_SECONDS, static fn (): array => $payload);
    }

    public static function isEventCursorStale(int $sportId): bool
    {
        $entry = SharedFileCache::peek(self::EVENT_NAMESPACE, (string) $sportId);
        if (!is_array($entry)) return true;
        $ts = (int) ($entry['updated'] ?? 0);
        if ($ts <= 0) return true;
        return (time() - $ts) > self::STALE_AFTER_SECONDS;
    }

    public static function forgetEventCursor(int $sportId): void
    {
        SharedFileCache::forget(self::EVENT_NAMESPACE, (string) $sportId);
    }

    /**
     * @return array{cursor:string, ageSeconds:?int}
     */
    public static function eventCursorSnapshot(int $sportId): array
    {
        $entry = SharedFileCache::peek(self::EVENT_NAMESPACE, (string) $sportId);
        if (!is_array($entry)) {
            return ['cursor' => self::ZERO_UUID, 'ageSeconds' => null];
        }
        $cursor = (string) ($entry['cursor'] ?? self::ZERO_UUID);
        $ts = (int) ($entry['updated'] ?? 0);
        return [
            'cursor'     => $cursor,
            'ageSeconds' => $ts > 0 ? (time() - $ts) : null,
        ];
    }
}
