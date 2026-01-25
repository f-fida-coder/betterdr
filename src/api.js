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
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
    }
    return response.json();
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
