const { sequelize, Match } = require('./models');

const seedMatch = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        await sequelize.sync(); // ensure tables exist

        const match = await Match.create({
            homeTeam: 'Lakers',
            awayTeam: 'Warriors',
            startTime: new Date(), // Now
            status: 'live',
            sport: 'basketball',
            odds: {
                home_win: 1.90,
                away_win: 2.10,
                draw: 15.00
            },
            score: {
                home: 0,
                away: 0
            }
        });

        console.log('Match created with ID:', match.id);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding match:', error);
        process.exit(1);
    }
};

seedMatch();
