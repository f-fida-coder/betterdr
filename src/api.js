export const API_URL = 'http://localhost:5000/api';

export const loginUser = async (username, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
    }
    return response.json();
};

export const loginAdmin = async (username, password) => {
    const response = await fetch(`${API_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Admin login failed');
    }
    return response.json();
};

export const loginAgent = async (username, password) => {
    const response = await fetch(`${API_URL}/auth/agent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Agent login failed');
    }
    return response.json();
};

export const registerUser = async (userData) => {
    try {
        console.log('Calling registerUser API with:', userData.username);
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch balance');
    return response.json();
};

export const getMe = async (token) => {
    const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
};

export const getMatches = async () => {
    const response = await fetch(`${API_URL}/matches`);
    if (!response.ok) throw new Error('Failed to fetch matches');
    return response.json();
};

export const getLiveMatches = async () => {
    const response = await fetch(`${API_URL}/matches?status=live`);
    if (!response.ok) throw new Error('Failed to fetch live matches');
    return response.json();
};

export const placeBet = async (betData, token) => {
    const response = await fetch(`${API_URL}/bets/place`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(betData)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to place bet');
    }
    return response.json();
};

export const getMyBets = async (token) => {
    const response = await fetch(`${API_URL}/bets/my-bets`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch my bets');
    return response.json();
};

export const createDeposit = async (amount, token) => {
    const response = await fetch(`${API_URL}/payments/deposit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, currency: 'usd' })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Deposit failed');
    }
    return response.json();
};

// Admin / Agent APIs
export const getAgents = async (token) => {
    const response = await fetch(`${API_URL}/admin/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch agents');
    return response.json();
};

export const getAdminHeaderSummary = async (token) => {
    const response = await fetch(`${API_URL}/admin/header-summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch admin header summary');
    return response.json();
};

export const getWeeklyFigures = async (period, token) => {
    const response = await fetch(`${API_URL}/admin/weekly-figures?period=${encodeURIComponent(period)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch weekly figures');
    return response.json();
};

export const getPendingItems = async (token) => {
    const response = await fetch(`${API_URL}/admin/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch pending items');
    return response.json();
};

export const approvePendingItem = async (transactionId, token) => {
    const response = await fetch(`${API_URL}/admin/pending/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
};

export const markMessageRead = async (messageId, token) => {
    const response = await fetch(`${API_URL}/admin/messages/${messageId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to mark message read');
    return response.json();
};

export const replyToMessage = async (messageId, reply, token) => {
    const response = await fetch(`${API_URL}/admin/messages/${messageId}/reply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete message');
    return response.json();
};

export const getMyMessages = async (token) => {
    const response = await fetch(`${API_URL}/messages/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
};

export const createMessage = async (subject, body, token) => {
    const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject, body })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to send message');
    }
    return response.json();
};

export const getAdminMatches = async (token) => {
    const response = await fetch(`${API_URL}/admin/matches`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch matches');
    return response.json();
};

export const createAdminMatch = async (matchData, token) => {
    const response = await fetch(`${API_URL}/admin/matches`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch cashier summary');
    return response.json();
};

export const getCashierTransactions = async (token, limit = 50) => {
    const response = await fetch(`${API_URL}/admin/cashier/transactions?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch cashier transactions');
    return response.json();
};

export const getThirdPartyLimits = async (token) => {
    const response = await fetch(`${API_URL}/admin/third-party-limits`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch third party limits');
    return response.json();
};

export const updateThirdPartyLimit = async (id, payload, token) => {
    const response = await fetch(`${API_URL}/admin/third-party-limits/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch admin bets');
    return response.json();
};

export const getIpTracker = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/admin/ip-tracker?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch IP tracker');
    return response.json();
};

export const blockIp = async (id, token) => {
    const response = await fetch(`${API_URL}/admin/ip-tracker/${id}/block`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch transactions history');
    return response.json();
};

export const getCollections = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/admin/collections?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch collections');
    return response.json();
};

export const getDeletedWagers = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/admin/deleted-wagers?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch deleted wagers');
    return response.json();
};

export const restoreDeletedWager = async (id, token) => {
    const response = await fetch(`${API_URL}/admin/deleted-wagers/${id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to restore wager');
    }
    return response.json();
};

export const getSportsbookLinks = async (token) => {
    const response = await fetch(`${API_URL}/admin/sportsbook-links`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch sportsbook links');
    return response.json();
};

export const createSportsbookLink = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/sportsbook-links`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update sportsbook link');
    }
    return response.json();
};

export const testSportsbookLink = async (id, token) => {
    const response = await fetch(`${API_URL}/admin/sportsbook-links/${id}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to collect');
    }
    return response.json();
};

export const getCollectionById = async (id, token) => {
    const response = await fetch(`${API_URL}/admin/collections/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch collection');
    return response.json();
};

export const createAdminBet = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/bets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create bet');
    }
    return response.json();
};

export const settleMatchBets = async (payload, token) => {
    const response = await fetch(`${API_URL}/bets/settle`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch agent performance');
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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

export const createPlayerByAgent = async (userData, token) => {
    try {
        console.log('createPlayerByAgent called with token:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');

        if (!token) {
            throw new Error('No token provided. Please login first.');
        }

        const response = await fetch(`${API_URL}/agent/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch players');
    return response.json();
};

export const updateUserCredit = async (userId, payload, token) => {
    const response = await fetch(`${API_URL}/admin/users/${userId}/credit`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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
            headers: {
                'Authorization': `Bearer ${token}`
            }
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
            headers: {
                'Authorization': `Bearer ${token}`
            }
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch billing summary');
    return response.json();
};

export const getBillingInvoices = async (params, token) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/admin/billing/invoices?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return response.json();
};

export const createBillingInvoice = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/billing/invoices`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch invoice');
    return response.json();
};

export const getSettings = async (token) => {
    const response = await fetch(`${API_URL}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
};

export const updateSettings = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch rules');
    return response.json();
};

export const createRule = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/rules`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch feedback');
    return response.json();
};

export const replyFeedback = async (id, payload, token) => {
    const response = await fetch(`${API_URL}/admin/feedback/${id}/reply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete feedback');
    }
    return response.json();
};

export const getFaqs = async (token) => {
    const response = await fetch(`${API_URL}/admin/faqs`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch FAQs');
    return response.json();
};

export const createFaq = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/faqs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete FAQ');
    }
    return response.json();
};

export const getManualSections = async (token) => {
    const response = await fetch(`${API_URL}/admin/manual`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch manual');
    return response.json();
};

export const createManualSection = async (payload, token) => {
    const response = await fetch(`${API_URL}/admin/manual`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error('Failed to suspend user');
    return response.json();
};

export const unsuspendUser = async (userId, token) => {
    const response = await fetch(`${API_URL}/admin/unsuspend`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error('Failed to unsuspend user');
    return response.json();
};
export const resetUserPasswordByAdmin = async (id, newPassword, token) => {
    const response = await fetch(`${API_URL}/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset agent password');
    }
    return response.json();
};

export const getNextUsername = async (prefix, token) => {
    const response = await fetch(`${API_URL}/admin/next-username/${prefix}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch next username');
    return response.json();
};
