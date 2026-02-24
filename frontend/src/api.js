const DEFAULT_PROD_API_URL = '/api/index.php?path=';

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
    const configuredUrl = normalizeApiUrl(import.meta.env.VITE_API_URL);
    if (configuredUrl) {
        return configuredUrl;
    }

    // In development, use Vite proxy so browser only talks to frontend port (5173).
    if (import.meta.env.DEV) {
        return '/api';
    }

    return normalizeApiUrl(DEFAULT_PROD_API_URL);
};

export const API_URL = getBaseUrl();
export const BACKEND_BASE_URL = API_URL.replace(/\/api\/?$/, '');
export const normalizeBetMode = (mode) => String(mode || 'straight').toLowerCase().replace(/-/g, '_').trim();

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
        throw new Error(errorMessage);
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

export const loginUser = async (username, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password })
    });
    return parseJsonResponse(response, 'Login failed');
};

export const loginAdmin = async (username, password) => {
    const response = await fetch(`${API_URL}/auth/admin/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password })
    });
    return parseJsonResponse(response, 'Admin login failed');
};

export const loginAgent = async (username, password) => {
    const response = await fetch(`${API_URL}/auth/agent/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password })
    });
    return parseJsonResponse(response, 'Agent login failed');
};

export const registerUser = async (userData) => {
    try {
        console.log('Calling registerUser API with:', userData.username);
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Registration failed:', data.message);
            throw new Error(data.message || 'Registration failed');
        }

        console.log('Registration successful:', data);
        return data;
    } catch (error) {
        console.error('RegisterUser error:', error);
        if (error instanceof TypeError) {
            throw new Error('Network error - Unable to reach server');
        }
        throw error;
    }
};

export const getBalance = async (token) => {
    const response = await fetch(`${API_URL}/wallet/balance`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch balance');
    return response.json();
};

export const getMe = async (token) => {
    const response = await fetch(`${API_URL}/auth/me`, {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Failed to fetch user profile');
        error.status = response.status;
        throw error;
    }
    return response.json();
};

export const updateProfile = async (profileData, token) => {
    const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(profileData)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
    }
    return response.json();
};

export const getMatches = async () => {
    const response = await fetch(`${API_URL}/matches`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch matches');
    return response.json();
};

export const getLiveMatches = async () => {
    const response = await fetch(`${API_URL}/matches?status=live`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch live matches');
    return response.json();
};

export const placeBet = async (betData, token) => {
    const normalizedType = normalizeBetMode(betData?.type || 'straight');
    const normalizedSelections = Array.isArray(betData?.selections)
        ? betData.selections.map((sel) => ({
            ...sel,
            type: normalizeBetMode(sel?.type || sel?.marketType || 'straight')
        }))
        : undefined;

    const payload = {
        ...betData,
        type: normalizedType,
        selections: normalizedSelections
    };

    const response = await fetch(`${API_URL}/bets/place`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to place bet');
    }
    return response.json();
};

export const getPublicBetModeRules = async (token) => {
    const response = await fetch(`${API_URL}/betting/rules`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch bet mode rules');
    return response.json();
};

export const getMyBets = async (token) => {
    const response = await fetch(`${API_URL}/bets/my-bets`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch my bets');
    return response.json();
};

export const getCasinoCategories = async (token) => {
    const response = await fetch(`${API_URL}/casino/categories`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch casino categories');
    return response.json();
};

export const getCasinoGames = async ({ token, category = 'lobby', search = '', featured = false, page = 1, limit = 48 } = {}) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    if (featured) params.set('featured', 'true');
    params.set('page', String(page));
    params.set('limit', String(limit));

    const response = await fetch(`${API_URL}/casino/games?${params.toString()}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch casino games');
    return response.json();
};

export const launchCasinoGame = async (gameId, token) => {
    const response = await fetch(`${API_URL}/casino/games/${gameId}/launch`, {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to launch casino game');
    }
    return response.json();
};

export const createDeposit = async (amount, token) => {
    const response = await fetch(`${API_URL}/wallet/request-deposit`, {
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
    const response = await fetch(`${API_URL}/wallet/request-deposit`, {
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
    const response = await fetch(`${API_URL}/wallet/request-withdrawal`, {
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
    const response = await fetch(`${API_URL}/wallet/transactions?${params.toString()}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch wallet transactions');
    return response.json();
};

// Admin / Agent APIs
export const getAgents = async (token) => {
    const response = await fetch(`${API_URL}/admin/agents`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch agents');
    return response.json();
};

export const getBetModeRules = async (token) => {
    const response = await fetch(`${API_URL}/admin/bet-mode-rules`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch bet mode rules');
    return response.json();
};

export const getAdminHeaderSummary = async (token) => {
    const response = await fetch(`${API_URL}/admin/header-summary`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch admin header summary');
    return response.json();
};

export const getSystemStats = async (token) => {
    const response = await fetch(`${API_URL}/admin/system-stats`, {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch system stats');
    }
    return response.json();
};

export const getWeeklyFigures = async (period, token) => {
    const response = await fetch(`${API_URL}/admin/weekly-figures?period=${encodeURIComponent(period)}`, {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to fetch weekly figures');
};

export const getPendingItems = async (token) => {
    const response = await fetch(`${API_URL}/admin/pending`, {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to fetch pending items');
};

export const approvePendingItem = async (transactionId, token) => {
    const response = await fetch(`${API_URL}/admin/pending/approve`, {
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
    const response = await fetch(`${API_URL}/admin/pending/decline`, {
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
    const response = await fetch(`${API_URL}/admin/messages`, {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to fetch messages');
};

export const markMessageRead = async (messageId, token) => {
    const response = await fetch(`${API_URL}/admin/messages/${messageId}/read`, {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to mark message read');
    return response.json();
};

export const replyToMessage = async (messageId, reply, token) => {
    const response = await fetch(`${API_URL}/admin/messages/${messageId}/reply`, {
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
    const response = await fetch(`${API_URL}/admin/messages/${messageId}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to delete message');
    return response.json();
};

export const getMyMessages = async (token) => {
    const response = await fetch(`${API_URL}/messages/me`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
};

export const createMessage = async (subject, body, token) => {
    const response = await fetch(`${API_URL}/messages`, {
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
    const response = await fetch(`${API_URL}/content/tutorials`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch tutorials');
    return response.json();
};

export const getSupportFaqs = async (token) => {
    const response = await fetch(`${API_URL}/content/faqs`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch FAQs');
    return response.json();
};

export const getAdminMatches = async (token) => {
    const response = await fetch(`${API_URL}/admin/matches`, {
        headers: getHeaders(token)
    });
    return parseJsonResponse(response, 'Failed to fetch matches');
};

export const createAdminMatch = async (matchData, token) => {
    const response = await fetch(`${API_URL}/admin/matches`, {
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
    const response = await fetch(`${API_URL}/admin/matches/${matchId}`, {
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
    const response = await fetch(`${API_URL}/admin/cashier/summary`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch cashier summary');
    return response.json();
};

export const getCashierTransactions = async (token, limit = 50) => {
    const response = await fetch(`${API_URL}/admin/cashier/transactions?limit=${limit}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch cashier transactions');
    return response.json();
};

export const getThirdPartyLimits = async (token) => {
    const response = await fetch(`${API_URL}/admin/third-party-limits`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch third party limits');
    return response.json();
};

export const updateThirdPartyLimit = async (id, payload, token) => {
    const response = await fetch(`${API_URL}/admin/third-party-limits/${id}`, {
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
    const response = await fetch(`${API_URL}/admin/third-party-limits`, {
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
    const response = await fetch(`${API_URL}/admin/bets?${query}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch admin bets');
    return response.json();
};

export const getIpTracker = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/admin/ip-tracker?${query}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch IP tracker');
    return response.json();
};

export const blockIp = async (id, token) => {
    const response = await fetch(`${API_URL}/admin/ip-tracker/${id}/block`, {
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
    const response = await fetch(`${API_URL}/admin/ip-tracker/${id}/unblock`, {
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
    const response = await fetch(`${API_URL}/admin/transactions?${query}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch transactions history');
    return response.json();
};

export const deleteAdminTransactions = async (ids, token) => {
    const response = await fetch(`${API_URL}/admin/transactions`, {
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

export const getCollections = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/admin/collections?${query}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch collections');
    return response.json();
};

export const getDeletedWagers = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/admin/deleted-wagers?${query}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch deleted wagers');
    return response.json();
};

export const restoreDeletedWager = async (id, token) => {
    const response = await fetch(`${API_URL}/admin/deleted-wagers/${id}/restore`, {
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
    const response = await fetch(`${API_URL}/admin/sportsbook-links`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch sportsbook links');
    return response.json();
};

export const createSportsbookLink = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/sportsbook-links`, {
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
    const response = await fetch(`${API_URL}/admin/sportsbook-links/${id}`, {
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

export const whitelistIp = async (id, token) => {
    const response = await fetch(`${API_URL}/admin/ip-tracker/${id}/whitelist`, {
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
    const response = await fetch(`${API_URL}/admin/sportsbook-links/${id}/test`, {
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
    const response = await fetch(`${API_URL}/admin/refresh-odds`, {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to refresh odds');
    }
    return response.json();
};

export const fetchOddsManual = async () => {
    const response = await fetch(`${API_URL}/matches/fetch-odds`, {
        method: 'POST'
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch odds');
    }
    return response.json();
};

export const clearCache = async (token) => {
    const response = await fetch(`${API_URL}/admin/clear-cache`, {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to clear cache');
    }
    return response.json();
};

export const createCollection = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/collections`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create collection');
    }
    return response.json();
};

export const collectCollection = async (id, token) => {
    const response = await fetch(`${API_URL}/admin/collections/${id}/collect`, {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to collect');
    }
    return response.json();
};

export const getCollectionById = async (id, token) => {
    const response = await fetch(`${API_URL}/admin/collections/${id}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch collection');
    return response.json();
};

export const createAdminBet = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/bets`, {
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
    const response = await fetch(`${API_URL}/admin/bets/${id}`, {
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
    const response = await fetch(`${API_URL}/bets/settle`, {
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

export const getAgentPerformance = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/admin/agent-performance?${query}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch agent performance');
    return response.json();
};

export const getAgentPerformanceDetails = async (agentId, params, token) => {
    const query = new URLSearchParams(params || {}).toString();
    const response = await fetch(`${API_URL}/admin/agent-performance/${agentId}/details?${query}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch agent performance details');
    }
    return response.json();
};

export const updateAgentPermissions = async (agentId, permissions, token) => {
    const response = await fetch(`${API_URL}/agent/permissions/${agentId}`, {
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
        console.log('🔐 createAgent API called');
        console.log('📝 Token parameter:', token ? token.substring(0, 50) + '...' : 'NO TOKEN PARAM');
        console.log('📦 Agent data:', agentData);

        if (!token) {
            throw new Error('No token provided. Please login first.');
        }

        const requestHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        console.log('📨 Request headers:', {
            'Content-Type': requestHeaders['Content-Type'],
            'Authorization': requestHeaders['Authorization'] ? 'Bearer ' + token.substring(0, 30) + '...' : 'NONE'
        });

        const response = await fetch(`${API_URL}/admin/create-agent`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(agentData)
        });

        console.log('📊 Response status:', response.status);

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
        const result = await response.json();
        console.log('✅ Agent created:', result);
        return result;
    } catch (error) {
        console.error('❌ Create Agent Error:', error);
        if (error instanceof TypeError) {
            throw new Error('Network error - Unable to reach server. Is the backend running on port 5000?');
        }
        throw error;
    }
};

export const seedWorkflowHierarchy = async (token, payload = {}) => {
    const response = await fetch(`${API_URL}/admin/seed-workflow-hierarchy`, {
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

export const createUserByAdmin = async (userData, token) => {
    try {
        console.log('🔐 createUserByAdmin API called');
        console.log('📝 Token parameter:', token ? token.substring(0, 50) + '...' : 'NO TOKEN PARAM');
        console.log('📦 User data:', userData);

        if (!token) {
            throw new Error('No token provided. Please login first.');
        }

        const requestHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        console.log('📨 Request headers:', {
            'Content-Type': requestHeaders['Content-Type'],
            'Authorization': requestHeaders['Authorization'] ? 'Bearer ' + token.substring(0, 30) + '...' : 'NONE'
        });

        const response = await fetch(`${API_URL}/admin/create-user`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(userData)
        });

        console.log('📊 Response status:', response.status);

        if (!response.ok) {
            let errorMsg = 'Failed to create user';
            try {
                const errorData = await response.json();
                console.error('❌ Server error:', errorData);
                errorMsg = errorData.message || errorMsg;
            } catch (e) {
                errorMsg = `Server error (${response.status}): ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }
        const result = await response.json();
        console.log('✅ User created:', result);
        return result;
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
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update user');
        return data;
    } catch (error) {
        console.error('updateUserByAdmin error:', error);
        throw error;
    }
};

export const updateUserFreeplay = async (userId, freeplayBalance, token, description = '') => {
    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/freeplay`, {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify({ freeplayBalance, description })
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
        console.log('createPlayerByAgent called with token:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');

        if (!token) {
            throw new Error('No token provided. Please login first.');
        }

        const response = await fetch(`${API_URL}/agent/create-user`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            let errorMsg = 'Failed to create player';
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorMsg;
            } catch (e) {
                errorMsg = `Server error (${response.status}): ${response.statusText}`;
            }
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
    const response = await fetch(`${API_URL}/agent/my-users`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch players');
    return response.json();
};

export const getUsersAdmin = async (token, params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${API_URL}/admin/users${suffix}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch users');
    }
    return response.json();
};

export const updateUserCredit = async (userId, payload, token) => {
    const response = await fetch(`${API_URL}/admin/users/${userId}/credit`, {
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

export const updateUserBalanceOwedByAgent = async (userId, balance, token) => {
    const response = await fetch(`${API_URL}/agent/update-balance-owed`, {
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
        const response = await fetch(`${API_URL}/admin/agent/${id}`, {
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
        const response = await fetch(`${API_URL}/agent/users/${userId}`, {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update customer');
        return data;
    } catch (error) {
        console.error('updateUserByAgent error:', error);
        throw error;
    }
};

export const createSubAgent = async (agentData, token) => {
    try {
        const response = await fetch(`${API_URL}/agent/create-sub-agent`, {
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
        const response = await fetch(`${API_URL}/agent/my-sub-agents`, {
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

export const getUserStatistics = async (userId, token) => {
    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/stats`, {
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
    const response = await fetch(`${API_URL}/admin/bets`, {
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
    const response = await fetch(`${API_URL}/admin/billing/summary`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch billing summary');
    return response.json();
};

export const getBillingInvoices = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/admin/billing/invoices?${query}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return response.json();
};

export const createBillingInvoice = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/billing/invoices`, {
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
    const response = await fetch(`${API_URL}/admin/billing/invoices/${id}`, {
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
    const response = await fetch(`${API_URL}/admin/billing/invoices/${id}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch invoice');
    return response.json();
};

export const getSettings = async (token) => {
    const response = await fetch(`${API_URL}/admin/settings`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
};

export const updateSettings = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/settings`, {
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
    const response = await fetch(`${API_URL}/admin/rules`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch rules');
    return response.json();
};

export const createRule = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/rules`, {
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
    const response = await fetch(`${API_URL}/admin/rules/${id}`, {
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
    const response = await fetch(`${API_URL}/admin/rules/${id}`, {
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
    const response = await fetch(`${API_URL}/admin/feedback?${query}`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch feedback');
    return response.json();
};

export const replyFeedback = async (id, payload, token) => {
    const response = await fetch(`${API_URL}/admin/feedback/${id}/reply`, {
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
    const response = await fetch(`${API_URL}/admin/feedback/${id}/reviewed`, {
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
    const response = await fetch(`${API_URL}/admin/feedback/${id}`, {
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
    const response = await fetch(`${API_URL}/admin/faqs`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch FAQs');
    return response.json();
};

export const createFaq = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/faqs`, {
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
    const response = await fetch(`${API_URL}/admin/faqs/${id}`, {
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
    const response = await fetch(`${API_URL}/admin/faqs/${id}`, {
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
    const response = await fetch(`${API_URL}/admin/manual`, {
        headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch manual');
    return response.json();
};

export const createManualSection = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/manual`, {
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
    const response = await fetch(`${API_URL}/admin/manual/${id}`, {
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
    const response = await fetch(`${API_URL}/admin/manual/${id}`, {
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
    const response = await fetch(`${API_URL}/admin/suspend`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error('Failed to suspend user');
    return response.json();
};

export const unsuspendUser = async (userId, token) => {
    const response = await fetch(`${API_URL}/admin/unsuspend`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error('Failed to unsuspend user');
    return response.json();
};
export const resetUserPasswordByAdmin = async (id, newPassword, token) => {
    const response = await fetch(`${API_URL}/admin/users/${id}/reset-password`, {
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
    const response = await fetch(`${API_URL}/admin/agents/${id}/reset-password`, {
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
    const queryString = new URLSearchParams(safeParams).toString();
    const nextPath = `/admin/next-username/${encodeURIComponent(safePrefix)}`;
    const url = API_URL.includes('?path=')
        ? `${API_URL}${nextPath}${queryString ? `&${queryString}` : ''}`
        : `${API_URL}${nextPath}${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch next username');
    }
    return response.json();
};
export const impersonateUser = async (userId, token) => {
    const response = await fetch(`${API_URL}/admin/impersonate-user/${userId}`, {
        method: 'POST',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to impersonate user');
    }
    return response.json();
};

export const getAgentTree = async (token) => {
    const response = await fetch(`${API_URL}/admin/agent-tree`, {
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch agent tree');
    }
    return response.json();
};

export const deleteUser = async (userId, token) => {
    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
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
    const response = await fetch(`${API_URL}/admin/agents/${agentId}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete agent');
    }
    return response.json();
};
