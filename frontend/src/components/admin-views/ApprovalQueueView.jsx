import React, { useCallback, useEffect, useState } from 'react';
import { getAdminBetApprovals, approveAdminBet, rejectAdminBet } from '../../api';

const REFRESH_INTERVAL_MS = 20000;
const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (iso) => { try { return iso ? new Date(iso).toLocaleString() : ''; } catch { return iso; } };
const fmtAmerican = (a) => (a === null || a === undefined ? '—' : (a > 0 ? `+${a}` : `${a}`));
const REASON_LABEL = { player_flag: 'Player flagged', stake_threshold: 'Stake ≥ threshold', payout_threshold: 'Payout ≥ threshold' };

function betTitle(b) {
  if (b.description) return b.description;
  if (b.type && b.type !== 'straight') return `${String(b.type).toUpperCase()} — ${(b.selections || []).length} legs`;
  return b.selection || 'Bet';
}

export default function ApprovalQueueView() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionId, setActionId] = useState('');
  const [confirm, setConfirm] = useState(null);   // { bet, action: 'approve'|'reject' }
  const [reason, setReason] = useState('');

  const load = useCallback(async (silent = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const resp = await getAdminBetApprovals(token);
      setBets(Array.isArray(resp?.bets) ? resp.bets : []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load approvals');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load]);

  const act = async (bet, action) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActionId(`${action}-${bet.betId}`);
    setNotice(''); setError('');
    try {
      const resp = action === 'approve'
        ? await approveAdminBet(bet.betId, token)
        : await rejectAdminBet(bet.betId, token, reason.trim());
      if (resp?.ok) setNotice(`${action === 'approve' ? 'Approved' : 'Rejected'} ${bet.username || 'player'}'s ${fmtMoney(bet.stake)} bet.`);
      else setError(`Refused: ${resp?.error || 'unknown reason'}`);
      setConfirm(null); setReason('');
      await load(true);
    } catch (err) {
      setError(err?.message || `Failed to ${action}`);
      setConfirm(null);
    } finally { setActionId(''); }
  };

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Bet Approval Queue</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Flagged wagers awaiting review. The stake is already held. <strong>Approve books the
            submit-time (frozen) odds</strong> — the live line shown is advisory only.
          </div>
        </div>
        <button type="button" onClick={() => load()} disabled={loading}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {notice && <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>{notice}</div>}
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading…</div>
      ) : bets.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#16a34a', background: '#f0fdf4', borderRadius: 8 }}>✓ No bets awaiting approval.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bets.map((b) => {
            const cur = b.current || null;
            const moved = cur && cur.available && cur.anyMoved;
            const unavailable = cur && !cur.available;
            return (
              <div key={b.betId} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#fff' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: '1 1 300px', fontSize: 13 }}>
                    <strong>{betTitle(b)}</strong>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
                      {b.username || '(unknown)'}{b.isFreeplay ? ' · freeplay' : ''} · risk {fmtMoney(b.stake)} → pays {fmtMoney(b.potentialPayout)} · {fmtDate(b.submittedAt)}
                    </div>
                    <div style={{ marginTop: 5, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, background: '#eef2ff', color: '#3730a3', padding: '2px 8px', borderRadius: 12 }}>
                        {REASON_LABEL[b.approvalReason] || b.approvalReason || 'flagged'}
                      </span>
                      <span style={{ fontSize: 12, color: '#334155' }}>
                        Booked <strong>{fmtAmerican(cur?.submitCombinedAmerican)}</strong>
                      </span>
                      {moved && (
                        <span style={{ fontSize: 12, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 12 }}>
                          line moved → now {fmtAmerican(cur.currentCombinedAmerican)} (advisory)
                        </span>
                      )}
                      {unavailable && (
                        <span style={{ fontSize: 12, color: '#991b1b', background: '#fee2e2', padding: '2px 8px', borderRadius: 12 }}>
                          line no longer offered (advisory)
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <button type="button" onClick={() => setConfirm({ bet: b, action: 'approve' })} disabled={!!actionId}
                      style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #15803d', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 12, cursor: actionId ? 'wait' : 'pointer' }}>
                      Approve
                    </button>
                    <button type="button" onClick={() => { setReason(''); setConfirm({ bet: b, action: 'reject' }); }} disabled={!!actionId}
                      style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #b91c1c', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 12, cursor: actionId ? 'wait' : 'pointer' }}>
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{confirm.action === 'approve' ? 'Approve bet' : 'Reject bet'}</h3>
            <p style={{ fontSize: 16, fontWeight: 700, margin: '4px 0' }}>{betTitle(confirm.bet)}</p>
            <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 10px' }}>
              {confirm.bet.username || 'player'} · risk {fmtMoney(confirm.bet.stake)} → pays {fmtMoney(confirm.bet.potentialPayout)}
            </p>
            {confirm.action === 'approve' ? (
              <p style={{ color: '#166534', fontWeight: 600, fontSize: 13 }}>
                Books at the <strong>submit-time (frozen)</strong> odds {fmtAmerican(confirm.bet.current?.submitCombinedAmerican)}. The stake is already held; the bet goes live and settles normally. The live line, if shown, is advisory and is NOT booked.
              </p>
            ) : (
              <>
                <p style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
                  The {fmtMoney(confirm.bet.stake)} stake is refunded to the player{confirm.bet.isFreeplay ? ' (freeplay returned to the freeplay pool)' : ''}.
                </p>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 6 }} />
              </>
            )}
            <div className="modal-buttons">
              <button type="button" className="btn-secondary" onClick={() => setConfirm(null)} disabled={!!actionId}>Cancel</button>
              <button type="button" className={confirm.action === 'reject' ? 'btn-danger' : 'btn-success'} disabled={!!actionId}
                onClick={() => act(confirm.bet, confirm.action)}>
                {actionId ? 'Working…' : (confirm.action === 'approve' ? 'Confirm approve' : 'Confirm reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
