<?php

declare(strict_types=1);

/**
 * Admin line override — Chunk 1 (backend storage + precedence + settlement).
 *
 * Locks the load-bearing guarantees:
 *  - The overlay gate stamps the admin value onto EVERY book (display and
 *    placement each pick one preferred book, so all-books stamping is what
 *    stops them resolving different values), VERBATIM (never juice-rounded).
 *  - A feed refresh re-materializes the override instead of wiping it.
 *  - The live delta patcher refuses to repaint a source='manual' outcome, on
 *    BOTH the core (patchBookmakerOutcome) and period/alt
 *    (patchExtendedMarketOutcome) paths.
 *  - Settlement grades on the STORED overridden point.
 *  - Release restores the feed value.
 *
 * The manualOdds top-level key surviving the feed merge is covered separately
 * in SqlRepositoryMergeTest (which loads the real SqlRepository).
 */

// Register the real src/ autoloader so the settlement grading stack (a deep
// class chain behind selectionResult) resolves in an isolated run. No-op in the
// full suite where it's already registered.
require_once __DIR__ . '/../src/Autoloader.php';
if (!Autoloader::isRegistered()) {
    Autoloader::register(__DIR__ . '/../src');
}

// A two-book totals board at feed 8.5, DIFFERENT prices per book — proving the
// overlay flattens both to the admin value (so whichever book gets selected for
// display/placement reads the same number).
function mlo_totalsDoc(): array
{
    return [
        'odds' => ['bookmakers' => [
            ['key' => 'pinnacle', 'markets' => [['key' => 'totals', 'outcomes' => [
                ['name' => 'Over',  'price' => 1.9091, 'point' => 8.5, 'pid' => null],
                ['name' => 'Under', 'price' => 1.9091, 'point' => 8.5, 'pid' => null],
            ]]]],
            ['key' => 'draftkings', 'markets' => [['key' => 'totals', 'outcomes' => [
                ['name' => 'Over',  'price' => 1.8696, 'point' => 8.5, 'pid' => null], // ~ -115
                ['name' => 'Under', 'price' => 1.9524, 'point' => 8.5, 'pid' => null], // ~ +105
            ]]]],
        ]],
    ];
}

TestRunner::run('overlay: stamps EVERY book at the admin value, verbatim (no juice rounding)', function (): void {
    $dec108 = SportsbookBetSupport::americanToDecimalExact(-108); // -108 is OFF the 5-cent grid
    $doc = mlo_totalsDoc();
    $doc['manualOdds'] = [
        ['market' => 'totals', 'name' => 'Over',  'point' => 9.5, 'price' => $dec108],
        ['market' => 'totals', 'name' => 'Under', 'point' => 9.5, 'price' => $dec108],
    ];

    $out = ManualOddsOverlay::apply($doc);

    foreach ([0 => 'pinnacle', 1 => 'draftkings'] as $bi => $bookKey) {
        foreach ([0 => 'Over', 1 => 'Under'] as $oi => $name) {
            $o = $out['odds']['bookmakers'][$bi]['markets'][0]['outcomes'][$oi];
            TestRunner::assertEquals(9.5, $o['point'], "$bookKey $name point moved to the override");
            TestRunner::assertEquals('manual', $o['source'], "$bookKey $name tagged source=manual (delta guard marker)");
            // Verbatim: -108 stays -108. Grid rounding (had it run) would have
            // pushed it house-favorable to -110 — asserting -108 proves the
            // admin price is never re-rounded.
            TestRunner::assertEquals(-108, SportsbookBetSupport::decimalToAmericanInt((float) $o['price']), "$bookKey $name price is verbatim -108");
        }
    }
    // The whole point of all-books stamping: draftkings' original -115 Over is
    // gone — display and placement cannot resolve a different book's feed price.
    TestRunner::assertEquals(-108, SportsbookBetSupport::decimalToAmericanInt((float) $out['odds']['bookmakers'][1]['markets'][0]['outcomes'][0]['price']), 'the other book no longer carries its own feed price');
});

TestRunner::run('precedence: a feed refresh re-materializes the override, it is not wiped', function (): void {
    // Simulates the upsert flow: the fresh feed rebuilt odds at 8.5/-110 with NO
    // override, but manualOdds survived the merge. carryForwardManualOdds then
    // re-applies the overlay before the write — modelled here by apply().
    $dec108 = SportsbookBetSupport::americanToDecimalExact(-108);
    $fresh = [
        'odds' => ['bookmakers' => [['key' => 'pinnacle', 'markets' => [['key' => 'totals', 'outcomes' => [
            ['name' => 'Over',  'price' => 1.9091, 'point' => 8.5, 'pid' => null],
            ['name' => 'Under', 'price' => 1.9091, 'point' => 8.5, 'pid' => null],
        ]]]]]],
        'manualOdds' => [
            ['market' => 'totals', 'name' => 'Over',  'point' => 9.5, 'price' => $dec108],
            ['market' => 'totals', 'name' => 'Under', 'point' => 9.5, 'price' => $dec108],
        ],
    ];

    $out = ManualOddsOverlay::apply($fresh);
    $over = $out['odds']['bookmakers'][0]['markets'][0]['outcomes'][0];
    TestRunner::assertEquals(9.5, $over['point'], 'the freshly-synced feed line was overridden again');
    TestRunner::assertEquals(-108, SportsbookBetSupport::decimalToAmericanInt((float) $over['price']), 'override price survives the feed refresh');
});

TestRunner::run('delta guard: patchBookmakerOutcome refuses to repaint a source=manual line', function (): void {
    $ref = new ReflectionMethod('RundownSyncService', 'patchBookmakerOutcome');
    $ref->setAccessible(true);
    $locked = SportsbookBetSupport::americanToDecimalExact(-108);
    $bookmakers = [['key' => 'pinnacle', 'markets' => [['key' => 'totals', 'outcomes' => [
        ['name' => 'Over', 'price' => $locked, 'point' => 9.5, 'pid' => null, 'source' => 'manual'],
    ]]]]];
    // A feed delta for the SAME (name, point) that would normally patch the price.
    $result = $ref->invoke(null, $bookmakers, ['key' => 'pinnacle', 'name' => 'Pinnacle'], 'totals', 'Over', null, 9.5, ['name' => 'Over', 'price' => 1.75, 'point' => 9.5], '2026-07-09T12:00:00+00:00');
    TestRunner::assertEquals($locked, $result[0]['markets'][0]['outcomes'][0]['price'], 'core delta left the admin price untouched');
});

TestRunner::run('delta guard: patchExtendedMarketOutcome ALSO refuses (period/alt markets equally protected)', function (): void {
    $ref = new ReflectionMethod('RundownSyncService', 'patchExtendedMarketOutcome');
    $ref->setAccessible(true);
    $locked = SportsbookBetSupport::americanToDecimalExact(-108);
    $extended = [['key' => 'h1_totals', 'outcomes' => [
        ['name' => 'Over', 'price' => $locked, 'point' => 4.5, 'book' => 'pinnacle', 'pid' => null, 'source' => 'manual'],
    ]]];
    $result = $ref->invoke(null, $extended, ['key' => 'pinnacle', 'name' => 'Pinnacle'], 'h1_totals', 'Over', null, 4.5, ['name' => 'Over', 'price' => 1.75, 'point' => 4.5, 'book' => 'pinnacle']);
    TestRunner::assertEquals($locked, $result[0]['outcomes'][0]['price'], 'period/alt delta left the admin price untouched');
});

TestRunner::run('settlement: a bet grades on the STORED overridden point (total 8.5 → 9.5)', function (): void {
    // Final total = 9. On the feed line 8.5 an Over wins; on the admin override
    // 9.5 the SAME score loses. Settlement reads the bet's stored point, so the
    // override baked onto the bet at placement grades correctly.
    $m = ['homeTeam' => 'A', 'awayTeam' => 'B', 'status' => 'finished', 'score' => ['score_home' => 5, 'score_away' => 4]];
    $onFeed     = ['marketType' => 'totals', 'selection' => 'Over', 'point' => 8.5, 'status' => 'pending'];
    $onOverride = ['marketType' => 'totals', 'selection' => 'Over', 'point' => 9.5, 'status' => 'pending'];
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, $onFeed),     'Over 8.5 wins on a 9 total');
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, $onOverride), 'Over 9.5 loses on a 9 total — grades at the override');
});

TestRunner::run('release: restoreFeed puts the outcome back to the feed value and drops the manual tag', function (): void {
    $dec108 = SportsbookBetSupport::americanToDecimalExact(-108);
    $doc = mlo_totalsDoc();
    $doc['manualOdds'] = [['market' => 'totals', 'name' => 'Over', 'point' => 9.5, 'price' => $dec108]];
    $doc = ManualOddsOverlay::apply($doc); // stamp it first

    $released = [['market' => 'totals', 'name' => 'Over', 'feedPoint' => 8.5, 'feedPrice' => 1.9091]];
    $restored = ManualOddsOverlay::restoreFeed($doc, $released);

    $over = $restored['odds']['bookmakers'][0]['markets'][0]['outcomes'][0];
    TestRunner::assertEquals(8.5, $over['point'], 'point restored to the feed value');
    TestRunner::assertEquals(1.9091, $over['price'], 'price restored to the feed value');
    TestRunner::assertEquals(false, isset($over['source']), 'manual source tag removed');
});

// ── Chunk 2: placement wiring (no production code change — the override is
// already materialized onto odds; placement reads + freezes it) ──────────────

TestRunner::run('Chunk 2 — placement resolves + FREEZES the manual price, and the frozen bet grades on it', function (): void {
    // Materialize a totals override onto a two-book board (both books carry it,
    // so the preferred-book pick can only ever be the manual value).
    $dec108 = SportsbookBetSupport::americanToDecimalExact(-108);
    $doc = mlo_totalsDoc();
    $doc['manualOdds'] = [
        ['market' => 'totals', 'name' => 'Over',  'point' => 9.5, 'price' => $dec108],
        ['market' => 'totals', 'name' => 'Under', 'point' => 9.5, 'price' => $dec108],
    ];
    $doc = ManualOddsOverlay::apply($doc);

    // The SAME market resolution placement runs (BetsController::collectMatchMarkets
    // → canonicalizeOddsMarketsFromBookmakers → selectMarketsFromBookmakers).
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
    TestRunner::assertTrue($over !== null, 'placement resolved the totals Over outcome');
    TestRunner::assertEquals(9.5, $over['point'], 'resolved point is the override, not the feed 8.5');

    // Freeze exactly as validateSelection does: snapDecimalOdds → American int.
    // snapDecimalOdds only cleans float drift (no juice grid), so -108 survives.
    $frozenAmerican = SportsbookBetSupport::decimalToAmericanInt(
        SportsbookBetSupport::snapDecimalOdds((float) $over['price'])
    );
    TestRunner::assertEquals(-108, $frozenAmerican, 'the bet snapshot freezes the MANUAL -108, never a feed book price');

    // Settlement grades on that frozen point (total 9 loses on Over 9.5).
    $m   = ['homeTeam' => 'A', 'awayTeam' => 'B', 'status' => 'finished', 'score' => ['score_home' => 5, 'score_away' => 4]];
    $leg = ['marketType' => 'totals', 'selection' => 'Over', 'point' => 9.5, 'status' => 'pending'];
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, $leg), 'the frozen override point drives grading end-to-end');
});

// ── Chunk 4: buy-points on an overridden line is ABSENT — never priced off
// the stale feed ladder (v1 decision: disable buy-points on manual lines). ────

TestRunner::run('Chunk 4 — buy-points ladder is suppressed on an overridden line (present without the override)', function (): void {
    $_ENV['BUY_POINTS_ENABLED_SPORTS'] = 'tennis_atp';

    // A feed alt ladder that WOULD produce buy-down rungs (tennis is the pure
    // feed-anchored path). Same pool for both cases so the ONLY difference is
    // the source='manual' marker.
    $extended = [[
        'key' => 'alternate_spreads',
        'outcomes' => [
            ['name' => 'Chiefs', 'point' => -3.0, 'price' => 1.83, 'book' => 'pinnacle'],
            ['name' => 'Chiefs', 'point' => -2.5, 'price' => 1.74, 'book' => 'pinnacle'],
            ['name' => 'Chiefs', 'point' => -2.0, 'price' => 1.66, 'book' => 'pinnacle'],
        ],
    ]];
    $coreMarket = static fn (bool $manual): array => [[
        'key' => 'spreads',
        'outcomes' => [array_merge(
            ['name' => 'Chiefs', 'point' => -3.5, 'price' => 1.91],
            $manual ? ['source' => 'manual'] : []
        )],
    ]];

    $attach = new ReflectionMethod('MatchesController', 'attachBuyPointsLadders');
    $attach->setAccessible(true);

    // Control: NOT overridden → the feed produces a buy-points ladder.
    $plain = $attach->invoke(null, $coreMarket(false), 'tennis_atp', $extended);
    $plainHasLadder = !empty($plain[0]['outcomes'][0]['alternateLines'] ?? []);
    TestRunner::assertTrue($plainHasLadder, 'a NON-overridden line gets a feed buy-points ladder (control)');

    // Overridden → the SAME line + SAME feed pool produces NO ladder. The
    // override suppresses buy-points; it is never priced off the stale feed.
    $manual = $attach->invoke(null, $coreMarket(true), 'tennis_atp', $extended);
    $manualHasLadder = !empty($manual[0]['outcomes'][0]['alternateLines'] ?? []);
    TestRunner::assertTrue(!$manualHasLadder, 'an OVERRIDDEN line surfaces NO buy-points ladder — never off the stale feed');
});

TestRunner::run('Chunk 2 — ODDS_CHANGED band is source-agnostic across manual↔feed transitions', function (): void {
    // A released override, or a newly-set one, is just a line move to the
    // acceptance band — which only ever compares two American numbers.
    // Release: player holds manual -108, line snaps back to feed -115 (7c
    // adverse, same side) → within a 10c band → auto-books at -115.
    TestRunner::assertTrue(SportsbookBetSupport::oddsAcceptable(-108, -115, 'band', 10), 'release -108→-115 (7c) auto-accepts like any small move');
    // Bigger snap-back -108 → -125 (17c) → prompts the ODDS_CHANGED handshake.
    TestRunner::assertTrue(!SportsbookBetSupport::oddsAcceptable(-108, -125, 'band', 10), 'release -108→-125 (17c) prompts the handshake');
    // Set override while player holds the feed price: -115 → -108 is FAVORABLE
    // (higher payout) → always auto-accepts.
    TestRunner::assertTrue(SportsbookBetSupport::oddsAcceptable(-115, -108, 'band', 10), 'a favorable manual move auto-accepts');
    // A sign flip (e.g. a +120 slip vs a -110 override) is a big move → always
    // prompts, band or not — never silently booked.
    TestRunner::assertTrue(!SportsbookBetSupport::oddsAcceptable(120, -110, 'band', 10), 'a manual sign flip always prompts');
    // 'exact' policy players prompt on ANY manual↔feed change.
    TestRunner::assertTrue(!SportsbookBetSupport::oddsAcceptable(-108, -115, 'exact', 0), 'exact-policy players re-confirm on any manual move');
});
