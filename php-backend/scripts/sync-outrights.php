<?php

declare(strict_types=1);

/**
 * Outright / futures sync — populate the `outrights` table from Rundown's
 * tournament-winner ("to win") markets so /api/outrights + OutrightsView have
 * data and futures betting can be priced/graded.
 *
 * Rundown has NO dedicated outrights endpoint: tournament-winner prices surface
 * inside the regular events feed under participant_type=player (one event with
 * N priced contenders). This script pulls that window per futures-eligible
 * sport and upserts via OutrightIngestService (idempotent, terminal-safe,
 * touches no money columns).
 *
 * SAFETY:
 *   - Gated by SPORTSBOOK_OUTRIGHTS_SYNC_ENABLED (default OFF). With the flag
 *     off this script exits 0 immediately, so shipping it / wiring a cron can
 *     never change production behavior until an operator explicitly opts in.
 *   - Exits cleanly (no error) when MySQL or the Rundown key is unavailable —
 *     safe to run on a local box with no upstream configured.
 *
 * Usage:
 *   php php-backend/scripts/sync-outrights.php
 *   php php-backend/scripts/sync-outrights.php golf_pga_championship_winner tennis_atp
 *
 * No arguments → every futures-eligible sport that is also in ODDS_TIER1_SPORTS
 * / ODDS_TIER2_SPORTS. Explicit sport keys → only those.
 *
 * Cron (VPS) — every 15 min, only meaningful once the flag is on:
 *   *_/15 * * * * php /path/php-backend/scripts/sync-outrights.php >> /path/logs/sync-outrights.log 2>&1
 */

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);

require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
require_once $phpBackendDir . '/src/Logger.php';
require_once $phpBackendDir . '/src/SharedFileCache.php';
require_once $phpBackendDir . '/src/CircuitBreaker.php';
require_once $phpBackendDir . '/src/ConnectionPool.php';
require_once $phpBackendDir . '/src/SqlRepository.php';
require_once $phpBackendDir . '/src/SportsbookHealth.php';
require_once $phpBackendDir . '/src/RundownClient.php';
require_once $phpBackendDir . '/src/RundownSportMap.php';
require_once $phpBackendDir . '/src/RundownAffiliateMap.php';
require_once $phpBackendDir . '/src/OutrightIngestService.php';

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

// ── Kill switch ────────────────────────────────────────────────────────────
$flag = strtolower(trim((string) (Env::get('SPORTSBOOK_OUTRIGHTS_SYNC_ENABLED', 'false') ?? 'false')));
if ($flag !== 'true' && $flag !== '1') {
    echo "[outrights] SPORTSBOOK_OUTRIGHTS_SYNC_ENABLED is off — nothing to do\n";
    exit(0);
}

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[outrights] pdo_mysql extension required\n");
    exit(0); // exit 0: nothing to sync, not a hard failure for a cron
}
if (!RundownClient::isConfigured()) {
    fwrite(STDERR, "[outrights] RUNDOWN_API_KEY missing — nothing to sync\n");
    exit(0);
}

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

// Futures are the dedicated `tournament_winner` market (id 1141). It can attach
// to ANY sport Rundown serves it for, so we try every configured sport rather
// than a guessed allowlist — "all futures under whatever sports the feed
// offers." Sports with no 1141 board simply ingest nothing (skipped), so this
// is safe to run across the full tier list.
$argSports = array_slice($argv, 1);
if ($argSports !== []) {
    $sportKeys = array_values(array_unique(array_map('strtolower', $argSports)));
} else {
    $configuredRaw = (string) Env::get('ODDS_TIER1_SPORTS', '') . ',' . (string) Env::get('ODDS_TIER2_SPORTS', '');
    $configured = array_map('trim', explode(',', $configuredRaw));
    $sportKeys = array_values(array_unique(array_filter($configured)));
}

if ($sportKeys === []) {
    echo "[outrights] no sports configured (ODDS_TIER1_SPORTS/ODDS_TIER2_SPORTS empty); nothing to do\n";
    exit(0);
}

// Rundown's futures market id. tournament_winner = 1141 (verified in /markets).
$futuresMarketId = (string) Env::get('SPORTSBOOK_OUTRIGHTS_MARKET_IDS', '1141');

$preferredBooks = RundownAffiliateMap::affiliateIdsFromKeyList(
    (string) Env::get('SPORTSBOOK_PREFERRED_BOOKS', '')
);

$offsetMin = (int) Env::get('RUNDOWN_DATE_OFFSET_MINUTES', '300');
$date = gmdate('Y-m-d', time() - $offsetMin * 60);

echo "[outrights] syncing " . count($sportKeys) . " sport(s): " . implode(', ', $sportKeys) . "\n";
$totalUpserted = 0;
$totalErrors   = 0;
foreach ($sportKeys as $sportKey) {
    $sportId = RundownSportMap::sportKeyToSportId($sportKey);
    if ($sportId === null) {
        echo sprintf("  - %-34s skipped (no sport_id mapping)\n", $sportKey);
        continue;
    }
    try {
        // Request the tournament_winner market only. No participant_type filter:
        // a winner board's contenders may be players (golf/tennis) OR teams
        // (league/cup winner), and filtering to one would drop the other.
        $resp = RundownClient::getEventsForSport($sportId, $date, [
            'market_ids'      => $futuresMarketId,
            'hide_no_markets' => 'true',
            'offset'          => $offsetMin,
        ]);
        $events = is_array($resp['events'] ?? null) ? $resp['events'] : [];
        $r = OutrightIngestService::ingestSport($repo, $sportKey, $events, $preferredBooks);
        $totalUpserted += (int) ($r['upserted'] ?? 0);
        echo sprintf(
            "  - %-34s events=%-4d upserted=%-3d skipped=%-3d terminal=%-3d\n",
            $sportKey,
            count($events),
            (int) ($r['upserted'] ?? 0),
            (int) ($r['skipped'] ?? 0),
            (int) ($r['terminal'] ?? 0)
        );
    } catch (Throwable $e) {
        $totalErrors++;
        echo sprintf("  - %-34s ERROR  %s\n", $sportKey, $e->getMessage());
    }
}

echo "[outrights] done — upserted {$totalUpserted}, errors {$totalErrors}\n";
exit(0);
