import React, { useSyncExternalStore } from 'react';

const TICK_MS = 30 * 1000;

// Single shared timer for every <OddsAge /> instance. Previously each instance
// owned its own setInterval — with ~200 match cards mounted on the live board
// that meant 200 independent timers, 200 setState calls per tick, and no
// batching between them. One module-level store + useSyncExternalStore gives
// React 18 a single tick to batch all renders.
let listeners = new Set();
let intervalId = null;
let visibilityBound = false;
let currentNow = Date.now();

function startTimer() {
    if (intervalId !== null) return;
    intervalId = window.setInterval(() => {
        if (document.hidden) return;
        currentNow = Date.now();
        listeners.forEach((l) => l());
    }, TICK_MS);
}

function stopTimer() {
    if (intervalId === null) return;
    window.clearInterval(intervalId);
    intervalId = null;
}

function ensureVisibilityBinding() {
    if (visibilityBound) return;
    visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopTimer();
        } else if (listeners.size > 0) {
            // Bump the clock on resume so consumers don't keep showing
            // a 5-minute-old label until the next tick fires.
            currentNow = Date.now();
            listeners.forEach((l) => l());
            startTimer();
        }
    });
}

function subscribe(callback) {
    listeners.add(callback);
    ensureVisibilityBinding();
    startTimer();
    return () => {
        listeners.delete(callback);
        if (listeners.size === 0) stopTimer();
    };
}

function getSnapshot() {
    return currentNow;
}

/**
 * Displays "Updated N min ago" derived client-side from a match's odds-sync
 * timestamp. Refreshes label once per 30s via a shared clock.
 *
 * Props:
 *   - timestamp: ISO string (e.g. match.lastOddsSyncAt). Omitted/invalid → renders nothing.
 *   - live: when true, uses live-mode label ("Live · 12s") for sub-90s ages.
 *   - className, style: pass-through for layout integration.
 */
const OddsAge = ({ timestamp, live = false, className, style: extraStyle }) => {
    const nowTick = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    if (!timestamp) return null;
    const ts = new Date(timestamp).getTime();
    if (!Number.isFinite(ts)) return null;

    const ageMs = Math.max(0, nowTick - ts);
    const seconds = Math.floor(ageMs / 1000);
    const minutes = Math.floor(ageMs / 60000);

    let label;
    if (live && ageMs < 90 * 1000) {
        label = ageMs < 10000 ? 'Live · now' : `Live · ${seconds}s`;
    } else if (ageMs < 60000) {
        label = 'Just now';
    } else if (minutes === 1) {
        label = '1m ago';
    } else {
        label = `${minutes}m ago`;
    }

    const style = {
        fontSize: 11,
        color: '#888',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
        ...extraStyle,
    };
    return <span className={className} style={style}>{label}</span>;
};

export default OddsAge;
