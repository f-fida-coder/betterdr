const axios = require('axios');
const Match = require('../models/Match');
const socketIo = require('../socket');

// API Configuration
const API_KEY = process.env.ODDS_API_KEY;
const API_HOST = 'therundown-therundown-v1.p.rapidapi.com';
const API_URL = 'https://therundown-therundown-v1.p.rapidapi.com/sports/3/events'; // 3 = MLB (example), can be dynamic

/**
 * Service to fetch odds and update matches in the database.
 */
class OddsService {

    /**
     * Fetch odds from API or Mock Data
     */
    async fetchOdds() {
        if (!process.env.ODDS_API_KEY) {
            console.warn('⚠️  ODDS_API_KEY is missing in .env. Using MOCK DATA for sports odds.');
            return this.getMockData();
        }

        console.log(`🌐 Fetching odds from API: ${API_URL}`);
        try {
            const response = await axios.get(API_URL, {
                headers: {
                    'X-RapidAPI-Key': process.env.ODDS_API_KEY,
                    'X-RapidAPI-Host': API_HOST
                },
                params: {
                    include: 'scores'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching odds from API:', error.message);
            if (error.response) {
                console.error('   API Status:', error.response.status);
                // console.error('   API Data:', error.response.data);
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
                const teams = event.teams || event.teams_normalized;
                const homeTeam = teams.find(t => t.is_home);
                const awayTeam = teams.find(t => !t.is_home);

                // Construct safe defaults
                const homeName = homeTeam ? homeTeam.name : 'Unknown Home';
                const awayName = awayTeam ? awayTeam.name : 'Unknown Away';
                const sportName = event.sport_id ? `sport_${event.sport_id}` : 'baseball'; // Simple mapping

                // Prepare odds/score data
                const oddsData = event.lines ? event.lines : {};
                const scoreData = event.score ? event.score : {};

                // Upsert match
                const [match, created] = await Match.findOrCreate({
                    where: { externalId: event.event_id || event.id },
                    defaults: {
                        externalId: event.event_id || event.id,
                        homeTeam: homeName,
                        awayTeam: awayName,
                        startTime: event.event_date,
                        sport: sportName,
                        status: event.score ? 'live' : 'scheduled',
                        odds: oddsData,
                        score: scoreData,
                        lastUpdated: new Date()
                    }
                });

                if (!created) {
                    // Update existing match
                    match.odds = oddsData;
                    match.score = scoreData;
                    match.status = event.score ? 'live' : match.status; // Simple status logic
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
