const sequelize = require('../config/database');
const User = require('./User');
const Bet = require('./Bet');
const Transaction = require('./Transaction');
const Match = require('./Match');

const db = {
    sequelize,
    User,
    Bet,
    Transaction,
    Match,
};

// Define relationships
User.hasMany(Bet, { foreignKey: 'userId' });
Bet.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Transaction, { foreignKey: 'userId' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

Match.hasMany(Bet, { foreignKey: 'matchId' });
Bet.belongsTo(Match, { foreignKey: 'matchId' });

// User Hierarchy (Agents -> Users)
User.belongsTo(User, { as: 'agent', foreignKey: 'agentId' });
User.hasMany(User, { as: 'subUsers', foreignKey: 'agentId' });


module.exports = db;
