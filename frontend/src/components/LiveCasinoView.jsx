import React, { useEffect, useMemo, useState } from 'react';
import '../livecasino.css';
import { getCasinoCategories, getCasinoGames, launchCasinoGame } from '../api';

const CATEGORY_TABS = [
    { id: 'lobby', label: 'All Games' },
    { id: 'table_games', label: 'Table Games' },
    { id: 'slots', label: 'Slots' },
    { id: 'video_poker', label: 'Video Poker' },
    { id: 'specialty_games', label: 'Specialty' }
];

const themeFor = (gameName = '') => {
    const value = gameName.toLowerCase();
    if (value.includes('blackjack')) return 'blackjack';
    if (value.includes('roulette')) return 'roulette';
    if (value.includes('baccarat')) return 'baccarat';
    if (value.includes('poker')) return 'poker';
    if (value.includes('keno')) return 'special';
    return 'default';
};

const badgeFor = (gameName = '') => {
    const value = gameName.toLowerCase();
    if (value.includes('blackjack')) return 'Blackjack';
    if (value.includes('roulette')) return 'Roulette';
    if (value.includes('baccarat')) return 'Baccarat';
    if (value.includes('poker')) return 'Poker';
    if (value.includes('slot')) return 'Slots';
    return 'Live';
};

const pseudoDealer = (name) => {
    const dealers = ['Sarah', 'James', 'Elena', 'Mike', 'Anna', 'Lucas', 'Sophia', 'Daniel', 'Eva', 'Noah'];
    const index = String(name || '').length % dealers.length;
    return dealers[index];
};

const LiveCasinoView = () => {
    const token = localStorage.getItem('token');
    const [categories, setCategories] = useState([]);
    const [games, setGames] = useState([]);
    const [activeCategory, setActiveCategory] = useState('lobby');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [launchingId, setLaunchingId] = useState(null);

    const loadCategories = async () => {
        if (!token) return;
        try {
            const payload = await getCasinoCategories(token);
            setCategories(Array.isArray(payload?.categories) ? payload.categories : []);
        } catch (err) {
            console.error('Failed to fetch casino categories for live page:', err);
        }
    };

    const loadGames = async () => {
        if (!token) {
            setLoading(false);
            setError('Please login to access live casino.');
            return;
        }
        try {
            setLoading(true);
            setError('');
            const payload = await getCasinoGames({
                token,
                category: activeCategory,
                search,
                page: 1,
                limit: 120
            });
            setGames(Array.isArray(payload?.games) ? payload.games : []);
        } catch (err) {
            setError(err.message || 'Failed to load live casino games');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        loadGames();
    }, [activeCategory, search]);

    const tabsWithCounts = useMemo(() => {
        const counts = categories.reduce((acc, item) => {
            acc[item.id] = Number(item.count || 0);
            return acc;
        }, {});
        return CATEGORY_TABS.map((tab) => ({
            ...tab,
            count: tab.id === 'lobby'
                ? CATEGORY_TABS.filter((inner) => inner.id !== 'lobby').reduce((sum, inner) => sum + (counts[inner.id] || 0), 0)
                : (counts[tab.id] || 0)
        }));
    }, [categories]);

    const featuredGame = useMemo(
        () => games.find((game) => game.isFeatured) || games[0] || null,
        [games]
    );

    const launchGame = async (gameId) => {
        if (!token) return;
        try {
            setLaunchingId(gameId);
            const payload = await launchCasinoGame(gameId, token);
            if (payload?.launchUrl) {
                window.open(payload.launchUrl, '_blank', 'noopener,noreferrer');
            } else {
                alert('Launch URL is not available for this game');
            }
        } catch (err) {
            alert(err.message || 'Unable to launch game');
        } finally {
            setLaunchingId(null);
        }
    };

    return (
        <div className="live-casino-wrapper">
            <section className={`live-hero ${themeFor(featuredGame?.name)}`}>
                <div className="live-hero-content">
                    <span className="live-hero-badge">Featured Table</span>
                    <h1>{featuredGame?.name || 'Live Casino Lobby'}</h1>
                    <p>
                        Professional live-casino experience with real-time seats, game filtering, and direct launch from your wallet-enabled account.
                    </p>
                    {featuredGame && (
                        <button className="play-action-btn" onClick={() => launchGame(featuredGame.id)} type="button" disabled={launchingId === featuredGame.id}>
                            <i className="fa-solid fa-play"></i> {launchingId === featuredGame.id ? 'Launching...' : 'Join Table'}
                        </button>
                    )}
                </div>
            </section>

            <div className="live-lobby-container">
                <div className="live-topbar">
                    <div className="live-category-bar">
                        {tabsWithCounts.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={`live-cat-btn ${activeCategory === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(tab.id)}
                            >
                                <span>{tab.label}</span>
                                <small>{tab.count}</small>
                            </button>
                        ))}
                    </div>
                    <input
                        className="live-search"
                        type="text"
                        placeholder="Search live casino games"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading && <div className="live-state">Loading live casino games...</div>}
                {!loading && error && <div className="live-state error">{error}</div>}
                {!loading && !error && games.length === 0 && <div className="live-state">No games available for this filter.</div>}

                {!loading && !error && games.length > 0 && (
                    <>
                        <div className="live-section-title">
                            <i className="fa-solid fa-fire"></i> Recommended <span>Live Tables</span>
                        </div>
                        <div className="tables-grid">
                            {games.slice(0, 24).map((game) => (
                                <article key={game.id} className={`live-table-card theme-${themeFor(game.name)}`}>
                                    <div className="table-preview">
                                        <div className="live-badge">{badgeFor(game.name)}</div>
                                        <div className="dealer-name"><i className="fa-solid fa-user-tie"></i> {pseudoDealer(game.name)}</div>
                                    </div>
                                    <div className="table-info">
                                        <div className="table-name">{game.name}</div>
                                        <div className="table-limits">
                                            <span>Min: ${Number(game.minBet || 0).toFixed(2)}</span>
                                            <span>Max: ${Number(game.maxBet || 0).toFixed(2)}</span>
                                        </div>
                                        <button
                                            className="join-table-btn"
                                            type="button"
                                            disabled={launchingId === game.id}
                                            onClick={() => launchGame(game.id)}
                                        >
                                            {launchingId === game.id ? 'Launching...' : 'Play Now'}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LiveCasinoView;
