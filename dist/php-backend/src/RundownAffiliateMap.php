<?php

declare(strict_types=1);

/**
 * Maps TheRundown numeric affiliate IDs to the codebase's existing
 * odds-api-style bookmaker shape ({ key, name }).
 *
 * The EventMapper uses this to convert Rundown's per-affiliate prices
 * into matches.doc.odds.bookmakers[] entries the frontend already knows
 * how to render — no frontend changes required.
 *
 * Source-of-truth: https://docs.therundown.io/reference/affiliates
 */
final class RundownAffiliateMap
{
    /** @var array<int,array{key:string,name:string}> */
    private const CATALOG = [
        2  => ['key' => 'bovada',        'name' => 'Bovada'],
        3  => ['key' => 'pinnacle',      'name' => 'Pinnacle'],
        4  => ['key' => 'sportsbetting', 'name' => 'Sportsbetting'],
        6  => ['key' => 'betonline',     'name' => 'BetOnline'],
        11 => ['key' => 'lowvig',        'name' => 'LowVig'],
        12 => ['key' => 'bodog',         'name' => 'Bodog'],
        14 => ['key' => 'intertops',     'name' => 'Intertops'],
        16 => ['key' => 'matchbook',     'name' => 'Matchbook'],
        18 => ['key' => 'youwager',      'name' => 'YouWager'],
        19 => ['key' => 'draftkings',    'name' => 'DraftKings'],
        21 => ['key' => 'unibet',        'name' => 'Unibet'],
        22 => ['key' => 'betmgm',        'name' => 'BetMGM'],
        23 => ['key' => 'fanduel',       'name' => 'FanDuel'],
        24 => ['key' => 'thescore',      'name' => 'theScore Bet'],
        25 => ['key' => 'kalshi',        'name' => 'Kalshi'],
        26 => ['key' => 'polymarket',    'name' => 'Polymarket'],
        27 => ['key' => 'bet365',        'name' => 'Bet365'],
        28 => ['key' => 'hardrock',      'name' => 'Hard Rock Bet'],
    ];

    /** @return array{key:string,name:string}|null */
    public static function lookup(int $affiliateId): ?array
    {
        return self::CATALOG[$affiliateId] ?? null;
    }

    public static function key(int $affiliateId): ?string
    {
        return self::CATALOG[$affiliateId]['key'] ?? null;
    }

    public static function name(int $affiliateId): ?string
    {
        return self::CATALOG[$affiliateId]['name'] ?? null;
    }

    /** @return list<int> */
    public static function allKnownIds(): array
    {
        return array_keys(self::CATALOG);
    }

    /**
     * Resolve an env-style preferred-books list ("draftkings,fanduel,…")
     * to a list of Rundown affiliate IDs. Unknown keys are skipped.
     *
     * @return list<int>
     */
    public static function affiliateIdsFromKeyList(string $csv): array
    {
        $out = [];
        foreach (explode(',', $csv) as $rawKey) {
            $key = strtolower(trim($rawKey));
            if ($key === '') continue;
            foreach (self::CATALOG as $id => $entry) {
                if ($entry['key'] === $key) {
                    $out[] = $id;
                    break;
                }
            }
        }
        return $out;
    }
}
