<?php

declare(strict_types=1);

/**
 * Locks SqlRepository::mergeDocumentKeys — updateOne's partial-update
 * (top-level MERGE) semantics.
 *
 * WHY THIS TEST EXISTS (user-mandated 2026-07-05): the supplemental odds
 * feed persists namespaced card-market keys (cardMarkets /
 * cardMarketsSyncedAt / cardMarketsSource) on TheRundown-owned match docs
 * via updateOne. Card data surviving every Rundown re-sync depends ENTIRELY
 * on updateOne merging top-level keys rather than replacing the doc. If
 * that ever changes to replace semantics, card odds die silently in prod —
 * this suite fails loudly instead.
 *
 * ISOLATED SUITE: loads the REAL SqlRepository class (static pure method,
 * no DB touched), which would fatal-redeclare against the shared-process
 * test stubs — see ISOLATED_SUITES in run.php.
 */

require_once dirname(__DIR__) . '/src/SqlRepository.php';

/** A trimmed Rundown-shaped match doc, as upsertMatch would re-write it. */
function srmRundownSet(): array
{
    return [
        'externalId'     => 'rd-9001',
        'homeTeam'       => 'Arsenal',
        'awayTeam'       => 'Chelsea',
        'sportKey'       => 'soccer_epl',
        'status'         => 'scheduled',
        'oddsSource'     => 'therundown',
        'odds'           => ['bookmakers' => [['key' => 'pinnacle', 'markets' => [['key' => 'h2h', 'outcomes' => []]]]]],
        'extendedMarkets'=> [['key' => 'alternate_totals', 'outcomes' => []]],
        'lastOddsSyncAt' => '2026-07-05T13:00:00+00:00',
        'updatedAt'      => '2026-07-05T13:00:00+00:00',
    ];
}

TestRunner::run('merge lock: cardMarkets keys SURVIVE a Rundown-style full-doc update', function (): void {
    $existing = srmRundownSet();
    $existing['cardMarkets'] = [['key' => 'alternate_totals_cards', 'outcomes' => [['name' => 'Over', 'point' => 4.5, 'price' => 1.87]]]];
    $existing['cardMarketsSyncedAt'] = '2026-07-05T12:50:00+00:00';
    $existing['cardMarketsSource'] = 'theoddsapi';

    $incoming = srmRundownSet();
    $incoming['lastOddsSyncAt'] = '2026-07-05T13:05:00+00:00'; // fresher Rundown pass

    $merged = SqlRepository::mergeDocumentKeys($existing, $incoming);

    TestRunner::assertEquals('2026-07-05T13:05:00+00:00', $merged['lastOddsSyncAt'], 'Rundown keys update from the incoming doc');
    TestRunner::assertEquals(true, isset($merged['cardMarkets']), 'cardMarkets SURVIVES — the load-bearing guarantee');
    TestRunner::assertEquals(4.5, $merged['cardMarkets'][0]['outcomes'][0]['point'], 'card outcome data intact');
    TestRunner::assertEquals('2026-07-05T12:50:00+00:00', $merged['cardMarketsSyncedAt'], 'card freshness stamp intact');
    TestRunner::assertEquals('theoddsapi', $merged['cardMarketsSource'], 'card provider tag intact');
});

TestRunner::run('merge lock: the narrow card write cannot touch Rundown keys', function (): void {
    $existing = srmRundownSet();
    $cardSet = [
        'cardMarkets'         => [['key' => 'alternate_spreads_cards', 'outcomes' => []]],
        'cardMarketsSyncedAt' => '2026-07-05T13:10:00+00:00',
        'cardMarketsSource'   => 'theoddsapi',
    ];
    $merged = SqlRepository::mergeDocumentKeys($existing, $cardSet);

    foreach (srmRundownSet() as $k => $v) {
        TestRunner::assertEquals($v, $merged[$k], "Rundown key '{$k}' untouched by the card write");
    }
    TestRunner::assertEquals('theoddsapi', $merged['cardMarketsSource'], 'card keys landed');
});

TestRunner::run('merge lock: manualOdds (admin line override) SURVIVES a Rundown full-doc update', function (): void {
    // Ruling #1 core: an admin line override is stored as a top-level
    // manualOdds key, protected by the SAME merge discipline as cardMarkets —
    // the feed's $set never carries manualOdds, so a fresh sync cannot wipe it.
    // (RundownSyncService::carryForwardManualOdds then re-materializes it onto
    // the rebuilt odds; that overlay step is covered in ManualLineOverrideTest.)
    $existing = srmRundownSet();
    $existing['manualOdds'] = [[
        'market' => 'totals', 'name' => 'Over', 'point' => 9.5, 'price' => 1.9259,
        'feedPoint' => 8.5, 'feedPrice' => 1.9091, 'lockedBy' => 'admin1', 'lockedAt' => '2026-07-09T12:00:00+00:00',
    ]];

    $incoming = srmRundownSet();                                   // fresh feed, no manualOdds key
    $incoming['lastOddsSyncAt'] = '2026-07-05T13:05:00+00:00';

    $merged = SqlRepository::mergeDocumentKeys($existing, $incoming);

    TestRunner::assertEquals('2026-07-05T13:05:00+00:00', $merged['lastOddsSyncAt'], 'Rundown keys update from the incoming doc');
    TestRunner::assertEquals(true, isset($merged['manualOdds']), 'manualOdds SURVIVES the feed refresh — the override is never wiped');
    TestRunner::assertEquals(9.5, $merged['manualOdds'][0]['point'], 'override point intact');
});

TestRunner::run('merge lock: shared keys still overwrite (it is a merge, not a union)', function (): void {
    $merged = SqlRepository::mergeDocumentKeys(['a' => 1, 'b' => 2], ['b' => 3, 'c' => 4]);
    TestRunner::assertEquals(1, $merged['a'], 'absent-from-set key kept');
    TestRunner::assertEquals(3, $merged['b'], 'present-in-set key overwritten');
    TestRunner::assertEquals(4, $merged['c'], 'new key added');
});
