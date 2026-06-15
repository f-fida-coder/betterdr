import React from 'react';
import useMatches from '../hooks/useMatches';
import { getMatchProps } from '../api';
import { formatLineValue, formatOdds, formatSpreadValue } from '../utils/odds';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { isLiveLikeMatch } from '../utils/liveStatus';
import { formatSiteDateTime } from '../utils/timezone';
import {
    GAME_PROP_SECTIONS,
    PLAYER_CATEGORY_ORDER,
    FALLBACK_BOOK_PRIORITY,
    parseCoreMarket,
    prettyPlayerMarketLabel,
    isOverUnderName,
    dedupeByPreferredBook,
} from '../utils/propBuilderMarkets';

/**
 * Unified Prop Builder screen (dashboard "Prop Builder" view).
 *
 * Modeled on the competitor's PROPS BUILDER screen: a sport rail with live
 * counts, a game selector + Build Mode toggle + player filter, market-category
 * tabs, then the markets themselves. Unlike the old game-first → modal flow
 * (which only rendered player props and went blank whenever a game had none),
 * this leads with GAME markets — moneyline / handicap / totals / period lines /
 * team totals, off `match.odds.markets` + the lazy-loaded `extendedMarkets` —
 * so the screen always has content, then layers player props on top.
 *
 * Everything renders from our own API: the match board the client already
 * polls (`useMatches`) plus the per-match props endpoint (`getMatchProps`).
 * Bet placement reuses the exact `betslip:add` contract the matchup sheet and
 * the props modal already dispatch — no new money logic lives here.
 */

const getMatchId = (match) => match?.id || match?.externalId
    || `${match?.homeTeam || match?.home_team}-${match?.awayTeam || match?.away_team}`;

const formatSportLabel = (sportKey = 'unknown') => sportKey
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

// Short rail chips like the reference (NBA / MLB / NHL). Known leagues get an
// uppercased acronym; everything else falls back to the titleized full label.
const SPORT_SHORT = {
    basketball_nba: 'NBA',
    basketball_wnba: 'WNBA',
    basketball_ncaab: 'NCAAB',
    baseball_mlb: 'MLB',
    icehockey_nhl: 'NHL',
    americanfootball_nfl: 'NFL',
    americanfootball_ncaaf: 'NCAAF',
    tennis_atp: 'ATP',
    tennis_wta: 'WTA',
};
const shortSportLabel = (key) => {
    if (SPORT_SHORT[key]) return SPORT_SHORT[key];
    const tail = String(key || '').split('_').pop();
    if (tail && tail.length <= 5) return tail.toUpperCase();
    return formatSportLabel(key);
};

const awayName = (m) => m?.awayTeamFull || m?.awayTeam || m?.away_team || 'Away';
const homeName = (m) => m?.homeTeamFull || m?.homeTeam || m?.home_team || 'Home';
const matchTitle = (m) => `${awayName(m)} @ ${homeName(m)}`;

const GAME_PROP_BY_KEY = new Map(GAME_PROP_SECTIONS.map((s) => [s.key, s]));

const PropBuilderView = () => {
    const { oddsFormat } = useOddsFormat();
    // 'light' = game list WITHOUT odds. The full unscoped live-upcoming board
    // carries ~12 KB of odds per game; 250+ rows is a ~3 MB payload that times
    // out on mobile and leaves the builder showing "No games available". We
    // only need teams/sport/time here for the rail + selector; the selected
    // game's odds (base markets, period markets, player props) load on demand
    // via getMatchProps below. limit caps to live + soonest by start time.
    const matches = useMatches({ status: 'live-upcoming', payload: 'light', limit: 200 });

    const [activeSport, setActiveSport] = React.useState('all');
    const [selectedMatchId, setSelectedMatchId] = React.useState('');
    const [buildMode, setBuildMode] = React.useState(false);
    const [playerFilter, setPlayerFilter] = React.useState('all');
    const [activeTab, setActiveTab] = React.useState('all');

    const [payload, setPayload] = React.useState({ extendedMarkets: [], playerProps: [] });
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    // Collapsed-section state, keyed by group/category id.
    const [collapsed, setCollapsed] = React.useState({});
    const [selectedKeys, setSelectedKeys] = React.useState(() => new Set());

    // ----- sport rail (counts), live-first inside each sport ----------------
    const sportGroups = React.useMemo(() => {
        const map = new Map();
        (matches || []).forEach((match) => {
            const key = String(match?.sport || match?.sportKey || 'unknown').toLowerCase();
            if (!map.has(key)) map.set(key, { key, label: shortSportLabel(key), matches: [] });
            map.get(key).matches.push(match);
        });
        const groups = Array.from(map.values());
        groups.forEach((group) => {
            group.matches.sort((a, b) => {
                const liveDelta = Number(isLiveLikeMatch(b)) - Number(isLiveLikeMatch(a));
                if (liveDelta !== 0) return liveDelta;
                return new Date(a?.startTime || 0) - new Date(b?.startTime || 0);
            });
        });
        return groups.sort((a, b) => b.matches.length - a.matches.length);
    }, [matches]);

    const visibleMatches = React.useMemo(() => {
        if (activeSport === 'all') return sportGroups.flatMap((g) => g.matches);
        const group = sportGroups.find((g) => g.key === activeSport);
        return group ? group.matches : [];
    }, [sportGroups, activeSport]);

    // Keep the selected game valid: if the active sport changed or the chosen
    // game rolled off the board, fall back to the first visible game so the
    // screen is never pointed at a stale / missing match.
    React.useEffect(() => {
        if (visibleMatches.length === 0) {
            if (selectedMatchId) setSelectedMatchId('');
            return;
        }
        if (!visibleMatches.some((m) => getMatchId(m) === selectedMatchId)) {
            setSelectedMatchId(getMatchId(visibleMatches[0]));
        }
    }, [visibleMatches, selectedMatchId]);

    // If the active sport empties out (poll refresh), drop back to All Sports.
    React.useEffect(() => {
        if (activeSport !== 'all' && !sportGroups.some((g) => g.key === activeSport)) {
            setActiveSport('all');
        }
    }, [sportGroups, activeSport]);

    const selectedMatch = React.useMemo(
        () => visibleMatches.find((m) => getMatchId(m) === selectedMatchId) || null,
        [visibleMatches, selectedMatchId]
    );

    const matchId = selectedMatch?.id || selectedMatch?.externalId || '';
    const matchName = selectedMatch ? `${awayName(selectedMatch)} @ ${homeName(selectedMatch)}` : '';
    const sportKey = String(selectedMatch?.sportKey || selectedMatch?.sport || '').toLowerCase();

    // ----- lazy-load extended markets + player props for the chosen game ----
    React.useEffect(() => {
        if (!matchId) {
            setPayload({ extendedMarkets: [], playerProps: [] });
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError('');
        getMatchProps(matchId)
            .then((data) => { if (!cancelled) setPayload(data || { extendedMarkets: [], playerProps: [] }); })
            .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load markets'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [matchId]);

    // Reset transient UI when the game changes.
    React.useEffect(() => {
        setPlayerFilter('all');
        setActiveTab('all');
        setSelectedKeys(new Set());
        setCollapsed({});
    }, [matchId]);

    // book key → priority rank from the server-ordered bookmaker list.
    const bookRank = React.useMemo(() => {
        const rank = new Map();
        // Prefer the bookmaker order from the on-demand props payload (the
        // light game list carries no odds); fall back to the match doc if a
        // core list ever feeds this view.
        const books = Array.isArray(payload?.bookmakers) && payload.bookmakers.length
            ? payload.bookmakers
            : (Array.isArray(selectedMatch?.odds?.bookmakers) ? selectedMatch.odds.bookmakers : []);
        books.forEach((b, idx) => {
            const key = String(b?.key || '').toLowerCase();
            if (key && !rank.has(key)) rank.set(key, idx);
        });
        if (rank.size === 0) FALLBACK_BOOK_PRIORITY.forEach((key, idx) => rank.set(key, idx));
        return rank;
    }, [selectedMatch, payload]);

    // Index every market (base + extended) by key for O(1) lookup.
    const marketsByKey = React.useMemo(() => {
        const idx = new Map();
        // Base game markets come from the on-demand props payload (canonical,
        // preferred-book prices — same as the board); the light game list has
        // no odds. Fall back to the match doc for a core-list feed.
        const base = Array.isArray(payload?.markets) && payload.markets.length
            ? payload.markets
            : (Array.isArray(selectedMatch?.odds?.markets) ? selectedMatch.odds.markets : []);
        const extended = Array.isArray(payload?.extendedMarkets) ? payload.extendedMarkets : [];
        [...base, ...extended].forEach((m) => {
            if (!m || !m.key) return;
            const k = String(m.key).toLowerCase();
            if (!idx.has(k)) idx.set(k, m); // base wins over extended on key clash
        });
        return idx;
    }, [selectedMatch, payload]);

    // Core game markets (moneyline / handicap / totals + period variants),
    // ordered: full game first, then by label. Each carries its live market.
    const gameMarketSections = React.useMemo(() => {
        const out = [];
        marketsByKey.forEach((market, key) => {
            const core = parseCoreMarket(key);
            if (!core) return;
            const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
            if (outcomes.length === 0) return;
            out.push({ ...core, market });
        });
        // Full-game lines (no period token) lead; then alphabetical by label.
        const isFullGame = (s) => /^(h2h|spreads|totals)$/.test(s.key) || s.key === 'h2h_3_way';
        return out.sort((a, b) => {
            const fa = Number(isFullGame(b)) - Number(isFullGame(a));
            if (fa !== 0) return fa;
            return a.label.localeCompare(b.label);
        });
    }, [marketsByKey]);

    // Game-prop / alt / team-total sections that actually have a market.
    const gamePropSections = React.useMemo(
        () => GAME_PROP_SECTIONS
            .filter((s) => marketsByKey.has(s.key))
            .map((s) => ({ ...s, market: marketsByKey.get(s.key) })),
        [marketsByKey]
    );

    // Player-prop categories: deduped to the preferred book, grouped by player.
    const propCategories = React.useMemo(() => {
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
            const base = prettyPlayerMarketLabel(key);
            cats.push({ key, label: hasOverUnder ? `Over/Under - ${base}` : base, shortLabel: base, byPlayer });
        });

        cats.sort((a, b) => {
            const ai = PLAYER_CATEGORY_ORDER.indexOf(a.key);
            const bi = PLAYER_CATEGORY_ORDER.indexOf(b.key);
            if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            return a.key.localeCompare(b.key);
        });
        return cats;
    }, [payload.playerProps, bookRank]);

    const playerNames = React.useMemo(() => {
        const names = new Set();
        propCategories.forEach((cat) => cat.byPlayer.forEach((_, name) => names.add(name)));
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [propCategories]);

    React.useEffect(() => {
        if (playerFilter !== 'all' && !playerNames.includes(playerFilter)) setPlayerFilter('all');
    }, [playerNames, playerFilter]);

    // Apply the player filter to the prop categories shown.
    const visiblePropCategories = React.useMemo(() => {
        if (playerFilter === 'all') return propCategories;
        return propCategories.filter((cat) => cat.byPlayer.has(playerFilter));
    }, [propCategories, playerFilter]);

    // ----- market-category tabs --------------------------------------------
    // [{ id, label }]. "All Markets" + the groups/categories present.
    const tabs = React.useMemo(() => {
        const list = [{ id: 'all', label: 'All Markets' }];
        if (gameMarketSections.length > 0) list.push({ id: 'game', label: 'Game Markets' });
        if (gamePropSections.length > 0) list.push({ id: 'props', label: 'Game Props' });
        visiblePropCategories.forEach((cat) => list.push({ id: `cat:${cat.key}`, label: cat.shortLabel }));
        return list;
    }, [gameMarketSections, gamePropSections, visiblePropCategories]);

    React.useEffect(() => {
        if (!tabs.some((t) => t.id === activeTab)) setActiveTab('all');
    }, [tabs, activeTab]);

    const showGame = activeTab === 'all' || activeTab === 'game';
    const showProps = activeTab === 'all' || activeTab === 'props';
    const activeCatKey = activeTab.startsWith('cat:') ? activeTab.slice(4) : null;

    // ----- selection / betslip (verbatim contract) -------------------------
    const isSelected = (marketKey, selection) => selectedKeys.has(`${marketKey}|${selection}`);

    const addSelection = (marketKey, marketLabel, selection, price) => {
        const num = Number(price);
        if (!matchId || !selection || !Number.isFinite(num)) return;
        const key = `${marketKey}|${selection}`;
        // The App-level betslip:add handler toggles — a repeat of the same
        // {matchId, marketType, selection} removes the leg. Mirror that locally
        // so the highlight releases on the second tap.
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: { matchId, selection, marketType: marketKey, odds: num, matchName, marketLabel, sportKey },
        }));
    };

    // =======================================================================
    // styles
    // =======================================================================
    const containerStyle = {
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        background: '#fff', width: '100%', maxWidth: 760, margin: '0 auto',
    };
    const toolbarStyle = {
        display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
        background: '#262626', borderBottom: '1px solid #1a1a1a', flexShrink: 0,
    };
    const toolbarTitleStyle = {
        color: '#fff', fontSize: 14, fontWeight: 800, fontStyle: 'italic',
        letterSpacing: 0.5, flexShrink: 0, whiteSpace: 'nowrap',
    };
    const railStyle = {
        display: 'flex', gap: 6, padding: '8px 10px', background: '#1c1c1c',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexShrink: 0,
    };
    const railChip = (active) => ({
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
        borderRadius: 999, border: '1px solid ' + (active ? '#e0584a' : '#3a3a3a'),
        background: active ? '#e0584a' : '#2a2a2a', color: '#fff', fontSize: 12,
        fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    });
    const railCount = (active) => ({
        fontSize: 10, fontWeight: 800, background: active ? 'rgba(0,0,0,0.25)' : '#444',
        color: '#fff', borderRadius: 999, padding: '1px 6px',
    });
    const controlsStyle = {
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        background: '#f5f5f5', borderBottom: '1px solid #e2e2e2', flexShrink: 0, flexWrap: 'wrap',
    };
    const selectStyle = {
        background: '#fff', color: '#1a1a1a', border: '1px solid #cfcfcf', borderRadius: 8,
        padding: '9px 10px', fontSize: 13, fontWeight: 600, flex: 1, minWidth: 150,
    };
    const buildToggleStyle = (on) => ({
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px',
        borderRadius: 8, border: '1px solid ' + (on ? '#d0451b' : '#cfcfcf'),
        background: on ? '#d0451b' : '#fff', color: on ? '#fff' : '#444',
        fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
    });
    const switchTrack = (on) => ({
        width: 30, height: 16, borderRadius: 999, background: on ? '#fff' : '#c9c9c9',
        position: 'relative', transition: 'background 0.15s ease', flexShrink: 0,
    });
    const switchKnob = (on) => ({
        position: 'absolute', top: 2, left: on ? 16 : 2, width: 12, height: 12,
        borderRadius: '50%', background: on ? '#d0451b' : '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)', transition: 'left 0.15s ease',
    });
    const tabsStyle = {
        display: 'flex', gap: 6, padding: '8px 10px', background: '#fff',
        borderBottom: '1px solid #e5e7eb', overflowX: 'auto',
        WebkitOverflowScrolling: 'touch', flexShrink: 0,
    };
    const tabChip = (active) => ({
        padding: '7px 13px', borderRadius: 999, border: 'none',
        background: active ? '#1d4ed8' : '#eef0f3', color: active ? '#fff' : '#333',
        fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    });
    const bodyStyle = {
        overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, minHeight: 0,
        padding: '6px 6px 28px', background: '#fff',
    };
    const groupHeaderStyle = {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '12px 14px', background: '#3a3a3a', borderRadius: 4, marginTop: 8,
        marginBottom: 5, cursor: 'pointer', fontSize: 12, fontWeight: 800, color: '#fff',
        letterSpacing: 0.5, textTransform: 'uppercase', minHeight: 44,
    };
    const categoryHeaderStyle = { ...groupHeaderStyle, background: '#e0584a', textTransform: 'none', fontWeight: 600, fontSize: 13, letterSpacing: 0 };
    const chevronStyle = (open) => ({ fontSize: 16, fontWeight: 700, lineHeight: 1, flexShrink: 0, transition: 'transform 0.12s ease', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none' });
    const groupBodyStyle = { marginBottom: 6, borderRadius: 4, overflow: 'hidden', border: '1px solid #d9d9d9' };
    const rowLabelStyle = { padding: '9px 14px', background: '#efefef', borderBottom: '1px solid #ddd', fontSize: 12, fontWeight: 800, color: '#222' };
    const subLabelStyle = { ...rowLabelStyle, background: '#f6f6f6', textTransform: 'uppercase', letterSpacing: 0.4 };
    const oddsPairStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#c7c7c7', borderBottom: '1px solid #999' };
    const pairBtnStyle = (selected, isFirst) => ({
        background: selected ? '#d0451b' : 'transparent', color: selected ? '#fff' : '#111',
        border: 'none', borderRight: isFirst ? '1px solid #999' : 'none', padding: '13px 10px',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center', minHeight: 54,
    });
    const altRowStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 4, padding: '8px', background: '#c7c7c7', borderBottom: '1px solid #999' };
    const altBtnStyle = (selected) => ({
        background: selected ? '#d0451b' : '#fff', color: selected ? '#fff' : '#111',
        border: '1px solid #aaa', borderRadius: 4, padding: '10px 6px', fontSize: 12,
        fontWeight: 600, cursor: 'pointer', minHeight: 44,
    });
    const priceStyle = (selected) => ({ fontSize: 11, marginTop: 4, color: selected ? '#fff' : '#b36a00', fontWeight: 700 });

    const isCollapsed = (id) => !!collapsed[id];
    const toggleCollapsed = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

    // =======================================================================
    // renderers — game markets
    // =======================================================================
    const renderPairButton = (marketKey, marketLabel, outcome, isFirst, opts = {}) => {
        const name = outcome?.name || '';
        const selection = opts.selection != null ? opts.selection : name;
        const selected = isSelected(marketKey, selection);
        const pointLabel = outcome?.point != null
            ? (opts.signed ? formatSpreadValue(outcome.point) : formatLineValue(outcome.point))
            : '';
        return (
            <button
                key={`${marketKey}-${selection}-${isFirst ? 'a' : 'b'}`}
                style={pairBtnStyle(selected, isFirst)}
                onClick={() => addSelection(marketKey, marketLabel, selection, outcome?.price)}
            >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
                {pointLabel !== '' && <div style={{ fontSize: 13, marginTop: 2 }}>{pointLabel}</div>}
                <div style={priceStyle(selected)}>{formatOdds(outcome?.price, oddsFormat)}</div>
            </button>
        );
    };

    const renderTwoTeam = (section) => {
        const outcomes = (Array.isArray(section.market?.outcomes) ? section.market.outcomes : []).slice(0, 2);
        if (outcomes.length === 0) return null;
        return (
            <div style={oddsPairStyle}>
                {outcomes.map((o, i) => renderPairButton(section.key, section.label, o, i === 0, { signed: section.signed }))}
            </div>
        );
    };

    const renderOverUnder = (sectionKey, marketLabel, outcomes) => {
        const over = outcomes.find((o) => /over/i.test(o?.name || ''));
        const under = outcomes.find((o) => /under/i.test(o?.name || ''));
        if (!over && !under) return null;
        const side = (o, i) => (o
            ? renderPairButton(sectionKey, marketLabel, o, i === 0)
            : <div key={`${sectionKey}-empty-${i}`} style={{ padding: 16, color: '#888', textAlign: 'center' }}>—</div>);
        return <div style={oddsPairStyle}>{side(over, 0)}{side(under, 1)}</div>;
    };

    const renderTeamTotals = (section) => {
        const outcomes = Array.isArray(section.market?.outcomes) ? section.market.outcomes : [];
        const byTeam = new Map();
        outcomes.forEach((o) => {
            const team = String(o?.description || '').trim();
            if (!team || isOverUnderName(team)) return;
            if (!byTeam.has(team)) byTeam.set(team, []);
            byTeam.get(team).push(o);
        });
        if (byTeam.size === 0) return renderOverUnder(section.key, section.label, outcomes);
        return (
            <>
                {Array.from(byTeam.entries()).map(([team, teamOutcomes]) => (
                    <div key={`${section.key}-${team}`}>
                        <div style={subLabelStyle}>{team}</div>
                        {renderOverUnder(`${section.key}:${team}`, section.label, teamOutcomes)}
                    </div>
                ))}
            </>
        );
    };

    const renderAltLines = (section) => {
        const outcomes = Array.isArray(section.market?.outcomes) ? section.market.outcomes : [];
        if (outcomes.length === 0) return null;
        return (
            <div style={altRowStyle}>
                {outcomes.map((o, idx) => {
                    const selection = [o?.name, o?.point != null ? formatLineValue(o.point) : ''].filter(Boolean).join(' ');
                    const selected = isSelected(section.key, selection);
                    return (
                        <button
                            key={`${section.key}-${idx}`}
                            style={altBtnStyle(selected)}
                            onClick={() => addSelection(section.key, section.label, selection, o?.price)}
                        >
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selection || 'Pick'}</div>
                            <div style={priceStyle(selected)}>{formatOdds(o?.price, oddsFormat)}</div>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderGameSectionBody = (section) => {
        switch (section.kind) {
            case 'two-team': return renderTwoTeam(section);
            case 'over-under': return renderOverUnder(section.key, section.label, Array.isArray(section.market?.outcomes) ? section.market.outcomes : []);
            case 'team-totals': return renderTeamTotals(section);
            case 'alt-lines': return renderAltLines(section);
            default: return null;
        }
    };

    const renderGameGroup = (id, title, sections, parlayHint) => {
        if (sections.length === 0) return null;
        const open = !isCollapsed(id);
        return (
            <div key={id}>
                <div style={groupHeaderStyle} onClick={() => toggleCollapsed(id)}>
                    <span>{title}{parlayHint ? ' (Parlays Only)' : ''}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{sections.length}</span>
                        <span style={chevronStyle(open)}>›</span>
                    </span>
                </div>
                {open && (
                    <div style={groupBodyStyle}>
                        {sections.map((section) => (
                            <div key={section.key}>
                                <div style={rowLabelStyle}>{section.label}</div>
                                {renderGameSectionBody(section)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // =======================================================================
    // renderers — player props
    // =======================================================================
    const renderPlayerOutcomes = (catKey, catLabel, playerName, outcomes) => {
        const linesByPoint = new Map();
        const rest = [];
        outcomes.forEach((o) => {
            if (isOverUnderName(o?.name)) {
                const pk = String(o?.point ?? '');
                if (!linesByPoint.has(pk)) linesByPoint.set(pk, {});
                linesByPoint.get(pk)[/^over$/i.test(o.name) ? 'over' : 'under'] = o;
            } else {
                rest.push(o);
            }
        });
        const lines = Array.from(linesByPoint.entries()).sort(([a], [b]) => (parseFloat(a) || 0) - (parseFloat(b) || 0));

        const buildSelection = (o) => {
            const pointLabel = o?.point != null ? ` ${formatLineValue(o.point)}` : '';
            return `${playerName} ${o?.name || ''}${pointLabel}`.trim();
        };
        const side = (o, isFirst) => {
            if (!o) return <div key={`${isFirst ? 'a' : 'b'}`} style={{ padding: 14, color: '#888', textAlign: 'center' }}>—</div>;
            const selection = buildSelection(o);
            const selected = isSelected(catKey, selection);
            return (
                <button
                    key={selection}
                    style={pairBtnStyle(selected, isFirst)}
                    onClick={() => addSelection(catKey, catLabel, selection, o?.price)}
                >
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{o.name}{o?.point != null ? ` ${formatLineValue(o.point)}` : ''}</div>
                    <div style={priceStyle(selected)}>{formatOdds(o?.price, oddsFormat)}</div>
                </button>
            );
        };

        return (
            <React.Fragment key={`${catKey}-${playerName}`}>
                <div style={rowLabelStyle}>{playerName}</div>
                {lines.map(([pk, pair]) => (
                    <div key={`${catKey}-${playerName}-${pk}`} style={oddsPairStyle}>
                        {side(pair.over, true)}
                        {side(pair.under, false)}
                    </div>
                ))}
                {rest.length > 0 && (
                    <div style={altRowStyle}>
                        {rest.map((o, idx) => {
                            const selection = buildSelection(o);
                            const selected = isSelected(catKey, selection);
                            const text = `${o?.name || ''}${o?.point != null ? ` ${formatLineValue(o.point)}` : ''}`.trim();
                            return (
                                <button
                                    key={`${catKey}-${playerName}-rest-${idx}`}
                                    style={altBtnStyle(selected)}
                                    onClick={() => addSelection(catKey, catLabel, selection, o?.price)}
                                >
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text || 'Pick'}</div>
                                    <div style={priceStyle(selected)}>{formatOdds(o?.price, oddsFormat)}</div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </React.Fragment>
        );
    };

    const renderPropCategory = (cat) => {
        const players = Array.from(cat.byPlayer.entries())
            .filter(([name]) => playerFilter === 'all' || name === playerFilter)
            .sort(([a], [b]) => a.localeCompare(b));
        if (players.length === 0) return null;
        const id = `cat:${cat.key}`;
        const open = !isCollapsed(id);
        return (
            <div key={cat.key}>
                <div style={categoryHeaderStyle} onClick={() => toggleCollapsed(id)}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>
                            {players.length} {players.length === 1 ? 'player' : 'players'}
                        </span>
                        <span style={chevronStyle(open)}>›</span>
                    </span>
                </div>
                {open && (
                    <div style={groupBodyStyle}>
                        {players.map(([name, outcomes]) => renderPlayerOutcomes(cat.key, cat.label, name, outcomes))}
                    </div>
                )}
            </div>
        );
    };

    // =======================================================================
    // body content
    // =======================================================================
    const hasAnyContent = gameMarketSections.length > 0 || gamePropSections.length > 0 || visiblePropCategories.length > 0;

    const renderBody = () => {
        if (!selectedMatch) {
            return <div style={{ padding: 30, textAlign: 'center', color: '#777', fontSize: 13 }}>No games on the board right now. Check back closer to game time.</div>;
        }
        if (loading) {
            return (
                <div style={{ padding: 30, textAlign: 'center', color: '#777' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
                    Loading markets…
                </div>
            );
        }
        if (error) return <div style={{ padding: 30, textAlign: 'center', color: '#c0392b' }}>{error}</div>;
        if (!hasAnyContent) {
            return <div style={{ padding: 30, textAlign: 'center', color: '#777', fontSize: 13 }}>No markets available for this game right now.</div>;
        }

        const catsToShow = activeCatKey
            ? visiblePropCategories.filter((c) => c.key === activeCatKey)
            : visiblePropCategories;

        return (
            <>
                {showGame && renderGameGroup('group:game', 'Game Markets', gameMarketSections, buildMode)}
                {showProps && renderGameGroup('group:props', 'Game Props', gamePropSections, false)}
                {(activeTab === 'all' || activeCatKey) && catsToShow.map(renderPropCategory)}
            </>
        );
    };

    return (
        <div style={containerStyle}>
            <div style={toolbarStyle}>
                <span style={toolbarTitleStyle}>PROP BUILDER</span>
            </div>

            <div style={railStyle}>
                <button style={railChip(activeSport === 'all')} onClick={() => setActiveSport('all')}>
                    All
                    <span style={railCount(activeSport === 'all')}>{visibleMatches.length || sportGroups.reduce((n, g) => n + g.matches.length, 0)}</span>
                </button>
                {sportGroups.map((group) => (
                    <button key={group.key} style={railChip(activeSport === group.key)} onClick={() => setActiveSport(group.key)}>
                        {group.label}
                        <span style={railCount(activeSport === group.key)}>{group.matches.length}</span>
                    </button>
                ))}
            </div>

            <div style={controlsStyle}>
                <select
                    style={selectStyle}
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                    aria-label="Select game"
                >
                    {visibleMatches.length === 0 && <option value="">No games available</option>}
                    {visibleMatches.map((m) => (
                        <option key={getMatchId(m)} value={getMatchId(m)}>
                            {matchTitle(m)}{isLiveLikeMatch(m) ? ' • LIVE' : ` • ${formatSiteDateTime(m?.startTime)}`}
                        </option>
                    ))}
                </select>

                <div
                    style={buildToggleStyle(buildMode)}
                    onClick={() => setBuildMode((v) => !v)}
                    role="switch"
                    aria-checked={buildMode}
                >
                    Build Mode
                    <span style={switchTrack(buildMode)}><span style={switchKnob(buildMode)} /></span>
                </div>

                {playerNames.length > 0 && (
                    <select
                        style={selectStyle}
                        value={playerFilter}
                        onChange={(e) => setPlayerFilter(e.target.value)}
                        aria-label="Filter by player"
                    >
                        <option value="all">All players</option>
                        {playerNames.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                )}
            </div>

            {selectedMatch && tabs.length > 1 && (
                <div style={tabsStyle}>
                    {tabs.map((tab) => (
                        <button key={tab.id} style={tabChip(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            <div style={bodyStyle}>{renderBody()}</div>
        </div>
    );
};

export default PropBuilderView;
