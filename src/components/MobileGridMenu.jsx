import React from 'react';

const MobileGridMenu = ({ onClose, onViewChange }) => {
    const menuItems = [
        { id: 'sports', label: 'Sports', icon: 'fa-solid fa-shield-halved' },         { id: 'prime-live', label: 'Prime Live', icon: 'fa-solid fa-tv' },
        { id: 'ultra-live', label: 'Ultra Live', icon: 'fa-solid fa-display' },
        { id: 'casino', label: 'Casino', icon: 'fa-solid fa-dice' },
        { id: 'live-casino', label: 'Live Casino', icon: 'fa-solid fa-circle-dot' },
        { id: 'prop-builder', label: 'Prop Builder', icon: 'fa-solid fa-arrow-down-1-9' },
        { id: 'world-365', label: 'World 365', icon: 'fa-solid fa-futbol' },
        { id: 'horses', label: 'Horses', icon: 'fa-solid fa-horse-head' },
        { id: 'parlay-boosts', label: 'Parlay Boosts', icon: 'fa-solid fa-bolt-lightning' },
        { id: 'rules', label: 'Rules', icon: 'fa-solid fa-whistle' },
        { id: 'tutorials', label: 'Tutorials', icon: 'fa-solid fa-book-open' },
    ];

    const handleClick = (id) => {
        if (id === 'sports') {
            onViewChange('dashboard');
        } else if (id === 'live-casino') {
            onViewChange('live-casino');
        } else if (id === 'tutorials') {
                    } else {
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
