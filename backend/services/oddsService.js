const axios = require('axios');
const Match = require('../models/Match');
const socketIo = require('../socket');

// API Configuration
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_URL = 'https://api.the-odds-api.com/v4';

/**
 * Service to fetch odds and update matches in the database.
 */
class OddsService {

    /**
     * Fetch odds from API or Mock Data
     */
    async fetchOdds() {
        if (!ODDS_API_KEY) {
            console.warn('⚠️  ODDS_API_KEY is missing in .env. Using MOCK DATA for sports odds.');
            return this.getMockData();
        }

        console.log(`🌐 Fetching sports odds from API: ${ODDS_API_URL}`);
        try {
            // Fetch available sports first
            const sportsResponse = await axios.get(`${ODDS_API_URL}/sports`, {
                params: {
                    apiKey: ODDS_API_KEY
                }
            });

            const sports = sportsResponse.data;
            console.log(`📊 Found ${sports.length} sports available`);

            // Fetch odds for each active sport
            const allOdds = [];
            for (const sport of sports) {
                if (!sport.active) continue;
                
                try {
                    const oddsResponse = await axios.get(`${ODDS_API_URL}/sports/${sport.key}/events`, {
                        params: {
                            apiKey: ODDS_API_KEY,
                            regions: 'us',
                            markets: 'h2h,spreads,totals',
                            oddsFormat: 'decimal'
                        }
                    });
                    
                    console.log(`  📈 ${sport.title}: ${oddsResponse.data.length} events`);
                    allOdds.push(...oddsResponse.data.map(event => ({ ...event, sport: sport.key, sportTitle: sport.title })));
                } catch (sportError) {
                    console.error(`  ❌ Error fetching ${sport.title}:`, sportError.message);
                }
            }

            return { events: allOdds };
        } catch (error) {
            console.error('❌ Error fetching odds from API:', error.message);
            if (error.response) {
                console.error('   API Status:', error.response.status);
                console.error('   API Error:', error.response.data?.message || error.response.data);
            }
            console.log('⚠️  Falling back to MOCK DATA due to API error.');
            return this.getMockData();
        }
    }

    /**
     * Update matches in the database with fetched data
     */
    async updateMatches() {
        console.log('🔄 Starting Odds Update...');
        try {
            const data = await this.fetchOdds();
            const events = data.events || data; // Handle mock structure vs API structure

            let createdCount = 0;
            let updatedCount = 0;

            for (const event of events) {
                // Extract teams from odds-api.com format
                const homeTeam = event.home_team || 'Unknown Home';
                const awayTeam = event.away_team || 'Unknown Away';
                const sportName = event.sportTitle || event.sport || 'unknown';

                // Extract odds from the bookmakers data
                let oddsData = {};
                if (event.bookmakers && event.bookmakers.length > 0) {
                    const mainBookmaker = event.bookmakers[0];
                    oddsData = {
                        bookmaker: mainBookmaker.title,
                        markets: mainBookmaker.markets
                    };
                }

                // Upsert match
                const [match, created] = await Match.findOrCreate({
                    where: { externalId: event.id },
                    defaults: {
                        externalId: event.id,
                        homeTeam: homeTeam,
                        awayTeam: awayTeam,
                        startTime: event.commence_time,
                        sport: sportName,
                        status: 'scheduled',
                        odds: oddsData,
                        lastUpdated: new Date()
                    }
                });

                if (!created) {
                    // Update existing match
                    match.odds = oddsData;
                    match.lastUpdated = new Date();
                    await match.save();

                    try { socketIo.getIo().emit('matchUpdate', match); } catch (e) { }

                    updatedCount++;
                } else {
                    createdCount++;
                    try { socketIo.getIo().emit('matchUpdate', match); } catch (e) { }
                }
            }

            console.log(`✅ Odds Update Complete. Created: ${createdCount}, Updated: ${updatedCount}`);
            return { created: createdCount, updated: updatedCount };

        } catch (error) {
            console.error('❌ Error updating matches:', error);
            throw error;
        }
    }

    /**
     * Generate realistic mock data for testing
     */
    getMockData() {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

        return [
            {
                event_id: 'mock_1',
                event_date: oneHourLater.toISOString(),
                sport_id: 3, // MLB
                teams: [
                    { is_home: true, name: 'New York Yankees' },
                    { is_home: false, name: 'Boston Red Sox' }
                ],
                lines: {
                    1: {
                        moneyline: { home: -150, away: +130 },
                        spread: { point: -1.5, home: +110, away: -130 },
                        total: { total: 9.5, over: -110, under: -110 }
                    }
                },
                score: {
                    event_status: 'STATUS_SCHEDULED',
                    score_away: 0,
                    score_home: 0,
                }
            },
            {
                event_id: 'mock_2',
                event_date: now.toISOString(), // Live now
                sport_id: 4, // NBA
                teams: [
                    { is_home: true, name: 'Los Angeles Lakers' },
                    { is_home: false, name: 'Golden State Warriors' }
                ],
                lines: {
                    2: {
                        moneyline: { home: -200, away: +170 }
                    }
                },
                score: {
                    event_status: 'STATUS_IN_PROGRESS',
                    score_away: 102,
                    score_home: 98,
                    period: 'Q4'
                }
            }
        ];
    }
}

module.exports = new OddsService();
