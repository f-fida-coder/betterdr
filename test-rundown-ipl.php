<?php
// Direct Rundown API test - all sports including IPL/cricket
$apiKey = '6a44f3e82176acb0ab522c72d70abfc4145e6da7cb20ec9fc6cb3d7e9a2494c7';
$base = 'https://therundown.io/api/v2';
$today = gmdate('Y-m-d');

$sports = [
    2  => 'NFL', 3 => 'MLB', 4 => 'NBA', 6 => 'NHL',
    7  => 'MMA/UFC', 8 => 'WNBA', 9 => 'CFL', 10 => 'MLS',
    11 => 'EPL', 12 => 'Ligue1', 13 => 'Bundesliga', 14 => 'LaLiga',
    15 => 'Serie A', 16 => 'Champions League', 17 => 'Europa League',
    19 => 'J-League', 20 => 'IPL Cricket', 21 => 'PSL/ODI/T20 Cricket',
    24 => 'NBA Playoffs', 26 => 'NFL Playoffs', 28 => 'NHL Playoffs',
];

echo "=== RUNDOWN LIVE ODDS CHECK ===\n";
echo "Time: " . gmdate('Y-m-d H:i:s') . " UTC\n";
echo "Date queried: $today\n\n";

$totalLive = 0;

foreach ($sports as $id => $name) {
    $url = $base . '/sports/' . $id . '/events/' . $today . '?market_ids=1,2,3&main_line=true';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['X-TheRundown-Key: ' . $apiKey, 'Accept: application/json'],
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);

    if ($err || $code !== 200) {
        echo "  [$name] SKIP (HTTP $code" . ($err ? ", $err" : '') . ")\n";
        continue;
    }

    $data   = json_decode($body, true);
    $events = is_array($data['events'] ?? null) ? $data['events'] : [];

    $live = $finished = $scheduled = [];
    foreach ($events as $ev) {
        $s = strtoupper((string)($ev['score']['event_status'] ?? ''));
        if (in_array($s, ['STATUS_SCHEDULED', 'STATUS_UNCONFIRMED', ''])) {
            $scheduled[] = $ev;
        } elseif (in_array($s, ['STATUS_FINAL','STATUS_FINAL_OT','STATUS_FINAL_PEN',
                                 'STATUS_FULL_TIME','STATUS_CANCELED','STATUS_POSTPONED',
                                 'STATUS_CANCELLED','STATUS_FORFEIT','STATUS_ABANDONED'])) {
            $finished[] = $ev;
        } else {
            $live[] = $ev; // everything with an active STATUS_ prefix
        }
    }

    if (count($live) > 0) {
        $totalLive += count($live);
        echo "  *** LIVE *** [$name] " . count($live) . " live, " . count($finished) . " finished, " . count($scheduled) . " scheduled\n";
        foreach ($live as $ev) {
            $teams = $ev['teams'] ?? [];
            $home = $away = '?';
            foreach ($teams as $t) {
                if ($t['is_home'] ?? false) $home = trim(($t['name'] ?? '') . ' ' . ($t['mascot'] ?? ''));
                if ($t['is_away'] ?? false) $away = trim(($t['name'] ?? '') . ' ' . ($t['mascot'] ?? ''));
            }
            $status = $ev['score']['event_status'] ?? '?';
            $scoreH = $ev['score']['score_home'] ?? '-';
            $scoreA = $ev['score']['score_away'] ?? '-';
            echo "      -> $home vs $away | Status: $status | Score: $scoreH-$scoreA\n";
        }
    } elseif (count($finished) + count($scheduled) > 0) {
        echo "  [$name] 0 live, " . count($finished) . " finished, " . count($scheduled) . " scheduled\n";
    }
}

echo "\n===========================\n";
echo "Total live events found: $totalLive\n";
if ($totalLive > 0) {
    echo "✅ YES - Rundown IS returning live odds!\n";
} else {
    echo "⚠️  NO live events at this moment.\n";
    echo "   IPL & cricket matches typically run 10:00-20:00 UTC\n";
    echo "   MLB/NBA/NHL typically 20:00-05:00 UTC\n";
}
?>
