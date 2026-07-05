import React, { useCallback, useEffect, useState } from 'react';
import { getAdminOutrights, settleAdminOutright, voidAdminOutright } from '../../api';

const REFRESH_INTERVAL_MS = 30000;

// outrights.price is RAW AMERICAN (450 = +450) — display-only conversion,
// exactly once, same as OutrightsView. Never write a converted value back.
function fmtAmerican(price) {
  const v = Number(price || 0);
  if (!Number.isFinite(v) || v === 0) return '—';
  return v > 0 ? `+${v}` : `${v}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch (_e) {
    return iso;
  }
}

function OutrightsAdminView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionId, setActionId] = useState('');
  // Per-board winner <select> value, keyed by outright id.
  const [winnerPick, setWinnerPick] = useState({});
  // Pending confirmation: { mode: 'settle'|'void', row, winner?, reason? }.
  // Nothing is sent to the server until the modal's confirm button fires.
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async (silent = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const resp = await getAdminOutrights(token);
      setRows(Array.isArray(resp?.outrights) ? resp.outrights : []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load outrights');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => { void load(true); }, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load]);

  const handleSettleConfirmed = async (row, winner) => {
    const token = localStorage.getItem('token');
    if (!token || !winner) return;
    setActionId(`settle-${row.id}`);
    setNotice('');
    setError('');
    try {
      const resp = await settleAdminOutright(row.id, winner, token);
      setNotice(
        `Settled "${row.eventName}" — winner: ${winner}. ` +
        `Graded ${resp?.total ?? 0} bet(s): ${resp?.won ?? 0} won, ${resp?.lost ?? 0} lost.`
      );
      setConfirm(null);
      setWinnerPick((prev) => ({ ...prev, [row.id]: '' }));
      await load(true);
    } catch (err) {
      // Server refusals (typo'd winner, non-admin token) surface here.
      setError(err?.message || 'Failed to settle outright');
      setConfirm(null);
    } finally {
      setActionId('');
    }
  };

  const handleVoidConfirmed = async (row, reason) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActionId(`void-${row.id}`);
    setNotice('');
    setError('');
    try {
      const resp = await voidAdminOutright(row.id, reason || '', token);
      setNotice(`Voided "${row.eventName}" — refunded ${resp?.voided ?? 0} bet(s).`);
      setConfirm(null);
      await load(true);
    } catch (err) {
      setError(err?.message || 'Failed to void outright');
      setConfirm(null);
    } finally {
      setActionId('');
    }
  };

  const openBoards = rows.filter((r) => r.status === 'open');
  const settledBoards = rows.filter((r) => r.status !== 'open');

  return (
    <div className="outrights-admin-wrap" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Outrights / Futures</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Futures have no score feed — an operator marks the winner here after the official result.
            Settling grades every pending futures bet on the board. Prices shown are the stored American odds.
          </div>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {notice && (
        <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
          {notice}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading outrights…</div>
      ) : openBoards.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
          No open futures boards. Boards appear once the outrights sync is on and a season's winner market is active.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {openBoards.map((r) => {
            const pick = winnerPick[r.id] || '';
            const isWorking = actionId.endsWith(r.id);
            return (
              <div
                key={r.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 14,
                  background: '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: '1 1 320px' }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{r.eventName}</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
                      {r.sportKey} · {r.outcomes.length} outcomes · commences {fmtDate(r.commenceTime)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: r.pendingBetCount > 0 ? '#dc2626' : '#64748b' }}>
                      {r.pendingBetCount} pending bet(s)
                    </div>
                  </div>
                </div>

                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#475569' }}>
                    Show outcomes ({r.outcomes.length})
                  </summary>
                  <div style={{ marginTop: 6, fontSize: 12, columns: '3 220px' }}>
                    {r.outcomes.map((o) => (
                      <div key={o.name} style={{ padding: '2px 0', breakInside: 'avoid' }}>
                        {o.name} <span style={{ color: '#64748b' }}>{fmtAmerican(o.price)}</span>
                      </div>
                    ))}
                  </div>
                </details>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Winner comes from a select of the board's outcomes — free
                      text is impossible from this UI; the server validates
                      again regardless. */}
                  <select
                    value={pick}
                    onChange={(e) => setWinnerPick((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    disabled={!!actionId}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', minWidth: 220 }}
                  >
                    <option value="">Select winner…</option>
                    {r.outcomes.map((o) => (
                      <option key={o.name} value={o.name}>
                        {o.name} ({fmtAmerican(o.price)})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setConfirm({ mode: 'settle', row: r, winner: pick })}
                    disabled={!!actionId || pick === ''}
                    style={{
                      padding: '8px 14px', borderRadius: 6, border: '1px solid #15803d',
                      background: isWorking && actionId === `settle-${r.id}` ? '#86efac' : (pick === '' ? '#94a3b8' : '#22c55e'),
                      color: '#fff', fontWeight: 600, cursor: actionId || pick === '' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Settle…
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ mode: 'void', row: r, reason: '' })}
                    disabled={!!actionId}
                    style={{
                      padding: '8px 14px', borderRadius: 6, border: '1px solid #b45309',
                      background: isWorking && actionId === `void-${r.id}` ? '#fcd34d' : '#f59e0b',
                      color: '#fff', fontWeight: 600, cursor: actionId ? 'wait' : 'pointer',
                    }}
                  >
                    Void & refund…
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {settledBoards.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, margin: '0 0 8px' }}>History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {settledBoards.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8,
                  border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', background: '#f8fafc', fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 600 }}>{r.eventName}</span>
                <span>
                  {r.status === 'settled' ? (
                    <>
                      <span style={{ background: '#d4edda', color: '#155724', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, marginRight: 8 }}>SETTLED</span>
                      winner: <strong>{r.winningOutcome || '—'}</strong>
                    </>
                  ) : (
                    <>
                      <span style={{ background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, marginRight: 8 }}>VOIDED</span>
                      {r.voidReason || 'no reason recorded'}
                    </>
                  )}
                  <span style={{ color: '#94a3b8', marginLeft: 8 }}>{fmtDate(r.settledAt)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirmation modal — the final-submit gate. The winner name is
             echoed twice (headline + confirm button label); nothing is sent
             until the confirm button fires. ─────────────────────────────── */}
      {confirm && confirm.mode === 'settle' && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Settle futures board</h3>
            <p style={{ margin: '10px 0 4px', color: '#64748b' }}>{confirm.row.eventName}</p>
            <p style={{ fontSize: 20, fontWeight: 800, margin: '6px 0 14px' }}>
              Winner: {confirm.winner}
            </p>
            <p style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
              This is final. {confirm.row.pendingBetCount} pending bet(s) on this board will be
              graded and money will move via the transactions ledger.
            </p>
            <div className="modal-buttons">
              <button type="button" className="btn-secondary" onClick={() => setConfirm(null)} disabled={!!actionId}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-success"
                disabled={!!actionId}
                onClick={() => handleSettleConfirmed(confirm.row, confirm.winner)}
              >
                {actionId ? 'Settling…' : `Confirm: ${confirm.winner} wins`}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && confirm.mode === 'void' && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Void futures board</h3>
            <p style={{ margin: '10px 0 4px', color: '#64748b' }}>{confirm.row.eventName}</p>
            <p style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
              {confirm.row.pendingBetCount} pending bet(s) will be voided and every stake refunded.
              Use this when the competition is canceled or the market is unresolvable.
            </p>
            <input
              type="text"
              placeholder="Reason (optional, stored for audit)"
              value={confirm.reason || ''}
              onChange={(e) => setConfirm((prev) => ({ ...prev, reason: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', margin: '8px 0 4px', boxSizing: 'border-box' }}
            />
            <div className="modal-buttons">
              <button type="button" className="btn-secondary" onClick={() => setConfirm(null)} disabled={!!actionId}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={!!actionId}
                onClick={() => handleVoidConfirmed(confirm.row, confirm.reason)}
              >
                {actionId ? 'Voiding…' : 'Confirm void + refund all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OutrightsAdminView;
