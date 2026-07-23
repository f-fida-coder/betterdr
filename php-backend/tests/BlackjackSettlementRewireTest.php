<?php

declare(strict_types=1);

/**
 * Staged blackjack settlement rewire (rebuild C1d) — resolution, hold
 * reconciliation, and the abandonment sweep.
 *
 * ISOLATED SUITE: installs mock Response/SqlRepository/… doubles before the
 * real CasinoController is loaded (same pattern as AcesAndEightsTest).
 *
 * Covers: the audited payout table under the staged flow (3:2 natural, push
 * returns the stake, standard 1:1 win, dealer-natural no-peek taking a
 * doubled stake in full); the hold-reconciliation invariant (settlement
 * wager must equal the sum of everything debited — a poisoned round aborts
 * loudly with NO credit and NO status change); resolution idempotency (a
 * round resolves exactly once — replayed settling action, post-settle
 * actions, and a sweep over a settled round all leave the single credit
 * untouched); and the 24h abandonment sweep (force-resolve via declines +
 * stands through the SAME settle path, inline on deal requests and callable
 * standalone, no-op on fresh or already-settled rounds).
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

final class BjdMockSqlRepository extends SqlRepository
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
                continue;
            }
            if ($actual != $expected) {
                return false;
            }
        }
        return true;
    }
}

function bjdCall(object $target, string $method, mixed ...$args): mixed
{
    $ref = new ReflectionMethod($target, $method);
    return $ref->invoke($target, ...$args);
}

/** @return array{0: CasinoController, 1: BjdMockSqlRepository} */
function bjdHarness(float $balance): array
{
    $db = new BjdMockSqlRepository([
        'users' => [[
            'id' => 'u1',
            'username' => 'bjd_tester',
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
    return [new CasinoController($db, 'bjd-test-secret'), $db];
}

function bjdCard(string $rank, string $suit): array
{
    return ['rank' => $rank, 'suit' => $suit, 'code' => $rank . ':' . $suit];
}

function bjdHand(string $zone, array $cards, float $bet = 10.0, array $overrides = []): array
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

function bjdSeedRound(BjdMockSqlRepository $db, array $hands, array $dealerCards, array $opts = []): array
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
        'seed' => (string) ($opts['seed'] ?? 'bjd-seeded-seed'),
        'deckCount' => 6,
        'drawn' => 0,
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

    $requestId = (string) ($opts['requestId'] ?? 'bjd_seeded_round_1');
    $row = [
        'id' => 'bjd_round_' . $requestId,
        'roundId' => 'bjd_round_' . $requestId,
        'requestId' => $requestId,
        'userId' => 'u1',
        'username' => 'bjd_tester',
        'game' => 'blackjack',
        'roundStatus' => 'playing',
        'bets' => ['totalWager' => $totalWager, 'zones' => []],
        'totalWager' => (float) ($opts['totalWagerOverride'] ?? $totalWager),
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
        'createdAt' => (string) ($opts['createdAt'] ?? SqlRepository::nowUtc()),
        'updatedAt' => SqlRepository::nowUtc(),
    ];
    $db->collections['casino_bets'][] = $row;
    return $row;
}

function bjdPlace(CasinoController $c, array $bets, string $requestId): array
{
    Response::reset();
    bjdCall($c, 'placeBlackjackBet', ['id' => 'u1', 'username' => 'bjd_tester'], ['bets' => $bets], $requestId, microtime(true));
    return Response::$last;
}

function bjdBalance(BjdMockSqlRepository $db): float
{
    return (float) ($db->collections['users'][0]['balance'] ?? -1);
}

function bjdCredits(BjdMockSqlRepository $db): array
{
    $rows = [];
    foreach ($db->collections['transactions'] ?? [] as $row) {
        if ((string) ($row['entrySide'] ?? '') === 'CREDIT') {
            $rows[] = $row;
        }
    }
    return $rows;
}

function bjdRow(BjdMockSqlRepository $db, string $requestId): ?array
{
    foreach ($db->collections['casino_bets'] as $row) {
        if ((string) ($row['requestId'] ?? '') === $requestId) {
            return $row;
        }
    }
    return null;
}

TestRunner::run('BJ rewire: audited payout table holds under the staged flow', function (): void {
    // Natural pays 3:2 (return 25 on 10).
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound($db, ['betZone1' => bjdHand('betZone1', [bjdCard('A', 's1'), bjdCard('K', 's2')], 10.0)], [bjdCard('10', 's3'), bjdCard('8', 's4')], ['requestId' => 'r_nat']);
    $resp = bjdPlace($c, ['action' => 'stand', 'zone' => 'betZone1', 'actionRequestId' => 'nat_stand_1'], 'r_nat');
    TestRunner::assertEquals('settled', (string) $resp['data']['roundStatus'], 'natural round settles');
    TestRunner::assertEquals('blackjack', (string) $resp['data']['resultType'], 'resultType blackjack');
    TestRunner::assertEqualsFloat(25.0, (float) $resp['data']['totalReturn'], 'natural returns 3:2');
    TestRunner::assertEqualsFloat(1015.0, bjdBalance($db), 'balance credited with the 3:2 return');

    // Push returns exactly the stake.
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound($db, ['betZone1' => bjdHand('betZone1', [bjdCard('10', 's1'), bjdCard('8', 's2')], 10.0)], [bjdCard('10', 's3'), bjdCard('8', 's4')], ['requestId' => 'r_push']);
    $resp = bjdPlace($c, ['action' => 'stand', 'zone' => 'betZone1', 'actionRequestId' => 'push_stand_1'], 'r_push');
    TestRunner::assertEquals('push', (string) $resp['data']['resultType'], 'push classified');
    TestRunner::assertEqualsFloat(10.0, (float) $resp['data']['totalReturn'], 'push returns the stake — not lost, not doubled');
    TestRunner::assertEqualsFloat(1000.0, bjdBalance($db), 'stake restored');

    // Standard win pays 1:1.
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound($db, ['betZone1' => bjdHand('betZone1', [bjdCard('10', 's1'), bjdCard('9', 's2')], 10.0)], [bjdCard('10', 's3'), bjdCard('8', 's4')], ['requestId' => 'r_win']);
    $resp = bjdPlace($c, ['action' => 'stand', 'zone' => 'betZone1', 'actionRequestId' => 'win_stand_1'], 'r_win');
    TestRunner::assertEqualsFloat(20.0, (float) $resp['data']['totalReturn'], 'win returns 2x (1:1 profit)');
    TestRunner::assertEqualsFloat(1010.0, bjdBalance($db), 'balance credited at 1:1');

    // Dealer natural, no-peek: a doubled stake is lost IN FULL.
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound(
        $db,
        ['betZone1' => bjdHand('betZone1', [bjdCard('6', 's1'), bjdCard('5', 's2')], 10.0)],
        [bjdCard('A', 's3'), bjdCard('K', 's4')],
        ['requestId' => 'r_nopeek', 'phase' => 'insurance']
    );
    $decl = bjdPlace($c, ['action' => 'decline_insurance', 'zone' => 'betZone1', 'actionRequestId' => 'np_decl_1'], 'r_nopeek');
    TestRunner::assertEquals(200, (int) $decl['status'], 'insurance declined');
    $dbl = bjdPlace($c, ['action' => 'double', 'zone' => 'betZone1', 'actionRequestId' => 'np_dbl_1'], 'r_nopeek');
    TestRunner::assertEquals('settled', (string) $dbl['data']['roundStatus'], 'double completes into the dealer natural');
    TestRunner::assertEqualsFloat(20.0, (float) $dbl['data']['totalWager'], 'doubled wager on the books');
    TestRunner::assertEqualsFloat(0.0, (float) $dbl['data']['totalReturn'], 'no-peek: full doubled stake lost to the dealer natural');
    $credits = bjdCredits($db);
    TestRunner::assertEquals(1, count($credits), 'the $0 credit still marks the settled loss');
    TestRunner::assertEqualsFloat(0.0, (float) $credits[0]['amount'], 'credit amount is zero');
    TestRunner::assertEqualsFloat(980.0, bjdBalance($db), 'balance reflects deal + double debits, nothing back');
});

TestRunner::run('BJ rewire: hold reconciliation — settlement wager must equal the held total', function (): void {
    // Clean multi-debit round reconciles: deal 10 + double 10 → settle basis 20.
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound($db, ['betZone1' => bjdHand('betZone1', [bjdCard('6', 's1'), bjdCard('5', 's2')], 10.0)], [bjdCard('10', 's3'), bjdCard('9', 's4')], ['requestId' => 'r_clean']);
    $resp = bjdPlace($c, ['action' => 'double', 'zone' => 'betZone1', 'actionRequestId' => 'cl_dbl_1'], 'r_clean');
    TestRunner::assertEquals(200, (int) $resp['status'], 'clean round settles');
    TestRunner::assertEqualsFloat(20.0, (float) $resp['data']['totalWager'], 'settlement basis = deal + double delta, no drift');

    // Poisoned round (held total desynced from state) must NOT settle.
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound(
        $db,
        ['betZone1' => bjdHand('betZone1', [bjdCard('10', 's1'), bjdCard('9', 's2')], 10.0)],
        [bjdCard('10', 's3'), bjdCard('8', 's4')],
        ['requestId' => 'r_poison', 'totalWagerOverride' => 999.0]
    );
    $resp = bjdPlace($c, ['action' => 'stand', 'zone' => 'betZone1', 'actionRequestId' => 'po_stand_1'], 'r_poison');
    TestRunner::assertEquals(500, (int) $resp['status'], 'reconcile mismatch aborts loudly (500, not a quiet settle)');
    TestRunner::assertEquals(0, count(bjdCredits($db)), 'NO credit was written');
    TestRunner::assertEquals('playing', (string) bjdRow($db, 'r_poison')['roundStatus'], 'round status unchanged — nothing half-settled');
    TestRunner::assertEqualsFloat(990.0, bjdBalance($db), 'balance untouched');
});

TestRunner::run('BJ rewire: a round resolves exactly once', function (): void {
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound($db, ['betZone1' => bjdHand('betZone1', [bjdCard('10', 's1'), bjdCard('9', 's2')], 10.0)], [bjdCard('10', 's3'), bjdCard('8', 's4')], ['requestId' => 'r_once']);

    $stand = bjdPlace($c, ['action' => 'stand', 'zone' => 'betZone1', 'actionRequestId' => 'once_stand_1'], 'r_once');
    TestRunner::assertEquals('settled', (string) $stand['data']['roundStatus'], 'round settles');
    TestRunner::assertEquals(1, count(bjdCredits($db)), 'one credit');
    $balanceSettled = bjdBalance($db);

    // 1) Replay of the settling action → idempotent, still one credit.
    $replay = bjdPlace($c, ['action' => 'stand', 'zone' => 'betZone1', 'actionRequestId' => 'once_stand_1'], 'r_once');
    TestRunner::assertTrue((bool) $replay['data']['idempotent'], 'settling-action replay is idempotent');
    TestRunner::assertEquals(1, count(bjdCredits($db)), 'still exactly one credit after replay');

    // 2) A NEW action on the settled round → 400, no credit.
    $late = bjdPlace($c, ['action' => 'hit', 'zone' => 'betZone1', 'actionRequestId' => 'once_late_1'], 'r_once');
    TestRunner::assertEquals(400, (int) $late['status'], 'new action on settled round rejected');

    // 3) A sweep over the settled round → no-op.
    $sweep = bjdCall($c, 'sweepExpiredBlackjackRounds', 'u1', 200);
    TestRunner::assertEquals(0, (int) $sweep['swept'], 'sweep skips settled rounds');
    TestRunner::assertEquals(1, count(bjdCredits($db)), 'credit count unchanged by all three paths');
    TestRunner::assertEqualsFloat($balanceSettled, bjdBalance($db), 'balance unchanged by all three paths');
});

TestRunner::run('BJ rewire: abandonment sweep force-resolves through the same settle path', function (): void {
    $expired = gmdate(DATE_ATOM, time() - 90000); // ~25h ago

    // Expired winning-position round: swept, credited, sweep-flagged stands.
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound($db, ['betZone1' => bjdHand('betZone1', [bjdCard('10', 's1'), bjdCard('9', 's2')], 10.0)], [bjdCard('10', 's3'), bjdCard('8', 's4')], ['requestId' => 'r_swp', 'createdAt' => $expired]);
    $result = bjdCall($c, 'sweepExpiredBlackjackRounds', null, 200);
    TestRunner::assertEquals(1, (int) $result['swept'], 'one round swept');
    TestRunner::assertEquals(0, (int) $result['errors'], 'no sweep errors');
    $row = bjdRow($db, 'r_swp');
    TestRunner::assertEquals('settled', (string) $row['roundStatus'], 'swept round is settled');
    TestRunner::assertEquals(1, count(bjdCredits($db)), 'settle credit written by the sweep');
    TestRunner::assertEqualsFloat(1010.0, bjdBalance($db), 'abandoned WINNING hand still pays the player');
    $sweepFlagged = 0;
    foreach ($row['bjState']['actionLog'] as $entry) {
        if (!empty($entry['sweep'])) {
            $sweepFlagged++;
        }
    }
    TestRunner::assertTrue($sweepFlagged >= 1, 'forced actions are sweep-flagged in the log');

    // Second sweep: nothing left to do.
    $again = bjdCall($c, 'sweepExpiredBlackjackRounds', null, 200);
    TestRunner::assertEquals(0, (int) $again['swept'], 'sweep is idempotent');
    TestRunner::assertEquals(1, count(bjdCredits($db)), 'still one credit');

    // Fresh (non-expired) rounds are untouched.
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound($db, ['betZone1' => bjdHand('betZone1', [bjdCard('10', 's1'), bjdCard('9', 's2')], 10.0)], [bjdCard('10', 's3'), bjdCard('8', 's4')], ['requestId' => 'r_fresh']);
    $none = bjdCall($c, 'sweepExpiredBlackjackRounds', null, 200);
    TestRunner::assertEquals(0, (int) $none['swept'], 'fresh round not swept');
    TestRunner::assertEquals('playing', (string) bjdRow($db, 'r_fresh')['roundStatus'], 'fresh round still playing');

    // Expired round stuck in the INSURANCE phase resolves too (declined,
    // then rides into the dealer natural — main lost, $0 credit).
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound(
        $db,
        ['betZone1' => bjdHand('betZone1', [bjdCard('10', 's1'), bjdCard('8', 's2')], 10.0)],
        [bjdCard('A', 's3'), bjdCard('K', 's4')],
        ['requestId' => 'r_swp_ins', 'phase' => 'insurance', 'createdAt' => $expired]
    );
    $insSweep = bjdCall($c, 'sweepExpiredBlackjackRounds', null, 200);
    TestRunner::assertEquals(1, (int) $insSweep['swept'], 'insurance-phase round swept');
    $row = bjdRow($db, 'r_swp_ins');
    TestRunner::assertEquals('settled', (string) $row['roundStatus'], 'settled');
    $credits = bjdCredits($db);
    TestRunner::assertEqualsFloat(0.0, (float) $credits[0]['amount'], 'declined insurance, dealer natural: $0 credit marks the loss');
    TestRunner::assertEqualsFloat(990.0, bjdBalance($db), 'no refund — abandonment never dodges a loss');

    // Inline hook: a DEAL while an expired round lingers settles it first,
    // then opens a fresh round with its own stake.
    [$c, $db] = bjdHarness(990.0);
    bjdSeedRound($db, ['betZone1' => bjdHand('betZone1', [bjdCard('10', 's1'), bjdCard('9', 's2')], 10.0)], [bjdCard('10', 's3'), bjdCard('8', 's4')], ['requestId' => 'r_old', 'createdAt' => $expired]);
    $deal = bjdPlace($c, ['action' => 'deal', 'zones' => ['betZone1' => ['main' => 25]]], 'r_new_deal_001');
    TestRunner::assertEquals(200, (int) $deal['status'], 'deal succeeds despite the fossil round');
    TestRunner::assertFalse((bool) $deal['data']['resumed'], 'NOT a resume — the fossil was settled first');
    TestRunner::assertEquals('settled', (string) bjdRow($db, 'r_old')['roundStatus'], 'old round settled by the inline sweep');
    $newRow = bjdRow($db, 'r_new_deal_001');
    TestRunner::assertNotNull($newRow, 'new round row exists');
    $newDebits = 0;
    foreach ($db->collections['transactions'] as $tx) {
        if (($tx['entrySide'] ?? '') === 'DEBIT' && (string) ($tx['entryGroupId'] ?? '') === (string) $newRow['roundId']) {
            $newDebits++;
        }
    }
    TestRunner::assertEquals(1, $newDebits, 'new round carries its own single deal debit');
});
