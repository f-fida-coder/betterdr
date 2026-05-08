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

/**
 * Board-level teaser type picker. Renders ABOVE the games list when
 * the user enters teaser mode but hasn't picked a type yet; once a
 * type is picked, collapses to a summary chip with a Change button
 * that resets the picker. The slip drawer never renders the picker
 * — this component is the single point of UX for type selection so
 * board lines + slip math stay in lock-step.
 *
 * Pure presentational: all state is owned by the parent (App).
 */
const TeaserTypePicker = ({
    teaserTypes = [],
    selectedTeaserType = null,
    onTeaserTypeChange,
    normalizedBetMode,
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
                    {sorted.map((type) => (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() => onTeaserTypeChange && onTeaserTypeChange(type.id)}
                            style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                border: '1px solid #e5e7eb',
                                background: '#fff',
                                borderRadius: 8,
                                cursor: 'pointer',
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
                        </button>
                    ))}
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
