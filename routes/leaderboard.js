const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const { protect } = require('../middleware/auth');

// GET /api/leaderboard
router.get('/', async (req, res) => {
    try {
        const topRatings = await Rating.find()
            .sort({ rating: -1 })
            .limit(20)
            .populate('userId', 'name'); // Assume User model has 'name'

        res.json(topRatings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
