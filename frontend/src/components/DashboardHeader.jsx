import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ScoreboardSidebar from './ScoreboardSidebar';
import SettingsModal from './SettingsModal';
import PersonalizeSidebar from './PersonalizeSidebar';
import AccountPanel from './AccountPanel';
import { setMyBetsInitialFilter } from './myBetsState';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { getSiteTimezone, getSiteTimezoneLabel } from '../utils/timezone';
import { dismissTopSurface } from '../hooks/useDismissableSurface';

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

// Static style objects hoisted out of the component to avoid re-creation on every render.
const headerIconBtnStyle = {
    width: 44, height: 44, borderRadius: 22,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent', color: '#fff',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0, flex: '0 0 auto',
};
const mhCellBtnStyle = {
    width: '100%', minWidth: 0, minHeight: 64, padding: '6px 6px',
    background: '#595959', border: 'none', color: '#fff',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 4, cursor: 'pointer', fontFamily: 'inherit',
};
const mhCellIconStyle = { fontSize: 20, color: '#fff', lineHeight: 1 };
const mhCellLabelStyle = {
    fontSize: 10, fontWeight: 500, color: '#fff', letterSpacing: 0.2, lineHeight: 1,
};
const mhBalanceCellStyle = {
    gridColumn: 'span 2', minWidth: 0, background: '#595959',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.18)',
    padding: '2px 10px', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', gap: 1, appearance: 'none', WebkitAppearance: 'none',
    border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
};
const mhBalanceRowStyle = {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    gap: 8, minWidth: 0, lineHeight: 1.1, padding: '0',
};
const mhBalanceLabelStyle = {
    fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.7, textTransform: 'uppercase', flex: '0 0 auto',
};
const mhBalanceValueStyle = {
    fontSize: 11, fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums',
    textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const mhBalanceHeroLabelStyle = { ...mhBalanceLabelStyle, fontSize: 10, color: 'rgba(255,255,255,0.95)' };
const mhBalanceHeroValueStyle = { ...mhBalanceValueStyle, fontSize: 11, fontWeight: 700 };
const mhBalanceRowDividerStyle = { height: 1, background: 'rgba(255,255,255,0.12)', margin: '0 -2px' };
const mhBetslipCircleStyle = {
    width: 28, height: 28, borderRadius: '50%', background: '#fff',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
};

const DashboardHeader = ({ username, userId = null, balance, pendingBalance, availableBalance, freeplayBalance, freeplayExpiresAt = null, creditLimit = 0, creditAvailable = 0, balanceOwed = 0, nonPostedCasino = 0, minBet = null, maxBet = null, userSettings = null, userApps = null, userOnboarding = null, onViewChange, activeBetMode = 'straight', onBetModeChange, currentView, onToggleSidebar, selectedSports = [], onContinue, onMobileBack, onLogout, mobileViewState = 'browsing', onHomeClick, role, unlimitedBalance, slipCount = 0, realtimeConnectionState = 'idle', lastRealtimeEventAt = null }) => {
    const hasRealSportSelection = selectedSports.some((id) => !META_SPORT_FILTERS.has(id));
    // A functional nav-tab tap is BOTH a dismiss and a navigation: when a
    // surface (e.g. the player-props panel) is open, close it AND switch the
    // bet mode in one action. Switch the mode FIRST and unconditionally, THEN
    // dismiss the surface — so the mode change is committed before any side
    // effect of closing the surface (its React unmount + a URL-unchanged
    // history.back()) can run. An earlier pass dismissed first and the
    // navigation got swallowed: the panel closed but the mode never changed,
    // so tapping PARLAY while props were open "exited" instead of switching.
    // betMode is plain React state (not URL/route-driven), so the surface's
    // history unwind can't revert it once it's set. A backdrop tap (handled
    // by the surface's own onClick) still just dismisses with no navigation.
    const handleBetModeTab = (modeId) => {
        if (onBetModeChange) onBetModeChange(modeId);
        dismissTopSurface();
    };
    const [showAccountPanel, setShowAccountPanel] = useState(false);
    // Payment-apps reminder for EXISTING players (accounts that predate the
    // payapps onboarding step and therefore are never gated on it): shown
    // while their payout handles are incomplete, dismissible per session
    // (sessionStorage → returns next login). New signups are excluded —
    // needsPaymentApps=true means the onboarding gate owns collection.
    const [payAppsBannerDismissed, setPayAppsBannerDismissed] = useState(() => {
        try { return sessionStorage.getItem('payAppsBannerDismissed') === '1'; } catch { return false; }
    });
    const showPayAppsBanner = role === 'user'
        && !!userOnboarding
        && userOnboarding.paymentAppsComplete === false
        && userOnboarding.needsPaymentApps !== true
        && !payAppsBannerDismissed;
    const dismissPayAppsBanner = () => {
        setPayAppsBannerDismissed(true);
        try { sessionStorage.setItem('payAppsBannerDismissed', '1'); } catch { /* private mode */ }
    };
    // Credit-style accounts run their cash balance at $0 and bet against the
    // credit line, so the "Available" / "Available Credit" headline tile
    // should report `creditAvailable` (creditLimit - balanceOwed). Cash
    // accounts (balance > 0) keep showing `availableBalance` so the number
    // matches what they can actually withdraw.
    const isCreditAccount = role === 'user' && Number(creditLimit) > 0;
    const headerAvailable = isCreditAccount ? creditAvailable : availableBalance;
    const accountUser = {
        id: userId,
        username,
        role,
        balance,
        pendingBalance,
        availableBalance,
        freeplayBalance,
        freeplayExpiresAt,
        creditLimit,
        creditAvailable,
        balanceOwed,
        nonPostedCasino,
        minBet,
        maxBet,
        // settings.betDefaults must round-trip into AccountPanel so the BET
        // DEFAULTS card hydrates from the saved values instead of the
        // hardcoded $50 / [10,25,50,100] fallbacks. Stripping settings here
        // was why Save Defaults appeared not to persist.
        settings: userSettings,
        // Payout app handles round-trip into AccountPanel's PAYMENT APPS
        // card the same way settings do for BET DEFAULTS.
        apps: userApps,
    };
    const { oddsFormat, setOddsFormat, isUpdatingOddsFormat } = useOddsFormat();
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

    // Tapping the BALANCE / PENDING / AVAILABLE summary anywhere in the
    // header should open My Bets on the Pending tab. Single navigation
    // target — no per-row separation — matches the reference book.
    //
    // The betslip (ModeBetPanel) is a separate fixed overlay (z-index
    // 1200) with its own local `isOpen` state, so simply switching the
    // underlying view leaves the slip on top covering My Bets — the user
    // experiences the click as a no-op even though navigation actually
    // ran. Firing `betslip:close` first dismisses the overlay; the slip's
    // selections live in App-level state (`slipSelections`) so they
    // persist for when the user comes back. The event is a no-op when
    // the slip isn't open, so we can dispatch it unconditionally.
    const goToMyBetsPending = () => {
        window.dispatchEvent(new CustomEvent('betslip:close', { detail: { source: 'header-balance' } }));
        setMyBetsInitialFilter('pending');
        if (onViewChange) onViewChange('my-bets');
    };

    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [showOddsModal, setShowOddsModal] = useState(false);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showPersonalizeSidebar, setShowPersonalizeSidebar] = useState(false);
    // Mirrors ModeBetPanel's local `isOpen` via a window event — when the
    // slip is open, the top-left header slot swaps from "☰ Sports" to
    // "← Back" so the user has a single dismiss target instead of an
    // extra in-slip Back row. Tapping the slot in this state fires
    // `betslip:close` (ModeBetPanel listens) and the slip collapses,
    // restoring the underlying odds board with its previous sport tab,
    // Up Next / Featured filter, and scroll position intact (the slip
    // is a fixed overlay, so the board behind it never re-mounts).
    const [betslipOpen, setBetslipOpen] = useState(false);
    useEffect(() => {
        const handleState = (e) => setBetslipOpen(Boolean(e?.detail?.open));
        window.addEventListener('betslip:state', handleState);
        return () => window.removeEventListener('betslip:state', handleState);
    }, []);

    // Mirrors `betslipOpen` for the matchup detail sheet (MatchDetailView).
    // When that sheet is open, the leftmost header cell turns into a sticky
    // Back button so the user always has a visible exit while scrolling
    // through the props list — the inline Back inside the sheet would scroll
    // away under the page chrome.
    const [matchDetailOpen, setMatchDetailOpen] = useState(false);
    useEffect(() => {
        const handleState = (e) => setMatchDetailOpen(Boolean(e?.detail?.open));
        window.addEventListener('match-detail:state', handleState);
        return () => window.removeEventListener('match-detail:state', handleState);
    }, []);

    // Continue is only meaningful on the odds board (where it commits the
    // user's sport-checkbox selection). Anywhere else — My Bets, Casino,
    // betslip overlay, etc. — there's nothing to "continue" toward, so
    // the top-right slot should be Account. We gate on currentView ===
    // 'dashboard' (so it never shows on My Bets even when checkboxes are
    // still selected behind the scenes) and !betslipOpen (so opening the
    // slip from any view also drops Continue).
    const showContinueButton = mobileViewState === 'selected' && hasRealSportSelection && !betslipOpen && currentView === 'dashboard';
    // Menu (the 9-square global app grid) stays in every state — even
    // when the betslip is open the user still needs a one-tap path to
    // global navigation (My Bets, settings, support). Earlier the Menu
    // button was hidden on the betslip view; that left the user with
    // only "Back" and no escape hatch into the rest of the app.
    const showMenuButton = true;
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
        return `$ ${Math.round(num).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    };

    // Compact two-decimal comma-separated formatter for the mobile header
    // balance cell. Matches probooknyc's "3,000.00" / "17,229.73" style and
    // stays narrow enough to share the row with four icon cells on small
    // viewports. Distinct from formatMoney() which the desktop block uses
    // (rounded integers with a leading "$").
    const formatBalanceCell = (value) => {
        if (unlimitedBalance) return 'Unl.';
        if (value === null || value === undefined || value === '') return '$0';
        const num = Number(value);
        if (Number.isNaN(num)) return '$0';
        return `$${Math.round(num).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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

    const balanceSignColor = (value) => {
        if (unlimitedBalance) return '#16a34a';
        const n = Number(value);
        if (!Number.isFinite(n) || n === 0) return '#ffffff';
        return n > 0 ? '#16a34a' : '#fca5a5';
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
        const tz = getSiteTimezone();
        const t = dt.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        return `Last update ${t} ${getSiteTimezoneLabel(tz)}`;
    }, [lastRealtimeEventAt]);

    return (
        <>
            {showPayAppsBanner && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#0f172a',
                    color: '#fff',
                    padding: '8px 12px',
                    fontSize: 12,
                }}>
                    <i className="fa-solid fa-money-bill-transfer" style={{ color: '#facc15', flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                        Add your payout app handles (Venmo, Cash App, Zelle…) so your agent can pay you faster.
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowAccountPanel(true)}
                        style={{ background: '#facc15', color: '#0f172a', border: 'none', borderRadius: 6, padding: '7px 12px', fontWeight: 800, fontSize: 11, letterSpacing: 0.4, cursor: 'pointer', textTransform: 'uppercase', flexShrink: 0 }}
                    >
                        Add Now
                    </button>
                    <button
                        type="button"
                        onClick={dismissPayAppsBanner}
                        aria-label="Dismiss payment apps reminder"
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer', padding: '6px 8px', lineHeight: 1, flexShrink: 0 }}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>
            )}
            <div className="mobile-header-container mobile-only">
                {/* 5-cell mobile header — order:
                    [Sport (3-line list icon)] [Menu (9-square grid icon)]
                    [Balance / Pending / Available middle] [Betslip] [Account].
                    Icon cells black, balance cell muted gray and flex-grows
                    to fill the middle. Sport opens the sport-categories view
                    via the same target as MobileGridMenu's "Sports" tile;
                    Menu opens the global app grid (MobileGridMenu) via
                    onToggleSidebar. Account stays on the far right. */}
                <div
                    className="top-header"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        alignItems: 'stretch',
                        padding: 0,
                        minHeight: 64,
                        // Cell dividers are drawn by this background showing through
                        // 1px grid gaps — NOT per-cell borders, which landed on
                        // fractional device pixels and dropped (e.g. the
                        // Betslip|Balance line vanished at some widths/DPRs). Kept
                        // only a hair darker than the #595959 cells so the lines
                        // read as a faint hairline, not a bold black rule.
                        gap: '1.5px',
                        background: '#201f1f',
                    }}
                >
                    {(() => {
                        // Sports cell doubles as a Back affordance whenever
                        // there's a screen above the sport-selection menu
                        // the user can return to: an open match-detail
                        // overlay, the betslip overlay, OR the mobile
                        // results view (sport already selected, looking
                        // at games). Without the results-view branch,
                        // a user who'd picked Baseball and tapped
                        // Continue had no way to go back and add Hockey
                        // without first emptying their selection — they
                        // had to find another way out of the results
                        // page. Routing the same cell to onMobileBack
                        // preserves the selection and reopens the menu.
                        const inResults = mobileViewState === 'results';
                        const showBack = matchDetailOpen || betslipOpen || inResults;
                        return (
                            <button
                                type="button"
                                onClick={() => {
                                    if (matchDetailOpen) {
                                        window.dispatchEvent(new CustomEvent('match-detail:close', { detail: { source: 'header' } }));
                                    } else if (betslipOpen) {
                                        window.dispatchEvent(new CustomEvent('betslip:close', { detail: { source: 'header' } }));
                                    } else if (inResults && onMobileBack) {
                                        onMobileBack();
                                    } else if (onViewChange) {
                                        onViewChange('dashboard');
                                    }
                                }}
                                aria-label={showBack ? 'Back' : 'Sports categories'}
                                style={mhCellBtnStyle}
                            >
                                <i
                                    className={showBack ? 'fa-solid fa-arrow-left' : 'fa-solid fa-bars'}
                                    style={mhCellIconStyle}
                                ></i>
                                <span style={mhCellLabelStyle}>{showBack ? 'Back' : 'Sports'}</span>
                            </button>
                        );
                    })()}

                    {showMenuButton && (
                        <button
                            type="button"
                            onClick={() => {
                                // Dismiss the betslip overlay first. The slip
                                // (ModeBetPanel) is a fixed z-index:1200 layer
                                // while the menu grid renders at z-index:1000,
                                // so opening the menu while the slip is up puts
                                // it BEHIND the slip — invisible, so the tap
                                // reads as a no-op. Same fix as the Balance
                                // cell (goToMyBetsPending). The slip's
                                // selections live in App state, so this only
                                // hides the overlay; it's a no-op when closed.
                                window.dispatchEvent(new CustomEvent('betslip:close', { detail: { source: 'header-menu' } }));
                                if (onToggleSidebar) onToggleSidebar();
                            }}
                            aria-label="Open menu"
                            style={mhCellBtnStyle}
                        >
                            <i className="fa-solid fa-th" style={mhCellIconStyle}></i>
                            <span style={mhCellLabelStyle}>Menu</span>
                        </button>
                    )}

                    <button
                        type="button"
                        className="header-balance-cell"
                        style={mhBalanceCellStyle}
                        onClick={goToMyBetsPending}
                        aria-label="View my bets"
                    >
                        <div style={mhBalanceRowStyle}>
                            <span style={mhBalanceHeroLabelStyle}>Balance</span>
                            <span style={{ ...mhBalanceHeroValueStyle, color: balanceSignColor(balance) }}>
                                {formatBalanceCell(balance)}
                            </span>
                        </div>
                        <div style={mhBalanceRowDividerStyle} />
                        <div style={mhBalanceRowStyle}>
                            <span style={mhBalanceHeroLabelStyle}>Pending</span>
                            <span style={{ ...mhBalanceHeroValueStyle, color: '#ffffff' }}>
                                {formatBalanceCell(pendingBalance)}
                            </span>
                        </div>
                        <div style={mhBalanceRowDividerStyle} />
                        <div style={mhBalanceRowStyle}>
                            <span style={mhBalanceHeroLabelStyle}>Available</span>
                            <span style={{ ...mhBalanceHeroValueStyle, color: '#ffffff' }}>
                                {formatBalanceCell(headerAvailable)}
                            </span>
                        </div>
                        {/* Freeplay row — only renders when the player has
                            a freeplay balance, so users without any freeplay
                            keep the original 3-row layout. Without this the
                            deduction during a partial-freeplay bet looked
                            invisible: the bet went through, freeplayBalance
                            dropped on the backend, but no UI element in the
                            mobile header surfaced that pool. */}
                        {Number(freeplayBalance) > 0 && (
                            <>
                            <div style={mhBalanceRowDividerStyle} />
                            <div style={mhBalanceRowStyle}>
                                <span style={mhBalanceHeroLabelStyle}>Freeplay</span>
                                <span style={{ ...mhBalanceHeroValueStyle, color: '#16a34a' }}>
                                    {formatBalanceCell(freeplayBalance)}
                                </span>
                            </div>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('betslip:open', { detail: { source: 'header' } }))}
                        aria-label={`Open bet slip${slipCount ? ` — ${slipCount} selection${slipCount === 1 ? '' : 's'}` : ''}`}
                        style={mhCellBtnStyle}
                    >
                        <span style={mhBetslipCircleStyle}>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    fontVariantNumeric: 'tabular-nums',
                                    color: slipCount > 0 ? '#16a34a' : '#000',
                                }}
                            >
                                {slipCount > 99 ? '99+' : slipCount}
                            </span>
                        </span>
                        <span style={mhCellLabelStyle}>Betslip</span>
                    </button>

                    {showContinueButton ? (
                        // While the user has 1+ real sport checkboxes
                        // selected on the sports list, the top-right slot
                        // becomes the Continue action so they don't have
                        // to chase a floating bottom button. Tapping it
                        // routes through the same `onContinue` the old FAB
                        // used (App promotes mobileViewState → 'results'),
                        // which immediately swaps this slot back to Account.
                        <button
                            type="button"
                            onClick={onContinue}
                            aria-label="Continue with selected sports"
                            style={{
                                ...mhCellBtnStyle,
                                borderRight: 'none',
                                background: '#16a34a',
                                color: '#fff',
                            }}
                        >
                            <i className="fa-solid fa-chevron-right" style={{ ...mhCellIconStyle, color: '#fff' }}></i>
                            <span style={{ ...mhCellLabelStyle, color: '#fff' }}>Continue</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowAccountPanel(true)}
                            aria-label="Open account panel"
                            style={{ ...mhCellBtnStyle, borderRight: 'none' }}
                        >
                            <i className="fa-solid fa-user" style={mhCellIconStyle}></i>
                            <span style={mhCellLabelStyle}>Account</span>
                        </button>
                    )}
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

                {(currentView === 'dashboard' || betslipOpen) && (
                    // STRAIGHT/PARLAY/TEASER/IF BET/REVERSE only make sense
                    // inside the betting flow — the odds board (currentView
                    // === 'dashboard') or the betslip overlay (which can be
                    // opened from any view via the header Betslip cell).
                    // Other static views — My Bets, Casino, Bonus, Support
                    // — don't drive a bet mode, so the tabs were just
                    // visual noise sitting above unrelated content. The
                    // betslip-open carve-out also matters because the
                    // mobile slip is a fixed overlay positioned at top:
                    // 124, which assumes both the 64px header AND this
                    // 60px tabs row are present above it.
                    //
                    // The earlier `mobileViewState !== 'browsing'` guard was
                    // dropped so the front sports page (no sport selected
                    // yet — the landing/browsing state) also shows the bet-
                    // mode row, matching the desktop subheader which has
                    // always rendered the same tabs unconditionally on the
                    // dashboard view.
                    <div className="tabs-bar">
                        {[
                            { id: 'straight', label: 'STRAIGHT', letter: 'S' },
                            { id: 'parlay', label: 'PARLAY', letter: 'P' },
                            { id: 'open_parlay', label: 'OPEN', letter: 'OP' },
                            { id: 'teaser', label: 'TEASER', letter: 'T' },
                            { id: 'round_robin', label: 'R ROBIN', letter: 'RR' },
                            { id: 'if_bet', label: 'IF BET', letter: 'I' },
                            { id: 'reverse', label: 'REVERSE', letter: 'R' }
                        ].map((mode) => (
                            <div
                                key={mode.id}
                                className={`tab-item ${activeBetMode === mode.id ? 'active' : ''}`}
                                onClick={() => handleBetModeTab(mode.id)}
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
                        onClick={() => {
                            if (matchDetailOpen) {
                                window.dispatchEvent(new CustomEvent('match-detail:close', { detail: { source: 'header' } }));
                            } else if (betslipOpen) {
                                window.dispatchEvent(new CustomEvent('betslip:close', { detail: { source: 'header' } }));
                            } else if (onHomeClick) {
                                onHomeClick();
                            }
                        }}
                    >
                        <span>{(matchDetailOpen || betslipOpen) ? 'BACK' : 'SPORTS'}</span>
                        <div className="dash-nav-icon">
                            {(matchDetailOpen || betslipOpen) ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" /><path d="M2.5 12h19M12 2.5v19" /></svg>
                            )}
                        </div>
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
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', border: '1px solid #999', padding: '0 2px' }}>Props</div>
                                </div>
                            </div>
                        )}
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
                    {/* Single tap target spanning all three balance cells —
                        a click anywhere in BALANCE / PENDING / AVAILABLE
                        opens My Bets on the Pending tab. */}
                    <button
                        type="button"
                        className="dash-balance-trigger"
                        onClick={goToMyBetsPending}
                        aria-label="View my bets"
                    >
                        <div className="dash-balance">
                            <span>{role === 'user' ? 'BALANCE' : 'CREDIT LIMIT'}</span>
                            <strong>{formatMoney(balance)}</strong>
                        </div>
                        <div className="dash-balance">
                            <span>PENDING</span>
                            <strong>{formatMoney(pendingBalance)}</strong>
                        </div>
                        <div className="dash-balance">
                            <span>AVAILABLE CREDIT</span>
                            <strong>{formatMoney(headerAvailable)}</strong>
                        </div>
                        {/* Freeplay cell — only renders when the player has
                            a freeplay balance; otherwise the desktop header
                            stays at three cells. Mirrors the mobile header
                            row added in the same change. */}
                        {Number(freeplayBalance) > 0 && (
                            <div className="dash-balance">
                                <span>FREEPLAY</span>
                                <strong style={{ color: '#16a34a' }}>{formatMoney(freeplayBalance)}</strong>
                            </div>
                        )}
                    </button>

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
                                <div className="usd-item" onClick={() => onViewChange && onViewChange('rules')}>
                                    <div className="usd-icon"><i className="fa-solid fa-scale-balanced"></i></div>
                                    <div className="usd-text">Rules</div>
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


            {currentView !== 'rules' && (
                <>


                    <div className={`dash-subheader mobile-subheader desktop-only ${withSidebarOffset ? 'with-sidebar-offset' : ''}`} style={{ display: 'flex', borderBottom: '1px solid #ccc', height: 'auto', minHeight: '60px' }}>


                        <div className="bet-type-bar">
                            {[
                                { id: 'straight', label: 'STRAIGHT', icon: 'S' },
                                { id: 'parlay', label: 'PARLAY', icon: 'P' },
                                { id: 'open_parlay', label: 'OPEN', icon: 'OP' },
                                { id: 'teaser', label: 'TEASER', icon: 'T' },
                                { id: 'round_robin', label: 'R ROBIN', icon: 'RR' },
                                { id: 'if_bet', label: 'IF BET', icon: 'I' },
                                { id: 'reverse', label: 'REVERSE', icon: 'R' }
                            ].map((mode) => (
                                <div
                                    key={mode.id}
                                    className={`bet-type-item ${activeBetMode === mode.id ? 'active' : ''}`}
                                    onClick={() => handleBetModeTab(mode.id)}
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
                                {languages.map((lang) => (
                                    <div key={lang.name} style={{
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
                                            width="24"
                                            height="16"
                                            loading="lazy"
                                            decoding="async"
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
                        availableBalance={headerAvailable}
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
