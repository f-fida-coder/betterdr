<?php

declare(strict_types=1);

/**
 * Bet-approval CONFIG locks (Chunk 6). Source-scan tests (no DB):
 *   1. the per-agent threshold resolves from the 'agents' collection (the
 *      Chunk-2 bug where it read 'users' and silently returned null);
 *   2. the player force-flag / threshold are admin-only writable BY
 *      CONSTRUCTION — the agent user-update path writes no settings, and the
 *      settings-merging user endpoint is admin-gated;
 *   3. the per-agent threshold write in updateAgent is behind an admin check.
 */

require_once __DIR__ . '/TestRunner.php';

/** Slice a method body, bounded by the next method decl (unique helper name). */
function bac_method_body(string $src, string $sig): string
{
    $start = strpos($src, $sig);
    if ($start === false) return '';
    $rest = substr($src, $start + strlen($sig));
    $end = PHP_INT_MAX;
    foreach (["\n    private function ", "\n    public function ", "\n    protected function ", "\n    private static function ", "\n    public static function "] as $m) {
        $p = strpos($rest, $m);
        if ($p !== false) $end = min($end, $p);
    }
    return $end === PHP_INT_MAX ? $rest : substr($rest, 0, $end);
}

// 1) per-agent threshold resolves from the 'agents' collection (fixed bug) ────
TestRunner::run('approvalDecisionForUser reads the agent from agents, not users', function (): void {
    $src = (string) file_get_contents(__DIR__ . '/../src/BetsController.php');
    $body = bac_method_body($src, 'private function approvalDecisionForUser(array $userDoc, float $stake, float $payout): array');
    TestRunner::assertTrue($body !== '', 'method found');
    TestRunner::assertTrue(str_contains($body, "findOne('agents'"), 'agent read targets the agents collection');
    TestRunner::assertTrue(!str_contains($body, "findOne('users'"), 'no stray users read (was the silent bug)');
});

// 2) force-flag / player threshold are admin-only writable by construction ────
TestRunner::run('player approval settings are admin-only writable', function (): void {
    $agent = (string) file_get_contents(__DIR__ . '/../src/AgentController.php');
    $uc = bac_method_body($agent, 'private function updateCustomer(string $id): void');
    TestRunner::assertTrue($uc !== '', 'updateCustomer found');
    TestRunner::assertTrue(!str_contains($uc, "\$updates['settings']"), 'agent updateCustomer never writes settings → agents cannot flag players');

    $admin = (string) file_get_contents(__DIR__ . '/../src/AdminCoreController.php');
    $uba = bac_method_body($admin, 'private function updateUserByAdmin(string $id): void');
    TestRunner::assertTrue($uba !== '', 'updateUserByAdmin found');
    TestRunner::assertTrue(str_contains($uba, "protect(['admin'])"), 'the settings-merging user endpoint is admin-gated');
});

// 3) per-agent threshold write is admin-gated ────────────────────────────────
TestRunner::run('updateAgent applies betApprovalThreshold only for admin', function (): void {
    $admin = (string) file_get_contents(__DIR__ . '/../src/AdminCoreController.php');
    $ua = bac_method_body($admin, 'private function updateAgent(string $id): void');
    TestRunner::assertTrue($ua !== '', 'updateAgent found');
    $adminChk = strpos($ua, "\$actorRole === 'admin'");
    $write = strpos($ua, 'betApprovalThreshold');
    TestRunner::assertTrue($adminChk !== false && $write !== false, 'both admin check and threshold write present');
    TestRunner::assertTrue($adminChk < $write, 'admin check precedes the threshold write');
});
