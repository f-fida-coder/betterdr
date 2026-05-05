// All customer-facing match/bet timestamps render in a single "site
// timezone" so a player in any browser locale sees the same time the
// book operates in. Defaults to US Eastern (the schedule anchor for
// every US sports market), but each player can override the choice
// in their Account preferences — `getSiteTimezone()` reads that
// override out of localStorage on every format call.
export const DEFAULT_SITE_TZ = 'America/New_York';

// Curated list of zones the Account → Preferences dropdown offers.
// Stored as IANA strings + a short label that follows the timestamp
// ("6:10 PM ET"). Order matches the operator's customer base — US
// zones first, then a couple of common international fallbacks.
export const SITE_TZ_OPTIONS = [
    { value: 'America/New_York',    label: 'ET' },
    { value: 'America/Chicago',     label: 'CT' },
    { value: 'America/Denver',      label: 'MT' },
    { value: 'America/Phoenix',     label: 'MST' },
    { value: 'America/Los_Angeles', label: 'PT' },
    { value: 'America/Anchorage',   label: 'AKT' },
    { value: 'Pacific/Honolulu',    label: 'HST' },
    { value: 'UTC',                 label: 'UTC' },
];

const STORAGE_KEY = 'site:timezone';
const TZ_LABEL_BY_VALUE = SITE_TZ_OPTIONS.reduce((acc, opt) => {
    acc[opt.value] = opt.label;
    return acc;
}, {});

const isValidTz = (tz) => Boolean(tz && TZ_LABEL_BY_VALUE[tz]);

export const getSiteTimezone = () => {
    if (typeof window === 'undefined') return DEFAULT_SITE_TZ;
    try {
        const stored = window.localStorage?.getItem(STORAGE_KEY);
        if (isValidTz(stored)) return stored;
    } catch (_) {
        // localStorage may be blocked (private mode etc.) — fall through.
    }
    return DEFAULT_SITE_TZ;
};

export const setSiteTimezone = (tz) => {
    if (typeof window === 'undefined') return DEFAULT_SITE_TZ;
    const normalized = isValidTz(tz) ? tz : DEFAULT_SITE_TZ;
    try {
        window.localStorage?.setItem(STORAGE_KEY, normalized);
    } catch (_) {
        // Same as above — swallow storage errors.
    }
    // Notify any mounted view that wants to re-render its visible
    // timestamps without a navigation. Listeners typically bump a
    // dedicated state counter to force a render.
    try {
        window.dispatchEvent(new CustomEvent('siteTimezone:change', { detail: normalized }));
    } catch (_) {}
    return normalized;
};

export const getSiteTimezoneLabel = (tz = getSiteTimezone()) => TZ_LABEL_BY_VALUE[tz] || 'ET';

const toDate = (value) => {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

export const formatSiteDateTime = (value) => {
    const d = toDate(value);
    if (!d) return '—';
    const tz = getSiteTimezone();
    const formatted = d.toLocaleString('en-US', {
        timeZone: tz,
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
    return `${formatted} ${getSiteTimezoneLabel(tz)}`;
};

export const formatSiteTime = (value, { hour12 = true } = {}) => {
    const d = toDate(value);
    if (!d) return '';
    const tz = getSiteTimezone();
    const formatted = d.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: hour12 ? 'numeric' : '2-digit',
        minute: '2-digit',
        hour12,
    });
    return `${formatted} ${getSiteTimezoneLabel(tz)}`;
};
