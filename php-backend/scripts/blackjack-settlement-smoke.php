<?php

declare(strict_types=1);

/**
 * Staged blackjack smoke suite (rebuild C7) — the pre/post-deploy HTTP
 * verification tool for the server-dealt protocol (C1-C6).
 *
 * Runs against a live API with a throwaway registered account and exercises
 * the real wire: deal→hit→stand→settle, deal→double→settle, resume via the
 * state action, deal/action idempotency replays, negative paths (legacy
 * protocol retired, Super Sevens removed, wrong round, illegal action), the
 * insurance family (decline always; take when a dealer Ace shows within the
 * hunt cap), and — with SMOKE_DEEP=1 — the split flow (both hands played,
 * split-then-double when legal) and the even-money hunt. Balance continuity
 * is asserted on EVERY response: newBalance must equal
 *   previous - (totalWagerNow - totalWagerPrev) + (settled ? totalReturn : 0)
 * which end-to-ends the debit-at-deal / per-action-delta / settle-credit
 * ledger chain without DB access.
 *
 * The 24h expiry sweep is unit-covered (BlackjackSettlementRewireTest);
 * SMOKE_JANITOR=1 additionally shells the janitor CLI and asserts a clean
 * zero-error run (local base URLs only).
 *
 * Usage:
 *   php php-backend/scripts/blackjack-settlement-smoke.php
 *
 * Env:
 *   SMOKE_BASE_URL   (default http://127.0.0.1:5000/api)
 *   SMOKE_DEEP=1     enable split + even-money hunts (more rounds)
 *   SMOKE_MAX_HUNT   per-hunt round cap (default 80; even-money uses 4x)
 *   SMOKE_JANITOR=1  also execute the janitor CLI (local runs)
 */

$baseUrl = rtrim((string) (getenv('SMOKE_BASE_URL') ?: 'http://127.0.0.1:5000/api'), '/');
$deep = getenv('SMOKE_DEEP') === '1';
$maxHunt = max(10, (int) (getenv('SMOKE_MAX_HUNT') ?: 80));
$runJanitor = getenv('SMOKE_JANITOR') === '1';

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

/** Balance/wager continuity tracker — the wire-level ledger check. */
final class BjTracker
{
    public ?float $balance = null;
    public float $roundWager = 0.0;

    public function onRoundStart(): void
    {
        $this->roundWager = 0.0;
    }

    public function check(array $data, string $context): void
    {
        $newBalance = num($data['newBalance'] ?? $data['balanceAfter'] ?? null);
        $wagerNow = num($data['totalWager'] ?? 0);
        $settled = (string) ($data['roundStatus'] ?? '') === 'settled';
        if ($this->balance !== null && !(bool) ($data['idempotent'] ?? false) && !(bool) ($data['resumed'] ?? false)) {
            $expected = $this->balance - ($wagerNow - $this->roundWager) + ($settled ? num($data['totalReturn'] ?? 0) : 0.0);
            assertClose($newBalance, $expected, $context . ': balance continuity');
        }
        $this->balance = $newBalance;
        $this->roundWager = $wagerNow;
    }
}

$tracker = new BjTracker();

function bjPost(string $baseUrl, string $token, array $bets, string $requestId): array
{
    // Rate-limiter aware: hunts fire many rounds back-to-back, and prod runs
    // share the real limiter — back off and retry instead of failing.
    $delays = [0, 3, 8, 20, 45];
    $resp = ['status' => 0, 'data' => []];
    foreach ($delays as $delay) {
        if ($delay > 0) {
            sleep($delay);
        }
        $resp = req('POST', $baseUrl . '/casino/bet', [
            'requestId' => $requestId,
            'game' => 'blackjack',
            'bets' => $bets,
        ], $token);
        if ($resp['status'] !== 429) {
            return $resp;
        }
    }
    return $resp;
}

$reqCounter = 0;
function rid(string $prefix): string
{
    global $reqCounter;
    $reqCounter++;
    return $prefix . '_' . time() . '_' . $reqCounter;
}

function bjDeal(string $baseUrl, string $token, BjTracker $tracker, array $zones, string $context): array
{
    $tracker->onRoundStart();
    $resp = bjPost($baseUrl, $token, ['action' => 'deal', 'zones' => $zones], rid('bjsmk_deal'));
    assertOk($resp['status'] === 200, $context . ': deal failed HTTP ' . $resp['status'] . ' ' . json_encode($resp['data']));
    $data = $resp['data'];
    assertOk((string) ($data['rngVersion'] ?? '') === 'bj-staged-csprng-v1', $context . ': rngVersion mismatch');
    assertOk(strlen((string) ($data['deckHash'] ?? '')) === 64, $context . ': deckHash missing');
    if ((string) $data['roundStatus'] === 'playing') {
        assertOk((bool) ($data['state']['dealer']['holeHidden'] ?? false), $context . ': hole card must be hidden while playing');
        assertOk(!isset($data['state']['dealer']['cards']), $context . ': dealer cards must not serialize while playing');
    }
    $tracker->check($data, $context . ' (deal)');
    return $data;
}

function bjAct(string $baseUrl, string $token, array $round, string $action, ?string $zone, array $extra = []): array
{
    return bjPost($baseUrl, $token, array_merge([
        'action' => $action,
        'zone' => $zone,
        'actionRequestId' => rid('bjsmk_act'),
        'roundRequestId' => (string) $round['requestId'],
    ], $extra), rid('bjsmk_msg'));
}

function bjActOk(string $baseUrl, string $token, BjTracker $tracker, array $round, string $action, ?string $zone, string $context, array $extra = []): array
{
    $resp = bjAct($baseUrl, $token, $round, $action, $zone, $extra);
    assertOk($resp['status'] === 200, $context . ': ' . $action . ' failed HTTP ' . $resp['status'] . ' ' . json_encode($resp['data']));
    $tracker->check($resp['data'], $context . ' (' . $action . ')');
    return $resp['data'];
}

/** Decline every prompt and stand every hand until settled. */
function bjFinish(string $baseUrl, string $token, BjTracker $tracker, array $data, string $context): array
{
    for ($i = 0; $i < 40; $i++) {
        if ((string) ($data['roundStatus'] ?? '') === 'settled') {
            assertOk(count($data['dealerCards'] ?? []) >= 2, $context . ': settled response must reveal the dealer hand');
            assertClose(num($data['totalReturn']) - num($data['totalWager']), num($data['netResult']), $context . ': wager/return/net mismatch');
            return $data;
        }
        $awaiting = $data['state']['awaiting'] ?? null;
        assertOk(is_array($awaiting) && !empty($awaiting['zone']), $context . ': playing round without awaiting hint');
        $legal = $awaiting['actions'] ?? [];
        $action = in_array('decline_insurance', $legal, true)
            ? 'decline_insurance'
            : (in_array('decline_even_money', $legal, true) ? 'decline_even_money' : 'stand');
        $data = bjActOk($baseUrl, $token, $tracker, $data, $action, (string) $awaiting['zone'], $context);
    }
    throw new RuntimeException($context . ': round did not settle within 40 actions');
}

/** Deal repeatedly until $pick likes the fresh round; settle the rejects. */
function bjHunt(string $baseUrl, string $token, BjTracker $tracker, array $zones, callable $pick, int $cap, string $context): ?array
{
    for ($i = 0; $i < $cap; $i++) {
        $round = bjDeal($baseUrl, $token, $tracker, $zones, $context . ' hunt#' . $i);
        if ((string) $round['roundStatus'] === 'playing' && $pick($round)) {
            return $round;
        }
        if ((string) $round['roundStatus'] !== 'settled') {
            bjFinish($baseUrl, $token, $tracker, $round, $context . ' hunt-flush#' . $i);
        }
        usleep(250000); // pace the hunt — do not hammer the limiter
    }
    return null;
}

$passed = [];
$skipped = [];

try {
    $seed = (string) time();
    $username = 'bj_smoke_' . $seed;
    $phone = '562' . substr($seed, -7);
    $password = 'SmokePass123!';

    echo "1) Registering staged-blackjack smoke user {$username}...\n";
    $register = req('POST', $baseUrl . '/auth/register', [
        'username' => $username,
        'phoneNumber' => $phone,
        'password' => $password,
    ]);
    assertOk(in_array($register['status'], [200, 201], true), 'Register failed');
    $login = req('POST', $baseUrl . '/auth/login', ['username' => $username, 'password' => $password]);
    assertOk($login['status'] === 200, 'Login failed');
    $token = (string) ($login['data']['token'] ?? '');
    assertOk($token !== '', 'Missing token');
    $passed[] = 'register+login';

    echo "2) Negative: legacy one-shot payload is retired...\n";
    $legacy = bjPost($baseUrl, $token, [
        'betBreakdown' => [['zone' => 'betZone1', 'main' => 5]],
        'actions' => [['action' => 'deal'], ['action' => 'stand', 'zone' => 'betZone1']],
    ], rid('bjsmk_legacy'));
    assertOk($legacy['status'] === 400 && str_contains((string) ($legacy['data']['message'] ?? ''), 'retired'), 'legacy payload must 400 as retired, got HTTP ' . $legacy['status'] . ' ' . json_encode($legacy['data']));
    $passed[] = 'legacy-retired-400';

    echo "3) Negative: Super Sevens stake rejected at deal...\n";
    $ss = bjPost($baseUrl, $token, ['action' => 'deal', 'zones' => ['betZone1' => ['main' => 5, 'superSeven' => 5]]], rid('bjsmk_ss'));
    assertOk($ss['status'] === 400 && str_contains((string) ($ss['data']['message'] ?? ''), 'no longer offered'), 'superSeven stake must 400, got HTTP ' . $ss['status'] . ' ' . json_encode($ss['data']));
    $passed[] = 'super-sevens-removed-400';

    echo "4) Core flow: deal -> (hit) -> stand -> settle, hole hidden while live...\n";
    $round = bjDeal($baseUrl, $token, $tracker, ['betZone1' => ['main' => 5]], 'core');
    if ((string) $round['roundStatus'] === 'playing') {
        // Clear any insurance prompt first, then hit once if the hand allows.
        while (($round['state']['awaiting']['actions'] ?? []) && in_array($round['state']['awaiting']['actions'][0], ['insurance', 'even_money'], true)) {
            $legal = $round['state']['awaiting']['actions'];
            $action = in_array('decline_insurance', $legal, true) ? 'decline_insurance' : 'decline_even_money';
            $round = bjActOk($baseUrl, $token, $tracker, $round, $action, (string) $round['state']['awaiting']['zone'], 'core');
            if ((string) $round['roundStatus'] === 'settled') {
                break;
            }
        }
        if ((string) $round['roundStatus'] === 'playing' && in_array('hit', $round['state']['awaiting']['actions'] ?? [], true)) {
            $before = count($round['state']['hands'][0]['cards']);
            $round = bjActOk($baseUrl, $token, $tracker, $round, 'hit', (string) $round['state']['awaiting']['zone'], 'core');
            $after = count($round['state']['hands'][0]['cards'] ?? []) ?: $before + 1;
            assertOk($after === $before + 1 || (string) $round['roundStatus'] === 'settled', 'core: hit must add exactly one card');
        }
        $round = bjFinish($baseUrl, $token, $tracker, $round, 'core');
    }
    assertOk((string) ($round['result'] ?? '') !== '', 'core: settled result missing');
    $passed[] = 'deal-hit-stand-settle';

    echo "5) Deal idempotency: same requestId replays the same round...\n";
    $dealReqId = rid('bjsmk_idem');
    $tracker->onRoundStart();
    $first = bjPost($baseUrl, $token, ['action' => 'deal', 'zones' => ['betZone1' => ['main' => 5]]], $dealReqId);
    assertOk($first['status'] === 200, 'idem deal failed');
    $tracker->check($first['data'], 'idem (deal)');
    $replay = bjPost($baseUrl, $token, ['action' => 'deal', 'zones' => ['betZone1' => ['main' => 500]]], $dealReqId);
    assertOk($replay['status'] === 200 && (bool) $replay['data']['idempotent'], 'deal replay must be idempotent');
    assertOk((string) $replay['data']['roundId'] === (string) $first['data']['roundId'], 'deal replay must return the same round');
    assertClose(num($replay['data']['newBalance']), (float) $tracker->balance, 'deal replay must not move money');
    $round = $first['data'];

    echo "6) Action idempotency: a retried action replays, never re-executes...\n";
    if ((string) $round['roundStatus'] === 'playing') {
        $awaiting = $round['state']['awaiting'];
        $legal = $awaiting['actions'];
        $action = in_array('decline_insurance', $legal, true)
            ? 'decline_insurance'
            : (in_array('decline_even_money', $legal, true) ? 'decline_even_money'
                : (in_array('hit', $legal, true) ? 'hit' : 'stand'));
        $actId = rid('bjsmk_actidem');
        $r1 = bjPost($baseUrl, $token, ['action' => $action, 'zone' => $awaiting['zone'], 'actionRequestId' => $actId, 'roundRequestId' => $round['requestId']], rid('bjsmk_m'));
        assertOk($r1['status'] === 200, 'idem action failed');
        $tracker->check($r1['data'], 'idem (' . $action . ')');
        $r2 = bjPost($baseUrl, $token, ['action' => $action, 'zone' => $awaiting['zone'], 'actionRequestId' => $actId, 'roundRequestId' => $round['requestId']], rid('bjsmk_m'));
        assertOk($r2['status'] === 200 && (bool) $r2['data']['idempotent'], 'action replay must be idempotent');
        assertClose(num($r2['data']['newBalance'] ?? $r2['data']['balanceAfter']), (float) $tracker->balance, 'action replay must not move money');
        $round = $r1['data'];
        if ((string) $round['roundStatus'] === 'playing') {
            $round = bjFinish($baseUrl, $token, $tracker, $round, 'idem-finish');
        }
    }
    $passed[] = 'deal+action-idempotency';

    echo "7) Resume: the state action returns the live round, hole still hidden...\n";
    $round = bjDeal($baseUrl, $token, $tracker, ['betZone1' => ['main' => 5]], 'resume');
    if ((string) $round['roundStatus'] === 'playing') {
        $state = bjPost($baseUrl, $token, ['action' => 'state'], rid('bjsmk_state'));
        assertOk($state['status'] === 200, 'state action failed');
        $open = $state['data']['round'] ?? null;
        assertOk(is_array($open), 'state must return the open round');
        assertOk((string) $open['requestId'] === (string) $round['requestId'], 'state returns the round requestId for resume');
        assertOk((bool) ($open['state']['dealer']['holeHidden'] ?? false), 'state view keeps the hole hidden');
        $round = bjFinish($baseUrl, $token, $tracker, $round, 'resume-finish');
        $stateAfter = bjPost($baseUrl, $token, ['action' => 'state'], rid('bjsmk_state2'));
        assertOk(($stateAfter['data']['round'] ?? null) === null, 'state is empty after settlement');
    }
    $passed[] = 'resume-state';

    echo "8) Negative: wrong round / illegal action are 400s...\n";
    $ghost = bjPost($baseUrl, $token, ['action' => 'stand', 'zone' => 'betZone1', 'actionRequestId' => rid('bjsmk_g'), 'roundRequestId' => 'bjsmk_no_such_round'], rid('bjsmk_m'));
    assertOk($ghost['status'] === 400, 'unknown roundRequestId must 400');
    $bogus = bjPost($baseUrl, $token, ['action' => 'teleport', 'zones' => []], rid('bjsmk_b'));
    assertOk($bogus['status'] === 400, 'unknown action must 400');
    $passed[] = 'negative-400s';

    echo "9) Double: mid-round stake delta + settle...\n";
    $round = bjHunt($baseUrl, $token, $tracker, ['betZone1' => ['main' => 5]], function (array $r): bool {
        return in_array('double', $r['state']['awaiting']['actions'] ?? [], true);
    }, $maxHunt, 'double');
    if ($round !== null) {
        $balBefore = (float) $tracker->balance;
        $data = bjActOk($baseUrl, $token, $tracker, $round, 'double', (string) $round['state']['awaiting']['zone'], 'double');
        assertClose(num($data['totalWager']), 10.0, 'double: wager doubled');
        if ((string) $data['roundStatus'] === 'playing') {
            $data = bjFinish($baseUrl, $token, $tracker, $data, 'double-finish');
        }
        $passed[] = 'deal-double-settle';
    } else {
        $skipped[] = 'double (no double-legal round within cap)';
    }

    echo "10) Insurance: decline path (and take, when a second Ace shows)...\n";
    $aceUp = function (array $r): bool {
        return in_array('insurance', $r['state']['awaiting']['actions'] ?? [], true);
    };
    $round = bjHunt($baseUrl, $token, $tracker, ['betZone1' => ['main' => 10]], $aceUp, $maxHunt, 'ins-decline');
    if ($round !== null) {
        $data = bjActOk($baseUrl, $token, $tracker, $round, 'decline_insurance', (string) $round['state']['awaiting']['zone'], 'ins-decline');
        if ((string) $data['roundStatus'] === 'playing') {
            $data = bjFinish($baseUrl, $token, $tracker, $data, 'ins-decline-finish');
        }
        $passed[] = 'insurance-decline';
    } else {
        $skipped[] = 'insurance-decline (no dealer Ace within cap)';
    }
    $round = bjHunt($baseUrl, $token, $tracker, ['betZone1' => ['main' => 10]], $aceUp, $maxHunt, 'ins-take');
    if ($round !== null) {
        $overCap = bjAct($baseUrl, $token, $round, 'insurance', (string) $round['state']['awaiting']['zone'], ['insuranceStake' => 6]);
        assertOk($overCap['status'] === 400, 'insurance above floor(main/2) must 400');
        $data = bjActOk($baseUrl, $token, $tracker, $round, 'insurance', (string) $round['state']['awaiting']['zone'], 'ins-take', ['insuranceStake' => 5]);
        assertClose(num($data['totalWager']), 15.0, 'insurance: wager includes the insurance stake');
        if ((string) $data['roundStatus'] === 'playing') {
            $data = bjFinish($baseUrl, $token, $tracker, $data, 'ins-take-finish');
        }
        $passed[] = 'insurance-take (incl. over-cap 400)';
    } else {
        $skipped[] = 'insurance-take (no dealer Ace within cap)';
    }

    if ($deep) {
        echo "11) DEEP split: pair hunt -> split -> play both hands (double one if legal)...\n";
        $round = bjHunt($baseUrl, $token, $tracker, ['betZone1' => ['main' => 5]], function (array $r): bool {
            return in_array('split', $r['state']['awaiting']['actions'] ?? [], true);
        }, $maxHunt * 2, 'split');
        if ($round !== null) {
            $data = bjActOk($baseUrl, $token, $tracker, $round, 'split', 'betZone1', 'split');
            assertClose(num($data['totalWager']), 10.0, 'split: each hand independently staked');
            if ((string) $data['roundStatus'] === 'playing') {
                $handCount = count($data['state']['hands'] ?? []);
                assertOk($handCount === 2, 'split: two hands in play');
                // Double the first split hand when offered (split-then-double).
                if (in_array('double', $data['state']['awaiting']['actions'] ?? [], true)) {
                    $data = bjActOk($baseUrl, $token, $tracker, $data, 'double', (string) $data['state']['awaiting']['zone'], 'split-double');
                    assertClose(num($data['totalWager']), 15.0, 'split-then-double: only THAT hand re-staked');
                }
                if ((string) $data['roundStatus'] === 'playing') {
                    $data = bjFinish($baseUrl, $token, $tracker, $data, 'split-finish');
                }
            }
            $passed[] = 'deal-split-both-hands-settle (+double when legal)';
        } else {
            $skipped[] = 'split (no pair within deep cap)';
        }

        echo "12) DEEP even money: natural vs dealer Ace hunt...\n";
        $round = bjHunt($baseUrl, $token, $tracker, ['betZone1' => ['main' => 10], 'betZone2' => ['main' => 10]], function (array $r): bool {
            return in_array('even_money', $r['state']['awaiting']['actions'] ?? [], true);
        }, $maxHunt * 4, 'even-money');
        if ($round !== null) {
            $data = bjActOk($baseUrl, $token, $tracker, $round, 'even_money', (string) $round['state']['awaiting']['zone'], 'even-money');
            if ((string) $data['roundStatus'] === 'playing') {
                $data = bjFinish($baseUrl, $token, $tracker, $data, 'even-money-finish');
            }
            $emRow = null;
            foreach (($data['betDetails']['hands'] ?? []) as $hand) {
                if (($hand['resultType'] ?? '') === 'even_money') {
                    $emRow = $hand;
                }
            }
            assertOk($emRow !== null && num($emRow['return']) === num($emRow['bet']) * 2, 'even money pays exactly 1:1');
            $passed[] = 'even-money';
        } else {
            $skipped[] = 'even-money (no natural-vs-Ace within deep cap)';
        }
    } else {
        $skipped[] = 'split + even-money (enable with SMOKE_DEEP=1)';
    }

    if ($runJanitor) {
        echo "13) Janitor CLI executes cleanly (sweep logic itself is unit-covered)...\n";
        $out = shell_exec('php ' . escapeshellarg(__DIR__ . '/blackjack-round-janitor.php') . ' --limit=50 2>&1');
        $parsed = json_decode((string) $out, true);
        assertOk(is_array($parsed) && (int) ($parsed['errors'] ?? 1) === 0, 'janitor must run with zero errors, got: ' . (string) $out);
        $passed[] = 'janitor-clean-run';
    } else {
        $skipped[] = 'janitor CLI (enable with SMOKE_JANITOR=1, local only)';
    }

    echo "\nPASSED (" . count($passed) . "): " . implode(', ', $passed) . "\n";
    if ($skipped !== []) {
        echo "SKIPPED (" . count($skipped) . "): " . implode('; ', $skipped) . "\n";
    }
    echo "Final smoke balance: $" . round((float) $tracker->balance) . " (throwaway account {$username} — suspend/void per runbook)\n";
    echo "ALL BLACKJACK STAGED SMOKE CHECKS PASSED\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "\nSMOKE FAILURE: " . $e->getMessage() . "\n");
    exit(1);
}
