import React from 'react';
import { getMatchProps } from '../api';
import { formatLineValue, formatOdds } from '../utils/odds';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { fetchTeamBadgeUrl, createFallbackTeamLogoDataUri } from '../utils/teamLogos';
import { useDismissableSurface } from '../hooks/useDismissableSurface';
import { isMarketEligibleForMode } from '../utils/teaserAdjustment';
import { isSingleSidedOverMarket } from '../utils/propBuilderMarkets';
import MatchDetailView from './MatchDetailView';

const MARKET_LABELS = {
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
    // player_assists already labeled 'Assists' above (NBA); same key reused
    // by soccer/NHL — single label works for both because the player name
    // (outcome.description) and match context already disambiguate.
};

/**
 * Display order for the category accordion. Basketball first (NBA is the
 * headline product and the sport this layout was modeled on); keys not
 * listed here sort after these, alphabetically — so NFL/MLB/NHL props
 * still get a stable, predictable order without a per-sport table.
 */
const CATEGORY_ORDER = [
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
];

// Prop market keys we never surface (e.g. last goal scorer — not offered, for
// competitor parity). The backend also stops ingesting these; this hides any
// already-stored ones immediately. Lowercase keys.
const HIDDEN_PROP_KEYS = new Set(['player_last_goal_scorer']);

// Mirrors SPORTSBOOK_PREFERRED_BOOKS on the server. Only used when the
// match doc carries no odds.bookmakers list (the server orders that list
// by the live env value, which is always the source of truth).
const FALLBACK_BOOK_PRIORITY = ['pinnacle', 'draftkings', 'fanduel', 'betmgm', 'bovada'];

const prettyMarketLabel = (key) => {
    const base = String(key || '').replace(/_alternate$/, '');
    if (MARKET_LABELS[base]) {
        const isAlt = key.endsWith('_alternate');
        return isAlt ? `${MARKET_LABELS[base]} (Alt Lines)` : MARKET_LABELS[base];
    }
    return String(key || 'Market')
        .replace(/^player_|^batter_|^pitcher_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

const isOverUnderName = (name) => /^(over|under)$/i.test(String(name || '').trim());

// Render a lone Over for single-sided-over markets (HR is "Over 0.5" only by
// design — see isSingleSidedOverMarket) the way soccer's one-sided props
// render, instead of dropping it as US-sport "incomplete data".
const allowSingleSided = (marketKey, isSoccer) => isSoccer || isSingleSidedOverMarket(marketKey);

// Split a player's outcomes into two-sided Over/Under lines and the rest.
// A line (a single `point`) is "two-sided" only when BOTH an Over and an
// Under are priced at that point. Single-sided O/U lines (e.g. an Over with
// no Under) are dropped entirely — we never fabricate the missing side, and
// per the display rule a one-sided prop simply isn't shown. `rest` carries
// non-Over/Under outcomes (markets that aren't O/U-shaped) unchanged.
// Returns twoSided as [pointKey, {over, under}] sorted by ascending point.
const splitOverUnderProps = (outcomes, includeSingleSided = false) => {
    const linesByPoint = new Map();
    const rest = [];
    (outcomes || []).forEach((outcome) => {
        if (isOverUnderName(outcome?.name)) {
            const pointKey = String(outcome?.point ?? '');
            if (!linesByPoint.has(pointKey)) linesByPoint.set(pointKey, {});
            linesByPoint.get(pointKey)[/^over$/i.test(outcome.name) ? 'over' : 'under'] = outcome;
        } else {
            rest.push(outcome);
        }
    });
    const twoSided = [];
    linesByPoint.forEach((pair, pointKey) => {
        if (pair.over && pair.under) {
            twoSided.push([pointKey, pair]);
        } else if (includeSingleSided) {
            // Soccer ships its props one-sided (an Over "N or more" with no Under
            // — e.g. 1+/2+ shots on target, anytime assist). For US sports a
            // lone side means incomplete data and is dropped; for soccer it IS
            // the market, so render it as a single button instead of hiding it.
            if (pair.over) rest.push(pair.over);
            if (pair.under) rest.push(pair.under);
        }
    });
    twoSided.sort(([a], [b]) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
    return { twoSided, rest };
};

/**
 * The feed appends one outcome per (book × line × side). The board shows
 * one price per selection (the server orders odds.bookmakers by the
 * preferred-books config and the row takes the first), so the prop sheet
 * must do the same — otherwise every selection renders N near-duplicate
 * buttons, one per book. Placement validates against the FULL pool
 * (BetsController::collectMatchMarkets pools every book's prop outcomes),
 * so whichever book's price we surface here is accepted as-is.
 */
const dedupeByPreferredBook = (outcomes, bookRank) => {
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

// includeGameMarkets: mobile's merged "Props" panel (2026-07-08, PO: one
// button per card) renders the extended game markets — the old "+" More
// Bets sheet — inline below the player-prop categories, via MatchDetailView
// in `embedded` mode (its own sheet:true fetch, stored-row only, zero
// Rundown credits). Desktop keeps separate "+" / Props buttons and does NOT
// pass this, so its panels are unchanged.
const PropBuilderModal = ({ match, onClose, betMode = 'straight', includeGameMarkets = false }) => {
    const { oddsFormat } = useOddsFormat();
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [payload, setPayload] = React.useState({ extendedMarkets: [], playerProps: [], cached: false });
    const [selectedKeys, setSelectedKeys] = React.useState(() => new Set());
    // playerFilter is the exact player name selected from the dropdown
    // ('all' = no filter). The dropdown is faster on the common case
    // (pick the star, see only their props) and avoids typo / partial-name
    // mismatches against the feed's canonical descriptions.
    const [playerFilter, setPlayerFilter] = React.useState('all');
    // teamFilter narrows the player list to one side of the matchup
    // ('all' | 'away' | 'home'). Each player's side comes from the backend
    // (outcome.teamSide), resolved from team rosters. 'all' shows everyone,
    // including players whose team couldn't be resolved.
    const [teamFilter, setTeamFilter] = React.useState('all');
    // Category accordion state. Default collapsed — the category bars ARE
    // the overview (mirrors the market-list-first layout players know from
    // competitor prop screens); expanding everything up front buries the
    // list under the first market's full ladder.
    const [expanded, setExpanded] = React.useState({});

    const matchId = match?.id || match?.externalId || '';
    const awayTeam = match?.awayTeamFull || match?.awayTeam || match?.away_team || 'Away';
    const homeTeam = match?.homeTeamFull || match?.homeTeam || match?.home_team || 'Home';
    const matchName = `${awayTeam} @ ${homeTeam}`;
    const sportKey = String(match?.sportKey || match?.sport || '').toLowerCase();
    // Soccer props ship one-sided (an Over "N or more" with no Under). Tell the
    // O/U splitter to render those single buttons instead of dropping them.
    const isSoccer = /^soccer_/i.test(sportKey);
    const sport = match?.sport || match?.sportTitle || '';
    // Stable team abbreviations — logo resolution keys on league + abbr (the
    // identity), never the display name, so a city-only label like "Seattle"
    // can never collide with a college team via the name search.
    const awayAbbr = match?.awayTeamShort || match?.away_short || '';
    const homeAbbr = match?.homeTeamShort || match?.home_short || '';

    // Active-mode eligibility gate. Player props are never spreads/totals, so
    // any restrictive mode (teaser today) makes every market in this sheet
    // ineligible. We gate per market key so the rule generalises to any
    // future mode that restricts markets, rather than hardcoding "teaser".
    const isEligible = (marketKey) => isMarketEligibleForMode(betMode, marketKey, sportKey);
    const normalizedMode = String(betMode || 'straight').toLowerCase().replace(/-/g, '_');
    const modeLabel = normalizedMode === 'teaser' ? 'teasers' : normalizedMode;

    // Team badges for the VS header strip. Async lookup with the standard
    // generated-initials fallback so a slow/missing badge service never
    // shows a broken image. Mirrors the board's TeamAvatar resolution:
    // full name → TEAM_LOGO_MAP, with league+abbr as the scoped backstop.
    const [teamLogos, setTeamLogos] = React.useState({ away: null, home: null });
    React.useEffect(() => {
        let cancelled = false;
        Promise.all([
            fetchTeamBadgeUrl(awayTeam, { sportKey, sport, abbr: awayAbbr }),
            fetchTeamBadgeUrl(homeTeam, { sportKey, sport, abbr: homeAbbr }),
        ]).then(([away, home]) => {
            if (!cancelled) setTeamLogos({ away, home });
        }).catch(() => { /* fallback data-URIs render instead */ });
        return () => { cancelled = true; };
    }, [awayTeam, homeTeam, sportKey, sport, awayAbbr, homeAbbr]);

    // Reuse the same `match-detail:state` / `match-detail:close` events the
    // matchup detail sheet uses, so DashboardHeader swaps its leftmost cell
    // into a sticky Back button while this prop sheet is open. The two
    // sheets are never open at the same time, so a single shared signal is
    // enough — keeps the header logic in one place.
    React.useEffect(() => {
        window.dispatchEvent(new CustomEvent('match-detail:state', { detail: { open: true } }));
        const handleClose = () => onClose?.();
        window.addEventListener('match-detail:close', handleClose);
        // Lock the page behind so it can't scroll while the sheet is open.
        const prevBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('match-detail:close', handleClose);
            window.dispatchEvent(new CustomEvent('match-detail:state', { detail: { open: false } }));
            document.body.style.overflow = prevBodyOverflow;
        };
    }, [onClose]);

    // Shared dismiss behavior: ESC / browser Back close this sheet (the
    // component is only mounted while open, so register with true). It opts
    // OUT of nav-tab dismissal (dismissOnNavTab: false) so tapping a bet-mode
    // tab (STRAIGHT/PARLAY/TEASER/…) above only switches the mode underneath
    // and leaves the prop sheet OPEN — the player can flip to Parlay and keep
    // adding props without the sheet "exiting". Backdrop tap / Back / ESC / the
    // sheet's own close button still dismiss it.
    useDismissableSurface(true, onClose, { dismissOnNavTab: false });

    // Measure the page DashboardHeader so the sheet can cap its max height to
    // (viewport - header). Without this the sheet's top — which carries the
    // title and player filter — sits behind the sticky page header and is
    // unreachable on mobile (the user reported they couldn't scroll up to
    // access the filters). Falls back to 0 if the header isn't found, which
    // restores the legacy full-height behavior.
    const [headerOffsetPx, setHeaderOffsetPx] = React.useState(0);
    React.useLayoutEffect(() => {
        const measure = () => {
            // The top chrome can be MORE than the page header: on the betslip /
            // bet-type screen the STRAIGHT/PARLAY/… row (`.tabs-bar`) is pinned
            // below the header too. Offset below the LOWEST bar pinned near the
            // top so the sheet's title + player filter never hide behind them.
            // Only count bars currently at the top (rect.top small) — a tabs-bar
            // that has scrolled away in another context must not push the sheet.
            let bottom = 0;
            document.querySelectorAll('.mobile-header-container, .top-header, .tabs-bar')
                .forEach((el) => {
                    const rect = el.getBoundingClientRect();
                    if (rect.height > 0 && rect.top <= 160 && rect.bottom > bottom) {
                        bottom = rect.bottom;
                    }
                });
            setHeaderOffsetPx(Math.max(0, Math.round(bottom)));
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        getMatchProps(matchId)
            .then((data) => {
                if (cancelled) return;
                setPayload(data || { extendedMarkets: [], playerProps: [], cached: false });
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.message || 'Failed to load props');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [matchId]);

    // book key → priority rank, taken from the server-ordered bookmaker
    // list on the match doc (already sorted by SPORTSBOOK_PREFERRED_BOOKS).
    const bookRank = React.useMemo(() => {
        const rank = new Map();
        const books = Array.isArray(match?.odds?.bookmakers) ? match.odds.bookmakers : [];
        books.forEach((b, idx) => {
            const key = String(b?.key || '').toLowerCase();
            if (key && !rank.has(key)) rank.set(key, idx);
        });
        if (rank.size === 0) {
            FALLBACK_BOOK_PRIORITY.forEach((key, idx) => rank.set(key, idx));
        }
        return rank;
    }, [match]);

    /**
     * categories: [{ key, label, byPlayer: Map<player, outcomes[]> }]
     * One entry per prop market key, outcomes deduped to the preferred
     * book and grouped by player.
     */
    const categories = React.useMemo(() => {
        const outcomesByKey = new Map();
        (payload.playerProps || []).forEach((market) => {
            const key = String(market?.key || '');
            if (!key) return;
            const outcomes = Array.isArray(market?.outcomes) ? market.outcomes : [];
            if (!outcomesByKey.has(key)) outcomesByKey.set(key, []);
            outcomesByKey.get(key).push(...outcomes);
        });

        const cats = [];
        outcomesByKey.forEach((outcomes, key) => {
            if (HIDDEN_PROP_KEYS.has(String(key).toLowerCase())) return;
            const deduped = dedupeByPreferredBook(outcomes, bookRank);
            const grouped = new Map();
            let hasOverUnder = false;
            deduped.forEach((outcome) => {
                const player = String(outcome?.description || outcome?.name || '').trim();
                if (!player) return;
                // Drop the feed's bare "No" result placeholder (keep "No goal").
                if (/^no$/i.test(player)) return;
                if (isOverUnderName(outcome?.name)) hasOverUnder = true;
                if (!grouped.has(player)) grouped.set(player, []);
                grouped.get(player).push(outcome);
            });
            // Display rule: only show props that have BOTH an Over and an Under
            // at the same line. Drop any player left with no two-sided O/U line
            // and no non-O/U outcomes — they fall off the list naturally (no
            // empty row, accurate "N players" count). Single-sided lines are
            // never shown and never synthesized.
            const byPlayer = new Map();
            grouped.forEach((playerOutcomes, player) => {
                const { twoSided, rest } = splitOverUnderProps(playerOutcomes, allowSingleSided(key, isSoccer));
                if (twoSided.length > 0 || rest.length > 0) {
                    byPlayer.set(player, playerOutcomes);
                }
            });
            if (byPlayer.size === 0) return;
            const base = prettyMarketLabel(key);
            // Distinct Over/Under line points across the whole category (sorted
            // ascending), so every player's rungs align to the same columns —
            // "Over 0.5" left, "Over 1.5" right, empty cell where a player has no
            // line at that point. Empty for Yes/No (scorer) categories.
            const points = Array.from(new Set(
                deduped.filter((o) => isOverUnderName(o?.name) && o?.point != null).map((o) => Number(o.point))
            )).filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
            cats.push({
                key,
                // Soccer props are one-sided "N or more" buttons, not paired
                // Over/Under lines — keep the plain market label for them.
                label: (hasOverUnder && !isSoccer && !isSingleSidedOverMarket(key)) ? `Over/Under - ${base}` : base,
                byPlayer,
                points,
            });
        });

        cats.sort((a, b) => {
            const ai = CATEGORY_ORDER.indexOf(a.key);
            const bi = CATEGORY_ORDER.indexOf(b.key);
            if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            return a.key.localeCompare(b.key);
        });
        return cats;
    }, [payload.playerProps, bookRank]);

    // player name → matchup side ('home'|'away') from the backend-tagged
    // outcomes (outcome.teamSide). Players with no resolved side are absent
    // from the map and only ever show under the "All" team filter.
    const playerTeamByName = React.useMemo(() => {
        const m = new Map();
        categories.forEach((cat) => cat.byPlayer.forEach((outcomes, name) => {
            if (m.has(name)) return;
            const withSide = (outcomes || []).find((o) => o?.teamSide === 'home' || o?.teamSide === 'away');
            if (withSide) m.set(name, withSide.teamSide);
        }));
        return m;
    }, [categories]);

    // A player passes the team filter when 'all' is selected or their resolved
    // side matches. Unknown-side players are hidden once a team is picked — we
    // never guess which team they're on.
    const playerMatchesTeam = React.useCallback(
        (name) => teamFilter === 'all' || playerTeamByName.get(name) === teamFilter,
        [teamFilter, playerTeamByName]
    );

    // Whether the feed resolved ANY player's team — gates the team toggle so we
    // never show a control that can only ever filter to empty.
    const hasTeamData = playerTeamByName.size > 0;

    const playerNames = React.useMemo(() => {
        const names = new Set();
        categories.forEach((cat) => cat.byPlayer.forEach((_, name) => {
            if (playerMatchesTeam(name)) names.add(name);
        }));
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [categories, playerMatchesTeam]);

    // When the modal swaps to a different match (or the API serves a
    // refreshed payload that no longer includes the previously-selected
    // player), reset the dropdown to "All players" so we never render a
    // stale name that filters everything out and leaves the user
    // staring at an empty sheet.
    React.useEffect(() => {
        if (playerFilter !== 'all' && !playerNames.includes(playerFilter)) {
            setPlayerFilter('all');
        }
    }, [playerNames, playerFilter]);

    // Reset both filters when the modal switches to a different game.
    React.useEffect(() => {
        setTeamFilter('all');
        setPlayerFilter('all');
    }, [matchId]);

    const visibleCategories = React.useMemo(() => {
        if (playerFilter === 'all' && teamFilter === 'all') return categories;
        return categories.filter((cat) =>
            Array.from(cat.byPlayer.keys()).some(
                (name) => (playerFilter === 'all' || name === playerFilter) && playerMatchesTeam(name)
            )
        );
    }, [categories, playerFilter, teamFilter, playerMatchesTeam]);

    const allOpen = visibleCategories.length > 0 && visibleCategories.every((cat) => expanded[cat.key]);
    const openAll = () => {
        const next = {};
        visibleCategories.forEach((cat) => { next[cat.key] = true; });
        setExpanded(next);
    };
    const closeAll = () => setExpanded({});

    const addSelection = (marketKey, playerName, outcome) => {
        const price = Number(outcome?.price);
        if (!matchId || !Number.isFinite(price)) return;
        // Active mode may forbid this market (e.g. teaser allows only
        // main spreads/totals). Buttons are already disabled for these,
        // but guard the dispatch too so a stale handler can't slip a leg
        // the server would reject at placement.
        if (!isEligible(marketKey)) return;
        const sideLabel = outcome?.name ? `${outcome.name}` : '';
        const pointLabel = outcome?.point != null ? ` ${formatLineValue(outcome.point)}` : '';
        const selection = `${playerName} ${sideLabel}${pointLabel}`.trim();
        const key = `${marketKey}|${selection}`;
        // The App-level betslip:add handler toggles — sending the same
        // {matchId, marketType, selection} a second time removes the leg
        // from the slip. Mirror that locally so the highlight releases on
        // the second tap (same fix MatchDetailView carries).
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection,
                marketType: marketKey,
                odds: price,
                matchName,
                marketLabel: prettyMarketLabel(marketKey),
                // sportKey lets the betslip enforce per-mode sport rules
                // (e.g. teaser only allows football + basketball) without
                // round-tripping the matchId.
                sportKey,
            },
        }));
    };

    const overlayStyle = {
        position: 'fixed',
        // Start just below the top chrome (page header + bet-type bar) and
        // fill the rest of the screen, so the page behind (period tabs, date
        // row) is fully covered — no gap showing the previous screen. The
        // chrome above stays visible/clickable (its Back cell closes us).
        top: headerOffsetPx,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
    };
    const sheetStyle = {
        background: '#fff',
        color: '#1a1a1a',
        width: '100%',
        maxWidth: 720,
        height: '100%',
        borderRadius: '14px 14px 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
    };
    // VS header strip — away vs home with badges, like the game header on
    // mainstream prop screens.
    const vsHeaderStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        background: '#f2f2f2',
        borderBottom: '1px solid #e0e0e0',
    };
    // Row 1 of the header: away VS home. Row 2 (below) carries the player
    // filter + Open All — folded in here so there's no separate dark toolbar
    // strip above the market list.
    const vsMatchupRowStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    };
    const vsControlsRowStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    };
    const vsTeamStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
        flex: 1,
    };
    const vsLogoStyle = {
        width: 22,
        height: 22,
        borderRadius: '50%',
        border: '1px solid #d5d5d5',
        objectFit: 'contain',
        background: '#fff',
        flexShrink: 0,
    };
    const vsNameStyle = {
        fontSize: 13,
        fontWeight: 700,
        color: '#1a1a1a',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };
    // Player filter — lives in the light header now (no dark toolbar strip).
    const selectStyle = {
        background: '#fff',
        color: '#1a1a1a',
        border: '1px solid #ccc',
        borderRadius: 8,
        padding: '9px 10px',
        fontSize: 13,
        flex: 1,
        minWidth: 0,
    };
    const toggleAllBtnStyle = {
        background: '#d0451b',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '9px 12px',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        flexShrink: 0,
        whiteSpace: 'nowrap',
    };
    const bodyStyle = {
        overflowY: 'auto',
        flex: 1,
        padding: '6px 6px 24px',
        background: '#fff',
        // Keep scrolling inside the sheet — don't chain to the page behind it.
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
    };
    // Category bars follow the competitor's market-list language: red bar,
    // white label, chevron on the right, thin white gaps between bars.
    const categoryHeaderStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '13px 14px',
        background: '#e0584a',
        borderRadius: 4,
        marginBottom: 5,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        color: '#fff',
        minHeight: 44,
    };
    const categoryChevronStyle = (isOpen) => ({
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
        display: 'inline-block',
        transform: isOpen ? 'rotate(90deg)' : 'none',
        transition: 'transform 0.12s ease',
    });
    const categoryBodyStyle = {
        marginBottom: 5,
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid #d9d9d9',
    };
    const playerHeaderStyle = {
        padding: '6px 12px',
        background: '#efefef',
        borderBottom: '1px solid #ddd',
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.4,
        color: '#222',
        textTransform: 'uppercase',
    };
    const oddsPairStyle = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: '#e8e8e8',
        borderBottom: '1px solid #ccc',
    };
    // Compact single-row player layout: name on the left, Over/Under on the
    // right. Replaces the old name-banner-above-odds stack, so each player is
    // one short row instead of two tall ones.
    const playerRowStyle = {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 86px 86px',
        alignItems: 'stretch',
        background: '#fff',
        borderBottom: '1px solid #e2e2e2',
    };
    // One-sided props (a single button) use ONE 86px button column instead of
    // two — so the button stays the same compact size as the paired Over/Under
    // squares with no blank cell padding out the right side.
    const playerRowOneStyle = {
        ...playerRowStyle,
        gridTemplateColumns: 'minmax(0, 1fr) 86px',
    };
    // O/U ladder row: name + one fixed 86px column per category line, so rungs
    // align vertically across players (Over 0.5 left, Over 1.5 right, …).
    const ouRowStyle = (n) => ({
        ...playerRowStyle,
        gridTemplateColumns: `minmax(0, 1fr) ${Array.from({ length: Math.max(1, n) }, () => '86px').join(' ')}`,
    });
    // Placeholder cell for a line a player doesn't have — holds the column so
    // the present rungs stay aligned (kept empty, just the column separator).
    const ouEmptyCellStyle = { borderLeft: '1px solid #e2e2e2' };
    const playerNameCellStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        fontSize: 12,
        fontWeight: 700,
        color: '#222',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };
    // Visual lock for buttons whose market the active mode forbids.
    // Mirrors the existing view-only / lock treatment (greyed, no pointer).
    const disabledBtnStyle = {
        opacity: 0.4,
        cursor: 'not-allowed',
        filter: 'grayscale(1)',
    };
    const modeBannerStyle = {
        margin: '10px 12px',
        padding: '10px 12px',
        background: '#fff4e5',
        border: '1px solid #f0b27a',
        borderRadius: 8,
        color: '#9c4221',
        fontSize: 12,
        fontWeight: 700,
        textAlign: 'center',
    };
    const pairBtnStyle = (selected, isFirst) => ({
        background: selected ? '#d0451b' : 'transparent',
        color: selected ? '#fff' : '#111',
        border: 'none',
        borderRight: isFirst ? '1px solid #ccc' : 'none',
        padding: '7px 4px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'center',
        minHeight: 38,
    });
    const altRowStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 4,
        padding: '8px',
        background: '#c7c7c7',
        borderBottom: '1px solid #999',
    };
    const altBtnStyle = (selected) => ({
        background: selected ? '#d0451b' : '#fff',
        color: selected ? '#fff' : '#111',
        border: '1px solid #aaa',
        borderRadius: 4,
        padding: '10px 6px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        minHeight: 44,
    });

    const selectionKeyFor = (marketKey, playerName, outcome) => {
        const pointLabel = outcome?.point != null ? ` ${formatLineValue(outcome.point)}` : '';
        return `${marketKey}|${`${playerName} ${outcome?.name || ''}${pointLabel}`.trim()}`;
    };

    /**
     * One player's outcomes inside a category. Over/Under sides are paired
     * per line (sorted ascending, so the main line reads in ladder context);
     * anything else (Yes/No doubles, scorer markets) renders as a button
     * grid.
     */
    const renderPlayerOutcomes = (catKey, playerName, outcomes, points = []) => {
        const eligible = isEligible(catKey);
        const { twoSided, rest } = splitOverUnderProps(outcomes, allowSingleSided(catKey, isSoccer));
        // ONE row per player: the player's MAIN two-sided Over/Under line — the
        // lowest-point line that has BOTH an Over and an Under price (the feed
        // doesn't ship an is_main_line flag, so "both sides priced" is the
        // signal). Single-sided lines are filtered out entirely by
        // splitOverUnderProps, so a player with no two-sided line shows no O/U
        // row at all (the categories memo also drops such players when they
        // have nothing else to show). No spanning, no empty "—" cell.
        const lines = twoSided.length > 0 ? [twoSided[0]] : [];

        const renderSide = (outcome, isFirst, lone = false) => {
            const selKey = selectionKeyFor(catKey, playerName, outcome);
            const selected = selectedKeys.has(selKey);
            // A lone "Yes"/"No" prop (anytime/first/last scorer) drops the side
            // word — the category + player already say what the bet is — and
            // shows just the price, so the button reads as a clean odds square.
            const isYesNo = /^(yes|no)$/i.test(String(outcome?.name || '').trim());
            const topLabel = (lone && isYesNo)
                ? ''
                : `${outcome.name}${outcome?.point != null ? ` ${formatLineValue(outcome.point)}` : ''}`;
            return (
                <button
                    style={{ ...pairBtnStyle(selected, isFirst), borderRight: 'none', borderLeft: '1px solid #e2e2e2', ...(eligible ? null : disabledBtnStyle) }}
                    disabled={!eligible}
                    onClick={() => addSelection(catKey, playerName, outcome)}
                >
                    {topLabel ? (
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{topLabel}</div>
                    ) : null}
                    <div style={{ fontSize: topLabel ? 11 : 14, marginTop: topLabel ? 2 : 0, color: selected ? '#fff' : '#b36a00', fontWeight: 700 }}>
                        {formatOdds(outcome.price, oddsFormat)}
                    </div>
                </button>
            );
        };

        return (
            <React.Fragment key={`${catKey}-${playerName}`}>
                {lines.map(([pointKey, pair]) => (
                    // Both sides guaranteed present (single-sided lines were filtered out).
                    <div key={`${catKey}-${playerName}-${pointKey}`} style={playerRowStyle}>
                        <div style={playerNameCellStyle} title={playerName}>{playerName}</div>
                        {renderSide(pair.over, true)}{renderSide(pair.under, false)}
                    </div>
                ))}
                {/* Non-paired outcomes (soccer one-sided "N or more" / Yes-no,
                    scorer markets, double/triple-double) render in the SAME
                    compact row as two-sided lines — player name on the left,
                    button(s) on the right — instead of a banner + grey block, so
                    every category reads uniformly. Chunked into pairs to fill the
                    two button columns; extra rungs flow to a follow-on row under
                    an empty name cell so nothing is dropped or misaligned. */}
                {rest.length > 0 && (points.length > 0 ? (
                    // O/U ladder (assists / shots / goals): each category line is
                    // pinned to its own column by POINT value (sorted ascending),
                    // so the lowest point ALWAYS sits in the left column, the next
                    // in the right, etc. — never by order of appearance. A player
                    // missing a line gets an empty cell there. At least TWO columns
                    // are reserved so a single-line category still left-aligns its
                    // line (a lone 0.5 stays in the left column with the right one
                    // empty, instead of drifting into the right "higher line" slot).
                    <div key={`${catKey}-${playerName}-ou`} style={ouRowStyle(Math.max(2, points.length))}>
                        <div style={playerNameCellStyle} title={playerName}>{playerName}</div>
                        {Array.from({ length: Math.max(2, points.length) }, (_, i) => {
                            const pt = points[i];
                            if (pt == null) return <div key={`pad-${i}`} style={ouEmptyCellStyle} />;
                            const oc = rest.find((o) => isOverUnderName(o?.name) && Number(o?.point) === pt);
                            return oc
                                ? <React.Fragment key={pt}>{renderSide(oc, i === 0)}</React.Fragment>
                                : <div key={pt} style={ouEmptyCellStyle} />;
                        })}
                    </div>
                ) : (
                    // Yes/No props (first/last scorer, to-be-carded): single
                    // compact button per player, no empty padding cell.
                    Array.from({ length: Math.ceil(rest.length / 2) }, (_, ri) => {
                        const a = rest[ri * 2];
                        const b = rest[ri * 2 + 1];
                        return (
                            <div key={`${catKey}-${playerName}-rest-${ri}`} style={b ? playerRowStyle : playerRowOneStyle}>
                                <div style={playerNameCellStyle} title={playerName}>{ri === 0 ? playerName : ''}</div>
                                {renderSide(a, true, !b)}
                                {b ? renderSide(b, false) : null}
                            </div>
                        );
                    })
                ))}
            </React.Fragment>
        );
    };

    const renderCategory = (cat) => {
        const isOpen = !!expanded[cat.key];
        const players = Array.from(cat.byPlayer.entries())
            .filter(([name]) => (playerFilter === 'all' || name === playerFilter) && playerMatchesTeam(name))
            .sort(([a], [b]) => a.localeCompare(b));
        if (players.length === 0) return null;
        return (
            <div key={cat.key}>
                <div
                    style={categoryHeaderStyle}
                    onClick={() => setExpanded((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                            {players.length} {players.length === 1 ? 'player' : 'players'}
                        </span>
                        <span style={categoryChevronStyle(isOpen)}>›</span>
                    </span>
                </div>
                {isOpen && (
                    <div style={categoryBodyStyle}>
                        {players.map(([playerName, outcomes]) => renderPlayerOutcomes(cat.key, playerName, outcomes, cat.points))}
                    </div>
                )}
            </div>
        );
    };

    const renderTeam = (name, logoUrl, reverse) => (
        <div style={{ ...vsTeamStyle, flexDirection: reverse ? 'row-reverse' : 'row' }}>
            <img
                src={logoUrl || createFallbackTeamLogoDataUri(name)}
                onError={(e) => { e.currentTarget.src = createFallbackTeamLogoDataUri(name || ''); }}
                alt=""
                style={vsLogoStyle}
                loading="lazy"
            />
            <span style={{ ...vsNameStyle, textAlign: reverse ? 'right' : 'left' }}>{name}</span>
        </div>
    );

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
                <div style={vsHeaderStyle}>
                    <div style={vsMatchupRowStyle}>
                        {renderTeam(awayTeam, teamLogos.away, false)}
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#555', flexShrink: 0 }}>VS</span>
                        {renderTeam(homeTeam, teamLogos.home, true)}
                    </div>
                    {hasTeamData && (
                        <div style={{ display: 'flex', gap: 6, padding: '8px 10px 0', flexWrap: 'wrap' }}>
                            {[
                                { id: 'all', label: 'All', logo: null, name: 'All players' },
                                { id: 'away', label: awayAbbr || awayTeam.split(/\s+/).pop(), logo: teamLogos.away, name: awayTeam },
                                { id: 'home', label: homeAbbr || homeTeam.split(/\s+/).pop(), logo: teamLogos.home, name: homeTeam },
                            ].map((opt) => {
                                const active = teamFilter === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setTeamFilter(opt.id)}
                                        aria-pressed={active}
                                        title={opt.id === 'all' ? 'Show all players' : opt.name}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            border: active ? '1px solid #e0584a' : '1px solid #d0d0d0',
                                            background: active ? '#e0584a' : '#fff',
                                            color: active ? '#fff' : '#333',
                                            borderRadius: 16, padding: '4px 10px', fontSize: 12, fontWeight: 700,
                                            cursor: 'pointer', lineHeight: 1.4,
                                        }}
                                    >
                                        {opt.logo && (
                                            <img
                                                src={opt.logo}
                                                alt=""
                                                width="16"
                                                height="16"
                                                style={{ borderRadius: '50%', objectFit: 'cover' }}
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        )}
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {(playerNames.length > 0 || visibleCategories.length > 0) && (
                        <div style={vsControlsRowStyle}>
                            {playerNames.length > 0 && (
                                <select
                                    style={selectStyle}
                                    value={playerFilter}
                                    onChange={(e) => setPlayerFilter(e.target.value)}
                                    aria-label="Filter by player"
                                >
                                    <option value="all">All players</option>
                                    {playerNames.map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            )}
                            {visibleCategories.length > 0 && (
                                <button style={toggleAllBtnStyle} onClick={allOpen ? closeAll : openAll}>
                                    {allOpen ? 'Close All' : 'Open All'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div style={bodyStyle}>
                    {loading && (
                        <div style={{ padding: 30, textAlign: 'center', color: '#777' }}>
                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
                            Loading props from sportsbook…
                        </div>
                    )}
                    {!loading && error && (
                        <div style={{ padding: 30, textAlign: 'center', color: '#c0392b' }}>{error}</div>
                    )}
                    {!loading && !error && visibleCategories.length === 0 && (
                        <div style={{ padding: 30, textAlign: 'center', color: '#777' }}>
                            {categories.length === 0
                                ? 'No player props available for this match right now.'
                                : playerFilter !== 'all'
                                    ? `No props for ${playerFilter}.`
                                    : teamFilter !== 'all'
                                        ? `No props for ${teamFilter === 'away' ? awayTeam : homeTeam}.`
                                        : 'No player props available for this match right now.'}
                        </div>
                    )}
                    {!loading && !error && visibleCategories.some((cat) => !isEligible(cat.key)) && (
                        <div style={modeBannerStyle}>
                            Player props are not available in {modeLabel}. Switch back to Straight or Parlay to add these.
                        </div>
                    )}
                    {!loading && !error && visibleCategories.map(renderCategory)}
                    {/* Merged game markets — every surface (mobile board,
                        desktop board, search popup) opens this modal with
                        includeGameMarkets since the standalone "+" button was
                        retired. Rendered after the prop categories — the
                        button says "Props", so props lead. When the match has
                        no player props (common on soccer), the "No player
                        props" note above stays accurate and these sections
                        still make the panel useful. Gated on !loading so two
                        spinners never stack. */}
                    {includeGameMarkets && !loading && (
                        <MatchDetailView match={match} betMode={betMode} embedded />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PropBuilderModal;
