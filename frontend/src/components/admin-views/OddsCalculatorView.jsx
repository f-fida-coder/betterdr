import React, { useMemo, useState } from 'react';
import { americanToDecimal, decimalToAmerican, roundCombinedToAmericanDecimal } from '../../utils/odds';

// Same rails as ManualBetsView / the placement validators: American odds are
// signed integers with |x| in [100, 50000].
const MIN_ABS_AMERICAN = 100;
const MAX_ABS_AMERICAN = 50000;
// Decimal / implied-probability bounds derived from the American rails:
// -50000 → 1.002, +50000 → 501.
const MIN_DECIMAL = 1 + 100 / MAX_ABS_AMERICAN;
const MAX_DECIMAL = 1 + MAX_ABS_AMERICAN / 100;
const MAX_STAKE = 1000000;

const MIN_PARLAY_LEGS = 2;
const MAX_PARLAY_LEGS = 10;

// ── Formatting ────────────────────────────────────────────────────────────────

// Combined-parlay readout only — thousands separators keep a stacked
// longshot ticket readable (+2,593,742,460,100 beats +2.59e12). Never used
// for input fields; the parsers accept commas but the inputs stay plain.
const fmtAmericanBig = (n) => {
  const rounded = Math.round(Number(n));
  if (!Number.isFinite(rounded)) return '—';
  const text = Math.abs(rounded).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return rounded > 0 ? `+${text}` : `-${text}`;
};

// Whole dollars with thousands separator; keeps cents only when present
// (booked payouts are whole-dollar, but To-Win on a cents stake isn't).
const fmtMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0';
  const hasCents = Math.abs(n - Math.round(n)) >= 0.005;
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })}`;
};

const fmtMoney2dp = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ── Parsing (raw text → validated number or null) ─────────────────────────────

// American inputs are split into MAGNITUDE (the typed digits) + SIGN (the
// [+|−] toggle beside the field) — mobile number keyboards bury the minus
// key, which produced "typed 130, meant +130, saw —" product feedback.
// The toggle is the source of truth for sign; this parses digits only.
const parseMagnitudeText = (raw) => {
  const trimmed = String(raw || '').trim().replace(/,/g, '');
  if (trimmed === '' || !/^\d+$/.test(trimmed)) return null;
  const n = parseInt(trimmed, 10);
  if (n < MIN_ABS_AMERICAN || n > MAX_ABS_AMERICAN) return null;
  return n;
};

// Normalize typed/pasted text for a magnitude field: any explicit sign
// character still works (it flips the toggle — last one typed wins) and
// is stripped from the digits. Returns { text, sign } with sign null when
// the user typed no sign character.
const applySignedText = (raw) => {
  const s = String(raw || '');
  let sign = null;
  for (const ch of s) {
    if (ch === '+') sign = 1;
    else if (ch === '-' || ch === '−') sign = -1;
  }
  return { text: s.replace(/[+\-−\s]/g, ''), sign };
};

const parseDecimalText = (raw) => {
  const trimmed = String(raw || '').trim();
  if (trimmed === '' || !/^\d*\.?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < MIN_DECIMAL || n > MAX_DECIMAL) return null;
  return n;
};

const parseProbText = (raw) => {
  const trimmed = String(raw || '').trim().replace(/%$/, '');
  if (trimmed === '' || !/^\d*\.?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n >= 100) return null;
  // Probability → decimal must land inside the American rails.
  const decimal = 100 / n;
  if (decimal < MIN_DECIMAL || decimal > MAX_DECIMAL) return null;
  return n;
};

const parseStakeText = (raw) => {
  const trimmed = String(raw || '').trim().replace(/,/g, '').replace(/^\$/, '');
  if (trimmed === '' || !/^\d*\.?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_STAKE) return null;
  return Math.round(n * 100) / 100;
};

// Resolve any single input to the canonical American INT — the platform's
// source of truth (bets store oddsAmerican; everything reprices from it).
// Decimal / probability inputs snap through the rounded American integer
// exactly like ModeBetPanel's exactDecimalForLeg, so the calculator never
// shows a price the book wouldn't actually book at.
const toCanonicalAmerican = (field, value) => {
  if (value === null) return null;
  if (field === 'american') return value;
  const decimal = field === 'decimal' ? value : 100 / value;
  const american = decimalToAmerican(decimal);
  if (american === null || Math.abs(american) < MIN_ABS_AMERICAN || Math.abs(american) > MAX_ABS_AMERICAN) {
    return null;
  }
  return american;
};

// ── Shared styles (ManualBetsView admin-view family) ─────────────────────────

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', minHeight: 44, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 15, background: '#fff' };
const inputErrorStyle = { ...inputStyle, border: '1px solid #dc2626' };
const errorTextStyle = { color: '#991b1b', fontSize: 12, marginTop: 4 };
const cardStyle = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#fff', display: 'flex', flexDirection: 'column', gap: 14 };
const readoutLabelStyle = { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' };
const hintStyle = { color: '#64748b', fontSize: 12, marginTop: 2 };

function Readout({ label, value, color = '#0f172a', secondary = null }) {
  return (
    <div style={{ flex: '1 1 140px', minWidth: 120 }}>
      <div style={readoutLabelStyle}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
      {secondary && <div style={hintStyle}>{secondary}</div>}
    </div>
  );
}

// Segmented [+|−] sign picker rendered beside every American-odds input.
// Sign by tap, not by keyboard — the toggle IS the sign; the field holds
// only the digits.
function SignToggle({ sign, onChange }) {
  return (
    <div style={{ display: 'flex', flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
      {[[1, '+'], [-1, '−']].map(([s, label]) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(s)}
          aria-label={s === 1 ? 'Positive (underdog) odds' : 'Negative (favorite) odds'}
          aria-pressed={sign === s}
          style={{
            minHeight: 44, minWidth: 40, border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer',
            background: sign === s ? '#0f172a' : '#fff',
            color: sign === s ? '#fff' : '#64748b',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Tab 1: Converter & Payout ─────────────────────────────────────────────────

function ConverterTab() {
  // Raw text per field so the field being typed in is never rewritten
  // under the user's cursor; the other two always render derived values.
  // American = digits-only magnitude + the sign toggle (default −110,
  // matching the old prefill).
  const [fields, setFields] = useState({ american: '110', decimal: '', prob: '' });
  const [americanSign, setAmericanSign] = useState(-1);
  const [driver, setDriver] = useState('american'); // which field the user last edited
  const [stakeText, setStakeText] = useState('100');

  const americanMagnitude = parseMagnitudeText(fields.american);
  const driverValue = driver === 'american'
    ? (americanMagnitude === null ? null : americanSign * americanMagnitude)
    : driver === 'decimal'
      ? parseDecimalText(fields.decimal)
      : parseProbText(fields.prob);

  const american = toCanonicalAmerican(driver, driverValue);
  // Exact decimal from the canonical American int — identical to the
  // backend's SportsbookBetSupport::americanToDecimalExact basis.
  const decimal = american !== null ? americanToDecimal(american) : null;
  const impliedProb = decimal !== null ? 100 / decimal : null;

  const driverError = fields[driver].trim() !== '' && american === null;
  const errorMessage = driver === 'american'
    ? `Enter odds of ${MIN_ABS_AMERICAN} to ${MAX_ABS_AMERICAN.toLocaleString('en-US')} — pick + or − with the toggle`
    : driver === 'decimal'
      ? `Enter decimal odds from ${MIN_DECIMAL} to ${MAX_DECIMAL}`
      : 'Enter a probability that maps inside ±100…±50000 American (about 0.2%–99.8%)';

  const displayFor = (field) => {
    if (field === driver) return fields[field];
    if (american === null) return '';
    if (field === 'american') return String(Math.abs(american));
    if (field === 'decimal') return Number(decimal.toFixed(4)).toString();
    return `${impliedProb.toFixed(2)}%`;
  };
  // Toggle mirrors the derived sign while decimal/prob drives; editing it
  // makes American the driver again.
  const displayedSign = driver === 'american'
    ? americanSign
    : (american !== null ? (american > 0 ? 1 : -1) : americanSign);

  const onFieldChange = (field, value) => {
    setDriver(field);
    if (field === 'american') {
      const { text, sign } = applySignedText(value);
      setFields((prev) => ({ ...prev, american: text }));
      // Typed sign wins; clearing the field resets to + so a fresh bare
      // number reads positive (product rule 2026-07-06).
      if (sign !== null) setAmericanSign(sign);
      else if (text === '') setAmericanSign(1);
      return;
    }
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  const onAmericanSignChange = (sign) => {
    if (driver !== 'american') {
      // Adopt the currently-derived magnitude so tapping the toggle while
      // decimal/prob drives flips THAT number's sign instead of reviving
      // stale text.
      setFields((prev) => ({ ...prev, american: american !== null ? String(Math.abs(american)) : prev.american }));
      setDriver('american');
    }
    setAmericanSign(sign);
  };

  const stake = parseStakeText(stakeText);
  const stakeError = stakeText.trim() !== '' && stake === null;

  // Whole-dollar booked payout — mirrors calculatePotentialPayout's
  // round($unitStake × exactDecimal) for straights.
  const exactPayout = stake !== null && decimal !== null ? stake * decimal : null;
  const bookedPayout = exactPayout !== null ? Math.round(exactPayout) : null;
  const toWin = bookedPayout !== null ? bookedPayout - stake : null;
  const payoutDiffers = exactPayout !== null && Math.abs(exactPayout - bookedPayout) >= 0.005;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={cardStyle}>
        <div style={{ color: '#64748b', fontSize: 13 }}>
          Type into any one field — the other two convert live. Decimal and probability inputs snap to the nearest whole American number, the same basis bets are booked at.
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px', minWidth: 170 }}>
            <label style={labelStyle}>American</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <SignToggle sign={displayedSign} onChange={onAmericanSignChange} />
              <input
                type="text"
                inputMode="numeric"
                value={displayFor('american')}
                onChange={(e) => onFieldChange('american', e.target.value)}
                placeholder="110"
                style={{ ...(driver === 'american' && driverError ? inputErrorStyle : inputStyle), flex: 1, minWidth: 0 }}
              />
            </div>
          </div>
          <div style={{ flex: '1 1 140px', minWidth: 130 }}>
            <label style={labelStyle}>Decimal</label>
            <input
              type="text"
              inputMode="decimal"
              value={displayFor('decimal')}
              onChange={(e) => onFieldChange('decimal', e.target.value)}
              placeholder="1.91"
              style={driver === 'decimal' && driverError ? inputErrorStyle : inputStyle}
            />
          </div>
          <div style={{ flex: '1 1 140px', minWidth: 130 }}>
            <label style={labelStyle}>Implied Prob %</label>
            <input
              type="text"
              inputMode="decimal"
              value={displayFor('prob')}
              onChange={(e) => onFieldChange('prob', e.target.value)}
              placeholder="52.38"
              style={driver === 'prob' && driverError ? inputErrorStyle : inputStyle}
            />
          </div>
        </div>
        {driverError && <div style={errorTextStyle}>{errorMessage}</div>}
      </div>

      <div style={cardStyle}>
        <div style={{ maxWidth: 220 }}>
          <label style={labelStyle}>Stake</label>
          <input
            type="text"
            inputMode="decimal"
            value={stakeText}
            onChange={(e) => setStakeText(e.target.value)}
            placeholder="100"
            style={stakeError ? inputErrorStyle : inputStyle}
          />
          {stakeError && <div style={errorTextStyle}>Enter a stake from $0.01 to $1,000,000</div>}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Readout label="Risk" value={stake !== null ? fmtMoney(stake) : '—'} color="#dc2626" />
          <Readout label="To Win" value={toWin !== null ? fmtMoney(toWin) : '—'} color="#16a34a" />
          <Readout
            label="Total Payout"
            value={bookedPayout !== null ? fmtMoney(bookedPayout) : '—'}
            secondary={payoutDiffers ? `exact ${fmtMoney2dp(exactPayout)} — books whole-dollar` : null}
          />
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Parlay ─────────────────────────────────────────────────────────────

function ParlayTab() {
  // Each leg = digits-only magnitude + sign toggle. Fresh legs default to
  // + so a bare typed number reads positive (product rule 2026-07-06);
  // the toggle is the source of truth for sign.
  const emptyLeg = () => ({ text: '', sign: 1 });
  const [legInputs, setLegInputs] = useState([emptyLeg(), emptyLeg()]);
  const [stakeText, setStakeText] = useState('100');

  const legs = legInputs.map(({ text, sign }) => {
    const magnitude = parseMagnitudeText(text);
    return magnitude === null ? null : sign * magnitude;
  });
  const allValid = legs.every((n) => n !== null);
  const stake = parseStakeText(stakeText);
  const stakeError = stakeText.trim() !== '' && stake === null;

  // Why the combined shows "—": the first empty/invalid leg, spelled out
  // beside the dashes — silent dashes were the product complaint.
  const firstBadLeg = legs.findIndex((n) => n === null);

  const legsKey = legInputs.map(({ text, sign }) => `${sign}${text}`).join('|');
  const parlay = useMemo(() => {
    if (!allValid) return null;
    // Per-leg exact decimal from the American int, multiplied, then locked
    // to the rounded combined American line — identical to the backend's
    // calculatePotentialPayout parlay branch (exactDecimalForSelection ×
    // legs → roundCombinedToAmericanDecimal) and ModeBetPanel's preview.
    const rawCombined = legs.reduce((acc, n) => acc * americanToDecimal(n), 1);
    const combinedAmerican = decimalToAmerican(rawCombined);
    const lockedCombined = roundCombinedToAmericanDecimal(rawCombined);
    return { rawCombined, combinedAmerican, lockedCombined };
  }, [legsKey, allValid]);

  const exactPayout = parlay && stake !== null ? stake * parlay.lockedCombined : null;
  const bookedPayout = exactPayout !== null ? Math.round(exactPayout) : null;
  const toWin = bookedPayout !== null ? bookedPayout - stake : null;
  const payoutDiffers = exactPayout !== null && Math.abs(exactPayout - bookedPayout) >= 0.005;
  const combinedSnapped = parlay && Math.abs(parlay.lockedCombined - parlay.rawCombined) >= 0.00005;

  const setLegText = (index, value) => {
    const { text, sign } = applySignedText(value);
    setLegInputs((prev) => prev.map((leg, i) => {
      if (i !== index) return leg;
      // Typed sign wins; clearing the field resets to + so a fresh bare
      // number reads positive.
      const nextSign = sign !== null ? sign : (text === '' ? 1 : leg.sign);
      return { text, sign: nextSign };
    }));
  };
  const setLegSign = (index, sign) => {
    setLegInputs((prev) => prev.map((leg, i) => (i === index ? { ...leg, sign } : leg)));
  };
  const addLeg = () => setLegInputs((prev) => (prev.length < MAX_PARLAY_LEGS ? [...prev, emptyLeg()] : prev));
  const removeLeg = (index) => setLegInputs((prev) => (prev.length > MIN_PARLAY_LEGS ? prev.filter((_, i) => i !== index) : prev));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={cardStyle}>
        <div style={{ color: '#64748b', fontSize: 13 }}>
          American odds per leg ({MIN_PARLAY_LEGS}–{MAX_PARLAY_LEGS} legs). Combined price locks to the rounded American line — the same number the book stores and settles at.
        </div>
        {legInputs.map(({ text, sign }, index) => {
          const invalid = text.trim() !== '' && legs[index] === null;
          return (
            <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 48px', paddingTop: 12, fontSize: 13, fontWeight: 700, color: '#475569' }}>
                Leg {index + 1}
              </div>
              <SignToggle sign={sign} onChange={(s) => setLegSign(index, s)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={text}
                  onChange={(e) => setLegText(index, e.target.value)}
                  placeholder="110"
                  style={invalid ? inputErrorStyle : inputStyle}
                />
                {invalid && (
                  <div style={errorTextStyle}>
                    Enter odds of {MIN_ABS_AMERICAN} to {MAX_ABS_AMERICAN.toLocaleString('en-US')}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeLeg(index)}
                disabled={legInputs.length <= MIN_PARLAY_LEGS}
                aria-label={`Remove leg ${index + 1}`}
                style={{
                  flexShrink: 0, minHeight: 44, minWidth: 44, border: '1px solid #cbd5e1', borderRadius: 6,
                  background: '#fff', fontSize: 16, cursor: legInputs.length <= MIN_PARLAY_LEGS ? 'not-allowed' : 'pointer',
                  color: legInputs.length <= MIN_PARLAY_LEGS ? '#cbd5e1' : '#64748b',
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addLeg}
          disabled={legInputs.length >= MAX_PARLAY_LEGS}
          style={{
            alignSelf: 'flex-start', minHeight: 44, padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13,
            border: '1px solid #cbd5e1', background: '#fff', color: legInputs.length >= MAX_PARLAY_LEGS ? '#cbd5e1' : '#0f172a',
            cursor: legInputs.length >= MAX_PARLAY_LEGS ? 'not-allowed' : 'pointer',
          }}
        >
          + Add Leg
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Readout
            label="Combined American"
            value={parlay ? fmtAmericanBig(parlay.combinedAmerican) : '—'}
          />
          <Readout
            label="Combined Decimal"
            value={parlay ? parlay.lockedCombined.toFixed(2) : '—'}
            secondary={combinedSnapped ? `raw ${parlay.rawCombined.toFixed(4)} before American-line lock` : null}
          />
        </div>
        {!parlay && firstBadLeg !== -1 && (
          <div style={{ color: '#9a3412', fontSize: 12, fontWeight: 600 }}>
            Leg {firstBadLeg + 1}: enter odds of {MIN_ABS_AMERICAN} to {MAX_ABS_AMERICAN.toLocaleString('en-US')} — pick + or − with the toggle
          </div>
        )}
        <div style={{ maxWidth: 220 }}>
          <label style={labelStyle}>Stake</label>
          <input
            type="text"
            inputMode="decimal"
            value={stakeText}
            onChange={(e) => setStakeText(e.target.value)}
            placeholder="100"
            style={stakeError ? inputErrorStyle : inputStyle}
          />
          {stakeError && <div style={errorTextStyle}>Enter a stake from $0.01 to $1,000,000</div>}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Readout label="Risk" value={stake !== null ? fmtMoney(stake) : '—'} color="#dc2626" />
          <Readout label="To Win" value={toWin !== null ? fmtMoney(toWin) : '—'} color="#16a34a" />
          <Readout
            label="Total Payout"
            value={bookedPayout !== null ? fmtMoney(bookedPayout) : '—'}
            secondary={payoutDiffers ? `exact ${fmtMoney2dp(exactPayout)} — books whole-dollar` : null}
          />
        </div>
      </div>
    </div>
  );
}

// ── View shell ────────────────────────────────────────────────────────────────

function OddsCalculatorView() {
  const [tab, setTab] = useState('convert');

  return (
    <div className="odds-calculator-wrap" style={{ padding: '16px 20px', maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Odds Calculator</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Uses the exact conversion and payout math the book places and settles with. Nothing here touches balances or places bets.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['convert', 'Converter & Payout'], ['parlay', 'Parlay']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                padding: '8px 14px', minHeight: 44, borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer',
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

      {tab === 'convert' ? <ConverterTab /> : <ParlayTab />}
    </div>
  );
}

export default OddsCalculatorView;
