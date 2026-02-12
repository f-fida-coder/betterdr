import React, { useState, useEffect } from 'react';
import { getAgents, createUserByAdmin, createPlayerByAgent } from '../../api';

function AddCustomerView() {
  const [formData, setFormData] = useState({
    username: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    country: '',
    agentId: '', // For admin to select agent
    minBet: '1',
    maxBet: '5000',
    creditLimit: '1000',
    balanceOwed: '0'
  });
  const [role, setRole] = useState('user');
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  useEffect(() => {
    const fetchRoleAndAgents = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userRole = payload.role;
        setRole(userRole);

        if (userRole === 'admin' || userRole === 'super_agent') {
          setLoadingAgents(true);
          const agentList = await getAgents(token);
          // Only show sub-agents (role: agent), not super agents
          setAgents((agentList || []).filter(a => a.role === 'agent'));
          setLoadingAgents(false);
        }
      } catch (error) {
        console.error('Error fetching role or agents:', error);
        setLoadingAgents(false);
      }
    };
    fetchRoleAndAgents();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('ERROR: No token found! Please login first.');
        return;
      }

      if (role === 'agent' || role === 'super_agent') {
        console.log('Creating player via agent API');
        await createPlayerByAgent({
          username: formData.username,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          minBet: formData.minBet,
          maxBet: formData.maxBet,
          creditLimit: formData.creditLimit,
          balanceOwed: formData.balanceOwed
        }, token);
      } else {
        // Admin or fallback
        console.log('Creating user via admin API');
        await createUserByAdmin({
          username: formData.username,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          agentId: formData.agentId || null, // Pass selected agent
          minBet: formData.minBet,
          maxBet: formData.maxBet,
          creditLimit: formData.creditLimit,
          balanceOwed: formData.balanceOwed
        }, token);
      }

      alert('Customer added successfully!');
      setFormData({
        username: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        country: '',
        agentId: '',
        minBet: '1',
        maxBet: '5000',
        creditLimit: '1000',
        balanceOwed: '0'
      });
    } catch (error) {
      alert('Failed to add customer: ' + error.message);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Add New Customer</h2>
      </div>
      <div className="view-content">
        <div className="form-container">
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-section">
              <h3>Account Information</h3>
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label>Phone Number:</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  placeholder="Enter phone number"
                />
              </div>
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter password"
                />
              </div>
              <div className="form-group">
                <label>Confirm Password:</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm password"
                />
              </div>

              {(role === 'admin' || role === 'super_agent') && (
                <div className="form-group">
                  <label>Assign to Agent (Optional):</label>
                  <select
                    name="agentId"
                    value={formData.agentId}
                    onChange={handleChange}
                    className="form-control"
                  >
                    <option value="">-- Direct User (No Agent) --</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.username} ({agent.userCount || 0} users)
                      </option>
                    ))}
                  </select>
                  {loadingAgents && <small>Loading agents...</small>}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Min Bet:</label>
                  <input
                    type="number"
                    name="minBet"
                    value={formData.minBet}
                    onChange={handleChange}
                    placeholder="1"
                  />
                </div>
                <div className="form-group">
                  <label>Max Bet:</label>
                  <input
                    type="number"
                    name="maxBet"
                    value={formData.maxBet}
                    onChange={handleChange}
                    placeholder="5000"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Credit Limit:</label>
                  <input
                    type="number"
                    name="creditLimit"
                    value={formData.creditLimit}
                    onChange={handleChange}
                    placeholder="1000"
                  />
                </div>
                <div className="form-group">
                  <label>Balance Owed (Settle):</label>
                  <input
                    type="number"
                    name="balanceOwed"
                    value={formData.balanceOwed}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Personal Information</h3>
              <div className="form-group">
                <label>First Name:</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                />
              </div>
              <div className="form-group">
                <label>Last Name:</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                />
              </div>

            </div>

            <div className="form-section">
              <h3>Address</h3>
              <div className="form-group">
                <label>Address:</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                />
              </div>
              <div className="form-group">
                <label>City:</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              </div>
              <div className="form-group">
                <label>Country:</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Enter country"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Add Customer</button>
              <button type="reset" className="btn-secondary">Clear</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddCustomerView;
