const express = require('express');
const router = express.Router();
const { createUser, getMyUsers, getAgentStats, updateUserBalanceOwed } = require('../controllers/agentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes here are protected and for agents only
router.use(protect);
router.use(authorize('agent', 'admin')); // Admins can probably access too if needed, but primarily for agents

const ensureAgentNotViewOnly = (req, res, next) => {
	if (req.user.role !== 'agent') return next();
	if (req.user.viewOnly || req.user.agentBillingStatus === 'unpaid') {
		return res.status(403).json({ message: 'Account is view-only due to unpaid platform balance.' });
	}
	return next();
};

router.post('/create-user', ensureAgentNotViewOnly, createUser);
router.get('/my-users', getMyUsers);
router.get('/stats', getAgentStats);
router.post('/update-balance-owed', ensureAgentNotViewOnly, updateUserBalanceOwed);

module.exports = router;
