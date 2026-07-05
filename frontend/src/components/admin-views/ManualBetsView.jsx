import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAdminManualBets, gradeAdminManualBet, getUsersAdmin, placeAdminManualBet } from '../../api';
import { americanToDecimal } from '../../utils/odds';

const REFRESH_INTERVAL_MS = 30000;
const MIN_ABS_AMERICAN = 100;
const MAX_ABS_AMERICAN = 50000;

function fmtMoney(n) {
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
}

function fmtAmerican(n) {
  const v = Number(n || 0);
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

// Fresh idempotency key per CONFIRMED placement intent — generated when the
// confirm modal opens and reused for every retry/double-click of that same
// confirm, so the server's betrequests dedup replays instead of re-booking.
function newRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `manual_${crypto.randomUUID()}`;
  }
  return `manual_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

// Mirror of ManualBetService::payoutFor — whole-dollar payout. PREVIEW ONLY:
// the server recomputes and its response is what the success state displays.
function previewPayout(stake, american) {
  const decimal = americanToDecimal(american);
  if (!decimal || decimal <= 1) return 0;
  return Math.round(stake * decimal);
}

function parseAmericanInput(raw) {
  const trimmed = String(raw || '').trim().replace(/^\+/, '');
  if (trimmed === '' || !/^-?\d+$/.test(trimmed)) return null;
  const n = parseInt(trimmed, 10);
  if (Math.abs(n) < MIN_ABS_AMERICAN || Math.abs(n) > MAX_ABS_AMERICAN) return null;
  return n;
}

function ManualBetsView() {
  const [tab, setTab] = useState('place');

  // ── Place tab state ────────────────────────────────────────────────────────
  const [playerQuery, setPlayerQuery] = useState('');
  const [playerResults, setPlayerResults] = useState([]);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [player, setPlayer] = useState(null); // {id, username}
  const [description, setDescription] = useState('');
  const [oddsInput, setOddsInput] = useState('');
  const [stakeInput, setStakeInput] = useState('');
  const [placing, setPlacing] = useState(false);
  // {requestId, userId, username, description, oddsAmerican, stake, payout, toWin}
  const [placeConfirm, setPlaceConfirm] = useState(null);
  const [placedResult, setPlacedResult] = useState(null); // server response — authoritative
  const [placeError, setPlaceError] = useState('');
  const searchTimer = useRef(null);
  // requestId is keyed to the PAYLOAD, not the click: retries of the same bet
  // (double-click, network error, timeout) reuse the same id so the server
  // replays instead of re-booking; changing the payload or a success mints a
  // fresh one. This is what makes a lost-response retry double-book-proof.
  const requestIdRef = useRef(null);
  const payloadKeyRef = useRef('');

  // ── Inbox tab state ────────────────────────────────────────────────────────
  const [inbox, setInbox] = useState({ bets: [], betCount: 0 });
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionId, setActionId] = useState('');
  const [gradeConfirm, setGradeConfirm] = useState(null); // {bet, decision}

  const loadInbox = useCallback(async (silent = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!silent) setInboxLoading(true);
    try {
      const resp = await getAdminManualBets(token);
      setInbox({ bets: Array.isArray(resp?.bets) ? resp.bets : [], betCount: Number(resp?.betCount || 0) });
      setInboxError('');
    } catch (err) {
      setInboxError(err?.message || 'Failed to load manual bets');
    } finally {
      if (!silent) setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox();
    const t = setInterval(() => { void loadInbox(true); }, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [loadInbox]);

  // Debounced player search by username within the admin's visibility.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = playerQuery.trim();
    if (q.length < 2 || (player && q === player.username)) {
      setPlayerResults([]);
      return undefined;
    }
    searchTimer.current = setTimeout(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const resp = await getUsersAdmin(token, { q });
        const list = Array.isArray(resp) ? resp : (Array.isArray(resp?.users) ? resp.users : []);
        setPlayerResults(list.slice(0, 12));
        setPlayerOpen(true);
      } catch (_e) {
        setPlayerResults([]);
      }
    }, 250);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [playerQuery, player]);

  const american = parseAmericanInput(oddsInput);
  const stake = Number.isFinite(parseFloat(stakeInput)) ? Math.round(parseFloat(stakeInput) * 100) / 100 : null;
  const descriptionTrimmed = description.trim();
  const payout = american !== null && stake !== null && stake >= 1 ? previewPayout(stake, american) : 0;
  const toWin = payout > 0 && stake !== null ? payout - stake : 0;

  const formIssue = useMemo(() => {
    if (!player) return 'Pick a player.';
    if (descriptionTrimmed === '') return 'Describe the bet (market, event, price source).';
    if (descriptionTrimmed.length > 500) return 'Description is limited to 500 characters.';
    if (american === null) return `Odds must be whole American, ±${MIN_ABS_AMERICAN} to ±${MAX_ABS_AMERICAN} (e.g. -110, +150).`;
    if (stake === null || stake < 1) return 'Stake must be at least $1.';
    return null;
  }, [player, descriptionTrimmed, american, stake]);

  const openPlaceConfirm = () => {
    if (formIssue) return;
    const payloadKey = JSON.stringify([player.id, descriptionTrimmed, american, stake]);
    if (payloadKey !== payloadKeyRef.current || !requestIdRef.current) {
      requestIdRef.current = newRequestId();
      payloadKeyRef.current = payloadKey;
    }
    setPlaceError('');
    setPlacedResult(null);
    setPlaceConfirm({
      requestId: requestIdRef.current,
      userId: player.id,
      username: player.username,
      description: descriptionTrimmed,
      oddsAmerican: american,
      stake,
      payout,
      toWin,
    });
  };

  const handlePlaceConfirmed = async () => {
    if (!placeConfirm || placing) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setPlacing(true);
    setPlaceError('');
    try {
      const resp = await placeAdminManualBet({
        userId: placeConfirm.userId,
        description: placeConfirm.description,
        oddsAmerican: placeConfirm.oddsAmerican,
        stake: placeConfirm.stake,
        requestId: placeConfirm.requestId,
      }, token);
      // Server response is AUTHORITATIVE — its payout/toWin are displayed,
      // not the client preview.
      setPlacedResult({ ...resp, username: placeConfirm.username });
      setPlaceConfirm(null);
      setDescription('');
      setOddsInput('');
      setStakeInput('');
      setPlayer(null);
      setPlayerQuery('');
      // Booked — retire this requestId so a deliberate identical re-book
      // later gets a fresh one (otherwise it would replay, not book).
      requestIdRef.current = null;
      payloadKeyRef.current = '';
      void loadInbox(true);
    } catch (err) {
      // Keep the modal open with the SAME requestId — if the request actually
      // landed and only the response was lost, retrying re-sends the same id
      // and the server replays the booked bet instead of booking a second.
      setPlaceError(err?.message || 'Failed to place manual bet');
    } finally {
      setPlacing(false);
    }
  };

  const handleGradeConfirmed = async (bet, decision) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActionId(`grade-${bet.betId}`);
    setNotice('');
    setInboxError('');
    try {
      const resp = await gradeAdminManualBet(bet.betId, decision, token);
      if (resp?.ok) {
        setNotice(`Graded "${bet.description}" (${bet.username || 'player'}) as ${decision.toUpperCase()}.`);
      } else {
        setInboxError(`Refused: ${resp?.error || 'unknown reason'}`);
      }
      setGradeConfirm(null);
      await loadInbox(true);
    } catch (err) {
      setInboxError(err?.message || 'Failed to grade manual bet');
      setGradeConfirm(null);
    } finally {
      setActionId('');
    }
  };

  const decisionColors = {
    won:  { border: '#15803d', bg: '#22c55e' },
    lost: { border: '#b91c1c', bg: '#ef4444' },
    void: { border: '#475569', bg: '#64748b' },
  };

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <div className="manual-bets-wrap" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Manual Bets — Write-ins</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Book a custom bet on a player's account for a market we don't carry. It holds the stake
            like any pending bet and NEVER auto-grades — settle it from the inbox when the result is known.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['place', 'Place Bet'], ['inbox', `Grading Inbox${inbox.betCount > 0 ? ` (${inbox.betCount})` : ''}`]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                padding: '8px 14px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                border: `1px solid ${tab === id ? '#0f172a' : '#cbd5e1'}`,
                background: tab === id ? '#0f172a' : '#fff',
                color: tab === id ? '#fff' : '#0f172a',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'place' && (
        <div style={{ maxWidth: 560 }}>
          {placedResult && (
            <div style={{ background: '#dcfce7', color: '#166534', padding: '10px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
              {placedResult.idempotentReplay
                ? 'Already booked (duplicate click caught by the server — no second bet was placed).'
                : 'Manual bet booked.'}
              {' '}
              <strong>{placedResult.username}</strong> — risk {fmtMoney(placedResult.riskAmount)} → pays{' '}
              <strong>{fmtMoney(placedResult.potentialPayout)}</strong> (to win {fmtMoney(placedResult.toWin)}).
              {placedResult.balance !== null && placedResult.balance !== undefined
                && ` New balance ${fmtMoney(placedResult.balance)}, pending ${fmtMoney(placedResult.pendingBalance)}.`}
            </div>
          )}
          {placeError && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
              {placeError}
            </div>
          )}

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#fff', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Player</label>
              {player ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '6px 10px', background: '#eef2ff', color: '#4338ca', borderRadius: 6, fontWeight: 700, fontSize: 14 }}>
                    {player.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setPlayer(null); setPlayerQuery(''); }}
                    style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}
                  >
                    change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={playerQuery}
                    onChange={(e) => setPlayerQuery(e.target.value)}
                    onFocus={() => playerResults.length > 0 && setPlayerOpen(true)}
                    onBlur={() => setTimeout(() => setPlayerOpen(false), 150)}
                    placeholder="Search username…"
                    style={inputStyle}
                  />
                  {playerOpen && playerResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 2, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                      {playerResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setPlayer({ id: u.id, username: u.username }); setPlayerQuery(u.username || ''); setPlayerOpen(false); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14 }}
                        >
                          <strong>{u.username}</strong>
                          {(u.firstName || u.lastName) && (
                            <span style={{ color: '#64748b', fontSize: 12 }}> — {[u.firstName, u.lastName].filter(Boolean).join(' ')}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label style={labelStyle}>Bet description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder='e.g. "Tiger Woods to win the Masters outright — player phoned in, price from Vegas board"'
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, textAlign: 'right' }}>{description.length}/500</div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 140px' }}>
                <label style={labelStyle}>American odds</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={oddsInput}
                  onChange={(e) => setOddsInput(e.target.value)}
                  placeholder="-110 or +150"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label style={labelStyle}>Stake ($)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stakeInput}
                  onChange={(e) => setStakeInput(e.target.value)}
                  placeholder="100"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 6, padding: '10px 12px' }}>
              <div style={{ fontSize: 13, color: '#475569' }}>
                To win <span style={{ fontSize: 11, color: '#94a3b8' }}>(estimate — server confirms)</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: toWin > 0 ? '#16a34a' : '#94a3b8' }}>
                {toWin > 0 ? fmtMoney(toWin) : '—'}
              </div>
            </div>

            {formIssue && (
              <div style={{ fontSize: 12, color: '#a16207' }}>{formIssue}</div>
            )}
            <button
              type="button"
              className="btn-success"
              disabled={!!formIssue || placing}
              onClick={openPlaceConfirm}
              style={{ padding: '10px 16px', fontSize: 14, opacity: formIssue ? 0.5 : 1, cursor: formIssue ? 'not-allowed' : 'pointer' }}
            >
              Review &amp; Place…
            </button>
          </div>
        </div>
      )}

      {tab === 'inbox' && (
        <>
          {notice && (
            <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
              {notice}
            </div>
          )}
          {inboxError && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
              {inboxError}
            </div>
          )}
          {inboxLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading manual bets…</div>
          ) : inbox.bets.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#16a34a', background: '#f0fdf4', borderRadius: 8 }}>
              ✓ No pending manual bets.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inbox.bets.map((b) => (
                <div
                  key={b.betId}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                >
                  <div style={{ flex: '1 1 300px', fontSize: 13 }}>
                    <strong>{b.description}</strong>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
                      {b.username || '(unknown player)'} · {fmtAmerican(b.oddsAmerican)} · risk {fmtMoney(b.riskAmount)} → pays {fmtMoney(b.potentialPayout)}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                      written in by {b.enteredByUsername || 'admin'} · {fmtDate(b.placedAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['won', 'lost', 'void'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setGradeConfirm({ bet: b, decision: d })}
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
          )}
        </>
      )}

      {/* Placement confirm — player, description, odds, stake, computed payout
          echoed back; nothing is sent until Confirm fires. */}
      {placeConfirm && (
        <div className="modal-overlay" onClick={() => !placing && setPlaceConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Place manual bet</h3>
            <p style={{ margin: '10px 0 4px', color: '#64748b' }}>
              Player: <strong style={{ color: '#0f172a' }}>{placeConfirm.username}</strong>
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, margin: '4px 0', whiteSpace: 'pre-wrap' }}>{placeConfirm.description}</p>
            <p style={{ fontSize: 14, color: '#475569', margin: '8px 0' }}>
              Odds <strong>{fmtAmerican(placeConfirm.oddsAmerican)}</strong> · Stake{' '}
              <strong style={{ color: '#dc2626' }}>{fmtMoney(placeConfirm.stake)}</strong> · To win{' '}
              <strong style={{ color: '#16a34a' }}>{fmtMoney(placeConfirm.toWin)}</strong>{' '}
              (pays {fmtMoney(placeConfirm.payout)})
            </p>
            <p style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
              This immediately holds {fmtMoney(placeConfirm.stake)} of the player's available balance,
              exactly like a bet they placed themselves. Check the odds — a typo here is real money.
            </p>
            {placeError && (
              <p style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 10px', borderRadius: 6, fontSize: 13, margin: '8px 0' }}>
                {placeError} — retrying is safe: the same request id is reused, so a bet that already
                landed is replayed, not booked twice.
              </p>
            )}
            <div className="modal-buttons">
              <button type="button" className="btn-secondary" onClick={() => setPlaceConfirm(null)} disabled={placing}>
                Cancel
              </button>
              <button type="button" className="btn-success" disabled={placing} onClick={handlePlaceConfirmed}>
                {placing ? 'Placing…' : `Confirm: risk ${fmtMoney(placeConfirm.stake)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grading confirm — decision, description, player, and the exact money
          movement echoed back before anything is sent. */}
      {gradeConfirm && (
        <div className="modal-overlay" onClick={() => setGradeConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Grade manual bet</h3>
            <p style={{ fontSize: 15, fontWeight: 700, margin: '10px 0 4px', whiteSpace: 'pre-wrap' }}>{gradeConfirm.bet.description}</p>
            <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 10px' }}>
              {gradeConfirm.bet.username || 'player'} · {fmtAmerican(gradeConfirm.bet.oddsAmerican)} · risk{' '}
              {fmtMoney(gradeConfirm.bet.riskAmount)} → pays {fmtMoney(gradeConfirm.bet.potentialPayout)}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, margin: '6px 0 14px', textTransform: 'uppercase' }}>
              Decision: {gradeConfirm.decision}
            </p>
            <p style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
              This is final. Money moves via the transactions ledger
              {gradeConfirm.decision === 'won' && ` — the player is credited ${fmtMoney(gradeConfirm.bet.potentialPayout)}.`}
              {gradeConfirm.decision === 'void' && ` — the ${fmtMoney(gradeConfirm.bet.riskAmount)} stake is refunded to the player.`}
              {gradeConfirm.decision === 'lost' && ` — the player's ${fmtMoney(gradeConfirm.bet.riskAmount)} stake is lost.`}
            </p>
            <div className="modal-buttons">
              <button type="button" className="btn-secondary" onClick={() => setGradeConfirm(null)} disabled={!!actionId}>
                Cancel
              </button>
              <button
                type="button"
                className={gradeConfirm.decision === 'lost' ? 'btn-danger' : 'btn-success'}
                disabled={!!actionId}
                onClick={() => handleGradeConfirmed(gradeConfirm.bet, gradeConfirm.decision)}
              >
                {actionId ? 'Grading…' : `Confirm: ${gradeConfirm.decision.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManualBetsView;
