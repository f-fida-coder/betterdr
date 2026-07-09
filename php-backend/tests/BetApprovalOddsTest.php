<?php

declare(strict_types=1);

/**
 * Bet-approval-queue money-integrity locks (Chunks 3-4). Source-scan tests
 * (no DB) that pin two guarantees so they can't silently regress:
 *
 *   1. approve() books the FROZEN submit-time odds. Its body must never write
 *      an odds/payout field and must never call the live repricer — otherwise
 *      approval would silently re-price a ticket the player already agreed to.
 *   2. quoteStoredBetCurrentOdds() (the inbox's advisory delta) is read-only:
 *      no balance/ledger/bet write, same guarantee as /api/bets/quote.
 *
 * Mirrors BetQuoteTest's "money-safe by construction" source-scan technique.
 */

require_once __DIR__ . '/TestRunner.php';

/** Return the source of one method body, bounded by the next method decl. */
function ba_method_body(string $src, string $signature): string
{
    $start = strpos($src, $signature);
    if ($start === false) return '';
    $rest = substr($src, $start + strlen($signature));
    $end = PHP_INT_MAX;
    foreach (["\n    private function ", "\n    public function ", "\n    protected function ", "\n    private static function ", "\n    public static function "] as $marker) {
        $p = strpos($rest, $marker);
        if ($p !== false) $end = min($end, $p);
    }
    return $end === PHP_INT_MAX ? $rest : substr($rest, 0, $end);
}

// ── 1. approve() never touches odds — books the frozen submit price ──────────
TestRunner::run('approve() body writes NO odds/payout field and never re-prices', function (): void {
    $src = (string) file_get_contents(__DIR__ . '/../src/BetApprovalService.php');
    $body = ba_method_body($src, 'public static function approve(SqlRepository $db, string $betId, array $actor): array');
    TestRunner::assertTrue($body !== '', 'approve() method found');

    // Field-write tokens (the `'key' =>` form only appears inside a write
    // array, never in the prose comments that legitimately say "odds").
    // Field-write tokens use the `'key' =>` form; the repricer token uses the
    // call form `name(` — so neither matches the prose comment that names
    // quoteStoredBetCurrentOdds when explaining the invariant.
    foreach (["'odds'", "'combinedOdds'", "'oddsAmerican'", "'potentialPayout'", 'quoteStoredBetCurrentOdds('] as $forbidden) {
        TestRunner::assertTrue(!str_contains($body, $forbidden), "approve() has NO '{$forbidden}' — books FROZEN submit odds, never re-prices");
    }
    // Structural: approve() takes no odds input, so it CANNOT book current odds.
    TestRunner::assertTrue(
        str_contains($src, 'public static function approve(SqlRepository $db, string $betId, array $actor): array'),
        'approve() signature has no odds parameter'
    );
});

// ── 2. The advisory repricer is read-only (no money/bet writes) ──────────────
TestRunner::run('quoteStoredBetCurrentOdds source contains no balance / bet / ledger write', function (): void {
    $src = (string) file_get_contents(__DIR__ . '/../src/BetsController.php');
    $body = ba_method_body($src, 'public function quoteStoredBetCurrentOdds(array $bet): array');
    TestRunner::assertTrue($body !== '', 'quoteStoredBetCurrentOdds() method found');

    foreach ([
        'insertOne',            // no row inserts (ledger/bet)
        '->updateOne(',         // no mutations
        '->updateMany(',
        'beginTransaction',     // no transaction — pure read
        '->commit(',
        '->rollback(',
        'BalanceUpdateService', // no balance mutation
        "'pendingBalance'",     // never touches the hold
        "'balance'",
    ] as $forbidden) {
        TestRunner::assertTrue(!str_contains($body, $forbidden), "quoteStoredBetCurrentOdds has NO '{$forbidden}' — read-only, money-safe");
    }
});
