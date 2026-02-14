import React, { useState, useEffect } from 'react';
import { getMyBets } from '../api';

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
                                <th style={{ padding: '10px' }}>Selection</th>
                                <th style={{ padding: '10px' }}>Stake</th>
                                <th style={{ padding: '10px' }}>Odds</th>
                                <th style={{ padding: '10px' }}>Potential Payout</th>
                                <th style={{ padding: '10px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bets.map((bet) => (
                                <tr key={bet._id} style={{ borderBottom: '1px solid #444' }}>
                                    <td style={{ padding: '10px' }}>{new Date(bet.createdAt).toLocaleString()}</td>
                                    <td style={{ padding: '10px' }}>
                                        {bet.matchId ? (
                                            `${bet.matchSnapshot?.homeTeam || bet.matchId.homeTeam} vs ${bet.matchSnapshot?.awayTeam || bet.matchId.awayTeam}`
                                        ) : (
                                            'Unknown Match'
                                        )}
                                    </td>
                                    <td style={{ padding: '10px', color: '#ffd700' }}>{bet.selection}</td>
                                    <td style={{ padding: '10px' }}>${parseFloat(bet.amount).toFixed(2)}</td>
                                    <td style={{ padding: '10px' }}>{parseFloat(bet.odds).toFixed(2)}</td>
                                    <td style={{ padding: '10px' }}>${parseFloat(bet.potentialPayout).toFixed(2)}</td>
                                    <td style={{ padding: '10px' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            backgroundColor:
                                                bet.status === 'won' ? '#28a745' :
                                                    bet.status === 'lost' ? '#dc3545' :
                                                        bet.status === 'pending' ? '#ffc107' : '#6c757d',
                                            color: bet.status === 'pending' ? 'black' : 'white'
                                        }}>
                                            {bet.status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyBetsView;
