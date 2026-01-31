const { User, Bet } = require('../models');

// Create User (Agent specific)
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;
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

        // Create user assigned to this agent
        const newUser = new User({
            username,
            email,
            password,
            fullName: fullName || username,
            role: 'user',
            status: 'active',
            balance: 0.00,
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

        const users = await User.find({ agentId }).select('username email balance status createdAt totalWinnings');

        res.json(users);
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
