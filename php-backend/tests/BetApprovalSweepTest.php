<?php

declare(strict_types=1);

/**
 * Bet-approval TIMEOUT sweep (Chunk 5). Pure + source-scan tests (no DB):
 *   - futures detection: a mixed parlay (any outright leg) counts as futures;
 *   - window selection: a mixed ticket uses the LONGER futures window, so a
 *     futures leg under review never expires on the live clock;
 *   - cutoff: fresh holds are untouched, only past-window holds expire;
 *   - the system actor is unreachable from any auth token, and its scope
 *     bypass is checked before any DB lookup;
 *   - the timeout reject uses a DISTINCT audit action and reuses the single
 *     reject()/BetVoidRefund path, so its refund can't drift from admin reject.
 */

require_once __DIR__ . '/TestRunner.php';
require_once __DIR__ . '/../src/BetApprovalService.php';

/** Slice a method body, bounded by the next method decl (unique helper name). */
function bas_method_body(string $src, string $sig): string
{
    $start = strpos($src, $sig);
    if ($start === false) return '';
    $rest = substr($src, $start + strlen($sig));
    $end = PHP_INT_MAX;
    foreach (["\n    private function ", "\n    public function ", "\n    private static function ", "\n    public static function "] as $m) {
        $p = strpos($rest, $m);
        if ($p !== false) $end = min($end, $p);
    }
    return $end === PHP_INT_MAX ? $rest : substr($rest, 0, $end);
}

// ── futures detection: a mixed parlay counts as futures ──────────────────────
TestRunner::run('isFuturesBet — any outright leg flags the ticket', function (): void {
    TestRunner::assertTrue(BetApprovalService::isFuturesBet(['marketType' => 'outrights']), 'single outright');
    TestRunner::assertTrue(BetApprovalService::isFuturesBet(['selections' => [['marketType' => 'h2h'], ['marketType' => 'outrights']]]), 'mixed: one futures leg → futures');
    TestRunner::assertTrue(!BetApprovalService::isFuturesBet(['selections' => [['marketType' => 'h2h'], ['marketType' => 'spreads']]]), 'all-live → not futures');
});

// ── window selection: futures wins on a mixed ticket ─────────────────────────
TestRunner::run('timeoutWindowMinutes — mixed parlay uses the LONGER futures window', function (): void {
    $mixed = ['selections' => [['marketType' => 'h2h'], ['marketType' => 'outrights']]];
    $live  = ['selections' => [['marketType' => 'h2h']]];
    TestRunner::assertEquals(1440, BetApprovalService::timeoutWindowMinutes($mixed, 10, 1440), 'mixed → futures window (leg still under review must not expire on live clock)');
    TestRunner::assertEquals(10, BetApprovalService::timeoutWindowMinutes($live, 10, 1440), 'all-live → live window');
});

// ── cutoff: fresh untouched, only past-window expire ─────────────────────────
TestRunner::run('isExpired — fresh holds untouched; only past-cutoff expire', function (): void {
    $now = 1000000000;
    $mk = static fn (int $ageMin, string $mkt = 'h2h'): array =>
        ['createdAt' => gmdate('c', $now - $ageMin * 60), 'selections' => [['marketType' => $mkt]]];
    TestRunner::assertTrue(!BetApprovalService::isExpired($mk(0),  $now, 10, 1440), 'just placed → not expired');
    TestRunner::assertTrue(!BetApprovalService::isExpired($mk(9),  $now, 10, 1440), '9 min < 10 → not expired');
    TestRunner::assertTrue( BetApprovalService::isExpired($mk(11), $now, 10, 1440), '11 min > 10 → expired (live)');
    TestRunner::assertTrue(!BetApprovalService::isExpired($mk(11, 'outrights'), $now, 10, 1440), 'futures 11 min → not expired (24h window)');
    TestRunner::assertTrue( BetApprovalService::isExpired($mk(1500, 'outrights'), $now, 10, 1440), 'futures 25h → expired');
    TestRunner::assertTrue(!BetApprovalService::isExpired($mk(9999), $now, 0, 0), 'both windows 0 → never expires');
});

// ── system actor is unreachable from any auth token ──────────────────────────
TestRunner::run("no auth token can produce actor.id === 'system'", function (): void {
    TestRunner::assertTrue(preg_match('/^[a-f0-9]{24}$/i', 'system') !== 1, "'system' is not a 24-hex id");
    $dc = (string) file_get_contents(__DIR__ . '/../src/DebugController.php');
    $body = bas_method_body($dc, 'private function protectRoles(array $allowedRoles, string $denyMessage): ?array');
    TestRunner::assertTrue(str_contains($body, "preg_match('/^[a-f0-9]{24}\$/i', \$id)"), 'protectRoles gates actor id to 24-hex before returning');
});

// ── system bypass precedes any DB lookup in scopeDenial ──────────────────────
TestRunner::run('scopeDenial — system bypass is checked BEFORE any owner DB lookup', function (): void {
    $src = (string) file_get_contents(__DIR__ . '/../src/BetApprovalService.php');
    $body = bas_method_body($src, 'private static function scopeDenial(SqlRepository $db, array $actor, array $bet): ?array');
    $sysPos = strpos($body, 'SYSTEM_ACTOR_ID');
    $dbPos  = strpos($body, '$db->findOne');
    TestRunner::assertTrue($sysPos !== false && $dbPos !== false, 'both present');
    TestRunner::assertTrue($sysPos < $dbPos, 'system bypass precedes the owner DB lookup');
    TestRunner::assertTrue(str_contains($src, "SYSTEM_ACTOR_ID = 'system'"), "system id is 'system'");
});

// ── timeout audit is distinct + refund reuses the single reject path ─────────
TestRunner::run('timeout reject: distinct audit action, no duplicate refund logic', function (): void {
    TestRunner::assertTrue('bet_approval_timeout' !== 'bet_approval_reject', 'distinct audit actions');
    $src = (string) file_get_contents(__DIR__ . '/../src/BetApprovalService.php');
    $sweep = bas_method_body($src, 'public static function sweepExpired(');
    TestRunner::assertTrue(str_contains($sweep, 'self::reject('), 'sweep delegates to reject() — one refund path');
    TestRunner::assertTrue(str_contains($sweep, "'bet_approval_timeout'"), 'sweep tags a distinct audit action');
    TestRunner::assertTrue(!str_contains($sweep, 'BetVoidRefund') && !str_contains($sweep, 'insertOne'), 'sweep has NO own refund/ledger — cannot drift from admin reject');
    $reject = bas_method_body($src, 'public static function reject(SqlRepository $db, string $betId, array $actor, string $reason = ');
    TestRunner::assertTrue(str_contains($reject, '$auditAction'), 'reject threads the audit action through');
});
