import React from 'react';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { updateProfile, getStoredAuthToken } from '../api';
import { useToast } from '../contexts/ToastContext';

const DEFAULT_QUICK_STAKES = [10, 25, 50, 100];
const STAKE_MODE_OPTIONS = [
    { id: 'bet', label: 'Bet' },
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
    bg: '#f4f6fb',
    cardBg: '#ffffff',
    cardBorder: '#e5e7eb',
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
    if (!Number.isFinite(number)) return '0.00';
    return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

const BalanceTile = ({ icon, label, value, tone = 'neutral', hint }) => {
    const tones = {
        neutral: { label: palette.textMuted, value: palette.textPrimary, iconBg: palette.slateSoft, iconColor: palette.slate },
        success: { label: palette.textMuted, value: palette.success, iconBg: palette.successSoft, iconColor: palette.success },
        danger: { label: palette.textMuted, value: palette.danger, iconBg: palette.dangerSoft, iconColor: palette.danger },
        warn: { label: palette.textMuted, value: palette.warn, iconBg: palette.warnSoft, iconColor: palette.warnIcon },
        info: { label: palette.textMuted, value: palette.info, iconBg: palette.infoSoft, iconColor: palette.info },
    }[tone] || { label: palette.textMuted, value: palette.textPrimary, iconBg: palette.slateSoft, iconColor: palette.slate };

    return (
        <div style={{
            background: palette.cardBg,
            border: `1px solid ${palette.cardBorder}`,
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minHeight: 64,
        }}>
            <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: tones.iconBg,
                color: tones.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                flexShrink: 0,
            }}>
                <i className={`fa-solid ${icon}`} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                    fontSize: 10,
                    color: tones.label,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontWeight: 700,
                    marginBottom: 2,
                }}>
                    {label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: tones.value, lineHeight: 1.15 }}>
                    {value}
                </div>
                {hint && (
                    <div style={{ fontSize: 10, color: palette.textFaint, marginTop: 2 }}>{hint}</div>
                )}
            </div>
        </div>
    );
};

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

const ThemeToggle = ({ value, onChange }) => {
    const dark = value === 'dark';
    return (
        <button
            type="button"
            onClick={() => onChange?.(dark ? 'light' : 'dark')}
            aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
            style={{
                position: 'relative',
                width: 58,
                height: 30,
                borderRadius: 999,
                background: dark ? palette.slate : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 160ms ease',
                flexShrink: 0,
            }}
        >
            <span style={{
                position: 'absolute',
                top: 3,
                left: dark ? 31 : 3,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                transition: 'left 160ms ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: dark ? palette.slate : '#f59e0b',
            }}>
                <i className={`fa-solid ${dark ? 'fa-moon' : 'fa-sun'}`} />
            </span>
        </button>
    );
};

/* ---------- bet defaults card ---------- */

const BetDefaultsCard = ({ user, onSaved }) => {
    const { showToast } = useToast();
    const stored = (user?.settings?.betDefaults && typeof user.settings.betDefaults === 'object')
        ? user.settings.betDefaults
        : null;
    const initialMode = stored?.mode && ['bet', 'risk', 'win'].includes(stored.mode) ? stored.mode : 'risk';
    const initialAmount = Number.isFinite(Number(stored?.amount)) && Number(stored.amount) > 0
        ? String(stored.amount)
        : '';
    const initialQuickStakes = Array.isArray(stored?.quickStakes) && stored.quickStakes.length === 4
        ? stored.quickStakes.map((v) => String(v))
        : DEFAULT_QUICK_STAKES.map((v) => String(v));

    const [mode, setMode] = React.useState(initialMode);
    const [amount, setAmount] = React.useState(initialAmount);
    const [quickStakes, setQuickStakes] = React.useState(initialQuickStakes);
    const [saving, setSaving] = React.useState(false);
    // Reseed local form state when the user prop updates (e.g. after
    // /auth/me re-fetches and brings down a fresh `settings.betDefaults`).
    React.useEffect(() => {
        const next = user?.settings?.betDefaults;
        if (!next) return;
        if (next.mode && ['bet', 'risk', 'win'].includes(next.mode)) setMode(next.mode);
        if (Number.isFinite(Number(next.amount))) setAmount(String(next.amount || ''));
        if (Array.isArray(next.quickStakes) && next.quickStakes.length === 4) {
            setQuickStakes(next.quickStakes.map((v) => String(v)));
        }
    }, [user?.settings?.betDefaults]);

    const updateQuickStake = (idx, raw) => {
        // Strip non-digits — these are integer dollar amounts, no decimals
        // shown on the chips. Empty string is allowed during typing.
        const cleaned = String(raw).replace(/[^0-9]/g, '').slice(0, 6);
        setQuickStakes((prev) => prev.map((v, i) => (i === idx ? cleaned : v)));
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
                            inputMode="decimal"
                            placeholder="50"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
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

                {/* Quick stake chips — 4 editable values */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                        Quick stake buttons
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {quickStakes.map((value, idx) => (
                            <div
                                key={idx}
                                style={{
                                    position: 'relative',
                                    border: `1px solid ${palette.cardBorder}`,
                                    borderRadius: 8,
                                    background: '#fbfbfd',
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
                                    value={value}
                                    onChange={(e) => updateQuickStake(idx, e.target.value)}
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
                                    }}
                                />
                            </div>
                        ))}
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
    themeMode = 'light',
    onThemeModeChange,
}) => {
    const { oddsFormat, setOddsFormat, isUpdatingOddsFormat } = useOddsFormat();
    const [language, setLanguage] = React.useState('English');
    const [activeBetsTab, setActiveBetsTab] = React.useState('pending');

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
    // Credit line the user can wager against. Backend exposes this as
    // `creditLimit` on the /auth/me payload — agents/admin set it per
    // user. Defaults to 0 so display is "$0.00" until provisioned.
    const creditAvailable = user?.creditLimit ?? user?.creditAvailable ?? 0;
    const role = String(user?.role || 'user').toLowerCase();
    const isAgentLike = role === 'agent' || role === 'super_agent' || role === 'master_agent' || role === 'admin';
    const roleLabel = {
        user: 'Member',
        agent: 'Agent',
        super_agent: 'Super Agent',
        master_agent: 'Master Agent',
        admin: 'Admin',
    }[role] || 'Member';

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
                    height: '100vh',
                    overflowY: 'auto',
                    boxShadow: '-20px 0 60px rgba(15,23,42,0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Hero header */}
                <div style={{
                    background: `linear-gradient(135deg, ${palette.brand} 0%, ${palette.brandDark} 100%)`,
                    padding: '20px 18px 24px',
                    color: '#fff',
                    position: 'relative',
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close account panel"
                        style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            width: 32,
                            height: 32,
                            border: 'none',
                            background: 'rgba(255,255,255,0.18)',
                            color: '#fff',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            border: '2px solid rgba(255,255,255,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 18,
                            letterSpacing: 0.5,
                            flexShrink: 0,
                        }}>
                            {initialsOf(username)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                                fontSize: 10,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6,
                                opacity: 0.85,
                                fontWeight: 700,
                                marginBottom: 2,
                            }}>
                                {roleLabel}
                            </div>
                            <div style={{
                                fontSize: 18,
                                fontWeight: 800,
                                letterSpacing: 0.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {username}
                            </div>
                        </div>
                    </div>

                    {/* Available balance snapshot — headline only.
                        Pending and Freeplay used to be repeated on the
                        right side of this row, but they already have
                        their own tiles in the Balance breakdown grid
                        directly below, so showing them twice was just
                        clutter. */}
                    <div style={{
                        marginTop: 18,
                        background: 'rgba(0,0,0,0.18)',
                        borderRadius: 12,
                        padding: '14px 16px',
                    }}>
                        <div style={{ fontSize: 10, opacity: 0.85, letterSpacing: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>
                            Available to Bet
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                            ${formatMoney(available)}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 16px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Balance breakdown */}
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
                            Balance breakdown
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <BalanceTile
                                icon="fa-wallet"
                                label="Balance"
                                value={`$${formatMoney(balance)}`}
                                tone={Number(balance) < 0 ? 'danger' : 'neutral'}
                            />
                            <BalanceTile
                                icon="fa-gift"
                                label="Free Play"
                                value={`$${formatMoney(freeplay)}`}
                                tone={Number(freeplay) > 0 ? 'success' : 'neutral'}
                            />
                            <BalanceTile
                                icon="fa-coins"
                                label="Non-Posted Casino"
                                value={`$${formatMoney(nonPostedCasino)}`}
                                tone="warn"
                            />
                            <BalanceTile
                                icon="fa-hourglass-half"
                                label="Pending"
                                value={`$${formatMoney(pending)}`}
                                tone="info"
                                hint={Number(pending) > 0 ? 'Locked in open bets' : undefined}
                            />
                            {/* Credit Available — spans full row so the
                                grid stays balanced with 5 tiles instead
                                of an awkward half-empty 6th slot. */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <BalanceTile
                                    icon="fa-money-check-dollar"
                                    label="Credit Available"
                                    value={`$${formatMoney(creditAvailable)}`}
                                    tone={Number(creditAvailable) > 0 ? 'success' : 'neutral'}
                                />
                            </div>
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
                        <div style={{
                            marginTop: 10,
                            background: palette.cardBg,
                            border: `1px solid ${palette.cardBorder}`,
                            borderRadius: 12,
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: palette.slateSoft,
                                color: palette.slate,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 14,
                                flexShrink: 0,
                            }}>
                                <i className={`fa-solid ${themeMode === 'dark' ? 'fa-moon' : 'fa-sun'}`} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: palette.textPrimary }}>Appearance</div>
                                <div style={{ fontSize: 11, color: palette.textMuted, marginTop: 2 }}>
                                    {themeMode === 'dark' ? 'Dark theme' : 'Light theme'}
                                </div>
                            </div>
                            <ThemeToggle value={themeMode} onChange={onThemeModeChange} />
                        </div>
                    </section>

                    {/* Bet defaults — pre-populates the betslip on open
                        so the user doesn't retype their unit size every
                        time. Persists to settings.betDefaults. */}
                    <BetDefaultsCard user={user} />

                    {/* Activity */}
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
                            My activity
                        </div>
                        <div style={{
                            background: palette.cardBg,
                            border: `1px solid ${palette.cardBorder}`,
                            borderRadius: 12,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                background: palette.slateSoft,
                                padding: 4,
                                margin: 10,
                                borderRadius: 10,
                                gap: 4,
                            }}>
                                {[
                                    { id: 'pending', label: 'Pending' },
                                    { id: 'graded', label: 'Graded' },
                                    { id: 'open', label: 'Open Bets' },
                                ].map((tab) => {
                                    const active = activeBetsTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => { setActiveBetsTab(tab.id); go('my-bets'); }}
                                            style={{
                                                border: 'none',
                                                padding: '8px 4px',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: active ? '#fff' : palette.textMuted,
                                                background: active ? palette.slate : 'transparent',
                                                cursor: 'pointer',
                                                borderRadius: 8,
                                                transition: 'all 120ms ease',
                                                boxShadow: active ? '0 4px 10px -6px rgba(15,23,42,0.4)' : 'none',
                                            }}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={() => go('my-bets')}
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    borderTop: `1px solid ${palette.cardBorder}`,
                                    background: palette.cardBg,
                                    padding: '12px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    color: palette.textPrimary,
                                    textAlign: 'left',
                                }}
                            >
                                <i className="fa-solid fa-receipt" style={{ color: palette.brand, fontSize: 13 }} />
                                View full bet history
                                <i className="fa-solid fa-chevron-right" style={{ marginLeft: 'auto', fontSize: 11, color: palette.textFaint }} />
                            </button>
                        </div>
                    </section>

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

                {/* Sticky sign-out footer */}
                <div style={{
                    padding: '12px 16px 18px',
                    background: palette.bg,
                    borderTop: `1px solid ${palette.cardBorder}`,
                    position: 'sticky',
                    bottom: 0,
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
