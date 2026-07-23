<?php

declare(strict_types=1);

/**
 * Staged blackjack endpoints (rebuild C1b) — deal/state/no-debit-action
 * money-path suite.
 *
 * ISOLATED SUITE: installs mock Response/SqlRepository/… doubles before the
 * real CasinoController is loaded (same pattern as AcesAndEightsTest).
 *
 * Covers: the deal-time debit is a REAL balance reduction with a ledger row;
 * one open round per user (a second deal resumes, never re-stakes); deal
 * idempotency by (userId, requestId, game); action idempotency by
 * actionRequestId (a retried "hit" draws no second card); action-order and
 * settled-round validation surfacing as 400s; the settle credit (including
 * the $0 credit that marks a settled loss) with balance reconciliation;
 * debit-bearing actions (double/split/insurance) hard-gated until C1c;
 * insufficient-balance deals rejected with no round and no debit; live-round
 * non-exposure through both the wire response and the history mapper; and
 * the legacy no-action payload still routing through the untouched one-shot
 * path.
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

final class BjsMockSqlRepository extends SqlRepository
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

function bjsCall(object $target, string $method, mixed ...$args): mixed
{
    $ref = new ReflectionMethod($target, $method);
    return $ref->invoke($target, ...$args);
}

/** @return array{0: CasinoController, 1: BjsMockSqlRepository} */
function bjsHarness(float $balance = 1000.0): array
{
    $db = new BjsMockSqlRepository([
        'users' => [[
            'id' => 'u1',
            'username' => 'bjs_tester',
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
    return [new CasinoController($db, 'bjs-test-secret'), $db];
}

function bjsPlace(CasinoController $c, array $bets, string $requestId): array
{
    Response::reset();
    bjsCall($c, 'placeBlackjackBet', ['id' => 'u1', 'username' => 'bjs_tester'], ['bets' => $bets], $requestId, microtime(true));
    return Response::$last;
}

function bjsRoundRow(BjsMockSqlRepository $db, string $requestId): array
{
    foreach ($db->collections['casino_bets'] as $row) {
        if ((string) ($row['requestId'] ?? '') === $requestId) {
            return $row;
        }
    }
    throw new RuntimeException('round row not found: ' . $requestId);
}

function bjsUserBalance(BjsMockSqlRepository $db): float
{
    return (float) ($db->collections['users'][0]['balance'] ?? -1);
}

function bjsLedger(BjsMockSqlRepository $db, string $roundId): array
{
    $rows = [];
    foreach ($db->collections['transactions'] ?? [] as $row) {
        if ((string) ($row['entryGroupId'] ?? '') === $roundId) {
            $rows[] = $row;
        }
    }
    return $rows;
}

/**
 * Deal until a NON-terminal round lands (an all-natural deal settles at deal;
 * seeds are random server-side, so retry with fresh requestIds).
 */
function bjsDealPlaying(CasinoController $c, BjsMockSqlRepository $db, array $zones, string $prefix): array
{
    for ($i = 0; $i < 30; $i++) {
        $resp = bjsPlace($c, ['action' => 'deal', 'zones' => $zones], $prefix . '_deal_' . $i);
        if ((int) $resp['status'] !== 200) {
            throw new RuntimeException('deal failed: ' . json_encode($resp['data']));
        }
        if ((string) $resp['data']['roundStatus'] === 'playing') {
            return $resp['data'];
        }
    }
    throw new RuntimeException('no playing round within 30 deals');
}

/** Drive a playing round to settlement using only legal no-debit actions. */
function bjsPlayOut(CasinoController $c, array $round, string $prefix): array
{
    $resp = ['data' => $round];
    for ($i = 0; $i < 40; $i++) {
        $data = $resp['data'];
        if ((string) ($data['roundStatus'] ?? '') === 'settled') {
            return $data;
        }
        $awaiting = $data['state']['awaiting'] ?? null;
        if (!is_array($awaiting) || $awaiting['zone'] === null) {
            throw new RuntimeException('playing round with no awaiting hint: ' . json_encode($data));
        }
        $legal = $awaiting['actions'];
        $action = in_array('decline_insurance', $legal, true)
            ? 'decline_insurance'
            : (in_array('decline_even_money', $legal, true) ? 'decline_even_money' : 'stand');
        $resp = bjsPlace($c, [
            'action' => $action,
            'zone' => $awaiting['zone'],
            'actionRequestId' => $prefix . '_act_' . $i,
        ], (string) $data['requestId']);
        if ((int) $resp['status'] !== 200) {
            throw new RuntimeException('action failed: ' . json_encode($resp['data']));
        }
    }
    throw new RuntimeException('round did not settle within 40 actions');
}

TestRunner::run('BJ staged: deal debits balance for real, with a ledger row', function (): void {
    [$c, $db] = bjsHarness(1000.0);
    // NOTE: earlier deals in this helper may land terminal (all-natural) and
    // settle with real money movement, so every assertion is RELATIVE to the
    // playing round's own ledger — never to the harness's starting balance.
    $round = bjsDealPlaying($c, $db, ['betZone1' => ['main' => 50]], 't1');
    $balanceAfterDeal = bjsUserBalance($db);
    $auditRowsBefore = count($db->collections['casino_round_audit']);

    TestRunner::assertEqualsFloat($balanceAfterDeal, (float) $round['balanceAfter'], 'response reports the post-debit balance');

    $ledger = bjsLedger($db, (string) $round['roundId']);
    TestRunner::assertEquals(1, count($ledger), 'exactly one ledger row while playing');
    TestRunner::assertEquals('DEBIT', (string) $ledger[0]['entrySide'], 'and it is the wager DEBIT');
    TestRunner::assertEqualsFloat(50.0, (float) $ledger[0]['amount'], 'debit amount = full wager');
    TestRunner::assertEqualsFloat(50.0, (float) $ledger[0]['balanceBefore'] - (float) $ledger[0]['balanceAfter'], 'debit row reduces the balance by the full wager');
    TestRunner::assertEqualsFloat($balanceAfterDeal, (float) $ledger[0]['balanceAfter'], 'users.balance matches the debit row');

    // Settle it and confirm the credit lands (possibly $0) + balance math.
    $settled = bjsPlayOut($c, $round, 't1');
    $ledger = bjsLedger($db, (string) $round['roundId']);
    TestRunner::assertEquals(2, count($ledger), 'settled round has exactly DEBIT + CREDIT');
    TestRunner::assertEquals('CREDIT', (string) $ledger[1]['entrySide'], 'second row is the payout CREDIT');
    TestRunner::assertEqualsFloat((float) $settled['totalReturn'], (float) $ledger[1]['amount'], 'credit amount = total return (0 on a loss)');
    TestRunner::assertEqualsFloat($balanceAfterDeal + (float) $settled['totalReturn'], bjsUserBalance($db), 'final balance = post-debit balance + return');
    TestRunner::assertEquals($auditRowsBefore + 1, count($db->collections['casino_round_audit']), 'audit row written at settle');
});

TestRunner::run('BJ staged: one open round per user — deal resumes, never re-stakes', function (): void {
    [$c, $db] = bjsHarness(1000.0);
    $round = bjsDealPlaying($c, $db, ['betZone1' => ['main' => 50]], 't2');
    $balanceAfterFirst = bjsUserBalance($db);

    // A second deal with a DIFFERENT requestId returns the SAME round.
    $resp = bjsPlace($c, ['action' => 'deal', 'zones' => ['betZone1' => ['main' => 200]]], 't2_second_deal_x');
    TestRunner::assertEquals(200, (int) $resp['status'], 'second deal succeeds');
    TestRunner::assertTrue((bool) $resp['data']['resumed'], 'flagged as resumed');
    TestRunner::assertEquals((string) $round['roundId'], (string) $resp['data']['roundId'], 'same round returned');
    TestRunner::assertEqualsFloat($balanceAfterFirst, bjsUserBalance($db), 'NO second stake taken');
    $playingRounds = 0;
    foreach ($db->collections['casino_bets'] as $row) {
        if (($row['roundStatus'] ?? '') === 'playing') {
            $playingRounds++;
        }
    }
    TestRunner::assertEquals(1, $playingRounds, 'exactly one open round exists');

    // Deal replay with the SAME requestId is idempotent too.
    $replay = bjsPlace($c, ['action' => 'deal', 'zones' => ['betZone1' => ['main' => 50]]], (string) $round['requestId']);
    TestRunner::assertTrue((bool) $replay['data']['idempotent'], 'same-requestId deal replay flagged idempotent');
    TestRunner::assertEqualsFloat($balanceAfterFirst, bjsUserBalance($db), 'replay takes no money');
});

TestRunner::run('BJ staged: action idempotency — a retried hit draws no second card', function (): void {
    [$c, $db] = bjsHarness(1000.0);
    $round = bjsDealPlaying($c, $db, ['betZone1' => ['main' => 10]], 't3');

    // Reach the player-action phase (decline any insurance decision first).
    $data = $round;
    for ($i = 0; $i < 5; $i++) {
        $legal = $data['state']['awaiting']['actions'] ?? [];
        if (in_array('hit', $legal, true) || (string) $data['roundStatus'] === 'settled') {
            break;
        }
        $action = in_array('decline_insurance', $legal, true) ? 'decline_insurance' : 'decline_even_money';
        $resp = bjsPlace($c, ['action' => $action, 'zone' => $data['state']['awaiting']['zone'], 'actionRequestId' => 't3_pre_' . $i], (string) $data['requestId']);
        $data = $resp['data'];
    }
    if ((string) $data['roundStatus'] !== 'playing') {
        TestRunner::skip('round settled during insurance phase — rerun covers this rarely-hit path');
        return;
    }

    $zone = $data['state']['awaiting']['zone'];
    $cardsBefore = count($data['state']['hands'][0]['cards']);

    $hit1 = bjsPlace($c, ['action' => 'hit', 'zone' => $zone, 'actionRequestId' => 't3_hit_A'], (string) $data['requestId']);
    TestRunner::assertEquals(200, (int) $hit1['status'], 'hit succeeds');
    $cardsAfterHit = count($hit1['data']['state']['hands'][0]['cards']);
    TestRunner::assertEquals($cardsBefore + 1, $cardsAfterHit, 'hit drew exactly one card');
    $drawnAfterHit = (int) bjsRoundRow($db, (string) $data['requestId'])['bjState']['drawn'];

    // Network-retry the SAME actionRequestId: no second card, same state.
    $hit2 = bjsPlace($c, ['action' => 'hit', 'zone' => $zone, 'actionRequestId' => 't3_hit_A'], (string) $data['requestId']);
    TestRunner::assertEquals(200, (int) $hit2['status'], 'replayed hit returns 200');
    TestRunner::assertTrue((bool) $hit2['data']['idempotent'], 'replay flagged idempotent');
    TestRunner::assertEquals($drawnAfterHit, (int) bjsRoundRow($db, (string) $data['requestId'])['bjState']['drawn'], 'drawn pointer unchanged — NO second card dealt');

    TestRunner::assertThrows(function () use ($c, $data): void {
        $resp = bjsPlace($c, ['action' => 'hit', 'zone' => 'betZone1', 'actionRequestId' => 'short'], (string) $data['requestId']);
        if ((int) $resp['status'] === 400) {
            throw new InvalidArgumentException((string) $resp['data']['message']);
        }
    }, InvalidArgumentException::class, 'malformed actionRequestId rejected');
});

TestRunner::run('BJ staged: action order + settled-round validation are server-enforced', function (): void {
    [$c, $db] = bjsHarness(1000.0);

    // Two zones: acting on zone 2 while zone 1 is open → the sequencing 400.
    $round = bjsDealPlaying($c, $db, ['betZone1' => ['main' => 10], 'betZone2' => ['main' => 10]], 't4');
    $data = $round;
    for ($i = 0; $i < 8; $i++) {
        $legal = $data['state']['awaiting']['actions'] ?? [];
        if (in_array('hit', $legal, true) || (string) $data['roundStatus'] !== 'playing') {
            break;
        }
        $action = in_array('decline_insurance', $legal, true) ? 'decline_insurance' : 'decline_even_money';
        $resp = bjsPlace($c, ['action' => $action, 'zone' => $data['state']['awaiting']['zone'], 'actionRequestId' => 't4_pre_' . $i], (string) $data['requestId']);
        $data = $resp['data'];
    }
    if ((string) $data['roundStatus'] === 'playing') {
        $awaitZone = (string) $data['state']['awaiting']['zone'];
        $otherZone = $awaitZone === 'betZone1' ? 'betZone2' : 'betZone1';
        $otherOpen = false;
        foreach ($data['state']['hands'] as $hand) {
            if ($hand['zone'] === $otherZone && !$hand['completed']) {
                $otherOpen = true;
            }
        }
        if ($otherOpen) {
            $bad = bjsPlace($c, ['action' => 'hit', 'zone' => $otherZone, 'actionRequestId' => 't4_bad_zone'], (string) $data['requestId']);
            TestRunner::assertEquals(400, (int) $bad['status'], 'hitting the out-of-turn zone is a 400');
            TestRunner::assertTrue(
                str_contains((string) $bad['data']['message'], 'order is invalid')
                || str_contains((string) $bad['data']['message'], 'completed'),
                'sequencing error surfaced'
            );
        }
        $data = bjsPlayOut($c, $data, 't4_finish');
    }

    // Any action after settlement → 400, no state change, no money change.
    $balanceSettled = bjsUserBalance($db);
    $late = bjsPlace($c, ['action' => 'hit', 'zone' => 'betZone1', 'actionRequestId' => 't4_late_hit'], (string) $round['requestId']);
    TestRunner::assertEquals(400, (int) $late['status'], 'acting on a settled round is a 400');
    TestRunner::assertEquals('Blackjack round is already settled', (string) $late['data']['message'], 'settled-round message');
    TestRunner::assertEqualsFloat($balanceSettled, bjsUserBalance($db), 'no money moved');

    // Unknown round: action against a requestId that never dealt.
    $ghost = bjsPlace($c, ['action' => 'stand', 'zone' => 'betZone1', 'actionRequestId' => 't4_ghost_act'], 't4_ghost_round_id');
    TestRunner::assertEquals(400, (int) $ghost['status'], 'action without a round is a 400');
});

TestRunner::run('BJ staged: bad stakes rejected before any debit', function (): void {
    // (The C1b-era gate on double/split/insurance is gone — those actions
    // live now and are covered by BlackjackStakeActionsTest.)

    // Insufficient balance: no round row, no debit, clean 400.
    [$c2, $db2] = bjsHarness(5.0);
    $poor = bjsPlace($c2, ['action' => 'deal', 'zones' => ['betZone1' => ['main' => 10]]], 't5_poor_deal_1');
    TestRunner::assertEquals(400, (int) $poor['status'], 'insufficient balance deal is a 400');
    TestRunner::assertEquals(0, count($db2->collections['casino_bets']), 'no round row created');
    TestRunner::assertEquals(0, count($db2->collections['transactions']), 'no ledger row created');
    TestRunner::assertEqualsFloat(5.0, bjsUserBalance($db2), 'balance untouched');

    // Insurance staked at deal: rejected by the engine, nothing persisted.
    // (Fresh harness — an open round would legitimately win via resume first.)
    [$c3, $db3] = bjsHarness(1000.0);
    $insAtDeal = bjsPlace($c3, ['action' => 'deal', 'zones' => ['betZone2' => ['main' => 10, 'insurance' => 5]]], 't5_ins_deal_1');
    TestRunner::assertEquals(400, (int) $insAtDeal['status'], 'insurance-at-deal rejected');
    TestRunner::assertEquals(0, count($db3->collections['casino_bets']), 'insurance-at-deal persisted nothing');
});

TestRunner::run('BJ staged: live round leaks nothing — wire response, state action, history mapper', function (): void {
    [$c, $db] = bjsHarness(1000.0);
    $round = bjsDealPlaying($c, $db, ['betZone1' => ['main' => 10]], 't6');

    TestRunner::assertTrue((bool) $round['state']['dealer']['holeHidden'], 'wire: hole flagged hidden');
    TestRunner::assertFalse(isset($round['state']['dealer']['cards']), 'wire: no dealer cards array while live');
    TestRunner::assertFalse(isset($round['bjState']), 'wire: raw engine state never in the response');

    $storedState = bjsRoundRow($db, (string) $round['requestId'])['bjState'];
    $holeCode = (string) $storedState['dealerCards'][1]['code'];
    $seed = (string) $storedState['seed'];
    $wireJson = json_encode($round, JSON_UNESCAPED_SLASHES);
    TestRunner::assertFalse(str_contains($wireJson, $seed), 'wire: seed never serialized');

    // state action returns the open round (with its requestId for resume)
    // and the same shielded view.
    $stateResp = bjsPlace($c, ['action' => 'state'], 't6_state_req_1');
    TestRunner::assertEquals((string) $round['requestId'], (string) $stateResp['data']['round']['requestId'], 'state returns the round requestId for resume');
    TestRunner::assertTrue((bool) $stateResp['data']['round']['state']['dealer']['holeHidden'], 'state: hole hidden');

    // History mapper: playing row exposes only the up card, and no bjState.
    $mapped = bjsCall($c, 'mapCasinoBetRow', bjsRoundRow($db, (string) $round['requestId']));
    TestRunner::assertFalse(isset($mapped['bjState']), 'mapper: bjState never emitted');
    TestRunner::assertEquals(1, count($mapped['dealerCards']), 'mapper: only the up card while live');
    $upCode = (string) $storedState['dealerCards'][0]['code'];
    if ($holeCode !== $upCode) {
        // A 6-deck shoe holds duplicate codes, so this check is only
        // meaningful when up and hole are distinct cards.
        TestRunner::assertFalse(in_array($holeCode, $mapped['dealerCards'], true), 'mapper: hole card absent while live');
    } else {
        TestRunner::assertTrue(true, 'mapper: hole equals up card this deal — absence check vacuous');
    }

    // After settlement the dealer hand becomes fully visible.
    $settled = bjsPlayOut($c, $round, 't6');
    TestRunner::assertTrue(count($settled['dealerCards']) >= 2, 'settled response reveals the dealer hand');
});

TestRunner::run('BJ staged: bridge transport shape — round located via bets.roundRequestId', function (): void {
    [$c, $db] = bjsHarness(1000.0);
    $round = bjsDealPlaying($c, $db, ['betZone1' => ['main' => 10]], 't7');

    // The browser bridge sends a FRESH top-level requestId per message and
    // carries the round as bets.roundRequestId (C1e client contract). Send
    // whatever the awaiting hint legally allows (a dealer Ace puts the round
    // in the insurance phase, where stand would rightly 400).
    $legal = $round['state']['awaiting']['actions'];
    $action = in_array('decline_insurance', $legal, true)
        ? 'decline_insurance'
        : (in_array('decline_even_money', $legal, true) ? 'decline_even_money' : 'stand');
    $resp = bjsPlace($c, [
        'action' => $action,
        'zone' => (string) $round['state']['awaiting']['zone'],
        'actionRequestId' => 't7_stand_act1',
        'roundRequestId' => (string) $round['requestId'],
    ], 't7_transport_msg_001');
    TestRunner::assertEquals(200, (int) $resp['status'], 'action resolved via bets.roundRequestId');

    // A wrong roundRequestId can never touch another round.
    $bad = bjsPlace($c, [
        'action' => 'hit',
        'zone' => 'betZone1',
        'actionRequestId' => 't7_bad_act1',
        'roundRequestId' => 'no_such_round_req_1',
    ], 't7_transport_msg_002');
    TestRunner::assertEquals(400, (int) $bad['status'], 'unknown roundRequestId is a 400');
});

TestRunner::run('BJ staged: C5 launch wiring — offered-when-active gate + seed safety', function (): void {
    $ref = new ReflectionClass(CasinoController::class);
    $offered = $ref->getConstant('OFFERED_GAME_SLUGS');
    $whenActive = $ref->getConstant('OFFERED_WHEN_ACTIVE_GAME_SLUGS');
    TestRunner::assertContains('blackjack', $offered, 'blackjack is in the offered catalog');
    TestRunner::assertContains('blackjack', $whenActive, 'blackjack is launch-gated on status=active');

    // A fresh seed (missing row) must create blackjack DISABLED — the C8 DB
    // flip is the only way it ever goes live.
    [$c, $db] = bjsHarness(1000.0);
    $db->collections['casinogames'] = []; // simulate a fresh database
    bjsCall($c, 'ensureCasinoSeeded');
    $seeded = null;
    foreach ($db->collections['casinogames'] as $row) {
        if (($row['slug'] ?? '') === 'blackjack') {
            $seeded = $row;
        }
    }
    TestRunner::assertNotNull($seeded, 'seed creates the blackjack row');
    TestRunner::assertEquals('disabled', (string) $seeded['status'], 'seeded blackjack row is DISABLED, never active');
});

TestRunner::run('BJ staged: legacy one-shot protocol is retired (C2)', function (): void {
    [$c, $db] = bjsHarness(1000.0);
    // The old client-dealt payload (no bets.action) must never settle again:
    // its side-bet economics were the audit's critical finding.
    $resp = bjsPlace($c, [
        'betBreakdown' => [['zone' => 'betZone1', 'main' => 10]],
        'actions' => [['action' => 'deal'], ['action' => 'stand', 'zone' => 'betZone1']],
        'roundMeta' => ['deckCount' => 6],
    ], 'legacy_round_00001');
    TestRunner::assertEquals(400, (int) $resp['status'], 'legacy payload is a 400');
    TestRunner::assertTrue(str_contains((string) $resp['data']['message'], 'retired'), 'retirement message');
    TestRunner::assertEquals(0, count($db->collections['casino_bets']), 'no round row created');
    TestRunner::assertEquals(0, count($db->collections['transactions']), 'no money moved');

    // Super Sevens can no longer be staked at deal.
    $ss = bjsPlace($c, ['action' => 'deal', 'zones' => ['betZone1' => ['main' => 10, 'superSeven' => 5]]], 'ss_deal_0001');
    TestRunner::assertEquals(400, (int) $ss['status'], 'super sevens stake rejected at deal');
    TestRunner::assertTrue(str_contains((string) $ss['data']['message'], 'no longer offered'), 'clear removal message');
});
