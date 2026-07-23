<?php

declare(strict_types=1);

/**
 * Staged blackjack stake-changing actions (rebuild C1c) — double / split /
 * insurance money-path suite.
 *
 * ISOLATED SUITE: installs mock Response/SqlRepository/… doubles before the
 * real CasinoController is loaded (same pattern as AcesAndEightsTest).
 *
 * Deterministic scenarios are hand-seeded as 'playing' casino_bets rows so
 * the cards are chosen, not random. Covers: the double debit lands AT THE
 * MOMENT of doubling (real balance reduction + ledger row, never deferred);
 * split stakes each hand independently and split-then-double charges ONLY
 * the doubled hand; split-aces auto-stand carries into the staged model and
 * settles in the same request; insurance is charged when taken and capped at
 * half the main bet; an engine rejection or insufficient balance leaves the
 * round byte-identical (no card, no debit) and still playable; and the C1b
 * idempotency guard covers these actions too (a retried double never
 * double-charges).
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
        public static array $last = ['status' => 0, 'data' => []];
        public static function json(array $data, int $status = 200): void
        {
            self::$last = ['status' => $status, 'data' => $data];
        }
        public static function serverError(string $message, ?Throwable $e = null): void
        {
            self::$last = ['status' => 500, 'data' => ['message' => $message]];
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
        public static function enforce(mixed $db, string $key, int $limit, int $window): bool { return false; }
    }
}

if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, mixed $default = null): mixed { return $default; }
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

final class BjkMockSqlRepository extends SqlRepository
{
    /** @var array<string, array<int, array<string, mixed>>> */
    public array $collections;
    private int $nextId = 1;

    public function __construct(array $seed = [])
    {
        $this->collections = $seed;
    }

    public function beginTransaction(): void
    {
    }

    public function commit(): void
    {
    }

    public function rollback(): void
    {
    }

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
            if (($doc[$field] ?? null) != $expected) {
                return false;
            }
        }
        return true;
    }
}

function bjkCall(object $target, string $method, mixed ...$args): mixed
{
    $ref = new ReflectionMethod($target, $method);
    return $ref->invoke($target, ...$args);
}

/** @return array{0: CasinoController, 1: BjkMockSqlRepository} */
function bjkHarness(float $balance): array
{
    $db = new BjkMockSqlRepository([
        'users' => [[
            'id' => 'u1',
            'username' => 'bjk_tester',
            'role' => 'user',
            'status' => 'active',
            'balance' => $balance,
            'pendingBalance' => 0,
        ]],
        'casinogames' => [[
            'id' => 'g1',
            'slug' => 'blackjack',
            'name' => 'Blackjack',
            'status' => 'active',
            'minBet' => 1,
            'maxBet' => 10000,
        ]],
        'casino_bets' => [],
        'transactions' => [],
        'casino_round_audit' => [],
    ]);
    return [new CasinoController($db, 'bjk-test-secret'), $db];
}

function bjkCard(string $rank, string $suit): array
{
    return ['rank' => $rank, 'suit' => $suit, 'code' => $rank . ':' . $suit];
}

function bjkHand(string $zone, array $cards, float $bet = 10.0, array $overrides = []): array
{
    return array_replace([
        'zone' => $zone,
        'baseZone' => $zone,
        'cards' => $cards,
        'bet' => $bet,
        'isSplit' => false,
        'surrendered' => false,
        'evenMoney' => false,
        'doubled' => false,
        'completed' => false,
        'standingReason' => null,
    ], $overrides);
}

/** Seed a deterministic 'playing' round directly into the mock DB. */
function bjkSeedRound(BjkMockSqlRepository $db, array $hands, array $dealerCards, array $opts = []): array
{
    $zeroZone = ['main' => 0.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0];
    $zones = ['betZone1' => $zeroZone, 'betZone2' => $zeroZone, 'betZone3' => $zeroZone];
    $totalWager = 0.0;
    foreach ($hands as $zoneName => $hand) {
        if (isset($zones[$zoneName])) {
            $zones[$zoneName]['main'] = (float) $hand['bet'];
        }
        $totalWager += (float) $hand['bet'];
    }

    $flags = ['betZone1' => false, 'betZone2' => false, 'betZone3' => false];
    $state = [
        'version' => 'bj_round_v1',
        'seed' => (string) ($opts['seed'] ?? 'bjk-seeded-seed'),
        'deckCount' => 6,
        'drawn' => (int) ($opts['drawn'] ?? 0),
        'zones' => $zones,
        'insuranceStakes' => ['betZone1' => 0.0, 'betZone2' => 0.0, 'betZone3' => 0.0],
        'insuranceTaken' => $flags,
        'insuranceDecided' => $flags,
        'splitUsed' => $flags,
        'hands' => $hands,
        'playOrder' => array_keys($hands),
        'currentIndex' => 0,
        'dealerCards' => $dealerCards,
        'phase' => (string) ($opts['phase'] ?? 'actions'),
        'actionLog' => [['action' => 'deal', 'zone' => null, 'at' => '']],
    ];

    $requestId = (string) ($opts['requestId'] ?? 'bjk_seeded_round_1');
    $row = [
        'id' => 'bjk_round_' . $requestId,
        'roundId' => 'bjk_round_' . $requestId,
        'requestId' => $requestId,
        'userId' => 'u1',
        'username' => 'bjk_tester',
        'game' => 'blackjack',
        'roundStatus' => 'playing',
        'bets' => ['totalWager' => $totalWager, 'zones' => []],
        'totalWager' => $totalWager,
        'playerCards' => [],
        'dealerCards' => [(string) ($dealerCards[0]['code'] ?? '')],
        'balanceBefore' => 0,
        'balanceAfter' => 0,
        'pendingBalanceSnapshot' => 0,
        'ledgerEntries' => ['debit' => 'seeded_deal_debit'],
        'rngVersion' => 'bj-staged-csprng-v1',
        'outcomeSource' => 'server_dealt_staged',
        'deckHash' => 'seeded-deck-hash',
        'bjState' => $state,
        'createdAt' => SqlRepository::nowUtc(),
        'updatedAt' => SqlRepository::nowUtc(),
    ];
    $db->collections['casino_bets'][] = $row;
    return $row;
}

function bjkPlace(CasinoController $c, array $bets, string $requestId): array
{
    Response::reset();
    bjkCall($c, 'placeBlackjackBet', ['id' => 'u1', 'username' => 'bjk_tester'], ['bets' => $bets], $requestId, microtime(true));
    return Response::$last;
}

function bjkBalance(BjkMockSqlRepository $db): float
{
    return (float) ($db->collections['users'][0]['balance'] ?? -1);
}

/** All DEBIT ledger rows written by ACTIONS (excludes the seeded deal marker). */
function bjkActionDebits(BjkMockSqlRepository $db): array
{
    $rows = [];
    foreach ($db->collections['transactions'] ?? [] as $row) {
        if ((string) ($row['entrySide'] ?? '') === 'DEBIT') {
            $rows[] = $row;
        }
    }
    return $rows;
}

function bjkCredits(BjkMockSqlRepository $db): array
{
    $rows = [];
    foreach ($db->collections['transactions'] ?? [] as $row) {
        if ((string) ($row['entrySide'] ?? '') === 'CREDIT') {
            $rows[] = $row;
        }
    }
    return $rows;
}

function bjkStoredState(BjkMockSqlRepository $db, int $idx = 0): array
{
    return $db->collections['casino_bets'][$idx]['bjState'];
}

TestRunner::run('BJ stakes: double debits at the moment of doubling', function (): void {
    [$c, $db] = bjkHarness(990.0); // as-if the $10 deal debit already happened
    $round = bjkSeedRound($db, ['betZone1' => bjkHand('betZone1', [bjkCard('6', 's1'), bjkCard('5', 's2')], 10.0)], [bjkCard('10', 's3'), bjkCard('9', 's4')]);

    $resp = bjkPlace($c, ['action' => 'double', 'zone' => 'betZone1', 'actionRequestId' => 'dbl_act_001'], (string) $round['requestId']);
    TestRunner::assertEquals(200, (int) $resp['status'], 'double succeeds');

    $debits = bjkActionDebits($db);
    TestRunner::assertEquals(1, count($debits), 'exactly one action debit written');
    TestRunner::assertEqualsFloat(10.0, (float) $debits[0]['amount'], 'debit = the original hand bet');
    TestRunner::assertEquals('Blackjack double down stake charged', (string) $debits[0]['description'], 'debit labeled as the double');
    TestRunner::assertEqualsFloat(990.0, (float) $debits[0]['balanceBefore'], 'debit row balanceBefore');
    TestRunner::assertEqualsFloat(980.0, (float) $debits[0]['balanceAfter'], 'debit row balanceAfter — charged immediately, not at settlement');

    $state = bjkStoredState($db);
    $hand = $state['hands']['betZone1'];
    TestRunner::assertEqualsFloat(20.0, (float) $hand['bet'], 'hand bet doubled');
    TestRunner::assertTrue((bool) $hand['doubled'], 'doubled flag set');
    TestRunner::assertEquals(3, count($hand['cards']), 'double drew exactly one card');

    // Single hand → the round settled in the same request; credit landed.
    TestRunner::assertEquals('settled', (string) $resp['data']['roundStatus'], 'single-hand double settles the round');
    TestRunner::assertEqualsFloat(20.0, (float) $resp['data']['totalWager'], 'round wager reflects the doubled stake');
    $credits = bjkCredits($db);
    TestRunner::assertEquals(1, count($credits), 'settle credit written');
    TestRunner::assertEqualsFloat(980.0 + (float) $resp['data']['totalReturn'], bjkBalance($db), 'balance = post-double balance + return');

    // Idempotency: replaying the double changes nothing.
    $replay = bjkPlace($c, ['action' => 'double', 'zone' => 'betZone1', 'actionRequestId' => 'dbl_act_001'], (string) $round['requestId']);
    TestRunner::assertEquals(200, (int) $replay['status'], 'replayed double returns 200');
    TestRunner::assertTrue((bool) $replay['data']['idempotent'], 'replay flagged idempotent');
    TestRunner::assertEquals(1, count(bjkActionDebits($db)), 'replay wrote NO second debit');
    TestRunner::assertEquals(1, count(bjkCredits($db)), 'replay wrote NO second credit');
});

TestRunner::run('BJ stakes: insufficient balance rejects the double, round stays playable', function (): void {
    [$c, $db] = bjkHarness(5.0);
    $round = bjkSeedRound($db, ['betZone1' => bjkHand('betZone1', [bjkCard('10', 's1'), bjkCard('6', 's2')], 10.0)], [bjkCard('10', 's3'), bjkCard('9', 's4')]);

    $resp = bjkPlace($c, ['action' => 'double', 'zone' => 'betZone1', 'actionRequestId' => 'poor_dbl_01'], (string) $round['requestId']);
    TestRunner::assertEquals(400, (int) $resp['status'], 'underfunded double is a 400');
    TestRunner::assertTrue(str_contains((string) $resp['data']['message'], 'Insufficient balance to double'), 'actionable message');

    $state = bjkStoredState($db);
    TestRunner::assertEqualsFloat(10.0, (float) $state['hands']['betZone1']['bet'], 'hand bet unchanged');
    TestRunner::assertEquals(2, count($state['hands']['betZone1']['cards']), 'NO card was drawn');
    TestRunner::assertEquals(0, count(bjkActionDebits($db)), 'no debit written');
    TestRunner::assertEqualsFloat(5.0, bjkBalance($db), 'balance untouched');

    // The round is still live: a plain stand settles it normally.
    $stand = bjkPlace($c, ['action' => 'stand', 'zone' => 'betZone1', 'actionRequestId' => 'poor_stand_1'], (string) $round['requestId']);
    TestRunner::assertEquals(200, (int) $stand['status'], 'round continues after the rejected double');
    TestRunner::assertEquals('settled', (string) $stand['data']['roundStatus'], 'stand settles');
    TestRunner::assertEquals(1, count(bjkCredits($db)), 'settle credit written');
});

TestRunner::run('BJ stakes: split stakes each hand; split-then-double charges ONLY that hand', function (): void {
    [$c, $db] = bjkHarness(990.0);
    $round = bjkSeedRound($db, ['betZone1' => bjkHand('betZone1', [bjkCard('8', 's1'), bjkCard('8', 's2')], 10.0)], [bjkCard('10', 's3'), bjkCard('9', 's4')]);

    $split = bjkPlace($c, ['action' => 'split', 'zone' => 'betZone1', 'actionRequestId' => 'spl_act_001'], (string) $round['requestId']);
    TestRunner::assertEquals(200, (int) $split['status'], 'split succeeds');
    $debits = bjkActionDebits($db);
    TestRunner::assertEquals(1, count($debits), 'split wrote one debit');
    TestRunner::assertEqualsFloat(10.0, (float) $debits[0]['amount'], 'split debit = one extra hand stake');
    TestRunner::assertEquals('Blackjack split stake charged', (string) $debits[0]['description'], 'labeled as the split');
    TestRunner::assertEqualsFloat(980.0, bjkBalance($db), 'balance holds both hand stakes now');

    $state = bjkStoredState($db);
    TestRunner::assertEqualsFloat(10.0, (float) $state['hands']['splitZone1']['bet'], 'split hand 1 carries its own stake');
    TestRunner::assertEqualsFloat(10.0, (float) $state['hands']['splitZone2']['bet'], 'split hand 2 carries its own stake');

    // Double the FIRST split hand only.
    $dbl = bjkPlace($c, ['action' => 'double', 'zone' => 'splitZone1', 'actionRequestId' => 'spl_dbl_001'], (string) $round['requestId']);
    TestRunner::assertEquals(200, (int) $dbl['status'], 'split-then-double succeeds');
    $debits = bjkActionDebits($db);
    TestRunner::assertEquals(2, count($debits), 'exactly one more debit for the double');
    TestRunner::assertEqualsFloat(10.0, (float) $debits[1]['amount'], 'double debit = THAT hand\'s stake only');
    TestRunner::assertEqualsFloat(970.0, bjkBalance($db), 'total held: 10 deal + 10 split + 10 double');

    $state = bjkStoredState($db);
    TestRunner::assertEqualsFloat(20.0, (float) $state['hands']['splitZone1']['bet'], 'doubled split hand is at 2x');
    TestRunner::assertEqualsFloat(10.0, (float) $state['hands']['splitZone2']['bet'], 'the OTHER split hand is untouched');
    TestRunner::assertFalse((bool) $state['hands']['splitZone2']['completed'], 'other hand still open');

    // Finish and reconcile: 2 action debits + 1 credit; wager totals agree.
    $stand = bjkPlace($c, ['action' => 'stand', 'zone' => 'splitZone2', 'actionRequestId' => 'spl_stand_1'], (string) $round['requestId']);
    TestRunner::assertEquals('settled', (string) $stand['data']['roundStatus'], 'round settles');
    TestRunner::assertEqualsFloat(30.0, (float) $stand['data']['totalWager'], 'settled wager = 10 + 10 split + 10 double');
    TestRunner::assertEquals(1, count(bjkCredits($db)), 'one settle credit');
    TestRunner::assertEqualsFloat(970.0 + (float) $stand['data']['totalReturn'], bjkBalance($db), 'final balance reconciles');
});

TestRunner::run('BJ stakes: split aces auto-stand carries into the staged model', function (): void {
    [$c, $db] = bjkHarness(990.0);
    $round = bjkSeedRound($db, ['betZone1' => bjkHand('betZone1', [bjkCard('A', 's1'), bjkCard('A', 's2')], 10.0)], [bjkCard('10', 's3'), bjkCard('7', 's4')]);

    $resp = bjkPlace($c, ['action' => 'split', 'zone' => 'betZone1', 'actionRequestId' => 'ace_spl_001'], (string) $round['requestId']);
    TestRunner::assertEquals(200, (int) $resp['status'], 'ace split succeeds');
    TestRunner::assertEquals('settled', (string) $resp['data']['roundStatus'], 'ace-split round settles in the SAME request');

    $state = bjkStoredState($db);
    TestRunner::assertEquals('split_aces_auto_stand', (string) $state['hands']['splitZone1']['standingReason'], 'hand 1 auto-stood');
    TestRunner::assertEquals('split_aces_auto_stand', (string) $state['hands']['splitZone2']['standingReason'], 'hand 2 auto-stood');
    TestRunner::assertEquals(2, count($state['hands']['splitZone1']['cards']), 'hand 1 got exactly one card after the ace');
    TestRunner::assertEquals(2, count($state['hands']['splitZone2']['cards']), 'hand 2 got exactly one card after the ace');

    TestRunner::assertEquals(1, count(bjkActionDebits($db)), 'split stake debited');
    TestRunner::assertEquals(1, count(bjkCredits($db)), 'settle credit written');
    TestRunner::assertEqualsFloat(980.0 + (float) $resp['data']['totalReturn'], bjkBalance($db), 'balance reconciles through split + settle');
});

TestRunner::run('BJ stakes: insurance charged when taken, capped at half the main bet', function (): void {
    [$c, $db] = bjkHarness(990.0);
    // Dealer shows an Ace with blackjack underneath; player 18.
    $round = bjkSeedRound(
        $db,
        ['betZone1' => bjkHand('betZone1', [bjkCard('10', 's1'), bjkCard('8', 's2')], 10.0)],
        [bjkCard('A', 's3'), bjkCard('K', 's4')],
        ['phase' => 'insurance']
    );

    $noStake = bjkPlace($c, ['action' => 'insurance', 'zone' => 'betZone1', 'actionRequestId' => 'ins_none_01'], (string) $round['requestId']);
    TestRunner::assertEquals(400, (int) $noStake['status'], 'insurance without a stake is a 400');
    $overHalf = bjkPlace($c, ['action' => 'insurance', 'zone' => 'betZone1', 'insuranceStake' => 6, 'actionRequestId' => 'ins_over_01'], (string) $round['requestId']);
    TestRunner::assertEquals(400, (int) $overHalf['status'], 'insurance above half the main bet is a 400');
    TestRunner::assertTrue(str_contains((string) $overHalf['data']['message'], 'half of the main bet'), 'half-cap message preserved from legacy');
    TestRunner::assertEquals(0, count(bjkActionDebits($db)), 'rejected insurance attempts wrote no debit');
    TestRunner::assertEqualsFloat(990.0, bjkBalance($db), 'balance untouched by rejections');

    $take = bjkPlace($c, ['action' => 'insurance', 'zone' => 'betZone1', 'insuranceStake' => 5, 'actionRequestId' => 'ins_take_01'], (string) $round['requestId']);
    TestRunner::assertEquals(200, (int) $take['status'], 'valid insurance accepted');
    $debits = bjkActionDebits($db);
    TestRunner::assertEquals(1, count($debits), 'insurance debit written when taken');
    TestRunner::assertEqualsFloat(5.0, (float) $debits[0]['amount'], 'insurance debit = the stake');
    TestRunner::assertEquals('Blackjack insurance stake charged', (string) $debits[0]['description'], 'labeled as insurance');
    TestRunner::assertEqualsFloat(985.0, bjkBalance($db), 'balance reduced by the insurance stake');

    // Stand into the dealer blackjack: main loses, insurance pays 2:1.
    $stand = bjkPlace($c, ['action' => 'stand', 'zone' => 'betZone1', 'actionRequestId' => 'ins_stand_1'], (string) $round['requestId']);
    TestRunner::assertEquals('settled', (string) $stand['data']['roundStatus'], 'round settles');
    TestRunner::assertEqualsFloat(15.0, (float) $stand['data']['totalWager'], 'wager = 10 main + 5 insurance');
    TestRunner::assertEqualsFloat(15.0, (float) $stand['data']['totalReturn'], 'return = insurance 2:1 payout only');
    TestRunner::assertEqualsFloat(1000.0, bjkBalance($db), 'net zero: main lost, insurance won');
    $insuranceRow = null;
    foreach ($stand['data']['betDetails']['sideBets'] as $row) {
        if ($row['type'] === 'insurance') {
            $insuranceRow = $row;
        }
    }
    TestRunner::assertEquals('win', (string) ($insuranceRow['outcome'] ?? ''), 'insurance side-bet row settled as a win');
});

TestRunner::run('BJ stakes: engine rejection means no debit, no card, round intact', function (): void {
    [$c, $db] = bjkHarness(1000.0);
    $round = bjkSeedRound($db, ['betZone1' => bjkHand('betZone1', [bjkCard('2', 's1'), bjkCard('3', 's2'), bjkCard('4', 's3')], 10.0)], [bjkCard('10', 's3'), bjkCard('9', 's4')], ['requestId' => 'bjk_rej_round_1']);

    $dbl = bjkPlace($c, ['action' => 'double', 'zone' => 'betZone1', 'actionRequestId' => 'rej_dbl_01'], 'bjk_rej_round_1');
    TestRunner::assertEquals(400, (int) $dbl['status'], 'double on a three-card hand rejected by the engine');

    [$c2, $db2] = bjkHarness(1000.0);
    bjkSeedRound($db2, ['betZone1' => bjkHand('betZone1', [bjkCard('8', 's1'), bjkCard('9', 's2')], 10.0)], [bjkCard('10', 's3'), bjkCard('9', 's4')], ['requestId' => 'bjk_rej_round_2']);
    $spl = bjkPlace($c2, ['action' => 'split', 'zone' => 'betZone1', 'actionRequestId' => 'rej_spl_01'], 'bjk_rej_round_2');
    TestRunner::assertEquals(400, (int) $spl['status'], 'splitting unequal ranks rejected by the engine');

    $ins = bjkPlace($c2, ['action' => 'insurance', 'zone' => 'betZone1', 'insuranceStake' => 5, 'actionRequestId' => 'rej_ins_01'], 'bjk_rej_round_2');
    TestRunner::assertEquals(400, (int) $ins['status'], 'insurance without a dealer Ace rejected by the engine');

    TestRunner::assertEquals(0, count(bjkActionDebits($db)) + count(bjkActionDebits($db2)), 'no rejection wrote a debit');
    TestRunner::assertEqualsFloat(1000.0, bjkBalance($db), 'balance untouched (harness 1)');
    TestRunner::assertEqualsFloat(1000.0, bjkBalance($db2), 'balance untouched (harness 2)');
    $state = bjkStoredState($db2);
    TestRunner::assertEquals(2, count($state['hands']['betZone1']['cards']), 'no card drawn by any rejection');
    TestRunner::assertEquals('playing', (string) $db2->collections['casino_bets'][0]['roundStatus'], 'round still playable');
});
