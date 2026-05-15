<?php

declare(strict_types=1);

/**
 * Standalone prematch + extended-market sync — companion to the
 * HTTP-routed /api/internal/oddsapi-prematch-tick endpoint, written
 * because Hostinger's PHP-FPM kills long HTTP requests at ~60s and
 * the curl-based shell wrapper hit that timeout once extended-market
 * sync started doing real work.
 *
 * CLI scripts don't have HTTP request timeouts, so we run the full
 * tick (base odds sync + extended markets + settlement sweep) in one
 * process and exit. Self-throttling via the same rotation cursor
 * (SharedFileCache 'prematch-rotation') the HTTP endpoint uses, so
 * either path advances the same cursor — they don't fight.
 *
 * Hostinger cron (every 5 min):
 *   *\/5 * * * * /opt/alt/php82/usr/bin/php /home/USER/.../prematch-tick.php >> /home/USER/.../prematch-tick.log 2>&1
 *
 * Compared to the shell wrapper (`prematch-tick.sh`):
 *   - No HTTP round-trip (faster, no 60s FPM cap)
 *   - No INTERNAL_TICK_SECRET read (runs as filesystem-trusted process)
 *   - Same rotation state, same sync logic
 */

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/Logger.php';
require_once __DIR__ . '/../src/Http.php';
require_once __DIR__ . '/../src/ApiException.php';
require_once __DIR__ . '/../src/Response.php';
require_once __DIR__ . '/../src/CircuitBreaker.php';
require_once __DIR__ . '/../src/ConnectionPool.php';
require_once __DIR__ . '/../src/QueryCache.php';
require_once __DIR__ . '/../src/RequestDeduplicator.php';
require_once __DIR__ . '/../src/SharedFileCache.php';
require_once __DIR__ . '/../src/SportsbookCache.php';
require_once __DIR__ . '/../src/SqlRepository.php';
require_once __DIR__ . '/../src/SportsMatchStatus.php';
require_once __DIR__ . '/../src/SportsbookHealth.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/BetModeRules.php';
require_once __DIR__ . '/../src/AgentSettlementRules.php';
require_once __DIR__ . '/../src/BetSettlementService.php';
require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/ApiQuotaGuard.php';
require_once __DIR__ . '/../src/TeamNormalizer.php';
require_once __DIR__ . '/../src/OddsSyncService.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[prematch-tick] pdo_mysql extension is required\n");
    exit(1);
}

$dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
if ($dbName === '') $dbName = 'sports_betting';

$startedAt = microtime(true);
$ts = gmdate(DATE_ATOM);

try {
    $db = new SqlRepository('mysql-native', $dbName);

    // Resolve the sport rotation list — same union of tiered + allow-listed
    // sports the HTTP endpoint uses.
    $tier1 = (string) Env::get('ODDS_TIER1_SPORTS', '');
    $tier2 = (string) Env::get('ODDS_TIER2_SPORTS', '');
    $allowed = (string) Env::get('ODDS_ALLOWED_SPORTS', 'basketball_nba,americanfootball_nfl,soccer_epl,baseball_mlb,icehockey_nhl');
    $merged = $tier1 . ',' . $tier2 . ',' . $allowed;
    $sports = array_values(array_unique(array_filter(array_map('trim', explode(',', $merged)), static fn($v) => $v !== '')));
    sort($sports);

    $maxPerTick = max(1, (int) Env::get('PREMATCH_MAX_SPORTS_PER_TICK', '8'));

    // Read rotation cursor from the SAME SharedFileCache namespace the HTTP
    // endpoint writes to, so both paths advance one shared cursor.
    $cursorEntry = SharedFileCache::peek('prematch-rotation', 'cursor');
    $cursor = is_array($cursorEntry) && isset($cursorEntry['n']) ? (int) $cursorEntry['n'] : 0;
    $cursor = $sports === [] ? 0 : ($cursor % count($sports));

    $batch = [];
    $batchSize = min($maxPerTick, count($sports));
    for ($i = 0; $i < $batchSize; $i++) {
        $batch[] = $sports[($cursor + $i) % count($sports)];
    }

    // Base odds sync (h2h / spreads / totals) for each sport in the batch.
    $perSport = [];
    $totalUpdated = 0;
    $errors = 0;
    foreach ($batch as $sportKey) {
        try {
            $r = OddsSyncService::syncSingleSport($db, $sportKey);
            $matches = is_array($r['matches'] ?? null) ? $r['matches'] : [];
            $totalUpdated += count($matches);
            $perSport[$sportKey] = count($matches);
        } catch (Throwable $e) {
            $errors++;
            $perSport[$sportKey] = 'err:' . $e->getMessage();
        }
    }

    // Advance the rotation cursor so the next tick picks up where we left off.
    if ($sports !== []) {
        $next = ($cursor + count($batch)) % count($sports);
        SharedFileCache::forget('prematch-rotation', 'cursor');
        SharedFileCache::remember('prematch-rotation', 'cursor', 86400, static fn() => ['n' => $next]);
    }

    // Extended-market sync (h2h_q1, spreads_h1, totals_p2, player props).
    // Scoped to just the sports we touched in this rotation batch so API
    // budget stays linear with sport count, not total match count.
    $extended = null;
    $extendedEnabled = strtolower((string) Env::get('ODDS_EXTENDED_SYNC_ENABLED', 'true')) !== 'false';
    if ($extendedEnabled && count($batch) > 0) {
        try {
            $activeMatches = $db->findMany(
                'matches',
                [
                    'status' => ['$in' => ['scheduled', 'live']],
                    'sportKey' => ['$in' => $batch],
                ],
                ['projection' => [
                    'id' => 1, 'externalId' => 1, 'sportKey' => 1,
                    'odds' => 1, 'playerProps' => 1, 'lastPropsSyncAt' => 1,
                ]]
            );
            $cfg = OddsSyncService::tierConfig();
            if (($cfg['tieringActive'] ?? false) && !($cfg['tier3ExtendedSync'] ?? true)) {
                $sportTier = $cfg['sportTier'] ?? [];
                $activeMatches = array_values(array_filter(
                    $activeMatches,
                    static function ($m) use ($sportTier) {
                        $sk = (string) ($m['sportKey'] ?? '');
                        $tier = $sportTier[$sk] ?? 'tier3';
                        return $tier !== 'tier3';
                    }
                ));
            }
            $extended = OddsSyncService::syncEventExtendedForMatches($db, $activeMatches);
        } catch (Throwable $e) {
            $extended = ['error' => $e->getMessage()];
        }
    }

    // Settlement sweep for any games that flipped to finished since the
    // last tick. Idempotent, row-locked, safe to overlap with settlement-sweep.php.
    $sweep = ['matchesChecked' => 0, 'matchesSettled' => 0, 'betsSettled' => 0, 'errors' => 0];
    try {
        $r = BetSettlementService::settlePendingMatches($db, 250, 'cron-prematch');
        $sweep['matchesChecked'] = (int) ($r['matchesChecked'] ?? 0);
        $sweep['matchesSettled'] = (int) ($r['matchesSettled'] ?? 0);
        $sweep['betsSettled']    = (int) ($r['betsSettled'] ?? 0);
        $sweep['errors']         = (int) ($r['errors'] ?? 0);
    } catch (Throwable $e) {
        $sweep['errors']++;
    }

    // Bust public caches so the next /api/matches request sees the fresh data.
    try {
        SportsbookCache::invalidatePublicMatchCaches();
    } catch (Throwable $_e) {
        // non-fatal
    }

    $elapsedMs = (int) round((microtime(true) - $startedAt) * 1000);
    $extendedSummary = is_array($extended)
        ? (isset($extended['error']) ? 'err:' . substr((string) $extended['error'], 0, 80) : 'ok:' . count($extended))
        : 'off';

    fwrite(STDOUT, sprintf(
        "[%s] prematch-tick ok sports=%d updated=%d errors=%d extended=%s settled=%d elapsedMs=%d perSport=%s\n",
        $ts,
        count($batch),
        $totalUpdated,
        $errors,
        $extendedSummary,
        (int) $sweep['matchesSettled'],
        $elapsedMs,
        json_encode($perSport, JSON_UNESCAPED_SLASHES)
    ));
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, sprintf("[%s] prematch-tick failed: %s\n", $ts, $e->getMessage()));
    exit(1);
}
