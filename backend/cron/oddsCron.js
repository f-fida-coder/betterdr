const cron = require('node-cron');
const oddsService = require('../services/oddsService');

const startOddsJob = () => {
    // Run every 60 seconds
    // Run every 15 minutes to conserve API credits (500/month is very limited)
    cron.schedule('*/15 * * * *', async () => {
        console.log('⏰ Running Odds Update Cron Job...');
        try {
            await oddsService.updateMatches();
        } catch (error) {
            console.error('❌ Odds Cron Job Failed:', error.message);
        }
    });
    console.log('✅ Odds Cron Job started (runs every 60s).');
};

module.exports = startOddsJob;
