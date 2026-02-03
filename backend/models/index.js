const mongoose = require('mongoose');
const User = require('./User');
const Bet = require('./Bet');
const Transaction = require('./Transaction');
const Match = require('./Match');
const Message = require('./Message');
const ThirdPartyLimit = require('./ThirdPartyLimit');
const IpLog = require('./IpLog');
const Collection = require('./Collection');
const DeletedWager = require('./DeletedWager');
const SportsbookLink = require('./SportsbookLink');
const BillingInvoice = require('./BillingInvoice');
const PlatformSetting = require('./PlatformSetting');
const Rule = require('./Rule');
const Feedback = require('./Feedback');
const Faq = require('./Faq');
const ManualSection = require('./ManualSection');

const db = {
    mongoose,
    User,
    Bet,
    Transaction,
    Match,
    Message,
    ThirdPartyLimit,
    IpLog,
    Collection,
    DeletedWager,
    SportsbookLink,
    BillingInvoice,
    PlatformSetting,
    Rule,
    Feedback,
    Faq,
    ManualSection,
};

// Note: Relationships are defined using refs in the schemas
// Use .populate() when querying to fetch related data
// Examples:
// - User.find().populate('agentId') - Get user with agent details
// - Bet.find().populate(['userId', 'matchId']) - Get bet with user and match
// - Transaction.find().populate('userId') - Get transaction with user

module.exports = db;
