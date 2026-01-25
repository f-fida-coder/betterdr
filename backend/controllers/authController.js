const { User } = require('../models');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username,
            email,
            password,
        });

        if (user) {
            res.status(201).json({
                id: user.id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                token: generateToken(user.id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
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
            return res.json({
                id: Math.random(),
                username: username,
                email: `${username}@test.com`,
                balance: 5000,
                token: 'test_token_' + username,
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
                token: generateToken(user.id),
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
