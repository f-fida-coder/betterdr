import React from 'react';
import { getMatchProps } from '../api';
import { formatLineValue, formatOdds } from '../utils/odds';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { fetchTeamBadgeUrl, createFallbackTeamLogoDataUri } from '../utils/teamLogos';

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

const PropBuilderModal = ({ match, onClose }) => {
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
    // Category accordion state. Default collapsed — the category bars ARE
    // the overview (mirrors the market-list-first layout players know from
    // competitor prop screens); expanding everything up front buries the
    // list under the first market's full ladder.
    const [expanded, setExpanded] = React.useState({});

    const matchId = match?.id || match?.externalId || '';
    const awayTeam = match?.awayTeam || match?.away_team || 'Away';
    const homeTeam = match?.homeTeam || match?.home_team || 'Home';
    const matchName = `${awayTeam} @ ${homeTeam}`;
    const sportKey = String(match?.sportKey || match?.sport || '').toLowerCase();

    // Team badges for the VS header strip. Async lookup with the standard
    // generated-initials fallback so a slow/missing badge service never
    // shows a broken image.
    const [teamLogos, setTeamLogos] = React.useState({ away: null, home: null });
    React.useEffect(() => {
        let cancelled = false;
        const ctx = { sportKey };
        Promise.all([
            fetchTeamBadgeUrl(awayTeam, ctx),
            fetchTeamBadgeUrl(homeTeam, ctx),
        ]).then(([away, home]) => {
            if (!cancelled) setTeamLogos({ away, home });
        }).catch(() => { /* fallback data-URIs render instead */ });
        return () => { cancelled = true; };
    }, [awayTeam, homeTeam, sportKey]);

    // Reuse the same `match-detail:state` / `match-detail:close` events the
    // matchup detail sheet uses, so DashboardHeader swaps its leftmost cell
    // into a sticky Back button while this prop sheet is open. The two
    // sheets are never open at the same time, so a single shared signal is
    // enough — keeps the header logic in one place.
    React.useEffect(() => {
        window.dispatchEvent(new CustomEvent('match-detail:state', { detail: { open: true } }));
        const handleClose = () => onClose?.();
        window.addEventListener('match-detail:close', handleClose);
        return () => {
            window.removeEventListener('match-detail:close', handleClose);
            window.dispatchEvent(new CustomEvent('match-detail:state', { detail: { open: false } }));
        };
    }, [onClose]);

    // Measure the page DashboardHeader so the sheet can cap its max height to
    // (viewport - header). Without this the sheet's top — which carries the
    // title and player filter — sits behind the sticky page header and is
    // unreachable on mobile (the user reported they couldn't scroll up to
    // access the filters). Falls back to 0 if the header isn't found, which
    // restores the legacy full-height behavior.
    const [headerOffsetPx, setHeaderOffsetPx] = React.useState(0);
    React.useLayoutEffect(() => {
        const measure = () => {
            const el = document.querySelector('.mobile-header-container, .top-header');
            if (el) {
                const rect = el.getBoundingClientRect();
                setHeaderOffsetPx(Math.max(0, Math.round(rect.bottom)));
            }
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
            const deduped = dedupeByPreferredBook(outcomes, bookRank);
            const byPlayer = new Map();
            let hasOverUnder = false;
            deduped.forEach((outcome) => {
                const player = String(outcome?.description || outcome?.name || '').trim();
                if (!player) return;
                if (isOverUnderName(outcome?.name)) hasOverUnder = true;
                if (!byPlayer.has(player)) byPlayer.set(player, []);
                byPlayer.get(player).push(outcome);
            });
            if (byPlayer.size === 0) return;
            const base = prettyMarketLabel(key);
            cats.push({
                key,
                label: hasOverUnder ? `Over/Under - ${base}` : base,
                byPlayer,
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

    const playerNames = React.useMemo(() => {
        const names = new Set();
        categories.forEach((cat) => cat.byPlayer.forEach((_, name) => names.add(name)));
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [categories]);

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

    const visibleCategories = React.useMemo(() => {
        if (playerFilter === 'all') return categories;
        return categories.filter((cat) => cat.byPlayer.has(playerFilter));
    }, [categories, playerFilter]);

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
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        // Sit just under the page DashboardHeader (which carries our sticky
        // Back cell) so the header stays clickable above the modal.
        zIndex: 9998,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
    };
    const sheetStyle = {
        background: '#fff',
        color: '#1a1a1a',
        width: '100%',
        maxWidth: 720,
        maxHeight: headerOffsetPx > 0 ? `calc(100vh - ${headerOffsetPx}px)` : '92vh',
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
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '12px 14px',
        background: '#f2f2f2',
        borderBottom: '1px solid #e0e0e0',
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
    // Dark PROPS toolbar under the VS strip: title + player filter +
    // open/close-all, mirroring the competitor's dark market toolbar.
    const toolbarStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: '#262626',
        borderBottom: '1px solid #1a1a1a',
    };
    const toolbarTitleStyle = {
        color: '#fff',
        fontSize: 14,
        fontWeight: 800,
        fontStyle: 'italic',
        letterSpacing: 0.5,
        flexShrink: 0,
    };
    const selectStyle = {
        background: '#1c1c1c',
        color: '#eee',
        border: '1px solid #3a3a3a',
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
        padding: '8px 14px',
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
        background: '#c7c7c7',
        borderBottom: '1px solid #999',
    };
    const pairBtnStyle = (selected, isFirst) => ({
        background: selected ? '#d0451b' : 'transparent',
        color: selected ? '#fff' : '#111',
        border: 'none',
        borderRight: isFirst ? '1px solid #999' : 'none',
        padding: '12px 10px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'center',
        minHeight: 52,
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
    const renderPlayerOutcomes = (catKey, playerName, outcomes) => {
        const linesByPoint = new Map();
        const rest = [];
        outcomes.forEach((outcome) => {
            if (isOverUnderName(outcome?.name)) {
                const pointKey = String(outcome?.point ?? '');
                if (!linesByPoint.has(pointKey)) linesByPoint.set(pointKey, {});
                linesByPoint.get(pointKey)[/^over$/i.test(outcome.name) ? 'over' : 'under'] = outcome;
            } else {
                rest.push(outcome);
            }
        });
        const lines = Array.from(linesByPoint.entries())
            .sort(([a], [b]) => (parseFloat(a) || 0) - (parseFloat(b) || 0));

        const renderSide = (outcome, isFirst) => {
            if (!outcome) return <div style={{ padding: 14, color: '#888', textAlign: 'center' }}>—</div>;
            const selKey = selectionKeyFor(catKey, playerName, outcome);
            const selected = selectedKeys.has(selKey);
            return (
                <button
                    style={pairBtnStyle(selected, isFirst)}
                    onClick={() => addSelection(catKey, playerName, outcome)}
                >
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                        {outcome.name}{outcome?.point != null ? ` ${formatLineValue(outcome.point)}` : ''}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 4, color: selected ? '#fff' : '#b36a00', fontWeight: 700 }}>
                        {formatOdds(outcome.price, oddsFormat)}
                    </div>
                </button>
            );
        };

        return (
            <React.Fragment key={`${catKey}-${playerName}`}>
                <div style={playerHeaderStyle}>{playerName}</div>
                {lines.map(([pointKey, pair]) => (
                    <div key={`${catKey}-${playerName}-${pointKey}`} style={oddsPairStyle}>
                        {renderSide(pair.over, true)}
                        {renderSide(pair.under, false)}
                    </div>
                ))}
                {rest.length > 0 && (
                    <div style={altRowStyle}>
                        {rest.map((outcome, idx) => {
                            const selKey = selectionKeyFor(catKey, playerName, outcome);
                            const selected = selectedKeys.has(selKey);
                            const text = `${outcome?.name || ''}${outcome?.point != null ? ` ${formatLineValue(outcome.point)}` : ''}`.trim();
                            return (
                                <button
                                    key={`${catKey}-${playerName}-rest-${idx}`}
                                    style={altBtnStyle(selected)}
                                    onClick={() => addSelection(catKey, playerName, outcome)}
                                >
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text || 'Pick'}</div>
                                    <div style={{ fontSize: 11, marginTop: 4, color: selected ? '#fff' : '#b36a00', fontWeight: 700 }}>
                                        {formatOdds(outcome.price, oddsFormat)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </React.Fragment>
        );
    };

    const renderCategory = (cat) => {
        const isOpen = !!expanded[cat.key];
        const players = Array.from(cat.byPlayer.entries())
            .filter(([name]) => playerFilter === 'all' || name === playerFilter)
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
                        {players.map(([playerName, outcomes]) => renderPlayerOutcomes(cat.key, playerName, outcomes))}
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
                    {renderTeam(awayTeam, teamLogos.away, false)}
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#555', flexShrink: 0 }}>VS</span>
                    {renderTeam(homeTeam, teamLogos.home, true)}
                </div>

                <div style={toolbarStyle}>
                    <span style={toolbarTitleStyle}>PROPS</span>
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
                                : `No props for ${playerFilter}.`}
                        </div>
                    )}
                    {!loading && !error && visibleCategories.map(renderCategory)}
                </div>
            </div>
        </div>
    );
};

export default PropBuilderModal;
