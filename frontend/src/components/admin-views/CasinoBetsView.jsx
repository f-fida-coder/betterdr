import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadAdminCasinoBetsCsv, getAdminCasinoBetDetail, getAdminCasinoBets, getAdminCasinoSummary, getCasinoGames, updateAdminCasinoGame } from '../../api';


/* ─── Casino game configuration (admin-only, registry-driven) ───────────────
 *
 * One registry entry per admin-configurable game; the selector tabs list every
 * game the catalog returns, and slugs without an entry render an empty-state
 * panel. Adding the next game = adding ONE entry here (plus its server-side
 * PAYOUT_SPEC) — no new JSX layouts.
 *
 * Registry shape (slug → entry):
 *   label        Tab + panel title.
 *   infoLine     STATIC house-edge/RTP text. Display only — live RTP
 *                computation from paytables is a later ticket.
 *   roundOnLoad  Round int fields when seeding from stored config (legacy
 *                roulette behavior; other games seed the raw stored value).
 *   sections     [{ id, title, note?, kind: 'fields' | 'paytable', fields }]
 *                field = { key, label, min, max, step, int,
 *                          type: 'number' | 'checkbox', checkboxText: [on, off] }
 *                kind 'fields'   → auto-fill grid, label above input, muted
 *                                  "min–max" range hint under it.
 *                kind 'paytable' → the Aces & Eights per-hand editor: keys with
 *                                  min === max render locked; the ×1–5 coin
 *                                  columns are DISPLAY-ONLY derivations
 *                                  (base × coins, with the payNR coin-5 cell
 *                                  overridden by payNRMax — the royal jump).
 *   defaults     key → default. Seeds missing config keys on load and is the
 *                Reset-to-Default target.
 *   resettable   Shows "Reset to Default" (paytable only). Reset fills the
 *                form with defaults and marks it DIRTY — the values are
 *                applied only via the normal Save, never auto-saved.
 *   buildPayload(values) → the payoutConfig object EXACTLY as the legacy
 *                per-game Save built it, key order included — the PUT body
 *                must stay byte-identical. Server clamps remain the source of
 *                truth (out-of-range → 400).
 *   successText(applied, values) → the legacy per-game success message.
 *
 * Every save is the SAME single call as before this redesign:
 *   PUT /casino/admin/games/{gameId}
 *   body { metadata: { ...game.metadata, payoutConfig: buildPayload(values) } }
 * No save has side effects beyond that PUT (config is read per round).
 * ──────────────────────────────────────────────────────────────────────────── */

// Server-enforced clamp ranges for baccarat-classic's payout config — shown and
// pre-validated here, but the backend PUT is the source of truth (rejects
// out-of-range with 400; changing values requires role admin).
const BACCARAT_PAYOUT_LIMITS = {
  bankerCommissionPct: { min: 2.5, max: 10, label: 'Banker commission %' },
  tiePayout: { min: 7, max: 9, label: 'Tie payout ×' },
};

// Server-enforced clamp ranges for bogeyman's payout config (see
// BOGEYMAN_PAYOUT_SPEC). payoutScale multiplies every line pay (floored per
// hit): RTP ~94.9% at 1.00 down to ~75.9% at 0.80. The freeSpins maxima are
// deliberately tight — the 3-scatter award dominates RTP and larger values
// would push the game player-positive.
const BOGEYMAN_PAYOUT_LIMITS = {
  payoutScale: { min: 0.8, max: 1, step: 0.01, label: 'Payout scale ×' },
  freeSpins3: { min: 3, max: 6, step: 1, label: '3-scatter free spins' },
  freeSpins4: { min: 5, max: 20, step: 1, label: '4-scatter free spins' },
  freeSpins5: { min: 10, max: 40, step: 1, label: '5-scatter free spins' },
};

// Server-enforced clamp range for arabian's payout config (see
// ARABIAN_PAYOUT_SPEC). payoutScale is the ONLY lever — a uniform multiplier on
// the retuned paytable, floored to cents per hit (house-safe). The reels stay a
// fair uniform draw. Cent-floor RTP: ~93.7% at 1.00 (default) down to ~84% at
// 0.90; ceiling 1.05 (~98%) stays house-positive.
const ARABIAN_PAYOUT_LIMITS = {
  payoutScale: { min: 0.9, max: 1.05, step: 0.01, label: 'Payout scale ×' },
};

// Server-enforced clamp ranges for american-roulette's OPERATIONAL config
// (see AMERICAN_ROULETTE_PAYOUT_SPEC). Roulette's edge is structural (the
// 0/00 pockets) — payout multipliers are locked server constants and are
// deliberately NOT configurable here. These levers are per-position stake
// caps, table min/max and the five-bet toggle; whole dollars.
const AMERICAN_ROULETTE_LIMITS = {
  maxStraight: { min: 5, max: 500, label: 'Straight cap $' },
  maxSplit: { min: 5, max: 1000, label: 'Split cap $' },
  maxStreet: { min: 5, max: 1500, label: 'Street cap $' },
  maxBasket: { min: 5, max: 1500, label: 'Basket cap $' },
  maxCorner: { min: 5, max: 2000, label: 'Corner cap $' },
  maxFiveBet: { min: 5, max: 2500, label: 'Five bet cap $' },
  maxSixLine: { min: 5, max: 3000, label: 'Six line cap $' },
  maxOutside: { min: 5, max: 5000, label: 'Outside cap $' },
  tableMin: { min: 1, max: 100, label: 'Table min $' },
  tableMax: { min: 100, max: 20000, label: 'Table max $' },
};
const AMERICAN_ROULETTE_DEFAULTS = {
  maxStraight: 25, maxSplit: 50, maxStreet: 75, maxBasket: 75, maxCorner: 100,
  maxFiveBet: 125, maxSixLine: 150, maxOutside: 100, tableMin: 1, tableMax: 5000,
};

// Server-enforced clamp ranges for aces-and-eights's paytable config (see
// ACES_AND_EIGHTS_PAYOUT_SPEC). The ONLY house-edge lever is the uniform pay
// table (the deck is always a fair 52-card shuffle). Each key is the per-coin
// BASE multiplier for its rank; the derived payout = base × coins, EXCEPT the
// royal's 5-coin cell which is the separate max-coin value (the royal jump).
// Ranges keep the all-max corner house-positive (~99.4% RTP) and the all-min
// floor an honest ~90.6%; payJB/pay2P/pay3K are locked (min == max) because
// those high-frequency low hands swing RTP too hard to expose.
const ACES_PAYOUT_LIMITS = {
  payJB: { def: 1, min: 1, max: 1, label: 'Jacks or Better' },
  pay2P: { def: 2, min: 2, max: 2, label: 'Two Pair' },
  pay3K: { def: 3, min: 3, max: 3, label: 'Three of a Kind' },
  payST: { def: 4, min: 3, max: 4, label: 'Straight' },
  payFL: { def: 5, min: 4, max: 6, label: 'Flush' },
  payFH: { def: 7, min: 6, max: 8, label: 'Full House' },
  pay4K: { def: 20, min: 15, max: 20, label: 'Four of a Kind' },
  pay47: { def: 50, min: 40, max: 55, label: 'Four Sevens' },
  paySF: { def: 50, min: 40, max: 55, label: 'Straight Flush' },
  payA8: { def: 80, min: 50, max: 85, label: 'Four Aces / Eights' },
  payNR: { def: 125, min: 100, max: 125, label: 'Natural Royal (per coin, 1-4)' },
  payNRMax: { def: 2000, min: 1500, max: 2000, label: 'Natural Royal (max coin, 5)' },
};
const ACES_PAY_ORDER = ['payJB', 'pay2P', 'pay3K', 'payST', 'payFL', 'payFH', 'pay4K', 'pay47', 'paySF', 'payA8', 'payNR', 'payNRMax'];

const numberFields = (limits, { int = false } = {}) =>
  Object.entries(limits).map(([key, lim]) => ({
    key, label: lim.label, min: lim.min, max: lim.max, step: lim.step ?? (int ? 1 : 0.5), int, type: 'number',
  }));

const CASINO_GAME_CONFIG_REGISTRY = {
  'baccarat-classic': {
    label: 'Baccarat',
    infoLine: 'Edge from commission/tie — standard 8-deck',
    defaults: { bankerCommissionPct: 5, tiePayout: 8 },
    sections: [
      { id: 'payout', title: 'Payout / RTP controls', kind: 'fields', fields: numberFields(BACCARAT_PAYOUT_LIMITS) },
    ],
    buildPayload: (v) => ({
      bankerCommissionPct: Number(v.bankerCommissionPct),
      tiePayout: Number(v.tiePayout),
    }),
    successText: (applied, v) =>
      `Saved — live from the next round: commission ${applied.bankerCommissionPct ?? v.bankerCommissionPct}%, tie ${applied.tiePayout ?? v.tiePayout}×`,
  },
  bogeyman: {
    label: 'Bogeyman',
    infoLine: 'RTP ~94.9% at 1.00× → ~75.9% at 0.80×',
    defaults: { payoutScale: 1, freeSpins3: 5, freeSpins4: 10, freeSpins5: 20 },
    sections: [
      { id: 'payout', title: 'Payout / RTP controls', kind: 'fields',
        fields: numberFields({ payoutScale: BOGEYMAN_PAYOUT_LIMITS.payoutScale }) },
      { id: 'game', title: 'Game-specific', kind: 'fields',
        fields: numberFields({
          freeSpins3: BOGEYMAN_PAYOUT_LIMITS.freeSpins3,
          freeSpins4: BOGEYMAN_PAYOUT_LIMITS.freeSpins4,
          freeSpins5: BOGEYMAN_PAYOUT_LIMITS.freeSpins5,
        }, { int: true }) },
    ],
    buildPayload: (v) => ({
      payoutScale: Number(v.payoutScale),
      freeSpins3: Number(v.freeSpins3),
      freeSpins4: Number(v.freeSpins4),
      freeSpins5: Number(v.freeSpins5),
    }),
    successText: (applied, v) =>
      `Saved — live from the next spin: scale ${applied.payoutScale ?? v.payoutScale}×, free spins ${applied.freeSpins3 ?? v.freeSpins3}/${applied.freeSpins4 ?? v.freeSpins4}/${applied.freeSpins5 ?? v.freeSpins5}`,
  },
  arabian: {
    label: 'Arabian',
    infoLine: 'RTP ~93.7% at 1.00× (cent-floored)',
    defaults: { payoutScale: 1 },
    sections: [
      { id: 'payout', title: 'Payout / RTP controls', kind: 'fields', fields: numberFields(ARABIAN_PAYOUT_LIMITS) },
    ],
    buildPayload: (v) => ({ payoutScale: Number(v.payoutScale) }),
    successText: (applied, v) => `Saved — live from the next spin: scale ${applied.payoutScale ?? v.payoutScale}×`,
  },
  'american-roulette': {
    label: 'American Roulette',
    infoLine: 'House edge: 5.26% (double-zero)',
    roundOnLoad: true,
    defaults: { ...AMERICAN_ROULETTE_DEFAULTS, fiveBetEnabled: true },
    sections: [
      { id: 'payout', title: 'Payout / RTP controls', kind: 'fields', fields: [],
        note: 'Payout multipliers are locked server constants — the edge is structural (the 0/00 pockets).' },
      { id: 'limits', title: 'Limits', kind: 'fields', fields: numberFields(AMERICAN_ROULETTE_LIMITS, { int: true }) },
      { id: 'game', title: 'Game-specific', kind: 'fields', fields: [
        { key: 'fiveBetEnabled', label: 'Five bet (0-00-1-2-3)', type: 'checkbox', checkboxText: ['Offered (pays 6:1)', 'Not offered'] },
      ] },
    ],
    buildPayload: (v) => {
      const payoutConfig = { fiveBetEnabled: v.fiveBetEnabled ? 1 : 0 };
      Object.keys(AMERICAN_ROULETTE_LIMITS).forEach((key) => { payoutConfig[key] = Number(v[key]); });
      return payoutConfig;
    },
    successText: (applied, v) =>
      `Saved — live from the next spin: table $${applied.tableMin ?? v.tableMin}–$${applied.tableMax ?? v.tableMax}, straight cap $${applied.maxStraight ?? v.maxStraight}, five bet ${Math.round(Number(applied.fiveBetEnabled ?? (v.fiveBetEnabled ? 1 : 0))) >= 1 ? 'ON' : 'OFF'}`,
  },
  'aces-and-eights': {
    label: 'Aces & Eights',
    infoLine: 'RTP ~99.4% all-max → ~90.6% all-min',
    resettable: true,
    defaults: Object.fromEntries(ACES_PAY_ORDER.map((k) => [k, ACES_PAYOUT_LIMITS[k].def])),
    sections: [
      { id: 'payout', title: 'Payout / RTP controls', kind: 'paytable',
        note: 'Per-coin base × coins (royal jumps at coin 5). Deck is always a fair 52-card shuffle.',
        fields: ACES_PAY_ORDER.map((key) => ({
          key, label: ACES_PAYOUT_LIMITS[key].label,
          min: ACES_PAYOUT_LIMITS[key].min, max: ACES_PAYOUT_LIMITS[key].max, step: 1, int: true, type: 'number',
        })) },
    ],
    buildPayload: (v) => {
      const payoutConfig = {};
      ACES_PAY_ORDER.forEach((k) => { payoutConfig[k] = Number(v[k]); });
      return payoutConfig;
    },
    successText: (applied, v) =>
      `Saved — live from the next hand: FH ${applied.payFH ?? v.payFH}, FL ${applied.payFL ?? v.payFL}, royal ${applied.payNRMax ?? v.payNRMax}@5.`,
  },
};

const registryFields = (entry) => entry.sections.flatMap((s) => s.fields);

// Seed the form state from a game row's stored payoutConfig (legacy per-game
// seeding preserved: roulette rounds ints on load, checkbox reads >= 1).
const seedConfigValues = (entry, game) => {
  const cfg = game?.metadata?.payoutConfig || {};
  const values = {};
  registryFields(entry).forEach((field) => {
    if (field.type === 'checkbox') {
      values[field.key] = Math.round(Number(cfg[field.key] ?? (entry.defaults[field.key] ? 1 : 0))) >= 1;
      return;
    }
    const raw = cfg[field.key] ?? entry.defaults[field.key];
    values[field.key] = String(entry.roundOnLoad && field.int ? Math.round(Number(raw)) : raw);
  });
  return values;
};

const configFieldInvalid = (field, value) => {
  if (field.type === 'checkbox') return false;
  const num = Number(value);
  if (!Number.isFinite(num) || num < field.min || num > field.max) return true;
  return field.int ? !Number.isInteger(num) : false;
};

// Client-side mirror of the server matrix-builder — proves display == the
// table the engine will pay from (same coin-scaling + royal max-coin jump).
const acesDerivedRow = (values, key) => {
  const base = Number(values[key]);
  if (!Number.isFinite(base)) return ['—', '—', '—', '—', '—'];
  const row = [1, 2, 3, 4, 5].map((c) => base * c);
  if (key === 'payNR') {
    const max = Number(values.payNRMax);
    row[4] = Number.isFinite(max) ? max : '—';
  }
  return row;
};

function AcesPaytableEditor({ section, values, setValue, invalid }) {
  const editable = section.fields.filter((f) => f.key !== 'payNRMax');
  const nrMax = section.fields.find((f) => f.key === 'payNRMax');
  return (
    <div className="casino-gamecfg-paytable-wrap">
      <table className="aces-paytable-editor" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'right', color: '#94a3b8' }}>
            <th style={{ textAlign: 'left' }}>Hand</th>
            <th>Base (range)</th>
            <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
          </tr>
        </thead>
        <tbody>
          {editable.map((field) => {
            const locked = field.min === field.max;
            const row = acesDerivedRow(values, field.key);
            return (
              <tr key={field.key} style={{ borderTop: '1px solid #e5eef7' }}>
                <td style={{ textAlign: 'left', padding: '3px 4px' }}>{field.label}</td>
                <td style={{ textAlign: 'right', padding: '3px 4px' }}>
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={1}
                    disabled={locked}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    style={{ width: 52, textAlign: 'right', ...(invalid(field) ? { borderColor: '#dc2626' } : {}) }}
                    title={locked ? 'Locked (dominant hand)' : `${field.min}–${field.max}`}
                  />
                  {!locked && <span className="casino-gamecfg-hint" style={{ display: 'inline', marginLeft: 4 }}>{field.min}–{field.max}</span>}
                </td>
                {row.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right', padding: '3px 6px', color: field.key === 'payNR' && i === 4 ? '#b45309' : '#334155' }}>{v}</td>
                ))}
              </tr>
            );
          })}
          {nrMax && (
            <tr style={{ borderTop: '1px solid #e5eef7' }}>
              <td style={{ textAlign: 'left', padding: '3px 4px', color: '#b45309' }}>{nrMax.label}</td>
              <td style={{ textAlign: 'right', padding: '3px 4px' }}>
                <input
                  type="number"
                  min={nrMax.min}
                  max={nrMax.max}
                  step={1}
                  value={values.payNRMax ?? ''}
                  onChange={(e) => setValue('payNRMax', e.target.value)}
                  style={{ width: 60, textAlign: 'right', ...(invalid(nrMax) ? { borderColor: '#dc2626' } : {}) }}
                  title={`${nrMax.min}–${nrMax.max}`}
                />
                <span className="casino-gamecfg-hint" style={{ display: 'inline', marginLeft: 4 }}>{nrMax.min}–{nrMax.max}</span>
              </td>
              <td colSpan={5} style={{ textAlign: 'right', padding: '3px 6px', color: '#64748b' }}>overrides the royal at 5 coins</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function GameConfigPanel({ token, game, entry, onSaved, onDirtyChange }) {
  const [values, setValues] = useState(() => seedConfigValues(entry, game));
  const [snapshot, setSnapshot] = useState(values);
  const [status, setStatus] = useState({ kind: '', text: '' });
  const [saving, setSaving] = useState(false);

  const fields = useMemo(() => registryFields(entry), [entry]);
  const dirty = useMemo(() => fields.some((f) => values[f.key] !== snapshot[f.key]), [fields, values, snapshot]);
  const anyInvalid = fields.some((f) => configFieldInvalid(f, values[f.key]));

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  const setValue = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  const invalid = (field) => configFieldInvalid(field, values[field.key]);

  const save = async () => {
    if (!game || saving || !dirty || anyInvalid) return;
    try {
      setSaving(true);
      setStatus({ kind: '', text: '' });
      const payoutConfig = entry.buildPayload(values);
      const updated = await updateAdminCasinoGame(game.id, {
        metadata: { ...(game.metadata || {}), payoutConfig },
      }, token);
      const applied = updated?.metadata?.payoutConfig || {};
      const next = {};
      fields.forEach((f) => {
        if (f.type === 'checkbox') next[f.key] = Math.round(Number(applied[f.key] ?? payoutConfig[f.key])) >= 1;
        else next[f.key] = String(applied[f.key] ?? payoutConfig[f.key]);
      });
      setValues(next);
      setSnapshot(next);
      setStatus({ kind: 'ok', text: entry.successText(applied, values) });
      onSaved(updated || game);
    } catch (err) {
      setStatus({ kind: 'error', text: err.message || 'Failed to save payout config' });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (!window.confirm('Reset the paytable to the default values? Nothing is applied until you press Save.')) return;
    const next = {};
    fields.forEach((f) => {
      next[f.key] = f.type === 'checkbox' ? !!entry.defaults[f.key] : String(entry.defaults[f.key]);
    });
    setValues(next);
    setStatus({ kind: '', text: '' });
  };

  return (
    <div className="casino-gamecfg-panel">
      <div className="casino-gamecfg-panel-head">
        <span className="casino-gamecfg-title">{entry.label}</span>
        <span className={`casino-net-pill ${String(game.status).toLowerCase() === 'active' ? 'is-positive' : 'is-neutral'}`}>
          {String(game.status).toLowerCase() === 'active' ? 'enabled' : 'disabled'}
        </span>
        <span className="casino-gamecfg-info">{entry.infoLine}</span>
      </div>
      {entry.sections.map((section) => (
        <div className="casino-gamecfg-section" key={section.id}>
          <div className="casino-gamecfg-section-title">{section.title}</div>
          {section.note && <div className="casino-gamecfg-section-note">{section.note}</div>}
          {section.kind === 'paytable' ? (
            <AcesPaytableEditor section={section} values={values} setValue={setValue} invalid={invalid} />
          ) : section.fields.length > 0 && (
            <div className="casino-gamecfg-grid">
              {section.fields.map((field) => (
                <div className="filter-group casino-gamecfg-field" key={field.key}>
                  <label>{field.label}</label>
                  {field.type === 'checkbox' ? (
                    <label className="casino-gamecfg-check">
                      <input
                        type="checkbox"
                        checked={!!values[field.key]}
                        onChange={(e) => setValue(field.key, e.target.checked)}
                      />
                      {values[field.key] ? field.checkboxText[0] : field.checkboxText[1]}
                    </label>
                  ) : (
                    <>
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={values[field.key] ?? ''}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        style={invalid(field) ? { borderColor: '#dc2626' } : undefined}
                      />
                      <span className="casino-gamecfg-hint">{field.min}–{field.max}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="casino-gamecfg-footer">
        {dirty && <span className="casino-gamecfg-dirty">● Unsaved changes</span>}
        {status.text && (
          <span className={status.kind === 'error' ? 'casino-gamecfg-status-err' : 'casino-gamecfg-status-ok'}>{status.text}</span>
        )}
        {entry.resettable && (
          <button type="button" className="btn-small" onClick={resetToDefaults} disabled={saving}>
            Reset to Default
          </button>
        )}
        <button type="button" className="btn-small btn-accent" onClick={save} disabled={saving || !dirty || anyInvalid}>
          {saving ? 'Saving…' : `Save ${entry.label}`}
        </button>
      </div>
    </div>
  );
}

function CasinoGameConfigCard({ token }) {
  const [games, setGames] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [activeSlug, setActiveSlug] = useState('');
  // In-memory only (per approved spec): selection and dirty state reset on a
  // full page reload; dirty tracking guards tab switches within the session.
  const activeDirtyRef = useRef(false);

  const loadGames = useCallback(async () => {
    try {
      // One consolidated load. Omitting category (backend treats missing as
      // 'lobby' = no category filter) + all:true (admin-only, includes
      // disabled tiles) returns every game; the SAME toPublicGame serializer
      // shapes both the all:true and per-category responses.
      const payload = await getCasinoGames({ token, category: '', limit: 100, all: true });
      setGames(Array.isArray(payload?.games) ? payload.games : []);
    } catch (err) {
      setLoadError(err.message || 'Failed to load casino game configs');
    }
  }, [token]);

  useEffect(() => { loadGames(); }, [loadGames]);

  const rows = useMemo(() => {
    const list = (games || []).map((g) => ({
      game: g,
      slug: String(g?.slug || ''),
      label: CASINO_GAME_CONFIG_REGISTRY[g?.slug]?.label || g?.name || g?.slug || 'Game',
    }));
    list.sort((a, b) => a.label.localeCompare(b.label));
    return list;
  }, [games]);

  useEffect(() => {
    if (!activeSlug && rows.length > 0) setActiveSlug(rows[0].slug);
  }, [rows, activeSlug]);

  const selectTab = (slug) => {
    if (slug === activeSlug) return;
    if (activeDirtyRef.current && !window.confirm('Discard unsaved changes for this game?')) return;
    activeDirtyRef.current = false;
    setActiveSlug(slug);
  };

  const handleSaved = useCallback((updated) => {
    setGames((prev) => (prev || []).map((g) => (g.id === updated?.id ? updated : g)));
  }, []);

  const handleDirtyChange = useCallback((d) => { activeDirtyRef.current = d; }, []);

  if (loadError) return <div className="casino-gamecfg-card"><div className="casino-gamecfg-panel casino-gamecfg-empty">{loadError}</div></div>;
  if (!games || rows.length === 0) return null;

  const active = rows.find((r) => r.slug === activeSlug) || rows[0];
  const entry = CASINO_GAME_CONFIG_REGISTRY[active.slug];

  return (
    <div className="casino-gamecfg-card">
      <div className="tabs-container casino-gamecfg-tabs">
        {rows.map((row) => {
          const enabled = String(row.game?.status || '').toLowerCase() === 'active';
          return (
            <button
              type="button"
              key={row.slug}
              className={`tab${row.slug === active.slug ? ' active' : ''}`}
              onClick={() => selectTab(row.slug)}
            >
              {row.label}
              <span
                className={`casino-net-pill casino-gamecfg-tab-badge ${enabled ? 'is-positive' : 'is-neutral'}`}
                title={enabled ? 'enabled' : 'disabled'}
                aria-label={enabled ? 'enabled' : 'disabled'}
              >
                {enabled ? '●' : '○'}
              </span>
            </button>
          );
        })}
      </div>
      {entry ? (
        <GameConfigPanel
          key={active.slug}
          token={token}
          game={active.game}
          entry={entry}
          onSaved={handleSaved}
          onDirtyChange={handleDirtyChange}
        />
      ) : (
        <div className="casino-gamecfg-panel">
          <div className="casino-gamecfg-panel-head">
            <span className="casino-gamecfg-title">{active.label}</span>
            <span className={`casino-net-pill ${String(active.game?.status || '').toLowerCase() === 'active' ? 'is-positive' : 'is-neutral'}`}>
              {String(active.game?.status || '').toLowerCase() === 'active' ? 'enabled' : 'disabled'}
            </span>
          </div>
          <div className="casino-gamecfg-empty">No admin-configurable settings for this game yet.</div>
        </div>
      )}
    </div>
  );
}


const EMPTY_FILTERS = {
  game: '',
  username: '',
  userId: '',
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
  const [summaryByGame, setSummaryByGame] = useState([]);
  const [summaryByUser, setSummaryByUser] = useState([]);
  const [summaryAnomalies, setSummaryAnomalies] = useState({ count: 0, sample: [] });
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
        getAdminCasinoSummary({
          game: filters.game,
          from: filters.from,
          to: filters.to,
          result: filters.result,
          username: filters.username,
          userId: filters.userId,
        }, token),
      ]);
      setRows(Array.isArray(betsData?.bets) ? betsData.bets : []);
      setPagination(betsData?.pagination || { page, pages: 1, total: 0, limit: 50 });
      setSummary(summaryData?.summary || null);
      setSummaryByGame(Array.isArray(summaryData?.byGame) ? summaryData.byGame : []);
      setSummaryByUser(Array.isArray(summaryData?.byUser) ? summaryData.byUser : []);
      setSummaryAnomalies(summaryData?.anomalies || { count: 0, sample: [] });
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
    if (Number.isNaN(num)) return '$0';
    // Whole dollars stay whole; cent-level amounts (Bogeyman's chips go down
    // to $0.01) keep their cents instead of rounding $0.50 up to "$1".
    const hasCents = Math.abs(num - Math.round(num)) >= 0.005;
    return `$${hasCents ? num.toFixed(2) : Math.round(num)}`;
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  };

  // Both the dead legacy slug (historical rows) and the live American game
  // share the roulette renderers below.
  const isRouletteGame = (value) => ['roulette', 'american-roulette'].includes(String(value || '').toLowerCase());

  const formatGame = (value) => {
    switch (String(value || '').toLowerCase()) {
      case 'stud-poker':
        return 'Stud Poker';
      case 'roulette':
        return 'Roulette';
      case 'american-roulette':
        return 'American Roulette';
      case 'blackjack':
        return 'Blackjack';
      case 'baccarat':
      case 'baccarat-classic':
        return 'Baccarat';
      case 'craps':
        return 'Craps';
      case 'arabian':
        return 'Arabian Game';
      case 'jurassic-run':
        return 'Jurassic Run';
      case 'bogeyman':
        return 'Bogeyman';
      case 'arabian-treasure':
        return 'Arabian Game';
      case '3card-poker':
        return '3-Card Poker';
      default:
        return value || '—';
    }
  };

  const getPlayerOutcome = (row) => {
    const explicitOutcome = String(row?.playerOutcome || '').trim();
    if (explicitOutcome) return explicitOutcome;

    const roundStatus = String(row?.roundStatus || '').toLowerCase();
    if (roundStatus && roundStatus !== 'settled') return 'Pending';

    const net = Number(row?.netResult || 0);
    if (net > 0) return 'Win';
    if (net < 0) return 'Lose';
    return 'Push';
  };

  const toBadgeClass = (value) => {
    const normalized = String(value || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'unknown';
  };

  const formatRoundResult = (row) => {
    if (!row) return '—';

    if (isRouletteGame(row.game) && row.rouletteOutcome) {
      // number is the pocket token — '00' is a distinct string pocket.
      const number = row.rouletteOutcome.number ?? row.result;
      const color = String(row.rouletteOutcome.color || '').trim();
      return color ? `${number} ${color}` : `${number}`;
    }

    if (String(row.game || '').toLowerCase() === 'craps') {
      const dice = row?.roundData?.dice;
      const die1 = Number(dice?.die1);
      const die2 = Number(dice?.die2);
      const sum = Number(dice?.sum);
      if (Number.isFinite(die1) && Number.isFinite(die2) && Number.isFinite(sum)) {
        return `${die1}+${die2}=${sum}`;
      }
    }

    if (String(row.game || '').toLowerCase() === 'arabian') {
      const totalWin = Number(row?.roundData?.totalWin ?? row?.totalReturn ?? 0);
      const bonusWin = Number(row?.roundData?.bonusWin ?? 0);
      const freeSpinsAwarded = Number(row?.roundData?.freeSpinsAwarded ?? 0);
      const parts = [];
      if (totalWin > 0) parts.push(`Win ${formatMoney(totalWin)}`);
      if (bonusWin > 0) parts.push(`Bonus ${formatMoney(bonusWin)}`);
      if (freeSpinsAwarded > 0) parts.push(`+${freeSpinsAwarded} FS`);
      if (parts.length > 0) return parts.join(' | ');
    }

    if (String(row.game || '').toLowerCase() === 'jurassic-run') {
      const totalWin = Number(row?.roundData?.totalWin ?? row?.totalReturn ?? 0);
      const jackpotPayout = Number(row?.roundData?.jackpotPayout ?? 0);
      const freeSpinsAwarded = Number(row?.roundData?.freeSpinsAwarded ?? 0);
      const isFreeSpinRound = !!row?.roundData?.isFreeSpinRound;
      const parts = [];
      if (jackpotPayout > 0) parts.push(`Jackpot ${formatMoney(jackpotPayout)}`);
      else if (totalWin > 0) parts.push(`Win ${formatMoney(totalWin)}`);
      if (freeSpinsAwarded > 0) parts.push(`+${freeSpinsAwarded} FS`);
      if (parts.length > 0) return parts.join(' | ');
      if (isFreeSpinRound) return 'Free Spin';
    }

    if (String(row.game || '').toLowerCase() === 'bogeyman') {
      const totalWin = Number(row?.roundData?.totalWin ?? row?.totalReturn ?? 0);
      const freeSpinsAwarded = Number(row?.roundData?.freeSpinsAwarded ?? 0);
      const isFreeSpinRound = !!row?.roundData?.isFreeSpinRound;
      const parts = [];
      if (totalWin > 0) parts.push(`Win ${formatMoney(totalWin)}`);
      if (freeSpinsAwarded > 0) parts.push(`+${freeSpinsAwarded} FS`);
      if (parts.length > 0) return parts.join(' | ');
      if (isFreeSpinRound) return 'Free Spin';
    }

    if (String(row.game || '').toLowerCase() === '3card-poker') {
      const mainLabel = String(row?.roundData?.mainResultLabel || row?.result || '').trim();
      const playerHand = String(row?.playerHand || row?.roundData?.playerHand || '').trim();
      const dealerHand = String(row?.dealerHand || row?.roundData?.dealerHand || '').trim();
      const parts = [];
      if (mainLabel) parts.push(mainLabel);
      if (playerHand) parts.push(`P ${playerHand}`);
      if (dealerHand) parts.push(`D ${dealerHand}`);
      return parts.length > 0 ? parts.join(' | ') : '—';
    }

    return row.result || '—';
  };
  const formatOutcomeSource = (value) => {
    switch (String(value || '').toLowerCase()) {
      case 'server_rng':
        return 'Server RNG';
      case 'server_simulated_actions':
        return 'Server Simulation';
      case 'native_client_round':
        return 'Client Native';
      case 'client_actions_server_rules':
        return 'Server Rules';
      case '':
        return '—';
      default:
        return value || '—';
    }
  };

  const getBetDisplayLabel = (bet) => {
    const label = String(bet?.label || '').trim();
    if (label) return label;

    const type = String(bet?.type || '').trim();
    const value = String(bet?.value || '').trim();
    if (type && value) return `${type}:${value}`;
    return type || 'Bet';
  };

  const getRouletteBets = (row) => (
    Array.isArray(row?.bets)
      ? row.bets.filter((bet) => bet && typeof bet === 'object')
      : []
  );

  const getWinningRouletteBets = (row) => {
    const winningKeys = new Set(
      Array.isArray(row?.winningBetKeys)
        ? row.winningBetKeys.map((key) => String(key))
        : []
    );

    return getRouletteBets(row).filter((bet) => winningKeys.has(String(bet?.key || '')));
  };

  const getCrapsBets = (row) => {
    const bets = row?.bets && typeof row.bets === 'object' ? row.bets : {};
    return Object.keys(bets)
      .filter((key) => Number(bets[key]) > 0)
      .sort()
      .map((key) => ({ key, amount: Number(bets[key]) }));
  };

  const getNetPillClass = (value) => {
    const net = Number(value || 0);
    if (net > 0) return 'casino-net-pill is-positive';
    if (net < 0) return 'casino-net-pill is-negative';
    return 'casino-net-pill is-neutral';
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
      { label: 'Average Bet', value: formatMoney(summary?.averageBet), tone: 'navy' },
      { label: 'RTP Estimate', value: `${Number(summary?.rtpEstimate || 0).toFixed(2)}%`, tone: 'indigo' },
      { label: 'Payout Ratio', value: `${Number(summary?.payoutRatio || 0).toFixed(2)}%`, tone: 'indigo' },
      { label: 'Anomalies', value: Number(summary?.anomalyCount || 0).toLocaleString(), tone: 'rose' },
      { label: 'Error Rate', value: `${Number(summary?.errorRate || 0).toFixed(4)}%`, tone: 'rose' },
    ]),
    [summary]
  );

  return (
    <div className="admin-view casino-bets-view">
      <div className="view-header casino-bets-header">
        <div>
          <h2>Casino Bets</h2>
          <p className="subtitle">Server-settled casino reporting, settlement ledger, and round-level audit details.</p>
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
            {localStorage.getItem('userRole') === 'admin' && <CasinoGameConfigCard token={token} />}
            <div className="casino-bets-kpi-grid">
              {summaryCards.map((card) => (
                <div className={`casino-kpi-card tone-${card.tone}`} key={card.label}>
                  <span className="casino-kpi-label">{card.label}</span>
                  <strong className="casino-kpi-value">{card.value}</strong>
                </div>
              ))}
            </div>

            <div className="casino-bets-filters casino-bets-highlights">
              <div className="filter-group">
                <label>Biggest Win</label>
                <div>{summary?.biggestWin ? `${summary.biggestWin.username || '—'} ${formatMoney(summary.biggestWin.netResult)}` : '—'}</div>
              </div>
              <div className="filter-group">
                <label>Biggest Loss</label>
                <div>{summary?.biggestLoss ? `${summary.biggestLoss.username || '—'} ${formatMoney(summary.biggestLoss.netResult)}` : '—'}</div>
              </div>
              <div className="filter-group">
                <label>Anomaly Sample</label>
                <div>{Number(summaryAnomalies?.count || 0)} flagged rounds</div>
              </div>
            </div>

            {summaryByGame.length > 0 && (
              <div className="table-container scrollable casino-bets-table-wrap casino-bets-table-section">
                <table className="data-table casino-bets-table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Rounds</th>
                      <th>Total Wager</th>
                      <th>Total Return</th>
                      <th>GGR</th>
                      <th>Avg Bet</th>
                      <th>RTP</th>
                      <th>Biggest Win</th>
                      <th>Biggest Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryByGame.map((item) => (
                      <tr key={item.game}>
                        <td>{formatGame(item.game)}</td>
                        <td>{Number(item.rounds || 0).toLocaleString()}</td>
                        <td>{formatMoney(item.totalWager)}</td>
                        <td>{formatMoney(item.totalReturn)}</td>
                        <td>{formatMoney(item.grossGamingRevenue)}</td>
                        <td>{formatMoney(item.averageBet)}</td>
                        <td>{Number(item.payoutRatio || 0).toFixed(2)}%</td>
                        <td>{item.biggestWin !== null && item.biggestWin !== undefined ? formatMoney(item.biggestWin) : '—'}</td>
                        <td>{item.biggestLoss !== null && item.biggestLoss !== undefined ? formatMoney(item.biggestLoss) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {summaryByUser.length > 0 && (
              <div className="table-container scrollable casino-bets-table-wrap casino-bets-table-section">
                <table className="data-table casino-bets-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>User ID</th>
                      <th>Rounds</th>
                      <th>Total Wager</th>
                      <th>Total Return</th>
                      <th>Net</th>
                      <th>Avg Bet</th>
                      <th>Biggest Win</th>
                      <th>Biggest Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryByUser.map((item) => (
                      <tr key={`${item.userId || ''}:${item.username || ''}`}>
                        <td>{item.username || '—'}</td>
                        <td className="round-id" title={item.userId || ''}>{shortId(item.userId || '')}</td>
                        <td>{Number(item.rounds || 0).toLocaleString()}</td>
                        <td>{formatMoney(item.totalWager)}</td>
                        <td>{formatMoney(item.totalReturn)}</td>
                        <td><span className={getNetPillClass(item.netResult)}>{formatMoney(item.netResult)}</span></td>
                        <td>{formatMoney(item.averageBet)}</td>
                        <td>{item.biggestWin !== null && item.biggestWin !== undefined ? formatMoney(item.biggestWin) : '—'}</td>
                        <td>{item.biggestLoss !== null && item.biggestLoss !== undefined ? formatMoney(item.biggestLoss) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {Array.isArray(summaryAnomalies?.sample) && summaryAnomalies.sample.length > 0 && (
              <div className="table-container scrollable casino-bets-table-wrap casino-bets-table-section">
                <table className="data-table casino-bets-table">
                  <thead>
                    <tr>
                      <th>Round</th>
                      <th>User</th>
                      <th>Game</th>
                      <th>Reasons</th>
                      <th>Wager</th>
                      <th>Return</th>
                      <th>Net</th>
                      <th>Balance Before</th>
                      <th>Balance After</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryAnomalies.sample.map((item, idx) => (
                      <tr key={`${item.roundId || 'anomaly'}:${idx}`}>
                        <td className="round-id" title={item.roundId || ''}>{shortId(item.roundId || '')}</td>
                        <td>{item.username || '—'}</td>
                        <td>{formatGame(item.game)}</td>
                        <td>{Array.isArray(item.reasons) ? item.reasons.join(', ') : '—'}</td>
                        <td>{formatMoney(item.totalWager)}</td>
                        <td>{formatMoney(item.totalReturn)}</td>
                        <td><span className={getNetPillClass(item.netResult)}>{formatMoney(item.netResult)}</span></td>
                        <td>{formatMoney(item.balanceBefore)}</td>
                        <td>{formatMoney(item.balanceAfter)}</td>
                        <td>{formatDateTime(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="casino-bets-filters">
              <div className="filter-group">
                <label>Game</label>
                <select value={filters.game} onChange={(e) => applyFilter('game', e.target.value)}>
                  <option value="">All</option>
                  <option value="baccarat-classic">Baccarat</option>
                  <option value="baccarat">Baccarat (Legacy)</option>
                  <option value="blackjack">Blackjack</option>
                  <option value="craps">Craps</option>
                  <option value="american-roulette">American Roulette</option>
                  <option value="arabian">Arabian Game</option>
                  <option value="jurassic-run">Jurassic Run</option>
                  <option value="bogeyman">Bogeyman</option>
                  <option value="3card-poker">3-Card Poker</option>
                </select>
              </div>
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
                <label>User ID</label>
                <input
                  type="text"
                  value={filters.userId}
                  onChange={(e) => applyFilter('userId', e.target.value)}
                  placeholder="user id"
                />
              </div>
              <div className="filter-group">
                <label>Outcome / Result</label>
                <input
                  type="text"
                  value={filters.result}
                  onChange={(e) => applyFilter('result', e.target.value)}
                  placeholder="Win / Lose / Push / Pending / Player / Banker / 17"
                />
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
                  step="1"
                  inputMode="numeric"
                  value={filters.minWager}
                  onChange={(e) => applyFilter('minWager', String(e.target.value).replace(/\D/g, ''))}
                  placeholder="0"
                />
              </div>
              <div className="filter-group">
                <label>Max Wager</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={filters.maxWager}
                  onChange={(e) => applyFilter('maxWager', String(e.target.value).replace(/\D/g, ''))}
                  placeholder="500"
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
                    <th>Game</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Outcome</th>
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
                      <td>{formatGame(row.game)}</td>
                      <td>{row.roundStatus || '—'}</td>
                      <td>{formatOutcomeSource(row.outcomeSource)}</td>
                      <td>
                        <span className={`casino-result-badge result-${toBadgeClass(getPlayerOutcome(row))}`}>
                          {getPlayerOutcome(row)}
                        </span>
                      </td>
                      <td>
                        <span className={`casino-result-badge result-${toBadgeClass(formatRoundResult(row))}`}>
                          {formatRoundResult(row)}
                        </span>
                      </td>
                      <td>{formatMoney(row.totalWager)}</td>
                      <td>{formatMoney(row.totalReturn)}</td>
                      <td>
                        <span className={getNetPillClass(row.netResult)}>
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
                      <td colSpan={13} className="casino-bets-empty-row">
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
                    <div className="casino-detail-row"><span>Game</span><span>{formatGame(selectedDetail.game)}</span></div>
                    <div className="casino-detail-row"><span>Status</span><span>{selectedDetail.roundStatus || '—'}</span></div>
                    <div className="casino-detail-row"><span>Outcome Source</span><span>{formatOutcomeSource(selectedDetail.outcomeSource || selectedDetail?.audit?.outcomeSource)}</span></div>
                    <div className="casino-detail-row">
                      <span>Player Outcome</span>
                      <span className={`casino-result-badge result-${toBadgeClass(getPlayerOutcome(selectedDetail))}`}>
                        {getPlayerOutcome(selectedDetail)}
                      </span>
                    </div>
                    <div className="casino-detail-row">
                      <span>Result</span>
                      <span className={`casino-result-badge result-${toBadgeClass(formatRoundResult(selectedDetail))}`}>{formatRoundResult(selectedDetail)}</span>
                    </div>
                    {selectedDetail.playerAction && (
                      <div className="casino-detail-row"><span>Player Action</span><span>{selectedDetail.playerAction}</span></div>
                    )}
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
                    <h4>
                      {isRouletteGame(selectedDetail.game)
                        ? 'Outcome'
                        : selectedDetail.game === 'craps'
                          ? 'Dice'
                          : selectedDetail.game === 'arabian'
                            ? 'Spin'
                            : selectedDetail.game === 'jurassic-run'
                              ? 'Spin'
                            : selectedDetail.game === 'bogeyman'
                              ? 'Spin'
                            : selectedDetail.game === '3card-poker'
                              ? 'Bet Breakdown'
                              : 'Cards'}
                    </h4>
                    {isRouletteGame(selectedDetail.game) ? (
                      <>
                        <div className="casino-detail-row"><span>Number</span><strong>{selectedDetail.rouletteOutcome?.number ?? '—'}</strong></div>
                        <div className="casino-detail-row"><span>Color</span><span>{selectedDetail.rouletteOutcome?.color || '—'}</span></div>
                        <div className="casino-detail-row"><span>Parity</span><span>{selectedDetail.rouletteOutcome?.parity || '—'}</span></div>
                        <div className="casino-detail-row"><span>Range</span><span>{selectedDetail.rouletteOutcome?.range || '—'}</span></div>
                        <div className="casino-detail-row"><span>Dozen</span><span>{selectedDetail.rouletteOutcome?.dozen || '—'}</span></div>
                        <div className="casino-detail-row"><span>Column</span><span>{selectedDetail.rouletteOutcome?.column || '—'}</span></div>
                      </>
                    ) : selectedDetail.game === 'craps' ? (
                      <>
                        <div className="casino-detail-row"><span>Die 1</span><strong>{selectedDetail?.roundData?.dice?.die1 ?? '—'}</strong></div>
                        <div className="casino-detail-row"><span>Die 2</span><strong>{selectedDetail?.roundData?.dice?.die2 ?? '—'}</strong></div>
                        <div className="casino-detail-row"><span>Total</span><strong>{selectedDetail?.roundData?.dice?.sum ?? selectedDetail?.result ?? '—'}</strong></div>
                        <div className="casino-detail-row"><span>State Before</span><span>{selectedDetail?.roundData?.stateBefore || '—'}</span></div>
                        <div className="casino-detail-row"><span>State After</span><span>{selectedDetail?.roundData?.stateAfter || '—'}</span></div>
                        <div className="casino-detail-row"><span>Point Before</span><span>{selectedDetail?.roundData?.pointNumberBefore ?? '—'}</span></div>
                        <div className="casino-detail-row"><span>Point After</span><span>{selectedDetail?.roundData?.pointNumberAfter ?? '—'}</span></div>
                      </>
                    ) : selectedDetail.game === 'arabian' ? (
                      <>
                        <div className="casino-detail-row"><span>Lines</span><strong>{selectedDetail?.roundData?.lineCount ?? selectedDetail?.bets?.lines ?? '—'}</strong></div>
                        <div className="casino-detail-row"><span>Coin Bet</span><strong>{formatMoney(selectedDetail?.roundData?.coinBet ?? selectedDetail?.bets?.coinBet ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Total Spin Bet</span><strong>{formatMoney(selectedDetail?.roundData?.totalBet ?? selectedDetail?.bets?.totalBet ?? selectedDetail?.totalWager ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Line Win</span><strong>{formatMoney(selectedDetail?.roundData?.lineWin ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Bonus Win</span><strong>{formatMoney(selectedDetail?.roundData?.bonusWin ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Free Spins Before</span><span>{selectedDetail?.roundData?.freeSpinsBefore ?? '0'}</span></div>
                        <div className="casino-detail-row"><span>Free Spins Awarded</span><span>{selectedDetail?.roundData?.freeSpinsAwarded ?? '0'}</span></div>
                        <div className="casino-detail-row"><span>Free Spins After</span><span>{selectedDetail?.roundData?.freeSpinsAfter ?? '0'}</span></div>
                        <div className="casino-detail-row"><span>Bonus Triggered</span><span>{selectedDetail?.roundData?.bonusTriggered ? 'Yes' : 'No'}</span></div>
                      </>
                    ) : selectedDetail.game === 'jurassic-run' ? (
                      <>
                        <div className="casino-detail-row"><span>Bet Level</span><strong>{Number(selectedDetail?.roundData?.betId ?? selectedDetail?.bets?.betId ?? 0) + 1}</strong></div>
                        <div className="casino-detail-row"><span>Spin Bet</span><strong>{formatMoney(selectedDetail?.roundData?.bet ?? selectedDetail?.bets?.bet ?? selectedDetail?.totalWager ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Paylines</span><strong>{selectedDetail?.roundData?.activePaylines ?? selectedDetail?.bets?.paylines ?? '10'}</strong></div>
                        <div className="casino-detail-row"><span>Line Bet</span><strong>{formatMoney(selectedDetail?.roundData?.lineBet ?? selectedDetail?.bets?.lineBet ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Line Win</span><strong>{formatMoney(selectedDetail?.roundData?.lineWin ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Jackpot Payout</span><strong>{formatMoney(selectedDetail?.roundData?.jackpotPayout ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Jackpot Before</span><strong>{formatMoney(selectedDetail?.roundData?.jackpotBefore ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Jackpot After</span><strong>{formatMoney(selectedDetail?.roundData?.jackpotAfter ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Free Spins Before</span><span>{selectedDetail?.roundData?.freeSpinsBefore ?? '0'}</span></div>
                        <div className="casino-detail-row"><span>Free Spins Awarded</span><span>{selectedDetail?.roundData?.freeSpinsAwarded ?? '0'}</span></div>
                        <div className="casino-detail-row"><span>Free Spins After</span><span>{selectedDetail?.roundData?.freeSpinsAfter ?? '0'}</span></div>
                        <div className="casino-detail-row"><span>Free Spin Round</span><span>{selectedDetail?.roundData?.isFreeSpinRound ? 'Yes' : 'No'}</span></div>
                      </>
                    ) : selectedDetail.game === 'bogeyman' ? (
                      <>
                        <div className="casino-detail-row"><span>Lines</span><strong>{selectedDetail?.roundData?.lineCount ?? selectedDetail?.bets?.lines ?? '—'}</strong></div>
                        <div className="casino-detail-row"><span>Coin Value</span><strong>{formatMoney(selectedDetail?.roundData?.coinValue ?? selectedDetail?.bets?.coinValue ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Total Spin Bet</span><strong>{formatMoney(selectedDetail?.roundData?.totalBet ?? selectedDetail?.bets?.totalBet ?? selectedDetail?.totalWager ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Coins Won</span><strong>{selectedDetail?.roundData?.coinsWon ?? '0'}</strong></div>
                        <div className="casino-detail-row"><span>Line Win</span><strong>{formatMoney(selectedDetail?.roundData?.lineWin ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Scatters</span><span>{selectedDetail?.roundData?.scatterCount ?? '0'}</span></div>
                        <div className="casino-detail-row"><span>Free Spins Before</span><span>{selectedDetail?.roundData?.freeSpinsBefore ?? '0'}</span></div>
                        <div className="casino-detail-row"><span>Free Spins Awarded</span><span>{selectedDetail?.roundData?.freeSpinsAwarded ?? '0'}</span></div>
                        <div className="casino-detail-row"><span>Free Spins After</span><span>{selectedDetail?.roundData?.freeSpinsAfter ?? '0'}</span></div>
                        <div className="casino-detail-row"><span>Free Spin Round</span><span>{selectedDetail?.roundData?.isFreeSpinRound ? 'Yes' : 'No'}</span></div>
                      </>
                    ) : selectedDetail.game === '3card-poker' ? (
                      <>
                        <div className="casino-detail-row"><span>Ante Bet</span><strong>{formatMoney(selectedDetail?.bets?.Ante ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Play Bet</span><strong>{formatMoney(selectedDetail?.bets?.Play ?? (Number(selectedDetail?.bets?.folded) === 1 ? 0 : (selectedDetail?.bets?.Ante ?? 0)))}</strong></div>
                        <div className="casino-detail-row"><span>Pair Plus Bet</span><strong>{formatMoney(selectedDetail?.bets?.PairPlus ?? 0)}</strong></div>
                        <div className="casino-detail-row"><span>Action</span><span>{Number(selectedDetail?.bets?.folded) === 1 ? 'Folded' : 'Played'}</span></div>
                        <div className="casino-detail-row"><span>Main Result</span><span>{selectedDetail?.roundData?.mainResultLabel || selectedDetail?.result || '—'}</span></div>
                        <div className="casino-detail-row"><span>Player Hand</span><span>{selectedDetail?.playerHand || selectedDetail?.roundData?.playerHand || '—'}</span></div>
                        <div className="casino-detail-row"><span>Dealer Hand</span><span>{selectedDetail?.dealerHand || selectedDetail?.roundData?.dealerHand || '—'}</span></div>
                        <div className="casino-detail-row"><span>Dealer Qualifies</span><span>{selectedDetail?.dealerQualifies ? 'Yes' : 'No'}</span></div>
                        <div className="casino-detail-row"><span>Outcome Source</span><span>{formatOutcomeSource(selectedDetail?.outcomeSource)}</span></div>
                        <div className="casino-detail-stack">
                          <span>Player Cards</span>
                          <div className="casino-card-list">
                            {(selectedDetail.playerCards || []).length > 0
                              ? (selectedDetail.playerCards || []).map((card) => <span className="casino-card-chip" key={`3cp-p-${card}`}>{card}</span>)
                              : <span>—</span>}
                          </div>
                        </div>
                        <div className="casino-detail-stack">
                          <span>Dealer Cards</span>
                          <div className="casino-card-list">
                            {(selectedDetail.dealerCards || []).length > 0
                              ? (selectedDetail.dealerCards || []).map((card) => <span className="casino-card-chip" key={`3cp-d-${card}`}>{card}</span>)
                              : <span>—</span>}
                          </div>
                        </div>
                        <div className="casino-detail-stack">
                          <span>Payout Breakdown</span>
                          <div className="casino-card-list">
                            <span className="casino-card-chip">
                              Ante {formatMoney(selectedDetail?.roundData?.payoutBreakdown?.ante?.returnAmount ?? 0)}
                            </span>
                            <span className="casino-card-chip">
                              Play {formatMoney(selectedDetail?.roundData?.payoutBreakdown?.play?.returnAmount ?? 0)}
                            </span>
                            <span className="casino-card-chip">
                              Pair+ {formatMoney(selectedDetail?.roundData?.payoutBreakdown?.pairPlus?.returnAmount ?? 0)}
                            </span>
                            <span className="casino-card-chip">
                              Ante Bonus {formatMoney(selectedDetail?.roundData?.payoutBreakdown?.anteBonus?.returnAmount ?? 0)}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="casino-detail-stack">
                          <span>
                            {selectedDetail.game === 'baccarat' || selectedDetail.game === 'baccarat-classic' ? `Player (${selectedDetail.playerTotal})` : 'Player'}
                          </span>
                          <div className="casino-card-list">
                            {(selectedDetail.playerCards || []).length > 0
                              ? (selectedDetail.playerCards || []).map((card) => <span className="casino-card-chip" key={`p-${card}`}>{card}</span>)
                              : <span>—</span>}
                          </div>
                        </div>
                        {selectedDetail.game === 'baccarat' || selectedDetail.game === 'baccarat-classic' ? (
                          <div className="casino-detail-stack">
                            <span>Banker ({selectedDetail.bankerTotal})</span>
                            <div className="casino-card-list">
                              {(selectedDetail.bankerCards || []).length > 0
                                ? (selectedDetail.bankerCards || []).map((card) => <span className="casino-card-chip" key={`b-${card}`}>{card}</span>)
                                : <span>—</span>}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="casino-detail-row"><span>Dealer Up Card</span><strong>{selectedDetail.dealerUpCard || '—'}</strong></div>
                            <div className="casino-detail-stack">
                              <span>Dealer</span>
                              <div className="casino-card-list">
                                {(selectedDetail.dealerCards || []).length > 0
                                  ? (selectedDetail.dealerCards || []).map((card) => <span className="casino-card-chip" key={`d-${card}`}>{card}</span>)
                                  : <span>—</span>}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </section>

                  {isRouletteGame(selectedDetail.game) && (
                    <section className="casino-detail-card">
                      <h4>Roulette Bets</h4>
                      <div className="casino-detail-stack">
                        <span>Placed Bets</span>
                        <div className="casino-card-list">
                          {getRouletteBets(selectedDetail).length > 0
                            ? getRouletteBets(selectedDetail).map((bet) => (
                              <span className="casino-card-chip" key={String(bet.key || `${bet.type}-${bet.value}`)}>
                                {getBetDisplayLabel(bet)} {formatMoney(bet.amount)}
                              </span>
                            ))
                            : <span>—</span>}
                        </div>
                      </div>
                      <div className="casino-detail-stack">
                        <span>Winning Bets</span>
                        <div className="casino-card-list">
                          {getWinningRouletteBets(selectedDetail).length > 0
                            ? getWinningRouletteBets(selectedDetail).map((bet) => (
                              <span className="casino-card-chip" key={`win-${String(bet.key || `${bet.type}-${bet.value}`)}`}>
                                {getBetDisplayLabel(bet)} {formatMoney(bet.amount)}
                              </span>
                            ))
                            : <span>No winning bets</span>}
                        </div>
                      </div>
                    </section>
                  )}

                  {selectedDetail.game === 'craps' && (
                    <section className="casino-detail-card">
                      <h4>Craps Bets</h4>
                      <div className="casino-detail-stack">
                        <span>Active Bets Before Roll</span>
                        <div className="casino-card-list">
                          {getCrapsBets(selectedDetail).length > 0
                            ? getCrapsBets(selectedDetail).map((bet) => (
                              <span className="casino-card-chip" key={`craps-bet-${bet.key}`}>
                                {bet.key} {formatMoney(bet.amount)}
                              </span>
                            ))
                            : <span>—</span>}
                        </div>
                      </div>
                      <div className="casino-detail-stack">
                        <span>Resolved Bets</span>
                        <div className="casino-card-list">
                          {Array.isArray(selectedDetail?.betDetails) && selectedDetail.betDetails.length > 0
                            ? selectedDetail.betDetails.map((bet, idx) => (
                              <span className="casino-card-chip" key={`craps-res-${idx}`}>
                                {String(bet?.bet || 'bet')} {String(bet?.outcome || '—')} {formatMoney(bet?.return)}
                              </span>
                            ))
                            : <span>No resolved bets</span>}
                        </div>
                      </div>
                    </section>
                  )}

                  {selectedDetail.game === 'arabian' && (
                    <section className="casino-detail-card">
                      <h4>Arabian Spin Data</h4>
                      <div className="casino-detail-stack">
                        <span>Winning Lines</span>
                        <div className="casino-card-list">
                          {Array.isArray(selectedDetail?.roundData?.winningLines) && selectedDetail.roundData.winningLines.length > 0
                            ? selectedDetail.roundData.winningLines.map((line, idx) => (
                              <span className="casino-card-chip" key={`arabian-line-${idx}`}>
                                L{line?.line ?? '?'} x{line?.num_win ?? '?'} {formatMoney(line?.amount ?? 0)}
                              </span>
                            ))
                            : <span>No winning lines</span>}
                        </div>
                      </div>
                      <div className="casino-detail-stack">
                        <span>Reel Pattern</span>
                        <div className="casino-card-list">
                          {Array.isArray(selectedDetail?.roundData?.pattern) && selectedDetail.roundData.pattern.length > 0
                            ? selectedDetail.roundData.pattern.map((row, idx) => (
                              <span className="casino-card-chip" key={`arabian-pattern-${idx}`}>
                                R{idx + 1}: {Array.isArray(row) ? row.join('-') : '—'}
                              </span>
                            ))
                            : <span>—</span>}
                        </div>
                      </div>
                    </section>
                  )}

                  {selectedDetail.game === 'bogeyman' && (
                    <section className="casino-detail-card">
                      <h4>Bogeyman Spin Data</h4>
                      <div className="casino-detail-stack">
                        <span>Winning Lines</span>
                        <div className="casino-card-list">
                          {Array.isArray(selectedDetail?.roundData?.winningLines) && selectedDetail.roundData.winningLines.length > 0
                            ? selectedDetail.roundData.winningLines.map((line, idx) => (
                              <span className="casino-card-chip" key={`bogeyman-line-${idx}`}>
                                L{line?.line ?? '?'} {line?.count ?? '?'}×{line?.symbol || '—'} {line?.coins ?? '?'} coins
                              </span>
                            ))
                            : <span>No winning lines</span>}
                        </div>
                      </div>
                      <div className="casino-detail-stack">
                        <span>Reel Windows</span>
                        <div className="casino-card-list">
                          {Array.isArray(selectedDetail?.roundData?.reels) && selectedDetail.roundData.reels.length > 0
                            ? selectedDetail.roundData.reels.map((window, idx) => (
                              <span className="casino-card-chip" key={`bogeyman-reel-${idx}`}>
                                R{idx + 1}: {String(window).split('').join('-')}
                              </span>
                            ))
                            : <span>—</span>}
                        </div>
                      </div>
                    </section>
                  )}

                  {selectedDetail.game === 'jurassic-run' && (
                    <section className="casino-detail-card">
                      <h4>Jurassic Run Spin Data</h4>
                      <div className="casino-detail-stack">
                        <span>Winning Lines</span>
                        <div className="casino-card-list">
                          {Array.isArray(selectedDetail?.roundData?.winningLines) && selectedDetail.roundData.winningLines.length > 0
                            ? selectedDetail.roundData.winningLines.map((line, idx) => (
                              <span className="casino-card-chip" key={`jurassic-line-${idx}`}>
                                L{Number(line?.line ?? 0) + 1} x{line?.count ?? '?'} {line?.symbol || '—'} {line?.win ? formatMoney(line.win) : ''}
                              </span>
                            ))
                            : <span>No winning lines</span>}
                        </div>
                      </div>
                      <div className="casino-detail-stack">
                        <span>Reel Symbols</span>
                        <div className="casino-card-list">
                          {Array.isArray(selectedDetail?.roundData?.symbols) && selectedDetail.roundData.symbols.length > 0
                            ? selectedDetail.roundData.symbols.map((column, idx) => (
                              <span className="casino-card-chip" key={`jurassic-col-${idx}`}>
                                C{idx + 1}: {Array.isArray(column) ? column.join('-') : '—'}
                              </span>
                            ))
                            : <span>—</span>}
                        </div>
                      </div>
                    </section>
                  )}

                  {selectedDetail.game === 'blackjack' && (
                    <section className="casino-detail-card">
                      <h4>Blackjack Replay</h4>
                      <div className="casino-detail-stack">
                        <span>Hands</span>
                        <div className="casino-card-list">
                          {Array.isArray(selectedDetail?.betDetails?.hands) && selectedDetail.betDetails.hands.length > 0
                            ? selectedDetail.betDetails.hands.map((hand, idx) => (
                              <span className="casino-card-chip" key={`bj-hand-${idx}`}>
                                {String(hand?.zone || 'hand')} {String(hand?.resultType || '—')} {formatMoney(hand?.bet)} → {formatMoney(hand?.return)}
                              </span>
                            ))
                            : <span>—</span>}
                        </div>
                      </div>
                      <div className="casino-detail-stack">
                        <span>Actions</span>
                        <div className="casino-card-list">
                          {Array.isArray(selectedDetail?.betDetails?.actions) && selectedDetail.betDetails.actions.length > 0
                            ? selectedDetail.betDetails.actions.map((action, idx) => (
                              <span className="casino-card-chip" key={`bj-action-${idx}`}>
                                {String(action?.action || 'action')} {action?.zone ? `(${String(action.zone)})` : ''}
                              </span>
                            ))
                            : <span>No action log</span>}
                        </div>
                      </div>
                      <div className="casino-detail-stack">
                        <span>Side Bets</span>
                        <div className="casino-card-list">
                          {Array.isArray(selectedDetail?.betDetails?.sideBets) && selectedDetail.betDetails.sideBets.length > 0
                            ? selectedDetail.betDetails.sideBets.map((bet, idx) => (
                              <span className="casino-card-chip" key={`bj-side-${idx}`}>
                                {String(bet?.zone || 'zone')} {String(bet?.type || 'side')} {formatMoney(bet?.stake)} → {formatMoney(bet?.return)}
                              </span>
                            ))
                            : <span>No side bets</span>}
                        </div>
                      </div>
                    </section>
                  )}

                  <section className="casino-detail-card">
                    <h4>Settlement</h4>
                    <div className="casino-detail-row"><span>Total Wager</span><strong>{formatMoney(selectedDetail.totalWager)}</strong></div>
                    <div className="casino-detail-row"><span>Total Return</span><strong>{formatMoney(selectedDetail.totalReturn)}</strong></div>
                    <div className="casino-detail-row"><span>Net</span><strong>{formatMoney(selectedDetail.netResult)}</strong></div>
                    {selectedDetail.playerHand && <div className="casino-detail-row"><span>Player Hand</span><span>{selectedDetail.playerHand}</span></div>}
                    {selectedDetail.dealerHand && <div className="casino-detail-row"><span>Dealer Hand</span><span>{selectedDetail.dealerHand}</span></div>}
                    {selectedDetail.dealerQualifies !== null && selectedDetail.dealerQualifies !== undefined && (
                      <div className="casino-detail-row"><span>Dealer Qualifies</span><span>{selectedDetail.dealerQualifies ? 'Yes' : 'No'}</span></div>
                    )}
                    {selectedDetail.payoutApplied && typeof selectedDetail.payoutApplied === 'object' && (
                      <div className="casino-detail-row">
                        <span>Payout Config Applied</span>
                        <code>
                          {Object.entries(selectedDetail.payoutApplied)
                            .map(([key, value]) => `${key}=${value}`)
                            .join(' ')}
                        </code>
                      </div>
                    )}
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
