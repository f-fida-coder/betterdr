const { Bet, User, Match } = require('../models');
const mongoose = require('mongoose');

// Place a Bet
exports.placeBet = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id; // From authMiddleware
        const { matchId, selection, odds, amount, type } = req.body;

        // 1. Validate inputs
        if (!matchId || !selection || !odds || !amount || !type) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (amount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Bet amount must be positive' });
        }

        // 2. Fetch User and Match
        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'User not found' });
        }

        const match = await Match.findById(matchId).session(session);
        if (!match) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Match not found' });
        }

        if (match.status !== 'scheduled' && match.status !== 'live') {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Match is not open for betting' });
        }

        // 3. Check Balance
        const betAmount = parseFloat(amount);
        const currentBalance = parseFloat(user.balance.toString());

        if (currentBalance < betAmount) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        // 4. Calculate Potential Payout
        const potentialPayout = betAmount * parseFloat(odds);

        // 5. Create Bet Record
        const bet = new Bet({
            userId,
            matchId,
            selection,
            odds,
            amount: betAmount,
            type,
            potentialPayout,
            status: 'pending'
        });
        await bet.save({ session });

        // 6. Update User Wallet
        // Deduct from main balance, add to pending
        user.balance = currentBalance - betAmount;
        user.pendingBalance = parseFloat(user.pendingBalance.toString()) + betAmount;
        await user.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            message: 'Bet placed successfully',
            bet: bet,
            newBalance: user.balance,
            newPending: user.pendingBalance
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Place Bet Error:', error);
        res.status(500).json({ message: 'Server error placing bet' });
    } finally {
        await session.endSession();
    }
};

// Helper for settlement (to be called by Cron or manually for now)
exports.settleMatch = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { matchId, winner } = req.body;

        const match = await Match.findById(matchId).session(session);
        if (!match) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Match not found' });
        }

        // Find all pending bets for this match
        const pendingBets = await Bet.find({ matchId, status: 'pending' }).session(session);

        const results = {
            total: pendingBets.length,
            won: 0,
            lost: 0
        };

        for (const bet of pendingBets) {
            const user = await User.findById(bet.userId).session(session);

            if (bet.selection === winner) {
                // WON
                const payout = parseFloat(bet.potentialPayout.toString());
                const wager = parseFloat(bet.amount.toString());

                bet.status = 'won';
                await bet.save({ session });

                user.balance = parseFloat(user.balance.toString()) + payout;
                user.pendingBalance = parseFloat(user.pendingBalance.toString()) - wager;
                user.totalWinnings = parseFloat(user.totalWinnings.toString()) + (payout - wager);
                await user.save({ session });

                results.won++;
            } else {
                // LOST
                const wager = parseFloat(bet.amount.toString());
                bet.status = 'lost';
                await bet.save({ session });

                user.pendingBalance = parseFloat(user.pendingBalance.toString()) - wager;
                await user.save({ session });

                results.lost++;
            }
        }

        await session.commitTransaction();

        res.json({ message: 'Settlement complete', results });

    } catch (error) {
        await session.abortTransaction();
        console.error('Settlement Error:', error);
        res.status(500).json({ message: 'Error settling bets' });
    } finally {
        await session.endSession();
    }
};
