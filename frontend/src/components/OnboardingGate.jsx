import React from 'react';
import { updateProfile, acknowledgeRules, getContentRules, getStoredAuthToken } from '../api';
import { hasReachedScrollBottom } from '../utils/scroll';
import { normalizePreferenceOrder, sanitizeHandle, isFilledHandle } from '../utils/paymentApps';
import { SITE_TZ_OPTIONS, getSiteTimezone, setSiteTimezone } from '../utils/timezone';
import PaymentPreferenceRanking from './PaymentPreferenceRanking';
import { useToast } from '../contexts/ToastContext';

/**
 * First-login onboarding gate — up to four required steps before a player
 * can place bets: (1) bet defaults (mode + straight/parlay unit sizes +
 * quick stakes), (2) House Rules acceptance, (3) Platform Rules acceptance,
 * (4) Payment Apps (NEW SIGNUPS ONLY — server flags needsPaymentApps only
 * for accounts registered with paymentAppsRequired; existing players get a
 * dismissible banner in DashboardHeader instead, never this gate step).
 * Each rules set is accepted SEPARATELY (own checkbox + Accept, own server
 * stamp); the step plan is frozen at mount from server-derived per-set
 * flags, so players only see the steps they still owe.
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
// Inline payout illustration per straight mode (Fida 2026-07-22) — shown under
// the Straight mode toggle only; the parlay toggle stays bare.
const MODE_EXAMPLES = {
    risk: 'Ex: -150 odds, risk $100 to win $67 | +150 odds, risk $100 to win $150',
    bet: 'Ex: -150 odds, bet $150 to win $100 | +150 odds, bet $100 to win $150',
    win: 'Ex: -150 odds, risk $150 to win $100 | +150 odds, risk $67 to win $100',
};
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

// Per-step chrome for the two rules-acceptance steps. house_rules is the
// management policy set (Payouts/Freeplay/Referrals/conduct); platform_rules
// is the wagering terms set (the pre-split content). Order matters: House
// first, Platform second (product request 2026-07-22).
const RULES_STEPS = {
    house: {
        setKey: 'house_rules',
        title: 'House Rules',
        checkboxLabel: 'I have read and understand the House Rules.',
    },
    platform: {
        setKey: 'platform_rules',
        title: 'Platform Rules',
        checkboxLabel: 'I have read and understand the Platform Rules.',
    },
};

// Payment Apps step fields (gate step 4, new signups only). Keys MUST match
// the pre-existing user.apps schema agents manage in CustomerDetailsView —
// venmo/cashapp/applePay/zelle/paypal/btc — so player-entered handles land in
// the exact card agents already read at payout time. Every field must carry a
// value ("N/A" via the button counts) before Save enables. Keep the field
// list in lockstep with AccountPanel's PaymentAppsCard.
const PAYMENT_APP_FIELDS = [
    { key: 'venmo', label: 'Venmo', prefix: '@', placeholder: 'username' },
    { key: 'cashapp', label: 'Cash App', prefix: '$', placeholder: 'cashtag' },
    { key: 'applePay', label: 'Apple Pay', prefix: null, placeholder: 'Phone or email' },
    { key: 'zelle', label: 'Zelle', prefix: null, placeholder: 'Phone or email' },
    { key: 'paypal', label: 'PayPal', prefix: null, placeholder: 'Email or @username' },
    { key: 'btc', label: 'BTC Address', prefix: null, placeholder: 'Wallet address' },
];

const OnboardingGate = ({ user, onDismiss }) => {
    const { showToast } = useToast();
    const onboarding = user?.onboarding || {};
    // The step plan is FROZEN at mount from the server-derived onboarding
    // state, so "Step X of N" numbering doesn't reshuffle mid-flow: a
    // pre-split player who already accepted Platform Rules sees only the
    // steps they still owe. Per-set flags fall back to the legacy aggregate
    // needsRulesAck (older server payloads) — both rules steps show.
    const [stepPlan] = React.useState(() => {
        const plan = [];
        if (onboarding.needsDefaults) plan.push('defaults');
        if (onboarding.needsHouseRulesAck ?? onboarding.needsRulesAck) plan.push('house');
        if (onboarding.needsPlatformRulesAck ?? onboarding.needsRulesAck) plan.push('platform');
        // payapps is server-flagged for NEW signups only (registration seeds
        // paymentAppsRequired) — absent flag means an existing player, who
        // must never be gated on it. No legacy fallback on purpose.
        if (onboarding.needsPaymentApps) plan.push('payapps');
        return plan.length ? plan : ['defaults', 'house', 'platform'];
    });
    // Local done flags advance the flow after each successful save — don't
    // wait a me-refresh round-trip to show the next step.
    const [doneSteps, setDoneSteps] = React.useState(() => ({}));
    const markDone = (key) => setDoneSteps((prev) => ({ ...prev, [key]: true }));
    const currentStep = stepPlan.find((key) => !doneSteps[key]) || null;
    const stepNumber = currentStep ? stepPlan.indexOf(currentStep) + 1 : stepPlan.length;
    const totalSteps = stepPlan.length;
    const isLastStep = currentStep !== null && stepPlan.indexOf(currentStep) === stepPlan.length - 1;

    /* ── Step 1 state (mirrors BetDefaultsCard) ─────────────────────────── */
    const stored = (user?.settings?.betDefaults && typeof user.settings.betDefaults === 'object')
        ? user.settings.betDefaults
        : null;
    const playerMinBet = Number(user?.minBet);
    const playerMaxBet = Number(user?.maxBet);
    const lockedMin = Number.isFinite(playerMinBet) && playerMinBet > 0 ? Math.round(playerMinBet) : FALLBACK_MIN;
    const lockedMax = Number.isFinite(playerMaxBet) && playerMaxBet > 0 ? Math.round(playerMaxBet) : FALLBACK_MAX;

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
        // First login: empty on purpose (Fida 2026-07-22) — picking their own
        // quick stakes is part of the step, so no computed sample values.
        return ['', '', ''];
    });
    // Display timezone (Nicky/Fida 2026-07-22: pick it at signup). Seeded
    // from the server-saved preference, else this device's site timezone
    // (localStorage, ET default). Always has a value — never blocks the step.
    const [timezone, setTimezone] = React.useState(() => {
        const saved = user?.settings?.timezone;
        return SITE_TZ_OPTIONS.some((o) => o.value === saved) ? saved : getSiteTimezone();
    });
    const [saving, setSaving] = React.useState(false);
    // Gate the CTA until every editable field is filled; the range/ordering
    // rules stay as on-click toasts in saveDefaults.
    const filled = (v) => v !== '' && Number(v) > 0;
    const canSave = filled(straightAmount) && filled(parlayAmount) && midStakes.every(filled);

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
                    // Same profile call carries the display timezone the
                    // player picked on this step (server validates the zone;
                    // Account Preferences edits the same field later).
                    timezone,
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
            // Apply on this device immediately — all match/bet timestamps
            // re-render in the chosen zone without a reload.
            setSiteTimezone(timezone);
            window.dispatchEvent(new Event('user:refresh'));
            markDone('defaults');
        } catch (err) {
            showToast?.(err?.message || 'Failed to save bet defaults', 'error');
        } finally {
            setSaving(false);
        }
    };

    /* ── Rules steps state (shared by House + Platform) ─────────────────── */
    // One fetch serves both steps — /content/rules returns every active doc
    // with its ruleSet tag; each step filters its own set.
    const [rules, setRules] = React.useState(null);
    const [rulesError, setRulesError] = React.useState(false);
    // Checkbox state is PER SET — accepting House Rules must not pre-tick
    // the Platform Rules box; each document gets its own deliberate tap.
    const [acceptedSets, setAcceptedSets] = React.useState({});
    // Scroll-to-bottom enforcement (Nicky 2026-07-22): PER SET — the
    // checkbox + Accept stay locked until the full text has been scrolled
    // to the bottom. Short content that fits without a scrollbar unlocks
    // immediately (see the measure effect below).
    const [scrolledSets, setScrolledSets] = React.useState({});
    const rulesBoxRef = React.useRef(null);
    const [acking, setAcking] = React.useState(false);

    const onRulesStep = currentStep === 'house' || currentStep === 'platform';

    const markScrolled = (setKey) => setScrolledSets((prev) => (prev[setKey] ? prev : { ...prev, [setKey]: true }));

    React.useEffect(() => {
        if (!onRulesStep || rules !== null) return;
        let alive = true;
        const token = getStoredAuthToken();
        getContentRules(token)
            .then((data) => { if (alive) setRules(Array.isArray(data?.rules) ? data.rules : []); })
            .catch(() => { if (alive) { setRules([]); setRulesError(true); } });
        return () => { alive = false; };
    }, [onRulesStep, rules]);

    // On entering a rules step (or when the text lands): start reading from
    // the top, and if the whole set fits without a scrollbar, count it as
    // read — otherwise Accept could never unlock on short content.
    React.useEffect(() => {
        if (!onRulesStep || rules === null) return;
        const el = rulesBoxRef.current;
        if (!el) return;
        el.scrollTop = 0;
        const setKey = RULES_STEPS[currentStep]?.setKey;
        if (setKey && hasReachedScrollBottom(0, el.clientHeight, el.scrollHeight)) {
            markScrolled(setKey);
        }
    }, [onRulesStep, currentStep, rules]);

    /* ── Payment Apps step state ────────────────────────────────────────── */
    // Seeded from user.apps (agents may have pre-filled some handles); each
    // field needs an explicit value — a handle or the N/A button.
    const [payApps, setPayApps] = React.useState(() => {
        const existing = (user?.apps && typeof user.apps === 'object') ? user.apps : {};
        const seeded = {};
        PAYMENT_APP_FIELDS.forEach((f) => {
            seeded[f.key] = typeof existing[f.key] === 'string' ? existing[f.key] : '';
        });
        return seeded;
    });
    const [savingApps, setSavingApps] = React.useState(false);
    // Payout preference order (drag-to-rank). Seeded from any saved order;
    // rendered/normalized live against the CURRENT field values, so N/A'd
    // apps drop out and newly-typed handles join as the player edits.
    const [payAppsOrder, setPayAppsOrder] = React.useState(() => (
        Array.isArray(user?.apps?.preferenceOrder) ? user.apps.preferenceOrder : []
    ));
    const payAppsAnswered = PAYMENT_APP_FIELDS.every((f) => (payApps[f.key] || '').trim() !== '');
    // At least ONE real handle required (Nicky 2026-07-22): an all-N/A set
    // leaves the agent no way to pay — Save stays locked until one field
    // carries an actual handle.
    const payAppsHasHandle = PAYMENT_APP_FIELDS.some((f) => isFilledHandle(payApps[f.key]));
    const payAppsComplete = payAppsAnswered && payAppsHasHandle;

    const savePaymentApps = async () => {
        if (!payAppsComplete || savingApps) return;
        const token = getStoredAuthToken();
        if (!token) return;
        setSavingApps(true);
        try {
            // Order is normalized against the outgoing values (server
            // re-normalizes authoritatively — this just avoids sending a
            // stale array).
            await updateProfile({ apps: { ...payApps, preferenceOrder: normalizePreferenceOrder(payAppsOrder, payApps) } }, token);
            window.dispatchEvent(new Event('user:refresh'));
            markDone('payapps');
            if (isLastStep) {
                showToast?.('You are all set — good luck!', 'success');
            }
        } catch (err) {
            showToast?.(err?.message || 'Failed to save payment apps', 'error');
        } finally {
            setSavingApps(false);
        }
    };

    const confirmRules = async (stepKey) => {
        const setKey = RULES_STEPS[stepKey]?.setKey;
        // Scroll + checkbox both required — mirrors the button's disabled
        // condition so a programmatic click can't skip the read requirement.
        if (!setKey || !acceptedSets[setKey] || !scrolledSets[setKey] || acking) return;
        const token = getStoredAuthToken();
        if (!token) return;
        setAcking(true);
        try {
            await acknowledgeRules(token, setKey);
            // acknowledgeRules primes the fresh me payload; the refresh event
            // updates user.onboarding in App state — after the FINAL set,
            // required flips false and App unmounts us.
            window.dispatchEvent(new Event('user:refresh'));
            markDone(stepKey);
            if (isLastStep) {
                showToast?.('You are all set — good luck!', 'success');
            }
        } catch (err) {
            showToast?.(err?.message || 'Failed to acknowledge rules', 'error');
        } finally {
            setAcking(false);
        }
    };

    /* ── Render ─────────────────────────────────────────────────────────── */
    // Every step done (final ack fired, App's user:refresh unmount is a
    // beat away) — render nothing rather than a stray empty shell.
    if (currentStep === null) {
        return null;
    }

    const rulesStep = onRulesStep ? RULES_STEPS[currentStep] : null;
    const rulesSections = rulesStep
        ? (rules || []).filter((s) => ((s.ruleSet || 'platform_rules') === rulesStep.setKey))
        : [];
    // Loaded but empty (set deactivated in admin): treat like a fetch error —
    // never let a player "accept" a document they were never shown.
    const rulesUnavailable = rulesError || (rules !== null && rulesSections.length === 0);
    const rulesAccepted = rulesStep ? !!acceptedSets[rulesStep.setKey] : false;
    const rulesScrolled = rulesStep ? !!scrolledSets[rulesStep.setKey] : false;

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
                            {currentStep === 'defaults' ? 'Set Your Bet Defaults'
                                : currentStep === 'payapps' ? 'Payment Apps'
                                : rulesStep?.title}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 2 }}>
                            Step {stepNumber} of {totalSteps} — required before you can place bets
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
                    {currentStep === 'defaults' && (
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
                                    {f.key === 'straight' && (
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                                            {MODE_EXAMPLES[f.modeVal]}
                                        </div>
                                    )}
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
                                            placeholder="100"
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

                            <div>
                                <div style={label}>Time zone</div>
                                <div style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fbfbfd' }}>
                                    <select
                                        value={timezone}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        style={{ appearance: 'none', WebkitAppearance: 'none', width: '100%', padding: '10px 32px 10px 12px', border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, color: '#0f172a', background: 'transparent', borderRadius: 8 }}
                                    >
                                        {SITE_TZ_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label} — {opt.value.replace('America/', '').replace('Pacific/', '').replace(/_/g, ' ')}
                                            </option>
                                        ))}
                                    </select>
                                    <i className="fa-solid fa-chevron-down" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94a3b8', pointerEvents: 'none' }} />
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                                    Game times everywhere on the site will show in this time zone.
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={saveDefaults}
                                disabled={saving || !canSave}
                                style={{
                                    background: canSave ? '#facc15' : '#cbd5e1',
                                    color: canSave ? '#0f172a' : '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '11px 14px',
                                    fontWeight: 800,
                                    fontSize: 13,
                                    letterSpacing: 0.4,
                                    cursor: (saving || !canSave) ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {saving ? 'Saving…' : 'Save & Continue'}
                            </button>
                        </div>
                    )}

                    {rulesStep && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div
                                ref={rulesBoxRef}
                                onScroll={(e) => {
                                    const el = e.currentTarget;
                                    if (hasReachedScrollBottom(el.scrollTop, el.clientHeight, el.scrollHeight)) {
                                        markScrolled(rulesStep.setKey);
                                    }
                                }}
                                style={{
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
                                {rules !== null && rulesUnavailable && (
                                    <div style={{ fontSize: 12, color: '#64748b', padding: 8 }}>
                                        Rules are temporarily unavailable — please try again in a moment.
                                    </div>
                                )}
                                {rulesSections.map((section, i) => (
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

                            {rules !== null && !rulesUnavailable && !rulesScrolled && (
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>
                                    <i className="fa-solid fa-arrow-down" style={{ marginRight: 6 }} />
                                    Scroll to the bottom of the rules to unlock Accept
                                </div>
                            )}

                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: rulesScrolled ? 'pointer' : 'not-allowed', fontSize: 13, color: '#0f172a', fontWeight: 600, lineHeight: 1.4, opacity: rulesScrolled ? 1 : 0.5 }}>
                                <input
                                    type="checkbox"
                                    checked={rulesAccepted}
                                    disabled={!rulesScrolled}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setAcceptedSets((prev) => ({ ...prev, [rulesStep.setKey]: checked }));
                                    }}
                                    style={{ marginTop: 2, width: 16, height: 16, accentColor: '#16a34a' }}
                                />
                                {rulesStep.checkboxLabel}
                            </label>

                            <button
                                type="button"
                                onClick={() => confirmRules(currentStep)}
                                disabled={!rulesAccepted || !rulesScrolled || acking || rules === null || rulesUnavailable}
                                style={{
                                    background: (!rulesAccepted || !rulesScrolled || rules === null || rulesUnavailable) ? '#cbd5e1' : '#16a34a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '11px 14px',
                                    fontWeight: 800,
                                    fontSize: 13,
                                    letterSpacing: 0.4,
                                    cursor: (!rulesAccepted || !rulesScrolled || acking || rules === null || rulesUnavailable) ? 'not-allowed' : 'pointer',
                                    opacity: acking ? 0.7 : 1,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {acking ? 'Confirming…' : (isLastStep ? 'I Agree — Start Betting' : 'Accept & Continue')}
                            </button>
                        </div>
                    )}

                    {currentStep === 'payapps' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* Copy approved by Nicky 2026-07-22 — keep in
                                lockstep with AccountPanel's PaymentAppsCard. */}
                            <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                                These apps are how your agent will pay you. Enter your handle for
                                each app you have or tap <strong>N/A</strong> if you do not.
                                Multiple apps are required. The less apps the harder and slower it
                                will be to pay out. Please make sure to type info accurately — if
                                misspelled and sent to the wrong person, we are not liable. List
                                in order which apps you prefer to be paid on.
                            </div>
                            {PAYMENT_APP_FIELDS.map((f) => {
                                const value = payApps[f.key] || '';
                                const isNA = value === 'N/A';
                                return (
                                    <div key={f.key}>
                                        <div style={label}>{f.label}</div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <div style={{ position: 'relative', flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, background: isNA ? '#f1f5f9' : '#fbfbfd' }}>
                                                {f.prefix && !isNA && (
                                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#94a3b8', pointerEvents: 'none' }}>
                                                        {f.prefix}
                                                    </span>
                                                )}
                                                <input
                                                    type="text"
                                                    value={value}
                                                    placeholder={f.placeholder}
                                                    readOnly={isNA}
                                                    onChange={(e) => {
                                                        const next = sanitizeHandle(e.target.value);
                                                        setPayApps((prev) => ({ ...prev, [f.key]: next }));
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: (f.prefix && !isNA) ? '10px 12px 10px 24px' : '10px 12px',
                                                        border: 'none',
                                                        outline: 'none',
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                        color: isNA ? '#64748b' : '#0f172a',
                                                        background: 'transparent',
                                                        boxSizing: 'border-box',
                                                        borderRadius: 8,
                                                    }}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setPayApps((prev) => ({ ...prev, [f.key]: isNA ? '' : 'N/A' }))}
                                                title={isNA ? 'Undo — enter a handle instead' : `I don't use ${f.label}`}
                                                style={{
                                                    background: isNA ? '#64748b' : '#e8e8e8',
                                                    color: isNA ? '#fff' : '#333',
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    padding: '0 14px',
                                                    fontWeight: 800,
                                                    fontSize: 12,
                                                    letterSpacing: 0.4,
                                                    cursor: 'pointer',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                N/A
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            <PaymentPreferenceRanking
                                values={payApps}
                                order={payAppsOrder}
                                onChange={setPayAppsOrder}
                            />
                            {!payAppsComplete && (
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>
                                    {(() => {
                                        const left = PAYMENT_APP_FIELDS.filter((f) => (payApps[f.key] || '').trim() === '').length;
                                        if (left > 0) return `${left} app${left === 1 ? '' : 's'} still need${left === 1 ? 's' : ''} a handle or N/A`;
                                        return 'At least one app needs a real handle — N/A on everything leaves your agent no way to pay you.';
                                    })()}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={savePaymentApps}
                                disabled={savingApps || !payAppsComplete}
                                style={{
                                    background: payAppsComplete ? '#facc15' : '#cbd5e1',
                                    color: payAppsComplete ? '#0f172a' : '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '11px 14px',
                                    fontWeight: 800,
                                    fontSize: 13,
                                    letterSpacing: 0.4,
                                    cursor: (savingApps || !payAppsComplete) ? 'not-allowed' : 'pointer',
                                    opacity: savingApps ? 0.7 : 1,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {savingApps ? 'Saving…' : (isLastStep ? 'Save & Start Betting' : 'Save & Continue')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingGate;
