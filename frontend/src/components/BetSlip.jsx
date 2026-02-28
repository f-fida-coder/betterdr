import React, { useState, useEffect } from 'react';
import { placeBet } from '../api';
import { useToast } from '../contexts/ToastContext';
import BetConfirmationModal from './BetConfirmationModal';

const BetSlip = ({ user, balance, onBetPlaced }) => {
    const { showToast } = useToast();
    const [selections, setSelections] = useState([]);
    const [wager, setWager] = useState('');
    const [betType, setBetType] = useState('straight');
    const [isOpen, setIsOpen] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isPlacing, setIsPlacing] = useState(false);

    useEffect(() => {
        const handleAdd = (e) => {
            const item = e.detail;
            setSelections(prev => {
                const exists = prev.find(s => s.matchId === item.matchId);
                if (exists) {
                    // Update if same match, or just prevent
                    return prev.map(s => s.matchId === item.matchId ? { ...item, id: Date.now() } : s);
                }
                const newSelections = [...prev, { ...item, id: Date.now() }];
                // Auto switch to parlay if more than 1
                if (newSelections.length > 1 && betType === 'straight') {
                    setBetType('parlay');
                }
                return newSelections;
            });
            setIsOpen(true);
        };
        window.addEventListener('betslip:add', handleAdd);
        return () => window.removeEventListener('betslip:add', handleAdd);
    }, [betType]);

    const removeSelection = (id) => {
        setSelections(prev => {
            const filtered = prev.filter(s => s.id !== id);
            if (filtered.length <= 1) setBetType('straight');
            return filtered;
        });
    };

    const clearSlip = () => {
        setSelections([]);
        setBetType('straight');
        setWager('');
    };

    const calculatePotentialPayout = () => {
        const amount = parseFloat(wager) || 0;
        if (amount <= 0) return 0;

        if (betType === 'straight') {
            return selections.reduce((sum, s) => sum + (s.odds * amount), 0).toFixed(2);
        }

        if (betType === 'parlay') {
            const combinedOdds = selections.reduce((acc, s) => acc * s.odds, 1);
            return (amount * combinedOdds).toFixed(2);
        }

        if (betType === 'teaser') {
            const teaserOdds = selections.length === 2 ? 1.83 : (selections.length === 3 ? 2.62 : 4.1);
            return (amount * teaserOdds).toFixed(2);
        }

        if (betType === 'if_bet' || betType === 'reverse') {
            // Sequential logic simplified for display
            const combinedOdds = selections.slice(0, 2).reduce((acc, s) => acc * s.odds, 1);
            return (amount * combinedOdds).toFixed(2);
        }

        return 0;
    };

    const getTotalRisk = () => {
        const amount = parseFloat(wager) || 0;
        if (betType === 'reverse') return amount * 2;
        if (betType === 'straight') return amount * Math.max(1, selections.length);
        return amount;
    };

    const handlePlaceBet = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Please login to place bets', 'error');
            return;
        }

        const amount = parseFloat(wager);
        if (isNaN(amount) || amount <= 0) {
            showToast('Enter a valid wager amount', 'warning');
            return;
        }
        const totalRisk = getTotalRisk();
        if (totalRisk > Number(balance || 0)) {
            showToast('Insufficient balance', 'error');
            return;
        }
        setShowConfirm(true);
    };

    const executePlaceBet = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Please login to place bets', 'error');
            setShowConfirm(false);
            return;
        }

        const amount = parseFloat(wager);
        if (isNaN(amount) || amount <= 0) {
            showToast('Enter a valid wager amount', 'warning');
            setShowConfirm(false);
            return;
        }

        try {
            setIsPlacing(true);
            setShowConfirm(false);
            const betData = {
                amount: amount,
                type: betType,
                selections: selections.map(s => ({
                    matchId: s.matchId,
                    selection: s.selection,
                    odds: s.odds,
                    type: s.marketType || 'straight'
                }))
            };

            // For straight bets, if multiple are selected, we place them as individual bets
            // In our new backend, it can handle multiple selections even for 'straight' 
            // but usually it's one by one or a loop. 
            // My backend refactor handles 'straight' with 1 selection. 
            // If user has 2 in slip and picks 'straight', we should probably place two bets.

            if (betType === 'straight' && selections.length > 1) {
                for (const sel of selections) {
                    await placeBet({
                        amount: amount,
                        type: 'straight',
                        matchId: sel.matchId,
                        selection: sel.selection,
                        odds: sel.odds
                    }, token);
                }
            } else {
                await placeBet(betData, token);
            }

            showToast('Bet(s) placed successfully', 'success');
            clearSlip();
            window.dispatchEvent(new Event('user:refresh'));
            if (onBetPlaced) onBetPlaced();
        } catch (e) {
            showToast(`Bet failed: ${e.message}`, 'error');
        } finally {
            setIsPlacing(false);
        }
    };

    if (selections.length === 0) return null;

    return (
        <div className={`bet-slip glass-panel ${isOpen ? 'open' : 'minimized'}`} style={{
            position: 'fixed',
            right: '20px',
            bottom: '80px',
            width: '320px',
            maxHeight: '80vh',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            border: '2px solid var(--primary)'
        }}>
            <div className="slip-header" style={{
                padding: '15px',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTopLeftRadius: '14px',
                borderTopRightRadius: '14px'
            }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>
                    BET SLIP <span style={{ background: 'white', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', marginLeft: '5px', fontSize: '12px' }}>{selections.length}</span>
                </h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <i className="fa-solid fa-trash" style={{ cursor: 'pointer', fontSize: '14px' }} onClick={clearSlip} title="Clear Slip"></i>
                    <i className={`fa-solid ${isOpen ? 'fa-chevron-down' : 'fa-chevron-up'}`} style={{ cursor: 'pointer' }} onClick={() => setIsOpen(!isOpen)}></i>
                </div>
            </div>

            {isOpen && (
                <>
                    <div className="slip-tabs" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-glass)' }}>
                        {['straight', 'parlay', 'teaser', 'if_bet', 'reverse'].map(type => (
                            <button
                                key={type}
                                onClick={() => {
                                    if (selections.length < 2 && type !== 'straight') {
                                        showToast('Select at least 2 matches for this bet type', 'warning');
                                        return;
                                    }
                                    setBetType(type);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px 5px',
                                    background: betType === type ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    border: 'none',
                                    color: betType === type ? 'var(--gold)' : '#aaa',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    borderBottom: betType === type ? '2px solid var(--gold)' : 'none'
                                }}
                            >
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    <div className="bets-container" style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                        {selections.map((sel) => (
                            <div key={sel.id} className="bet-item" style={{
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '8px',
                                padding: '10px',
                                marginBottom: '10px',
                                borderLeft: '3px solid var(--gold)',
                                position: 'relative'
                            }}>
                                <i className="fa-solid fa-xmark remove-bet" style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '8px',
                                    fontSize: '12px',
                                    color: '#666',
                                    cursor: 'pointer'
                                }} onClick={() => removeSelection(sel.id)}></i>

                                <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px' }}>{sel.matchName}</div>
                                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{sel.selection}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--gold)' }}>{sel.marketLabel}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--gold)' }}>{sel.odds}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="slip-summary" style={{ padding: '15px', borderTop: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)' }}>
                        <div className="wager-input" style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                                <span>WAGER</span>
                                <span style={{ color: '#aaa' }}>Bal: ${balance?.toFixed(2) || '0.00'}</span>
                            </div>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={wager}
                                onChange={(e) => setWager(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid var(--border-glass)',
                                    color: 'white',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                            <span>EST. PAYOUT</span>
                            <span style={{ color: 'var(--gold)' }}>${calculatePotentialPayout()}</span>
                        </div>

                        <button
                            className="btn-place-bet"
                            onClick={handlePlaceBet}
                            style={{
                                width: '100%',
                                padding: '15px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, var(--gold) 0%, #b38f00 100%)',
                                border: 'none',
                                color: 'black',
                                fontWeight: '900',
                                fontSize: '14px',
                                cursor: 'pointer',
                                marginTop: '10px',
                                boxShadow: '0 4px 15px rgba(255, 204, 0, 0.3)'
                            }}
                        >
                            {isPlacing ? 'PLACING...' : 'PLACE BET'}
                        </button>
                    </div>
                </>
            )}
            <BetConfirmationModal
                isOpen={showConfirm}
                betType={betType}
                selections={selections}
                wager={parseFloat(wager) || 0}
                totalRisk={getTotalRisk()}
                potentialPayout={parseFloat(calculatePotentialPayout()) || 0}
                onCancel={() => setShowConfirm(false)}
                onConfirm={executePlaceBet}
                isSubmitting={isPlacing}
            />
        </div>
    );
};

export default BetSlip;
