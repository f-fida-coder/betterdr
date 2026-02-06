const { User, Bet } = require('../models');

// Create User (Agent specific)
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, fullName, balance } = req.body;
        const agentId = req.user._id; // From auth middleware

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        // Check weekly creation limit for this agent
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentUsersCount = await User.countDocuments({
            agentId: agentId,
            createdAt: { $gte: oneWeekAgo }
        });

        // Limit: 10 users per week
        const WEEKLY_LIMIT = 10;
        if (recentUsersCount >= WEEKLY_LIMIT) {
            return res.status(429).json({
                message: `Weekly limit reached. You can only create ${WEEKLY_LIMIT} new customers per week.`
            });
        }

        // Create user assigned to this agent
        const newUser = new User({
            username,
            email,
            password,
            fullName: fullName || username,
            role: 'user',
            status: 'active',
            balance: balance != null ? balance : 1000,
            pendingBalance: 0,
            agentId: agentId
        });

        await newUser.save();

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                agentId: newUser.agentId
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Server error creating user' });
    }
};

// Get My Users
exports.getMyUsers = async (req, res) => {
    try {
        const agentId = req.user._id;

        const users = await User.find({ agentId }).select('username email balance pendingBalance status createdAt totalWinnings');
        // Calculate active status (>= 2 bets in last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const activeUserIds = await Bet.aggregate([
            { $match: { userId: { $in: users.map(u => u._id) }, createdAt: { $gte: oneWeekAgo } } },
            { $group: { _id: '$userId', count: { $sum: 1 } } },
            { $match: { count: { $gte: 2 } } }
        ]);
        const activeSet = new Set(activeUserIds.map(a => String(a._id)));

        const formatted = users.map(user => {
            const balance = parseFloat(user.balance?.toString() || '0');
            const pendingBalance = parseFloat(user.pendingBalance?.toString() || '0');
            const availableBalance = Math.max(0, balance - pendingBalance);
            return {
                id: user._id,
                username: user.username,
                email: user.email,
                status: user.status,
                createdAt: user.createdAt,
                totalWinnings: user.totalWinnings,
                balance,
                pendingBalance,
                availableBalance,
                isActive: activeSet.has(String(user._id))
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching my users:', error);
        res.status(500).json({ message: 'Server error fetching users' });
    }
};

// Get Agent Stats
exports.getAgentStats = async (req, res) => {
    try {
        const agentId = req.user._id;

        // 1. Total Users
        const totalUsers = await User.countDocuments({ agentId });

        // 2. Get all users IDs for this agent
        const myUsers = await User.find({ agentId }).select('_id');
        const userIds = myUsers.map(u => u._id);

        if (userIds.length === 0) {
            return res.json({
                totalUsers: 0,
                totalBets: 0,
                totalWagered: 0,
                netProfit: 0
            });
        }

        // 3. Get Bets for these users
        const bets = await Bet.find({ userId: { $in: userIds } });

        let totalWagered = 0;
        let totalPayouts = 0;

        bets.forEach(bet => {
            totalWagered += parseFloat(bet.amount.toString());
            if (bet.status === 'won') {
                totalPayouts += parseFloat(bet.potentialPayout.toString());
            }
        });

        const netProfit = totalWagered - totalPayouts; // House profit from these users

        res.json({
            totalUsers,
            totalBets: bets.length,
            totalWagered,
            netProfit
        });
    } catch (error) {
        console.error('Error fetching agent stats:', error);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
};

// Agent updates customer balance owed (manual payment adjustments)
exports.updateUserBalanceOwed = async (req, res) => {
    try {
        const agentId = req.user._id;
        const { userId, balanceOwed, balance } = req.body;
        const nextValue = balance !== undefined ? balance : balanceOwed;

        if (!userId || nextValue === undefined) {
            return res.status(400).json({ message: 'User ID and balance are required' });
        }

        const user = await User.findById(userId);
        if (!user || user.role !== 'user') {
            return res.status(404).json({ message: 'Customer not found' });
        }

        if (req.user.role === 'agent' && String(user.agentId) !== String(agentId)) {
            return res.status(403).json({ message: 'Not authorized to update this customer' });
        }

        const balanceBefore = parseFloat(user.balance?.toString() || '0');
        const nextBalance = Math.max(0, Number(nextValue));

        user.balance = nextBalance;
        await user.save();

        const Transaction = require('../models/Transaction');
        await Transaction.create({
            userId: user._id,
            agentId: req.user?._id || null,
            amount: Math.abs(nextBalance - balanceBefore),
            type: 'adjustment',
            status: 'completed',
            balanceBefore,
            balanceAfter: nextBalance,
            referenceType: 'Adjustment',
            reason: 'AGENT_BALANCE_ADJUSTMENT',
            description: 'Agent updated user balance'
        });

        const pendingBalance = parseFloat(user.pendingBalance?.toString() || '0');
        const availableBalance = Math.max(0, nextBalance - pendingBalance);
        res.json({
            message: 'Balance updated',
            user: {
                id: user._id,
                balance: nextBalance,
                pendingBalance,
                availableBalance
            }
        });
    } catch (error) {
        console.error('Error updating balance owed:', error);
        res.status(500).json({ message: 'Server error updating balance owed' });
    }
};
