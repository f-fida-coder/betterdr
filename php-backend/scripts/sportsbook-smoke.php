<?php

declare(strict_types=1);

/**
 * Sportsbook smoke test.
 *
 * Usage:
 *   php php-backend/scripts/sportsbook-smoke.php
 *
 * Required env vars:
 *   SMOKE_ADMIN_USER, SMOKE_ADMIN_PASS
 *
 * Optional env vars:
 *   SMOKE_BASE_URL (default: http://127.0.0.1:5000/api)
 */

$baseUrl = rtrim((string) (getenv('SMOKE_BASE_URL') ?: 'http://127.0.0.1:5000/api'), '/');
$adminUser = trim((string) getenv('SMOKE_ADMIN_USER'));
$adminPass = (string) getenv('SMOKE_ADMIN_PASS');

if ($adminUser === '' || $adminPass === '') {
    fwrite(STDERR, "Missing SMOKE_ADMIN_USER or SMOKE_ADMIN_PASS\n");
    exit(2);
}

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
    $err = curl_error($ch);

    if ($raw === false) {
        throw new RuntimeException('HTTP request failed: ' . $err);
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

function sportsbookRequestId(string $seed, string $label): string
{
    return 'smoke_' . $label . '_' . $seed;
}

try {
    echo "1) Admin login...\n";
    $adminLogin = req('POST', $baseUrl . '/auth/admin/login', ['username' => $adminUser, 'password' => $adminPass]);
    assertOk($adminLogin['status'] === 200, 'Admin login failed');
    $adminToken = (string) ($adminLogin['data']['token'] ?? '');
    assertOk($adminToken !== '', 'Admin token missing');

    $seed = (string) time();
    $username = 'smoke_user_' . $seed;
    $phone = '555' . substr($seed, -7);
    $password = 'SmokePass123!';

    echo "2) Register and login smoke user...\n";
    $register = req('POST', $baseUrl . '/auth/register', [
        'username' => $username,
        'phoneNumber' => $phone,
        'password' => $password,
    ]);
    assertOk(in_array($register['status'], [200, 201], true), 'User registration failed');

    $userLogin = req('POST', $baseUrl . '/auth/login', ['username' => $username, 'password' => $password]);
    assertOk($userLogin['status'] === 200, 'User login failed');
    $userToken = (string) ($userLogin['data']['token'] ?? '');
    assertOk($userToken !== '', 'User token missing');

    echo "3) Create deterministic match fixtures...\n";
    $matchCreate = req('POST', $baseUrl . '/admin/matches', [
        'homeTeam' => 'Smoke Home',
        'awayTeam' => 'Smoke Away',
        'startTime' => gmdate(DATE_ATOM, time() + 3600),
        'sport' => 'NFL',
        'status' => 'scheduled',
    ], $adminToken);
    assertOk($matchCreate['status'] === 201, 'Failed to create match');
    $matchId = (string) ($matchCreate['data']['_id'] ?? $matchCreate['data']['id'] ?? '');
    assertOk($matchId !== '', 'Created match id missing');

    $matchCreateTwo = req('POST', $baseUrl . '/admin/matches', [
        'homeTeam' => 'Smoke Home Two',
        'awayTeam' => 'Smoke Away Two',
        'startTime' => gmdate(DATE_ATOM, time() + 7200),
        'sport' => 'NFL',
        'status' => 'scheduled',
    ], $adminToken);
    assertOk($matchCreateTwo['status'] === 201, 'Failed to create second match');
    $matchIdTwo = (string) ($matchCreateTwo['data']['_id'] ?? $matchCreateTwo['data']['id'] ?? '');
    assertOk($matchIdTwo !== '', 'Created second match id missing');

    $oddsFixture = [
        'markets' => [
            [
                'key' => 'h2h',
                'outcomes' => [
                    ['name' => 'Smoke Home', 'price' => 2.0],
                    ['name' => 'Smoke Away', 'price' => 1.8],
                ],
            ],
            [
                'key' => 'spreads',
                'outcomes' => [
                    ['name' => 'Smoke Home', 'price' => 1.9, 'point' => 3.5],
                    ['name' => 'Smoke Away', 'price' => 1.9, 'point' => -3.5],
                ],
            ],
            [
                'key' => 'totals',
                'outcomes' => [
                    ['name' => 'Over', 'price' => 1.9, 'point' => 45.5],
                    ['name' => 'Under', 'price' => 1.9, 'point' => 45.5],
                ],
            ],
        ],
    ];

    $matchUpdate = req('PUT', $baseUrl . '/admin/matches/' . $matchId, [
        'odds' => $oddsFixture,
        'status' => 'scheduled',
    ], $adminToken);
    assertOk($matchUpdate['status'] === 200, 'Failed to update fixture odds');

    $secondOddsFixture = [
        'markets' => [
            [
                'key' => 'h2h',
                'outcomes' => [
                    ['name' => 'Smoke Home Two', 'price' => 2.1],
                    ['name' => 'Smoke Away Two', 'price' => 1.75],
                ],
            ],
            [
                'key' => 'spreads',
                'outcomes' => [
                    ['name' => 'Smoke Home Two', 'price' => 1.91, 'point' => 4.5],
                    ['name' => 'Smoke Away Two', 'price' => 1.91, 'point' => -4.5],
                ],
            ],
            [
                'key' => 'totals',
                'outcomes' => [
                    ['name' => 'Over', 'price' => 1.92, 'point' => 41.5],
                    ['name' => 'Under', 'price' => 1.92, 'point' => 41.5],
                ],
            ],
        ],
    ];

    $matchUpdateTwo = req('PUT', $baseUrl . '/admin/matches/' . $matchIdTwo, [
        'odds' => $secondOddsFixture,
        'status' => 'scheduled',
    ], $adminToken);
    assertOk($matchUpdateTwo['status'] === 200, 'Failed to update second fixture odds');

    echo "4) Place H2H/Spread/Total straight bets...\n";
    $straightH2H = req('POST', $baseUrl . '/bets/place', [
        'requestId' => sportsbookRequestId($seed, 'straight_h2h'),
        'type' => 'straight',
        'amount' => 10,
        'selections' => [[
            'matchId' => $matchId,
            'selection' => 'Smoke Home',
            'odds' => 2.0,
            'marketType' => 'h2h',
            'type' => 'h2h',
        ]],
    ], $userToken);
    assertOk($straightH2H['status'] === 201, 'Straight H2H failed');

    $straightSpread = req('POST', $baseUrl . '/bets/place', [
        'requestId' => sportsbookRequestId($seed, 'straight_spread'),
        'type' => 'straight',
        'amount' => 10,
        'selections' => [[
            'matchId' => $matchId,
            'selection' => 'Smoke Home',
            'odds' => 1.9,
            'marketType' => 'spreads',
            'type' => 'spreads',
        ]],
    ], $userToken);
    assertOk($straightSpread['status'] === 201, 'Straight spread failed');

    $straightTotal = req('POST', $baseUrl . '/bets/place', [
        'requestId' => sportsbookRequestId($seed, 'straight_total'),
        'type' => 'straight',
        'amount' => 10,
        'selections' => [[
            'matchId' => $matchId,
            'selection' => 'Over',
            'odds' => 1.9,
            'marketType' => 'totals',
            'type' => 'totals',
        ]],
    ], $userToken);
    assertOk($straightTotal['status'] === 201, 'Straight total failed');

    echo "5) Place parlay + teaser...\n";
    $parlayRequestId = sportsbookRequestId($seed, 'parlay');
    $parlay = req('POST', $baseUrl . '/bets/place', [
        'requestId' => $parlayRequestId,
        'type' => 'parlay',
        'amount' => 10,
        'selections' => [
            ['matchId' => $matchId, 'selection' => 'Smoke Home', 'odds' => 2.0, 'type' => 'h2h'],
            ['matchId' => $matchIdTwo, 'selection' => 'Over', 'odds' => 1.92, 'type' => 'totals'],
        ],
    ], $userToken);
    assertOk($parlay['status'] === 201, 'Parlay failed');
    assertOk((string) ($parlay['data']['requestId'] ?? '') === $parlayRequestId, 'Parlay requestId mismatch');

    $parlayReplay = req('POST', $baseUrl . '/bets/place', [
        'requestId' => $parlayRequestId,
        'type' => 'parlay',
        'amount' => 10,
        'selections' => [
            ['matchId' => $matchId, 'selection' => 'Smoke Home', 'odds' => 2.0, 'type' => 'h2h'],
            ['matchId' => $matchIdTwo, 'selection' => 'Over', 'odds' => 1.92, 'type' => 'totals'],
        ],
    ], $userToken);
    assertOk($parlayReplay['status'] === 200, 'Parlay replay failed');
    assertOk((bool) ($parlayReplay['data']['idempotentReplay'] ?? false) === true, 'Expected idempotentReplay on parlay replay');

    $teaser = req('POST', $baseUrl . '/bets/place', [
        'requestId' => sportsbookRequestId($seed, 'teaser'),
        'type' => 'teaser',
        'amount' => 10,
        'teaserPoints' => 6,
        'selections' => [
            ['matchId' => $matchId, 'selection' => 'Smoke Home', 'odds' => 1.9, 'type' => 'spreads'],
            ['matchId' => $matchIdTwo, 'selection' => 'Over', 'odds' => 1.92, 'type' => 'totals'],
        ],
    ], $userToken);
    assertOk($teaser['status'] === 201, 'Teaser failed');

    $ifBet = req('POST', $baseUrl . '/bets/place', [
        'requestId' => sportsbookRequestId($seed, 'if_bet'),
        'type' => 'if_bet',
        'amount' => 10,
        'selections' => [
            ['matchId' => $matchId, 'selection' => 'Smoke Home', 'odds' => 2.0, 'type' => 'h2h'],
            ['matchId' => $matchIdTwo, 'selection' => 'Smoke Home Two', 'odds' => 2.1, 'type' => 'h2h'],
        ],
    ], $userToken);
    assertOk($ifBet['status'] === 201, 'If bet failed');

    $reverse = req('POST', $baseUrl . '/bets/place', [
        'requestId' => sportsbookRequestId($seed, 'reverse'),
        'type' => 'reverse',
        'amount' => 10,
        'selections' => [
            ['matchId' => $matchId, 'selection' => 'Smoke Home', 'odds' => 2.0, 'type' => 'h2h'],
            ['matchId' => $matchIdTwo, 'selection' => 'Smoke Home Two', 'odds' => 2.1, 'type' => 'h2h'],
        ],
    ], $userToken);
    assertOk($reverse['status'] === 201, 'Reverse failed');

    $walletAfterPlace = req('GET', $baseUrl . '/wallet/balance', null, $userToken);
    assertOk($walletAfterPlace['status'] === 200, 'Failed wallet fetch after placing bets');
    $pendingPlaced = (float) ($walletAfterPlace['data']['pendingBalance'] ?? 0);
    assertOk(abs($pendingPlaced - 80.0) < 0.001, 'Unexpected pendingBalance after placements: ' . $pendingPlaced);

    echo "6) Settle finished score and validate pending released...\n";
    $matchFinish = req('PUT', $baseUrl . '/admin/matches/' . $matchId, [
        'status' => 'finished',
        'score' => [
            'score_home' => 28,
            'score_away' => 20,
            'event_status' => 'FINAL',
        ],
    ], $adminToken);
    assertOk($matchFinish['status'] === 200, 'Failed to set finished score');

    $settle = req('POST', $baseUrl . '/bets/settle', ['matchId' => $matchId], $adminToken);
    assertOk($settle['status'] === 200, 'Settle endpoint failed');

    $matchFinishTwo = req('PUT', $baseUrl . '/admin/matches/' . $matchIdTwo, [
        'status' => 'finished',
        'score' => [
            'score_home' => 21,
            'score_away' => 17,
            'event_status' => 'FINAL',
        ],
    ], $adminToken);
    assertOk($matchFinishTwo['status'] === 200, 'Failed to set second finished score');

    $settleTwo = req('POST', $baseUrl . '/bets/settle', ['matchId' => $matchIdTwo], $adminToken);
    assertOk($settleTwo['status'] === 200, 'Second settle endpoint failed');

    $walletAfterSettle = req('GET', $baseUrl . '/wallet/balance', null, $userToken);
    assertOk($walletAfterSettle['status'] === 200, 'Failed wallet fetch after settle');
    $pendingSettled = (float) ($walletAfterSettle['data']['pendingBalance'] ?? 0);
    assertOk(abs($pendingSettled) < 0.001, 'Pending balance not released after settlement: ' . $pendingSettled);

    echo "7) Admin create pending bet and verify hold...\n";
    $userId = (string) ($userLogin['data']['id'] ?? '');
    assertOk($userId !== '', 'Smoke user id missing');

    $adminCreateBet = req('POST', $baseUrl . '/admin/bets', [
        'userId' => $userId,
        'matchId' => $matchId,
        'amount' => 10,
        'odds' => 2.0,
        'type' => 'h2h',
        'selection' => 'Smoke Home',
        'status' => 'pending',
    ], $adminToken);
    assertOk($adminCreateBet['status'] === 201, 'Admin bet create failed');
    $adminBetId = (string) ($adminCreateBet['data']['bet']['id'] ?? '');
    assertOk($adminBetId !== '', 'Admin bet id missing');

    $walletAfterAdminCreate = req('GET', $baseUrl . '/wallet/balance', null, $userToken);
    assertOk($walletAfterAdminCreate['status'] === 200, 'Failed wallet fetch after admin create');
    $pendingAdminCreate = (float) ($walletAfterAdminCreate['data']['pendingBalance'] ?? 0);
    assertOk(abs($pendingAdminCreate - 10.0) < 0.001, 'Unexpected pending after admin create: ' . $pendingAdminCreate);

    echo "8) Admin delete pending bet and verify refund...\n";
    $adminDeleteBet = req('DELETE', $baseUrl . '/admin/bets/' . $adminBetId, null, $adminToken);
    assertOk($adminDeleteBet['status'] === 200, 'Admin bet delete failed');

    $walletAfterAdminDelete = req('GET', $baseUrl . '/wallet/balance', null, $userToken);
    assertOk($walletAfterAdminDelete['status'] === 200, 'Failed wallet fetch after admin delete');
    $pendingAdminDelete = (float) ($walletAfterAdminDelete['data']['pendingBalance'] ?? 0);
    assertOk(abs($pendingAdminDelete) < 0.001, 'Pending not released after admin delete: ' . $pendingAdminDelete);

    echo "\nSmoke suite passed.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Smoke suite failed: " . $e->getMessage() . "\n");
    exit(1);
}
