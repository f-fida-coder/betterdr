import React, { useEffect, useState } from 'react';

const TICK_MS = 30 * 1000;

/**
 * Displays "Updated N min ago" derived client-side from a match's odds-sync
 * timestamp. Refreshes label once per 30s without triggering a parent re-render.
 *
 * Stale rows are dropped server-side now, so this component only renders the
 * relative time — no STALE / OUTDATED badge, no server-side `stale` prop.
 *
 * Props:
 *   - timestamp: ISO string (e.g. match.lastOddsSyncAt). Omitted/invalid → renders nothing.
 *   - live: when true, uses live-mode label ("Live · 12s") for sub-90s ages.
 *   - className, style: pass-through for layout integration.
 */
const OddsAge = ({ timestamp, live = false, className, style: extraStyle }) => {
    const [nowTick, setNowTick] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => {
            if (!document.hidden) setNowTick(Date.now());
        }, TICK_MS);
        return () => window.clearInterval(id);
    }, []);

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
