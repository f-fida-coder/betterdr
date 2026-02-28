import React from 'react';

const baseSpinnerStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: '3px solid rgba(255, 255, 255, 0.25)',
  borderTopColor: '#ffd34d',
  animation: 'spin 0.8s linear infinite',
};

const injectKeyframes = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('loading-spinner-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'loading-spinner-keyframes';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
};

const LoadingSpinner = ({ variant = 'inline', label = 'Loading...' }) => {
  injectKeyframes();

  if (variant === 'overlay') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(8, 12, 20, 0.78)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ ...baseSpinnerStyle, width: '44px', height: '44px', borderWidth: '4px' }} />
        <div style={{ color: '#fff', fontSize: '14px', letterSpacing: '0.03em' }}>{label}</div>
      </div>
    );
  }

  if (variant === 'section') {
    return (
      <div style={{
        width: '100%',
        minHeight: '180px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div style={baseSpinnerStyle} />
        <div style={{ color: '#cbd5e1', fontSize: '13px' }}>{label}</div>
      </div>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ ...baseSpinnerStyle, width: '16px', height: '16px', borderWidth: '2px' }} />
      <span style={{ fontSize: '13px' }}>{label}</span>
    </span>
  );
};

export default LoadingSpinner;
