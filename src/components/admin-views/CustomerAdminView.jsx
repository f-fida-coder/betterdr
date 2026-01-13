import React, { useState } from 'react';

function CustomerAdminView() {
  const [customers] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', balance: '$1,250.00', joined: '2024-06-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', balance: '$2,500.00', joined: '2024-07-20' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'suspended', balance: '$500.00', joined: '2024-05-10' },
    { id: 4, name: 'Alice Williams', email: 'alice@example.com', status: 'active', balance: '$3,200.00', joined: '2024-08-05' },
    { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', status: 'inactive', balance: '$0.00', joined: '2024-04-15' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Customer Administration</h2>
        <button className="btn-primary">Add New Customer</button>
      </div>
      <div className="view-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Balance</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>
                  <td><span className={`badge ${customer.status}`}>{customer.status}</span></td>
                  <td>{customer.balance}</td>
                  <td>{customer.joined}</td>
                  <td>
                    <button className="btn-small">Edit</button>
                    <button className="btn-small">View</button>
                    <button className="btn-small btn-danger">Suspend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CustomerAdminView;
