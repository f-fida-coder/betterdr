import React from 'react';
import { useOddsFormat } from '../contexts/OddsFormatContext';

const LANGUAGES = [
    'English',
    'Spanish',
    'Portuguese',
    'Chinese',
    'Japanese',
    'Korean',
    'Vietnamese',
];

const ODDS_FORMAT_LABELS = {
    american: 'American Price',
    decimal: 'Decimal Price',
    fractional: 'Fractional Price',
};

const formatMoney = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0.00';
    return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const AccountPanel = ({
    open,
    onClose,
    user,
    onViewChange,
    onLogout,
    themeMode = 'light',
    onThemeModeChange,
}) => {
    const { oddsFormat, setOddsFormat, isUpdatingOddsFormat } = useOddsFormat();
    const [language, setLanguage] = React.useState('English');

    // Lock body scroll while the sheet is open on mobile.
    React.useEffect(() => {
        if (!open) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [open]);

    if (!open) return null;

    const username = user?.username || 'Guest';
    const available = user?.availableBalance ?? user?.balance ?? 0;
    const pending = user?.pendingBalance ?? 0;
    const balance = user?.balance ?? 0;
    const freeplay = user?.freeplayBalance ?? 0;
    const nonPostedCasino = user?.nonPostedCasino ?? 0;
    const role = String(user?.role || 'user').toLowerCase();
    const isAgentLike = role === 'agent' || role === 'super_agent' || role === 'master_agent' || role === 'admin';

    const go = (view) => {
        onClose?.();
        onViewChange?.(view);
    };

    const overlayStyle = {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
    };
    const sheetStyle = {
        background: '#f4f5f7',
        color: '#111',
        width: '100%',
        maxWidth: 520,
        height: '100vh',
        overflowY: 'auto',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
    };
    const titleBarStyle = {
        background: '#d0451b',
        color: '#fff',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: 0.4,
    };
    const closeBtnStyle = {
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.7)',
        color: '#fff',
        width: 30,
        height: 30,
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 16,
        lineHeight: 1,
    };
    const rowStyle = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: '#ffffff',
        borderBottom: '1px solid #e5e6ea',
    };
    const cellStyle = {
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        borderRight: '1px solid #e5e6ea',
    };
    const cellStyleLast = { ...cellStyle, borderRight: 'none' };
    const labelStyle = { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4 };
    const valueStyle = { fontSize: 15, fontWeight: 700, color: '#111' };
    const selectStyle = {
        appearance: 'none',
        WebkitAppearance: 'none',
        background: '#fff url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23666\'><path d=\'M7 10l5 5 5-5z\'/></svg>") no-repeat right 8px center / 14px',
        border: '1px solid #c9cbd1',
        borderRadius: 6,
        padding: '8px 28px 8px 10px',
        fontSize: 13,
        color: '#111',
        width: '100%',
    };
    const toggleWrapStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    };
    const toggleBtnStyle = {
        border: '1px solid #c9cbd1',
        borderRadius: 999,
        padding: '4px 12px',
        background: '#fff',
        color: '#111',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
    };
    const actionRowStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        padding: '14px 16px',
    };
    const actionBtnStyle = (accent) => ({
        background: accent ? '#d0451b' : '#111',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '12px 8px',
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: 0.4,
        cursor: 'pointer',
    });
    const pillRowStyle = {
        display: 'flex',
        gap: 8,
        padding: '0 16px 14px',
        justifyContent: 'flex-end',
    };
    const pillBtnStyle = (accent) => ({
        background: accent ? '#d0451b' : '#111',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '8px 14px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
    });

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
                <div style={titleBarStyle}>
                    <span>MY ACCOUNT : {username.toUpperCase()}</span>
                    <button type="button" style={closeBtnStyle} onClick={onClose} aria-label="Close account panel">×</button>
                </div>

                <div style={rowStyle}>
                    <div style={cellStyle}>
                        <select
                            style={selectStyle}
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            aria-label="Language"
                        >
                            {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>
                    <div style={cellStyleLast}>
                        <select
                            style={selectStyle}
                            value={oddsFormat}
                            onChange={(e) => setOddsFormat(e.target.value)}
                            disabled={isUpdatingOddsFormat}
                            aria-label="Odds format"
                        >
                            {Object.entries(ODDS_FORMAT_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={rowStyle}>
                    <div style={cellStyle}>
                        <span style={labelStyle}>Available</span>
                        <span style={valueStyle}>{formatMoney(available)}</span>
                    </div>
                    <div style={cellStyleLast}>
                        <span style={labelStyle}>Pending</span>
                        <span style={valueStyle}>{formatMoney(pending)}</span>
                    </div>
                </div>

                <div style={rowStyle}>
                    <div style={cellStyle}>
                        <span style={labelStyle}>Balance</span>
                        <span style={{ ...valueStyle, color: Number(balance) < 0 ? '#c2272d' : '#111' }}>{formatMoney(balance)}</span>
                    </div>
                    <div style={cellStyleLast}>
                        <span style={labelStyle}>Free Play</span>
                        <span style={valueStyle}>{formatMoney(freeplay)}</span>
                    </div>
                </div>

                <div style={rowStyle}>
                    <div style={cellStyle}>
                        <span style={labelStyle}>Non Posted Casino</span>
                        <span style={valueStyle}>{formatMoney(nonPostedCasino)}</span>
                    </div>
                    <div
                        style={{ ...cellStyleLast, cursor: 'pointer', justifyContent: 'center' }}
                        onClick={() => go('messages')}
                        role="button"
                        tabIndex={0}
                    >
                        <i className="fa-solid fa-envelope" style={{ fontSize: 18, color: '#555' }} />
                    </div>
                </div>

                <div style={rowStyle}>
                    <div
                        style={{ ...cellStyle, cursor: 'pointer', justifyContent: 'center', alignItems: 'center' }}
                        onClick={() => go('rules')}
                        role="button"
                        tabIndex={0}
                    >
                        <span style={{ fontSize: 14, fontWeight: 700 }}>Rules</span>
                    </div>
                    <div style={cellStyleLast}>
                        <div style={toggleWrapStyle}>
                            <span style={{ fontSize: 13, color: '#444' }}>Mode</span>
                            <button
                                type="button"
                                style={toggleBtnStyle}
                                onClick={() => onThemeModeChange?.(themeMode === 'dark' ? 'light' : 'dark')}
                            >
                                {themeMode === 'dark' ? 'Dark' : 'Light'}
                            </button>
                        </div>
                    </div>
                </div>

                {isAgentLike && (
                    <div style={actionRowStyle}>
                        <button type="button" style={actionBtnStyle(true)} onClick={() => go('reports')}>REPORTS</button>
                        <button type="button" style={actionBtnStyle(false)} onClick={() => go('daily-figure')}>DAILY FIGURE</button>
                        <button type="button" style={actionBtnStyle(false)} onClick={() => go('transactions')}>TRANSACTIONS</button>
                    </div>
                )}

                <div style={pillRowStyle}>
                    <button type="button" style={pillBtnStyle(true)} onClick={() => go('my-bets')}>My Bets</button>
                    <button type="button" style={pillBtnStyle(false)} onClick={() => go('my-bets')}>Graded</button>
                    <button type="button" style={pillBtnStyle(false)} onClick={() => go('my-bets')}>Open Bets</button>
                </div>

                <div style={{ marginTop: 'auto', padding: '16px' }}>
                    <button
                        type="button"
                        onClick={() => { onClose?.(); onLogout?.(); }}
                        style={{
                            width: '100%',
                            background: '#111',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '12px',
                            fontWeight: 800,
                            letterSpacing: 0.6,
                            fontSize: 13,
                            cursor: 'pointer',
                        }}
                    >
                        <i className="fa-solid fa-power-off" style={{ marginRight: 8 }} /> SIGN OUT
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountPanel;
