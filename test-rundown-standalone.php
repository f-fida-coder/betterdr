#!/usr/bin/env php
<?php
// Standalone Rundown API test

$apiKey = '6a44f3e82176acb0ab522c72d70abfc4145e6da7cb20ec9fc6cb3d7e9a2494c7';
$baseUrl = 'https://therundown.io/api/v2';

echo "=== RUNDOWN API DIAGNOSTIC TEST ===\n\n";

// Test 1: Get sports list
echo "1. Fetching sports list...\n";
$url = $baseUrl . '/sports';
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['X-TheRundown-Key: ' . $apiKey, 'Accept: application/json'],
    CURLOPT_TIMEOUT => 8,
    CURLOPT_CONNECTTIMEOUT => 4,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

if ($error) {
    echo "   ERROR: $error\n";
} elseif ($httpCode !== 200) {
    echo "   ERROR: HTTP $httpCode\n";
} else {
    $data = json_decode($response, true);
    $sports = $data['sports'] ?? [];
    echo "   ✓ Got " . count($sports) . " sports\n";
}

// Test 2: Check specific sports for live events
echo "\n2. Checking for live events (today)...\n";
$today = gmdate('Y-m-d');
$testSports = [
    2  => 'NFL',
    4  => 'NBA', 
    3  => 'MLB',
    6  => 'NHL',
    10 => 'MLS',
    11 => 'EPL',
];

$totalLive = 0;
$totalFinished = 0;

foreach ($testSports as $sportId => $name) {
    $url = $baseUrl . '/sports/' . $sportId . '/events/' . urlencode($today) 
        . '?market_ids=1,2,3&main_line=true';
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['X-TheRundown-Key: ' . $apiKey, 'Accept: application/json'],
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        $events = $data['events'] ?? [];
        
        $live = 0;
        $finished = 0;
        foreach ($events as $event) {
            $status = $event['score']['event_status'] ?? '';
            if (strpos($status, 'STATUS_IN_PROGRESS') !== false || 
                (strpos($status, 'STATUS_') === 0 && !in_array($status, [
                    'STATUS_SCHEDULED', 'STATUS_FINAL', 'STATUS_FINAL_OT', 'STATUS_FINAL_PEN',
                    'STATUS_FULL_TIME', 'STATUS_CANCELED', 'STATUS_POSTPONED'
                ]))) {
                $live++;
            } elseif (in_array($status, ['STATUS_FINAL', 'STATUS_FINAL_OT', 'STATUS_FINAL_PEN', 'STATUS_FULL_TIME'])) {
                $finished++;
            }
        }
        
        $totalLive += $live;
        $totalFinished += $finished;
        
        echo "   $name: Live=$live, Finished=$finished\n";
    } else {
        echo "   $name: HTTP $httpCode\n";
    }
}

echo "\n3. SUMMARY:\n";
echo "   Current UTC time: " . gmdate('Y-m-d H:i:s') . "\n";
echo "   Total live events: $totalLive\n";
echo "   Total finished events: $totalFinished\n";

if ($totalLive > 0) {
    echo "\n   ✅ YES - Rundown API IS returning live odds!\n";
} else {
    echo "\n   ⚠️  NO - Rundown API is not returning any live events right now\n";
    echo "      This is normal if no covered sports have live games at this time.\n";
}

echo "\n";
?>
