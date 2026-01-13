import React, { useState } from 'react';
import '../props.css';

const PropsView = () => {
    const [activeTab, setActiveTab] = useState('horses');
    const [expandedGroups, setExpandedGroups] = useState({
        'US-Thoroughbred': true,
        'US-Harness': true,
        'CA-Harness': true,
        'AU-Harness': true,
    });

    const toggleGroup = (group) => {
        setExpandedGroups(prev => ({
            ...prev,
            [group]: !prev[group]
        }));
    };

    return (
        <div className="props-container">
            <div className="props-mini-sidebar">
                <div
                    className={`props-ms-item ${activeTab === 'props' ? 'active' : ''}`}
                    onClick={() => setActiveTab('props')}
                >
                    <div className="props-ms-icon">
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '0.8', fontSize: '8px' }}>
                            <span>1</span>
                            <span>9</span>
                            <span>1</span>
                        </div>
                    </div>
                    <div>PROPS+</div>
                </div>
                <div
                    className={`props-ms-item ${activeTab === 'horses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('horses')}
                >
                    <div className="props-ms-icon">♞</div>
                    <div>HORSES</div>
                </div>
            </div>

            <div className="props-selection-sidebar">
                <div className="props-search-area">
                    <div className="props-search-header-row">
                        <span>Search</span>
                        <span>▲</span>
                    </div>
                    <div className="props-search-label">Track</div>
                    <input type="text" className="props-search-input" />
                    <button className="props-adv-search-btn">Advanced search</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <TrackGroup
                        title="Thoroughbred"
                        flag="🇺🇸"
                        id="US-Thoroughbred"
                        expanded={expandedGroups['US-Thoroughbred']}
                        onToggle={() => toggleGroup('US-Thoroughbred')}
                    >
                        <TrackItem name="Mahoning Valley" times={['4th 24m']} />
                        <TrackItem name="Parx Racing" times={['4th 13m']} />
                        <TrackItem name="Turf Paradise" times={['1st >1h']} />
                    </TrackGroup>

                    <TrackGroup
                        title="Harness"
                        flag="🇺🇸"
                        id="US-Harness"
                        expanded={expandedGroups['US-Harness']}
                        onToggle={() => toggleGroup('US-Harness')}
                    >
                        <TrackItem name="Dover Downs" times={['1st >3h']} />
                        <TrackItem name="Monticello Raceway" times={['5th 15m']} />
                    </TrackGroup>

                    <TrackGroup
                        title="Harness"
                        flag="🇨🇦"
                        id="CA-Harness"
                        expanded={expandedGroups['CA-Harness']}
                        onToggle={() => toggleGroup('CA-Harness')}
                    >
                        <TrackItem name="Woodbine Mohawk Harness" times={['1st >4h']} />
                    </TrackGroup>

                    <TrackGroup
                        title="Harness"
                        flag="🇦🇺"
                        id="AU-Harness"
                        expanded={expandedGroups['AU-Harness']}
                        onToggle={() => toggleGroup('AU-Harness')}
                    >
                        <TrackItem name="Australia Harness 1" times={['1st >6h']} />
                        <TrackItem name="Australia Harness 2" times={['1st >8h']} />
                    </TrackGroup>
                </div>
            </div>

            <div className="props-main">
                <div className="props-main-header">
                    Next racing races
                </div>

                <div className="props-race-grid">

                    <div className="props-race-row">
                    </div>
                </div>
            </div>
        </div>
    );
};

const TrackGroup = ({ title, flag, id, expanded, onToggle, children }) => {
    return (
        <div className="props-track-group">
            <div className="props-group-header" onClick={onToggle}>
                <span style={{ fontSize: '14px' }}>{flag}</span>
                <span style={{ flex: 1 }}>{title}</span>
                <span style={{ fontSize: '10px' }}>{expanded ? '▲' : '▼'}</span>
            </div>
            {expanded && (
                <div>
                    {children}
                </div>
            )}
        </div>
    );
};

const TrackItem = ({ name, times }) => {
    return (
        <div className="props-track-item">
            <span>{name}</span>
            <div className="props-track-time-badges">
                {times.map((t, idx) => (
                    <span key={idx} className="props-time-badge">{t}</span>
                ))}
            </div>
        </div>
    );
};

export default PropsView;
