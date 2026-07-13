import React from 'react';

const MobileGridMenu = ({ onClose, onViewChange }) => {
    const menuItems = [
        { id: 'sports', label: 'Sports', icon: 'fa-solid fa-shield-halved' },
        { id: 'casino', label: 'Casino', icon: 'fa-solid fa-dice' },
        { id: 'prop-builder', label: 'Prop Builder', icon: 'fa-solid fa-arrow-down-1-9' },
        // fa-whistle is a Font Awesome PRO glyph — the free kit renders it as
        // nothing, which is why Rules shipped iconless. scale-balanced is free.
        { id: 'rules', label: 'Rules', icon: 'fa-solid fa-scale-balanced' },
        { id: 'tutorials', label: 'Tutorials', icon: 'fa-solid fa-book-open' },
        { id: 'support', label: 'Support', icon: 'fa-solid fa-headset' },
    ];

    const handleClick = (id) => {
        if (id === 'sports') {
            onViewChange('dashboard');
        } else {
            // Every other tile maps 1:1 onto a dashboardView id (the shell
            // renders RulesView/TutorialsView/... from the same ids). An
            // empty 'tutorials' branch here used to swallow the click and
            // leave the tile dead even though TutorialsView shipped finished.
            onViewChange(id);
        }
        onClose();
    };

    return (
        <div className="mobile-grid-menu-overlay">
            <div className="mobile-grid-container">
                {menuItems.map((item) => (
                    <div key={item.id} className="grid-menu-item" onClick={() => handleClick(item.id)}>
                        <div className="grid-icon">
                            <i className={item.icon}></i>
                        </div>
                        <span className="grid-label">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MobileGridMenu;
