const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_refund'),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'completed',
        allowNull: false,
    },
    stripePaymentId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
});

module.exports = Transaction;
