const cron = require('node-cron');
const oddsService = require('../services/oddsService');

const startOddsJob = () => {
    const minutes = Math.max(1, parseInt(process.env.ODDS_CRON_MINUTES || '1', 10) || 1);
    const cronExpr = `*/${minutes} * * * *`;

    const runUpdate = async (label) => {
        console.log(`⏰ Running Odds Update ${label}...`);
        try {
            await oddsService.updateMatches();
        } catch (error) {
            console.error('❌ Odds Update Failed:', error.message);
        }
    };

    // Run immediately on startup so data appears right away
    runUpdate('(initial)');

    cron.schedule(cronExpr, async () => {
        await runUpdate('(cron)');
    });

    console.log(`✅ Odds Cron Job started (runs every ${minutes} min).`);
};

module.exports = startOddsJob;
