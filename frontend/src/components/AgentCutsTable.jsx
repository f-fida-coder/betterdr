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

const liabilityToneClass = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || Math.abs(Math.round(num)) < 0.5) return 'neutral';
  return num > 0 ? 'negative' : 'positive';
};

const formatLiabilityCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0';
  const rounded = Math.round(num);
  if (rounded === 0) return '$0';
  const sign = rounded > 0 ? '-' : '';
  return `${sign}$${Math.abs(rounded).toLocaleString('en-US')}`;
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

function AgentCutsTable({ onSelectAgent, onOpenOwedAgent, onWeekChange }) {
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
    totals: { owedAmount: 0, periodAmount: 0, ytdAmount: 0, lifetimeAmount: 0, makeupAmount: 0 },
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
          totals: { owedAmount: 0, periodAmount: 0, ytdAmount: 0, lifetimeAmount: 0, makeupAmount: 0 },
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

  const owedTotal = Number(data?.totals?.owedAmount ?? 0);
  const periodTotal = Number(data?.totals?.periodAmount ?? 0);
  const ytdTotal = Number(data?.totals?.ytdAmount ?? 0);
  const lifetimeTotal = Number(data?.totals?.lifetimeAmount ?? 0);
  const makeupTotal = Number(data?.totals?.makeupAmount ?? 0);
  const selectedWeek = weeks.find((x) => x.iso === selectedWeekIso);
  const useYtdForSecondColumn = tab === 'quarter' && quarterlyChoice !== 'year';

  const periodColumnHeader = useMemo(() => {
    if (tab === 'quarter') {
      if (quarterlyChoice === 'year') return String(currentYear);
      return String(quarterlyChoice).toUpperCase();
    }
    return 'Period';
  }, [tab, quarterlyChoice, currentYear]);

  const metricColumns = useMemo(() => {
    if (tab === 'week') {
      return [
        {
          key: 'owed',
          label: 'Owed',
          className: 'acut-owed',
          totalValue: owedTotal,
          getValue: (agent) => Number(agent?.owedAmount ?? 0),
          formatter: formatLiabilityCurrency,
          getToneClass: liabilityToneClass,
        },
        {
          key: 'profit',
          label: 'Profit',
          className: 'acut-period',
          totalValue: periodTotal,
          getValue: (agent) => Number(agent?.periodAmount ?? 0),
          formatter: formatCurrency,
          getToneClass: toneClass,
        },
        {
          key: 'makeup',
          label: 'Makeup',
          className: 'acut-secondary',
          totalValue: makeupTotal,
          getValue: (agent) => Number(agent?.makeupAmount ?? 0),
          formatter: formatLiabilityCurrency,
          getToneClass: liabilityToneClass,
        },
      ];
    }

    const columns = [
      {
        key: 'period',
        label: periodColumnHeader,
        className: 'acut-period',
        totalValue: periodTotal,
        getValue: (agent) => Number(agent?.periodAmount ?? 0),
        formatter: formatCurrency,
        getToneClass: toneClass,
      },
    ];

    if (useYtdForSecondColumn) {
      columns.push({
        key: 'ytd',
        label: String(data?.ytdLabel ?? currentYear),
        className: 'acut-secondary',
        totalValue: ytdTotal,
        getValue: (agent) => Number(agent?.ytdAmount ?? 0),
        formatter: formatCurrency,
        getToneClass: toneClass,
      });
    }

    columns.push({
      key: 'lifetime',
      label: 'Lifetime',
      className: useYtdForSecondColumn ? 'acut-lifetime' : 'acut-secondary',
      totalValue: lifetimeTotal,
      getValue: (agent) => Number(agent?.lifetimeAmount ?? 0),
      formatter: formatCurrency,
      getToneClass: toneClass,
    });

    return columns;
  }, [tab, periodColumnHeader, owedTotal, periodTotal, makeupTotal, useYtdForSecondColumn, data?.ytdLabel, currentYear, ytdTotal, lifetimeTotal]);

  const visibleAgents = useMemo(() => {
    const all = Array.isArray(data?.agents) ? data.agents : [];
    if (!hideZero) return all;
    return all.filter((agent) => metricColumns.some((column) => Math.abs(Math.round(column.getValue(agent))) > 0));
  }, [data, hideZero, metricColumns]);

  const totalLabel = tab === 'week'
    ? (data?.period?.label || selectedWeek?.label || 'Total')
    : 'PROFIT';

  const handleRowActivate = (agentId) => {
    if (typeof onSelectAgent === 'function' && agentId) {
      onSelectAgent(agentId);
    }
  };

  const handleRowKeyDown = (event, agentId) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    handleRowActivate(agentId);
  };

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
          {metricColumns.map((column) => (
            <span key={column.key} className={column.className}>{column.label}</span>
          ))}
        </div>
        {loading && <div className="agent-cuts-empty">Loading…</div>}
        {!loading && visibleAgents.length === 0 && (
          <div className="agent-cuts-empty">No agents with activity for this period.</div>
        )}
        {!loading && visibleAgents.map((agent) => {
          return (
            <div
              key={agent.id}
              className="agent-cuts-row"
              role="button"
              tabIndex={0}
              onClick={() => handleRowActivate(agent.id)}
              onKeyDown={(event) => handleRowKeyDown(event, agent.id)}
            >
              <span className="acut-name">{agent.username}</span>
              <span className="acut-cut">{agent.myCut != null ? `${agent.myCut}%` : '—'}</span>
              {metricColumns.map((column) => {
                const value = column.getValue(agent);
                const toneClassName = `${column.className} ${column.getToneClass(value)}`;
                if (column.key === 'owed' && typeof onOpenOwedAgent === 'function' && agent.id) {
                  return (
                    <button
                      key={column.key}
                      type="button"
                      className={`${toneClassName} agent-cuts-cell-button`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenOwedAgent(agent.id, {
                          owedAmount: value,
                          username: agent.username ?? '',
                        });
                      }}
                      aria-label={`Open ${String(agent.username || 'agent').toUpperCase()} transaction slip for owed balance ${column.formatter(value)}`}
                    >
                      {column.formatter(value)}
                    </button>
                  );
                }
                return (
                  <span key={column.key} className={toneClassName}>
                    {column.formatter(value)}
                  </span>
                );
              })}
            </div>
          );
        })}
        {!loading && visibleAgents.length > 0 && (
          <div className="agent-cuts-total">
            <span className="acut-name">{totalLabel}</span>
            <span className="acut-cut" />
            {metricColumns.map((column) => (
              <span key={column.key} className={`${column.className} ${column.getToneClass(column.totalValue)}`}>
                {column.formatter(column.totalValue)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentCutsTable;
