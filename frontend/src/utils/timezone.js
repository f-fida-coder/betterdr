// All customer-facing match/bet timestamps render in US Eastern time so a
// player in any browser locale sees the same "site time" the book operates
// in (US sports schedules, grading windows, etc. are all ET-anchored).
export const SITE_TZ = 'America/New_York';
export const SITE_TZ_LABEL = 'ET';

const toDate = (value) => {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

export const formatSiteDateTime = (value) => {
    const d = toDate(value);
    if (!d) return '—';
    const formatted = d.toLocaleString('en-US', {
        timeZone: SITE_TZ,
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
    return `${formatted} ${SITE_TZ_LABEL}`;
};

export const formatSiteTime = (value, { hour12 = true } = {}) => {
    const d = toDate(value);
    if (!d) return '';
    const formatted = d.toLocaleTimeString('en-US', {
        timeZone: SITE_TZ,
        hour: hour12 ? 'numeric' : '2-digit',
        minute: '2-digit',
        hour12,
    });
    return `${formatted} ${SITE_TZ_LABEL}`;
};
