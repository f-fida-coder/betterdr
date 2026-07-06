import React, { useCallback, useEffect, useState } from 'react';
import { getAdminCardBets, gradeAdminCardBet } from '../../api';

const REFRESH_INTERVAL_MS = 30000;

function fmtMoney(n) {
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch (_e) {
    return iso;
  }
}

function marketLabel(marketType) {
  const mt = String(marketType || '').toLowerCase();
  if (mt === 'alternate_totals_cards') return 'Total Cards';
  if (mt === 'alternate_spreads_cards') return 'Card Handicap';
  if (mt === 'alternate_totals_corners') return 'Total Corners';
  if (mt === 'alternate_spreads_corners') return 'Corner Handicap';
  return mt;
}

function legText(bet) {
  const pt = bet.point !== null && bet.point !== undefined ? ` ${bet.point > 0 && String(bet.selection).toLowerCase() !== 'over' && String(bet.selection).toLowerCase() !== 'under' ? '+' : ''}${bet.point}` : '';
  return `${bet.selection}${pt} — ${marketLabel(bet.marketType)}`;
}

function CardBetsView() {
  const [data, setData] = useState({ matches: [], betCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionId, setActionId] = useState('');
  // Pending confirmation: { bet, match, decision }. Nothing is sent until
  // the modal's confirm button fires — same gate pattern as OutrightsAdminView.
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async (silent = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const resp = await getAdminCardBets(token);
      setData({ matches: Array.isArray(resp?.matches) ? resp.matches : [], betCount: Number(resp?.betCount || 0) });
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load card bets');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => { void load(true); }, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load]);

  const handleGradeConfirmed = async (bet, decision) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActionId(`grade-${bet.betId}`);
    setNotice('');
    setError('');
    try {
      const resp = await gradeAdminCardBet(bet.betId, decision, token);
      if (resp?.ok) {
        setNotice(`Graded ${legText(bet)} (${bet.username || 'player'}) as ${decision.toUpperCase()}.`);
      } else {
        setError(`Refused: ${resp?.error || 'unknown reason'}`);
      }
      setConfirm(null);
      await load(true);
    } catch (err) {
      setError(err?.message || 'Failed to grade card bet');
      setConfirm(null);
    } finally {
      setActionId('');
    }
  };

  const decisionColors = {
    won:  { border: '#15803d', bg: '#22c55e' },
    lost: { border: '#b91c1c', bg: '#ef4444' },
    void: { border: '#475569', bg: '#64748b' },
  };

  return (
    <div className="card-bets-wrap" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Card &amp; Corner Bets — Manual Grading</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Card and corner markets have NO automatic results source — grade each bet from the
            official match report (league site / FA). The final score shown is context only:
            goals are not cards or corners.
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
        <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading card bets…</div>
      ) : data.matches.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#16a34a', background: '#f0fdf4', borderRadius: 8 }}>
          ✓ No pending card bets.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.matches.map((m) => {
            const finished = String(m.matchStatus).toLowerCase() === 'finished';
            return (
              <div
                key={m.matchId}
                style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              >
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {m.homeTeam} <span style={{ color: '#94a3b8' }}>vs</span> {m.awayTeam}
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
                  {fmtDate(m.startTime)} · status: {m.matchStatus || 'unknown'}
                  {finished && ` · final score ${m.scoreHome}–${m.scoreAway} (context only — grade from the official CARD/CORNER count)`}
                </div>
                {!finished && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#a16207', background: '#fef3c7', padding: '3px 6px', borderRadius: 4, display: 'inline-block' }}>
                    Match not finished — grade only after the final whistle.
                  </div>
                )}

                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(m.bets || []).map((b) => (
                    <div
                      key={b.betId}
                      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px dashed #e2e8f0', paddingTop: 8 }}
                    >
                      <div style={{ flex: '1 1 280px', fontSize: 13 }}>
                        <strong>{legText(b)}</strong>
                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                          {b.username || '(unknown player)'}{b.isFreeplay ? ' · freeplay' : ''} · risk {fmtMoney(b.riskAmount)} → pays {fmtMoney(b.potentialPayout)} · placed {fmtDate(b.placedAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['won', 'lost', 'void'].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setConfirm({ bet: b, match: m, decision: d })}
                            disabled={!!actionId}
                            style={{
                              padding: '7px 12px', borderRadius: 6,
                              border: `1px solid ${decisionColors[d].border}`,
                              background: decisionColors[d].bg,
                              color: '#fff', fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                              cursor: actionId ? 'wait' : 'pointer',
                            }}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation modal — the decision, the leg, the player, and the money
          echoed back before anything is sent. */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Grade card bet</h3>
            <p style={{ margin: '10px 0 4px', color: '#64748b' }}>
              {confirm.match.homeTeam} vs {confirm.match.awayTeam}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, margin: '4px 0' }}>{legText(confirm.bet)}</p>
            <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 10px' }}>
              {confirm.bet.username || 'player'} · risk {fmtMoney(confirm.bet.riskAmount)} → pays {fmtMoney(confirm.bet.potentialPayout)}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, margin: '6px 0 14px', textTransform: 'uppercase' }}>
              Decision: {confirm.decision}
            </p>
            <p style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
              This is final. Money moves via the transactions ledger
              {confirm.decision === 'won' && ` — the player is credited ${fmtMoney(confirm.bet.potentialPayout)}.`}
              {confirm.decision === 'void' && ` — the ${fmtMoney(confirm.bet.riskAmount)} stake is refunded to the player.`}
              {confirm.decision === 'lost' && ` — the player's ${fmtMoney(confirm.bet.riskAmount)} stake is lost.`}
            </p>
            <div className="modal-buttons">
              <button type="button" className="btn-secondary" onClick={() => setConfirm(null)} disabled={!!actionId}>
                Cancel
              </button>
              <button
                type="button"
                className={confirm.decision === 'lost' ? 'btn-danger' : 'btn-success'}
                disabled={!!actionId}
                onClick={() => handleGradeConfirmed(confirm.bet, confirm.decision)}
              >
                {actionId ? 'Grading…' : `Confirm: ${confirm.decision.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardBetsView;
