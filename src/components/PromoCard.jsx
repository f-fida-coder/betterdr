import React from 'react';

const PromoCard = () => {
    return (
        <div className="promo-card-container">
            <div className="promo-team-header">
                <span className="team-text">HOU @ PIT</span>
            </div>

            <div className="promo-main-body">
                <div className="promo-title-row">
                    <div className="promo-title-group">
                        <span className="promo-title">Carry The Night</span>
                        <span className="promo-fire-icon">🔥 2</span>
                    </div>
                    <div className="promo-badges">
                        <span className="badge badge-wa">WA</span>
                        <span className="badge badge-sgp">SGP</span>
                    </div>
                </div>

                <div className="promo-time">Tomorrow 6:15 AM</div>

                <div className="promo-props-list">
                    <div className="promo-prop-item">
                        <div className="player-photo">
                            <img src="https://via.placeholder.com/40" alt="Jaylen Warren" />
                        </div>
                        <div className="prop-details">
                            <div className="player-name">Jaylen Warren <span className="team-tag">(HOU @ PIT)</span></div>
                            <div className="prop-value">52½ Over - Total Rushing Yards</div>
                        </div>
                    </div>

                    <div className="promo-prop-item">
                        <div className="player-photo">
                            <img src="https://via.placeholder.com/40" alt="Woody Marks" />
                        </div>
                        <div className="prop-details">
                            <div className="player-name">Woody Marks <span className="team-tag">(HOU @ PIT)</span></div>
                            <div className="prop-value">55½ Over - Total Rushing Yards</div>
                        </div>
                    </div>

                    <div className="promo-prop-item">
                        <div className="player-photo">
                            <img src="https://via.placeholder.com/40" alt="Kenneth Gainwell" />
                        </div>
                        <div className="prop-details">
                            <div className="player-name">Kenneth Gainwell <span className="team-tag">(HOU @ PIT)</span></div>
                            <div className="prop-value">28½ Over - Total Rushing Yards</div>
                        </div>
                    </div>
                </div>

                <div className="more-selections">+ 1 more selection</div>

                <div className="promo-footer">
                    <div className="odds-group">
                        <span className="old-odds">+1176</span>
                        <span className="odds-arrow">»</span>
                        <span className="new-odds">+1234</span>
                    </div>
                    <button className="promo-bet-btn">Bet Now</button>
                </div>
            </div>

            <div className="promo-pagination">
                <span className="dot active"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
            </div>
        </div>
    );
};

export default PromoCard;
