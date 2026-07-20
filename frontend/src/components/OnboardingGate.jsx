import React from 'react';
import { updateProfile, acknowledgeRules, getContentRules, getStoredAuthToken } from '../api';
import { computeMidQuickStakes } from '../utils/money';
import { useToast } from '../contexts/ToastContext';

/**
 * First-login onboarding gate — two required steps before a player can
 * place bets: (1) bet defaults (mode + straight/parlay unit sizes + quick
 * stakes), (2) "I understand the rules" acknowledgment.
 *
 * Behavior contract (product decision 2026-07-17):
 *  - DISMISSIBLE (X): closing lets the player browse the board — but does
 *    NOT complete onboarding. The gate re-opens on next login and whenever
 *    a bet attempt hits the server's ONBOARDING_REQUIRED block (the shell
 *    listens for `onboarding:show`). There is NO skip inside the flow —
 *    the only way through is completing both steps.
 *  - State is SERVER-derived (`user.onboarding` on /auth/me): each step
 *    commits on completion, so closing mid-flow resumes at the remaining
 *    step next time. Nothing is persisted client-side.
 *
 * The defaults step intentionally mirrors AccountPanel's BetDefaultsCard
 * (fields, validation, save payload) rather than importing it — that card
 * lives in the lazy account chunk and its layout is account-page chrome.
 * If validation rules change THERE, change them HERE too (and vice versa).
 * Unlike the card, straight AND parlay unit sizes are REQUIRED here — an
 * onboarding step that can be saved empty wouldn't be a step at all.
 */

const STAKE_MODES = [
    { id: 'bet', label: 'Bet' },
    { id: 'risk', label: 'Risk' },
    { id: 'win', label: 'Win' },
];
// Parlay default mode is Risk/Win only — parity with the Account settings
// selector (Fida 2026-07-20): 'bet' resolves per-leg juice, which doesn't map
// onto a combined ticket, so the parlay-bucket DEFAULT can't be it.
const PARLAY_STAKE_MODES = STAKE_MODES.filter((m) => m.id !== 'bet');
const FALLBACK_MIN = 10;
const FALLBACK_MAX = 100;

const label = {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
};

const OnboardingGate = ({ user, onDismiss }) => {
    const { showToast } = useToast();
    const onboarding = user?.onboarding || {};
    // Local step advance after a successful save — don't wait a me-refresh
    // round-trip to show step 2.
    const [defaultsDone, setDefaultsDone] = React.useState(!onboarding.needsDefaults);
    const step = defaultsDone ? 2 : 1;
    const totalSteps = 2;

    /* ── Step 1 state (mirrors BetDefaultsCard) ─────────────────────────── */
    const stored = (user?.settings?.betDefaults && typeof user.settings.betDefaults === 'object')
        ? user.settings.betDefaults
        : null;
    const playerMinBet = Number(user?.minBet);
    const playerMaxBet = Number(user?.maxBet);
    const lockedMin = Number.isFinite(playerMinBet) && playerMinBet > 0 ? Math.round(playerMinBet) : FALLBACK_MIN;
    const lockedMax = Number.isFinite(playerMaxBet) && playerMaxBet > 0 ? Math.round(playerMaxBet) : FALLBACK_MAX;
    const [autoMid1, autoMid2, autoMid3] = computeMidQuickStakes(lockedMin, lockedMax);

    const legacyAmount = Number(stored?.amount);
    const seedAmount = (raw) => (Number.isFinite(Number(raw)) && Number(raw) > 0
        ? String(raw)
        : (Number.isFinite(legacyAmount) && legacyAmount > 0 ? String(legacyAmount) : ''));
    const [mode, setMode] = React.useState(stored?.mode === 'win' ? 'win' : stored?.mode === 'bet' ? 'bet' : 'risk');
    // Parlay-bucket mode: EXPLICIT selector since 2026-07-20 (was implicitly
    // seeded from the straight mode). Seed from stored parlayMode, falling
    // back to the straight mode (pre-split accounts); either source maps a
    // stored 'bet' to 'risk' — the parlay selector has no Bet pill, same
    // display rule as the Account settings card.
    const [parlayMode, setParlayMode] = React.useState(() => {
        const src = ['win', 'risk', 'bet'].includes(stored?.parlayMode)
            ? stored.parlayMode
            : (['win', 'risk', 'bet'].includes(stored?.mode) ? stored.mode : 'risk');
        return src === 'bet' ? 'risk' : src;
    });
    const [straightAmount, setStraightAmount] = React.useState(seedAmount(stored?.straightDefault));
    const [parlayAmount, setParlayAmount] = React.useState(seedAmount(stored?.parlayDefault));
    const [midStakes, setMidStakes] = React.useState(() => {
        const saved = stored?.quickStakes;
        if (Array.isArray(saved) && saved.length === 5) {
            const mids = [saved[1], saved[2], saved[3]].map(Number);
            if (mids.every((n) => Number.isFinite(n) && n > 0)) return mids.map(String);
        }
        return [String(autoMid1), String(autoMid2), String(autoMid3)];
    });
    const [saving, setSaving] = React.useState(false);

    const saveDefaults = async () => {
        const token = getStoredAuthToken();
        if (!token) return;
        const parsedStraight = Number(straightAmount);
        const parsedParlay = Number(parlayAmount);
        // REQUIRED here (unlike the account card): both unit sizes must be
        // positive — that's the whole point of the onboarding step.
        if (straightAmount === '' || !Number.isFinite(parsedStraight) || parsedStraight <= 0) {
            showToast?.('Enter your straight bet unit size', 'warning');
            return;
        }
        if (parlayAmount === '' || !Number.isFinite(parsedParlay) || parsedParlay <= 0) {
            showToast?.('Enter your parlay unit size', 'warning');
            return;
        }
        // Defensive: the parlay pill row pre-selects 'risk' so this can't fire
        // through the UI, but the save contract is Risk/Win only — never let a
        // stray state value smuggle 'bet' (or junk) into parlayMode.
        if (parlayMode !== 'risk' && parlayMode !== 'win') {
            showToast?.('Choose your parlay default mode (Risk or Win)', 'warning');
            return;
        }
        const quickStakes = [lockedMin, ...midStakes.map(Number), lockedMax];
        if (quickStakes.some((n) => !Number.isFinite(n) || n <= 0)) {
            showToast?.('Quick stake values must be positive numbers', 'warning');
            return;
        }
        const [, midA, midB, midC] = quickStakes;
        if (midA <= lockedMin || midC >= lockedMax) {
            showToast?.(`Quick stakes must be between $${lockedMin} and $${lockedMax}`, 'warning');
            return;
        }
        if (!(midA < midB && midB < midC)) {
            showToast?.('Quick stakes must increase from left to right', 'warning');
            return;
        }
        setSaving(true);
        try {
            await updateProfile({
                settings: {
                    betDefaults: {
                        mode,
                        // Explicit parlay-bucket mode from its own selector
                        // (2026-07-20) — the old implicit seed-from-straight
                        // (with its bet→risk exception) is gone; the player
                        // now picks Risk/Win directly, same as Account settings.
                        parlayMode,
                        amount: Math.round(parsedStraight * 100) / 100,
                        straightDefault: Math.round(parsedStraight * 100) / 100,
                        parlayDefault: Math.round(parsedParlay * 100) / 100,
                        quickStakes,
                    },
                },
            }, token);
            window.dispatchEvent(new Event('user:refresh'));
            setDefaultsDone(true);
        } catch (err) {
            showToast?.(err?.message || 'Failed to save bet defaults', 'error');
        } finally {
            setSaving(false);
        }
    };

    /* ── Step 2 state ───────────────────────────────────────────────────── */
    const [rules, setRules] = React.useState(null);
    const [rulesError, setRulesError] = React.useState(false);
    const [accepted, setAccepted] = React.useState(false);
    const [acking, setAcking] = React.useState(false);

    React.useEffect(() => {
        if (step !== 2 || rules !== null) return;
        let alive = true;
        const token = getStoredAuthToken();
        getContentRules(token)
            .then((data) => { if (alive) setRules(Array.isArray(data?.rules) ? data.rules : []); })
            .catch(() => { if (alive) { setRules([]); setRulesError(true); } });
        return () => { alive = false; };
    }, [step, rules]);

    const confirmRules = async () => {
        if (!accepted || acking) return;
        const token = getStoredAuthToken();
        if (!token) return;
        setAcking(true);
        try {
            await acknowledgeRules(token);
            // acknowledgeRules primes the fresh me payload; the refresh event
            // flips user.onboarding.required in App state, which unmounts us.
            window.dispatchEvent(new Event('user:refresh'));
            showToast?.('You are all set — good luck!', 'success');
        } catch (err) {
            showToast?.(err?.message || 'Failed to acknowledge rules', 'error');
            setAcking(false);
        }
    };

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(5, 9, 20, 0.72)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
        }}>
            <div style={{
                width: '100%',
                maxWidth: 420,
                maxHeight: '90vh',
                background: '#fff',
                borderRadius: 14,
                boxShadow: '0 18px 50px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                            {step === 1 ? 'Set Your Bet Defaults' : 'Platform Rules'}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 2 }}>
                            Step {step} of {totalSteps} — required before you can place bets
                        </div>
                    </div>
                    {/* Dismiss = browse without betting. NOT a skip: the gate
                        returns on next login / next bet attempt. */}
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Close — you can browse, but betting stays locked until setup is complete"
                        title="Close — you can browse, but betting stays locked until setup is complete"
                        style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer', padding: 6, lineHeight: 1 }}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div style={{ padding: '4px 16px 16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Paired {default mode + unit size} per bucket —
                                same layout as the Account settings card. The
                                Parlay mode row is Risk/Win only (no Bet pill),
                                mirroring Account settings (Fida 2026-07-20). */}
                            {[
                                { key: 'straight', modeText: 'Straight default mode', modeVal: mode, modeSet: setMode, modeOptions: STAKE_MODES, text: 'Straight default (unit size)', value: straightAmount, set: setStraightAmount },
                                { key: 'parlay', modeText: 'Parlay default mode', modeVal: parlayMode, modeSet: setParlayMode, modeOptions: PARLAY_STAKE_MODES, text: 'Parlay default (unit size)', value: parlayAmount, set: setParlayAmount },
                            ].map((f) => (
                                <React.Fragment key={f.key}>
                                <div>
                                    <div style={label}>{f.modeText}</div>
                                    <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                        {f.modeOptions.map((m, i) => {
                                            const active = f.modeVal === m.id;
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => f.modeSet(m.id)}
                                                    style={{
                                                        background: active ? (m.id === 'win' ? '#16a34a' : '#ff5051') : '#e8e8e8',
                                                        color: active ? '#fff' : '#333',
                                                        border: 'none',
                                                        borderLeft: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.15)',
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
                                <div>
                                    <div style={label}>{f.text}</div>
                                    <div style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fbfbfd' }}>
                                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#94a3b8', pointerEvents: 'none' }}>$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            inputMode="numeric"
                                            placeholder="50"
                                            value={f.value}
                                            onChange={(e) => f.set(String(e.target.value).replace(/\D/g, ''))}
                                            style={{ width: '100%', padding: '10px 12px 10px 24px', border: 'none', outline: 'none', fontSize: 14, fontWeight: 700, color: '#0f172a', background: 'transparent', boxSizing: 'border-box', borderRadius: 8 }}
                                        />
                                    </div>
                                </div>
                                </React.Fragment>
                            ))}

                            <div>
                                <div style={label}>Quick stake buttons</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 16 }}>
                                    {[String(lockedMin), ...midStakes, String(lockedMax)].map((value, idx) => {
                                        const isLocked = idx === 0 || idx === 4;
                                        const lockedLabel = idx === 0 ? 'Min Bet' : idx === 4 ? 'Max Bet' : '';
                                        const midIdx = idx - 1;
                                        return (
                                            <div key={idx} style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: 8, background: isLocked ? '#f1f5f9' : '#fbfbfd' }}>
                                                <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#94a3b8', pointerEvents: 'none' }}>$</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    readOnly={isLocked}
                                                    value={value}
                                                    onChange={isLocked ? undefined : (e) => {
                                                        const digits = String(e.target.value).replace(/\D/g, '');
                                                        setMidStakes((prev) => {
                                                            const arr = [...prev];
                                                            arr[midIdx] = digits;
                                                            return arr;
                                                        });
                                                    }}
                                                    title={isLocked ? `${lockedLabel} (set by your agent)` : 'Tap to edit — must be between Min and Max bet'}
                                                    style={{ width: '100%', padding: '8px 4px 8px 14px', border: 'none', outline: 'none', fontSize: 12, fontWeight: 700, color: '#0f172a', background: 'transparent', boxSizing: 'border-box', borderRadius: 8, textAlign: 'center', cursor: isLocked ? 'not-allowed' : 'text' }}
                                                />
                                                {lockedLabel && (
                                                    <div style={{ position: 'absolute', bottom: -15, left: 0, right: 0, textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                                        {lockedLabel}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 14, lineHeight: 1.4, textAlign: 'center' }}>
                                    Min and Max are set by your agent. Tap the middle three to customize.
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={saveDefaults}
                                disabled={saving}
                                style={{ background: '#facc15', color: '#0f172a', border: 'none', borderRadius: 8, padding: '11px 14px', fontWeight: 800, fontSize: 13, letterSpacing: 0.4, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, textTransform: 'uppercase' }}
                            >
                                {saving ? 'Saving…' : 'Save & Continue'}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: 10,
                                background: '#f8fafc',
                                maxHeight: '42vh',
                                overflowY: 'auto',
                                WebkitOverflowScrolling: 'touch',
                                padding: '10px 12px',
                            }}>
                                {rules === null && (
                                    <div style={{ fontSize: 12, color: '#64748b', padding: 8 }}>Loading rules…</div>
                                )}
                                {rules !== null && rulesError && (
                                    <div style={{ fontSize: 12, color: '#64748b', padding: 8 }}>
                                        Rules are temporarily unavailable — please try again in a moment.
                                    </div>
                                )}
                                {(rules || []).map((section, i) => (
                                    <div key={section.id || i} style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                                            {section.title}
                                        </div>
                                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                                            {(section.items || []).map((item, j) => (
                                                <li key={j} style={{ fontSize: 12, color: '#334155', lineHeight: 1.45, marginBottom: 3 }}>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13, color: '#0f172a', fontWeight: 600, lineHeight: 1.4 }}>
                                <input
                                    type="checkbox"
                                    checked={accepted}
                                    onChange={(e) => setAccepted(e.target.checked)}
                                    style={{ marginTop: 2, width: 16, height: 16, accentColor: '#16a34a' }}
                                />
                                I have read and understand the platform rules.
                            </label>

                            <button
                                type="button"
                                onClick={confirmRules}
                                disabled={!accepted || acking || rules === null || rulesError}
                                style={{
                                    background: (!accepted || rules === null || rulesError) ? '#cbd5e1' : '#16a34a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '11px 14px',
                                    fontWeight: 800,
                                    fontSize: 13,
                                    letterSpacing: 0.4,
                                    cursor: (!accepted || acking || rules === null || rulesError) ? 'not-allowed' : 'pointer',
                                    opacity: acking ? 0.7 : 1,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {acking ? 'Confirming…' : 'I Agree — Start Betting'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingGate;
