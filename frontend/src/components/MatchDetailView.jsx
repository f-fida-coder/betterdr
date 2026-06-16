import React from 'react';
import { getMatchProps } from '../api';
import { formatLineValue, formatOdds, formatSpreadValue } from '../utils/odds';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { useDismissableSurface } from '../hooks/useDismissableSurface';

/**
 * Ordered list of non-prop market sections we know how to render.
 * `kind` controls the layout:
 *   - two-team: pair of buttons, one per team, paired by outcome.name
 *   - over-under: Over/Under pair (outcome.name = 'Over' | 'Under')
 *   - team-totals: splits outcomes by description (team name) into sub-rows
 *   - alt-lines: N buttons, each a separate line; grouped by team where possible
 */
// The `+` (More Bets) modal exists to surface bet types the player CANNOT
// reach from the row or the period-tab strip on the list view. That means:
//   - Game Spread / Game ML / Game Total are excluded — they're on the row.
//   - 1H / 2H / 1Q–4Q / P1–P3 / F1–F7 Spread/ML/Total are excluded — the
//     period tab strip already filters the list by exactly these.
//   - What's left is the genuinely "extra" stuff: alt spreads, alt totals,
//     team totals (game + per-period), and soccer-specific alts (BTTS,
//     Draw No Bet, Double Chance, 3-way ML). Player props have their own
//     P+ button on the row, so they aren't surfaced here either.
// Height of a sticky market-section header inside the scroll body. Used as the
// scroll-padding/scroll-margin offset so a section that scrolls to the top of
// the body (on expand/collapse) doesn't tuck its heading under the next sticky
// header. 12px top + 12px bottom padding + ~20px line box ≈ 44px.
const SECTION_HEADER_HEIGHT = 44;

const SECTION_DEFS = [
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

const MatchDetailView = ({ match, onClose }) => {
    const { oddsFormat } = useOddsFormat();
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [payload, setPayload] = React.useState({ extendedMarkets: [], playerProps: [], cached: false });
    // Default-expand the alt sections — they're the reason this modal exists.
    // Game spreads/ML/totals are already visible on the row that opened the
    // modal, so collapsing them here cuts noise. Sections that don't have a
    // market for this game stay invisible regardless (filtered by
    // `availableSections` below).
    const [expanded, setExpanded] = React.useState({
        alternate_spreads: true,
        alternate_totals: true,
        team_totals: true,
        alternate_team_totals: true,
    });
    const [selectedKeys, setSelectedKeys] = React.useState(() => new Set());

    const matchId = match?.id || match?.externalId || '';
    const homeTeam = match?.homeTeamFull || match?.homeTeam || match?.home_team || 'Home';
    const awayTeam = match?.awayTeamFull || match?.awayTeam || match?.away_team || 'Away';
    const matchName = `${awayTeam} @ ${homeTeam}`;

    // Tell the page chrome (DashboardHeader) the matchup sheet is open so it
    // can swap its leftmost cell into a sticky Back button. Also accept
    // remote-close requests from that header tap. Mirrors the betslip
    // overlay's `betslip:state` / `betslip:close` event pair.
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
    // OUT of nav-tab dismissal (dismissOnNavTab: false) — same as the P+ prop
    // sheet — so tapping a bet-mode tab (STRAIGHT/PARLAY/TEASER/…) above only
    // switches the mode underneath and leaves this "+ adjusted/alt lines" sheet
    // OPEN. The player can flip to Parlay and keep adding alt-line legs without
    // it "exiting". Backdrop tap / Back / ESC / the sheet's close button still
    // dismiss it.
    useDismissableSurface(true, onClose, { dismissOnNavTab: false });

    // Cap the sheet height below the top chrome so its header ("Alt Lines &
    // Totals" + Close All) is fully visible instead of sitting behind the page
    // header / bet-type bar. Mirrors PropBuilderModal. Measures the LOWEST bar
    // pinned near the top (page header + .tabs-bar). Replaces the old fixed
    // 96vh height + duplicate in-body back bar workaround.
    const [headerOffsetPx, setHeaderOffsetPx] = React.useState(0);
    React.useLayoutEffect(() => {
        const measure = () => {
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
        // Re-measure after paint: the page chrome swaps its top cell to a Back
        // button when this view opens (match-detail:state event), which can
        // change the chrome's height after the initial layout pass.
        const raf = requestAnimationFrame(measure);
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
        };
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

    // Map a section key (e.g. `alternate_spreads_q1`, `team_totals_h2`) to
    // a period token we can compare against the match's current period.
    // Returns null for game-level markets and soccer alts (always shown).
    const sectionPeriodToken = (key) => {
        const k = String(key || '').toLowerCase();
        if (/_(q[1-4])$/.test(k)) return RegExp.$1;
        if (/_(h[12])$/.test(k)) return RegExp.$1;
        if (/_(p[1-3])$/.test(k)) return RegExp.$1;
        return null;
    };

    // For LIVE matches only: a period section is "closed" once the match's
    // current period number has passed it. Pre-game / finished matches show
    // every section the API returns. Soccer halves use different thresholds
    // (only 2 halves total) than basketball/football quarters+halves.
    const isSectionClosedForMatch = React.useMemo(() => {
        const eventStatus = String(match?.score?.event_status || '').toUpperCase();
        const isLive = match?.status === 'live'
            || eventStatus.includes('IN_PROGRESS')
            || eventStatus.includes('LIVE');
        const periodNum = Number(match?.score?.period || 0);
        const sportKey = String(match?.sportKey || '').toLowerCase();
        if (!isLive || !Number.isFinite(periodNum) || periodNum <= 0) {
            return () => false;
        }
        const isSoccer = sportKey.startsWith('soccer');
        const quarterMap = { q1: 1, q2: 2, q3: 3, q4: 4 };
        const halfMap = isSoccer ? { h1: 1, h2: 2 } : { h1: 2, h2: 4 };
        const periodMap = { p1: 1, p2: 2, p3: 3 };
        return (sectionKey) => {
            const token = sectionPeriodToken(sectionKey);
            if (!token) return false;
            const threshold = quarterMap[token] ?? halfMap[token] ?? periodMap[token];
            if (threshold === undefined) return false;
            return periodNum > threshold;
        };
    }, [match]);

    const availableSections = React.useMemo(() => {
        return SECTION_DEFS.filter((s) => {
            if (!marketsByKey[s.key.toLowerCase()]) return false;
            if (isSectionClosedForMatch(s.key)) return false;
            return true;
        });
    }, [marketsByKey, isSectionClosedForMatch]);

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
        // The App-level betslip:add handler already toggles — sending the
        // same {matchId, marketType, selection} a second time removes the
        // leg from the slip. Mirror that here so the local highlight
        // releases on the second tap; otherwise the button stays painted
        // orange and the user can't visually "unlock" a pick they no
        // longer want.
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
                marketLabel,
                // sportKey lets the betslip enforce per-mode sport rules
                // (e.g. teaser only allows football + basketball). Without
                // it, the slip would have to round-trip the matchId to
                // resolve sport — adding it at dispatch time keeps the
                // validation purely client-side and instantaneous.
                sportKey: String(match?.sportKey || match?.sport || '').toLowerCase(),
            },
        }));
    };

    const overlayStyle = {
        position: 'fixed',
        // Start below the top chrome and fill the rest, so the page behind is
        // fully covered (no gap showing the previous screen). Chrome above
        // stays visible/clickable (its Back cell closes us).
        top: headerOffsetPx,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
    };
    const sheetStyle = {
        background: '#0f0f0f',
        color: '#f5f5f5',
        width: '100%',
        maxWidth: 720,
        height: '100%',
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
    const bodyStyle = { flex: 1, overflowY: 'auto', padding: '0 0 24px', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', scrollPaddingTop: SECTION_HEADER_HEIGHT };
    const sectionHeaderStyle = {
        position: 'sticky',
        top: 0,
        zIndex: 5,
        minHeight: SECTION_HEADER_HEIGHT,
        boxSizing: 'border-box',
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
                    const isSpread = /spread|handicap/i.test(section.key);
                    const pointLabel = outcome?.point != null
                        ? (isSpread ? formatSpreadValue(outcome.point) : formatLineValue(outcome.point))
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
                    // Wire/selection key MUST stay byte-identical (unsigned point)
                    // — it drives odds matching and settlement. The displayed
                    // label gets the explicit sign (spreads/handicaps) for clarity.
                    const selection = [outcome?.name, outcome?.point != null ? formatLineValue(outcome.point) : ''].filter(Boolean).join(' ');
                    const isSpread = /spread|handicap/i.test(section.key);
                    const pointLabel = outcome?.point != null
                        ? (isSpread ? formatSpreadValue(outcome.point) : formatLineValue(outcome.point))
                        : '';
                    const displayLabel = [outcome?.name, pointLabel].filter(Boolean).join(' ');
                    const selKey = `${section.key}|${selection}`;
                    const selected = selectedKeys.has(selKey);
                    return (
                        <button
                            key={`${section.key}-${idx}`}
                            style={altBtnStyle(selected)}
                            onClick={() => addSelection(section.key, section.label, outcome, selection)}
                        >
                            <div>{displayLabel}</div>
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
                    <div style={{ ...titleStyle, flex: 1, textAlign: 'left' }}>
                        <strong style={{ fontSize: 14 }}>{matchName}</strong>
                        <span style={{ fontSize: 11, color: '#9aa' }}>Alt Lines & Totals</span>
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
                            <div key={section.key} style={{ scrollMarginTop: SECTION_HEADER_HEIGHT }}>
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
