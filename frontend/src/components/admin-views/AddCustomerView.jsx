import React, { useEffect, useState } from 'react';
import { getMe } from '../../api';
import CustomerCreationWorkspace from './CustomerCreationWorkspace';

function AddCustomerView({ onBack }) {
  const [showTypePicker, setShowTypePicker] = useState(true);
  const [selectedType, setSelectedType] = useState('player');
  const [currentRole, setCurrentRole] = useState(() => String(localStorage.getItem('userRole') || 'admin').toLowerCase());

  useEffect(() => {
    const fetchRole = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      try {
        const me = await getMe(token);
        if (me?.role) {
          setCurrentRole(String(me.role).toLowerCase());
        }
      } catch (error) {
        console.error('Failed to load add-customer role context:', error);
      }
    };

    fetchRole();
  }, []);

  const canCreateAgents = ['admin', 'super_agent', 'master_agent'].includes(currentRole);

  const chooseType = (nextType) => {
    setSelectedType(nextType);
    setShowTypePicker(false);
  };

  const renderTypePicker = () => (
    <div className="picker-overlay" onClick={() => setShowTypePicker(false)}>
      <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <span>Add Customer</span>
          <button type="button" onClick={() => setShowTypePicker(false)}>×</button>
        </div>
        <button type="button" className="picker-option" onClick={() => chooseType('player')}>
          <i className="fa-solid fa-user-plus"></i>
          <div>
            <strong>Player</strong>
            <p>Create or import player accounts.</p>
          </div>
        </button>
        {canCreateAgents && (
          <button type="button" className="picker-option" onClick={() => chooseType('agent')}>
            <i className="fa-solid fa-user-gear"></i>
            <div>
              <strong>Agent</strong>
              <p>Create a new agent account.</p>
            </div>
          </button>
        )}
        {canCreateAgents && (
          <button type="button" className="picker-option" onClick={() => chooseType('super_agent')}>
            <i className="fa-solid fa-user-tie"></i>
            <div>
              <strong>Master</strong>
              <p>Create a master agent account.</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="admin-view">
      <div className="view-header">
        <div className="header-icon-title">
          <div className="glow-accent"></div>
          <h2>Add Customer</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              Back
            </button>
          )}
        </div>
      </div>

      <div className="view-content">
        <CustomerCreationWorkspace initialType={selectedType} />
      </div>

      {showTypePicker && renderTypePicker()}

      <style>{`
        .picker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 80px 16px 16px;
          z-index: 1200;
        }

        .picker-modal {
          width: min(480px, 100%);
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
          overflow: hidden;
        }

        .picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }

        .picker-header button {
          border: none;
          background: transparent;
          font-size: 28px;
          line-height: 1;
          color: #64748b;
          cursor: pointer;
        }

        .picker-option {
          width: 100%;
          border: none;
          border-top: 1px solid #e2e8f0;
          background: #fff;
          padding: 18px 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          text-align: left;
          cursor: pointer;
        }

        .picker-option:hover {
          background: #f8fafc;
        }

        .picker-option i {
          color: #0d3b5c;
          font-size: 20px;
          margin-top: 2px;
        }

        .picker-option strong {
          display: block;
          color: #0f172a;
          font-size: 16px;
          margin-bottom: 4px;
        }

        .picker-option p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
        }
      `}</style>
    </div>
  );
}

export default AddCustomerView;
