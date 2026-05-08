<?php

declare(strict_types=1);

final class BetModeRules
{
    private const DEFAULT_RULES = [
        [
            'mode' => 'straight',
            'minLegs' => 1,
            'maxLegs' => 1,
            'teaserPointOptions' => [],
            'payoutProfile' => ['type' => 'odds_product'],
            'isActive' => true,
        ],
        [
            'mode' => 'parlay',
            'minLegs' => 2,
            'maxLegs' => 12,
            'teaserPointOptions' => [],
            'payoutProfile' => ['type' => 'odds_product'],
            'isActive' => true,
        ],
        [
            'mode' => 'teaser',
            'minLegs' => 2,
            'maxLegs' => 6,
            'teaserPointOptions' => [6, 6.5, 7],
            'payoutProfile' => [
                'type' => 'table_multiplier',
                'multipliers' => [
                    '2' => 1.8,
                    '3' => 2.6,
                    '4' => 4.0,
                    '5' => 6.5,
                    '6' => 9.5,
                ],
            ],
            'isActive' => true,
        ],
        [
            'mode' => 'if_bet',
            'minLegs' => 2,
            'maxLegs' => 2,
            'teaserPointOptions' => [],
            'payoutProfile' => ['type' => 'odds_product'],
            'isActive' => true,
        ],
        [
            'mode' => 'reverse',
            'minLegs' => 2,
            'maxLegs' => 2,
            'teaserPointOptions' => [],
            'payoutProfile' => ['type' => 'odds_product'],
            'isActive' => true,
        ],
        // Round Robin = automatic parlay generator. The user picks N legs
        // (3..8) and one or more "By X's" sizes; the system creates one
        // child parlay per nCr combination. minLegs/maxLegs apply to the
        // *selection set*, not per-parlay. maxParlaysPerGroup caps the
        // total combinations a single placement can fan out into so a
        // greedy "By 2's,3's,4's on 8 legs" doesn't drop ~250 child rows
        // in one transaction. Children are stored as standard parlay
        // rows (type='parlay', with parentGroupId pointing at the group)
        // so settlement, commission, and figures arithmetic all keep
        // their existing parlay-flow semantics.
        [
            'mode' => 'round_robin',
            'minLegs' => 3,
            'maxLegs' => 8,
            'teaserPointOptions' => [],
            'payoutProfile' => ['type' => 'odds_product'],
            'maxParlaysPerGroup' => 50,
            'isActive' => true,
        ],
    ];

    /**
     * Per-sport teaser point options. US sportsbook standard:
     *   NFL/NCAAF (americanfootball_*): 6, 6.5, 7 (some books also 10)
     *   NBA/NCAAB (basketball_*): 4, 4.5, 5 (some books also 5.5)
     * Indexed by the high-level sport group rather than sport-key prefix
     * so the frontend can resolve a sport-tree id ("football", "basketball")
     * to its allowed points without parsing odds-API keys. The actual
     * teaser eligibility (which sports can be teased at all) lives at
     * BetsController teaser-validation time and uses these exact groups.
     */
    private const TEASER_POINT_OPTIONS_BY_SPORT = [
        'football' => [6, 6.5, 7],
        'basketball' => [4, 4.5, 5],
    ];

    /**
     * Map a sport key (Odds API style) or static-tree sport id to the
     * teaser sport group used by TEASER_POINT_OPTIONS_BY_SPORT. Returns
     * null when the sport doesn't have a teaser product (baseball,
     * hockey, soccer, etc.). Single source of truth so frontend +
     * backend agree on grouping.
     */
    public static function teaserSportGroup(string $sportKeyOrId): ?string
    {
        $key = strtolower(trim($sportKeyOrId));
        if ($key === '') return null;
        if (str_starts_with($key, 'americanfootball_') || $key === 'football') return 'football';
        if (str_starts_with($key, 'basketball_') || $key === 'basketball') return 'basketball';
        return null;
    }

    /**
     * Allowed teaser point values for a given sport group, or empty
     * array for sports that don't have a teaser product.
     *
     * @return array<int, float>
     */
    public static function teaserPointOptionsForSport(string $sportKeyOrId): array
    {
        $group = self::teaserSportGroup($sportKeyOrId);
        if ($group === null) return [];
        $options = self::TEASER_POINT_OPTIONS_BY_SPORT[$group] ?? [];
        return array_map(static fn ($v) => (float) $v, $options);
    }

    /**
     * Full per-sport map (for API serialization to the frontend so it
     * doesn't need to duplicate the constants).
     *
     * @return array<string, array<int, float>>
     */
    public static function teaserPointOptionsBySport(): array
    {
        $out = [];
        foreach (self::TEASER_POINT_OPTIONS_BY_SPORT as $group => $opts) {
            $out[$group] = array_map(static fn ($v) => (float) $v, $opts);
        }
        return $out;
    }

    public static function normalize(string $mode): string
    {
        return str_replace('-', '_', strtolower(trim($mode === '' ? 'straight' : $mode)));
    }

    public static function getDefault(string $mode): ?array
    {
        $normalized = self::normalize($mode);
        foreach (self::DEFAULT_RULES as $rule) {
            if (($rule['mode'] ?? '') === $normalized) {
                return $rule;
            }
        }
        return null;
    }
}
