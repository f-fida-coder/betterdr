<?php

declare(strict_types=1);

/**
 * Unit tests for RoundRobinService — combination generator + aggregate
 * status logic. No database, no HTTP — exercises the pure helpers and
 * the void-handling matrix from the implementation plan §4.
 */

if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return date('c'); }
        public static function id(string $id): string { return $id; }
    }
}

require_once __DIR__ . '/../src/RoundRobinService.php';

// ── Combination generator ──────────────────────────────────────────────────

TestRunner::run('generateCombinations: 4 choose 2 yields 6 combos in order', function (): void {
    $sels = ['A', 'B', 'C', 'D'];
    $combos = RoundRobinService::generateCombinations($sels, 2);
    TestRunner::assertEquals(6, count($combos), '4 choose 2 = 6');
    TestRunner::assertEquals(['A', 'B'], $combos[0], 'first combo');
    TestRunner::assertEquals(['A', 'C'], $combos[1], 'second combo');
    TestRunner::assertEquals(['C', 'D'], $combos[5], 'last combo');
});

TestRunner::run('generateCombinations: 5 choose 3 yields 10 combos', function (): void {
    $sels = ['A', 'B', 'C', 'D', 'E'];
    $combos = RoundRobinService::generateCombinations($sels, 3);
    TestRunner::assertEquals(10, count($combos), '5 choose 3 = 10');
});

TestRunner::run('generateCombinations: size > n returns empty', function (): void {
    $combos = RoundRobinService::generateCombinations(['A', 'B'], 3);
    TestRunner::assertEquals(0, count($combos), 'no combos when k > n');
});

TestRunner::run('combinationCount: By 2 + By 3 over 5 legs = 20', function (): void {
    TestRunner::assertEquals(20, RoundRobinService::combinationCount(5, [2, 3]), '10 + 10 = 20');
});

TestRunner::run('combinationCount: invalid sizes are skipped', function (): void {
    // size = 1 (below min) and size = 6 (> n) are dropped. size == n is VALID
    // since 2026-07-17 ("By N's" on N legs = the single full parlay) — the
    // old `k >= n` drop was the deliberate bound this change removed.
    TestRunner::assertEquals(10, RoundRobinService::combinationCount(5, [1, 3, 6]), 'only size 3 contributes');
    TestRunner::assertEquals(11, RoundRobinService::combinationCount(5, [1, 3, 5]), 'size 5 (== n) now adds the full parlay: 10 + 1');
});

TestRunner::run('nCr: classic values', function (): void {
    TestRunner::assertEquals(1, RoundRobinService::nCr(5, 0), 'n choose 0 = 1');
    TestRunner::assertEquals(5, RoundRobinService::nCr(5, 1), 'n choose 1 = n');
    TestRunner::assertEquals(70, RoundRobinService::nCr(8, 4), 'C(8,4) = 70');
});

// ── Aggregate status (plan §4) ─────────────────────────────────────────────

TestRunner::run('aggregateStatus: any pending → pending', function (): void {
    TestRunner::assertEquals('pending', RoundRobinService::aggregateStatus(['won', 'pending', 'won']), 'pending dominates');
});

TestRunner::run('aggregateStatus: all won → won', function (): void {
    TestRunner::assertEquals('won', RoundRobinService::aggregateStatus(['won', 'won', 'won']));
});

TestRunner::run('aggregateStatus: all lost → lost', function (): void {
    TestRunner::assertEquals('lost', RoundRobinService::aggregateStatus(['lost', 'lost']));
});

TestRunner::run('aggregateStatus: mix of won + lost → partial', function (): void {
    TestRunner::assertEquals('partial', RoundRobinService::aggregateStatus(['won', 'lost', 'won']));
});

TestRunner::run('aggregateStatus: all void → void (full refund)', function (): void {
    TestRunner::assertEquals('void', RoundRobinService::aggregateStatus(['void', 'void', 'void']));
});

TestRunner::run('aggregateStatus: void does NOT contaminate a clean win', function (): void {
    // Plan §4: voids are filtered out before the won/lost split is taken.
    // A single voided child must not flip a 5-of-6 won group to "partial".
    TestRunner::assertEquals('won', RoundRobinService::aggregateStatus(['won', 'won', 'void', 'won']));
});

TestRunner::run('aggregateStatus: void does NOT contaminate a clean loss', function (): void {
    TestRunner::assertEquals('lost', RoundRobinService::aggregateStatus(['lost', 'void', 'lost']));
});

TestRunner::run('aggregateStatus: mixed void + won + lost → partial (voids stripped first)', function (): void {
    TestRunner::assertEquals('partial', RoundRobinService::aggregateStatus(['won', 'lost', 'void']));
});

TestRunner::run('aggregateStatus: empty children → pending', function (): void {
    TestRunner::assertEquals('pending', RoundRobinService::aggregateStatus([]));
});

TestRunner::run('aggregateStatus: case-insensitive', function (): void {
    TestRunner::assertEquals('won', RoundRobinService::aggregateStatus(['WON', 'Won', 'won']));
});
