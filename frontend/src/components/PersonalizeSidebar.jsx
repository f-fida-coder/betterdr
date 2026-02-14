import React, { useState } from 'react';

const PersonalizeSidebar = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('BASIC');
    const [selectedSkin, setSelectedSkin] = useState('Gray');

    const tabs = ['BASIC', 'NFL', 'NBA', 'MLB', 'NCAA'];

    const skinOptions = [
        { id: 'gray', label: 'Gray', color: '#007bff' },         { id: 'white', label: 'White', color: '#28a745' },         { id: 'stadium', label: 'Stadium', color: '#dc3545' },         { id: 'plain', label: 'Plain', color: '#dc3545' }      ];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '350px',
            height: '100vh',
            background: '#333',
            boxShadow: '-5px 0 15px rgba(0,0,0,0.5)',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            color: 'white'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px 10px',
                borderBottom: '1px solid #444',
                background: '#2c2c2c'
            }}>
                <span
                    onClick={onClose}
                    style={{
                        cursor: 'pointer',
                        fontSize: '18px',
                        color: '#999',
                        marginRight: '20px',
                        padding: '0 5px'
                    }}
                >
                    ✕
                </span>

                <div style={{ display: 'flex', gap: '15px', overflowX: 'auto' }}>
                    {tabs.map(tab => (
                        <span
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                color: activeTab === tab ? '#fff' : '#888',
                                borderBottom: activeTab === tab ? '2px solid #fff' : 'none',
                                paddingBottom: '5px'
                            }}
                        >
                            {tab}
                        </span>
                    ))}
                </div>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                {activeTab === 'BASIC' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {skinOptions.map(skin => (
                            <div
                                key={skin.id}
                                onClick={() => setSelectedSkin(skin.label)}
                                style={{
                                    background: '#222',
                                    padding: '15px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    border: selectedSkin === skin.label ? '1px solid #555' : '1px solid transparent'
                                }}
                            >
                                <span style={{ fontSize: '14px' }}>{skin.label}</span>
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    border: `2px solid ${skin.color}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {selectedSkin === skin.label && (
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: skin.color }}></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab !== 'BASIC' && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                        No skins available for {activeTab} yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonalizeSidebar;
