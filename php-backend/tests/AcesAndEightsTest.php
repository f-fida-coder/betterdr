<?php

declare(strict_types=1);

/**
 * Aces & Eights (VP_Classic_D video poker) — hand evaluator + two-stage
 * deal/draw money-path suite.
 *
 * ISOLATED SUITE: installs mock Response/SqlRepository/Http/… doubles before
 * the real CasinoController is loaded, exactly like BogeymanSlotTest.
 *
 * Covers: the full hand-rank matrix incl. the A8/Sevens/base quad split,
 * ace-low straight (+ steel wheel), royal vs straight flush; cent-precise
 * deal debit ($0.25 with a hostile account minBet), the dealt->settled
 * lifecycle with replacements drawn from the STORED deck order, deck
 * NON-EXPOSURE while 'dealt' (bet response, history row, detail row),
 * idempotent deal replay, one-open-round resume (no second stake), draw
 * replay vs second-draw rejection, owner matching, the 24h hold-all janitor
 * (before/after the boundary), forced hold-all on a late draw, paytable
 * payouts across coin levels, and limit gates (coin ladder, game max,
 * account max, insufficient balance).
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

function a8Call(object $target, string $method, mixed ...$args): mixed
{
    $ref = new ReflectionMethod($target, $method);
    return $ref->invoke($target, ...$args);
}

final class A8MockSqlRepository extends SqlRepository
{
    /** @var array<string, array<int, array<string, mixed>>> */
    public array $collections;
    private int $nextId = 1;

    /**
     * @param array<string, array<int, array<string, mixed>>> $seed
     */
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

    /**
     * @param array<string, mixed> $query
     * @param array<string, mixed> $options
     * @return array<int, array<string, mixed>>
     */
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

    /**
     * @param array<string, mixed> $doc
     * @param array<string, mixed> $query
     */
    private function matches(array $doc, array $query): bool
    {
        foreach ($query as $field => $expected) {
            $actual = $doc[$field] ?? null;
            if (is_array($expected)) {
                // The janitor's createdAt cutoff rides $lt — implement the
                // comparison operators for real so the 24h boundary is tested.
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
 * Card-code helper: suit blocks ♦(0) ♥(1) ♠(2) ♣(3), rank 1=A .. 13=K.
 */
function a8Card(int $rank, int $suit): int
{
    return $suit * 13 + $rank;
}

/**
 * @param array<string, mixed> $userOverrides
 * @param array<string, mixed> $gameOverrides
 * @return array{0: CasinoController, 1: A8MockSqlRepository, 2: array<string, mixed>}
 */
function a8BuildHarness(array $userOverrides = [], array $gameOverrides = []): array
{
    $userId = 'a8_test_user';
    $db = new A8MockSqlRepository([
        'casinogames' => [array_replace([
            'id' => 'a8_game',
            'slug' => 'aces-and-eights',
            'name' => 'Aces & Eights',
            'status' => 'active',
            'minBet' => 0.25,
            'maxBet' => 25,
        ], $gameOverrides)],
        'users' => [array_replace([
            'id' => $userId,
            'username' => 'mock_a8_player',
            'role' => 'user',
            'status' => 'active',
            'balance' => 100.00,
            'pendingBalance' => 0,
            // Deliberately hostile account minBet: the casino exemption must
            // let a $0.25 hand through anyway.
            'minBet' => 25,
            'maxBet' => 100000,
        ], $userOverrides)],
        'transactions' => [],
        'casino_bets' => [],
        'casino_round_audit' => [],
        // Phase 3: every deal reads+rotates the commit-reveal chain (loud-fail
        // 409 without it). Seed a chain exactly as fairness/state would create.
        'casino_seed_chains' => [[
            'id' => hash('sha256', 'seedchain|a8_test_user|aces-and-eights'),
            'userId' => 'a8_test_user',
            'game' => 'aces-and-eights',
            'serverSeed' => str_repeat('ab', 32),
            'serverSeedHash' => hash('sha256', str_repeat('ab', 32)),
            'clientSeed' => '',
            'nonce' => 0,
        ]],
    ]);

    $controller = new CasinoController($db, 'a8-test-secret');
    $actor = [
        'id' => $userId,
        'username' => 'mock_a8_player',
        'role' => 'user',
        'status' => 'active',
    ];

    return [$controller, $db, $actor];
}

/**
 * @return array<string, mixed>
 */
function a8User(A8MockSqlRepository $db): array
{
    $user = $db->findOne('users', ['id' => 'a8_test_user']);
    if ($user === null) {
        throw new RuntimeException('test user missing');
    }
    return $user;
}

/**
 * @return array{status: int, data: array<string, mixed>}
 */
function a8Bet(CasinoController $controller, array $actor, array $bets, string $requestId, array $payload = []): array
{
    Response::reset();
    $body = ['bets' => $bets];
    if ($payload !== []) {
        $body['payload'] = $payload;
    }
    a8Call($controller, 'placeAcesAndEightsBet', $actor, $body, $requestId, microtime(true));
    return Response::$last;
}

/**
 * Seed an open ('dealt') round exactly as a real deal would store it, with a
 * CRAFTED deck so draw outcomes are deterministic. Also books the matching
 * debit and applies it to the user balance, keeping the ledger reconcilable.
 *
 * @param array<int, int> $deck full 52-card order (first 5 = dealt)
 * @return string the roundId
 */
function a8SeedOpenRound(CasinoController $controller, A8MockSqlRepository $db, array $deck, int $coinsBet, float $coinValue, string $requestId, ?string $createdAt = null, ?array $payoutApplied = null): string
{
    if (count($deck) !== 52 || count(array_unique($deck)) !== 52) {
        throw new RuntimeException('crafted deck must be a 52-card permutation');
    }
    $userId = 'a8_test_user';
    $roundId = a8Call($controller, 'deterministicRoundId', 'aces-and-eights', $userId, $requestId);
    $dealt = array_slice($deck, 0, 5);
    $wager = round($coinValue * $coinsBet, 2);
    $now = $createdAt ?? SqlRepository::nowUtc();

    $user = a8User($db);
    $balanceBefore = round((float) $user['balance'], 2);
    $balanceAfterDebit = round($balanceBefore - $wager, 2);
    $db->updateOne('users', ['id' => $userId], ['balance' => $balanceAfterDebit]);

    $db->insertOne('transactions', [
        'userId' => $userId,
        'amount' => $wager,
        'type' => 'casino_bet_debit',
        'entrySide' => 'DEBIT',
        'entryGroupId' => $roundId,
        'sourceType' => 'casino_aces_and_eights',
        'sourceId' => $roundId,
        'status' => 'completed',
        'balanceBefore' => $balanceBefore,
        'balanceAfter' => $balanceAfterDebit,
        'reason' => 'CASINO_ACES_AND_EIGHTS_WAGER',
        'createdAt' => $now,
        'updatedAt' => $now,
    ]);

    $db->insertOne('casino_bets', [
        'id' => $roundId,
        'roundId' => $roundId,
        'requestId' => $requestId,
        'userId' => $userId,
        'username' => 'mock_a8_player',
        'game' => 'aces-and-eights',
        'bets' => ['action' => 'deal', 'coinValue' => $coinValue, 'coinsBet' => $coinsBet, 'totalBet' => $wager],
        'result' => 'Pending',
        'resultType' => '',
        'totalWager' => $wager,
        'totalReturn' => 0.0,
        'profit' => 0.0,
        'netResult' => round(-$wager, 2),
        'balanceBefore' => $balanceBefore,
        'balanceAfter' => $balanceAfterDebit,
        'pendingBalanceSnapshot' => 0.0,
        'vpDeck' => $deck,
        'vpPtr' => 5,
        'deckHash' => hash('sha256', implode(',', $deck) . '|' . $roundId),
        // DEAL-time stamped table (Phase 2). Null → the shipped default table
        // (the settle path falls back to defaults for pre-Phase-2 rows).
        'payoutApplied' => $payoutApplied,
        // Phase 3: private deal-time seed (revealed only at settle) + the
        // commitment fields. A crafted deck won't derive from this dummy seed
        // (these rounds test payout/lifecycle, not fairness recompute), but
        // settle must still reveal a non-empty serverSeed.
        'vpServerSeed' => str_repeat('cd', 32),
        'serverSeedHash' => hash('sha256', str_repeat('cd', 32)),
        'serverSeedHashNext' => hash('sha256', str_repeat('ef', 32)),
        'clientSeed' => 'seeded-client',
        'nonce' => 7,
        'shoeSize' => 52,
        'ledgerEntries' => ['debit' => 'seeded'],
        'rngVersion' => 'vp-a8-csprng-deck-v1',
        'outcomeSource' => 'server_rng',
        'roundData' => [
            'stage' => 'dealt',
            'dealt' => $dealt,
            'dealtHandCode' => '-',
            'dealtHandName' => 'No Hand',
            'coinsBet' => $coinsBet,
            'coinValue' => $coinValue,
            'totalBet' => $wager,
        ],
        'roundStatus' => 'dealt',
        'createdAt' => $now,
        'updatedAt' => $now,
    ]);

    $db->insertOne('casino_round_audit', [
        'id' => $roundId,
        'roundId' => $roundId,
        'userId' => $userId,
        'game' => 'aces-and-eights',
        'stage' => 'dealt',
        'createdAt' => $now,
        'updatedAt' => $now,
    ]);

    return $roundId;
}

/**
 * A junk deck (no pay anywhere in the first 12 cards) with an overridable
 * head — positions 0-4 are the deal, 5+ the replacement order.
 *
 * @param array<int, int> $head
 * @return array<int, int>
 */
function a8Deck(array $head): array
{
    $deck = $head;
    for ($n = 1; $n <= 52; $n++) {
        if (!in_array($n, $deck, true)) {
            $deck[] = $n;
        }
    }
    if (count($deck) !== 52) {
        throw new RuntimeException('bad crafted deck head');
    }
    return $deck;
}

/* ══════════════════ hand evaluator matrix ══════════════════ */

TestRunner::run('A&8 evaluator: full rank matrix incl. the quad split', function (): void {
    [$controller] = a8BuildHarness();
    $eval = fn (array $cards): string => a8Call($controller, 'acesAndEightsHandCode', $cards);

    // Natural royal (each suit) vs straight flush vs steel wheel.
    foreach ([0, 1, 2, 3] as $suit) {
        TestRunner::assertEquals('NR', $eval([a8Card(1, $suit), a8Card(13, $suit), a8Card(12, $suit), a8Card(11, $suit), a8Card(10, $suit)]), 'A-K-Q-J-10 suited is the natural royal (suit ' . $suit . ')');
    }
    TestRunner::assertEquals('SF', $eval([a8Card(5, 0), a8Card(6, 0), a8Card(7, 0), a8Card(8, 0), a8Card(9, 0)]), '9-high straight flush');
    TestRunner::assertEquals('SF', $eval([a8Card(1, 2), a8Card(2, 2), a8Card(3, 2), a8Card(4, 2), a8Card(5, 2)]), 'steel wheel A-2-3-4-5 suited is SF, NOT royal');

    // The variant-defining quad split.
    TestRunner::assertEquals('A8', $eval([a8Card(1, 0), a8Card(1, 1), a8Card(1, 2), a8Card(1, 3), a8Card(5, 0)]), 'four aces pay the A8 tier');
    TestRunner::assertEquals('A8', $eval([a8Card(8, 0), a8Card(8, 1), a8Card(8, 2), a8Card(8, 3), a8Card(13, 0)]), 'four eights pay the A8 tier');
    TestRunner::assertEquals('_47', $eval([a8Card(7, 0), a8Card(7, 1), a8Card(7, 2), a8Card(7, 3), a8Card(2, 0)]), 'four sevens pay their own tier');
    TestRunner::assertEquals('_4K', $eval([a8Card(13, 0), a8Card(13, 1), a8Card(13, 2), a8Card(13, 3), a8Card(3, 0)]), 'four kings pay the base quad tier');
    TestRunner::assertEquals('_4K', $eval([a8Card(9, 0), a8Card(9, 1), a8Card(9, 2), a8Card(9, 3), a8Card(7, 0)]), 'four nines pay the base quad tier');
    TestRunner::assertEquals('_4K', $eval([a8Card(6, 0), a8Card(6, 1), a8Card(6, 2), a8Card(6, 3), a8Card(7, 0)]), 'four sixes pay the base quad tier (6 is NOT 7/8/A)');

    // Fills, runs, pairs.
    TestRunner::assertEquals('FH', $eval([a8Card(9, 0), a8Card(9, 1), a8Card(9, 2), a8Card(5, 0), a8Card(5, 1)]), 'full house');
    TestRunner::assertEquals('FL', $eval([a8Card(2, 0), a8Card(5, 0), a8Card(7, 0), a8Card(9, 0), a8Card(12, 0)]), 'flush (no straight)');
    TestRunner::assertEquals('ST', $eval([a8Card(5, 0), a8Card(6, 1), a8Card(7, 2), a8Card(8, 3), a8Card(9, 0)]), 'mixed-suit straight');
    TestRunner::assertEquals('ST', $eval([a8Card(1, 0), a8Card(2, 1), a8Card(3, 2), a8Card(4, 3), a8Card(5, 0)]), 'ace-low straight A-2-3-4-5');
    TestRunner::assertEquals('ST', $eval([a8Card(10, 0), a8Card(11, 1), a8Card(12, 2), a8Card(13, 3), a8Card(1, 0)]), 'ace-high straight 10-J-Q-K-A (mixed suits)');
    TestRunner::assertEquals('_3K', $eval([a8Card(4, 0), a8Card(4, 1), a8Card(4, 2), a8Card(9, 3), a8Card(13, 0)]), 'three of a kind');
    TestRunner::assertEquals('_2P', $eval([a8Card(3, 0), a8Card(3, 1), a8Card(9, 2), a8Card(9, 3), a8Card(13, 0)]), 'two pair');

    // Jacks-or-better boundary: J/Q/K/A pay, tens don't.
    TestRunner::assertEquals('JB', $eval([a8Card(11, 0), a8Card(11, 1), a8Card(2, 2), a8Card(5, 3), a8Card(9, 0)]), 'pair of jacks pays');
    TestRunner::assertEquals('JB', $eval([a8Card(12, 0), a8Card(12, 1), a8Card(2, 2), a8Card(5, 3), a8Card(9, 0)]), 'pair of queens pays');
    TestRunner::assertEquals('JB', $eval([a8Card(13, 0), a8Card(13, 1), a8Card(2, 2), a8Card(5, 3), a8Card(9, 0)]), 'pair of kings pays');
    TestRunner::assertEquals('JB', $eval([a8Card(1, 0), a8Card(1, 1), a8Card(2, 2), a8Card(5, 3), a8Card(9, 0)]), 'pair of aces pays');
    TestRunner::assertEquals('-', $eval([a8Card(10, 0), a8Card(10, 1), a8Card(2, 2), a8Card(5, 3), a8Card(9, 0)]), 'pair of tens does NOT pay');
    TestRunner::assertEquals('-', $eval([a8Card(1, 0), a8Card(2, 1), a8Card(3, 2), a8Card(4, 3), a8Card(6, 0)]), 'A-2-3-4-6 is no straight, no hand');
    TestRunner::assertEquals('-', $eval([a8Card(2, 0), a8Card(5, 1), a8Card(7, 2), a8Card(9, 3), a8Card(13, 0)]), 'king high is no hand');
});

/* ══════════════════ deal: debit + open round + non-exposure ══════════════════ */

TestRunner::run('A&8 deal: cent-precise debit opens a dealt round; deck never leaves the server', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();

    $res = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 0.25, 'coinsBet' => 1], 'a8_deal_cents_1');
    TestRunner::assertEquals(200, $res['status'], '25c deal places despite account minBet=25 (casino exemption)');
    TestRunner::assertEqualsFloat(0.25, (float) $res['data']['totalWager'], 'wager is exactly one quarter');
    TestRunner::assertEquals('dealt', (string) $res['data']['roundStatus'], 'round stays open after the deal');
    TestRunner::assertEqualsFloat(-0.25, (float) $res['data']['netResult'], 'open round nets the debited stake');
    TestRunner::assertEquals(5, count($res['data']['roundData']['dealt'] ?? []), 'exactly 5 dealt cards in the response');

    // NON-EXPOSURE: the response must not contain the committed deck order.
    $json = json_encode($res['data']);
    TestRunner::assertTrue(strpos($json, 'vpDeck') === false, 'bet response carries no vpDeck key');
    TestRunner::assertTrue(strpos($json, 'vpPtr') === false, 'bet response carries no vpPtr key');
    TestRunner::assertTrue(!isset($res['data']['roundData']['final']), 'no draw cards exist yet');

    // …while the STORED row has the complete 52-card order, and every read
    // mapper strips it.
    $round = $db->findOne('casino_bets', ['roundId' => (string) $res['data']['roundId']]);
    TestRunner::assertEquals(52, count($round['vpDeck'] ?? []), 'row stores the full committed order');
    TestRunner::assertEquals(5, (int) ($round['vpPtr'] ?? 0), 'draw pointer starts at 5');
    $historyRow = a8Call($controller, 'mapCasinoBetRow', $round);
    TestRunner::assertTrue(strpos(json_encode($historyRow), 'vpDeck') === false, 'history row mapper strips the deck');
    $detailRow = a8Call($controller, 'mapCasinoBetDetail', $round, [], $db->findOne('casino_round_audit', ['roundId' => (string) $res['data']['roundId']]));
    TestRunner::assertTrue(strpos(json_encode($detailRow), 'vpDeck') === false, 'detail mapper strips the deck');
    TestRunner::assertTrue(strpos(json_encode($detailRow), '"deckOrder"') === false, 'audit detail has no deck order while dealt');
    TestRunner::assertEquals('Pending', (string) $historyRow['playerOutcome'], 'open round reads as Pending');

    // Money: balance down by exactly the stake; one debit ledger row.
    TestRunner::assertEqualsFloat(99.75, round((float) a8User($db)['balance'], 2), 'balance = 100 - 0.25');
    $debits = $db->findMany('transactions', ['entrySide' => 'DEBIT']);
    TestRunner::assertEquals(1, count($debits), 'exactly one debit row');
    TestRunner::assertEqualsFloat(0.25, (float) $debits[0]['amount'], 'debit amount keeps the cents');
    TestRunner::assertEquals('casino_aces_and_eights', (string) $debits[0]['sourceType'], 'ledger sourceType');
    TestRunner::assertEquals(0, count($db->findMany('transactions', ['entrySide' => 'CREDIT'])), 'no credit until the draw');
});

TestRunner::run('A&8 deal: idempotent replay and one-open-round resume never stake twice', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();

    $first = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 1.00, 'coinsBet' => 5], 'a8_deal_once');
    TestRunner::assertEquals(200, $first['status'], 'first deal places');
    $balanceAfterFirst = round((float) a8User($db)['balance'], 2);
    TestRunner::assertEqualsFloat(95.00, $balanceAfterFirst, '$5 staked');

    // Same requestId => replay of the same round.
    $replay = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 1.00, 'coinsBet' => 5], 'a8_deal_once');
    TestRunner::assertEquals(200, $replay['status'], 'replay succeeds');
    TestRunner::assertTrue((bool) $replay['data']['idempotent'], 'replay flagged idempotent');
    TestRunner::assertEquals((string) $first['data']['roundId'], (string) $replay['data']['roundId'], 'same round returned');
    TestRunner::assertEqualsFloat($balanceAfterFirst, round((float) a8User($db)['balance'], 2), 'balance unchanged by replay');

    // DIFFERENT requestId while a round is open => resume, not a second stake.
    $resume = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 5.00, 'coinsBet' => 5], 'a8_deal_second');
    TestRunner::assertEquals(200, $resume['status'], 'deal-while-open succeeds as a resume');
    TestRunner::assertEquals((string) $first['data']['roundId'], (string) $resume['data']['roundId'], 'the OPEN round is returned');
    TestRunner::assertTrue((bool) ($resume['data']['roundData']['resumed'] ?? false), 'resume is marked');
    TestRunner::assertEqualsFloat($balanceAfterFirst, round((float) a8User($db)['balance'], 2), 'no second debit');
    TestRunner::assertEquals(1, count($db->findMany('transactions', ['entrySide' => 'DEBIT'])), 'still exactly one debit row');
    TestRunner::assertEquals(1, count($db->findMany('casino_bets', [])), 'still exactly one round row');
});

/* ══════════════════ draw: replacements, payout, settle-once ══════════════════ */

TestRunner::run('A&8 draw: replacements come from the stored order; win credits exact cents', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();

    // Dealt: J♦ J♥ 3♠ 7♣ 9♦ (pair of jacks). Replacements queued next:
    // 4♥, 8♠. Holding the jacks + 9 and drawing 2 keeps JB.
    $deck = a8Deck([
        a8Card(11, 0), a8Card(11, 1), a8Card(3, 2), a8Card(7, 3), a8Card(9, 0),
        a8Card(4, 1), a8Card(8, 2),
    ]);
    $roundId = a8SeedOpenRound($controller, $db, $deck, 3, 0.25, 'a8_draw_seed');
    $balanceAfterDeal = round((float) a8User($db)['balance'], 2);
    TestRunner::assertEqualsFloat(99.25, $balanceAfterDeal, 'seeded stake of $0.75 applied');

    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, false, false, true]], 'a8_draw_go');
    TestRunner::assertEquals(200, $res['status'], 'draw settles');
    TestRunner::assertEquals('settled', (string) $res['data']['roundStatus'], 'round is settled');
    $final = $res['data']['roundData']['final'] ?? [];
    TestRunner::assertEquals([a8Card(11, 0), a8Card(11, 1), a8Card(4, 1), a8Card(8, 2), a8Card(9, 0)], $final, 'non-held positions replaced left-to-right from deck[5], deck[6]');
    TestRunner::assertEquals('JB', (string) $res['data']['roundData']['finalHandCode'], 'jacks-or-better classified');

    // JB pays 3 coins at 3-coin bet: 3 x $0.25 = $0.75 — exact cents, a push.
    TestRunner::assertEqualsFloat(0.75, (float) $res['data']['totalReturn'], 'JB at 3 coins x 25c returns $0.75');
    TestRunner::assertEqualsFloat(0.0, (float) $res['data']['netResult'], 'return == wager: push');
    TestRunner::assertEqualsFloat(100.00, round((float) a8User($db)['balance'], 2), 'balance restored to $100.00 exactly');

    $credits = $db->findMany('transactions', ['entrySide' => 'CREDIT']);
    TestRunner::assertEquals(1, count($credits), 'one credit row');
    TestRunner::assertEqualsFloat(0.75, (float) $credits[0]['amount'], 'credit keeps the cents');
    TestRunner::assertEquals('casino_aces_and_eights', (string) $credits[0]['sourceType'], 'credit sourceType');
    $debits = $db->findMany('transactions', ['entrySide' => 'DEBIT']);
    TestRunner::assertEquals((string) $debits[0]['entryGroupId'], (string) $credits[0]['entryGroupId'], 'debit+credit share the roundId group');

    // Audit now carries the full order (nothing left to decide).
    $audit = $db->findOne('casino_round_audit', ['roundId' => $roundId]);
    TestRunner::assertEquals(52, count($audit['deckOrder'] ?? []), 'deck order lands in the audit at settle');
});

TestRunner::run('A&8 draw: top-line payouts across coin levels (royal jump, A8/47 tiers)', function (): void {
    // Royal at max coin: 2000 x $5 coin = $10,000.
    [$controller, $db, $actor] = a8BuildHarness(['balance' => 100.00]);
    $royal = a8Deck([a8Card(1, 2), a8Card(13, 2), a8Card(12, 2), a8Card(11, 2), a8Card(10, 2)]);
    $roundId = a8SeedOpenRound($controller, $db, $royal, 5, 5.00, 'a8_royal_max');
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, true, true, true]], 'a8_royal_draw');
    TestRunner::assertEquals('NR', (string) $res['data']['roundData']['finalHandCode'], 'royal classified');
    TestRunner::assertEqualsFloat(10000.00, (float) $res['data']['totalReturn'], 'royal at 5 coins pays 2000 x coin');

    // Royal at 4 coins: 500 x $5 = $2,500 (the 125/coin schedule, no jump).
    [$controller, $db, $actor] = a8BuildHarness();
    $roundId = a8SeedOpenRound($controller, $db, $royal, 4, 5.00, 'a8_royal_4');
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, true, true, true]], 'a8_royal_4_draw');
    TestRunner::assertEqualsFloat(2500.00, (float) $res['data']['totalReturn'], 'royal at 4 coins pays 125/coin');

    // Four aces at 4 coins: 320 x $0.50 = $160.
    [$controller, $db, $actor] = a8BuildHarness();
    $quadAces = a8Deck([a8Card(1, 0), a8Card(1, 1), a8Card(1, 2), a8Card(1, 3), a8Card(5, 0)]);
    $roundId = a8SeedOpenRound($controller, $db, $quadAces, 4, 0.50, 'a8_aces_4');
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, true, true, true]], 'a8_aces_4_draw');
    TestRunner::assertEqualsFloat(160.00, (float) $res['data']['totalReturn'], 'quad aces pay the 80/coin tier');

    // Four sevens at 2 coins: 100 x $1 = $100.
    [$controller, $db, $actor] = a8BuildHarness();
    $quadSevens = a8Deck([a8Card(7, 0), a8Card(7, 1), a8Card(7, 2), a8Card(7, 3), a8Card(2, 0)]);
    $roundId = a8SeedOpenRound($controller, $db, $quadSevens, 2, 1.00, 'a8_sevens_2');
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, true, true, true]], 'a8_sevens_2_draw');
    TestRunner::assertEqualsFloat(100.00, (float) $res['data']['totalReturn'], 'quad sevens pay the 50/coin tier');

    // A losing draw-all: junk stays junk, no credit row.
    [$controller, $db, $actor] = a8BuildHarness();
    $junk = a8Deck([
        a8Card(2, 0), a8Card(5, 1), a8Card(7, 2), a8Card(9, 3), a8Card(13, 0),
        a8Card(3, 1), a8Card(6, 2), a8Card(10, 3), a8Card(12, 0), a8Card(4, 2),
    ]);
    $roundId = a8SeedOpenRound($controller, $db, $junk, 1, 0.25, 'a8_lose');
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [false, false, false, false, false]], 'a8_lose_draw');
    TestRunner::assertEqualsFloat(0.0, (float) $res['data']['totalReturn'], 'no pay on no hand');
    TestRunner::assertEquals('Lose', (string) $res['data']['result'], 'loss labeled');
    TestRunner::assertEquals(0, count($db->findMany('transactions', ['entrySide' => 'CREDIT'])), 'losing hand books no credit');
    TestRunner::assertEqualsFloat(99.75, round((float) a8User($db)['balance'], 2), 'stake stays with the house');
});

TestRunner::run('A&8 draw: replay returns the settled result; a second draw is rejected; owner enforced', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();
    $deck = a8Deck([
        a8Card(11, 0), a8Card(11, 1), a8Card(3, 2), a8Card(7, 3), a8Card(9, 0),
        a8Card(4, 1), a8Card(8, 2),
    ]);
    $roundId = a8SeedOpenRound($controller, $db, $deck, 1, 1.00, 'a8_replay_seed');

    $first = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, false, false, false]], 'a8_draw_r1');
    TestRunner::assertEquals(200, $first['status'], 'draw settles');
    $balanceAfterDraw = round((float) a8User($db)['balance'], 2);

    // Replay: same requestId (even with tampered holds) returns the SAME result.
    $replay = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [false, false, false, false, false]], 'a8_draw_r1');
    TestRunner::assertEquals(200, $replay['status'], 'replayed draw succeeds');
    TestRunner::assertTrue((bool) $replay['data']['idempotent'], 'replay flagged idempotent');
    TestRunner::assertEquals($first['data']['roundData']['final'], $replay['data']['roundData']['final'], 'same final hand returned');
    TestRunner::assertEqualsFloat($balanceAfterDraw, round((float) a8User($db)['balance'], 2), 'no double credit');
    TestRunner::assertEquals(count($db->findMany('transactions', ['entrySide' => 'CREDIT'])) <= 1 ? 200 : 500, 200, 'at most one credit row');

    // A SECOND draw (new requestId, different holds) can never re-decide.
    $second = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [false, false, true, true, true]], 'a8_draw_r2');
    TestRunner::assertEquals(409, $second['status'], 'second draw with different holds rejected');
    TestRunner::assertEqualsFloat($balanceAfterDraw, round((float) a8User($db)['balance'], 2), 'balance untouched by the rejected draw');

    // Another user cannot touch the round.
    $roundId2 = a8SeedOpenRound($controller, $db, $deck, 1, 1.00, 'a8_owner_seed');
    $intruder = ['id' => 'someone_else', 'username' => 'intruder', 'role' => 'user', 'status' => 'active'];
    $db->insertOne('users', ['id' => 'someone_else', 'username' => 'intruder', 'role' => 'user', 'status' => 'active', 'balance' => 50, 'pendingBalance' => 0]);
    $stolen = a8Bet($controller, $intruder, ['action' => 'draw', 'roundId' => $roundId2, 'holds' => [true, true, true, true, true]], 'a8_draw_thief');
    TestRunner::assertEquals(404, $stolen['status'], 'owner mismatch reads as not-found');
});

/* ══════════════════ abandoned hands: 24h hold-all ══════════════════ */

TestRunner::run('A&8 janitor: >24h dealt rounds settle hold-all; fresh rounds are left alone', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();

    // 25h-old round holding a dealt flush — the janitor must pay it.
    $flush = a8Deck([a8Card(2, 0), a8Card(5, 0), a8Card(7, 0), a8Card(9, 0), a8Card(12, 0)]);
    $staleId = a8SeedOpenRound($controller, $db, $flush, 2, 0.25, 'a8_stale', gmdate(DATE_ATOM, time() - 25 * 3600));
    // 23h-old round — inside the window, must stay open.
    $freshId = a8SeedOpenRound($controller, $db, a8Deck([a8Card(2, 1), a8Card(5, 2), a8Card(7, 3), a8Card(9, 1), a8Card(13, 2)]), 1, 0.25, 'a8_fresh', gmdate(DATE_ATOM, time() - 23 * 3600));

    $result = $controller->sweepExpiredAcesAndEightsRounds('a8_test_user');
    TestRunner::assertEquals(1, (int) $result['swept'], 'exactly the stale round swept');
    TestRunner::assertEquals(0, (int) $result['errors'], 'no janitor errors');

    $stale = $db->findOne('casino_bets', ['roundId' => $staleId]);
    TestRunner::assertEquals('settled', (string) $stale['roundStatus'], 'stale round settled');
    TestRunner::assertTrue((bool) ($stale['roundData']['forcedSettle'] ?? false), 'marked as forced settle');
    TestRunner::assertEquals([true, true, true, true, true], $stale['roundData']['holds'], 'all five dealt cards held');
    TestRunner::assertEquals('FL', (string) $stale['roundData']['finalHandCode'], 'dealt flush kept');
    // FL at 2 coins: 10 x $0.25 = $2.50 credited.
    TestRunner::assertEqualsFloat(2.50, (float) $stale['totalReturn'], 'hold-all flush paid');
    $credits = $db->findMany('transactions', ['entrySide' => 'CREDIT']);
    TestRunner::assertEquals(1, count($credits), 'janitor booked the credit');
    TestRunner::assertEqualsFloat(2.50, (float) $credits[0]['amount'], 'credit amount matches');

    $fresh = $db->findOne('casino_bets', ['roundId' => $freshId]);
    TestRunner::assertEquals('dealt', (string) $fresh['roundStatus'], '23h round still open');

    // Second sweep: nothing left to do (idempotent).
    $again = $controller->sweepExpiredAcesAndEightsRounds('a8_test_user');
    TestRunner::assertEquals(0, (int) $again['swept'], 'sweep is idempotent');
});

TestRunner::run('A&8 late draw past the window forces the hold-all policy outcome', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();
    // Dealt two pair; the player asks to discard everything — past 24h the
    // policy (hold all five) wins, so the outcome matches what the janitor
    // would have settled.
    $twoPair = a8Deck([a8Card(3, 0), a8Card(3, 1), a8Card(9, 2), a8Card(9, 3), a8Card(13, 0)]);
    $roundId = a8SeedOpenRound($controller, $db, $twoPair, 1, 1.00, 'a8_late', gmdate(DATE_ATOM, time() - 26 * 3600));

    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [false, false, false, false, false]], 'a8_late_draw');
    TestRunner::assertEquals(200, $res['status'], 'late draw completes the round');
    TestRunner::assertTrue((bool) ($res['data']['roundData']['forcedSettle'] ?? false), 'forced settle marked');
    TestRunner::assertEquals([true, true, true, true, true], $res['data']['roundData']['holds'], 'submitted holds overridden by policy');
    TestRunner::assertEquals('2P', (string) $res['data']['roundData']['finalHandCode'], 'dealt two pair kept');
    TestRunner::assertEqualsFloat(2.00, (float) $res['data']['totalReturn'], '2P at 1 coin x $1 pays $2');
});

/* ══════════════════ limits + validation gates ══════════════════ */

TestRunner::run('A&8 limits: coin ladder, game max, account max, insufficient balance', function (): void {
    // Coin value must be on the ladder.
    [$controller, $db, $actor] = a8BuildHarness();
    $res = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 0.30, 'coinsBet' => 1], 'a8_bad_coin');
    TestRunner::assertEquals(400, $res['status'], 'off-ladder coin value rejected');
    $res = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 1.00, 'coinsBet' => 6], 'a8_bad_coins');
    TestRunner::assertEquals(400, $res['status'], 'coinsBet > 5 rejected');
    $res = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 1.00, 'coinsBet' => 0], 'a8_zero_coins');
    TestRunner::assertEquals(400, $res['status'], 'coinsBet 0 rejected');
    TestRunner::assertEquals(0, count($db->findMany('transactions', [])), 'no money moved on rejections');

    // Game max ($25 default): $5 x 5 = $25 places; a lowered game max rejects.
    [$controller, $db, $actor] = a8BuildHarness([], ['maxBet' => 20]);
    $res = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 5.00, 'coinsBet' => 5], 'a8_over_game_max');
    TestRunner::assertEquals(400, $res['status'], '$25 hand rejected when game max is $20');

    // Account max still binds as the exposure ceiling.
    [$controller, $db, $actor] = a8BuildHarness(['maxBet' => 10]);
    $res = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 5.00, 'coinsBet' => 5], 'a8_over_acct_max');
    TestRunner::assertEquals(400, $res['status'], '$25 hand rejected when account max is $10');

    // Insufficient balance.
    [$controller, $db, $actor] = a8BuildHarness(['balance' => 0.20]);
    $res = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 0.25, 'coinsBet' => 1], 'a8_broke');
    TestRunner::assertEquals(400, $res['status'], 'stake above available balance rejected');
    TestRunner::assertEqualsFloat(0.20, round((float) a8User($db)['balance'], 2), 'balance untouched');

    // Malformed holds on a draw.
    [$controller, $db, $actor] = a8BuildHarness();
    $roundId = a8SeedOpenRound($controller, $db, a8Deck([a8Card(2, 0), a8Card(5, 1), a8Card(7, 2), a8Card(9, 3), a8Card(13, 0)]), 1, 0.25, 'a8_holds_seed');
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true]], 'a8_bad_holds');
    TestRunner::assertEquals(400, $res['status'], 'holds array must have exactly 5 flags');
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => 'zz', 'holds' => [true, true, true, true, true]], 'a8_bad_round');
    TestRunner::assertEquals(400, $res['status'], 'malformed roundId rejected');
});

TestRunner::run('A&8 deal: full CSPRNG deal produces a valid 5-card hand and a 52-card commitment', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();
    $res = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 2.00, 'coinsBet' => 2], 'a8_real_deal');
    TestRunner::assertEquals(200, $res['status'], 'deal places');

    $round = $db->findOne('casino_bets', ['roundId' => (string) $res['data']['roundId']]);
    $deck = $round['vpDeck'];
    TestRunner::assertEquals(52, count(array_unique($deck)), 'deck is a 52-card permutation');
    TestRunner::assertEquals(range(1, 52), array_values(array_filter(range(1, 52), fn ($n) => in_array($n, $deck, true))), 'every card code 1..52 present');
    TestRunner::assertEquals(array_slice($deck, 0, 5), $round['roundData']['dealt'], 'dealt hand is the top of the committed order');
    TestRunner::assertEquals((string) $round['deckHash'], hash('sha256', implode(',', $deck) . '|' . (string) $round['roundId']), 'deckHash commits to the stored order');

    // Draw with no holds consumes deck[5..9] exactly.
    $expectedFinal = array_slice($deck, 5, 5);
    $draw = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => (string) $res['data']['roundId'], 'holds' => [false, false, false, false, false]], 'a8_real_draw');
    TestRunner::assertEquals(200, $draw['status'], 'draw settles');
    TestRunner::assertEquals($expectedFinal, $draw['data']['roundData']['final'], 'draw-all consumed the next five committed cards in order');
});

/* ══════════════════ PHASE 2: admin paytable config ══════════════════ */

// Full house deck (three 9s + pair of 5s) held pat, for pay-config assertions.
function a8FullHouseDeck(): array
{
    return a8Deck([a8Card(9, 0), a8Card(9, 1), a8Card(9, 2), a8Card(5, 0), a8Card(5, 1)]);
}

TestRunner::run('A&8 Phase-2: defaults reproduce the captured table EXACTLY (matrix builder)', function (): void {
    [$controller] = a8BuildHarness();
    // Resolver with no stored config → the shipped defaults.
    $cfg = a8Call($controller, 'resolveAcesAndEightsPayoutConfig', null);
    TestRunner::assertEquals(1, (int) $cfg['payJB'], 'default payJB');
    TestRunner::assertEquals(7, (int) $cfg['payFH'], 'default payFH');
    TestRunner::assertEquals(2000, (int) $cfg['payNRMax'], 'default royal-max');

    $matrix = a8Call($controller, 'acesAndEightsPaytableMatrix', $cfg);
    // Reflect the Phase-1 captured constant and compare cell-for-cell.
    $ref = new ReflectionClass(CasinoController::class);
    $captured = $ref->getConstant('ACES_AND_EIGHTS_PAYTABLE');
    foreach ($captured as $rank => $row) {
        TestRunner::assertEquals($row, $matrix[$rank], "matrix rank $rank equals the captured table");
    }
    // Royal jump preserved: 125/coin for 1-4, 2000 at coin 5.
    TestRunner::assertEquals([125, 250, 375, 500, 2000], $matrix['NR'], 'royal jump preserved by the matrix builder');
});

TestRunner::run('A&8 Phase-2: config-driven payout — a lowered full house pays the configured value', function (): void {
    // Admin table: full house down to 6 (from 7). Store on the game row.
    [$controller, $db, $actor] = a8BuildHarness([], ['metadata' => ['payoutConfig' => ['payFH' => 6]]]);

    // A real deal now stamps the effective table; but craft the hand via seed
    // using the SAME stamped config the deal would resolve.
    $stamped = a8Call($controller, 'resolveAcesAndEightsPayoutConfig', ['metadata' => ['payoutConfig' => ['payFH' => 6]]]);
    TestRunner::assertEquals(6, (int) $stamped['payFH'], 'stamped FH is the configured 6');

    $roundId = a8SeedOpenRound($controller, $db, a8FullHouseDeck(), 2, 1.00, 'a8_fh_cfg', null, $stamped);
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, true, true, true]], 'a8_fh_cfg_draw');
    TestRunner::assertEquals('FH', (string) $res['data']['roundData']['finalHandCode'], 'full house classified');
    // FH base 6 at 2 coins × $1 = 6×2 = $12 (default would be 7×2 = $14).
    TestRunner::assertEqualsFloat(12.00, (float) $res['data']['totalReturn'], 'pays the CONFIGURED FH=6, not the default 7');
    TestRunner::assertEquals(6, (int) $res['data']['payoutApplied']['payFH'], 'settled row stamps the applied FH=6');
});

TestRunner::run('A&8 Phase-2: TABLE LOCKS AT DEAL — mid-hand admin edit does not change the hand', function (): void {
    // Deal under the DEFAULT table (FH=7). Round stamps FH=7.
    [$controller, $db, $actor] = a8BuildHarness();
    $dealtStamp = a8Call($controller, 'resolveAcesAndEightsPayoutConfig', null); // defaults, FH=7
    $roundId = a8SeedOpenRound($controller, $db, a8FullHouseDeck(), 1, 1.00, 'a8_lock', null, $dealtStamp);
    TestRunner::assertEquals(7, (int) $dealtStamp['payFH'], 'dealt under FH=7');

    // Admin now edits the LIVE game row to FH=6 (a different table).
    $db->updateOne('casinogames', ['slug' => 'aces-and-eights'], ['metadata' => ['payoutConfig' => ['payFH' => 6]]]);
    $live = a8Call($controller, 'resolveAcesAndEightsPayoutConfig', $db->findOne('casinogames', ['slug' => 'aces-and-eights']));
    TestRunner::assertEquals(6, (int) $live['payFH'], 'the LIVE table is now FH=6');

    // Draw settles under the DEAL-time table (FH=7), NOT the edited FH=6.
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, true, true, true]], 'a8_lock_draw');
    TestRunner::assertEquals('FH', (string) $res['data']['roundData']['finalHandCode'], 'full house');
    TestRunner::assertEqualsFloat(7.00, (float) $res['data']['totalReturn'], 'paid the DEAL-time FH=7 (1 coin × $1), not the edited FH=6');
    TestRunner::assertEquals(7, (int) $res['data']['payoutApplied']['payFH'], 'settled under the stamped deal-time table');
});

TestRunner::run('A&8 Phase-2: defensive re-clamp on read — a planted out-of-range stamp is clamped at settle', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();
    // Plant an ABSURD stamped FH (999) — a corrupted/tampered stored value.
    $roundId = a8SeedOpenRound($controller, $db, a8FullHouseDeck(), 1, 1.00, 'a8_clamp', null, ['payFH' => 999]);
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, true, true, true]], 'a8_clamp_draw');
    // FH clamps to its max (8), NOT 999: 8 × 1 coin × $1 = $8.
    TestRunner::assertEqualsFloat(8.00, (float) $res['data']['totalReturn'], 'planted FH=999 re-clamped to max 8 at settlement');
    TestRunner::assertEquals(8, (int) $res['data']['payoutApplied']['payFH'], 'stamped applied value is the clamped 8');
});

TestRunner::run('A&8 Phase-2: single source — displayed paytable == the table settlement pays from', function (): void {
    [$controller, $db, $actor] = a8BuildHarness([], ['metadata' => ['payoutConfig' => ['payFL' => 6, 'payFH' => 8]]]);
    // The state endpoint builds gameConfig.paytable EXACTLY like this: resolve
    // the game-row config, then acesAndEightsPublicMetadata($config). Exercise
    // that same builder path (no auth layer needed to prove single-source).
    $displayConfig = a8Call($controller, 'resolveAcesAndEightsPayoutConfig', $db->findOne('casinogames', ['slug' => 'aces-and-eights']));
    $meta = a8Call($controller, 'acesAndEightsPublicMetadata', $displayConfig);
    $paytable = $meta['paytable'];
    TestRunner::assertEquals([6, 12, 18, 24, 30], $paytable['FL'], 'displayed flush row reflects configured FL=6');
    TestRunner::assertEquals([8, 16, 24, 32, 40], $paytable['FH'], 'displayed full-house row reflects configured FH=8');

    // And a hand actually settles under that same table (stamped from the same
    // resolved config), so display and settlement are one source.
    $roundId = a8SeedOpenRound($controller, $db, a8FullHouseDeck(), 3, 0.25, 'a8_single', null, $displayConfig);
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, true, true, true]], 'a8_single_draw');
    // FH=8 at 3 coins × $0.25 = 24 coins × 0.25 = $6.00; matches paytable['FH'][2]=24.
    TestRunner::assertEqualsFloat(6.00, (float) $res['data']['totalReturn'], 'settlement pays the SAME table the display built');
    TestRunner::assertEquals($paytable['FH'][2], 24, 'the displayed FH@3coins cell (24) is exactly what paid');
});

TestRunner::run('A&8 Phase-2: write gate — range reject, unknown key, role guard, admin allowed', function (): void {
    [$controller, $db] = a8BuildHarness();
    $gameRow = $db->findOne('casinogames', ['slug' => 'aces-and-eights']);
    $admin = ['id' => 'a', 'role' => 'admin'];
    $agent = ['id' => 'b', 'role' => 'agent'];
    $master = ['id' => 'c', 'role' => 'master_agent'];

    // Out-of-range value → 400 with the allowed range (every key gated).
    $err = a8Call($controller, 'payoutConfigUpdateError', $admin, $gameRow, ['payoutConfig' => ['payFH' => 99]]);
    TestRunner::assertEquals(400, (int) $err['status'], 'FH=99 rejected out-of-range');
    TestRunner::assertTrue(strpos($err['message'], '6') !== false && strpos($err['message'], '8') !== false, 'range 6–8 named in the error');
    $err = a8Call($controller, 'payoutConfigUpdateError', $admin, $gameRow, ['payoutConfig' => ['payFL' => 3]]);
    TestRunner::assertEquals(400, (int) $err['status'], 'FL below min rejected');
    // Locked key cannot move off its single value.
    $err = a8Call($controller, 'payoutConfigUpdateError', $admin, $gameRow, ['payoutConfig' => ['payJB' => 2]]);
    TestRunner::assertEquals(400, (int) $err['status'], 'locked payJB cannot change');

    // Unknown key → 400.
    $err = a8Call($controller, 'payoutConfigUpdateError', $admin, $gameRow, ['payoutConfig' => ['payBogus' => 5]]);
    TestRunner::assertEquals(400, (int) $err['status'], 'unknown key rejected');

    // Role guard: a REAL change by a non-admin → 403.
    $err = a8Call($controller, 'payoutConfigUpdateError', $agent, $gameRow, ['payoutConfig' => ['payFH' => 8]]);
    TestRunner::assertEquals(403, (int) $err['status'], 'agent cannot change the paytable');
    $err = a8Call($controller, 'payoutConfigUpdateError', $master, $gameRow, ['payoutConfig' => ['payFH' => 8]]);
    TestRunner::assertEquals(403, (int) $err['status'], 'master_agent cannot change the paytable');

    // Admin making the same in-range change → allowed (null = proceed).
    $err = a8Call($controller, 'payoutConfigUpdateError', $admin, $gameRow, ['payoutConfig' => ['payFH' => 8]]);
    TestRunner::assertNull($err, 'admin in-range change proceeds');

    // Echoing the CURRENT effective config is a no-op for anyone (not an edit).
    $err = a8Call($controller, 'payoutConfigUpdateError', $agent, $gameRow, ['payoutConfig' => ['payFH' => 7]]);
    TestRunner::assertNull($err, 'agent re-echoing the default config is not an edit');
});

TestRunner::run('A&8 Phase-2: a settled non-default hand reconciles (net == ledger, balance delta exact)', function (): void {
    [$controller, $db, $actor] = a8BuildHarness([], ['metadata' => ['payoutConfig' => ['payFH' => 8]]]);
    $stamped = a8Call($controller, 'resolveAcesAndEightsPayoutConfig', $db->findOne('casinogames', ['slug' => 'aces-and-eights']));
    $roundId = a8SeedOpenRound($controller, $db, a8FullHouseDeck(), 2, 0.50, 'a8_recon', null, $stamped);
    $balBefore = round((float) a8User($db)['balance'], 2);
    $res = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, true, true, true]], 'a8_recon_draw');
    // FH=8 at 2 coins × $0.50 = 16 × 0.50 = $8.00 return on a $1.00 wager.
    TestRunner::assertEqualsFloat(8.00, (float) $res['data']['totalReturn'], 'configured FH paid');
    $row = $db->findOne('casino_bets', ['roundId' => $roundId]);
    $debit = array_sum(array_map(fn ($e) => (float) $e['amount'], $db->findMany('transactions', ['entryGroupId' => $roundId, 'entrySide' => 'DEBIT'])));
    $credit = array_sum(array_map(fn ($e) => (float) $e['amount'], $db->findMany('transactions', ['entryGroupId' => $roundId, 'entrySide' => 'CREDIT'])));
    TestRunner::assertEqualsFloat((float) $row['netResult'], round($credit - $debit, 2), 'round net == ledger net (reconcilable)');
    TestRunner::assertEqualsFloat(round($balBefore + 8.00, 2), round((float) a8User($db)['balance'], 2), 'balance delta == credit, exact cents');
});

/* ══════════════════ PHASE 3: provably-fair (commit-reveal seeded shuffle) ══════════════════ */

// Independent reference seeded shuffle — the published recipe reimplemented
// here so determinism is checked against a SECOND implementation, not the
// controller's own. HMAC-SHA256(key=serverSeed, "clientSeed:nonce:counter")
// keystream, big-endian uint32, rejection-sampled Fisher-Yates over [1..52].
function a8RefSeededDeck(string $serverSeed, string $clientSeed, int $nonce): array
{
    $message = $clientSeed . ':' . $nonce . ':';
    $buffer = '';
    $bufPos = 0;
    $counter = 0;
    $nextU32 = static function () use (&$buffer, &$bufPos, &$counter, $serverSeed, $message): int {
        if ($bufPos + 4 > strlen($buffer)) {
            $buffer = hash_hmac('sha256', $message . $counter, $serverSeed, true);
            $counter++;
            $bufPos = 0;
        }
        $u = unpack('N', substr($buffer, $bufPos, 4));
        $bufPos += 4;
        return $u[1];
    };
    $deck = range(1, 52);
    for ($i = 51; $i > 0; $i--) {
        $range = $i + 1;
        $limit = intdiv(0x100000000, $range) * $range;
        do { $v = $nextU32(); } while ($v >= $limit);
        $j = $v % $range;
        [$deck[$i], $deck[$j]] = [$deck[$j], $deck[$i]];
    }
    return $deck;
}

TestRunner::run('A&8 Phase-3: seeded deck matches an independent reference (determinism)', function (): void {
    [$controller] = a8BuildHarness();
    foreach ([['s' => str_repeat('11', 32), 'c' => 'alice', 'n' => 0], ['s' => str_repeat('a9', 32), 'c' => 'bob.seed', 'n' => 42]] as $t) {
        $engine = a8Call($controller, 'acesAndEightsSeededDeck', $t['s'], $t['c'], $t['n']);
        $ref = a8RefSeededDeck($t['s'], $t['c'], $t['n']);
        TestRunner::assertEquals($ref, $engine, 'seeded deck matches the reference for nonce ' . $t['n']);
        TestRunner::assertEquals(52, count(array_unique($engine)), 'seeded deck is a 52-card permutation');
        TestRunner::assertEquals(range(1, 52), array_values(array_filter(range(1, 52), fn ($x) => in_array($x, $engine, true))), 'all codes 1..52 present');
    }
});

TestRunner::run('A&8 Phase-3: recompute reproduces dealt+drawn+final for hold-none / hold-all / partial', function (): void {
    [$controller] = a8BuildHarness();
    $serverSeed = str_repeat('7c', 32);
    $clientSeed = 'verify-me';
    $nonce = 3;
    $deck = a8RefSeededDeck($serverSeed, $clientSeed, $nonce);

    foreach ([
        'hold-none' => [false, false, false, false, false],
        'hold-all' => [true, true, true, true, true],
        'partial' => [true, false, true, false, true],
    ] as $label => $holds) {
        $r = a8Call($controller, 'recomputeAcesAndEightsRound', $serverSeed, $clientSeed, $nonce, $holds);
        // Independent expected: deal[0..4], replace non-held from deck[5+].
        $expDealt = array_slice($deck, 0, 5);
        $expFinal = $expDealt;
        $ptr = 5;
        for ($i = 0; $i < 5; $i++) {
            if (!$holds[$i]) { $expFinal[$i] = $deck[$ptr]; $ptr++; }
        }
        TestRunner::assertEquals($expDealt, $r['dealt'], "$label: dealt reproduced");
        TestRunner::assertEquals($expFinal, $r['final'], "$label: final reproduced");
        TestRunner::assertEquals($ptr - 5, $r['replaced'], "$label: replacement count");
    }
});

TestRunner::run('A&8 Phase-3: a real seeded deal → draw is verifiable (commit + recompute)', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();
    $clientSeed = 'player-entropy-xyz';
    // Chain's current seed (str_repeat('ab',32)) is what THIS round uses.
    $chainSeed = str_repeat('ab', 32);
    $commitment = hash('sha256', $chainSeed);

    $deal = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 1.00, 'coinsBet' => 5], 'a8_p3_deal', ['clientSeed' => $clientSeed]);
    TestRunner::assertEquals(200, $deal['status'], 'seeded deal places');
    // DEFERRED REVEAL at deal: commitment yes, serverSeed NO.
    TestRunner::assertEquals($commitment, (string) $deal['data']['fairness']['serverSeedHash'], 'deal shows the commitment H_N');
    TestRunner::assertEquals('', (string) $deal['data']['fairness']['serverSeed'], 'deal does NOT reveal serverSeed');

    $roundId = (string) $deal['data']['roundId'];
    // Partial hold, then draw.
    $holds = [true, false, true, false, true];
    $draw = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => $holds], 'a8_p3_draw');
    TestRunner::assertEquals(200, $draw['status'], 'draw settles');
    // NOW the seed is revealed and hashes to the pre-deal commitment.
    $revealed = (string) $draw['data']['fairness']['serverSeed'];
    TestRunner::assertEquals($chainSeed, $revealed, 'draw reveals the deal-time serverSeed');
    TestRunner::assertEquals($commitment, hash('sha256', $revealed), 'SHA256(revealed) == the commitment shown at deal');

    // Independent recompute of the WHOLE hand from the revealed tuple + holds.
    $rc = a8Call($controller, 'recomputeAcesAndEightsRound', $revealed, $clientSeed, 0, $holds);
    TestRunner::assertEquals($rc['dealt'], $draw['data']['roundData']['dealt'], 'recomputed dealt == settled dealt');
    TestRunner::assertEquals($rc['final'], $draw['data']['roundData']['final'], 'recomputed final == settled final');
    TestRunner::assertEquals($rc['handCode'], (string) $draw['data']['roundData']['finalHandCode'], 'recomputed rank == settled rank');
});

TestRunner::run('A&8 Phase-3: EXPLOIT GATE — serverSeed hidden everywhere while dealt, revealed only at draw', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();
    $chainSeed = str_repeat('ab', 32);

    $deal = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 0.25, 'coinsBet' => 1], 'a8_gate_deal', ['clientSeed' => 'c']);
    $roundId = (string) $deal['data']['roundId'];

    // Gate 1 — deal RESPONSE: commitment present, serverSeed empty; the raw
    // seed string appears NOWHERE in the serialized response.
    $dealJson = json_encode($deal['data']);
    TestRunner::assertTrue(strpos($dealJson, $chainSeed) === false, 'raw serverSeed absent from the deal response');
    TestRunner::assertEquals('', (string) $deal['data']['fairness']['serverSeed'], 'deal fairness.serverSeed is empty');

    // The stored round holds the seed ONLY in the private vpServerSeed field.
    $round = $db->findOne('casino_bets', ['roundId' => $roundId]);
    TestRunner::assertEquals($chainSeed, (string) $round['vpServerSeed'], 'seed stored privately as vpServerSeed');
    TestRunner::assertTrue(!isset($round['serverSeed']) || (string) $round['serverSeed'] === '', 'no exposed serverSeed on the dealt row');

    // Gate 2 — every READ mapper strips the private seed while dealt.
    $historyRow = a8Call($controller, 'mapCasinoBetRow', $round);
    TestRunner::assertTrue(strpos(json_encode($historyRow), $chainSeed) === false, 'history row never carries the seed');
    $audit = $db->findOne('casino_round_audit', ['roundId' => $roundId]);
    $detail = a8Call($controller, 'mapCasinoBetDetail', $round, [], $audit);
    TestRunner::assertTrue(strpos(json_encode($detail), $chainSeed) === false, 'round detail never carries the seed while dealt');
    TestRunner::assertTrue(strpos(json_encode($audit), $chainSeed) === false, 'in-flight audit row has no seed while dealt');

    // Gate — fairness STATE while the last round is open: commitment only.
    Response::reset();
    a8Call($controller, 'getAcesAndEightsFairnessState', $actor);
    $state = Response::$last['data'];
    TestRunner::assertEquals('', (string) $state['lastRound']['serverSeed'], 'fairness-state withholds the seed for an OPEN round');
    TestRunner::assertTrue(strpos(json_encode($state['lastRound']), $chainSeed) === false, 'open-round fairness-state leaks no seed');

    // Draw → NOW revealed, and only now.
    $draw = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [true, true, true, true, true]], 'a8_gate_draw');
    TestRunner::assertEquals($chainSeed, (string) $draw['data']['fairness']['serverSeed'], 'seed revealed at draw');
    Response::reset();
    a8Call($controller, 'getAcesAndEightsFairnessState', $actor);
    $state2 = Response::$last['data'];
    TestRunner::assertEquals($chainSeed, (string) $state2['lastRound']['serverSeed'], 'fairness-state reveals the seed once settled');
});

TestRunner::run('A&8 Phase-3: chain rotates ONCE per round; replay never advances it', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();
    $chainId = hash('sha256', 'seedchain|a8_test_user|aces-and-eights');
    $seeds = [];
    $commitments = [];

    for ($k = 0; $k < 3; $k++) {
        $before = $db->findOne('casino_seed_chains', ['id' => $chainId]);
        $usedSeed = (string) $before['serverSeed'];
        $usedNonce = (int) $before['nonce'];
        $seeds[] = $usedSeed;

        $deal = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 0.25, 'coinsBet' => 1], "a8_chain_deal_$k", ['clientSeed' => 'c']);
        $roundId = (string) $deal['data']['roundId'];
        $commitments[] = (string) $deal['data']['fairness']['serverSeedHash'];

        // Rotation happened exactly once (nonce +1, new unrevealed seed).
        $mid = $db->findOne('casino_seed_chains', ['id' => $chainId]);
        TestRunner::assertEquals($usedNonce + 1, (int) $mid['nonce'], "round $k: nonce advanced once at deal");
        TestRunner::assertTrue((string) $mid['serverSeed'] !== $usedSeed, "round $k: chain holds a fresh unrevealed seed");
        $afterDealSeed = (string) $mid['serverSeed'];

        // Replayed deal → open round, NO further rotation.
        a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 0.25, 'coinsBet' => 1], "a8_chain_deal_$k", ['clientSeed' => 'c']);
        TestRunner::assertEquals($afterDealSeed, (string) $db->findOne('casino_seed_chains', ['id' => $chainId])['serverSeed'], "round $k: replayed deal does not rotate");

        // Draw settles; drawing must NOT rotate the chain either.
        $draw = a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [false, false, false, false, false]], "a8_chain_draw_$k");
        TestRunner::assertEquals($afterDealSeed, (string) $db->findOne('casino_seed_chains', ['id' => $chainId])['serverSeed'], "round $k: draw does not rotate");

        // The revealed seed hashes to the commitment shown at THIS deal.
        TestRunner::assertEquals($commitments[$k], hash('sha256', (string) $draw['data']['fairness']['serverSeed']), "round $k: reveal matches commitment");
        // Replayed draw → settled result, still no rotation.
        a8Bet($controller, $actor, ['action' => 'draw', 'roundId' => $roundId, 'holds' => [false, false, false, false, false]], "a8_chain_draw_$k");
        TestRunner::assertEquals($afterDealSeed, (string) $db->findOne('casino_seed_chains', ['id' => $chainId])['serverSeed'], "round $k: replayed draw does not rotate");
    }

    // Chain continuity: each round's commitment == hash of the seed it used,
    // and each used seed is the one the prior round rotated in.
    for ($k = 0; $k < 3; $k++) {
        TestRunner::assertEquals($commitments[$k], hash('sha256', $seeds[$k]), "round $k commitment == hash(used seed)");
    }
    // Exactly one unrevealed seed remains at rest.
    $chains = $db->findMany('casino_seed_chains', ['userId' => 'a8_test_user', 'game' => 'aces-and-eights']);
    TestRunner::assertEquals(1, count($chains), 'exactly one chain row per (user, game)');
});

TestRunner::run('A&8 Phase-3: loud-fail 409 when the seed chain is missing', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();
    // Wipe the chain — a deal must refuse rather than fall back to unseeded RNG.
    $db->collections['casino_seed_chains'] = [];
    $res = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 0.25, 'coinsBet' => 1], 'a8_nochain', ['clientSeed' => 'c']);
    TestRunner::assertEquals(409, $res['status'], 'deal loud-fails 409 without a chain');
    TestRunner::assertEquals(0, count($db->findMany('transactions', [])), 'no money moved on the 409');
});

TestRunner::run('A&8 Phase-3: abandoned janitor reveals the seed and verifies like a normal draw', function (): void {
    [$controller, $db, $actor] = a8BuildHarness();
    // Real seeded deal so the deck derives from the chain seed.
    $chainSeed = str_repeat('ab', 32);
    $deal = a8Bet($controller, $actor, ['action' => 'deal', 'coinValue' => 0.25, 'coinsBet' => 1], 'a8_jan_deal', ['clientSeed' => 'janitor-c']);
    $roundId = (string) $deal['data']['roundId'];
    // Age the round past the 24h window.
    $db->updateOne('casino_bets', ['roundId' => $roundId], ['createdAt' => gmdate(DATE_ATOM, time() - 25 * 3600)]);

    $result = $controller->sweepExpiredAcesAndEightsRounds('a8_test_user');
    TestRunner::assertEquals(1, (int) $result['swept'], 'janitor swept the abandoned hand');
    $row = $db->findOne('casino_bets', ['roundId' => $roundId]);
    TestRunner::assertEquals('settled', (string) $row['roundStatus'], 'force-settled');
    TestRunner::assertEquals($chainSeed, (string) $row['serverSeed'], 'janitor revealed the deal-time seed');
    TestRunner::assertEquals([true, true, true, true, true], $row['roundData']['holds'], 'held all five (policy)');

    // Verify the forced hand recomputes from the revealed tuple + hold-all.
    $rc = a8Call($controller, 'recomputeAcesAndEightsRound', (string) $row['serverSeed'], (string) $row['clientSeed'], (int) $row['nonce'], [true, true, true, true, true]);
    TestRunner::assertEquals($rc['final'], $row['roundData']['final'], 'forced hand verifies like a normal draw');
});

TestRunner::run('A&8 Phase-3: OTHER games unchanged — one-shot fairness block still reveals its seed', function (): void {
    [$controller] = a8BuildHarness();
    // A one-shot settled round (baccarat-shaped) always sets serverSeed → the
    // adjusted block must still emit it, byte-for-byte as before.
    $oneShot = [
        'roundId' => 'r1', 'game' => 'baccarat-classic', 'roundStatus' => 'settled',
        'serverSeed' => str_repeat('bb', 32), 'serverSeedHash' => hash('sha256', str_repeat('bb', 32)),
        'serverSeedHashNext' => hash('sha256', str_repeat('cc', 32)), 'clientSeed' => 'x', 'nonce' => 4,
        'shoeSize' => 8, 'deckHash' => 'dh', 'totalWager' => 10, 'totalReturn' => 20,
    ];
    $resp = a8Call($controller, 'formatCasinoBetResponse', $oneShot, [], false);
    TestRunner::assertNotNull($resp['fairness'], 'one-shot game still has a fairness block');
    TestRunner::assertEquals(str_repeat('bb', 32), (string) $resp['fairness']['serverSeed'], 'one-shot serverSeed still revealed (unchanged)');
    TestRunner::assertEquals(8, (int) $resp['fairness']['shoeSize'], 'one-shot shoeSize unchanged');

    // A round with neither seed nor commitment → no fairness block (unchanged).
    $noFair = ['roundId' => 'r2', 'game' => 'craps', 'roundStatus' => 'settled', 'totalWager' => 5, 'totalReturn' => 0];
    $resp2 = a8Call($controller, 'formatCasinoBetResponse', $noFair, [], false);
    TestRunner::assertNull($resp2['fairness'], 'a round with no fairness data still yields null (unchanged)');
});
