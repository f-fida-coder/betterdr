const { User, Bet, Sequelize } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

// Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: 'user' },
            include: [{
                model: User,
                as: 'agent',
                attributes: ['id', 'username']
            }],
            attributes: ['id', 'username', 'email', 'balance', 'role', 'status', 'createdAt', 'agentId']
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all agents
exports.getAgents = async (req, res) => {
    try {
        const agents = await User.findAll({
            where: { role: 'agent' },
            include: [{
                model: User,
                as: 'subUsers', // Get count of users under them? Or just list?
                attributes: ['id']
            }],
            attributes: ['id', 'username', 'email', 'balance', 'role', 'status', 'createdAt']
        });

        // Transform to include user count
        const agentsWithCount = agents.map(agent => ({
            ...agent.toJSON(),
            userCount: agent.subUsers ? agent.subUsers.length : 0
        }));

        res.json(agentsWithCount);
    } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({ message: 'Server error fetching agents' });
    }
};

// Create new agent
exports.createAgent = async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        // Create agent
        const newAgent = await User.create({
            username,
            email,
            password,
            fullName: fullName || username,
            role: 'agent',
            status: 'active',
            balance: 0.00
        });

        res.status(201).json({
            message: 'Agent created successfully',
            agent: {
                id: newAgent.id,
                username: newAgent.username,
                email: newAgent.email,
                fullName: newAgent.fullName,
                role: newAgent.role,
                status: newAgent.status,
                createdAt: newAgent.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating agent:', error.message, error);
        res.status(500).json({ message: 'Server error creating agent: ' + error.message });
    }
};

// Create new user (by admin or agent)
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, fullName, agentId } = req.body;
        const adminUser = req.user; // From auth middleware

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        // Validate Agent if provided
        let assignedAgentId = null;
        if (agentId) {
            const agent = await User.findByPk(agentId);
            if (!agent) {
                return res.status(400).json({ message: 'Invalid Agent ID provided' });
            }
            if (agent.role !== 'agent') {
                return res.status(400).json({ message: 'Selected user is not an agent' });
            }
            assignedAgentId = agentId;
        }

        // Create user
        const newUser = await User.create({
            username,
            email,
            password,
            fullName: fullName || username,
            role: 'user',
            status: 'active',
            balance: 0.00,
            agentId: assignedAgentId
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.fullName,
                role: newUser.role,
                status: newUser.status,
                balance: newUser.balance,
                agentId: newUser.agentId,
                createdAt: newUser.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating user:', error.message, error);
        res.status(500).json({ message: 'Server error creating user: ' + error.message });
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
