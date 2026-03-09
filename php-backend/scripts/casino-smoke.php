<?php

declare(strict_types=1);

/**
 * Casino baccarat + roulette smoke suite.
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

function rouletteMultiplier(string $type): float
{
    return match ($type) {
        'straight' => 36.0,
        'dozen', 'column' => 3.0,
        'color', 'parity', 'range' => 2.0,
        default => 0.0,
    };
}

function rouletteBetWins(array $bet, array $outcome): bool
{
    $type = strtolower(trim((string) ($bet['type'] ?? '')));
    $value = strtolower(trim((string) ($bet['value'] ?? '')));

    return match ($type) {
        'straight' => (int) $value === (int) ($outcome['number'] ?? -999),
        'dozen' => $value !== '' && $value === strtolower((string) ($outcome['dozen'] ?? '')),
        'column' => $value !== '' && $value === strtolower((string) ($outcome['column'] ?? '')),
        'color' => $value !== '' && $value === strtolower((string) ($outcome['color'] ?? '')),
        'parity' => $value !== '' && $value === strtolower((string) ($outcome['parity'] ?? '')),
        'range' => $value !== '' && $value === strtolower((string) ($outcome['range'] ?? '')),
        default => false,
    };
}

function rouletteBetKey(array $bet): string
{
    $type = strtolower(trim((string) ($bet['type'] ?? '')));
    $value = strtolower(trim((string) ($bet['value'] ?? '')));
    if ($type === 'straight') {
        $value = (string) ((int) $value);
    }
    return $type . ':' . $value;
}

function assertRouletteSettlementIntegrity(array $payload, string $context): void
{
    $outcome = is_array($payload['rouletteOutcome'] ?? null) ? $payload['rouletteOutcome'] : null;
    assertOk($outcome !== null, $context . ': rouletteOutcome missing');

    $bets = is_array($payload['bets'] ?? null) ? $payload['bets'] : [];
    $expectedWager = 0.0;
    $expectedReturn = 0.0;
    $expectedWinningKeys = [];

    foreach ($bets as $bet) {
        if (!is_array($bet)) {
            continue;
        }

        $amount = round(num($bet['amount'] ?? 0), 2);
        if ($amount <= 0) {
            continue;
        }

        $type = strtolower(trim((string) ($bet['type'] ?? '')));
        $multiplier = rouletteMultiplier($type);
        assertOk($multiplier > 0, $context . ': unsupported roulette bet type in response: ' . $type);

        $expectedWager = round($expectedWager + $amount, 2);
        if (rouletteBetWins($bet, $outcome)) {
            $expectedReturn = round($expectedReturn + round($amount * $multiplier, 2), 2);
            $expectedWinningKeys[] = (string) ($bet['key'] ?? rouletteBetKey($bet));
        }
    }

    $reportedWinningKeys = is_array($payload['winningBetKeys'] ?? null) ? $payload['winningBetKeys'] : [];
    sort($expectedWinningKeys);
    sort($reportedWinningKeys);

    $reportedWager = round(num($payload['totalWager'] ?? 0), 2);
    $reportedReturn = round(num($payload['totalReturn'] ?? 0), 2);
    $reportedNet = round(num($payload['netResult'] ?? 0), 2);
    $expectedNet = round($expectedReturn - $expectedWager, 2);

    assertOk(abs($reportedWager - $expectedWager) < 0.01, $context . ': totalWager mismatch');
    assertOk(abs($reportedReturn - $expectedReturn) < 0.01, $context . ': totalReturn mismatch');
    assertOk(abs($reportedNet - $expectedNet) < 0.01, $context . ': netResult mismatch');
    assertOk($reportedWinningKeys === $expectedWinningKeys, $context . ': winningBetKeys mismatch');

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

    echo "6) Place roulette round and verify server authoritative settlement...\n";
    $rouletteRequestId = 'smoke_roulette_' . $seed;
    $roulette = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => $rouletteRequestId,
        'game' => 'roulette',
        'bets' => [
            ['type' => 'color', 'value' => 'red', 'amount' => 3],
            ['type' => 'straight', 'value' => '17', 'amount' => 2],
        ],
        // Server should ignore this and still settle via server RNG.
        'clientOutcomeNumber' => 17,
    ], $token);
    assertOk($roulette['status'] === 200, 'Roulette bet failed');
    $rouletteRoundId = (string) ($roulette['data']['roundId'] ?? '');
    assertOk($rouletteRoundId !== '', 'Missing roulette roundId');
    assertOk((string) ($roulette['data']['game'] ?? '') === 'roulette', 'Roulette response game mismatch');
    assertOk((string) ($roulette['data']['outcomeSource'] ?? '') === 'server_rng', 'Roulette outcome source must be server_rng');
    assertOk(is_array($roulette['data']['rouletteOutcome'] ?? null), 'Roulette outcome payload missing');
    assertRouletteSettlementIntegrity($roulette['data'], 'roulette initial');

    echo "7) Replay roulette requestId (idempotency)...\n";
    $rouletteReplay = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => $rouletteRequestId,
        'game' => 'roulette',
        'bets' => [
            ['type' => 'color', 'value' => 'red', 'amount' => 3],
            ['type' => 'straight', 'value' => '17', 'amount' => 2],
        ],
        'clientOutcomeNumber' => 0,
    ], $token);
    assertOk($rouletteReplay['status'] === 200, 'Roulette replay failed');
    assertOk((string) ($rouletteReplay['data']['roundId'] ?? '') === $rouletteRoundId, 'Roulette idempotent roundId mismatch');
    assertOk((bool) ($rouletteReplay['data']['idempotent'] ?? false) === true, 'Expected roulette idempotent=true on replay');
    assertRouletteSettlementIntegrity($rouletteReplay['data'], 'roulette replay');

    echo "8) Enforce casino loss limits...\n";
    $currentNetLoss = 0.0;
    foreach ([$place, $roulette] as $roundResponse) {
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
        'game' => 'roulette',
        'bets' => [
            ['type' => 'color', 'value' => 'black', 'amount' => $lossProbeWager],
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
