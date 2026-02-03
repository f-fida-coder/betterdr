const jwt = require('jsonwebtoken');
const { User, IpLog } = require('../models');

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
};

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('🔐 Auth Token received (first 50 chars):', token.substring(0, 50));
            console.log('🔐 Token length:', token.length);
            console.log('🔐 Authorization header:', req.headers.authorization.substring(0, 60));

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            console.log('✅ Token verified. User ID:', decoded.id, 'Role:', decoded.role);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                console.error('❌ User not found in database for ID:', decoded.id);
                return res.status(403).json({ message: 'Not authorized, user not found' });
            }

            if (req.user.status === 'suspended') {
                return res.status(403).json({ message: 'Not authorized, account suspended' });
            }

            const ip = getClientIp(req);
            if (ip && ip !== 'unknown') {
                const existingIp = await IpLog.findOne({ userId: req.user._id, ip });
                if (existingIp && existingIp.status === 'blocked') {
                    return res.status(403).json({ message: 'Access blocked for this IP address' });
                }

                await IpLog.findOneAndUpdate(
                    { userId: req.user._id, ip },
                    {
                        $set: {
                            userAgent: req.headers['user-agent'] || null,
                            lastActive: new Date()
                        },
                        $setOnInsert: {
                            country: 'Unknown',
                            city: 'Unknown',
                            status: 'active'
                        }
                    },
                    { upsert: true, new: true }
                );
            }

            console.log('✅ User authenticated:', req.user.username, 'Role:', req.user.role);
            next();
        } catch (error) {
            console.error('❌ Auth error:', error.name, '-', error.message);
            res.status(401).json({ message: 'Not authorized, token failed: ' + error.message });
        }
    } else {
        console.log('❌ No authorization header or Bearer missing');
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
