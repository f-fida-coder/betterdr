export const normalizeIdentityName = (value) => String(value || '').toUpperCase();

export const formatUsPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

const compactIdentityToken = (value) => String(value || '').replace(/[^A-Z0-9]/g, '');

const lastFourPhoneDigits = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.slice(-4);
};

export const generateIdentityPassword = (firstName, lastName, phoneNumber, fallbackUsername = '') => {
  const firstToken = compactIdentityToken(normalizeIdentityName(firstName));
  const lastToken = compactIdentityToken(normalizeIdentityName(lastName));
  const last4 = lastFourPhoneDigits(phoneNumber);

  if (last4 === '') return '';

  if (firstToken !== '' && lastToken !== '') {
    return `${firstToken.slice(0, 3)}${lastToken.slice(0, 3)}${last4}`.toUpperCase();
  }

  const fallback = compactIdentityToken(normalizeIdentityName(fallbackUsername));
  if (fallback !== '') {
    return `${fallback.slice(0, 6)}${last4}`.toUpperCase();
  }

  return '';
};
