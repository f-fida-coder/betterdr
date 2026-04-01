import React from 'react';
import useMatches from '../hooks/useMatches';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { getSportKeywords, findSportItemById } from '../data/sportsData';
import {
    formatLineValue,
    formatOdds,
    getMatchMarket,
    getMarketOutcomeByKeyword,
    getMarketOutcomeByName,
    parseOddsNumber,
} from '../utils/odds';

const MobileContentView = ({ selectedSports = [] }) => {
    const { oddsFormat } = useOddsFormat();

    const primarySport = selectedSports?.[0] ?? null;
    const statusFilter = primarySport === 'commercial-live'
        ? 'live'
        : primarySport === 'up-next'
            ? 'upcoming'
            : 'live-upcoming';
    const rawMatches = useMatches({ status: statusFilter, scopeKey: selectedSports.join('|') });

    const sportName = React.useMemo(() => {
        if (!primarySport) return 'Sports';
        const item = findSportItemById(primarySport);
        return item ? item.label : primarySport.replace(/-/g, ' ').toUpperCase();
    }, [primarySport]);

    const extractOdds = (match, homeName, awayName) => {
        const h2h = getMatchMarket(match, 'h2h');
        const spreads = getMatchMarket(match, 'spreads');
        const totals = getMatchMarket(match, 'totals');

        return {
            spreadHomePoint: getMarketOutcomeByName(spreads, homeName)?.point ?? null,
            spreadAwayPoint: getMarketOutcomeByName(spreads, awayName)?.point ?? null,
            spreadHomePrice: parseOddsNumber(getMarketOutcomeByName(spreads, homeName)?.price),
            spreadAwayPrice: parseOddsNumber(getMarketOutcomeByName(spreads, awayName)?.price),
            moneylineHome: parseOddsNumber(getMarketOutcomeByName(h2h, homeName)?.price),
            moneylineAway: parseOddsNumber(getMarketOutcomeByName(h2h, awayName)?.price),
            totalPoint: getMarketOutcomeByKeyword(totals, 'over')?.point ?? getMarketOutcomeByKeyword(totals, 'under')?.point ?? null,
            totalOverPrice: parseOddsNumber(getMarketOutcomeByKeyword(totals, 'over')?.price),
            totalUnderPrice: parseOddsNumber(getMarketOutcomeByKeyword(totals, 'under')?.price),
        };
    };

    const matches = React.useMemo(() => {
        const formatted = (rawMatches || []).map(match => {
            const homeName = match.homeTeam || match.home_team || '';
            const awayName = match.awayTeam || match.away_team || '';
            const eventStatus = (match.score?.event_status || '').toString().toUpperCase();
            const isLive = match.status === 'live' || eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE');
            const startDate = match.startTime ? new Date(match.startTime) : null;

            return {
                id: match.id || match.externalId,
                sport: match.sport || '',
                team1: homeName,
                team2: awayName,
                odds: extractOdds(match, homeName, awayName),
                isLive,
                time: startDate ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                date: startDate ? startDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '',
            };
        });

        if (!primarySport) return formatted;
        const keywords = getSportKeywords(primarySport);
        const filtered = formatted.filter(m => m.sport && keywords.some(k => m.sport.toLowerCase().includes(k)));
        // Show filtered results, or empty state — never fall back to unfiltered
        return filtered;
    }, [rawMatches, primarySport]);

    const handleAddToSlip = (matchId, selection, marketType, odds, matchName) => {
        const parsedOdds = parseOddsNumber(odds);
        if (!matchId || !selection || parsedOdds === null) return;
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: { matchId, selection, marketType, odds: parsedOdds, matchName, marketLabel: marketType }
        }));
    };

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
        }}>
            {/* Sport context header */}
            <div style={{
                padding: '14px 16px',
                backgroundColor: '#fff',
                borderBottom: '1px solid #e0e0e0',
                flexShrink: 0,
            }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111', lineHeight: 1.3 }}>
                    {sportName}
                </div>
                <div style={{ fontSize: '11px', color: '#999', fontWeight: '500', marginTop: '2px', letterSpacing: '0.2px' }}>
                    {statusFilter === 'live' ? 'Live Matches' : statusFilter === 'upcoming' ? 'Upcoming Matches' : 'Live & Upcoming'}
                </div>
            </div>

            {/* Match list */}
            <div style={{ flex: 1 }}>
                {matches.length > 0 ? matches.map(match => (
                    <div key={match.id} style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #eee',
                        backgroundColor: '#fff',
                    }}>
                        {/* Time + status badge */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                        }}>
                            <span style={{ fontSize: '11px', color: '#999', fontWeight: '600', letterSpacing: '0.2px' }}>
                                {match.time}{match.date ? ` \u00B7 ${match.date}` : ''}
                            </span>
                            <span style={{
                                background: match.isLive ? '#2e7d32' : '#78909c',
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '3px',
                                fontSize: '9px',
                                fontWeight: '700',
                                letterSpacing: '0.5px',
                            }}>
                                {match.isLive ? 'LIVE' : 'UPCOMING'}
                            </span>
                        </div>

                        {/* Team rows */}
                        <div style={{ marginBottom: '10px' }}>
                            <div style={teamRowStyle}>
                                <span style={teamNameStyle}>{match.team1}</span>
                                <span style={spreadValueStyle}>{formatLineValue(match.odds.spreadHomePoint, { signed: true })}</span>
                            </div>
                            <div style={{ ...teamRowStyle, borderBottom: 'none' }}>
                                <span style={teamNameStyle}>{match.team2}</span>
                                <span style={spreadValueStyle}>{formatLineValue(match.odds.spreadAwayPoint, { signed: true })}</span>
                            </div>
                        </div>

                        {/* 3-column odds grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                            <button style={oddsBtnStyle}
                                onClick={() => handleAddToSlip(match.id, match.team1, 'spreads', match.odds.spreadHomePrice, `${match.team1} vs ${match.team2}`)}
                                disabled={match.odds.spreadHomePrice === null}>
                                <span style={oddsLabelStyle}>Spread</span>
                                <span style={oddsValueStyle}>{formatOdds(match.odds.spreadHomePrice, oddsFormat)}</span>
                            </button>
                            <button style={oddsBtnStyle}
                                onClick={() => handleAddToSlip(match.id, match.team1, 'h2h', match.odds.moneylineHome, `${match.team1} vs ${match.team2}`)}
                                disabled={match.odds.moneylineHome === null}>
                                <span style={oddsLabelStyle}>ML</span>
                                <span style={oddsValueStyle}>{formatOdds(match.odds.moneylineHome, oddsFormat)}</span>
                            </button>
                            <button style={oddsBtnStyle}
                                onClick={() => handleAddToSlip(match.id, 'Over', 'totals', match.odds.totalOverPrice, `${match.team1} vs ${match.team2}`)}
                                disabled={match.odds.totalOverPrice === null}>
                                <span style={oddsLabelStyle}>O {match.odds.totalPoint ?? ''}</span>
                                <span style={oddsValueStyle}>{formatOdds(match.odds.totalOverPrice, oddsFormat)}</span>
                            </button>
                        </div>
                    </div>
                )) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
                        <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5, display: 'block' }}></i>
                        <p style={{ fontSize: '13px', margin: '0 0 4px 0', color: '#999', fontWeight: '600' }}>No matches available</p>
                        <p style={{ fontSize: '11px', margin: 0, color: '#bbb' }}>Check back later for updates</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Shared styles ────────────────────────────────────────

const teamRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #f2f2f2',
};

const teamNameStyle = {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '13px',
    fontWeight: '600',
    color: '#222',
};

const spreadValueStyle = {
    color: '#666',
    fontSize: '12px',
    fontWeight: '600',
    marginLeft: '8px',
    flexShrink: 0,
};

const oddsBtnStyle = {
    padding: '9px 4px',
    backgroundColor: '#f7f7f7',
    border: '1px solid #e5e5e5',
    borderRadius: '5px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    transition: 'background-color 0.15s',
};

const oddsLabelStyle = {
    fontSize: '9px',
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
};

const oddsValueStyle = {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1565c0',
};

export default MobileContentView;
