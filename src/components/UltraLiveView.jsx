import React from 'react';
import '../ultralive.css';

const UltraLiveView = () => {
    return (
        <div className="ultra-live-wrapper">
            <aside className="ultra-sidebar">
                <div className="ultra-subnav">
                    <div className="ultra-subnav-item active">In-Play</div>
                    <div className="ultra-subnav-item">History</div>
                    <div className="ultra-subnav-item">Live TV</div>
                </div>

                <div className="ultra-sport-header">
                    <span><i className="fa-solid fa-basketball"></i> Basketball</span>
                    <span style={{ background: '#00703c', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px' }}>23</span>
                </div>

                <div className="ultra-league-group">
                    <div className="ultra-league-header">International - ABA League</div>
                    <div className="ultra-sidebar-match active">
                        <div className="ultra-sidebar-match-teams">
                            <span style={{ color: 'white' }}>BC Hallmann Vienna</span>
                            <span className="ultra-sidebar-match-score">23</span>
                        </div>
                        <div className="ultra-sidebar-match-teams">
                            <span style={{ color: 'white' }}>Mega MIS</span>
                            <span className="ultra-sidebar-match-score">28</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#00703c', marginTop: '4px', fontWeight: 'bold' }}>1st Qtr 00:45</div>
                    </div>
                </div>

                <div className="ultra-league-group">
                    <div className="ultra-league-header">Bahrain - Premier League</div>
                    <div className="ultra-sidebar-match">
                        <div className="ultra-sidebar-match-teams">
                            <span>Nuwaidrad</span>
                            <span className="ultra-sidebar-match-score">61</span>
                        </div>
                        <div className="ultra-sidebar-match-teams">
                            <span>Al Hala</span>
                            <span className="ultra-sidebar-match-score">58</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#777', marginTop: '4px' }}>3rd Qtr 02:06</div>
                    </div>
                </div>
            </aside>

            <main className="ultra-main">
                <div className="ultra-video-area">
                    <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="none">
                        <defs>
                            <radialGradient id="videoGlow" cx="0.5" cy="0.5" r="0.5">
                                <stop offset="0%" stopColor="#2a2a2a" />
                                <stop offset="100%" stopColor="#000" />
                            </radialGradient>
                        </defs>
                        <rect width="800" height="400" fill="url(#videoGlow)" />

                        <text x="50%" y="50%" fill="white" fontSize="24" textAnchor="middle" opacity="0.3" fontFamily="Inter" fontWeight="bold">LIVE STREAM FEED</text>
                        <rect x="30" y="30" width="80" height="25" rx="4" fill="#ff0000" opacity="0.8" />
                        <text x="70" y="47" fill="white" fontSize="12" textAnchor="middle" fontWeight="bold">LIVE</text>

                        <circle cx="50%" cy="50%" r="40" stroke="white" strokeWidth="3" fill="none" opacity="0.6" />
                        <path d="M390 180 L430 200 L390 220 Z" fill="white" opacity="0.8" />
                    </svg>
                </div>

                <div className="ultra-markets-container">
                    <div className="ultra-market-header">
                        <h2>BC Hallmann Vienna @ Mega MIS</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button style={{ padding: '6px 15px', borderRadius: '15px', border: '1px solid #555', background: '#222', color: 'white', fontSize: '11px', fontWeight: 'bold' }}>MATCH STATS</button>
                        </div>
                    </div>

                    <div className="ultra-market-section">
                        <div className="ultra-market-title">
                            <span>Game Winner</span>
                            <i className="fa-solid fa-chevron-up"></i>
                        </div>
                        <div className="ultra-market-rows">
                            <div className="ultra-market-row">
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">BC Hallmann Vienna</span>
                                    <span className="ultra-odds-val">+351</span>
                                </div>
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">Mega MIS</span>
                                    <span className="ultra-odds-val">-617</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ultra-market-section">
                        <div className="ultra-market-title">
                            <span>Spread</span>
                            <i className="fa-solid fa-chevron-up"></i>
                        </div>
                        <div className="ultra-market-rows">
                            <div className="ultra-market-row">
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">BC Hallmann Vienna +10.5</span>
                                    <span className="ultra-odds-val">-138</span>
                                </div>
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">Mega MIS -10.5</span>
                                    <span className="ultra-odds-val">+101</span>
                                </div>
                            </div>
                            <div className="ultra-market-row">
                                <div className="ultra-odds-box" style={{ borderColor: '#cfaa56' }}>
                                    <span className="ultra-odds-label" style={{ color: '#fff' }}>BC Hallmann Vienna +9.5</span>
                                    <span className="ultra-odds-val">-118</span>
                                </div>
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">Mega MIS -9.5</span>
                                    <span className="ultra-odds-val">-117</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ultra-market-section">
                        <div className="ultra-market-title">
                            <span>Total</span>
                            <i className="fa-solid fa-chevron-up"></i>
                        </div>
                        <div className="ultra-market-rows">
                            <div className="ultra-market-row">
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">Over 189.5</span>
                                    <span className="ultra-odds-val">-110</span>
                                </div>
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">Under 189.5</span>
                                    <span className="ultra-odds-val">-126</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            <aside className="ultra-right-panel">
                <div className="ultra-tracker">
                    <div style={{ padding: '8px 10px', background: '#222', color: '#ccc', fontSize: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>ABA LEAGUE</span>
                        <span>1st Qtr 00:45</span>
                    </div>
                    <div className="ultra-court-graphic">
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'rgba(255,255,255,0.1)', fontSize: '50px' }}>
                            <i className="fa-solid fa-basketball-ball"></i>
                        </div>
                        <div style={{ padding: '20px', textAlign: 'center', marginTop: '60px' }}>
                            <div style={{ color: '#cfaa56', fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>MEGA MIS</div>
                            <div style={{ color: '#fff', fontSize: '12px' }}>ATTACKING</div>
                        </div>
                    </div>
                </div>

                <div className="ultra-slip-header">
                    <div className="ultra-slip-tab active">Bet slip</div>
                    <div className="ultra-slip-tab">My Bets</div>
                </div>
                <div className="ultra-slip-body">
                    <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: '#ccc' }}>Slip Empty</div>
                    <p>Make a selection to start a new bet.</p>
                </div>
            </aside>
        </div>
    );
};

export default UltraLiveView;
