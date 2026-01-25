const { User, Transaction } = require('../models');

const getBalance = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user) {
            res.json({
                balance: user.balance,
                pendingBalance: user.pendingBalance,
                totalWinnings: user.totalWinnings,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// For testing purposes - manual deposit
const deposit = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await User.findByPk(userId);

        // Transaction transaction
        const t = await user.sequelize.transaction();

        try {
            const newBalance = parseFloat(user.balance) + parseFloat(amount);

            await user.update({ balance: newBalance }, { transaction: t });

            await Transaction.create({
                userId,
                amount,
                type: 'deposit',
                description: 'Manual deposit'
            }, { transaction: t });

            await t.commit();

            res.json({ message: 'Deposit successful', balance: newBalance });
        } catch (err) {
            await t.rollback();
            throw err;
        }

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

module.exports = { getBalance, deposit };
