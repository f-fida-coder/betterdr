import React from 'react';
import '../primelive.css';

const PrimeLiveView = () => {
    return (
        <div className="prime-live-wrapper">
            <div className="prime-layout">
                <aside className="prime-sidebar">
                    <div className="prime-sidebar-search">
                        <input type="text" className="prime-sidebar-input" placeholder="Filter Leagues..." />
                    </div>

                    <div className="prime-sidebar-item active">
                        <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><i className="fa-solid fa-basketball"></i> Basketball</span>
                        <span className="prime-badge">23</span>
                    </div>
                    <div className="prime-sidebar-item">
                        <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><i className="fa-solid fa-hockey-puck"></i> Hockey</span>
                        <span className="prime-badge">22</span>
                    </div>
                    <div className="prime-sidebar-item">
                        <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><i className="fa-solid fa-table-tennis-paddle-ball"></i> Tennis</span>
                        <span className="prime-badge">2</span>
                    </div>
                    <div className="prime-sidebar-item">
                        <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><i className="fa-solid fa-volleyball"></i> Volleyball</span>
                        <span className="prime-badge">2</span>
                    </div>
                    <div className="prime-sidebar-item">
                        <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><i className="fa-solid fa-futbol"></i> Soccer</span>
                        <span className="prime-badge">10</span>
                    </div>

                    <div style={{ padding: '15px 15px 5px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Countries</div>
                    <div className="prime-sidebar-item"><span style={{ paddingLeft: '10px' }}>Greece</span> <span className="prime-badge">1</span></div>
                    <div className="prime-sidebar-item"><span style={{ paddingLeft: '10px' }}>Israel</span> <span className="prime-badge">5</span></div>
                    <div className="prime-sidebar-item"><span style={{ paddingLeft: '10px' }}>Italy</span> <span className="prime-badge">1</span></div>
                </aside>

                <main className="prime-main">
                    <div className="prime-tools-bar">
                        <div style={{ color: '#94a3b8' }}>Showing <span style={{ color: 'white', fontWeight: 'bold' }}>All Matches</span></div>
                        <div style={{ display: 'flex', gap: '15px', color: '#cfaa56', fontWeight: 'bold' }}>
                            <span style={{ cursor: 'pointer' }}><i className="fa-solid fa-compress"></i> COLLAPSE ALL</span>
                            <span style={{ cursor: 'pointer' }}><i className="fa-solid fa-expand"></i> EXPAND ALL</span>
                        </div>
                    </div>

                    <div className="prime-match-group">
                        <div className="prime-match-header">
                            <span><i className="fa-solid fa-flag"></i> Greece A2</span>
                            <span><i className="fa-regular fa-star"></i></span>
                        </div>
                        <div className="prime-header-row">
                            <div>Match Info</div>
                            <div className="prime-markets-header">
                                <span>Spread</span>
                                <span>Total</span>
                                <span>Moneyline</span>
                            </div>
                        </div>

                        <div className="prime-match-row">
                            <div className="prime-match-teams">
                                <div className="prime-team">
                                    <span>Vikos</span>
                                    <span className="prime-score">73</span>
                                </div>
                                <div className="prime-team">
                                    <span>AS Papagou</span>
                                    <span className="prime-score">66</span>
                                </div>
                                <div className="prime-time-info">
                                    <i className="fa-solid fa-clock-rotate-left"></i> 03:10 4TH QTR
                                </div>
                            </div>
                            <div className="prime-odds-grid">
                                <div className="prime-odd-btn">
                                    <span>-4.5</span>
                                    <span className="prime-odd-val">-113</span>
                                </div>
                                <div className="prime-odd-btn">
                                    <span>o158.5</span>
                                    <span className="prime-odd-val">+100</span>
                                </div>
                                <div className="prime-odd-btn">
                                    <span className="prime-odd-val">-549</span>
                                </div>

                                <div className="prime-odd-btn">
                                    <span>+4.5</span>
                                    <span className="prime-odd-val">-127</span>
                                </div>
                                <div className="prime-odd-btn">
                                    <span>u158.5</span>
                                    <span className="prime-odd-val">-141</span>
                                </div>
                                <div className="prime-odd-btn">
                                    <span className="prime-odd-val">+318</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="prime-match-group">
                        <div className="prime-match-header">
                            <span><i className="fa-solid fa-flag"></i> Israel Premier League W</span>
                            <span><i className="fa-regular fa-star"></i></span>
                        </div>

                        <div className="prime-header-row">
                            <div>Match Info</div>
                            <div className="prime-markets-header">
                                <span>Spread</span>
                                <span>Total</span>
                                <span>Moneyline</span>
                            </div>
                        </div>

                        <div className="prime-match-row">
                            <div className="prime-match-teams">
                                <div className="prime-team">
                                    <span>Maccabi Haifa W</span>
                                    <span className="prime-score">71</span>
                                </div>
                                <div className="prime-team">
                                    <span>Hapoel Beer Sheva Asa W</span>
                                    <span className="prime-score">64</span>
                                </div>
                                <div className="prime-time-info">
                                    <i className="fa-solid fa-clock-rotate-left"></i> 00:53 4TH QTR
                                </div>
                            </div>
                            <div className="prime-odds-grid">
                                <div className="prime-odd-btn disabled" style={{ opacity: 0.3 }}></div>
                                <div className="prime-odd-btn disabled" style={{ opacity: 0.3 }}></div>
                                <div className="prime-odd-btn disabled" style={{ opacity: 0.3 }}></div>
                                <div className="prime-odd-btn disabled" style={{ opacity: 0.3 }}></div>
                                <div className="prime-odd-btn disabled" style={{ opacity: 0.3 }}></div>
                                <div className="prime-odd-btn disabled" style={{ opacity: 0.3 }}></div>
                            </div>
                        </div>

                        <div className="prime-match-row">
                            <div className="prime-match-teams">
                                <div className="prime-team">
                                    <span>Hapoel Lev Jerusalem W</span>
                                    <span className="prime-score">71</span>
                                </div>
                                <div className="prime-team">
                                    <span>Elitzur Holon W</span>
                                    <span className="prime-score">72</span>
                                </div>
                                <div className="prime-time-info">
                                    <i className="fa-solid fa-clock-rotate-left"></i> 03:52 4TH QTR
                                </div>
                            </div>
                            <div className="prime-odds-grid">
                                <div className="prime-odd-btn">
                                    <span>+3.5</span> <span className="prime-odd-val">-133</span>
                                </div>
                                <div className="prime-odd-btn">
                                    <span>o161.5</span> <span className="prime-odd-val">-120</span>
                                </div>
                                <div className="prime-odd-btn">
                                    <span className="prime-odd-val">+190</span>
                                </div>

                                <div className="prime-odd-btn">
                                    <span>-3.5</span> <span className="prime-odd-val">-106</span>
                                </div>
                                <div className="prime-odd-btn">
                                    <span>u161.5</span> <span className="prime-odd-val">-117</span>
                                </div>
                                <div className="prime-odd-btn">
                                    <span className="prime-odd-val">-285</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </main>

                <aside className="prime-right-panel">
                    <div className="prime-slip-tabs">
                        <div className="prime-slip-tab active">BET SLIP</div>
                        <div className="prime-slip-tab">MY BETS</div>
                    </div>
                    <div className="prime-slip-content">
                        <div style={{ marginBottom: '15px', fontSize: '14px', fontWeight: 'bold' }}>Your Slip is Empty</div>
                        <p style={{ lineHeight: '1.5' }}>Click on any odds to add selections to your bet slip.</p>
                        <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <i className="fa-solid fa-ticket" style={{ fontSize: '32px', color: '#cfaa56', marginBottom: '10px' }}></i>
                            <div style={{ fontSize: '11px' }}>Start betting now!</div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PrimeLiveView;
