// Quick API Reference for Agent & User Creation

const API_BASE = 'http://localhost:5000/api';

// Create Agent Endpoint
const createAgent = async (username, phoneNumber, password, fullName, token) => {
  const response = await fetch(`${API_BASE}/admin/create-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      username,
      phoneNumber,
      password,
      fullName
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
};

// Create User Endpoint
const createUser = async (username, phoneNumber, password, fullName, token) => {
  const response = await fetch(`${API_BASE}/admin/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      username,
      phoneNumber,
      password,
      fullName
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
};

// Get All Users Endpoint
const getUsers = async (token) => {
  const response = await fetch(`${API_BASE}/admin/users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return await response.json();
};

// Usage Example in React Component
/*
import { useState } from 'react';

function AdminPanel() {
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const token = localStorage.getItem('authToken');

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const result = await createAgent(username, phoneNumber, password, fullName, token);
      console.log('Agent created:', result);
      alert(`Agent ${result.agent.username} created successfully!`);
      // Reset form
      setUsername('');
      setPhoneNumber('');
      setPassword('');
      setFullName('');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleCreateAgent}>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
      <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number" required />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" />
      <button type="submit">Create Agent</button>
    </form>
  );
}
*/

export { createAgent, createUser, getUsers };
