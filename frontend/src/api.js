const DEFAULT_PROD_API_URL = '/api/index.php?path=';

/**
 * For same-person MA/agent pairs (e.g., NJG365MA and NJG365),
 * returns combined display name like "NJG365MA/NJG365".
 * If no counterpart exists, returns the username as-is.
 *
 * @param {string} username - The agent username to display
 * @param {Array} agents - List of all agents (each with a .username field)
 * @returns {string} Combined display name or original username
 */
export function linkedAgentName(username, agents) {
  if (!username) return '';
  const upper = String(username).toUpperCase();
  if (!agents || !Array.isArray(agents) || agents.length === 0) return upper;

  if (upper.endsWith('MA')) {
    const base = upper.slice(0, -2);
    const linked = agents.find((a) => String(a.username || '').toUpperCase() === base);
    if (linked) return `${upper}/${base}`;
  } else {
    const maName = upper + 'MA';
    const linked = agents.find((a) => String(a.username || '').toUpperCase() === maName);
    if (linked) return `${maName}/${upper}`;
  }
  return upper;
}

const normalizeApiUrl = (url) => {
    if (!url) return '';
    const normalized = String(url).replace(/\/+$/, '');
    if (normalized.includes('?path=')) {
        return normalized;
    }
    if (/\/api\/index\.php$/i.test(normalized) || /\/index\.php$/i.test(normalized) || /\/api$/i.test(normalized)) {
        return normalized;
    }
    return normalized + '/api';
};

const getBaseUrl = () => {
    // `import.meta.env` is Vite-injected; guard with `?.` so this
    // module is importable by raw Node (test scripts, scripts/*) too
    // without crashing at module-load time.
    const env = import.meta.env ?? {};
    const configuredUrl = normalizeApiUrl(env.VITE_API_URL);
    if (configuredUrl) {
        return configuredUrl;
    }

    // In development, use Vite proxy so browser only talks to frontend port (5173).
    if (env.DEV) {
        return '/api';
    }

    return normalizeApiUrl(DEFAULT_PROD_API_URL);
};

export const API_URL = getBaseUrl();
const isPathStyleApi = API_URL.includes('?path=');

export const buildApiUrl = (path = '', params = null) => {
    const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
    const queryString =
        params && Object.keys(params).length > 0
            ? new URLSearchParams(params).toString()
            : '';

    if (isPathStyleApi) {
        const baseWithPath = `${API_URL}${normalizedPath}`;
        if (!queryString) return baseWithPath;
        return `${baseWithPath}&${queryString}`;
    }

    const baseWithPath = `${API_URL}${normalizedPath}`;
    if (!queryString) return baseWithPath;
    return `${baseWithPath}?${queryString}`;
};

export const BACKEND_BASE_URL = API_URL.replace(/\/api\/?$/, '');
export const normalizeBetMode = (mode) => String(mode || 'straight').toLowerCase().replace(/-/g, '_').trim();
export const createRequestId = () => {
    const randomChunk = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 20)
        : Math.random().toString(36).slice(2, 14);
    return `bet_${Date.now().toString(36)}_${randomChunk}`;
};

const getHeaders = (token = null) => {
    const headers = {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Remainder': 'true'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const AUTH_CACHE_TTL_MS = 15_000;

const normalizeStoredRole = (role = '') => String(role || '').toLowerCase().trim();

export const getStoredAuthToken = () => {
    try {
        return String(localStorage.getItem('token') || sessionStorage.getItem('token') || '').trim();
    } catch {
        return '';
    }
};

export const getStoredUserRole = () => {
    try {
        return normalizeStoredRole(localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || '');
    } catch {
        return '';
    }
};

export const syncStoredAuth = ({ token = '', role = '', mirrorToSession = false } = {}) => {
    const safeToken = String(token || '').trim();
    const safeRole = normalizeStoredRole(role);

    try {
        if (safeToken) {
            localStorage.setItem('token', safeToken);
            if (mirrorToSession) {
                sessionStorage.setItem('token', safeToken);
            }
        }
        if (safeRole) {
            localStorage.setItem('userRole', safeRole);
            if (mirrorToSession) {
                sessionStorage.setItem('userRole', safeRole);
            }
        }
    } catch {
        // Ignore storage failures in restricted/private browser contexts.
    }
};

const readAuthUserFromPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return null;
    const { token: _token, message: _message, ...user } = payload;
    return Object.keys(user).length > 0 ? user : null;
};

const isFreshCacheEntry = (entry, ttlMs = AUTH_CACHE_TTL_MS) => (
    Boolean(entry) && (Date.now() - entry.createdAt) < ttlMs
);

// Reads the csrf_token cookie set by the backend after login/refresh/session restore.
// The backend issues this as a readable (non-httpOnly) cookie so JS can echo it back
// as X-CSRF-Token on state-changing cookie-auth requests (Double Submit Cookie pattern).
export const getCsrfToken = () => {
    try {
        const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    } catch {
        return '';
    }
};

const createDuplicatePlayerError = (payload, fallbackMessage, status = 409) => {
    const error = new Error(payload?.message || fallbackMessage);
    error.status = status;
    error.code = payload?.code || 'DUPLICATE_PLAYER';
    error.isDuplicate = true;
    error.duplicate = true;
    error.normalized = payload?.normalized || null;
    error.duplicateMatches = Array.isArray(payload?.matches) ? payload.matches : [];
    error.details = payload || null;
    return error;
};

const parseJsonResponse = async (response, fallbackMessage) => {
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const isJson = contentType.includes('application/json');
    const rawText = await response.text();

    let payload = null;
    if (isJson && rawText) {
        try {
            payload = JSON.parse(rawText);
        } catch {
            payload = null;
        }
    }

    if (!response.ok) {
        const errorMessage =
            payload?.message ||
            (rawText && !isJson ? `${fallbackMessage}: received HTML/non-JSON response from ${response.url}` : fallbackMessage);
        const error = new Error(errorMessage);
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    if (isJson) {
        if (!rawText) return {};
        try {
            return JSON.parse(rawText);
        } catch {
            throw new Error(`${fallbackMessage}: server returned invalid JSON`);
        }
    }

    throw new Error(`${fallbackMessage}: expected JSON but received non-JSON response from ${response.url}`);
};

// ─── Token refresh ───────────────────────────────────────────────────────────
// Calls POST /api/auth/refresh with the current token and returns the new one.
// Called automatically by fetchWithRefresh() when a 401 is received.
let _refreshPromise = null; // deduplicate concurrent refresh calls

export const refreshToken = async (token) => {
    // If we have an in-memory token, send it as Bearer (CSRF-safe path).
    // If not, fall back to cookie auth and include the CSRF header.
    const headers = token
        ? getHeaders(token)
        : { 'Content-Type': 'application/json', 'Bypass-Tunnel-Remainder': 'true', 'X-CSRF-Token': getCsrfToken() };

    const response = await fetch(buildApiUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include', // needed for cookie-auth fallback
        headers,
    });
    if (!response.ok) throw new Error('Session expired. Please log in again.');
    const data = await response.json();
    if (!data.token) throw new Error('Session expired. Please log in again.');
    return data.token;
};

// Wrapper: makes a fetch call and, on a 401, attempts one token refresh then retries.
// Usage is identical to fetch() but also accepts a `token` option.
// On refresh success it saves the new token to localStorage under the same key
// the app uses ('token' or scoped by userId).
export const fetchWithRefresh = async (url, options = {}) => {
    const { token, ...fetchOptions } = options;
    let response = await fetch(url, {
        ...fetchOptions,
        headers: { ...getHeaders(token), ...(fetchOptions.headers || {}) },
    });

    if (response.status === 401 && token) {
        // Deduplicate: if a refresh is already in-flight, wait for it.
        if (!_refreshPromise) {
            _refreshPromise = refreshToken(token).finally(() => { _refreshPromise = null; });
        }
        let newToken;
        try {
            newToken = await _refreshPromise;
        } catch {
            // Refresh failed — propagate original 401 so caller can log out.
            return response;
        }
        // Persist the new token using the same key the app already uses.
        try {
            const stored = localStorage.getItem('token');
            if (stored) localStorage.setItem('token', newToken);
        } catch { /* ignore */ }
        // Retry original request with fresh token.
        response = await fetch(url, {
            ...fetchOptions,
            headers: { ...getHeaders(newToken), ...(fetchOptions.headers || {}) },
        });
    }

    return response;
};
// ─────────────────────────────────────────────────────────────────────────────

let _authBootstrapPromise = null;
let _authBootstrapPromiseKey = '';
let _authBootstrapCache = null;

export const clearAuthBootstrapCache = () => {
    _authBootstrapPromise = null;
    _authBootstrapPromiseKey = '';
    _authBootstrapCache = null;
};

export const primeAuthBootstrapCache = ({ token = '', role = '', user = null, source = 'manual' } = {}) => {
    const safeToken = String(token || '').trim();
    if (!safeToken) return;

    _authBootstrapCache = {
        key: `token:${safeToken}`,
        createdAt: Date.now(),
        value: {
            token: safeToken,
            role: normalizeStoredRole(role || user?.role),
            user,
            source,
        },
    };
};

// Restore session from httpOnly cookie on page reload (GET — no CSRF token needed).
export const getSession = async (options = {}) => {
    const timeoutMs = Number.isFinite(options?.timeoutMs) ? Number(options.timeoutMs) : 8000;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), Math.max(1000, timeoutMs)) : null;

    try {
        const response = await fetch(buildApiUrl('/auth/session'), {
            method: 'GET',
            credentials: 'include', // sends the auth_token httpOnly cookie
            headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Remainder': 'true' },
            signal: controller?.signal
        });
        return parseJsonResponse(response, 'Session restore failed');
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error('Session restore timed out');
            timeoutError.status = 408;
            throw timeoutError;
        }
        throw error;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

// Clears the httpOnly cookie server-side.
// Sends X-CSRF-Token because this is a state-changing cookie-auth request.
export const logoutSession = async () => {
    try {
        await fetch(buildApiUrl('/auth/logout'), {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Remainder': 'true',
                'X-CSRF-Token': getCsrfToken(),
            },
        });
    } catch { /* best-effort */ }
};

export const loginUser = async (username, password) => {
    const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password })
    });
    const data = await parseJsonResponse(response, 'Login failed');
    if (data?.token) {
        const user = readAuthUserFromPayload(data);
        primeMeCache(data.token, user);
        primeAuthBootstrapCache({ token: data.token, role: data.role, user, source: 'login' });
    }
    return data;
};

export const loginAdmin = async (username, password) => {
    const response = await fetch(buildApiUrl('/auth/admin/login'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password })
    });
    const data = await parseJsonResponse(response, 'Admin login failed');
    if (data?.token) {
        const user = readAuthUserFromPayload(data);
        primeMeCache(data.token, user);
        primeAuthBootstrapCache({ token: data.token, role: data.role, user, source: 'admin-login' });
    }
    return data;
};

export const loginAgent = async (username, password) => {
    const response = await fetch(buildApiUrl('/auth/agent/login'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password })
    });
    const data = await parseJsonResponse(response, 'Agent login failed');
    if (data?.token) {
        const user = readAuthUserFromPayload(data);
        primeMeCache(data.token, user);
        primeAuthBootstrapCache({ token: data.token, role: data.role, user, source: 'agent-login' });
    }
    return data;
};

export const registerUser = async (userData) => {
    try {
        const response = await fetch(buildApiUrl('/auth/register'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        return data;
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error('Network error - Unable to reach server');
        }
        throw error;
    }
};

export const getBalance = async (token) => {
    const response = await fetch(buildApiUrl('/wallet/balance'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch balance');
    return response.json();
};

const meRequestCache = new Map();
const meResponseCache = new Map();

export const primeMeCache = (token, user) => {
    const cacheKey = String(token || '').trim();
    if (!cacheKey || !user || typeof user !== 'object') return;

    meResponseCache.set(cacheKey, {
        createdAt: Date.now(),
        value: user,
    });
};

export const invalidateMeCache = (token = '') => {
    const cacheKey = String(token || '').trim();

    if (cacheKey) {
        meRequestCache.delete(cacheKey);
        meResponseCache.delete(cacheKey);
        return;
    }

    meRequestCache.clear();
    meResponseCache.clear();
};

export const bootstrapAuthSession = async (options = {}) => {
    const timeoutMs = Number.isFinite(options?.timeoutMs) ? Number(options.timeoutMs) : 8000;
    const token = getStoredAuthToken();
    const cacheKey = token ? `token:${token}` : 'no-token';

    if (isFreshCacheEntry(_authBootstrapCache) && _authBootstrapCache?.key === cacheKey) {
        return _authBootstrapCache.value;
    }

    if (_authBootstrapPromise && _authBootstrapPromiseKey === cacheKey) {
        return _authBootstrapPromise;
    }

    _authBootstrapPromiseKey = cacheKey;
    _authBootstrapPromise = (async () => {
        try {
            if (token) {
                const me = await getMe(token, { timeoutMs });
                const value = {
                    token,
                    role: normalizeStoredRole(me?.role || getStoredUserRole()),
                    user: me,
                    source: 'token',
                };
                syncStoredAuth({ token, role: value.role });
                _authBootstrapCache = {
                    key: cacheKey,
                    createdAt: Date.now(),
                    value,
                };
                return value;
            }

            const session = await getSession({ timeoutMs });
            if (!session?.token) {
                _authBootstrapCache = {
                    key: cacheKey,
                    createdAt: Date.now(),
                    value: null,
                };
                return null;
            }

            const value = {
                token: String(session.token).trim(),
                role: normalizeStoredRole(session.role),
                user: readAuthUserFromPayload(session),
                source: 'cookie',
            };
            syncStoredAuth({ token: value.token, role: value.role });
            _authBootstrapCache = {
                key: `token:${value.token}`,
                createdAt: Date.now(),
                value,
            };
            return value;
        } finally {
            _authBootstrapPromise = null;
            _authBootstrapPromiseKey = '';
        }
    })();

    return _authBootstrapPromise;
};

export const getMe = async (token, options = {}) => {
    const timeoutMs = Number.isFinite(options?.timeoutMs) ? Number(options.timeoutMs) : 30000;
    const cacheKey = token || '';
    const useCache = options?.useCache !== false;

    if (cacheKey && useCache) {
        const cached = meResponseCache.get(cacheKey);
        if (isFreshCacheEntry(cached)) {
            return cached.value;
        }
        meResponseCache.delete(cacheKey);
    }

    if (cacheKey && meRequestCache.has(cacheKey)) {
        return meRequestCache.get(cacheKey);
    }

    const requestPromise = (async () => {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), Math.max(1000, timeoutMs)) : null;

        try {
            const response = await fetch(buildApiUrl('/auth/me'), {
                headers: getHeaders(token),
                signal: controller?.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.message || 'Failed to fetch user profile');
                error.status = response.status;
                throw error;
            }

            const user = await response.json();
            if (cacheKey) {
                primeMeCache(cacheKey, user);
            }
            return user;
        } catch (error) {
            if (error?.name === 'AbortError') {
                const timeoutError = new Error('Session validation timed out. Please try again.');
                timeoutError.status = 408;
                throw timeoutError;
            }
            throw error;
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            if (cacheKey) meRequestCache.delete(cacheKey);
        }
    })();

    if (cacheKey) {
        meRequestCache.set(cacheKey, requestPromise);
    }

    return requestPromise;
};

export const updateProfile = async (profileData, token) => {
    const response = await fetch(buildApiUrl('/auth/profile'), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(profileData)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
    }
    const data = await response.json();
    if (token && data?.user) {
        primeMeCache(token, data.user);
        primeAuthBootstrapCache({ token, role: data.user.role, user: data.user, source: 'profile-update' });
    }
    return data;
};

// One-shot per-set rules acceptance from the onboarding gate. ruleSet is
// 'house_rules' or 'platform_rules' (server defaults blank to platform, so
// pre-split callers keep stamping the field they always stamped). Server
// stamps timestamp + version + IP (immutable once set for that set's
// current version) and returns the full me-shape payload, which we prime
// into the auth caches so `onboarding.required` flips without waiting out
// the 15s me-cache TTL.
export const acknowledgeRules = async (token, ruleSet = 'platform_rules') => {
    const response = await fetch(buildApiUrl('/auth/acknowledge-rules'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ ruleSet }),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to acknowledge rules');
    }
    const data = await response.json();
    if (token && data?.user) {
        primeMeCache(token, data.user);
        primeAuthBootstrapCache({ token, role: data.user.role, user: data.user, source: 'rules-ack' });
    }
    return data;
};

// Player-facing house rules (admin-managed `rules` collection, active docs
// only). Rendered in the onboarding gate's acknowledgment step.
export const getContentRules = async (token) => {
    const response = await fetch(buildApiUrl('/content/rules'), {
        headers: getHeaders(token),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load rules');
    }
    return response.json();
};

const buildMatchesParams = (status = '', options = {}) => {
    const params = {};
    if (status) {
        params.status = status;
    }
    if (options?.payload && ['core', 'full'].includes(String(options.payload).toLowerCase())) {
        params.payload = String(options.payload).toLowerCase();
    }
    if (options?.trigger) {
        params.trigger = String(options.trigger);
    }
    if (options?.refresh) {
        params.refresh = '1';
    }
    // Optional row cap. Used by the default landing view to ask for just the
    // top-N freshest matches instead of the full live-upcoming list (which
    // can be 700+ rows of mixed staleness).
    if (options?.limit) {
        // Keep client-side clamp in sync with MatchesController (1500 max).
        // Sidebar team search depends on a wider window than 200 rows.
        const n = Math.max(1, Math.min(1500, Number(options.limit) || 0));
        if (n > 0) params.limit = String(n);
    }
    return params;
};

export const getMatches = async (status = '', options = {}) => {
    // Always bypass browser/CDN cache for match data: live betting cannot
    // serve stale odds. Backend now returns Cache-Control: no-store, but we
    // keep cache:'no-store' here as belt-and-suspenders so a misconfigured
    // intermediary or service worker can't reuse a prior response.
    const fetchInit = { headers: getHeaders(), cache: 'no-store' };
    const response = await fetch(buildApiUrl('/matches', buildMatchesParams(status, options)), fetchInit);
    if (!response.ok) throw new Error('Failed to fetch matches');
    // Backend signals a background odds sync on manual refresh: the response
    // body is the pre-sync snapshot; fresh odds land a few seconds later.
    // Surface that to the caller via a one-shot window event so useMatches
    // can schedule a silent refetch without having to parse headers itself.
    if (options?.refresh && response.headers?.get?.('X-Sportsbook-Sync-Deferred') === 'true' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('matches:sync-deferred', {
            detail: { status: String(status || '') },
        }));
    }
    return response.json();
};

export const getLiveMatches = async (options = {}) => getMatches('live', options);

export const getUpcomingMatches = async (options = {}) => getMatches('upcoming', options);

/**
 * Outright (futures) listings. Public endpoint — no auth required.
 * Optionally scoped to a single sport key (e.g. golf_pga_championship_winner).
 */
export const getOutrights = async (sportKey = '') => {
    const params = sportKey ? { sportKey } : null;
    const response = await fetch(buildApiUrl('/outrights', params), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load futures (HTTP ${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
};

export const getOutrightSports = async () => {
    const response = await fetch(buildApiUrl('/outrights/sports'), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load futures sports (HTTP ${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
};

/**
 * On-demand Live Now sync. POSTs to /api/sync/live which synchronously
 * pokes the upstream live endpoint, then returns the same shape as
 * GET /api/matches?status=live. The endpoint NEVER errors: even when
 * throttled or quota-capped, it
 * returns 200 with the latest cached rows and an X-Sync-Throttled: 1
 * header. Resolves with `{ data, throttled }` so the caller can decide
 * whether to show the throttle toast.
 *
 * AbortSignal: pass options.signal to cancel a stale in-flight request
 * (e.g. when the user switches tabs before this resolves).
 */
export const syncLiveMatches = async (options = {}) => {
    const init = {
        method: 'POST',
        headers: getHeaders(getStoredAuthToken()),
        cache: 'no-store',
    };
    if (options.signal) init.signal = options.signal;
    const response = await fetch(buildApiUrl('/sync/live'), init);
    if (!response.ok) throw new Error('Failed to sync live matches');
    const throttled = response.headers?.get?.('X-Sync-Throttled') === '1';
    const data = await response.json();
    return { data: Array.isArray(data) ? data : [], throttled };
};

/**
 * On-demand pre-match sync for one sport. Same throttle semantics as
 * syncLiveMatches. Used by the sidebar sport-tab click handler so
 * switching to NBA/SOCCER/etc. fires a fresh upstream pull alongside the
 * normal cached fetch.
 */
export const syncPrematchSport = async (sportKey, options = {}) => {
    if (!sportKey) throw new Error('sportKey required');
    const init = {
        method: 'POST',
        headers: getHeaders(getStoredAuthToken()),
        cache: 'no-store',
    };
    if (options.signal) init.signal = options.signal;
    const response = await fetch(buildApiUrl(`/sync/prematch/${encodeURIComponent(sportKey.toLowerCase())}`), init);
    if (!response.ok) throw new Error(`Failed to sync ${sportKey}`);
    const throttled = response.headers?.get?.('X-Sync-Throttled') === '1';
    const data = await response.json();
    return { data: Array.isArray(data) ? data : [], throttled };
};

/**
 * Trigger a user-initiated on-demand refresh for a single sport. Backend
 * rate-limits per-IP and per-user, and dedupes in-flight refreshes across
 * simultaneous callers so only one upstream fetch fires.
 *
 * Throws with { status, error, retryAfterSeconds? } on non-success. Callers
 * should branch on `error` to drive UX (login prompt vs. cooldown countdown
 * vs. generic toast).
 */
export const refreshSportOdds = async (sportKey) => {
    const token = getStoredAuthToken();
    const response = await fetch(buildApiUrl(`/odds/refresh/${encodeURIComponent(String(sportKey || ''))}`), {
        method: 'POST',
        headers: getHeaders(token),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err = new Error(body?.error || body?.message || `refresh_failed_${response.status}`);
        err.status = response.status;
        err.error = body?.error || '';
        err.retryAfterSeconds = Number(body?.retry_after_seconds || 0);
        throw err;
    }
    return body;
};

/**
 * Multi-sport variant of refreshSportOdds. Sends ONE request that fans
 * out to all listed sport keys server-side, sharing the per-user rate
 * limit budget across all of them. Use this when the current view shows
 * matches from multiple sport keys (e.g. NBA + WNBA, or several soccer
 * leagues under one heading) so one click refreshes everything visible
 * instead of leaving non-primary sports stale.
 *
 * Backend: POST /api/odds/refresh-multi  body: { sport_keys: [...] }
 * Returns the aggregated response; on partial failure, success === true
 * if any sport synced, with per_sport[] reporting individual outcomes.
 */
export const refreshSportsOdds = async (sportKeys) => {
    const token = getStoredAuthToken();
    const response = await fetch(buildApiUrl('/odds/refresh-multi'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ sport_keys: Array.isArray(sportKeys) ? sportKeys : [] }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err = new Error(body?.error || body?.message || `refresh_failed_${response.status}`);
        err.status = response.status;
        err.error = body?.error || '';
        err.retryAfterSeconds = Number(body?.retry_after_seconds || 0);
        throw err;
    }
    return body;
};

/**
 * Fetch distinct sport values that currently have active/scheduled matches.
 * Returns an array of strings (sport titles and sportKeys).
 */
// Returns the list of sport keys / titles that currently have at least one
// scheduled or live match on the backend. Hard-capped at `timeoutMs` so a
// slow feed can't stall the sidebar's health-filter from rendering. On
// failure or timeout, resolves to [] — callers decide how to fall back.
export const getAvailableSports = async ({ signal, timeoutMs = 5000 } = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener('abort', onExternalAbort);
    }
    try {
        const response = await fetch(buildApiUrl('/matches/sports'), {
            headers: getHeaders(),
            // 'default' lets the browser honour the server's Cache-Control
            // (public, max-age=10). Sports names are not odds/prices — safe
            // to serve from HTTP cache for 10 s per user session.
            cache: 'default',
            signal: controller.signal,
        });
        if (!response.ok) return [];
        return await response.json();
    } catch {
        return [];
    } finally {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onExternalAbort);
    }
};

/**
 * Lazy-load player props + extended markets for a single match. Triggers a
 * per-event upstream fetch on the backend if the cached payload is stale.
 */
export const getMatchProps = async (matchId, { sheet = false } = {}) => {
    if (!matchId) return { extendedMarkets: [], playerProps: [], cached: false };
    // sheet:true = the "+" More Bets sheet: it never renders playerProps, so
    // the backend skips the Rundown props backfill (syncEventFull) and serves
    // the stored row only — zero upstream credits per open. The Prop Builder
    // (P+) omits it and keeps the backfill. MUST go through buildApiUrl's
    // params argument — the path-style API base already carries a '?', so a
    // hand-appended '?sheet=1' makes a second one and 404s the route.
    const params = sheet ? { sheet: 1 } : null;
    // Live odds — never serve from browser/CDN cache.
    const response = await fetch(buildApiUrl(`/matches/${encodeURIComponent(matchId)}/props`, params), {
        headers: getHeaders(),
        cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch match props');
    return response.json();
};

// Pre-submit re-quote: reprice the slip against current odds and return the
// reconciled per-leg prices + server combined/payout, WITHOUT booking. The
// review modal opens on this so the player sees any move before confirming.
// Read-only on the server (no balance/bet/requestId) — no X-Request-Id here.
export const quoteBet = async (betData, token) => {
    const normalizedType = normalizeBetMode(betData?.type || 'straight');
    const normalizedSelections = Array.isArray(betData?.selections)
        ? betData.selections.map((sel) => ({ ...sel, type: normalizeBetMode(sel?.type || sel?.marketType || 'straight') }))
        : undefined;
    const response = await fetch(buildApiUrl('/bets/quote'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ ...betData, type: normalizedType, selections: normalizedSelections }),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const err = new Error(error.error || error.message || 'Could not price the bet');
        Object.assign(err, error);
        throw err;
    }
    return response.json();
};

// On-demand Buy Points ladder for ONE totals selection. Totals ladders are
// default-hidden on the board payload (server gate BUY_POINTS_TOTALS_ON_BOARD,
// Nicky 2026-07-17) — the betslip calls this once when the player taps the
// collapsed Buy Points row on a totals leg. Returns { alternateLines: [...] }
// in the exact shape board outcomes carry for spreads, so the leg grafts it on
// and the existing dropdown → placement pipeline runs unchanged. Read-only on
// the server: one doc read, no caching, no state.
export const fetchBuyPointsLadder = async (matchId, { selection, point }, token) => {
    const response = await fetchWithRefresh(
        buildApiUrl(`/matches/${matchId}/buy-points`, { market: 'totals', selection, point }),
        { method: 'GET', token }
    );
    return parseJsonResponse(response, 'Could not load Buy Points');
};

export const placeBet = async (betData, token, { requestId = '' } = {}) => {
    const normalizedType = normalizeBetMode(betData?.type || 'straight');
    const normalizedSelections = Array.isArray(betData?.selections)
        ? betData.selections.map((sel) => ({
            ...sel,
            type: normalizeBetMode(sel?.type || sel?.marketType || 'straight')
        }))
        : undefined;
    const safeRequestId = String(requestId || betData?.requestId || createRequestId()).trim();

    const payload = {
        ...betData,
        type: normalizedType,
        selections: normalizedSelections,
        requestId: safeRequestId
    };

    const response = await fetch(buildApiUrl('/bets/place'), {
        method: 'POST',
        headers: {
            ...getHeaders(token),
            'X-Request-Id': safeRequestId
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const err = new Error(error.message || 'Failed to place bet');
        Object.assign(err, error, { requestId: safeRequestId });
        throw err;
    }
    const result = await response.json();
    return {
        ...result,
        requestId: result?.requestId || safeRequestId
    };
};

// Open Parlay ("open play"): commit a plain parlay with 1+ legs that the
// player can add to before any leg's game starts. Stake is reserved at
// create exactly like a normal parlay; no freeplay (v1). Mirrors placeBet's
// idempotent requestId handling.
export const createOpenParlay = async (betData, token, { requestId = '' } = {}) => {
    const normalizedSelections = Array.isArray(betData?.selections)
        ? betData.selections.map((sel) => ({
            ...sel,
            type: normalizeBetMode(sel?.type || sel?.marketType || 'straight')
        }))
        : [];
    const safeRequestId = String(requestId || betData?.requestId || createRequestId()).trim();
    const payload = {
        ...betData,
        type: 'parlay',
        selections: normalizedSelections,
        requestId: safeRequestId
    };
    const response = await fetch(buildApiUrl('/bets/open-parlay/create'), {
        method: 'POST',
        headers: {
            ...getHeaders(token),
            'X-Request-Id': safeRequestId
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const err = new Error(error.message || 'Failed to create open parlay');
        Object.assign(err, error, { requestId: safeRequestId });
        throw err;
    }
    const result = await response.json();
    return { ...result, requestId: result?.requestId || safeRequestId };
};

// Add one leg to an existing open parlay. Server enforces a HARD
// commenceTime>now() anti-past-posting gate, recomputes payout, and dedups
// the add via the dedicated requestId. Adding a leg never moves money.
export const addOpenParlayLeg = async (betId, leg, token, { requestId = '' } = {}) => {
    const safeRequestId = String(requestId || createRequestId()).trim();
    const payload = {
        betId,
        requestId: safeRequestId,
        leg: {
            ...leg,
            type: normalizeBetMode(leg?.type || leg?.marketType || 'straight')
        }
    };
    const response = await fetch(buildApiUrl('/bets/open-parlay/add-leg'), {
        method: 'POST',
        headers: {
            ...getHeaders(token),
            'X-Request-Id': safeRequestId
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const err = new Error(error.message || 'Failed to add leg to open parlay');
        Object.assign(err, error, { requestId: safeRequestId });
        throw err;
    }
    const result = await response.json();
    return { ...result, requestId: result?.requestId || safeRequestId };
};

export const getPublicBetModeRules = async (token) => {
    const response = await fetch(buildApiUrl('/betting/rules'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch bet mode rules');
    return response.json();
};

export const getMyBets = async (token) => {
    const response = await fetch(buildApiUrl('/bets/my-bets'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch my bets');
    return response.json();
};

// Lazy-load the child parlays of a Round Robin group. The /bets/my-bets
// payload returns groups as a single row (with parlayCount, sizes,
// totals); the user expands the row in My Bets and the frontend fetches
// the children on demand. Keeps the initial bets list bounded regardless
// of how many parlays the round robin generated.
export const getRoundRobinChildren = async (groupId, token) => {
    if (!groupId) return { children: [] };
    const response = await fetch(buildApiUrl(`/bets/group/${encodeURIComponent(groupId)}/children`), {
        headers: getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to fetch round robin children');
    return response.json();
};

// Self-healing: force-regrade any pending bets whose matches are actually
// finished but haven't been settled yet. Called automatically on every My Bets
// poll to detect and immediately settle stuck-pending bets, especially when
// the upstream odds feed never marked the match as 'completed'.
export const regradeStuckBets = async (token) => {
    try {
        const response = await fetch(buildApiUrl('/bets/regrade-stuck'), {
            method: 'POST',
            headers: getHeaders(token),
        });
        // Fail-open: regrade errors shouldn't block bet display. Return empty
        // result so caller can continue normally.
        if (!response.ok) return { regraded: 0, errors: 0 };
        return response.json();
    } catch (err) {
        console.warn('Stuck bet regrade failed (non-critical):', err);
        return { regraded: 0, errors: 0 };
    }
};

// Detect the browser's actual IANA zone so figures + transactions
// bucket bets by the player's real local day, not by whatever zone
// is (or isn't) saved on their profile. Backend validates the value
// against its allowlist and falls back to the saved setting if it's
// not recognised, so injecting garbage can't break the report.
const detectedClientTz = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
        return '';
    }
};

export const getUserFigures = async (token, weekOffset = 0) => {
    const params = { week_offset: String(weekOffset) };
    const tz = detectedClientTz();
    if (tz) params.tz = tz;
    const response = await fetch(buildApiUrl('/user/figures', params), {
        headers: getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to fetch figures');
    return response.json();
};

export const getUserTransactions = async (token, { limit = 50, offset = 0, weekOffset = 0 } = {}) => {
    const params = {
        limit: String(limit),
        offset: String(offset),
        week_offset: String(weekOffset),
    };
    const tz = detectedClientTz();
    if (tz) params.tz = tz;
    const response = await fetch(buildApiUrl('/user/transactions', params), {
        headers: getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
};

export const getCasinoCategories = async (token) => {
    const response = await fetch(buildApiUrl('/casino/categories'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch casino categories');
    return response.json();
};

export const getCasinoGames = async ({ token, category = 'lobby', search = '', featured = false, page = 1, limit = 48, all = false } = {}) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    if (featured) params.set('featured', 'true');
    // Admin-only: include non-active games (server enforces the role check).
    if (all) params.set('all', 'true');
    params.set('page', String(page));
    params.set('limit', String(limit));

    const response = await fetch(buildApiUrl('/casino/games', Object.fromEntries(params)), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch casino games');
    return response.json();
};

export const getCasinoGameState = async (game, token) => {
    const safeGame = String(game || '').trim().toLowerCase();
    const response = await fetch(buildApiUrl(`/casino/games/${encodeURIComponent(safeGame)}/state`), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch casino game state');
    }
    return response.json();
};

// Provably-fair state for a casino game: the current commitment (hash of the
// seed the player's next round will use + reveal) and their last revealed round.
// Never returns the server secret or an unrevealed seed.
export const getCasinoFairnessState = async (game, token) => {
    const safeGame = String(game || '').trim().toLowerCase();
    const response = await fetch(buildApiUrl(`/casino/fairness/state/${encodeURIComponent(safeGame)}`), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch fairness state');
    }
    return response.json();
};

export const launchCasinoGame = async (gameId, token) => {
    const response = await fetch(buildApiUrl(`/casino/games/${gameId}/launch`), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to launch casino game');
    }
    return response.json();
};

// ── In-house casino game betting ──────────────────────────
export const placeCasinoBet = async (game, bets, token, { requestId = '', payload = {} } = {}) => {
    const safeRequestId = String(requestId || createRequestId()).trim();
    const response = await fetch(buildApiUrl('/casino/bet'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ game, bets, requestId: safeRequestId, payload })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to place casino bet');
    }
    const result = await response.json();
    return {
        ...result,
        requestId: result?.requestId || safeRequestId
    };
};

export const getCasinoBetHistory = async (
    token,
    {
        page = 1,
        limit = 20,
        game = '',
        from = '',
        to = '',
        result = '',
        minWager = '',
        maxWager = ''
    } = {}
) => {
    const params = {};
    params.page = String(page);
    params.limit = String(limit);
    if (game) params.game = game;
    if (from) params.from = from;
    if (to) params.to = to;
    if (result) params.result = result;
    if (minWager !== '' && minWager !== null && minWager !== undefined) params.minWager = String(minWager);
    if (maxWager !== '' && maxWager !== null && maxWager !== undefined) params.maxWager = String(maxWager);

    const response = await fetch(buildApiUrl('/casino/bet/history', params), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch casino bet history');
    return response.json();
};

export const getCasinoBetDetail = async (roundId, token) => {
    const response = await fetch(buildApiUrl(`/casino/bet/${roundId}`), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch casino bet detail');
    }
    return response.json();
};

export const getAdminCasinoBets = async (params = {}, token) => {
    const query = {};
    const allowed = ['page', 'limit', 'game', 'from', 'to', 'result', 'username', 'userId', 'minWager', 'maxWager', 'format', 'csvLimit'];
    for (const key of allowed) {
        const value = params?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            query[key] = String(value);
        }
    }
    const response = await fetch(buildApiUrl('/admin/casino/bets', query), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch admin casino bets');
    }
    return response.json();
};

export const downloadAdminCasinoBetsCsv = async (params = {}, token) => {
    const query = { ...params, format: 'csv' };
    const response = await fetch(buildApiUrl('/admin/casino/bets', query), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to download casino bets CSV');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition') || '';
    const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
    const fileName = fileNameMatch?.[1] || `casino-bets-${Date.now()}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
};

export const updateAdminCasinoGame = async (gameId, updates, token) => {
    const response = await fetch(buildApiUrl(`/casino/admin/games/${gameId}`), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(updates)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update casino game');
    }
    return response.json();
};

export const getAdminCasinoBetDetail = async (roundId, token) => {
    const response = await fetch(buildApiUrl(`/admin/casino/bets/${roundId}`), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch admin casino bet detail');
    }
    return response.json();
};

export const getAdminCasinoSummary = async (params = {}, token) => {
    const query = {};
    const allowed = ['game', 'from', 'to', 'limit', 'result', 'userId', 'username'];
    for (const key of allowed) {
        const value = params?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            query[key] = String(value);
        }
    }
    const response = await fetch(buildApiUrl('/admin/casino/summary', query), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch admin casino summary');
    }
    return response.json();
};

export const createDeposit = async (amount, token) => {
    const response = await fetch(buildApiUrl('/wallet/request-deposit'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ amount, method: 'bonus_center' })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Deposit failed');
    }
    return response.json();
};

export const requestDeposit = async (amount, method, token) => {
    const response = await fetch(buildApiUrl('/wallet/request-deposit'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ amount, method })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to request deposit');
    }
    return response.json();
};

export const requestWithdrawal = async (amount, method, token) => {
    const response = await fetch(buildApiUrl('/wallet/request-withdrawal'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ amount, method })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to request withdrawal');
    }
    return response.json();
};

export const getWalletTransactions = async (token, { type = '', status = '', limit = 50 } = {}) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    params.set('limit', String(limit));
    const response = await fetch(buildApiUrl('/wallet/transactions', Object.fromEntries(params)), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch wallet transactions');
    return response.json();
};

// Admin / Agent APIs
export const getAgents = async (token) => {
    const response = await fetch(buildApiUrl('/admin/agents'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch agents');
    return response.json();
};

export const getBetModeRules = async (token) => {
    const response = await fetch(buildApiUrl('/admin/bet-mode-rules'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch bet mode rules');
    return response.json();
};

export const getAdminHeaderSummary = async (token, params = null) => {
    const queryParams = {};
    if (params && params.weekStart) queryParams.weekStart = params.weekStart;
    if (params && params.agentId) queryParams.agentId = params.agentId;
    const response = await fetch(buildApiUrl('/admin/header-summary', queryParams), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch admin header summary');
    return response.json();
};

export const getSettlementSnapshots = async (token) => {
    const response = await fetch(buildApiUrl('/admin/settlement-snapshots'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch settlement snapshots');
    return response.json();
};

export const recordSettlementAdjustment = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/settlement-adjustment'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload || {})
    });
    return parseJsonResponse(response, 'Failed to record settlement adjustment');
};

export const getSystemStats = async (token) => {
    const response = await fetch(buildApiUrl('/admin/system-stats'), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch system stats');
    }
    return response.json();
};

export const getAdminEntityCatalog = async (token) => {
    const response = await fetch(buildApiUrl('/admin/entity-catalog'), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch admin entity catalog');
    }
    return response.json();
};

export const getCostMetrics = async ({ day = '', days = 7 } = {}) => {
    const query = {};
    if (day && String(day).trim() !== '') {
        query.day = String(day).trim();
    }
    if (Number.isFinite(days)) {
        query.days = String(Math.max(1, Math.min(30, Number(days))));
    }
    const response = await fetch(buildApiUrl('/_php/costs', query), {
        headers: {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Remainder': 'true',
        }
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch cost metrics');
    }
    return response.json();
};

export const getGatewayHealth = async () => {
    const response = await fetch(buildApiUrl('/_php/health'), {
        headers: {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Remainder': 'true',
        }
    });
    if (!response.ok) {
        throw new Error('Failed to fetch gateway health');
    }
    return response.json();
};

export const getWeeklyFigures = async (period, token) => {
    const safePeriod = encodeURIComponent(String(period || 'week'));
    const response = await fetch(buildApiUrl('/admin/weekly-figures', { period: safePeriod }), {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to fetch weekly figures');
};

export const getPendingItems = async (token) => {
    const response = await fetch(buildApiUrl('/admin/pending'), {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to fetch pending items');
};

export const approvePendingItem = async (transactionId, token) => {
    const response = await fetch(buildApiUrl('/admin/pending/approve'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ transactionId })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to approve pending item');
    }
    return response.json();
};

export const declinePendingItem = async (transactionId, token) => {
    const response = await fetch(buildApiUrl('/admin/pending/decline'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ transactionId })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to decline pending item');
    }
    return response.json();
};

export const getMessages = async (token) => {
    const response = await fetch(buildApiUrl('/admin/messages'), {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to fetch messages');
};

export const markMessageRead = async (messageId, token) => {
    const response = await fetch(buildApiUrl(`/admin/messages/${messageId}/read`), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to mark message read');
    return response.json();
};

export const replyToMessage = async (messageId, reply, token) => {
    const response = await fetch(buildApiUrl(`/admin/messages/${messageId}/reply`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ reply })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to send reply');
    }
    return response.json();
};

export const deleteMessage = async (messageId, token) => {
    const response = await fetch(buildApiUrl(`/admin/messages/${messageId}`), {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to delete message');
    return response.json();
};

export const getMyMessages = async (token) => {
    const response = await fetch(buildApiUrl('/messages/me'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
};

export const createMessage = async (subject, body, token) => {
    const response = await fetch(buildApiUrl('/messages'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ subject, body })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to send message');
    }
    return response.json();
};

export const getTutorialsContent = async (token) => {
    const response = await fetch(buildApiUrl('/content/tutorials'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch tutorials');
    return response.json();
};

export const getSupportFaqs = async (token) => {
    const response = await fetch(buildApiUrl('/content/faqs'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch FAQs');
    return response.json();
};

export const getAdminMatches = async (token) => {
    const response = await fetch(buildApiUrl('/admin/matches'), {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to fetch matches');
};

export const createAdminMatch = async (matchData, token) => {
    const response = await fetch(buildApiUrl('/admin/matches'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(matchData)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create match');
    }
    return response.json();
};

export const updateAdminMatch = async (matchId, matchData, token) => {
    const response = await fetch(buildApiUrl(`/admin/matches/${matchId}`), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(matchData)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update match');
    }
    return response.json();
};

export const getCashierSummary = async (token) => {
    const response = await fetch(buildApiUrl('/admin/cashier/summary'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch cashier summary');
    return response.json();
};

export const getCashierTransactions = async (token, limit = 50) => {
    const response = await fetch(buildApiUrl('/admin/cashier/transactions', { limit }), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch cashier transactions');
    return response.json();
};

export const getThirdPartyLimits = async (token) => {
    const response = await fetch(buildApiUrl('/admin/third-party-limits'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch third party limits');
    return response.json();
};

export const updateThirdPartyLimit = async (id, payload, token) => {
    const response = await fetch(buildApiUrl(`/admin/third-party-limits/${id}`), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update third party limit');
    }
    return response.json();
};

export const createThirdPartyLimit = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/third-party-limits'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create third party limit');
    }
    return response.json();
};

export const getAdminBets = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(buildApiUrl('/admin/bets', query ? Object.fromEntries(new URLSearchParams(query)) : {}), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch admin bets');
    return response.json();
};

export const getIpTracker = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(buildApiUrl('/admin/ip-tracker', query ? Object.fromEntries(new URLSearchParams(query)) : {}), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch IP tracker');
    return response.json();
};

export const blockIp = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/ip-tracker/${id}/block`), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to block IP');
    }
    return response.json();
};

export const unblockIp = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/ip-tracker/${id}/unblock`), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to unblock IP');
    }
    return response.json();
};

export const getTransactionsHistory = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(buildApiUrl('/admin/transaction-history', query ? Object.fromEntries(new URLSearchParams(query)) : {}), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch transactions history');
    return response.json();
};

export const deleteAdminTransactions = async (ids, token) => {
    const response = await fetch(buildApiUrl('/admin/transaction-history'), {
        method: 'DELETE',
        headers: getHeaders(token),
        body: JSON.stringify({ ids })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete transactions');
    }
    return response.json();
};

export const getDeletedWagers = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(buildApiUrl('/admin/deleted-wagers', query ? Object.fromEntries(new URLSearchParams(query)) : {}), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch deleted wagers');
    return response.json();
};

export const restoreDeletedWager = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/deleted-wagers/${id}/restore`), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to restore wager');
    }
    return response.json();
};

export const getSportsbookLinks = async (token) => {
    const response = await fetch(buildApiUrl('/admin/sportsbook-links'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch sportsbook links');
    return response.json();
};

export const createSportsbookLink = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/sportsbook-links'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create sportsbook link');
    }
    return response.json();
};

export const updateSportsbookLink = async (id, payload, token) => {
    const response = await fetch(buildApiUrl(`/admin/sportsbook-links/${id}`), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update sportsbook link');
    }
    return response.json();
};

export const deleteSportsbookLink = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/sportsbook-links/${id}`), {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete sportsbook link');
    }
    return response.json();
};

export const whitelistIp = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/ip-tracker/${id}/whitelist`), {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to whitelist IP');
    }

    return response.json();
};

export const testSportsbookLink = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/sportsbook-links/${id}/test`), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to test sportsbook link');
    }
    return response.json();
};

export const refreshOdds = async (token) => {
    const response = await fetch(buildApiUrl('/admin/refresh-odds'), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to refresh odds');
    }
    return response.json();
};

export const getOddsCircuitBreaker = async (token) => {
    const response = await fetch(buildApiUrl('/admin/odds-circuit-breaker'), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch circuit breaker state');
    }
    return response.json();
};

export const openOddsCircuitBreaker = async ({ token, cooldownSeconds = 180, reason = 'manual_admin_open' } = {}) => {
    const response = await fetch(buildApiUrl('/admin/odds-circuit-breaker/open'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ cooldownSeconds, reason })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to open circuit breaker');
    }
    return response.json();
};

export const resetOddsCircuitBreaker = async ({ token, reason = 'manual_admin_reset' } = {}) => {
    const response = await fetch(buildApiUrl('/admin/odds-circuit-breaker/reset'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ reason })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to reset circuit breaker');
    }
    return response.json();
};

export const getAdminAuditLog = async ({ token, page = 1, limit = 50, action = '', actorId = '' } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (action) params.set('action', action);
    if (actorId) params.set('actorId', actorId);
    const response = await fetch(buildApiUrl(`/admin/audit-log?${params.toString()}`), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch audit log');
    }
    return response.json();
};

export const fetchOddsManual = async (token) => {
    const response = await fetch(buildApiUrl('/matches/fetch-odds'), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch odds');
    }
    return response.json();
};

export const clearCache = async (token) => {
    const response = await fetch(buildApiUrl('/admin/clear-cache'), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to clear cache');
    }
    return response.json();
};

export const createAdminBet = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/bets'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create bet');
    }
    return response.json();
};

export const deleteAdminBet = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/bets/${id}`), {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete bet');
    }
    return response.json();
};

export const settleMatchBets = async (payload, token) => {
    const response = await fetch(buildApiUrl('/bets/settle'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to settle bets');
    }
    return response.json();
};

// ── Admin outrights (futures) grading ────────────────────────────────────
// List every futures board (all statuses, independent of the public betting
// flag) with outcomes (RAW AMERICAN prices) + pending-bet counts.
export const getAdminOutrights = async (token) => {
    const response = await fetch(buildApiUrl('/admin/outrights'), {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to load outrights');
};

// Money action: settles the board and grades every pending futures bet.
// Backend validates the winner against the board's outcomes and requires
// the full admin role.
export const settleAdminOutright = async (outrightId, winner, token) => {
    const response = await fetch(buildApiUrl(`/admin/outrights/${outrightId}/settle`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ winner })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to settle outright');
    }
    return response.json();
};

// Money action: voids the board and refunds every pending futures bet.
export const voidAdminOutright = async (outrightId, reason, token) => {
    const response = await fetch(buildApiUrl(`/admin/outrights/${outrightId}/void`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ reason })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to void outright');
    }
    return response.json();
};

// ── Admin line override (manual line on a match's ML/spread/total) ───────
// Read the overridable markets for one match: current feed value + any active
// override + lock info. Prices are AMERICAN. Strict admin only on the backend.
export const getAdminMatchLines = async (matchId, token) => {
    const response = await fetch(buildApiUrl(`/admin/matches/${matchId}/lines`), {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to load match lines');
};

// Money action: set a manual line on a market. `entries` is one row per side
// ({ name, side, point?, price }) — price is AMERICAN. Spread/total send BOTH
// sides. Backend stores verbatim + audit-logs; requires full admin role.
export const setAdminLineOverride = async (matchId, market, entries, token) => {
    const response = await fetch(buildApiUrl(`/admin/matches/${matchId}/line-override`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ market, entries })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to set line override');
    }
    return response.json();
};

// Money action: clear the override on a market and restore the feed value.
export const releaseAdminLineOverride = async (matchId, market, token) => {
    const response = await fetch(buildApiUrl(`/admin/matches/${matchId}/line-override/release`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ market })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to release line override');
    }
    return response.json();
};

// ── Admin card-bet grading (manual only — no card data in any feed) ──────
export const getAdminCardBets = async (token) => {
    const response = await fetch(buildApiUrl('/admin/card-bets'), {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to load card bets');
};

// Money action: grades ONE straight card bet (won|lost|void) through the
// settlement ledger path. Backend requires full admin role.
export const gradeAdminCardBet = async (betId, decision, token) => {
    const response = await fetch(buildApiUrl(`/admin/card-bets/${betId}/grade`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ decision })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to grade card bet');
    }
    return response.json();
};

// ── Bet approval queue (admin + super/master/plain agent, downline-scoped) ──
export const getAdminBetApprovals = async (token) => {
    const response = await fetch(buildApiUrl('/admin/bet-approvals'), { headers: getHeaders(token) });
    return parseJsonResponse(response, 'Failed to load bet approvals');
};

// Money action: approve → books FROZEN submit-time odds (never the advisory
// current line shown in the inbox).
export const approveAdminBet = async (betId, token) => {
    const response = await fetch(buildApiUrl(`/admin/bet-approvals/${betId}/approve`), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to approve bet');
    }
    return response.json();
};

// Money action: reject → refunds the held stake (cash + freeplay) and marks
// the bet rejected.
export const rejectAdminBet = async (betId, token, reason = '') => {
    const response = await fetch(buildApiUrl(`/admin/bet-approvals/${betId}/reject`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ reason })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to reject bet');
    }
    return response.json();
};

// ── Admin manual/write-in bets (strict admin only on the backend) ─────────
export const getAdminManualBets = async (token) => {
    const response = await fetch(buildApiUrl('/admin/manual-bets'), {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to load manual bets');
};

// Money action: books a write-in bet on the player's account (pending hold).
// payload = {userId, description, oddsAmerican, stake, requestId}. requestId
// is the server-side double-click guard — the caller generates ONE per
// confirmed intent and reuses it on retries so the server replays instead of
// re-booking. The response's potentialPayout/toWin are authoritative.
export const placeAdminManualBet = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/manual-bets'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || 'Failed to place manual bet');
    }
    return response.json();
};

// Money action: grades ONE manual bet (won|lost|void) through the settlement
// ledger path. Backend requires full admin role.
export const gradeAdminManualBet = async (betId, decision, token) => {
    const response = await fetch(buildApiUrl(`/admin/manual-bets/${betId}/grade`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ decision })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to grade manual bet');
    }
    return response.json();
};

export const getSettleEligibility = async (matchId, token) => {
    const response = await fetch(buildApiUrl('/bets/settle-eligibility', { matchId }), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to check settle eligibility');
    }
    return response.json();
};

export const getStuckBetsInbox = async (token, hours) => {
    const params = (hours && Number.isFinite(Number(hours))) ? { hours: String(hours) } : {};
    const response = await fetch(buildApiUrl('/bets/admin/stuck', params), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load stuck bets');
    }
    return response.json();
};

export const getAgentPerformance = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(buildApiUrl('/admin/agent-performance', query ? Object.fromEntries(new URLSearchParams(query)) : {}), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch agent performance');
    return response.json();
};

export const getAgentPerformanceDetails = async (agentId, params, token) => {
    const query = new URLSearchParams(params || {}).toString();
    const response = await fetch(buildApiUrl(`/admin/agent-performance/${agentId}/details`, query ? Object.fromEntries(new URLSearchParams(query)) : {}), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch agent performance details');
    }
    return response.json();
};

export const updateAgentPermissions = async (agentId, permissions, token) => {
    const response = await fetch(buildApiUrl(`/agent/permissions/${agentId}`), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify({ permissions })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update permissions');
    }
    return response.json();
};

export const createAgent = async (agentData, token) => {
    try {
        if (!token) {
            throw new Error('No token provided. Please login first.');
        }

        const requestHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(buildApiUrl('/admin/create-agent'), {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(agentData)
        });

        if (!response.ok) {
            let errorMsg = 'Failed to create agent';
            try {
                const errorData = await response.json();
                console.error('❌ Server error:', errorData);
                errorMsg = errorData.message || errorMsg;
            } catch (e) {
                errorMsg = `Server error (${response.status}): ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }
        return response.json();
    } catch (error) {
        console.error('❌ Create Agent Error:', error);
        if (error instanceof TypeError) {
            throw new Error('Network error - Unable to reach server. Is the backend running on port 5000?');
        }
        throw error;
    }
};

export const seedWorkflowHierarchy = async (token, payload = {}) => {
    const response = await fetch(buildApiUrl('/admin/seed-workflow-hierarchy'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ confirm: true, ...payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Failed to seed workflow hierarchy');
    }
    return data;
};

export const cleanupWorkflowSeedData = async (token) => {
    const response = await fetch(buildApiUrl('/admin/cleanup-workflow-seed'), {
        method: 'POST',
        headers: getHeaders(token)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Failed to clean workflow demo data');
    }
    return data;
};

export const createUserByAdmin = async (userData, token) => {
    try {
        if (!token) {
            throw new Error('No token provided. Please login first.');
        }

        const requestHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(buildApiUrl('/admin/create-user'), {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('❌ Server error:', errorData || { status: response.status, statusText: response.statusText });

            if (
                response.status === 409
                && (errorData?.duplicate === true || errorData?.code === 'DUPLICATE_PLAYER')
            ) {
                throw createDuplicatePlayerError(errorData, 'Likely duplicate player detected', response.status);
            }

            const errorMsg = errorData?.message || `Server error (${response.status}): ${response.statusText}`;
            throw new Error(errorMsg);
        }
        return response.json();
    } catch (error) {
        console.error('❌ Create User Error:', error);
        if (error instanceof TypeError) {
            throw new Error('Network error - Unable to reach server. Is the backend running on port 5000?');
        }
        throw error;
    }
};

export const updateUserByAdmin = async (userId, userData, token) => {
    try {
        const response = await fetch(buildApiUrl(`/admin/users/${userId}`), {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(userData)
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            if (
                response.status === 409
                && (data?.duplicate === true || data?.code === 'DUPLICATE_PLAYER')
            ) {
                throw createDuplicatePlayerError(data, 'Likely duplicate player detected', response.status);
            }
            throw new Error(data?.message || 'Failed to update user');
        }
        return data;
    } catch (error) {
        console.error('updateUserByAdmin error:', error);
        throw error;
    }
};

export const updateUserFreeplay = async (userId, freeplayInput, token, description = '') => {
    try {
        const payload = (typeof freeplayInput === 'object' && freeplayInput !== null && !Array.isArray(freeplayInput))
            ? freeplayInput
            : { freeplayBalance: freeplayInput, description };
        const response = await fetch(buildApiUrl(`/admin/users/${userId}/freeplay`), {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update freeplay');
        return data;
    } catch (error) {
        console.error('updateUserFreeplay error:', error);
        throw error;
    }
};

export const createPlayerByAgent = async (userData, token) => {
    try {
        if (!token) {
            throw new Error('No token provided. Please login first.');
        }

        const response = await fetch(buildApiUrl('/agent/create-user'), {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);

            if (
                response.status === 409
                && (errorData?.duplicate === true || errorData?.code === 'DUPLICATE_PLAYER')
            ) {
                throw createDuplicatePlayerError(errorData, 'Likely duplicate player detected', response.status);
            }

            const errorMsg = errorData?.message || `Server error (${response.status}): ${response.statusText}`;
            throw new Error(errorMsg);
        }
        return response.json();
    } catch (error) {
        console.error('Create Player Error:', error);
        if (error instanceof TypeError) {
            throw new Error('Network error - Unable to reach server. Is the backend running on port 5000?');
        }
        throw error;
    }
};

export const getMyPlayers = async (token) => {
    const response = await fetch(buildApiUrl('/agent/my-users'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch players');
    return response.json();
};

export const getUsersAdmin = async (token, params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    const suffixParams = query.toString() ? Object.fromEntries(query) : {};
    const response = await fetch(buildApiUrl('/admin/users', suffixParams), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch users');
    }
    return response.json();
};

export const updateUserCredit = async (userId, payload, token) => {
    const response = await fetch(buildApiUrl(`/admin/users/${userId}/credit`), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update user balance');
    }
    return response.json();
};

export const updateAgentCredit = async (agentId, payload, token) => {
    const response = await fetch(buildApiUrl(`/admin/agent/${agentId}/credit`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update agent balance');
    }
    return response.json();
};

export const updateUserBalanceOwedByAgent = async (userId, balance, token) => {
    const response = await fetch(buildApiUrl('/agent/update-balance-owed'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ userId, balance })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update balance');
    }
    return response.json();
};

export const updateAgent = async (id, data, token) => {
    try {
        const response = await fetch(buildApiUrl(`/admin/agent/${id}`), {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update agent');
        }
        return response.json();
    } catch (error) {
        console.error('Update Agent Error:', error);
        throw error;
    }
};

export const updateUserByAgent = async (userId, userData, token) => {
    try {
        const response = await fetch(buildApiUrl(`/agent/users/${userId}`), {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(userData)
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            if (
                response.status === 409
                && (data?.duplicate === true || data?.code === 'DUPLICATE_PLAYER')
            ) {
                throw createDuplicatePlayerError(data, 'Likely duplicate player detected', response.status);
            }
            throw new Error(data?.message || 'Failed to update customer');
        }
        return data;
    } catch (error) {
        console.error('updateUserByAgent error:', error);
        throw error;
    }
};

export const createSubAgent = async (agentData, token) => {
    try {
        const response = await fetch(buildApiUrl('/agent/create-sub-agent'), {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(agentData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create sub-agent');
        return data;
    } catch (error) {
        console.error('createSubAgent error:', error);
        throw error;
    }
};

export const getMySubAgents = async (token) => {
    try {
        const response = await fetch(buildApiUrl('/agent/my-sub-agents'), {
            method: 'GET',
            headers: getHeaders(token)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch sub-agents');
        return data;
    } catch (error) {
        console.error('getMySubAgents error:', error);
        throw error;
    }
};

export const getDownlineSummary = async (token) => {
    try {
        const response = await fetch(buildApiUrl('/agent/downline-summary'), {
            method: 'GET',
            headers: getHeaders(token)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch downline summary');
        return data;
    } catch (error) {
        console.error('getDownlineSummary error:', error);
        throw error;
    }
};

export const getAgentCuts = async (token, params = {}) => {
    try {
        const queryParams = {};
        if (params.periodType) queryParams.periodType = params.periodType;
        if (params.weekStart) queryParams.weekStart = params.weekStart;
        if (params.quarter) queryParams.quarter = String(params.quarter);
        if (params.year) queryParams.year = String(params.year);
        const url = buildApiUrl('/admin/agent-cuts', queryParams);
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(token)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch agent cuts');
        return data;
    } catch (error) {
        console.error('getAgentCuts error:', error);
        throw error;
    }
};

export const getUserStatistics = async (userId, token) => {
    try {
        const response = await fetch(buildApiUrl(`/admin/users/${userId}/stats`), {
            method: 'GET',
            headers: getHeaders(token)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch user statistics');
        return data;
    } catch (error) {
        console.error('getUserStatistics error:', error);
        throw error;
    }
};

export const createTicketWriterBet = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/bets'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create ticket');
    }
    return response.json();
};

export const getBillingSummary = async (token) => {
    const response = await fetch(buildApiUrl('/admin/billing/summary'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch billing summary');
    return response.json();
};

export const getBillingInvoices = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(buildApiUrl('/admin/billing/invoices', query ? Object.fromEntries(new URLSearchParams(query)) : {}), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return response.json();
};

export const createBillingInvoice = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/billing/invoices'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create invoice');
    }
    return response.json();
};

export const updateBillingInvoice = async (id, payload, token) => {
    const response = await fetch(buildApiUrl(`/admin/billing/invoices/${id}`), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update invoice');
    }
    return response.json();
};

export const getBillingInvoiceById = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/billing/invoices/${id}`), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch invoice');
    return response.json();
};

export const getSettings = async (token) => {
    const response = await fetch(buildApiUrl('/admin/settings'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
};

export const updateSettings = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/settings'), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update settings');
    }
    return response.json();
};

export const getRules = async (token) => {
    const response = await fetch(buildApiUrl('/admin/rules'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch rules');
    return response.json();
};

export const createRule = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/rules'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create rule');
    }
    return response.json();
};

export const updateRule = async (id, payload, token) => {
    const response = await fetch(buildApiUrl(`/admin/rules/${id}`), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update rule');
    }
    return response.json();
};

export const deleteRule = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/rules/${id}`), {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete rule');
    }
    return response.json();
};

export const getFeedback = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(buildApiUrl('/admin/feedback', query ? Object.fromEntries(new URLSearchParams(query)) : {}), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch feedback');
    return response.json();
};

export const replyFeedback = async (id, payload, token) => {
    const response = await fetch(buildApiUrl(`/admin/feedback/${id}/reply`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to reply feedback');
    }
    return response.json();
};

export const markFeedbackReviewed = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/feedback/${id}/reviewed`), {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to mark reviewed');
    }
    return response.json();
};

export const deleteFeedback = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/feedback/${id}`), {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete feedback');
    }
    return response.json();
};

export const getFaqs = async (token) => {
    const response = await fetch(buildApiUrl('/admin/faqs'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch FAQs');
    return response.json();
};

export const createFaq = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/faqs'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create FAQ');
    }
    return response.json();
};

export const updateFaq = async (id, payload, token) => {
    const response = await fetch(buildApiUrl(`/admin/faqs/${id}`), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update FAQ');
    }
    return response.json();
};

export const deleteFaq = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/faqs/${id}`), {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete FAQ');
    }
    return response.json();
};

export const getManualSections = async (token) => {
    const response = await fetch(buildApiUrl('/admin/manual'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch manual');
    return response.json();
};

export const createManualSection = async (payload, token) => {
    const response = await fetch(buildApiUrl('/admin/manual'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create manual section');
    }
    return response.json();
};

export const updateManualSection = async (id, payload, token) => {
    const response = await fetch(buildApiUrl(`/admin/manual/${id}`), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update manual section');
    }
    return response.json();
};

export const deleteManualSection = async (id, token) => {
    const response = await fetch(buildApiUrl(`/admin/manual/${id}`), {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete manual section');
    }
    return response.json();
};

export const suspendUser = async (userId, token) => {
    const response = await fetch(buildApiUrl('/admin/suspend'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error('Failed to suspend user');
    return response.json();
};

export const unsuspendUser = async (userId, token) => {
    const response = await fetch(buildApiUrl('/admin/unsuspend'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error('Failed to unsuspend user');
    return response.json();
};
export const resetUserPasswordByAdmin = async (id, newPassword, token) => {
    const response = await fetch(buildApiUrl(`/admin/users/${id}/reset-password`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ newPassword })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset user password');
    }
    return response.json();
};


export const resetAgentPasswordByAdmin = async (id, newPassword, token) => {
    const response = await fetch(buildApiUrl(`/admin/agents/${id}/reset-password`), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ newPassword })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset agent password');
    }
    return response.json();
};

export const getNextUsername = async (prefix, token, queryParams = {}) => {
    const safePrefix = String(prefix || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!safePrefix) {
        throw new Error('Prefix is required and must contain only letters/numbers');
    }
    const safeParams = { ...queryParams };
    if (typeof safeParams.suffix === 'string') {
        safeParams.suffix = safeParams.suffix.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    if (typeof safeParams.type === 'string') {
        safeParams.type = safeParams.type.toLowerCase();
    }
    if (typeof safeParams.agentId === 'string') {
        safeParams.agentId = safeParams.agentId.trim();
        if (!/^[a-f0-9]{24}$/i.test(safeParams.agentId)) {
            delete safeParams.agentId;
        }
    }
    const nextPath = `/admin/next-username/${encodeURIComponent(safePrefix)}`;
    const response = await fetch(buildApiUrl(nextPath, safeParams), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch next username');
    }
    return response.json();
};
export const impersonateUser = async (userId, token) => {
    const response = await fetch(buildApiUrl(`/admin/impersonate-user/${userId}`), {
        method: 'POST',
        credentials: 'include', // receive auth_token cookie set by backend for regular users
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to impersonate user');
    }
    return response.json();
};

export const getAgentTree = async (token) => {
    const response = await fetch(buildApiUrl('/admin/agent-tree'), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch agent tree');
    }
    return response.json();
};

export const deleteUser = async (userId, token) => {
    const response = await fetch(buildApiUrl(`/admin/users/${userId}`), {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
    }
    return response.json();
};

export const deleteAgent = async (agentId, token) => {
    const response = await fetch(buildApiUrl(`/admin/agents/${agentId}`), {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete agent');
    }
    return response.json();
};

export const bulkCreateUsers = async (users, token) => {
    const response = await fetch(buildApiUrl('/admin/bulk-create-users'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ users })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to bulk create users');
    }
    return response.json();
};

export const importUsersSpreadsheet = async (file, token, options = {}) => {
    if (!file) {
        throw new Error('Please select a spreadsheet file first');
    }

    const timeoutMs = Number.isFinite(options?.timeoutMs) ? Number(options.timeoutMs) : 45000;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), Math.max(5000, timeoutMs)) : null;

    const formData = new FormData();
    formData.append('file', file);
    if (options.defaultAgentId) {
        formData.append('defaultAgentId', String(options.defaultAgentId));
    }
    if (typeof options.forceAgentAssignment !== 'undefined') {
        formData.append('forceAgentAssignment', options.forceAgentAssignment ? 'true' : 'false');
    }

    try {
        const response = await fetch(buildApiUrl('/admin/import-users-spreadsheet'), {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
            signal: controller?.signal
        });

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        const rawText = await response.text();
        const isJson = contentType.includes('application/json');
        const data = isJson && rawText ? JSON.parse(rawText) : (isJson ? {} : null);
        if (!response.ok) {
            const backendMessage = data && typeof data === 'object' ? data.message : '';
            throw new Error(backendMessage || 'Failed to import spreadsheet');
        }

        if (!data || typeof data !== 'object') {
            const snippet = (rawText || '').replace(/\s+/g, ' ').trim().slice(0, 140);
            const looksHtml = /<html|<!doctype/i.test(rawText || '');
            const reason = looksHtml
                ? 'Received HTML instead of JSON'
                : 'Received non-JSON response';
            throw new Error(
                `${reason} (status ${response.status}) from ${response.url}.` +
                (snippet ? ` Response starts with: "${snippet}"` : '')
            );
        }
        return data;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Import returned invalid JSON. Check backend logs for PHP warnings/fatal errors.');
        }
        if (error?.name === 'AbortError') {
            throw new Error('Import timed out. Please check backend/API logs and try again.');
        }
        throw error;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

export const getGamblingLimits = async (token) => {
    const response = await fetch(buildApiUrl('/auth/gambling-limits'), {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch gambling limits');
    return response.json();
};

export const setGamblingLimits = async (limits, token) => {
    const response = await fetch(buildApiUrl('/auth/gambling-limits'), {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(limits)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update gambling limits');
    }
    return response.json();
};

export const selfExclude = async (days, token) => {
    const response = await fetch(buildApiUrl('/auth/self-exclude'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ days })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to self-exclude');
    }
    return response.json();
};

export const coolingOff = async (hours, token) => {
    const response = await fetch(buildApiUrl('/auth/cooling-off'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ hours })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to set cooling off');
    }
    return response.json();
};

// ─── Commission Chain APIs ────────────────────────────────────────────────────

/**
 * Fetch the full upline chain + direct downlines for an agent.
 * Returns { upline, downlines, chainTotal, isValid, message }
 */
export const getAgentCommissionChain = async (agentId, token) => {
    const response = await fetch(buildApiUrl(`/admin/agent/${agentId}/commission-chain`), {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch commission chain');
    }
    return response.json();
};

/**
 * Calculate how a given amount distributes across the agent's full commission chain.
 * Body: { agentId, amount }
 * Returns { distributions: [{username, agentPercent, amount}], chainTotal, isValid }
 */
export const calculateCommission = async (agentId, amount, token) => {
    const response = await fetch(buildApiUrl('/admin/commission/calculate'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ agentId, amount })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to calculate commission');
    }
    return response.json();
};

/**
 * Validate a set of chain nodes to ensure their agentPercent values sum to 100%.
 * Body: { nodes: [{id, username, agentPercent}] }
 * Returns { isValid, chainTotal, errors }
 */
export const validateCommissionChain = async (nodes, token) => {
    const response = await fetch(buildApiUrl('/admin/commission/validate'), {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ nodes })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to validate commission chain');
    }
    return response.json();
};

// ─── End Commission Chain APIs ────────────────────────────────────────────────
