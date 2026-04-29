import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import '../casino.css';
import {
    getCasinoCategories,
    getCasinoGames,
    getCasinoGameState,
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
    'jurassic-run': {
        id: 'local-jurassic-run',
        provider: 'In-House',
        url: '/games/jurassic-run/index.html?v=20260324a',
        poster: '/games/jurassic-run/assets/images/background_middle.webp',
        themeColor: '#166534',
        minBet: 1,
        maxBet: 5000,
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
        url: '/games/3-card-poker/index.html?v=20260314c',
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
    if (normalized.includes('jurassic') || normalized.includes('jurrasic')) return 'jurassic-run';
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
    return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
};

const buildLocalGameBetLimits = (activeGame, walletPayload, availableBalance) => {
    const gameMinBet = normalizePositiveNumber(activeGame?.minBet);
    const gameMaxBet = normalizePositiveNumber(activeGame?.maxBet);
    // Account-level min/max bet is for sportsbook — casino games have their own limits
    // enforced by the backend, so we only use game-level limits here.
    const effectiveMinBet = gameMinBet ?? 0;
    const effectiveMaxBet = gameMaxBet ?? null;

    return {
        accountMinBet: null,
        accountMaxBet: null,
        gameMinBet,
        gameMaxBet,
        effectiveMinBet: Number.isFinite(effectiveMinBet) ? Math.round(effectiveMinBet) : 0,
        effectiveMaxBet: effectiveMaxBet === null ? null : Math.round(effectiveMaxBet),
        availableBalance: Number.isFinite(Number(availableBalance)) ? Math.round(Number(availableBalance)) : null,
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

const buildRoundResultSummary = (r) => {
    if (!r) return null;
    const fmt = (v) => `$${Math.ceil(Math.abs(Number(v) || 0)).toLocaleString()}`;
    if (r.jackpotWon) {
        return { label: 'JACKPOT!', detail: `+${fmt(r.jackpotPayout)}`, type: 'jackpot' };
    }
    if (r.isFreeSpinRound) {
        if (r.ret > 0) return { label: 'Free Spin Win', detail: `+${fmt(r.ret)}`, type: 'win' };
        if (r.freeSpinsAwarded > 0) return { label: 'Free Spins Won', detail: `+${r.freeSpinsAwarded} spins`, type: 'freespin' };
        return { label: 'Free Spin', detail: 'No win this spin', type: 'neutral' };
    }
    if (r.freeSpinsAwarded > 0 && r.net > 0) {
        return { label: 'Win + Free Spins', detail: `Bet ${fmt(r.wager)} → +${fmt(r.net)} · +${r.freeSpinsAwarded} FS`, type: 'win' };
    }
    if (r.freeSpinsAwarded > 0) {
        return { label: 'Free Spins Won', detail: `Bet ${fmt(r.wager)} → +${r.freeSpinsAwarded} spins`, type: 'freespin' };
    }
    if (r.net > 0) {
        return { label: 'Win', detail: `Bet ${fmt(r.wager)} → Win ${fmt(r.ret)}`, type: 'win' };
    }
    if (r.net < 0) {
        return { label: 'No Win', detail: `Bet ${fmt(r.wager)}`, type: 'lose' };
    }
    if (r.wager > 0) {
        return { label: 'Push', detail: `Bet ${fmt(r.wager)} → Returned ${fmt(r.ret)}`, type: 'push' };
    }
    return null;
};

const JURASSIC_BETS = [1, 5, 10, 50, 100, 200, 400, 500, 1000, 2000, 5000];

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
    const [lastRoundResult, setLastRoundResult] = useState(null);
    const [gameDisplayBalance, setGameDisplayBalance] = useState(null);
    const [activeBetId, setActiveBetId] = useState(null);
    const [gameIsReady, setGameIsReady] = useState(false);
    const [gameLoadError, setGameLoadError] = useState(false);
    const [spinInProgress, setSpinInProgress] = useState(false);
    const [gameBetLimits, setGameBetLimits] = useState(null);
    const iframeRef = useRef(null);
    const pendingGameRequests = useRef(new Set());
    const activeLocalGameRef = useRef(null);
    const roundResultTimerRef = useRef(null);
    const gameReadyTimerRef = useRef(null);
    const pendingRoundResultRef = useRef(null);
    const spinCompleteTimerRef = useRef(null);

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
        const targetOrigin = resolveLocalGameOrigin(activeLocalGameRef.current) || window.location.origin;
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
            let gameState = null;
            const activeSlug = normalizeEmbeddedGameSlug(
                activeLocalGameRef.current?.slug
                || activeLocalGameRef.current?.name
                || activeLocalGameRef.current?.id
            );
            if (activeSlug === 'jurassic-run') {
                try {
                    const statePayload = await getCasinoGameState(activeSlug, token);
                    gameState = statePayload?.state || null;
                } catch (stateErr) {
                    console.error('Failed to fetch Jurassic Run state:', stateErr);
                }
            }
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
                gameState,
            });
            setGameDisplayBalance(availableBalance);
            setGameBetLimits(betLimits);
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
        if (allowedOrigin && event.origin !== allowedOrigin) return;
        const msg = event.data;
        if (!msg || typeof msg !== 'object' || !msg.type) return;

        if (msg.type === 'gameReady') {
            setGameIsReady(true);
            setGameLoadError(false);
            if (gameReadyTimerRef.current) clearTimeout(gameReadyTimerRef.current);
            return;
        }

        if (msg.type === 'betConfirmed') {
            const confirmedId = Number(msg.betId);
            if (Number.isFinite(confirmedId)) setActiveBetId(confirmedId);
            return;
        }

        if (msg.type === 'spinComplete') {
            if (spinCompleteTimerRef.current) clearTimeout(spinCompleteTimerRef.current);
            if (pendingRoundResultRef.current) {
                setLastRoundResult(pendingRoundResultRef.current);
                pendingRoundResultRef.current = null;
            }
            return;
        }

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
            setLastRoundResult(null);
            pendingRoundResultRef.current = null;
            if (spinCompleteTimerRef.current) clearTimeout(spinCompleteTimerRef.current);
            setSpinInProgress(true);
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
                const roundResult = {
                    game: requestedGame,
                    wager: Number(result?.totalWager ?? 0),
                    ret: Number(result?.totalReturn ?? 0),
                    net: Number(result?.netResult ?? 0),
                    isFreeSpinRound: !!(result?.bets?.isFreeSpinRound || result?.roundData?.isFreeSpinRound),
                    freeSpinsAwarded: Number(result?.roundData?.freeSpinsAwarded ?? result?.roundData?.freeSpinsWon ?? 0),
                    jackpotWon: !!(result?.roundData?.jackpotWon),
                    jackpotPayout: Number(result?.roundData?.jackpotPayout ?? 0),
                    balanceAfter: settledPlayableBalance ?? Number(result?.availableBalanceAfter ?? result?.availableBalance ?? 0),
                    playerOutcome: String(result?.playerOutcome || result?.result || ''),
                };
                // For Jurassic Run, defer result banner until spinComplete message arrives.
                // The 15s timeout is a safety net — normally spinComplete fires within 4-5s.
                if (requestedGame === 'jurassic-run') {
                    pendingRoundResultRef.current = roundResult;
                    spinCompleteTimerRef.current = setTimeout(() => {
                        if (pendingRoundResultRef.current) {
                            setLastRoundResult(pendingRoundResultRef.current);
                            pendingRoundResultRef.current = null;
                        }
                    }, 15000);
                } else {
                    setLastRoundResult(roundResult);
                }
                if (Number.isFinite(settledPlayableBalance)) {
                    setGameDisplayBalance(settledPlayableBalance);
                }
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
                setSpinInProgress(false);
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

    // Poll jackpot pool every 15s while Jurassic Run is active
    useEffect(() => {
        const slug = normalizeEmbeddedGameSlug(activeLocalGame?.slug || activeLocalGame?.name || activeLocalGame?.id);
        if (slug !== 'jurassic-run' || !token || !gameIsReady) return;

        const syncJackpotPool = () => {
            if (document.hidden) return;

            getCasinoGameState(slug, token)
                .then((statePayload) => {
                    const jackpotPool = statePayload?.state?.jackpotPool;
                    if (jackpotPool != null) {
                        sendToGame({ type: 'balanceUpdate', requestId: '', gameState: { jackpotPool } });
                    }
                })
                .catch(() => {});
        };

        syncJackpotPool();

        const intervalId = setInterval(syncJackpotPool, 15000);

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                syncJackpotPool();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [activeLocalGame?.id, token, gameIsReady, sendToGame]);

    useEffect(() => {
        if (!lastRoundResult) return;
        if (roundResultTimerRef.current) clearTimeout(roundResultTimerRef.current);
        roundResultTimerRef.current = setTimeout(() => setLastRoundResult(null), 5000);
        return () => { if (roundResultTimerRef.current) clearTimeout(roundResultTimerRef.current); };
    }, [lastRoundResult]);

    const roundResultSummary = useMemo(() => buildRoundResultSummary(lastRoundResult), [lastRoundResult]);

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
        return `MIN: $${Math.ceil(min)} | MAX: $${Math.ceil(max)}`;
    };
    const formatMoney = (value) => {
        const num = Number(value || 0);
        if (Number.isNaN(num)) return '$0';
        return `$${Math.ceil(num)}`;
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
            case 'jurassic-run':
                return 'Jurassic Run';
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
            case 'client_actions_server_rules':
                return 'Server Rules';
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

        if (String(row.game || '').toLowerCase() === 'jurassic-run') {
            const totalWin = Number(row?.roundData?.totalWin ?? row?.totalReturn ?? 0);
            const jackpotPayout = Number(row?.roundData?.jackpotPayout ?? 0);
            const freeSpinsAwarded = Number(row?.roundData?.freeSpinsAwarded ?? 0);
            const isFreeSpinRound = !!row?.roundData?.isFreeSpinRound;
            const parts = [];
            if (jackpotPayout > 0) {
                parts.push(`Jackpot ${formatMoney(jackpotPayout)}`);
            } else if (totalWin > 0) {
                parts.push(`Win ${formatMoney(totalWin)}`);
            }
            if (freeSpinsAwarded > 0) {
                parts.push(`+${freeSpinsAwarded} FS`);
            }
            if (parts.length > 0) {
                return parts.join(' | ');
            }
            if (isFreeSpinRound) {
                return 'Free Spin';
            }
        }

        if (String(row.game || '').toLowerCase() === '3card-poker') {
            const mainLabel = String(row?.roundData?.mainResultLabel || row?.result || '').trim();
            const playerHand = String(row?.playerHand || row?.roundData?.playerHand || '').trim();
            const dealerHand = String(row?.dealerHand || row?.roundData?.dealerHand || '').trim();
            const parts = [];
            if (mainLabel) parts.push(mainLabel);
            if (playerHand) parts.push(`P ${playerHand}`);
            if (dealerHand) parts.push(`D ${dealerHand}`);
            return parts.length > 0 ? parts.join(' | ') : '—';
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
            const play = Number(row?.bets?.Play ?? (Number(row?.bets?.folded ?? 0) === 1 ? 0 : ante));
            const pairPlus = Number(row?.bets?.PairPlus ?? 0);
            const folded = Number(row?.bets?.folded ?? 0) === 1;
            const parts = [`Ante ${formatMoney(ante)}`];
            if (play > 0) parts.push(`Play ${formatMoney(play)}`);
            if (pairPlus > 0) parts.push(`PP ${formatMoney(pairPlus)}`);
            parts.push(folded ? 'Fold' : 'Play');
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

        if (game === 'jurassic-run') {
            const bet = Number(row?.bets?.bet ?? row?.roundData?.bet ?? row?.totalWager ?? 0);
            const lineBet = Number(row?.bets?.lineBet ?? row?.roundData?.lineBet ?? 0);
            const betId = Number(row?.bets?.betId ?? row?.roundData?.betId ?? 0);
            const paylines = Number(row?.bets?.paylines ?? row?.roundData?.activePaylines ?? 0);
            const isFreeSpinRound = !!row?.roundData?.isFreeSpinRound;
            const freeSpinsAfter = Number(row?.roundData?.freeSpinsAfter ?? 0);
            const parts = [];
            if (Number.isFinite(bet) && bet > 0) parts.push(`Bet ${formatMoney(bet)}`);
            if (Number.isFinite(lineBet) && lineBet > 0) parts.push(`Line ${formatMoney(lineBet)}`);
            if (Number.isFinite(paylines) && paylines > 0) parts.push(`Lines ${paylines}`);
            if (Number.isFinite(betId) && betId >= 0) parts.push(`Level ${betId + 1}`);
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
        if (normalizeEmbeddedGameSlug(game?.slug || game?.name || game?.id) === 'jurassic-run') {
            setGameIsReady(false);
            setGameLoadError(false);
            if (gameReadyTimerRef.current) clearTimeout(gameReadyTimerRef.current);
            gameReadyTimerRef.current = setTimeout(() => {
                setGameLoadError(true);
            }, 15000);
        }
    };

    const handleLocalGameClose = () => {
        setActiveLocalGame(null);
        setLastRoundResult(null);
        setGameDisplayBalance(null);
        setActiveBetId(null);
        setGameIsReady(false);
        setGameLoadError(false);
        setSpinInProgress(false);
        setGameBetLimits(null);
        pendingRoundResultRef.current = null;
        if (roundResultTimerRef.current) clearTimeout(roundResultTimerRef.current);
        if (gameReadyTimerRef.current) clearTimeout(gameReadyTimerRef.current);
        if (spinCompleteTimerRef.current) clearTimeout(spinCompleteTimerRef.current);
    };

    const handleSelectBet = useCallback((betId) => {
        setActiveBetId(betId);
        sendToGame({ type: 'parentSetBet', betId });
    }, [sendToGame]);

    const handleSpin = useCallback(() => {
        if (activeBetId === null) return;
        sendToGame({ type: 'parentTriggerSpin' });
    }, [activeBetId, sendToGame]);

    const localGames = useMemo(() => {
        const seenSlugs = new Set();
        return games
            .filter((game) => {
                if (!game?.slug || !LOCAL_GAME_META[game.slug]) return false;
                if (seenSlugs.has(game.slug)) return false;
                seenSlugs.add(game.slug);
                if (activeCategory === 'lobby') return true;
                return String(game.category || '').toLowerCase() === String(activeCategory || '').toLowerCase();
            })
            .map((game) => ({
                ...LOCAL_GAME_META[game.slug],
                id: `local-${game.slug}`,
                backendId: game.id,
                slug: game.slug,
                name: game.name || 'In-House Game',
                provider: game.provider || LOCAL_GAME_META[game.slug].provider,
                themeColor: game.themeColor || LOCAL_GAME_META[game.slug].themeColor,
                status: game.status || 'active',
                minBet: game.minBet,
                maxBet: game.maxBet,
                rtp: game.rtp,
                volatility: game.volatility,
                metadata: game.metadata,
                isFeatured: !!game.isFeatured,
            }));
    }, [activeCategory, games]);

    const jurassicPosterGame = useMemo(
        () => localGames.find((game) => game.slug === 'jurassic-run') || null,
        [localGames]
    );

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

                    {gameDisplayBalance !== null && (
                        <div className="game-overlay-balance">
                            <span className="game-overlay-balance-label">Balance</span>
                            <span className="game-overlay-balance-value">
                                ${Math.round(gameDisplayBalance).toLocaleString()}
                            </span>
                        </div>
                    )}

                    {roundResultSummary && (
                        <div className={`game-round-result game-round-result--${roundResultSummary.type}`}>
                            <div className="game-round-result-inner">
                                <span className="game-round-result-label">{roundResultSummary.label}</span>
                                <span className="game-round-result-detail">{roundResultSummary.detail}</span>
                            </div>
                            <button
                                className="game-round-result-close"
                                onClick={() => setLastRoundResult(null)}
                                aria-label="Dismiss result"
                            >×</button>
                        </div>
                    )}

                    {activeLocalGame?.slug === 'jurassic-run' && !gameIsReady && (
                        <div className={`game-fullscreen-loading${gameLoadError ? ' game-fullscreen-loading--error' : ''}`}>
                            <img
                                src="/games/jurassic-run/assets/images/logo.svg"
                                alt="Jurassic Run"
                                className="game-fullscreen-loading-logo"
                            />
                            {!gameLoadError && (
                                <>
                                    <div className="game-loading-spinner game-loading-spinner--lg" />
                                    <p className="game-fullscreen-loading-text">Loading game…</p>
                                </>
                            )}
                            {gameLoadError && (
                                <>
                                    <p className="game-fullscreen-loading-text">Game failed to load.</p>
                                    <button
                                        className="game-load-retry-btn"
                                        onClick={() => {
                                            setGameLoadError(false);
                                            setGameIsReady(false);
                                            if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
                                            if (gameReadyTimerRef.current) clearTimeout(gameReadyTimerRef.current);
                                            gameReadyTimerRef.current = setTimeout(() => setGameLoadError(true), 15000);
                                        }}
                                    >Retry</button>
                                </>
                            )}
                        </div>
                    )}

                    {activeLocalGame?.slug === 'jurassic-run' && gameIsReady && (
                        <div className="game-bet-controls">
                            <div className="game-bet-chips">
                                {JURASSIC_BETS.map((bet, idx) => {
                                    const belowMin = gameBetLimits?.effectiveMinBet != null && bet < gameBetLimits.effectiveMinBet;
                                    const aboveMax = gameBetLimits?.effectiveMaxBet != null && bet > gameBetLimits.effectiveMaxBet;
                                    const aboveBalance = gameDisplayBalance != null && bet > gameDisplayBalance;
                                    const isChipDisabled = belowMin || aboveMax || aboveBalance;
                                    const chipTitle = aboveBalance
                                        ? `Insufficient balance ($${gameDisplayBalance})`
                                        : belowMin
                                            ? `Min bet: $${gameBetLimits?.effectiveMinBet ?? '?'}`
                                            : undefined;
                                    return (
                                        <button
                                            key={idx}
                                            className={`game-bet-chip${activeBetId === idx ? ' active' : ''}${isChipDisabled ? ' unavailable' : ''}`}
                                            onClick={() => !isChipDisabled && handleSelectBet(idx)}
                                            disabled={isChipDisabled}
                                            title={chipTitle}
                                        >
                                            ${bet >= 1000 ? `${bet / 1000}K` : bet}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                className={`game-spin-btn${activeBetId === null || spinInProgress ? ' disabled' : ''}`}
                                onClick={handleSpin}
                                disabled={activeBetId === null || spinInProgress}
                            >
                                {spinInProgress
                                    ? <><div className="game-loading-spinner" style={{width:'14px',height:'14px',borderWidth:'2px'}} /><span>SPINNING…</span></>
                                    : <><i className="fa-solid fa-play"></i><span>SPIN</span></>
                                }
                            </button>
                        </div>
                    )}

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
                    {jurassicPosterGame && (
                        <button
                            type="button"
                            className={`casino-feature-poster ${String(jurassicPosterGame.status || '').toLowerCase() !== 'active' ? 'is-disabled' : ''}`}
                            onClick={() => handleLocalGameOpen(jurassicPosterGame)}
                            disabled={String(jurassicPosterGame.status || '').toLowerCase() !== 'active'}
                            style={{ backgroundImage: `url(${jurassicPosterGame.poster})` }}
                        >
                            <span className="casino-feature-poster-overlay" />
                            <span className="casino-feature-poster-content">
                                <span className="casino-feature-kicker">Featured Slot</span>
                                <span className="casino-feature-title">{jurassicPosterGame.name}</span>
                                <span className="casino-feature-copy">
                                    Server-settled reels, progressive jackpot, and fixed 10 paylines.
                                </span>
                                <span className="casino-feature-meta">
                                    RTP {Number(jurassicPosterGame.rtp || 95).toFixed(1)}% · {String(jurassicPosterGame.volatility || 'medium').replace(/(^|[-_ ])\w/g, (m) => m.toUpperCase())} Volatility
                                </span>
                                <span className="casino-feature-cta">
                                    {String(jurassicPosterGame.status || '').toLowerCase() === 'active' ? 'Play Jurassic Run' : 'Currently Unavailable'}
                                </span>
                            </span>
                        </button>
                    )}

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
                            <option value="jurassic-run">Jurassic Run</option>
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
                            step="1"
                            inputMode="numeric"
                            value={historyFilters.minWager}
                            onChange={(e) => {
                                setHistoryPage(1);
                                setHistoryFilters((prev) => ({ ...prev, minWager: String(e.target.value).replace(/\D/g, '') }));
                            }}
                            placeholder="0"
                        />
                    </label>
                    <label>
                        Max Wager
                        <input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={historyFilters.maxWager}
                            onChange={(e) => {
                                setHistoryPage(1);
                                setHistoryFilters((prev) => ({ ...prev, maxWager: String(e.target.value).replace(/\D/g, '') }));
                            }}
                            placeholder="100"
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
