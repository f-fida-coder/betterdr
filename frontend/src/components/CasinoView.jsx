import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import '../casino.css';
import {
    getCasinoCategories,
    getCasinoGames,
    launchCasinoGame,
    getBalance,
    placeCasinoBet,
    getCasinoBetHistory
} from '../api';

const LOCAL_GAME_META = {
    baccarat: {
        id: 'local-baccarat',
        provider: 'In-House',
        url: '/games/baccarat/index.html?v=20260309e',
        poster: '/games/baccarat/assets/menuscreen.webp',
        themeColor: '#1a0a2e',
    },
    blackjack: {
        id: 'local-blackjack',
        provider: 'In-House',
        url: '/games/blackjack/index.html?v=20260309f',
        poster: '/games/blackjack/src/images/misc/table.png',
        themeColor: '#0b5563',
    },
    craps: {
        id: 'local-craps',
        provider: 'In-House',
        url: '/games/craps/index.html?v=20260310b',
        poster: '/games/craps/sprites/board_table.jpg',
        themeColor: '#0a4f3a',
    },
    arabian: {
        id: 'local-arabian',
        provider: 'In-House',
        url: '/games/arabian/index.html?v=20260311a',
        poster: '/games/arabian/sprites/200x200.jpg',
        themeColor: '#7e22ce',
    },
    'arabian-treasure': {
        id: 'local-arabian-treasure',
        provider: 'In-House',
        url: '/games/arabian/index.html?v=20260311a',
        poster: '/games/arabian/sprites/200x200.jpg',
        themeColor: '#7e22ce',
    },
    '3card-poker': {
        id: 'local-3card-poker',
        provider: 'In-House',
        url: '/games/3-card-poker/index.html?v=20260314b',
        poster: '/games/3-card-poker/sprites/200x200.jpg',
        themeColor: '#1a3a5c',
    },
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

const normalizeEmbeddedGameSlug = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('blackjack')) return 'blackjack';
    if (normalized.includes('baccarat')) return 'baccarat';
    if (normalized.includes('craps')) return 'craps';
    if (normalized.includes('arabian')) return 'arabian';
    if (normalized.includes('3card') || normalized.includes('3-card') || normalized === 'poker') return '3card-poker';
    return '';
};

const resolveWalletBalance = (payload, fallbackValue = null) => {
    const fieldPriority = [
        'availableBalance',
        'available_balance',
        'playableBalance',
        'playable_balance',
        'walletBalance',
        'wallet_balance',
        'availableCredit',
        'available_credit',
        'balance',
    ];
    for (const field of fieldPriority) {
        const amount = Number(payload?.[field]);
        if (Number.isFinite(amount)) return amount;
    }
    const fallback = Number(fallbackValue);
    return Number.isFinite(fallback) ? fallback : null;
};

const normalizePositiveNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? Number(num.toFixed(2)) : null;
};

const buildLocalGameBetLimits = (activeGame, walletPayload, availableBalance) => {
    const gameMinBet = normalizePositiveNumber(activeGame?.minBet);
    const gameMaxBet = normalizePositiveNumber(activeGame?.maxBet);
    const accountMinBet = normalizePositiveNumber(walletPayload?.minBet);
    const accountMaxBet = normalizePositiveNumber(walletPayload?.maxBet);

    let effectiveMinBet = gameMinBet ?? 0;
    if (accountMinBet !== null) {
        effectiveMinBet = Math.max(effectiveMinBet, accountMinBet);
    }

    let effectiveMaxBet = gameMaxBet ?? accountMaxBet ?? null;
    if (accountMaxBet !== null) {
        effectiveMaxBet = effectiveMaxBet === null ? accountMaxBet : Math.min(effectiveMaxBet, accountMaxBet);
    }
    if (effectiveMaxBet !== null && effectiveMaxBet < effectiveMinBet) {
        effectiveMaxBet = effectiveMinBet;
    }

    return {
        accountMinBet,
        accountMaxBet,
        gameMinBet,
        gameMaxBet,
        effectiveMinBet: Number.isFinite(effectiveMinBet) ? Number(effectiveMinBet.toFixed(2)) : 0,
        effectiveMaxBet: effectiveMaxBet === null ? null : Number(effectiveMaxBet.toFixed(2)),
        availableBalance: Number.isFinite(Number(availableBalance)) ? Number(Number(availableBalance).toFixed(2)) : null,
        lineMin: 1,
        lineMax: 20,
        coinStep: 0.05,
    };
};

const resolveLocalGameOrigin = (gameLike) => {
    const rawUrl = String(gameLike?.url || '').trim();
    if (!rawUrl) return window.location.origin;
    try {
        return new URL(rawUrl, window.location.href).origin;
    } catch (err) {
        return window.location.origin;
    }
};

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
    const [historyFilters, setHistoryFilters] = useState({ game: '', result: '', minWager: '', maxWager: '' });
    const iframeRef = useRef(null);
    const pendingGameRequests = useRef(new Set());
    const activeLocalGameRef = useRef(null);

    useEffect(() => {
        activeLocalGameRef.current = activeLocalGame;
    }, [activeLocalGame]);

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
                game: historyFilters.game,
                result: historyFilters.result,
                minWager: historyFilters.minWager,
                maxWager: historyFilters.maxWager,
            });
            setHistoryRows(Array.isArray(payload?.bets) ? payload.bets : []);
            setHistoryPagination(payload?.pagination || { page: historyPage, pages: 1, total: 0, limit: 8 });
        } catch (err) {
            console.error('Failed to load casino history:', err);
            setHistoryError(err.message || 'Failed to load casino history');
        } finally {
            setHistoryLoading(false);
        }
    }, [token, historyPage, historyFilters.game, historyFilters.result, historyFilters.minWager, historyFilters.maxWager]);

    const sendToGame = useCallback((payload) => {
        const frameWindow = iframeRef.current?.contentWindow;
        if (!frameWindow) return;
        const targetOrigin = resolveLocalGameOrigin(activeLocalGameRef.current) || '*';
        frameWindow.postMessage(payload, targetOrigin);
    }, []);

    const syncGameBalance = useCallback(async (requestId = '') => {
        const safeRequestId = String(requestId || '');
        if (!token) {
            sendToGame({ type: 'balanceUpdate', requestId: safeRequestId, balance: 0, error: 'Please login to access casino balance.' });
            return;
        }
        try {
            const data = await getBalance(token);
            const availableBalance = resolveWalletBalance(data, 0) ?? 0;
            const betLimits = buildLocalGameBetLimits(activeLocalGameRef.current, data, availableBalance);
            sendToGame({
                type: 'balanceUpdate',
                requestId: safeRequestId,
                balance: availableBalance,
                availableBalance,
                minBet: data?.minBet ?? null,
                maxBet: data?.maxBet ?? null,
                gameMinBet: betLimits.gameMinBet,
                gameMaxBet: betLimits.gameMaxBet,
                betLimits,
            });
        } catch (err) {
            console.error('Failed to get balance for game:', err);
            sendToGame({ type: 'balanceUpdate', requestId: safeRequestId, balance: 0, error: err.message });
        }
    }, [token, sendToGame]);

    /* ── postMessage bridge: iframe ↔ backend API ─────────── */
    const handleGameMessage = useCallback(async (event) => {
        const currentIframeWindow = iframeRef.current?.contentWindow;
        if (!currentIframeWindow || event.source !== currentIframeWindow) return;
        const allowedOrigin = resolveLocalGameOrigin(activeLocalGameRef.current);
        if (allowedOrigin && allowedOrigin !== '*' && event.origin !== allowedOrigin) return;
        const msg = event.data;
        if (!msg || typeof msg !== 'object' || !msg.type) return;

        if (msg.type === 'getBalance') {
            const requestId = String(msg.requestId || '');
            await syncGameBalance(requestId);
            return;
        }

        if (msg.type === 'placeBet') {
            const requestId = String(msg.requestId || createRequestId());
            if (pendingGameRequests.current.has(requestId)) {
                return;
            }
            const requestedGame = normalizeEmbeddedGameSlug(msg.game || activeLocalGameRef.current?.name || activeLocalGameRef.current?.id);
            if (!requestedGame) {
                sendToGame({ type: 'betError', requestId, error: 'Unsupported in-house game bet request.' });
                return;
            }
            if (!token) {
                sendToGame({ type: 'betError', requestId, error: 'Please login to place casino bets.' });
                return;
            }
            pendingGameRequests.current.add(requestId);
            try {
                const result = await placeCasinoBet(requestedGame, msg.bets, token, { requestId, payload: msg.payload });
                let settledPlayableBalance = null;
                try {
                    const walletData = await getBalance(token);
                    const resolved = resolveWalletBalance(walletData, NaN);
                    if (Number.isFinite(resolved)) {
                        settledPlayableBalance = resolved;
                    }
                } catch (walletErr) {
                    console.error('Failed to refresh playable balance after casino bet:', walletErr);
                }
                const gameResult = settledPlayableBalance === null
                    ? result
                    : {
                        ...result,
                        availableBalance: settledPlayableBalance,
                        walletBalance: settledPlayableBalance,
                        playableBalance: settledPlayableBalance,
                        newBalance: settledPlayableBalance,
                        balanceSource: 'availableBalance',
                    };
                sendToGame({ type: 'betResult', requestId, ...gameResult });
                // Refresh header balance
                window.dispatchEvent(new Event('user:refresh'));
                await loadCasinoHistory();
                await syncGameBalance();
            } catch (err) {
                console.error('Casino bet failed:', err);
                sendToGame({ type: 'betError', requestId, error: err.message });
                try {
                    await syncGameBalance();
                } catch (syncErr) {
                    console.error('Failed to refresh game balance after casino error:', syncErr);
                }
            } finally {
                pendingGameRequests.current.delete(requestId);
            }
            return;
        }

    }, [token, loadCasinoHistory, sendToGame, syncGameBalance]);

    useEffect(() => {
        window.addEventListener('message', handleGameMessage);
        return () => window.removeEventListener('message', handleGameMessage);
    }, [handleGameMessage]);

    useEffect(() => {
        pendingGameRequests.current.clear();
    }, [activeLocalGame?.id]);

    const handleGameIframeLoad = useCallback(() => {
        syncGameBalance();
    }, [syncGameBalance]);

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

    const formatLimits = (minBet, maxBet) => {
        const min = Number(minBet);
        const max = Number(maxBet);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return 'MIN/MAX set by table rules';
        return `MIN: $${min.toFixed(2)} | MAX: $${max.toFixed(2)}`;
    };
    const formatMoney = (value) => {
        const num = Number(value || 0);
        if (Number.isNaN(num)) return '$0.00';
        return `$${num.toFixed(2)}`;
    };
    const formatGameLabel = (value) => {
        switch (String(value || '').toLowerCase()) {
            case 'stud-poker':
                return 'Stud Poker';
            case 'roulette':
                return 'Roulette';
            case 'blackjack':
                return 'Blackjack';
            case 'baccarat':
                return 'Baccarat';
            case 'craps':
                return 'Craps';
            case 'arabian':
                return 'Arabian Game';
            case 'arabian-treasure':
                return 'Arabian Game';
            case '3card-poker':
                return '3-Card Poker';
            default:
                return value || '—';
        }
    };
    const formatOutcomeSource = (value) => {
        switch (String(value || '').toLowerCase()) {
            case 'server_rng':
                return 'Server RNG';
            case 'server_simulated_actions':
                return 'Server Simulation';
            case 'native_client_round':
                return 'Client Native';
            case '':
                return '—';
            default:
                return value;
        }
    };
    const getPlayerOutcome = (row) => {
        const explicitOutcome = String(row?.playerOutcome || '').trim();
        if (explicitOutcome) return explicitOutcome;

        const roundStatus = String(row?.roundStatus || '').toLowerCase();
        if (roundStatus && roundStatus !== 'settled') return 'Pending';

        const net = Number(row?.netResult || 0);
        if (net > 0) return 'Win';
        if (net < 0) return 'Lose';
        return 'Push';
    };
    const getOutcomeClassName = (outcome) => {
        switch (String(outcome || '').toLowerCase()) {
            case 'win':
                return 'outcome-win';
            case 'lose':
            case 'loss':
                return 'outcome-lose';
            case 'push':
            case 'draw':
            case 'refund':
                return 'outcome-push';
            default:
                return 'outcome-pending';
        }
    };
    const formatRoundResult = (row) => {
        if (!row) return '—';

        if (String(row.game || '').toLowerCase() === 'roulette' && row.rouletteOutcome) {
            const number = row.rouletteOutcome.number ?? row.result;
            const color = String(row.rouletteOutcome.color || '').trim();
            return color ? `${number} ${color}` : `${number}`;
        }

        if (String(row.game || '').toLowerCase() === 'craps') {
            const dice = row?.roundData?.dice;
            const die1 = Number(dice?.die1);
            const die2 = Number(dice?.die2);
            const sum = Number(dice?.sum);
            if (Number.isFinite(die1) && Number.isFinite(die2) && Number.isFinite(sum)) {
                return `${die1}+${die2}=${sum}`;
            }
        }

        if (String(row.game || '').toLowerCase() === 'arabian') {
            const totalWin = Number(row?.roundData?.totalWin ?? row?.totalReturn ?? 0);
            const bonusWin = Number(row?.roundData?.bonusWin ?? 0);
            const freeSpinsAwarded = Number(row?.roundData?.freeSpinsAwarded ?? 0);
            const parts = [];
            if (totalWin > 0) {
                parts.push(`Win ${formatMoney(totalWin)}`);
            }
            if (bonusWin > 0) {
                parts.push(`Bonus ${formatMoney(bonusWin)}`);
            }
            if (freeSpinsAwarded > 0) {
                parts.push(`+${freeSpinsAwarded} FS`);
            }
            if (parts.length > 0) {
                return parts.join(' | ');
            }
        }

        return row.result || '—';
    };
    const formatRoundId = (value) => {
        const raw = String(value || '');
        if (!raw) return '—';
        return raw.length > 12 ? `${raw.slice(0, 12)}…` : raw;
    };
    const formatBetDetails = (row) => {
        const game = String(row?.game || '').toLowerCase();
        if (game === 'baccarat') {
            const bets = row?.bets && typeof row.bets === 'object' ? row.bets : {};
            return `P ${formatMoney(bets.Player)} | B ${formatMoney(bets.Banker)} | T ${formatMoney(bets.Tie)}`;
        }

        if (game === 'blackjack') {
            const zones = Array.isArray(row?.bets?.zones)
                ? row.bets.zones
                : (Array.isArray(row?.bets?.betBreakdown) ? row.bets.betBreakdown : []);
            if (zones.length > 0) {
                return zones
                    .map((zone) => {
                        const zoneLabel = String(zone?.zone || '').replace('betZone', 'S');
                        const main = Number(zone?.main || 0);
                        const side = Number(zone?.pairs || 0)
                            + Number(zone?.plus21 || 0)
                            + Number(zone?.royal || 0)
                            + Number(zone?.superSeven || 0)
                            + Number(zone?.insurance || 0);
                        return `${zoneLabel || 'S?'} ${formatMoney(main + side)}`;
                    })
                    .join(' | ');
            }
            return 'Main + side bets';
        }

        if (game === 'craps') {
            const bets = row?.bets && typeof row.bets === 'object' ? row.bets : {};
            const keys = Object.keys(bets).filter((key) => Number(bets[key]) > 0).sort();
            if (keys.length === 0) return '—';
            const preview = keys.slice(0, 3).map((key) => `${key} ${formatMoney(bets[key])}`).join(' | ');
            return keys.length > 3 ? `${preview} +${keys.length - 3} more` : preview;
        }

        if (game === '3card-poker') {
            const ante = Number(row?.bets?.Ante ?? 0);
            const pairPlus = Number(row?.bets?.PairPlus ?? 0);
            const folded = Number(row?.bets?.folded ?? 0) === 1;
            const parts = [`Ante ${formatMoney(ante)}`];
            if (pairPlus > 0) parts.push(`PP ${formatMoney(pairPlus)}`);
            if (folded) parts.push('Folded');
            return parts.join(' | ');
        }

        if (game === 'arabian') {
            const lines = Number(row?.bets?.lines ?? row?.roundData?.lineCount ?? 0);
            const coinBet = Number(row?.bets?.coinBet ?? row?.roundData?.coinBet ?? 0);
            const spinBet = Number(row?.bets?.totalBet ?? row?.roundData?.totalBet ?? row?.totalWager ?? 0);
            const freeSpinsAfter = Number(row?.roundData?.freeSpinsAfter ?? 0);
            const isFreeSpinRound = !!row?.roundData?.isFreeSpinRound;
            const parts = [];
            if (Number.isFinite(lines) && lines > 0) parts.push(`Lines ${lines}`);
            if (Number.isFinite(coinBet) && coinBet > 0) parts.push(`Coin ${formatMoney(coinBet)}`);
            if (Number.isFinite(spinBet) && spinBet >= 0) parts.push(`Spin ${formatMoney(spinBet)}`);
            if (isFreeSpinRound) parts.push('Free Spin');
            if (Number.isFinite(freeSpinsAfter) && freeSpinsAfter > 0) parts.push(`FS Left ${freeSpinsAfter}`);
            return parts.length > 0 ? parts.join(' | ') : '—';
        }

        return '—';
    };
    const handleLocalGameOpen = (game) => {
        if (!token) {
            alert('Please login to play in-house games.');
            return;
        }
        if (String(game?.status || '').toLowerCase() !== 'active') {
            alert('This game is currently unavailable.');
            return;
        }
        setActiveLocalGame(game);
    };

    const handleLocalGameClose = () => {
        setActiveLocalGame(null);
    };

    const localGames = useMemo(() => {
        return games
            .filter((game) => {
                if (!game?.slug || !LOCAL_GAME_META[game.slug]) return false;
                if (activeCategory === 'lobby') return true;
                return String(game.category || '').toLowerCase() === String(activeCategory || '').toLowerCase();
            })
            .map((game) => ({
                ...LOCAL_GAME_META[game.slug],
                id: `local-${game.slug}`,
                backendId: game.id,
                name: game.name || 'In-House Game',
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
                        onClick={handleLocalGameClose}
                        title="Exit game"
                        aria-label="Exit game"
                    >
                        <i className="fa-solid fa-xmark"></i>
                        <span>Exit</span>
                    </button>
                    <iframe
                        ref={iframeRef}
                        src={activeLocalGame.url}
                        title={activeLocalGame.name}
                        className="game-iframe"
                        onLoad={handleGameIframeLoad}
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
                                className={`casino-card local-game-card ${String(game.status || '').toLowerCase() !== 'active' ? 'is-disabled' : ''}`}
                                key={game.id}
                                onClick={() => handleLocalGameOpen(game)}
                            >
                                <div
                                    className="casino-card-image"
                                    style={{ background: `linear-gradient(135deg, ${game.themeColor || '#0f172a'}, #0f5db3)` }}
                                >
                                    <img src={game.poster} alt={game.name} className="casino-game-image" />
                                    <span className={`casino-status ${String(game.status || 'active').toLowerCase()}`}>
                                        {String(game.status || 'active')}
                                    </span>
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
                                    <div className="casino-bet-limits">{formatLimits(game.minBet, game.maxBet)}</div>
                                    <button
                                        className="casino-play-btn local"
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLocalGameOpen(game);
                                        }}
                                        disabled={String(game.status || '').toLowerCase() !== 'active'}
                                    >
                                        <i className="fa-solid fa-play" style={{ marginRight: 6 }}></i>
                                        {String(game.status || '').toLowerCase() === 'active' ? 'Play Now' : 'Unavailable'}
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
                        <h3>Casino History</h3>
                        <p>Server-settled rounds across in-house casino games.</p>
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
                        Game
                        <select
                            value={historyFilters.game}
                            onChange={(e) => {
                                setHistoryPage(1);
                                setHistoryFilters((prev) => ({ ...prev, game: e.target.value }));
                            }}
                        >
                            <option value="">All</option>
                            <option value="baccarat">Baccarat</option>
                            <option value="blackjack">Blackjack</option>
                            <option value="craps">Craps</option>
                            <option value="arabian">Arabian Game</option>
                            <option value="3card-poker">3-Card Poker</option>
                        </select>
                    </label>
                    <label>
                        Outcome / Result
                        <input
                            type="text"
                            value={historyFilters.result}
                            onChange={(e) => {
                                setHistoryPage(1);
                                setHistoryFilters((prev) => ({ ...prev, result: e.target.value }));
                            }}
                            placeholder="Win / Lose / Push / Pending / Player / Banker / 17"
                        />
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
                                <th>Round</th>
                                <th>Game</th>
                                <th>Outcome</th>
                                <th>Result</th>
                                <th>Bet Details</th>
                                <th>Wager</th>
                                <th>Return</th>
                                <th>Net</th>
                                <th>Available Before</th>
                                <th>Available After</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!historyLoading && historyRows.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="casino-history-empty">
                                        No casino rounds found for these filters.
                                    </td>
                                </tr>
                            )}
                            {historyRows.map((row) => (
                                <tr key={row.roundId || row.id}>
                                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                                    <td title={row.roundId || row.id || ''}>{formatRoundId(row.roundId || row.id)}</td>
                                    <td>{formatGameLabel(row.game)}</td>
                                    <td>
                                        <span className={`casino-history-badge ${getOutcomeClassName(getPlayerOutcome(row))}`}>
                                            {getPlayerOutcome(row)}
                                        </span>
                                    </td>
                                    <td>{formatRoundResult(row)}</td>
                                    <td>{formatBetDetails(row)}</td>
                                    <td>{formatMoney(row.totalWager)}</td>
                                    <td>{formatMoney(row.totalReturn)}</td>
                                    <td
                                        className={
                                            Number(row.netResult) > 0
                                                ? 'net-pos'
                                                : Number(row.netResult) < 0
                                                    ? 'net-neg'
                                                    : 'net-zero'
                                        }
                                    >
                                        {formatMoney(row.netResult)}
                                    </td>
                                    <td>{formatMoney(row.availableBalanceBefore ?? row.balanceBefore)}</td>
                                    <td>{formatMoney(row.availableBalanceAfter ?? row.balanceAfter)}</td>
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
