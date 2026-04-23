import React from 'react';
import { getMatchProps } from '../api';
import { formatLineValue, formatOdds } from '../utils/odds';
import { useOddsFormat } from '../contexts/OddsFormatContext';

/**
 * Ordered list of non-prop market sections we know how to render.
 * `kind` controls the layout:
 *   - two-team: pair of buttons, one per team, paired by outcome.name
 *   - over-under: Over/Under pair (outcome.name = 'Over' | 'Under')
 *   - team-totals: splits outcomes by description (team name) into sub-rows
 *   - alt-lines: N buttons, each a separate line; grouped by team where possible
 */
const SECTION_DEFS = [
    { key: 'spreads', label: 'Game Spread', kind: 'two-team' },
    { key: 'h2h', label: 'Game Moneyline', kind: 'two-team' },
    { key: 'totals', label: 'Game Total', kind: 'over-under' },
    { key: 'team_totals', label: 'Team Totals', kind: 'team-totals' },
    { key: 'alternate_team_totals', label: 'Alt Team Totals', kind: 'team-totals' },
    { key: 'alternate_spreads', label: 'Alt Game Spread', kind: 'alt-lines' },
    { key: 'alternate_totals', label: 'Alt Game Total', kind: 'alt-lines' },

    { key: 'spreads_h1', label: '1st Half Spread', kind: 'two-team' },
    { key: 'h2h_h1', label: '1st Half Moneyline', kind: 'two-team' },
    { key: 'totals_h1', label: '1st Half Total', kind: 'over-under' },
    { key: 'spreads_h2', label: '2nd Half Spread', kind: 'two-team' },
    { key: 'h2h_h2', label: '2nd Half Moneyline', kind: 'two-team' },
    { key: 'totals_h2', label: '2nd Half Total', kind: 'over-under' },

    { key: 'spreads_q1', label: '1st Quarter Spread', kind: 'two-team' },
    { key: 'h2h_q1', label: '1st Quarter Moneyline', kind: 'two-team' },
    { key: 'totals_q1', label: '1st Quarter Total', kind: 'over-under' },
    { key: 'spreads_q2', label: '2nd Quarter Spread', kind: 'two-team' },
    { key: 'h2h_q2', label: '2nd Quarter Moneyline', kind: 'two-team' },
    { key: 'totals_q2', label: '2nd Quarter Total', kind: 'over-under' },
    { key: 'spreads_q3', label: '3rd Quarter Spread', kind: 'two-team' },
    { key: 'h2h_q3', label: '3rd Quarter Moneyline', kind: 'two-team' },
    { key: 'totals_q3', label: '3rd Quarter Total', kind: 'over-under' },
    { key: 'spreads_q4', label: '4th Quarter Spread', kind: 'two-team' },
    { key: 'h2h_q4', label: '4th Quarter Moneyline', kind: 'two-team' },
    { key: 'totals_q4', label: '4th Quarter Total', kind: 'over-under' },

    { key: 'spreads_p1', label: '1st Period Spread', kind: 'two-team' },
    { key: 'h2h_p1', label: '1st Period Moneyline', kind: 'two-team' },
    { key: 'totals_p1', label: '1st Period Total', kind: 'over-under' },
    { key: 'spreads_p2', label: '2nd Period Spread', kind: 'two-team' },
    { key: 'h2h_p2', label: '2nd Period Moneyline', kind: 'two-team' },
    { key: 'totals_p2', label: '2nd Period Total', kind: 'over-under' },
    { key: 'spreads_p3', label: '3rd Period Spread', kind: 'two-team' },
    { key: 'h2h_p3', label: '3rd Period Moneyline', kind: 'two-team' },
    { key: 'totals_p3', label: '3rd Period Total', kind: 'over-under' },
    { key: 'h2h_3_way', label: 'Moneyline 3-Way', kind: 'alt-lines' },

    { key: 'h2h_1st_1_innings', label: '1st Inning ML', kind: 'two-team' },
    { key: 'totals_1st_1_innings', label: '1st Inning Total', kind: 'over-under' },
    { key: 'spreads_1st_1_innings', label: '1st Inning Spread', kind: 'two-team' },
    { key: 'h2h_1st_3_innings', label: 'First 3 Innings ML', kind: 'two-team' },
    { key: 'totals_1st_3_innings', label: 'First 3 Innings Total', kind: 'over-under' },
    { key: 'spreads_1st_3_innings', label: 'First 3 Innings Spread', kind: 'two-team' },
    { key: 'h2h_1st_5_innings', label: 'First 5 Innings ML', kind: 'two-team' },
    { key: 'totals_1st_5_innings', label: 'First 5 Innings Total', kind: 'over-under' },
    { key: 'spreads_1st_5_innings', label: 'First 5 Innings Spread', kind: 'two-team' },
    { key: 'h2h_1st_7_innings', label: 'First 7 Innings ML', kind: 'two-team' },
    { key: 'totals_1st_7_innings', label: 'First 7 Innings Total', kind: 'over-under' },
    { key: 'spreads_1st_7_innings', label: 'First 7 Innings Spread', kind: 'two-team' },

    { key: 'btts', label: 'Both Teams to Score', kind: 'alt-lines' },
    { key: 'btts_h1', label: 'BTTS 1st Half', kind: 'alt-lines' },
    { key: 'draw_no_bet', label: 'Draw No Bet', kind: 'two-team' },
    { key: 'double_chance', label: 'Double Chance', kind: 'alt-lines' },
];

const MatchDetailView = ({ match, onClose }) => {
    const { oddsFormat } = useOddsFormat();
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [payload, setPayload] = React.useState({ extendedMarkets: [], playerProps: [], cached: false });
    const [expanded, setExpanded] = React.useState({ spreads: true, h2h: true, totals: true });
    const [selectedKeys, setSelectedKeys] = React.useState(() => new Set());

    const matchId = match?.id || match?.externalId || '';
    const homeTeam = match?.homeTeam || match?.home_team || 'Home';
    const awayTeam = match?.awayTeam || match?.away_team || 'Away';
    const matchName = `${awayTeam} @ ${homeTeam}`;

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
                setError(err?.message || 'Failed to load markets');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [matchId]);

    // Index markets by key for O(1) section lookup. Prefer extendedMarkets
    // over the base `markets` list passed via the match prop so we show the
    // freshest per-event data when available.
    const marketsByKey = React.useMemo(() => {
        const idx = {};
        const extended = Array.isArray(payload?.extendedMarkets) ? payload.extendedMarkets : [];
        const base = Array.isArray(match?.odds?.markets) ? match.odds.markets : [];
        [...base, ...extended].forEach((m) => {
            if (!m || !m.key) return;
            idx[String(m.key).toLowerCase()] = m;
        });
        return idx;
    }, [payload, match]);

    const availableSections = React.useMemo(() => {
        return SECTION_DEFS.filter((s) => !!marketsByKey[s.key.toLowerCase()]);
    }, [marketsByKey]);

    const openAll = () => {
        const next = {};
        availableSections.forEach((s) => { next[s.key] = true; });
        setExpanded(next);
    };
    const closeAll = () => setExpanded({});
    const allOpen = availableSections.length > 0 && availableSections.every((s) => expanded[s.key]);

    const addSelection = (marketKey, marketLabel, outcome, selectionText) => {
        const price = Number(outcome?.price);
        if (!matchId || !Number.isFinite(price)) return;
        const selection = selectionText || outcome?.name || 'Selection';
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
                marketLabel,
            },
        }));
    };

    const overlayStyle = {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
    };
    const sheetStyle = {
        background: '#0f0f0f',
        color: '#f5f5f5',
        width: '100%',
        maxWidth: 720,
        height: '96vh',
        borderRadius: '14px 14px 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -14px 40px rgba(0,0,0,0.7)',
    };
    const headerStyle = {
        padding: '12px 14px',
        borderBottom: '1px solid #1e1e1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    };
    const titleStyle = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 };
    const backBtnStyle = {
        background: '#d0451b',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '6px 14px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
    };
    const toggleAllBtnStyle = {
        background: '#d0451b',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
    };
    const bodyStyle = { flex: 1, overflowY: 'auto', padding: '0 0 24px' };
    const sectionHeaderStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        background: '#000',
        borderBottom: '1px solid #1c1c1c',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    };
    const oddsPairStyle = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: '#c7c7c7',
        borderBottom: '1px solid #999',
    };
    const oddsBtnStyle = (selected) => ({
        background: selected ? '#d0451b' : 'transparent',
        color: selected ? '#fff' : '#111',
        border: 'none',
        borderRight: '1px solid #999',
        padding: '16px 10px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'center',
        minHeight: 60,
    });
    const subHeaderStyle = {
        padding: '8px 14px',
        background: '#1b1b1b',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: '#ddd',
        textTransform: 'uppercase',
    };
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
    });

    const renderTwoTeamSection = (section, market) => {
        // Preserve API order — for spreads/ML the outcomes are typically
        // [home, away]; we show them side-by-side as-is.
        const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
        if (outcomes.length === 0) return null;
        return (
            <div style={oddsPairStyle}>
                {outcomes.slice(0, 2).map((outcome, idx) => {
                    const selection = outcome?.name || '';
                    const selKey = `${section.key}|${selection}`;
                    const selected = selectedKeys.has(selKey);
                    const pointLabel = outcome?.point != null
                        ? formatLineValue(outcome.point, { signed: section.key.startsWith('spreads') })
                        : '';
                    return (
                        <button
                            key={`${section.key}-${idx}`}
                            style={{ ...oddsBtnStyle(selected), borderRight: idx === 0 ? '1px solid #999' : 'none' }}
                            onClick={() => addSelection(section.key, section.label, outcome, selection)}
                        >
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{outcome.name}</div>
                            {pointLabel !== '' && <div style={{ fontSize: 13, marginTop: 2 }}>{pointLabel}</div>}
                            <div style={{ fontSize: 11, marginTop: 4, color: selected ? '#fff' : '#b36a00', fontWeight: 700 }}>{formatOdds(outcome.price, oddsFormat)}</div>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderOverUnderSection = (section, market) => {
        const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
        const over = outcomes.find((o) => /over/i.test(o?.name || ''));
        const under = outcomes.find((o) => /under/i.test(o?.name || ''));
        if (!over && !under) return null;
        const renderSide = (outcome, idx) => {
            if (!outcome) return <div key={idx} style={{ padding: 16, color: '#888' }}>—</div>;
            const selection = outcome?.name || '';
            const selKey = `${section.key}|${selection}`;
            const selected = selectedKeys.has(selKey);
            return (
                <button
                    key={`${section.key}-${idx}`}
                    style={{ ...oddsBtnStyle(selected), borderRight: idx === 0 ? '1px solid #999' : 'none' }}
                    onClick={() => addSelection(section.key, section.label, outcome, selection)}
                >
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{outcome.name}</div>
                    {outcome?.point != null && <div style={{ fontSize: 13, marginTop: 2 }}>{formatLineValue(outcome.point)}</div>}
                    <div style={{ fontSize: 11, marginTop: 4, color: selected ? '#fff' : '#b36a00', fontWeight: 700 }}>{formatOdds(outcome.price, oddsFormat)}</div>
                </button>
            );
        };
        return <div style={oddsPairStyle}>{renderSide(over, 0)}{renderSide(under, 1)}</div>;
    };

    const renderTeamTotalsSection = (section, market) => {
        const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
        const byTeam = new Map();
        outcomes.forEach((o) => {
            const team = String(o?.description || o?.name || '').trim();
            if (!team || /^(over|under)$/i.test(team)) return;
            if (!byTeam.has(team)) byTeam.set(team, []);
            byTeam.get(team).push(o);
        });
        // Some bookmakers use `name` for Over/Under and no description. In that
        // case outcomes can't be split per team — fall back to the over/under
        // renderer so we still surface them.
        if (byTeam.size === 0) return renderOverUnderSection(section, market);
        return (
            <>
                {Array.from(byTeam.entries()).map(([team, teamOutcomes]) => (
                    <div key={`${section.key}-${team}`}>
                        <div style={subHeaderStyle}>{team}</div>
                        {renderOverUnderSection(
                            { ...section, key: `${section.key}:${team}` },
                            { outcomes: teamOutcomes }
                        )}
                    </div>
                ))}
            </>
        );
    };

    const renderAltLinesSection = (section, market) => {
        const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
        if (outcomes.length === 0) return null;
        return (
            <div style={altRowStyle}>
                {outcomes.map((outcome, idx) => {
                    const selection = [outcome?.name, outcome?.point != null ? formatLineValue(outcome.point) : ''].filter(Boolean).join(' ');
                    const selKey = `${section.key}|${selection}`;
                    const selected = selectedKeys.has(selKey);
                    return (
                        <button
                            key={`${section.key}-${idx}`}
                            style={altBtnStyle(selected)}
                            onClick={() => addSelection(section.key, section.label, outcome, selection)}
                        >
                            <div>{selection}</div>
                            <div style={{ fontSize: 11, marginTop: 4, color: selected ? '#fff' : '#b36a00', fontWeight: 700 }}>{formatOdds(outcome.price, oddsFormat)}</div>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderSectionBody = (section) => {
        const market = marketsByKey[section.key.toLowerCase()];
        if (!market) return null;
        switch (section.kind) {
            case 'two-team': return renderTwoTeamSection(section, market);
            case 'over-under': return renderOverUnderSection(section, market);
            case 'team-totals': return renderTeamTotalsSection(section, market);
            case 'alt-lines': return renderAltLinesSection(section, market);
            default: return null;
        }
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                    <button style={backBtnStyle} onClick={onClose}>Back</button>
                    <div style={{ ...titleStyle, flex: 1, textAlign: 'center' }}>
                        <strong style={{ fontSize: 14 }}>{matchName}</strong>
                        <span style={{ fontSize: 11, color: '#9aa' }}>Main Bets</span>
                    </div>
                    <button style={toggleAllBtnStyle} onClick={allOpen ? closeAll : openAll}>
                        {allOpen ? 'Close All' : 'Open All'}
                    </button>
                </div>

                <div style={bodyStyle}>
                    {loading && (
                        <div style={{ padding: 30, textAlign: 'center', color: '#aaa' }}>
                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
                            Loading all markets…
                        </div>
                    )}
                    {!loading && error && (
                        <div style={{ padding: 30, textAlign: 'center', color: '#f55' }}>{error}</div>
                    )}
                    {!loading && !error && availableSections.length === 0 && (
                        <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>
                            No additional markets available for this match right now.
                        </div>
                    )}
                    {!loading && !error && availableSections.map((section) => {
                        const isOpen = !!expanded[section.key];
                        return (
                            <div key={section.key}>
                                <div
                                    style={sectionHeaderStyle}
                                    onClick={() => setExpanded((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
                                >
                                    <span>{section.label}</span>
                                    <span style={{ fontSize: 16, fontWeight: 700 }}>{isOpen ? '−' : '+'}</span>
                                </div>
                                {isOpen && renderSectionBody(section)}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MatchDetailView;
