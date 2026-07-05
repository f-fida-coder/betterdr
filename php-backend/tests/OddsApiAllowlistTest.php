<?php

declare(strict_types=1);

/**
 * Guards THE ONE RULE for the supplemental Odds API feed: TheRundown stays
 * the sole source for every league it provides. If someone adds a
 * Rundown-covered key to the allowlist, these tests (and the startup
 * assertion they exercise) must fail BEFORE the code can ever fetch it.
 */

require_once dirname(__DIR__) . '/src/RundownSportMap.php';
require_once dirname(__DIR__) . '/src/OddsApiAllowlist.php';

TestRunner::run('allowlist: shipped tiers have zero Rundown overlap', function (): void {
    $violations = OddsApiAllowlist::overlapViolations(
        OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_SOCCER),
        OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_OUTRIGHTS),
        OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_CARDS),
        OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_FIGHTS),
        OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_RUGBY)
    );
    TestRunner::assertEquals([], $violations, 'shipped constants are overlap-free');
    OddsApiAllowlist::assertNoRundownOverlap(); // must not throw
    TestRunner::assertEquals(19, count(OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_SOCCER)), 'approved 19-league soccer launch set');
    TestRunner::assertEquals(11, count(OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_OUTRIGHTS)), 'approved 11 outright keys');
    TestRunner::assertEquals(['boxing_boxing'], OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_FIGHTS), 'fights = boxing only (2026-07-05)');
    TestRunner::assertEquals(['rugbyleague_nrl'], OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_RUGBY), 'rugby = NRL only; state_of_origin skipped, six_nations no-go');
});

TestRunner::run('allowlist: fights/rugby markets + per-category regions', function (): void {
    TestRunner::assertEquals('h2h', OddsApiAllowlist::marketsFor(OddsApiAllowlist::CATEGORY_FIGHTS), 'boxing is h2h-only');
    TestRunner::assertEquals('h2h,spreads,totals', OddsApiAllowlist::marketsFor(OddsApiAllowlist::CATEGORY_RUGBY), 'NRL gets full main lines');
    // Regions are per-category (2026-07-05 ruling): rugby=au (us was empty
    // in the live sample), everything else stays us — including the
    // pre-existing categories, whose behavior must not change.
    TestRunner::assertEquals('au', OddsApiAllowlist::regionsFor(OddsApiAllowlist::CATEGORY_RUGBY), 'rugby polls au books');
    TestRunner::assertEquals('us', OddsApiAllowlist::regionsFor(OddsApiAllowlist::CATEGORY_FIGHTS), 'fights stay us per ruling');
    TestRunner::assertEquals('us', OddsApiAllowlist::regionsFor(OddsApiAllowlist::CATEGORY_SOCCER), 'soccer region unchanged');
    TestRunner::assertEquals('us', OddsApiAllowlist::regionsFor(OddsApiAllowlist::CATEGORY_OUTRIGHTS), 'outrights region unchanged');
    TestRunner::assertEquals('us', OddsApiAllowlist::regionsFor(OddsApiAllowlist::CATEGORY_CARDS), 'cards region unchanged');
});

TestRunner::run('allowlist: the guard trips on a Rundown key planted in fights or rugby', function (): void {
    $violations = OddsApiAllowlist::overlapViolations([], [], [], ['mma_mixed_martial_arts'], []);
    TestRunner::assertEquals(1, count($violations), 'MMA (Rundown sport 7) is refused in the fights tier');
    $violations = OddsApiAllowlist::overlapViolations([], [], [], [], ['cricket_t20']);
    TestRunner::assertEquals(1, count($violations), 'a Rundown key is refused in the rugby tier');
});

TestRunner::run('allowlist: the guard trips on a Rundown-covered key', function (): void {
    $violations = OddsApiAllowlist::overlapViolations(['soccer_epl'], [], []);
    TestRunner::assertEquals(1, count($violations), 'soccer_epl (Rundown league) is refused in the soccer tier');
});

TestRunner::run('allowlist: alias trap — UEFA Euro under its Odds API spelling', function (): void {
    // Rundown key is soccer_uefa_euro; The Odds API spells the SAME
    // competition soccer_uefa_european_championship. A plain string
    // intersection would miss it — the alias map must not.
    $violations = OddsApiAllowlist::overlapViolations(['soccer_uefa_european_championship'], [], []);
    TestRunner::assertEquals(1, count($violations), 'euro alias resolves to a Rundown league and is refused');
});

TestRunner::run('allowlist: cards-only tier rejects non-Rundown leagues', function (): void {
    $violations = OddsApiAllowlist::overlapViolations([], [], ['soccer_efl_champ']);
    TestRunner::assertEquals(1, count($violations), 'non-Rundown league is rejected from the cards-only tier');
});

TestRunner::run('allowlist: cards-only key cannot also be full-fetch', function (): void {
    $violations = OddsApiAllowlist::overlapViolations(['soccer_efl_champ'], [], ['soccer_efl_champ']);
    // Two violations: the tier-leak, and cards-only requiring a Rundown league.
    TestRunner::assertEquals(2, count($violations), 'same key in soccer + cards tiers is flagged');
});

TestRunner::run('allowlist: category gating', function (): void {
    TestRunner::assertEquals(true,  OddsApiAllowlist::isAllowed('soccer_efl_champ', OddsApiAllowlist::CATEGORY_SOCCER), 'approved league fetchable');
    TestRunner::assertEquals(false, OddsApiAllowlist::isAllowed('soccer_epl', OddsApiAllowlist::CATEGORY_SOCCER), 'Rundown league NOT fetchable for main lines');
    TestRunner::assertEquals(true,  OddsApiAllowlist::isAllowed('soccer_epl', OddsApiAllowlist::CATEGORY_CARDS), 'Rundown league IS fetchable for cards only');
    TestRunner::assertEquals(true,  OddsApiAllowlist::isAllowed('soccer_fifa_world_cup', OddsApiAllowlist::CATEGORY_CARDS), 'World Cup cards approved 2026-07-05');
    TestRunner::assertEquals(false, OddsApiAllowlist::isAllowed('soccer_fifa_world_cup', OddsApiAllowlist::CATEGORY_SOCCER), 'World Cup main lines stay Rundown-only (One Rule)');
    TestRunner::assertEquals(7, count(OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_CARDS)), 'cards set is exactly the 7 approved leagues');
    TestRunner::assertEquals(false, OddsApiAllowlist::isAllowed('tennis_atp_wimbledon', OddsApiAllowlist::CATEGORY_SOCCER), 'tennis dropped from scope');
    TestRunner::assertEquals(true,  OddsApiAllowlist::isAllowed('golf_masters_tournament_winner', OddsApiAllowlist::CATEGORY_OUTRIGHTS), 'golf outright approved');
    TestRunner::assertEquals(false, OddsApiAllowlist::isAllowed('politics_us_presidential_election_winner', OddsApiAllowlist::CATEGORY_OUTRIGHTS), 'politics excluded (Rundown sport 22)');

    $threw = false;
    try {
        OddsApiAllowlist::assertAllowed('soccer_epl', OddsApiAllowlist::CATEGORY_SOCCER);
    } catch (RuntimeException $e) {
        $threw = true;
    }
    TestRunner::assertEquals(true, $threw, 'assertAllowed() throws for a Rundown-covered main-line fetch');
});

TestRunner::run('allowlist: card markets are game-level only', function (): void {
    $markets = OddsApiAllowlist::marketsFor(OddsApiAllowlist::CATEGORY_CARDS);
    TestRunner::assertEquals('alternate_totals_cards,alternate_spreads_cards', $markets, 'player card props stay OFF per 2026-07-05 ruling');
});
