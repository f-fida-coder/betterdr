<?php

declare(strict_types=1);

/**
 * One-off season-schedule pull for off-season sports whose fixtures are
 * published months ahead (NCAA Football, NFL, etc.).
 *
 * The odds-worker runs this same RundownSyncService::syncSportSchedule() on a
 * slow (~hourly) cadence, but only for sports listed in RUNDOWN_SEASON_SPORTS.
 * This script lets you pull a sport's upcoming-season games onto the board
 * IMMEDIATELY (instead of waiting for the next sweep) — e.g. right after adding
 * a new sport to RUNDOWN_SEASON_SPORTS.
 *
 * It fetches up to RUNDOWN_SEASON_MAX_DATES dates within RUNDOWN_SEASON_DAYS_AHEAD
 * (180d default), bounded and fail-safe. Read/ingest only — touches the matches
 * table via the normal sync path, no money columns.
 *
 * Usage:
 *   php php-backend/scripts/season-sync-once.php                       # default: NCAAF + NCAAB
 *   php php-backend/scripts/season-sync-once.php americanfootball_nfl  # explicit sport keys
 */

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);

require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
require_once $phpBackendDir . '/src/Logger.php';

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[season-sync] pdo_mysql extension required\n");
    exit(1);
}
if (!RundownClient::isConfigured()) {
    fwrite(STDERR, "[season-sync] RUNDOWN_API_KEY missing\n");
    exit(1);
}

$db = new SqlRepository('', (string) Env::get('MYSQL_DB', 'sports_betting'));

// Sport keys: CLI args, or default to the two college sports.
$args = array_slice($argv, 1);
$sportKeys = $args !== []
    ? array_values(array_unique(array_map('strtolower', $args)))
    : ['americanfootball_ncaaf', 'basketball_ncaab'];

foreach ($sportKeys as $sportKey) {
    $sportId = RundownSportMap::sportKeyToSportId($sportKey);
    if ($sportId === null) {
        printf("%-26s skipped (no sport_id mapping)\n", $sportKey);
        continue;
    }
    try {
        $r = RundownSyncService::syncSportSchedule($db, $sportKey, $sportId);
        printf(
            "%-26s events=%s created=%s updated=%s dates=%s\n",
            $sportKey,
            (string) ($r['eventsSeen'] ?? '0'),
            (string) ($r['created'] ?? '0'),
            (string) ($r['updated'] ?? '0'),
            (string) ($r['datesFetched'] ?? '0')
        );
    } catch (Throwable $e) {
        printf("%-26s ERROR %s\n", $sportKey, $e->getMessage());
    }
}
