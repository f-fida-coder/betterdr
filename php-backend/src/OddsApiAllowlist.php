<?php

declare(strict_types=1);

/**
 * Hard allowlist for The Odds API — the SUPPLEMENTAL odds source.
 *
 * THE ONE RULE: TheRundown is the sole, authoritative source for every
 * sport/league/market it provides. The Odds API may ONLY serve what Rundown
 * does not cover. This class is where that rule is enforced IN CODE:
 *
 *   - Keys live in constants, not env/config — a config typo cannot widen
 *     the fetchable set. OddsApiClient refuses any key not listed here.
 *   - assertNoRundownOverlap() cross-checks every main-line/outright key
 *     against RundownSportMap (resolving differently-spelled aliases for the
 *     same competition first) and THROWS if the sets ever intersect. It runs
 *     once per process before the first upstream call, so an overlapping
 *     edit refuses to fetch at all instead of double-sourcing a league.
 *
 * Approved 2026-07-05 (Phase-0 diff): 19-league soccer launch set, 11
 * outright keys (The Odds API is the sole futures source incl. golf; the
 * Rundown outrights sync is being retired), 6 cards-only leagues. Tennis
 * was dropped (Rundown ATP/WTA overlap).
 *
 * Phase-2 soccer pool (approved for LATER, do not add without a ruling):
 * remaining ~35 keys from the Phase-0 diff — smaller European first
 * divisions, cup competitions, women's competitions, WC qualifiers,
 * Asia/Africa leagues.
 */
final class OddsApiAllowlist
{
    /** Soccer main lines (h2h/spreads/totals) — leagues Rundown does NOT feed. */
    public const CATEGORY_SOCCER = 'soccer';
    /** Futures/outrights — The Odds API is the sole futures source (2026-07-05 ruling). */
    public const CATEGORY_OUTRIGHTS = 'outrights';
    /**
     * Card markets ONLY, via the per-event endpoint. These leagues ARE fed
     * by Rundown for main lines — allowed here solely because Rundown has no
     * card markets at all. Main lines for these keys must NEVER be fetched
     * from The Odds API.
     */
    public const CATEGORY_CARDS = 'cards';

    /** @var list<string> 19-league launch set approved 2026-07-05. */
    private const SOCCER_KEYS = [
        // England below the EPL
        'soccer_efl_champ',
        'soccer_england_league1',
        'soccer_england_league2',
        'soccer_fa_cup',
        'soccer_england_efl_cup',
        // Big-5 second divisions
        'soccer_spain_segunda_division',
        'soccer_italy_serie_b',
        'soccer_germany_bundesliga2',
        'soccer_france_ligue_two',
        // European first divisions Rundown lacks
        'soccer_netherlands_eredivisie',
        'soccer_portugal_primeira_liga',
        'soccer_spl',
        // Americas
        'soccer_mexico_ligamx',
        'soccer_brazil_campeonato',
        'soccer_brazil_serie_b',
        'soccer_argentina_primera_division',
        // Continental competitions Rundown lacks
        'soccer_uefa_europa_conference_league',
        'soccer_conmebol_copa_libertadores',
        'soccer_conmebol_copa_sudamericana',
    ];

    /** @var list<string> Every has_outrights key in scope. Seasonal keys 404 off-season — worker treats that as "not active", not an error. */
    private const OUTRIGHT_KEYS = [
        'americanfootball_nfl_super_bowl_winner',
        'americanfootball_ncaaf_championship_winner',
        'baseball_mlb_world_series_winner',
        'basketball_nba_championship_winner',
        'basketball_ncaab_championship_winner',
        'icehockey_nhl_championship_winner',
        'soccer_fifa_world_cup_winner',
        'golf_masters_tournament_winner',
        'golf_pga_championship_winner',
        'golf_the_open_championship_winner',
        'golf_us_open_winner',
        // politics_us_presidential_election_winner intentionally absent —
        // Rundown carries politics (sport 22).
    ];

    /** @var list<string> Rundown-covered leagues, card markets only. */
    private const CARDS_ONLY_KEYS = [
        'soccer_epl',
        'soccer_spain_la_liga',
        'soccer_italy_serie_a',
        'soccer_germany_bundesliga',
        'soccer_france_ligue_one',
        'soccer_usa_mls',
    ];

    /**
     * Game-level card markets only (2026-07-05 ruling). Player card props
     * (player_to_receive_card / player_to_receive_red_card) stay OFF —
     * manual-grading load too high; revisit later.
     */
    private const CARD_MARKETS = ['alternate_totals_cards', 'alternate_spreads_cards'];

    /**
     * The Odds API key → Rundown sportKey where the SAME competition is
     * spelled differently. A plain set-intersection would miss these, so the
     * overlap check resolves through this map first.
     */
    private const RUNDOWN_KEY_ALIASES = [
        'soccer_uefa_european_championship' => 'soccer_uefa_euro',
    ];

    private static bool $asserted = false;

    /** @return list<string> */
    public static function keysFor(string $category): array
    {
        return match ($category) {
            self::CATEGORY_SOCCER    => self::SOCCER_KEYS,
            self::CATEGORY_OUTRIGHTS => self::OUTRIGHT_KEYS,
            self::CATEGORY_CARDS     => self::CARDS_ONLY_KEYS,
            default                  => [],
        };
    }

    public static function isAllowed(string $sportKey, string $category): bool
    {
        return in_array(strtolower(trim($sportKey)), self::keysFor($category), true);
    }

    /**
     * The ONLY markets The Odds API may be asked for, per category. The
     * client hard-sets this on every request — callers cannot widen it.
     */
    public static function marketsFor(string $category): string
    {
        return match ($category) {
            self::CATEGORY_SOCCER    => 'h2h,spreads,totals',
            self::CATEGORY_OUTRIGHTS => 'outrights',
            self::CATEGORY_CARDS     => implode(',', self::CARD_MARKETS),
            default                  => '',
        };
    }

    /** Gate on every sport-scoped fetch. Throws unless (sportKey, category) is fetchable. */
    public static function assertAllowed(string $sportKey, string $category): void
    {
        self::assertNoRundownOverlap();
        if (!self::isAllowed($sportKey, $category)) {
            throw new RuntimeException(
                'OddsApiAllowlist: refusing to fetch "' . $sportKey . '" for category "' . $category
                . '" — not on the hard allowlist (TheRundown-covered, or never approved).'
            );
        }
    }

    /**
     * Startup assertion — logs and refuses (throws) if the allowlist ever
     * collides with a TheRundown-covered league. Memoized per process.
     */
    public static function assertNoRundownOverlap(): void
    {
        if (self::$asserted) {
            return;
        }
        $violations = self::overlapViolations(self::SOCCER_KEYS, self::OUTRIGHT_KEYS, self::CARDS_ONLY_KEYS);
        if ($violations !== []) {
            $msg = 'OddsApiAllowlist: STARTUP REFUSED — ' . implode('; ', $violations)
                . '. TheRundown stays authoritative; fix the allowlist.';
            error_log($msg);
            throw new RuntimeException($msg);
        }
        self::$asserted = true;
    }

    /**
     * Pure overlap check — returns human-readable violations ([] = clean).
     * assertNoRundownOverlap() runs it on the shipped constants; tests run
     * it on synthetic tier sets to prove the guard actually trips.
     *
     * @param list<string> $soccerKeys
     * @param list<string> $outrightKeys
     * @param list<string> $cardsOnlyKeys
     * @return list<string>
     */
    public static function overlapViolations(array $soccerKeys, array $outrightKeys, array $cardsOnlyKeys): array
    {
        $rundown = array_flip(RundownSportMap::allKnownSportKeys());
        $violations = [];

        // Full-fetch tiers must never touch a Rundown-covered league.
        foreach (array_merge($soccerKeys, $outrightKeys) as $key) {
            $resolved = self::RUNDOWN_KEY_ALIASES[$key] ?? $key;
            if (isset($rundown[$key]) || isset($rundown[$resolved])) {
                $violations[] = '"' . $key . '" is fed by TheRundown and must not be fetched from The Odds API';
            }
        }

        // Cards-only keys are Rundown leagues BY DESIGN. Guard both edges:
        // they must not leak into a full-fetch tier, and each must actually
        // be Rundown-covered (a non-Rundown league belongs in SOCCER_KEYS).
        foreach ($cardsOnlyKeys as $key) {
            if (in_array($key, $soccerKeys, true) || in_array($key, $outrightKeys, true)) {
                $violations[] = 'cards-only key "' . $key . '" also appears in a full-fetch tier';
            }
            $resolved = self::RUNDOWN_KEY_ALIASES[$key] ?? $key;
            if (!isset($rundown[$key]) && !isset($rundown[$resolved])) {
                $violations[] = 'cards-only key "' . $key . '" is not a TheRundown league — move it to SOCCER_KEYS';
            }
        }
        return $violations;
    }
}
