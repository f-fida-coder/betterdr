import React, { useEffect, useMemo, useState } from 'react';
import { getAgentCuts } from '../api';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0';
  const rounded = Math.round(num);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}$${Math.abs(rounded).toLocaleString('en-US')}`;
};

const toneClass = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || Math.abs(Math.round(num)) < 0.5) return 'neutral';
  return num > 0 ? 'positive' : 'negative';
};

const toIsoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const buildLast12Weeks = () => {
  // Week starts Tuesday. Find the most recent Tuesday (or today if Tuesday),
  // then generate 12 weeks going back.
  const weeks = [];
  const now = new Date();
  const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = localStart.getDay(); // 0=Sun,1=Mon,2=Tue,...
  const daysSinceTuesday = (dow + 5) % 7; // 0 if Tue, 1 if Wed, ..., 6 if Mon
  const currentWeekStart = new Date(localStart);
  currentWeekStart.setDate(localStart.getDate() - daysSinceTuesday);

  for (let i = 0; i < 12; i++) {
    const start = new Date(currentWeekStart);
    start.setDate(currentWeekStart.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const label = `${MONTH_ABBR[start.getMonth()]} ${start.getDate()} - ${MONTH_ABBR[end.getMonth()]} ${end.getDate()}`;
    weeks.push({
      iso: toIsoDate(start),
      label,
      start,
      end,
    });
  }
  return weeks;
};

const getCurrentQuarter = () => {
  const now = new Date();
  return Math.floor(now.getMonth() / 3) + 1;
};

function AgentCutsTable({ onSelectAgent }) {
  const [tab, setTab] = useState('week');
  const weeks = useMemo(() => buildLast12Weeks(), []);
  const [selectedWeekIso, setSelectedWeekIso] = useState(weeks[0]?.iso || '');
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter());
  const [hideZero, setHideZero] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    period: { type: 'week', label: '' },
    agents: [],
    totals: { periodAmount: 0, lifetimeAmount: 0 },
  });

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const params = { periodType: tab };
    if (tab === 'week') {
      if (!selectedWeekIso) return undefined;
      params.weekStart = selectedWeekIso;
    } else if (tab === 'quarter') {
      params.quarter = selectedQuarter;
      params.year = currentYear;
    }

    setLoading(true);
    setError(null);
    getAgentCuts(token, params)
      .then((result) => {
        if (cancelled) return;
        setData(result || { period: { type: tab, label: '' }, agents: [], totals: { periodAmount: 0, lifetimeAmount: 0 } });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load agent cuts');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, selectedWeekIso, selectedQuarter, currentYear]);

  const visibleAgents = useMemo(() => {
    const all = Array.isArray(data?.agents) ? data.agents : [];
    if (!hideZero) return all;
    return all.filter((a) => Math.abs(Math.round(Number(a?.periodAmount ?? 0))) > 0);
  }, [data, hideZero]);

  const periodTotal = Number(data?.totals?.periodAmount ?? 0);
  const lifetimeTotal = Number(data?.totals?.lifetimeAmount ?? 0);

  return (
    <div className="agent-cuts-panel">
      <div className="agent-cuts-tabs">
        <button
          type="button"
          className={`agent-cuts-tab ${tab === 'week' ? 'is-active' : ''}`}
          onClick={() => setTab('week')}
        >
          Weekly
        </button>
        <button
          type="button"
          className={`agent-cuts-tab ${tab === 'quarter' ? 'is-active' : ''}`}
          onClick={() => setTab('quarter')}
        >
          Quarterly
        </button>
        <button
          type="button"
          className={`agent-cuts-tab ${tab === 'lifetime' ? 'is-active' : ''}`}
          onClick={() => setTab('lifetime')}
        >
          Lifetime
        </button>
      </div>

      <div className="agent-cuts-controls">
        {tab === 'week' && (
          <select
            className="agent-cuts-week-select"
            value={selectedWeekIso}
            onChange={(e) => setSelectedWeekIso(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w.iso} value={w.iso}>{w.label}</option>
            ))}
          </select>
        )}
        {tab === 'quarter' && (
          <div className="agent-cuts-quarter-buttons">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                type="button"
                className={`agent-cuts-quarter-btn ${selectedQuarter === q ? 'is-active' : ''}`}
                onClick={() => setSelectedQuarter(q)}
              >
                Q{q}
              </button>
            ))}
            <span className="agent-cuts-quarter-year">{currentYear}</span>
          </div>
        )}
        {tab === 'lifetime' && (
          <span className="agent-cuts-lifetime-hint">All-time totals</span>
        )}
        <label className="agent-cuts-hide-zero">
          <input
            type="checkbox"
            checked={hideZero}
            onChange={(e) => setHideZero(e.target.checked)}
          />
          Hide $0 agents
        </label>
      </div>

      {data?.period?.label && (
        <div className="agent-cuts-period-label">{data.period.label}</div>
      )}

      {error && <div className="agent-cuts-error">{error}</div>}

      <div className="agent-cuts-table">
        <div className="agent-cuts-header">
          <span className="acut-name">Agent</span>
          <span className="acut-cut">Cut%</span>
          <span className="acut-period">Period</span>
          <span className="acut-lifetime">Lifetime</span>
        </div>
        {loading && <div className="agent-cuts-empty">Loading…</div>}
        {!loading && visibleAgents.length === 0 && (
          <div className="agent-cuts-empty">No agents with activity for this period.</div>
        )}
        {!loading && visibleAgents.map((agent) => {
          const period = Number(agent?.periodAmount ?? 0);
          const lifetime = Number(agent?.lifetimeAmount ?? 0);
          return (
            <button
              key={agent.id}
              type="button"
              className="agent-cuts-row"
              onClick={() => {
                if (typeof onSelectAgent === 'function' && agent.id) {
                  onSelectAgent(agent.id);
                }
              }}
            >
              <span className="acut-name">{agent.username}</span>
              <span className="acut-cut">{agent.myCut != null ? `${agent.myCut}%` : '—'}</span>
              <span className={`acut-period ${toneClass(period)}`}>{formatCurrency(period)}</span>
              <span className={`acut-lifetime ${toneClass(lifetime)}`}>{formatCurrency(lifetime)}</span>
            </button>
          );
        })}
        {!loading && visibleAgents.length > 0 && (
          <div className="agent-cuts-total">
            <span className="acut-name">PROFIT</span>
            <span className="acut-cut" />
            <span className={`acut-period ${toneClass(periodTotal)}`}>{formatCurrency(periodTotal)}</span>
            <span className={`acut-lifetime ${toneClass(lifetimeTotal)}`}>{formatCurrency(lifetimeTotal)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentCutsTable;
