<?php

declare(strict_types=1);

final class SportsbookCache
{
    private const PUBLIC_MATCHES_NAMESPACE = 'sportsbook-public-matches';
    private const AVAILABLE_SPORTS_NAMESPACE = 'sportsbook-available-sports';
    private const HEALTH_SNAPSHOT_NAMESPACE = 'sportsbook-health-snapshot';
    // Stale-fallback namespaces: written on every successful compute
    // independent of the live TTL (which is currently 0 to keep odds
    // fresh). Read via SharedFileCache::peek when the live compute
    // throws, so transient DB / upstream failures don't surface as an
    // empty list to the user. See MatchesController::getMatches /
    // getAvailableSports.
    private const PUBLIC_MATCHES_STALE_NAMESPACE = 'sportsbook-public-matches-stale';
    private const AVAILABLE_SPORTS_STALE_NAMESPACE = 'sportsbook-available-sports-stale';
    // Throttle key for the per-user opportunistic settlement sweep that
    // runs at the top of getMyBets. One entry per user, short TTL — keeps
    // the sweep from thrashing when a client hammers /api/bets/my-bets
    // (auto-refresh, multiple tabs, etc.).
    private const USER_BET_SWEEP_NAMESPACE = 'sportsbook-user-bet-sweep';
    private const OUTRIGHTS_LIST_NAMESPACE = 'sportsbook-outrights-list';
    private const OUTRIGHTS_SPORTS_NAMESPACE = 'sportsbook-outrights-sports';
    private const CASINO_GAMES_NAMESPACE = 'casino-games-list';
    private const CASINO_CATEGORIES_NAMESPACE = 'casino-categories';

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

    public static function publicMatchesStaleNamespace(): string
    {
        return self::PUBLIC_MATCHES_STALE_NAMESPACE;
    }

    public static function availableSportsStaleNamespace(): string
    {
        return self::AVAILABLE_SPORTS_STALE_NAMESPACE;
    }

    public static function userBetSweepNamespace(): string
    {
        return self::USER_BET_SWEEP_NAMESPACE;
    }

    public static function outrightsListNamespace(): string
    {
        return self::OUTRIGHTS_LIST_NAMESPACE;
    }

    public static function outrightsSportsNamespace(): string
    {
        return self::OUTRIGHTS_SPORTS_NAMESPACE;
    }

    public static function casinoGamesNamespace(): string
    {
        return self::CASINO_GAMES_NAMESPACE;
    }

    public static function casinoCategoriesNamespace(): string
    {
        return self::CASINO_CATEGORIES_NAMESPACE;
    }

    public static function invalidateCasinoCaches(): void
    {
        SharedFileCache::forgetNamespace(self::CASINO_GAMES_NAMESPACE);
        SharedFileCache::forgetNamespace(self::CASINO_CATEGORIES_NAMESPACE);
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
        // Stale fallback is best-effort and meant to survive transient
        // failures; explicit invalidation should clear it too so an
        // admin-triggered bust doesn't leave the user with old data on
        // the next exception.
        SharedFileCache::forgetNamespace(self::PUBLIC_MATCHES_STALE_NAMESPACE);
        SharedFileCache::forgetNamespace(self::AVAILABLE_SPORTS_STALE_NAMESPACE);
    }

    public static function invalidateHealthSnapshotCache(): void
    {
        SharedFileCache::forgetNamespace(self::HEALTH_SNAPSHOT_NAMESPACE);
    }
}
