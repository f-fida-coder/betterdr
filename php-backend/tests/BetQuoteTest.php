<?php

declare(strict_types=1);

/**
 * Pre-submit re-quote (Chunk 1). Locks the three guarantees the review-modal
 * quote depends on:
 *   1. quote == book — both BetsController::quoteBet and ::placeBet price a
 *      ticket through the SAME SportsbookBetSupport::pricedTicket, so the modal
 *      can never show a number the book won't honor. A future pricing change
 *      moves both together.
 *   2. reviewedQuote → 'exact' acceptance: an adverse late tick rejects
 *      (ODDS_CHANGED), a favorable one books better, an unchanged one books the
 *      quoted price — never silently worse.
 *   3. quoteBet is money-safe by construction: its source contains no balance /
 *      bet / ledger / requestId write.
 */

require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
// Real src autoloader so the interaction test can reflect BetsController's
// market resolution + use ManualOddsOverlay. No-op in the full suite.
require_once __DIR__ . '/../src/Autoloader.php';
if (!Autoloader::isRegistered()) {
    Autoloader::register(__DIR__ . '/../src');
}

function bq_sel(float $odds, string $matchId = 'm'): array
{
    return ['odds' => $odds, 'matchId' => $matchId, 'status' => 'pending'];
}
function bq_dec(int $american): float
{
    return $american > 0 ? 1.0 + $american / 100.0 : 1.0 + 100.0 / abs($american);
}

// ── 1. quote == book: pricedTicket is the single pricing source ──────────────
TestRunner::run('pricedTicket — payout/combined equal the raw book math (single source of truth)', function (): void {
    $rule = [];
    $legs = [bq_sel(2.0), bq_sel(1.5)]; // clean 2-leg parlay → 100 × 3.0 = 300
    $priced = SportsbookBetSupport::pricedTicket('parlay', 100.0, $legs, $rule);

    // Exactly what placeBet computes inline today (calculatePotentialPayout +
    // combinedOdds) — if pricedTicket ever wraps them differently, this fails.
    $expectPayout = SportsbookBetSupport::calculatePotentialPayout('parlay', 100.0, $legs, $rule);
    TestRunner::assertEqualsFloat($expectPayout, $priced['potentialPayout'], 'payout matches calculatePotentialPayout');
    TestRunner::assertEqualsFloat(300.0, $priced['potentialPayout'], 'concrete: 100 × 2.0 × 1.5 = 300');
    TestRunner::assertEqualsFloat(100.0, $priced['totalRisk'], 'risk = stake for a parlay');
    TestRunner::assertEqualsFloat(SportsbookBetSupport::combinedOdds(100.0, $expectPayout), $priced['combinedOdds'], 'combined = combinedOdds(risk, payout)');
    TestRunner::assertEqualsFloat(3.0, $priced['combinedOdds'], 'combined decimal 3.0 (= +200)');
});

TestRunner::run('pricedTicket — reverse doubles the risk basis, same as the book', function (): void {
    // reverse: totalRisk = 2 × stake (ticketRiskAmount), payout = stake × combined × 2.
    $priced = SportsbookBetSupport::pricedTicket('reverse', 50.0, [bq_sel(2.0), bq_sel(2.0)], []);
    TestRunner::assertEqualsFloat(100.0, $priced['totalRisk'], 'reverse risk = 2 × stake');
    TestRunner::assertEqualsFloat(
        SportsbookBetSupport::calculatePotentialPayout('reverse', 50.0, [bq_sel(2.0), bq_sel(2.0)], []),
        $priced['potentialPayout'],
        'reverse payout matches the book'
    );
});

TestRunner::run('pricedTicket — Win-mode pin matches the book (±$2 lock, else computed)', function (): void {
    $rule = [];
    $legs = [bq_sel(1.5714286), bq_sel(1.5263158)]; // non-round combined → drifts without a pin
    $computed = SportsbookBetSupport::calculatePotentialPayout('parlay', 1000.0, $legs, $rule);

    // requestedWin within ±$2 of computed → pinned to risk + requestedWin.
    $targetWin = round($computed - 1000.0) + 1; // 1 dollar off the computed win, inside the ±2 band
    $pinned = SportsbookBetSupport::pricedTicket('parlay', 1000.0, $legs, $rule, 0.0, 0.0, $targetWin);
    TestRunner::assertEqualsFloat(1000.0 + $targetWin, $pinned['potentialPayout'], 'within ±$2 → payout pinned to risk + requestedWin');

    // requestedWin wildly off (tamper) → NOT pinned, falls back to computed.
    $tamper = SportsbookBetSupport::pricedTicket('parlay', 1000.0, $legs, $rule, 0.0, 0.0, 999999);
    TestRunner::assertEqualsFloat($computed, $tamper['potentialPayout'], 'beyond ±$2 → ignored, computed payout stands');

    // No requestedWin → computed.
    $none = SportsbookBetSupport::pricedTicket('parlay', 1000.0, $legs, $rule);
    TestRunner::assertEqualsFloat($computed, $none['potentialPayout'], 'no requestedWin → computed payout');
});

// ── 2. reviewedQuote → 'exact' acceptance semantics ──────────────────────────
TestRunner::run('reviewedQuote exact policy — unchanged books, favorable books better, adverse rejects', function (): void {
    // Confirm carries the QUOTED price; the book reprices to current and gates
    // with policy 'exact'. This is the exact-or-better guarantee.
    $quoted = -120;
    // Unchanged: current == quoted → accepted (books the quoted price).
    TestRunner::assertTrue(SportsbookBetSupport::oddsAcceptable($quoted, -120, 'exact', 0), 'unchanged → books the quoted price');
    // Favorable: current pays MORE (−110 > −120 payout) → accepted (better).
    TestRunner::assertTrue(SportsbookBetSupport::oddsAcceptable($quoted, -110, 'exact', 0), 'favorable late tick → books better');
    // Adverse: current pays LESS (−130 < −120) → rejected → ODDS_CHANGED → re-quote.
    TestRunner::assertTrue(!SportsbookBetSupport::oddsAcceptable($quoted, -130, 'exact', 0), 'adverse late tick → rejected, never silently booked worse');
    // Even a 1-cent adverse move rejects under exact (the 10c silent band that
    // caused the original +210→+212 leak does NOT apply on a reviewed quote).
    TestRunner::assertTrue(!SportsbookBetSupport::oddsAcceptable(-120, -121, 'exact', 0), 'exact rejects even a within-band adverse move');
    // Sanity: the DEFAULT band policy WOULD have silently booked that −121 —
    // proving the reviewedQuote override is what closes the leak.
    TestRunner::assertTrue(SportsbookBetSupport::oddsAcceptable(-120, -121, 'band', 10), 'default band would silently book it (the leak we are closing)');
});

// ── Interaction: re-quote × admin line override ──────────────────────────────
// A player re-quoting a manually-overridden line must be priced at the OVERRIDE,
// never the stale feed — and Confirm's 'exact' policy then books that override
// (or better if it moved favorably; a release-during-review is just an adverse
// move → ODDS_CHANGED → re-quote). The quote reprices via the SAME resolution
// the book uses (validateSelection → collectMatchMarkets →
// canonicalizeOddsMarketsFromBookmakers), so proving that resolution surfaces
// the override proves the quote prices it.
TestRunner::run('re-quote prices a MANUALLY-OVERRIDDEN line (override, not the stale feed)', function (): void {
    $dec108 = SportsbookBetSupport::americanToDecimalExact(-108);
    // Admin override: Total → 9.5 at -108, materialized onto the book by the
    // overlay (feed was 8.5/-110).
    $doc = [
        'odds' => ['bookmakers' => [
            ['key' => 'pinnacle', 'markets' => [['key' => 'totals', 'outcomes' => [
                ['name' => 'Over',  'price' => 1.9091, 'point' => 8.5, 'pid' => null],
                ['name' => 'Under', 'price' => 1.9091, 'point' => 8.5, 'pid' => null],
            ]]]],
        ]],
        'manualOdds' => [
            ['market' => 'totals', 'name' => 'Over',  'point' => 9.5, 'price' => $dec108],
            ['market' => 'totals', 'name' => 'Under', 'point' => 9.5, 'price' => $dec108],
        ],
    ];
    $doc = ManualOddsOverlay::apply($doc);

    $resolve = new ReflectionMethod('BetsController', 'canonicalizeOddsMarketsFromBookmakers');
    $resolve->setAccessible(true);
    $canon = $resolve->invoke(null, $doc['odds'], false);
    $over = null;
    foreach (($canon['markets'] ?? []) as $mk) {
        if (strtolower((string) ($mk['key'] ?? '')) !== 'totals') continue;
        foreach (($mk['outcomes'] ?? []) as $o) {
            if (($o['name'] ?? '') === 'Over') $over = $o;
        }
    }
    TestRunner::assertTrue($over !== null, 'the quote resolves the overridden Over outcome');
    TestRunner::assertEquals(-108, SportsbookBetSupport::decimalToAmericanInt((float) $over['price']), 'quote prices the OVERRIDE (-108), NOT the feed (-110)');
    TestRunner::assertEquals(9.5, (float) $over['point'], 'quote carries the override point 9.5');

    // pricedTicket then combines the override-priced leg → the quoted payout
    // reflects the override, and differs from what the feed price would pay.
    $overridePriced = SportsbookBetSupport::pricedTicket('parlay', 100.0, [['odds' => (float) $over['price']]], []);
    $feedPriced = SportsbookBetSupport::pricedTicket('parlay', 100.0, [['odds' => 1.9091]], []);
    TestRunner::assertTrue(
        abs($overridePriced['potentialPayout'] - $feedPriced['potentialPayout']) > 1e-9,
        'the quoted payout is priced off the override, not the feed'
    );
});

// ── 3. quoteBet is money-safe by construction (no write in its source) ────────
TestRunner::run('quoteBet source contains no balance / bet / ledger / requestId write', function (): void {
    $src = (string) file_get_contents(__DIR__ . '/../src/BetsController.php');
    $start = strpos($src, 'private function quoteBet(): void');
    TestRunner::assertTrue($start !== false, 'quoteBet method found');
    $end = strpos($src, 'private function placeBet(): void', (int) $start);
    TestRunner::assertTrue($end !== false, 'quoteBet body bounded by the next method');
    $body = substr($src, (int) $start, (int) $end - (int) $start);

    foreach ([
        "insertOne(",              // no bets / transactions / betrequests / any insert
        "beginTransaction",        // no transaction
        "BalanceUpdateService",    // no balance mutation
        "insertOneIfAbsent",       // no idempotency doc
        "normalizeRequestId",      // no requestId consumed
        "->commit(",
    ] as $forbidden) {
        TestRunner::assertTrue(!str_contains($body, $forbidden), "quoteBet has NO '{$forbidden}' — read-only, money-safe");
    }
    // It must go through the shared pricer, not a private copy.
    TestRunner::assertTrue(str_contains($body, 'SportsbookBetSupport::pricedTicket'), 'quoteBet prices via the shared pricedTicket');
});
