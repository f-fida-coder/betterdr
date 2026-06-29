<?php

declare(strict_types=1);

/**
 * Locks OutrightIngestService::buildOutrightDoc — the Rundown → `outrights`
 * mapper. The money-critical guarantee here is the SAME contract the placement
 * reader and the frontend depend on:
 *
 *   outcome.price is stored as the feed's RAW AMERICAN integer, NEVER decimal.
 *
 * If anyone "helpfully" runs the price through a decimal conversion in the
 * ingester, these assertions fail — and so would real payouts (a +450 stored
 * as 5.5 would be read back as American +5 / decimal 1.05, a ~90x payout cut;
 * a +450 stored as 44900 would over-pay ~100x). Pure: no DB, no HTTP.
 */

require_once __DIR__ . '/../src/OutrightIngestService.php';

/** Build a Rundown participant with a single line carrying one book's price. */
function ot_participant(string $name, int $american, int $affiliate = 18, bool $main = true): array
{
    return [
        'name' => $name,
        'type' => 'TYPE_PLAYER',
        'lines' => [[
            'value'  => '',
            'prices' => [
                (string) $affiliate => [
                    'price'        => $american,
                    'is_main_line' => $main,
                    'updated_at'   => '2026-06-28T00:00:00Z',
                ],
            ],
        ]],
    ];
}

function ot_event(array $participants, string $name = 'The Masters'): array
{
    return [
        'event_id'   => 'abc123def456',
        'sport_id'   => 6,
        'event_date' => '2026-04-09T16:00:00Z',
        'schedule'   => ['event_name' => $name],
        'markets'    => [[
            'market_id'    => 1141, // tournament_winner — Rundown's futures market
            'participants' => $participants,
        ]],
    ];
}

// ── Happy path: RAW American prices preserved verbatim ─────────────────────────
TestRunner::run('buildOutrightDoc — prices stay RAW American, doc shape correct', function (): void {
    $event = ot_event([
        ot_participant('Scottie Scheffler', 450),
        ot_participant('Rory McIlroy', 900),
        ot_participant('Jon Rahm', -150),
    ]);

    $doc = OutrightIngestService::buildOutrightDoc($event, 'golf_masters_tournament_winner');

    TestRunner::assertNotNull($doc, 'a 3-contender event yields a doc');
    TestRunner::assertEquals('golf_masters_tournament_winner', $doc['sportKey'], 'sportKey carried');
    TestRunner::assertEquals('abc123def456', $doc['eventId'], 'eventId carried');
    TestRunner::assertEquals('The Masters', $doc['eventName'], 'event name from schedule');
    TestRunner::assertEquals('open', $doc['status'], 'new outright opens as open');
    TestRunner::assertEquals(3, $doc['outcomeCount'], 'three contenders');

    $market = $doc['bookmakers'][0]['markets'][0];
    TestRunner::assertEquals('outrights', $market['key'], "market key is 'outrights' (readers match on this)");

    $byName = [];
    foreach ($market['outcomes'] as $o) {
        $byName[$o['name']] = $o['price'];
    }
    // The whole point: +450 is stored as the integer 450, NOT decimal 5.5 and
    // NOT inflated 44900. Same for the others, including the negative favorite.
    TestRunner::assertEquals(450, $byName['Scottie Scheffler'], '+450 stored as 450 (not 5.5, not 44900)');
    TestRunner::assertEquals(900, $byName['Rory McIlroy'], '+900 stored as 900');
    TestRunner::assertEquals(-150, $byName['Jon Rahm'], '-150 stored as -150');
});

// ── Cross-check: stored price round-trips through the placement reader cleanly ──
TestRunner::run('buildOutrightDoc — stored price feeds outrightPriceToOdds correctly', function (): void {
    require_once __DIR__ . '/../src/SportsbookBetSupport.php';
    $doc = OutrightIngestService::buildOutrightDoc(
        ot_event([ot_participant('Scottie Scheffler', 450), ot_participant('Rory McIlroy', 900)]),
        'golf_masters_tournament_winner'
    );
    $price = $doc['bookmakers'][0]['markets'][0]['outcomes'][0]['price'];
    $odds  = SportsbookBetSupport::outrightPriceToOdds($price);
    // The exact value the placement path will price the bet at.
    TestRunner::assertEquals(450, $odds['american'], 'reader sees +450');
    TestRunner::assertEqualsFloat(5.5, $odds['decimal'], 'reader derives decimal 5.5 — a $100 stake pays $450');
});

// ── A 0/1-outcome "market" is not a bettable board → null ──────────────────────
TestRunner::run('buildOutrightDoc — fewer than two contenders yields null', function (): void {
    $one = OutrightIngestService::buildOutrightDoc(ot_event([ot_participant('Lone Player', 200)]), 'golf_masters_tournament_winner');
    TestRunner::assertNull($one, 'single contender → null');

    $none = OutrightIngestService::buildOutrightDoc(ot_event([]), 'golf_masters_tournament_winner');
    TestRunner::assertNull($none, 'no contenders → null');
});

// ── Defensive: missing event id, blank sport key, non-winner markets ───────────
TestRunner::run('buildOutrightDoc — rejects unusable events', function (): void {
    $noId = ot_event([ot_participant('A', 100), ot_participant('B', 200)]);
    unset($noId['event_id']);
    TestRunner::assertNull(OutrightIngestService::buildOutrightDoc($noId, 'golf_masters_tournament_winner'), 'missing event_id → null');

    $okEvent = ot_event([ot_participant('A', 100), ot_participant('B', 200)]);
    TestRunner::assertNull(OutrightIngestService::buildOutrightDoc($okEvent, ''), 'blank sportKey → null');

    // A non-futures market (e.g. a prop, market_id 29) must NOT be read as an
    // outright board — those participants are not "to win" contenders.
    $propOnly = $okEvent;
    $propOnly['markets'][0]['market_id'] = 29;
    TestRunner::assertNull(OutrightIngestService::buildOutrightDoc($propOnly, 'golf_masters_tournament_winner'), 'non-futures market ignored → null');

    // CRITICAL regression guard: the MONEYLINE market (id 1) must NEVER be read
    // as an outright. A regular game's moneyline has two team participants; if
    // the ingester read market 1 it would mint a bogus 2-outcome "outright" for
    // every game on the board. Only tournament_winner (1141) is a real future.
    $gameMoneyline = $okEvent;
    $gameMoneyline['markets'][0]['market_id'] = 1;
    TestRunner::assertNull(OutrightIngestService::buildOutrightDoc($gameMoneyline, 'baseball_mlb'), 'moneyline (id 1) NOT ingested as outright → null');
});

// ── Book/main-line preference: a main-line price beats a non-main one ───────────
TestRunner::run('buildOutrightDoc — main-line price wins over non-main for same contender', function (): void {
    // Same player priced by two books: a non-main 600 and a main-line 450.
    $participant = [
        'name'  => 'Scottie Scheffler',
        'type'  => 'TYPE_PLAYER',
        'lines' => [[
            'value'  => '',
            'prices' => [
                '18' => ['price' => 600, 'is_main_line' => false],
                '3'  => ['price' => 450, 'is_main_line' => true],
            ],
        ]],
    ];
    $event = ot_event([$participant, ot_participant('Rory McIlroy', 900)]);
    $doc = OutrightIngestService::buildOutrightDoc($event, 'golf_masters_tournament_winner');

    $scheffler = null;
    foreach ($doc['bookmakers'][0]['markets'][0]['outcomes'] as $o) {
        if ($o['name'] === 'Scottie Scheffler') $scheffler = $o['price'];
    }
    TestRunner::assertEquals(450, $scheffler, 'main-line 450 chosen over non-main 600');
});

// ── Off-the-board sentinel and zero prices are skipped ─────────────────────────
TestRunner::run('buildOutrightDoc — off-board / zero prices dropped', function (): void {
    // One real contender + one off-board (-99999) → only 1 valid outcome → null.
    $event = ot_event([
        ot_participant('Real Player', 300),
        ot_participant('Off Board', -99999),
    ]);
    TestRunner::assertNull(OutrightIngestService::buildOutrightDoc($event, 'golf_masters_tournament_winner'), 'off-board price dropped, leaving <2 → null');
});
