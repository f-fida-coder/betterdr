import React, { useEffect, useRef, useState } from 'react';

/**
 * Floating "Continue" FAB, bottom-right corner. Mounts when `visible`
 * becomes true, fades + slides up on entry, fades out on hide. Sits
 * above the feedback bar (bottom-left-anchored) and clear of the
 * chat bubble (also bottom-left) — nothing overlaps because this
 * component lives on the right.
 */
const ContinueFab = ({ visible, onClick, label = 'Continue to bet slip' }) => {
    const [mounted, setMounted] = useState(visible);
    const [entered, setEntered] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (visible) {
            setMounted(true);
            // Give the browser one frame with the entry styles before
            // toggling entered=true so the transition actually fires.
            const raf = window.requestAnimationFrame(() => setEntered(true));
            return () => window.cancelAnimationFrame(raf);
        }
        setEntered(false);
        timerRef.current = window.setTimeout(() => {
            setMounted(false);
            timerRef.current = null;
        }, 180);
        return undefined;
    }, [visible]);

    if (!mounted) return null;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            style={{
                position: 'fixed',
                right: 16,
                // Sit above the bottom safe-area inset on iOS and clear
                // of the feedback bar (~40px) on desktop.
                bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                width: 56,
                height: 56,
                borderRadius: 28,
                border: 'none',
                background: '#10b981',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                zIndex: 1100,
                opacity: entered ? 1 : 0,
                transform: entered ? 'translateY(0)' : 'translateY(8px)',
                transition: entered
                    ? 'opacity 200ms ease, transform 200ms ease'
                    : 'opacity 150ms ease, transform 150ms ease',
            }}
            onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
                e.currentTarget.style.background = '#059669';
            }}
            onMouseUp={(e) => {
                e.currentTarget.style.transform = entered ? 'translateY(0)' : 'translateY(8px)';
                e.currentTarget.style.background = '#10b981';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = entered ? 'translateY(0)' : 'translateY(8px)';
                e.currentTarget.style.background = '#10b981';
            }}
        >
            <i className="fa-solid fa-chevron-right" style={{ fontSize: 22, fontWeight: 900 }}></i>
        </button>
    );
};

export default ContinueFab;
