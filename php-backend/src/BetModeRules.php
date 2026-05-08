<?php

declare(strict_types=1);

final class BetModeRules
{
    /**
     * Default teaser-type catalog. Each entry is a complete bundle of
     * (point values, ties rule, payout profile) so the operator can
     * publish multiple variants from one mode rule and the bettor
     * picks one before the slip is built.
     *
     * Source of truth for both the new `teaserTypes` API field AND the
     * legacy `teaserPointOptions` / `teaserPointOptionsBySport` fields,
     * which are derived from the union of `pointsBySport` across active
     * types so older clients keep working.
     *
     * Higher-points tier = worse odds (more book hold). Stored value is
     * DECIMAL ODDS — the backend computes total payout as risk × multiplier
     * (SportsbookBetSupport::potentialPayout), and the slip mirrors that
     * shape. Conversions: -110 = 1.90909, -140 = 1.71429, +160 = 2.6, etc.
     */
    private const DEFAULT_TEASER_TYPES = [
        [
            'id' => 'standard_6_4',
            'label' => '6 PT FB / 4 PT BK',
            'description' => 'Standard teaser — Ties Push',
            'pointsBySport' => [
                'football' => 6.0,
                'basketball' => 4.0,
            ],
            'tiesRule' => 'push',
            'payoutMode' => 'multiplier',
            'payoutProfile' => [
                'type' => 'table_multiplier',
                'multipliers' => [
                    '2' => 1.90909, // -110
                    '3' => 1.71429, // -140
                    '4' => 2.6,     // +160
                    '5' => 3.5,     // +250
                    '6' => 5.0,     // +400
                ],
            ],
            'minLegs' => 2,
            'maxLegs' => 6,
            'isActive' => true,
            'sortOrder' => 1,
        ],
        [
            'id' => 'standard_65_45',
            'label' => '6.5 PT FB / 4.5 PT BK',
            'description' => 'Standard teaser — Ties Push',
            'pointsBySport' => [
                'football' => 6.5,
                'basketball' => 4.5,
            ],
            'tiesRule' => 'push',
            'payoutMode' => 'multiplier',
            'payoutProfile' => [
                'type' => 'table_multiplier',
                'multipliers' => [
                    '2' => 1.83333, // -120
                    '3' => 1.625,   // -160
                    '4' => 2.3,     // +130
                    '5' => 3.0,     // +200
                    '6' => 4.0,     // +300
                ],
            ],
            'minLegs' => 2,
            'maxLegs' => 6,
            'isActive' => true,
            'sortOrder' => 2,
        ],
        [
            'id' => 'standard_7_5',
            'label' => '7 PT FB / 5 PT BK',
            'description' => 'Standard teaser — Ties Push',
            'pointsBySport' => [
                'football' => 7.0,
                'basketball' => 5.0,
            ],
            'tiesRule' => 'push',
            'payoutMode' => 'multiplier',
            'payoutProfile' => [
                'type' => 'table_multiplier',
                'multipliers' => [
                    '2' => 1.76923, // -130
                    '3' => 1.55556, // -180
                    '4' => 2.1,     // +110
                    '5' => 2.6,     // +160
                    '6' => 3.5,     // +250
                ],
            ],
            'minLegs' => 2,
            'maxLegs' => 6,
            'isActive' => true,
            'sortOrder' => 3,
        ],
        [
            'id' => 'super_10_team',
            'label' => '10 PT FB Super Teaser',
            'description' => 'Football-only · Ties Lose',
            'pointsBySport' => [
                'football' => 10.0,
                // Basketball intentionally omitted — Super Teasers are
                // football-only by industry convention. If basketball
                // support needed later, add 'basketball' => 8.0 here
                // and seed appropriate multipliers.
            ],
            'tiesRule' => 'lose',
            'payoutMode' => 'multiplier',
            'payoutProfile' => [
                'type' => 'table_multiplier',
                'multipliers' => [
                    // TODO(ops): Industry-standard Super Teaser starting
                    // pricing — book-favored defaults. Tune via betmoderules
                    // DB row per your margin model. Reference ranges:
                    //   3-team:  -120 to -150 (current: -150)
                    //   4-team:  +110 to +180 (current: +110)
                    //   5-team:  +160 to +400 (current: +160)
                    //   6-team:  +250 to +900 (current: +250)
                    '3' => 1.66667, // -150
                    '4' => 2.10,    // +110
                    '5' => 2.60,    // +160
                    '6' => 3.50,    // +250
                    // 2-team intentionally omitted — see minLegs below
                ],
            ],
            'minLegs' => 3, // Super Teasers restricted to 3+ teams
            'maxLegs' => 6,
            'isActive' => true,
            'sortOrder' => 4,
        ],
    ];

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
            // Legacy flat list. Derived at runtime via getDefault() so the
            // single source of truth is DEFAULT_TEASER_TYPES — old clients
            // that read $rule['teaserPointOptions'] keep working.
            'teaserPointOptions' => [],
            // Ticket-level fallback used at placement when the request
            // arrives without a `teaserTypeId` (legacy clients). Mirrors
            // standard_6_4's multipliers so behavior is identical.
            'payoutProfile' => [
                'type' => 'table_multiplier',
                'multipliers' => [
                    '2' => 1.90909, // -110
                    '3' => 1.71429, // -140
                    '4' => 2.6,     // +160
                    '5' => 3.5,     // +250
                    '6' => 5.0,     // +400
                ],
            ],
            // NEW: structured list of teaser variants. Frontend renders
            // a picker before games show; backend validates `teaserTypeId`
            // at placement and pulls tiesRule + per-sport points from here.
            // Empty when stored in DEFAULT_RULES — populated by getDefault().
            'teaserTypes' => [],
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
     * Map a sport key (Odds API style) or static-tree sport id to the
     * teaser sport group used by teaser type pointsBySport entries.
     * Returns null when the sport doesn't have a teaser product (baseball,
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
     * Active teaser types from the default catalog, sorted by sortOrder.
     * Use this as the authoritative list when seeding the betmoderules
     * row. Once the row is in DB the operator can edit it directly to
     * activate/deactivate types or tune multipliers.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function defaultTeaserTypes(): array
    {
        $types = array_values(array_filter(
            self::DEFAULT_TEASER_TYPES,
            static fn (array $t): bool => ($t['isActive'] ?? true) === true
        ));
        usort($types, static function (array $a, array $b): int {
            return ((int) ($a['sortOrder'] ?? 0)) <=> ((int) ($b['sortOrder'] ?? 0));
        });
        return $types;
    }

    /**
     * Look up a teaser type by id. Searches the supplied rule's
     * `teaserTypes` first (so DB-edited rules win); falls back to the
     * default catalog so callers can resolve legacy/built-in ids even
     * if the DB row was never re-seeded.
     *
     * @param array<string, mixed>|null $rule full teaser mode rule (may be null to skip DB lookup)
     * @return array<string, mixed>|null
     */
    public static function findTeaserType(string $id, ?array $rule = null): ?array
    {
        $needle = trim($id);
        if ($needle === '') return null;
        if (is_array($rule) && isset($rule['teaserTypes']) && is_array($rule['teaserTypes'])) {
            foreach ($rule['teaserTypes'] as $type) {
                if (is_array($type) && (string) ($type['id'] ?? '') === $needle) {
                    return $type;
                }
            }
        }
        foreach (self::DEFAULT_TEASER_TYPES as $type) {
            if ((string) ($type['id'] ?? '') === $needle) {
                return $type;
            }
        }
        return null;
    }

    /**
     * Allowed teaser point values for a given sport group, derived from
     * the active teaser types' pointsBySport entries. Returns empty for
     * sports that don't have a teaser product.
     *
     * @return array<int, float>
     */
    public static function teaserPointOptionsForSport(string $sportKeyOrId): array
    {
        $group = self::teaserSportGroup($sportKeyOrId);
        if ($group === null) return [];
        $bySport = self::teaserPointOptionsBySport();
        return $bySport[$group] ?? [];
    }

    /**
     * Per-sport-group point options derived from the active teaser
     * types. Used by older API consumers / the legacy frontend selector
     * that reads `teaserPointOptionsBySport` directly. Single source of
     * truth is DEFAULT_TEASER_TYPES — change types there, this updates.
     *
     * @return array<string, array<int, float>>
     */
    public static function teaserPointOptionsBySport(): array
    {
        $out = [];
        foreach (self::defaultTeaserTypes() as $type) {
            $points = is_array($type['pointsBySport'] ?? null) ? $type['pointsBySport'] : [];
            foreach ($points as $sport => $value) {
                $sportKey = (string) $sport;
                if ($sportKey === '' || !is_numeric($value)) continue;
                if (!isset($out[$sportKey])) {
                    $out[$sportKey] = [];
                }
                $out[$sportKey][] = (float) $value;
            }
        }
        foreach ($out as $sport => &$values) {
            $values = array_values(array_unique($values, SORT_REGULAR));
            sort($values);
        }
        unset($values);
        return $out;
    }

    /**
     * Flat union of every point value across all active teaser types
     * (legacy `teaserPointOptions` field, kept for backward compat).
     *
     * @return array<int, float>
     */
    public static function teaserPointOptionsFlat(): array
    {
        $flat = [];
        foreach (self::teaserPointOptionsBySport() as $points) {
            foreach ($points as $value) {
                $flat[] = (float) $value;
            }
        }
        $flat = array_values(array_unique($flat, SORT_REGULAR));
        sort($flat);
        return $flat;
    }

    public static function normalize(string $mode): string
    {
        return str_replace('-', '_', strtolower(trim($mode === '' ? 'straight' : $mode)));
    }

    public static function getDefault(string $mode): ?array
    {
        $normalized = self::normalize($mode);
        foreach (self::DEFAULT_RULES as $rule) {
            if (($rule['mode'] ?? '') !== $normalized) {
                continue;
            }
            // Hydrate teaser rule with derived fields so a fresh seed
            // includes teaserTypes + the legacy point arrays without
            // duplicating data in the DEFAULT_RULES literal above.
            if ($normalized === 'teaser') {
                $rule['teaserTypes'] = self::defaultTeaserTypes();
                $rule['teaserPointOptions'] = self::teaserPointOptionsFlat();
            }
            return $rule;
        }
        return null;
    }
}
