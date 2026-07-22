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
