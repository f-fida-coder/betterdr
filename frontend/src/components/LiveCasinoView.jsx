import React from 'react';
import '../livecasino.css';

const LiveCasinoView = () => {
        const featuredTables = [
        { id: 1, name: 'Blackjack VIP A', dealer: 'Sarah', min: '$50', max: '$5,000', seats: [1, 1, 1, 0, 0, 1, 1], img: 'https://images.unsplash.com/photo-1605870445919-838d190e8e1b?auto=format&fit=crop&w=400&q=80' },
        { id: 2, name: 'Roulette Gold', dealer: 'James', min: '$1', max: '$2,000', seats: [], img: 'https://images.unsplash.com/photo-1600219664656-78b171c770c0?auto=format&fit=crop&w=400&q=80' },         { id: 3, name: 'Baccarat Squeeze', dealer: 'Elena', min: '$25', max: '$10,000', seats: [1, 1, 1, 1, 1, 1, 0], img: 'https://images.unsplash.com/photo-1518893063132-36e46dbe2428?auto=format&fit=crop&w=400&q=80' },
    ];

    const blackjackTables = [
        { id: 4, name: 'Blackjack B', dealer: 'Mike', min: '$10', max: '$1,000', seats: [1, 0, 0, 1, 0, 1, 0], img: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=400&q=80' },
        { id: 5, name: 'Blackjack C', dealer: 'Anna', min: '$5', max: '$500', seats: [0, 0, 0, 0, 0, 0, 0], img: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=400&q=80' },
        { id: 6, name: 'Infinite Blackjack', dealer: 'Robot', min: '$1', max: '$500', seats: [], img: 'https://images.unsplash.com/photo-1616496660144-ad200676b325?auto=format&fit=crop&w=400&q=80' },
    ];

    return (
        <div className="live-casino-wrapper">
            <div className="live-hero">
                <div className="live-hero-content">
                    <span className="live-hero-badge">Featured Table</span>
                    <h1>Exclusive VIP Blackjack</h1>
                    <p>Experience the thrill of high-stakes gaming with our professional dealers in a luxurious setting. Minimum bet $100.</p>
                    <button className="play-action-btn">
                        <i className="fa-solid fa-play" style={{ marginRight: '10px' }}></i>
                        Join Table
                    </button>
                </div>
            </div>

            <div className="live-lobby-container">
                <div className="live-category-bar">
                    <div className="live-cat-btn active">All Games</div>
                    <div className="live-cat-btn">Blackjack</div>
                    <div className="live-cat-btn">Roulette</div>
                    <div className="live-cat-btn">Baccarat</div>
                    <div className="live-cat-btn">Poker</div>
                    <div className="live-cat-btn">Game Shows</div>
                </div>

                <div className="live-section-title">
                    <i className="fa-solid fa-fire"></i> Recommended <span>Live Tables</span>
                </div>
                <div className="tables-grid">
                    {featuredTables.map(table => (
                        <div key={table.id} className="live-table-card">
                            <div className="table-preview" style={{ backgroundImage: `url(${table.img})` }}>
                                <div className="live-badge">Live</div>
                                <div className="dealer-name">
                                    <i className="fa-solid fa-user-tie" style={{ marginRight: '5px' }}></i>
                                    {table.dealer}
                                </div>
                            </div>
                            <div className="table-info">
                                <div className="table-name">{table.name}</div>
                                <div className="table-limits">
                                    <span>Min: {table.min}</span>
                                    <span>Max: {table.max}</span>
                                </div>
                                {table.seats.length > 0 && (
                                    <div className="seat-status">
                                        {table.seats.map((status, i) => (
                                            <div key={i} className={`seat-dot ${status ? 'occupied' : 'open'}`}></div>
                                        ))}
                                    </div>
                                )}
                                <button className="join-table-btn">Play Now</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="live-section-title">
                    <i className="fa-solid fa-diamond"></i> Live <span>Blackjack</span>
                </div>
                <div className="tables-grid">
                    {blackjackTables.map(table => (
                        <div key={table.id} className="live-table-card">
                            <div className="table-preview" style={{ backgroundImage: `url(${table.img})` }}>
                                <div className="live-badge">Live</div>
                                <div className="dealer-name">{table.dealer}</div>
                            </div>
                            <div className="table-info">
                                <div className="table-name">{table.name}</div>
                                <div className="table-limits">
                                    <span>Min: {table.min}</span>
                                    <span>Max: {table.max}</span>
                                </div>
                                {table.seats.length > 0 && (
                                    <div className="seat-status">
                                        {table.seats.map((status, i) => (
                                            <div key={i} className={`seat-dot ${status ? 'occupied' : 'open'}`}></div>
                                        ))}
                                    </div>
                                )}
                                <button className="join-table-btn">Play Now</button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default LiveCasinoView;
