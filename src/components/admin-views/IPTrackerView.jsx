import React, { useState } from 'react';

function IPTrackerView() {
  const [ipData] = useState([
    { id: 1, ip: '192.168.1.1', user: 'User123', country: 'USA', city: 'New York', lastActive: '2025-01-13 14:30', status: 'active' },
    { id: 2, ip: '10.0.0.1', user: 'User456', country: 'UK', city: 'London', lastActive: '2025-01-13 12:15', status: 'active' },
    { id: 3, ip: '172.16.0.1', user: 'User789', country: 'Canada', city: 'Toronto', lastActive: '2025-01-12 18:45', status: 'inactive' },
    { id: 4, ip: '203.0.113.1', user: 'User101', country: 'Australia', city: 'Sydney', lastActive: '2025-01-13 16:20', status: 'active' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>IP Tracker</h2>
      </div>
      <div className="view-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>User</th>
                <th>Country</th>
                <th>City</th>
                <th>Last Active</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {ipData.map(ip => (
                <tr key={ip.id}>
                  <td className="monospace">{ip.ip}</td>
                  <td>{ip.user}</td>
                  <td>{ip.country}</td>
                  <td>{ip.city}</td>
                  <td>{ip.lastActive}</td>
                  <td><span className={`badge ${ip.status}`}>{ip.status}</span></td>
                  <td>
                    <button className="btn-small">View</button>
                    <button className="btn-small btn-danger">Block</button>
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

export default IPTrackerView;
