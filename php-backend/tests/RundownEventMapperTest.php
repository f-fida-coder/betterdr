<?php

declare(strict_types=1);

/**
 * Integration tests for RundownEventMapper::toMatchDoc().
 *
 * Uses trimmed real Rundown payloads under tests/fixtures/rundown/ so a
 * mapping regression (forgetting a period market_id, mis-routing live
 * in-play to extendedMarkets, etc.) shows up as a failed assertion
 * instead of silently dropping odds in prod.
 *
 * Fixtures are trimmed to one event per file with two affiliates
 * (Pinnacle=3, DraftKings=19) and one line per market so the suite
 * stays under 100 KB total but still exercises every classification
 * route.
 */

require_once dirname(__DIR__) . '/src/RundownAffiliateMap.php';
require_once dirname(__DIR__) . '/src/RundownSportMap.php';
require_once dirname(__DIR__) . '/src/RundownMarketMap.php';
require_once dirname(__DIR__) . '/src/RundownEventMapper.php';

// SqlRepository::nowUtc() stub — the mapper only uses it to stamp
// lastUpdated/createdAt timestamps. Any deterministic string works.
if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return '2026-05-28T12:00:00+00:00'; }
    }
}

// Helper — collect every extendedMarkets key off a mapped doc.
function rmtExtendedKeys(array $doc): array
{
    $keys = [];
    foreach (($doc['extendedMarkets'] ?? []) as $m) {
        if (is_array($m) && isset($m['key'])) $keys[] = (string) $m['key'];
    }
    sort($keys);
    return $keys;
}

// Helper — collect every market key inside odds.bookmakers[].markets[].
function rmtBookmakerMarketKeys(array $doc): array
{
    $keys = [];
    foreach (($doc['odds']['bookmakers'] ?? []) as $b) {
        foreach (($b['markets'] ?? []) as $m) {
            if (is_array($m) && isset($m['key'])) $keys[(string) $m['key']] = true;
        }
    }
    $keys = array_keys($keys);
    sort($keys);
    return $keys;
}

function rmtLoad(string $name): array
{
    $path = __DIR__ . "/fixtures/rundown/{$name}.json";
    $raw  = file_get_contents($path);
    if ($raw === false) throw new RuntimeException("fixture missing: {$path}");
    $j = json_decode($raw, true);
    if (!is_array($j) || !isset($j['events'][0])) throw new RuntimeException("bad fixture: {$path}");
    return $j['events'][0];
}

// ── NBA (basketball) — quarters + halves ─────────────────────────────────

TestRunner::run('NBA: extendedMarkets includes h2h/spreads/totals for all quarters', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('nba_okc_at_san_antonio_scheduled'), 'basketball_nba');
    TestRunner::assertNotNull($doc, 'event mapped');
    $keys = rmtExtendedKeys($doc);
    foreach (['h2h_q1','spreads_q1','totals_q1',
              'h2h_q2','spreads_q2','totals_q2',
              'h2h_q3','spreads_q3','totals_q3',
              'h2h_q4','spreads_q4','totals_q4'] as $want) {
        TestRunner::assertTrue(in_array($want, $keys, true), "missing key: {$want}");
    }
});

TestRunner::run('NBA: extendedMarkets includes h2h/spreads/totals for both halves', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('nba_okc_at_san_antonio_scheduled'), 'basketball_nba');
    $keys = rmtExtendedKeys($doc);
    foreach (['h2h_h1','spreads_h1','totals_h1','h2h_h2','spreads_h2','totals_h2'] as $want) {
        TestRunner::assertTrue(in_array($want, $keys, true), "missing half key: {$want}");
    }
});

TestRunner::run('NBA: extendedMarkets does NOT contain any _7_innings garbage', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('nba_okc_at_san_antonio_scheduled'), 'basketball_nba');
    foreach (rmtExtendedKeys($doc) as $k) {
        TestRunner::assertFalse(str_contains($k, '_innings'), "leaked inning key on NBA event: {$k}");
        TestRunner::assertFalse(str_contains($k, '_set_'),    "leaked tennis-set key on NBA event: {$k}");
        TestRunner::assertFalse(str_contains($k, '_p1'),      "leaked hockey-period key on NBA event: {$k}");
    }
});

// ── MLB (baseball) — F1 / F3 / F5 / F7 inning markets ────────────────────

TestRunner::run('MLB: extendedMarkets uses _1st_N_innings suffix (matches frontend)', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('mlb_la_at_detroit_scheduled'), 'baseball_mlb');
    TestRunner::assertNotNull($doc, 'event mapped');
    $keys = rmtExtendedKeys($doc);
    // F5 (first half) — all three lines present in our fixture.
    foreach (['h2h_1st_5_innings','spreads_1st_5_innings','totals_1st_5_innings'] as $want) {
        TestRunner::assertTrue(in_array($want, $keys, true), "missing F5 key: {$want}");
    }
    // F3 + F7 — affiliates vary per-game; require at least one chip's
    // worth of each so the period strip lights up. Catches the regression
    // (no F3/F7 ever) without flaking when one bookmaker drops a price.
    $hasF3 = false; $hasF7 = false;
    foreach ($keys as $k) {
        if (str_contains($k, '_1st_3_innings')) $hasF3 = true;
        if (str_contains($k, '_1st_7_innings')) $hasF7 = true;
    }
    TestRunner::assertTrue($hasF3, 'no _1st_3_innings keys produced');
    TestRunner::assertTrue($hasF7, 'no _1st_7_innings keys produced');
});

TestRunner::run('MLB: no _5_innings / _7_innings keys (legacy bug)', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('mlb_la_at_detroit_scheduled'), 'baseball_mlb');
    foreach (rmtExtendedKeys($doc) as $k) {
        // Must always have the `_1st_` prefix — bare _N_innings is the old bug.
        if (str_contains($k, '_innings')) {
            TestRunner::assertTrue(str_contains($k, '_1st_'), "bare inning suffix leaked: {$k}");
        }
    }
});

TestRunner::run('MLB: no in-play / no _N_innings leaks into extendedMarkets', function (): void {
    // Defence-in-depth: even if Rundown ships in-play core markets
    // (41/42/43/96 with period_id=7), the mapper must never label them
    // as `_7_innings` or `_in_play` extras. The MLB regression that
    // caused this plan was exactly that leak.
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('mlb_la_at_detroit_scheduled'), 'baseball_mlb');
    foreach (rmtExtendedKeys($doc) as $k) {
        TestRunner::assertFalse(str_contains($k, '_in_play'), "in-play leaked to extendedMarkets: {$k}");
        // Bare _N_innings without _1st_ prefix = the legacy bug.
        if (str_contains($k, '_innings')) {
            TestRunner::assertTrue(str_contains($k, '_1st_'), "bare inning key leaked: {$k}");
        }
    }
});

// ── NHL (hockey) — periods use _pN, not _qN ──────────────────────────────

TestRunner::run('NHL: extendedMarkets uses _pN suffix (Rundown reuses "quarter" market_ids)', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('nhl_montreal_at_carolina_scheduled'), 'icehockey_nhl');
    TestRunner::assertNotNull($doc, 'event mapped');
    $keys = rmtExtendedKeys($doc);
    foreach (['h2h_p1','spreads_p1','totals_p1',
              'h2h_p2','spreads_p2','totals_p2',
              'h2h_p3','spreads_p3','totals_p3'] as $want) {
        TestRunner::assertTrue(in_array($want, $keys, true), "missing hockey period key: {$want}");
    }
});

TestRunner::run('NHL: no Q1-Q4 keys (basketball semantics must not leak)', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('nhl_montreal_at_carolina_scheduled'), 'icehockey_nhl');
    foreach (rmtExtendedKeys($doc) as $k) {
        TestRunner::assertFalse(str_contains($k, '_q4'), "leaked basketball Q4 on NHL event: {$k}");
        TestRunner::assertFalse(str_contains($k, '_innings'), "leaked MLB inning key on NHL event: {$k}");
    }
});

// ── Sanity: core bookmakers still populate normally ──────────────────────

TestRunner::run('core h2h/spreads/totals still land in odds.bookmakers for every fixture', function (): void {
    foreach (['nba_okc_at_san_antonio_scheduled','mlb_la_at_detroit_scheduled','nhl_montreal_at_carolina_scheduled'] as $name) {
        $doc = RundownEventMapper::toMatchDoc(rmtLoad($name));
        TestRunner::assertNotNull($doc, "{$name} mapped");
        $bk = rmtBookmakerMarketKeys($doc);
        TestRunner::assertTrue(in_array('h2h', $bk, true),     "{$name}: h2h missing in bookmakers");
        TestRunner::assertTrue(in_array('spreads', $bk, true), "{$name}: spreads missing in bookmakers");
        TestRunner::assertTrue(in_array('totals', $bk, true),  "{$name}: totals missing in bookmakers");
    }
});
