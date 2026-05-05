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
