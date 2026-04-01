import React, { useState, useEffect, useMemo } from 'react';
import { sportsData, isChildActive } from '../data/sportsData';
import { getAvailableSports } from '../api';

/**
 * Filter a sport's children to only include items backed by configured
 * Odds API sport keys OR items whose sportKeys match available data.
 * If `liveSet` is provided (from /api/matches/sports), it supplements
 * the static config check.
 */
const filterActiveChildren = (children, liveSet) => {
    if (!children) return [];
    return children.filter(child => {
        // Static check: is at least one sportKey in CONFIGURED_SPORT_KEYS?
        if (isChildActive(child)) return true;
        // Dynamic check: does the live data set include any of this child's sportKeys or keywords?
        if (liveSet && child.sportKeys) {
            return child.sportKeys.some(k => liveSet.has(k.toLowerCase()));
        }
        return false;
    });
};

const SidebarItem = ({
    item,
    level,
    selectedIds,
    onToggle,
    expandedIds,
    onToggleExpand,
    className = '',
    isMobile = false,
    liveSet = null,
}) => {
    const isExpanded = expandedIds.has(item.id);
    const isSelected = selectedIds.includes(item.id);

    // Filter children to only show active ones
    const activeChildren = useMemo(
        () => filterActiveChildren(item.children, liveSet),
        [item.children, liveSet],
    );

    const hasChildren = activeChildren.length > 0;

    // Check if any child is selected (for parent active context)
    const hasSelectedChild = useMemo(() => {
        if (!activeChildren.length) return false;
        return activeChildren.some(child => selectedIds.includes(child.id));
    }, [activeChildren, selectedIds]);
    const isSelectable = item.selectable !== false;
    const isPropsPlus = item.type === 'props-plus';
    const isFutures = item.type === 'futures';
    const isMarketGroup = !isSelectable && hasChildren;

    const showCheckbox = isSelectable && level > 0 && !isPropsPlus && !isMobile;
    const showIcon = (level === 0 && item.icon) || isPropsPlus;
    const showBlueArrow = level > 0 && hasChildren && !isMarketGroup;
    const showBlackArrow = level > 0 && isMarketGroup;

    const handleClick = () => {
        if (hasChildren) {
            onToggleExpand(item.id);
            if (isSelectable) onToggle(item.id);
            return;
        }
        if (isSelectable) onToggle(item.id);
    };

    const handleCheckbox = (e) => {
        e.stopPropagation();
        onToggle(item.id);
    };

    // Build row class names
    const rowClasses = [
        'sidebar-item-row',
        isSelected && 'selected',
        hasSelectedChild && 'has-active-child',
        !isSelectable && hasChildren && 'expander-only',
        `level-${level}`,
        `item-type-${item.type || 'standard'}`,
        isPropsPlus && 'props-plus-row',
        isFutures && 'futures-row',
        `icon-${item.id}`,
    ].filter(Boolean).join(' ');

    return (
        <div className={`sidebar-tree-node ${className}`}>
            <div className={rowClasses} onClick={handleClick} data-sport-id={item.id}>

                {showCheckbox && (
                    <div className="sidebar-checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={handleCheckbox} className="sidebar-small-checkbox" />
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

                {isPropsPlus && (
                    <span className="props-plus-arrow"><i className="fa-solid fa-arrow-right"></i></span>
                )}

                <div className="sidebar-item-content">
                    {showIcon && item.icon && !isPropsPlus && (
                        <span className="icon sidebar-main-icon">
                            {typeof item.icon === 'string' && item.icon.includes('fa-') ? <i className={item.icon}></i> : item.icon}
                        </span>
                    )}
                    <span className="sidebar-label-text">{item.label}</span>
                    {isPropsPlus && <span className="props-plus-badge">+</span>}
                </div>

                {level === 0 && hasChildren && (
                    <span className={`main-cat-arrow ${isExpanded ? 'expanded' : ''}`}>
                        <i className="fa-solid fa-chevron-down"></i>
                    </span>
                )}
            </div>

            {hasChildren && isExpanded && (
                <div className="sidebar-children">
                    {activeChildren.map(child => (
                        <SidebarItem
                            key={child.id}
                            item={child}
                            level={level + 1}
                            selectedIds={selectedIds}
                            onToggle={onToggle}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            isMobile={isMobile}
                            liveSet={liveSet}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const DashboardSidebar = ({
    selectedSports = [],
    onToggleSport,
    betMode = 'straight',
    isOpen = false,
    onCloseSidebar,
    onOpenFeedback,
    isMobileSportsSelectionMode = false,
}) => {
    const [expandedIds, setExpandedIds] = useState(new Set(['football']));
    const [liveSet, setLiveSet] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch which sport values currently have data
    useEffect(() => {
        getAvailableSports().then((sports) => {
            if (Array.isArray(sports) && sports.length > 0) {
                setLiveSet(new Set(sports.map(s => s.toLowerCase())));
            }
        });
    }, []);

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Parlay/teaser modes limit to major sports
    const parlaySportsIds = new Set(['football', 'baseball', 'basketball', 'hockey', 'soccer', 'martial-arts']);
    const isRestrictedMode = ['parlay', 'teaser', 'if_bet', 'reverse'].includes(betMode);
    const displaySports = isRestrictedMode
        ? sportsData.filter(s => parlaySportsIds.has(s.id))
        : sportsData;

    // Filter: remove parent sports that have zero visible children after active-check,
    // then optionally filter by search query.
    const filteredSports = useMemo(() => {
        // First pass: hide parents with no active children
        const withActiveChildren = displaySports.filter(s => {
            if (!s.children) return true; // top-level links (UP NEXT, LIVE NOW)
            const active = filterActiveChildren(s.children, liveSet);
            return active.length > 0;
        });

        const q = searchQuery.trim().toLowerCase();
        if (!q) return withActiveChildren;
        return withActiveChildren.filter(s => {
            if (s.label.toLowerCase().includes(q)) return true;
            if (s.children) return s.children.some(c => c.label.toLowerCase().includes(q));
            return false;
        });
    }, [displaySports, searchQuery, liveSet]);

    return (
        <aside className={`dash-sidebar ${isOpen ? 'open' : ''} ${isMobileSportsSelectionMode ? 'mobile-sports-selection-mode' : ''}`}>

            {/* Search bar */}
            <div className="search-container desktop-search">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Desktop header */}
            <div className="sidebar-header desktop-only">SPORTS SCHEDULE</div>

            {/* Mobile: UP NEXT / FEATURED secondary tabs */}
            <div className="sidebar-mobile-tabs mobile-only">
                <button
                    className={`mobile-tab-btn ${selectedSports.includes('up-next') ? 'active' : ''}`}
                    onClick={() => onToggleSport('up-next')}
                >
                    &ndash; UP NEXT &ndash;
                </button>
                <button className="mobile-tab-btn active-default">&ndash; FEATURED &ndash;</button>
            </div>

            {/* Sports list */}
            <div className="sidebar-content">

                {/* Mobile-only LIVE NOW row */}
                <div className="mobile-only mobile-live-now-row">
                    <div
                        className={`sidebar-item-row level-0 ${selectedSports.includes('commercial-live') ? 'selected' : ''}`}
                        onClick={() => onToggleSport('commercial-live')}
                        data-sport-id="commercial-live"
                    >
                        <div className="sidebar-item-content">
                            <span className="icon sidebar-main-icon"><i className="fa-solid fa-desktop"></i></span>
                            <span className="sidebar-label-text">LIVE NOW</span>
                        </div>
                    </div>
                </div>

                {filteredSports.map((item) => (
                    <SidebarItem
                        key={item.id}
                        item={item}
                        level={0}
                        selectedIds={selectedSports}
                        onToggle={onToggleSport}
                        expandedIds={expandedIds}
                        onToggleExpand={toggleExpand}
                        className={item.id === 'commercial-live' || item.id === 'up-next' ? 'desktop-only' : ''}
                        isMobile={isMobileSportsSelectionMode}
                        liveSet={liveSet}
                    />
                ))}
            </div>

            {/* Mobile feedback button */}
            <div className="mobile-only feedback-btn-container">
                <button className="mobile-feedback-btn" onClick={onOpenFeedback}>FEEDBACK</button>
            </div>
        </aside>
    );
};

export default DashboardSidebar;
