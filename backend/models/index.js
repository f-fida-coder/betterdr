const mongoose = require('mongoose');
const User = require('./User');
const Bet = require('./Bet');
const Transaction = require('./Transaction');
const Match = require('./Match');

const db = {
    mongoose,
    User,
    Bet,
    Transaction,
    Match,
};

// Note: Relationships are defined using refs in the schemas
// Use .populate() when querying to fetch related data
// Examples:
// - User.find().populate('agentId') - Get user with agent details
// - Bet.find().populate(['userId', 'matchId']) - Get bet with user and match
// - Transaction.find().populate('userId') - Get transaction with user

module.exports = db;
