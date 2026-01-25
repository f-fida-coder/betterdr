const express = require('express');
const router = express.Router();
const { getUsers, suspendUser, unsuspendUser, getStats } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

router.get('/users', protect, admin, getUsers);
router.post('/suspend', protect, admin, suspendUser);
router.post('/unsuspend', protect, admin, unsuspendUser);
router.get('/stats', protect, admin, getStats);

module.exports = router;
