import React from 'react';
import { getMatchProps } from '../api';
import { formatLineValue, formatOdds } from '../utils/odds';
import { useOddsFormat } from '../contexts/OddsFormatContext';

const MARKET_LABELS = {
    player_points: 'Points',
    player_rebounds: 'Rebounds',
    player_assists: 'Assists',
    player_threes: '3-Pointers Made',
    player_blocks: 'Blocks',
    player_steals: 'Steals',
    player_turnovers: 'Turnovers',
    player_points_rebounds_assists: 'Pts + Reb + Ast',
    player_points_rebounds: 'Pts + Reb',
    player_points_assists: 'Pts + Ast',
    player_rebounds_assists: 'Reb + Ast',
    player_double_double: 'Double-Double',
    player_triple_double: 'Triple-Double',
    player_first_basket: 'First Basket',
    player_method_of_first_basket: 'First Basket Method',
    player_field_goals: 'Field Goals',
    player_frees_made: 'Free Throws Made',
    player_frees_attempts: 'Free Throw Attempts',
    player_pass_tds: 'Passing TDs',
    player_pass_yds: 'Passing Yards',
    player_pass_completions: 'Pass Completions',
    player_pass_attempts: 'Pass Attempts',
    player_pass_interceptions: 'Interceptions Thrown',
    player_pass_longest_completion: 'Longest Completion',
    player_rush_yds: 'Rushing Yards',
    player_rush_attempts: 'Rushing Attempts',
    player_rush_longest: 'Longest Rush',
    player_reception_yds: 'Receiving Yards',
    player_receptions: 'Receptions',
    player_reception_longest: 'Longest Reception',
    player_reception_tds: 'Receiving TDs',
    player_kicking_points: 'Kicking Points',
    player_tackles_assists: 'Tackles + Assists',
    player_sacks: 'Sacks',
    player_solo_tackles: 'Solo Tackles',
    player_1st_td: 'First TD Scorer',
    player_last_td: 'Last TD Scorer',
    player_anytime_td: 'Anytime TD Scorer',
    player_goals: 'Goals',
    player_power_play_points: 'Power-Play Points',
    player_blocked_shots: 'Blocked Shots',
    player_shots_on_goal: 'Shots on Goal',
    player_total_saves: 'Saves',
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
    pitcher_strikeouts: 'Pitcher Strikeouts',
    pitcher_record_a_win: 'Pitcher to Record a Win',
    pitcher_hits_allowed: 'Hits Allowed',
    pitcher_walks: 'Walks Allowed',
    pitcher_earned_runs: 'Earned Runs',
    pitcher_outs: 'Outs Recorded',
};

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

/**
 * Group prop-market outcomes by the player name (outcome.description) and
 * within a player, by market key. Over/Under pairs are preserved per line.
 */
const groupPropsByPlayer = (playerProps) => {
    const byPlayer = new Map();
    (playerProps || []).forEach((market) => {
        const marketKey = String(market?.key || '');
        const outcomes = Array.isArray(market?.outcomes) ? market.outcomes : [];
        outcomes.forEach((outcome) => {
            const playerName = String(outcome?.description || outcome?.participant || outcome?.name || '').trim();
            if (!playerName) return;
            if (!byPlayer.has(playerName)) byPlayer.set(playerName, new Map());
            const byMarket = byPlayer.get(playerName);
            if (!byMarket.has(marketKey)) byMarket.set(marketKey, []);
            byMarket.get(marketKey).push(outcome);
        });
    });
    return byPlayer;
};

const PropBuilderModal = ({ match, onClose }) => {
    const { oddsFormat } = useOddsFormat();
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [payload, setPayload] = React.useState({ extendedMarkets: [], playerProps: [], cached: false });
    const [selectedKeys, setSelectedKeys] = React.useState(() => new Set());
    const [playerFilter, setPlayerFilter] = React.useState('');
    const [marketFilter, setMarketFilter] = React.useState('all');

    const matchId = match?.id || match?.externalId || '';
    const matchName = `${match?.awayTeam || match?.away_team || 'Away'} @ ${match?.homeTeam || match?.home_team || 'Home'}`;

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

    const byPlayer = React.useMemo(() => groupPropsByPlayer(payload.playerProps), [payload.playerProps]);
    const marketKeys = React.useMemo(() => {
        const keys = new Set();
        (payload.playerProps || []).forEach((m) => keys.add(String(m?.key || '')));
        return Array.from(keys).filter(Boolean).sort();
    }, [payload.playerProps]);

    const filteredPlayers = React.useMemo(() => {
        const normalizedSearch = playerFilter.trim().toLowerCase();
        const players = Array.from(byPlayer.entries());
        return players
            .filter(([name]) => !normalizedSearch || name.toLowerCase().includes(normalizedSearch))
            .filter(([, byMarket]) => marketFilter === 'all' || byMarket.has(marketFilter))
            .sort(([a], [b]) => a.localeCompare(b));
    }, [byPlayer, playerFilter, marketFilter]);

    const addSelection = (marketKey, playerName, outcome) => {
        const price = Number(outcome?.price);
        if (!matchId || !Number.isFinite(price)) return;
        const sideLabel = outcome?.name ? `${outcome.name}` : '';
        const pointLabel = outcome?.point != null ? ` ${formatLineValue(outcome.point)}` : '';
        const selection = `${playerName} ${sideLabel}${pointLabel}`.trim();
        const key = `${marketKey}|${selection}`;
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            next.add(key);
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
            },
        }));
    };

    const overlayStyle = {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
    };
    const sheetStyle = {
        background: '#111',
        color: '#f1f1f1',
        width: '100%',
        maxWidth: 720,
        maxHeight: '92vh',
        borderRadius: '14px 14px 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
    };
    const headerStyle = {
        padding: '14px 16px',
        borderBottom: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    };
    const titleStyle = { display: 'flex', flexDirection: 'column', gap: 2 };
    const closeBtnStyle = {
        background: 'transparent',
        border: '1px solid #444',
        color: '#eee',
        width: 32,
        height: 32,
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 16,
    };
    const toolbarStyle = {
        display: 'flex',
        gap: 8,
        padding: '10px 16px',
        borderBottom: '1px solid #222',
        flexWrap: 'wrap',
    };
    const inputStyle = {
        background: '#1c1c1c',
        color: '#eee',
        border: '1px solid #333',
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 13,
        flex: '1 1 200px',
        minWidth: 140,
    };
    const selectStyle = { ...inputStyle, flex: '0 0 auto', minWidth: 160 };
    const bodyStyle = {
        padding: '10px 16px 24px',
        overflowY: 'auto',
        flex: 1,
    };
    const playerCardStyle = {
        background: '#1a1a1a',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 10,
    };
    const playerNameStyle = {
        fontSize: 14,
        fontWeight: 700,
        marginBottom: 8,
        color: '#ffd700',
    };
    const marketRowStyle = { marginBottom: 10 };
    const marketLabelStyle = { fontSize: 12, color: '#aaa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 };
    const oddsGridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 6,
    };
    const oddsBtnStyle = (selected) => ({
        background: selected ? '#0a6cdc' : '#242424',
        color: selected ? '#fff' : '#eee',
        border: selected ? '1px solid #0a6cdc' : '1px solid #333',
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 12,
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 6,
    });

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                    <div style={titleStyle}>
                        <strong style={{ fontSize: 15 }}>Prop Builder</strong>
                        <span style={{ fontSize: 12, color: '#9aa' }}>{matchName}</span>
                    </div>
                    <button style={closeBtnStyle} onClick={onClose} aria-label="Close">×</button>
                </div>

                <div style={toolbarStyle}>
                    <input
                        style={inputStyle}
                        placeholder="Search player"
                        value={playerFilter}
                        onChange={(e) => setPlayerFilter(e.target.value)}
                    />
                    <select
                        style={selectStyle}
                        value={marketFilter}
                        onChange={(e) => setMarketFilter(e.target.value)}
                    >
                        <option value="all">All markets</option>
                        {marketKeys.map((k) => (
                            <option key={k} value={k}>{prettyMarketLabel(k)}</option>
                        ))}
                    </select>
                </div>

                <div style={bodyStyle}>
                    {loading && (
                        <div style={{ padding: 30, textAlign: 'center', color: '#aaa' }}>
                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
                            Loading props from sportsbook…
                        </div>
                    )}
                    {!loading && error && (
                        <div style={{ padding: 30, textAlign: 'center', color: '#f55' }}>{error}</div>
                    )}
                    {!loading && !error && filteredPlayers.length === 0 && (
                        <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>
                            No player props available for this match right now.
                        </div>
                    )}
                    {!loading && !error && filteredPlayers.map(([playerName, byMarket]) => {
                        const marketEntries = Array.from(byMarket.entries())
                            .filter(([k]) => marketFilter === 'all' || k === marketFilter)
                            .sort(([a], [b]) => a.localeCompare(b));
                        if (marketEntries.length === 0) return null;
                        return (
                            <div key={playerName} style={playerCardStyle}>
                                <div style={playerNameStyle}>{playerName}</div>
                                {marketEntries.map(([mKey, outcomes]) => (
                                    <div key={mKey} style={marketRowStyle}>
                                        <div style={marketLabelStyle}>{prettyMarketLabel(mKey)}</div>
                                        <div style={oddsGridStyle}>
                                            {outcomes.map((outcome, idx) => {
                                                const selection = `${playerName} ${outcome?.name || ''}${outcome?.point != null ? ` ${formatLineValue(outcome.point)}` : ''}`.trim();
                                                const key = `${mKey}|${selection}`;
                                                const selected = selectedKeys.has(key);
                                                const sideLabel = outcome?.name || '';
                                                const pointText = outcome?.point != null ? ` ${formatLineValue(outcome.point)}` : '';
                                                return (
                                                    <button
                                                        key={`${mKey}-${idx}`}
                                                        style={oddsBtnStyle(selected)}
                                                        onClick={() => addSelection(mKey, playerName, outcome)}
                                                    >
                                                        <span>{`${sideLabel}${pointText}`.trim() || 'Pick'}</span>
                                                        <strong>{formatOdds(outcome?.price, oddsFormat)}</strong>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PropBuilderModal;
