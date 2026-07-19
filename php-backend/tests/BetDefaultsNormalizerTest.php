<?php

declare(strict_types=1);

/**
 * Unit tests for BetDefaultsNormalizer — the validation + normalization behind
 * PUT /api/auth/profile's settings.betDefaults (the betslip stake-mode / unit
 * defaults). Locks the Straight/Parlay mode split contract (PO 2026-07-19):
 *  - parlayMode is INDEPENDENT of the Straight mode;
 *  - parlayMode falls back to `mode` when omitted (pre-split accounts / old
 *    clients round-trip unchanged);
 *  - invalid modes are rejected (400), not silently coerced;
 *  - amounts stay whole-dollar clamped; quick stakes stay a 5-int row.
 *
 * Pure logic, no DB/HTTP.
 */

require_once __DIR__ . '/../src/BetDefaultsNormalizer.php';

// Backward-compat: an existing account with NO parlayMode.
TestRunner::run('backward-compat — parlayMode falls back to mode when omitted', function (): void {
    $res = BetDefaultsNormalizer::normalize([
        'mode' => 'win',
        'straightDefault' => 1000,
        'parlayDefault' => 100,
        // no parlayMode
    ]);
    TestRunner::assertTrue($res['ok'], 'accepted');
    TestRunner::assertEquals('win', $res['value']['mode'], 'straight mode preserved');
    TestRunner::assertEquals('win', $res['value']['parlayMode'], 'parlayMode inherits mode');
});

TestRunner::run('backward-compat — legacy amount-only payload still normalizes', function (): void {
    // Oldest client: only `mode` + `amount`. straight/parlay default to amount,
    // parlayMode defaults to mode.
    $res = BetDefaultsNormalizer::normalize(['mode' => 'risk', 'amount' => 250]);
    TestRunner::assertTrue($res['ok'], 'accepted');
    TestRunner::assertEquals('risk', $res['value']['parlayMode'], 'parlayMode = mode');
    TestRunner::assertEquals(250.0, $res['value']['straightDefault'], 'straight = amount');
    TestRunner::assertEquals(250.0, $res['value']['parlayDefault'], 'parlay = amount');
    TestRunner::assertEquals(250.0, $res['value']['amount'], 'legacy amount = straight');
});

// Independent save/load of both modes.
TestRunner::run('independent — straight and parlay modes stored separately', function (): void {
    $res = BetDefaultsNormalizer::normalize([
        'mode' => 'risk',
        'parlayMode' => 'win',
        'straightDefault' => 1000,
        'parlayDefault' => 100,
    ]);
    TestRunner::assertTrue($res['ok'], 'accepted');
    TestRunner::assertEquals('risk', $res['value']['mode'], 'straight = risk');
    TestRunner::assertEquals('win', $res['value']['parlayMode'], 'parlay = win (independent)');
});

TestRunner::run('independent — every mode combination round-trips', function (): void {
    foreach (['bet', 'risk', 'win'] as $m) {
        foreach (['bet', 'risk', 'win'] as $pm) {
            $res = BetDefaultsNormalizer::normalize(['mode' => $m, 'parlayMode' => $pm]);
            TestRunner::assertTrue($res['ok'], "accepted $m/$pm");
            TestRunner::assertEquals($m, $res['value']['mode'], "mode $m");
            TestRunner::assertEquals($pm, $res['value']['parlayMode'], "parlayMode $pm");
        }
    }
});

// Validation.
TestRunner::run('validation — invalid mode rejected', function (): void {
    $res = BetDefaultsNormalizer::normalize(['mode' => 'moon']);
    TestRunner::assertFalse($res['ok'], 'rejected');
    TestRunner::assertTrue(str_contains($res['error'], 'betDefaults.mode'), 'error names the field');
});

TestRunner::run('validation — invalid parlayMode rejected', function (): void {
    $res = BetDefaultsNormalizer::normalize(['mode' => 'risk', 'parlayMode' => 'lay']);
    TestRunner::assertFalse($res['ok'], 'rejected');
    TestRunner::assertTrue(str_contains($res['error'], 'parlayMode'), 'error names parlayMode');
});

TestRunner::run('validation — case-insensitive + trimmed', function (): void {
    $res = BetDefaultsNormalizer::normalize(['mode' => '  WIN ', 'parlayMode' => 'Bet']);
    TestRunner::assertTrue($res['ok'], 'accepted');
    TestRunner::assertEquals('win', $res['value']['mode'], 'mode lowered/trimmed');
    TestRunner::assertEquals('bet', $res['value']['parlayMode'], 'parlayMode lowered');
});

TestRunner::run('validation — over-cap amount rejected', function (): void {
    $res = BetDefaultsNormalizer::normalize(['mode' => 'risk', 'straightDefault' => 2000000]);
    TestRunner::assertFalse($res['ok'], 'rejected');
});

// Whole-dollar + shape.
TestRunner::run('normalization — amounts rounded to whole dollars, legacy tracks straight', function (): void {
    $res = BetDefaultsNormalizer::normalize([
        'mode' => 'risk', 'parlayMode' => 'win',
        'straightDefault' => 1000.6, 'parlayDefault' => 100.4,
    ]);
    TestRunner::assertTrue($res['ok'], 'accepted');
    TestRunner::assertEquals(1001.0, $res['value']['straightDefault'], 'straight rounded');
    TestRunner::assertEquals(100.0, $res['value']['parlayDefault'], 'parlay rounded');
    TestRunner::assertEquals(1001.0, $res['value']['amount'], 'legacy amount = straight');
});

TestRunner::run('normalization — quick stakes padded to exactly 5', function (): void {
    $res = BetDefaultsNormalizer::normalize(['mode' => 'risk', 'quickStakes' => [25, 500]]);
    TestRunner::assertTrue($res['ok'], 'accepted');
    TestRunner::assertEquals(5, count($res['value']['quickStakes']), 'exactly 5 chips');
});

// Onboarding shape (mode == parlayMode).
TestRunner::run('onboarding — mode==parlayMode payload accepted', function (): void {
    $res = BetDefaultsNormalizer::normalize([
        'mode' => 'win', 'parlayMode' => 'win',
        'straightDefault' => 1000, 'parlayDefault' => 100,
        'quickStakes' => [25, 500, 1000, 1500, 5000],
    ]);
    TestRunner::assertTrue($res['ok'], 'accepted');
    TestRunner::assertEquals('win', $res['value']['mode'], 'straight win');
    TestRunner::assertEquals('win', $res['value']['parlayMode'], 'parlay win');
});
