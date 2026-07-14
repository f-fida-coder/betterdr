<?php

declare(strict_types=1);

/**
 * 3-Card Poker — server-authoritative two-stage deal/settle money-path suite
 * (Phase 1: shown == paid).
 *
 * ISOLATED SUITE: installs mock Response/SqlRepository/Http/… doubles before
 * the real CasinoController is loaded, exactly like AcesAndEightsTest.
 *
 * Covers: the deal->settle lifecycle (ante+PairPlus debited at deal, Play
 * charged only at settle), DEFERRED dealer reveal (dealer cards + deck stay
 * private while 'dealt' — bet response, history row, detail row), shown==paid
 * across fold / play-win / play-lose / dealer-not-qualified / push /
 * PairPlus-win-on-fold, idempotent deal replay + one-open-round resume (no
 * second stake), settle replay vs second-decision rejection, the 24h auto-fold
 * janitor (before/after the boundary), Play-affordability guard, ledger
 * reconciliation (debits==wager, credits==return, balance chain), and that the
 * payout math is byte-for-byte the pre-existing resolve3CardPokerSettlement.
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
    }
}

if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return gmdate(DATE_ATOM); }
        public static function id(string $id): string { return $id; }
    }
}

if (!class_exists('Response')) {
    class Response
    {
        /** @var array{status:int,data:array<string,mixed>} */
        public static array $last = ['status' => 0, 'data' => []];

        public static function json(array $data, int $status = 200): void
        {
            self::$last = ['status' => $status, 'data' => $data];
        }

        public static function serverError(string $message, ?Throwable $e = null): void
        {
            self::$last = ['status' => 500, 'data' => ['message' => $message, 'error' => $e ? $e->getMessage() : null]];
        }

        public static function reset(): void
        {
            self::$last = ['status' => 0, 'data' => []];
        }
    }
}

if (!class_exists('Http')) {
    class Http
    {
        public static function header(string $name): string { return ''; }
        public static function jsonBody(): array { return []; }
    }
}

if (!class_exists('IpUtils')) {
    class IpUtils
    {
        public static function clientIp(): string { return '127.0.0.1'; }
    }
}

if (!class_exists('RateLimiter')) {
    class RateLimiter
    {
        public static function enforce(mixed $db, string $key, int $limit, int $window): bool
        {
            return false;
        }
    }
}

if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, mixed $default = null): mixed
        {
            return $default;
        }
    }
}

if (!class_exists('SportsbookBetSupport')) {
    class SportsbookBetSupport
    {
    }
}

if (!class_exists('SportsMatchStatus')) {
    class SportsMatchStatus
    {
        public static function effectiveStatus(array $match): string
        {
            return (string) ($match['effectiveStatus'] ?? $match['status'] ?? 'pending');
        }
    }
}

require_once __DIR__ . '/TestRunner.php';
require_once __DIR__ . '/../src/CasinoController.php';

function tcpCall(object $target, string $method, mixed ...$args): mixed
{
    $ref = new ReflectionMethod($target, $method);
    return $ref->invoke($target, ...$args);
}

final class TcpMockSqlRepository extends SqlRepository
{
    /** @var array<string, array<int, array<string, mixed>>> */
    public array $collections;
    private int $nextId = 1;

    /** @param array<string, array<int, array<string, mixed>>> $seed */
    public function __construct(array $seed = [])
    {
        $this->collections = $seed;
    }

    public function beginTransaction(): void {}
    public function commit(): void {}
    public function rollback(): void {}

    public function findOne(string $collection, array $query): ?array
    {
        foreach ($this->collections[$collection] ?? [] as $doc) {
            if ($this->matches($doc, $query)) {
                return $doc;
            }
        }
        return null;
    }

    public function findOneForUpdate(string $collection, array $query): ?array
    {
        return $this->findOne($collection, $query);
    }

    /** @return array<int, array<string, mixed>> */
    public function findMany(string $collection, array $query = [], array $options = []): array
    {
        $rows = [];
        foreach ($this->collections[$collection] ?? [] as $doc) {
            if ($this->matches($doc, $query)) {
                $rows[] = $doc;
            }
        }
        return array_values($rows);
    }

    public function insertOne(string $collection, array $document): string
    {
        if (!isset($document['id']) || trim((string) $document['id']) === '') {
            $document['id'] = 'mock_' . $this->nextId++;
        }
        $this->collections[$collection] ??= [];
        $this->collections[$collection][] = $document;
        return (string) $document['id'];
    }

    public function updateOne(string $collection, array $query, array $updates): void
    {
        $this->collections[$collection] ??= [];
        foreach ($this->collections[$collection] as $idx => $doc) {
            if ($this->matches($doc, $query)) {
                $this->collections[$collection][$idx] = array_replace($doc, $updates);
                return;
            }
        }
    }

    private function matches(array $doc, array $query): bool
    {
        foreach ($query as $field => $expected) {
            $actual = $doc[$field] ?? null;
            if (is_array($expected)) {
                if (array_key_exists('$lt', $expected) && !((string) $actual < (string) $expected['$lt'])) {
                    return false;
                }
                if (array_key_exists('$lte', $expected) && !((string) $actual <= (string) $expected['$lte'])) {
                    return false;
                }
                if (array_key_exists('$gt', $expected) && !((string) $actual > (string) $expected['$gt'])) {
                    return false;
                }
                if (array_key_exists('$gte', $expected) && !((string) $actual >= (string) $expected['$gte'])) {
                    return false;
                }
                if (array_key_exists('$ne', $expected) && $actual === $expected['$ne']) {
                    return false;
                }
                continue;
            }
            if ($actual !== $expected) {
                return false;
            }
        }
        return true;
    }
}

/**
 * @return array{0: CasinoController, 1: TcpMockSqlRepository, 2: array<string, mixed>}
 */
function tcpBuildHarness(array $userOverrides = [], array $gameOverrides = []): array
{
    $userId = 'tcp_test_user';
    $db = new TcpMockSqlRepository([
        'casinogames' => [array_replace([
            'id' => 'tcp_game',
            'slug' => '3card-poker',
            'name' => '3-Card Poker',
            'status' => 'active',
            'minBet' => 1,
            'maxBet' => 300,
        ], $gameOverrides)],
        'users' => [array_replace([
            'id' => $userId,
            'username' => 'mock_tcp_player',
            'role' => 'user',
            'status' => 'active',
            'balance' => 500,
            'pendingBalance' => 0,
            'minBet' => 1,
            'maxBet' => 100000,
        ], $userOverrides)],
        'transactions' => [],
        'casino_bets' => [],
        'casino_round_audit' => [],
    ]);

    $controller = new CasinoController($db, 'tcp-test-secret');
    $actor = [
        'id' => $userId,
        'username' => 'mock_tcp_player',
        'role' => 'user',
        'status' => 'active',
    ];

    return [$controller, $db, $actor];
}

/** @return array<string, mixed> */
function tcpUser(TcpMockSqlRepository $db): array
{
    $user = $db->findOne('users', ['id' => 'tcp_test_user']);
    if ($user === null) {
        throw new RuntimeException('test user missing');
    }
    return $user;
}

/** @return array{status: int, data: array<string, mixed>} */
function tcpBet(CasinoController $controller, array $actor, array $bets, string $requestId): array
{
    Response::reset();
    tcpCall($controller, 'place3CardPokerBet', $actor, ['bets' => $bets], $requestId, microtime(true));
    return Response::$last;
}

/**
 * Seed an open ('dealt') round exactly as deal3CardPokerRound would, with
 * CRAFTED player + dealer hands so settle outcomes are deterministic. Books the
 * matching ante+PairPlus debit and applies it to the balance.
 *
 * @param array<int, string> $playerCodes 3 card codes (e.g. ['KS','KD','5C'])
 * @param array<int, string> $dealerCodes 3 card codes
 * @return string the roundId
 */
function tcpSeedOpenRound(
    CasinoController $controller,
    TcpMockSqlRepository $db,
    array $playerCodes,
    array $dealerCodes,
    float $ante,
    float $pairPlus,
    string $requestId,
    ?string $createdAt = null
): string {
    $userId = 'tcp_test_user';
    $roundId = tcpCall($controller, 'deterministicRoundId', '3card-poker', $userId, $requestId);
    $stageOne = round($ante + $pairPlus);
    $now = $createdAt ?? SqlRepository::nowUtc();

    $playerData = array_map(fn(string $c) => tcpCall($controller, 'cardCodeToData', $c), $playerCodes);
    $dealerData = array_map(fn(string $c) => tcpCall($controller, 'cardCodeToData', $c), $dealerCodes);
    $playerHand = (string) (tcpCall($controller, 'evaluate3CardPokerHand', $playerData)['name'] ?? '');

    $user = tcpUser($db);
    $balanceBefore = round((float) $user['balance']);
    $balanceAfterDebit = round($balanceBefore - $stageOne);
    $db->updateOne('users', ['id' => $userId], ['balance' => $balanceAfterDebit]);

    $db->insertOne('transactions', [
        'userId' => $userId,
        'amount' => $stageOne,
        'type' => 'casino_bet_debit',
        'entrySide' => 'DEBIT',
        'entryGroupId' => $roundId,
        'sourceType' => 'casino_3card_poker',
        'sourceId' => $roundId,
        'status' => 'completed',
        'balanceBefore' => $balanceBefore,
        'balanceAfter' => $balanceAfterDebit,
        'reason' => 'CASINO_3CARD_POKER_WAGER',
        'createdAt' => $now,
        'updatedAt' => $now,
    ]);

    $db->insertOne('casino_bets', [
        'id' => $roundId,
        'roundId' => $roundId,
        'requestId' => $requestId,
        'userId' => $userId,
        'username' => 'mock_tcp_player',
        'game' => '3card-poker',
        'bets' => ['action' => 'deal', 'Ante' => $ante, 'PairPlus' => $pairPlus, 'Play' => 0, 'folded' => 0],
        'playerCards' => $playerCodes,
        'playerHand' => $playerHand,
        'result' => 'Pending',
        'resultType' => '',
        'totalWager' => $stageOne,
        'totalReturn' => 0.0,
        'profit' => 0.0,
        'netResult' => round(-$stageOne),
        'balanceBefore' => $balanceBefore,
        'balanceAfter' => $balanceAfterDebit,
        'availableBalanceBefore' => $balanceBefore,
        'availableBalanceAfter' => $balanceAfterDebit,
        'pendingBalanceSnapshot' => 0.0,
        // PRIVATE committed hands + deck (deferred reveal).
        'tcpPlayerCards' => $playerData,
        'tcpDealerCards' => $dealerData,
        'tcpDeckCodes' => array_merge($playerCodes, $dealerCodes),
        'deckHash' => hash('sha256', implode(',', array_merge($playerCodes, $dealerCodes)) . '|' . $requestId),
        'ledgerEntries' => ['debit' => 'seeded'],
        'rngVersion' => 'server-cards-server-rules-v3',
        'outcomeSource' => 'server_deal_server_rules',
        'betDetails' => ['ante' => $ante, 'pairPlus' => $pairPlus, 'playerHand' => $playerHand],
        'roundData' => [
            'stage' => 'dealt',
            'playerAction' => 'pending',
            'ante' => $ante,
            'pairPlus' => $pairPlus,
            'playerCards' => $playerCodes,
            'playerHand' => $playerHand,
        ],
        'roundStatus' => 'dealt',
        'createdAt' => $now,
        'updatedAt' => $now,
    ]);

    $db->insertOne('casino_round_audit', [
        'id' => $roundId,
        'roundId' => $roundId,
        'userId' => $userId,
        'game' => '3card-poker',
        'stage' => 'dealt',
        'createdAt' => $now,
        'updatedAt' => $now,
    ]);

    return $roundId;
}

/* ══════════════════ deal lifecycle + deferred reveal ══════════════════ */

TestRunner::run('3CP deal: opens a dealt round, debits ante+PairPlus, hides the dealer', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness();

    $resp = tcpBet($controller, $actor, ['action' => 'deal', 'Ante' => 10, 'PairPlus' => 5], 'deal-1');
    TestRunner::assertEquals(200, $resp['status'], 'deal returns 200');
    $data = $resp['data'];

    TestRunner::assertEquals('dealt', $data['roundStatus'], 'round is dealt');
    TestRunner::assertEquals(3, count($data['playerCards']), 'player gets 3 cards');
    // DEFERRED REVEAL: no dealer cards while dealt.
    TestRunner::assertEquals(0, count($data['dealerCards']), 'dealer hidden at deal');
    TestRunner::assertEquals(false, isset($data['roundData']['dealerCards']), 'roundData has no dealer while dealt');
    TestRunner::assertEquals(15.0, (float) $data['totalWager'], 'stage-1 wager = ante + PairPlus');
    TestRunner::assertEquals(485.0, (float) $data['balanceAfter'], 'balance debited by 15');

    // The dealer IS committed server-side — but only in the private field.
    $row = $db->findOne('casino_bets', ['roundId' => $data['roundId']]);
    TestRunner::assertEquals(3, count($row['tcpDealerCards']), 'dealer committed privately');
    TestRunner::assertEquals(true, empty($row['dealerCards'] ?? []), 'row exposes no dealerCards while dealt');

    // Exactly one debit booked.
    $debits = array_filter($db->collections['transactions'], fn($t) => ($t['entryGroupId'] ?? '') === $data['roundId'] && ($t['entrySide'] ?? '') === 'DEBIT');
    TestRunner::assertEquals(1, count($debits), 'one debit at deal');
});

TestRunner::run('3CP deferred reveal: mappers never expose the dealer while dealt', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness();
    $resp = tcpBet($controller, $actor, ['action' => 'deal', 'Ante' => 10, 'PairPlus' => 0], 'deal-hide');
    $row = $db->findOne('casino_bets', ['roundId' => $resp['data']['roundId']]);

    $historyRow = tcpCall($controller, 'mapCasinoBetRow', $row);
    TestRunner::assertEquals(0, count($historyRow['dealerCards']), 'history row hides dealer');
    TestRunner::assertEquals(false, isset($historyRow['roundData']['dealerCards']), 'history roundData hides dealer');
    TestRunner::assertEquals(false, isset($historyRow['tcpDealerCards']), 'history never carries tcp*');

    $detail = tcpCall($controller, 'mapCasinoBetDetail', $row, [], null);
    TestRunner::assertEquals(0, count($detail['dealerCards']), 'detail row hides dealer');
    TestRunner::assertEquals(false, isset($detail['tcpDealerCards']), 'detail never carries tcp*');

    $formatted = tcpCall($controller, 'formatCasinoBetResponse', $row, [], false);
    TestRunner::assertEquals(0, count($formatted['dealerCards']), 'bet response hides dealer');
    TestRunner::assertEquals(false, isset($formatted['tcpDealerCards']), 'bet response never carries tcp*');
});

/* ══════════════════ shown == paid ══════════════════ */

/**
 * Drive a crafted round through settle and assert the settled response echoes
 * the EXACT committed cards and that totalReturn equals the pre-existing payout
 * engine recomputed on those same cards (shown == paid, math unchanged).
 */
function tcpAssertShownEqualsPaid(
    string $label,
    array $playerCodes,
    array $dealerCodes,
    float $ante,
    float $pairPlus,
    bool $folded
): void {
    TestRunner::run($label, function () use ($playerCodes, $dealerCodes, $ante, $pairPlus, $folded): void {
        [$controller, $db, $actor] = tcpBuildHarness();
        $roundId = tcpSeedOpenRound($controller, $db, $playerCodes, $dealerCodes, $ante, $pairPlus, 'req-' . md5(implode($playerCodes) . implode($dealerCodes) . ($folded ? 'F' : 'P')));

        // Independent recompute with the untouched payout engine.
        $playerData = array_map(fn(string $c) => tcpCall($controller, 'cardCodeToData', $c), $playerCodes);
        $dealerData = array_map(fn(string $c) => tcpCall($controller, 'cardCodeToData', $c), $dealerCodes);
        $play = $folded ? 0.0 : $ante;
        $expected = tcpCall($controller, 'resolve3CardPokerSettlement', $ante, $pairPlus, $play, $folded, $playerData, $dealerData);

        $resp = tcpBet($controller, $actor, ['action' => 'settle', 'roundId' => $roundId, 'folded' => $folded ? 1 : 0], 'settle-' . $roundId);
        TestRunner::assertEquals(200, $resp['status'], 'settle 200');
        $data = $resp['data'];

        TestRunner::assertEquals('settled', $data['roundStatus'], 'settled');
        // shown == paid: exposed cards are the committed cards.
        TestRunner::assertEquals($playerCodes, $data['playerCards'], 'player cards == committed');
        TestRunner::assertEquals($dealerCodes, $data['dealerCards'], 'dealer cards revealed == committed');
        // paid amount == the untouched payout engine on those cards.
        TestRunner::assertEquals((float) $expected['totalReturn'], (float) $data['totalReturn'], 'totalReturn matches payout engine');
        TestRunner::assertEquals((float) $expected['totalWager'], (float) $data['totalWager'], 'totalWager matches payout engine');
        TestRunner::assertEquals($expected['mainResultLabel'], $data['result'], 'result label matches');
    });
}

// play, player wins (pair-K over pair-Q, dealer qualifies) + PairPlus pair.
tcpAssertShownEqualsPaid('3CP shown==paid: play, player wins + PairPlus', ['KS', 'KD', '5C'], ['QH', 'QS', '7D'], 10, 5, false);
// play, dealer does NOT qualify (8-high) — ante 2x, play push.
tcpAssertShownEqualsPaid('3CP shown==paid: play, dealer not qualified', ['AS', 'KD', '3C'], ['8H', '5D', '2C'], 10, 0, false);
// play, dealer wins (A-high over 9-high) — total loss.
tcpAssertShownEqualsPaid('3CP shown==paid: play, dealer wins', ['9S', '6D', '2C'], ['AH', 'KS', '5D'], 10, 0, false);
// play, tie/push (identical K-Q-9 ranks).
tcpAssertShownEqualsPaid('3CP shown==paid: play, push', ['KS', 'QD', '9C'], ['KH', 'QS', '9D'], 10, 0, false);
// fold, PairPlus still pays on the dealt pair.
tcpAssertShownEqualsPaid('3CP shown==paid: fold, PairPlus pays', ['7H', '7D', '2C'], ['AH', 'KS', '5D'], 10, 5, true);
// play, straight flush — big PairPlus + ante bonus.
tcpAssertShownEqualsPaid('3CP shown==paid: play, straight flush', ['5S', '6S', '7S'], ['QH', 'QS', '2D'], 10, 5, false);

/* ══════════════════ money reconciliation ══════════════════ */

TestRunner::run('3CP reconcile: debits==wager, credits==return, balance chains', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness();
    $roundId = tcpSeedOpenRound($controller, $db, ['KS', 'KD', '5C'], ['QH', 'QS', '7D'], 10, 5, 'rec-1');
    $resp = tcpBet($controller, $actor, ['action' => 'settle', 'roundId' => $roundId, 'folded' => 0], 'rec-settle');
    $data = $resp['data'];

    $entries = array_filter($db->collections['transactions'], fn($t) => ($t['entryGroupId'] ?? '') === $roundId);
    $debitSum = array_sum(array_map(fn($t) => ($t['entrySide'] === 'DEBIT') ? (float) $t['amount'] : 0, $entries));
    $creditSum = array_sum(array_map(fn($t) => ($t['entrySide'] === 'CREDIT') ? (float) $t['amount'] : 0, $entries));

    TestRunner::assertEquals((float) $data['totalWager'], $debitSum, 'debits sum == totalWager');
    TestRunner::assertEquals((float) $data['totalReturn'], $creditSum, 'credits sum == totalReturn');

    // Deal debit (15) + play debit (10) = 25 wager; player-win return = 20+20+10 = 50.
    TestRunner::assertEquals(25.0, $debitSum, 'wager = ante+PairPlus+Play');
    TestRunner::assertEquals(50.0, $creditSum, 'return = ante2x+play2x+pairplus');
    // Balance: 500 -15 (deal) -10 (play) +50 = 525.
    TestRunner::assertEquals(525.0, (float) tcpUser($db)['balance'], 'final balance chains');
    TestRunner::assertEquals(500.0, (float) $data['balanceBefore'], 'balanceBefore = deal-time');
    TestRunner::assertEquals(525.0, (float) $data['balanceAfter'], 'balanceAfter = post-credit');
});

TestRunner::run('3CP fold: only ante+PairPlus at risk, no Play debit', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness();
    $roundId = tcpSeedOpenRound($controller, $db, ['7H', '7D', '2C'], ['AH', 'KS', '5D'], 10, 5, 'fold-1');
    $resp = tcpBet($controller, $actor, ['action' => 'fold', 'roundId' => $roundId], 'fold-settle');
    $data = $resp['data'];

    $entries = array_filter($db->collections['transactions'], fn($t) => ($t['entryGroupId'] ?? '') === $roundId);
    $debitSum = array_sum(array_map(fn($t) => ($t['entrySide'] === 'DEBIT') ? (float) $t['amount'] : 0, $entries));
    TestRunner::assertEquals(15.0, $debitSum, 'fold never charges Play');
    // PairPlus pair pays 10 back; ante forfeit. 500 -15 +10 = 495.
    TestRunner::assertEquals(10.0, (float) $data['totalReturn'], 'PairPlus paid on fold');
    TestRunner::assertEquals(495.0, (float) tcpUser($db)['balance'], 'balance reflects ante loss + PairPlus win');
});

/* ══════════════════ idempotency + lifecycle guards ══════════════════ */

TestRunner::run('3CP idempotent deal replay: same request never stakes twice', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness();
    $r1 = tcpBet($controller, $actor, ['action' => 'deal', 'Ante' => 10, 'PairPlus' => 0], 'dup-deal');
    $r2 = tcpBet($controller, $actor, ['action' => 'deal', 'Ante' => 10, 'PairPlus' => 0], 'dup-deal');
    TestRunner::assertEquals($r1['data']['roundId'], $r2['data']['roundId'], 'same round returned');
    TestRunner::assertEquals(true, $r2['data']['idempotent'], 'flagged idempotent');
    $rounds = array_filter($db->collections['casino_bets'], fn($b) => ($b['userId'] ?? '') === 'tcp_test_user');
    TestRunner::assertEquals(1, count($rounds), 'only one round row exists');
    TestRunner::assertEquals(490.0, (float) tcpUser($db)['balance'], 'debited once only');
});

TestRunner::run('3CP one-open-round: a second deal resumes, never re-stakes', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness();
    $first = tcpBet($controller, $actor, ['action' => 'deal', 'Ante' => 10, 'PairPlus' => 0], 'open-a');
    $second = tcpBet($controller, $actor, ['action' => 'deal', 'Ante' => 25, 'PairPlus' => 10], 'open-b');
    TestRunner::assertEquals($first['data']['roundId'], $second['data']['roundId'], 'resumed the open round');
    TestRunner::assertEquals(0, count($second['data']['dealerCards']), 'resume still hides dealer');
    TestRunner::assertEquals(490.0, (float) tcpUser($db)['balance'], 'only the first ante debited');
});

TestRunner::run('3CP settle replay vs second decision', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness();
    $roundId = tcpSeedOpenRound($controller, $db, ['KS', 'KD', '5C'], ['QH', 'QS', '7D'], 10, 0, 'replay-1');

    $s1 = tcpBet($controller, $actor, ['action' => 'settle', 'roundId' => $roundId, 'folded' => 0], 'settle-x');
    TestRunner::assertEquals(200, $s1['status'], 'first settle ok');
    $balAfter = (float) tcpUser($db)['balance'];

    // Same actionRequestId → idempotent replay, same answer, no double credit.
    $s2 = tcpBet($controller, $actor, ['action' => 'settle', 'roundId' => $roundId, 'folded' => 0], 'settle-x');
    TestRunner::assertEquals(200, $s2['status'], 'replay ok');
    TestRunner::assertEquals(true, $s2['data']['idempotent'], 'replay flagged');
    TestRunner::assertEquals($balAfter, (float) tcpUser($db)['balance'], 'no double credit on replay');

    // Different request, tries to fold now → rejected, hand already final.
    $s3 = tcpBet($controller, $actor, ['action' => 'fold', 'roundId' => $roundId], 'settle-y');
    TestRunner::assertEquals(409, $s3['status'], 'second decision rejected');
    TestRunner::assertEquals($balAfter, (float) tcpUser($db)['balance'], 'balance untouched by rejected settle');
});

TestRunner::run('3CP settle unknown round → 404', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness();
    $resp = tcpBet($controller, $actor, ['action' => 'settle', 'roundId' => str_repeat('a', 24), 'folded' => 0], 'missing');
    TestRunner::assertEquals(404, $resp['status'], 'missing round 404');
});

TestRunner::run('3CP play with insufficient balance → 400, round stays open', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness(['balance' => 12]);
    // Ante 10 + PairPlus 0 debits 10 at deal → 2 left; Play (10) unaffordable.
    $roundId = tcpSeedOpenRound($controller, $db, ['KS', 'KD', '5C'], ['QH', 'QS', '7D'], 10, 0, 'poor-1');
    $resp = tcpBet($controller, $actor, ['action' => 'play', 'roundId' => $roundId], 'poor-play');
    TestRunner::assertEquals(400, $resp['status'], 'play rejected');
    $row = $db->findOne('casino_bets', ['roundId' => $roundId]);
    TestRunner::assertEquals('dealt', $row['roundStatus'], 'round stays open to fold');
});

/* ══════════════════ abandoned-round janitor (auto-fold) ══════════════════ */

TestRunner::run('3CP janitor: >24h dealt round auto-folds (ante forfeit, PairPlus pays)', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness();
    $old = gmdate(DATE_ATOM, time() - 86400 - 60);
    // Strong hand (straight flush) left open — auto-fold forfeits the ante but
    // PairPlus still pays on the dealt hand.
    $roundId = tcpSeedOpenRound($controller, $db, ['5S', '6S', '7S'], ['QH', 'QS', '2D'], 10, 5, 'aband-1', $old);
    $balBefore = (float) tcpUser($db)['balance'];

    $result = tcpCall($controller, 'sweepExpired3CardPokerRounds', 'tcp_test_user', 200);
    TestRunner::assertEquals(1, $result['swept'], 'one round swept');

    $row = $db->findOne('casino_bets', ['roundId' => $roundId]);
    TestRunner::assertEquals('settled', $row['roundStatus'], 'force-settled');
    TestRunner::assertEquals('Fold', $row['playerAction'], 'auto-folded');
    // PairPlus straight-flush pays 40:1 → 5*40+5 = 205; ante (10) forfeit, no Play.
    TestRunner::assertEquals(205.0, (float) $row['totalReturn'], 'PairPlus still paid on fold');
    TestRunner::assertEquals($balBefore + 205.0, (float) tcpUser($db)['balance'], 'credited the PairPlus win');
});

TestRunner::run('3CP janitor: a fresh dealt round is left untouched', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness();
    $roundId = tcpSeedOpenRound($controller, $db, ['KS', 'KD', '5C'], ['QH', 'QS', '7D'], 10, 0, 'fresh-1');
    $result = tcpCall($controller, 'sweepExpired3CardPokerRounds', 'tcp_test_user', 200);
    TestRunner::assertEquals(0, $result['swept'], 'nothing swept before the window');
    $row = $db->findOne('casino_bets', ['roundId' => $roundId]);
    TestRunner::assertEquals('dealt', $row['roundStatus'], 'still open');
});

TestRunner::run('3CP disabled tile blocks a deal', function (): void {
    [$controller, $db, $actor] = tcpBuildHarness([], ['status' => 'disabled']);
    $resp = tcpBet($controller, $actor, ['action' => 'deal', 'Ante' => 10, 'PairPlus' => 0], 'disabled-1');
    TestRunner::assertEquals(true, $resp['status'] >= 400, 'disabled game rejects');
});
