<?php
declare(strict_types=1);

/**
 * dgs-inspect.php — READ-ONLY DGS feed schema inspector.
 *
 * Purpose: before we extend the overlay to period markets (1st half, 1st
 * quarter, …) we need to KNOW how bettorjuice365's DGS `Get_LeagueLines2`
 * feed encodes periods — what `PeriodNumber` values appear and which odds
 * fields each period line carries. Guessing that on money-critical odds
 * code is not acceptable, so this tool surfaces the real schema first.
 *
 * It NEVER touches the DB, balances, bets, or the board. It only READS the
 * harvested JSON snapshots and prints a summary.
 *
 * Usage (run on the VPS where the harvest lives):
 *   php php-backend/scripts/dgs-inspect.php                       # all live harvest files
 *   php php-backend/scripts/dgs-inspect.php /path/to/NBA.json     # a specific file/dir
 *
 * For each league it prints, per distinct PeriodNumber:
 *   - how many lines carry it
 *   - a sample game (away @ home)
 *   - every field whose name hints at the period (Period*, *Half*, *Quarter*,
 *     *Desc*) plus the core odds fields we overlay (Spread/SpreadAdj1/2,
 *     MoneyLine1/2, TotalPoints/TtlPtsAdj1/2) so we can confirm period lines
 *     reuse the full-game field schema.
 */

$phpBackendDir = dirname(__DIR__);
$liveDir       = $phpBackendDir . '/storage/dgs/live';

// ── gather input files ─────────────────────────────────────────────────────
$inputs = array_slice($argv, 1);
$files  = [];
if ($inputs === []) {
    foreach (glob($liveDir . '/*.json') ?: [] as $f) {
        if (basename($f)[0] !== '_') {
            $files[] = $f; // skip _last_ingest.log etc.
        }
    }
    if ($files === []) {
        fwrite(STDERR, "No harvest files in {$liveDir}. Pass a file/dir explicitly,\n");
        fwrite(STDERR, "or run this on the VPS after the userscript has ingested at least once.\n");
        exit(2);
    }
} else {
    foreach ($inputs as $p) {
        if (is_dir($p)) {
            foreach (glob(rtrim($p, '/') . '/*.json') ?: [] as $f) $files[] = $f;
        } elseif (is_file($p)) {
            $files[] = $p;
        } else {
            fwrite(STDERR, "skip (not found): {$p}\n");
        }
    }
}
if ($files === []) {
    fwrite(STDERR, "No .json files found.\n");
    exit(2);
}

// Field-name hints that likely describe the period of a line.
$periodHint = static function (string $k): bool {
    return (bool) preg_match('/period|half|quarter|inning|segment|desc/i', $k);
};
// Core odds fields the overlay reads — confirm period lines carry them too.
$CORE_FIELDS = [
    'Spread', 'SpreadAdj1', 'SpreadAdj2',
    'MoneyLine1', 'MoneyLine2',
    'TotalPoints', 'TtlPtsAdj1', 'TtlPtsAdj2',
    'FavoredTeamID',
];

foreach ($files as $file) {
    $data  = json_decode((string) file_get_contents($file), true);
    $lines = is_array($data['Lines'] ?? null) ? $data['Lines'] : null;
    echo str_repeat('═', 78) . "\n";
    echo basename($file) . "\n";
    if ($lines === null) {
        echo "  (no Lines[] array — not a Get_LeagueLines2 snapshot)\n";
        continue;
    }
    echo "  total lines: " . count($lines) . "\n";

    // group lines by PeriodNumber
    $byPeriod = [];
    foreach ($lines as $ln) {
        if (!is_array($ln)) continue;
        $pn = $ln['PeriodNumber'] ?? '(missing)';
        $byPeriod[(string) $pn][] = $ln;
    }
    ksort($byPeriod, SORT_NATURAL);

    foreach ($byPeriod as $pn => $group) {
        $sample = $group[0];
        $sub    = trim((string) ($sample['SportSubType'] ?? '?'));
        $away   = trim((string) ($sample['Team1ID'] ?? '?'));
        $home   = trim((string) ($sample['Team2ID'] ?? '?'));
        $cnt = count($group);
        echo str_repeat('─', 78) . "\n";
        echo "  PeriodNumber={$pn}  ×{$cnt} lines  sub={$sub}\n";
        echo "    sample: {$away} @ {$home}\n";

        // any field that hints at describing the period
        $hints = [];
        foreach ($sample as $k => $v) {
            if (is_scalar($v) && $periodHint((string) $k)) {
                $hints[] = "{$k}=" . var_export($v, true);
            }
        }
        echo "    period-ish fields: " . ($hints ? implode('  ', $hints) : '(none)') . "\n";

        // core odds fields present on this period's sample line
        $core = [];
        foreach ($CORE_FIELDS as $cf) {
            $core[] = "{$cf}=" . (array_key_exists($cf, $sample) ? var_export($sample[$cf], true) : 'ABSENT');
        }
        echo "    core odds fields: " . implode('  ', $core) . "\n";
    }
}

echo str_repeat('═', 78) . "\n";
echo "Paste this output back so the PeriodNumber→market-key map can be locked\n";
echo "before any overlay write. This tool wrote nothing.\n";
