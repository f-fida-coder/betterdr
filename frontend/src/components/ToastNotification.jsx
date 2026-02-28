import React from 'react';

const TYPE_STYLES = {
  success: { bg: '#0f5132', border: '#198754' },
  error: { bg: '#58151c', border: '#dc3545' },
  warning: { bg: '#664d03', border: '#ffc107' },
  info: { bg: '#0a3f66', border: '#0dcaf0' },
};

const ToastNotification = ({ toast, onClose }) => {
  const palette = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  return (
    <div style={{
      minWidth: 280,
      maxWidth: 380,
      background: palette.bg,
      color: '#fff',
      border: `1px solid ${palette.border}`,
      borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.26)',
      padding: '12px 14px',
      marginBottom: 10,
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.35 }}>{toast.message}</div>
      <button
        onClick={() => onClose(toast.id)}
        aria-label="Close"
        style={{
          border: 'none',
          background: 'transparent',
          color: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
};

export default ToastNotification;
