import React from 'react';

function AnalysisView() {
  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Analysis</h2>
      </div>
      <div className="view-content">
        <div className="analysis-container">
          <div className="analysis-card">
            <h3>Betting Trends</h3>
            <p>Track and analyze betting patterns across all sports and markets.</p>
            <button className="btn-small">View Details</button>
          </div>
          <div className="analysis-card">
            <h3>Customer Analytics</h3>
            <p>Analyze customer behavior, retention rates, and spending patterns.</p>
            <button className="btn-small">View Details</button>
          </div>
          <div className="analysis-card">
            <h3>Revenue Analysis</h3>
            <p>Comprehensive revenue breakdown by sport, market, and time period.</p>
            <button className="btn-small">View Details</button>
          </div>
          <div className="analysis-card">
            <h3>Risk Analysis</h3>
            <p>Identify and assess potential risk factors in betting operations.</p>
            <button className="btn-small">View Details</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalysisView;
