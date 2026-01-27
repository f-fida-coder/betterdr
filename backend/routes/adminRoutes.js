const express = require('express');
const router = express.Router();
const { getUsers, getAgents, suspendUser, unsuspendUser, getStats, createAgent, createUser } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');

router.get('/users', protect, adminOnly, getUsers);
router.get('/agents', protect, adminOnly, getAgents);
router.post('/create-agent', protect, adminOnly, createAgent);
router.post('/create-user', protect, adminOnly, createUser);
router.post('/suspend', protect, adminOnly, suspendUser);
router.post('/unsuspend', protect, adminOnly, unsuspendUser);
router.get('/stats', protect, adminOnly, getStats);

module.exports = router;
