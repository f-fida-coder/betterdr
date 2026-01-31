const Match = require('../models/Match');

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
const getMatches = async (req, res) => {
    try {
        const matches = await Match.find().sort({ startTime: 1 });
        res.json(matches);
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ message: 'Server Error fetching matches' });
    }
};

// @desc    Get match by ID
// @route   GET /api/matches/:id
// @access  Public
const getMatchById = async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (match) {
            res.json(match);
        } else {
            res.status(404).json({ message: 'Match not found' });
        }
    } catch (error) {
        console.error('Error fetching match:', error);
        res.status(500).json({ message: 'Server Error fetching match' });
    }
};

module.exports = {
    getMatches,
    getMatchById
};
