import React from 'react';

export default function NetworkStatusBanner({ isOnline }) {
  if (isOnline) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 4000,
      background: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%)',
      color: '#fff',
      fontWeight: 700,
      letterSpacing: '0.2px',
      fontSize: '13px',
      padding: '9px 12px',
      textAlign: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.25)'
    }}>
      Offline mode: showing cached data. New bets and updates will sync when connection returns.
    </div>
  );
}
