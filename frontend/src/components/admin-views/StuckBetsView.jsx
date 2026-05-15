import React, { useCallback, useEffect, useState } from 'react';
import { getStuckBetsInbox, settleMatchBets, deleteAdminBet } from '../../api';

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

function StuckBetsView() {
  const [hours, setHours] = useState(6);
  const [data, setData] = useState({ matches: [], matchCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (silent = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const resp = await getStuckBetsInbox(token, hours);
      setData(resp || { matches: [] });
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load stuck bets');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    void load();
    const t = setInterval(() => { void load(true); }, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load]);

  const handleGrade = async (match, winnerSide) => {
    const team = winnerSide === 'home' ? match.homeTeam : match.awayTeam;
    if (!team) {
      setError('Missing team name on match — cannot grade.');
      return;
    }
    if (!window.confirm(
      `Grade match as: ${team} wins?\n\n` +
      `${match.homeTeam} vs ${match.awayTeam}\n` +
      `${match.betCount} bet(s), ${fmtMoney(match.totalRisk)} total risk.\n\n` +
      `This is final. Money will move via the transactions ledger.`
    )) return;

    const token = localStorage.getItem('token');
    if (!token) return;
    setActionId(`grade-${match.matchId}`);
    setNotice('');
    setError('');
    try {
      await settleMatchBets({ matchId: match.matchId, winner: team }, token);
      setNotice(`Settled ${match.homeTeam} vs ${match.awayTeam} — winner: ${team}.`);
      await load(true);
    } catch (err) {
      setError(err?.message || 'Failed to settle match');
    } finally {
      setActionId('');
    }
  };

  const handleVoid = async (match) => {
    if (!window.confirm(
      `Void ${match.betCount} bet(s) on ${match.homeTeam} vs ${match.awayTeam}?\n\n` +
      `Each player gets their stake refunded (${fmtMoney(match.totalRisk)} total).\n` +
      `Use this when the game's outcome is genuinely unknown.`
    )) return;

    const token = localStorage.getItem('token');
    if (!token) return;
    setActionId(`void-${match.matchId}`);
    setNotice('');
    setError('');
    try {
      let voided = 0;
      const errors = [];
      for (const bet of (match.bets || [])) {
        try {
          await deleteAdminBet(bet.betId, token);
          voided++;
        } catch (e) {
          errors.push(`${bet.username || bet.betId}: ${e?.message || 'failed'}`);
        }
      }
      if (errors.length === 0) {
        setNotice(`Voided ${voided} bet(s) on ${match.homeTeam} vs ${match.awayTeam}.`);
      } else {
        setError(`Voided ${voided} of ${match.bets?.length || 0}. Errors: ${errors.join('; ')}`);
      }
      await load(true);
    } catch (err) {
      setError(err?.message || 'Failed to void bets');
    } finally {
      setActionId('');
    }
  };

  return (
    <div className="stuck-bets-wrap" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Stuck Bets Inbox</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Pending tickets older than {data.hours || hours}h that the auto-settle paths refused to grade.
            One decision settles every player on the match.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: '#475569' }}>Threshold:</label>
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          >
            <option value={2}>2 hours</option>
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
          </select>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
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
        <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading stuck bets…</div>
      ) : data.matches.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#16a34a', background: '#f0fdf4', borderRadius: 8 }}>
          ✓ Nothing stuck. Every pending ticket is on a match the auto-settle paths can still grade.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.matches.map((m) => {
            const hasScore = (m.scoreHome !== null && m.scoreAway !== null);
            const scoreStr = hasScore ? `${m.scoreHome} – ${m.scoreAway}` : 'no score recorded';
            const blockingReason = !hasScore
              ? 'Feed never recorded a score'
              : (m.effectiveStatus === 'expired'
                ? 'Match expired (feed went quiet)'
                : (!m.looksProvablyFinished ? 'Heuristic could not confirm finish' : ''));
            const isWorking = actionId.endsWith(m.matchId);
            return (
              <div
                key={m.matchId}
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
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {m.homeTeam} <span style={{ color: '#94a3b8' }}>vs</span> {m.awayTeam}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
                      {m.sport || 'unknown sport'} · started {m.ageHours}h ago · {fmtDate(m.startTime)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>
                      Score: <strong>{scoreStr}</strong>
                      {' · '}
                      raw: <code>{m.rawStatus || '(none)'}</code>
                      {' · '}
                      effective: <code>{m.effectiveStatus}</code>
                    </div>
                    {blockingReason && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#b91c1c' }}>
                        Why it's stuck: {blockingReason}
                      </div>
                    )}
                    {!m.h2hOnly && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#a16207', background: '#fef3c7', padding: '3px 6px', borderRadius: 4, display: 'inline-block' }}>
                        Note: has non-H2H legs ({(m.marketTypes || []).join(', ')}). Manual grade applies to H2H only — spreads/totals need a real score to grade.
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtMoney(m.totalRisk)} at risk</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{m.betCount} bet(s)</div>
                  </div>
                </div>

                {(m.bets || []).length > 0 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 12, color: '#475569' }}>
                      Show affected players ({(m.bets || []).length})
                    </summary>
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      {(m.bets || []).map((b) => (
                        <div key={b.betId} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed #e2e8f0' }}>
                          <span>{b.username || '(unknown)'} <span style={{ color: '#94a3b8' }}>({b.type})</span></span>
                          <span style={{ color: '#dc2626' }}>{fmtMoney(b.risk)} risk</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleGrade(m, 'home')}
                    disabled={!!actionId || !m.homeTeam}
                    style={{
                      padding: '8px 14px', borderRadius: 6, border: '1px solid #15803d',
                      background: isWorking && actionId === `grade-${m.matchId}` ? '#86efac' : '#22c55e',
                      color: '#fff', fontWeight: 600, cursor: actionId ? 'wait' : 'pointer',
                    }}
                  >
                    {m.homeTeam} wins
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGrade(m, 'away')}
                    disabled={!!actionId || !m.awayTeam}
                    style={{
                      padding: '8px 14px', borderRadius: 6, border: '1px solid #1d4ed8',
                      background: '#3b82f6', color: '#fff', fontWeight: 600,
                      cursor: actionId ? 'wait' : 'pointer',
                    }}
                  >
                    {m.awayTeam} wins
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVoid(m)}
                    disabled={!!actionId}
                    style={{
                      padding: '8px 14px', borderRadius: 6, border: '1px solid #b45309',
                      background: isWorking && actionId === `void-${m.matchId}` ? '#fcd34d' : '#f59e0b',
                      color: '#fff', fontWeight: 600,
                      cursor: actionId ? 'wait' : 'pointer',
                    }}
                  >
                    Void & refund
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StuckBetsView;
