<?php

declare(strict_types=1);

/**
 * Unit tests for SportsbookBetSupport — bet calculation logic.
 * No database, no HTTP, no PHPUnit required.
 */

// ── Stubs needed to load SportsbookBetSupport without its full runtime ────────

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        /** @param array<string, mixed> $extra */
        public function __construct(string $message, int $code = 0, private array $extra = [])
        {
            parent::__construct($message, $code);
        }
    }
}

if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return date('c'); }
        /** @return mixed */
        public static function id(string $id): string { return $id; }
    }
}

require_once __DIR__ . '/../src/SportsbookBetSupport.php';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal validated selection array. */
function sel(float $odds, string $matchId = 'match1'): array
{
    return ['odds' => $odds, 'matchId' => $matchId, 'status' => 'pending'];
}

/** Build a teaser rule with leg-count multipliers. */
function teaserRule(array $multipliers): array
{
    return ['payoutProfile' => ['type' => 'table_multiplier', 'multipliers' => $multipliers]];
}

// ── Test suites ───────────────────────────────────────────────────────────────

TestRunner::run('ticketRiskAmount', function (): void {
    TestRunner::assertEqualsFloat(100.0, SportsbookBetSupport::ticketRiskAmount('straight', 100.0), 'straight keeps stake');
    TestRunner::assertEqualsFloat(100.0, SportsbookBetSupport::ticketRiskAmount('parlay',   100.0), 'parlay keeps stake');
    TestRunner::assertEqualsFloat(100.0, SportsbookBetSupport::ticketRiskAmount('teaser',   100.0), 'teaser keeps stake');
    TestRunner::assertEqualsFloat(100.0, SportsbookBetSupport::ticketRiskAmount('if_bet',   100.0), 'if_bet keeps stake');
    TestRunner::assertEqualsFloat(200.0, SportsbookBetSupport::ticketRiskAmount('reverse',  100.0), 'reverse doubles stake');
    TestRunner::assertEqualsFloat(0.0,   SportsbookBetSupport::ticketRiskAmount('reverse',    0.0), 'reverse zero stays zero');
    TestRunner::assertEqualsFloat(50.0,  SportsbookBetSupport::ticketRiskAmount('reverse',   25.0), 'reverse 25 → 50');
});

TestRunner::run('unitStake from bet array', function (): void {
    // explicit unitStake field wins
    $bet = ['type' => 'straight', 'unitStake' => 75.0, 'amount' => 100.0];
    TestRunner::assertEqualsFloat(75.0, SportsbookBetSupport::unitStake($bet), 'explicit unitStake field');

    // straight: unitStake === amount
    $bet = ['type' => 'straight', 'amount' => 100.0];
    TestRunner::assertEqualsFloat(100.0, SportsbookBetSupport::unitStake($bet), 'straight amount');

    // reverse: unitStake === amount / 2
    $bet = ['type' => 'reverse', 'amount' => 100.0];
    TestRunner::assertEqualsFloat(50.0, SportsbookBetSupport::unitStake($bet), 'reverse halves amount');

    // zero amount
    $bet = ['type' => 'parlay', 'amount' => 0.0];
    TestRunner::assertEqualsFloat(0.0, SportsbookBetSupport::unitStake($bet), 'zero amount');
});

TestRunner::run('combinedOdds', function (): void {
    TestRunner::assertEqualsFloat(2.0,  SportsbookBetSupport::combinedOdds(100.0, 200.0), '200 payout on 100 risk');
    TestRunner::assertEqualsFloat(1.5,  SportsbookBetSupport::combinedOdds(100.0, 150.0), '150 payout on 100 risk');
    TestRunner::assertEqualsFloat(0.0,  SportsbookBetSupport::combinedOdds(0.0,   200.0), 'zero risk → 0');
    TestRunner::assertEqualsFloat(3.5,  SportsbookBetSupport::combinedOdds(20.0,   70.0), '70 payout on 20 risk');
});

TestRunner::run('calculatePotentialPayout — straight', function (): void {
    $rule = [];
    // payout = stake × odds
    TestRunner::assertEqualsFloat(200.0, SportsbookBetSupport::calculatePotentialPayout('straight', 100.0, [sel(2.0)], $rule), '2.0 odds');
    TestRunner::assertEqualsFloat(185.0, SportsbookBetSupport::calculatePotentialPayout('straight', 100.0, [sel(1.85)], $rule), '1.85 odds');
    TestRunner::assertEqualsFloat(0.0,   SportsbookBetSupport::calculatePotentialPayout('straight', 0.0,   [sel(2.0)], $rule), 'zero stake → 0');
    TestRunner::assertEqualsFloat(0.0,   SportsbookBetSupport::calculatePotentialPayout('straight', 100.0, [],          $rule), 'no selections → 0');
    // only first selection used
    TestRunner::assertEqualsFloat(200.0, SportsbookBetSupport::calculatePotentialPayout('straight', 100.0, [sel(2.0), sel(3.0)], $rule), 'only first leg used');
});

TestRunner::run('calculatePotentialPayout — parlay', function (): void {
    $rule = [];
    // 2-leg parlay: 100 × 2.0 × 1.5 = 300
    TestRunner::assertEqualsFloat(300.0, SportsbookBetSupport::calculatePotentialPayout('parlay', 100.0, [sel(2.0), sel(1.5)], $rule), '2-leg parlay');
    // 3-leg: 50 × 2.0 × 2.0 × 2.0 = 400
    TestRunner::assertEqualsFloat(400.0, SportsbookBetSupport::calculatePotentialPayout('parlay', 50.0, [sel(2.0), sel(2.0), sel(2.0)], $rule), '3-leg parlay');
    // single leg (should still work)
    TestRunner::assertEqualsFloat(200.0, SportsbookBetSupport::calculatePotentialPayout('parlay', 100.0, [sel(2.0)], $rule), '1-leg parlay');
    TestRunner::assertEqualsFloat(0.0,   SportsbookBetSupport::calculatePotentialPayout('parlay', 0.0, [sel(2.0)], $rule), 'zero stake');
});

TestRunner::run('calculatePotentialPayout — teaser', function (): void {
    // 2-leg teaser: multiplier 1.8
    $rule = teaserRule(['2' => 1.8, '3' => 2.6, '4' => 4.0, '5' => 6.5, '6' => 9.5]);
    TestRunner::assertEqualsFloat(180.0, SportsbookBetSupport::calculatePotentialPayout('teaser', 100.0, [sel(2.0), sel(2.0)], $rule), '2-leg teaser 1.8×');
    TestRunner::assertEqualsFloat(260.0, SportsbookBetSupport::calculatePotentialPayout('teaser', 100.0, [sel(2.0), sel(2.0), sel(2.0)], $rule), '3-leg teaser 2.6×');
    TestRunner::assertEqualsFloat(400.0, SportsbookBetSupport::calculatePotentialPayout('teaser', 100.0, array_fill(0, 4, sel(2.0)), $rule), '4-leg teaser 4.0×');
    TestRunner::assertEqualsFloat(650.0, SportsbookBetSupport::calculatePotentialPayout('teaser', 100.0, array_fill(0, 5, sel(2.0)), $rule), '5-leg teaser 6.5×');
    TestRunner::assertEqualsFloat(950.0, SportsbookBetSupport::calculatePotentialPayout('teaser', 100.0, array_fill(0, 6, sel(2.0)), $rule), '6-leg teaser 9.5×');
    // unknown leg count falls back to multiplier 1.0
    TestRunner::assertEqualsFloat(100.0, SportsbookBetSupport::calculatePotentialPayout('teaser', 100.0, array_fill(0, 7, sel(2.0)), $rule), 'unknown leg count → 1.0×');
    // empty multipliers → 1.0 fallback
    TestRunner::assertEqualsFloat(100.0, SportsbookBetSupport::calculatePotentialPayout('teaser', 100.0, [sel(2.0), sel(2.0)], teaserRule([])), 'empty multipliers → 1.0×');
});

TestRunner::run('calculatePotentialPayout — if_bet', function (): void {
    $rule = [];
    // if_bet uses same combined-odds formula as parlay
    TestRunner::assertEqualsFloat(300.0, SportsbookBetSupport::calculatePotentialPayout('if_bet', 100.0, [sel(2.0), sel(1.5)], $rule), '2-leg if_bet');
    TestRunner::assertEqualsFloat(0.0,   SportsbookBetSupport::calculatePotentialPayout('if_bet', 0.0,   [sel(2.0), sel(1.5)], $rule), 'zero stake');
    TestRunner::assertEqualsFloat(0.0,   SportsbookBetSupport::calculatePotentialPayout('if_bet', 100.0, [], $rule), 'no selections');
});

TestRunner::run('calculatePotentialPayout — reverse', function (): void {
    $rule = [];
    // reverse: stake × combined × 2
    // 100 × 2.0 × 1.5 × 2 = 600
    TestRunner::assertEqualsFloat(600.0, SportsbookBetSupport::calculatePotentialPayout('reverse', 100.0, [sel(2.0), sel(1.5)], $rule), '2-leg reverse');
    // 50 × 2.0 × 2.0 × 2 = 400
    TestRunner::assertEqualsFloat(400.0, SportsbookBetSupport::calculatePotentialPayout('reverse', 50.0, [sel(2.0), sel(2.0)], $rule), 'reverse 50 stake');
    TestRunner::assertEqualsFloat(0.0,   SportsbookBetSupport::calculatePotentialPayout('reverse', 0.0, [sel(2.0), sel(2.0)], $rule), 'zero stake');
});

TestRunner::run('calculatePotentialPayout — unknown type', function (): void {
    TestRunner::assertEqualsFloat(0.0, SportsbookBetSupport::calculatePotentialPayout('future', 100.0, [sel(2.0)], []), 'unknown bet type → 0');
});

TestRunner::run('payloadHash determinism', function (): void {
    $a = ['betType' => 'parlay', 'amount' => 100, 'selections' => [['matchId' => 'abc', 'odds' => 2.0]]];
    $b = ['selections' => [['odds' => 2.0, 'matchId' => 'abc']], 'amount' => 100, 'betType' => 'parlay'];
    TestRunner::assertEquals(
        SportsbookBetSupport::payloadHash($a),
        SportsbookBetSupport::payloadHash($b),
        'key order does not affect hash'
    );

    $c = ['betType' => 'parlay', 'amount' => 200, 'selections' => [['matchId' => 'abc', 'odds' => 2.0]]];
    TestRunner::assertFalse(
        SportsbookBetSupport::payloadHash($a) === SportsbookBetSupport::payloadHash($c),
        'different payload → different hash'
    );
});

TestRunner::run('normalizeRequestId', function (): void {
    TestRunner::assertEquals('abc-123_XY', SportsbookBetSupport::normalizeRequestId('abc-123_XY'), 'valid id passes through');
    TestRunner::assertEquals('', SportsbookBetSupport::normalizeRequestId('   '), 'blank → empty string');

    $threw = false;
    try {
        SportsbookBetSupport::normalizeRequestId('bad id!');
    } catch (ApiException $e) {
        $threw = true;
    }
    TestRunner::assertTrue($threw, 'invalid chars → ApiException');

    $threw = false;
    try {
        SportsbookBetSupport::normalizeRequestId('short'); // < 8 chars
    } catch (ApiException $e) {
        $threw = true;
    }
    TestRunner::assertTrue($threw, 'too short → ApiException');
});
