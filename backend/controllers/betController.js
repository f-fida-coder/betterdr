const { sequelize, Bet, User, Match } = require('../models');

// Place a Bet
exports.placeBet = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const userId = req.user.id; // From authMiddleware
        const { matchId, selection, odds, amount, type } = req.body;

        // 1. Validate inputs
        if (!matchId || !selection || !odds || !amount || !type) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (amount <= 0) {
            return res.status(400).json({ message: 'Bet amount must be positive' });
        }

        // 2. Fetch User and Match
        // We lock the user row to prevent race conditions on balance
        const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: 'User not found' });
        }

        const match = await Match.findByPk(matchId, { transaction: t });
        if (!match) {
            await t.rollback();
            return res.status(404).json({ message: 'Match not found' });
        }

        if (match.status !== 'scheduled' && match.status !== 'live') { // Basic check
            await t.rollback();
            return res.status(400).json({ message: 'Match is not open for betting' });
        }

        // 3. Check Balance
        const betAmount = parseFloat(amount);
        const currentBalance = parseFloat(user.balance);

        if (currentBalance < betAmount) {
            await t.rollback();
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        // 4. Calculate Potential Payout
        const potentialPayout = betAmount * parseFloat(odds);

        // 5. Create Bet Record
        const bet = await Bet.create({
            userId,
            matchId,
            selection,
            odds,
            amount: betAmount,
            type,
            potentialPayout,
            status: 'pending'
        }, { transaction: t });

        // 6. Update User Wallet
        // Deduct from main balance, add to pending
        await user.update({
            balance: currentBalance - betAmount,
            pendingBalance: parseFloat(user.pendingBalance) + betAmount
        }, { transaction: t });

        await t.commit();

        res.status(201).json({
            message: 'Bet placed successfully',
            bet: bet,
            newBalance: user.balance,
            newPending: user.pendingBalance
        });

    } catch (error) {
        await t.rollback();
        console.error('Place Bet Error:', error);
        res.status(500).json({ message: 'Server error placing bet' });
    }
};

// Helper for settlement (to be called by Cron or manually for now)
exports.settleMatch = async (req, res) => {
    // This is a manual trigger endpoint for strictly testing Phase 3
    const t = await sequelize.transaction();
    try {
        const { matchId, winner } = req.body; // Simulating a result: winner needs to match 'selection'

        const match = await Match.findByPk(matchId, { transaction: t });
        if (!match) {
            await t.rollback();
            return res.status(404).json({ message: 'Match not found' });
        }

        // Find all pending bets for this match
        const pendingBets = await Bet.findAll({
            where: { matchId, status: 'pending' },
            transaction: t
        });

        const results = {
            total: pendingBets.length,
            won: 0,
            lost: 0
        };

        for (const bet of pendingBets) {
            const user = await User.findByPk(bet.userId, { transaction: t, lock: t.LOCK.UPDATE });

            if (bet.selection === winner) {
                // WON
                const payout = parseFloat(bet.potentialPayout);
                const wager = parseFloat(bet.amount);

                await bet.update({ status: 'won' }, { transaction: t });

                // Return wager to balance (implied in payout calculation usually? 
                // Standard: Payout = Stake * Decimal Odds. 
                // So Payout INCLUDES the stake. 
                // We deducted Stake from Balance.
                // So we add Payout to Balance.
                // We accept that Pending Balance decreases by Stake.

                await user.update({
                    balance: parseFloat(user.balance) + payout,
                    pendingBalance: parseFloat(user.pendingBalance) - wager,
                    totalWinnings: parseFloat(user.totalWinnings) + (payout - wager) // Net profit
                }, { transaction: t });

                results.won++;
            } else {
                // LOST
                const wager = parseFloat(bet.amount);
                await bet.update({ status: 'lost' }, { transaction: t });

                // Just remove from pending. Money is already gone from Balance.
                await user.update({
                    pendingBalance: parseFloat(user.pendingBalance) - wager
                }, { transaction: t });

                results.lost++;
            }
        }

        // Update match status?
        // match.status = 'finished';
        // await match.save({ transaction: t });

        await t.commit();

        res.json({ message: 'Settlement complete', results });

    } catch (error) {
        await t.rollback();
        console.error('Settlement Error:', error);
        res.status(500).json({ message: 'Error settling bets' });
    }
};
