import React, { useState } from 'react';

function WeeklyFiguresView() {
  const [timePeriod, setTimePeriod] = useState('this-week');
  const [searchTerm, setSearchTerm] = useState('');

  const summaryData = {
    totalPlayers: 6293,
    deadAccounts: 4852,
    agentsManagers: 891,
    summary: [
      { day: 'Mon (1/5)', amount: 2862.240, color: '#e74c3c' },
      { day: 'Tue (1/6)', amount: 3.106 },
      { day: 'Wed (1/7)', amount: 0 },
      { day: 'Thu (1/8)', amount: 0 },
      { day: 'Fri (1/9)', amount: 0 },
      { day: 'Sat (1/10)', amount: 0 },
      { day: 'Sun (1/11)', amount: 0 },
    ]
  };

  const customerData = [
    { id: 'MNK101', name: 'Alfred Simpson', password: 'AF123', carry: -43, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, week: 0, balance: -43, pending: 0 },
    { id: 'MNK102', name: 'Jared Tinsman', password: 'JT123', carry: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, week: 0, balance: 0, pending: 0 },
    { id: 'MNK103', name: 'James Adeleman', password: 'JARADE6635', carry: 62, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, week: 0, balance: 62, pending: 0 },
    { id: 'MNK104', name: 'Jacob Hand', password: 'JACHAN8022', carry: 40, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, week: 0, balance: 40, pending: 0 },
    { id: 'MNK106', name: 'Harrison Iarrde', password: 'HARLAR2838', carry: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, week: 0, balance: 0, pending: 0 },
    { id: 'MNK108', name: 'Jaxon Bunton', password: 'JAXBUN8858', carry: -188, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, week: 0, balance: -188, pending: 0 },
    { id: 'MNK109', name: 'Barry smith', password: 'BARISMI2774', carry: -181, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, week: 0, balance: -181, pending: 0 },
    { id: 'MNK111', name: 'Luke reneick', password: 'LUKREN2208', carry: -68, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, week: 0, balance: -68, pending: 0 },
    { id: 'MNK112', name: 'Jake Kie', password: 'JAKLES2317', carry: -657, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, week: 0, balance: -657, pending: 0 },
    { id: 'MNK113', name: 'Tomás', password: 'TOMAS1015', carry: -197, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, week: 0, balance: -197, pending: 0 },
  ];

  const filteredData = customerData.filter(customer =>
    customer.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Weekly Figures - Summary & Customer Tracking</h2>
        <div className="period-filter">
          <button 
            className={timePeriod === 'this-week' ? 'active' : ''}
            onClick={() => setTimePeriod('this-week')}
          >
            This Week
          </button>
          <button 
            className={timePeriod === 'last-week' ? 'active' : ''}
            onClick={() => setTimePeriod('last-week')}
          >
            Last Week
          </button>
          <button 
            className={timePeriod === 'previous' ? 'active' : ''}
            onClick={() => setTimePeriod('previous')}
          >
            Previous Weeks
          </button>
        </div>
      </div>

      <div className="view-content">
        {/* Summary Section */}
        <div className="summary-section">
          <div className="summary-header">
            <h3>Summary</h3>
          </div>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Carry</th>
                {summaryData.summary.map((day, idx) => (
                  <th key={idx}>{day.day}</th>
                ))}
                <th>Week</th>
                <th>Balance</th>
                <th>Pending</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>{summaryData.totalPlayers} Players</strong></td>
                <td style={{ color: '#e74c3c' }}>2,662.240</td>
                <td>3.106</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>3.106</td>
                <td style={{ color: '#e74c3c' }}>-2,661.534</td>
                <td>104.354</td>
              </tr>
            </tbody>
          </table>

          <div className="dead-agents-row">
            <span><strong>DEAD / AGENTS / MANAGERS</strong></span>
            <span className="value">{summaryData.deadAccounts}</span>
          </div>
        </div>

        {/* Customer Table Section */}
        <div className="customer-section">
          <div className="section-header">
            <h3>Customer</h3>
            <input 
              type="text" 
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="table-container scrollable">
            <table className="data-table customer-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Name</th>
                  <th>Password</th>
                  <th>Carry</th>
                  <th>Mon (1/5)</th>
                  <th>Tue (1/6)</th>
                  <th>Wed (1/7)</th>
                  <th>Thu (1/8)</th>
                  <th>Fri (1/9)</th>
                  <th>Sat (1/10)</th>
                  <th>Sun (1/11)</th>
                  <th>Week</th>
                  <th>Balance</th>
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((customer, idx) => (
                  <tr key={idx}>
                    <td><strong>{customer.id}</strong></td>
                    <td>{customer.name}</td>
                    <td>{customer.password}</td>
                    <td style={{ color: customer.carry < 0 ? '#e74c3c' : '#27ae60' }}>
                      {customer.carry}
                    </td>
                    <td>{customer.mon}</td>
                    <td>{customer.tue}</td>
                    <td>{customer.wed}</td>
                    <td>{customer.thu}</td>
                    <td>{customer.fri}</td>
                    <td>{customer.sat}</td>
                    <td>{customer.sun}</td>
                    <td>{customer.week}</td>
                    <td style={{ color: customer.balance < 0 ? '#e74c3c' : '#27ae60' }}>
                      {customer.balance}
                    </td>
                    <td>{customer.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeeklyFiguresView;
