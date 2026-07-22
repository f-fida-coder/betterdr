<?php

declare(strict_types=1);

/**
 * Unit tests for OnboardingPolicy — the onboarding gate shared by /auth/me
 * (`onboarding` block) and BetsController (the 403 ONBOARDING_REQUIRED
 * placement gate). Pure decision logic, no DB.
 *
 * Locks the product contract (2026-07-17, extended 2026-07-22 for the
 * two-rule-set split):
 *  - applies to ALL player accounts, new AND existing — state is DERIVED
 *    from the user doc, so an existing account without defaults/acceptances
 *    is gated exactly like a fresh registration;
 *  - dismissing the UI can never complete onboarding (there is no
 *    completion flag to flip — only real doc fields change the state);
 *  - ALL THREE parts are required — defaults + House Rules + Platform
 *    Rules; any one missing keeps required=true and placement blocked;
 *  - a player who NEVER accepted a set is always gated (first-time
 *    onboarding), latch or no latch;
 *  - a version bump does NOT gate mid-session: an accepted-but-STALE stamp
 *    only re-gates once the rulesReAckPending latch is set (AuthController
 *    stamps it at next login) — and the latch flips the modal AND the
 *    placement 403 together, so UI gate and money gate never disagree.
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

$withPlatformAck = static fn (?int $version = null): array => [
    'rulesAck' => [
        'acknowledgedAt' => '2026-07-17T12:00:00+00:00',
        'version' => $version ?? OnboardingPolicy::RULES_VERSIONS[OnboardingPolicy::SET_PLATFORM],
    ],
];

$withHouseAck = static fn (?int $version = null): array => [
    'houseRulesAck' => [
        'acknowledgedAt' => '2026-07-22T12:00:00+00:00',
        'version' => $version ?? OnboardingPolicy::RULES_VERSIONS[OnboardingPolicy::SET_HOUSE],
    ],
];

$complete = static fn (): array => $withDefaults() + $withPlatformAck() + $withHouseAck();

// ── Gate shows for new AND existing incomplete accounts ─────────────────────────
TestRunner::run('state — fresh registration (no defaults, no acceptances) is fully gated', function () use ($player): void {
    $s = OnboardingPolicy::state($player());
    TestRunner::assertTrue($s['required'], 'required for a fresh account');
    TestRunner::assertTrue($s['needsDefaults'], 'needs defaults');
    TestRunner::assertTrue($s['needsHouseRulesAck'], 'needs house rules');
    TestRunner::assertTrue($s['needsPlatformRulesAck'], 'needs platform rules');
    TestRunner::assertTrue($s['needsRulesAck'], 'legacy aggregate mirrors the per-set flags');
    TestRunner::assertEquals(null, $s['rulesAcknowledgedAt'], 'no platform timestamp yet');
    TestRunner::assertEquals(null, $s['houseRulesAcceptedAt'], 'no house timestamp yet');
    TestRunner::assertTrue(OnboardingPolicy::placementBlocked($player()), 'placement blocked');
});

TestRunner::run('state — EXISTING account with settings but no betDefaults is gated like a new one', function () use ($player): void {
    $u = $player(['settings' => ['oddsFormat' => 'american', 'timezone' => 'America/Chicago']]);
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue($s['required'], 'existing account without defaults/acceptances is gated');
    TestRunner::assertTrue(OnboardingPolicy::placementBlocked($u), 'and blocked from placing');
});

// ── All three parts required — any missing keeps the gate up ────────────────────
TestRunner::run('state — pre-split complete account (defaults + platform ack) still owes House Rules', function () use ($player, $withDefaults, $withPlatformAck): void {
    // Every player onboarded before the two-set split looks like this: their
    // platform stamp stays VALID (no re-acceptance of the old content), but
    // the new House Rules set gates them — next placement 403s, gate shows
    // exactly one step.
    $u = $player($withDefaults() + $withPlatformAck());
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue(!$s['needsDefaults'], 'defaults step complete');
    TestRunner::assertTrue(!$s['needsPlatformRulesAck'], 'platform acceptance carried over');
    TestRunner::assertTrue($s['needsHouseRulesAck'], 'house rules step open');
    TestRunner::assertTrue($s['required'], 'still required overall');
    TestRunner::assertTrue(OnboardingPolicy::placementBlocked($u), 'placement still blocked');
});

TestRunner::run('state — house ack alone leaves defaults + platform open', function () use ($player, $withHouseAck): void {
    $u = $player($withHouseAck());
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue($s['needsDefaults'], 'defaults step still open');
    TestRunner::assertTrue(!$s['needsHouseRulesAck'], 'house step complete');
    TestRunner::assertTrue($s['needsPlatformRulesAck'], 'platform step still open');
    TestRunner::assertTrue($s['required'], 'still required overall');
    TestRunner::assertTrue(OnboardingPolicy::placementBlocked($u), 'placement still blocked');
});

TestRunner::run('state — ALL THREE parts complete → gate down, placement open', function () use ($player, $complete): void {
    $u = $player($complete());
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue(!$s['required'], 'onboarding complete');
    TestRunner::assertTrue(!$s['needsDefaults'], 'defaults done');
    TestRunner::assertTrue(!$s['needsHouseRulesAck'], 'house done');
    TestRunner::assertTrue(!$s['needsPlatformRulesAck'], 'platform done');
    TestRunner::assertTrue(!$s['needsRulesAck'], 'legacy aggregate clear');
    TestRunner::assertEquals('2026-07-17T12:00:00+00:00', $s['rulesAcknowledgedAt'], 'platform timestamp surfaced');
    TestRunner::assertEquals('2026-07-22T12:00:00+00:00', $s['houseRulesAcceptedAt'], 'house timestamp surfaced');
    TestRunner::assertTrue(!OnboardingPolicy::placementBlocked($u), 'placement allowed');
});

// ── Dismissing the UI cannot complete onboarding ────────────────────────────────
TestRunner::run('state — is purely doc-derived: no field, no completion (dismiss is a no-op)', function () use ($player): void {
    $before = OnboardingPolicy::state($player());
    $after = OnboardingPolicy::state($player());
    TestRunner::assertEquals($before, $after, 'no doc change → no state change');
    TestRunner::assertTrue($after['required'], 'still gated after a UI dismiss');
});

// ── Version-bump semantics: stale stamp + latch ─────────────────────────────────
TestRunner::run('version bump — stale stamp does NOT gate mid-session (no latch)', function () use ($player, $complete, $withPlatformAck): void {
    // Platform stamp from an older version (version 0 < current): the player
    // accepted SOMETHING, so first-time onboarding doesn't apply — and with
    // no login latch, neither the modal nor the placement gate may fire.
    $u = $player($complete() + [] );
    $u['rulesAck'] = $withPlatformAck(0)['rulesAck'];
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue(!$s['needsPlatformRulesAck'], 'stale platform stamp does not re-gate mid-session');
    TestRunner::assertTrue(!$s['required'], 'not required mid-session');
    TestRunner::assertTrue(!OnboardingPolicy::placementBlocked($u), 'placement NOT blocked mid-bet-slip');
    TestRunner::assertTrue(OnboardingPolicy::anySetStale($u), 'but the staleness is visible to the login stamper');
    TestRunner::assertTrue(!OnboardingPolicy::allSetsCurrent($u), 'and allSetsCurrent is false');
});

TestRunner::run('version bump — latch set at login re-gates modal AND placement together', function () use ($player, $complete, $withPlatformAck): void {
    $u = $player($complete());
    $u['rulesAck'] = $withPlatformAck(0)['rulesAck'];
    $u[OnboardingPolicy::REACK_FLAG] = true;
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue($s['needsPlatformRulesAck'], 'latched stale platform stamp re-gates');
    TestRunner::assertTrue(!$s['needsHouseRulesAck'], 'current house stamp unaffected by the latch');
    TestRunner::assertTrue($s['required'], 'required again');
    TestRunner::assertTrue(OnboardingPolicy::placementBlocked($u), 'placement blocked — same latch, same answer');
});

TestRunner::run('latch — stray latch with all sets current gates nothing (self-healing)', function () use ($player, $complete): void {
    // If the clear-on-accept ever failed, a leftover latch must be inert:
    // acceptanceCurrent short-circuits before the latch is consulted.
    $u = $player($complete());
    $u[OnboardingPolicy::REACK_FLAG] = true;
    TestRunner::assertTrue(!OnboardingPolicy::state($u)['required'], 'stray latch is inert when everything is current');
    TestRunner::assertTrue(!OnboardingPolicy::placementBlocked($u), 'placement open');
    TestRunner::assertTrue(OnboardingPolicy::allSetsCurrent($u), 'allSetsCurrent true → AuthController may clear the latch');
});

TestRunner::run('never-accepted is gated regardless of latch state (first-time onboarding)', function () use ($player, $withDefaults, $withPlatformAck): void {
    $u = $player($withDefaults() + $withPlatformAck());
    $u[OnboardingPolicy::REACK_FLAG] = false;
    TestRunner::assertTrue(OnboardingPolicy::state($u)['needsHouseRulesAck'], 'no house stamp → gated with latch false');
    TestRunner::assertTrue(OnboardingPolicy::placementBlocked($u), 'placement blocked');
});

// ── Defaults semantics ──────────────────────────────────────────────────────────
TestRunner::run('defaultsSet — requires BOTH unit sizes positive; legacy amount fallback honored', function () use ($player, $withDefaults): void {
    TestRunner::assertTrue(!OnboardingPolicy::defaultsSet($player($withDefaults(['straightDefault' => 0, 'amount' => 0]))), 'zero straight (no legacy) → not set');
    TestRunner::assertTrue(!OnboardingPolicy::defaultsSet($player($withDefaults(['parlayDefault' => 0, 'amount' => 0]))), 'zero parlay (no legacy) → not set');
    $legacy = $player(['settings' => ['betDefaults' => ['mode' => 'risk', 'amount' => 50]]]);
    TestRunner::assertTrue(OnboardingPolicy::defaultsSet($legacy), 'legacy amount covers both unit sizes');
    TestRunner::assertTrue(!OnboardingPolicy::defaultsSet($player(['settings' => ['betDefaults' => ['mode' => 'win']]])), 'mode alone is not enough');
});

// ── Per-set acceptance predicates ───────────────────────────────────────────────
TestRunner::run('acceptanceCurrent — versioned per set; malformed stamps never satisfy', function () use ($player, $withPlatformAck, $withHouseAck): void {
    TestRunner::assertTrue(OnboardingPolicy::acceptanceCurrent($player($withPlatformAck()), OnboardingPolicy::SET_PLATFORM), 'current platform stamp satisfies');
    TestRunner::assertTrue(OnboardingPolicy::acceptanceCurrent($player($withHouseAck()), OnboardingPolicy::SET_HOUSE), 'current house stamp satisfies');
    TestRunner::assertTrue(!OnboardingPolicy::acceptanceCurrent($player($withPlatformAck(0)), OnboardingPolicy::SET_PLATFORM), 'version 0 does not satisfy');
    TestRunner::assertTrue(!OnboardingPolicy::acceptanceCurrent($player(['rulesAck' => ['acknowledgedAt' => '2026-07-17T12:00:00+00:00']]), OnboardingPolicy::SET_PLATFORM), 'missing version does not satisfy');
    TestRunner::assertTrue(!OnboardingPolicy::acceptanceCurrent($player(['rulesAck' => ['version' => 1]]), OnboardingPolicy::SET_PLATFORM), 'version without timestamp does not satisfy');
    TestRunner::assertTrue(OnboardingPolicy::acceptanceCurrent($player($withPlatformAck(99)), OnboardingPolicy::SET_PLATFORM), 'future-version stamp still satisfies (no re-gate on rollback)');
    TestRunner::assertTrue(!OnboardingPolicy::acceptanceCurrent($player($withPlatformAck()), OnboardingPolicy::SET_HOUSE), 'platform stamp never satisfies the house set');
    // Immutability lives in AuthController::acknowledgeRules — it no-ops per
    // set when acceptanceCurrent is already true. This is the contract that
    // handler relies on: a satisfied stamp MUST read satisfied on re-check.
});

TestRunner::run('rulesAckSatisfied — legacy predicate tracks the PLATFORM set', function () use ($player, $withPlatformAck, $withHouseAck): void {
    TestRunner::assertTrue(OnboardingPolicy::rulesAckSatisfied($player($withPlatformAck())), 'platform stamp satisfies the legacy predicate');
    TestRunner::assertTrue(!OnboardingPolicy::rulesAckSatisfied($player($withHouseAck())), 'house stamp alone does not — pre-split meaning preserved');
});

TestRunner::run('isKnownSet — accepts exactly the two sets', function (): void {
    TestRunner::assertTrue(OnboardingPolicy::isKnownSet('house_rules'), 'house_rules known');
    TestRunner::assertTrue(OnboardingPolicy::isKnownSet('platform_rules'), 'platform_rules known');
    TestRunner::assertTrue(!OnboardingPolicy::isKnownSet(''), 'blank rejected');
    TestRunner::assertTrue(!OnboardingPolicy::isKnownSet('rules'), 'junk rejected');
});

// ── Payment apps step (new signups only; 2026-07-22) ────────────────────────────
$fullApps = static fn (array $extra = []): array => [
    'apps' => array_merge([
        'venmo' => '@fida', 'cashapp' => '$fida', 'applePay' => '555-1234',
        'zelle' => 'N/A', 'paypal' => 'fida@example.com', 'btc' => 'N/A',
    ], $extra),
];

TestRunner::run('payment apps — NEW signup (flag set) is gated until all six filled', function () use ($player, $complete, $fullApps): void {
    // Everything else done, flag set, apps missing → still gated.
    $u = $player($complete() + [OnboardingPolicy::PAYMENT_APPS_FLAG => true]);
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue($s['needsPaymentApps'], 'needs payment apps');
    TestRunner::assertTrue(!$s['paymentAppsComplete'], 'not complete');
    TestRunner::assertTrue($s['required'] && OnboardingPolicy::placementBlocked($u), 'gated + blocked');
    // Fill all six (N/A counts as an explicit answer) → gate down.
    $done = $player($complete() + $fullApps() + [OnboardingPolicy::PAYMENT_APPS_FLAG => true]);
    $s2 = OnboardingPolicy::state($done);
    TestRunner::assertTrue(!$s2['needsPaymentApps'] && $s2['paymentAppsComplete'], 'complete with N/A answers');
    TestRunner::assertTrue(!$s2['required'] && !OnboardingPolicy::placementBlocked($done), 'gate down');
});

TestRunner::run('payment apps — one blank field keeps a flagged account gated', function () use ($player, $complete, $fullApps): void {
    $u = $player($complete() + $fullApps(['zelle' => '  ']) + [OnboardingPolicy::PAYMENT_APPS_FLAG => true]);
    TestRunner::assertTrue(OnboardingPolicy::state($u)['needsPaymentApps'], 'whitespace-only zelle → still gated');
    $u2 = $player($complete() + $fullApps() + [OnboardingPolicy::PAYMENT_APPS_FLAG => true]);
    unset($u2['apps']['btc']);
    TestRunner::assertTrue(OnboardingPolicy::state($u2)['needsPaymentApps'], 'missing btc key → still gated');
});

TestRunner::run('payment apps — EXISTING players (no flag) are NEVER gated, only surfaced for the banner', function () use ($player, $complete): void {
    // The whole pre-existing player base looks like this after deploy:
    // no flag, no apps. Placement must stay open; paymentAppsComplete=false
    // is what drives the dismissible banner.
    $u = $player($complete());
    $s = OnboardingPolicy::state($u);
    TestRunner::assertTrue(!$s['needsPaymentApps'], 'no flag → never a gate step');
    TestRunner::assertTrue(!$s['paymentAppsComplete'], 'incomplete surfaced for the banner');
    TestRunner::assertTrue(!$s['required'] && !OnboardingPolicy::placementBlocked($u), 'placement open');
    // Malformed flag values fail OPEN — blocking an existing player is the
    // failure mode this flag exists to prevent.
    foreach (['true', 1, 'yes', null] as $junk) {
        $m = $player($complete() + [OnboardingPolicy::PAYMENT_APPS_FLAG => $junk]);
        TestRunner::assertTrue(!OnboardingPolicy::state($m)['needsPaymentApps'], 'non-boolean flag fails open');
    }
});

TestRunner::run('paymentAppsComplete — other/updatedAt never affect completeness', function () use ($player, $fullApps): void {
    $u = $player($fullApps(['other' => '', 'updatedAt' => '2026-07-22T13:00:00+00:00']));
    TestRunner::assertTrue(OnboardingPolicy::paymentAppsComplete($u), 'empty other + updatedAt ignored');
    TestRunner::assertTrue(!OnboardingPolicy::paymentAppsComplete($player()), 'no apps object → incomplete');
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
    $noRole = ['id' => 'u2'];
    TestRunner::assertTrue(OnboardingPolicy::state($noRole)['required'], 'missing role treated as player → gated');
});
