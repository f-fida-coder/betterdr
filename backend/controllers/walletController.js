const { User, Transaction } = require('../models');
const mongoose = require('mongoose');

const getBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount } = req.body;
        const userId = req.user._id;

        if (!amount || amount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await User.findById(userId).session(session);

        try {
            const newBalance = parseFloat(user.balance.toString()) + parseFloat(amount);

            user.balance = newBalance;
            await user.save({ session });

            await Transaction.create([{
                userId,
                amount,
                type: 'deposit',
                description: 'Manual deposit'
            }], { session });

            await session.commitTransaction();

            res.json({ message: 'Deposit successful', balance: newBalance });
        } catch (err) {
            await session.abortTransaction();
            throw err;
        }

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        await session.endSession();
    }
}

module.exports = { getBalance, deposit };
