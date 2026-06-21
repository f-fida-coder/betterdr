<?php

declare(strict_types=1);

/**
 * Manual Rundown feed kill-switch (operator tool).
 *
 *   php scripts/feed-switch.php off      Stop ALL Rundown upstream calls — zero
 *                                        datapoints consumed. The board shows
 *                                        "odds unavailable" + suspends betting,
 *                                        and stale rows age out of the freshness
 *                                        gate (no frozen old prices left on screen).
 *   php scripts/feed-switch.php on       Resume the normal feed.
 *   php scripts/feed-switch.php status   Print the current state.
 *
 * File-backed (SharedFileCache), so the running workers AND php-fpm pick up the
 * change within seconds — NO restart needed. The switch persists across reboots
 * until you explicitly turn it back on.
 */

require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();
require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/SharedFileCache.php';
require_once __DIR__ . '/../src/RundownClient.php';

Env::load(dirname(__DIR__, 2), dirname(__DIR__));

$cmd = strtolower(trim((string) ($argv[1] ?? 'status')));
if (!in_array($cmd, ['on', 'off', 'status'], true)) {
    fwrite(STDERR, "usage: php scripts/feed-switch.php [off|on|status]\n");
    exit(2);
}

if ($cmd === 'off') {
    RundownClient::setFeedOff(true);
} elseif ($cmd === 'on') {
    RundownClient::setFeedOff(false);
}

$off = RundownClient::feedOff();
echo 'Rundown feed: ' . ($off
    ? 'OFF — no upstream calls, no datapoints; board shows odds unavailable + suspends'
    : 'ON — normal') . "\n";
exit(0);
