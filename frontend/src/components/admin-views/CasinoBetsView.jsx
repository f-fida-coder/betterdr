import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadAdminCasinoBetsCsv, getAdminCasinoBetDetail, getAdminCasinoBets, getAdminCasinoSummary } from '../../api';

const EMPTY_FILTERS = {
  username: '',
  result: '',
  from: '',
  to: '',
  minWager: '',
  maxWager: '',
};

function CasinoBetsView() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 50 });
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);

  const token = localStorage.getItem('token');

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('Please login to view casino bets.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const [betsData, summaryData] = await Promise.all([
        getAdminCasinoBets({ ...filters, page, limit: 50 }, token),
        getAdminCasinoSummary({ from: filters.from, to: filters.to }, token),
      ]);
      setRows(Array.isArray(betsData?.bets) ? betsData.bets : []);
      setPagination(betsData?.pagination || { page, pages: 1, total: 0, limit: 50 });
      setSummary(summaryData?.summary || null);
    } catch (err) {
      console.error('Failed to load admin casino data:', err);
      setError(err.message || 'Failed to load casino bets');
    } finally {
      setLoading(false);
    }
  }, [token, filters, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyFilter = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const openDetail = async (roundId) => {
    if (!roundId || !token) return;
    try {
      setDetailLoading(true);
      setDetailError('');
      const payload = await getAdminCasinoBetDetail(roundId, token);
      setSelectedDetail(payload?.bet || null);
    } catch (err) {
      setDetailError(err.message || 'Failed to load round detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedDetail(null);
    setDetailError('');
  };

  const resetFilters = () => {
    setPage(1);
    setFilters(EMPTY_FILTERS);
  };

  const formatMoney = (value) => {
    const num = Number(value || 0);
    if (Number.isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  };

  const shortId = (value) => {
    const next = String(value || '');
    if (!next) return '—';
    return `${next.slice(0, 10)}…`;
  };

  const summaryCards = useMemo(
    () => ([
      { label: 'Rounds', value: Number(summary?.rounds || 0).toLocaleString(), tone: 'navy' },
      { label: 'Total Wager', value: formatMoney(summary?.totalWager), tone: 'blue' },
      { label: 'Total Return', value: formatMoney(summary?.totalReturn), tone: 'teal' },
      { label: 'GGR', value: formatMoney(summary?.grossGamingRevenue), tone: 'slate' },
      { label: 'Payout Ratio', value: `${Number(summary?.payoutRatio || 0).toFixed(2)}%`, tone: 'indigo' },
      { label: 'Error Rate', value: `${Number(summary?.errorRate || 0).toFixed(4)}%`, tone: 'rose' },
    ]),
    [summary]
  );

  return (
    <div className="admin-view casino-bets-view">
      <div className="view-header casino-bets-header">
        <div>
          <h2>Casino Bets</h2>
          <p className="subtitle">Live baccarat reporting, settlement ledger, and round-level audit details.</p>
        </div>
        <div className="casino-bets-header-actions">
          <button type="button" className="btn-small" onClick={fetchData} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="btn-small btn-accent" onClick={() => downloadAdminCasinoBetsCsv(filters, token)}>
            Export CSV
          </button>
        </div>
      </div>
      <div className="view-content casino-bets-content">
        {loading && <div className="casino-bets-loading">Loading casino bets…</div>}
        {error && <div className="casino-bets-error">{error}</div>}
        {!loading && !error && (
          <>
            <div className="casino-bets-kpi-grid">
              {summaryCards.map((card) => (
                <div className={`casino-kpi-card tone-${card.tone}`} key={card.label}>
                  <span className="casino-kpi-label">{card.label}</span>
                  <strong className="casino-kpi-value">{card.value}</strong>
                </div>
              ))}
            </div>

            <div className="casino-bets-filters">
              <div className="filter-group">
                <label>Player</label>
                <input
                  type="text"
                  value={filters.username}
                  onChange={(e) => applyFilter('username', e.target.value)}
                  placeholder="username"
                />
              </div>
              <div className="filter-group">
                <label>Result</label>
                <select value={filters.result} onChange={(e) => applyFilter('result', e.target.value)}>
                  <option value="">All</option>
                  <option value="Player">Player</option>
                  <option value="Banker">Banker</option>
                  <option value="Tie">Tie</option>
                </select>
              </div>
              <div className="filter-group">
                <label>From</label>
                <input type="date" value={filters.from} onChange={(e) => applyFilter('from', e.target.value)} />
              </div>
              <div className="filter-group">
                <label>To</label>
                <input type="date" value={filters.to} onChange={(e) => applyFilter('to', e.target.value)} />
              </div>
              <div className="filter-group">
                <label>Min Wager</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.minWager}
                  onChange={(e) => applyFilter('minWager', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="filter-group">
                <label>Max Wager</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.maxWager}
                  onChange={(e) => applyFilter('maxWager', e.target.value)}
                  placeholder="500.00"
                />
              </div>
              <div className="casino-filter-actions">
                <button type="button" className="btn-small" onClick={resetFilters}>
                  Clear
                </button>
              </div>
            </div>

            <div className="table-container scrollable casino-bets-table-wrap">
              <table className="data-table casino-bets-table">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>User</th>
                    <th>Result</th>
                    <th>Wager</th>
                    <th>Return</th>
                    <th>Net</th>
                    <th>Balance After</th>
                    <th>Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.roundId || row.id}>
                      <td className="round-id" title={row.roundId || row.id || ''}>{shortId(row.roundId || row.id)}</td>
                      <td>{row.username || '—'}</td>
                      <td>
                        <span className={`casino-result-badge result-${String(row.result || '').toLowerCase()}`}>
                          {row.result || '—'}
                        </span>
                      </td>
                      <td>{formatMoney(row.totalWager)}</td>
                      <td>{formatMoney(row.totalReturn)}</td>
                      <td>
                        <span className={`casino-net-pill ${Number(row.netResult) >= 0 ? 'is-positive' : 'is-negative'}`}>
                          {formatMoney(row.netResult)}
                        </span>
                      </td>
                      <td>{formatMoney(row.balanceAfter)}</td>
                      <td>{formatDateTime(row.createdAt)}</td>
                      <td>
                        <button className="btn-small" onClick={() => openDetail(row.roundId || row.id)} type="button">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 16 }}>
                        No casino bet rows found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="casino-bets-pagination">
              <span className="casino-page-meta">
                {Number(pagination?.total || 0).toLocaleString()} rows
              </span>
              <button
                type="button"
                className="btn-small"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span className="casino-page-index">
                Page {pagination?.page || page} of {pagination?.pages || 1}
              </span>
              <button
                type="button"
                className="btn-small"
                onClick={() => setPage((p) => Math.min(Number(pagination?.pages || 1), p + 1))}
                disabled={(pagination?.page || page) >= (pagination?.pages || 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {(selectedDetail || detailLoading || detailError) && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-content casino-bets-modal" onClick={(e) => e.stopPropagation()}>
            <div className="casino-bets-modal-head">
              <h3>Casino Round Detail</h3>
              <button type="button" className="btn-secondary" onClick={closeDetail}>Close</button>
            </div>

            {detailLoading && <div className="casino-bets-loading">Loading round detail…</div>}
            {detailError && <div className="casino-bets-error">{detailError}</div>}
            {!detailLoading && selectedDetail && (
              <div className="casino-bets-detail">
                <div className="casino-bets-detail-grid">
                  <section className="casino-detail-card">
                    <h4>Round</h4>
                    <div className="casino-detail-row"><span>Round ID</span><code>{selectedDetail.roundId || '—'}</code></div>
                    <div className="casino-detail-row"><span>Request ID</span><code>{selectedDetail.requestId || '—'}</code></div>
                    <div className="casino-detail-row">
                      <span>Result</span>
                      <span className={`casino-result-badge result-${String(selectedDetail.result || '').toLowerCase()}`}>{selectedDetail.result || '—'}</span>
                    </div>
                    <div className="casino-detail-row"><span>Decision</span><span>{formatDateTime(selectedDetail.serverDecisionAt)}</span></div>
                  </section>

                  <section className="casino-detail-card">
                    <h4>Player</h4>
                    <div className="casino-detail-row"><span>Username</span><strong>{selectedDetail.username || '—'}</strong></div>
                    <div className="casino-detail-row"><span>User ID</span><code>{selectedDetail.userId || '—'}</code></div>
                    <div className="casino-detail-row"><span>Balance Before</span><strong>{formatMoney(selectedDetail.balanceBefore)}</strong></div>
                    <div className="casino-detail-row"><span>Balance After</span><strong>{formatMoney(selectedDetail.balanceAfter)}</strong></div>
                  </section>

                  <section className="casino-detail-card">
                    <h4>Cards</h4>
                    <div className="casino-detail-stack">
                      <span>Player ({selectedDetail.playerTotal})</span>
                      <div className="casino-card-list">
                        {(selectedDetail.playerCards || []).length > 0
                          ? (selectedDetail.playerCards || []).map((card) => <span className="casino-card-chip" key={`p-${card}`}>{card}</span>)
                          : <span>—</span>}
                      </div>
                    </div>
                    <div className="casino-detail-stack">
                      <span>Banker ({selectedDetail.bankerTotal})</span>
                      <div className="casino-card-list">
                        {(selectedDetail.bankerCards || []).length > 0
                          ? (selectedDetail.bankerCards || []).map((card) => <span className="casino-card-chip" key={`b-${card}`}>{card}</span>)
                          : <span>—</span>}
                      </div>
                    </div>
                  </section>

                  <section className="casino-detail-card">
                    <h4>Settlement</h4>
                    <div className="casino-detail-row"><span>Total Wager</span><strong>{formatMoney(selectedDetail.totalWager)}</strong></div>
                    <div className="casino-detail-row"><span>Total Return</span><strong>{formatMoney(selectedDetail.totalReturn)}</strong></div>
                    <div className="casino-detail-row"><span>Net</span><strong>{formatMoney(selectedDetail.netResult)}</strong></div>
                    <div className="casino-detail-row"><span>Integrity Hash</span><code>{selectedDetail.integrityHash || '—'}</code></div>
                  </section>
                </div>

                <h4 className="casino-ledger-title">Ledger Entries</h4>
                <div className="casino-ledger-wrap">
                  <table className="casino-ledger-table">
                    <thead>
                      <tr>
                        <th>Side</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Balance Before</th>
                        <th>Balance After</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedDetail.ledgerEntries || []).map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            <span className={`casino-ledger-side ${String(entry.entrySide || '').toUpperCase() === 'DEBIT' ? 'side-debit' : 'side-credit'}`}>
                              {entry.entrySide || '—'}
                            </span>
                          </td>
                          <td>{entry.type || '—'}</td>
                          <td>{formatMoney(entry.amount)}</td>
                          <td>{formatMoney(entry.balanceBefore)}</td>
                          <td>{formatMoney(entry.balanceAfter)}</td>
                          <td>{formatDateTime(entry.createdAt)}</td>
                        </tr>
                      ))}
                      {(selectedDetail.ledgerEntries || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="casino-ledger-empty">No ledger entries found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CasinoBetsView;
