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
  const weeks = [];
  const now = new Date();
  const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = localStart.getDay();
  const daysSinceTuesday = (dow + 5) % 7;
  const currentWeekStart = new Date(localStart);
  currentWeekStart.setDate(localStart.getDate() - daysSinceTuesday);

  for (let i = 0; i < 12; i++) {
    const start = new Date(currentWeekStart);
    start.setDate(currentWeekStart.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const dropdownLabel = `${MONTH_ABBR[start.getMonth()]} ${start.getDate()} - ${MONTH_ABBR[end.getMonth()]} ${end.getDate()}`;
    // Short label used as the "Period" column header when a week is selected.
    const shortLabel = start.getMonth() === end.getMonth()
      ? `${MONTH_ABBR[start.getMonth()]} ${start.getDate()}-${end.getDate()}`
      : `${MONTH_ABBR[start.getMonth()]} ${start.getDate()}-${MONTH_ABBR[end.getMonth()]} ${end.getDate()}`;
    weeks.push({
      iso: toIsoDate(start),
      label: dropdownLabel,
      shortLabel,
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

function AgentCutsTable({ onSelectAgent, onWeekChange }) {
  const [tab, setTab] = useState('week');
  const weeks = useMemo(() => buildLast12Weeks(), []);
  const currentWeekIso = weeks[0]?.iso || '';
  const [selectedWeekIso, setSelectedWeekIso] = useState(currentWeekIso);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  // 'q1' | 'q2' | 'q3' | 'q4' | 'year' — null until user opens the quarterly tab
  const [quarterlyChoice, setQuarterlyChoice] = useState(`q${getCurrentQuarter()}`);

  const [hideZero, setHideZero] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    period: { type: 'week', label: '' },
    ytdLabel: String(currentYear),
    agents: [],
    totals: { periodAmount: 0, lifetimeAmount: 0 },
  });

  // Notify parent (AdminHeader) when the effective "week" view changes so the
  // top stat block can refetch. For non-week tabs revert to current-week stats
  // because the dropdown isn't meaningful up there.
  useEffect(() => {
    if (typeof onWeekChange !== 'function') return;
    if (tab === 'week') {
      const isCurrent = selectedWeekIso === currentWeekIso;
      onWeekChange(selectedWeekIso, isCurrent);
    } else {
      onWeekChange(currentWeekIso, true);
    }
  }, [tab, selectedWeekIso, currentWeekIso, onWeekChange]);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const params = {};
    if (tab === 'week') {
      if (!selectedWeekIso) return undefined;
      params.periodType = 'week';
      params.weekStart = selectedWeekIso;
    } else if (tab === 'quarter') {
      if (quarterlyChoice === 'year') {
        params.periodType = 'yearly';
        params.year = currentYear;
      } else {
        const q = Number(String(quarterlyChoice).replace(/^q/, '')) || getCurrentQuarter();
        params.periodType = 'quarter';
        params.quarter = q;
        params.year = currentYear;
      }
    }

    setLoading(true);
    setError(null);
    getAgentCuts(token, params)
      .then((result) => {
        if (cancelled) return;
        setData(result || {
          period: { type: tab, label: '' },
          ytdLabel: String(currentYear),
          agents: [],
          totals: { periodAmount: 0, lifetimeAmount: 0 },
        });
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
  }, [tab, selectedWeekIso, quarterlyChoice, currentYear]);

  const visibleAgents = useMemo(() => {
    const all = Array.isArray(data?.agents) ? data.agents : [];
    if (!hideZero) return all;
    return all.filter((a) => Math.abs(Math.round(Number(a?.periodAmount ?? 0))) > 0);
  }, [data, hideZero]);

  const periodTotal = Number(data?.totals?.periodAmount ?? 0);
  const lifetimeTotal = Number(data?.totals?.lifetimeAmount ?? 0);

  // Dynamic column headers: "Period" label reflects the current selection,
  // second column shows the year for the YTD totals.
  const periodColumnHeader = useMemo(() => {
    if (tab === 'week') {
      const w = weeks.find((x) => x.iso === selectedWeekIso);
      return w?.shortLabel || 'Period';
    }
    if (tab === 'quarter') {
      if (quarterlyChoice === 'year') return String(currentYear);
      return String(quarterlyChoice).toUpperCase();
    }
    return 'Period';
  }, [tab, selectedWeekIso, quarterlyChoice, weeks, currentYear]);

  const ytdColumnHeader = String(data?.ytdLabel ?? currentYear);

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
            {['q1', 'q2', 'q3', 'q4'].map((q) => (
              <button
                key={q}
                type="button"
                className={`agent-cuts-quarter-btn ${quarterlyChoice === q ? 'is-active' : ''}`}
                onClick={() => setQuarterlyChoice(q)}
              >
                {q.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              className={`agent-cuts-quarter-btn ${quarterlyChoice === 'year' ? 'is-active' : ''}`}
              onClick={() => setQuarterlyChoice('year')}
            >
              {currentYear}
            </button>
          </div>
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

      {error && <div className="agent-cuts-error">{error}</div>}

      <div className="agent-cuts-table">
        <div className="agent-cuts-header">
          <span className="acut-name">Agent</span>
          <span className="acut-cut">Cut%</span>
          <span className="acut-period">{periodColumnHeader}</span>
          <span className="acut-lifetime">{ytdColumnHeader}</span>
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
