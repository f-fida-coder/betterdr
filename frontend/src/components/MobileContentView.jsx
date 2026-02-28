import React from 'react';
import useMatches from '../hooks/useMatches';

const MobileContentView = ({ selectedSports = [] }) => {
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
    const rawMatches = useMatches({ status: statusFilter });
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
        if (!match || !match.odds) {
            return {
                spreadHomePoint: null,
                spreadAwayPoint: null,
                spreadHomePrice: null,
                spreadAwayPrice: null,
                moneylineHome: null,
                moneylineAway: null,
                totalPoint: null,
                totalOverPrice: null,
                totalUnderPrice: null
            };
        }

        const markets = Array.isArray(match.odds.markets) ? match.odds.markets : [];
        const byKey = (key) => markets.find(m => String(m.key || '').toLowerCase() === key);

        const pickOutcome = (market, teamName) => {
            if (!market || !Array.isArray(market.outcomes)) return null;
            const exact = market.outcomes.find(o => String(o.name || '').toLowerCase() === String(teamName || '').toLowerCase());
            if (exact) return exact;
            return market.outcomes.find(o => String(o.name || '').toLowerCase().includes(String(teamName || '').toLowerCase())) || null;
        };

        const h2h = byKey('h2h');
        const spreads = byKey('spreads');
        const totals = byKey('totals');

        const h2hHome = pickOutcome(h2h, homeName);
        const h2hAway = pickOutcome(h2h, awayName);

        const spreadHome = pickOutcome(spreads, homeName);
        const spreadAway = pickOutcome(spreads, awayName);

        const totalOver = totals?.outcomes?.find(o => String(o.name || '').toLowerCase().includes('over')) || null;
        const totalUnder = totals?.outcomes?.find(o => String(o.name || '').toLowerCase().includes('under')) || null;

        return {
            spreadHomePoint: spreadHome?.point ?? null,
            spreadAwayPoint: spreadAway?.point ?? null,
            spreadHomePrice: spreadHome?.price ?? null,
            spreadAwayPrice: spreadAway?.price ?? null,
            moneylineHome: h2hHome?.price ?? null,
            moneylineAway: h2hAway?.price ?? null,
            totalPoint: totalOver?.point ?? totalUnder?.point ?? null,
            totalOverPrice: totalOver?.price ?? null,
            totalUnderPrice: totalUnder?.price ?? null
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
                id: match.id || match._id || match.externalId,
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
                                    <span>{match.odds.spreadHomePoint ?? '-'}</span>
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
                                    <span>{match.odds.spreadAwayPoint ?? '-'}</span>
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
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>{match.odds.spreadHomePrice ?? '-'}</span>
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
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>{match.odds.totalOverPrice ?? '-'}</span>
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
