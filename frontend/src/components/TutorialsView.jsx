import React, { useMemo, useState, useEffect } from 'react';
import '../tutorials.css';
import { getTutorialsContent } from '../api';

const inferTag = (title = '') => {
    const value = title.toLowerCase();
    if (value.includes('beginner') || value.includes('fundamentals')) return 'Beginner';
    if (value.includes('parlay') || value.includes('live')) return 'Advanced';
    if (value.includes('responsible') || value.includes('bankroll')) return 'Important';
    if (value.includes('moneyline') || value.includes('spread') || value.includes('totals')) return 'Basics';
    return 'Guide';
};

const inferIcon = (title = '') => {
    const value = title.toLowerCase();
    if (value.includes('moneyline') || value.includes('bankroll')) return 'fa-solid fa-money-bill-wave';
    if (value.includes('spread') || value.includes('totals')) return 'fa-solid fa-chart-line';
    if (value.includes('live')) return 'fa-solid fa-bolt';
    if (value.includes('parlay')) return 'fa-solid fa-layer-group';
    if (value.includes('responsible')) return 'fa-solid fa-shield-heart';
    return 'fa-solid fa-book-open';
};

const TutorialsView = () => {
    const [tutorials, setTutorials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [activeTag, setActiveTag] = useState('all');
    const [selectedTutorial, setSelectedTutorial] = useState(null);

    const loadTutorials = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to view tutorials.');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError('');
            const payload = await getTutorialsContent(token);
            setTutorials(Array.isArray(payload?.tutorials) ? payload.tutorials : []);
        } catch (err) {
            setError(err.message || 'Failed to fetch tutorials');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTutorials();
    }, []);

    const tutorialCards = useMemo(() => {
        return tutorials.map((tutorial) => ({
            id: tutorial._id || tutorial.id,
            title: tutorial.title,
            desc: tutorial.content,
            content: tutorial.content,
            tag: inferTag(tutorial.title),
            icon: inferIcon(tutorial.title),
            order: tutorial.order || 0
        }));
    }, [tutorials]);

    const tags = useMemo(() => {
        const set = new Set(['all']);
        tutorialCards.forEach((card) => set.add(card.tag.toLowerCase()));
        return Array.from(set);
    }, [tutorialCards]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return tutorialCards
            .filter((card) => {
                if (activeTag !== 'all' && card.tag.toLowerCase() !== activeTag) return false;
                if (!query) return true;
                return card.title.toLowerCase().includes(query) || card.desc.toLowerCase().includes(query);
            })
            .sort((a, b) => a.order - b.order);
    }, [tutorialCards, search, activeTag]);

    return (
        <div className="tutorials-container">
            <div className="tutorials-header">
                <div>
                    <h1>Betting Tutorials & Guides</h1>
                    <p>Professional learning hub for sportsbook users: markets, strategy, risk, and execution.</p>
                </div>
                <button className="tutorial-refresh" onClick={loadTutorials} type="button">
                    <i className="fa-solid fa-rotate-right"></i> Refresh
                </button>
            </div>

            <div className="tutorials-toolbar">
                <input
                    type="text"
                    placeholder="Search tutorials"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="tutorial-search"
                />
                <div className="tutorial-tags-filter">
                    {tags.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            className={`tag-chip ${activeTag === tag ? 'active' : ''}`}
                            onClick={() => setActiveTag(tag)}
                        >
                            {tag === 'all' ? 'All' : tag}
                        </button>
                    ))}
                </div>
            </div>

            {loading && <div className="tutorial-state">Loading tutorials...</div>}
            {!loading && error && <div className="tutorial-state error">{error}</div>}
            {!loading && !error && filtered.length === 0 && <div className="tutorial-state">No tutorials found.</div>}

            {!loading && !error && filtered.length > 0 && (
                <div className="tutorials-grid">
                    {filtered.map((tutorial) => (
                        <article className="tutorial-card" key={tutorial.id}>
                            <div className="tutorial-img-placeholder">
                                <i className={tutorial.icon}></i>
                            </div>
                            <div className="tutorial-content">
                                <div className="tutorial-tags">
                                    <span className="tag">{tutorial.tag}</span>
                                </div>
                                <h3>{tutorial.title}</h3>
                                <p>{tutorial.desc}</p>
                                <button className="read-btn" type="button" onClick={() => setSelectedTutorial(tutorial)}>
                                    Read Article <i className="fa-solid fa-arrow-right"></i>
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {selectedTutorial && (
                <div className="tutorial-modal-overlay" onClick={() => setSelectedTutorial(null)}>
                    <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="tutorial-modal-head">
                            <h3>{selectedTutorial.title}</h3>
                            <button onClick={() => setSelectedTutorial(null)} type="button">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className="tutorial-modal-body">
                            {selectedTutorial.content}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TutorialsView;
