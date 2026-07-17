<?php

declare(strict_types=1);

/**
 * Unit tests for OnboardingPolicy — the first-login onboarding gate shared
 * by /auth/me (`onboarding` block) and BetsController (the 403
 * ONBOARDING_REQUIRED placement gate). Pure decision logic, no DB.
 *
 * Locks the product contract (2026-07-17):
 *  - applies to ALL player accounts, new AND existing — state is DERIVED
 *    from the user doc, so an existing account without defaults/ack is
 *    gated exactly like a fresh registration;
 *  - dismissing the UI can never complete onboarding (there is no
 *    completion flag to flip — only real doc fields change the state);
 *  - BOTH steps are required — either one missing keeps required=true and
 *    keeps placement blocked (the stale-client backstop);
 *  - mid-flow resume: each step completes independently;
 *  - the ack is versioned — bumping RULES_VERSION re-gates everyone.
 */

require_once __DIR__ . '/../src/OnboardingPolicy.php';

// ── Fixture builders ────────────────────────────────────────────────────────────
$player = static fn (array $extra = []): array => array_merge([
    'id' => 'u1',
    'role' => 'user',
    'viewOnly' => false,
], $extra);

$withDefaults = static fn (array $bd = []): array => [
    'settings' => ['betDefaults' => array_merge([
        'mode' => 'risk',
        'amount' => 50,
        'straightDefault' => 50,
        'parlayDefault' => 25,
        'quickStakes' => [25, 500, 1000, 1500, 5000],
    ], $bd)],
];

$withAck = static fn (int $version = OnboardingPolicy::RULES_VERSION): array => [
    'rulesAck' => ['acknowledgedAt' => '2026-07-17T12:00:00+00:00', 'version' => $version],
];

// ── Gate shows for new AND existing incomplete accounts ─────────────────────────
TestRunner::run('state — fresh registration (no defaults, no ack) is fully gated', function () use ($player): void {
    $s = OnboardingPolicy::state($player());
    TestRunner::assertTrue($s['required'], 'required for a fresh account');
    TestRunner::assertTrue($s['needsDefaults'], 'needs defaults');
    TestRunner::assertTrue($s['needsRulesAck'], 'needs rules ack');
    TestRunner::assertEquals(null, $s['rulesAcknowledgedAt'], 'no ack timestamp yet');
    TestRunner::assertTrue(OnboardingPolicy::placementBlocked($player()), 'placement blocked');
});

TestRunner::run('state — EXISTING account with settings but no betDefaults is gated like a new one', function () use ($player): void {
    // Pre-feature accounts have settings (oddsFormat etc.) but no betDefaults
    // and no rulesAck — they must be gated on next login, per product decision.
    $u = $player(['settings' => ['oddsFormat' => 'american', 'timezone' => 'America/Chicago']]);
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue($s['required'], 'existing account without defaults/ack is gated');
    TestRunner::assertTrue(OnboardingPolicy::placementBlocked($u), 'and blocked from placing');
});

// ── Both steps required — either missing keeps the gate up ──────────────────────
TestRunner::run('state — defaults alone do NOT complete onboarding (no skip via step 1)', function () use ($player, $withDefaults): void {
    $u = $player($withDefaults());
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue(!$s['needsDefaults'], 'defaults step complete');
    TestRunner::assertTrue($s['needsRulesAck'], 'rules step still open');
    TestRunner::assertTrue($s['required'], 'still required overall');
    TestRunner::assertTrue(OnboardingPolicy::placementBlocked($u), 'placement still blocked — stale-client backstop');
});

TestRunner::run('state — ack alone does NOT complete onboarding (no skip via step 2)', function () use ($player, $withAck): void {
    $u = $player($withAck());
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue($s['needsDefaults'], 'defaults step still open');
    TestRunner::assertTrue(!$s['needsRulesAck'], 'rules step complete');
    TestRunner::assertTrue($s['required'], 'still required overall');
    TestRunner::assertTrue(OnboardingPolicy::placementBlocked($u), 'placement still blocked');
});

TestRunner::run('state — BOTH steps complete → gate down, placement open', function () use ($player, $withDefaults, $withAck): void {
    $u = $player($withDefaults() + $withAck());
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue(!$s['required'], 'onboarding complete');
    TestRunner::assertTrue(!$s['needsDefaults'], 'defaults done');
    TestRunner::assertTrue(!$s['needsRulesAck'], 'ack done');
    TestRunner::assertEquals('2026-07-17T12:00:00+00:00', $s['rulesAcknowledgedAt'], 'ack timestamp surfaced');
    TestRunner::assertTrue(!OnboardingPolicy::placementBlocked($u), 'placement allowed');
});

// ── Dismissing the UI cannot complete onboarding ────────────────────────────────
TestRunner::run('state — is purely doc-derived: no field, no completion (dismiss is a no-op)', function () use ($player): void {
    // The UI "dismiss" writes nothing to the doc — so the derived state is
    // byte-identical before and after. This is the property that makes a
    // dismissed (or stale) client unable to bet its way around the gate.
    $before = OnboardingPolicy::state($player());
    $after = OnboardingPolicy::state($player());
    TestRunner::assertEquals($before, $after, 'no doc change → no state change');
    TestRunner::assertTrue($after['required'], 'still gated after a UI dismiss');
});

// ── Mid-flow resume ─────────────────────────────────────────────────────────────
TestRunner::run('state — resume mid-flow lands on exactly the remaining step', function () use ($player, $withDefaults, $withAck): void {
    // Closed the browser after saving defaults → only the rules step remains.
    $s1 = OnboardingPolicy::state($player($withDefaults()));
    TestRunner::assertTrue(!$s1['needsDefaults'] && $s1['needsRulesAck'], 'defaults saved → resumes at rules step');
    // (Defensive inverse — can't happen via the UI flow order, but the state
    // must still be coherent if the doc says so.)
    $s2 = OnboardingPolicy::state($player($withAck()));
    TestRunner::assertTrue($s2['needsDefaults'] && !$s2['needsRulesAck'], 'ack present → resumes at defaults step');
});

// ── Defaults semantics ──────────────────────────────────────────────────────────
TestRunner::run('defaultsSet — requires BOTH unit sizes positive; legacy amount fallback honored', function () use ($player, $withDefaults): void {
    TestRunner::assertTrue(!OnboardingPolicy::defaultsSet($player($withDefaults(['straightDefault' => 0, 'amount' => 0]))), 'zero straight (no legacy) → not set');
    TestRunner::assertTrue(!OnboardingPolicy::defaultsSet($player($withDefaults(['parlayDefault' => 0, 'amount' => 0]))), 'zero parlay (no legacy) → not set');
    // Legacy single-`amount` accounts (saved before the straight/parlay split)
    // count as set — same fallback chain the betslip itself uses.
    $legacy = $player(['settings' => ['betDefaults' => ['mode' => 'risk', 'amount' => 50]]]);
    TestRunner::assertTrue(OnboardingPolicy::defaultsSet($legacy), 'legacy amount covers both unit sizes');
    TestRunner::assertTrue(!OnboardingPolicy::defaultsSet($player(['settings' => ['betDefaults' => ['mode' => 'win']]])), 'mode alone is not enough');
});

// ── Ack versioning + immutability contract ──────────────────────────────────────
TestRunner::run('rulesAckSatisfied — versioned: bumping RULES_VERSION re-gates everyone', function () use ($player, $withAck): void {
    TestRunner::assertTrue(OnboardingPolicy::rulesAckSatisfied($player($withAck())), 'current-version ack satisfies');
    TestRunner::assertTrue(!OnboardingPolicy::rulesAckSatisfied($player($withAck(0))), 'version 0 (pre-versioning) does not satisfy');
    TestRunner::assertTrue(!OnboardingPolicy::rulesAckSatisfied($player(['rulesAck' => ['acknowledgedAt' => '2026-07-17T12:00:00+00:00']])), 'missing version does not satisfy');
    TestRunner::assertTrue(!OnboardingPolicy::rulesAckSatisfied($player(['rulesAck' => ['version' => OnboardingPolicy::RULES_VERSION]])), 'version without timestamp does not satisfy');
    TestRunner::assertTrue(OnboardingPolicy::rulesAckSatisfied($player($withAck(OnboardingPolicy::RULES_VERSION + 1))), 'future-version ack still satisfies (no re-gate on rollback)');
    // Immutability lives in AuthController::acknowledgeRules — it no-ops when
    // rulesAckSatisfied is already true. This assertion is the contract that
    // handler relies on: a satisfied ack MUST read satisfied on re-check.
});

// ── Role / account-type exemptions ──────────────────────────────────────────────
TestRunner::run('exemptions — only real player accounts are gated', function () use ($player): void {
    foreach (['admin', 'agent', 'super_agent', 'master_agent'] as $role) {
        $u = ['id' => 'a1', 'role' => $role];
        TestRunner::assertTrue(!OnboardingPolicy::state($u)['required'], "$role is never gated");
        TestRunner::assertTrue(!OnboardingPolicy::placementBlocked($u), "$role never placement-blocked");
    }
    $viewOnly = $player(['viewOnly' => true]);
    TestRunner::assertTrue(!OnboardingPolicy::state($viewOnly)['required'], 'viewOnly accounts (cannot bet) are exempt');
    // Missing role defaults to 'user' — the registration seed always sets it,
    // but a malformed doc must fail CLOSED (gated), not open.
    $noRole = ['id' => 'u2'];
    TestRunner::assertTrue(OnboardingPolicy::state($noRole)['required'], 'missing role treated as player → gated');
});
