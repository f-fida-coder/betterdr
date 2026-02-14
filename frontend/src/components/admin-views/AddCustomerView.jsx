import React, { useState, useEffect } from 'react';
import { getAgents, createUserByAdmin, getNextUsername } from '../../api';

function AddCustomerView({ onBack }) {
  const [formData, setFormData] = useState({
    username: '',
    phoneNumber: '',
    password: '',
    firstName: '',
    lastName: '',
    agentId: '',
    minBet: 1,
    maxBet: 5000,
    creditLimit: 1000,
    balanceOwed: 0,
    settings: {
      sports: true,
      casino: true,
      racebook: true,
      live: true,
      props: true,
      liveCasino: true
    }
  });

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const data = await getAgents(token);
          setAgents(data || []);
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
      }
    };
    fetchAgents();
  }, []);

  const handleChange = async (e) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // Auto-generate password if first/last name and phone available
      if ((name === 'firstName' || name === 'lastName' || name === 'phoneNumber')) {
        const { firstName, lastName, phoneNumber } = updated;
        if (firstName && lastName && phoneNumber) {
          const last4 = phoneNumber.slice(-4);
          const first3First = firstName.slice(0, 3).toUpperCase();
          const first3Last = lastName.slice(0, 3).toUpperCase();
          updated.password = `${first3First}${first3Last}${last4}`;
        }
      }

      return updated;
    });

    // Auto-generate next username correctly if agent is selected
    if (name === 'agentId' && value) {
      const selectedAgent = agents.find(a => (a.id || a._id) === value);
      if (selectedAgent) {
        try {
          const token = localStorage.getItem('token');
          const { nextUsername } = await getNextUsername(selectedAgent.username, token);
          setFormData(prev => ({ ...prev, username: nextUsername }));
        } catch (err) {
          console.error('Failed to get next username:', err);
        }
      }
    } else if (name === 'agentId' && !value) {
      setFormData(prev => ({ ...prev, username: '' }));
    }
  };

  const handleToggleSetting = (key) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: !prev.settings[key]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      await createUserByAdmin(formData, token);
      setSuccess('Customer initialized successfully!');

      setTimeout(() => {
        if (onBack) onBack();
      }, 1500);

    } catch (err) {
      setError(err.message || 'Failed to initialize customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-view premium-admin-theme">
      <div className="view-header">
        <button className="btn-back-premium" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Return to Console
        </button>
        <div className="header-icon-title">
          <div className="glow-accent"></div>
          <h2>Initialize New User</h2>
        </div>
        <div style={{ width: '150px' }}></div>
      </div>

      <div className="view-content central-card">
        <div className="premium-card glass-effect">
          <div className="card-header">
            <h3>Configuration Panel</h3>
            <p>Define operational parameters and access levels for the new sector user.</p>
          </div>

          <form onSubmit={handleSubmit} className="premium-form">
            <div className="form-sections">
              <div className="f-section">
                <h4 className="section-tag">Identity & Access</h4>
                <div className="input-row">
                  <div className="p-field">
                    <label>Agent Assignment</label>
                    <select
                      name="agentId"
                      value={formData.agentId}
                      onChange={handleChange}
                    >
                      <option value="">Direct / Unassigned</option>
                      {agents.map(agent => (
                        <option key={agent.id || agent._id} value={agent.id || agent._id}>
                          {agent.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-field">
                    <label>Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Auto-generated"
                      readOnly
                      className="readonly-input"
                    />
                  </div>
                </div>

                <div className="input-row">
                  <div className="p-field">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter legal first name"
                      required
                    />
                  </div>
                  <div className="p-field">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter legal last name"
                      required
                    />
                  </div>
                </div>

                <div className="input-row">
                  <div className="p-field">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="User contact line"
                      required
                    />
                  </div>
                  <div className="p-field">
                    <label>Access Password</label>
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="System set"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="f-section">
                <h4 className="section-tag">Operational Limits</h4>
                <div className="input-row grid-4">
                  <div className="p-field">
                    <label>Min bet:</label>
                    <input
                      type="number"
                      name="minBet"
                      value={formData.minBet}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="p-field">
                    <label>Max bet:</label>
                    <input
                      type="number"
                      name="maxBet"
                      value={formData.maxBet}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="p-field">
                    <label>Credit limit:</label>
                    <input
                      type="number"
                      name="creditLimit"
                      value={formData.creditLimit}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="p-field">
                    <label>Settle Limit:</label>
                    <input
                      type="number"
                      name="balanceOwed"
                      value={formData.balanceOwed}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="f-section">
                <h4 className="section-tag">Market Capabilities</h4>
                <div className="capabilities-premium-grid">
                  {[
                    { key: 'sports', label: 'Sportsbook', desc: 'Standard sports betting markets' },
                    { key: 'casino', label: 'LV Casino', desc: 'Las Vegas style virtual casino' },
                    { key: 'racebook', label: 'Racebook', desc: 'Global horse and greyhound racing' },
                    { key: 'live', label: 'Dynamic Live', desc: 'Real-time in-game betting' },
                    { key: 'props', label: 'Prop Plus', desc: 'Advanced player and game props' },
                    { key: 'liveCasino', label: 'Dealer Live', desc: 'Live dealer tables and streams' }
                  ].map(addon => (
                    <div
                      key={addon.key}
                      className={`cap-card ${formData.settings[addon.key] ? 'active' : ''}`}
                      onClick={() => handleToggleSetting(addon.key)}
                    >
                      <div className="cap-meta">
                        <span className="cap-label">{addon.label}</span>
                        <p className="cap-desc">{addon.desc}</p>
                      </div>
                      <div className="cap-toggle-ui">
                        <div className="toggle-dot"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && <div className="premium-error-msg">{error}</div>}
            {success && <div className="premium-success-msg">{success}</div>}

            <div className="form-footer-premium">
              <button
                type="submit"
                className="btn-deploy-premium"
                disabled={loading || !formData.username || !formData.phoneNumber || !formData.firstName || !formData.lastName || !formData.password}
              >
                {loading ? (
                  <>
                    <div className="deploy-spinner"></div>
                    Deploying...
                  </>
                ) : (
                  'Deploy New Customer Portfolio'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .premium-admin-theme { 
          background: #0f172a; 
          min-height: 100vh; color: #f8fafc; 
          font-family: 'Inter', sans-serif;
          padding: 32px;
        }
        .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .btn-back-premium {
          background: rgba(255,255,255,0.05); color: #94a3b8; border: none; 
          padding: 10px 18px; border-radius: 12px; font-weight: 700;
          display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s;
        }
        .btn-back-premium:hover { background: rgba(255,255,255,0.1); color: #fff; transform: translateX(-4px); }
        
        .header-icon-title { display: flex; align-items: center; gap: 16px; }
        .glow-accent { width: 8px; height: 32px; background: #3b82f6; border-radius: 4px; box-shadow: 0 0 15px #3b82f6; }
        .header-icon-title h2 { font-size: 28px; font-weight: 800; margin: 0; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .central-card { display: flex; justify-content: center; }
        .premium-card { background: #1e293b; width: 100%; max-width: 900px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        
        .card-header { padding: 32px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); }
        .card-header h3 { margin: 0 0 8px 0; font-size: 20px; font-weight: 800; }
        .card-header p { margin: 0; color: #64748b; font-size: 14px; }

        .premium-form { padding: 32px; }
        .form-sections { display: flex; flex-direction: column; gap: 40px; }
        .section-tag { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #3b82f6; letter-spacing: 1px; margin: 0 0 20px 0; border-left: 3px solid #3b82f6; padding-left: 12px; }
        
        .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .input-row.grid-4 { grid-template-columns: repeat(4, 1fr); }
        
        .p-field { display: flex; flex-direction: column; gap: 8px; }
        .p-field label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
        .p-field input, .p-field select {
          background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: white;
          padding: 12px 16px; border-radius: 12px; font-size: 14px; outline: none; transition: border-color 0.2s;
        }
        .p-field input:focus, .p-field select:focus { border-color: #3b82f6; }
        .readonly-input { background: rgba(0,0,0,0.2) !important; color: #64748b !important; }

        .capabilities-premium-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .cap-card {
          background: #0f172a; border: 1px solid rgba(255,255,255,0.1); padding: 16px;
          border-radius: 16px; cursor: pointer; display: flex; justify-content: space-between;
          align-items: center; transition: all 0.2s;
        }
        .cap-card:hover { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.05); }
        .cap-card.active { border-color: #3b82f6; background: rgba(59,130,246,0.1); }
        
        .cap-meta { display: flex; flex-direction: column; gap: 4px; }
        .cap-label { font-size: 13px; font-weight: 700; color: #f8fafc; }
        .cap-desc { font-size: 10px; color: #64748b; margin: 0; }
        
        .cap-toggle-ui { width: 40px; height: 20px; background: #334155; border-radius: 20px; position: relative; transition: all 0.3s; }
        .toggle-dot { width: 14px; height: 14px; background: #94a3b8; border-radius: 50%; position: absolute; left: 3px; top: 3px; transition: all 0.3s; }
        .cap-card.active .cap-toggle-ui { background: #3b82f6; }
        .cap-card.active .toggle-dot { left: 23px; background: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.5); }

        .premium-error-msg { background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 16px; border-radius: 12px; font-size: 14px; font-weight: 700; margin-top: 24px; border: 1px solid rgba(239, 68, 68, 0.2); }
        .premium-success-msg { background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 16px; border-radius: 12px; font-size: 14px; font-weight: 700; margin-top: 24px; border: 1px solid rgba(16, 185, 129, 0.2); }

        .form-footer-premium { margin-top: 48px; }
        .btn-deploy-premium {
          width: 100%; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white; border: none; padding: 18px; border-radius: 16px;
          font-weight: 800; font-size: 16px; letter-spacing: 0.5px;
          cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 20px rgba(37,99,235,0.2);
          display: flex; align-items: center; justify-content: center; gap: 12px;
        }
        .btn-deploy-premium:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(37,99,235,0.3); }
        .btn-deploy-premium:disabled { background: #334155; color: #64748b; cursor: not-allowed; box-shadow: none; transform: none; }
        
        .deploy-spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default AddCustomerView;
