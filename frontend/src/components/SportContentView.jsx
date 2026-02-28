import React, { useState } from 'react';
import { placeBet } from '../api';
import useMatches from '../hooks/useMatches';
import { createFallbackTeamLogoDataUri, fetchTeamBadgeUrl } from '../utils/teamLogos';

const SportContentView = ({ sportId, selectedItems = [], filter = null, status = 'live-upcoming', activeBetMode = 'straight' }) => {
    const [activeTab, setActiveTab] = useState('matches');
    const [teamLogos, setTeamLogos] = useState({});
    const attemptedLogoFetchesRef = React.useRef(new Set());

    const [content, setContent] = useState({ name: '', icon: '', matches: [], scoreboards: [] });
    const [isLoading, setIsLoading] = useState(true);
    const rawMatches = useMatches({ status });

    React.useEffect(() => {
        // Determine sport name and icon
        const sportMap = {
            nfl: { name: 'NFL', icon: 'fa-solid fa-football' },
            nba: { name: 'NBA', icon: 'fa-solid fa-basketball' },
            mlb: { name: 'MLB', icon: 'fa-solid fa-baseball' },
            nhl: { name: 'NHL', icon: 'fa-solid fa-hockey-puck' },
            epl: { name: 'EPL (Soccer)', icon: 'fa-solid fa-futbol' },
            boxing: { name: 'Boxing', icon: 'fa-solid fa-hand-fist' },
            mma: { name: 'MMA/UFC', icon: 'fa-solid fa-hand-fist' },
            ncaaf: { name: 'NCAA Football', icon: 'fa-solid fa-building-columns' },
            ncaab: { name: 'NCAA Basketball', icon: 'fa-solid fa-basketball' }
        };

        const getSportKeywords = (id) => {
            if (!id) return [];
            const normalized = id.toString().toLowerCase();
            const keywordMap = {
                nfl: ['nfl', 'americanfootball_nfl', 'national football', 'american football'],
                ncaaf: ['ncaaf', 'ncaa football', 'college football'],
                nba: ['nba', 'basketball_nba', 'national basketball'],
                ncaab: ['ncaab', 'ncaa basketball', 'college basketball'],
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
                'olympics': ['olympics', 'olympic'],
            };
            return keywordMap[normalized] || [normalized];
        };

        // Handle sub-categories (nfl-1st-quarter -> nfl)
        let resolvedSportId = sportId;
        let periodFilter = null;

        const effectiveFilter = filter || sportId;

        if (effectiveFilter) {
            if (effectiveFilter.startsWith('nfl-')) {
                resolvedSportId = 'nfl';
                if (effectiveFilter.includes('1st-quarter')) periodFilter = 'Q1';
                if (effectiveFilter.includes('2nd-quarter')) periodFilter = 'Q2';
                if (effectiveFilter.includes('1st-half')) periodFilter = 'H1';
            } else if (effectiveFilter.startsWith('ncaa-')) {
                resolvedSportId = 'ncaaf';
                if (effectiveFilter.includes('1st-quarter')) periodFilter = 'Q1';
                if (effectiveFilter.includes('2nd-quarter')) periodFilter = 'Q2';
                if (effectiveFilter.includes('1st-half')) periodFilter = 'H1';
            }
        }

        const sportInfo = sportMap[resolvedSportId] || { name: 'Sports', icon: 'fa-solid fa-trophy' };
        setIsLoading(true);

        // Map rawMatches into view-friendly structure and filter by sportId where possible
        const processMatches = () => {
            const matchesData = (rawMatches || []);
            const keywords = getSportKeywords(resolvedSportId);

            let filteredMatches = matchesData.filter(m => {
                if (!resolvedSportId) return true;
                if (!m.sport) return false;
                const sportValue = m.sport.toString().toLowerCase();
                return keywords.some(k => sportValue.includes(k));
            });

            if (periodFilter) {
                filteredMatches = filteredMatches.filter((m) => {
                    const period = String(m?.score?.period || '').toUpperCase();
                    const eventStatus = String(m?.score?.event_status || '').toUpperCase();
                    if (!period && !eventStatus) return true;
                    if (periodFilter === 'Q1') return /\bQ1\b|1ST\s*QUARTER/.test(period) || eventStatus.includes('1ST_QUARTER');
                    if (periodFilter === 'Q2') return /\bQ2\b|2ND\s*QUARTER/.test(period) || eventStatus.includes('2ND_QUARTER');
                    if (periodFilter === 'H1') return period.includes('H1') || period.includes('1H') || eventStatus.includes('1ST_HALF');
                    return true;
                });
            }

            // Fallback removed: If filteredMatches is empty, show empty state instead of all matches.
            // if (resolvedSportId && filteredMatches.length === 0) {
            //     filteredMatches = matchesData;
            // }

            const extractOdds = (match, homeName, awayName) => {
                if (!match || !match.odds) {
                    return {
                        spread: ['-', '-'],
                        moneyline: ['-', '-'],
                        total: ['-', '-']
                    };
                }

                if (match.odds.spread && match.odds.moneyline && match.odds.total) {
                    return match.odds;
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

                const spreadPoint = spreadHome?.point ?? spreadAway?.point;

                return {
                    spread: [
                        `${spreadPoint ?? '-'} (${spreadHome?.price ?? '-'})`,
                        `${spreadPoint !== undefined && spreadPoint !== null ? -spreadPoint : '-'} (${spreadAway?.price ?? '-'})`
                    ],
                    moneyline: [
                        `${h2hHome?.price ?? '-'}`,
                        `${h2hAway?.price ?? '-'}`
                    ],
                    total: [
                        `O ${totalOver?.point ?? totalUnder?.point ?? '-'} (${totalOver?.price ?? '-'})`,
                        `U ${totalUnder?.point ?? totalOver?.point ?? '-'} (${totalUnder?.price ?? '-'})`
                    ]
                };
            };

            filteredMatches = filteredMatches.map(match => {
                const homeName = match.homeTeam || match.home_team || '';
                const awayName = match.awayTeam || match.away_team || '';

                // Determine score to show based on period filter
                let displayScore1 = match.score?.score_home ?? 0;
                let displayScore2 = match.score?.score_away ?? 0;

                return {
                    id: match.id || match._id || match.externalId,
                    time: match.startTime ? new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    date: match.startTime ? new Date(match.startTime).toLocaleDateString() : '',
                    team1: { name: homeName, abbr: homeName.substring(0, 3).toUpperCase(), logo: '🔵' },
                    team2: { name: awayName, abbr: awayName.substring(0, 3).toUpperCase(), logo: '🔴' },
                    score1: displayScore1,
                    score2: displayScore2,
                    period: match.score?.period, // e.g. 'Q1', '2nd Half'
                    status: match.status === 'live' || (match.score && (String(match.score.event_status || '').toUpperCase().includes('IN_PROGRESS') || String(match.score.event_status || '').toUpperCase().includes('LIVE'))) ? 'LIVE' : (match.status || 'Scheduled'),
                    odds: extractOdds(match, homeName, awayName),
                    rawMatch: match // Keep raw for betting
                };
            });

                setContent({
                    ...sportInfo,
                    matches: filteredMatches,
                    scoreboards: []
                });
                setIsLoading(false);
            };

        processMatches();

        // Auto-refresh every 5 seconds locally (re-process raw matches if they change)
        const interval = setInterval(processMatches, 5000);
        return () => clearInterval(interval);

    }, [sportId, filter, rawMatches]);

    React.useEffect(() => {
        const names = Array.from(new Set(
            (content.matches || [])
                .flatMap((match) => [match.team1?.name, match.team2?.name])
                .filter(Boolean)
        ));

        names.forEach((teamName) => {
            if (!teamName || attemptedLogoFetchesRef.current.has(teamName)) return;
            attemptedLogoFetchesRef.current.add(teamName);
            fetchTeamBadgeUrl(teamName).then((logoUrl) => {
                setTeamLogos((prev) => ({
                    ...prev,
                    [teamName]: logoUrl || ''
                }));
            });
        });
    }, [content.matches]);

    const handleAddToSlip = (matchId, selection, marketType, odds, matchName, marketLabel) => {
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection,
                marketType,
                odds: parseFloat(odds),
                matchName,
                marketLabel
            }
        }));
    };

    const normalizedMode = String(activeBetMode || 'straight').toLowerCase().replace(/-/g, '_');
    const showSpread = ['straight', 'parlay', 'teaser', 'if_bet', 'reverse'].includes(normalizedMode);
    const showMoneyline = ['straight', 'parlay', 'if_bet', 'reverse'].includes(normalizedMode);
    const showTotals = ['straight', 'parlay', 'teaser', 'if_bet', 'reverse'].includes(normalizedMode);


    return (
        <div className="sport-content-view">
            <div className="content-header">
                <div className="content-title">
                    <i className={content.icon}></i>
                    <span>{content.name} - Live & Upcoming</span>
                </div>
                <div className="content-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
                        onClick={() => setActiveTab('matches')}
                    >
                        Matches
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'scoreboards' ? 'active' : ''}`}
                        onClick={() => setActiveTab('scoreboards')}
                    >
                        Scoreboards
                    </button>
                </div>
            </div>

            {activeTab === 'matches' && (
                <div className="matches-section">
                    {isLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: '8px' }}>
                            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                            <h3>Loading sports data...</h3>
                            <p>Please wait while we load the latest matches.</p>
                        </div>
                    ) : content.matches.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: '8px' }}>
                            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                            <h3>No Live or Upcoming Matches Found</h3>
                            <p>There are no {content.name} matches available right now.</p>
                            <p style={{ fontSize: '0.9em' }}>Check back later for new updates.</p>
                        </div>
                    ) : (
                        content.matches.map((match) => (
                            <div key={match.id} className="match-card">
                                <div className="match-header">
                                    <div className="match-time">
                                        <span className="time">{match.time}</span>
                                        <span className="date">{match.date}</span>
                                    </div>
                                    <span className={`match-status ${match.status === 'LIVE' ? 'live' : ''}`}>{match.status}</span>
                                </div>

                                <div className="match-body">
                                    <div className="team-box">
                                        <span className="team-logo-badge">
                                            <img
                                                className="team-logo-image"
                                                src={teamLogos[match.team1.name] || createFallbackTeamLogoDataUri(match.team1.name)}
                                                alt={`${match.team1.name} logo`}
                                                loading="lazy"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = createFallbackTeamLogoDataUri(match.team1.name);
                                                }}
                                            />
                                        </span>
                                        <div className="team-info">
                                            <span className="team-name">{match.team1.name}</span>
                                            <span className="team-abbr">{match.team1.abbr}</span>
                                        </div>
                                        <span className="score">{match.score1}</span>
                                    </div>

                                    <div className="vs-separator">vs</div>

                                    <div className="team-box">
                                        <span className="team-logo-badge">
                                            <img
                                                className="team-logo-image"
                                                src={teamLogos[match.team2.name] || createFallbackTeamLogoDataUri(match.team2.name)}
                                                alt={`${match.team2.name} logo`}
                                                loading="lazy"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = createFallbackTeamLogoDataUri(match.team2.name);
                                                }}
                                            />
                                        </span>
                                        <div className="team-info">
                                            <span className="team-name">{match.team2.name}</span>
                                            <span className="team-abbr">{match.team2.abbr}</span>
                                        </div>
                                        <span className="score">{match.score2}</span>
                                    </div>
                                </div>

                                {match.odds && (
                                    <div className="match-odds">
                                        <div className="odds-row">
                                            {showSpread && (
                                                <div className="odds-cell">
                                                    <span className="odds-label">Spread</span>
                                                    <div className="odds-values-group">
                                                        <button
                                                            className="odds-value-btn"
                                                            onClick={() => handleAddToSlip(match.id, match.team1.name, 'spreads', match.rawMatch.odds?.markets?.find(m => m.key === 'spreads')?.outcomes.find(o => o.name === match.team1.name)?.price, `${match.team1.name} vs ${match.team2.name}`, 'Spread')}
                                                    >
                                                        {match.odds.spread[0]}
                                                    </button>
                                                    <button
                                                        className="odds-value-btn"
                                                        onClick={() => handleAddToSlip(match.id, match.team2.name, 'spreads', match.rawMatch.odds?.markets?.find(m => m.key === 'spreads')?.outcomes.find(o => o.name === match.team2.name)?.price, `${match.team1.name} vs ${match.team2.name}`, 'Spread')}
                                                    >
                                                        {match.odds.spread[1]}
                                                    </button>
                                                </div>
                                                </div>
                                            )}
                                            {showMoneyline && (
                                                <div className="odds-cell">
                                                    <span className="odds-label">Moneyline</span>
                                                    <div className="odds-values-group">
                                                        <button
                                                            className="odds-value-btn"
                                                            onClick={() => handleAddToSlip(match.id, match.team1.name, 'h2h', match.rawMatch.odds?.markets?.find(m => m.key === 'h2h')?.outcomes.find(o => o.name === match.team1.name)?.price, `${match.team1.name} vs ${match.team2.name}`, 'Moneyline')}
                                                    >
                                                        {match.odds.moneyline[0]}
                                                    </button>
                                                    <button
                                                        className="odds-value-btn"
                                                        onClick={() => handleAddToSlip(match.id, match.team2.name, 'h2h', match.rawMatch.odds?.markets?.find(m => m.key === 'h2h')?.outcomes.find(o => o.name === match.team2.name)?.price, `${match.team1.name} vs ${match.team2.name}`, 'Moneyline')}
                                                    >
                                                        {match.odds.moneyline[1]}
                                                    </button>
                                                </div>
                                                </div>
                                            )}
                                            {showTotals && (
                                                <div className="odds-cell">
                                                    <span className="odds-label">Total</span>
                                                    <div className="odds-values-group">
                                                        <button
                                                            className="odds-value-btn"
                                                            onClick={() => handleAddToSlip(match.id, 'Over', 'totals', match.rawMatch.odds?.markets?.find(m => m.key === 'totals')?.outcomes.find(o => o.name.toLowerCase().includes('over'))?.price, `${match.team1.name} vs ${match.team2.name}`, 'Total')}
                                                    >
                                                        {match.odds.total[0]}
                                                        </button>
                                                        <button
                                                            className="odds-value-btn"
                                                            onClick={() => handleAddToSlip(match.id, 'Under', 'totals', match.rawMatch.odds?.markets?.find(m => m.key === 'totals')?.outcomes.find(o => o.name.toLowerCase().includes('under'))?.price, `${match.team1.name} vs ${match.team2.name}`, 'Total')}
                                                        >
                                                            {match.odds.total[1]}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="match-footer" style={{ justifyContent: 'center', padding: '10px' }}>
                                    <span style={{ fontSize: '0.8em', color: '#888' }}>Click any odds to place your bet</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'scoreboards' && (
                <div className="scoreboards-section">
                    {content.scoreboards.map((board, idx) => (
                        <div key={idx} className="scoreboard-card">
                            <div className="scoreboard-scores">
                                {Object.entries(board).map(([key, value]) => (
                                    <div key={key} className="score-cell">
                                        <span className="score-label">{key}</span>
                                        <span className="score-value">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SportContentView;
