import React, { useState, useEffect } from 'react';
import { getMyPlayers } from '../../api';

function CustomerAdminView({ onViewChange }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        let role = 'user';
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          role = payload.role;
        } catch (unused) {
          if (token && token.startsWith('demo_token')) role = 'admin';
        }

        let data = [];
        if (role === 'agent') {
          data = await getMyPlayers(token);
        } else {
          // Admin
          const response = await fetch('http://localhost:5000/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) {
            throw new Error('Failed to fetch users');
          }
          data = await response.json();
        }

        setCustomers(data);
        setError('');
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Customer Administration</h2>
        <button className="btn-primary" onClick={() => onViewChange && onViewChange('add-customer')}>Add New Customer</button>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading users...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Balance</th>
                  <th>Role</th>
                  <th>Agent</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No users found</td>
                  </tr>
                ) : (
                  customers.map(customer => (
                    <tr key={customer.id}>
                      <td>{customer.username}</td>
                      <td>{customer.email}</td>
                      <td><span className={`badge ${customer.status}`}>{customer.status}</span></td>
                      <td>${parseFloat(customer.balance).toFixed(2)}</td>
                      <td><span className={`badge ${customer.role}`}>{customer.role}</span></td>
                      <td style={{ fontWeight: 'bold', color: customer.agentId ? '#3498db' : '#999' }}>
                        {customer.agentId ? (customer.agentId.username || 'Unknown') : 'Direct (Admin)'}
                      </td>
                      <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn-small">Edit</button>
                        <button className="btn-small">View</button>
                        <button className="btn-small btn-danger">Suspend</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerAdminView;
