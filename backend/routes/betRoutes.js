const express = require('express');
const router = express.Router();
const betController = require('../controllers/betController');
const { protect } = require('../middleware/authMiddleware');

// Place a bet - Protected
router.post('/place', protect, betController.placeBet);

// Settle a match (Manual/Admin trigger for now) - Protected (optionally add admin check later)
router.post('/settle', protect, betController.settleMatch);

module.exports = router;
