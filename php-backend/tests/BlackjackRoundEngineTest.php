<?php

declare(strict_types=1);

/**
 * Staged blackjack round engine (rebuild C1a) — pure-engine suite.
 *
 * ISOLATED SUITE: installs mock Response/SqlRepository/… doubles before the
 * real CasinoController is loaded (same pattern as AcesAndEightsTest).
 *
 * Covers: deterministic deal order off an injected seed, deal-time stake
 * validation (no insurance at deal, side-bet caps, side-requires-main),
 * natural auto-complete, the insurance phase machine (gating, half-main cap,
 * even-money vs insurance routing), every player action ported from the
 * legacy switch (hit/stand/double/split/surrender incl. ace-split auto-stand
 * and the stand-on-completed no-op), dealer S17 + all-bust/all-natural draw
 * skips, settlement math LOCKED to the legacy numbers (round(), current
 * side-bet paytables — the economics diff C3 will deliberately break these
 * assertions and update them), and public-state non-exposure (hole card +
 * seed never serialized while the round is live).
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

function bjeCall(object $target, string $method, mixed ...$args): mixed
{
    $ref = new ReflectionMethod($target, $method);
    return $ref->invoke($target, ...$args);
}

/** blackjackRoundApplyAction takes its state by reference — dedicated wrapper. */
function bjeApply(CasinoController $c, array &$state, string $action, ?string $zone = null, float $insuranceStake = 0.0): void
{
    $ref = new ReflectionMethod($c, 'blackjackRoundApplyAction');
    $args = [&$state, $action, $zone, $insuranceStake];
    $ref->invokeArgs($c, $args);
}

function bjeController(): CasinoController
{
    return new CasinoController(new SqlRepository(), 'bje-test-secret');
}

function bjeCard(string $rank, string $suit): array
{
    return ['rank' => $rank, 'suit' => $suit, 'code' => $rank . ':' . $suit];
}

/** Full deterministic deck order for a seed, via the engine itself. */
function bjeDeck(CasinoController $c, string $seed, int $deckCount = 6): array
{
    $state = ['seed' => $seed, 'deckCount' => $deckCount];
    return bjeCall($c, 'blackjackRoundDeck', $state);
}

/** Search deterministic seeds until the freshly-dealt layout satisfies $pick. */
function bjeFindSeed(CasinoController $c, callable $pick, string $prefix): string
{
    for ($i = 0; $i < 5000; $i++) {
        $seed = $prefix . '-' . $i;
        $deck = bjeDeck($c, $seed);
        if ($pick($deck)) {
            return $seed;
        }
    }
    throw new RuntimeException('No seed found for scenario ' . $prefix);
}

function bjeScore(CasinoController $c, array $cards): int
{
    return (int) bjeCall($c, 'blackjackHandScore', $cards);
}

/** Hand-build a mid-round state without going through create(). */
function bjeState(array $overrides = []): array
{
    $base = [
        'version' => 'bj_round_v1',
        'seed' => 'manual-seed',
        'deckCount' => 6,
        'drawn' => 0,
        'zones' => [
            'betZone1' => ['main' => 10.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
            'betZone2' => ['main' => 0.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
            'betZone3' => ['main' => 0.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
        ],
        'insuranceStakes' => ['betZone1' => 0.0, 'betZone2' => 0.0, 'betZone3' => 0.0],
        'insuranceTaken' => ['betZone1' => false, 'betZone2' => false, 'betZone3' => false],
        'insuranceDecided' => ['betZone1' => false, 'betZone2' => false, 'betZone3' => false],
        'splitUsed' => ['betZone1' => false, 'betZone2' => false, 'betZone3' => false],
        'hands' => [],
        'playOrder' => ['betZone1'],
        'currentIndex' => 0,
        'dealerCards' => [],
        'phase' => 'actions',
        'actionLog' => [['action' => 'deal', 'zone' => null, 'at' => '']],
    ];
    return array_replace($base, $overrides);
}

function bjeHand(array $cards, float $bet = 10.0, array $overrides = []): array
{
    return array_replace([
        'zone' => 'betZone1',
        'baseZone' => 'betZone1',
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

TestRunner::run('BJ engine: deal order, drawn pointer, deck commitment', function (): void {
    $c = bjeController();
    $seed = 'deal-order-seed';
    $deck = bjeDeck($c, $seed);

    $zones = ['betZone1' => ['main' => 10], 'betZone3' => ['main' => 5]];
    $state = bjeCall($c, 'blackjackRoundCreate', $zones, $seed, 6);

    // Two passes of (each active zone, then dealer) — exactly the legacy order.
    TestRunner::assertEquals($deck[0]['code'], $state['hands']['betZone1']['cards'][0]['code'], 'z1 first card = deck[0]');
    TestRunner::assertEquals($deck[1]['code'], $state['hands']['betZone3']['cards'][0]['code'], 'z3 first card = deck[1]');
    TestRunner::assertEquals($deck[2]['code'], $state['dealerCards'][0]['code'], 'dealer up card = deck[2]');
    TestRunner::assertEquals($deck[3]['code'], $state['hands']['betZone1']['cards'][1]['code'], 'z1 second card = deck[3]');
    TestRunner::assertEquals($deck[4]['code'], $state['hands']['betZone3']['cards'][1]['code'], 'z3 second card = deck[4]');
    TestRunner::assertEquals($deck[5]['code'], $state['dealerCards'][1]['code'], 'dealer hole card = deck[5]');
    TestRunner::assertEquals(6, (int) $state['drawn'], 'drawn pointer sits after the 6 dealt cards');
    TestRunner::assertEquals(['betZone1', 'betZone3'], $state['playOrder'], 'play order is active zones in order');

    $hash = bjeCall($c, 'blackjackRoundDeckHash', $state);
    TestRunner::assertEquals(64, strlen($hash), 'deck commitment is a sha256 hex');
    $codes = array_map(static fn(array $cd): string => $cd['code'], $deck);
    TestRunner::assertEquals(hash('sha256', implode('|', $codes)), $hash, 'commitment covers the full deck order');
    TestRunner::assertEquals(6 * 52, count($deck), 'six-deck shoe');
});

TestRunner::run('BJ engine: deal-time stake validation', function (): void {
    $c = bjeController();
    TestRunner::assertThrows(function () use ($c): void {
        bjeCall($c, 'blackjackRoundCreate', [], 'seed-x', 6);
    }, InvalidArgumentException::class, 'no main bet anywhere throws');
    TestRunner::assertThrows(function () use ($c): void {
        bjeCall($c, 'blackjackRoundCreate', ['betZone1' => ['main' => 10, 'pairs' => 101]], 'seed-x', 6);
    }, InvalidArgumentException::class, 'side bet above $100 throws');
    TestRunner::assertThrows(function () use ($c): void {
        bjeCall($c, 'blackjackRoundCreate', ['betZone1' => ['pairs' => 5]], 'seed-x', 6);
    }, InvalidArgumentException::class, 'side bet without a main bet in the zone throws');
    TestRunner::assertThrows(function () use ($c): void {
        bjeCall($c, 'blackjackRoundCreate', ['betZone1' => ['main' => 10, 'insurance' => 5]], 'seed-x', 6);
    }, InvalidArgumentException::class, 'insurance staked at deal throws — it is an in-round action');
    TestRunner::assertThrows(function () use ($c): void {
        bjeCall($c, 'blackjackRoundCreate', ['betZone1' => ['main' => 10]], '', 6);
    }, InvalidArgumentException::class, 'empty seed throws');

    $clampedHigh = bjeCall($c, 'blackjackRoundCreate', ['betZone1' => ['main' => 10]], 'seed-x', 99);
    TestRunner::assertEquals(8, (int) $clampedHigh['deckCount'], 'deck count clamps down to 8');
    $clampedLow = bjeCall($c, 'blackjackRoundCreate', ['betZone1' => ['main' => 10]], 'seed-x', 1);
    TestRunner::assertEquals(2, (int) $clampedLow['deckCount'], 'deck count clamps up to 2');
});

TestRunner::run('BJ engine: naturals auto-complete at deal; terminal-at-deal settles', function (): void {
    $c = bjeController();
    // Player dealt a 21 (cards deck[0]+deck[2]) with a non-Ace dealer up card.
    $seed = bjeFindSeed($c, function (array $deck) use ($c): bool {
        return bjeScore($c, [$deck[0], $deck[2]]) === 21
            && strtoupper((string) $deck[1]['rank']) !== 'A';
    }, 'natural');
    $state = bjeCall($c, 'blackjackRoundCreate', ['betZone1' => ['main' => 10]], $seed, 6);

    TestRunner::assertTrue($state['hands']['betZone1']['completed'], 'two-card 21 is completed at deal');
    TestRunner::assertEquals('natural', $state['hands']['betZone1']['standingReason'], 'reason recorded as natural');
    TestRunner::assertEquals('complete', $state['phase'], 'sole natural with no insurance phase settles at deal');
    TestRunner::assertEquals(2, count($state['dealerCards']), 'dealer does not draw against all-blackjack (legacy skip)');

    $settlement = bjeCall($c, 'blackjackRoundSettleFromState', $state);
    TestRunner::assertEquals(25.0, (float) $settlement['totalReturn'], 'natural pays 3:2 (locked legacy math)');
    TestRunner::assertEquals('blackjack', (string) $settlement['resultType'], 'resultType blackjack');
});

TestRunner::run('BJ engine: insurance phase machine', function (): void {
    $c = bjeController();

    // Non-natural hand vs dealer Ace up.
    $state = bjeState([
        'phase' => 'insurance',
        'hands' => ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('8', 's2')])],
        'dealerCards' => [bjeCard('A', 's3'), bjeCard('9', 's4')],
    ]);

    $legal = bjeCall($c, 'blackjackRoundLegalActions', $state);
    TestRunner::assertEquals('betZone1', $legal['zone'], 'insurance decision pending on zone 1');
    TestRunner::assertEquals(['insurance', 'decline_insurance'], $legal['actions'], 'non-natural hand decides insurance');

    TestRunner::assertThrows(function () use ($c, $state): void {
        $s = $state;
        bjeApply($c, $s, 'hit', 'betZone1');
    }, InvalidArgumentException::class, 'player actions blocked until insurance decided');
    TestRunner::assertThrows(function () use ($c, $state): void {
        $s = $state;
        bjeApply($c, $s, 'insurance', 'betZone1', 0.0);
    }, InvalidArgumentException::class, 'insurance without a stake throws');
    TestRunner::assertThrows(function () use ($c, $state): void {
        $s = $state;
        bjeApply($c, $s, 'insurance', 'betZone1', 6.0);
    }, InvalidArgumentException::class, 'insurance above half the main bet throws');
    TestRunner::assertThrows(function () use ($c, $state): void {
        $s = $state;
        bjeApply($c, $s, 'even_money', 'betZone1');
    }, InvalidArgumentException::class, 'even money on a non-natural hand throws');

    bjeApply($c, $state, 'insurance', 'betZone1', 5.0);
    TestRunner::assertTrue($state['insuranceTaken']['betZone1'], 'insurance recorded');
    TestRunner::assertEqualsFloat(5.0, (float) $state['insuranceStakes']['betZone1'], 'insurance stake recorded');
    TestRunner::assertEquals('actions', $state['phase'], 'all zones decided -> actions phase');

    // Natural hand vs dealer Ace: even-money routing.
    $nat = bjeState([
        'phase' => 'insurance',
        'hands' => ['betZone1' => bjeHand([bjeCard('A', 's1'), bjeCard('K', 's2')], 10.0, [
            'completed' => true,
            'standingReason' => 'natural',
        ])],
        'dealerCards' => [bjeCard('A', 's3'), bjeCard('9', 's4')],
    ]);
    $legalNat = bjeCall($c, 'blackjackRoundLegalActions', $nat);
    TestRunner::assertEquals(['even_money', 'decline_even_money'], $legalNat['actions'], 'natural hand decides even money');
    TestRunner::assertThrows(function () use ($c, $nat): void {
        $s = $nat;
        bjeApply($c, $s, 'insurance', 'betZone1', 5.0);
    }, InvalidArgumentException::class, 'insurance on a natural throws');

    bjeApply($c, $nat, 'even_money', 'betZone1');
    TestRunner::assertTrue($nat['hands']['betZone1']['evenMoney'], 'even money flagged');
    TestRunner::assertEquals('complete', $nat['phase'], 'sole even-money hand ends the round');
    $stl = bjeCall($c, 'blackjackRoundSettleFromState', $nat);
    TestRunner::assertEquals(20.0, (float) $stl['totalReturn'], 'even money pays 1:1 (locked legacy math)');

    // Decline even money and win 3:2 against a dealer 20.
    $nat2 = bjeState([
        'phase' => 'insurance',
        'hands' => ['betZone1' => bjeHand([bjeCard('A', 's1'), bjeCard('K', 's2')], 10.0, [
            'completed' => true,
            'standingReason' => 'natural',
        ])],
        'dealerCards' => [bjeCard('A', 's3'), bjeCard('9', 's4')],
    ]);
    bjeApply($c, $nat2, 'decline_even_money', 'betZone1');
    TestRunner::assertEquals('complete', $nat2['phase'], 'declined natural still ends the round');
    $stl2 = bjeCall($c, 'blackjackRoundSettleFromState', $nat2);
    TestRunner::assertEquals(25.0, (float) $stl2['totalReturn'], 'declined even money rides to 3:2 vs dealer 20');

    // Insurance actions outside an Ace-up round throw.
    $noAce = bjeState([
        'hands' => ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('8', 's2')])],
        'dealerCards' => [bjeCard('K', 's3'), bjeCard('9', 's4')],
    ]);
    TestRunner::assertThrows(function () use ($c, $noAce): void {
        $s = $noAce;
        bjeApply($c, $s, 'insurance', 'betZone1', 5.0);
    }, InvalidArgumentException::class, 'insurance without dealer Ace throws');
});

TestRunner::run('BJ engine: hit / stand / double / surrender', function (): void {
    $c = bjeController();

    // Hit draws exactly deck[drawn].
    $seed = bjeFindSeed($c, function (array $deck) use ($c): bool {
        return bjeScore($c, [$deck[0]]) <= 5; // small card: hit keeps the hand open
    }, 'hit-small');
    $deck = bjeDeck($c, $seed);
    $state = bjeState([
        'seed' => $seed,
        'hands' => ['betZone1' => bjeHand([bjeCard('5', 's1'), bjeCard('9', 's2')])],
        'dealerCards' => [bjeCard('K', 's3'), bjeCard('9', 's4')],
    ]);
    bjeApply($c, $state, 'hit', 'betZone1');
    TestRunner::assertEquals($deck[0]['code'], $state['hands']['betZone1']['cards'][2]['code'], 'hit consumes deck[drawn]');
    TestRunner::assertEquals(1, (int) $state['drawn'], 'drawn pointer advanced');
    TestRunner::assertFalse($state['hands']['betZone1']['completed'], 'hand stays open under 21');

    // Bust completes the hand and (single zone) finishes the round without a dealer draw.
    $bustSeed = bjeFindSeed($c, function (array $deck) use ($c): bool {
        return bjeScore($c, [bjeCard('10', 's1'), bjeCard('6', 's2'), $deck[0]]) > 21;
    }, 'hit-bust');
    $bust = bjeState([
        'seed' => $bustSeed,
        'hands' => ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('6', 's2')])],
        'dealerCards' => [bjeCard('10', 's3'), bjeCard('6', 's4')],
    ]);
    bjeApply($c, $bust, 'hit', 'betZone1');
    TestRunner::assertEquals('bust', $bust['hands']['betZone1']['standingReason'], 'bust recorded');
    TestRunner::assertEquals('complete', $bust['phase'], 'all-bust round is terminal');
    TestRunner::assertEquals(2, count($bust['dealerCards']), 'dealer never draws against all-bust (legacy skip)');
    $stl = bjeCall($c, 'blackjackRoundSettleFromState', $bust);
    TestRunner::assertEquals(0.0, (float) $stl['totalReturn'], 'bust returns nothing');
    TestRunner::assertEquals('bust', (string) $stl['resultType'], 'resultType bust');

    // Stand completes; dealer with 16 draws to 17+; stand-on-completed is a no-op.
    $stand = bjeState([
        'seed' => 'stand-seed',
        'hands' => ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('9', 's2')])],
        'dealerCards' => [bjeCard('10', 's3'), bjeCard('6', 's4')],
    ]);
    bjeApply($c, $stand, 'stand', 'betZone1');
    TestRunner::assertEquals('complete', $stand['phase'], 'stand on the only hand finishes the round');
    TestRunner::assertTrue(bjeScore($c, $stand['dealerCards']) >= 17, 'dealer draws to at least 17');
    TestRunner::assertThrows(function () use ($c, $stand): void {
        $s = $stand;
        bjeApply($c, $s, 'hit', 'betZone1');
    }, InvalidArgumentException::class, 'any action after the round settled throws');

    // Stand-on-completed-hand is a no-op ONLY while the round is still live
    // (legacy leniency): zone 1 done, zone 2 still open.
    $noopState = bjeState([
        'zones' => [
            'betZone1' => ['main' => 10.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
            'betZone2' => ['main' => 10.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
            'betZone3' => ['main' => 0.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
        ],
        'playOrder' => ['betZone1', 'betZone2'],
        'hands' => [
            'betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('9', 's2')], 10.0, ['completed' => true, 'standingReason' => 'stand']),
            'betZone2' => bjeHand([bjeCard('9', 's1'), bjeCard('7', 's2')], 10.0, ['zone' => 'betZone2', 'baseZone' => 'betZone2']),
        ],
        'dealerCards' => [bjeCard('10', 's3'), bjeCard('9', 's4')],
    ]);
    bjeApply($c, $noopState, 'stand', 'betZone1'); // must not throw
    TestRunner::assertEquals('actions', $noopState['phase'], 'no-op stand leaves the live round untouched');
    $lastLog = $noopState['actionLog'][count($noopState['actionLog']) - 1];
    TestRunner::assertTrue((bool) ($lastLog['noop'] ?? false), 'no-op stand recorded as noop in the action log');

    // Dealer soft 17 STANDS (S17 rule, ported).
    $soft = bjeState([
        'seed' => 'soft17-seed',
        'hands' => ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('9', 's2')])],
        'dealerCards' => [bjeCard('A', 's3'), bjeCard('6', 's4')],
    ]);
    bjeApply($c, $soft, 'stand', 'betZone1');
    TestRunner::assertEquals(2, count($soft['dealerCards']), 'dealer stands on soft 17 — no draw');
    $stlSoft = bjeCall($c, 'blackjackRoundSettleFromState', $soft);
    TestRunner::assertEquals(20.0, (float) $stlSoft['totalReturn'], 'player 19 beats dealer soft 17 at 1:1');

    // Double: exactly two cards, bet doubled via round(), one card, done.
    $dbl = bjeState([
        'seed' => 'double-seed',
        'hands' => ['betZone1' => bjeHand([bjeCard('6', 's1'), bjeCard('5', 's2')])],
        'dealerCards' => [bjeCard('10', 's3'), bjeCard('9', 's4')],
    ]);
    $dblDeck = bjeDeck($c, 'double-seed');
    bjeApply($c, $dbl, 'double', 'betZone1');
    TestRunner::assertEqualsFloat(20.0, (float) $dbl['hands']['betZone1']['bet'], 'double doubles the hand bet');
    TestRunner::assertEquals($dblDeck[0]['code'], $dbl['hands']['betZone1']['cards'][2]['code'], 'double draws exactly one card');
    TestRunner::assertEquals('double_down', $dbl['hands']['betZone1']['standingReason'], 'double completes the hand');

    $threeCards = bjeState([
        'hands' => ['betZone1' => bjeHand([bjeCard('2', 's1'), bjeCard('3', 's2'), bjeCard('4', 's3')])],
        'dealerCards' => [bjeCard('10', 's3'), bjeCard('9', 's4')],
    ]);
    TestRunner::assertThrows(function () use ($c, $threeCards): void {
        $s = $threeCards;
        bjeApply($c, $s, 'double', 'betZone1');
    }, InvalidArgumentException::class, 'double with three cards throws');
    TestRunner::assertThrows(function () use ($c, $threeCards): void {
        $s = $threeCards;
        bjeApply($c, $s, 'surrender', 'betZone1');
    }, InvalidArgumentException::class, 'surrender with three cards throws');

    // Surrender returns half at settle.
    $sur = bjeState([
        'hands' => ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('6', 's2')])],
        'dealerCards' => [bjeCard('10', 's3'), bjeCard('9', 's4')],
    ]);
    bjeApply($c, $sur, 'surrender', 'betZone1');
    TestRunner::assertEquals('complete', $sur['phase'], 'surrender on the only hand ends the round');
    $stlSur = bjeCall($c, 'blackjackRoundSettleFromState', $sur);
    TestRunner::assertEquals(5.0, (float) $stlSur['totalReturn'], 'surrender returns half the stake');
    TestRunner::assertEquals('surrender', (string) $stlSur['resultType'], 'resultType surrender');
});

TestRunner::run('BJ engine: split — pair gate, ace auto-stand, zone sequencing', function (): void {
    $c = bjeController();

    $seed = 'split-seed';
    $deck = bjeDeck($c, $seed);
    $split = bjeState([
        'seed' => $seed,
        'hands' => ['betZone1' => bjeHand([bjeCard('8', 's1'), bjeCard('8', 's2')])],
        'dealerCards' => [bjeCard('10', 's3'), bjeCard('9', 's4')],
    ]);
    bjeApply($c, $split, 'split', 'betZone1');
    TestRunner::assertFalse(isset($split['hands']['betZone1']), 'base hand replaced by split hands');
    TestRunner::assertEquals(['splitZone1', 'splitZone2'], $split['playOrder'], 'play order spliced with split zones');
    TestRunner::assertEquals($deck[0]['code'], $split['hands']['splitZone1']['cards'][1]['code'], 'first split hand draws deck[0]');
    TestRunner::assertEquals($deck[1]['code'], $split['hands']['splitZone2']['cards'][1]['code'], 'second split hand draws deck[1]');
    TestRunner::assertEqualsFloat(10.0, (float) $split['hands']['splitZone1']['bet'], 'split hand carries the base stake');
    TestRunner::assertTrue($split['splitUsed']['betZone1'], 'split marked used for the base zone');

    TestRunner::assertThrows(function () use ($c, $split): void {
        $s = $split;
        bjeApply($c, $s, 'split', 'splitZone1');
    }, InvalidArgumentException::class, 'splitting a split hand throws');

    $mismatch = bjeState([
        'hands' => ['betZone1' => bjeHand([bjeCard('8', 's1'), bjeCard('9', 's2')])],
        'dealerCards' => [bjeCard('10', 's3'), bjeCard('9', 's4')],
    ]);
    TestRunner::assertThrows(function () use ($c, $mismatch): void {
        $s = $mismatch;
        bjeApply($c, $s, 'split', 'betZone1');
    }, InvalidArgumentException::class, 'splitting unequal ranks throws');

    // Ace split: both hands auto-stand, round completes immediately.
    $aces = bjeState([
        'seed' => 'ace-split-seed',
        'hands' => ['betZone1' => bjeHand([bjeCard('A', 's1'), bjeCard('A', 's2')])],
        'dealerCards' => [bjeCard('10', 's3'), bjeCard('7', 's4')],
    ]);
    bjeApply($c, $aces, 'split', 'betZone1');
    TestRunner::assertEquals('split_aces_auto_stand', $aces['hands']['splitZone1']['standingReason'], 'ace split auto-stands hand 1');
    TestRunner::assertEquals('split_aces_auto_stand', $aces['hands']['splitZone2']['standingReason'], 'ace split auto-stands hand 2');
    TestRunner::assertEquals('complete', $aces['phase'], 'ace-split-only round is terminal after the split');

    // Out-of-order action across two zones throws the legacy sequencing error.
    $twoZones = bjeState([
        'zones' => [
            'betZone1' => ['main' => 10.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
            'betZone2' => ['main' => 10.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
            'betZone3' => ['main' => 0.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
        ],
        'playOrder' => ['betZone1', 'betZone2'],
        'hands' => [
            'betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('6', 's2')]),
            'betZone2' => bjeHand([bjeCard('9', 's1'), bjeCard('7', 's2')], 10.0, ['zone' => 'betZone2', 'baseZone' => 'betZone2']),
        ],
        'dealerCards' => [bjeCard('10', 's3'), bjeCard('9', 's4')],
    ]);
    TestRunner::assertThrows(function () use ($c, $twoZones): void {
        $s = $twoZones;
        bjeApply($c, $s, 'hit', 'betZone2');
    }, InvalidArgumentException::class, 'acting on zone 2 while zone 1 is open throws the sequencing error');
});

TestRunner::run('BJ engine: settlement math locked to legacy numbers', function (): void {
    $c = bjeController();

    $settle = function (array $hands, array $dealerCards, array $zonesOverride = [], array $extra = []) use ($c): array {
        $zones = [
            'betZone1' => array_replace(['main' => 10.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0], $zonesOverride),
            'betZone2' => ['main' => 0.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
            'betZone3' => ['main' => 0.0, 'pairs' => 0.0, 'plus21' => 0.0, 'royal' => 0.0, 'superSeven' => 0.0],
        ];
        $state = bjeState(array_replace([
            'zones' => $zones,
            'hands' => $hands,
            'playOrder' => array_keys($hands),
            'dealerCards' => $dealerCards,
            'phase' => 'complete',
        ], $extra));
        return bjeCall($c, 'blackjackRoundSettleFromState', $state);
    };

    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('9', 's2')], 10.0, ['completed' => true])],
        [bjeCard('10', 's3'), bjeCard('8', 's4')]
    );
    TestRunner::assertEquals(20.0, (float) $stl['totalReturn'], 'win pays 1:1');
    TestRunner::assertEquals(10.0, (float) $stl['netResult'], 'net +10');

    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('8', 's2')], 10.0, ['completed' => true])],
        [bjeCard('10', 's3'), bjeCard('8', 's4')]
    );
    TestRunner::assertEquals(10.0, (float) $stl['totalReturn'], 'push returns the stake exactly');
    TestRunner::assertEquals('push', (string) $stl['resultType'], 'resultType push');

    // C3 house-safe flooring: odd-stake fractional payouts floor.
    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('A', 's1'), bjeCard('K', 's2')], 5.0, ['completed' => true, 'standingReason' => 'natural'])],
        [bjeCard('10', 's3'), bjeCard('8', 's4')]
    );
    TestRunner::assertEquals(12.0, (float) $stl['totalReturn'], 'C3: $5 natural returns floor(12.5)=12');

    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('6', 's2')], 5.0, ['completed' => true, 'surrendered' => true, 'standingReason' => 'surrender'])],
        [bjeCard('10', 's3'), bjeCard('8', 's4')]
    );
    TestRunner::assertEquals(2.0, (float) $stl['totalReturn'], 'C3: $5 surrender returns floor(2.5)=2');

    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('4', 's2'), bjeCard('9', 's2')], 10.0, ['completed' => true])],
        [bjeCard('10', 's3'), bjeCard('9', 's4')],
        ['royal' => 5.0]
    );
    TestRunner::assertEquals(17.0, (float) $stl['betDetails']['sideBets'][0]['return'], 'C3: $5 suited royal returns floor(17.5)=17');

    // Dealer natural takes the FULL doubled stake (no-peek, ported as-is).
    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('6', 's1'), bjeCard('5', 's2'), bjeCard('9', 's3')], 20.0, ['completed' => true, 'doubled' => true, 'standingReason' => 'double_down'])],
        [bjeCard('A', 's3'), bjeCard('K', 's4')]
    );
    TestRunner::assertEquals(0.0, (float) $stl['totalReturn'], 'doubled hand loses the full doubled stake to dealer natural');

    // Insurance pays 2:1 when the dealer has blackjack and the player does not.
    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('9', 's2')], 10.0, ['completed' => true])],
        [bjeCard('A', 's3'), bjeCard('K', 's4')],
        [],
        [
            'insuranceStakes' => ['betZone1' => 5.0, 'betZone2' => 0.0, 'betZone3' => 0.0],
            'insuranceTaken' => ['betZone1' => true, 'betZone2' => false, 'betZone3' => false],
        ]
    );
    $insuranceRow = null;
    foreach ($stl['betDetails']['sideBets'] as $row) {
        if ($row['type'] === 'insurance') {
            $insuranceRow = $row;
        }
    }
    TestRunner::assertNotNull($insuranceRow, 'insurance side-bet row present');
    TestRunner::assertEquals(15.0, (float) $insuranceRow['return'], 'insurance returns 3x the stake (2:1 win)');
    TestRunner::assertEquals(15.0, (float) $stl['totalWager'], 'insurance stake counts into the total wager');
    TestRunner::assertEquals(15.0, (float) $stl['totalReturn'], 'main lost to dealer BJ, insurance paid');

    // Side bets — CURRENT paytables locked (C3 changes Royal to 5:2 and
    // deletes Super Sevens; these assertions are the tripwire for that diff).
    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('8', 's1'), bjeCard('8', 's1')], 10.0, ['completed' => true])],
        [bjeCard('10', 's3'), bjeCard('9', 's4')],
        ['pairs' => 10.0]
    );
    TestRunner::assertEquals('perfect_pair', (string) $stl['betDetails']['sideBets'][0]['outcome'], 'same rank+suit = perfect pair');
    TestRunner::assertEquals(260.0, (float) $stl['betDetails']['sideBets'][0]['return'], 'LOCKED: perfect pair 25:1 (26x return)');

    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('K', 's1'), bjeCard('Q', 's1')], 10.0, ['completed' => true])],
        [bjeCard('9', 's3'), bjeCard('9', 's4')],
        ['royal' => 10.0]
    );
    TestRunner::assertEquals('royal_match', (string) $stl['betDetails']['sideBets'][0]['outcome'], 'suited KQ = royal match');
    TestRunner::assertEquals(260.0, (float) $stl['betDetails']['sideBets'][0]['return'], 'LOCKED: royal match 26x return');

    // C2 economics: any-suited Royal pays 5:2 (return 3.5x) — the audited
    // fix for the 154% RTP paytable. round() until the C3 flooring diff.
    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('4', 's2'), bjeCard('9', 's2')], 10.0, ['completed' => true])],
        [bjeCard('10', 's3'), bjeCard('9', 's4')],
        ['royal' => 10.0]
    );
    TestRunner::assertEquals(35.0, (float) $stl['betDetails']['sideBets'][0]['return'], 'C2: any suited pays 5:2 (3.5x return)');

    // C2 economics: Super Sevens is fully removed — rejected at deal, and a
    // stray stake key at settle produces NO side-bet row and NO payout.
    TestRunner::assertThrows(function () use ($c): void {
        bjeCall($c, 'blackjackRoundCreate', ['betZone1' => ['main' => 10, 'superSeven' => 5]], 'seed-ss', 6);
    }, InvalidArgumentException::class, 'C2: super sevens stake at deal is rejected');
    $stl = $settle(
        ['betZone1' => bjeHand([bjeCard('7', 's1'), bjeCard('9', 's2')], 10.0, ['completed' => true])],
        [bjeCard('10', 's3'), bjeCard('9', 's4')],
        ['superSeven' => 10.0]
    );
    $superRows = array_filter($stl['betDetails']['sideBets'], static fn(array $r): bool => $r['type'] === 'superSeven');
    TestRunner::assertEquals(0, count($superRows), 'C2: settle emits no super sevens row even if a stray key exists');
    TestRunner::assertEquals(10.0, (float) $stl['totalWager'], 'C2: stray super sevens key contributes nothing to the wager');

    TestRunner::assertThrows(function () use ($c): void {
        $state = bjeState([
            'hands' => ['betZone1' => bjeHand([bjeCard('10', 's1'), bjeCard('9', 's2')])],
            'dealerCards' => [bjeCard('10', 's3'), bjeCard('8', 's4')],
            'phase' => 'actions',
        ]);
        bjeCall($c, 'blackjackRoundSettleFromState', $state);
    }, InvalidArgumentException::class, 'settling a live round throws');
});

TestRunner::run('BJ engine: public state hides the hole card and the deck while live', function (): void {
    $c = bjeController();
    $seed = 'exposure-seed';
    $state = bjeCall($c, 'blackjackRoundCreate', ['betZone1' => ['main' => 10]], $seed, 6);

    if (($state['phase'] ?? '') === 'complete') {
        // Rare all-natural deal for this fixed seed would defeat the test;
        // the seed above is known non-terminal, guard anyway.
        TestRunner::assertTrue(false, 'exposure-seed unexpectedly dealt a terminal round');
        return;
    }

    $public = bjeCall($c, 'blackjackRoundPublicState', $state);
    $holeCode = (string) $state['dealerCards'][1]['code'];
    $json = json_encode($public, JSON_UNESCAPED_SLASHES);

    TestRunner::assertTrue($public['dealer']['holeHidden'], 'hole flagged hidden while live');
    TestRunner::assertEquals((string) $state['dealerCards'][0]['code'], (string) $public['dealer']['upCard'], 'up card exposed');
    TestRunner::assertFalse(str_contains($json, $holeCode), 'hole card code never serialized while live');
    TestRunner::assertFalse(str_contains($json, $seed), 'seed never serialized while live');
    TestRunner::assertFalse(isset($public['seed']), 'no seed key in public state');
    TestRunner::assertNotNull($public['awaiting'], 'awaiting hint present while live');
    TestRunner::assertEquals(64, strlen((string) $public['deckHash']), 'deck commitment published');

    // Finish the round: hole card becomes visible, awaiting clears.
    while (($state['phase'] ?? '') !== 'complete') {
        $legal = bjeCall($c, 'blackjackRoundLegalActions', $state);
        $action = in_array('decline_insurance', $legal['actions'] ?? [], true)
            ? 'decline_insurance'
            : (in_array('decline_even_money', $legal['actions'] ?? [], true) ? 'decline_even_money' : 'stand');
        bjeApply($c, $state, $action, $legal['zone']);
    }
    $terminal = bjeCall($c, 'blackjackRoundPublicState', $state);
    TestRunner::assertFalse($terminal['dealer']['holeHidden'], 'hole revealed at terminal');
    TestRunner::assertTrue(count($terminal['dealer']['cards']) >= 2, 'full dealer hand at terminal');
    TestRunner::assertNull($terminal['awaiting'], 'no awaiting hint at terminal');
});
