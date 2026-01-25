const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Match = sequelize.define('Match', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    externalId: {
        type: DataTypes.STRING, // For mapping to external API IDs
        unique: true,
        allowNull: true
    },
    homeTeam: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    awayTeam: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'live', 'finished', 'cancelled'),
        defaultValue: 'scheduled',
    },
    sport: {
        type: DataTypes.STRING,
        allowNull: false, // e.g., 'soccer', 'basketball'
    },
    odds: {
        type: DataTypes.JSONB, // Stores moneyline, spread, totals
        allowNull: true,
        defaultValue: {}
    },
    score: {
        type: DataTypes.JSONB, // Stores live scores (home, away, period)
        allowNull: true,
        defaultValue: {}
    },
    lastUpdated: {
        type: DataTypes.DATE,
        allowNull: true
    }
    // Add more fields as needed (scores, etc.)
});

module.exports = Match;
