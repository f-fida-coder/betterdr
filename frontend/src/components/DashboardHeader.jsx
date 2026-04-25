import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ScoreboardSidebar from './ScoreboardSidebar';
import SettingsModal from './SettingsModal';
import PersonalizeSidebar from './PersonalizeSidebar';
import AccountPanel from './AccountPanel';
import { useOddsFormat } from '../contexts/OddsFormatContext';

const buildRefreshRequestId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `matches-refresh-${crypto.randomUUID()}`;
    }
    return `matches-refresh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// UP NEXT / FEATURED are tab-style filters that sit above the sport list
// and shouldn't enable Continue on their own — the user still needs to
// pick a sport below. LIVE NOW is NOT in here because it's a standalone
// destination (all live matches across sports) and tapping it should
// proceed directly via Continue.
const META_SPORT_FILTERS = new Set(['up-next', 'featured']);

const DashboardHeader = ({ username, balance, pendingBalance, availableBalance, freeplayBalance, onViewChange, activeBetMode = 'straight', onBetModeChange, currentView, onToggleSidebar, selectedSports = [], onContinue, onMobileBack, onLogout, mobileViewState = 'browsing', onHomeClick, role, unlimitedBalance, slipCount = 0, realtimeConnectionState = 'idle', lastRealtimeEventAt = null }) => {
    const hasRealSportSelection = selectedSports.some((id) => !META_SPORT_FILTERS.has(id));
    const showContinueButton = mobileViewState === 'selected' && hasRealSportSelection;
    const [showAccountPanel, setShowAccountPanel] = useState(false);
    const accountUser = {
        username,
        role,
        balance,
        pendingBalance,
        availableBalance,
        freeplayBalance,
    };
    const { oddsFormat, setOddsFormat, isUpdatingOddsFormat } = useOddsFormat();
    const [showLiveMenu, setShowLiveMenu] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const betTypes = [
        { id: 'straight', label: 'STRAIGHT', icon: 'S' },
        { id: 'parlay', label: 'PARLAY', icon: 'P' },
        { id: 'teaser', label: 'TEASER', icon: 'T' },
        { id: 'if_bet', label: 'IF BET', icon: 'I' },
        { id: 'reverse', label: 'REVERSE', icon: 'R' }
    ];

    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [showOddsModal, setShowOddsModal] = useState(false);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showPersonalizeSidebar, setShowPersonalizeSidebar] = useState(false);
    const activeRefreshRef = useRef({ requestId: '', pendingListeners: new Set(), timeoutId: 0 });

    const clearActiveRefreshTimeout = () => {
        const timeoutId = activeRefreshRef.current.timeoutId;
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
        activeRefreshRef.current.timeoutId = 0;
    };

    const finishRefreshRequest = (requestId) => {
        if (!requestId || activeRefreshRef.current.requestId !== requestId) {
            return;
        }
        clearActiveRefreshTimeout();
        activeRefreshRef.current = { requestId: '', pendingListeners: new Set(), timeoutId: 0 };
        setIsRefreshing(false);
    };

    const formatMoney = (value) => {
        if (unlimitedBalance) return 'Unlimited';
        if (value === null || value === undefined || value === '') return '—';
        const num = Number(value);
        if (Number.isNaN(num)) return '—';
        return `$ ${Math.round(num)}`;
    };

    // Compact two-decimal comma-separated formatter for the mobile header
    // balance cell. Matches probooknyc's "3,000.00" / "17,229.73" style and
    // stays narrow enough to share the row with four icon cells on small
    // viewports. Distinct from formatMoney() which the desktop block uses
    // (rounded integers with a leading "$").
    const formatBalanceCell = (value) => {
        if (unlimitedBalance) return 'Unl.';
        if (value === null || value === undefined || value === '') return '0.00';
        const num = Number(value);
        if (Number.isNaN(num)) return '0.00';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Color the balance amount by sign — green positive, red negative, white
    // zero. The previous implementation rendered -997 in green (success color)
    // which inverted the meaning of "how much you can bet".
    const balanceColor = (() => {
        if (unlimitedBalance) return '#10b981';
        const num = Number(balance);
        if (!Number.isFinite(num) || num === 0) return '#ffffff';
        return num > 0 ? '#10b981' : '#ef4444';
    })();

    // Single source of truth for mobile header icon buttons. 44px tap target
    // per the accessibility spec, 24px centered icon inside.
    const headerIconBtnStyle = {
        width: 44,
        height: 44,
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'transparent',
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        flex: '0 0 auto',
    };

    // 5-cell mobile header (Sport / Account / Balance / Menu / Betslip).
    // Icon cells are dark navy, balance cell is muted gray and flex-grows
    // to fill the middle. Each cell ≥44px tap target on the icon side; the
    // balance cell is informational and not interactive.
    const mhCellBtnStyle = {
        flex: '0 0 auto',
        minWidth: 56,
        minHeight: 64,
        padding: '6px 6px',
        background: '#000000',
        border: 'none',
        borderRight: '1px solid rgba(255,255,255,0.12)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'pointer',
        fontFamily: 'inherit',
    };
    const mhCellIconStyle = { fontSize: 20, color: '#fff', lineHeight: 1 };
    const mhCellLabelStyle = {
        fontSize: 10,
        fontWeight: 500,
        color: '#fff',
        letterSpacing: 0.2,
        lineHeight: 1,
    };
    const mhBalanceCellStyle = {
        flex: '1 1 auto',
        minWidth: 0,
        background: '#6c7b8a',
        borderLeft: '1px solid rgba(0,0,0,0.18)',
        borderRight: '1px solid rgba(0,0,0,0.18)',
        padding: '6px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
    };
    const mhBalanceRowStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        minWidth: 0,
    };
    const mhBalanceLabelStyle = {
        fontSize: 11,
        fontWeight: 500,
        color: '#fff',
        flex: '0 0 auto',
    };
    const mhBalanceValueStyle = {
        fontSize: 13,
        fontWeight: 700,
        color: '#fff',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };
    const mhBetslipCircleStyle = {
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
    };

    const handleRefreshRequest = () => {
        if (isRefreshing || activeRefreshRef.current.requestId) return;
        const requestId = buildRefreshRequestId();
        setIsRefreshing(true);
        clearActiveRefreshTimeout();
        activeRefreshRef.current = {
            requestId,
            pendingListeners: new Set(),
            timeoutId: window.setTimeout(() => {
                finishRefreshRequest(requestId);
            }, 30000),
        };

        window.dispatchEvent(new CustomEvent('matches:refresh', { detail: { reason: 'manual', requestId } }));

        if (activeRefreshRef.current.requestId === requestId && activeRefreshRef.current.pendingListeners.size === 0) {
            finishRefreshRequest(requestId);
        }
    };

    React.useEffect(() => {
        const handleRefreshProgress = (event) => {
            const detail = event?.detail ?? {};
            const requestId = detail.requestId ? String(detail.requestId) : '';
            if (!requestId || requestId !== activeRefreshRef.current.requestId) {
                return;
            }

            const listenerId = detail.listenerId ? String(detail.listenerId) : '';
            if (!listenerId) {
                return;
            }

            if (detail.phase === 'started') {
                activeRefreshRef.current.pendingListeners.add(listenerId);
                return;
            }

            if (detail.phase === 'completed') {
                activeRefreshRef.current.pendingListeners.delete(listenerId);
                if (activeRefreshRef.current.pendingListeners.size === 0) {
                    finishRefreshRequest(requestId);
                }
            }
        };

        window.addEventListener('matches:refresh-progress', handleRefreshProgress);
        return () => {
            clearActiveRefreshTimeout();
            window.removeEventListener('matches:refresh-progress', handleRefreshProgress);
        };
    }, []);

    const languages = [
        { name: 'English', flag: 'https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg', active: true },
        { name: 'Spanish', flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg' },
        { name: 'Chinese', flag: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_the_People%27s_Republic_of_China.svg' },
        { name: 'French', flag: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg' },
        { name: 'Greek', flag: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Greece.svg' },
        { name: 'Japanese', flag: 'https://upload.wikimedia.org/wikipedia/en/9/9e/Flag_of_Japan.svg' },
        { name: 'Korean', flag: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_South_Korea.svg' },
        { name: 'Vietnamese', flag: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg' }
    ];

    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const withSidebarOffset = currentView === 'dashboard';

    const realtimeStatus = React.useMemo(() => {
        const state = String(realtimeConnectionState || 'idle').toLowerCase();
        if (state === 'open') return { label: 'LIVE CONNECTED', color: '#2e7d32', dot: '#49d17d' };
        if (state === 'connecting') return { label: 'CONNECTING', color: '#8a6d00', dot: '#ffbf00' };
        if (state === 'error' || state === 'failed') return { label: 'LIVE ERROR', color: '#7f1d1d', dot: '#ef4444' };
        return { label: 'RECONNECTING', color: '#374151', dot: '#9ca3af' };
    }, [realtimeConnectionState]);

    const lastRealtimeText = React.useMemo(() => {
        if (!lastRealtimeEventAt) {
            return 'No realtime event yet';
        }
        const dt = new Date(lastRealtimeEventAt);
        if (Number.isNaN(dt.getTime())) {
            return 'No realtime event yet';
        }
        return `Last update ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }, [lastRealtimeEventAt]);

    return (
        <>
            <div className="mobile-header-container mobile-only">
                {/* 5-cell mobile header modeled on probooknyc's PPH layout:
                    [Sport] [Account] [Pend/Avail Balance] [Menu] [Betslip].
                    Icon cells are dark navy, balance cell is muted gray and
                    flex-grows to fill the middle. Sport reuses the same
                    handler as MobileGridMenu's "Sports" tile (single source
                    of truth). No search, no calculator, no view-state-
                    dependent back/home buttons — those flows live elsewhere. */}
                <div
                    className="top-header"
                    style={{
                        display: 'flex',
                        alignItems: 'stretch',
                        padding: 0,
                        minHeight: 64,
                        background: '#000000',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => onViewChange && onViewChange('dashboard')}
                        aria-label="Sport categories"
                        style={mhCellBtnStyle}
                    >
                        <i className="fa-solid fa-table-cells" style={mhCellIconStyle}></i>
                        <span style={mhCellLabelStyle}>Sport</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowAccountPanel(true)}
                        aria-label="Open account panel"
                        style={mhCellBtnStyle}
                    >
                        <i className="fa-solid fa-user" style={mhCellIconStyle}></i>
                        <span style={mhCellLabelStyle}>Account</span>
                    </button>

                    <div style={mhBalanceCellStyle} aria-label="Account balance">
                        <div style={mhBalanceRowStyle}>
                            <span style={mhBalanceLabelStyle}>Pend.:</span>
                            <span style={mhBalanceValueStyle}>{formatBalanceCell(pendingBalance)}</span>
                        </div>
                        <div style={mhBalanceRowStyle}>
                            <span style={mhBalanceLabelStyle}>Avail.:</span>
                            <span style={mhBalanceValueStyle}>{formatBalanceCell(availableBalance)}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onToggleSidebar}
                        aria-label="Open menu"
                        style={mhCellBtnStyle}
                    >
                        <i className="fa-solid fa-bars" style={mhCellIconStyle}></i>
                        <span style={mhCellLabelStyle}>Menu</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('betslip:open', { detail: { source: 'header' } }))}
                        aria-label={`Open bet slip${slipCount ? ` — ${slipCount} selection${slipCount === 1 ? '' : 's'}` : ''}`}
                        style={{ ...mhCellBtnStyle, borderRight: 'none' }}
                    >
                        <span style={mhBetslipCircleStyle}>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    fontVariantNumeric: 'tabular-nums',
                                    color: slipCount > 0 ? '#dc2626' : '#000',
                                }}
                            >
                                {slipCount > 99 ? '99+' : slipCount}
                            </span>
                        </span>
                        <span style={mhCellLabelStyle}>Betslip</span>
                    </button>
                </div>

                {showUserMenu && (
                    <div className="user-settings-dropdown mobile-usd" onClick={(e) => e.stopPropagation()}>
                        <div className="usd-item" onClick={() => { setShowLanguageModal(true); setShowUserMenu(false); }}>
                            <div className="usd-icon"><i className="fa-solid fa-globe"></i></div>
                            <div className="usd-text">LANGUAGE</div>
                            <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                        </div>
                        <div className="usd-item" onClick={() => { setShowOddsModal(true); setShowUserMenu(false); }}>
                            <div className="usd-icon"><i className="fa-solid fa-calculator"></i></div>
                            <div className="usd-text">ODDS FORMAT</div>
                            <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                        </div>
                        <div className="usd-item" onClick={() => { setShowScoreboard(true); setShowUserMenu(false); }}>
                            <div className="usd-icon"><i className="fa-solid fa-chart-simple"></i></div>
                            <div className="usd-text">SCOREBOARD</div>
                            <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                        </div>
                        <div className="usd-item" onClick={() => { setShowSettingsModal(true); setShowUserMenu(false); }}>
                            <div className="usd-icon"><i className="fa-solid fa-gear"></i></div>
                            <div className="usd-text">SETTINGS</div>
                            <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                        </div>
                        <div className="usd-item" onClick={() => { setShowPersonalizeSidebar(true); setShowUserMenu(false); }}>
                            <div className="usd-icon"><i className="fa-solid fa-sliders"></i></div>
                            <div className="usd-text">PERSONALIZE</div>
                            <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                        </div>
                        <div className="usd-item" onClick={() => { onViewChange && onViewChange('support'); setShowUserMenu(false); }}>
                            <div className="usd-icon"><i className="fa-solid fa-headset"></i></div>
                            <div className="usd-text">SUPPORT</div>
                            <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                        </div>
                        <div className="usd-item" onClick={() => { onViewChange && onViewChange('my-bets'); setShowUserMenu(false); }}>
                            <div className="usd-icon"><i className="fa-solid fa-list"></i></div>
                            <div className="usd-text">MY BETS</div>
                            <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                        </div>
                        <div className="usd-item signout" onClick={onLogout}>
                            <div className="usd-icon"><i className="fa-solid fa-power-off"></i></div>
                            <div className="usd-text">SIGN OUT</div>
                        </div>
                    </div>
                )}

                {mobileViewState !== 'browsing' && (
                    <div className="tabs-bar">
                        {[
                            { id: 'straight', label: 'STRAIGHT', letter: 'S' },
                            { id: 'parlay', label: 'PARLAY', letter: 'P' },
                            { id: 'teaser', label: 'TEASER', letter: 'T' },
                            { id: 'if_bet', label: 'IF BET', letter: 'I' },
                            { id: 'reverse', label: 'REVERSE', letter: 'R' }
                        ].map((mode) => (
                            <div
                                key={mode.id}
                                className={`tab-item ${activeBetMode === mode.id ? 'active' : ''}`}
                                onClick={() => onBetModeChange && onBetModeChange(mode.id)}
                            >
                                <span className="tab-letter">{mode.letter}</span>
                                <span className="tab-text">{mode.label}</span>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            <div className="dash-topbar desktop-only">
                <div className="dash-nav-links">
                    <div
                        className="dash-nav-item"
                        onClick={() => onHomeClick && onHomeClick()}
                    >
                        <span>SPORTS</span>
                        <div className="dash-nav-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" /><path d="M2.5 12h19M12 2.5v19" /></svg>
                        </div>
                    </div>

                    <div
                        className="dash-nav-item"
                        onMouseEnter={() => setShowLiveMenu(true)}
                        onMouseLeave={() => setShowLiveMenu(false)}
                        style={{ position: 'relative', overflow: 'visible' }}
                    >
                        <span>LIVE</span>
                        <div className="dash-nav-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                        </div>

                        {showLiveMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '0',
                                width: '120px',
                                background: '#333',
                                zIndex: 100,
                                border: '1px solid #555',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                            }}>
                                <div
                                    style={{ padding: '10px', color: 'white', borderBottom: '1px solid #444', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}
                                    onClick={() => onViewChange && onViewChange('prime-live')}
                                    className="live-menu-item"
                                >
                                    <span style={{ fontSize: '10px', fontWeight: 'bold' }}>PRIME LIVE</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </div>
                                <div
                                    style={{ padding: '10px', color: '#999', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}
                                    className="live-menu-item"
                                    onClick={() => onViewChange && onViewChange('ultra-live')}
                                >
                                    <span style={{ fontSize: '10px', fontWeight: 'bold' }}>ULTRA LIVE</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                </div>
                            </div>
                        )}
                    </div>

                    <div
                        className="dash-nav-item"
                        onClick={() => onViewChange && onViewChange('casino')}
                    >
                        <span>CASINO</span>
                        <div className="dash-nav-icon">
                            <span style={{ fontSize: '20px', fontWeight: 'bold', border: '2px solid white', borderRadius: '4px', padding: '0 4px', color: '#ffd700', borderColor: '#ffd700' }}>7</span>
                        </div>
                    </div>
                    <div
                        className="dash-nav-item"
                        onClick={() => onViewChange && onViewChange('live-casino')}
                    >
                        <span>LIVE CASINO</span>
                        <div className="dash-nav-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="2" /></svg>
                        </div>
                    </div>
                    <div
                        className="dash-nav-item"
                        onMouseEnter={() => setShowMoreMenu(true)}
                        onMouseLeave={() => setShowMoreMenu(false)}
                        style={{ position: 'relative', overflow: 'visible' }}
                    >
                        <span>MORE</span>
                        <div className="dash-nav-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                        </div>
                        {showMoreMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '0',
                                width: '120px',
                                background: '#333',
                                zIndex: 100,
                                border: '1px solid #555',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                            }}>
                                <div
                                    style={{ padding: '10px', color: '#999', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}
                                    className="live-menu-item"
                                    onClick={() => onViewChange && onViewChange('props')}
                                >
                                    <span style={{ fontSize: '10px', fontWeight: 'bold' }}>PROPS</span>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', border: '1px solid #999', padding: '0 2px' }}>P+</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="dash-nav-item" style={{ color: '#ffd700', cursor: 'pointer' }} onClick={() => onViewChange && onViewChange('bonus')}>
                        <span>BONUS</span>
                        <div className="dash-nav-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V8H6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2" /><path d="M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /></svg>
                        </div>
                    </div>
                    <div className="dash-nav-item" style={{ cursor: 'pointer' }} onClick={() => onViewChange && onViewChange('tutorials')}>
                        <span>TUTORIALS</span>
                        <div className="dash-nav-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                        </div>
                    </div>
                    <div className="dash-nav-item" style={{ cursor: 'pointer' }} onClick={() => onViewChange && onViewChange('support')}>
                        <span>SUPPORT</span>
                        <div className="dash-nav-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v6H4z" /><path d="M4 10h10v10H4z" /><path d="M14 10h6v4h-6z" /></svg>
                        </div>
                    </div>
                </div>
                <div className="dash-user-info">
                    <div className="dash-balance">
                        <span>{role === 'user' ? 'BALANCE' : 'CREDIT LIMIT'}</span>
                        <strong>{formatMoney(balance)}</strong>
                    </div>
                    <div className="dash-balance">
                        <span>PENDING WAGERS</span>
                        <strong>{formatMoney(pendingBalance)}</strong>
                    </div>
                    <div className="dash-balance">
                        <span>AVAILABLE CREDIT</span>
                        <strong>{formatMoney(availableBalance)}</strong>
                    </div>

                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', position: 'relative' }}
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{username || 'WGT73476'}</span>
                        <span>{showUserMenu ? '▲' : '▼'}</span>

                        {showUserMenu && (
                            <div className="user-settings-dropdown" onClick={(e) => e.stopPropagation()}>
                                <div className="usd-item" onClick={() => setShowLanguageModal(true)}>
                                    <div className="usd-icon"><i className="fa-solid fa-globe"></i></div>
                                    <div className="usd-text">Language</div>
                                    <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                                </div>
                                <div className="usd-item" onClick={() => setShowOddsModal(true)}>
                                    <div className="usd-icon"><i className="fa-solid fa-calculator"></i></div>
                                    <div className="usd-text">Odds Format</div>
                                    <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                                </div>
                                <div className="usd-item" onClick={() => setShowScoreboard(true)}>
                                    <div className="usd-icon"><i className="fa-solid fa-chart-simple"></i></div>
                                    <div className="usd-text">Scoreboard</div>
                                    <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                                </div>
                                <div className="usd-item" onClick={() => setShowSettingsModal(true)}>
                                    <div className="usd-icon"><i className="fa-solid fa-gear"></i></div>
                                    <div className="usd-text">Settings</div>
                                    <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                                </div>
                                <div className="usd-item" onClick={() => setShowPersonalizeSidebar(true)}>
                                    <div className="usd-icon"><i className="fa-solid fa-sliders"></i></div>
                                    <div className="usd-text">Personalize</div>
                                    <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                                </div>
                                <div className="usd-item" onClick={() => onViewChange && onViewChange('support')}>
                                    <div className="usd-icon"><i className="fa-solid fa-headset"></i></div>
                                    <div className="usd-text">Support</div>
                                    <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                                </div>
                                <div className="usd-item" onClick={() => onViewChange && onViewChange('my-bets')}>
                                    <div className="usd-icon"><i className="fa-solid fa-list"></i></div>
                                    <div className="usd-text">My Bets</div>
                                    <div className="usd-right-icon"><i className="fa-solid fa-chevron-right"></i></div>
                                </div>
                                <div className="usd-item signout" onClick={onLogout}>
                                    <div className="usd-icon"><i className="fa-solid fa-power-off"></i></div>
                                    <div className="usd-text">SIGN OUT</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {currentView !== 'rules' && currentView !== 'bonus' && (
                <>


                    <div className={`dash-subheader mobile-subheader desktop-only ${withSidebarOffset ? 'with-sidebar-offset' : ''}`} style={{ display: 'flex', borderBottom: '1px solid #ccc', height: 'auto', minHeight: '60px' }}>


                        <div className="bet-type-bar">
                            {[
                                { id: 'straight', label: 'STRAIGHT', icon: 'S' },
                                { id: 'parlay', label: 'PARLAY', icon: 'P' },
                                { id: 'teaser', label: 'TEASER', icon: 'T' },
                                { id: 'if_bet', label: 'IF BET', icon: 'I' },
                                { id: 'reverse', label: 'REVERSE', icon: 'R' }
                            ].map((mode) => (
                                <div
                                    key={mode.id}
                                    className={`bet-type-item ${activeBetMode === mode.id ? 'active' : ''}`}
                                    onClick={() => onBetModeChange && onBetModeChange(mode.id)}
                                >
                                    <div className="bet-type-letter">{mode.icon}</div>
                                    <div className="bet-type-label">{mode.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="bet-action-group">
                            <button
                                className={`action-btn refresh-btn ${isRefreshing ? 'refresh-loading' : ''}`}
                                title="Refresh"
                                onClick={handleRefreshRequest}
                                disabled={isRefreshing}
                            >
                                <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? 'fa-spin' : ''}`} style={{ fontSize: '16px' }}></i>
                                <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH'}</span>
                            </button>
                            <button
                                className="action-btn green continue-btn"
                                title={hasRealSportSelection ? 'Continue' : 'Select a sport below to continue'}
                                onClick={onContinue || onToggleSidebar}
                                disabled={!hasRealSportSelection}
                                style={!hasRealSportSelection ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                            >
                                <i className="fa-solid fa-chevron-right" style={{ fontSize: '16px' }}></i>
                                <span>CONTINUE</span>
                            </button>
                        </div>
                    </div>
                </>
            )
            }

            { }




            {
                showLanguageModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.7)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            background: 'white',
                            width: '300px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{
                                padding: '15px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #eee'
                            }}>
                                <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>Available Languages</h3>
                                <span
                                    onClick={() => setShowLanguageModal(false)}
                                    style={{ cursor: 'pointer', fontSize: '20px', color: '#999' }}
                                >×</span>
                            </div>

                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {languages.map((lang, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px 20px',
                                        borderBottom: '1px solid #eee',
                                        background: lang.active ? '#004d26' : 'white',
                                        color: lang.active ? 'white' : '#333',
                                        cursor: 'pointer'
                                    }}>
                                        <span style={{ fontSize: '16px', fontWeight: lang.active ? 'bold' : 'normal' }}>{lang.name}</span>
                                        <img
                                            src={lang.flag}
                                            alt={lang.name}
                                            style={{ width: '24px', borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee' }}>
                                <button
                                    onClick={() => setShowLanguageModal(false)}
                                    style={{
                                        background: '#d9534f',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 20px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showOddsModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.7)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{
                            background: 'white',
                            width: '300px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
                            marginBottom: '20vh'
                        }}>
                            <div style={{
                                padding: '15px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #eee'
                            }}>
                                <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>Odds Format</h3>
                                <span
                                    onClick={() => setShowOddsModal(false)}
                                    style={{ cursor: 'pointer', fontSize: '20px', color: '#999' }}
                                >×</span>
                            </div>

                            <div style={{ padding: '20px' }}>
                                <div style={{
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    background: '#f7faf7'
                                }}>
                                    {[
                                        { id: 'american', label: 'American' },
                                        { id: 'decimal', label: 'Decimal' },
                                    ].map((option, index) => {
                                        const active = oddsFormat === option.id;
                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                disabled={isUpdatingOddsFormat && !active}
                                                onClick={() => {
                                                    void setOddsFormat(option.id);
                                                    setShowOddsModal(false);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 15px',
                                                    border: 'none',
                                                    borderTop: index === 0 ? 'none' : '1px solid #d7e2d7',
                                                    background: active ? '#004d26' : '#ffffff',
                                                    color: active ? '#ffffff' : '#333333',
                                                    fontWeight: active ? 'bold' : '500',
                                                    textAlign: 'left',
                                                    cursor: isUpdatingOddsFormat && !active ? 'not-allowed' : 'pointer',
                                                    opacity: isUpdatingOddsFormat && !active ? 0.65 : 1,
                                                }}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p style={{ margin: '12px 0 0', color: '#52606d', fontSize: '13px', lineHeight: 1.5 }}>
                                    Current selection: <strong style={{ textTransform: 'capitalize' }}>{oddsFormat}</strong>
                                    {isUpdatingOddsFormat ? ' (saving to profile...)' : ''}
                                </p>
                            </div>

                            <div style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee' }}>
                                <button
                                    onClick={() => setShowOddsModal(false)}
                                    style={{
                                        background: '#d9534f',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 20px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {showScoreboard && <ScoreboardSidebar onClose={() => setShowScoreboard(false)} />}

            {
                showSettingsModal && createPortal(
                    <SettingsModal
                        onClose={() => setShowSettingsModal(false)}
                        balance={balance}
                        pendingBalance={pendingBalance}
                        availableBalance={availableBalance}
                    />,
                    document.body
                )
            }

            {showPersonalizeSidebar && <PersonalizeSidebar onClose={() => setShowPersonalizeSidebar(false)} />}

            <AccountPanel
                open={showAccountPanel}
                onClose={() => setShowAccountPanel(false)}
                user={accountUser}
                onViewChange={onViewChange}
                onLogout={onLogout}
            />
        </>
    );
};

export default DashboardHeader;
