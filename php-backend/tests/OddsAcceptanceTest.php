<?php

declare(strict_types=1);

/**
 * Unit tests for the odds-acceptance policy — SportsbookBetSupport::
 * oddsAcceptable() (pure decision) and resolveOddsAcceptance() (settings/env
 * resolution). No database, no HTTP, no PHPUnit required.
 *
 * oddsAcceptable returns true to AUTO-PLACE at the official odds, false to
 * PROMPT (return ODDS_CHANGED). Odds are signed American integers.
 */

if (!class_exists('Env')) {
    // Minimal stub: no env configured → callers fall back to their defaults.
    class Env
    {
        public static function get(string $key, ?string $default = null): ?string
        {
            return $default;
        }
    }
}

require_once __DIR__ . '/../src/SportsbookBetSupport.php';

$accept = static fn (int $c, int $o, string $p, int $b): bool =>
    SportsbookBetSupport::oddsAcceptable($c, $o, $p, $b);

// ── No movement / no client odds → always accept (never a spurious prompt) ──────
TestRunner::run('oddsAcceptable — no gate cases', function () use ($accept): void {
    TestRunner::assertTrue($accept(-110, -110, 'band', 0), 'identical odds accept');
    TestRunner::assertTrue($accept(0, -150, 'higher', 0), 'client sent no odds → accept');
    TestRunner::assertTrue($accept(0, -150, 'band', 0), 'no client odds, band → accept');
});

// ── Policy: any ─────────────────────────────────────────────────────────────────
TestRunner::run('oddsAcceptable — any', function () use ($accept): void {
    TestRunner::assertTrue($accept(-110, -2000, 'any', 0), 'huge adverse move still accepts');
    TestRunner::assertTrue($accept(150, 110, 'any', 0), 'dog shortened, still accepts');
});

// ── Policy: higher (accept only favorable) ──────────────────────────────────────
TestRunner::run('oddsAcceptable — higher', function () use ($accept): void {
    // -190 (dec 1.526) → -180 (dec 1.555): better payout for user → accept.
    TestRunner::assertTrue($accept(-190, -180, 'higher', 0), 'less juice → accept');
    // +150 (dec 2.5) → +170 (dec 2.7): bigger payout → accept.
    TestRunner::assertTrue($accept(150, 170, 'higher', 0), 'longer dog → accept');
    // -190 → -200: worse for user → prompt.
    TestRunner::assertFalse($accept(-190, -200, 'higher', 0), 'more juice → prompt');
    // +150 → +130: shorter dog (worse) → prompt.
    TestRunner::assertFalse($accept(150, 130, 'higher', 0), 'shorter dog → prompt');
});

// ── Policy: band (favorable always; adverse within N cents, same side) ──────────
TestRunner::run('oddsAcceptable — band', function () use ($accept): void {
    // Favorable always accepts regardless of size.
    TestRunner::assertTrue($accept(-190, -150, 'band', 10), 'favorable beyond band → accept');
    // Adverse within band (10 cents): -190 → -199 = 9 cents → accept (the bug case).
    TestRunner::assertTrue($accept(-190, -199, 'band', 10), 'adverse 9c within 10c band → accept');
    TestRunner::assertTrue($accept(-110, -120, 'band', 10), 'adverse exactly 10c → accept');
    // Adverse beyond band: -110 → -125 = 15 cents > 10 → prompt.
    TestRunner::assertFalse($accept(-110, -125, 'band', 10), 'adverse 15c beyond 10c band → prompt');
    // Positive side: +150 → +145 = 5 cents adverse within band → accept.
    TestRunner::assertTrue($accept(150, 145, 'band', 10), 'dog +5c adverse within band → accept');
    // Sign flip (crossed even money) is a large move → prompt even if int delta is small.
    TestRunner::assertFalse($accept(105, -105, 'band', 10), 'even-money sign flip → prompt');
    // Band of 0 behaves like "higher": any adverse prompts, favorable accepts.
    TestRunner::assertFalse($accept(-110, -111, 'band', 0), 'band 0, adverse → prompt');
    TestRunner::assertTrue($accept(-110, -109, 'band', 0), 'band 0, favorable → accept');
    // bandCents is clamped to the max so a giant value can't accept anything.
    TestRunner::assertFalse($accept(-110, -300, 'band', 999999), 'band clamped, huge adverse → prompt');
});

// ── Unknown policy → legacy exact-match (prompt on any change) ───────────────────
TestRunner::run('oddsAcceptable — unknown policy falls back to exact', function () use ($accept): void {
    TestRunner::assertFalse($accept(-110, -111, 'exact', 50), 'exact: adverse → prompt');
    // Favorable moves are accepted under EVERY policy — a better price for the
    // user is always money-safe, so even the legacy fallback never prompts on it.
    TestRunner::assertTrue($accept(-110, -109, 'exact', 50), 'exact: favorable → accept');
    TestRunner::assertFalse($accept(-110, -111, 'garbage', 50), 'garbage policy → prompt');
});

// ── resolveOddsAcceptance — settings override env defaults, clamped ──────────────
TestRunner::run('resolveOddsAcceptance', function (): void {
    // No settings → code defaults (band / 10).
    $d = SportsbookBetSupport::resolveOddsAcceptance(null);
    TestRunner::assertEquals('band', $d['policy'], 'default policy band');
    TestRunner::assertEquals(10, $d['bandCents'], 'default band 10');

    // Valid user override applies.
    $u = SportsbookBetSupport::resolveOddsAcceptance(['oddsAcceptance' => ['policy' => 'higher', 'bandCents' => 25]]);
    TestRunner::assertEquals('higher', $u['policy'], 'user policy override');
    TestRunner::assertEquals(25, $u['bandCents'], 'user band override');

    // Invalid policy ignored → keeps default; band clamped to max.
    $c = SportsbookBetSupport::resolveOddsAcceptance(['oddsAcceptance' => ['policy' => 'bogus', 'bandCents' => 999999]]);
    TestRunner::assertEquals('band', $c['policy'], 'invalid policy → default');
    TestRunner::assertEquals(SportsbookBetSupport::ODDS_ACCEPT_MAX_BAND_CENTS, $c['bandCents'], 'band clamped to max');
});
