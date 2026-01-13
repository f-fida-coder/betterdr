import React, { useState } from 'react';

function GameAdminView() {
  const [games] = useState([
    { id: 1, name: 'NBA Regular Season', status: 'active', bets: 245, revenue: '$4,250.00' },
    { id: 2, name: 'NFL Week 18', status: 'active', bets: 892, revenue: '$12,800.00' },
    { id: 3, name: 'Premier League', status: 'active', bets: 567, revenue: '$7,600.00' },
    { id: 4, name: 'Champions League', status: 'upcoming', bets: 0, revenue: '$0.00' },
    { id: 5, name: 'NCAA Basketball', status: 'active', bets: 423, revenue: '$5,900.00' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Game Administration</h2>
        <button className="btn-primary">Add New Game</button>
      </div>
      <div className="view-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Game Name</th>
                <th>Status</th>
                <th>Active Bets</th>
                <th>Revenue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {games.map(game => (
                <tr key={game.id}>
                  <td>{game.name}</td>
                  <td><span className={`badge ${game.status}`}>{game.status}</span></td>
                  <td>{game.bets}</td>
                  <td>{game.revenue}</td>
                  <td>
                    <button className="btn-small">Edit</button>
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

export default GameAdminView;
