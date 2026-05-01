#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * One-off backfill: copy `score.home` / `score.away` → `score.score_home`
 * / `score.score_away` on every matches row that has the legacy Rundown
 * key shape, then re-trigger settlement on every pending bet whose match
 * is now finished.
 *
 * Why: BetSettlementService (and every frontend scoreboard) reads
 * `score.score_home` / `score.score_away`. Older RundownLiveSync builds
 * stored the score under `home` / `away`, so any match finalized via
 * Rundown silently graded as 0-0 (h2h void) or never graded at all when
 * the row aged into 'expired' status before the sweep saw it.
 *
 * Default run is dry-run. Use --apply to persist updates and run
 * settlement.
 */

function usage(): void
{
    echo <<<TXT
Usage:
  php php-backend/scripts/backfill-rundown-score-keys.php [options]

Options:
  --apply                Persist key migration AND re-run settlement
                         (without this flag, dry-run only)
  --limit=N              Cap the number of finished matches re-settled
                         (default: 1000)
  --help                 Show this help

The script connects via the same env vars the app uses
(MYSQL_HOST / MYSQL_PORT / MYSQL_DB / MYSQL_USER / MYSQL_PASSWORD), so
run it from a host that has DB credentials in env or .env.
TXT;
    echo PHP_EOL;
}

$options = getopt('', ['apply', 'limit::', 'help']);
if (isset($options['help'])) {
    usage();
    exit(0);
}

$apply = isset($options['apply']);
$limit = isset($options['limit']) ? max(1, (int) $options['limit']) : 1000;

require_once __DIR__ . '/../public/index.php' === false ? '' : '';

// Bootstrap the same autoloader the app uses so SqlRepository /
// BetSettlementService resolve. The bootstrap file lives one level up.
$bootstrap = __DIR__ . '/../bootstrap.php';
if (file_exists($bootstrap)) {
    require_once $bootstrap;
} else {
    // Fallback to manually requiring src/ files.
    foreach (glob(__DIR__ . '/../src/*.php') ?: [] as $file) {
        require_once $file;
    }
    $envFile = __DIR__ . '/../.env';
    if (file_exists($envFile)) {
        foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            if (str_starts_with(trim($line), '#')) continue;
            if (!str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2);
            $k = trim($k);
            $v = trim($v);
            if ($k !== '' && getenv($k) === false) {
                putenv("$k=$v");
                $_ENV[$k] = $v;
            }
        }
    }
}

if (!class_exists('SqlRepository')) {
    fwrite(STDERR, "Could not bootstrap SqlRepository. Run from a working app checkout.\n");
    exit(1);
}

$db = new SqlRepository();

echo ($apply ? "[APPLY] " : "[DRY-RUN] ") . "Scanning matches for legacy score key shape…\n";

// Find every match that has `score.home` set but NOT `score.score_home`.
// We can't filter by missing-key in JSON cleanly across MySQL versions,
// so pull every match with a score doc and inspect in PHP. Volume is
// bounded by the matches table size (typically <50k rows).
$matches = $db->findMany('matches', [], [
    'projection' => ['id' => 1, 'score' => 1, 'status' => 1, 'homeTeam' => 1, 'awayTeam' => 1],
]);

$migrated = 0;
$alreadyOk = 0;
$noScore = 0;
$finishedIds = [];

foreach ($matches as $match) {
    $score = is_array($match['score'] ?? null) ? $match['score'] : null;
    if ($score === null) {
        $noScore++;
        continue;
    }
    $hasCanonical = array_key_exists('score_home', $score) || array_key_exists('score_away', $score);
    $hasLegacy = array_key_exists('home', $score) || array_key_exists('away', $score);
    if ($hasCanonical && !$hasLegacy) {
        $alreadyOk++;
    } elseif ($hasLegacy) {
        if (!$hasCanonical) {
            $score['score_home'] = (int) ($score['home'] ?? 0);
            $score['score_away'] = (int) ($score['away'] ?? 0);
        }
        // Drop the legacy keys so future readers can't accidentally pick
        // up a stale value if the canonical pair gets cleared.
        unset($score['home'], $score['away']);
        if ($apply) {
            $db->updateOne('matches', ['id' => SqlRepository::id((string) $match['id'])], [
                'score' => $score,
                'updatedAt' => SqlRepository::nowUtc(),
            ]);
        }
        $migrated++;
    }
    if (strtolower((string) ($match['status'] ?? '')) === 'finished') {
        $finishedIds[] = (string) $match['id'];
    }
}

echo "  matches scanned        : " . count($matches) . "\n";
echo "  rows migrated          : $migrated" . ($apply ? '' : ' (dry-run)') . "\n";
echo "  rows already canonical : $alreadyOk\n";
echo "  rows with no score     : $noScore\n";
echo "  finished matches       : " . count($finishedIds) . "\n";

if (!$apply) {
    echo "\nDry-run only. Re-run with --apply to persist key migration and re-trigger settlement.\n";
    exit(0);
}

// Re-trigger settlement on every finished match so any bet that
// failed to grade against the old key shape settles with the canonical
// score. settleMatch is idempotent — already-graded bets are skipped
// inside the loop because their selection rows are no longer 'pending'.
echo "\n[APPLY] Re-running settlement on finished matches (limit=$limit)…\n";
$count = 0;
$settledMatches = 0;
$settledBets = 0;
$errors = 0;
foreach (array_slice($finishedIds, 0, $limit) as $matchId) {
    $count++;
    try {
        $result = BetSettlementService::settleMatch($db, $matchId, null, 'backfill-script');
        if (((int) ($result['total'] ?? 0)) > 0) {
            $settledMatches++;
            $settledBets += count((array) ($result['settledBetIds'] ?? []));
        }
    } catch (Throwable $e) {
        $errors++;
    }
}

echo "  matches checked    : $count\n";
echo "  matches w/ bets    : $settledMatches\n";
echo "  bets settled       : $settledBets\n";
echo "  errors             : $errors\n";
echo "\nDone.\n";
