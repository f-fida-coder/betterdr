import React from 'react';
import useMatches from '../hooks/useMatches';
import { useOddsFormat } from '../contexts/OddsFormatContext';
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
    const getSportName = (id) => {
        const sportMap = {
            'nfl': 'NFL Football',
            'ncaa-football': 'College Football',
            'nba': 'NBA Basketball',
            'ncaa-basketball': 'College Basketball',
            'mlb': 'MLB Baseball',
            'nhl': 'NHL Hockey',
            'epl': 'EPL Soccer',
            'mls': 'MLS Soccer',
            'pga': 'PGA Golf',
            'wta': 'WTA Tennis',
            'atp': 'ATP Tennis',
            'boxing': 'Boxing',
            'mma': 'MMA',
            'auto-racing': 'Auto Racing',
            'rugby': 'Rugby',
            'volleyball': 'Volleyball',
            'cricket': 'Cricket',
            'basketball': 'Basketball',
            'baseball': 'Baseball',
            'hockey': 'Hockey',
            'football': 'Football',
            'soccer': 'Soccer',
            'golf': 'Golf',
            'tennis': 'Tennis',
            'martial-arts': 'Martial Arts'
        };
        return sportMap[id] || id.replace('-', ' ').toUpperCase();
    };

    const primarySport = selectedSports && selectedSports.length > 0 ? selectedSports[0] : null;
    const statusFilter = primarySport === 'commercial-live'
        ? 'live'
        : primarySport === 'up-next'
            ? 'upcoming'
            : 'live-upcoming';
    const rawMatches = useMatches({ status: statusFilter, scopeKey: selectedSports.join('|') });
    const sportName = primarySport ? getSportName(primarySport) : 'Selected Sport';

    const getSportKeywords = (id) => {
        if (!id) return [];
        const normalized = id.toString().toLowerCase();
        const keywordMap = {
            nfl: ['nfl', 'americanfootball_nfl', 'national football', 'american football'],
            'ncaa-football': ['ncaaf', 'ncaa football', 'college football'],
            nba: ['nba', 'basketball_nba', 'national basketball'],
            'ncaa-basketball': ['ncaab', 'ncaa basketball', 'college basketball'],
            mlb: ['mlb', 'baseball_mlb', 'major league baseball'],
            nhl: ['nhl', 'icehockey_nhl', 'hockey_nhl'],
            epl: ['epl', 'premier league', 'english premier league'],
            soccer: ['soccer', 'football', 'premier league', 'la liga', 'serie a', 'bundesliga', 'ligue 1', 'mls'],
            basketball: ['basketball', 'nba', 'ncaab', 'euroleague'],
            baseball: ['baseball', 'mlb'],
            hockey: ['hockey', 'nhl', 'icehockey'],
            golf: ['golf', 'pga'],
            tennis: ['tennis', 'atp', 'wta'],
            boxing: ['boxing'],
            mma: ['mma', 'ufc'],
            rugby: ['rugby'],
            'auto-racing': ['racing', 'motorsport', 'nascar', 'formula'],
            'martial-arts': ['mma', 'ufc', 'martial'],
        };
        return keywordMap[normalized] || [normalized];
    };

    const extractOdds = (match, homeName, awayName) => {
        const h2h = getMatchMarket(match, 'h2h');
        const spreads = getMatchMarket(match, 'spreads');
        const totals = getMatchMarket(match, 'totals');

        const h2hHome = getMarketOutcomeByName(h2h, homeName);
        const h2hAway = getMarketOutcomeByName(h2h, awayName);
        const spreadHome = getMarketOutcomeByName(spreads, homeName);
        const spreadAway = getMarketOutcomeByName(spreads, awayName);
        const totalOver = getMarketOutcomeByKeyword(totals, 'over');
        const totalUnder = getMarketOutcomeByKeyword(totals, 'under');

        return {
            spreadHomePoint: spreadHome?.point ?? null,
            spreadAwayPoint: spreadAway?.point ?? null,
            spreadHomePrice: parseOddsNumber(spreadHome?.price),
            spreadAwayPrice: parseOddsNumber(spreadAway?.price),
            moneylineHome: parseOddsNumber(h2hHome?.price),
            moneylineAway: parseOddsNumber(h2hAway?.price),
            totalPoint: totalOver?.point ?? totalUnder?.point ?? null,
            totalOverPrice: parseOddsNumber(totalOver?.price),
            totalUnderPrice: parseOddsNumber(totalUnder?.price)
        };
    };

    const matches = React.useMemo(() => {
        const formattedMatches = (rawMatches || []).map(match => {
            const homeName = match.homeTeam || match.home_team || '';
            const awayName = match.awayTeam || match.away_team || '';
            const odds = extractOdds(match, homeName, awayName);
            const eventStatus = (match.score?.event_status || '').toString().toUpperCase();
            const isLive = match.status === 'live' || eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE') || eventStatus.includes('STATUS_IN_PROGRESS');

            return {
                id: match.id || match.externalId,
                sport: match.sport || match.sportTitle || '',
                team1: homeName,
                team2: awayName,
                odds,
                isLive
            };
        });

        if (!primarySport) return formattedMatches;
        const keywords = getSportKeywords(primarySport);
        const filtered = formattedMatches.filter(m => m.sport && keywords.some(k => m.sport.toLowerCase().includes(k)));
        return filtered.length > 0 ? filtered : formattedMatches;
    }, [rawMatches, primarySport]);


    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f5f5f5',
            padding: '0',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
        }}>
            {/* Header */}
            <div style={{
                padding: '15px 10px',
                backgroundColor: '#ffffff',
                borderBottom: '2px solid #e0e0e0',
                marginBottom: '10px',
                borderRadius: '4px'
            }}>
                <h2 style={{
                    margin: '0 0 5px 0',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#333'
                }}>
                    {sportName}
                </h2>
                <p style={{
                    margin: '0',
                    fontSize: '12px',
                    color: '#666',
                    fontWeight: '500'
                }}>
                    Upcoming Matches & Events
                </p>
            </div>

            {/* Matches List */}
            <div style={{ flex: 1 }}>
                {matches && matches.length > 0 ? (
                    matches.map(match => (
                        <div
                            key={match.id}
                            style={{
                                backgroundColor: '#ffffff',
                                padding: '12px',
                                marginBottom: '10px',
                                borderRadius: '6px',
                                border: '1px solid #e0e0e0',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                        >
                            {/* Match Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <div style={{ fontSize: '12px', color: '#888', fontWeight: '600' }}>
                                    MATCH {match.id}
                                </div>
                                <div style={{
                                    background: match.isLive ? '#007bff' : '#6c757d',
                                    color: 'white',
                                    padding: '3px 8px',
                                    borderRadius: '3px',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}>
                                    {match.isLive ? 'LIVE' : 'UPCOMING'}
                                </div>
                            </div>

                            {/* Teams */}
                            <div style={{ marginBottom: '10px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #f0f0f0',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#333'
                                }}>
                                    <span>{match.team1}</span>
                                    <span>{formatLineValue(match.odds.spreadHomePoint, { signed: true })}</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 0',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#333'
                                }}>
                                    <span>{match.team2}</span>
                                    <span>{formatLineValue(match.odds.spreadAwayPoint, { signed: true })}</span>
                                </div>
                            </div>

                            {/* Odds Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                                marginTop: '10px'
                            }}>
                                <button style={{
                                    padding: '10px',
                                    backgroundColor: '#f0f0f0',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    transition: 'all 0.2s',
                                }}>
                                    Spread<br />
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>{formatOdds(match.odds.spreadHomePrice, oddsFormat)}</span>
                                </button>
                                <button style={{
                                    padding: '10px',
                                    backgroundColor: '#f0f0f0',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    transition: 'all 0.2s',
                                }}>
                                    Total<br />
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>{formatOdds(match.odds.totalOverPrice, oddsFormat)}</span>
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#999'
                    }}>
                        <p style={{ fontSize: '14px', margin: 0 }}>No matches available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileContentView;
