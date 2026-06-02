<?php
declare(strict_types=1);

/**
 * dgs-overlay.php — CLI wrapper around DgsOverlayService.
 *
 * The overlay LOGIC lives in php-backend/src/DgsOverlayService.php (shared with
 * the live odds-worker). This script is just the manual/dry-run entry point.
 *
 * MONEY-CRITICAL. Read php-backend money-safety rules before editing.
 *
 * Safety model:
 *  - DEFAULT MODE IS DRY-RUN. It computes + prints planned changes and WRITES
 *    NOTHING. To actually write you must pass --apply AND set env
 *    DGS_OVERLAY_ENABLED=true. Either missing → no writes.
 *  - All write/poison/freshness behaviour is in DgsOverlayService — see its
 *    header for the full safety model.
 *
 * Usage:
 *   php php-backend/scripts/dgs-overlay.php                  # dry-run (default)
 *   php php-backend/scripts/dgs-overlay.php --apply          # writes IF env enabled
 *   php php-backend/scripts/dgs-overlay.php --max-age=999999 # preview vs stale harvest
 *
 * Flags:
 *   --apply         actually write (also needs DGS_OVERLAY_ENABLED=true)
 *   --max-age=N     override the freshness window for THIS run only (preview;
 *                   does not touch .env or the live worker). Refused with --apply
 *                   so a relaxed gate can never write stale numbers to the board.
 *   --periods       also align period markets (1st half / 1st quarter). Preview
 *                   this before setting DGS_OVERLAY_PERIODS=true for the worker.
 *
 * Env:
 *   DGS_OVERLAY_ENABLED          'true' required for any write
 *   DGS_OVERLAY_SPORTS           csv sportKeys (default basketball_nba)
 *   DGS_OVERLAY_MAX_AGE_SECONDS  harvest freshness window (default 120)
 *   DGS_OVERLAY_PERIODS          'true' to align period markets too (default off)
 */

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);
require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
Env::load($projectRoot, $phpBackendDir);

$args       = array_slice($argv, 1);
$APPLY      = in_array('--apply', $args, true);
$ENABLED    = strtolower((string) Env::get('DGS_OVERLAY_ENABLED', 'false')) === 'true';
$WILL_WRITE = $APPLY && $ENABLED;
$MAX_AGE    = max(15, (int) Env::get('DGS_OVERLAY_MAX_AGE_SECONDS', '120'));
$PERIODS    = in_array('--periods', $args, true)
    || strtolower((string) Env::get('DGS_OVERLAY_PERIODS', 'false')) === 'true';

// --max-age=N: preview-only override of the freshness gate. Refused alongside
// --apply so a relaxed gate can never write stale numbers to the live board.
foreach ($args as $a) {
    if (preg_match('/^--max-age=(\d+)$/', $a, $m) === 1) {
        if ($WILL_WRITE) {
            fwrite(STDERR, "refusing --max-age with --apply (would risk writing stale lines). Drop one.\n");
            exit(2);
        }
        $MAX_AGE = max(15, (int) $m[1]);
    }
}
$SPORTS     = array_values(array_filter(array_map('trim',
    explode(',', (string) Env::get('DGS_OVERLAY_SPORTS', 'basketball_nba')))));

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

echo "DGS overlay — mode: " . ($WILL_WRITE ? "APPLY (writing)" : "DRY-RUN (no writes)") . "\n";
echo "  --apply=" . ($APPLY ? 'yes' : 'no') . "  DGS_OVERLAY_ENABLED=" . ($ENABLED ? 'true' : 'false')
   . "  periods=" . ($PERIODS ? 'on' : 'off')
   . "  sports=[" . implode(',', $SPORTS) . "]  maxAge={$MAX_AGE}s\n\n";

$stats = DgsOverlayService::apply($repo, [
    'dryRun'        => !$WILL_WRITE,
    'periods'       => $PERIODS,
    'sports'        => $SPORTS,
    'maxAgeSeconds' => $MAX_AGE,
    'log'           => static function (string $line): void { echo $line . "\n"; },
]);

echo "\n" . str_repeat('═', 70) . "\n";
echo "paired={$stats['paired']}  value changes " . ($WILL_WRITE ? "written" : "would-write") . "={$stats['written']}"
   . "  rejected={$stats['rejected']}\n";
if ($stats['stale'] !== []) {
    echo "stale (left on Rundown): " . implode(', ', $stats['stale']) . "\n";
}
if ($stats['missing'] !== []) {
    echo "missing harvest files: " . implode(', ', $stats['missing']) . "\n";
}
if ($stats['unknownPeriods'] !== []) {
    echo "unmapped period labels (skipped): " . implode(', ', $stats['unknownPeriods']) . "\n";
}
if (!$WILL_WRITE) {
    echo "DRY-RUN: nothing written. The live worker applies the overlay automatically when"
       . " DGS_OVERLAY_ENABLED=true (in .env) and the harvest is fresh. For a manual write here,"
       . " run with --apply.\n";
}
