import React, { useEffect, useMemo, useState } from 'react';
import { createAgent, createUserByAdmin, deleteAgent, deleteUser, getAgents, getMe, getNextUsername } from '../../api';

const RECENT_KEY = 'admin_add_customer_recent_v2';

const defaultSettings = {
  sports: true,
  casino: true,
  racebook: true,
  live: true,
  props: true,
  liveCasino: true
};

const buildNow = () => new Date().toLocaleString();

const randomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

const extractTrailingNumber = (value) => {
  const match = String(value || '').match(/(\d+)/g);
  if (!match || !match.length) return '';
  return match[match.length - 1];
};

const asPhoneWithOffset = (phone, offset) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 7) return '';
  const raw = Number(digits);
  if (Number.isNaN(raw)) return '';
  return String(raw + Number(offset || 0)).padStart(digits.length, '0');
};

function AddCustomerView({ onBack }) {
  const [mode, setMode] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [agents, setAgents] = useState([]);
  const [me, setMe] = useState(null);
  const [recent, setRecent] = useState([]);

  const [playerForm, setPlayerForm] = useState({
    count: 1,
    agentId: '',
    prefix: '',
    startingAccount: '',
    startPhone: '',
    firstName: 'PLAYER',
    lastName: 'USER',
    manualPasswordBase: '',
    randomPasswordEnabled: true,
    minBet: '',
    maxBet: '',
    creditLimit: '1000',
    balanceOwed: '0',
    freeplayBalance: '200',
    settings: { ...defaultSettings }
  });

  const [agentForm, setAgentForm] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
    prefix: '',
    username: '',
    parentMasterId: '',
    inheritFromId: '',
    defaultMinBet: '25',
    defaultMaxBet: '200',
    defaultCreditLimit: '1000',
    defaultSettleLimit: '0',
    settings: { ...defaultSettings }
  });

  const agentOnly = useMemo(
    () => agents.filter((a) => (a.role || '').toLowerCase() === 'agent'),
    [agents]
  );

  const masterOnly = useMemo(
    () => agents.filter((a) => ['master_agent', 'super_agent'].includes((a.role || '').toLowerCase())),
    [agents]
  );

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const [agentsData, meData] = await Promise.all([
          getAgents(token),
          getMe(token)
        ]);

        const normalizedAgents = Array.isArray(agentsData) ? agentsData : [];
        setAgents(normalizedAgents);
        setMe(meData || null);

        const raw = localStorage.getItem(RECENT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setRecent(parsed);
        }
      } catch (err) {
        setError(err.message || 'Failed to load add customer context.');
      } finally {
        setLoadingContext(false);
      }
    };

    fetchContext();
  }, []);

  const persistRecent = (rows) => {
    setRecent(rows);
    localStorage.setItem(RECENT_KEY, JSON.stringify(rows));
  };

  const addRecentRows = (rows) => {
    const next = [...rows, ...recent].slice(0, 100);
    persistRecent(next);
  };

  const clearFeedback = () => {
    setError('');
    setSuccess('');
  };

  const chooseMode = async (nextMode) => {
    clearFeedback();
    setMode(nextMode);
    setShowTypePicker(false);

    if (nextMode === 'player' && !playerForm.startingAccount) {
      const selectedAgent = agentOnly.find((a) => (a.id || a._id) === playerForm.agentId);
      const prefix = (selectedAgent?.username || me?.username || '').toUpperCase();
      if (prefix) {
        try {
          const token = localStorage.getItem('token');
          const response = await getNextUsername(prefix, token, { type: 'player' });
          const accountNumber = extractTrailingNumber(response?.nextUsername || '');
          setPlayerForm((prev) => ({ ...prev, prefix, startingAccount: accountNumber || prev.startingAccount }));
        } catch {
          setPlayerForm((prev) => ({ ...prev, prefix }));
        }
      }
    }
  };

  const setPlayerValue = async (name, value) => {
    clearFeedback();

    if (name === 'agentId') {
      const selected = agentOnly.find((a) => (a.id || a._id) === value);
      const prefix = (selected?.username || '').toUpperCase();
      setPlayerForm((prev) => ({ ...prev, agentId: value, prefix }));

      if (prefix) {
        try {
          const token = localStorage.getItem('token');
          const response = await getNextUsername(prefix, token, { type: 'player' });
          const accountNumber = extractTrailingNumber(response?.nextUsername || '');
          if (accountNumber) {
            setPlayerForm((prev) => ({ ...prev, startingAccount: accountNumber }));
          }
        } catch (err) {
          console.error('Failed to preload next player account:', err);
        }
      }
      return;
    }

    setPlayerForm((prev) => ({ ...prev, [name]: value }));
  };

  const setAgentValue = async (name, value, selectedMode = mode) => {
    clearFeedback();

    if (name === 'inheritFromId') {
      const source = masterOnly.find((a) => (a.id || a._id) === value);
      if (source) {
        setAgentForm((prev) => ({
          ...prev,
          inheritFromId: value,
          defaultMinBet: String(source.defaultMinBet ?? prev.defaultMinBet),
          defaultMaxBet: String(source.defaultMaxBet ?? prev.defaultMaxBet),
          defaultCreditLimit: String(source.defaultCreditLimit ?? prev.defaultCreditLimit),
          defaultSettleLimit: String(source.defaultSettleLimit ?? prev.defaultSettleLimit)
        }));
        return;
      }
    }

    if (name === 'prefix') {
      const formatted = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      setAgentForm((prev) => ({ ...prev, prefix: formatted, username: '' }));
      if (formatted.length >= 2) {
        try {
          const token = localStorage.getItem('token');
          const query = selectedMode === 'master' ? { suffix: 'MA', type: 'agent' } : { type: 'agent' };
          const response = await getNextUsername(formatted, token, query);
          setAgentForm((prev) => ({ ...prev, username: response?.nextUsername || '' }));
        } catch (err) {
          console.error('Failed to preload next agent username:', err);
        }
      }
      return;
    }

    setAgentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTogglePlayerSetting = (key) => {
    setPlayerForm((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: !prev.settings[key]
      }
    }));
  };

  const handleToggleAgentSetting = (key) => {
    setAgentForm((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: !prev.settings[key]
      }
    }));
  };

  const submitPlayers = async () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found.');

    const count = Math.max(1, Math.min(20, Number(playerForm.count || 1)));
    if (!playerForm.agentId) throw new Error('Select an agent first.');
    if (!playerForm.prefix.trim()) throw new Error('Prefix is required.');
    if (!playerForm.startingAccount || Number(playerForm.startingAccount) <= 0) {
      throw new Error('Starting account number must be greater than zero.');
    }

    const selectedAgent = agentOnly.find((a) => (a.id || a._id) === playerForm.agentId);
    const agentId = selectedAgent?.id || selectedAgent?._id || '';
    if (!agentId) throw new Error('Invalid agent selection.');

    const startAccount = Number(playerForm.startingAccount);
    const rows = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < count; i += 1) {
      const username = `${playerForm.prefix.toUpperCase()}${startAccount + i}`;
      const phoneCandidate = asPhoneWithOffset(playerForm.startPhone, i);
      const phoneNumber = phoneCandidate || `${Date.now().toString().slice(-7)}${i}`;
      const password = playerForm.randomPasswordEnabled
        ? randomPassword()
        : `${(playerForm.manualPasswordBase || 'PASS').toUpperCase()}${startAccount + i}`;

      const payload = {
        username,
        phoneNumber,
        password,
        firstName: count > 1 ? `${playerForm.firstName}${i + 1}` : playerForm.firstName,
        lastName: playerForm.lastName,
        agentId,
        minBet: Number(playerForm.minBet || 1),
        maxBet: Number(playerForm.maxBet || 5000),
        creditLimit: Number(playerForm.creditLimit || 1000),
        balanceOwed: Number(playerForm.balanceOwed || 0),
        freeplayBalance: Number(playerForm.freeplayBalance || 200),
        apps: {
          sportsbook: !!playerForm.settings.sports,
          casino: !!playerForm.settings.casino,
          racebook: !!playerForm.settings.racebook,
          live: !!playerForm.settings.live,
          props: !!playerForm.settings.props,
          liveCasino: !!playerForm.settings.liveCasino
        }
      };

      try {
        const result = await createUserByAdmin(payload, token);
        successCount += 1;
        rows.push({
          id: `recent_${Date.now()}_${i}`,
          type: 'Player',
          username: result?.user?.username || username,
          parent: selectedAgent?.username || 'DIRECT',
          createdAt: buildNow(),
          entityId: result?.user?.id || '',
          entityType: 'user'
        });
      } catch (err) {
        failCount += 1;
      }
    }

    if (rows.length) addRecentRows(rows);

    if (successCount === 0) {
      throw new Error('No player account was created. Check prefix/phone/username conflicts.');
    }

    setSuccess(`Created ${successCount} player account(s).${failCount ? ` ${failCount} failed due to validation/conflict.` : ''}`);
  };

  const submitAgentLike = async (selectedMode) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found.');

    if (!agentForm.fullName.trim()) throw new Error('Agent name is required.');
    if (!agentForm.phoneNumber.trim()) throw new Error('Phone number is required.');
    if (!agentForm.password.trim()) throw new Error('Password is required.');
    if (!agentForm.prefix.trim()) throw new Error('Prefix is required.');
    if (!agentForm.username.trim()) throw new Error('Username is required. Use Prefix first.');

    const payload = {
      username: agentForm.username.toUpperCase(),
      phoneNumber: agentForm.phoneNumber,
      password: agentForm.password,
      fullName: agentForm.fullName,
      role: selectedMode === 'master' ? 'master_agent' : 'agent',
      defaultMinBet: Number(agentForm.defaultMinBet || 25),
      defaultMaxBet: Number(agentForm.defaultMaxBet || 200),
      defaultCreditLimit: Number(agentForm.defaultCreditLimit || 1000),
      defaultSettleLimit: Number(agentForm.defaultSettleLimit || 0)
    };

    const result = await createAgent(payload, token);

    addRecentRows([
      {
        id: `recent_${Date.now()}_agent`,
        type: selectedMode === 'master' ? 'Master Agent' : 'Agent',
        username: result?.agent?.username || payload.username,
        parent: selectedMode === 'master'
          ? (me?.username || 'ADMIN')
          : (masterOnly.find((a) => (a.id || a._id) === agentForm.parentMasterId)?.username || me?.username || 'ADMIN'),
        createdAt: buildNow(),
        entityId: result?.agent?.id || '',
        entityType: 'agent'
      }
    ]);

    setSuccess(`${selectedMode === 'master' ? 'Master agent' : 'Agent'} created successfully.`);
  };

  const handleContinue = async () => {
    clearFeedback();
    setLoading(true);
    try {
      if (mode === 'player') {
        await submitPlayers();
      } else if (mode === 'agent' || mode === 'master') {
        await submitAgentLike(mode);
      } else {
        throw new Error('Choose account type first.');
      }
    } catch (err) {
      setError(err.message || 'Creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecent = async (row) => {
    const token = localStorage.getItem('token');
    clearFeedback();
    setLoading(true);
    try {
      if (row.entityId && token) {
        if (row.entityType === 'user') {
          await deleteUser(row.entityId, token);
        } else if (row.entityType === 'agent') {
          await deleteAgent(row.entityId, token);
        }
      }
      const next = recent.filter((item) => item.id !== row.id);
      persistRecent(next);
      setSuccess(`${row.username} deleted successfully.`);
    } catch (err) {
      setError(err.message || 'Delete failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderTypePicker = () => (
    <div className="picker-overlay" onClick={() => setShowTypePicker(false)}>
      <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <span>Add Customer</span>
          <button type="button" onClick={() => setShowTypePicker(false)}>×</button>
        </div>
        <button type="button" className="picker-option" onClick={() => chooseMode('player')}>
          <i className="fa-solid fa-user-plus"></i>
          <div>
            <strong>Player</strong>
            <p>Add one or many players under an agent account.</p>
          </div>
        </button>
        <button type="button" className="picker-option" onClick={() => chooseMode('agent')}>
          <i className="fa-solid fa-user-gear"></i>
          <div>
            <strong>Agent</strong>
            <p>Create a new agent account. Agents can own player accounts.</p>
          </div>
        </button>
        <button type="button" className="picker-option" onClick={() => chooseMode('master')}>
          <i className="fa-solid fa-user-tie"></i>
          <div>
            <strong>Master</strong>
            <p>Create a master agent account that can manage sub-agents.</p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderCapabilities = (settings, toggleHandler) => (
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
        ].map((addon) => (
          <button
            key={addon.key}
            type="button"
            className={`cap-card ${settings[addon.key] ? 'active' : ''}`}
            onClick={() => toggleHandler(addon.key)}
          >
            <div className="cap-meta">
              <span className="cap-label">{addon.label}</span>
              <p className="cap-desc">{addon.desc}</p>
            </div>
            <div className="cap-toggle-ui"><div className="toggle-dot"></div></div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderPlayerForm = () => (
    <div className="form-sections">
      <div className="f-section">
        <h4 className="section-tag">Player Creation</h4>
        <div className="input-row grid-4">
          <div className="p-field">
            <label>How many accounts to add?</label>
            <input type="number" min="1" max="20" value={playerForm.count} onChange={(e) => setPlayerValue('count', e.target.value)} />
          </div>
          <div className="p-field">
            <label>Under which agent?</label>
            <select value={playerForm.agentId} onChange={(e) => setPlayerValue('agentId', e.target.value)}>
              <option value="">Select agent</option>
              {agentOnly.map((agent) => (
                <option key={agent.id || agent._id} value={agent.id || agent._id}>{agent.username}</option>
              ))}
            </select>
          </div>
          <div className="p-field">
            <label>Prefix</label>
            <input type="text" maxLength="8" value={playerForm.prefix} onChange={(e) => setPlayerValue('prefix', e.target.value.toUpperCase())} />
          </div>
          <div className="p-field">
            <label>Starting Account #</label>
            <input type="number" min="1" value={playerForm.startingAccount} onChange={(e) => setPlayerValue('startingAccount', e.target.value)} />
          </div>
        </div>

        <div className="input-row grid-4">
          <div className="p-field">
            <label>Base phone number</label>
            <input type="tel" value={playerForm.startPhone} onChange={(e) => setPlayerValue('startPhone', e.target.value)} placeholder="For multiple accounts auto-increment" />
          </div>
          <div className="p-field">
            <label>First Name</label>
            <input type="text" value={playerForm.firstName} onChange={(e) => setPlayerValue('firstName', e.target.value.toUpperCase())} />
          </div>
          <div className="p-field">
            <label>Last Name</label>
            <input type="text" value={playerForm.lastName} onChange={(e) => setPlayerValue('lastName', e.target.value.toUpperCase())} />
          </div>
          <div className="p-field">
            <label>Password Base</label>
            <input type="text" value={playerForm.manualPasswordBase} onChange={(e) => setPlayerValue('manualPasswordBase', e.target.value)} disabled={playerForm.randomPasswordEnabled} placeholder="Used when random password is OFF" />
          </div>
        </div>

        <div className="inline-controls-row">
          <label className="switch-label">
            <span>Generate random password (ex: A7B3)</span>
            <label className="switch-mini">
              <input
                type="checkbox"
                checked={playerForm.randomPasswordEnabled}
                onChange={(e) => setPlayerValue('randomPasswordEnabled', e.target.checked)}
              />
              <span className="slider-mini"></span>
            </label>
          </label>
        </div>
      </div>

      <div className="f-section">
        <h4 className="section-tag">Operational Limits</h4>
        <div className="input-row grid-4">
          <div className="p-field">
            <label>Min bet</label>
            <input type="number" value={playerForm.minBet} onChange={(e) => setPlayerValue('minBet', e.target.value)} />
          </div>
          <div className="p-field">
            <label>Max bet</label>
            <input type="number" value={playerForm.maxBet} onChange={(e) => setPlayerValue('maxBet', e.target.value)} />
          </div>
          <div className="p-field">
            <label>Credit limit</label>
            <input type="number" value={playerForm.creditLimit} onChange={(e) => setPlayerValue('creditLimit', e.target.value)} />
          </div>
          <div className="p-field">
            <label>Settle limit</label>
            <input type="number" value={playerForm.balanceOwed} onChange={(e) => setPlayerValue('balanceOwed', e.target.value)} />
          </div>
        </div>
      </div>

      {renderCapabilities(playerForm.settings, handleTogglePlayerSetting)}
    </div>
  );

  const renderAgentForm = () => (
    <div className="form-sections">
      <div className="f-section">
        <h4 className="section-tag">{mode === 'master' ? 'Master Agent Setup' : 'Agent Setup'}</h4>

        <div className="input-row grid-4">
          <div className="p-field">
            <label>Agent Name</label>
            <input type="text" value={agentForm.fullName} onChange={(e) => setAgentValue('fullName', e.target.value)} />
          </div>
          <div className="p-field">
            <label>Phone Number</label>
            <input type="tel" value={agentForm.phoneNumber} onChange={(e) => setAgentValue('phoneNumber', e.target.value)} />
          </div>
          <div className="p-field">
            <label>Agent Password</label>
            <input type="text" value={agentForm.password} onChange={(e) => setAgentValue('password', e.target.value)} />
          </div>
          <div className="p-field">
            <label>{mode === 'master' ? 'Master Prefix' : 'Agent Prefix'}</label>
            <input type="text" maxLength="6" value={agentForm.prefix} onChange={(e) => setAgentValue('prefix', e.target.value, mode)} />
          </div>
        </div>

        <div className="input-row grid-4">
          <div className="p-field">
            <label>Generated Username</label>
            <input type="text" value={agentForm.username} readOnly className="readonly-input" />
          </div>
          <div className="p-field">
            <label>Under which Master Agent?</label>
            <select value={agentForm.parentMasterId} onChange={(e) => setAgentValue('parentMasterId', e.target.value)}>
              <option value="">Select master (reference)</option>
              {masterOnly.map((m) => (
                <option key={m.id || m._id} value={m.id || m._id}>{m.username}</option>
              ))}
            </select>
          </div>
          <div className="p-field">
            <label>Inherit Settings?</label>
            <select value={agentForm.inheritFromId} onChange={(e) => setAgentValue('inheritFromId', e.target.value)}>
              <option value="">No inheritance</option>
              {masterOnly.map((m) => (
                <option key={m.id || m._id} value={m.id || m._id}>{m.username}</option>
              ))}
            </select>
          </div>
          <div className="p-field helper-note-block">
            <label>Behavior</label>
            <p>
              {mode === 'master'
                ? 'Master agents can manage sub-agents but not direct players.'
                : 'Agents can manage players. Hierarchy assignment can be adjusted later in Agent Management.'}
            </p>
          </div>
        </div>
      </div>

      <div className="f-section">
        <h4 className="section-tag">Default Limits</h4>
        <div className="input-row grid-4">
          <div className="p-field">
            <label>Default Min Bet</label>
            <input type="number" value={agentForm.defaultMinBet} onChange={(e) => setAgentValue('defaultMinBet', e.target.value)} />
          </div>
          <div className="p-field">
            <label>Default Max Bet</label>
            <input type="number" value={agentForm.defaultMaxBet} onChange={(e) => setAgentValue('defaultMaxBet', e.target.value)} />
          </div>
          <div className="p-field">
            <label>Default Credit Limit</label>
            <input type="number" value={agentForm.defaultCreditLimit} onChange={(e) => setAgentValue('defaultCreditLimit', e.target.value)} />
          </div>
          <div className="p-field">
            <label>Default Settle Limit</label>
            <input type="number" value={agentForm.defaultSettleLimit} onChange={(e) => setAgentValue('defaultSettleLimit', e.target.value)} />
          </div>
        </div>
      </div>

      {renderCapabilities(agentForm.settings, handleToggleAgentSetting)}
    </div>
  );

  const heading = mode === 'player' ? 'Add Player' : mode === 'agent' ? 'Add Agent' : mode === 'master' ? 'Add Master Agent' : 'Add Customer';

  return (
    <div className="admin-view premium-admin-theme">
      <div className="view-header">
        <button className="btn-back-premium" onClick={() => (onBack ? onBack() : setMode(''))}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Dashboard
        </button>
        <div className="header-copy">
          <div className="header-icon-title">
            <div className="glow-accent"></div>
            <h2>{heading}</h2>
          </div>
        </div>
        <button className="btn-type-switch" type="button" onClick={() => setShowTypePicker(true)}>
          Choose Type
        </button>
      </div>

      <div className="view-content central-card">
        <div className="premium-card glass-effect">
          <div className="card-header">
            <h3>{mode ? 'Configuration Panel' : 'Choose Account Type'}</h3>
            <p>{mode ? 'Define functionality, limits, and hierarchy rules before continue.' : 'Select Player, Agent, or Master to continue.'}</p>
          </div>

          <div className="premium-form">
            {loadingContext ? (
              <div className="status-msg">Loading context...</div>
            ) : (
              <>
                {!mode && (
                  <div className="inline-type-grid">
                    <button type="button" onClick={() => chooseMode('player')}>Player</button>
                    <button type="button" onClick={() => chooseMode('agent')}>Agent</button>
                    <button type="button" onClick={() => chooseMode('master')}>Master</button>
                  </div>
                )}

                {mode === 'player' && renderPlayerForm()}
                {(mode === 'agent' || mode === 'master') && renderAgentForm()}

                {error && <div className="premium-error-msg">{error}</div>}
                {success && <div className="premium-success-msg">{success}</div>}

                {mode && (
                  <div className="form-footer-premium">
                    <button type="button" className="btn-deploy-premium" onClick={handleContinue} disabled={loading}>
                      {loading ? 'Processing...' : 'Continue'}
                    </button>
                  </div>
                )}

                <div className="recent-section">
                  <h4>Recently Added Customers</h4>
                  {recent.length === 0 ? (
                    <div className="status-msg">No records yet.</div>
                  ) : (
                    <div className="recent-table-wrap">
                      <table className="recent-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Username</th>
                            <th>Parent</th>
                            <th>Created</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recent.map((row) => (
                            <tr key={row.id}>
                              <td>{row.type}</td>
                              <td>{row.username}</td>
                              <td>{row.parent || '-'}</td>
                              <td>{row.createdAt}</td>
                              <td>
                                <button type="button" className="btn-delete-mini" disabled={loading} onClick={() => handleDeleteRecent(row)}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showTypePicker && renderTypePicker()}

      <style>{`
        .premium-admin-theme {
          background: #d3d3d3;
          min-height: 100vh;
          color: #2f343a;
          font-family: 'Segoe UI', Tahoma, sans-serif;
          padding: 16px;
        }
        .view-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; }
        .btn-back-premium {
          background: #f4f4f4; color: #2f343a; border: 1px solid #b8b8b8;
          padding: 10px 16px; border-radius: 3px; font-weight: 600;
          display: flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap;
        }
        .btn-back-premium:hover { background: #ffffff; }
        .header-copy { flex: 1; min-width: 0; }
        .header-icon-title { display: flex; align-items: center; gap: 12px; }
        .glow-accent { width: 6px; height: 28px; background: #0b4f6c; border-radius: 2px; }
        .header-icon-title h2 { margin: 0; font-size: 28px; font-weight: 700; color: #0b4f6c; }
        .btn-type-switch {
          background: #0b4f6c; color: #fff; border: 1px solid #07384d; border-radius: 3px;
          padding: 10px 14px; font-weight: 600; cursor: pointer;
        }
        .btn-type-switch:hover { background: #0a455e; }

        .central-card { display: flex; justify-content: center; }
        .premium-card {
          background: #efefef;
          width: 100%;
          max-width: 100%;
          border-radius: 0;
          border: 1px solid #c6c6c6;
          overflow: hidden;
          box-shadow: none;
        }

        .card-header { padding: 10px 14px; background: #0b4f6c; border-bottom: 1px solid #07384d; }
        .card-header h3 { margin: 0 0 3px; font-size: 17px; font-weight: 700; color: #fff; }
        .card-header p { margin: 0; color: #d5e6ee; font-size: 12px; }

        .premium-form { padding: 14px; }
        .form-sections { display: flex; flex-direction: column; gap: 24px; }
        .f-section { background: #efefef; border: 1px solid #d3d3d3; border-radius: 0; padding: 4px 0 0; }
        .section-tag {
          font-size: 15px;
          text-transform: uppercase;
          font-weight: 600;
          color: #2f343a;
          letter-spacing: 0.5px;
          margin: 0 0 12px;
          border-left: 0;
          padding-left: 0;
        }

        .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }
        .input-row.grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

        .p-field { display: flex; flex-direction: column; gap: 6px; }
        .p-field label {
          font-size: 15px;
          text-transform: none;
          font-weight: 500;
          color: #3f4348;
          letter-spacing: 0;
        }
        .p-field input, .p-field select {
          background: #ffffff;
          border: 1px solid #bfc7cd;
          color: #2f343a;
          padding: 9px 10px;
          border-radius: 2px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          height: 42px;
        }
        .p-field input:focus, .p-field select:focus { border-color: #53a6d6; box-shadow: none; }
        .readonly-input { background: #edf1f4 !important; color: #5b6671 !important; }

        .helper-note-block p {
          margin: 0;
          background: #f3f3f3;
          border: 1px solid #d4d7da;
          color: #39424a;
          border-radius: 2px;
          padding: 10px;
          min-height: 44px;
          font-size: 14px;
        }

        .inline-controls-row { margin-top: 8px; }
        .switch-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 12px;
          border-radius: 2px;
          background: #efefef;
          border: 0;
          color: #2f343a;
        }

        .switch-mini {
          position: relative;
          width: 44px;
          height: 24px;
          display: inline-block;
          cursor: pointer;
        }
        .switch-mini input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider-mini {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: #9da8b2;
          transition: 0.2s;
        }
        .slider-mini:before {
          content: '';
          position: absolute;
          height: 18px;
          width: 18px;
          left: 3px;
          top: 3px;
          border-radius: 50%;
          background: #fff;
          transition: 0.2s;
        }
        .switch-mini input:checked + .slider-mini {
          background: #0ea44b;
        }
        .switch-mini input:checked + .slider-mini:before {
          transform: translateX(20px);
          background: #fff;
        }

        .capabilities-premium-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .cap-card {
          border: 1px solid #b8cde2;
          background: #f8fbff;
          color: inherit;
          border-radius: 8px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.2s ease, background-color 0.2s ease;
        }
        .cap-card:hover { border-color: #6aa8d5; background: #f4f9ff; }
        .cap-card.active { border-color: #4298d4; background: #edf6ff; }
        .cap-meta { display: flex; flex-direction: column; gap: 3px; }
        .cap-label { font-size: 16px; font-weight: 700; color: #263746; }
        .cap-desc { margin: 0; font-size: 13px; color: #637687; }
        .cap-toggle-ui { width: 44px; height: 24px; border-radius: 20px; background: #2f80ed; position: relative; flex-shrink: 0; }
        .toggle-dot { width: 18px; height: 18px; border-radius: 999px; background: #fff; position: absolute; top: 3px; left: 23px; }
        .cap-card:not(.active) .cap-toggle-ui { background: #a8b2bc; }
        .cap-card:not(.active) .toggle-dot { left: 3px; background: #fff; }

        .premium-error-msg {
          margin-top: 12px;
          background: #ffe9e9;
          border: 1px solid #efb7b7;
          color: #ab3434;
          padding: 10px;
          border-radius: 2px;
          font-weight: 600;
          font-size: 13px;
        }
        .premium-success-msg {
          margin-top: 12px;
          background: #e8f8ec;
          border: 1px solid #afdec0;
          color: #257747;
          padding: 10px;
          border-radius: 2px;
          font-weight: 600;
          font-size: 13px;
        }

        .form-footer-premium { margin-top: 14px; }
        .btn-deploy-premium {
          width: 100%;
          background: #37b24d;
          border: 1px solid #2f9e44;
          color: #fff;
          font-weight: 600;
          padding: 10px;
          border-radius: 2px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-deploy-premium:disabled { opacity: 0.65; cursor: not-allowed; }

        .recent-section {
          margin-top: 18px;
          border: 1px solid #cfd4d9;
          border-radius: 2px;
          overflow: hidden;
          background: #fff;
        }
        .recent-section h4 {
          margin: 0;
          padding: 12px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #30424f;
          background: #e9eef2;
        }
        .status-msg { padding: 12px; color: #6f7a84; }
        .recent-table-wrap { overflow: auto; }
        .recent-table { width: 100%; border-collapse: collapse; }
        .recent-table thead { background: #f2f5f7; }
        .recent-table th, .recent-table td {
          border-top: 1px solid #dbe1e6;
          padding: 10px;
          font-size: 13px;
          text-align: left;
          white-space: nowrap;
          color: #2f343a;
        }
        .recent-table tbody tr:nth-child(even) { background: #fafcfe; }
        .btn-delete-mini {
          border: 0;
          border-radius: 2px;
          background: #dc2626;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          padding: 7px 10px;
          cursor: pointer;
        }

        .inline-type-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .inline-type-grid button {
          border: 1px solid #bfd1df;
          background: #ffffff;
          color: #244153;
          border-radius: 2px;
          padding: 16px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
        }
        .inline-type-grid button:hover { background: #f6fbff; border-color: #8fb5cd; }

        .picker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          z-index: 1200;
          padding-top: 95px;
        }
        .picker-modal {
          width: 100%;
          max-width: 560px;
          background: #fff;
          border-radius: 2px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .picker-header {
          background: #0b4f6c;
          color: #fff;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 700;
        }
        .picker-header button {
          background: transparent;
          border: 0;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
        }
        .picker-option {
          width: 100%;
          border: 0;
          border-top: 1px solid #d8dee4;
          background: #fff;
          padding: 14px;
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 10px;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .picker-option:hover { background: #f7fafc; }
        .picker-option i { color: #334155; font-size: 20px; margin-top: 3px; }
        .picker-option p { margin: 4px 0 0; color: #4b5563; font-size: 13px; }

        @media (max-width: 1100px) {
          .input-row.grid-4, .capabilities-premium-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 760px) {
          .premium-admin-theme { padding: 12px; }
          .view-header { flex-wrap: wrap; align-items: stretch; }
          .input-row, .input-row.grid-4, .capabilities-premium-grid, .inline-type-grid { grid-template-columns: 1fr; }
          .btn-type-switch { width: 100%; }
          .picker-overlay { padding: 40px 10px 10px; }
        }
      `}</style>
    </div>
  );
}

export default AddCustomerView;
