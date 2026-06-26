<?php

declare(strict_types=1);

/**
 * Regression test for the outright / futures odds-inflation bug.
 *
 * THE CONTRACT (must stay true): the `outrights` table's `price` field stores
 * the feed's AMERICAN odds (e.g. 450 = +450), NOT decimal like the matches
 * board. The placement reader (BetsController::validateOutrightSelection) and
 * the display reader (frontend OutrightsView) must both treat `price` as
 * American and convert American -> decimal exactly ONCE at the boundary.
 *
 * THE BUG (what this guards against): the old placement reader ran the decimal
 * pipeline on `price` — snapDecimalOdds() then decimalToAmericanInt() — which
 * treats the American number as decimal and inflates it ~100x. A real +450
 * Scheffler price became +44900 / decimal 450.0, so a $100 ticket would have
 * paid ~$45,000 instead of ~$450.
 *
 * SqlRepository is `final` and the suite runs with no live DB, so we can't fake
 * the db to drive the private validateOutrightSelection directly. Instead the
 * reader delegates its conversion to the pure SportsbookBetSupport::
 * outrightPriceToOdds() helper, and we lock that exact production code path
 * here. If anyone flips the interpretation back to "price is decimal" or
 * re-introduces the snap+decimalToAmericanInt double-conversion, these
 * assertions fail loudly.
 *
 * No database, no HTTP, no PHPUnit required.
 */

require_once __DIR__ . '/../src/SportsbookBetSupport.php';

// ── Placement reader: price 450 (American) -> decimal ~5.5 / American +450 ──────
TestRunner::run('outrightPriceToOdds — price is AMERICAN, converts once', function (): void {
    // Scheffler real feed price as stored in the outrights table.
    $official = SportsbookBetSupport::outrightPriceToOdds(450);

    // CORRECT: +450 American, decimal 5.5. A $100 stake pays $100*(5.5-1)=$450.
    TestRunner::assertEquals(450, $official['american'], '+450 stays +450 (not 44900)');
    TestRunner::assertEqualsFloat(5.5, $official['decimal'], 'decimal is 5.5 (not 450.0)');

    // WRONG (the inflation we removed): NOT decimal 450 / American 44900.
    TestRunner::assertFalse($official['american'] === 44900, 'never the inflated 44900');
    TestRunner::assertFalse(abs($official['decimal'] - 450.0) < 0.01, 'never the inflated 450.0 decimal');

    // String prices from the JSON doc must behave identically.
    $fromString = SportsbookBetSupport::outrightPriceToOdds('450');
    TestRunner::assertEquals(450, $fromString['american'], 'string "450" -> +450');
    TestRunner::assertEqualsFloat(5.5, $fromString['decimal'], 'string "450" -> decimal 5.5');
});

// ── A spread of real futures prices, incl. a favorite (negative American) ──────
TestRunner::run('outrightPriceToOdds — favorites and longshots', function (): void {
    // +900 longshot.
    $rory = SportsbookBetSupport::outrightPriceToOdds(900);
    TestRunner::assertEquals(900, $rory['american'], '+900 stays +900 (not 89900)');
    TestRunner::assertEqualsFloat(10.0, $rory['decimal'], '+900 -> decimal 10.0');

    // +1400.
    $rahm = SportsbookBetSupport::outrightPriceToOdds(1400);
    TestRunner::assertEquals(1400, $rahm['american'], '+1400 stays +1400 (not 139900)');
    TestRunner::assertEqualsFloat(15.0, $rahm['decimal'], '+1400 -> decimal 15.0');

    // -150 favorite: decimal 1.6667. Confirms the helper handles signed American.
    $fav = SportsbookBetSupport::outrightPriceToOdds(-150);
    TestRunner::assertEquals(-150, $fav['american'], '-150 stays -150');
    TestRunner::assertEqualsFloat(1.6667, $fav['decimal'], '-150 -> decimal ~1.667');
});

// ── Degenerate inputs fail safe (the reader rejects american===0) ──────────────
TestRunner::run('outrightPriceToOdds — invalid price yields american 0 / decimal 0', function (): void {
    $zero = SportsbookBetSupport::outrightPriceToOdds(0);
    TestRunner::assertEquals(0, $zero['american'], 'price 0 -> american 0 (reader throws INVALID_ODDS)');
    TestRunner::assertEqualsFloat(0.0, $zero['decimal'], 'price 0 -> decimal 0.0');

    $garbage = SportsbookBetSupport::outrightPriceToOdds('not-a-number');
    TestRunner::assertEquals(0, $garbage['american'], 'non-numeric -> american 0');
});

// ── Document the OLD bug so the inflated path can never be re-blessed as right ──
TestRunner::run('OLD inflation path is proven inflated — do NOT use it on price', function (): void {
    // This is exactly what the buggy reader did to an AMERICAN 450: feed it
    // through the DECIMAL pipeline. Asserting the inflated outputs here makes
    // the contract violation explicit — if someone re-wires the reader to this
    // composition, reviewers see precisely the ~100x error it produces.
    $buggyAmerican = SportsbookBetSupport::decimalToAmericanInt(
        SportsbookBetSupport::snapDecimalOdds(450.0)
    );
    TestRunner::assertEquals(44900, $buggyAmerican, 'decimal-pipeline on American 450 inflates to 44900');

    $buggyDecimal = SportsbookBetSupport::americanToDecimalExact($buggyAmerican);
    TestRunner::assertEqualsFloat(450.0, $buggyDecimal, 'and back to decimal 450.0 — the ~$45k payout');

    // The corrected helper must NOT match the buggy outputs for the same price.
    $correct = SportsbookBetSupport::outrightPriceToOdds(450);
    TestRunner::assertFalse($correct['american'] === $buggyAmerican, 'helper != buggy american');
    TestRunner::assertFalse(abs($correct['decimal'] - $buggyDecimal) < 0.01, 'helper != buggy decimal');
});

// ── Display reader parity (PHP mirror of the frontend americanToDecimal) ───────
// The frontend OutrightsView renders formatOdds(americanToDecimal(price)). The
// JS americanToDecimal uses the same formula as americanToDecimalExact, and
// formatOdds' american mode is decimalToAmerican (inverse). We can't run JS in
// the PHP suite, so we assert the round-trip the JS performs: American 450 ->
// decimal 5.5 -> back to American +450 (displayed), NOT +44900.
TestRunner::run('display reader round-trip — 450 shows +450, not +44900', function (): void {
    $decimal = SportsbookBetSupport::americanToDecimalExact(450); // mirrors JS americanToDecimal(450)
    TestRunner::assertEqualsFloat(5.5, $decimal, 'americanToDecimal(450) = 5.5');

    $displayedAmerican = SportsbookBetSupport::decimalToAmericanInt($decimal); // mirrors formatOdds american mode
    TestRunner::assertEquals(450, $displayedAmerican, 'formatOdds renders +450');
    TestRunner::assertFalse($displayedAmerican === 44900, 'display never shows +44900');
});
