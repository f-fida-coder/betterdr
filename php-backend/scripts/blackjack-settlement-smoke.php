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

function assertRoundMath(array $round, string $context): void
{
    assertOk((string) ($round['game'] ?? '') === 'blackjack', $context . ': game mismatch');
    assertOk((string) ($round['outcomeSource'] ?? '') === 'server_simulated_actions', $context . ': outcomeSource mismatch');

    $before = num($round['balanceBefore'] ?? 0);
    $after = num($round['balanceAfter'] ?? 0);
    $wager = num($round['totalWager'] ?? 0);
    $return = num($round['totalReturn'] ?? 0);
    $net = num($round['netResult'] ?? 0);
    assertClose($return - $wager, $net, $context . ': wager/return/net mismatch');
    assertClose($after - $before, $net, $context . ': balance delta mismatch');
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

    echo "3) Server should ignore forged card payloads and settle from action replay...\n";
    $round1 = placeBlackjackRound(
        $baseUrl,
        $token,
        'bj_settle_' . $seed . '_1',
        [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 10, 'pairs' => 0, 'plus21' => 0, 'royal' => 0, 'superSeven' => 0, 'insurance' => 0],
            ],
            'actions' => [
                ['action' => 'deal'],
                ['action' => 'stand', 'zone' => 'betZone1'],
            ],
            // Forged cards should be ignored by the backend simulation.
            'hands' => [
                ['zone' => 'betZone1', 'cards' => ['A:s1', 'A:s2', 'A:s3', 'A:s4', 'K:s1', 'K:s2', 'K:s3', 'K:s4'], 'bet' => 10, 'isSplit' => false],
            ],
            'dealerCards' => ['10:s3', '10:s4', '10:s1', '10:s2'],
        ]
    );
    assertRoundMath($round1, 'round1');
    $round1Hands = is_array($round1['betDetails']['hands'] ?? null) ? $round1['betDetails']['hands'] : [];
    assertOk(count($round1Hands) === 1, 'round1: expected one settled hand');
    $round1Cards = is_array($round1Hands[0]['cards'] ?? null) ? $round1Hands[0]['cards'] : [];
    assertOk(count($round1Cards) === 2, 'round1: expected exactly two cards after deal+stand replay');

    echo "4) Same requestId should be idempotent even with different payload body...\n";
    $round2 = placeBlackjackRound(
        $baseUrl,
        $token,
        'bj_settle_' . $seed . '_1',
        [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 1, 'pairs' => 0, 'plus21' => 0, 'royal' => 0, 'superSeven' => 0, 'insurance' => 0],
            ],
            'actions' => [
                ['action' => 'deal'],
                ['action' => 'hit', 'zone' => 'betZone1'],
                ['action' => 'stand', 'zone' => 'betZone1'],
            ],
        ]
    );
    assertOk((string) ($round2['roundId'] ?? '') === (string) ($round1['roundId'] ?? ''), 'round2: idempotent roundId mismatch');
    assertOk((bool) ($round2['idempotent'] ?? false) === true, 'round2: expected idempotent=true');

    echo "5) Missing deal action should fail validation...\n";
    $invalidNoDeal = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => 'bj_settle_' . $seed . '_2',
        'game' => 'blackjack',
        'bets' => [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 10, 'pairs' => 0, 'plus21' => 0, 'royal' => 0, 'superSeven' => 0, 'insurance' => 0],
            ],
            'actions' => [
                ['action' => 'stand', 'zone' => 'betZone1'],
            ],
        ],
    ], $token);
    assertOk($invalidNoDeal['status'] === 400, 'round3: missing-deal payload should fail');

    echo "6) Insurance stake without insurance action should fail...\n";
    $invalidInsurance = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => 'bj_settle_' . $seed . '_3',
        'game' => 'blackjack',
        'bets' => [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 10, 'pairs' => 0, 'plus21' => 0, 'royal' => 0, 'superSeven' => 0, 'insurance' => 5],
            ],
            'actions' => [
                ['action' => 'deal'],
                ['action' => 'stand', 'zone' => 'betZone1'],
            ],
        ],
    ], $token);
    assertOk($invalidInsurance['status'] === 400, 'round4: insurance-without-action payload should fail');

    echo "7) Invalid action order (hit then double) should fail...\n";
    $invalidOrder = req('POST', $baseUrl . '/casino/bet', [
        'requestId' => 'bj_settle_' . $seed . '_4',
        'game' => 'blackjack',
        'bets' => [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 10, 'pairs' => 0, 'plus21' => 0, 'royal' => 0, 'superSeven' => 0, 'insurance' => 0],
            ],
            'actions' => [
                ['action' => 'deal'],
                ['action' => 'hit', 'zone' => 'betZone1'],
                ['action' => 'double', 'zone' => 'betZone1'],
            ],
        ],
    ], $token);
    assertOk($invalidOrder['status'] === 400, 'round5: invalid action-order payload should fail');

    echo "8) Valid settle still records detail/history payload...\n";
    $round6 = placeBlackjackRound(
        $baseUrl,
        $token,
        'bj_settle_' . $seed . '_5',
        [
            'betBreakdown' => [
                ['zone' => 'betZone1', 'main' => 10, 'pairs' => 2, 'plus21' => 1, 'royal' => 0, 'superSeven' => 0, 'insurance' => 0],
            ],
            'actions' => [
                ['action' => 'deal'],
                ['action' => 'stand', 'zone' => 'betZone1'],
            ],
        ]
    );
    assertRoundMath($round6, 'round6');

    echo "9) Validate detail endpoint exposes resultType and betDetails...\n";
    $roundId = (string) ($round6['roundId'] ?? '');
    assertOk($roundId !== '', 'Missing roundId in round6');
    $detail = req('GET', $baseUrl . '/casino/bet/' . $roundId, null, $token);
    assertOk($detail['status'] === 200, 'Round detail fetch failed');
    $detailBet = is_array($detail['data']['bet'] ?? null) ? $detail['data']['bet'] : [];
    assertOk((string) ($detailBet['game'] ?? '') === 'blackjack', 'Detail game mismatch');
    assertOk(is_array($detailBet['betDetails'] ?? null), 'Detail betDetails missing');

    echo "\nBlackjack settlement smoke suite passed.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Blackjack settlement smoke suite failed: " . $e->getMessage() . "\n");
    exit(1);
}
