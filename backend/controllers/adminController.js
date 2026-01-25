const { User, Bet, Sequelize } = require('../models');
const { Op } = require('sequelize');

// Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'balance', 'role', 'status', 'createdAt']
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Suspend user
exports.suspendUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = 'suspended';
        await user.save();

        res.json({ message: `User ${user.username} suspended` });
    } catch (error) {
        console.error('Error suspending user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Unsuspend user
exports.unsuspendUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = 'active';
        await user.save();

        res.json({ message: `User ${user.username} unsuspended` });
    } catch (error) {
        console.error('Error unsuspending user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Weekly Stats
exports.getStats = async (req, res) => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Total Bets Placed in last 7 days
        const bets = await Bet.findAll({
            where: {
                createdAt: {
                    [Op.gte]: oneWeekAgo
                },
                status: {
                    [Op.in]: ['won', 'lost'] // Only settled bets count for profit? Or all bets for volume?
                    // User asked for "total house profit vs total user payouts"
                    // Payouts happen when status is 'won'.
                    // House profit happens when status is 'lost' (amount) MINUS payouts (profit part or full payout?)
                    // Simpler: House Profit = Total Wagered - Total Payouts
                }
            }
        });

        let totalWagered = 0;
        let totalPayouts = 0;

        bets.forEach(bet => {
            totalWagered += parseFloat(bet.amount);
            if (bet.status === 'won') {
                // effective payout is potentialPayout
                totalPayouts += parseFloat(bet.potentialPayout);
            }
        });

        const houseProfit = totalWagered - totalPayouts;

        res.json({
            totalWagered,
            totalPayouts,
            houseProfit
        });

    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ message: 'Server error with stats' });
    }
};
