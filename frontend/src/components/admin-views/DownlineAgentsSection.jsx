import React, { useState, useEffect } from 'react';
import { getDownlineSummary } from '../../api';

const formatCurrency = (value) => {
  const num = Number(value);
  if (value === null || value === undefined || Number.isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const getBalanceClass = (value) => {
  const num = Number(value);
  if (Number.isNaN(num) || num === 0) return '';
  return num > 0 ? 'balance-positive' : 'balance-negative';
};

const getRoleBadge = (role) => {
  const r = String(role || '').toLowerCase();
  if (r === 'master_agent' || r === 'super_agent') return 'M';
  return 'A';
};

const getRoleBadgeClass = (role) => {
  const r = String(role || '').toLowerCase();
  if (r === 'master_agent' || r === 'super_agent') return 'role-badge role-badge-m';
  return 'role-badge role-badge-a';
};

const isSamePerson = (myUser, childUser) => {
  const my = (myUser || '').toUpperCase();
  const child = (childUser || '').toUpperCase();
  if (!my || !child) return false;
  if (my.endsWith('MA')) return child === my.slice(0, -2);
  return child === my + 'MA';
};

const getActualCut = (myPct, childPct, childRole) => {
  if (myPct == null || childPct == null) return null;
  const r = (childRole || '').toLowerCase();
  if (r === 'agent') return childPct;
  return myPct - childPct;
};

function DownlineAgentsSection({ onSwitchContext }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const result = await getDownlineSummary(token);
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch downline summary:', err);
        setError(err.message || 'Failed to load downline data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="downline-agents-section">
        <div className="downline-loading">Loading downline agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="downline-agents-section">
        <div className="downline-error">{error}</div>
      </div>
    );
  }

  const agents = data?.agents || [];
  const totals = data?.totals || {};
  const myAgentPercent = data?.myAgentPercent ?? null;
  const myUsername = (data?.myUsername || '').toUpperCase();

  if (agents.length === 0) {
    return null;
  }

  const handleRowClick = (agentId) => {
    if (typeof onSwitchContext === 'function' && agentId) {
      onSwitchContext(agentId);
    }
  };

  return (
    <div className="downline-agents-section">
      <h3 className="downline-title">Downline Agents</h3>

      <div className="downline-totals-bar">
        <div className="downline-total-item">
          <span className="downline-total-label">Agents</span>
          <span className="downline-total-value">{totals.totalAgents || 0}</span>
        </div>
        <div className="downline-total-item">
          <span className="downline-total-label">Players</span>
          <span className="downline-total-value">{totals.totalPlayers || 0}</span>
        </div>
        <div className="downline-total-item">
          <span className="downline-total-label">Total Balance</span>
          <span className={`downline-total-value ${getBalanceClass(totals.totalBalanceOwed)}`}>
            {formatCurrency(totals.totalBalanceOwed)}
          </span>
        </div>
      </div>

      <div className="downline-agent-list">
        <div className="downline-agent-header-row">
          <span className="downline-col-agent">Agent</span>
          <span className="downline-col-pct">%</span>
          <span className="downline-col-players">Players</span>
          <span className="downline-col-balance">Balance Owed</span>
        </div>
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className={`downline-agent-row ${agent.status === 'suspended' ? 'downline-row-suspended' : ''}`}
            onClick={() => handleRowClick(agent.id)}
          >
            <span className="downline-col-agent">
              <span className={getRoleBadgeClass(agent.role)}>{getRoleBadge(agent.role)}</span>
              <span className="downline-agent-username">{agent.username}</span>
              {isSamePerson(myUsername, agent.username) && (
                <span className="my-account-badge">MY ACCT</span>
              )}
            </span>
            <span className="downline-col-pct">
              {getActualCut(myAgentPercent, agent.agentPercent, agent.role) != null
                ? `${getActualCut(myAgentPercent, agent.agentPercent, agent.role)}%`
                : '—'}
            </span>
            <span className="downline-col-players">{agent.totalPlayerCount ?? 0}</span>
            <span className={`downline-col-balance ${getBalanceClass(agent.balance)}`}>
              {formatCurrency(agent.balance)}
            </span>
            <span className="downline-col-arrow">
              <i className="fa-solid fa-chevron-right"></i>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default DownlineAgentsSection;
