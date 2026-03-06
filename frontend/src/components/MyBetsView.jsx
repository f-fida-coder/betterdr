import React, { useState, useEffect } from 'react';
import { getMyBets } from '../api';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatLineValue, formatOdds } from '../utils/odds';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const formatStatus = (value) => String(value || 'pending').toUpperCase();

const statusColors = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'won') return { bg: '#28a745', fg: '#fff' };
    if (normalized === 'lost') return { bg: '#dc3545', fg: '#fff' };
    if (normalized === 'void') return { bg: '#6c757d', fg: '#fff' };
    return { bg: '#ffc107', fg: '#111' };
};

const matchLabel = (bet) => {
    if (bet?.match?.homeTeam && bet?.match?.awayTeam) {
        return `${bet.match.homeTeam} vs ${bet.match.awayTeam}`;
    }
    if (Array.isArray(bet?.selections) && bet.selections.length > 1) {
        return `${bet.selections.length}-leg ticket`;
    }
    if (bet?.matchSnapshot?.homeTeam && bet?.matchSnapshot?.awayTeam) {
        return `${bet.matchSnapshot.homeTeam} vs ${bet.matchSnapshot.awayTeam}`;
    }
    return 'Ticket';
};

const lineLabel = (leg) => {
    const label = formatLineValue(leg?.point, { signed: String(leg?.marketType || '').toLowerCase() === 'spreads', fallback: '' });
    return label ? ` (${label})` : '';
};

const MyBetsView = () => {
    const { oddsFormat } = useOddsFormat();
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
                setBets(Array.isArray(data) ? data : []);
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
                                <th style={{ padding: '10px' }}>Ticket</th>
                                <th style={{ padding: '10px' }}>Type</th>
                                <th style={{ padding: '10px' }}>Selection</th>
                                <th style={{ padding: '10px' }}>Risk</th>
                                <th style={{ padding: '10px' }}>Odds</th>
                                <th style={{ padding: '10px' }}>Payout</th>
                                <th style={{ padding: '10px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bets.map((bet) => {
                                const betId = bet._id || bet.id || bet.ticketId;
                                const selections = Array.isArray(bet.selections) ? bet.selections : [];
                                const summaryLines = String(bet.description || bet.selection || 'MULTI').split('\n').filter(Boolean);
                                const risk = Number(bet.riskAmount || bet.amount || 0);
                                const unitStake = Number(bet.unitStake || 0);

                                return (
                                    <React.Fragment key={betId}>
                                        <tr style={{ borderBottom: '1px solid #444' }}>
                                            <td style={{ padding: '10px' }}>{bet.createdAt ? new Date(bet.createdAt).toLocaleString() : '—'}</td>
                                            <td style={{ padding: '10px' }}>
                                                <div>{matchLabel(bet)}</div>
                                                {bet.ticketId ? (
                                                    <div style={{ color: '#9aa4b0', fontSize: 12 }}>Ticket #{bet.ticketId}</div>
                                                ) : null}
                                            </td>
                                            <td style={{ padding: '10px' }}>{String(bet.type || 'straight').toUpperCase()}</td>
                                            <td style={{ padding: '10px', color: '#ffd700' }}>
                                                {summaryLines.length > 0 ? summaryLines.map((line, index) => (
                                                    <div key={`${betId}-summary-${index}`}>{line}</div>
                                                )) : 'MULTI'}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <div>{money(risk)}</div>
                                                {String(bet.type || '').toLowerCase() === 'reverse' && unitStake > 0 ? (
                                                    <div style={{ color: '#9aa4b0', fontSize: 12 }}>Unit stake {money(unitStake)} each way</div>
                                                ) : null}
                                            </td>
                                            <td style={{ padding: '10px' }}>{formatOdds(bet.combinedOdds || bet.odds, oddsFormat)}</td>
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
                                        {selections.length > 1 && (
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
                                                            {selections.map((leg, idx) => (
                                                                <tr key={`${betId}-leg-${idx}`} style={{ borderTop: '1px solid #2f3742' }}>
                                                                    <td style={{ padding: '7px 0' }}>
                                                                        {leg.matchSnapshot?.homeTeam && leg.matchSnapshot?.awayTeam
                                                                            ? `${leg.matchSnapshot.homeTeam} vs ${leg.matchSnapshot.awayTeam}`
                                                                            : (leg.matchId || 'Match')}
                                                                    </td>
                                                                    <td style={{ padding: '7px 0' }}>{String(leg.marketType || '-').toUpperCase()}</td>
                                                                    <td style={{ padding: '7px 0', color: '#ffd700' }}>
                                                                        {leg.selection || '-'}
                                                                        {lineLabel(leg)}
                                                                    </td>
                                                                    <td style={{ padding: '7px 0' }}>{formatOdds(leg.odds, oddsFormat)}</td>
                                                                    <td style={{ padding: '7px 0' }}>{formatStatus(leg.status)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyBetsView;
