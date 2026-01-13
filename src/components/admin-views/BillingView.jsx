import React, { useState } from 'react';

function BillingView() {
  const [invoices] = useState([
    { id: 1, invoice: 'INV-2025-001', date: '2025-01-01', amount: '$5,000.00', status: 'paid' },
    { id: 2, invoice: 'INV-2025-002', date: '2025-01-08', amount: '$6,500.00', status: 'paid' },
    { id: 3, invoice: 'INV-2025-003', date: '2025-01-13', amount: '$7,200.00', status: 'pending' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Billing Management</h2>
      </div>
      <div className="view-content">
        <div className="billing-summary">
          <div className="summary-card">
            <h3>Total Paid</h3>
            <p className="amount">$11,500.00</p>
          </div>
          <div className="summary-card">
            <h3>Total Outstanding</h3>
            <p className="amount">$7,200.00</p>
          </div>
          <div className="summary-card">
            <h3>Total All Time</h3>
            <p className="amount">$18,700.00</p>
          </div>
        </div>

        <div className="table-container">
          <h3>Recent Invoices</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice}</td>
                  <td>{invoice.date}</td>
                  <td>{invoice.amount}</td>
                  <td><span className={`badge ${invoice.status}`}>{invoice.status}</span></td>
                  <td>
                    <button className="btn-small">Download</button>
                    <button className="btn-small">View</button>
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

export default BillingView;
