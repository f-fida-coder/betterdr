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

// getenv-backed Env stub (the mapper reads flat-juice/preferred-books envs;
// shared run.php gets Env from an earlier suite, standalone runone needs it).
if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, ?string $default = null): ?string
        {
            $v = getenv($key);
            return $v === false ? $default : $v;
        }
    }
}
require_once dirname(__DIR__) . '/src/SportsMatchStatus.php';
// Quarter-line promotion helpers live here (soccer spread/total suites) —
// loaded by an earlier suite in the shared process, needed for runone.
require_once dirname(__DIR__) . '/src/SportsbookBetSupport.php';

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

TestRunner::run('team identity: short canonical stays city, full = "City Mascot", team_id stored', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('mlb_la_at_detroit_scheduled'), 'baseball_mlb');
    TestRunner::assertNotNull($doc, 'event mapped');
    // SHORT canonical (match key) is the city/location, unchanged.
    TestRunner::assertEquals('Detroit', $doc['homeTeam'], 'homeTeam stays short city');
    TestRunner::assertEquals('Los Angeles', $doc['awayTeam'], 'awayTeam stays short city');
    // DISPLAY full name = "City Mascot", derived from the feed.
    TestRunner::assertEquals('Detroit Tigers', $doc['homeTeamFull'], 'homeTeamFull = City Mascot');
    TestRunner::assertEquals('Los Angeles Angels', $doc['awayTeamFull'], 'awayTeamFull = City Mascot');
    // Stable team_id captured for id-anchored display/audit.
    TestRunner::assertEquals('53', (string) $doc['homeTeamId'], 'homeTeamId');
    TestRunner::assertEquals('57', (string) $doc['awayTeamId'], 'awayTeamId');
    // Outcome names remain the SHORT canonical (so placement/settlement still
    // match) — the full name lives only on the team display fields.
    $found = false;
    foreach (($doc['odds']['bookmakers'] ?? []) as $bk) {
        foreach (($bk['markets'] ?? []) as $mk) {
            foreach (($mk['outcomes'] ?? []) as $o) {
                if (($o['name'] ?? '') === 'Detroit Tigers') $found = true;
            }
        }
    }
    TestRunner::assertFalse($found, 'no outcome carries the full name — outcomes stay short');
});

TestRunner::run('MLB: extendedMarkets uses _1st_N_innings suffix (matches frontend)', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('mlb_la_at_detroit_scheduled'), 'baseball_mlb');
    TestRunner::assertNotNull($doc, 'event mapped');
    $keys = rmtExtendedKeys($doc);
    // F5 (first half) — all three lines present in our fixture.
    foreach (['h2h_1st_5_innings','spreads_1st_5_innings','totals_1st_5_innings'] as $want) {
        TestRunner::assertTrue(in_array($want, $keys, true), "missing F5 key: {$want}");
    }
    // F3 + F7 — removed per product decision 2026-07-06 (board offers
    // Game/F1/F5 only; ids 1109-1114 dropped from PERIOD_MARKETS). The
    // fixture still carries their price rows, so this asserts the mapper
    // now DROPS them instead of emitting keys nobody can reach.
    $hasF3 = false; $hasF7 = false;
    foreach ($keys as $k) {
        if (str_contains($k, '_1st_3_innings')) $hasF3 = true;
        if (str_contains($k, '_1st_7_innings')) $hasF7 = true;
    }
    TestRunner::assertFalse($hasF3, '_1st_3_innings keys produced despite F3 removal');
    TestRunner::assertFalse($hasF7, '_1st_7_innings keys produced despite F7 removal');
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

// ── Odds format: outcome.price must be DECIMAL, not American ──────────────
// Regression guard for the money bug where Rundown's American prices
// (-110, +165) were stored raw. The whole platform (display, betslip,
// BetsController pricing, settlement) treats outcome.price as DECIMAL, so
// American storage rejected every favorite (-110 -> "invalid odds") and
// mispriced underdogs catastrophically.

TestRunner::run('priceToDecimal: American odds convert to the decimal format every consumer expects', function (): void {
    $ref = new ReflectionMethod(RundownEventMapper::class, 'priceToDecimal');
    $approx = static fn (float $a, float $b): bool => abs($a - $b) < 1e-6;
    TestRunner::assertTrue($approx($ref->invoke(null, -110.0), 1.0 + 100.0 / 110.0), '-110 -> ~1.9091');
    TestRunner::assertTrue($approx($ref->invoke(null, 165.0), 2.65), '+165 -> 2.65');
    TestRunner::assertTrue($approx($ref->invoke(null, 100.0), 2.0),  '+100 -> 2.0');
    TestRunner::assertTrue($approx($ref->invoke(null, -100.0), 2.0), '-100 -> 2.0');
    TestRunner::assertTrue($approx($ref->invoke(null, -200.0), 1.5), '-200 -> 1.5');
    // Round-trip: the decimal must map back to the same American integer the
    // bet engine derives (decimalToAmericanInt). This is what keeps
    // ODDS_CHANGED validation and payout math correct.
    foreach ([-110, -160, 100, 130, 165, 240, -200] as $am) {
        $dec  = (float) $ref->invoke(null, (float) $am);
        $back = $dec >= 2.0 ? (int) round(($dec - 1.0) * 100.0) : (int) round(-100.0 / ($dec - 1.0));
        TestRunner::assertEquals($am, $back, "round-trip American {$am} via decimal {$dec}");
    }
});

TestRunner::run('mapped odds.price is DECIMAL across every fixture (favorites land in 1.0-2.0)', function (): void {
    $prices = [];
    foreach (['nba_okc_at_san_antonio_scheduled','mlb_la_at_detroit_scheduled','nhl_montreal_at_carolina_scheduled'] as $name) {
        $doc = RundownEventMapper::toMatchDoc(rmtLoad($name));
        TestRunner::assertNotNull($doc, "{$name} mapped");
        foreach (($doc['odds']['bookmakers'] ?? []) as $b) {
            foreach (($b['markets'] ?? []) as $m) {
                foreach (($m['outcomes'] ?? []) as $o) {
                    if (isset($o['price'])) $prices[] = (float) $o['price'];
                }
            }
        }
    }
    TestRunner::assertTrue(count($prices) > 0, 'core outcome prices present');
    $hasFavoriteDecimal = false;
    foreach ($prices as $p) {
        // True decimal odds are always > 1.0. Raw American storage would
        // include negatives (-110) which fail this immediately.
        TestRunner::assertTrue($p > 1.0, "price not decimal (<=1.0): {$p}");
        if ($p > 1.0 && $p < 2.0) $hasFavoriteDecimal = true;
    }
    // A favorite (American negative) maps into (1.0, 2.0). If storage were
    // still American, no price would ever fall in that band.
    TestRunner::assertTrue($hasFavoriteDecimal, 'no favorite price in (1.0, 2.0) — conversion not applied');
});

// ── Live in-play core supersedes the stale pre-match line ────────────────
// Regression for the "NYY +1 while up 8-1" bug: pre-match spreads (market 2)
// and live spreads (market 42) share the 'spreads' key. They were appended
// into one outcome list and the frontend rendered the FIRST match — the dead
// pre-match number. Live must fully supersede pre-match for the same market.

function rmtSyntheticMlbEvent(bool $withLive): array
{
    $mk = function (int $marketId, int $periodId, float $nyPoint, int $nyPrice, float $oaPoint, int $oaPrice, int $idBase): array {
        return [
            'market_id' => $marketId,
            'period_id' => $periodId,
            'participants' => [
                ['name' => 'New York Yankees', 'type' => 'TYPE_TEAM', 'id' => 1001, 'lines' => [
                    ['value' => (string) $nyPoint, 'prices' => ['3' => ['price' => $nyPrice, 'is_main_line' => true, 'id' => $idBase + 1, 'updated_at' => '2026-05-30T02:00:00Z']]],
                ]],
                ['name' => 'Athletics', 'type' => 'TYPE_TEAM', 'id' => 1002, 'lines' => [
                    ['value' => (string) $oaPoint, 'prices' => ['3' => ['price' => $oaPrice, 'is_main_line' => true, 'id' => $idBase + 2, 'updated_at' => '2026-05-30T02:00:00Z']]],
                ]],
            ],
        ];
    };
    $markets = [$mk(2, 0, 1.0, -223, -1.5, 206, 5000)];          // pre-match spreads
    if ($withLive) {
        $markets[] = $mk(42, 7, -6.5, -282, 6.5, 205, 6000);     // live spreads
    }
    return [
        'event_id' => 'synthetic-nyy-oak-live',
        'sport_id' => 3,
        'teams' => [
            ['name' => 'Athletics', 'is_home' => true],
            ['name' => 'New York Yankees', 'is_away' => true],
        ],
        'score' => ['event_status' => 'STATUS_INPROGRESS'],
        'schedule' => ['event_name' => 'New York Yankees at Athletics'],
        'markets' => $markets,
    ];
}

// name => point map for the 'spreads' market on the first bookmaker.
function rmtSpreadsByTeam(array $doc): array
{
    $out = [];
    foreach (($doc['odds']['bookmakers'][0]['markets'] ?? []) as $m) {
        if (($m['key'] ?? '') !== 'spreads') continue;
        foreach (($m['outcomes'] ?? []) as $o) {
            $out[(string) ($o['name'] ?? '')][] = $o; // list per team to detect dupes
        }
    }
    return $out;
}

TestRunner::run('live spreads fully supersede the stale pre-match line', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtSyntheticMlbEvent(true), 'baseball_mlb');
    TestRunner::assertNotNull($doc, 'doc should map');
    $byTeam = rmtSpreadsByTeam($doc);

    // Exactly one outcome per team — no pre-match/live duplication.
    TestRunner::assertEquals(1, count($byTeam['New York Yankees'] ?? []), 'NYY should have exactly one spread outcome');
    TestRunner::assertEquals(1, count($byTeam['Athletics'] ?? []), 'Athletics should have exactly one spread outcome');

    // The surviving line is the LIVE one (-6.5 / +6.5), not the dead +1 / -1.5.
    TestRunner::assertEqualsFloat(-6.5, (float) $byTeam['New York Yankees'][0]['point'], 'NYY spread must be the live -6.5');
    TestRunner::assertEqualsFloat(6.5, (float) $byTeam['Athletics'][0]['point'], 'Athletics spread must be the live +6.5');
});

TestRunner::run('pre-match spreads survive when no live variant is present', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtSyntheticMlbEvent(false), 'baseball_mlb');
    TestRunner::assertNotNull($doc, 'doc should map');
    $byTeam = rmtSpreadsByTeam($doc);
    TestRunner::assertEquals(1, count($byTeam['New York Yankees'] ?? []), 'NYY should have exactly one spread outcome');
    TestRunner::assertEqualsFloat(1.0, (float) $byTeam['New York Yankees'][0]['point'], 'pre-match NYY spread preserved');
});

// ── Team totals — structured fields, teamSide anchor, alt routing ────────
// Rundown packs direction+line into line.value ("Over 4.5") and makes the
// TEAM the participant. The mapper must emit structured {team,teamSide,
// side,point} (name is display-only), anchor each team to home/away by
// team_id, route MAIN lines to the 'team_totals' board, and STORE non-main
// rungs under alternate_team_totals (not surfaced on the board yet).

function rmtTeamTotalEvent(): array
{
    return [
        'event_id' => 'synthetic-tt',
        'sport_id' => 3,
        'teams' => [
            ['name' => 'Detroit', 'team_id' => 53, 'is_home' => true],
            ['name' => 'Los Angeles', 'team_id' => 57, 'is_away' => true],
        ],
        'score' => ['event_status' => 'STATUS_SCHEDULED'],
        'schedule' => ['event_name' => 'Los Angeles at Detroit'],
        'markets' => [[
            'market_id' => 94,
            'period_id' => 0,
            'participants' => [
                ['name' => 'Detroit Tigers', 'type' => 'TYPE_TEAM', 'id' => 53, 'lines' => [
                    ['value' => 'Over 4.5',  'prices' => ['3' => ['price' => -110, 'is_main_line' => true,  'id' => 7001, 'updated_at' => '2026-05-30T02:00:00Z']]],
                    ['value' => 'Under 4.5', 'prices' => ['3' => ['price' => -110, 'is_main_line' => true,  'id' => 7002, 'updated_at' => '2026-05-30T02:00:00Z']]],
                    ['value' => 'Over 3.5',  'prices' => ['3' => ['price' => -200, 'is_main_line' => false, 'id' => 7003, 'updated_at' => '2026-05-30T02:00:00Z']]],
                ]],
                ['name' => 'Los Angeles Angels', 'type' => 'TYPE_TEAM', 'id' => 57, 'lines' => [
                    ['value' => 'Over 4.5',  'prices' => ['3' => ['price' => 105, 'is_main_line' => true,  'id' => 7011, 'updated_at' => '2026-05-30T02:00:00Z']]],
                ]],
            ],
        ]],
    ];
}

// Collect the 'team_totals' board outcomes off the first bookmaker.
function rmtTeamTotalsBoard(array $doc): array
{
    foreach (($doc['odds']['bookmakers'][0]['markets'] ?? []) as $m) {
        if (($m['key'] ?? '') === 'team_totals') return $m['outcomes'] ?? [];
    }
    return [];
}

TestRunner::run('team totals: parsed into structured side/point with home/away anchor', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtTeamTotalEvent(), 'baseball_mlb');
    TestRunner::assertNotNull($doc, 'event mapped');
    $board = rmtTeamTotalsBoard($doc);
    // Three MAIN lines reach the board: Detroit Over, Detroit Under, LA Over.
    TestRunner::assertEquals(3, count($board), 'three main team-total outcomes on the board');

    $byKey = [];
    foreach ($board as $o) {
        $byKey[$o['teamSide'] . ':' . $o['side']] = $o;
        // point must be a real number, never null (the game-totals parser
        // would have produced null for the "Over 4.5" string).
        TestRunner::assertTrue(isset($o['point']) && is_numeric($o['point']), 'team-total outcome carries numeric point');
    }

    TestRunner::assertTrue(isset($byKey['home:over']),  'Detroit (home) Over present');
    TestRunner::assertTrue(isset($byKey['home:under']), 'Detroit (home) Under present');
    TestRunner::assertTrue(isset($byKey['away:over']),  'Los Angeles (away) Over present');

    TestRunner::assertEqualsFloat(4.5, (float) $byKey['home:over']['point'], 'home over point = 4.5');
    TestRunner::assertEquals('Detroit', $byKey['home:over']['team'], 'team carries canonical short name');
    TestRunner::assertEquals('over', $byKey['home:over']['side'], 'side parsed');
    TestRunner::assertEquals('home', $byKey['home:over']['teamSide'], 'teamSide anchored by team_id');
});

TestRunner::run('team totals: away Under is NOT synthesized when the feed omits it', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtTeamTotalEvent(), 'baseball_mlb');
    $board = rmtTeamTotalsBoard($doc);
    $awayUnder = false;
    foreach ($board as $o) {
        if ($o['teamSide'] === 'away' && $o['side'] === 'under') $awayUnder = true;
    }
    TestRunner::assertFalse($awayUnder, 'no fabricated away Under — only sides present in the feed');
});

TestRunner::run('team totals: non-main rung stored under alternate_team_totals, not on the board', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtTeamTotalEvent(), 'baseball_mlb');
    // The 3.5 alternate must NOT leak onto the main board.
    foreach (rmtTeamTotalsBoard($doc) as $o) {
        TestRunner::assertEqualsFloat(4.5, (float) $o['point'], 'only the 4.5 main line is on the board');
    }
    // It is captured in alternate_team_totals for later use.
    $alt = [];
    foreach (($doc['extendedMarkets'] ?? []) as $m) {
        if (($m['key'] ?? '') === 'alternate_team_totals') $alt = $m['outcomes'] ?? [];
    }
    TestRunner::assertEquals(1, count($alt), 'one alternate team-total rung stored');
    TestRunner::assertEqualsFloat(3.5, (float) $alt[0]['point'], 'alternate rung is the 3.5 line');
    TestRunner::assertEquals('over', $alt[0]['side'], 'alternate rung keeps structured side');
    TestRunner::assertEquals('home', $alt[0]['teamSide'], 'alternate rung keeps teamSide');
});

// ── HR props: Over-only 1+/2+ ladder (Nicky) ─────────────────────────────
// Market 72 (player_home_run) ships Over 0.5 (main), Over 1.5 / Over 2.5
// (non-main, DraftKings-only) and Under 0.5 (main). The mapper must admit the
// Over 0.5 + Over 1.5 rungs PAST the main-line gate (so we offer 1+/2+), keep
// the Over 2.5+ rungs gated out (cap at 1.5), and NEVER store any Under — for
// prematch (72) and live (71) alike. Mirrors the real feed shape verified
// live 2026-06-25.
function rmtHrEvent(int $marketId): array
{
    return [
        'event_id' => 'synthetic-hr',
        'sport_id' => 3,
        'teams' => [
            ['name' => 'Detroit', 'team_id' => 53, 'is_home' => true],
            ['name' => 'Los Angeles', 'team_id' => 57, 'is_away' => true],
        ],
        'score' => ['event_status' => 'STATUS_SCHEDULED'],
        'schedule' => ['event_name' => 'Los Angeles at Detroit'],
        'markets' => [[
            'market_id' => $marketId,
            'period_id' => 0,
            'participants' => [
                ['name' => 'Riley Greene', 'type' => 'TYPE_PLAYER', 'id' => 900123, 'lines' => [
                    ['value' => 'Over 0.5',  'prices' => ['3'  => ['price' => 520,   'is_main_line' => true,  'id' => 8001, 'updated_at' => '2026-06-25T02:00:00Z']]],
                    ['value' => 'Over 1.5',  'prices' => ['19' => ['price' => 2500,  'is_main_line' => false, 'id' => 8002, 'updated_at' => '2026-06-25T02:00:00Z']]],
                    ['value' => 'Over 2.5',  'prices' => ['19' => ['price' => 9000,  'is_main_line' => false, 'id' => 8003, 'updated_at' => '2026-06-25T02:00:00Z']]],
                    ['value' => 'Under 0.5', 'prices' => ['3'  => ['price' => -900,  'is_main_line' => true,  'id' => 8004, 'updated_at' => '2026-06-25T02:00:00Z']]],
                ]],
            ],
        ]],
    ];
}

// Collect "side point" tokens for the batter_home_runs prop key.
function rmtHrRungs(array $doc): array
{
    $out = [];
    foreach (($doc['playerProps'] ?? []) as $m) {
        if (($m['key'] ?? '') !== 'batter_home_runs') continue;
        foreach (($m['outcomes'] ?? []) as $o) {
            $out[] = strtolower((string) ($o['name'] ?? '')) . ' ' . (string) (0 + (float) ($o['point'] ?? 0));
        }
    }
    sort($out);
    return $out;
}

foreach ([72 => 'prematch', 71 => 'live'] as $hrMarketId => $label) {
    TestRunner::run("HR ($label market $hrMarketId): Over 0.5 + Over 1.5 admitted, Over 2.5 capped, Under dropped", function () use ($hrMarketId): void {
        $doc = RundownEventMapper::toMatchDoc(rmtHrEvent($hrMarketId), 'baseball_mlb');
        TestRunner::assertNotNull($doc, 'event mapped');
        $rungs = rmtHrRungs($doc);
        // Exactly the two Over rungs we offer — nothing else.
        TestRunner::assertEquals(2, count($rungs), 'exactly two HR rungs stored');
        TestRunner::assertTrue(in_array('over 0.5', $rungs, true), 'Over 0.5 admitted');
        TestRunner::assertTrue(in_array('over 1.5', $rungs, true), 'Over 1.5 admitted (past main-line gate)');
        TestRunner::assertFalse(in_array('over 2.5', $rungs, true), 'Over 2.5 capped out');
        TestRunner::assertFalse(in_array('under 0.5', $rungs, true), 'Under 0.5 never stored');
    });
}

// ── Soccer quarter-spread promotion (Asian handicap) ─────────────────────
// Pinnacle prices soccer spreads on a QUARTER grid and marks a .25 rung as
// is_main_line (Ivory Coast -2.25); DraftKings/HardRock mark a clean HALF main
// (-2.5) on the same event. The mapper must promote the clean rung so the board
// shows a real, priced, bettable -2.5 (not blank). Mirrors live feed 2026-06-25.
function rmtSoccerSpreadEvent(bool $allQuarter = false): array
{
    $pr = static fn (int $price, bool $main, int $id): array =>
        ['price' => $price, 'is_main_line' => $main, 'id' => $id, 'updated_at' => '2026-06-25T02:00:00Z'];
    if ($allQuarter) {
        // No book prices a non-quarter spread → fallback: stays quarter (blank).
        $homeLines = [['value' => '-2.25', 'prices' => ['3' => $pr(104, true, 1), '19' => $pr(120, true, 2)]]];
        $awayLines = [['value' => '2.25',  'prices' => ['3' => $pr(-114, true, 3), '19' => $pr(-150, true, 4)]]];
    } else {
        $homeLines = [
            ['value' => '-2.25', 'prices' => ['3'  => $pr(104, true, 1)]],            // Pinnacle quarter main
            ['value' => '-2.5',  'prices' => ['19' => $pr(120, true, 2), '28' => $pr(130, true, 3), '3' => $pr(-147, false, 4)]],
            ['value' => '-2.0',  'prices' => ['3'  => $pr(-135, false, 5)]],
        ];
        $awayLines = [
            ['value' => '2.25',  'prices' => ['3'  => $pr(-114, true, 6)]],
            ['value' => '2.5',   'prices' => ['19' => $pr(-150, true, 7), '28' => $pr(-160, true, 8), '3' => $pr(-147, false, 9)]],
            ['value' => '2.0',   'prices' => ['3'  => $pr(118, false, 10)]],
        ];
    }
    return [
        'event_id' => 'synthetic-soccer-hc',
        'sport_id' => 18,
        'teams' => [
            ['name' => 'Ivory Coast', 'team_id' => 100, 'is_home' => true],
            ['name' => 'Curacao',     'team_id' => 101, 'is_away' => true],
        ],
        'score' => ['event_status' => 'STATUS_SCHEDULED'],
        'schedule' => ['event_name' => 'Curacao at Ivory Coast'],
        'markets' => [[
            'market_id' => 2,
            'period_id' => 0,
            'participants' => [
                ['name' => 'Ivory Coast', 'type' => 'TYPE_TEAM', 'id' => 100, 'lines' => $homeLines],
                ['name' => 'Curacao',     'type' => 'TYPE_TEAM', 'id' => 101, 'lines' => $awayLines],
            ],
        ]],
    ];
}

// Collect every spread point across all books in the doc.
function rmtAllSpreadPoints(array $doc): array
{
    $pts = [];
    foreach (($doc['odds']['bookmakers'] ?? []) as $bm) {
        foreach (($bm['markets'] ?? []) as $m) {
            if (($m['key'] ?? '') !== 'spreads') continue;
            foreach (($m['outcomes'] ?? []) as $o) {
                if (isset($o['point']) && is_numeric($o['point'])) $pts[] = (float) $o['point'];
            }
        }
    }
    return $pts;
}

TestRunner::run('soccer spread: quarter main promoted to the clean half rung the feed prices', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtSoccerSpreadEvent(false), 'soccer_fifa_world_cup');
    TestRunner::assertNotNull($doc, 'event mapped');
    $pts = rmtAllSpreadPoints($doc);
    TestRunner::assertTrue($pts !== [], 'spreads present');
    // No quarter survives on the displayed/bettable spread.
    $quarters = array_filter($pts, static fn ($p) => abs((abs($p) - floor(abs($p))) - 0.25) < 1e-6 || abs((abs($p) - floor(abs($p))) - 0.75) < 1e-6);
    TestRunner::assertEquals(0, count($quarters), 'no quarter spread on the board');
    // Promoted to the real -2.5 / +2.5 clean rung; -2.25 is gone.
    TestRunner::assertTrue(in_array(-2.5, $pts, true), 'home spread promoted to -2.5');
    TestRunner::assertTrue(in_array(2.5, $pts, true), 'away spread promoted to +2.5');
    TestRunner::assertFalse(in_array(-2.25, $pts, true), 'quarter -2.25 no longer displayed');
});

TestRunner::run('soccer spread: stays quarter when NO clean rung exists (blank fallback preserved)', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtSoccerSpreadEvent(true), 'soccer_fifa_world_cup');
    $pts = rmtAllSpreadPoints($doc);
    // Nothing to promote to → quarter left intact (board blanks, never fabricated).
    TestRunner::assertTrue(in_array(-2.25, $pts, true) || in_array(2.25, $pts, true), 'quarter left intact as last-resort fallback');
});

// ── Soccer quarter-TOTAL promotion (O/U) — mirror of the spread case ──────
// Pinnacle prices soccer totals on a QUARTER grid and marks a .25 rung main
// (Ivory Coast O/U 3.25); DraftKings/HardRock mark a clean half main (3.5). The
// mapper must promote the clean rung, keeping Over AND Under pinned to the SAME
// total (never O 3.5 / U 3.25). Mirrors live feed 2026-06-25.
function rmtSoccerTotalEvent(bool $allQuarter = false): array
{
    $pr = static fn (int $price, bool $main, int $id): array =>
        ['price' => $price, 'is_main_line' => $main, 'id' => $id, 'updated_at' => '2026-06-25T02:00:00Z'];
    if ($allQuarter) {
        $overLines  = [['value' => '3.25', 'prices' => ['3' => $pr(-353, true, 1), '19' => $pr(-150, true, 2)]]];
        $underLines = [['value' => '3.25', 'prices' => ['3' => $pr(260, true, 3),  '19' => $pr(120, true, 4)]]];
    } else {
        $overLines = [
            ['value' => '3.25', 'prices' => ['3'  => $pr(-353, true, 1)]],            // Pinnacle quarter main
            ['value' => '3.5',  'prices' => ['19' => $pr(105, true, 2), '28' => $pr(100, true, 3), '3' => $pr(-110, false, 4)]],
        ];
        $underLines = [
            ['value' => '3.25', 'prices' => ['3'  => $pr(260, true, 5)]],
            ['value' => '3.5',  'prices' => ['19' => $pr(-135, true, 6), '28' => $pr(-130, true, 7), '3' => $pr(-110, false, 8)]],
        ];
    }
    return [
        'event_id' => 'synthetic-soccer-total',
        'sport_id' => 18,
        'teams' => [
            ['name' => 'Ivory Coast', 'team_id' => 100, 'is_home' => true],
            ['name' => 'Curacao',     'team_id' => 101, 'is_away' => true],
        ],
        'score' => ['event_status' => 'STATUS_SCHEDULED'],
        'schedule' => ['event_name' => 'Curacao at Ivory Coast'],
        'markets' => [[
            'market_id' => 3,
            'period_id' => 0,
            'participants' => [
                ['name' => 'Over',  'type' => 'TYPE_RESULT', 'id' => 200, 'lines' => $overLines],
                ['name' => 'Under', 'type' => 'TYPE_RESULT', 'id' => 201, 'lines' => $underLines],
            ],
        ]],
    ];
}

// Collect (side, point) pairs for the totals market across all books.
function rmtAllTotalRungs(array $doc): array
{
    $out = [];
    foreach (($doc['odds']['bookmakers'] ?? []) as $bm) {
        foreach (($bm['markets'] ?? []) as $m) {
            if (($m['key'] ?? '') !== 'totals') continue;
            foreach (($m['outcomes'] ?? []) as $o) {
                if (isset($o['point']) && is_numeric($o['point'])) {
                    $out[] = [strtolower((string) ($o['name'] ?? '')), (float) $o['point']];
                }
            }
        }
    }
    return $out;
}

TestRunner::run('soccer total: quarter main promoted to the clean half rung the feed prices', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtSoccerTotalEvent(false), 'soccer_fifa_world_cup');
    TestRunner::assertNotNull($doc, 'event mapped');
    $rungs = rmtAllTotalRungs($doc);
    TestRunner::assertTrue($rungs !== [], 'totals present');
    $pts = array_map(static fn ($r) => $r[1], $rungs);
    $quarters = array_filter($pts, static fn ($p) => abs((abs($p) - floor(abs($p))) - 0.25) < 1e-6 || abs((abs($p) - floor(abs($p))) - 0.75) < 1e-6);
    TestRunner::assertEquals(0, count($quarters), 'no quarter total on the board');
    TestRunner::assertFalse(in_array(3.25, $pts, true), 'quarter 3.25 no longer displayed');
    // Over AND Under both promoted to the SAME clean point 3.5 (coherent, no split).
    TestRunner::assertTrue(in_array(['over', 3.5], $rungs, false), 'Over promoted to 3.5');
    TestRunner::assertTrue(in_array(['under', 3.5], $rungs, false), 'Under promoted to 3.5');
});

TestRunner::run('soccer total: stays quarter when NO clean rung exists (blank fallback preserved)', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtSoccerTotalEvent(true), 'soccer_fifa_world_cup');
    $pts = array_map(static fn ($r) => $r[1], rmtAllTotalRungs($doc));
    TestRunner::assertTrue(in_array(3.25, $pts, true), 'quarter total left intact as last-resort fallback');
});

// ── Rundown status classification — FULL MAP LOCK (2026-07-06 incident) ─────
//
// STATUS_FULL_TIME was mapped 'live', so a decided soccer game (Norway–Brazil
// 2-1, "Full Time") stayed on the board with OPEN BETTING for 17+ hours: the
// score sweep re-asserted status='live' every tick and placement accepted.
// This suite locks the classification of EVERY status Rundown documents
// (docs.therundown.io/reference/event-statuses) so the next drifted or newly
// added status fails a test instead of booking bets on finished games.

// Minimal synthetic Rundown event carrying just a status — enough for
// toMatchDoc()'s required fields (event_id, sport_id, home/away teams).
function rmtStatusEvent(string $eventStatus, int $sh = 0, int $sa = 0): array
{
    return [
        'event_id' => 'evt-status-' . strtolower($eventStatus),
        'sport_id' => 14,
        'teams' => [
            ['team_id' => 1, 'name' => 'Brazil', 'is_home' => true,  'is_away' => false],
            ['team_id' => 2, 'name' => 'Norway', 'is_home' => false, 'is_away' => true],
        ],
        'score' => [
            'event_status' => $eventStatus,
            'score_home' => $sh,
            'score_away' => $sa,
            'event_status_detail' => 'Full Time',
        ],
        'schedule' => ['event_name' => 'Norway at Brazil'],
    ];
}

TestRunner::run('Rundown STATUS_MAP: full classification lock (every documented status)', function (): void {
    // Complete list from docs.therundown.io/reference/event-statuses,
    // including the soccer-only statuses. Update BOTH this table and
    // RundownEventMapper::STATUS_MAP when Rundown adds a status.
    $expected = [
        // pre-game
        'STATUS_SCHEDULED'         => 'scheduled',
        'STATUS_TBD'               => 'scheduled',
        'STATUS_DELAYED'           => 'scheduled',
        'STATUS_RAIN_DELAY'        => 'scheduled',
        'STATUS_NOT_AVAILABLE'     => 'scheduled',
        // in-play
        'STATUS_IN_PROGRESS'       => 'live',
        'STATUS_HALFTIME'          => 'live',
        'STATUS_HALFTIME_ET'       => 'live',      // was UNMAPPED (would strand a live row)
        'STATUS_END_PERIOD'        => 'live',
        'STATUS_FIRST_HALF'        => 'live',
        'STATUS_SECOND_HALF'       => 'live',
        'STATUS_OVERTIME'          => 'live',
        'STATUS_SHOOTOUT'          => 'live',
        'STATUS_END_OF_REGULATION' => 'live',
        'STATUS_SUSPENDED'         => 'live',      // deliberate: row stays warm, serve-time normalize blocks betting
        // terminal — result stands
        'STATUS_FINAL'             => 'finished',
        'STATUS_FINAL_AET'         => 'finished',
        'STATUS_FINAL_PEN'         => 'finished',
        'STATUS_FORFEIT'           => 'finished',
        'STATUS_FULL_TIME'         => 'finished',  // THE 2026-07-06 BUG: was 'live'
        // terminal — void
        'STATUS_POSTPONED'         => 'canceled',
        'STATUS_CANCELED'          => 'canceled',
        'STATUS_ABANDONED'         => 'canceled',  // was UNMAPPED (would strand a live row)
    ];
    foreach ($expected as $rundownStatus => $want) {
        $doc = RundownEventMapper::toMatchDoc(rmtStatusEvent($rundownStatus), 'soccer_fifa_world_cup');
        TestRunner::assertNotNull($doc, "{$rundownStatus}: event maps");
        TestRunner::assertEquals($want, (string) ($doc['status'] ?? ''), "{$rundownStatus} → {$want}");
    }
});

TestRunner::run('Rundown scoreUpdate: terminal statuses land, unknown statuses never demote', function (): void {
    // The score-sweep path: FULL_TIME must WRITE finished (this is the tick
    // that closes betting and triggers instant settlement in the worker).
    $patch = RundownEventMapper::scoreUpdate(rmtStatusEvent('STATUS_FULL_TIME', 2, 1));
    TestRunner::assertEquals('finished', (string) ($patch['status'] ?? ''), 'FULL_TIME score tick writes status=finished');
    $patch = RundownEventMapper::scoreUpdate(rmtStatusEvent('STATUS_ABANDONED'));
    TestRunner::assertEquals('canceled', (string) ($patch['status'] ?? ''), 'ABANDONED score tick writes status=canceled');
    // Unknown/sport-specific statuses must not touch status at all (the
    // old '?? scheduled' default once demoted live rows).
    $patch = RundownEventMapper::scoreUpdate(rmtStatusEvent('STATUS_SOMETHING_RUNDOWN_ADDED_LATER'));
    TestRunner::assertFalse(array_key_exists('status', $patch), 'unknown status writes NO status key');
});

TestRunner::run('normalize()/annotate(): FULL_TIME is terminal at serve time (read-layer backstop)', function (): void {
    // Layer-2 defense: rows already stored 'live' by the OLD map must still
    // annotate as finished from score.event_status alone — this is what
    // closes betting immediately on deploy and lets the settle sweep grade
    // stuck rows without waiting for a feed rewrite.
    TestRunner::assertEquals('finished', SportsMatchStatus::normalize('live', 'STATUS_FULL_TIME'), 'normalize(live, FULL_TIME) → finished');
    TestRunner::assertEquals('finished', SportsMatchStatus::normalize('', 'STATUS_FULL_TIME'), 'normalize(-, FULL_TIME) → finished');
    // HALFTIME_ET must NOT be swallowed by the FULL_TIME pattern.
    TestRunner::assertEquals('live', SportsMatchStatus::normalize('live', 'STATUS_HALFTIME_ET'), 'normalize(live, HALFTIME_ET) stays live');

    // The exact incident row: stored status 'live', real score, FULL_TIME.
    $incidentRow = [
        'status' => 'live',
        'startTime' => date('c', time() - 90 * 60),
        'lastUpdated' => date('c', time() - 30),
        'sportKey' => 'soccer_fifa_world_cup',
        'score' => [
            'event_status' => 'STATUS_FULL_TIME',
            'score_home' => 2,
            'score_away' => 1,
        ],
    ];
    $annotated = SportsMatchStatus::annotate($incidentRow);
    TestRunner::assertEquals('finished', (string) ($annotated['status'] ?? ''), 'incident row annotates finished');
    TestRunner::assertFalse((bool) ($annotated['isBettable'] ?? true), 'incident row is NOT bettable');
});

// ── Baseball PK (0-run) spread suppression ────────────────────────────────
// In baseball a 0-run spread is the SAME outcome as the moneyline (no ties),
// so a "PK" rung is a duplicate ML at different juice — it read as broken on
// the board (Yankees ML -102 next to Yankees PK -114) and invited ML-vs-PK
// price shopping. Rundown genuinely marks point=0 as the F5 spread MAIN line
// (this fixture carries it), so suppression must happen at ingestion for the
// whole spread family: core game spread, period spreads, alternate ladders.

function rmtAllExtendedSpreadPoints(array $doc): array
{
    $points = [];
    foreach (($doc['odds']['extendedMarkets'] ?? []) as $m) {
        $key = strtolower((string) ($m['key'] ?? ''));
        $base = str_starts_with($key, 'alternate_') ? substr($key, strlen('alternate_')) : $key;
        if ($base !== 'spreads' && !str_starts_with($base, 'spreads_')) continue;
        foreach (($m['outcomes'] ?? []) as $o) {
            if (isset($o['point'])) $points[$key][] = (float) $o['point'];
        }
    }
    return $points;
}

TestRunner::run('MLB PK: point=0 F5 spread rungs suppressed at ingestion, non-zero rungs survive', function (): void {
    // Fixture market 791 marks Detroit +0 / Angels +0 as is_main_line=true —
    // the exact feed shape that produced the PK row on the F5 board.
    $doc = RundownEventMapper::toMatchDoc(rmtLoad('mlb_la_at_detroit_scheduled'), 'baseball_mlb');
    TestRunner::assertNotNull($doc, 'doc should map');
    $byKey = rmtAllExtendedSpreadPoints($doc);
    foreach ($byKey as $key => $points) {
        foreach ($points as $p) {
            TestRunner::assertTrue(abs($p) > 1e-9, "baseball spread market {$key} must carry NO point=0 rung, found one");
        }
    }
    // The F5 spread market itself survives with its real (non-zero) rungs —
    // suppression trims the ladder, it must not blank the market.
    $f5 = $byKey['spreads_1st_5_innings'] ?? [];
    TestRunner::assertTrue(count($f5) > 0, 'spreads_1st_5_innings still present after PK suppression');
});

function rmtPkSpreadEvent(string $home, string $away): array
{
    // Core game spread (market 2, period 0) with point=0 marked MAIN on both
    // sides — the Route 2 belt: even if the feed ever publishes a PK game
    // spread as main, baseball must not store it.
    return [
        'event_id' => 'synthetic-pk-spread',
        'sport_id' => 3,
        'teams' => [
            ['name' => $home, 'is_home' => true],
            ['name' => $away, 'is_away' => true],
        ],
        'score' => ['event_status' => 'STATUS_SCHEDULED'],
        'schedule' => ['event_name' => "{$away} at {$home}"],
        'markets' => [[
            'market_id' => 2,
            'period_id' => 0,
            'participants' => [
                ['name' => $away, 'type' => 'TYPE_TEAM', 'id' => 2001, 'lines' => [
                    ['value' => '+0', 'prices' => ['3' => ['price' => -114, 'is_main_line' => true, 'id' => 9001, 'updated_at' => '2026-07-01T02:00:00Z']]],
                ]],
                ['name' => $home, 'type' => 'TYPE_TEAM', 'id' => 2002, 'lines' => [
                    ['value' => '+0', 'prices' => ['3' => ['price' => -101, 'is_main_line' => true, 'id' => 9002, 'updated_at' => '2026-07-01T02:00:00Z']]],
                ]],
            ],
        ]],
    ];
}

TestRunner::run('baseball PK: core game spread main=0 never stored (Route 2 belt)', function (): void {
    $doc = RundownEventMapper::toMatchDoc(rmtPkSpreadEvent('Tampa Bay Rays', 'New York Yankees'), 'baseball_mlb');
    TestRunner::assertNotNull($doc, 'doc should map');
    $byTeam = rmtSpreadsByTeam($doc);
    TestRunner::assertEquals(0, count($byTeam), 'baseball point=0 game spread must not reach the board');
});

TestRunner::run('PK suppression is BASEBALL-ONLY: soccer and hockey level (0) handicaps are untouched', function (): void {
    // DELIBERATE EXCLUSION (product ruling 2026-07-07): a soccer/hockey PK
    // handicap is a legitimate, distinct product — the draw/OT refunds the
    // stake, which their moneylines do NOT do. Only baseball sportKeys are
    // gated; a regression that widens the gate to these sports removes a
    // real product from the board.
    foreach (['soccer_epl' => ['Chelsea', 'Arsenal'], 'icehockey_nhl' => ['Carolina', 'Montreal']] as $sportKey => [$home, $away]) {
        $doc = RundownEventMapper::toMatchDoc(rmtPkSpreadEvent($home, $away), $sportKey);
        TestRunner::assertNotNull($doc, "{$sportKey} doc should map");
        $byTeam = rmtSpreadsByTeam($doc);
        TestRunner::assertEquals(1, count($byTeam[$home] ?? []), "{$sportKey}: home PK spread outcome survives");
        TestRunner::assertEquals(1, count($byTeam[$away] ?? []), "{$sportKey}: away PK spread outcome survives");
        TestRunner::assertEqualsFloat(0.0, (float) $byTeam[$home][0]['point'], "{$sportKey}: PK point stays 0");
    }
});
