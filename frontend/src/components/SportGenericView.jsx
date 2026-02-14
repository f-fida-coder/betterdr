import React from 'react';
import { getMockDataForSport } from '../data/mockMatches';

const SportGenericView = ({ sportId, filter, selectedItems = [] }) => {
    const { title, icon, matches, showProps, date, promos } = getMockDataForSport(sportId);

        const getSubtitle = () => {
        if (!filter) return '';
        
        if (filter === 'nfl-1st-half') return '1st Half';
        if (filter === 'nfl-1st-quarter') return '1st Quarter';
        if (filter === 'nfl-2nd-quarter') return '2nd Quarter';
        if (filter === 'nfl-3rd-quarter') return '3rd Quarter';
        if (filter === 'nfl-4th-quarter') return '4th Quarter';
        
        return '';
    };

    const subtitle = getSubtitle();
    const displayTitle = subtitle ? `${title} - ${subtitle}` : title;

    return (
        <div style={{ marginBottom: '40px' }}>
            {showProps && promos && promos.length > 0 && (
                <div className="card-row">
                    {promos.map((promo, idx) => (
                        <div key={idx} className="stats-card">
                            <div className="stats-card-header">
                                <div>
                                    <strong style={{ color: '#d6d6d6' }}>{promo.title}</strong> <span style={{ color: 'orange' }}>🔥 1</span>
                                    <div style={{ fontSize: '10px', color: '#999' }}>{promo.time}</div>
                                </div>
                                <span style={{ background: '#eee', padding: '2px 5px', fontSize: '10px', borderRadius: '3px', color: 'black', fontWeight: 'bold' }}>{promo.badge}</span>
                            </div>
                            {promo.players.map((p, pIdx) => (
                                <div key={pIdx} className="player-row">
                                    <div className="player-avatar" style={{ backgroundImage: `url(${p.avatar})` }}></div>
                                    <div className="player-info">
                                        <div className="player-name">{p.name} <span style={{ fontSize: '10px', color: '#666' }}>({p.team})</span></div>
                                        <div style={{ fontSize: '11px', color: '#888' }}>{p.event}</div>
                                    </div>
                                </div>
                            ))}

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', alignItems: 'center' }}>
                                <div style={{ color: '#005c28', fontWeight: 'bold' }}>{promo.odds}</div>
                                <button className="bet-now-btn">Bet Now</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="betting-table-container">
                <div className="table-header-row" style={{ background: '#0a2214', borderTop: '4px solid #005c28', display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
                    <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px' }}>
                        {icon && typeof icon === 'string' && icon.includes('fa-') ? <i className={icon}></i> : icon}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{displayTitle}</span>
                </div>

                <div className="table-subheader-row" style={{ background: '#222', gridTemplateColumns: '2fr 110px 110px 110px 180px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '10px', alignItems: 'center' }}>
                        <span>{date}</span>
                        <span style={{ fontSize: '10px', color: '#888' }}>MAX: $1,000 $1,000 $1,000 $1,000</span>
                    </div>
                    <span>SPREAD</span>
                    <span>MONEYLINE</span>
                    <span>TOTAL</span>
                    <span>TEAM TOTAL</span>
                </div>

                {matches.map((match) => (
                    <div key={match.id} className="table-match-row" style={{ gridTemplateColumns: '2fr 110px 110px 110px 180px', background: '#e0e0e0', borderBottom: '1px solid #ccc' }}>
                        <div className="team-cell">
                            <div style={{ color: '#008a3c', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                                <span className="props-btn" style={{ background: '#ccc', color: 'black', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>+</span>
                                {match.time} - {match.broadcast}
                            </div>
                            <div className="team-line">
                                <img src={match.homeLogo || "https://via.placeholder.com/20"} className="team-logo" alt="" />
                                {match.home}
                                <span className="team-record" style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>{match.homeRecord}</span>
                            </div>
                            <div className="team-line">
                                <img src={match.awayLogo || "https://via.placeholder.com/20"} className="team-logo" alt="" />
                                {match.away}
                                <span className="team-record" style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>{match.awayRecord}</span>
                            </div>
                        </div>

                        <div className="odds-cell" style={{ flexDirection: 'column', gap: '5px' }}>
                            <div className="odds-box" style={{ height: '35px' }}>{match.spread[0]}</div>
                            <div className="odds-box" style={{ height: '35px' }}>{match.spread[1]}</div>
                        </div>

                        <div className="odds-cell" style={{ flexDirection: 'column', gap: '5px' }}>
                            <div className="odds-box" style={{ height: '35px' }}>{match.moneyline[0]}</div>
                            <div className="odds-box" style={{ height: '35px' }}>{match.moneyline[1]}</div>
                        </div>

                        <div className="odds-cell" style={{ flexDirection: 'column', gap: '5px' }}>
                            <div className="odds-box" style={{ height: '35px' }}>{match.total[0]}</div>
                            <div className="odds-box" style={{ height: '35px' }}>{match.total[1]}</div>
                        </div>

                        <div className="odds-cell" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                            <div className="odds-box" style={{ height: '35px' }}>{match.teamTotal[0]}</div>
                            <div className="odds-box" style={{ height: '35px' }}>{match.teamTotal[2]}</div>
                            <div className="odds-box" style={{ height: '35px' }}>{match.teamTotal[1]}</div>
                            <div className="odds-box" style={{ height: '35px' }}>{match.teamTotal[3]}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SportGenericView;
