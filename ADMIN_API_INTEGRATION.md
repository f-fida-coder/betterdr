# Admin Panel - API Integration Guide

## Overview

This guide shows how to replace mock data with real API calls in the admin panel components.

---

## Basic API Integration Pattern

### Before (Mock Data)
```javascript
import React, { useState } from 'react';

function CustomerAdminView() {
  const [customers] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
    // ...
  ]);

  return (
    // JSX here
  );
}

export default CustomerAdminView;
```

### After (Real API)
```javascript
import React, { useState, useEffect } from 'react';

function CustomerAdminView() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/customers');
      const data = await response.json();
      setCustomers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="admin-view"><p>Loading...</p></div>;
  if (error) return <div className="admin-view"><p>Error: {error}</p></div>;

  return (
    // JSX with data
  );
}

export default CustomerAdminView;
```

---

## API Endpoints Reference

### Customer Endpoints

#### Get All Customers
```
GET /api/admin/customers
Response: [{ id, name, email, status, balance, joined }, ...]
```

#### Get Single Customer
```
GET /api/admin/customers/:id
Response: { id, name, email, status, balance, joined, history, notes, ... }
```

#### Add Customer
```
POST /api/admin/customers
Request: { username, email, password, firstName, lastName, phone, address }
Response: { id, name, email, status, ... }
```

#### Update Customer
```
PUT /api/admin/customers/:id
Request: { name, email, status, balance, ... }
Response: { id, name, email, status, ... }
```

#### Delete Customer
```
DELETE /api/admin/customers/:id
Response: { success: true }
```

---

### Transaction Endpoints

#### Get Transactions
```
GET /api/admin/transactions
Query: ?type=deposit&status=completed&limit=100
Response: [{ id, type, user, amount, date, status }, ...]
```

#### Get Pending Transactions
```
GET /api/admin/transactions?status=pending
Response: [{ id, type, amount, user, date }, ...]
```

#### Process Transaction
```
POST /api/admin/transactions/:id/approve
Request: {}
Response: { id, status: 'completed' }
```

#### Decline Transaction
```
POST /api/admin/transactions/:id/decline
Request: { reason: 'string' }
Response: { id, status: 'declined' }
```

---

### Game & Betting Endpoints

#### Get All Games
```
GET /api/admin/games
Response: [{ id, name, status, bets, revenue }, ...]
```

#### Get Scores
```
GET /api/admin/scores
Query: ?sport=nba&date=2025-01-13
Response: [{ id, sport, match, score, status, date }, ...]
```

#### Update Score
```
PUT /api/admin/scores/:id
Request: { score: 'string', status: 'final' }
Response: { id, match, score, status }
```

#### Get Betting Data
```
GET /api/admin/bets
Query: ?limit=50&sort=-date
Response: [{ id, user, bet, amount, odds, date }, ...]
```

---

### Analytics Endpoints

#### Get Weekly Figures
```
GET /api/admin/analytics/weekly
Response: {
  totalRevenue: number,
  totalBets: number,
  averageBet: number,
  winRate: number,
  daily: [{ day, bets, revenue, winRate }, ...]
}
```

#### Get Agent Performance
```
GET /api/admin/agents/performance
Response: [{ id, name, revenue, customers, winRate, trend }, ...]
```

#### Get Analysis Data
```
GET /api/admin/analytics/:type
Types: betting-trends, customer-analytics, revenue, risk
Response: { data: [...], charts: {...} }
```

---

### System Endpoints

#### Get Settings
```
GET /api/admin/settings
Response: { platformName, dailyBetLimit, weeklyBetLimit, ... }
```

#### Update Settings
```
PUT /api/admin/settings
Request: { platformName, dailyBetLimit, ... }
Response: { success: true, settings: {...} }
```

#### Get Rules
```
GET /api/admin/rules
Response: [{ id, category, rules: [...] }, ...]
```

#### Update Rules
```
PUT /api/admin/rules/:id
Request: { category, rules: [...] }
Response: { id, category, rules: [...] }
```

---

## Complete Example: WeeklyFiguresView with API

```javascript
import React, { useState, useEffect } from 'react';

function WeeklyFiguresView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const fetchWeeklyData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/weekly');
      if (!response.ok) throw new Error('Failed to fetch');
      const jsonData = await response.json();
      setData(jsonData);
      setError(null);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-view">
        <div className="view-header"><h2>Weekly Figures</h2></div>
        <div className="view-content">
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-view">
        <div className="view-header"><h2>Weekly Figures</h2></div>
        <div className="view-content">
          <p>Error: {error}</p>
          <button onClick={fetchWeeklyData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Weekly Figures</h2>
      </div>
      <div className="view-content">
        {data && (
          <>
            <div className="stats-container">
              <div className="stat-card">
                <h3>Total Revenue</h3>
                <p className="amount">${data.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <h3>Total Bets</h3>
                <p className="amount">{data.totalBets}</p>
              </div>
              <div className="stat-card">
                <h3>Average Bet</h3>
                <p className="amount">${data.averageBet.toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <h3>Win Rate</h3>
                <p className="amount">{(data.winRate * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div className="table-container">
              <h3>Daily Breakdown</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Bets</th>
                    <th>Revenue</th>
                    <th>Win Rate</th>
                    <th>Avg Bet</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((day, idx) => (
                    <tr key={idx}>
                      <td>{day.day}</td>
                      <td>{day.bets}</td>
                      <td>${day.revenue.toFixed(2)}</td>
                      <td>{(day.winRate * 100).toFixed(1)}%</td>
                      <td>${day.avgBet.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WeeklyFiguresView;
```

---

## Authentication & Headers

### Adding Auth Token
```javascript
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  return fetch(url, { ...options, headers });
};

// Usage
const response = await fetchWithAuth('/api/admin/customers');
const data = await response.json();
```

### Using Axios (Optional)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
});

// Usage
const { data } = await api.get('/admin/customers');
```

---

## Error Handling Patterns

### Global Error Handler
```javascript
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    console.error('Error:', error.response.status, error.response.data);
    return error.response.data.message || 'Server error';
  } else if (error.request) {
    // Request made but no response
    return 'No response from server';
  } else {
    // Other errors
    return error.message;
  }
};

// Usage
try {
  const response = await fetch('/api/admin/customers');
  // ...
} catch (error) {
  setError(handleApiError(error));
}
```

---

## Caching Strategy

```javascript
const useDataCache = () => {
  const cache = new Map();
  const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

  return {
    get: (key) => {
      const item = cache.get(key);
      if (item && Date.now() - item.time < CACHE_TIME) {
        return item.data;
      }
      return null;
    },
    set: (key, data) => {
      cache.set(key, { data, time: Date.now() });
    },
    clear: (key) => cache.delete(key)
  };
};

// Usage in component
const dataCache = useDataCache();

const fetchCustomers = async () => {
  const cached = dataCache.get('customers');
  if (cached) return setCustomers(cached);

  const response = await fetch('/api/admin/customers');
  const data = await response.json();
  dataCache.set('customers', data);
  setCustomers(data);
};
```

---

## Real-time Updates with WebSocket

```javascript
useEffect(() => {
  const ws = new WebSocket('wss://api.example.com/admin/events');

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    if (message.type === 'new-transaction') {
      setTransactions(prev => [message.data, ...prev]);
    }
    if (message.type === 'customer-action') {
      setCustomers(prev => 
        prev.map(c => c.id === message.data.id ? message.data : c)
      );
    }
  };

  return () => ws.close();
}, []);
```

---

## Form Submission with API

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const response = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error('Submission failed');
    }

    const result = await response.json();
    alert('Customer added successfully!');
    setFormData(initialState);
    
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Environment Configuration

### `.env` file
```
VITE_API_BASE_URL=https://api.example.com
VITE_API_TIMEOUT=10000
VITE_ENABLE_CACHE=true
```

### Usage
```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL;

const response = await fetch(`${API_BASE}/admin/customers`);
```

---

## Testing Mock API (Before Backend)

### Using Mock Service Worker
```bash
npm install msw
```

### Setup (src/mocks/handlers.js)
```javascript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/admin/customers', () => {
    return HttpResponse.json([
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' }
    ]);
  }),
];
```

---

## Performance Optimization

### Pagination
```javascript
const [page, setPage] = useState(1);
const ITEMS_PER_PAGE = 20;

const fetchCustomers = async (pageNum) => {
  const response = await fetch(
    `/api/admin/customers?page=${pageNum}&limit=${ITEMS_PER_PAGE}`
  );
  // ...
};
```

### Filtering
```javascript
const [filters, setFilters] = useState({ status: 'all', search: '' });

const fetchCustomers = async () => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/admin/customers?${params}`);
  // ...
};
```

### Debouncing Search
```javascript
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

const handleSearch = debounce((searchTerm) => {
  fetchCustomers(searchTerm);
}, 500);
```

---

## Monitoring & Logging

```javascript
const logApiCall = (method, url, status, duration) => {
  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${status} (${duration}ms)`);
};

const fetchWithLogging = async (url, options = {}) => {
  const start = performance.now();
  
  try {
    const response = await fetch(url, options);
    const duration = performance.now() - start;
    logApiCall(options.method || 'GET', url, response.status, duration);
    return response;
  } catch (error) {
    const duration = performance.now() - start;
    logApiCall(options.method || 'GET', url, 'ERROR', duration);
    throw error;
  }
};
```

---

## Migration Checklist

- [ ] Install required dependencies (axios, react-query, etc.)
- [ ] Create API service file
- [ ] Setup authentication headers
- [ ] Replace mock data with API calls
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test all endpoints
- [ ] Implement caching
- [ ] Add real-time updates
- [ ] Setup environment variables
- [ ] Monitor API performance
- [ ] Deploy to production

---

**Version**: 1.0
**Last Updated**: January 2026
**Status**: Ready for Implementation
