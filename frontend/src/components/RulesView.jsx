import React, { useState, useEffect } from 'react';
import { getContentRules, getStoredAuthToken } from '../api';

/**
 * Always-available Rules reference page (dashboardView 'rules' — mobile
 * grid-menu tile + desktop user-menu entry). Renders BOTH acceptance sets
 * from the same admin-managed `rules` collection the onboarding gate
 * shows, so what a player accepted at signup and what they can re-read
 * during a payout dispute are one document, never two copies. Read-only:
 * acceptance stamps live only in the onboarding gate.
 */

// Display order and headings for the two sets. Docs without a ruleSet
// field predate the two-set split and belong to platform_rules (the server
// normalizes, this is belt-and-suspenders for cached payloads).
const RULE_SET_GROUPS = [
    { setKey: 'house_rules', heading: 'House Rules' },
    { setKey: 'platform_rules', heading: 'Platform Rules' },
];

const RulesView = () => {
    const [rules, setRules] = useState(null);
    const [error, setError] = useState(false);
    const [expandedKey, setExpandedKey] = useState(null);

    useEffect(() => {
        let alive = true;
        const token = getStoredAuthToken();
        getContentRules(token)
            .then((data) => { if (alive) setRules(Array.isArray(data?.rules) ? data.rules : []); })
            .catch(() => { if (alive) { setRules([]); setError(true); } });
        return () => { alive = false; };
    }, []);

    const toggle = (key) => setExpandedKey((prev) => (prev === key ? null : key));

    return (
        <div style={{
            background: 'white',
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 0 40px' }}>
                {rules === null && (
                    <div style={{ padding: '24px 20px', fontSize: 13, color: '#64748b' }}>Loading rules…</div>
                )}
                {rules !== null && error && (
                    <div style={{ padding: '24px 20px', fontSize: 13, color: '#64748b' }}>
                        Rules are temporarily unavailable — please try again in a moment.
                    </div>
                )}

                {rules !== null && !error && RULE_SET_GROUPS.map((group) => {
                    const sections = rules.filter(
                        (s) => ((s.ruleSet || 'platform_rules') === group.setKey),
                    );
                    if (sections.length === 0) return null;
                    return (
                        <div key={group.setKey} style={{ marginBottom: 8 }}>
                            <div style={{
                                padding: '18px 20px 8px',
                                fontSize: 16,
                                fontWeight: 800,
                                color: '#0f172a',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                borderBottom: '2px solid #0f172a',
                            }}>
                                {group.heading}
                            </div>
                            {sections.map((section, i) => {
                                const key = `${group.setKey}:${section.id || i}`;
                                const open = expandedKey === key;
                                return (
                                    <div key={key} style={{ borderBottom: '1px solid #eee' }}>
                                        <div
                                            onClick={() => toggle(key)}
                                            style={{
                                                padding: '15px 20px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: open ? '#f9f9f9' : 'white',
                                            }}
                                        >
                                            <span style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>
                                                {section.title}
                                            </span>
                                            <i
                                                className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`}
                                                style={{ fontSize: 11, color: '#94a3b8' }}
                                            />
                                        </div>
                                        {open && (
                                            <div style={{
                                                padding: '4px 20px 16px',
                                                background: '#fcfcfc',
                                                borderTop: '1px solid #eee',
                                            }}>
                                                <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                                                    {(section.items || []).map((item, j) => (
                                                        <li key={j} style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 5 }}>
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RulesView;
