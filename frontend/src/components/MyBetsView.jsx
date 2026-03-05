import React, { useState, useEffect } from 'react';
import { getMyBets } from '../api';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const formatStatus = (value) => String(value || 'pending').toUpperCase();
const statusColors = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'won') return { bg: '#28a745', fg: '#fff' };
    if (normalized === 'lost') return { bg: '#dc3545', fg: '#fff' };
    if (normalized === 'void') return { bg: '#6c757d', fg: '#fff' };
    return { bg: '#ffc107', fg: '#111' };
};

const MyBetsView = () => {
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBets = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to view your bets');
                setLoading(false);
                return;
            }

            try {
                const data = await getMyBets(token);
                setBets(data);
            } catch (err) {
                console.error('Failed to fetch bets:', err);
                setError('Failed to load bets');
            } finally {
                setLoading(false);
            }
        };

        fetchBets();
    }, []);

    if (loading) return <div style={{ color: 'white', padding: '20px' }}>Loading history...</div>;
    if (error) return <div style={{ color: 'red', padding: '20px' }}>{error}</div>;

    return (
        <div style={{ padding: '20px', color: 'white' }}>
            <h2>My Bets History</h2>
            {bets.length === 0 ? (
                <p>No bets placed yet.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                            <tr style={{ background: '#333', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Date</th>
                                <th style={{ padding: '10px' }}>Match</th>
                                <th style={{ padding: '10px' }}>Type</th>
                                <th style={{ padding: '10px' }}>Selection</th>
                                <th style={{ padding: '10px' }}>Stake</th>
                                <th style={{ padding: '10px' }}>Odds</th>
                                <th style={{ padding: '10px' }}>Potential Payout</th>
                                <th style={{ padding: '10px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bets.map((bet) => (
                                <React.Fragment key={bet._id || bet.id}>
                                    <tr style={{ borderBottom: '1px solid #444' }}>
                                        <td style={{ padding: '10px' }}>{new Date(bet.createdAt).toLocaleString()}</td>
                                        <td style={{ padding: '10px' }}>
                                            {bet.matchId ? (
                                                `${bet.matchSnapshot?.homeTeam || bet.matchId.homeTeam} vs ${bet.matchSnapshot?.awayTeam || bet.matchId.awayTeam}`
                                            ) : (
                                                'Multi-leg Ticket'
                                            )}
                                        </td>
                                        <td style={{ padding: '10px' }}>{String(bet.type || 'straight').toUpperCase()}</td>
                                        <td style={{ padding: '10px', color: '#ffd700' }}>{bet.selection || 'MULTI'}</td>
                                        <td style={{ padding: '10px' }}>{money(bet.amount)}</td>
                                        <td style={{ padding: '10px' }}>{Number(bet.odds || 0).toFixed(2)}</td>
                                        <td style={{ padding: '10px' }}>{money(bet.potentialPayout)}</td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                backgroundColor: statusColors(bet.status).bg,
                                                color: statusColors(bet.status).fg
                                            }}>
                                                {formatStatus(bet.status)}
                                            </span>
                                        </td>
                                    </tr>
                                    {Array.isArray(bet.selections) && bet.selections.length > 1 && (
                                        <tr style={{ borderBottom: '1px solid #2b2b2b', background: 'rgba(255,255,255,0.03)' }}>
                                            <td colSpan={8} style={{ padding: '10px 14px' }}>
                                                <div style={{ fontWeight: 700, marginBottom: 6, color: '#9ec3ff' }}>Leg Details</div>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ color: '#9aa4b0', textAlign: 'left' }}>
                                                            <th style={{ padding: '6px 0' }}>Match</th>
                                                            <th style={{ padding: '6px 0' }}>Market</th>
                                                            <th style={{ padding: '6px 0' }}>Selection</th>
                                                            <th style={{ padding: '6px 0' }}>Odds</th>
                                                            <th style={{ padding: '6px 0' }}>Leg Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {bet.selections.map((leg, idx) => (
                                                            <tr key={`${bet._id || bet.id}-leg-${idx}`} style={{ borderTop: '1px solid #2f3742' }}>
                                                                <td style={{ padding: '7px 0' }}>
                                                                    {leg.matchSnapshot?.homeTeam && leg.matchSnapshot?.awayTeam
                                                                        ? `${leg.matchSnapshot.homeTeam} vs ${leg.matchSnapshot.awayTeam}`
                                                                        : (leg.matchId || 'Match')}
                                                                </td>
                                                                <td style={{ padding: '7px 0' }}>{String(leg.marketType || '-').toUpperCase()}</td>
                                                                <td style={{ padding: '7px 0', color: '#ffd700' }}>{leg.selection || '-'}</td>
                                                                <td style={{ padding: '7px 0' }}>{Number(leg.odds || 0).toFixed(2)}</td>
                                                                <td style={{ padding: '7px 0' }}>{formatStatus(leg.status)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyBetsView;
