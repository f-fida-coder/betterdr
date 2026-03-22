const CASINO_GAME_LABELS = {
  casino_baccarat: 'Baccarat',
  casino_blackjack: 'Blackjack',
  casino_craps: 'Craps',
  casino_roulette: 'Roulette',
  casino_stud_poker: 'Stud Poker',
};

const DEBIT_TYPES = new Set([
  'withdrawal',
  'bet_placed',
  'bet_lost',
  'fee',
  'debit',
  'casino_bet_debit',
]);

const CREDIT_TYPES = new Set([
  'deposit',
  'bet_won',
  'bet_refund',
  'credit',
  'credit_adj',
  'casino_bet_credit',
  'fp_deposit',
]);

const normalize = (value) => String(value || '').trim().toLowerCase();
const normalizeReason = (value) => String(value || '').trim().toUpperCase();
const FREEPLAY_BALANCE_REASONS = new Set([
  'FREEPLAY_ADJUSTMENT',
  'DEPOSIT_FREEPLAY_BONUS',
  'REFERRAL_FREEPLAY_BONUS',
]);

const casinoGamePrefix = (txn) => {
  const sourceType = normalize(txn?.sourceType);
  return CASINO_GAME_LABELS[sourceType] || '';
};

const isFreeplayBalanceTransaction = (txn) => {
  const type = normalize(txn?.type);
  const reason = normalizeReason(txn?.reason);
  return type === 'fp_deposit' || FREEPLAY_BALANCE_REASONS.has(reason);
};

const isDebitByDirection = (txn) => {
  const entrySide = String(txn?.entrySide || '').trim().toUpperCase();
  if (entrySide === 'DEBIT') return true;
  if (entrySide === 'CREDIT') return false;

  const balanceBefore = Number(txn?.balanceBefore);
  const balanceAfter = Number(txn?.balanceAfter);
  if (Number.isFinite(balanceBefore) && Number.isFinite(balanceAfter)) {
    return balanceAfter < balanceBefore;
  }

  return Number(txn?.amount || 0) < 0;
};

export const formatTransactionType = (txn) => {
  const type = normalize(txn?.type);
  const gamePrefix = casinoGamePrefix(txn);
  const reason = normalizeReason(txn?.reason);

  if (isFreeplayBalanceTransaction(txn)) {
    return isDebitByDirection(txn) ? 'Freeplay Withdrawal' : 'Freeplay Deposit';
  }

  switch (type) {
    case 'deposit':
      return 'Deposit';
    case 'withdrawal':
      return 'Withdrawal';
    case 'bet_placed':
      return 'Sportsbook Wager';
    case 'bet_won':
      return 'Sportsbook Payout';
    case 'bet_refund':
      return 'Sportsbook Refund';
    case 'casino_bet_debit':
      return gamePrefix ? `${gamePrefix} Wager` : 'Casino Wager';
    case 'casino_bet_credit':
      return gamePrefix ? `${gamePrefix} Payout` : 'Casino Payout';
    case 'credit_adj':
      return 'Credit Adjustment';
    case 'adjustment':
      if (reason === 'ADMIN_CREDIT_ADJUSTMENT') return 'Credit Adj';
      if (reason === 'ADMIN_DEBIT_ADJUSTMENT') return 'Debit Adj';
      if (reason === 'ADMIN_PROMOTIONAL_CREDIT') return 'Promotional Credit';
      if (reason === 'ADMIN_PROMOTIONAL_DEBIT') return 'Promotional Debit';
      return 'Adjustment';
    default:
      return String(txn?.type || 'Transaction');
  }
};

export const isDebitTransaction = (txn) => {
  const entrySide = String(txn?.entrySide || '').trim().toUpperCase();
  if (entrySide === 'DEBIT') return true;
  if (entrySide === 'CREDIT') return false;

  const type = normalize(txn?.type);
  if (type === 'adjustment') {
    const reason = String(txn?.reason || '').trim().toUpperCase();
    if (reason === 'ADMIN_DEBIT_ADJUSTMENT' || reason === 'ADMIN_PROMOTIONAL_DEBIT') {
      return true;
    }
    if (reason === 'ADMIN_CREDIT_ADJUSTMENT' || reason === 'ADMIN_PROMOTIONAL_CREDIT') {
      return false;
    }

    const balanceBefore = Number(txn?.balanceBefore);
    const balanceAfter = Number(txn?.balanceAfter);
    if (Number.isFinite(balanceBefore) && Number.isFinite(balanceAfter)) {
      return balanceAfter < balanceBefore;
    }
  }

  if (DEBIT_TYPES.has(type)) return true;
  if (CREDIT_TYPES.has(type)) return false;

  return Number(txn?.amount || 0) < 0;
};

export const isWagerTransaction = (txn) => {
  const type = normalize(txn?.type);
  return type === 'bet_placed' || type === 'casino_bet_debit';
};
