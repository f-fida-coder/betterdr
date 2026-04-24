import React, { useEffect, useState } from 'react';

const AMBER_MS = 15 * 60 * 1000; // odds older than 15 min → soft warning color
const RED_MS = 30 * 60 * 1000;   // older than 30 min → error color (shouldn't happen w/ tier cron)
const TICK_MS = 30 * 1000;

/**
 * Displays "Updated N min ago" derived client-side from a match's odds-sync
 * timestamp. Refreshes label once per 30s without triggering a parent re-render.
 *
 * Props:
 *   - timestamp: ISO string (e.g. match.lastOddsSyncAt). Omitted/invalid → renders nothing.
 *   - className, style: pass-through for layout integration.
 */
const OddsAge = ({ timestamp, className, style: extraStyle }) => {
    const [nowTick, setNowTick] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNowTick(Date.now()), TICK_MS);
        return () => window.clearInterval(id);
    }, []);

    if (!timestamp) return null;
    const ts = new Date(timestamp).getTime();
    if (!Number.isFinite(ts)) return null;

    const ageMs = Math.max(0, nowTick - ts);
    const minutes = Math.floor(ageMs / 60000);

    let label;
    if (ageMs < 60000) label = 'Updated just now';
    else if (minutes === 1) label = 'Updated 1 min ago';
    else label = `Updated ${minutes} min ago`;

    const color = ageMs > RED_MS ? '#c0392b' : ageMs > AMBER_MS ? '#d58512' : '#888';
    const style = { fontSize: 11, color, whiteSpace: 'nowrap', ...extraStyle };

    return <span className={className} style={style}>{label}</span>;
};

export default OddsAge;
