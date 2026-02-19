import React, { useEffect, useMemo, useState } from 'react';
import '../casino.css';
import { getCasinoCategories, getCasinoGames, launchCasinoGame } from '../api';

const CATEGORY_META = {
    lobby: { label: 'Lobby', icon: 'fa-solid fa-table-cells-large' },
    table_games: { label: 'Table Games', icon: 'fa-solid fa-playing-cards' },
    slots: { label: 'Slots', icon: 'fa-solid fa-dice' },
    video_poker: { label: 'Video Poker', icon: 'fa-solid fa-heart' },
    specialty_games: { label: 'Specialty Games', icon: 'fa-solid fa-star' }
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

    return (
        <div className="casino-wrapper">
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

            {!loading && !error && games.length === 0 && (
                <div className="casino-feedback-state">
                    <i className="fa-regular fa-folder-open"></i>
                    <span>No games found for this filter.</span>
                </div>
            )}

            {!loading && !error && games.length > 0 && (
                <div className="casino-grid">
                    {games.map((game) => (
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
