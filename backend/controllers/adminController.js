const { User, Bet } = require('../models');
const bcrypt = require('bcrypt');

// Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).populate('agentId', 'username').select('username email balance role status createdAt agentId');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all agents
exports.getAgents = async (req, res) => {
    try {
        const agents = await User.find({ role: 'agent' })
            .populate('createdBy', 'username')
            .select('username email balance role status createdAt createdBy');

        // Get user count for each agent
        const agentsWithCount = await Promise.all(
            agents.map(async (agent) => {
                const userCount = await User.countDocuments({ agentId: agent._id });
                const obj = agent.toObject();
                // Normalize Decimal128 balance to a plain number for JSON consumers
                if (obj.balance != null) {
                    try {
                        obj.balance = parseFloat(agent.balance.toString());
                    } catch (e) {
                        obj.balance = Number(obj.balance) || 0;
                    }
                } else {
                    obj.balance = 0;
                }

                return {
                    id: agent._id,
                    ...obj,
                    userCount
                };
            })
        );

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
        const creatorAdmin = req.user; // From auth middleware

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

        // Create agent
        const newAgent = new User({
            username,
            email,
            password,
            fullName: fullName || username,
            role: 'agent',
            status: 'active',
            balance: 0.00,
            createdBy: creatorAdmin._id
        });

        await newAgent.save();

        res.status(201).json({
            message: 'Agent created successfully',
            agent: {
                id: newAgent._id,
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

// Update Agent
exports.updateAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password } = req.body;

        const agent = await User.findById(id);
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        // Only update fields if provided
        if (email) agent.email = email;
        if (password) agent.password = password; // Pre-save hook will hash this

        await agent.save();

        res.json({ message: 'Agent updated successfully', agent });
    } catch (error) {
        console.error('Error updating agent:', error);
        res.status(500).json({ message: 'Server error updating agent' });
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
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        // Validate Agent if provided
        let assignedAgentId = null;
        if (agentId) {
            const agent = await User.findById(agentId);
            if (!agent) {
                return res.status(400).json({ message: 'Invalid Agent ID provided' });
            }
            if (agent.role !== 'agent') {
                return res.status(400).json({ message: 'Selected user is not an agent' });
            }
            assignedAgentId = agentId;
        }

        // Create user
        const newUser = new User({
            username,
            email,
            password,
            fullName: fullName || username,
            role: 'user',
            status: 'active',
            balance: 0.00,
            agentId: assignedAgentId
        });

        await newUser.save();

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser._id,
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
        const user = await User.findById(userId);

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
        const user = await User.findById(userId);

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
        const bets = await Bet.find({
            createdAt: { $gte: oneWeekAgo },
            status: { $in: ['won', 'lost'] }
        });

        let totalWagered = 0;
        let totalPayouts = 0;

        bets.forEach(bet => {
            totalWagered += parseFloat(bet.amount.toString());
            if (bet.status === 'won') {
                totalPayouts += parseFloat(bet.potentialPayout.toString());
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

// Get System Monitor Stats (Live Dashboard)
exports.getSystemStats = async (req, res) => {
    try {
        const { Match } = require('../models');

        // Parallel fetch for counts
        const [userCount, betCount, matchCount, liveMatches] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            Bet.countDocuments(),
            Match.countDocuments(),
            Match.find({
                $or: [
                    { status: 'live' },
                    { 'score.score_home': { $gt: 0 } },
                    { 'score.score_away': { $gt: 0 } }
                ]
            }).sort({ lastUpdated: -1 }).limit(20)
        ]);

        res.json({
            counts: {
                users: userCount,
                bets: betCount,
                matches: matchCount
            },
            liveMatches: liveMatches,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error getting system stats:', error);
        res.status(500).json({ message: 'Server error with system stats' });
    }
};

// Manual Odds Refresh
exports.refreshOdds = async (req, res) => {
    try {
        const oddsService = require('../services/oddsService');
        const results = await oddsService.updateMatches();
        res.json({ message: 'Odds refreshed successfully', results });
    } catch (error) {
        console.error('Error refreshing odds:', error);
        res.status(500).json({ message: 'Server error refreshing odds' });
    }
};
