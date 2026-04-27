import React, { useEffect, useState } from 'react';

// Pre-match thresholds: odds older than 15min → amber, 30min → red. Loose
// because the OddsAPI tier cron only runs every 2-5 min for pre-match.
const AMBER_MS = 15 * 60 * 1000;
const RED_MS = 30 * 60 * 1000;
// Live thresholds (when caller passes `live`): tight because live odds must
// reflect in-game state. Above 90s = stale, above 5min = outdated. Per the
// BettorPlays247 business rule: live odds must NEVER be > 60s old.
const LIVE_AMBER_MS = 90 * 1000;
const LIVE_RED_MS = 5 * 60 * 1000;
const TICK_MS = 30 * 1000;

/**
 * Displays "Updated N min ago" derived client-side from a match's odds-sync
 * timestamp. Refreshes label once per 30s without triggering a parent re-render.
 *
 * Props:
 *   - timestamp: ISO string (e.g. match.lastOddsSyncAt). Omitted/invalid → renders nothing.
 *   - live: when true, uses tight live-mode thresholds (90s amber / 5min red)
 *           and renders an explicit STALE / OUTDATED badge so on-call admins
 *           can spot coverage gaps at a glance instead of doing math.
 *   - className, style: pass-through for layout integration.
 */
const OddsAge = ({ timestamp, live = false, className, style: extraStyle }) => {
    const [nowTick, setNowTick] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNowTick(Date.now()), TICK_MS);
        return () => window.clearInterval(id);
    }, []);

    if (!timestamp) return null;
    const ts = new Date(timestamp).getTime();
    if (!Number.isFinite(ts)) return null;

    const ageMs = Math.max(0, nowTick - ts);
    const seconds = Math.floor(ageMs / 1000);
    const minutes = Math.floor(ageMs / 60000);

    let label;
    if (live && ageMs < LIVE_AMBER_MS) {
        label = ageMs < 10000 ? 'Live · just updated' : `Live · ${seconds}s ago`;
    } else if (ageMs < 60000) {
        label = 'Updated just now';
    } else if (minutes === 1) {
        label = 'Updated 1 min ago';
    } else {
        label = `Updated ${minutes} min ago`;
    }

    const amberThreshold = live ? LIVE_AMBER_MS : AMBER_MS;
    const redThreshold = live ? LIVE_RED_MS : RED_MS;
    const isStale = ageMs > amberThreshold;
    const isOutdated = ageMs > redThreshold;
    const color = isOutdated ? '#c0392b' : isStale ? '#d58512' : '#888';

    let badge = null;
    if (live) {
        if (isOutdated) {
            badge = <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 3, background: '#c0392b', color: '#fff', fontSize: 10, fontWeight: 700 }}>OUTDATED</span>;
        } else if (isStale) {
            badge = <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 3, background: '#d58512', color: '#fff', fontSize: 10, fontWeight: 700 }}>STALE</span>;
        }
    }

    const style = { fontSize: 11, color, whiteSpace: 'nowrap', ...extraStyle };
    return <span className={className} style={style}>{label}{badge}</span>;
};

export default OddsAge;
