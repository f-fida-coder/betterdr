import React, { useState } from 'react';
import { sportsData } from '../data/sportsData';

const SidebarItem = ({
    item,
    level,
    selectedIds,
    onToggle,
    expandedIds,
    onToggleExpand,
    className = ""
}) => {
    const isExpanded = expandedIds.has(item.id);
    const isSelected = selectedIds.includes(item.id);
    const hasChildren = (item.children && item.children.length > 0) || item.hasChildren;

    const handleExpandClick = () => {
        const isSelectable = item.selectable !== false;
        if (hasChildren) {
            onToggleExpand(item.id);
            if (isSelectable) {
                onToggle(item.id);
            }
            return;
        }
        onToggle(item.id);
    };

    const handleCheckboxChange = (e) => {
        e.stopPropagation();
        onToggle(item.id);
    };

        const showCheckbox = item.selectable !== false && level > 0 && item.type !== 'props-plus';
    const showIcon = (level === 0 && item.icon) || (item.type === 'props-plus');
    const isMarketGroup = item.selectable === false && hasChildren;
    const showBlueArrow = level > 0 && hasChildren && !isMarketGroup;     const showBlackArrow = level > 0 && isMarketGroup; 
    return (
        <div className={`sidebar-tree-node ${className}`}>
            <div
                className={`sidebar-item-row ${isSelected ? 'selected' : ''} level-${level} item-type-${item.type || 'standard'} icon-${item.id}`}
                onClick={handleExpandClick}
                data-sport-id={item.id}
            >
                {showCheckbox && (
                    <div className="sidebar-checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={handleCheckboxChange}
                            className="sidebar-small-checkbox"
                        />
                    </div>
                )}

                {showBlackArrow && (
                    <span className={`black-expand-arrow ${isExpanded ? 'active' : ''}`}>
                        <i className="fa-solid fa-chevron-down"></i>
                    </span>
                )}

                {showBlueArrow && (
                    <span className={`blue-expand-arrow ${isExpanded ? 'active' : ''}`}>
                        <i className="fa-solid fa-chevron-right"></i>
                    </span>
                )}

                <div className="sidebar-item-content">
                    {showIcon && item.icon && (
                        <span className={`icon ${item.type === 'props-plus' ? 'sidebar-blue-icon' : 'sidebar-main-icon'}`}>
                            {typeof item.icon === 'string' && item.icon.includes('fa-') ? <i className={item.icon}></i> : item.icon}
                        </span>
                    )}

                    <span className="sidebar-label-text">{item.label}</span>
                </div>

                {level === 0 && hasChildren && (
                    <span className={`main-cat-arrow ${isExpanded ? 'expanded' : ''}`}>
                        <i className="fa-solid fa-chevron-down"></i>
                    </span>
                )}
            </div>

            {hasChildren && isExpanded && item.children && (
                <div className="sidebar-children">
                    {item.children.map(child => (
                        <SidebarItem
                            key={child.id}
                            item={child}
                            level={level + 1}
                            selectedIds={selectedIds}
                            onToggle={onToggle}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const DashboardSidebar = ({ selectedSports = [], onToggleSport, betMode = 'straight', isOpen = false, onCloseSidebar, onOpenFeedback, isMobileSportsSelectionMode = false }) => {
        const [expandedIds, setExpandedIds] = useState(new Set(['football', 'nfl', 'ncaa-football']));

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

        const handleMobileSportSelect = (id) => {
        onToggleSport(id);
    };

        const parlaySportsIds = ['football', 'baseball', 'basketball', 'hockey', 'soccer', 'mma'];
    const displaySports = (betMode === 'parlay' || betMode === 'teaser' || betMode === 'if_bet' || betMode === 'reverse')
        ? sportsData.filter(s => parlaySportsIds.includes(s.id))
        : sportsData;

    return (
        <aside className={`dash-sidebar ${isOpen ? 'open' : ''} ${isMobileSportsSelectionMode ? 'mobile-sports-selection-mode' : ''}`}>
            <div className="search-container desktop-search">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                    type="text"
                    className="search-input"
                    placeholder="SEARCH"
                />
            </div>

            <div className="sidebar-header desktop-only">SPORTS SCHEDULE</div>

            <div className="sidebar-mobile-info mobile-only">
                <div className="info-item">UP NEXT</div>
                <div className="info-item">FEATURED</div>
            </div>

            <div className="sidebar-content">
                <div className="mobile-only-section">
                    <div
                        className={`sidebar-item-row level-0 ${selectedSports.includes('commercial-live') ? 'selected' : ''}`}
                        onClick={() => handleMobileSportSelect('commercial-live')}
                    >
                        <div className="sidebar-item-content">
                            <span className="icon sidebar-main-icon" style={{ color: '#007bff' }}>
                                <i className="fa-solid fa-desktop"></i>
                            </span>
                            <span className="sidebar-label-text">COMMERCIAL LIVE</span>
                        </div>
                    </div>
                </div>

                {displaySports.map((item) => (
                    <SidebarItem
                        key={item.id}
                        item={item}
                        level={0}
                        selectedIds={selectedSports}
                        onToggle={onToggleSport}
                        expandedIds={expandedIds}
                        onToggleExpand={toggleExpand}
                        className={item.id === 'commercial-live' || item.id === 'up-next' || item.id === 'featured' ? 'desktop-only' : ''}
                    />
                ))}
            </div>

            <div className="mobile-only feedback-btn-container">
                <button className="mobile-feedback-btn" onClick={onOpenFeedback}>FEEDBACK</button>
            </div>
        </aside>
    );
};

export default DashboardSidebar;
