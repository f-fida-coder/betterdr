<?php

declare(strict_types=1);

/**
 * READ-ONLY monitor — does NOT write to the DB. Scans Rundown's
 * `tournament_winner` futures market (id 1141) across configured sports + a
 * date window and prints any winner boards found. Use it to answer "is Rundown
 * serving futures yet?" — as of 2026-06-29 the answer is no (1141 is catalogued
 * but inactive for all 33 sports). Re-run periodically; the moment it prints
 * boards, the ingester (scripts/sync-outrights.php) will populate the same data.
 *
 * Usage: php php-backend/scripts/probe-outrights.php
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

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

if (!RundownClient::isConfigured()) {
    fwrite(STDERR, "[probe] RUNDOWN_API_KEY missing\n");
    exit(1);
}

// Probe the real sports (golf is NOT in the sport map). Mix of individual-
// athlete (tennis/mma) and team sports so we can see which serve winner boards.
$probe = [
    'tennis_atp'              => 38,
    'tennis_wta'              => 39,
    'mma_mixed_martial_arts'  => 7,
    'basketball_nba'          => 4,
    'americanfootball_nfl'    => 2,
    'baseball_mlb'            => 3,
    'icehockey_nhl'           => 6,
    'soccer_epl'              => 11,
    'soccer_uefa_champs_league' => 16,
];

// Sample several dates: futures/championship events are often dated weeks or
// months out, so "today" alone would miss them.
$offsetMin = (int) Env::get('RUNDOWN_DATE_OFFSET_MINUTES', '300');
$dayOffsets = [0, 3, 7, 14, 30, 60, 120];

echo "Scanning for outright boards (moneyline market with >2 participants)\n";
echo str_repeat('=', 70) . "\n";

foreach ($probe as $sportKey => $sportId) {
    $hits = [];
    $totalEvents = 0;
    $partHistogram = []; // participant-count => number of events
    foreach ($dayOffsets as $d) {
        $date = gmdate('Y-m-d', time() + $d * 86400 - $offsetMin * 60);
        try {
            $resp = RundownClient::getEventsForSport($sportId, $date, [
                'market_ids' => '1141', // tournament_winner — the futures market
                'offset'     => $offsetMin,
            ]);
        } catch (Throwable $e) {
            echo sprintf("  %s @ %s ERROR %s\n", $sportKey, $date, $e->getMessage());
            continue;
        }
        $events = is_array($resp['events'] ?? null) ? $resp['events'] : [];
        $totalEvents += count($events);
        foreach ($events as $event) {
            if (is_array($event)) {
                $mk = is_array($event['markets'] ?? null) ? $event['markets'] : [];
                foreach ($mk as $mm) {
                    if (is_array($mm) && (int) ($mm['market_id'] ?? 0) === 1141) {
                        $pc = count(is_array($mm['participants'] ?? null) ? $mm['participants'] : []);
                        $partHistogram[$pc] = ($partHistogram[$pc] ?? 0) + 1;
                    }
                }
            }
            if (!is_array($event)) continue;
            $markets = is_array($event['markets'] ?? null) ? $event['markets'] : [];
            foreach ($markets as $m) {
                if (!is_array($m) || (int) ($m['market_id'] ?? 0) !== 1141) continue;
                $parts = is_array($m['participants'] ?? null) ? $m['participants'] : [];
                if (count($parts) <= 2) continue; // regular game, not a board
                $names = [];
                $types = [];
                foreach ($parts as $p) {
                    if (!is_array($p)) continue;
                    $names[] = (string) ($p['name'] ?? '?');
                    $types[(string) ($p['type'] ?? '?')] = true;
                }
                $eid = (string) ($event['event_id'] ?? '');
                $sched = is_array($event['schedule'] ?? null) ? $event['schedule'] : [];
                $title = (string) ($sched['event_name'] ?? ($event['event_name'] ?? ''));
                $hits[$eid] = sprintf(
                    "    [%s] %s | %d contenders | types=%s | %s\n      e.g. %s",
                    $date,
                    $title !== '' ? $title : '(no name)',
                    count($parts),
                    implode(',', array_keys($types)),
                    $eid,
                    implode(' | ', array_slice($names, 0, 6))
                );
            }
        }
    }
    ksort($partHistogram);
    $histStr = [];
    foreach ($partHistogram as $pc => $n) { $histStr[] = "{$pc}p×{$n}"; }
    echo sprintf(
        "\n%s (sport_id %d): %d total events, %d outright board(s) | ML participant histogram: %s\n",
        $sportKey,
        $sportId,
        $totalEvents,
        count($hits),
        $histStr === [] ? '(no ML markets)' : implode(' ', $histStr)
    );
    foreach ($hits as $line) {
        echo $line . "\n";
    }
}

echo "\n" . str_repeat('=', 70) . "\ndone\n";
