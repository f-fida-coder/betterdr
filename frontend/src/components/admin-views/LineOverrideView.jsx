import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getMatches, getAdminMatchLines, setAdminLineOverride, releaseAdminLineOverride } from '../../api';

// American display / parse — the admin prices in American (the pricing unit).
const fmtAm = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '—';
  return n > 0 ? `+${n}` : `${n}`;
};
const parseAm = (s) => {
  const n = parseInt(String(s).replace(/[^0-9+-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};
const fmtPoint = (v) => (v === null || v === undefined || v === '' ? '—' : (Number(v) > 0 ? `+${v}` : `${v}`));
const fmtDate = (iso) => { try { return iso ? new Date(iso).toLocaleString() : ''; } catch { return iso || ''; } };

// Build the per-market draft from the loaded lines (pre-fill with the active
// override when present, else the current feed value).
function draftFromMarket(mkt) {
  const bySide = {};
  for (const o of mkt.outcomes) bySide[o.side] = o;
  const priceOf = (o) => (o.overridden ? o.overrideAmerican : o.feedAmerican);
  const pointOf = (o) => (o.overridden ? o.overridePoint : o.feedPoint);
  const prices = {};
  for (const o of mkt.outcomes) prices[o.side] = priceOf(o) ?? '';
  // Point is entered once: totals share the number; spreads use the home line
  // (away mirrors), so anchor the draft point on the home/over outcome.
  let point = '';
  if (mkt.market === 'totals') point = pointOf(bySide.over ?? mkt.outcomes[0]) ?? '';
  else if (mkt.market === 'spreads') point = pointOf(bySide.home ?? mkt.outcomes[0]) ?? '';
  return { point: point === null ? '' : String(point), prices: Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, v === '' ? '' : String(v)])) };
}

// Turn a market's draft into the entries payload the backend expects. Spread
// mirrors the point (home -X ↔ away +X); total shares it; moneyline has none.
// Both sides always sent — prices are independent (asymmetric juice allowed).
function entriesFromDraft(mkt, draft) {
  const bySide = {};
  for (const o of mkt.outcomes) bySide[o.side] = o;
  const pt = draft.point === '' ? null : Number(draft.point);
  const row = (o, point) => ({ name: o.name, side: o.side, ...(point === null ? {} : { point }), price: parseAm(draft.prices[o.side]) });
  if (mkt.market === 'h2h') return mkt.outcomes.map((o) => row(o, null));
  if (mkt.market === 'totals') return mkt.outcomes.map((o) => row(o, pt));
  // spreads: home = pt, away = -pt
  const out = [];
  if (bySide.home) out.push(row(bySide.home, pt));
  if (bySide.away) out.push(row(bySide.away, pt === null ? null : -pt));
  return out;
}

function LineOverrideView() {
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);   // { id, homeTeam, awayTeam }
  const [lines, setLines] = useState(null);          // { match, markets }
  const [drafts, setDrafts] = useState({});          // { [market]: draft }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyMarket, setBusyMarket] = useState('');
  const [confirm, setConfirm] = useState(null);       // { market, mkt, entries } | { release, market }

  // Match picker uses the public board (light, sport-filterable). The admin
  // filters by team; the override state is loaded per-match on select.
  useEffect(() => {
    getMatches('').then((data) => {
      setMatches(Array.isArray(data?.matches) ? data.matches : (Array.isArray(data) ? data : []));
    }).catch(() => setMatches([]));
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = matches.filter((m) => !q
      || `${m.homeTeam || ''} ${m.awayTeam || ''}`.toLowerCase().includes(q));
    return list.slice(0, 40);
  }, [matches, filter]);

  const loadLines = useCallback(async (matchId) => {
    const token = localStorage.getItem('token');
    setLoading(true); setError(''); setNotice('');
    try {
      const resp = await getAdminMatchLines(matchId, token);
      setLines(resp);
      const d = {};
      for (const mkt of (resp?.markets || [])) d[mkt.market] = draftFromMarket(mkt);
      setDrafts(d);
    } catch (err) {
      setError(err?.message || 'Failed to load match lines');
      setLines(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const pick = (m) => { setSelected(m); void loadLines(m.id); };

  const setDraftPrice = (market, side, val) => setDrafts((prev) => ({
    ...prev, [market]: { ...prev[market], prices: { ...prev[market].prices, [side]: val } },
  }));
  const setDraftPoint = (market, val) => setDrafts((prev) => ({
    ...prev, [market]: { ...prev[market], point: val },
  }));

  const commit = async () => {
    const token = localStorage.getItem('token');
    if (!confirm || !selected) return;
    setBusyMarket(confirm.market); setError(''); setNotice('');
    try {
      if (confirm.release) {
        await releaseAdminLineOverride(selected.id, confirm.market, token);
        setNotice(`Released ${confirm.market} — restored to feed.`);
      } else {
        await setAdminLineOverride(selected.id, confirm.market, confirm.entries, token);
        setNotice(`Override set on ${confirm.market}.`);
      }
      setConfirm(null);
      await loadLines(selected.id);
    } catch (err) {
      setError(err?.message || 'Action failed');
      setConfirm(null);
    } finally {
      setBusyMarket('');
    }
  };

  // Guard: every side must have a valid American price (and a point for
  // spread/total) before the confirm step opens.
  const draftValid = (mkt, draft) => {
    if (mkt.market !== 'h2h' && (draft.point === '' || !Number.isFinite(Number(draft.point)))) return false;
    return mkt.outcomes.every((o) => parseAm(draft.prices[o.side]) !== null);
  };

  const sideLabel = (mkt, o) => {
    if (mkt.market === 'totals') return o.side === 'under' ? 'Under' : 'Over';
    return o.name;
  };

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Line Override</h2>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          Manually set a moneyline / spread / total on a match (e.g. off Vegas). The override displays and is
          bettable at your number, survives feed refreshes, and is graded at the overridden line. Prices are American.
        </div>
      </div>

      {notice && <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>{notice}</div>}
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Match picker */}
        <div style={{ flex: '1 1 300px', minWidth: 280 }}>
          <input
            type="text"
            placeholder="Filter matches by team…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box', marginBottom: 8 }}
          />
          <div style={{ maxHeight: 460, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, color: '#64748b', fontSize: 13 }}>No matches.</div>
            ) : filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pick(m)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none',
                  borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13,
                  background: selected?.id === m.id ? '#eff6ff' : '#fff',
                }}
              >
                <div style={{ fontWeight: 600 }}>{m.awayTeam} @ {m.homeTeam}</div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>{m.sportKey} · {fmtDate(m.startTime)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Override editor */}
        <div style={{ flex: '2 1 420px', minWidth: 320 }}>
          {!selected ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
              Select a match to override its lines.
            </div>
          ) : loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading lines…</div>
          ) : !lines?.markets?.length ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
              No moneyline / spread / total on the board for this match.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.awayTeam} @ {selected.homeTeam}</div>
              {lines.markets.map((mkt) => {
                const draft = drafts[mkt.market] || { point: '', prices: {} };
                const overridden = mkt.outcomes.some((o) => o.overridden);
                const lockRow = mkt.outcomes.find((o) => o.overridden);
                const hasPoint = mkt.market !== 'h2h';
                return (
                  <div key={mkt.market} style={{ border: `1px solid ${overridden ? '#f59e0b' : '#e2e8f0'}`, borderRadius: 8, padding: 12, background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>
                        {mkt.label}
                        {overridden && (
                          <span style={{ marginLeft: 8, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 800 }}>
                            🔒 OVERRIDDEN
                          </span>
                        )}
                      </div>
                      {overridden && (
                        <button
                          type="button"
                          onClick={() => setConfirm({ release: true, market: mkt.market, mkt })}
                          disabled={busyMarket === mkt.market}
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #b45309', background: '#f59e0b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
                        >
                          Release to feed
                        </button>
                      )}
                    </div>
                    {overridden && lockRow && (
                      <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}>
                        Locked by {lockRow.lockedBy || 'admin'} at {fmtDate(lockRow.lockedAt)}
                      </div>
                    )}

                    {hasPoint && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <label style={{ fontSize: 12, color: '#475569', width: 110 }}>
                          {mkt.market === 'totals' ? 'Total' : `${selected.homeTeam} line`}
                        </label>
                        <input
                          type="text"
                          value={draft.point}
                          onChange={(e) => setDraftPoint(mkt.market, e.target.value.replace(/[^0-9.+-]/g, ''))}
                          placeholder={mkt.market === 'totals' ? '9.5' : '-3.5'}
                          style={{ width: 90, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                        {mkt.market === 'spreads' && (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>
                            {selected.awayTeam} mirrors {draft.point !== '' && Number.isFinite(Number(draft.point)) ? fmtPoint(-Number(draft.point)) : '(auto)'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Per-side: current feed value + independent price input */}
                    {mkt.outcomes.map((o) => (
                      <div key={o.side || o.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 110, fontSize: 13, fontWeight: 600 }}>{sideLabel(mkt, o)}</span>
                        <span style={{ fontSize: 12, color: '#64748b', width: 130 }}>
                          feed: {hasPoint ? `${fmtPoint(o.feedPoint)} ` : ''}{fmtAm(o.feedAmerican)}
                        </span>
                        <span style={{ fontSize: 12, color: '#475569' }}>→</span>
                        <input
                          type="text"
                          value={draft.prices[o.side] ?? ''}
                          onChange={(e) => setDraftPrice(mkt.market, o.side, e.target.value.replace(/[^0-9+-]/g, ''))}
                          placeholder="-110"
                          style={{ width: 80, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                      </div>
                    ))}

                    <button
                      type="button"
                      disabled={busyMarket === mkt.market || !draftValid(mkt, draft)}
                      onClick={() => setConfirm({ market: mkt.market, mkt, entries: entriesFromDraft(mkt, draft) })}
                      style={{
                        marginTop: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid #15803d',
                        background: draftValid(mkt, draft) ? '#22c55e' : '#94a3b8', color: '#fff', fontWeight: 600,
                        cursor: draftValid(mkt, draft) ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {overridden ? 'Update override…' : 'Set override…'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation — echoes match, market, and each side old→new before commit. */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {confirm.release ? (
              <>
                <h3 style={{ marginTop: 0 }}>Release to feed</h3>
                <p style={{ color: '#64748b', margin: '8px 0' }}>{selected?.awayTeam} @ {selected?.homeTeam}</p>
                <p style={{ fontWeight: 700 }}>{confirm.mkt.label} — the feed value will be restored immediately.</p>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Confirm line override</h3>
                <p style={{ color: '#64748b', margin: '8px 0' }}>{selected?.awayTeam} @ {selected?.homeTeam} · {confirm.mkt.label}</p>
                <div style={{ fontSize: 14, margin: '8px 0' }}>
                  {confirm.entries.map((e) => {
                    const cur = confirm.mkt.outcomes.find((o) => o.name === e.name);
                    const oldStr = `${confirm.mkt.market !== 'h2h' ? `${fmtPoint(cur?.overridden ? cur?.overridePoint : cur?.feedPoint)} ` : ''}${fmtAm(cur?.overridden ? cur?.overrideAmerican : cur?.feedAmerican)}`;
                    const newStr = `${e.point !== undefined ? `${fmtPoint(e.point)} ` : ''}${fmtAm(e.price)}`;
                    return (
                      <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                        <span style={{ fontWeight: 600 }}>{confirm.mkt.market === 'totals' ? (e.side === 'under' ? 'Under' : 'Over') : e.name}</span>
                        <span><span style={{ color: '#94a3b8' }}>{oldStr}</span> → <strong>{newStr}</strong></span>
                      </div>
                    );
                  })}
                </div>
                <p style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
                  This changes what players bet and win on this market. Stored verbatim and audit-logged.
                </p>
              </>
            )}
            <div className="modal-buttons">
              <button type="button" className="btn-secondary" onClick={() => setConfirm(null)} disabled={!!busyMarket}>Cancel</button>
              <button type="button" className={confirm.release ? 'btn-danger' : 'btn-success'} onClick={commit} disabled={!!busyMarket}>
                {busyMarket ? 'Working…' : (confirm.release ? 'Confirm release' : 'Confirm override')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LineOverrideView;
