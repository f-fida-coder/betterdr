import React from 'react';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { updateProfile, getStoredAuthToken } from '../api';
import { useToast } from '../contexts/ToastContext';

const DEFAULT_QUICK_STAKES = [10, 25, 50, 100];
// `bet` was removed — it behaved identically to `risk` and confused users
// into thinking it was a separate mode. Saved profiles still on `bet` are
// silently coerced to `risk` at read time so the pill row never shows a
// third option.
const STAKE_MODE_OPTIONS = [
    { id: 'risk', label: 'Risk' },
    { id: 'win', label: 'Win' },
];

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
    american: 'American',
    decimal: 'Decimal',
    fractional: 'Fractional',
};

// Local design tokens so the panel has its own consistent visual system
// without spilling more one-off colours into the global theme.
// Brand accent aligned with the new black mobile header — slate-to-black
// gradient replaces the previous orange. Warn semantics (Non-Posted Casino)
// promoted to its own amber token so it still reads as a caution tile
// instead of blending into the neutral slate.
const palette = {
    bg: '#f1f5f9',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
    textFaint: '#94a3b8',
    brand: '#0f172a',
    brandDark: '#000000',
    brandSoft: '#e2e8f0',
    success: '#16a34a',
    successSoft: '#dcfce7',
    danger: '#dc2626',
    dangerSoft: '#fee2e2',
    info: '#1e40af',
    infoSoft: '#dbeafe',
    warn: '#b45309',
    warnIcon: '#d97706',
    warnSoft: '#fef3c7',
    slate: '#0f172a',
    slateSoft: '#f1f5f9',
};

const formatMoney = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0';
    return Math.ceil(number).toLocaleString(undefined, { maximumFractionDigits: 0 });
};

// Whole-dollar formatter — same as formatMoney now (ceil), kept as separate
// export because callers depend on the name. Both round up to the nearest
// dollar so balances never display fractional cents.
const formatMoneyWhole = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0';
    return Math.ceil(number).toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const initialsOf = (name) => {
    if (!name) return '?';
    const trimmed = String(name).trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ---------- small visual primitives ---------- */

const SelectField = ({ label, value, onChange, options, disabled, icon }) => (
    <label style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
    }}>
        <span style={{
            fontSize: 10,
            color: palette.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
        }}>
            {icon && <i className={`fa-solid ${icon}`} style={{ color: palette.textFaint }} />}
            {label}
        </span>
        <div style={{
            position: 'relative',
            background: palette.cardBg,
            border: `1px solid ${palette.cardBorder}`,
            borderRadius: 10,
            overflow: 'hidden',
        }}>
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    border: 'none',
                    outline: 'none',
                    padding: '11px 36px 11px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: palette.textPrimary,
                    width: '100%',
                    background: 'transparent',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                }}
            >
                {options.map(({ value: v, label: l }) => (
                    <option key={v} value={v}>{l}</option>
                ))}
            </select>
            <i
                className="fa-solid fa-chevron-down"
                style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 10,
                    color: palette.textFaint,
                    pointerEvents: 'none',
                }}
            />
        </div>
    </label>
);

const RowButton = ({ icon, label, sublabel, onClick, trailing, danger }) => (
    <button
        type="button"
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            background: palette.cardBg,
            border: `1px solid ${palette.cardBorder}`,
            borderRadius: 12,
            padding: '12px 14px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 120ms ease, background 120ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = palette.slate; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = palette.cardBorder; }}
    >
        <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: danger ? palette.dangerSoft : palette.slateSoft,
            color: danger ? palette.danger : palette.slate,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
        }}>
            <i className={`fa-solid ${icon}`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: palette.textPrimary }}>{label}</div>
            {sublabel && <div style={{ fontSize: 11, color: palette.textMuted, marginTop: 2 }}>{sublabel}</div>}
        </div>
        {trailing ?? <i className="fa-solid fa-chevron-right" style={{ fontSize: 11, color: palette.textFaint }} />}
    </button>
);


/* ---------- bet defaults card ---------- */

const BetDefaultsCard = ({ user, onSaved }) => {
    const { showToast } = useToast();
    const stored = (user?.settings?.betDefaults && typeof user.settings.betDefaults === 'object')
        ? user.settings.betDefaults
        : null;
    // Min/Max bet come from the admin-set player limits (user.minBet,
    // user.maxBet on /auth/me). They drive the leftmost / rightmost chips
    // as read-only "Min Bet" / "Max Bet" buttons; the middle two slots stay
    // user-editable. Falling back to project defaults keeps the layout
    // stable when an admin hasn't set limits yet.
    const playerMinBet = Number(user?.minBet);
    const playerMaxBet = Number(user?.maxBet);
    const lockedMin = Number.isFinite(playerMinBet) && playerMinBet > 0 ? Math.round(playerMinBet) : DEFAULT_QUICK_STAKES[0];
    const lockedMax = Number.isFinite(playerMaxBet) && playerMaxBet > 0 ? Math.round(playerMaxBet) : DEFAULT_QUICK_STAKES[3];

    const initialMode = stored?.mode === 'win' ? 'win' : 'risk';
    const initialAmount = Number.isFinite(Number(stored?.amount)) && Number(stored.amount) > 0
        ? String(stored.amount)
        : '';
    // Only positions 1 & 2 are editable; position 0 = lockedMin, position 3 =
    // lockedMax. Pull the saved customizations from positions 1 & 2 of the
    // stored array (whatever shape was saved before — if a previous version
    // saved 4 fully-custom values, the outer two are silently overridden).
    const initialMid1 = Array.isArray(stored?.quickStakes) && stored.quickStakes[1] != null
        ? String(stored.quickStakes[1])
        : String(DEFAULT_QUICK_STAKES[1]);
    const initialMid2 = Array.isArray(stored?.quickStakes) && stored.quickStakes[2] != null
        ? String(stored.quickStakes[2])
        : String(DEFAULT_QUICK_STAKES[2]);

    const [mode, setMode] = React.useState(initialMode);
    const [amount, setAmount] = React.useState(initialAmount);
    const [midStakes, setMidStakes] = React.useState([initialMid1, initialMid2]);
    const [saving, setSaving] = React.useState(false);
    // The composed 4-chip array shown in the UI: [Min, mid1, mid2, Max].
    const quickStakes = [String(lockedMin), midStakes[0], midStakes[1], String(lockedMax)];
    // Reseed local form state when the user prop updates (e.g. after
    // /auth/me re-fetches and brings down a fresh `settings.betDefaults`).
    React.useEffect(() => {
        const next = user?.settings?.betDefaults;
        if (!next) return;
        if (next.mode === 'win' || next.mode === 'risk') setMode(next.mode);
        else if (next.mode === 'bet') setMode('risk'); // legacy → coerce
        if (Number.isFinite(Number(next.amount))) setAmount(String(next.amount || ''));
        if (Array.isArray(next.quickStakes) && next.quickStakes.length === 4) {
            setMidStakes([String(next.quickStakes[1] ?? ''), String(next.quickStakes[2] ?? '')]);
        }
    }, [user?.settings?.betDefaults]);

    const updateQuickStake = (idx, raw) => {
        // Outer chips are bound to admin Min/Max; only middle 2 slots accept
        // user input. Silently no-op on the locked positions so the existing
        // grid <input onChange> wiring works unchanged.
        if (idx === 0 || idx === 3) return;
        const cleaned = String(raw).replace(/[^0-9]/g, '').slice(0, 6);
        const midIdx = idx - 1; // 1 → 0, 2 → 1
        setMidStakes((prev) => prev.map((v, i) => (i === midIdx ? cleaned : v)));
    };

    const handleSave = async () => {
        const token = getStoredAuthToken();
        if (!token) {
            showToast?.('Sign in to save defaults', 'warning');
            return;
        }
        const parsedAmount = Number(amount);
        if (amount !== '' && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
            showToast?.('Default amount must be a positive number', 'warning');
            return;
        }
        const parsedQuickStakes = quickStakes.map((v) => Number(v));
        if (parsedQuickStakes.some((n) => !Number.isFinite(n) || n <= 0)) {
            showToast?.('Quick stake values must be positive numbers', 'warning');
            return;
        }
        setSaving(true);
        try {
            await updateProfile({
                settings: {
                    betDefaults: {
                        mode,
                        amount: amount === '' ? 0 : Math.round(parsedAmount * 100) / 100,
                        quickStakes: parsedQuickStakes,
                    },
                },
            }, token);
            showToast?.('Bet defaults saved', 'success');
            // Trigger refresh of the cached user so other components
            // (ModeBetPanel hydration) see the new defaults immediately.
            window.dispatchEvent(new Event('user:refresh'));
            onSaved?.();
        } catch (err) {
            showToast?.(err?.message || 'Failed to save bet defaults', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section>
            <div style={{
                fontSize: 11,
                color: palette.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                fontWeight: 700,
                marginBottom: 8,
                paddingLeft: 2,
            }}>
                Bet defaults
            </div>
            <div style={{
                background: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
            }}>
                {/* Default mode pills */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                        Default mode
                    </div>
                    <div style={{
                        display: 'inline-flex',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: `1px solid ${palette.cardBorder}`,
                    }}>
                        {STAKE_MODE_OPTIONS.map((m, i) => {
                            const active = mode === m.id;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setMode(m.id)}
                                    style={{
                                        background: active
                                            ? (m.id === 'risk' ? '#ea580c' : m.id === 'win' ? '#16a34a' : '#0f172a')
                                            : '#475569',
                                        color: '#fff',
                                        border: 'none',
                                        borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                        padding: '8px 18px',
                                        fontWeight: 800,
                                        fontSize: 12,
                                        letterSpacing: 0.4,
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {m.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Default amount */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                        Default amount (unit size)
                    </div>
                    <div style={{
                        position: 'relative',
                        border: `1px solid ${palette.cardBorder}`,
                        borderRadius: 8,
                        background: '#fbfbfd',
                    }}>
                        <span style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: 13,
                            fontWeight: 700,
                            color: palette.textFaint,
                            pointerEvents: 'none',
                        }}>$</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            placeholder="50"
                            value={amount}
                            onChange={(e) => setAmount(String(e.target.value).replace(/\D/g, ''))}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 24px',
                                border: 'none',
                                outline: 'none',
                                fontSize: 14,
                                fontWeight: 700,
                                color: palette.textPrimary,
                                background: 'transparent',
                                boxSizing: 'border-box',
                                borderRadius: 8,
                            }}
                        />
                    </div>
                </div>

                {/* Quick stake chips — leftmost/rightmost auto-bound to the
                    admin-set Min/Max bet (read-only); middle two are
                    user-customizable and persist into settings.betDefaults.
                    Validation is win-anchored under the hood (the value
                    shown is the per-ticket WIN cap), but the chip label
                    reads "Min Bet" / "Max Bet" — the universal sportsbook
                    shorthand — and the betslip's inline warning explains
                    the win-anchored rule when it bites. */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                        Quick stake buttons
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
                        {quickStakes.map((value, idx) => {
                            const locked = idx === 0 || idx === 3;
                            const lockedLabel = idx === 0 ? 'Min Bet' : idx === 3 ? 'Max Bet' : '';
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        position: 'relative',
                                        border: `1px solid ${palette.cardBorder}`,
                                        borderRadius: 8,
                                        background: locked ? '#f1f5f9' : '#fbfbfd',
                                    }}
                                >
                                    <span style={{
                                        position: 'absolute',
                                        left: 8,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: palette.textFaint,
                                        pointerEvents: 'none',
                                    }}>$</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        readOnly={locked}
                                        value={value}
                                        onChange={(e) => updateQuickStake(idx, e.target.value)}
                                        title={locked ? `${lockedLabel} (set by your agent)` : undefined}
                                        style={{
                                            width: '100%',
                                            padding: '8px 6px 8px 18px',
                                            border: 'none',
                                            outline: 'none',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: palette.textPrimary,
                                            background: 'transparent',
                                            boxSizing: 'border-box',
                                            borderRadius: 8,
                                            textAlign: 'center',
                                            cursor: locked ? 'not-allowed' : 'text',
                                        }}
                                    />
                                    {locked && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: -16,
                                            left: 0,
                                            right: 0,
                                            textAlign: 'center',
                                            fontSize: 9,
                                            fontWeight: 700,
                                            color: palette.textFaint,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.4,
                                        }}>
                                            {lockedLabel}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        background: '#facc15',
                        color: '#0f172a',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontWeight: 800,
                        fontSize: 13,
                        letterSpacing: 0.4,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                        textTransform: 'uppercase',
                    }}
                >
                    {saving ? 'Saving…' : 'Save Defaults'}
                </button>
            </div>
        </section>
    );
};

/* ---------- main panel ---------- */

const AccountPanel = ({
    open,
    onClose,
    user,
    onViewChange,
    onLogout,
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
    const pending = user?.pendingBalance ?? 0;
    const balance = user?.balance ?? 0;
    // Credit line the user can still wager against = creditLimit - balanceOwed.
    // Backend now ships the computed `creditAvailable`; we prefer it and
    // fall back to the raw limit so older payloads still render something
    // meaningful instead of $0.
    const creditAvailable = user?.creditAvailable ?? user?.creditLimit ?? 0;
    const role = String(user?.role || 'user').toLowerCase();
    // AVAILABLE column for the top tile mirrors DashboardHeader: credit
    // accounts (role=user with creditLimit > 0) bet against the credit
    // line, so "Available" is creditAvailable; cash accounts use the
    // straight balance - pending. Without this split a credit account
    // would see AVAILABLE = $0 here even though they can wager.
    const isCreditAccount = role === 'user' && Number(user?.creditLimit ?? 0) > 0;
    const headerAvailable = isCreditAccount
        ? Number(creditAvailable) || 0
        : Number(user?.availableBalance ?? user?.balance ?? 0) || 0;
    const isAgentLike = role === 'agent' || role === 'super_agent' || role === 'master_agent' || role === 'admin';
    const roleLabel = {
        user: 'Login',
        agent: 'Agent',
        super_agent: 'Super Agent',
        master_agent: 'Master Agent',
        admin: 'Admin',
    }[role] || 'Login';
    const heroLabel = roleLabel;
    // Hero spec block under the username — admin-set limits the player needs
    // to see at a glance. Min/Max bet come from /auth/me (j_min_bet, j_max_bet
    // on the user doc); Credit Limit is creditLimit; Settle Limit reflects
    // `balanceOwed` which on a player record is the +/- settle threshold the
    // admin types into the form, not actual debt. Whole-dollar formatting so
    // the four lines stay visually balanced.
    const minBetSpec = Number(user?.minBet);
    const maxBetSpec = Number(user?.maxBet);
    const creditLimitSpec = Number(user?.creditLimit);
    const settleLimitSpec = Number(user?.balanceOwed);
    const heroSpecs = [
        { label: 'Min Bet', value: Number.isFinite(minBetSpec) && minBetSpec > 0 ? `$${formatMoneyWhole(minBetSpec)}` : '—' },
        { label: 'Max Bet', value: Number.isFinite(maxBetSpec) && maxBetSpec > 0 ? `$${formatMoneyWhole(maxBetSpec)}` : '—' },
        { label: 'Credit Limit', value: Number.isFinite(creditLimitSpec) && creditLimitSpec > 0 ? `$${formatMoneyWhole(creditLimitSpec)}` : '—' },
        { label: 'Settle Limit', value: Number.isFinite(settleLimitSpec) && settleLimitSpec > 0 ? `± $${formatMoneyWhole(settleLimitSpec)}` : '—' },
    ];

    const go = (view) => {
        onClose?.();
        onViewChange?.(view);
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Account"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15,23,42,0.55)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'stretch',
                justifyContent: 'flex-end',
                backdropFilter: 'blur(2px)',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: palette.bg,
                    color: palette.textPrimary,
                    width: '100%',
                    maxWidth: 520,
                    // 100vh on iOS Safari includes the URL toolbar, which
                    // pushed the sticky SIGN OUT footer below the visible
                    // viewport. 100dvh is the dynamic viewport height that
                    // tracks toolbar collapse/expand; the 100vh value is a
                    // fallback for older browsers that ignore the dvh unit.
                    height: '100vh',
                    maxHeight: '100dvh',
                    overflowY: 'auto',
                    boxShadow: '-20px 0 60px rgba(15,23,42,0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header strip — LOGIN/USERNAME + close button. Light
                    surface, matches the rest of the panel so switching
                    between tabs (Account ↔ Pending ↔ Graded ↔ Figures ↔
                    Transactions) feels like one continuous app rather
                    than jumping into a dark nav block. */}
                <div style={{
                    background: palette.cardBg,
                    padding: '14px 16px',
                    borderBottom: `1px solid ${palette.cardBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 0.7,
                            fontWeight: 700,
                            color: palette.textMuted,
                            marginBottom: 2,
                        }}>
                            {heroLabel}
                        </div>
                        <div style={{
                            fontSize: 18,
                            fontWeight: 800,
                            letterSpacing: 0.2,
                            color: palette.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {username}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close account panel"
                        style={{
                            width: 32,
                            height: 32,
                            border: `1px solid ${palette.cardBorder}`,
                            background: '#fff',
                            color: palette.textPrimary,
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = palette.slateSoft; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 16px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Live balances — 3 white stat cards in a grid,
                        same shape as the Total Tickets / Pending tiles
                        on the My Bets screen. Balance / Pending /
                        Available tracks the top header at a glance. */}
                    <section>
                        <div style={{
                            fontSize: 11,
                            color: palette.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                            fontWeight: 700,
                            marginBottom: 8,
                            paddingLeft: 2,
                        }}>
                            Balances
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: 8,
                        }}>
                            {[
                                { label: 'Balance', value: `$${formatMoney(balance)}` },
                                { label: 'Pending', value: `$${formatMoney(pending)}` },
                                { label: 'Available', value: `$${formatMoney(headerAvailable)}` },
                            ].map((card) => (
                                <div
                                    key={card.label}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                        padding: '12px 14px',
                                        borderRadius: 12,
                                        background: palette.cardBg,
                                        border: `1px solid ${palette.cardBorder}`,
                                        minWidth: 0,
                                    }}
                                >
                                    <span style={{
                                        color: palette.textMuted,
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                    }}>{card.label}</span>
                                    <strong style={{
                                        fontSize: 18,
                                        lineHeight: 1.1,
                                        fontWeight: 800,
                                        color: palette.textPrimary,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>{card.value}</strong>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Account limits — single white card with one row
                        per admin-set limit. Min Bet / Max Bet labels are
                        the universal sportsbook shorthand; the underlying
                        validation stays win-anchored, so a $25 risk that
                        wins under the min still gets blocked with an
                        informative inline warning in the betslip. */}
                    <section>
                        <div style={{
                            fontSize: 11,
                            color: palette.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                            fontWeight: 700,
                            marginBottom: 8,
                            paddingLeft: 2,
                        }}>
                            Account Limits
                        </div>
                        <div style={{
                            background: palette.cardBg,
                            border: `1px solid ${palette.cardBorder}`,
                            borderRadius: 12,
                            padding: '4px 14px',
                        }}>
                            {heroSpecs.map((row, idx) => (
                                <div
                                    key={row.label}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        padding: '10px 0',
                                        borderTop: idx === 0 ? 'none' : `1px solid ${palette.cardBorder}`,
                                    }}
                                >
                                    <span style={{
                                        fontSize: 10.5,
                                        color: palette.textMuted,
                                        letterSpacing: 0.6,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                    }}>
                                        {row.label}
                                    </span>
                                    <span style={{
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: palette.textPrimary,
                                        letterSpacing: 0.2,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {row.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                    {/* Preferences */}
                    <section>
                        <div style={{
                            fontSize: 11,
                            color: palette.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                            fontWeight: 700,
                            marginBottom: 8,
                            paddingLeft: 2,
                        }}>
                            Preferences
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <SelectField
                                label="Language"
                                icon="fa-globe"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                options={LANGUAGES.map((l) => ({ value: l, label: l }))}
                            />
                            <SelectField
                                label="Odds Format"
                                icon="fa-calculator"
                                value={oddsFormat}
                                onChange={(e) => setOddsFormat(e.target.value)}
                                disabled={isUpdatingOddsFormat}
                                options={Object.entries(ODDS_FORMAT_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                            />
                        </div>
                    </section>

                    {/* Bet defaults — pre-populates the betslip on open
                        so the user doesn't retype their unit size every
                        time. Persists to settings.betDefaults. */}
                    <BetDefaultsCard user={user} />

                    {/* Agent controls (only for agent-like roles) */}
                    {isAgentLike && (
                        <section>
                            <div style={{
                                fontSize: 11,
                                color: palette.textMuted,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6,
                                fontWeight: 700,
                                marginBottom: 8,
                                paddingLeft: 2,
                            }}>
                                Agent tools
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                <button type="button" onClick={() => go('reports')} style={agentBtn(palette.success)}>
                                    <i className="fa-solid fa-chart-line" style={{ fontSize: 14, marginBottom: 6 }} />
                                    <span>Reports</span>
                                </button>
                                <button type="button" onClick={() => go('daily-figure')} style={agentBtn(palette.slate)}>
                                    <i className="fa-solid fa-calendar-day" style={{ fontSize: 14, marginBottom: 6 }} />
                                    <span>Daily Figure</span>
                                </button>
                                <button type="button" onClick={() => go('transactions')} style={agentBtn(palette.slate)}>
                                    <i className="fa-solid fa-arrow-right-arrow-left" style={{ fontSize: 14, marginBottom: 6 }} />
                                    <span>Transactions</span>
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Info & support */}
                    <section>
                        <div style={{
                            fontSize: 11,
                            color: palette.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                            fontWeight: 700,
                            marginBottom: 8,
                            paddingLeft: 2,
                        }}>
                            Info & support
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <RowButton
                                icon="fa-envelope"
                                label="Messages"
                                sublabel="Inbox from your sportsbook"
                                onClick={() => go('messages')}
                            />
                            <RowButton
                                icon="fa-book"
                                label="Rules"
                                sublabel="Betting rules & house limits"
                                onClick={() => go('rules')}
                            />
                            <RowButton
                                icon="fa-headset"
                                label="Support"
                                sublabel="Contact your sportsbook"
                                onClick={() => go('support')}
                            />
                        </div>
                    </section>
                </div>

                {/* Sticky sign-out footer.
                    `env(safe-area-inset-bottom)` reserves space for the iOS
                    home indicator / browser bottom toolbar so the SIGN OUT
                    button isn't clipped on mobile. Bumped z-index so the
                    sticky footer always wins over the floating chat bubble
                    if a stacking-context fight ever happens. */}
                <div style={{
                    padding: '12px 16px calc(18px + env(safe-area-inset-bottom, 0px))',
                    background: palette.bg,
                    borderTop: `1px solid ${palette.cardBorder}`,
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 2,
                }}>
                    <button
                        type="button"
                        onClick={() => { onClose?.(); onLogout?.(); }}
                        style={{
                            width: '100%',
                            background: palette.slate,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            padding: '14px',
                            fontWeight: 800,
                            letterSpacing: 0.8,
                            fontSize: 13,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            transition: 'background 120ms ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = palette.slate; }}
                    >
                        <i className="fa-solid fa-arrow-right-from-bracket" /> SIGN OUT
                    </button>
                </div>
            </div>
        </div>
    );
};

const agentBtn = (bg) => ({
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px 8px',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 0.4,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 70,
});

export default AccountPanel;
