/**
 * Shared market metadata for the unified Prop Builder screen.
 *
 * This mirrors the lookup tables that live inside MatchDetailView (game /
 * period / alt markets) and PropBuilderModal (player-prop labels + book
 * dedupe). Those two components keep their own copies because they sit on
 * the money path (each dispatches `betslip:add`) and we don't want a refactor
 * to risk that flow — this module is the read-only metadata the *new*
 * PropBuilderView consumes. Keep the values in sync if the originals change.
 *
 * Nothing here touches balances or bet placement — these are pure label /
 * ordering helpers. The selection strings that ARE load-bearing for leg
 * validation are built in the view, copied verbatim from the originals.
 */

// ---------------------------------------------------------------------------
// Game-props / alt / period sections (mirrors MatchDetailView SECTION_DEFS).
// `kind` drives which renderer the view uses.
// ---------------------------------------------------------------------------
export const GAME_PROP_SECTIONS = [
    { key: 'alternate_spreads', label: 'Alt Game Spread', kind: 'alt-lines' },
    { key: 'alternate_totals', label: 'Alt Game Total', kind: 'alt-lines' },
    { key: 'team_totals', label: 'Team Totals', kind: 'team-totals' },
    { key: 'alternate_team_totals', label: 'Alt Team Totals', kind: 'team-totals' },

    { key: 'alternate_spreads_h1', label: 'Alt 1st Half Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_h1', label: 'Alt 1st Half Total', kind: 'alt-lines' },
    { key: 'team_totals_h1', label: '1st Half Team Totals', kind: 'team-totals' },
    { key: 'alternate_spreads_h2', label: 'Alt 2nd Half Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_h2', label: 'Alt 2nd Half Total', kind: 'alt-lines' },
    { key: 'team_totals_h2', label: '2nd Half Team Totals', kind: 'team-totals' },

    { key: 'alternate_spreads_q1', label: 'Alt 1st Quarter Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_q1', label: 'Alt 1st Quarter Total', kind: 'alt-lines' },
    { key: 'team_totals_q1', label: '1st Quarter Team Totals', kind: 'team-totals' },
    { key: 'alternate_spreads_q2', label: 'Alt 2nd Quarter Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_q2', label: 'Alt 2nd Quarter Total', kind: 'alt-lines' },
    { key: 'team_totals_q2', label: '2nd Quarter Team Totals', kind: 'team-totals' },
    { key: 'alternate_spreads_q3', label: 'Alt 3rd Quarter Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_q3', label: 'Alt 3rd Quarter Total', kind: 'alt-lines' },
    { key: 'team_totals_q3', label: '3rd Quarter Team Totals', kind: 'team-totals' },
    { key: 'alternate_spreads_q4', label: 'Alt 4th Quarter Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_q4', label: 'Alt 4th Quarter Total', kind: 'alt-lines' },
    { key: 'team_totals_q4', label: '4th Quarter Team Totals', kind: 'team-totals' },

    { key: 'alternate_team_totals_q1', label: 'Alt 1st Quarter Team Totals', kind: 'team-totals' },
    { key: 'alternate_team_totals_q2', label: 'Alt 2nd Quarter Team Totals', kind: 'team-totals' },
    { key: 'alternate_team_totals_q3', label: 'Alt 3rd Quarter Team Totals', kind: 'team-totals' },
    { key: 'alternate_team_totals_q4', label: 'Alt 4th Quarter Team Totals', kind: 'team-totals' },
    { key: 'h2h_3_way_q1', label: 'Moneyline 3-Way (1Q)', kind: 'alt-lines' },
    { key: 'h2h_3_way_q2', label: 'Moneyline 3-Way (2Q)', kind: 'alt-lines' },
    { key: 'h2h_3_way_q3', label: 'Moneyline 3-Way (3Q)', kind: 'alt-lines' },
    { key: 'h2h_3_way_q4', label: 'Moneyline 3-Way (4Q)', kind: 'alt-lines' },

    { key: 'alternate_spreads_p1', label: 'Alt 1st Period Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_p1', label: 'Alt 1st Period Total', kind: 'alt-lines' },
    { key: 'team_totals_p1', label: '1st Period Team Totals', kind: 'team-totals' },
    { key: 'alternate_team_totals_p1', label: 'Alt 1st Period Team Totals', kind: 'team-totals' },
    { key: 'h2h_3_way_p1', label: 'Moneyline 3-Way (1st Period)', kind: 'alt-lines' },
    { key: 'alternate_spreads_p2', label: 'Alt 2nd Period Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_p2', label: 'Alt 2nd Period Total', kind: 'alt-lines' },
    { key: 'team_totals_p2', label: '2nd Period Team Totals', kind: 'team-totals' },
    { key: 'alternate_team_totals_p2', label: 'Alt 2nd Period Team Totals', kind: 'team-totals' },
    { key: 'h2h_3_way_p2', label: 'Moneyline 3-Way (2nd Period)', kind: 'alt-lines' },
    { key: 'alternate_spreads_p3', label: 'Alt 3rd Period Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_p3', label: 'Alt 3rd Period Total', kind: 'alt-lines' },
    { key: 'team_totals_p3', label: '3rd Period Team Totals', kind: 'team-totals' },
    { key: 'alternate_team_totals_p3', label: 'Alt 3rd Period Team Totals', kind: 'team-totals' },
    { key: 'h2h_3_way_p3', label: 'Moneyline 3-Way (3rd Period)', kind: 'alt-lines' },

    { key: 'alternate_spreads_1st_1_innings', label: 'Alt 1st Inning Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_1st_1_innings', label: 'Alt 1st Inning Total', kind: 'alt-lines' },
    { key: 'alternate_spreads_1st_3_innings', label: 'Alt 1st 3 Innings Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_1st_3_innings', label: 'Alt 1st 3 Innings Total', kind: 'alt-lines' },
    { key: 'alternate_spreads_1st_5_innings', label: 'Alt 1st 5 Innings Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_1st_5_innings', label: 'Alt 1st 5 Innings Total', kind: 'alt-lines' },
    { key: 'alternate_spreads_1st_7_innings', label: 'Alt 1st 7 Innings Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_1st_7_innings', label: 'Alt 1st 7 Innings Total', kind: 'alt-lines' },
    { key: 'team_totals_1st_5_innings', label: '1st 5 Innings Team Totals', kind: 'team-totals' },
    { key: 'h2h_3_way_1st_1_innings', label: 'Moneyline 3-Way (1st Inning)', kind: 'alt-lines' },
    { key: 'h2h_3_way_1st_3_innings', label: 'Moneyline 3-Way (1st 3 Inn)', kind: 'alt-lines' },
    { key: 'h2h_3_way_1st_5_innings', label: 'Moneyline 3-Way (1st 5 Inn)', kind: 'alt-lines' },
    { key: 'h2h_3_way_1st_7_innings', label: 'Moneyline 3-Way (1st 7 Inn)', kind: 'alt-lines' },

    { key: 'h2h_3_way', label: 'Moneyline 3-Way', kind: 'alt-lines' },
    { key: 'h2h_3_way_h1', label: 'Moneyline 3-Way (1st Half)', kind: 'alt-lines' },
    { key: 'h2h_3_way_h2', label: 'Moneyline 3-Way (2nd Half)', kind: 'alt-lines' },
    { key: 'btts', label: 'Both Teams to Score', kind: 'alt-lines' },
    { key: 'btts_h1', label: 'BTTS 1st Half', kind: 'alt-lines' },
    { key: 'btts_h2', label: 'BTTS 2nd Half', kind: 'alt-lines' },
    { key: 'draw_no_bet', label: 'Draw No Bet', kind: 'two-team' },
    { key: 'draw_no_bet_h1', label: 'Draw No Bet (1st Half)', kind: 'two-team' },
    { key: 'draw_no_bet_h2', label: 'Draw No Bet (2nd Half)', kind: 'two-team' },
    { key: 'double_chance', label: 'Double Chance', kind: 'alt-lines' },
    { key: 'double_chance_h1', label: 'Double Chance (1st Half)', kind: 'alt-lines' },
    { key: 'double_chance_h2', label: 'Double Chance (2nd Half)', kind: 'alt-lines' },
    { key: 'alternate_team_totals_h1', label: 'Alt 1st Half Team Totals', kind: 'team-totals' },
    { key: 'alternate_team_totals_h2', label: 'Alt 2nd Half Team Totals', kind: 'team-totals' },
    { key: 'alternate_asian_handicap', label: 'Asian Handicap (Alt Lines)', kind: 'alt-lines' },
    { key: 'first_team_to_score', label: 'First Team to Score', kind: 'alt-lines' },
    { key: 'last_team_to_score', label: 'Last Team to Score', kind: 'alt-lines' },
    { key: 'alternate_spreads_corners', label: 'Corners — Alt Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_corners', label: 'Corners — Alt Total', kind: 'alt-lines' },
    { key: 'alternate_spreads_cards', label: 'Cards — Alt Spread', kind: 'alt-lines' },
    { key: 'alternate_totals_cards', label: 'Cards — Alt Total', kind: 'alt-lines' },
];

// ---------------------------------------------------------------------------
// Core game markets (moneyline / spread / total) and their period variants.
// These come off `match.odds.markets`, not the props payload. We discover
// them dynamically rather than enumerate every period suffix.
// ---------------------------------------------------------------------------
const CORE_BASE_LABEL = { h2h: 'Moneyline', spreads: 'Handicap', totals: 'Total Points' };

const PERIOD_LABEL = {
    '': '',
    h1: '1st Half', h2: '2nd Half',
    q1: '1st Quarter', q2: '2nd Quarter', q3: '3rd Quarter', q4: '4th Quarter',
    p1: '1st Period', p2: '2nd Period', p3: '3rd Period',
    '1st_1_innings': '1st Inning',
    '1st_3_innings': '1st 3 Innings',
    '1st_5_innings': '1st 5 Innings',
    '1st_7_innings': '1st 7 Innings',
};

const titleizeToken = (token) => String(token || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Classify a base game-market key (h2h / spreads / totals, optionally with a
 * 3-way or period suffix) into { key, label, kind, signed }. Returns null for
 * anything that isn't a core game market (alts/props are handled elsewhere).
 */
export const parseCoreMarket = (rawKey) => {
    const key = String(rawKey || '').toLowerCase();
    const m = key.match(/^(h2h|spreads|totals)(?:_(.+))?$/);
    if (!m) return null;
    const base = m[1];
    let rest = m[2] || '';
    let threeWay = false;
    if (base === 'h2h' && rest.startsWith('3_way')) {
        threeWay = true;
        rest = rest.replace(/^3_way_?/, '');
    }
    const periodLabel = PERIOD_LABEL[rest] ?? (rest ? titleizeToken(rest) : '');
    const baseLabel = threeWay ? 'Moneyline 3-Way' : CORE_BASE_LABEL[base];
    const label = [periodLabel, baseLabel].filter(Boolean).join(' ');
    const kind = base === 'totals' ? 'over-under' : (threeWay ? 'alt-lines' : 'two-team');
    return { key, label, kind, signed: base === 'spreads' };
};

// ---------------------------------------------------------------------------
// Player-prop labels (mirrors PropBuilderModal MARKET_LABELS).
// ---------------------------------------------------------------------------
export const PLAYER_MARKET_LABELS = {
    player_points: 'Points',
    player_rebounds: 'Rebounds',
    player_assists: 'Assists',
    player_threes: 'Three Point Field Goals Made',
    player_blocks: 'Blocked Shots',
    player_steals: 'Steals',
    player_turnovers: 'Turnovers',
    player_blocks_steals: 'Blocks + Steals',
    player_points_q1: 'Points (1Q)',
    player_rebounds_q1: 'Rebounds (1Q)',
    player_assists_q1: 'Assists (1Q)',
    player_points_rebounds_assists: 'Pts + Reb + Ast',
    player_points_rebounds: 'Pts + Reb',
    player_points_assists: 'Pts + Ast',
    player_rebounds_assists: 'Reb + Ast',
    player_double_double: 'Double-Double',
    player_triple_double: 'Triple-Double',
    player_first_basket: 'First Basket',
    player_first_team_basket: 'First Team Basket',
    player_method_of_first_basket: 'First Basket Method',
    player_field_goals: 'Field Goals',
    player_frees_made: 'Free Throws Made',
    player_frees_attempts: 'Free Throw Attempts',
    player_pass_tds: 'Passing TDs',
    player_pass_yds: 'Passing Yards',
    player_pass_yds_q1: 'Passing Yards (1Q)',
    player_pass_completions: 'Pass Completions',
    player_pass_attempts: 'Pass Attempts',
    player_pass_interceptions: 'Interceptions Thrown',
    player_pass_longest_completion: 'Longest Completion',
    player_pass_rush_yds: 'Pass + Rush Yards',
    player_pass_rush_reception_yds: 'Pass + Rush + Rec Yards',
    player_pass_rush_reception_tds: 'Pass + Rush + Rec TDs',
    player_rush_yds: 'Rushing Yards',
    player_rush_tds: 'Rushing TDs',
    player_rush_attempts: 'Rushing Attempts',
    player_rush_longest: 'Longest Rush',
    player_rush_reception_yds: 'Rush + Rec Yards',
    player_rush_reception_tds: 'Rush + Rec TDs',
    player_reception_yds: 'Receiving Yards',
    player_receptions: 'Receptions',
    player_reception_longest: 'Longest Reception',
    player_reception_tds: 'Receiving TDs',
    player_kicking_points: 'Kicking Points',
    player_pats: 'Extra Points (PATs)',
    player_tackles_assists: 'Tackles + Assists',
    player_sacks: 'Sacks',
    player_solo_tackles: 'Solo Tackles',
    player_defensive_interceptions: 'Defensive Interceptions',
    player_1st_td: 'First TD Scorer',
    player_last_td: 'Last TD Scorer',
    player_anytime_td: 'Anytime TD Scorer',
    player_tds_over: 'Total TDs O/U',
    player_goals: 'Goals',
    player_power_play_points: 'Power-Play Points',
    player_blocked_shots: 'Blocked Shots',
    player_shots_on_goal: 'Shots on Goal',
    player_total_saves: 'Saves',
    player_hits: 'Hits',
    player_faceoffs_won: 'Faceoffs Won',
    player_goal_scorer_first: 'First Goal Scorer',
    player_goal_scorer_last: 'Last Goal Scorer',
    player_goal_scorer_anytime: 'Anytime Goal Scorer',
    batter_home_runs: 'Home Runs',
    batter_hits: 'Hits',
    batter_total_bases: 'Total Bases',
    batter_rbis: 'RBIs',
    batter_runs_scored: 'Runs Scored',
    batter_hits_runs_rbis: 'Hits + Runs + RBIs',
    batter_singles: 'Singles',
    batter_doubles: 'Doubles',
    batter_triples: 'Triples',
    batter_walks: 'Walks',
    batter_strikeouts: 'Strikeouts',
    batter_stolen_bases: 'Stolen Bases',
    batter_first_home_run: 'First Home Run',
    batter_fantasy_score: 'Fantasy Score',
    pitcher_strikeouts: 'Pitcher Strikeouts',
    pitcher_record_a_win: 'Pitcher to Record a Win',
    pitcher_hits_allowed: 'Hits Allowed',
    pitcher_walks: 'Walks Allowed',
    pitcher_earned_runs: 'Earned Runs',
    pitcher_outs: 'Outs Recorded',
    player_first_goal_scorer: 'First Goal Scorer',
    player_last_goal_scorer: 'Last Goal Scorer',
    player_to_receive_card: 'To Receive a Card',
    player_to_receive_red_card: 'To Receive a Red Card',
    player_shots_on_target: 'Shots on Target',
    player_shots: 'Shots',
    player_goals_assists: 'To Score or Assist',
    player_fouls: 'Fouls Committed',
    player_saves: 'Goalkeeper Saves',
};

// Category accordion order — basketball headline markets first; unlisted keys
// sort after, alphabetically (mirrors PropBuilderModal CATEGORY_ORDER).
export const PLAYER_CATEGORY_ORDER = [
    'player_points',
    'player_rebounds',
    'player_assists',
    'player_threes',
    'player_blocks',
    'player_turnovers',
    'player_points_rebounds_assists',
    'player_points_rebounds',
    'player_points_assists',
    'player_rebounds_assists',
    'player_double_double',
    'player_triple_double',
    // MLB headline props lead on baseball games (NBA keys above never match).
    'pitcher_strikeouts',
    'batter_hits',
    'batter_home_runs',
    'batter_rbis',
    'batter_total_bases',
    'batter_runs_scored',
    'batter_stolen_bases',
    'batter_hits_runs_rbis',
    'pitcher_hits_allowed',
    'pitcher_earned_runs',
    'pitcher_outs',
    'pitcher_walks',
    'batter_walks',
    'batter_singles',
    'batter_doubles',
    'batter_triples',
];

// Mirrors SPORTSBOOK_PREFERRED_BOOKS — only used when the match doc carries no
// odds.bookmakers list (the server orders that list, always source of truth).
export const FALLBACK_BOOK_PRIORITY = ['pinnacle', 'draftkings', 'fanduel', 'betmgm', 'bovada'];

// True for a player-prop market key (player_/batter_/pitcher_ family). Lets
// callers decide whether to surface the friendly stat label — game markets
// (h2h/spreads/totals and their period variants) get their own labels.
export const isPlayerPropMarket = (marketType) => /^(player|batter|pitcher)_/i.test(String(marketType || ''));

// Friendly DISPLAY label for a prop market key. Case-insensitive so it works
// on the lowercase keys the props payload uses AND the UPPERCASE wire keys the
// feed sends for some sports (e.g. BATTER_RUNS_SCORED). The raw key is never
// mutated — this is render-only. Falls back to a Title-Case humanization with
// RBI/TD token fixes for any key not in the map.
export const prettyPlayerMarketLabel = (key) => {
    const raw = String(key || '');
    const base = raw.toLowerCase().replace(/_alternate$/, '');
    if (PLAYER_MARKET_LABELS[base]) {
        const isAlt = /_alternate$/i.test(raw);
        return isAlt ? `${PLAYER_MARKET_LABELS[base]} (Alt Lines)` : PLAYER_MARKET_LABELS[base];
    }
    const words = base
        .replace(/^(player|batter|pitcher)_/, '')
        .replace(/_/g, ' ')
        .trim();
    if (!words) return 'Market';
    return words.replace(/\S+/g, (w) => {
        if (w === 'rbi' || w === 'rbis') return 'RBIs';
        if (w === 'td' || w === 'tds') return w.toUpperCase();
        return w.charAt(0).toUpperCase() + w.slice(1);
    });
};

export const isOverUnderName = (name) => /^(over|under)$/i.test(String(name || '').trim());

// DISPLAY title for a player-prop bet-slip / pending card. The STORED selection
// keeps its side word ("Alphonso Davies Yes") so placement can re-match the
// outcome — this is render-only and never mutates the stored value:
//   • lone "Yes"/"No" scorer-type props drop the side word (the market label
//     already says what the bet is): "Alphonso Davies Yes" → "Alphonso Davies"
//   • the feed's "No goal(scorer)" participant (3-way scorer markets) becomes a
//     plain phrase with no market label: "No goal Yes" → "No Goals Scored"
//   • Over/Under props are untouched: "Ali Ahmed Over 0.5" stays as-is
export const formatPropSelectionTitle = (selectionText, marketLabel = '') => {
    const raw = String(selectionText || '').trim();
    if (/^no\s*goal(scorer)?\b/i.test(raw)) return 'No Goals Scored';
    const cleaned = raw.replace(/\s+(yes|no)\s*$/i, '').trim();
    return marketLabel ? `${cleaned} ${marketLabel}`.trim() : cleaned;
};

/**
 * The feed appends one outcome per (book × line × side). The board surfaces a
 * single price per selection (server orders odds.bookmakers by the preferred
 * books config, the row takes the first), so the builder must do the same or
 * every selection renders N near-duplicate buttons. Placement validates
 * against the FULL pool, so whichever book we surface is accepted as-is.
 */
export const dedupeByPreferredBook = (outcomes, bookRank) => {
    const best = new Map();
    (outcomes || []).forEach((outcome) => {
        const player = String(outcome?.description || outcome?.name || '').trim();
        if (!player) return;
        const key = `${player}|${String(outcome?.name || '')}|${outcome?.point ?? ''}`;
        const rank = bookRank.get(String(outcome?.book || '').toLowerCase()) ?? Infinity;
        const current = best.get(key);
        if (!current || rank < current.rank) {
            best.set(key, { outcome, rank });
        }
    });
    return Array.from(best.values()).map((v) => v.outcome);
};
