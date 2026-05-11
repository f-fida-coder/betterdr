import React from 'react';

// Format a type's points + ties summary as one display line.
// Used by both the picker card (one row per type) and the summary
// chip (selected type's identity). Sport tokens are skipped when
// pointsBySport doesn't carry a positive number for that sport so
// future hockey/baseball-less types render cleanly.
const formatTypeSegments = (type) => {
    if (!type || typeof type !== 'object') return '';
    const fbPts = Number(type?.pointsBySport?.football);
    const bkPts = Number(type?.pointsBySport?.basketball);
    const ties = String(type?.tiesRule || '').toLowerCase() === 'lose'
        ? 'Ties Lose'
        : 'Ties Push';
    const segs = [];
    if (Number.isFinite(fbPts) && fbPts > 0) segs.push(`${fbPts} pts FB`);
    if (Number.isFinite(bkPts) && bkPts > 0) segs.push(`${bkPts} pts BK`);
    segs.push(ties);
    // Surface a leg-count badge only when the type carries stricter
    // bounds than the generic teaser rule (2-6). Standard types stay
    // unbadged because a "2-6 teams" tag on every card adds noise
    // without information; Super Teasers (3-6) and any future single-
    // leg-count product (e.g. 4-team-only specials) get the hint.
    const minLegs = Number(type?.minLegs);
    const maxLegs = Number(type?.maxLegs);
    const hasCustomMin = Number.isFinite(minLegs) && minLegs > 2;
    const hasCustomMax = Number.isFinite(maxLegs) && maxLegs < 6;
    if (hasCustomMin || hasCustomMax) {
        const lo = hasCustomMin ? minLegs : 2;
        const hi = Number.isFinite(maxLegs) ? maxLegs : 6;
        segs.push(lo === hi ? `${lo} teams` : `${lo}-${hi} teams`);
    }
    return segs.join(' · ');
};

// Sort by sortOrder ascending; entries without sortOrder fall to the
// end in stable input order (Array.prototype.sort is stable since
// 2019). Defensive copy so the caller's array isn't mutated.
const orderTeaserTypes = (types) => {
    if (!Array.isArray(types)) return [];
    return [...types].sort((a, b) => {
        const ao = Number.isFinite(Number(a?.sortOrder)) ? Number(a.sortOrder) : Number.POSITIVE_INFINITY;
        const bo = Number.isFinite(Number(b?.sortOrder)) ? Number(b.sortOrder) : Number.POSITIVE_INFINITY;
        return ao - bo;
    });
};

// A type is usable on a slip only if its pointsBySport carries a
// positive value for every sport group present. Empty slip groups →
// compatible (caller hasn't constrained yet, e.g. board picker
// shown before any selection is added).
const isTypeCompatibleWithSlip = (type, slipSportGroups) => {
    if (!Array.isArray(slipSportGroups) || slipSportGroups.length === 0) return true;
    const map = (type && typeof type === 'object') ? type.pointsBySport : null;
    if (!map || typeof map !== 'object') return false;
    for (const group of slipSportGroups) {
        const v = Number(map[group]);
        if (!Number.isFinite(v) || v <= 0) return false;
    }
    return true;
};

// Hint shown on a disabled card so the user understands *why* the
// type is unavailable (e.g. Super Teaser → "Football only"). Looks
// at which sports the type's pointsBySport actually covers, NOT at
// the slip — keeps the message stable as the user edits selections.
const compatibilityHint = (type) => {
    const map = type?.pointsBySport;
    if (!map || typeof map !== 'object') return 'Not available for your selections';
    const covers = [];
    if (Number(map.football) > 0) covers.push('Football');
    if (Number(map.basketball) > 0) covers.push('Basketball');
    if (covers.length === 1) return `${covers[0]} only`;
    return 'Not available for your selections';
};

/**
 * Teaser type picker. Renders in two places: above the games list and
 * inside the betslip drawer. Both instances are wired to the same
 * `selectedTeaserTypeId` / `onTeaserTypeChange` in App, so a change
 * in either spot updates the other and the teased lines stay in
 * lock-step. `containerStyle` lets the slip override the default
 * board margin so the picker aligns with the slip's own padding.
 *
 * Pure presentational: all state is owned by the parent (App).
 */
const TeaserTypePicker = ({
    teaserTypes = [],
    selectedTeaserType = null,
    onTeaserTypeChange,
    normalizedBetMode,
    containerStyle,
    // Sport groups present on the current slip (e.g. ['basketball']
    // for an NBA-only slip). Types whose pointsBySport doesn't cover
    // every group are rendered disabled so the user can't pick the
    // wrong product. Empty/undefined = no filtering.
    slipSportGroups = [],
}) => {
    if (normalizedBetMode !== 'teaser') return null;
    const list = Array.isArray(teaserTypes) ? teaserTypes : [];
    if (list.length === 0) return null;

    if (!selectedTeaserType) {
        const sorted = orderTeaserTypes(list);
        return (
            <div style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: 12,
                margin: '8px 12px 12px',
                ...containerStyle,
            }}>
                <div style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 4,
                }}>Choose Teaser Type</div>
                <div style={{
                    fontSize: 11,
                    color: '#64748b',
                    marginBottom: 10,
                    lineHeight: 1.4,
                }}>
                    Pick one variant to continue. Game lines and payout apply
                    to every leg you add.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sorted.map((type) => {
                        const compat = isTypeCompatibleWithSlip(type, slipSportGroups);
                        const hint = compat ? null : compatibilityHint(type);
                        return (
                            <button
                                key={type.id}
                                type="button"
                                disabled={!compat}
                                onClick={() => compat && onTeaserTypeChange && onTeaserTypeChange(type.id)}
                                style={{
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    border: '1px solid #e5e7eb',
                                    background: '#fff',
                                    borderRadius: 8,
                                    cursor: compat ? 'pointer' : 'not-allowed',
                                    opacity: compat ? 1 : 0.55,
                                    transition: 'all 120ms ease',
                                }}
                            >
                                <div style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    marginBottom: 2,
                                }}>{type.label || type.id}</div>
                                <div style={{
                                    fontSize: 11,
                                    color: '#475569',
                                    lineHeight: 1.4,
                                }}>{formatTypeSegments(type)}</div>
                                {hint && (
                                    <div style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: '#b91c1c',
                                        marginTop: 4,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.4,
                                    }}>{hint}</div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Selected — summary chip with Change. Clicking Change clears the
    // type id; App also clears teaserPoints in its onTeaserTypeChange
    // wrapper so a stale point value from the previous type doesn't
    // leak into the next pick.
    return (
        <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '10px 12px',
            margin: '8px 12px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            ...containerStyle,
        }}>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 2,
                }}>Teaser Type</div>
                <div style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>{selectedTeaserType.label || selectedTeaserType.id}</div>
                <div style={{
                    fontSize: 11,
                    color: '#64748b',
                    marginTop: 2,
                }}>{formatTypeSegments(selectedTeaserType)}</div>
            </div>
            <button
                type="button"
                onClick={() => onTeaserTypeChange && onTeaserTypeChange(null)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#1f7ae0',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    whiteSpace: 'nowrap',
                }}
            >
                Change
            </button>
        </div>
    );
};

export default TeaserTypePicker;
