import React from 'react';

const SettingsModal = ({ onClose, balance, pendingBalance, availableBalance }) => {
    const isMobile = window.innerWidth <= 768;
    const formatMoney = (value) => {
        if (value === null || value === undefined || value === '') return '—';
        const num = Number(value);
        if (Number.isNaN(num)) return '—';
        return `$ ${num.toFixed(2)}`;
    };
    
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            padding: isMobile ? '20px' : '0',
            boxSizing: 'border-box',
            overflow: 'auto',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            inset: 0
        }}>
            <div style={{
                background: 'white',
                width: isMobile ? '100%' : '400px',
                maxWidth: '100%',
                borderRadius: '8px',
                boxShadow: '0 30px 100px rgba(0,0,0,0.9)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: isMobile ? '85vh' : 'auto',
                animation: 'fadeIn 0.4s ease-out',
                margin: 'auto',
                marginTop: isMobile ? '0' : 'auto',
                marginBottom: isMobile ? '0' : 'auto'
            }}>
                <div style={{
                    padding: isMobile ? '15px 15px' : '15px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #eee'
                }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: isMobile ? '18px' : '18px', fontWeight: 'bold' }}>My Account</h3>
                    <span
                        onClick={onClose}
                        style={{ cursor: 'pointer', fontSize: '24px', color: '#999', lineHeight: '1' }}
                    >×</span>
                </div>

                <div style={{ overflowY: 'auto', padding: isMobile ? '12px' : '15px' }}>

                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid #eee' }}>
                            <span style={{ fontWeight: 'bold', color: '#333' }}>Balance</span>
                            <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{formatMoney(balance)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid #eee', background: '#f9f9f9' }}>
                            <span style={{ fontWeight: 'bold', color: '#333' }}>Pending</span>
                            <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{formatMoney(pendingBalance)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px' }}>
                            <span style={{ fontWeight: 'bold', color: '#333' }}>Available</span>
                            <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{formatMoney(availableBalance)}</span>
                        </div>
                    </div>

                    <div style={{ border: '1px solid #ddd', borderRadius: '4px' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #eee' }}>
                            <span style={{ fontWeight: '500', color: '#333' }}>Game Sort (Display)</span>
                            <select style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', minWidth: '100px' }}>
                                <option>By Time</option>
                                <option>By League</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #eee' }}>
                            <span style={{ fontWeight: '500', color: '#333' }}>Select Skin</span>
                            <i className="fa-solid fa-desktop" style={{ color: '#999', fontSize: '18px' }}></i>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #eee' }}>
                            <span style={{ fontWeight: '500', color: '#333' }}>Personalize It</span>
                            <i className="fa-solid fa-paintbrush" style={{ color: '#004d26', fontSize: '18px' }}></i>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #eee' }}>
                            <span style={{ fontWeight: '500', color: '#333' }}>Time</span>
                            <select style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', minWidth: '100px' }}>
                                <option>Eastern</option>
                                <option>Central</option>
                                <option>Pacific</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #eee' }}>
                            <span style={{ fontWeight: '500', color: '#333' }}>Default Pitcher Setting</span>
                            <select style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', minWidth: '100px' }}>
                                <option>Action</option>
                                <option>Listed</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #eee' }}>
                            <span style={{ fontWeight: '500', color: '#333' }}>Version</span>
                            <span style={{ color: '#333' }}>43.0.27</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #eee' }}>
                            <span style={{ fontWeight: '500', color: '#333' }}>Live Stream Icon</span>
                            <select style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', minWidth: '100px' }}>
                                <option>Show</option>
                                <option>Hide</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px' }}>
                            <span style={{ fontWeight: '500', color: '#333' }}>Live Skin</span>
                            <select style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', minWidth: '100px' }}>
                                <option>Dark</option>
                                <option>Light</option>
                            </select>
                        </div>

                    </div>
                </div>

                <div style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee', background: '#fcfcfc' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#d9534f',
                            color: 'white',
                            border: 'none',
                            padding: '8px 25px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default SettingsModal;
