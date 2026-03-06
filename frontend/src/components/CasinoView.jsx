import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import '../casino.css';
import { getCasinoCategories, getCasinoGames, launchCasinoGame, getBalance, placeCasinoBet, getCasinoBetHistory } from '../api';

const LOCAL_GAME_META = {
    baccarat: {
        id: 'local-baccarat',
        provider: 'In-House',
        url: '/games/baccarat/index.html',
        poster: '/games/baccarat/assets/menuscreen.webp',
        themeColor: '#1a0a2e',
    }
};

const CATEGORY_META = {
    lobby: { label: 'Lobby', icon: 'fa-solid fa-table-cells-large' },
    table_games: { label: 'Table Games', icon: 'fa-solid fa-playing-cards' },
    slots: { label: 'Slots', icon: 'fa-solid fa-dice' },
    video_poker: { label: 'Video Poker', icon: 'fa-solid fa-heart' },
    specialty_games: { label: 'Specialty Games', icon: 'fa-solid fa-star' }
};

const createRequestId = () =>
    `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

const CasinoView = () => {
    const token = localStorage.getItem('token');
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('lobby');
    const [searchInput, setSearchInput] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const [featuredOnly, setFeaturedOnly] = useState(false);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [launchingGameId, setLaunchingGameId] = useState(null);
    const [activeLocalGame, setActiveLocalGame] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');
    const [historyRows, setHistoryRows] = useState([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPagination, setHistoryPagination] = useState({ page: 1, pages: 1, total: 0, limit: 8 });
    const [historyFilters, setHistoryFilters] = useState({ result: '', minWager: '', maxWager: '' });
    const iframeRef = useRef(null);
    const pendingGameRequests = useRef(new Set());

    const loadCasinoHistory = useCallback(async () => {
        if (!token) {
            setHistoryRows([]);
            setHistoryPagination({ page: 1, pages: 1, total: 0, limit: 8 });
            return;
        }
        try {
            setHistoryLoading(true);
            setHistoryError('');
            const payload = await getCasinoBetHistory(token, {
                page: historyPage,
                limit: 8,
                result: historyFilters.result,
                minWager: historyFilters.minWager,
                maxWager: historyFilters.maxWager,
            });
            setHistoryRows(Array.isArray(payload?.bets) ? payload.bets : []);
            setHistoryPagination(payload?.pagination || { page: historyPage, pages: 1, total: 0, limit: 8 });
        } catch (err) {
            console.error('Failed to load casino history:', err);
            setHistoryError(err.message || 'Failed to load baccarat history');
        } finally {
            setHistoryLoading(false);
        }
    }, [token, historyPage, historyFilters.result, historyFilters.minWager, historyFilters.maxWager]);

    /* ── postMessage bridge: iframe ↔ backend API ─────────── */
    const handleGameMessage = useCallback(async (event) => {
        // Only accept messages from our own origin
        if (event.origin !== window.location.origin) return;
        const currentIframeWindow = iframeRef.current?.contentWindow;
        if (!currentIframeWindow || event.source !== currentIframeWindow) return;
        const msg = event.data;
        if (!msg || typeof msg !== 'object' || !msg.type) return;

        const sendToGame = (payload) => {
            if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage(payload, window.location.origin);
            }
        };

        if (msg.type === 'getBalance') {
            const requestId = String(msg.requestId || '');
            try {
                const data = await getBalance(token);
                sendToGame({ type: 'balanceUpdate', requestId, balance: data.availableBalance ?? data.balance ?? 0 });
            } catch (err) {
                console.error('Failed to get balance for game:', err);
                sendToGame({ type: 'balanceUpdate', requestId, balance: 0, error: err.message });
            }
        }

        if (msg.type === 'placeBet') {
            const requestId = String(msg.requestId || createRequestId());
            if (pendingGameRequests.current.has(requestId)) {
                return;
            }
            pendingGameRequests.current.add(requestId);
            try {
                const result = await placeCasinoBet(msg.game || 'baccarat', msg.bets, token, { requestId });
                sendToGame({ type: 'betResult', requestId, ...result });
                // Refresh header balance
                window.dispatchEvent(new Event('user:refresh'));
                loadCasinoHistory();
            } catch (err) {
                console.error('Casino bet failed:', err);
                sendToGame({ type: 'betError', requestId, error: err.message });
            } finally {
                pendingGameRequests.current.delete(requestId);
            }
        }
    }, [token, loadCasinoHistory]);

    useEffect(() => {
        window.addEventListener('message', handleGameMessage);
        return () => window.removeEventListener('message', handleGameMessage);
    }, [handleGameMessage]);

    const loadCategories = async () => {
        if (!token) return;
        try {
            const payload = await getCasinoCategories(token);
            setCategories(Array.isArray(payload?.categories) ? payload.categories : []);
        } catch (err) {
            console.error('Failed to load casino categories:', err);
        }
    };

    const loadGames = async () => {
        if (!token) {
            setLoading(false);
            setError('Please login to access casino games.');
            return;
        }
        try {
            setLoading(true);
            setError('');
            const payload = await getCasinoGames({
                token,
                category: activeCategory,
                search: searchValue,
                featured: featuredOnly,
                page: 1,
                limit: 96
            });
            setGames(Array.isArray(payload?.games) ? payload.games : []);
        } catch (err) {
            console.error('Failed to load casino games:', err);
            setError(err.message || 'Failed to load casino games');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        loadGames();
    }, [activeCategory, searchValue, featuredOnly]);

    useEffect(() => {
        loadCasinoHistory();
    }, [loadCasinoHistory]);

    const navItems = useMemo(() => {
        if (categories.length === 0) {
            return Object.entries(CATEGORY_META).map(([id, meta]) => ({ id, label: meta.label, count: 0 }));
        }
        return categories.map((category) => {
            const meta = CATEGORY_META[category.id] || { label: category.label || category.id };
            return {
                id: category.id,
                label: meta.label,
                count: Number(category.count || 0)
            };
        });
    }, [categories]);

    const handleSearch = () => {
        setSearchValue(searchInput.trim());
    };

    const handleLaunch = async (gameId) => {
        if (!token) {
            alert('Please login to launch casino games.');
            return;
        }
        try {
            setLaunchingGameId(gameId);
            const payload = await launchCasinoGame(gameId, token);
            if (payload?.launchUrl) {
                window.open(payload.launchUrl, '_blank', 'noopener,noreferrer');
            } else {
                alert('Launch URL is not available for this game yet.');
            }
        } catch (err) {
            alert(err.message || 'Unable to launch game');
        } finally {
            setLaunchingGameId(null);
        }
    };

    const formatLimits = (minBet, maxBet) => `MIN: $${Number(minBet || 0).toFixed(2)} | MAX: $${Number(maxBet || 0).toFixed(2)}`;
    const formatMoney = (value) => {
        const num = Number(value || 0);
        if (Number.isNaN(num)) return '$0.00';
        return `$${num.toFixed(2)}`;
    };
    const handleLocalGameOpen = (game) => {
        if (!token) {
            alert('Please login to play in-house games.');
            return;
        }
        setActiveLocalGame(game);
    };

    const localGames = useMemo(() => {
        const canShowEmbeddedTableGame = activeCategory === 'lobby' || activeCategory === 'table_games';
        if (!canShowEmbeddedTableGame) return [];

        return games
            .filter((game) => game?.slug && LOCAL_GAME_META[game.slug])
            .map((game) => ({
                ...LOCAL_GAME_META[game.slug],
                id: `local-${game.slug}`,
                backendId: game.id,
                name: game.name || 'Baccarat',
                provider: game.provider || LOCAL_GAME_META[game.slug].provider,
                themeColor: game.themeColor || LOCAL_GAME_META[game.slug].themeColor,
                status: game.status || 'active',
                minBet: game.minBet,
                maxBet: game.maxBet,
                isFeatured: !!game.isFeatured,
            }));
    }, [activeCategory, games]);

    const catalogGames = useMemo(
        () => games.filter((game) => !(game?.slug && LOCAL_GAME_META[game.slug])),
        [games]
    );

    return (
        <div className="casino-wrapper">
            {/* ── Fullscreen game overlay ──────────────────────── */}
            {activeLocalGame && (
                <div className="game-iframe-overlay">
                    <button
                        className="game-iframe-close-btn"
                        onClick={() => setActiveLocalGame(null)}
                        title="Close game"
                    >
                        <i className="fa-solid fa-xmark"></i>
                        <span>Close</span>
                    </button>
                    <iframe
                        ref={iframeRef}
                        src={activeLocalGame.url}
                        title={activeLocalGame.name}
                        className="game-iframe"
                        allowFullScreen
                    />
                </div>
            )}

            <div className="casino-subnav-bar">
                <div className="casino-nav-items">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            className={`casino-nav-item ${activeCategory === item.id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(item.id)}
                        >
                            <span className="casino-nav-icon"><i className={CATEGORY_META[item.id]?.icon || 'fa-solid fa-dice'}></i></span>
                            <span>{item.label}</span>
                            <span className="casino-count">{item.count}</span>
                        </button>
                    ))}
                </div>

                <div className="casino-search-container">
                    <input
                        type="text"
                        className="casino-search-input"
                        placeholder="Search games"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="casino-search-btn" onClick={handleSearch} title="Search games">
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </button>
                    <button
                        className={`casino-featured-btn ${featuredOnly ? 'active' : ''}`}
                        onClick={() => setFeaturedOnly((prev) => !prev)}
                    >
                        <i className="fa-solid fa-star"></i>
                        <span>Featured</span>
                    </button>
                    <button className="casino-refresh-btn" onClick={loadGames}>
                        <i className="fa-solid fa-arrows-rotate"></i>
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* ── Local (in-house) games section ──────────────── */}
            {localGames.length > 0 && (
                <div className="casino-local-section">
                    <div className="casino-local-header">
                        <i className="fa-solid fa-gem"></i>
                        <span>In-House Games</span>
                    </div>
                    <div className="casino-grid">
                        {localGames.map((game) => (
                            <article
                                className="casino-card local-game-card"
                                key={game.id}
                                onClick={() => handleLocalGameOpen(game)}
                            >
                                <div
                                    className="casino-card-image"
                                    style={{ background: `linear-gradient(135deg, ${game.themeColor || '#0f172a'}, #0f5db3)` }}
                                >
                                    <img src={game.poster} alt={game.name} className="casino-game-image" />
                                    <span className="casino-status active">active</span>
                                    <span className="casino-inhouse-badge">
                                        <i className="fa-solid fa-crown"></i> IN-HOUSE
                                    </span>
                                    <div className="play-overlay">
                                        <i className="fa-solid fa-play"></i>
                                    </div>
                                </div>
                                <div className="casino-card-info">
                                    <div className="casino-card-top">
                                        <div className="casino-game-title">{game.name}</div>
                                        <div className="casino-provider inhouse">{game.provider}</div>
                                    </div>
                                    <button
                                        className="casino-play-btn local"
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLocalGameOpen(game);
                                        }}
                                    >
                                        <i className="fa-solid fa-play" style={{ marginRight: 6 }}></i>
                                        Play Now
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}

            <div className="casino-history-section">
                <div className="casino-history-header">
                    <div>
                        <h3>Baccarat History</h3>
                        <p>Win/loss history pulled from server-settled rounds.</p>
                    </div>
                    <button
                        type="button"
                        className="casino-refresh-btn"
                        onClick={() => loadCasinoHistory()}
                        disabled={historyLoading}
                    >
                        <i className="fa-solid fa-arrows-rotate"></i>
                        <span>{historyLoading ? 'Refreshing...' : 'Refresh History'}</span>
                    </button>
                </div>

                <div className="casino-history-filters">
                    <label>
                        Result
                        <select
                            value={historyFilters.result}
                            onChange={(e) => {
                                setHistoryPage(1);
                                setHistoryFilters((prev) => ({ ...prev, result: e.target.value }));
                            }}
                        >
                            <option value="">All</option>
                            <option value="Player">Player</option>
                            <option value="Banker">Banker</option>
                            <option value="Tie">Tie</option>
                        </select>
                    </label>
                    <label>
                        Min Wager
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={historyFilters.minWager}
                            onChange={(e) => {
                                setHistoryPage(1);
                                setHistoryFilters((prev) => ({ ...prev, minWager: e.target.value }));
                            }}
                            placeholder="0.00"
                        />
                    </label>
                    <label>
                        Max Wager
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={historyFilters.maxWager}
                            onChange={(e) => {
                                setHistoryPage(1);
                                setHistoryFilters((prev) => ({ ...prev, maxWager: e.target.value }));
                            }}
                            placeholder="100.00"
                        />
                    </label>
                </div>

                {historyError && <div className="casino-history-error">{historyError}</div>}

                <div className="casino-history-table-wrap">
                    <table className="casino-history-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Result</th>
                                <th>Wager</th>
                                <th>Return</th>
                                <th>Net</th>
                                <th>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!historyLoading && historyRows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="casino-history-empty">
                                        No baccarat rounds found for these filters.
                                    </td>
                                </tr>
                            )}
                            {historyRows.map((row) => (
                                <tr key={row.roundId || row.id}>
                                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                                    <td>{row.result || '—'}</td>
                                    <td>{formatMoney(row.totalWager)}</td>
                                    <td>{formatMoney(row.totalReturn)}</td>
                                    <td className={Number(row.netResult) >= 0 ? 'net-pos' : 'net-neg'}>
                                        {formatMoney(row.netResult)}
                                    </td>
                                    <td>{formatMoney(row.balanceAfter)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="casino-history-pagination">
                    <button
                        type="button"
                        onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                        disabled={historyPage <= 1 || historyLoading}
                    >
                        Previous
                    </button>
                    <span>
                        Page {historyPagination?.page || historyPage} of {historyPagination?.pages || 1}
                    </span>
                    <button
                        type="button"
                        onClick={() =>
                            setHistoryPage((prev) => {
                                const maxPages = Number(historyPagination?.pages || 1);
                                return Math.min(maxPages, prev + 1);
                            })
                        }
                        disabled={historyLoading || (historyPagination?.page || historyPage) >= (historyPagination?.pages || 1)}
                    >
                        Next
                    </button>
                </div>
            </div>

            {loading && (
                <div className="casino-feedback-state">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Loading casino games...</span>
                </div>
            )}

            {!loading && error && (
                <div className="casino-feedback-state error">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{error}</span>
                </div>
            )}

            {!loading && !error && catalogGames.length === 0 && localGames.length === 0 && (
                <div className="casino-feedback-state">
                    <i className="fa-regular fa-folder-open"></i>
                    <span>No games found for this filter.</span>
                </div>
            )}

            {!loading && !error && catalogGames.length > 0 && (
                <div className="casino-grid">
                    {catalogGames.map((game) => (
                        <article className="casino-card" key={game.id}>
                            <div className="casino-card-image" style={{ background: `linear-gradient(135deg, #0f172a, ${game.themeColor || '#0f5db3'})` }}>
                                {game.imageUrl ? (
                                    <img src={game.imageUrl} alt={game.name} className="casino-game-image" />
                                ) : (
                                    <span className="casino-fallback-icon">
                                        <i className={game.icon || 'fa-solid fa-dice'}></i>
                                    </span>
                                )}
                                <span className={`casino-status ${game.status}`}>{game.status}</span>
                                <div className="play-overlay">
                                    <i className="fa-solid fa-play"></i>
                                </div>
                            </div>
                            <div className="casino-card-info">
                                <div className="casino-card-top">
                                    <div className="casino-game-title">{game.name}</div>
                                    <div className="casino-provider">{game.provider}</div>
                                </div>
                                <div className="casino-bet-limits">{formatLimits(game.minBet, game.maxBet)}</div>
                                <button
                                    className="casino-play-btn"
                                    onClick={() => handleLaunch(game.id)}
                                    disabled={launchingGameId === game.id || game.status !== 'active'}
                                >
                                    {launchingGameId === game.id ? 'Launching...' : 'Play Now'}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CasinoView;
