const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bet = sequelize.define('Bet', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0.01,
        }
    },
    odds: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING, // e.g., 'moneyline', 'spread', 'over/under'
        allowNull: false,
    },
    selection: {
        type: DataTypes.STRING, // e.g., 'Home', 'Away', 'Over' - what they bet on
        allowNull: false,
    },
    potentialPayout: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'won', 'lost', 'void'),
        defaultValue: 'pending',
    },
});

module.exports = Bet;
