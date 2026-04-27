<?php
// Direct test of Rundown API

// Include the autoloader
require __DIR__ . '/php-backend/public/index.php';

use BettorPlays247\Services\RundownService;
use BettorPlays247\Services\RundownLiveSync;

echo "=== RUNDOWN API DIAGNOSTIC TEST ===\n\n";

// Check if enabled
$enabled = RundownService::isEnabled();
echo "1. Service Enabled: " . ($enabled ? "YES" : "NO") . "\n";

if (!$enabled) {
    echo "   ERROR: Rundown service is not enabled. Check RUNDOWN_LIVE_ENABLED=true\n";
    exit(1);
}

// Get sports list
echo "\n2. Fetching sports list from Rundown...\n";
$sports = RundownService::listSports();
echo "   Sports count: " . count($sports) . "\n";
if (count($sports) > 0) {
    echo "   Sample sports: ";
    foreach (array_slice($sports, 0, 3) as $sport) {
        echo "[ID: " . $sport['id'] . " = " . $sport['name'] . "] ";
    }
    echo "\n";
}

// Get covered sports set
$covered = RundownLiveSync::coveredSportKeysSet();
echo "\n3. Rundown-covered sports: " . count($covered) . "\n";
echo "   Covered: " . implode(", ", array_keys($covered)) . "\n";

// Try fetching live events for each covered sport ID
echo "\n4. Fetching live events from Rundown:\n";
$totalEvents = 0;
$totalLive = 0;
$totalFinished = 0;
$errorCount = 0;

// Map of Rundown Sport IDs to check
$testSports = [
    2  => 'NFL',
    4  => 'NBA',
    3  => 'MLB',
    6  => 'NHL',
    10 => 'MLS',
    11 => 'EPL',
];

foreach ($testSports as $sportId => $sportName) {
    echo "   Testing $sportName (ID: $sportId)... ";
    $result = RundownService::liveEventsForSport($sportId);
    
    if (!$result['ok']) {
        echo "ERROR: " . ($result['error'] ?? 'unknown') . "\n";
        $errorCount++;
    } else {
        $live = count($result['live'] ?? []);
        $finished = count($result['finished'] ?? []);
        $totalLive += $live;
        $totalFinished += $finished;
        $totalEvents += $live + $finished;
        echo "Live: $live, Finished: $finished\n";
    }
}

echo "\n5. SUMMARY:\n";
echo "   Total live events found: $totalLive\n";
echo "   Total finished events found: $totalFinished\n";
echo "   API errors encountered: $errorCount\n";

if ($totalLive > 0) {
    echo "\n✅ SUCCESS: Rundown API is returning live odds!\n";
} elseif ($totalFinished > 0) {
    echo "\n⚠️  NO LIVE EVENTS: But API is working (found finished events)\n";
    echo "   This is normal if no games are currently live for these sports.\n";
    echo "   Check the time of day: " . date('Y-m-d H:i:s') . " UTC\n";
} else {
    echo "\n❌ NO EVENTS FOUND: API may be down or having issues\n";
}

echo "\n";
?>
