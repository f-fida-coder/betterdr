<?php

declare(strict_types=1);

/**
 * Central registry of upstream market keys per sport.
 *
 * "core" markets work via the bulk per-sport odds endpoint.
 * "extended" markets (periods, alternates, team totals) require the
 * per-event odds endpoint.
 * "props" are player props; also per-event only; largest credit cost.
 */
final class OddsMarketCatalog
{
    public const CORE = ['h2h', 'spreads', 'totals'];

    private const CATALOG = [
        // NBA catalog verified against /v4 docs + live probe on
        // basketball_nba on 2026-05-20. Adds alt quarter/half spreads-
        // totals-team_totals, 1Q player props, blocks+steals combo,
        // first-team-basket, 3-way moneyline (regulation), and alt
        // double/triple/field-goals/free-throws props.
        // Invalid (do not re-add): player_2_pointers_made,
        // player_combined_points, player_to_score_first, race_to_15,
        // race_to_20.
        'basketball_nba' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'team_totals', 'alternate_team_totals',
                'h2h_3_way',
                'h2h_q1', 'h2h_q2', 'h2h_q3', 'h2h_q4',
                'h2h_h1', 'h2h_h2',
                'h2h_3_way_q1', 'h2h_3_way_q2', 'h2h_3_way_q3', 'h2h_3_way_q4',
                'h2h_3_way_h1', 'h2h_3_way_h2',
                'spreads_q1', 'spreads_q2', 'spreads_q3', 'spreads_q4',
                'spreads_h1', 'spreads_h2',
                'alternate_spreads_q1', 'alternate_spreads_q2',
                'alternate_spreads_q3', 'alternate_spreads_q4',
                'alternate_spreads_h1', 'alternate_spreads_h2',
                'totals_q1', 'totals_q2', 'totals_q3', 'totals_q4',
                'totals_h1', 'totals_h2',
                'alternate_totals_q1', 'alternate_totals_q2',
                'alternate_totals_q3', 'alternate_totals_q4',
                'alternate_totals_h1', 'alternate_totals_h2',
                'alternate_team_totals_q1', 'alternate_team_totals_q2',
                'alternate_team_totals_q3', 'alternate_team_totals_q4',
                'alternate_team_totals_h1', 'alternate_team_totals_h2',
            ],
            'props' => [
                'player_points', 'player_rebounds', 'player_assists', 'player_threes',
                'player_blocks', 'player_steals', 'player_turnovers',
                'player_blocks_steals',
                'player_points_q1', 'player_rebounds_q1', 'player_assists_q1',
                'player_points_rebounds_assists', 'player_points_rebounds',
                'player_points_assists', 'player_rebounds_assists',
                'player_double_double', 'player_triple_double',
                'player_first_basket', 'player_first_team_basket',
                'player_method_of_first_basket',
                'player_field_goals', 'player_frees_made', 'player_frees_attempts',
                'player_points_alternate', 'player_rebounds_alternate',
                'player_assists_alternate', 'player_threes_alternate',
                'player_blocks_alternate', 'player_steals_alternate',
                'player_turnovers_alternate',
                'player_double_double_alternate', 'player_triple_double_alternate',
                'player_field_goals_alternate', 'player_frees_made_alternate',
                'player_points_rebounds_assists_alternate',
                'player_points_rebounds_alternate',
                'player_points_assists_alternate',
                'player_rebounds_assists_alternate',
            ],
        ],
        // NCAAB is halves-only (no quarters). Mirrors NBA catalog where
        // applicable. NCAAB had 0 upcoming events on 2026-05-20 (off-
        // season) so probe relies on /v4 docs + NBA-verified keys.
        'basketball_ncaab' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'team_totals', 'alternate_team_totals',
                'h2h_3_way',
                'h2h_h1', 'h2h_h2',
                'h2h_3_way_h1', 'h2h_3_way_h2',
                'spreads_h1', 'spreads_h2',
                'alternate_spreads_h1', 'alternate_spreads_h2',
                'totals_h1', 'totals_h2',
                'alternate_totals_h1', 'alternate_totals_h2',
                'team_totals_h1', 'team_totals_h2',
                'alternate_team_totals_h1', 'alternate_team_totals_h2',
            ],
            'props' => [
                'player_points', 'player_rebounds', 'player_assists', 'player_threes',
                'player_blocks', 'player_steals', 'player_turnovers',
                'player_blocks_steals',
                'player_points_rebounds_assists', 'player_points_rebounds',
                'player_points_assists', 'player_rebounds_assists',
                'player_points_alternate', 'player_rebounds_alternate',
                'player_assists_alternate', 'player_threes_alternate',
                'player_points_rebounds_assists_alternate',
            ],
        ],
        // NFL catalog verified against /v4 docs + live probe on
        // americanfootball_nfl on 2026-05-20. Adds 3-way ML for
        // regulation + every period, alt period spreads/totals/team-
        // totals, team-totals per period, player_pass_yds_q1, PATs,
        // defensive interceptions, total-TD over/under, and a full set
        // of _alternate prop variants. Invalid (do not re-add):
        // player_pass_rush_tds (only _yds variant exists).
        'americanfootball_nfl' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'team_totals', 'alternate_team_totals',
                'h2h_3_way',
                'h2h_q1', 'h2h_q2', 'h2h_q3', 'h2h_q4',
                'h2h_h1', 'h2h_h2',
                'h2h_3_way_q1', 'h2h_3_way_q2', 'h2h_3_way_q3', 'h2h_3_way_q4',
                'h2h_3_way_h1', 'h2h_3_way_h2',
                'spreads_q1', 'spreads_q2', 'spreads_q3', 'spreads_q4',
                'spreads_h1', 'spreads_h2',
                'alternate_spreads_q1', 'alternate_spreads_q2',
                'alternate_spreads_q3', 'alternate_spreads_q4',
                'alternate_spreads_h1', 'alternate_spreads_h2',
                'totals_q1', 'totals_q2', 'totals_q3', 'totals_q4',
                'totals_h1', 'totals_h2',
                'alternate_totals_q1', 'alternate_totals_q2',
                'alternate_totals_q3', 'alternate_totals_q4',
                'alternate_totals_h1', 'alternate_totals_h2',
                'team_totals_q1', 'team_totals_q2', 'team_totals_q3', 'team_totals_q4',
                'team_totals_h1', 'team_totals_h2',
                'alternate_team_totals_q1', 'alternate_team_totals_q2',
                'alternate_team_totals_q3', 'alternate_team_totals_q4',
                'alternate_team_totals_h1', 'alternate_team_totals_h2',
            ],
            'props' => [
                'player_pass_tds', 'player_pass_yds', 'player_pass_yds_q1',
                'player_pass_completions', 'player_pass_attempts',
                'player_pass_interceptions',
                'player_pass_longest_completion',
                'player_pass_rush_yds',
                'player_pass_rush_reception_tds',
                'player_pass_rush_reception_yds',
                'player_rush_yds', 'player_rush_tds', 'player_rush_attempts', 'player_rush_longest',
                'player_rush_reception_yds', 'player_rush_reception_tds',
                'player_reception_yds', 'player_receptions', 'player_reception_longest',
                'player_reception_tds',
                'player_kicking_points', 'player_field_goals', 'player_pats',
                'player_tackles_assists', 'player_sacks', 'player_solo_tackles',
                'player_defensive_interceptions', 'player_assists',
                'player_1st_td', 'player_last_td', 'player_anytime_td', 'player_tds_over',
                'player_pass_yds_alternate', 'player_pass_tds_alternate',
                'player_pass_completions_alternate', 'player_pass_attempts_alternate',
                'player_pass_interceptions_alternate',
                'player_pass_longest_completion_alternate',
                'player_rush_yds_alternate', 'player_rush_attempts_alternate',
                'player_rush_longest_alternate', 'player_rush_tds_alternate',
                'player_reception_yds_alternate', 'player_receptions_alternate',
                'player_reception_longest_alternate', 'player_reception_tds_alternate',
                'player_kicking_points_alternate', 'player_pats_alternate',
                'player_sacks_alternate', 'player_tackles_assists_alternate',
                'player_solo_tackles_alternate', 'player_field_goals_alternate',
                'player_pass_rush_yds_alternate',
                'player_pass_rush_reception_yds_alternate',
                'player_pass_rush_reception_tds_alternate',
                'player_rush_reception_yds_alternate',
                'player_rush_reception_tds_alternate',
            ],
        ],
        // NCAAF catalog matches NFL — verified via probe on
        // americanfootball_ncaaf on 2026-05-20 (Week 1 season-opener).
        // All NFL extended keys + props accepted by API for NCAAF.
        'americanfootball_ncaaf' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'team_totals', 'alternate_team_totals',
                'h2h_3_way',
                'h2h_q1', 'h2h_q2', 'h2h_q3', 'h2h_q4',
                'h2h_h1', 'h2h_h2',
                'h2h_3_way_q1', 'h2h_3_way_q2', 'h2h_3_way_q3', 'h2h_3_way_q4',
                'h2h_3_way_h1', 'h2h_3_way_h2',
                'spreads_q1', 'spreads_q2', 'spreads_q3', 'spreads_q4',
                'spreads_h1', 'spreads_h2',
                'alternate_spreads_q1', 'alternate_spreads_q2',
                'alternate_spreads_q3', 'alternate_spreads_q4',
                'alternate_spreads_h1', 'alternate_spreads_h2',
                'totals_q1', 'totals_q2', 'totals_q3', 'totals_q4',
                'totals_h1', 'totals_h2',
                'alternate_totals_q1', 'alternate_totals_q2',
                'alternate_totals_q3', 'alternate_totals_q4',
                'alternate_totals_h1', 'alternate_totals_h2',
                'team_totals_q1', 'team_totals_q2', 'team_totals_q3', 'team_totals_q4',
                'team_totals_h1', 'team_totals_h2',
                'alternate_team_totals_q1', 'alternate_team_totals_q2',
                'alternate_team_totals_q3', 'alternate_team_totals_q4',
                'alternate_team_totals_h1', 'alternate_team_totals_h2',
            ],
            'props' => [
                'player_pass_tds', 'player_pass_yds', 'player_pass_yds_q1',
                'player_pass_completions', 'player_pass_attempts',
                'player_pass_interceptions', 'player_pass_longest_completion',
                'player_pass_rush_yds',
                'player_rush_yds', 'player_rush_tds', 'player_rush_attempts', 'player_rush_longest',
                'player_rush_reception_yds', 'player_rush_reception_tds',
                'player_reception_yds', 'player_receptions', 'player_reception_longest',
                'player_reception_tds',
                'player_kicking_points', 'player_field_goals', 'player_pats',
                'player_tackles_assists', 'player_sacks', 'player_solo_tackles',
                'player_defensive_interceptions', 'player_assists',
                'player_1st_td', 'player_last_td', 'player_anytime_td', 'player_tds_over',
                'player_pass_yds_alternate', 'player_pass_tds_alternate',
                'player_pass_completions_alternate', 'player_pass_attempts_alternate',
                'player_pass_interceptions_alternate',
                'player_pass_longest_completion_alternate',
                'player_rush_yds_alternate', 'player_rush_attempts_alternate',
                'player_rush_longest_alternate', 'player_rush_tds_alternate',
                'player_reception_yds_alternate', 'player_receptions_alternate',
                'player_reception_longest_alternate', 'player_reception_tds_alternate',
                'player_kicking_points_alternate', 'player_pats_alternate',
                'player_sacks_alternate', 'player_tackles_assists_alternate',
                'player_solo_tackles_alternate', 'player_field_goals_alternate',
                'player_pass_rush_yds_alternate',
            ],
        ],
        // MLB catalog verified against /v4 docs + live probe on
        // baseball_mlb on 2026-05-20. Adds full-game 3-way ML, 3-way
        // per inning split, alt spreads/totals per inning split,
        // alternate_team_totals (game-level), team_totals_1st_5_innings
        // (only 5-inning team-totals split that exists), first/last
        // team to score, and batter fantasy/HRR alts.
        // Invalid (do not re-add): team_totals_1st_1/3/7_innings,
        // alternate_team_totals_1st_*_innings, batter_first_home_run_alternate,
        // pitcher_record_a_win_alternate, batter_anytime_home_run,
        // batter_to_hit_a_home_run, first_run_scorer, both_teams_to_score.
        'baseball_mlb' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'team_totals', 'alternate_team_totals',
                'h2h_3_way',
                'h2h_1st_1_innings', 'h2h_1st_3_innings', 'h2h_1st_5_innings', 'h2h_1st_7_innings',
                'h2h_3_way_1st_1_innings', 'h2h_3_way_1st_3_innings',
                'h2h_3_way_1st_5_innings', 'h2h_3_way_1st_7_innings',
                'totals_1st_1_innings', 'totals_1st_3_innings', 'totals_1st_5_innings', 'totals_1st_7_innings',
                'spreads_1st_1_innings', 'spreads_1st_3_innings', 'spreads_1st_5_innings', 'spreads_1st_7_innings',
                'alternate_spreads_1st_1_innings', 'alternate_spreads_1st_3_innings',
                'alternate_spreads_1st_5_innings', 'alternate_spreads_1st_7_innings',
                'alternate_totals_1st_1_innings', 'alternate_totals_1st_3_innings',
                'alternate_totals_1st_5_innings', 'alternate_totals_1st_7_innings',
                'team_totals_1st_5_innings',
                'first_team_to_score', 'last_team_to_score',
            ],
            'props' => [
                'batter_home_runs', 'batter_hits', 'batter_total_bases', 'batter_rbis',
                'batter_runs_scored', 'batter_hits_runs_rbis', 'batter_singles',
                'batter_doubles', 'batter_triples', 'batter_walks', 'batter_strikeouts',
                'batter_stolen_bases', 'batter_first_home_run',
                'batter_fantasy_score',
                'pitcher_strikeouts', 'pitcher_record_a_win', 'pitcher_hits_allowed',
                'pitcher_walks', 'pitcher_earned_runs', 'pitcher_outs',
                'batter_home_runs_alternate', 'batter_hits_alternate',
                'batter_total_bases_alternate', 'batter_rbis_alternate',
                'batter_walks_alternate', 'batter_runs_scored_alternate',
                'batter_singles_alternate', 'batter_doubles_alternate',
                'batter_triples_alternate', 'batter_strikeouts_alternate',
                'batter_hits_runs_rbis_alternate', 'batter_fantasy_score_alternate',
                'pitcher_strikeouts_alternate', 'pitcher_hits_allowed_alternate',
                'pitcher_walks_alternate', 'pitcher_earned_runs_alternate',
                'pitcher_outs_alternate',
            ],
        ],
        // NHL catalog verified against /v4 docs + live probe on
        // icehockey_nhl on 2026-05-20. Adds 3-way ML per period, alt
        // period spreads/totals/team-totals, alternate_team_totals
        // (game-level), first/last team to score, player_hits,
        // player_faceoffs_won, player_shots (general shots, not just
        // on goal), and missing _alternate prop variants.
        // Invalid (do not re-add): player_penalty_minutes,
        // player_takeaways, player_giveaways, player_short_handed_points,
        // player_plus_minus, both_teams_to_score, empty_net_goal,
        // overtime_yes_no, player_anytime_goal_scorer (use
        // player_goal_scorer_anytime).
        'icehockey_nhl' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'team_totals', 'alternate_team_totals',
                'h2h_3_way',
                'h2h_p1', 'h2h_p2', 'h2h_p3',
                'h2h_3_way_p1', 'h2h_3_way_p2', 'h2h_3_way_p3',
                'spreads_p1', 'spreads_p2', 'spreads_p3',
                'alternate_spreads_p1', 'alternate_spreads_p2', 'alternate_spreads_p3',
                'totals_p1', 'totals_p2', 'totals_p3',
                'alternate_totals_p1', 'alternate_totals_p2', 'alternate_totals_p3',
                'team_totals_p1', 'team_totals_p2', 'team_totals_p3',
                'alternate_team_totals_p1', 'alternate_team_totals_p2', 'alternate_team_totals_p3',
                'first_team_to_score', 'last_team_to_score',
            ],
            'props' => [
                'player_points', 'player_goals', 'player_assists',
                'player_power_play_points', 'player_blocked_shots',
                'player_shots_on_goal', 'player_shots',
                'player_total_saves', 'player_hits', 'player_faceoffs_won',
                'player_goal_scorer_first', 'player_goal_scorer_last',
                'player_goal_scorer_anytime',
                'player_points_alternate', 'player_goals_alternate',
                'player_assists_alternate', 'player_shots_on_goal_alternate',
                'player_total_saves_alternate',
                'player_power_play_points_alternate',
                'player_blocked_shots_alternate',
            ],
        ],
        // Soccer catalog verified against /v4 docs + live probe on
        // soccer_uefa_champs_league on 2026-05-20. Includes corners/cards
        // (alt-only — non-alt forms 422), Asian handicap (alt-only),
        // h1/h2 variants of 3-way / btts / draw_no_bet / double_chance /
        // team_totals, and first/last team to score. asian_handicap,
        // total_corners, total_cards, clean_sheet, three_way_handicap,
        // total_shots, player_card, both_halves_over/under all return
        // INVALID_MARKET and must not be re-added without re-probing.
        'soccer_default' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'alternate_asian_handicap',
                'team_totals', 'alternate_team_totals',
                'team_totals_h1', 'team_totals_h2',
                'alternate_team_totals_h1', 'alternate_team_totals_h2',
                'h2h_h1', 'h2h_h2',
                'h2h_3_way', 'h2h_3_way_h1', 'h2h_3_way_h2',
                'spreads_h1', 'spreads_h2',
                'totals_h1', 'totals_h2',
                'btts', 'btts_h1', 'btts_h2',
                'draw_no_bet', 'draw_no_bet_h1', 'draw_no_bet_h2',
                'double_chance', 'double_chance_h1', 'double_chance_h2',
                'first_team_to_score', 'last_team_to_score',
                'alternate_spreads_corners', 'alternate_totals_corners',
                'alternate_spreads_cards', 'alternate_totals_cards',
            ],
            'props' => [
                'player_goal_scorer_anytime',
                'player_first_goal_scorer', 'player_last_goal_scorer',
                'player_to_receive_card', 'player_to_receive_red_card',
                'player_shots_on_target', 'player_shots',
                'player_assists',
            ],
        ],
        // WNBA catalog matches NBA — verified via probe on basketball_wnba
        // on 2026-05-20. All NBA extended + prop keys accepted.
        'basketball_wnba' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'team_totals', 'alternate_team_totals',
                'h2h_3_way',
                'h2h_q1', 'h2h_q2', 'h2h_q3', 'h2h_q4',
                'h2h_h1', 'h2h_h2',
                'h2h_3_way_q1', 'h2h_3_way_q2', 'h2h_3_way_q3', 'h2h_3_way_q4',
                'h2h_3_way_h1', 'h2h_3_way_h2',
                'spreads_q1', 'spreads_q2', 'spreads_q3', 'spreads_q4',
                'spreads_h1', 'spreads_h2',
                'alternate_spreads_q1', 'alternate_spreads_q2',
                'alternate_spreads_q3', 'alternate_spreads_q4',
                'alternate_spreads_h1', 'alternate_spreads_h2',
                'totals_q1', 'totals_q2', 'totals_q3', 'totals_q4',
                'totals_h1', 'totals_h2',
                'alternate_totals_q1', 'alternate_totals_q2',
                'alternate_totals_q3', 'alternate_totals_q4',
                'alternate_totals_h1', 'alternate_totals_h2',
                'alternate_team_totals_q1', 'alternate_team_totals_q2',
                'alternate_team_totals_q3', 'alternate_team_totals_q4',
                'alternate_team_totals_h1', 'alternate_team_totals_h2',
            ],
            'props' => [
                'player_points', 'player_rebounds', 'player_assists', 'player_threes',
                'player_blocks', 'player_steals', 'player_turnovers',
                'player_blocks_steals',
                'player_points_q1', 'player_rebounds_q1', 'player_assists_q1',
                'player_points_rebounds_assists', 'player_points_rebounds',
                'player_points_assists', 'player_rebounds_assists',
                'player_double_double', 'player_triple_double',
                'player_first_basket', 'player_first_team_basket',
                'player_field_goals', 'player_frees_made',
                'player_points_alternate', 'player_rebounds_alternate',
                'player_assists_alternate', 'player_threes_alternate',
                'player_blocks_alternate', 'player_steals_alternate',
                'player_double_double_alternate',
                'player_field_goals_alternate', 'player_frees_made_alternate',
                'player_points_rebounds_assists_alternate',
            ],
        ],
        // Euroleague catalog matches NBA structure — verified via probe on
        // basketball_euroleague on 2026-05-20. Note: US books rarely price
        // Euroleague props; UK/EU books carry more. Keys are accepted by
        // API regardless of which region's books supply data.
        'basketball_euroleague' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'team_totals', 'alternate_team_totals',
                'h2h_3_way',
                'h2h_q1', 'h2h_q2', 'h2h_q3', 'h2h_q4',
                'h2h_h1', 'h2h_h2',
                'h2h_3_way_q1', 'h2h_3_way_q2', 'h2h_3_way_q3', 'h2h_3_way_q4',
                'h2h_3_way_h1', 'h2h_3_way_h2',
                'spreads_q1', 'spreads_q2', 'spreads_q3', 'spreads_q4',
                'spreads_h1', 'spreads_h2',
                'alternate_spreads_q1', 'alternate_spreads_q2',
                'alternate_spreads_q3', 'alternate_spreads_q4',
                'alternate_spreads_h1', 'alternate_spreads_h2',
                'totals_q1', 'totals_q2', 'totals_q3', 'totals_q4',
                'totals_h1', 'totals_h2',
                'alternate_totals_q1', 'alternate_totals_q2',
                'alternate_totals_q3', 'alternate_totals_q4',
                'alternate_totals_h1', 'alternate_totals_h2',
                'alternate_team_totals_q1', 'alternate_team_totals_q2',
                'alternate_team_totals_q3', 'alternate_team_totals_q4',
                'alternate_team_totals_h1', 'alternate_team_totals_h2',
            ],
            'props' => [
                'player_points', 'player_rebounds', 'player_assists', 'player_threes',
                'player_blocks', 'player_steals', 'player_turnovers',
                'player_blocks_steals',
                'player_points_q1', 'player_rebounds_q1', 'player_assists_q1',
                'player_points_rebounds_assists', 'player_points_rebounds',
                'player_points_assists', 'player_rebounds_assists',
                'player_double_double', 'player_triple_double',
                'player_first_basket', 'player_first_team_basket',
                'player_field_goals', 'player_frees_made',
                'player_points_alternate', 'player_rebounds_alternate',
                'player_assists_alternate', 'player_threes_alternate',
                'player_field_goals_alternate', 'player_frees_made_alternate',
                'player_points_rebounds_assists_alternate',
            ],
        ],
        // Generic basketball fallback for any league not explicitly listed
        // (e.g. China CBA, FIBA tournaments). All keys are the safe halves-
        // based subset of NBA markets — leagues using quarters get their
        // own explicit entry. Verified via the same NBA probe set on
        // 2026-05-20: every halves-only key validates.
        'basketball_default' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'team_totals', 'alternate_team_totals',
                'h2h_3_way',
                'h2h_h1', 'h2h_h2',
                'h2h_3_way_h1', 'h2h_3_way_h2',
                'spreads_h1', 'spreads_h2',
                'alternate_spreads_h1', 'alternate_spreads_h2',
                'totals_h1', 'totals_h2',
                'alternate_totals_h1', 'alternate_totals_h2',
                'team_totals_h1', 'team_totals_h2',
                'alternate_team_totals_h1', 'alternate_team_totals_h2',
            ],
            'props' => [
                'player_points', 'player_rebounds', 'player_assists', 'player_threes',
                'player_blocks', 'player_steals',
                'player_points_rebounds_assists', 'player_points_rebounds',
                'player_points_assists', 'player_rebounds_assists',
            ],
        ],
        // Tennis fallback for ATP/WTA tournaments. Upstream only exposes
        // featured markets for tennis — per-set markets, set betting, and
        // player props (aces, games_won, etc.) all return INVALID_MARKET.
        // Verified against /v4/sports/tennis_atp_french_open/events/<id>/odds
        // on 2026-05-20. Keep this list minimal so extended sync doesn't
        // waste API calls on 422s.
        'tennis_default' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
            ],
            'props' => [],
        ],
        // Cricket fallback for IPL / ODI / T20 / Test / PSL etc. Verified
        // against /v4 docs (which don't list any cricket markets) + live
        // probe on cricket_ipl + cricket_t20_blast on 2026-05-20.
        // **Every cricket-specific market returns INVALID_MARKET** —
        // batsman_runs/fours/sixes, bowler_total_wickets/runs_conceded,
        // player_top_batsman/bowler, player_man_of_the_match, totals_1st_*_overs,
        // total_sixes/fours/runs/wickets, top_run_scorer, top_wicket_taker,
        // super_over, tie_yes_no, first_innings_total, toss_winner, etc.
        // Upstream only exposes generic markets for cricket. Catalog kept
        // minimal so extended sync doesn't waste calls on 422s.
        'cricket_default' => [
            'extended' => [
                'alternate_spreads', 'alternate_totals',
                'team_totals', 'h2h_3_way',
            ],
            'props' => [],
        ],
        // Combat sports verified against /v4 docs (which don't list any
        // combat-specific markets) + live probe on mma_mixed_martial_arts
        // and boxing_boxing on 2026-05-20. **Every combat-specific market
        // returns INVALID_MARKET** — method_of_victory, round_betting,
        // fight_to_go_distance, fight_result_method, winning_round,
        // total_rounds, fight_outcome, method_of_finish, winner_method,
        // fighter_to_win_by_ko/submission/decision. Upstream only exposes
        // generic h2h + alt lines for combat. Catalog kept minimal so
        // extended sync doesn't waste calls on 422s.
        'mma_mixed_martial_arts' => [
            'extended' => [
                'h2h_3_way',
                'alternate_spreads', 'alternate_totals',
            ],
            'props' => [],
        ],
        'boxing_boxing' => [
            'extended' => [
                'h2h_3_way',
                'alternate_spreads', 'alternate_totals',
            ],
            'props' => [],
        ],
    ];

    /**
     * Resolve a CATALOG entry for a sport key, applying prefix-based
     * fallbacks for league families (soccer, basketball, tennis, cricket).
     * Returns null if no specific or default entry exists — sports like
     * F1/NASCAR have outright-only markets and don't appear here.
     *
     * @return array{extended:string[], props:string[]}|null
     */
    private static function resolveEntry(string $sportKey): ?array
    {
        if (isset(self::CATALOG[$sportKey])) {
            return self::CATALOG[$sportKey];
        }
        if (str_starts_with($sportKey, 'soccer_')) {
            return self::CATALOG['soccer_default'] ?? null;
        }
        if (str_starts_with($sportKey, 'basketball_')) {
            return self::CATALOG['basketball_default'] ?? null;
        }
        if (str_starts_with($sportKey, 'tennis_')) {
            return self::CATALOG['tennis_default'] ?? null;
        }
        if (str_starts_with($sportKey, 'cricket_')) {
            return self::CATALOG['cricket_default'] ?? null;
        }
        return null;
    }

    /**
     * Returns the extended (period + alternate) markets supported for a sport key.
     *
     * @return string[]
     */
    public static function extendedMarkets(string $sportKey): array
    {
        $entry = self::resolveEntry($sportKey);
        return is_array($entry['extended'] ?? null) ? $entry['extended'] : [];
    }

    /**
     * Returns the player-prop market keys supported for a sport key.
     *
     * @return string[]
     */
    public static function propMarkets(string $sportKey): array
    {
        $entry = self::resolveEntry($sportKey);
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
     *
     * Prefixes:
     *   player_   — most sports (NBA, NFL, NHL, soccer, tennis)
     *   batter_   — MLB hitter props
     *   pitcher_  — MLB pitcher props
     *   batsman_  — cricket batter props
     *   bowler_   — cricket bowler props
     * Combat-sports markets (method_of_victory, round_betting, fight_*,
     * winning_round) are also classified as props since they describe
     * how a fight ends rather than the result line.
     */
    public static function isPropMarket(string $marketKey): bool
    {
        return str_starts_with($marketKey, 'player_')
            || str_starts_with($marketKey, 'batter_')
            || str_starts_with($marketKey, 'pitcher_')
            || str_starts_with($marketKey, 'batsman_')
            || str_starts_with($marketKey, 'bowler_')
            || str_starts_with($marketKey, 'fight_')
            || $marketKey === 'method_of_victory'
            || $marketKey === 'round_betting'
            || $marketKey === 'winning_round';
    }
}
