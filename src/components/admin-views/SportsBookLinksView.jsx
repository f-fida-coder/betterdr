import React, { useState } from 'react';

function SportsBookLinksView() {
  const [links] = useState([
    { id: 1, name: 'BetKing API', url: 'https://api.betking.com', status: 'active', lastSync: '2025-01-13 15:30' },
    { id: 2, name: 'SBTech Integration', url: 'https://api.sbtech.com', status: 'active', lastSync: '2025-01-13 14:15' },
    { id: 3, name: 'Kambi Sports', url: 'https://api.kambi.com', status: 'inactive', lastSync: '2025-01-12 10:00' },
    { id: 4, name: 'GVC Holdings', url: 'https://api.gvc.com', status: 'active', lastSync: '2025-01-13 13:45' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Sportsbook Links</h2>
        <button className="btn-primary">Add New Link</button>
      </div>
      <div className="view-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider Name</th>
                <th>API URL</th>
                <th>Status</th>
                <th>Last Sync</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {links.map(link => (
                <tr key={link.id}>
                  <td>{link.name}</td>
                  <td className="monospace">{link.url}</td>
                  <td><span className={`badge ${link.status}`}>{link.status}</span></td>
                  <td>{link.lastSync}</td>
                  <td>
                    <button className="btn-small">Edit</button>
                    <button className="btn-small">Test</button>
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

export default SportsBookLinksView;
