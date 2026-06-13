import React, { useEffect, useMemo, useState } from 'react';
import '../props.css';
import useMatches from '../hooks/useMatches';
import { getMyBets, getMatchProps } from '../api';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatLineValue, formatOdds } from '../utils/odds';
import { formatSiteTime } from '../utils/timezone';
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
 * Desktop "Props Builder" page (P+ in the bet-mode bar, dashboardView 'props').
 *
 * Keeps the desktop chrome players know — left sport/game rail + market-filter
 * tabs — but its market content now uses the SAME unified data model as the
 * standalone PropBuilderView: base game markets off `odds.markets` PLUS the
 * lazy-loaded extended markets (alts / team totals / period lines) and player
 * props from `getMatchProps`. Previously this screen only rendered h2h /
 * spreads / totals, so "All Markets" was nearly empty. Shared metadata +
 * book-dedupe live in utils/propBuilderMarkets.js. betslip:add contract is
 * reused verbatim — no new money logic.
 */

const PropsView = () => {
    const { oddsFormat } = useOddsFormat();
    const [activeRail, setActiveRail] = useState('props');
    const [activeView, setActiveView] = useState('builder');
    const [activeSport, setActiveSport] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [marketTab, setMarketTab] = useState('popular');
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [collapsedMarkets, setCollapsedMarkets] = useState({});
    const [selectedKeys, setSelectedKeys] = useState(() => new Set());
    const [myBets, setMyBets] = useState([]);
    const [myBetsLoading, setMyBetsLoading] = useState(false);
    const [myBetsError, setMyBetsError] = useState('');

    // Extended markets + player props for the selected game (lazy-loaded).
    const [payload, setPayload] = useState({ extendedMarkets: [], playerProps: [] });
    const [propsLoading, setPropsLoading] = useState(false);
    const [propsError, setPropsError] = useState('');

    const matches = useMatches({ status: 'live-upcoming' });

    const sportBuckets = useMemo(() => {
        const map = new Map();
        (matches || []).forEach((match) => {
            const key = String(match.sport || 'unknown').toLowerCase();
            const bucket = map.get(key) || { id: key, label: formatSportLabel(key), count: 0 };
            bucket.count += 1;
            map.set(key, bucket);
        });
        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [matches]);

    const filteredMatches = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return (matches || []).filter((match) => {
            const sportKey = String(match.sport || 'unknown').toLowerCase();
            if (activeSport !== 'all' && sportKey !== activeSport) return false;
            if (!normalizedSearch) return true;
            const home = String(match.homeTeam || match.home_team || '').toLowerCase();
            const away = String(match.awayTeam || match.away_team || '').toLowerCase();
            return home.includes(normalizedSearch) || away.includes(normalizedSearch);
        });
    }, [matches, activeSport, searchTerm]);

    useEffect(() => {
        if (selectedMatchId && filteredMatches.some((match) => getMatchId(match) === selectedMatchId)) return;
        setSelectedMatchId(getMatchId(filteredMatches[0]) || null);
    }, [filteredMatches, selectedMatchId]);

    const selectedMatch = useMemo(() => {
        return filteredMatches.find((match) => getMatchId(match) === selectedMatchId) || filteredMatches[0] || null;
    }, [filteredMatches, selectedMatchId]);

    const matchId = selectedMatch ? getMatchId(selectedMatch) : '';
    const sportKey = String(selectedMatch?.sportKey || selectedMatch?.sport || '').toLowerCase();

    // Lazy-load extended markets + player props whenever the game changes.
    useEffect(() => {
        if (!matchId) {
            setPayload({ extendedMarkets: [], playerProps: [] });
            return;
        }
        let cancelled = false;
        setPropsLoading(true);
        setPropsError('');
        setSelectedKeys(new Set());
        getMatchProps(matchId)
            .then((data) => { if (!cancelled) setPayload(data || { extendedMarkets: [], playerProps: [] }); })
            .catch((err) => { if (!cancelled) setPropsError(err?.message || 'Failed to load markets'); })
            .finally(() => { if (!cancelled) setPropsLoading(false); });
        return () => { cancelled = true; };
    }, [matchId]);

    // book key → priority rank from the server-ordered bookmaker list.
    const bookRank = useMemo(() => {
        const rank = new Map();
        const books = Array.isArray(selectedMatch?.odds?.bookmakers) ? selectedMatch.odds.bookmakers : [];
        books.forEach((b, idx) => {
            const key = String(b?.key || '').toLowerCase();
            if (key && !rank.has(key)) rank.set(key, idx);
        });
        if (rank.size === 0) FALLBACK_BOOK_PRIORITY.forEach((key, idx) => rank.set(key, idx));
        return rank;
    }, [selectedMatch]);

    const marketsByKey = useMemo(() => {
        const idx = new Map();
        const base = Array.isArray(selectedMatch?.odds?.markets) ? selectedMatch.odds.markets : [];
        const extended = Array.isArray(payload?.extendedMarkets) ? payload.extendedMarkets : [];
        [...base, ...extended].forEach((m) => {
            if (!m || !m.key) return;
            const k = String(m.key).toLowerCase();
            if (!idx.has(k)) idx.set(k, m);
        });
        return idx;
    }, [selectedMatch, payload]);

    // Unified card list. Each card → { key, title, buttons[] }; a button carries
    // the load-bearing selection string + marketType for the betslip.
    const allCards = useMemo(() => {
        const coreCards = [];
        const propCards = [];

        marketsByKey.forEach((market, key) => {
            const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
            if (outcomes.length === 0) return;

            const core = parseCoreMarket(key);
            if (core) {
                coreCards.push({
                    key, title: core.label, base: coreBase(key),
                    buttons: outcomes.map((o) => ({
                        label: `${o.name || ''}${o.point != null ? ` (${formatLineValue(o.point, { signed: core.signed })})` : ''}`.trim(),
                        selection: o.name || '',
                        marketType: key,
                        marketLabel: core.label,
                        price: o.price,
                    })),
                });
                return;
            }

            const section = GAME_PROP_BY_KEY.get(key);
            if (!section) return;
            if (section.kind === 'team-totals') {
                // Split by team (description); marketType disambiguates per team.
                const byTeam = new Map();
                outcomes.forEach((o) => {
                    const team = String(o?.description || '').trim();
                    if (!team || isOverUnderName(team)) return;
                    if (!byTeam.has(team)) byTeam.set(team, []);
                    byTeam.get(team).push(o);
                });
                if (byTeam.size === 0) {
                    propCards.push(altCard(key, section.label, outcomes));
                } else {
                    byTeam.forEach((teamOutcomes, team) => {
                        propCards.push({
                            key: `${key}:${team}`, title: `${section.label} — ${team}`,
                            buttons: teamOutcomes.map((o) => ({
                                label: `${o.name || ''}${o.point != null ? ` ${formatLineValue(o.point)}` : ''}`.trim(),
                                selection: o.name || '',
                                marketType: `${key}:${team}`,
                                marketLabel: section.label,
                                price: o.price,
                            })),
                        });
                    });
                }
            } else {
                propCards.push(altCard(key, section.label, outcomes));
            }
        });

        // Full-game lines lead; then alphabetical.
        coreCards.sort((a, b) => {
            const fa = Number(isFullGameKey(b.key)) - Number(isFullGameKey(a.key));
            if (fa !== 0) return fa;
            return a.title.localeCompare(b.title);
        });

        // Player-prop categories → one card each, buttons grouped by player.
        const outcomesByKey = new Map();
        (payload.playerProps || []).forEach((market) => {
            const k = String(market?.key || '');
            if (!k) return;
            const outcomes = Array.isArray(market?.outcomes) ? market.outcomes : [];
            if (!outcomesByKey.has(k)) outcomesByKey.set(k, []);
            outcomesByKey.get(k).push(...outcomes);
        });
        const playerCards = [];
        outcomesByKey.forEach((outcomes, key) => {
            const deduped = dedupeByPreferredBook(outcomes, bookRank);
            const byPlayer = new Map();
            let hasOU = false;
            deduped.forEach((o) => {
                const player = String(o?.description || o?.name || '').trim();
                if (!player) return;
                if (isOverUnderName(o?.name)) hasOU = true;
                if (!byPlayer.has(player)) byPlayer.set(player, []);
                byPlayer.get(player).push(o);
            });
            if (byPlayer.size === 0) return;
            const base = prettyPlayerMarketLabel(key);
            const title = hasOU ? `Over/Under - ${base}` : base;
            const buttons = [];
            Array.from(byPlayer.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([player, list]) => {
                    list.forEach((o) => {
                        const sel = `${player} ${o.name || ''}${o.point != null ? ` ${formatLineValue(o.point)}` : ''}`.trim();
                        buttons.push({ label: sel, selection: sel, marketType: key, marketLabel: title, price: o.price });
                    });
                });
            playerCards.push({ key: `prop:${key}`, title, order: PLAYER_CATEGORY_ORDER.indexOf(key), buttons });
        });
        playerCards.sort((a, b) => {
            if (a.order !== -1 || b.order !== -1) return (a.order === -1 ? 999 : a.order) - (b.order === -1 ? 999 : b.order);
            return a.title.localeCompare(b.title);
        });

        return { coreCards, propCards, playerCards };
    }, [marketsByKey, payload.playerProps, bookRank]);

    // Apply the market-filter tab.
    const visibleCards = useMemo(() => {
        const { coreCards, propCards, playerCards } = allCards;
        if (marketTab === 'popular') return coreCards.filter((c) => isFullGameKey(c.key));
        if (marketTab === 'moneyline') return coreCards.filter((c) => c.base === 'h2h');
        if (marketTab === 'spread') return coreCards.filter((c) => c.base === 'spreads');
        if (marketTab === 'total') return coreCards.filter((c) => c.base === 'totals');
        return [...coreCards, ...propCards, ...playerCards]; // all
    }, [allCards, marketTab]);

    useEffect(() => {
        if (activeView !== 'my_bets') return;
        const token = localStorage.getItem('token');
        if (!token) {
            setMyBets([]);
            setMyBetsError('Please login to view your bets.');
            return;
        }
        const loadBets = async () => {
            try {
                setMyBetsLoading(true);
                setMyBetsError('');
                const data = await getMyBets(token);
                setMyBets(Array.isArray(data) ? data : []);
            } catch (error) {
                setMyBetsError(error.message || 'Failed to load bets');
            } finally {
                setMyBetsLoading(false);
            }
        };
        loadBets();
    }, [activeView]);

    const toggleMarket = (key) => setCollapsedMarkets((prev) => ({ ...prev, [key]: !prev[key] }));

    const addSelection = (button) => {
        const price = Number(button?.price);
        if (!matchId || !button?.selection || !Number.isFinite(price)) return;
        const dedupeKey = `${button.marketType}|${button.selection}`;
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(dedupeKey)) next.delete(dedupeKey);
            else next.add(dedupeKey);
            return next;
        });
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection: button.selection,
                marketType: button.marketType,
                odds: price,
                matchName: `${selectedMatch?.homeTeamShort || selectedMatch?.homeTeam || selectedMatch?.home_team} vs ${selectedMatch?.awayTeamShort || selectedMatch?.awayTeam || selectedMatch?.away_team}`,
                marketLabel: button.marketLabel,
                sportKey,
            },
        }));
    };

    return (
        <div className="props-container">
            <div className="props-mini-sidebar">
                <button className={`props-ms-item ${activeRail === 'props' ? 'active' : ''}`} onClick={() => setActiveRail('props')}>
                    <div className="props-ms-icon"><i className="fa-solid fa-chart-line"></i></div>
                    <div>PROPS+</div>
                </button>
                <button className={`props-ms-item ${activeRail === 'horses' ? 'active' : ''}`} onClick={() => setActiveRail('horses')}>
                    <div className="props-ms-icon"><i className="fa-solid fa-horse"></i></div>
                    <div>HORSES</div>
                </button>
            </div>

            <div className="props-selection-sidebar">
                <div className="props-search-area">
                    <div className="props-search-header-row"><span>Sports & Games</span></div>
                    <input
                        type="text"
                        className="props-search-input"
                        placeholder="Search teams"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="props-adv-search-btn" onClick={() => window.dispatchEvent(new CustomEvent('matches:refresh', { detail: { reason: 'manual' } }))}>
                        Refresh Board
                    </button>
                </div>

                <div className="props-track-list">
                    <button className={`props-group-header sport-btn ${activeSport === 'all' ? 'active' : ''}`} onClick={() => setActiveSport('all')}>
                        <span><i className="fa-solid fa-trophy"></i> All Sports</span>
                        <span className="props-chip">{filteredMatches.length}</span>
                    </button>

                    {sportBuckets.map((bucket) => (
                        <button
                            key={bucket.id}
                            className={`props-group-header sport-btn ${activeSport === bucket.id ? 'active' : ''}`}
                            onClick={() => setActiveSport(bucket.id)}
                        >
                            <span>{bucket.label}</span>
                            <span className="props-chip">{bucket.count}</span>
                        </button>
                    ))}
                </div>

                <div className="props-search-area">
                    <div className="props-search-header-row">
                        <span>Next Games</span>
                        <span>{filteredMatches.length}</span>
                    </div>
                </div>

                <div className="props-track-list">
                    {filteredMatches.map((match) => {
                        const id = getMatchId(match);
                        const isActive = id === getMatchId(selectedMatch);
                        return (
                            <button
                                key={id}
                                className={`props-track-item ${isActive ? 'active' : ''}`}
                                onClick={() => setSelectedMatchId(id)}
                            >
                                <span>{match.homeTeamShort || match.homeTeam || match.home_team}</span>
                                <span>{match.awayTeamShort || match.awayTeam || match.away_team}</span>
                                <div className="props-track-time-badges">
                                    <span className="props-time-badge">{formatStartTime(match.startTime)}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="props-main">
                <div className="props-main-header top">
                    <div className="props-main-title">Props Builder</div>
                    <div className="props-main-actions">
                        <button className={`props-top-btn ${activeView === 'builder' ? 'active' : ''}`} onClick={() => setActiveView('builder')}>Build Mode</button>
                        <button className={`props-top-btn ${activeView === 'my_bets' ? 'active' : ''}`} onClick={() => setActiveView('my_bets')}>My Bets</button>
                        <button className={`props-top-btn ${activeView === 'help' ? 'active' : ''}`} onClick={() => setActiveView('help')}>Help</button>
                    </div>
                </div>

                <div className="props-main-header secondary">
                    <div className="props-match-title">
                        {selectedMatch ? `${selectedMatch.homeTeamShort || selectedMatch.homeTeam || selectedMatch.home_team} @ ${selectedMatch.awayTeamShort || selectedMatch.awayTeam || selectedMatch.away_team}` : 'No game selected'}
                    </div>
                    <div className="props-market-tabs">
                        {[
                            { id: 'popular', label: 'Popular' },
                            { id: 'moneyline', label: 'Moneyline' },
                            { id: 'spread', label: 'Spread' },
                            { id: 'total', label: 'Total' },
                            { id: 'all', label: 'All Markets' }
                        ].map((tab) => (
                            <button key={tab.id} className={`props-market-tab ${marketTab === tab.id ? 'active' : ''}`} onClick={() => setMarketTab(tab.id)}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="props-race-grid">
                    {activeView === 'help' && (
                        <div className="props-help-card">
                            <h3>How to use Props Builder</h3>
                            <p>1. Select a sport and game from the left board.</p>
                            <p>2. Choose a market tab (or "All Markets" for game props + player props), then click any odds button.</p>
                            <p>3. Selection is sent to your live bet slip immediately.</p>
                            <p>4. Use mode tabs (Straight/Parlay/Teaser/If Bet/Reverse) at top to control bet rules.</p>
                        </div>
                    )}

                    {activeView === 'my_bets' && (
                        <div className="props-help-card">
                            <h3>Recent Bets</h3>
                            {myBetsLoading && <p>Loading bets...</p>}
                            {!myBetsLoading && myBetsError && <p>{myBetsError}</p>}
                            {!myBetsLoading && !myBetsError && myBets.length === 0 && <p>No bets found.</p>}
                            {!myBetsLoading && !myBetsError && myBets.slice(0, 10).map((bet) => (
                                <div key={bet.id} className="props-bet-row">
                                    <span>{String(bet.type || 'bet').toUpperCase()}</span>
                                    <span>${Math.round(Number(bet.amount || 0))}</span>
                                    <span className={`status ${String(bet.status || 'pending').toLowerCase()}`}>{bet.status || 'pending'}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeView === 'builder' && (
                        <>
                            {!selectedMatch && (
                                <div className="props-help-card">
                                    <h3>No games available</h3>
                                    <p>Try another sport or refresh the board.</p>
                                </div>
                            )}
                            {selectedMatch && propsLoading && visibleCards.length === 0 && (
                                <div className="props-help-card">
                                    <h3><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading markets…</h3>
                                    <p>Pulling game props and player props for this game.</p>
                                </div>
                            )}
                            {selectedMatch && !propsLoading && propsError && visibleCards.length === 0 && (
                                <div className="props-help-card"><h3>Couldn’t load markets</h3><p>{propsError}</p></div>
                            )}
                            {selectedMatch && !propsLoading && !propsError && visibleCards.length === 0 && (
                                <div className="props-help-card">
                                    <h3>No markets for this tab</h3>
                                    <p>Try "All Markets", pick another game, or refresh the board.</p>
                                </div>
                            )}
                            {selectedMatch && visibleCards.map((card) => {
                                const isCollapsed = Boolean(collapsedMarkets[card.key]);
                                return (
                                    <div key={card.key} className="props-market-card">
                                        <button className="props-market-header" onClick={() => toggleMarket(card.key)}>
                                            <span>{card.title}</span>
                                            <i className={`fa-solid ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                                        </button>
                                        {!isCollapsed && (
                                            <div className="props-market-outcomes">
                                                {card.buttons.length === 0 && (
                                                    <div className="props-empty-outcomes">No odds currently available.</div>
                                                )}
                                                {card.buttons.map((button, index) => {
                                                    const selected = selectedKeys.has(`${button.marketType}|${button.selection}`);
                                                    return (
                                                        <button
                                                            key={`${card.key}-${button.selection}-${index}`}
                                                            className={`props-odds-btn ${selected ? 'selected' : ''}`}
                                                            onClick={() => addSelection(button)}
                                                            disabled={button.price == null}
                                                        >
                                                            <span>{button.label || 'Pick'}</span>
                                                            <strong>{formatOdds(button.price, oddsFormat)}</strong>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const GAME_PROP_BY_KEY = new Map(GAME_PROP_SECTIONS.map((s) => [s.key, s]));

// A game-prop alt-lines card: each outcome → one button (name + point).
const altCard = (key, title, outcomes) => ({
    key, title,
    buttons: (Array.isArray(outcomes) ? outcomes : []).map((o) => {
        const sel = [o?.name, o?.point != null ? formatLineValue(o.point) : ''].filter(Boolean).join(' ');
        return { label: sel || 'Pick', selection: sel, marketType: key, marketLabel: title, price: o?.price };
    }),
});

const coreBase = (key) => {
    const k = String(key || '').toLowerCase();
    if (k.startsWith('h2h')) return 'h2h';
    if (k.startsWith('spreads')) return 'spreads';
    if (k.startsWith('totals')) return 'totals';
    return '';
};

const isFullGameKey = (key) => /^(h2h|spreads|totals)$/.test(String(key || '').toLowerCase());

const formatSportLabel = (sportKey = 'unknown') => sportKey
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getMatchId = (match) => match?.id || match?.externalId || `${match?.homeTeam || match?.home_team}-${match?.awayTeam || match?.away_team}`;

const formatStartTime = (startTime) => {
    if (!startTime) return 'Live';
    const date = new Date(startTime);
    if (Number.isNaN(date.getTime())) return 'Live';
    return formatSiteTime(date);
};

export default PropsView;
