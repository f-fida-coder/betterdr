const oddsService = require('../services/oddsService');
const { sequelize } = require('../models');

const testOdds = async () => {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');
        await sequelize.sync({ alter: true }); // Ensure tables update with new columns

        console.log('Fetching and updating odds...');
        const result = await oddsService.updateMatches();
        console.log('Result:', result);

        process.exit(0);
    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
};

testOdds();
