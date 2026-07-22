import React from 'react';
import {
    PAYMENT_APP_ORDER,
    PAYMENT_APP_LABELS,
    isFilledHandle,
    normalizePreferenceOrder,
    movePreferenceKey,
} from '../utils/paymentApps';

/**
 * Drag-to-rank payout preference list — shared by the onboarding gate's
 * Payment Apps step and the Account Settings card (one component on purpose:
 * drag logic is where mirrored copies rot).
 *
 * Shows ONLY apps with a real handle (N/A and blank are excluded), live —
 * flipping a field to N/A removes its row and renumbers 1..N with no gaps.
 * Hidden entirely below two rankable apps (nothing to rank). Never blocks
 * saving: an untouched list is simply the canonical order.
 *
 * Hand-rolled Pointer Events sortable (no dnd dependency — none exists in
 * this repo and the list is at most six rows): pointerdown on a row captures
 * the pointer, moves reorder when the pointer crosses a neighbor's midpoint,
 * pointerup releases. touch-action:none on rows keeps iOS Safari from
 * hijacking the gesture into a page scroll.
 *
 * Props:
 *   values   — the apps object of key → handle string (live field values)
 *   order    — preference order array (app keys; may be stale/partial)
 *   onChange — called with the full normalized order after a drag
 */
const PaymentPreferenceRanking = ({ values, order, onChange }) => {
    const display = normalizePreferenceOrder(order, values);
    const [draggingKey, setDraggingKey] = React.useState(null);
    const rowRefs = React.useRef({});

    // Nicky 2026-07-22: the list shows EVERY app — real handles are the
    // draggable, numbered rows on top; N/A (or still-blank) apps sit in a
    // grayed section at the bottom automatically. Only the ranked keys are
    // ever saved to preferenceOrder; the bottom section is presentation.
    const unranked = PAYMENT_APP_ORDER.filter((k) => !isFilledHandle(values?.[k]));
    const anyAnswered = PAYMENT_APP_ORDER.some((k) => String(values?.[k] ?? '').trim() !== '');

    // Fresh untouched form: six empty fields already sit directly above —
    // mirroring them as six "Not set" rows would just be noise.
    if (!anyAnswered) {
        return null;
    }

    const handlePointerDown = (key) => (e) => {
        // Primary button / single touch only.
        if (e.button != null && e.button !== 0) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setDraggingKey(key);
    };

    const handlePointerMove = (key) => (e) => {
        if (draggingKey !== key) return;
        const y = e.clientY;
        // Find the row whose vertical band the pointer is inside; crossing a
        // neighbor's midpoint swaps positions (movePreferenceKey clamps).
        for (let i = 0; i < display.length; i++) {
            const el = rowRefs.current[display[i]];
            if (!el || display[i] === key) continue;
            const r = el.getBoundingClientRect();
            if (y >= r.top && y <= r.bottom) {
                const next = movePreferenceKey(display, key, i);
                if (next !== display) onChange(next);
                break;
            }
        }
    };

    const endDrag = () => setDraggingKey(null);

    return (
        <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Payout preference
            </div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, marginBottom: 8 }}>
                Drag to order — #1 is where you&apos;d like to be paid first. N/A apps
                drop to the bottom automatically.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {display.map((key, idx) => {
                    const isDragging = draggingKey === key;
                    return (
                        <div
                            key={key}
                            ref={(el) => { rowRefs.current[key] = el; }}
                            onPointerDown={handlePointerDown(key)}
                            onPointerMove={handlePointerMove(key)}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                minHeight: 44,
                                padding: '0 12px',
                                border: `1px solid ${isDragging ? '#94a3b8' : '#e2e8f0'}`,
                                borderRadius: 8,
                                background: isDragging ? '#f1f5f9' : '#fbfbfd',
                                boxShadow: isDragging ? '0 4px 10px rgba(15,23,42,0.12)' : 'none',
                                touchAction: 'none',
                                cursor: isDragging ? 'grabbing' : 'grab',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                            }}
                        >
                            <span style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: '#0f172a',
                                color: '#fff',
                                fontSize: 11,
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                {idx + 1}
                            </span>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {PAYMENT_APP_LABELS[key] || key}
                                <span style={{ fontWeight: 600, color: '#94a3b8', marginLeft: 8, fontSize: 12 }}>
                                    {String(values?.[key] ?? '')}
                                </span>
                            </span>
                            <i className="fa-solid fa-grip-lines" style={{ color: '#94a3b8', fontSize: 13, flexShrink: 0 }} />
                        </div>
                    );
                })}
                {unranked.map((key) => (
                    <div
                        key={key}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            minHeight: 44,
                            padding: '0 12px',
                            border: '1px dashed #e2e8f0',
                            borderRadius: 8,
                            background: '#f8fafc',
                            opacity: 0.55,
                        }}
                    >
                        <span style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#e2e8f0',
                            color: '#64748b',
                            fontSize: 11,
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            –
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {PAYMENT_APP_LABELS[key] || key}
                            <span style={{ fontWeight: 600, color: '#94a3b8', marginLeft: 8, fontSize: 12 }}>
                                {String(values?.[key] ?? '').trim() === '' ? 'Not set' : 'N/A'}
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PaymentPreferenceRanking;
