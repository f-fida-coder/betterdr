import React from 'react';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatOdds, formatSpreadValue, formatLineValue } from '../utils/odds';
import { formatSiteDateTime } from '../utils/timezone';
import { useDismissableSurface } from '../hooks/useDismissableSurface';
import { prettyPlayerMarketLabel, isPlayerPropMarket } from '../utils/propBuilderMarkets';
import { mascotName } from '../utils/teamLogos';

// Confirmation-modal money formatter — always 2dp with thousands
// separator. The slip card just below the betslip sheet shows the
// same shape (PARLAY ODDS · RISK · WIN), so they need to match —
// integer-rounded values previously hid the float drift between the
// per-leg-snapped Win basis and the American-int Risk basis (e.g.
// a typed $1000 win previewed as "$997"). Negative inputs clamp to
// 0 so a transient potentialPayout < totalRisk during typing can't
// flash "-0.30".
const formatAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  const safe = n > 0 ? n : 0;
  return safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const prettyMode = (mode) => String(mode || 'straight').replace('_', ' ').toUpperCase();

// One-line leg headline for the review modal — mirrors the pending-bets list
// (MyBetsView.legDescription): mascot-only team + the actual line + odds, and
// drops the literal SPREAD/TOTAL market words (the line itself conveys the
// market). The leg's line value lives on `line` (set at add-to-slip) with
// `point` as a fallback for legs that carry only the placement field.
const legHeadline = (selection = {}, oddsFormat) => {
  const market = String(selection?.marketType || selection?.type || '').toLowerCase();
  const odds = formatOdds(selection.odds, oddsFormat);
  const point = Number.isFinite(Number(selection?.line))
    ? Number(selection.line)
    : (Number.isFinite(Number(selection?.point)) ? Number(selection.point) : null);
  if (market === 'spreads') {
    // <Mascot> <signed line> <odds> → "Yankees -1.5 +133".
    const team = mascotName(selection.selectionFull, selection.selection);
    const line = point === null ? '' : formatSpreadValue(point);
    return [team, line, odds].filter(Boolean).join(' ');
  }
  if (market === 'totals') {
    // Over/Under <line> <odds> → "Over 8.5 -115" (no literal "TOTAL").
    const isUnder = String(selection.selection || '').trim().toLowerCase().startsWith('u');
    const line = point === null ? '' : formatLineValue(Math.abs(point));
    return [isUnder ? 'Under' : 'Over', line, odds].filter(Boolean).join(' ');
  }
  // Player props: keep the full selection (player + side + line) + stat label.
  if (isPlayerPropMarket(selection?.marketType || selection?.type)) {
    const pick = String(selection.selectionFull || selection.selection || '').trim();
    const label = prettyPlayerMarketLabel(selection?.marketType || selection?.type);
    return [pick, label, odds].filter(Boolean).join(' ');
  }
  // moneyline / h2h / fallback → mascot + ML.
  const team = mascotName(selection.selectionFull, selection.selection);
  return [team, 'ML', odds].filter(Boolean).join(' ');
};

const formatGameTime = (selection = {}) => {
  const iso = selection?.matchSnapshot?.startTime
    || selection?.match?.startTime
    || selection?.startTime
    || selection?.commenceTime;
  if (!iso) return '';
  return formatSiteDateTime(iso);
};

const BetConfirmationModal = ({
  isOpen,
  betType,
  selections = [],
  wager = 0,
  totalRisk = 0,
  potentialPayout = 0,
  legStakes = null,
  legWins = null,
  isFreeplay = false,
  isOpenParlay = false,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  const { oddsFormat } = useOddsFormat();
  // Shared dismiss behavior: ESC / browser Back / nav-tab tap close the
  // confirmation sheet. Called before the early return so hook order is stable.
  useDismissableSurface(isOpen, onCancel);
  if (!isOpen) return null;

  const first = selections[0];
  const second = selections[1];
  const isIfBet = betType === 'if_bet';
  const isReverse = betType === 'reverse';
  const isStraight = betType === 'straight';
  // Each STRAIGHT leg is its own bet, so render its own Risk/Win line
  // when the parent passes per-leg stakes.
  const showPerLegStakes = isStraight && Array.isArray(legStakes) && legStakes.length === selections.length;
  const hasLegWins = showPerLegStakes && Array.isArray(legWins) && legWins.length === selections.length;
  // For STRAIGHT mode, prefer the parent-supplied per-leg win sum over
  // recomputing from `potentialPayout - totalRisk`. The recompute drifts
  // by ±$1 when the odds are stored at 2dp precision (e.g. 1.87 instead
  // of exact 1.86956…), making the modal disagree with the actual stored
  // bet which uses American-integer math at placement time.
  const displayedTotalWin = hasLegWins
    ? legWins.reduce((sum, w) => sum + (Number(w) || 0), 0)
    : Math.max(0, potentialPayout - totalRisk);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2100,
      background: 'rgba(5, 9, 20, 0.72)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 520,
        // Cap to viewport so a long selection list stays scrollable inside the
        // modal without pushing the Cancel/Confirm footer off-screen.
        maxHeight: 'calc(100vh - 32px)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'linear-gradient(180deg, rgba(18,26,43,0.98), rgba(13,19,30,0.98))',
        color: '#fff',
        boxShadow: '0 16px 44px rgba(0,0,0,0.35)',
      }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: '#9ec6ff', letterSpacing: '0.08em' }}>BET REVIEW</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 3 }}>{isOpenParlay ? 'OPEN PARLAY' : prettyMode(betType)}</div>
          {isOpenParlay && (
            <div style={{ fontSize: 11, color: '#9aa5bd', marginTop: 6, lineHeight: 1.4 }}>
              Placed open — add more legs before any leg starts. Locks at the
              earliest kickoff; if it has fewer than 2 legs then, it's voided and
              refunded. No freeplay.
            </div>
          )}
        </div>

        <div style={{ padding: 18, overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <div style={{ fontSize: 13, color: '#b8c3d8', marginBottom: 8 }}>Selections</div>
          <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden' }}>
            {selections.map((selection, idx) => {
              const legStake = showPerLegStakes ? Number(legStakes[idx] || 0) : 0;
              // Prefer the parent-supplied legWin (American-integer math)
              // over recomputing from decimal odds — the recompute drifts
              // by ±$1 when odds are stored at 2dp precision.
              const decimalOdds = Number(selection.odds || 0);
              const legWin = hasLegWins
                ? Number(legWins[idx] || 0)
                : (showPerLegStakes && legStake > 0 && decimalOdds > 1
                    ? legStake * (decimalOdds - 1)
                    : 0);
              return (
                <div
                  key={`${selection.matchId || 'sel'}-${idx}`}
                  style={{
                    padding: '10px 12px',
                    borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    fontSize: 13,
                  }}
                >
                  <div style={{ color: '#d8e2f5' }}>{selection.matchName || selection.matchId}</div>
                  <div style={{ color: '#ffd776', fontWeight: 700 }}>
                    {legHeadline(selection, oddsFormat)}
                  </div>
                  {/* ODDS_CHANGED delta chip — mirrors the slip leg's chip so the
                      review step SHOWS the move (old → new) instead of only the
                      new number. priceMovedFrom is display-only slip state set by
                      handleOddsChanged; green when the new price pays more. */}
                  {Number.isFinite(Number(selection.priceMovedFrom))
                    && Math.abs(Number(selection.priceMovedFrom) - Number(selection.odds)) > 1e-9 && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '1px 8px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                        background: Number(selection.odds) >= Number(selection.priceMovedFrom) ? 'rgba(126,231,168,0.16)' : 'rgba(255,255,255,0.08)',
                        color: Number(selection.odds) >= Number(selection.priceMovedFrom) ? '#7ee7a8' : '#9aa5bd',
                      }}>
                        Price updated: {formatOdds(selection.priceMovedFrom, oddsFormat)} → {formatOdds(selection.odds, oddsFormat)}
                      </span>
                    </div>
                  )}
                  {formatGameTime(selection) && (
                    <div style={{ color: '#9aa5bd', fontSize: 11, marginTop: 4 }}>
                      <i className="fa-regular fa-clock" style={{ marginRight: 4 }} />
                      {formatGameTime(selection)}
                    </div>
                  )}
                  {showPerLegStakes && legStake > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 6,
                      fontSize: 12,
                      color: '#b8c3d8',
                    }}>
                      <span>Risk <strong style={{ color: '#fff' }}>${formatAmount(legStake)}</strong></span>
                      <span>Win <strong style={{ color: '#7ee7a8' }}>${formatAmount(legWin)}</strong></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isIfBet && first && second && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#b8c3d8' }}>
              If <strong>{first.selection}</strong> wins, ${formatAmount(wager)} is staked on <strong>{second.selection}</strong>.
            </div>
          )}
          {isReverse && first && second && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#b8c3d8' }}>
              Two IF bets will be placed: <strong>{first.selection} → {second.selection}</strong> and <strong>{second.selection} → {first.selection}</strong>.
            </div>
          )}

          {isFreeplay && (
            <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(11,102,35,0.28)', fontSize: 12, color: '#7ee7a8', fontWeight: 700 }}>
              FREEPLAY BET — Stake from freeplay credits. Only profit credited on win.
            </div>
          )}
          {/* Credit-based summary: only Risk (what they could lose) and Win
              (profit if it hits). "Wager" / "Total Risk" / "Potential Payout"
              were cash-betting framing that misled credit-line players into
              thinking the full payout (stake + profit) was new money. */}
          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 12, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>{isFreeplay ? 'Risk (Freeplay)' : 'Risk'}</span>
              <strong style={isFreeplay ? { color: '#7ee7a8' } : {}}>${formatAmount(totalRisk)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Win</span>
              <strong style={{ color: '#7ee7a8' }}>${formatAmount(displayedTotalWin)}</strong>
            </div>
            {betType === 'parlay' && selections.length > 1 && totalRisk > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: '#b8c3d8' }}>
                  <span>Parlay Odds</span>
                  <strong>{formatOdds(potentialPayout / totalRisk, oddsFormat)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: '#b8c3d8' }}>
                  <span>Legs</span>
                  <strong>{selections.length}</strong>
                </div>
              </>
            )}
            {isFreeplay && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#b8c3d8' }}>
                Win credited to real balance on success.
              </div>
            )}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.12)',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          flexShrink: 0,
        }}>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: 8,
              background: 'transparent',
              color: '#fff',
              padding: '9px 14px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              border: 'none',
              borderRadius: 8,
              background: '#1f7ae0',
              color: '#fff',
              padding: '9px 14px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Placing...' : 'Confirm Bet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetConfirmationModal;
