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

export const getMatches = async () => {
    const response = await fetch(`${API_URL}/matches`);
    if (!response.ok) throw new Error('Failed to fetch matches');
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

export const createAgent = async (agentData, token) => {
    try {
        console.log('createAgent called with token:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');
        
        if (!token) {
            throw new Error('No token provided. Please login first.');
        }
        
        const response = await fetch(`${API_URL}/admin/create-agent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(agentData)
        });
        if (!response.ok) {
            let errorMsg = 'Failed to create agent';
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
        console.error('Create Agent Error:', error);
        if (error instanceof TypeError) {
            throw new Error('Network error - Unable to reach server. Is the backend running on port 5000?');
        }
        throw error;
    }
};

export const createUserByAdmin = async (userData, token) => {
    try {
        console.log('createUserByAdmin called with token:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');
        
        if (!token) {
            throw new Error('No token provided. Please login first.');
        }
        
        const response = await fetch(`${API_URL}/admin/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            let errorMsg = 'Failed to create user';
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
        console.error('Create User Error:', error);
        if (error instanceof TypeError) {
            throw new Error('Network error - Unable to reach server. Is the backend running on port 5000?');
        }
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
