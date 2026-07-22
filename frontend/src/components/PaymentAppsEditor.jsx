import React from 'react';
import {
    PAYMENT_APP_ORDER,
    PAYMENT_APP_LABELS,
    isFilledHandle,
    sanitizeHandle,
    normalizePreferenceOrder,
    movePreferenceKey,
} from '../utils/paymentApps';

/**
 * Combined payment-apps editor (Nicky 2026-07-22: "combine these two") —
 * ONE list where each app row is simultaneously the handle input, the N/A
 * toggle, and the drag-to-rank entry. Shared by the onboarding gate step
 * and the Account Settings card.
 *
 * Row order, always all six apps, numbered 1..6 top to bottom:
 *   1. RANKED  — real handles, in preference order; dark badge, drag grip.
 *   2. BLANK   — not answered yet; gray badge, no grip.
 *   3. N/A     — opted out; gray dashed row, input shows N/A, no grip.
 * Typing a real handle lifts the row into the ranked section (end of it);
 * tapping N/A sinks it to the bottom; numbering re-flows automatically.
 *
 * Drag starts ONLY from the grip (44px target, touch-action:none scoped to
 * it) — a scrolling thumb over rows/inputs must scroll the page, and taps
 * in the input must type, never drag.
 *
 * Handles are whitespace-free by construction (sanitizeHandle on every
 * keystroke); the profile endpoint enforces the same server-side.
 *
 * Props:
 *   values         — apps object key → string
 *   order          — preference order (app keys; may be stale — normalized)
 *   onValuesChange — full next values object
 *   onOrderChange  — full next order array (ranked keys only)
 */

const FIELD_META = {
    venmo: { prefix: '@', placeholder: 'username' },
    cashapp: { prefix: '$', placeholder: 'cashtag' },
    applePay: { prefix: null, placeholder: 'Phone or email' },
    zelle: { prefix: null, placeholder: 'Phone or email' },
    paypal: { prefix: null, placeholder: 'Email or @username' },
    btc: { prefix: null, placeholder: 'Wallet address' },
};

const PaymentAppsEditor = ({ values, order, onValuesChange, onOrderChange }) => {
    const ranked = normalizePreferenceOrder(order, values);
    const blank = PAYMENT_APP_ORDER.filter((k) => String(values?.[k] ?? '').trim() === '');
    const optedOut = PAYMENT_APP_ORDER.filter((k) => !ranked.includes(k) && !blank.includes(k));
    const displayAll = [...ranked, ...blank, ...optedOut];

    const [draggingKey, setDraggingKey] = React.useState(null);
    const rowRefs = React.useRef({});

    const setValue = (key, raw) => onValuesChange({ ...values, [key]: sanitizeHandle(raw) });
    const toggleNA = (key) => {
        const isNA = values?.[key] === 'N/A';
        onValuesChange({ ...values, [key]: isNA ? '' : 'N/A' });
    };

    const handlePointerDown = (key) => (e) => {
        if (e.button != null && e.button !== 0) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setDraggingKey(key);
    };
    const handlePointerMove = (key) => (e) => {
        if (draggingKey !== key) return;
        const y = e.clientY;
        for (let i = 0; i < ranked.length; i++) {
            const el = rowRefs.current[ranked[i]];
            if (!el || ranked[i] === key) continue;
            const r = el.getBoundingClientRect();
            if (y >= r.top && y <= r.bottom) {
                const next = movePreferenceKey(ranked, key, i);
                if (next !== ranked) onOrderChange(next);
                break;
            }
        }
    };
    const endDrag = () => setDraggingKey(null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayAll.map((key, idx) => {
                const meta = FIELD_META[key] || {};
                const value = String(values?.[key] ?? '');
                const isNA = value === 'N/A';
                const isRanked = ranked.includes(key);
                const isDragging = draggingKey === key;
                return (
                    <div
                        key={key}
                        ref={(el) => { rowRefs.current[key] = el; }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 0 8px 10px',
                            border: isNA ? '1px dashed #e2e8f0' : `1px solid ${isDragging ? '#94a3b8' : '#e2e8f0'}`,
                            borderRadius: 10,
                            background: isDragging ? '#f1f5f9' : (isNA ? '#f8fafc' : '#fbfbfd'),
                            boxShadow: isDragging ? '0 4px 10px rgba(15,23,42,0.12)' : 'none',
                            opacity: isNA ? 0.6 : 1,
                        }}
                    >
                        <span style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: isRanked ? '#0f172a' : '#e2e8f0',
                            color: isRanked ? '#fff' : '#64748b',
                            fontSize: 11,
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            {idx + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                                {PAYMENT_APP_LABELS[key] || key}
                            </div>
                            <div style={{ position: 'relative' }}>
                                {meta.prefix && !isNA && (
                                    <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#94a3b8', pointerEvents: 'none' }}>
                                        {meta.prefix}
                                    </span>
                                )}
                                <input
                                    type="text"
                                    value={value}
                                    placeholder={meta.placeholder}
                                    readOnly={isNA}
                                    onChange={(e) => setValue(key, e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: (meta.prefix && !isNA) ? '4px 0 4px 14px' : '4px 0',
                                        border: 'none',
                                        outline: 'none',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: isNA ? '#64748b' : '#0f172a',
                                        background: 'transparent',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => toggleNA(key)}
                            title={isNA ? 'Undo — enter a handle instead' : `I don't use ${PAYMENT_APP_LABELS[key] || key}`}
                            style={{
                                background: isNA ? '#64748b' : '#e8e8e8',
                                color: isNA ? '#fff' : '#333',
                                border: 'none',
                                borderRadius: 8,
                                padding: '10px 12px',
                                fontWeight: 800,
                                fontSize: 12,
                                letterSpacing: 0.4,
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            N/A
                        </button>
                        {isRanked ? (
                            <span
                                onPointerDown={handlePointerDown(key)}
                                onPointerMove={handlePointerMove(key)}
                                onPointerUp={endDrag}
                                onPointerCancel={endDrag}
                                aria-label={`Drag to reorder ${PAYMENT_APP_LABELS[key] || key}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    alignSelf: 'stretch',
                                    minWidth: 40,
                                    touchAction: 'none',
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                    color: '#94a3b8',
                                    flexShrink: 0,
                                }}
                            >
                                <i className="fa-solid fa-grip-lines" style={{ fontSize: 14 }} />
                            </span>
                        ) : (
                            <span style={{ minWidth: 40, flexShrink: 0 }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default PaymentAppsEditor;
