import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadAdminCasinoBetsCsv, getAdminCasinoBetDetail, getAdminCasinoBets, getAdminCasinoSummary } from '../../api';

function CasinoBetsView() {
  const [filters, setFilters] = useState({
    username: '',
    result: '',
    from: '',
    to: '',
    minWager: '',
    maxWager: '',
  });
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

  const formatMoney = (value) => {
    const num = Number(value || 0);
    if (Number.isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
  };

  const summaryCards = useMemo(() => ([
    { label: 'Rounds', value: Number(summary?.rounds || 0).toLocaleString() },
    { label: 'Total Wager', value: formatMoney(summary?.totalWager) },
    { label: 'Total Return', value: formatMoney(summary?.totalReturn) },
    { label: 'GGR', value: formatMoney(summary?.grossGamingRevenue) },
    { label: 'Payout Ratio', value: `${Number(summary?.payoutRatio || 0).toFixed(2)}%` },
    { label: 'Error Rate', value: `${Number(summary?.errorRate || 0).toFixed(4)}%` },
  ]), [summary]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Casino Bets</h2>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: 20, textAlign: 'center' }}>Loading casino bets...</div>}
        {error && <div style={{ padding: 20, color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
          <>
            <div className="stats-grid" style={{ marginBottom: 16 }}>
              {summaryCards.map((card) => (
                <div className="stat-card" key={card.label}>
                  <div className="stat-info">
                    <h3>{card.label}</h3>
                    <p>{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="filter-section">
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button
                type="button"
                className="btn-small"
                onClick={() => downloadAdminCasinoBetsCsv(filters, token)}
              >
                Export CSV
              </button>
            </div>

            <div className="table-container scrollable">
              <table className="data-table">
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
                      <td>{String(row.roundId || row.id || '').slice(0, 10)}…</td>
                      <td>{row.username || '—'}</td>
                      <td>{row.result || '—'}</td>
                      <td>{formatMoney(row.totalWager)}</td>
                      <td>{formatMoney(row.totalReturn)}</td>
                      <td className={Number(row.netResult) >= 0 ? 'positive' : 'negative'}>{formatMoney(row.netResult)}</td>
                      <td>{formatMoney(row.balanceAfter)}</td>
                      <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                      <td>
                        <button className="btn-small" onClick={() => openDetail(row.roundId || row.id)}>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="btn-small"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center', fontSize: 12 }}>
                Page {pagination?.page || page} / {pagination?.pages || 1} ({Number(pagination?.total || 0).toLocaleString()} rows)
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <h3>Casino Round Detail</h3>
            {detailLoading && <div>Loading...</div>}
            {detailError && <div style={{ color: 'red' }}>{detailError}</div>}
            {!detailLoading && selectedDetail && (
              <div className="view-details">
                <p><strong>Round ID:</strong> {selectedDetail.roundId}</p>
                <p><strong>User:</strong> {selectedDetail.username} ({selectedDetail.userId})</p>
                <p><strong>Request ID:</strong> {selectedDetail.requestId}</p>
                <p><strong>Result:</strong> {selectedDetail.result}</p>
                <p><strong>Player Cards:</strong> {(selectedDetail.playerCards || []).join(', ') || '—'}</p>
                <p><strong>Banker Cards:</strong> {(selectedDetail.bankerCards || []).join(', ') || '—'}</p>
                <p><strong>Total Wager:</strong> {formatMoney(selectedDetail.totalWager)}</p>
                <p><strong>Total Return:</strong> {formatMoney(selectedDetail.totalReturn)}</p>
                <p><strong>Net Result:</strong> {formatMoney(selectedDetail.netResult)}</p>
                <p><strong>Balance:</strong> {formatMoney(selectedDetail.balanceBefore)} → {formatMoney(selectedDetail.balanceAfter)}</p>
                <p><strong>Integrity Hash:</strong> {selectedDetail.integrityHash || '—'}</p>
                <p><strong>Decision Time:</strong> {selectedDetail.serverDecisionAt ? new Date(selectedDetail.serverDecisionAt).toLocaleString() : '—'}</p>
                <h4>Ledger Entries</h4>
                <ul>
                  {(selectedDetail.ledgerEntries || []).map((entry) => (
                    <li key={entry.id}>
                      {entry.entrySide} {formatMoney(entry.amount)} ({entry.type}) [{formatMoney(entry.balanceBefore)} → {formatMoney(entry.balanceAfter)}]
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeDetail}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CasinoBetsView;
