const cron = require('node-cron');
const oddsService = require('../services/oddsService');

const startOddsJob = () => {
    // Run every 60 seconds
    cron.schedule('*/60 * * * * *', async () => {
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
