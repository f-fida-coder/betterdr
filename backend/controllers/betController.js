const { Bet, User, Match } = require('../models');
const mongoose = require('mongoose');

const transactionsEnabled = () => String(process.env.MONGODB_TRANSACTIONS_ENABLED || 'false').toLowerCase() === 'true';
const withSession = (query, session) => (session ? query.session(session) : query);
const saveWithSession = (doc, session) => (session ? doc.save({ session }) : doc.save());
const createWithSession = (Model, docs, session) => (session ? Model.create(docs, { session }) : Model.create(docs));
const runWithOptionalTransaction = async (work) => {
    if (!transactionsEnabled()) {
        return work(null);
    }
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            result = await work(session);
        });
        return result;
    } catch (error) {
        const message = error?.message || '';
        if (message.includes('Transaction numbers are only allowed') || message.toLowerCase().includes('replica set')) {
            return work(null);
        }
        throw error;
    } finally {
        try { session.endSession(); } catch (e) {}
    }
};

// Place a Bet
// Place a Bet
// Place a Bet
exports.placeBet = async (req, res) => {
    try {
        const userId = req.user._id;
        const { matchId, selection, odds, amount, type } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        if (!matchId || !selection || !odds || !amount || !type) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const betAmount = parseFloat(amount);
        if (isNaN(betAmount) || betAmount <= 0) {
            return res.status(400).json({ message: 'Bet amount must be positive' });
        }

        let createdBet = null;
        await runWithOptionalTransaction(async (session) => {
            const user = await withSession(User.findById(userId), session);
            if (!user) {
                throw new Error('User not found');
            }

            if (user.status === 'suspended' || user.accountStatus === 'suspended') {
                throw new Error('Account is suspended');
            }

            const match = await withSession(Match.findById(matchId), session);
            if (!match) {
                throw new Error('Match not found');
            }

            if (!['scheduled', 'live'].includes(match.status)) {
                throw new Error('Match is not open for betting');
            }

            if (match.status === 'scheduled' && match.startTime && new Date(match.startTime).getTime() <= Date.now()) {
                throw new Error('Betting is closed for this match');
            }

            const markets = Array.isArray(match.odds?.markets) ? match.odds.markets : [];
            const normalizedType = String(type || '').toLowerCase();
            const findMarket = (key) => markets.find(m => String(m.key || '').toLowerCase() === key);

            let market = findMarket(normalizedType);
            if (!market && ['straight', 'moneyline', 'ml', 'h2h'].includes(normalizedType)) {
                market = findMarket('h2h') || findMarket('moneyline') || findMarket('ml');
            }

            if (!market && match.odds && typeof match.odds === 'object') {
                const homePrice = match.odds.home_win ?? match.odds.home ?? match.odds.homeWin;
                const awayPrice = match.odds.away_win ?? match.odds.away ?? match.odds.awayWin;
                const drawPrice = match.odds.draw;
                const outcomes = [];
                if (homePrice != null) outcomes.push({ name: match.homeTeam, price: Number(homePrice) });
                if (awayPrice != null) outcomes.push({ name: match.awayTeam, price: Number(awayPrice) });
                if (drawPrice != null) outcomes.push({ name: 'Draw', price: Number(drawPrice) });
                if (outcomes.length > 0) {
                    market = { key: 'h2h', outcomes };
                }
            }

            if (!market || !Array.isArray(market.outcomes) || market.outcomes.length === 0) {
                throw new Error('Market not available');
            }

            const outcome = (market.outcomes || []).find(o => o.name === selection);
            if (!outcome || outcome.price == null) {
                throw new Error('Selection not available');
            }

            const officialOdds = Number(outcome.price);
            const clientOdds = Number(odds);
            if (Number.isNaN(officialOdds) || Number.isNaN(clientOdds) || Math.abs(officialOdds - clientOdds) > 0.01) {
                throw new Error(`Odds changed. Current odds: ${officialOdds}`);
            }

            const BetLimit = require('../models/BetLimit');
            const sportType = match.sport || 'general';
            const limit = await BetLimit.findOne({ sportType, marketType: type }).lean() ||
                await BetLimit.findOne({ sportType: 'general', marketType: 'general' }).lean();

            if (limit) {
                if (betAmount < limit.minStake) {
                    throw new Error(`Minimum stake is $${limit.minStake}`);
                }
                if (betAmount > limit.maxStake) {
                    throw new Error(`Maximum stake is $${limit.maxStake}`);
                }
            } else if (betAmount < 1) {
                throw new Error('Minimum stake is $1.00');
            }

            const potentialPayout = betAmount * officialOdds;
            if (limit && potentialPayout > limit.maxPayout) {
                throw new Error(`Potential payout exceeds limit of $${limit.maxPayout}`);
            }

            const balance = parseFloat(user.balance?.toString() || '0');
            const pending = parseFloat(user.pendingBalance?.toString() || '0');
            const available = Math.max(0, balance - pending);

            if (available <= 0 || betAmount > available) {
                throw new Error('Insufficient available balance');
            }

            const balanceBefore = balance;
            const balanceAfter = balance - betAmount;

            user.balance = balanceAfter;
            user.pendingBalance = pending + betAmount;
            user.betCount = (user.betCount || 0) + 1;
            user.totalWagered = parseFloat(user.totalWagered?.toString() || '0') + betAmount;
            await saveWithSession(user, session);

            const bet = await createWithSession(Bet, [{
                userId,
                matchId,
                selection,
                odds: officialOdds,
                amount: betAmount,
                type,
                potentialPayout,
                status: 'pending',
                matchSnapshot: match.toObject(),
                ipAddress,
                userAgent
            }], session);
            createdBet = bet[0];

            const Transaction = require('../models/Transaction');
            await createWithSession(Transaction, [{
                userId,
                amount: betAmount,
                type: 'bet_placed',
                status: 'completed',
                balanceBefore,
                balanceAfter,
                referenceType: 'Bet',
                referenceId: createdBet._id,
                reason: 'BET_PLACED',
                description: `Bet placed on ${match.homeTeam} vs ${match.awayTeam}`,
                ipAddress,
                userAgent,
                metadata: {
                    matchId: matchId.toString(),
                    selection
                }
            }], session);
        });

        const updatedUser = await User.findById(req.user._id).lean();
        const balance = parseFloat(updatedUser?.balance?.toString() || '0');
        const pendingBalance = parseFloat(updatedUser?.pendingBalance?.toString() || '0');
        const availableBalance = Math.max(0, balance - pendingBalance);

        res.status(201).json({
            message: 'Bet placed successfully',
            bet: createdBet,
            balance,
            pendingBalance,
            availableBalance
        });

    } catch (error) {
        const message = error?.message || 'Server error placing bet';
        const status = message.includes('not found') ? 404 : 400;
        res.status(status).json({ message });
    } finally {}
};

// Helper for settlement (to be called by Cron or manually for now)
// Helper for settlement (to be called by Cron or manually for now)
exports.settleMatch = async (req, res) => {
    try {
        const { matchId, winner } = req.body;

        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        const pendingBets = await Bet.find({ matchId, status: 'pending' });

        const results = {
            total: pendingBets.length,
            won: 0,
            lost: 0
        };

        await runWithOptionalTransaction(async (session) => {
            for (const bet of pendingBets) {
            const user = await withSession(User.findById(bet.userId), session);
                if (!user) continue;

                const wager = parseFloat(bet.amount.toString());
                const balance = parseFloat(user.balance?.toString() || '0');
                const pending = parseFloat(user.pendingBalance?.toString() || '0');

                if (bet.selection === winner) {
                    const payout = parseFloat(bet.potentialPayout.toString());
                    const netWin = payout - wager;

                    bet.status = 'won';
                    bet.result = 'won';
                    bet.settledAt = new Date();
                    bet.settledBy = req.user ? 'admin' : 'system';
                    await saveWithSession(bet, session);

                    const balanceBefore = balance;
                    const balanceAfter = balance + payout;

                    user.balance = balanceAfter;
                    user.pendingBalance = Math.max(0, pending - wager);
                    user.totalWinnings = parseFloat(user.totalWinnings?.toString() || '0') + netWin;
                    await saveWithSession(user, session);

                    const Transaction = require('../models/Transaction');
                    await createWithSession(Transaction, [{
                        userId: user._id,
                        amount: payout,
                        type: 'bet_won',
                        status: 'completed',
                        balanceBefore,
                        balanceAfter,
                        referenceType: 'Bet',
                        referenceId: bet._id,
                        reason: 'BET_WON',
                        description: `Bet won on ${match.homeTeam} vs ${match.awayTeam}`,
                        metadata: { matchId: matchId.toString() }
                    }], session);

                    results.won++;
                } else {
                    bet.status = 'lost';
                    bet.result = 'lost';
                    bet.settledAt = new Date();
                    bet.settledBy = req.user ? 'admin' : 'system';
                    await saveWithSession(bet, session);

                    const balanceBefore = balance;
                    const balanceAfter = balance;

                    user.pendingBalance = Math.max(0, pending - wager);
                    await saveWithSession(user, session);

                    const Transaction = require('../models/Transaction');
                    await createWithSession(Transaction, [{
                        userId: user._id,
                        amount: wager,
                        type: 'bet_lost',
                        status: 'completed',
                        balanceBefore,
                        balanceAfter,
                        referenceType: 'Bet',
                        referenceId: bet._id,
                        reason: 'BET_LOST',
                        description: `Bet lost on ${match.homeTeam} vs ${match.awayTeam}`,
                        metadata: { matchId: matchId.toString() }
                    }], session);

                    results.lost++;
                }
            }
        });

        res.json({ message: 'Settlement complete', results });

    } catch (error) {
        console.error('Settlement Error:', error);
        res.status(500).json({ message: 'Error settling bets' });
    } finally {}
};

// Get User's Bets
exports.getMyBets = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status, limit = 50 } = req.query;

        const query = { userId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const bets = await Bet.find(query)
            .sort({ createdAt: -1 }) // Newest first
            .limit(parseInt(limit))
            .populate('matchId', 'homeTeam awayTeam startTime sport league'); // Join match details

        res.json(bets);

    } catch (error) {
        console.error('Get My Bets Error:', error);
        res.status(500).json({ message: 'Error fetching bets' });
    }
};
