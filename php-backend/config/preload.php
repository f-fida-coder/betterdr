<?php
/**
 * ============================================================================
 * Tier A — OPcache preload script
 * ============================================================================
 * This file is invoked ONCE at PHP-FPM master start (before any worker forks)
 * when `opcache.preload` points to it. Every class compiled here is loaded
 * into shared OPcache memory and is ready for every request — no per-request
 * require_once cost, no mtime checks, no opcode regeneration.
 *
 * IMPORTANT — preload constraints:
 *   1. Runs as the user specified by opcache.preload_user (often www-data).
 *      That user must be able to read every file referenced here.
 *   2. We only opcache_compile_file() — we do NOT instantiate or call
 *      controller logic. Side effects at preload time are dangerous and
 *      can cause FPM to refuse to start.
 *   3. If you add a new class to php-backend/src/ that's hit on a hot path,
 *      add it to the $hotClasses list below and reload php-fpm.
 *   4. To disable: comment out `opcache.preload=...` in php.ini and reload.
 *      The site will fall back to per-request require_once with no behavior
 *      change.
 *
 * SAFETY: preloading is purely additive. Removing this file or disabling
 * the ini directive returns the site to its current working state.
 * ============================================================================
 */

declare(strict_types=1);

$srcDir = realpath(__DIR__ . '/../src');
if ($srcDir === false || !is_dir($srcDir)) {
    fwrite(STDERR, "[preload] src directory not found, skipping preload\n");
    return;
}

/**
 * Hot classes — loaded on virtually every request. Order matters only when
 * a class extends or implements another; PHP resolves dependencies during
 * compile, so independent files can be in any order.
 */
$hotClasses = [
    // ─── Foundation / utilities (no deps) ────────────────────────────────
    'Env.php',
    'Logger.php',
    'Http.php',
    'Response.php',
    'IpUtils.php',
    'Jwt.php',
    'ApiException.php',
    'RuntimeMetrics.php',
    'CostMonitor.php',

    // ─── Caching layer ───────────────────────────────────────────────────
    'SharedFileCache.php',
    'CacheWithStaleRevalidate.php',
    'AdaptiveCacheTTL.php',
    'QueryCache.php',
    'RequestDeduplicator.php',
    'WriteBuffer.php',

    // ─── Database / pool / circuit breaker ───────────────────────────────
    'CircuitBreaker.php',
    'ConnectionPool.php',
    'ConnectionPoolMonitor.php',
    'SqlRepository.php',

    // ─── Sports / odds support (most-hit endpoints) ──────────────────────
    'SportsMatchStatus.php',
    'SportsbookCache.php',
    'SportsbookHealth.php',
    'SportsbookBetSupport.php',
    'OddsMarketCatalog.php',
    'TeamNormalizer.php',
    'ApiQuotaGuard.php',
    'OddsSyncService.php',
    'RundownService.php',
    'RundownLiveSync.php',

    // ─── Bet / settlement rules ──────────────────────────────────────────
    'BetModeRules.php',
    'AgentSettlementRules.php',
    'AgentSettlementSnapshotService.php',
    'BetSettlementService.php',
    'BetVoidRefund.php',
    'BalanceUpdateService.php',

    // ─── Rate limiting / realtime ────────────────────────────────────────
    'RateLimiter.php',
    'WorkerRateLimiter.php',
    'RealtimeEventBus.php',

    // ─── Controllers (every request hits the router, which uses these) ──
    'AuthController.php',
    'WalletController.php',
    'BetsController.php',
    'BettingRulesController.php',
    'MatchesController.php',
    'ContentController.php',
    'MessagesController.php',
    'CasinoController.php',
    'AgentController.php',
    'AgentCutsController.php',
    'PaymentsController.php',
    'AdminCoreController.php',
    'AdminEntityCatalog.php',
    'ThesportsdbProxyController.php',
    'DebugController.php',

    // ─── Search / repository helpers ─────────────────────────────────────
    'SearchRepository.php',
];

$compiled = 0;
$skipped = 0;
$failed = [];

foreach ($hotClasses as $relPath) {
    $absPath = $srcDir . DIRECTORY_SEPARATOR . $relPath;
    if (!is_file($absPath) || !is_readable($absPath)) {
        $skipped++;
        continue;
    }
    try {
        // opcache_compile_file is the preload-safe way: it compiles the file
        // into bytecode and stores it in shared memory without executing
        // any top-level statements (other than declarations).
        if (opcache_compile_file($absPath)) {
            $compiled++;
        } else {
            $failed[] = $relPath;
        }
    } catch (\Throwable $e) {
        $failed[] = $relPath . ' (' . $e->getMessage() . ')';
    }
}

fwrite(
    STDERR,
    sprintf(
        "[preload] compiled=%d skipped=%d failed=%d\n",
        $compiled,
        $skipped,
        count($failed)
    )
);
if (!empty($failed)) {
    fwrite(STDERR, "[preload] failures:\n  - " . implode("\n  - ", $failed) . "\n");
}
