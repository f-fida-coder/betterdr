<?php

declare(strict_types=1);

/**
 * Casino baccarat + blackjack smoke suite.
 *
 * Usage:
 *   php php-backend/scripts/casino-smoke.php
 *
 * Optional env vars:
 *   SMOKE_BASE_URL (default http://127.0.0.1:5000/api)
 *   SMOKE_ADMIN_USER, SMOKE_ADMIN_PASS (enables admin endpoint checks)
 */

$baseUrl = rtrim((string) (getenv('SMOKE_BASE_URL') ?: 'http://127.0.0.1:5000/api'), '/');
$adminUser = trim((string) getenv('SMOKE_ADMIN_USER'));
$adminPass = (string) getenv('SMOKE_ADMIN_PASS');

function req(string $method, string $url, ?array $body = null, ?string $token = null): array
{
    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('Failed to initialize curl');
    }

    $headers = ['Content-Type: application/json', 'Bypass-Tunnel-Remainder: true'];
    if ($token !== null && $token !== '') {
        $headers[] = 'Authorization: Bearer ' . $token;
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_SLASHES));
    }

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    if ($raw === false) {
        throw new RuntimeException('HTTP request failed: ' . curl_error($ch));
    }

    $data = json_decode((string) $raw, true);
    return ['status' => $status, 'data' => is_array($data) ? $data : ['raw' => $raw]];
}

function assertOk(bool $cond, string $message): void
{
    if (!$cond) {
        throw new RuntimeException($message);
    }
}

function num(mixed $value): float
{
    return is_numeric($value) ? (float) $value : 0.0;
}

function assertSimpleSettlementIntegrity(array $payload, float $expectedWager, float $expectedReturn, string $context): void
{
    $reportedWager = round(num($payload['totalWager'] ?? 0), 2);
    $reportedReturn = round(num($payload['totalReturn'] ?? 0), 2);
    $reportedNet = round(num($payload['netResult'] ?? 0), 2);
    $expectedWager = round($expectedWager, 2);
    $expectedReturn = round($expectedReturn, 2);
    $expectedNet = round($expectedReturn - $expectedWager, 2);

    assertOk(abs($reportedWager - $expectedWager) < 0.01, $context . ': totalWager mismatch');
    assertOk(abs($reportedReturn - $expectedReturn) < 0.01, $context . ': totalReturn mismatch');
    assertOk(abs($reportedNet - $expectedNet) < 0.01, $context . ': netResult mismatch');

    if (is_numeric($payload['balanceBefore'] ?? null) && is_numeric($payload['balanceAfter'] ?? null)) {
        $delta = round(num($payload['balanceAfter']) - num($payload['balanceBefore']), 2);
        assertOk(abs($delta - $expectedNet) < 0.01, $context . ': balance delta mismatch');
    }
}

try {
    $seed = (string) time();
    $username = 'casino_smoke_' . $seed;
    $phone = '561' . substr($seed, -7);
    $password = 'SmokePass123!';

    echo "1) Registering smoke user...\n";
    $register = req('POST', $baseUrl . '/auth/register', [
        'username' => $username,
        'phoneNumber' => $phone,
        'password' => $password,
    ]);
    assertOk(in_array($register['status'], [200, 201], true), 'Register failed');

    echo "2) Login smoke user...\n";
    $login = req('POST', $baseUrl . '/auth/login', ['username' => $username, 'password' => $password]);
    assertOk($login['status'] === 200, 'Login failed');
    $token = (string) ($login['data']['token'] ?? '');
    assertOk($token !== '', 'Missing user token');

    echo "3) Place baccarat bet with requestId...\n";
    $requestId = 'smoke_' . $seed;
    $place = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => $requestId,
        'game' => 'baccarat',
        'bets' => ['Player' => 5, 'Banker' => 0, 'Tie' => 0],
    ], $token);
    assertOk($place['status'] === 200, 'First casino bet failed');
    $roundId = (string) ($place['data']['roundId'] ?? '');
    assertOk($roundId !== '', 'Missing roundId');
    assertOk((string) ($place['data']['requestId'] ?? '') === $requestId, 'requestId mismatch');
    assertOk(array_key_exists('balanceBefore', $place['data']), 'Missing balanceBefore in bet response');
    assertOk(array_key_exists('balanceAfter', $place['data']), 'Missing balanceAfter in bet response');
    assertOk(is_array($place['data']['ledgerEntries'] ?? null), 'Missing ledgerEntries in bet response');
    assertOk((string) ($place['data']['integrityHash'] ?? '') !== '', 'Missing integrityHash in bet response');

    echo "4) Replay same requestId (idempotency)...\n";
    $replay = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => $requestId,
        'game' => 'baccarat',
        'bets' => ['Player' => 5, 'Banker' => 0, 'Tie' => 0],
    ], $token);
    assertOk($replay['status'] === 200, 'Replay request failed');
    assertOk((string) ($replay['data']['roundId'] ?? '') === $roundId, 'Idempotent roundId mismatch');
    assertOk((bool) ($replay['data']['idempotent'] ?? false) === true, 'Expected idempotent=true on replay');

    echo "5) Validate player history + detail...\n";
    $history = req('GET', $baseUrl . '/casino/bet/history?page=1&limit=5', null, $token);
    assertOk($history['status'] === 200, 'History failed');
    assertOk(is_array($history['data']['bets'] ?? null), 'History bets missing');
    assertOk((int) (($history['data']['pagination']['total'] ?? 0)) >= 1, 'History total should be >= 1');
    $todayHistory = req('GET', $baseUrl . '/casino/bet/history?page=1&limit=10&to=' . gmdate('Y-m-d'), null, $token);
    assertOk($todayHistory['status'] === 200, 'History to-date filter failed');
    $todayRoundIds = array_map(
        static fn(array $bet): string => (string) ($bet['roundId'] ?? $bet['id'] ?? ''),
        is_array($todayHistory['data']['bets'] ?? null) ? $todayHistory['data']['bets'] : []
    );
    assertOk(in_array($roundId, $todayRoundIds, true), 'History to-date filter should include today round');

    $detail = req('GET', $baseUrl . '/casino/bet/' . $roundId, null, $token);
    assertOk($detail['status'] === 200, 'Round detail failed');
    assertOk((string) ($detail['data']['bet']['roundId'] ?? '') === $roundId, 'Detail round mismatch');
    assertOk(is_array($detail['data']['bet']['ledgerEntries'] ?? null), 'Ledger entries missing in detail');

    echo "6) Place blackjack round and verify native-client settlement...\n";
    $blackjackRequestId = 'smoke_blackjack_' . $seed;
    $blackjack = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => $blackjackRequestId,
        'game' => 'blackjack',
        'bets' => [
            'totalWager' => 9,
            'totalReturn' => 0,
            'result' => 'Lose',
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 9],
            ],
        ],
    ], $token);
    assertOk($blackjack['status'] === 200, 'Blackjack bet failed');
    $blackjackRoundId = (string) ($blackjack['data']['roundId'] ?? '');
    assertOk($blackjackRoundId !== '', 'Missing blackjack roundId');
    assertOk((string) ($blackjack['data']['game'] ?? '') === 'blackjack', 'Blackjack response game mismatch');
    assertOk((string) ($blackjack['data']['outcomeSource'] ?? '') === 'native_client_round', 'Blackjack outcome source must be native_client_round');
    assertSimpleSettlementIntegrity($blackjack['data'], 9.0, 0.0, 'blackjack initial');

    echo "7) Replay blackjack requestId (idempotency)...\n";
    $blackjackReplay = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => $blackjackRequestId,
        'game' => 'blackjack',
        'bets' => [
            'totalWager' => 9,
            'totalReturn' => 18,
            'result' => 'Win',
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 9],
            ],
        ],
    ], $token);
    assertOk($blackjackReplay['status'] === 200, 'Blackjack replay failed');
    assertOk((string) ($blackjackReplay['data']['roundId'] ?? '') === $blackjackRoundId, 'Blackjack idempotent roundId mismatch');
    assertOk((bool) ($blackjackReplay['data']['idempotent'] ?? false) === true, 'Expected blackjack idempotent=true on replay');
    assertSimpleSettlementIntegrity($blackjackReplay['data'], 9.0, 0.0, 'blackjack replay');

    $blackjackHistory = req('GET', $baseUrl . '/casino/bet/history?page=1&limit=20&game=blackjack', null, $token);
    assertOk($blackjackHistory['status'] === 200, 'Blackjack history filter failed');
    $blackjackRoundIds = array_map(
        static fn(array $bet): string => (string) ($bet['roundId'] ?? $bet['id'] ?? ''),
        is_array($blackjackHistory['data']['bets'] ?? null) ? $blackjackHistory['data']['bets'] : []
    );
    assertOk(in_array($blackjackRoundId, $blackjackRoundIds, true), 'Blackjack history filter should include blackjack round');

    echo "8) Enforce casino loss limits...\n";
    $currentNetLoss = 0.0;
    foreach ([$place, $blackjack] as $roundResponse) {
        $netResult = isset($roundResponse['data']['netResult']) && is_numeric($roundResponse['data']['netResult'])
            ? (float) $roundResponse['data']['netResult']
            : 0.0;
        // net loss = total wager - total return = -netResult
        $currentNetLoss -= $netResult;
    }
    $currentNetLoss = round($currentNetLoss, 2);
    $lossProbeWager = max(5.0, min(250.0, (float) ceil(max(0.0, -$currentNetLoss) + 2.0)));
    // Force: (currentNetLoss + lossProbeWager) > tightLossLimit
    $tightLossLimit = round(max(0.5, $currentNetLoss + $lossProbeWager - 1.0), 2);

    $setLimits = req('PUT', $baseUrl . '/auth/gambling-limits', [
        'lossDaily' => $tightLossLimit,
        'lossWeekly' => $tightLossLimit,
        'lossMonthly' => $tightLossLimit,
    ], $token);
    assertOk($setLimits['status'] === 200, 'Failed to set gambling limits');

    $blockedByLossLimit = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => 'smoke_limit_' . $seed,
        'game' => 'blackjack',
        'bets' => [
            'totalWager' => $lossProbeWager,
            'totalReturn' => 0,
            'result' => 'Lose',
        ],
    ], $token);
    assertOk(
        $blockedByLossLimit['status'] === 400,
        'Casino loss limit should block wager, got HTTP ' . $blockedByLossLimit['status']
    );
    $lossLimitMessage = strtolower((string) ($blockedByLossLimit['data']['message'] ?? ''));
    assertOk(
        str_contains($lossLimitMessage, 'loss limit'),
        'Casino loss-limit block reason missing. Response: ' . json_encode($blockedByLossLimit['data'])
    );

    $relaxLimits = req('PUT', $baseUrl . '/auth/gambling-limits', [
        'lossDaily' => 100000,
        'lossWeekly' => 100000,
        'lossMonthly' => 100000,
    ], $token);
    assertOk($relaxLimits['status'] === 200, 'Failed to reset gambling limits');

    echo "9) Enforce cooling-off on casino betting...\n";
    $cooling = req('POST', $baseUrl . '/auth/cooling-off', ['duration' => '24h'], $token);
    assertOk($cooling['status'] === 200, 'Failed to activate cooling-off period');

    $blockedByCoolingOff = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => 'smoke_cooldown_' . $seed,
        'game' => 'baccarat',
        'bets' => ['Player' => 5, 'Banker' => 0, 'Tie' => 0],
    ], $token);
    assertOk($blockedByCoolingOff['status'] === 403, 'Cooling-off period should block casino betting');

    if ($adminUser !== '' && $adminPass !== '') {
        echo "10) Login admin and validate admin casino endpoints...\n";
        $adminLogin = req('POST', $baseUrl . '/auth/admin/login', ['username' => $adminUser, 'password' => $adminPass]);
        assertOk($adminLogin['status'] === 200, 'Admin login failed');
        $adminToken = (string) ($adminLogin['data']['token'] ?? '');
        assertOk($adminToken !== '', 'Missing admin token');

        $adminList = req('GET', $baseUrl . '/admin/casino/bets?page=1&limit=20&username=' . urlencode($username), null, $adminToken);
        assertOk($adminList['status'] === 200, 'Admin casino list failed');

        $adminDetail = req('GET', $baseUrl . '/admin/casino/bets/' . $roundId, null, $adminToken);
        assertOk($adminDetail['status'] === 200, 'Admin casino detail failed');

        $summary = req('GET', $baseUrl . '/admin/casino/summary', null, $adminToken);
        assertOk($summary['status'] === 200, 'Admin casino summary failed');
    } else {
        echo "10) Skipping admin endpoint checks (SMOKE_ADMIN_USER/SMOKE_ADMIN_PASS not set)...\n";
    }

    echo "\nCasino smoke suite passed.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Casino smoke suite failed: " . $e->getMessage() . "\n");
    exit(1);
}
