<?php
declare(strict_types=1);

// One-off probe: does Rundown ship an "Under" side for MLB batter_hits (12)?
// Pulls TOR@BOS with NO affiliate filter and NO main_line filter so we see
// every book and every rung (main + non-main). Market 40 (stolen bases) is a
// control — that one DID show unders on the board.
// Usage: php php-backend/scripts/probe-prop-under.php

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);
require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
Env::load($projectRoot, $phpBackendDir);

if (!RundownClient::isConfigured()) {
    fwrite(STDERR, "RundownClient not configured (RUNDOWN_API_KEY missing)\n");
    exit(1);
}

$date = '2026-06-18';
$resp = RundownClient::getEventsForSport(3, $date, [
    'market_ids' => '12,40',   // batter_hits, batter_stolen_bases
    // deliberately NO affiliate_ids and NO main_line
]);

$events = is_array($resp['events'] ?? null) ? $resp['events'] : [];
printf("MLB events returned for %s: %d\n", $date, count($events));

// Find TOR@BOS
$target = null;
foreach ($events as $ev) {
    $teams = strtolower(json_encode($ev['teams'] ?? $ev['teams_normalized'] ?? []));
    if (str_contains($teams, 'blue jays') || str_contains($teams, 'red sox') || str_contains($teams, 'toronto') || str_contains($teams, 'boston')) {
        $target = $ev;
        break;
    }
}
if ($target === null) {
    fwrite(STDERR, "Could not find TOR@BOS in returned events. Event names:\n");
    foreach ($events as $ev) {
        fwrite(STDERR, '  - ' . json_encode($ev['teams_normalized'] ?? $ev['teams'] ?? '?') . "\n");
    }
    exit(1);
}

printf("Matched event: %s  (event_id=%s)\n\n", json_encode($target['teams_normalized'] ?? $target['teams'] ?? '?'), (string) ($target['event_id'] ?? '?'));

$markets = is_array($target['markets'] ?? null) ? $target['markets'] : [];

foreach ([12 => 'batter_hits', 40 => 'batter_stolen_bases'] as $mid => $label) {
    printf("=================== market %d (%s) ===================\n", $mid, $label);
    $overCount = 0; $underCount = 0; $underMain = 0; $underNonMain = 0;
    $underBooks = [];
    $sampleUnder = [];
    foreach ($markets as $market) {
        if ((int) ($market['market_id'] ?? 0) !== $mid) continue;
        foreach (($market['participants'] ?? []) as $p) {
            $player = (string) ($p['name'] ?? '?');
            foreach (($p['lines'] ?? []) as $line) {
                $val = (string) ($line['value'] ?? '');
                $isUnder = stripos($val, 'under') === 0;
                $isOver  = stripos($val, 'over') === 0;
                foreach (($line['prices'] ?? []) as $affId => $price) {
                    if (!is_array($price)) continue;
                    if (!is_numeric($price['price'] ?? null)) continue;
                    $main = !empty($price['is_main_line']);
                    if ($isOver)  $overCount++;
                    if ($isUnder) {
                        $underCount++;
                        $main ? $underMain++ : $underNonMain++;
                        $underBooks[(int) $affId] = true;
                        if (count($sampleUnder) < 8) {
                            $sampleUnder[] = sprintf('%s | %s | aff=%d | price=%s | main=%s',
                                $player, $val, (int) $affId, (string) $price['price'], $main ? 'Y' : 'N');
                        }
                    }
                }
            }
        }
    }
    printf("  over prices: %d   under prices: %d  (under main=%d, under non-main=%d)\n", $overCount, $underCount, $underMain, $underNonMain);
    printf("  affiliates offering UNDER: %s\n", $underBooks ? implode(',', array_keys($underBooks)) : '(none)');
    foreach ($sampleUnder as $s) printf("    %s\n", $s);
    echo "\n";
}
