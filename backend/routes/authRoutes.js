const express = require('express');
const router = express.Router();
const { registerUser, loginUser, loginAdmin, loginAgent, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/admin/login', loginAdmin);
router.post('/agent/login', loginAgent);
router.get('/me', protect, getMe);

module.exports = router;
