<?php

declare(strict_types=1);

/**
 * Central registry of The Odds API market keys per sport.
 *
 * "core" markets work via the bulk /v4/sports/{sport}/odds endpoint.
 * "extended" markets (periods, alternates, team totals) require the
 * per-event /v4/sports/{sport}/events/{eventId}/odds endpoint.
 * "props" are player props; also per-event only; largest credit cost.
 */
final class OddsMarketCatalog
{
    public const CORE = ['h2h', 'spreads', 'totals'];

    private const CATALOG = [
        'basketball_nba' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals', 'team_totals', 'alternate_team_totals',
                'h2h_q1', 'h2h_q2', 'h2h_q3', 'h2h_q4',
                'h2h_h1', 'h2h_h2',
                'spreads_q1', 'spreads_q2', 'spreads_q3', 'spreads_q4',
                'spreads_h1', 'spreads_h2',
                'totals_q1', 'totals_q2', 'totals_q3', 'totals_q4',
                'totals_h1', 'totals_h2',
            ],
            'props' => [
                'player_points', 'player_rebounds', 'player_assists', 'player_threes',
                'player_blocks', 'player_steals', 'player_turnovers',
                'player_points_rebounds_assists', 'player_points_rebounds',
                'player_points_assists', 'player_rebounds_assists',
                'player_double_double', 'player_triple_double',
                'player_first_basket', 'player_method_of_first_basket',
                'player_field_goals', 'player_frees_made', 'player_frees_attempts',
                'player_points_alternate', 'player_rebounds_alternate',
                'player_assists_alternate', 'player_threes_alternate',
                'player_blocks_alternate', 'player_steals_alternate',
                'player_turnovers_alternate',
                'player_points_rebounds_assists_alternate',
                'player_points_rebounds_alternate',
                'player_points_assists_alternate',
                'player_rebounds_assists_alternate',
            ],
        ],
        'basketball_ncaab' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals', 'team_totals',
                'spreads_h1', 'spreads_h2', 'totals_h1', 'totals_h2', 'h2h_h1', 'h2h_h2',
            ],
            'props' => [
                'player_points', 'player_rebounds', 'player_assists', 'player_threes',
                'player_points_rebounds_assists', 'player_points_rebounds',
                'player_points_assists', 'player_rebounds_assists',
            ],
        ],
        'americanfootball_nfl' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals', 'team_totals', 'alternate_team_totals',
                'h2h_q1', 'h2h_q2', 'h2h_q3', 'h2h_q4', 'h2h_h1', 'h2h_h2',
                'spreads_q1', 'spreads_q2', 'spreads_q3', 'spreads_q4',
                'spreads_h1', 'spreads_h2',
                'totals_q1', 'totals_q2', 'totals_q3', 'totals_q4',
                'totals_h1', 'totals_h2',
            ],
            'props' => [
                'player_pass_tds', 'player_pass_yds', 'player_pass_completions',
                'player_pass_attempts', 'player_pass_interceptions',
                'player_pass_longest_completion', 'player_pass_rush_reception_tds',
                'player_pass_rush_reception_yds',
                'player_rush_yds', 'player_rush_attempts', 'player_rush_longest',
                'player_rush_reception_yds', 'player_rush_reception_tds',
                'player_reception_yds', 'player_receptions', 'player_reception_longest',
                'player_reception_tds',
                'player_kicking_points', 'player_field_goals',
                'player_tackles_assists', 'player_sacks', 'player_solo_tackles',
                'player_1st_td', 'player_last_td', 'player_anytime_td',
                'player_pass_yds_alternate', 'player_pass_tds_alternate',
                'player_rush_yds_alternate', 'player_rush_attempts_alternate',
                'player_reception_yds_alternate', 'player_receptions_alternate',
            ],
        ],
        'americanfootball_ncaaf' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals', 'team_totals',
                'h2h_q1', 'h2h_q2', 'h2h_q3', 'h2h_q4', 'h2h_h1', 'h2h_h2',
                'spreads_q1', 'spreads_q2', 'spreads_q3', 'spreads_q4',
                'spreads_h1', 'spreads_h2',
                'totals_q1', 'totals_q2', 'totals_q3', 'totals_q4',
                'totals_h1', 'totals_h2',
            ],
            'props' => [
                'player_pass_tds', 'player_pass_yds', 'player_rush_yds',
                'player_reception_yds', 'player_receptions', 'player_anytime_td',
            ],
        ],
        'baseball_mlb' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals', 'team_totals',
                'h2h_1st_1_innings', 'h2h_1st_3_innings', 'h2h_1st_5_innings', 'h2h_1st_7_innings',
                'totals_1st_1_innings', 'totals_1st_3_innings', 'totals_1st_5_innings', 'totals_1st_7_innings',
                'spreads_1st_1_innings', 'spreads_1st_3_innings', 'spreads_1st_5_innings', 'spreads_1st_7_innings',
            ],
            'props' => [
                'batter_home_runs', 'batter_hits', 'batter_total_bases', 'batter_rbis',
                'batter_runs_scored', 'batter_hits_runs_rbis', 'batter_singles',
                'batter_doubles', 'batter_triples', 'batter_walks', 'batter_strikeouts',
                'batter_stolen_bases', 'batter_first_home_run',
                'pitcher_strikeouts', 'pitcher_record_a_win', 'pitcher_hits_allowed',
                'pitcher_walks', 'pitcher_earned_runs', 'pitcher_outs',
                'batter_home_runs_alternate', 'batter_hits_alternate',
                'batter_total_bases_alternate', 'batter_rbis_alternate',
                'batter_walks_alternate', 'batter_runs_scored_alternate',
                'batter_singles_alternate', 'batter_doubles_alternate',
                'batter_triples_alternate', 'batter_strikeouts_alternate',
                'pitcher_strikeouts_alternate', 'pitcher_hits_allowed_alternate',
                'pitcher_walks_alternate', 'pitcher_earned_runs_alternate',
                'pitcher_outs_alternate',
            ],
        ],
        'icehockey_nhl' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals', 'team_totals',
                'h2h_3_way',
                'h2h_p1', 'h2h_p2', 'h2h_p3',
                'spreads_p1', 'spreads_p2', 'spreads_p3',
                'totals_p1', 'totals_p2', 'totals_p3',
            ],
            'props' => [
                'player_points', 'player_goals', 'player_assists',
                'player_power_play_points', 'player_blocked_shots',
                'player_shots_on_goal', 'player_total_saves',
                'player_goal_scorer_first', 'player_goal_scorer_last',
                'player_goal_scorer_anytime',
                'player_points_alternate', 'player_goals_alternate',
                'player_assists_alternate', 'player_shots_on_goal_alternate',
                'player_total_saves_alternate',
            ],
        ],
        'soccer_default' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals', 'team_totals',
                'h2h_h1', 'totals_h1', 'spreads_h1',
                'btts', 'btts_h1', 'draw_no_bet', 'double_chance',
            ],
            'props' => [
                'player_goal_scorer_anytime', 'player_first_goal_scorer',
                'player_last_goal_scorer', 'player_to_receive_card',
                'player_to_receive_red_card', 'player_shots_on_target',
                'player_shots', 'player_assists',
            ],
        ],
    ];

    /**
     * Returns the extended (period + alternate) markets supported for a sport key.
     *
     * @return string[]
     */
    public static function extendedMarkets(string $sportKey): array
    {
        $entry = self::CATALOG[$sportKey] ?? null;
        if ($entry === null && str_starts_with($sportKey, 'soccer_')) {
            $entry = self::CATALOG['soccer_default'];
        }
        return is_array($entry['extended'] ?? null) ? $entry['extended'] : [];
    }

    /**
     * Returns the player-prop market keys supported for a sport key.
     *
     * @return string[]
     */
    public static function propMarkets(string $sportKey): array
    {
        $entry = self::CATALOG[$sportKey] ?? null;
        if ($entry === null && str_starts_with($sportKey, 'soccer_')) {
            $entry = self::CATALOG['soccer_default'];
        }
        return is_array($entry['props'] ?? null) ? $entry['props'] : [];
    }

    /**
     * All markets (core + extended + props) that should be fetched via the
     * per-event endpoint for this sport.
     *
     * @return string[]
     */
    public static function perEventMarkets(string $sportKey): array
    {
        return array_values(array_unique(array_merge(
            self::CORE,
            self::extendedMarkets($sportKey),
            self::propMarkets($sportKey)
        )));
    }

    /**
     * Returns true if the market key is a player-prop market.
     */
    public static function isPropMarket(string $marketKey): bool
    {
        return str_starts_with($marketKey, 'player_')
            || str_starts_with($marketKey, 'batter_')
            || str_starts_with($marketKey, 'pitcher_');
    }
}
