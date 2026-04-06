const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Rating = require('../models/Rating');

// GET /api/history
router.get('/', protect, async (req, res) => {
    try {
        const ratings = await Rating.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        res.json(ratings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/history/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const rating = await Rating.findOne({ _id: req.params.id, userId: req.user._id });
        if (!rating) return res.status(404).json({ message: 'Not found' });
        await rating.deleteOne();
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
