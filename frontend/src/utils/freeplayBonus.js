const roundMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

const roundPercent = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 10000) / 10000;
};

const toNumberOr = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const resolveDepositFreeplayBonusPreview = (user, depositAmount) => {
  const settings = (user && typeof user === 'object' && user.settings && typeof user.settings === 'object')
    ? user.settings
    : {};

  const percentSource = settings.freePlayPercent ?? user?.freePlayPercent ?? 20;
  const percent = roundPercent(Math.max(0, toNumberOr(percentSource, 20)));
  const normalizedDeposit = roundMoney(Math.max(0, toNumberOr(depositAmount, 0)));

  const capSource = settings.maxFpCredit ?? user?.maxFpCredit ?? null;
  const capRaw = toNumberOr(capSource === null ? 500 : capSource, 500);
  const unlimited = capSource !== null && capRaw < 0;
  const cap = roundMoney(Math.max(0, capRaw));

  const rawBonus = roundMoney(normalizedDeposit * (percent / 100));
  let bonusAmount = 0;

  if (percent > 0 && rawBonus > 0) {
    if (unlimited) {
      bonusAmount = rawBonus;
    } else if (cap > 0) {
      bonusAmount = Math.min(rawBonus, cap);
    } else {
      bonusAmount = Math.min(rawBonus, 500);
    }
  }

  return {
    bonusAmount: roundMoney(Math.max(0, bonusAmount)),
    percent,
    cap,
    depositAmount: normalizedDeposit,
    unlimited,
  };
};
