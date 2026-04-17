<?php

declare(strict_types=1);

final class SportsbookCache
{
    private const PUBLIC_MATCHES_NAMESPACE = 'sportsbook-public-matches';
    private const AVAILABLE_SPORTS_NAMESPACE = 'sportsbook-available-sports';
    private const HEALTH_SNAPSHOT_NAMESPACE = 'sportsbook-health-snapshot';

    public static function publicMatchesNamespace(): string
    {
        return self::PUBLIC_MATCHES_NAMESPACE;
    }

    public static function availableSportsNamespace(): string
    {
        return self::AVAILABLE_SPORTS_NAMESPACE;
    }

    public static function healthSnapshotNamespace(): string
    {
        return self::HEALTH_SNAPSHOT_NAMESPACE;
    }

    public static function publicMatchesKey(string $status, string $active): string
    {
        return json_encode([
            'status' => $status !== '' ? $status : 'all',
            'active' => $active !== '' ? $active : '0',
        ], JSON_UNESCAPED_SLASHES) ?: 'matches:all:0';
    }

    public static function availableSportsKey(): string
    {
        return 'scheduled-live-visible-sports';
    }

    public static function healthSnapshotKey(): string
    {
        return 'current';
    }

    public static function invalidatePublicMatchCaches(): void
    {
        SharedFileCache::forgetNamespace(self::PUBLIC_MATCHES_NAMESPACE);
        SharedFileCache::forgetNamespace(self::AVAILABLE_SPORTS_NAMESPACE);
    }

    public static function invalidateHealthSnapshotCache(): void
    {
        SharedFileCache::forgetNamespace(self::HEALTH_SNAPSHOT_NAMESPACE);
    }
}
