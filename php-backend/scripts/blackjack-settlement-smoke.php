<?php

declare(strict_types=1);

/**
 * Blackjack server-settlement smoke suite.
 *
 * Usage:
 *   php php-backend/scripts/blackjack-settlement-smoke.php
 *
 * Optional env vars:
 *   SMOKE_BASE_URL (default http://127.0.0.1:5000/api)
 */

$baseUrl = rtrim((string) (getenv('SMOKE_BASE_URL') ?: 'http://127.0.0.1:5000/api'), '/');

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

function assertClose(float $actual, float $expected, string $label): void
{
    if (abs(round($actual, 2) - round($expected, 2)) > 0.01) {
        throw new RuntimeException($label . ' mismatch: expected ' . round($expected, 2) . ', got ' . round($actual, 2));
    }
}

function placeBlackjackRound(string $baseUrl, string $token, string $requestId, array $bets): array
{
    $response = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => $requestId,
        'game' => 'blackjack',
        'bets' => $bets,
    ], $token);

    assertOk($response['status'] === 200, 'Blackjack round failed for requestId=' . $requestId . ' (HTTP ' . $response['status'] . ')');
    return $response['data'];
}

function assertRoundIntegrity(array $round, float $expectedWager, float $expectedReturn, float $expectedNet, string $expectedResultType, string $context): void
{
    assertOk((string) ($round['game'] ?? '') === 'blackjack', $context . ': game mismatch');
    assertOk((string) ($round['outcomeSource'] ?? '') === 'client_actions_server_rules', $context . ': outcomeSource mismatch');
    assertClose(num($round['totalWager'] ?? 0), $expectedWager, $context . ': totalWager');
    assertClose(num($round['totalReturn'] ?? 0), $expectedReturn, $context . ': totalReturn');
    assertClose(num($round['netResult'] ?? 0), $expectedNet, $context . ': netResult');
    assertOk((string) ($round['resultType'] ?? '') === $expectedResultType, $context . ': resultType mismatch');

    $before = num($round['balanceBefore'] ?? 0);
    $after = num($round['balanceAfter'] ?? 0);
    assertClose($after - $before, $expectedNet, $context . ': balance delta');
}

try {
    $seed = (string) time();
    $username = 'bj_settle_' . $seed;
    $phone = '562' . substr($seed, -7);
    $password = 'SmokePass123!';

    echo "1) Registering blackjack settlement smoke user...\n";
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
    assertOk($token !== '', 'Missing token');

    echo "3) Natural blackjack payout should be 3:2...\n";
    $round1 = placeBlackjackRound(
        $baseUrl,
        $token,
        'bj_settle_' . $seed . '_1',
        [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 10, 'pairs' => 0, 'plus21' => 0, 'royal' => 0, 'superSeven' => 0, 'insurance' => 0],
            ],
            'hands' => [
                ['zone' => 'betZone1', 'cards' => ['A:s1', 'K:s2'], 'bet' => 10, 'isSplit' => false],
            ],
            'dealerCards' => ['10:s3', '8:s4'],
        ]
    );
    assertRoundIntegrity($round1, 10, 25, 15, 'blackjack', 'round1_blackjack');

    echo "4) Push should return full stake...\n";
    $round2 = placeBlackjackRound(
        $baseUrl,
        $token,
        'bj_settle_' . $seed . '_2',
        [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 10, 'pairs' => 0, 'plus21' => 0, 'royal' => 0, 'superSeven' => 0, 'insurance' => 0],
            ],
            'hands' => [
                ['zone' => 'betZone1', 'cards' => ['10:s1', 'Q:s2'], 'bet' => 10, 'isSplit' => false],
            ],
            'dealerCards' => ['10:s3', 'Q:s4'],
        ]
    );
    assertRoundIntegrity($round2, 10, 10, 0, 'push', 'round2_push');

    echo "5) Insurance win should offset main-hand loss when dealer has blackjack...\n";
    $round3 = placeBlackjackRound(
        $baseUrl,
        $token,
        'bj_settle_' . $seed . '_3',
        [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 10, 'pairs' => 0, 'plus21' => 0, 'royal' => 0, 'superSeven' => 0, 'insurance' => 5],
            ],
            'hands' => [
                ['zone' => 'betZone1', 'cards' => ['10:s1', '8:s2'], 'bet' => 10, 'isSplit' => false],
            ],
            'dealerCards' => ['A:s3', 'K:s4'],
        ]
    );
    assertRoundIntegrity($round3, 15, 15, 0, 'push', 'round3_insurance');

    echo "6) Surrender should return half the hand stake...\n";
    $round4 = placeBlackjackRound(
        $baseUrl,
        $token,
        'bj_settle_' . $seed . '_4',
        [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 10, 'pairs' => 0, 'plus21' => 0, 'royal' => 0, 'superSeven' => 0, 'insurance' => 0],
            ],
            'hands' => [
                ['zone' => 'betZone1', 'cards' => ['10:s1', '6:s2'], 'bet' => 10, 'isSplit' => false, 'surrendered' => true],
            ],
            'dealerCards' => ['9:s3', '7:s4'],
        ]
    );
    assertRoundIntegrity($round4, 10, 5, -5, 'surrender', 'round4_surrender');

    echo "7) Perfect pair side-bet payout should be enforced server-side...\n";
    $round5 = placeBlackjackRound(
        $baseUrl,
        $token,
        'bj_settle_' . $seed . '_5',
        [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 10, 'pairs' => 2, 'plus21' => 0, 'royal' => 0, 'superSeven' => 0, 'insurance' => 0],
            ],
            'hands' => [
                ['zone' => 'betZone1', 'cards' => ['9:s1', '9:s1'], 'bet' => 10, 'isSplit' => false],
            ],
            'dealerCards' => ['10:s3', 'Q:s4'],
        ]
    );
    // Main loses (0), side perfect pair returns 2 * 26 = 52 => wager 12, return 52, net +40.
    assertRoundIntegrity($round5, 12, 52, 40, 'standard', 'round5_pairs');

    echo "8) Validate detail endpoint exposes resultType and betDetails...\n";
    $roundId = (string) ($round5['roundId'] ?? '');
    assertOk($roundId !== '', 'Missing roundId in round5');
    $detail = req('GET', $baseUrl . '/casino/bet/' . $roundId, null, $token);
    assertOk($detail['status'] === 200, 'Round detail fetch failed');
    $detailBet = is_array($detail['data']['bet'] ?? null) ? $detail['data']['bet'] : [];
    assertOk((string) ($detailBet['resultType'] ?? '') === 'standard', 'Detail resultType mismatch');
    assertOk(is_array($detailBet['betDetails'] ?? null), 'Detail betDetails missing');

    echo "\nBlackjack settlement smoke suite passed.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Blackjack settlement smoke suite failed: " . $e->getMessage() . "\n");
    exit(1);
}
