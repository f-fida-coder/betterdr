import React from 'react';

const RegisterModal = ({ onClose }) => {
    const isMobile = window.innerWidth <= 768;
    
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            minHeight: '100vh',
            height: '100%',
            background: 'rgba(0,0,0,0.75)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            padding: isMobile ? '20px' : '0',
            boxSizing: 'border-box',
            overflow: 'auto',
            backdropFilter: 'blur(2px)'
        }}>
            <div style={{
                background: 'white',
                width: isMobile ? '100%' : '500px',
                maxWidth: '100%',
                height: isMobile ? 'auto' : '460px',
                maxHeight: isMobile ? '85vh' : 'none',
                borderRadius: '12px',
                boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                animation: 'fadeIn 0.4s ease-out',
                margin: 'auto'
            }}>
                <div style={{
                    padding: isMobile ? '15px 15px 0 15px' : '20px 20px 0 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, color: '#000', fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold' }}>JOIN NOW!!!</h2>
                    <span
                        onClick={onClose}
                        style={{
                            cursor: 'pointer',
                            fontSize: isMobile ? '28px' : '24px',
                            fontWeight: 'bold',
                            color: '#000',
                            lineHeight: '1'
                        }}
                    >
                        ×
                    </span>
                </div>

                <div className="modal-content-scroll" style={{ overflowY: 'auto', padding: isMobile ? '15px' : '20px', flex: 1 }}>

                    <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#666', lineHeight: '1.4', marginBottom: '20px', marginTop: '0' }}>
                        In accordance with Michigan law the company can no longer take players who are physically in the state of Michigan. Any client that resides in Michigan with a balance will be given a full refund.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input type="text" placeholder="First name*" style={inputStyle} />
                        <input type="text" placeholder="Last name*" style={inputStyle} />
                        <input type="email" placeholder="Email*" style={inputStyle} />
                        <input type="email" placeholder="Confirm Email*" style={inputStyle} />
                        <input type="password" placeholder="Password*" style={inputStyle} />

                        <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#333', marginTop: '-5px' }}>
                            Minimum 4 characters - Maximum 10 characters<br />
                            No special characters or symbols
                        </div>

                        <input type="password" placeholder="Confirm Password*" style={inputStyle} />

                        <input type="tel" placeholder="Phone number (required)" style={inputStyle} />

                        <input type="text" placeholder="Affiliate Code" style={inputStyle} />
                    </div>

                    <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" id="terms" style={{ width: '16px', height: '16px' }} />
                        <label htmlFor="terms" style={{ fontSize: isMobile ? '12px' : '14px', color: '#666' }}>Agree to terms and conditions</label>
                    </div>

                    <p style={{ fontSize: isMobile ? '10px' : '11px', color: '#666', lineHeight: '1.4', marginTop: '15px' }}>
                        NOTE: Automated betting systems, sharp action, past post wagers or any other exploitation of our offerings is prohibited. Assigned wager limits on the account are to be respected at all times. Any attempt to override these wager limits is prohibited. Any account that has been determined to have violated these terms may risk account closure and forfeiture of funds. Successive accounts created through individuals and/or syndicates or with matching IP addresses will also be flagged.<br />
                        By entering your number, you agree to receive mobile messages. Message frequency varies. Message and data rates may apply. View our Privacy Policy and SMS Terms (Reply STOP to unsubscribe).
                    </p>

                    <div style={{
                        marginTop: '15px',
                        border: '1px solid #d3d3d3',
                        background: '#f9f9f9',
                        padding: isMobile ? '10px 12px' : '10px 15px',
                        width: 'fit-content',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '10px' : '15px',
                        minWidth: isMobile ? '180px' : '200px'
                    }}>
                        <div style={{ width: '20px', height: '20px', border: '2px solid #c1c1c1', borderRadius: '2px', flexShrink: 0 }}></div>
                        <span style={{ fontSize: isMobile ? '12px' : '14px', color: '#000' }}>I'm not a robot</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="recaptcha" style={{ width: '20px', opacity: 0.5 }} />
                            <span style={{ fontSize: '7px', color: '#999' }}>reCAPTCHA</span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button style={{
                        width: '100%',
                        padding: isMobile ? '12px' : '15px',
                        background: '#dc3545', // Red
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: isMobile ? '16px' : '18px',
                        fontWeight: 'bold',
                        marginTop: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}>
                        SUBMIT
                    </button>

                    {/* Already Registered */}
                    <div style={{ textAlign: 'center', marginTop: '15px', paddingBottom: '10px' }}>
                        <span style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 'bold' }}>Already registered </span>
                        <a href="#" style={{ fontSize: isMobile ? '12px' : '14px', color: '#dc3545', textDecoration: 'underline', fontWeight: 'bold' }}>Sign in here</a>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .modal-content-scroll::-webkit-scrollbar {
                    width: 8px;
                }
                .modal-content-scroll::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                .modal-content-scroll::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 4px;
                }
                .modal-content-scroll::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `}</style>
        </div>
    );
};

const inputStyle = {
    width: '100%',
    padding: '12px 15px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
    color: '#333',
    background: 'white',
    boxSizing: 'border-box'
};

export default RegisterModal;
