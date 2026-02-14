import React, { useState } from 'react';

const RulesView = () => {
    const [expandedCategory, setExpandedCategory] = useState(null);

    const categories = [
        'GENERAL',
        'FOOTBALL',
        'BASKETBALL',
        'BASEBALL',
        'HOCKEY',
        'SOCCER',
        'GOLF',
        'BOXING/MMA',
        'AUTO RACING',
        'OTHER',
        'SEASON WINS',
        'INTERNET',
        'LIVE BETTING',
        'HORSES'
    ];

    const toggleCategory = (category) => {
        if (expandedCategory === category) {
            setExpandedCategory(null);
        } else {
            setExpandedCategory(category);
        }
    };

    return (
        <div style={{
            background: 'white',
            width: '100%',
            height: '100%',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
            <div style={{
                width: '100%',
                margin: '0',
            }}>
                {categories.map((category) => (
                    <div key={category} style={{ borderBottom: '1px solid #eee' }}>
                        <div
                            onClick={() => toggleCategory(category)}
                            style={{
                                padding: '15px 20px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'white',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                            <span style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#333',
                                textDecoration: 'underline',
                                textDecorationColor: '#333'
                            }}>
                                {category}
                            </span>
                        </div>
                        {expandedCategory === category && (
                            <div style={{
                                padding: '20px',
                                background: '#fcfcfc',
                                borderTop: '1px solid #eee',
                                color: '#555',
                                fontSize: '14px',
                                lineHeight: '1.6'
                            }}>
                                <p>Rules and regulations for {category}.</p>
                                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                                <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RulesView;
