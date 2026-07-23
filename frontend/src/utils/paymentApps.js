// Payment-apps helpers shared by the onboarding gate step, the Account
// Settings card, the drag-to-rank preference widget, and the agent-facing
// CustomerDetailsView preference line. Keys MUST match the user.apps schema
// (applePay is camelCase — never rename). The canonical order doubles as the
// default payout preference for players who never touch the ranking widget.

export const PAYMENT_APP_ORDER = ['venmo', 'cashapp', 'applePay', 'zelle', 'paypal', 'btc'];

export const PAYMENT_APP_LABELS = {
    venmo: 'Venmo',
    cashapp: 'Cash App',
    applePay: 'Apple Pay',
    zelle: 'Zelle',
    paypal: 'PayPal',
    btc: 'BTC Address',
};

// Payment handles never contain whitespace — no cashtag, @username, email,
// phone, or wallet address has one (Nicky 2026-07-22). Strip as typed so a
// space can't even appear in the field, let alone get saved.
export const sanitizeHandle = (value) => String(value ?? '').replace(/\s+/g, '');

// ── Per-app live formatters (Nicky 2026-07-22) ──────────────────────────────
// MIRRORED server-side in OnboardingPolicy::normalizePaymentHandle — keep in
// lockstep. Prefixes are part of the STORED value (agents copy exactly what
// they see), typed duplicates dedupe, and none of these ever block a save —
// they shape input, they don't reject it.

// Venmo: always starts with @; letters/digits/dash/underscore, max 30.
export const formatVenmoHandle = (raw) => {
    let v = sanitizeHandle(raw);
    if (v.toUpperCase() === 'N/A') return 'N/A';
    v = v.replace(/^@+/, '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 30);
    return v === '' ? '' : `@${v}`;
};

// Cash App: always starts with $; letters/digits only, max 20.
export const formatCashtag = (raw) => {
    let v = sanitizeHandle(raw);
    if (v.toUpperCase() === 'N/A') return 'N/A';
    v = v.replace(/^\$+/, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
    return v === '' ? '' : `$${v}`;
};

// Phone-or-email (Zelle only since 2026-07-23): any letter or @ → email
// mode, left as typed (whitespace-stripped). Pure digits/punctuation → US
// phone, grouped 3-3-4 with dashes as they type; an 11-digit 1-prefix is
// dropped.
export const formatPhoneOrEmail = (raw) => {
    const v = sanitizeHandle(raw);
    if (v === '' || /[A-Za-z@]/.test(v)) return v;
    return formatUsPhone(v);
};

// US-phone-only (Apple Pay, Fida 2026-07-23): Apple Pay payouts go to a
// phone number, never an email — digits only, grouped 3-3-4 with dashes as
// they type, 11-digit 1-prefix dropped. Letters (email attempts) never
// land in the field; only the explicit N/A opt-out passes through.
export const formatUsPhone = (raw) => {
    const v = sanitizeHandle(raw);
    if (v.toUpperCase() === 'N/A') return 'N/A';
    let d = v.replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
    d = d.slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};

// Dispatcher used by the editor's onChange (and seed normalization).
export const formatHandleForKey = (key, raw) => {
    if (key === 'venmo') return formatVenmoHandle(raw);
    if (key === 'cashapp') return formatCashtag(raw);
    if (key === 'applePay') return formatUsPhone(raw);
    if (key === 'zelle') return formatPhoneOrEmail(raw);
    return sanitizeHandle(raw);
};

// A "filled" handle is a real value — non-blank and not the explicit N/A
// opt-out (case-insensitive so a hand-typed "n/a" doesn't rank either).
export const isFilledHandle = (value) => {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    return v !== '' && v.toUpperCase() !== 'N/A';
};

// The rankable keys for a given apps object, in canonical order.
export const filledAppKeys = (apps) =>
    PAYMENT_APP_ORDER.filter((k) => isFilledHandle(apps?.[k]));

// THE sync rule (single source of truth, mirrored server-side in
// OnboardingPolicy::normalizePaymentPreferenceOrder — keep in lockstep):
//   kept  = saved order, minus unknown/unfilled/duplicate keys
//   added = newly-filled apps not in the saved order, in canonical order
// Result always lists exactly the currently-filled apps, 1..N, no gaps —
// N/A'd apps drop out, new handles join at the end, an untouched widget
// yields the canonical default.
export const normalizePreferenceOrder = (savedOrder, apps) => {
    const filled = filledAppKeys(apps);
    const kept = [];
    if (Array.isArray(savedOrder)) {
        for (const key of savedOrder) {
            if (filled.includes(key) && !kept.includes(key)) kept.push(key);
        }
    }
    for (const key of filled) {
        if (!kept.includes(key)) kept.push(key);
    }
    return kept;
};

// Reorder helper for the drag widget: move `key` to `toIndex` (clamped).
export const movePreferenceKey = (order, key, toIndex) => {
    const from = order.indexOf(key);
    if (from === -1) return order;
    const to = Math.max(0, Math.min(order.length - 1, toIndex));
    if (to === from) return order;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, key);
    return next;
};
