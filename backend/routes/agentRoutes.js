const express = require('express');
const router = express.Router();
const { createUser, getMyUsers, getAgentStats } = require('../controllers/agentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes here are protected and for agents only
router.use(protect);
router.use(authorize('agent', 'admin')); // Admins can probably access too if needed, but primarily for agents

router.post('/create-user', createUser);
router.get('/my-users', getMyUsers);
router.get('/stats', getAgentStats);

module.exports = router;
