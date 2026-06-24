<?php

declare(strict_types=1);

/**
 * PHASE 2 (NOT WIRED LIVE) — unit tests for quarter-aware (Asian split
 * handicap) grading:
 *   - SportsbookBetSupport::isQuarterPoint()    : .25/.75 detection
 *   - SportsbookBetSupport::gradeQuarterAware()  : split-stake disposition
 *   - SportsbookBetSupport::quarterReturn()      : money + parlay multiplier
 *
 * These cover every quarter point (+/-0.25/0.75/1.25/1.75/2.25), every result
 * type (full win / half win / half loss / full loss), spreads + totals +
 * team totals, the -0.25 vs +0.25 symmetry, the unreachable (won,lost)/
 * (void,void) combos, and the parlay-leg effective-multiplier case. The graded
 * function under test is isolated — it is NOT called by the live settlement
 * path; these tests drive it directly.
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        public function __construct(string $message, int $code = 0, private array $extra = [])
        {
            parent::__construct($message, $code);
        }
    }
}

require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';

/**
 * Grade a spread/total/team_total quarter line and assert label + fractions.
 *
 * @param array{0:float,1:float,2:float} $expect [won, push, lost]
 */
function q_assert(
    string $base,
    string $sel,
    float $point,
    float $sh,
    float $sa,
    string $expectLabel,
    array $expect,
    string $note,
    ?string $teamSide = null,
    ?string $side = null
): void {
    $r = SportsbookBetSupport::gradeQuarterAware($base, $sel, $point, $sh, $sa, 'Home', 'Away', $teamSide, $side);
    TestRunner::assertNotNull($r, "{$note} → returns a graded result");
    if ($r === null) {
        return;
    }
    TestRunner::assertEquals($expectLabel, $r['label'], "{$note} → label");
    TestRunner::assertEqualsFloat($expect[0], $r['wonFraction'], "{$note} → wonFraction", 1e-9);
    TestRunner::assertEqualsFloat($expect[1], $r['pushFraction'], "{$note} → pushFraction", 1e-9);
    TestRunner::assertEqualsFloat($expect[2], $r['lostFraction'], "{$note} → lostFraction", 1e-9);
    // Fractions always sum to one whole stake.
    TestRunner::assertEqualsFloat(1.0, $r['wonFraction'] + $r['pushFraction'] + $r['lostFraction'], "{$note} → fractions sum to 1", 1e-9);
    // Reachability invariant: never simultaneously won AND lost.
    TestRunner::assertFalse($r['wonFraction'] > 1e-9 && $r['lostFraction'] > 1e-9, "{$note} → not (won,lost)");
}

TestRunner::run('isQuarterPoint — detection', function (): void {
    foreach ([-0.25, 0.25, -0.75, 0.75, 1.25, -1.75, 2.25, -2.25] as $p) {
        TestRunner::assertTrue(SportsbookBetSupport::isQuarterPoint($p), "quarter {$p}");
    }
    foreach ([0.0, 0.5, -0.5, 1.0, -2.0, 2.5, -3.5] as $p) {
        TestRunner::assertFalse(SportsbookBetSupport::isQuarterPoint($p), "non-quarter {$p}");
    }
    TestRunner::assertFalse(SportsbookBetSupport::isQuarterPoint(null), 'null → false');
    TestRunner::assertNull(
        SportsbookBetSupport::gradeQuarterAware('spreads', 'Home', -0.5, 1, 0, 'Home', 'Away'),
        'non-quarter point → gradeQuarterAware returns null (use single-line path)'
    );
});

TestRunner::run('spreads — home -0.25 (Asian split)', function (): void {
    // lower=-0.5, upper=0.0
    q_assert('spreads', 'Home', -0.25, 1, 0, 'win', [1.0, 0.0, 0.0], 'Home -0.25, win 1-0');
    q_assert('spreads', 'Home', -0.25, 0, 0, 'half_loss', [0.0, 0.5, 0.5], 'Home -0.25, DRAW 0-0');
    q_assert('spreads', 'Home', -0.25, 0, 1, 'loss', [0.0, 0.0, 1.0], 'Home -0.25, lose 0-1');
    q_assert('spreads', 'Home', -0.25, 2, 0, 'win', [1.0, 0.0, 0.0], 'Home -0.25, win 2-0');
});

TestRunner::run('spreads — away +0.25 (symmetric side)', function (): void {
    // lower=0.0, upper=0.5
    q_assert('spreads', 'Away', 0.25, 0, 0, 'half_win', [0.5, 0.5, 0.0], 'Away +0.25, DRAW 0-0');
    q_assert('spreads', 'Away', 0.25, 0, 1, 'win', [1.0, 0.0, 0.0], 'Away +0.25, away wins 0-1');
    q_assert('spreads', 'Away', 0.25, 1, 0, 'loss', [0.0, 0.0, 1.0], 'Away +0.25, away loses 1-0');
});

TestRunner::run('spreads — symmetry: -0.25 loses exactly what +0.25 wins', function (): void {
    // On a draw, home -0.25 is a half-loss and away +0.25 is a half-win:
    // the half the -0.25 backer loses is the half the +0.25 backer wins.
    $minus = SportsbookBetSupport::gradeQuarterAware('spreads', 'Home', -0.25, 0, 0, 'Home', 'Away');
    $plus  = SportsbookBetSupport::gradeQuarterAware('spreads', 'Away', 0.25, 0, 0, 'Home', 'Away');
    TestRunner::assertEqualsFloat($minus['lostFraction'], $plus['wonFraction'], 'home -0.25 lostFraction == away +0.25 wonFraction', 1e-9);
    TestRunner::assertEqualsFloat($minus['pushFraction'], $plus['pushFraction'], 'push halves match', 1e-9);
});

TestRunner::run('spreads — -0.75 / +0.75', function (): void {
    // home -0.75: lower=-1.0, upper=-0.5
    q_assert('spreads', 'Home', -0.75, 1, 0, 'half_win', [0.5, 0.5, 0.0], 'Home -0.75, win by 1 (1-0)');
    q_assert('spreads', 'Home', -0.75, 2, 0, 'win', [1.0, 0.0, 0.0], 'Home -0.75, win by 2 (2-0)');
    q_assert('spreads', 'Home', -0.75, 0, 0, 'loss', [0.0, 0.0, 1.0], 'Home -0.75, draw 0-0');
    // away +0.75: lower=0.5, upper=1.0
    q_assert('spreads', 'Away', 0.75, 1, 0, 'half_loss', [0.0, 0.5, 0.5], 'Away +0.75, away loses by 1 (1-0)');
    q_assert('spreads', 'Away', 0.75, 2, 0, 'loss', [0.0, 0.0, 1.0], 'Away +0.75, away loses by 2 (2-0)');
});

TestRunner::run('spreads — -1.25 / -1.75 / -2.25', function (): void {
    // home -1.25: lower=-1.5, upper=-1.0
    q_assert('spreads', 'Home', -1.25, 1, 0, 'half_loss', [0.0, 0.5, 0.5], 'Home -1.25, win by 1 (1-0)');
    q_assert('spreads', 'Home', -1.25, 2, 0, 'win', [1.0, 0.0, 0.0], 'Home -1.25, win by 2 (2-0)');
    // home -1.75: lower=-2.0, upper=-1.5
    q_assert('spreads', 'Home', -1.75, 2, 0, 'half_win', [0.5, 0.5, 0.0], 'Home -1.75, win by 2 (2-0)');
    q_assert('spreads', 'Home', -1.75, 3, 0, 'win', [1.0, 0.0, 0.0], 'Home -1.75, win by 3 (3-0)');
    q_assert('spreads', 'Home', -1.75, 1, 0, 'loss', [0.0, 0.0, 1.0], 'Home -1.75, win by 1 (1-0)');
    // home -2.25: lower=-2.5, upper=-2.0
    q_assert('spreads', 'Home', -2.25, 3, 0, 'win', [1.0, 0.0, 0.0], 'Home -2.25, win by 3 (3-0)');
    q_assert('spreads', 'Home', -2.25, 2, 0, 'half_loss', [0.0, 0.5, 0.5], 'Home -2.25, win by 2 (2-0)');
});

TestRunner::run('totals — Over/Under 2.25 (split)', function (): void {
    // Over 2.25: lower=2.0, upper=2.5
    q_assert('totals', 'Over', 2.25, 2, 0, 'half_loss', [0.0, 0.5, 0.5], 'Over 2.25, total=2');
    q_assert('totals', 'Over', 2.25, 2, 1, 'win', [1.0, 0.0, 0.0], 'Over 2.25, total=3');
    q_assert('totals', 'Over', 2.25, 1, 0, 'loss', [0.0, 0.0, 1.0], 'Over 2.25, total=1');
    // Under 2.25: lower=2.0, upper=2.5
    q_assert('totals', 'Under', 2.25, 2, 0, 'half_win', [0.5, 0.5, 0.0], 'Under 2.25, total=2');
    q_assert('totals', 'Under', 2.25, 1, 0, 'win', [1.0, 0.0, 0.0], 'Under 2.25, total=1');
    q_assert('totals', 'Under', 2.25, 2, 1, 'loss', [0.0, 0.0, 1.0], 'Under 2.25, total=3');
});

TestRunner::run('totals — Over/Under 2.75 (.75 split)', function (): void {
    // Over 2.75: lower=2.5, upper=3.0
    q_assert('totals', 'Over', 2.75, 2, 1, 'half_win', [0.5, 0.5, 0.0], 'Over 2.75, total=3');
    q_assert('totals', 'Over', 2.75, 2, 0, 'loss', [0.0, 0.0, 1.0], 'Over 2.75, total=2');
    q_assert('totals', 'Over', 2.75, 2, 2, 'win', [1.0, 0.0, 0.0], 'Over 2.75, total=4');
    // Under 2.75: lower=2.5, upper=3.0
    q_assert('totals', 'Under', 2.75, 2, 1, 'half_loss', [0.0, 0.5, 0.5], 'Under 2.75, total=3');
    q_assert('totals', 'Under', 2.75, 2, 2, 'loss', [0.0, 0.0, 1.0], 'Under 2.75, total=4');
    q_assert('totals', 'Under', 2.75, 2, 0, 'win', [1.0, 0.0, 0.0], 'Under 2.75, total=2');
});

TestRunner::run('team_totals — quarter line on picked team', function (): void {
    // Home team over 1.25: lower=1.0, upper=1.5 (graded on teamSide+side)
    q_assert('team_totals', 'Home Over', 1.25, 1, 0, 'half_loss', [0.0, 0.5, 0.5], 'Home TT Over 1.25, home scored 1', 'home', 'over');
    q_assert('team_totals', 'Home Over', 1.25, 2, 0, 'win', [1.0, 0.0, 0.0], 'Home TT Over 1.25, home scored 2', 'home', 'over');
    q_assert('team_totals', 'Home Over', 1.25, 0, 0, 'loss', [0.0, 0.0, 1.0], 'Home TT Over 1.25, home scored 0', 'home', 'over');
});

TestRunner::run('quarterReturn — money math ($100 stake)', function (): void {
    $full     = ['wonFraction' => 1.0, 'pushFraction' => 0.0, 'lostFraction' => 0.0];
    $halfWin  = ['wonFraction' => 0.5, 'pushFraction' => 0.5, 'lostFraction' => 0.0];
    $halfLoss = ['wonFraction' => 0.0, 'pushFraction' => 0.5, 'lostFraction' => 0.5];
    $loss     = ['wonFraction' => 0.0, 'pushFraction' => 0.0, 'lostFraction' => 1.0];

    // Even money (decimal 2.0 = +100)
    TestRunner::assertEqualsFloat(200.0, SportsbookBetSupport::quarterReturn(100, 2.0, $full), 'D2.0 full win → return 200');
    TestRunner::assertEqualsFloat(150.0, SportsbookBetSupport::quarterReturn(100, 2.0, $halfWin), 'D2.0 half win → return 150');
    TestRunner::assertEqualsFloat(50.0, SportsbookBetSupport::quarterReturn(100, 2.0, $halfLoss), 'D2.0 half loss → return 50');
    TestRunner::assertEqualsFloat(0.0, SportsbookBetSupport::quarterReturn(100, 2.0, $loss), 'D2.0 full loss → return 0');

    // Underdog decimal 2.5 (+150)
    TestRunner::assertEqualsFloat(175.0, SportsbookBetSupport::quarterReturn(100, 2.5, $halfWin), 'D2.5 half win → return 175');
    TestRunner::assertEqualsFloat(50.0, SportsbookBetSupport::quarterReturn(100, 2.5, $halfLoss), 'D2.5 half loss → return 50');

    // Favorite decimal 1.5 (-200)
    TestRunner::assertEqualsFloat(125.0, SportsbookBetSupport::quarterReturn(100, 1.5, $halfWin), 'D1.5 half win → return 125');
    TestRunner::assertEqualsFloat(50.0, SportsbookBetSupport::quarterReturn(100, 1.5, $halfLoss), 'D1.5 half loss → return 50');
});

TestRunner::run('parlay — quarter leg effective multiplier composes multiplicatively', function (): void {
    // Effective decimal multiplier for a leg = return / stake = won*D + push.
    $halfWin  = ['wonFraction' => 0.5, 'pushFraction' => 0.5, 'lostFraction' => 0.0];
    $halfLoss = ['wonFraction' => 0.0, 'pushFraction' => 0.5, 'lostFraction' => 0.5];
    $full     = ['wonFraction' => 1.0, 'pushFraction' => 0.0, 'lostFraction' => 0.0];

    $multHalfWin  = SportsbookBetSupport::quarterReturn(1.0, 2.0, $halfWin);  // 1.5
    $multHalfLoss = SportsbookBetSupport::quarterReturn(1.0, 2.0, $halfLoss); // 0.5
    $multFull     = SportsbookBetSupport::quarterReturn(1.0, 2.0, $full);     // 2.0
    TestRunner::assertEqualsFloat(1.5, $multHalfWin, 'half win @ D2.0 → leg multiplier 1.5');
    TestRunner::assertEqualsFloat(0.5, $multHalfLoss, 'half loss @ D2.0 → leg multiplier 0.5');
    TestRunner::assertEqualsFloat(2.0, $multFull, 'full win @ D2.0 → leg multiplier 2.0');

    // 2-leg parlay, $100: leg A full win (2.0) × leg B half win (1.5) = $300.
    TestRunner::assertEqualsFloat(300.0, 100.0 * $multFull * $multHalfWin, 'parlay 100 × 2.0 × 1.5 = 300');
    // leg A full win (2.0) × leg B half loss (0.5) = $100 (stake back, parlay nets 0).
    TestRunner::assertEqualsFloat(100.0, 100.0 * $multFull * $multHalfLoss, 'parlay 100 × 2.0 × 0.5 = 100');
});

TestRunner::run('reachability sweep — no (won,lost) or (void,void) for any quarter line', function (): void {
    $points = [-2.25, -1.75, -1.25, -0.75, -0.25, 0.25, 0.75, 1.25, 1.75, 2.25];
    $bad = 0;
    $checked = 0;
    foreach ($points as $p) {
        foreach (range(0, 5) as $sh) {
            foreach (range(0, 5) as $sa) {
                foreach (['Home', 'Away'] as $sel) {
                    $r = SportsbookBetSupport::gradeQuarterAware('spreads', $sel, (float) $p, (float) $sh, (float) $sa, 'Home', 'Away');
                    if ($r === null) {
                        continue;
                    }
                    $checked++;
                    // won AND lost simultaneously would mean (won,lost) combo.
                    if ($r['wonFraction'] > 1e-9 && $r['lostFraction'] > 1e-9) {
                        $bad++;
                    }
                    // both-push (void,void) → pushFraction == 1.0; never valid for a quarter.
                    if (abs($r['pushFraction'] - 1.0) < 1e-9) {
                        $bad++;
                    }
                }
            }
        }
    }
    TestRunner::assertTrue($checked > 0, "swept {$checked} quarter-line outcomes");
    TestRunner::assertEquals(0, $bad, 'no unreachable (won,lost)/(void,void) combos produced');
});
