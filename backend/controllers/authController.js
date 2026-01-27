const { User } = require('../models');
const jwt = require('jsonwebtoken');

const generateToken = (id, role, agentId) => {
    return jwt.sign({ id, role, agentId }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

const registerUser = async (req, res) => {
    try {
        const { username, email, password, role, agentId } = req.body;

        console.log('📝 Register request:', { username, email, role, agentId });

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        // Validate role - only allow 'user' or 'agent' for self-registration
        // 'admin' role must be seeded or created by another admin
        let userRole = 'user';
        if (role === 'agent') {
            userRole = 'agent';
        }

        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            console.log('❌ User already exists:', email);
            return res.status(400).json({ message: 'Email already registered' });
        }

        const usernameExists = await User.findOne({ where: { username } });
        if (usernameExists) {
            console.log('❌ Username already exists:', username);
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Verify agent exists if agentId is provided
        let validAgentId = null;
        if (agentId) {
            const agent = await User.findByPk(agentId);
            if (agent && agent.role === 'agent') {
                validAgentId = agentId;
            }
        }

        const user = await User.create({
            username,
            email,
            password,
            role: userRole,
            agentId: validAgentId,
            status: 'active'
        });

        console.log('✅ User registered successfully:', user.username, '(ID:', user.id + ')');

        if (user) {
            res.status(201).json({
                id: user.id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                role: user.role,
                token: generateToken(user.id, user.role, user.agentId),
                message: 'Registration successful'
            });
        } else {
            res.status(400).json({ message: 'Failed to create user' });
        }
    } catch (error) {
        console.error('❌ Registration error:', error.message);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Test credentials
        const testCredentials = {
            'admin': 'admin123',
            'test': 'test123',
            'demo': 'demo123',
            'user': 'user123'
        };

        // Check for test credentials first
        if (testCredentials[username] === password) {
            // Create or get test user
            const [testUser] = await User.findOrCreate({
                where: { username: username },
                defaults: {
                    email: `${username}@test.com`,
                    password: testCredentials[username],
                    role: username === 'admin' ? 'admin' : username === 'test' ? 'admin' : 'user',
                    status: 'active',
                    balance: 5000
                }
            });

            return res.json({
                id: testUser.id,
                username: testUser.username,
                email: testUser.email,
                balance: testUser.balance,
                role: testUser.role,
                token: generateToken(testUser.id, testUser.role, testUser.agentId),
            });
        }

        // Normal database login
        const user = await User.findOne({ where: { username } });

        if (user && (await user.validPassword(password))) {
            if (user.status === 'suspended') {
                return res.status(403).json({ message: 'Account suspended. Contact support.' });
            }

            res.json({
                id: user.id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                role: user.role,
                token: generateToken(user.id, user.role, user.agentId),
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getMe = async (req, res) => {
    // Middleware should attach user to req
    if (req.user) {
        res.json({
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            balance: req.user.balance,
            pendingBalance: req.user.pendingBalance,
            totalWinnings: req.user.totalWinnings
        })
    } else {
        res.status(404).json({ message: 'User not found' });
    }
}

module.exports = { registerUser, loginUser, getMe };
