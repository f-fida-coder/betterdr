import React from 'react';

const formatAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

const prettyMode = (mode) => String(mode || 'straight').replace('_', ' ').toUpperCase();

const BetConfirmationModal = ({
  isOpen,
  betType,
  selections = [],
  wager = 0,
  totalRisk = 0,
  potentialPayout = 0,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const first = selections[0];
  const second = selections[1];
  const isIfBet = betType === 'if_bet';
  const isReverse = betType === 'reverse';

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
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'linear-gradient(180deg, rgba(18,26,43,0.98), rgba(13,19,30,0.98))',
        color: '#fff',
        boxShadow: '0 16px 44px rgba(0,0,0,0.35)',
      }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 12, color: '#9ec6ff', letterSpacing: '0.08em' }}>BET REVIEW</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 3 }}>{prettyMode(betType)}</div>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ fontSize: 13, color: '#b8c3d8', marginBottom: 8 }}>Selections</div>
          <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden' }}>
            {selections.map((selection, idx) => (
              <div
                key={`${selection.matchId || 'sel'}-${idx}`}
                style={{
                  padding: '10px 12px',
                  borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  fontSize: 13,
                }}
              >
                <div style={{ color: '#d8e2f5' }}>{selection.matchName || selection.matchId}</div>
                <div style={{ color: '#ffd776', fontWeight: 700 }}>{selection.selection} @ {formatAmount(selection.odds)}</div>
              </div>
            ))}
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

          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 12, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Wager</span>
              <strong>${formatAmount(wager)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Total Risk</span>
              <strong>${formatAmount(totalRisk)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Potential Payout</span>
              <strong style={{ color: '#7ee7a8' }}>${formatAmount(potentialPayout)}</strong>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.12)',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
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
