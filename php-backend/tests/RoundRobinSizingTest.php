<?php

declare(strict_types=1);

/**
 * Round Robin size bounds — k = N allowed since 2026-07-17 ("By N's" on N
 * legs = the single full parlay, matching competitor round robin pickers).
 * Verifies combinationCount's new inclusive bound and — explicitly, per the
 * 2026-07-17 review instruction ("verify with a test, don't just assume") —
 * that generateCombinations handles k = N cleanly for several N.
 */

require_once __DIR__ . '/../src/RoundRobinService.php';

TestRunner::run('combinationCount — k=N counts the single full parlay for N=3/4/5', function (): void {
    TestRunner::assertEquals(4, RoundRobinService::combinationCount(3, [2, 3]), 'N=3 by 2s+3s → 3 + 1 = 4');
    TestRunner::assertEquals(1, RoundRobinService::combinationCount(3, [3]), 'N=3 by 3s → 1');
    TestRunner::assertEquals(11, RoundRobinService::combinationCount(4, [2, 3, 4]), 'N=4 → 6 + 4 + 1 = 11');
    TestRunner::assertEquals(1, RoundRobinService::combinationCount(5, [5]), 'N=5 by 5s → 1');
    TestRunner::assertEquals(26, RoundRobinService::combinationCount(5, [2, 3, 4, 5]), 'N=5 all sizes → 10+10+5+1 = 26');
});

TestRunner::run('combinationCount — out-of-range sizes still dropped (k>N, k<2, dupes handled upstream)', function (): void {
    TestRunner::assertEquals(0, RoundRobinService::combinationCount(3, [4]), 'k > N contributes nothing');
    TestRunner::assertEquals(0, RoundRobinService::combinationCount(3, [1]), 'k < 2 contributes nothing');
    TestRunner::assertEquals(3, RoundRobinService::combinationCount(3, [2, 4, 1]), 'mixed: only the valid k=2 counts');
});

TestRunner::run('generateCombinations — k=N yields exactly ONE combo containing every leg in order', function (): void {
    foreach ([3, 4, 5] as $n) {
        $legs = [];
        for ($i = 0; $i < $n; $i++) {
            $legs[] = ['selection' => 'L' . $i];
        }
        $combos = RoundRobinService::generateCombinations($legs, $n);
        TestRunner::assertEquals(1, count($combos), "N=$n k=$n → exactly one combination");
        TestRunner::assertEquals($legs, $combos[0], "N=$n full combo preserves every leg + order");
    }
});

TestRunner::run('generateCombinations — bounds: k=N-1 unchanged, k>N empty, k<1 empty', function (): void {
    $legs = [['s' => 'a'], ['s' => 'b'], ['s' => 'c']];
    TestRunner::assertEquals(3, count(RoundRobinService::generateCombinations($legs, 2)), 'N=3 k=2 → 3 combos (unchanged)');
    TestRunner::assertEquals(0, count(RoundRobinService::generateCombinations($legs, 4)), 'k > N → []');
    TestRunner::assertEquals(0, count(RoundRobinService::generateCombinations($legs, 0)), 'k < 1 → []');
});

TestRunner::run('nCr — identity edges the new bound relies on', function (): void {
    TestRunner::assertEquals(1, RoundRobinService::nCr(3, 3), 'C(3,3)=1');
    TestRunner::assertEquals(1, RoundRobinService::nCr(8, 8), 'C(8,8)=1');
    TestRunner::assertEquals(0, RoundRobinService::nCr(3, 4), 'C(3,4)=0');
});
