const express = require('express');
const router = express.Router();
const Battle = require('../models/Battle');
const Rating = require('../models/Rating');
const { protect } = require('../middleware/auth');

// POST /api/battles/join
router.post('/join', protect, async (req, res) => {
    try {
        console.log("User joining arena:", req.user._id);
        const latestRating = await Rating.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
        if (!latestRating) {
            console.log("No rating found for user:", req.user._id);
            return res.status(400).json({ message: 'Please analyze your style on the Home page first!' });
        }

        // Find an active battle with only one participant
        let battle = await Battle.findOne({ status: 'active', 'userB.userId': { $exists: false }, 'userA.userId': { $ne: req.user._id } });

        if (battle) {
            console.log("Pairing user in battle:", battle._id);
            battle.userB = {
                userId: req.user._id,
                ratingId: latestRating._id,
                imageUrl: latestRating.imageUrl
            };
            await battle.save();
        } else {
            // Check if user is already in an active singleton battle
            const existing = await Battle.findOne({ status: 'active', 'userA.userId': req.user._id, 'userB.userId': { $exists: false } });
            if (existing) {
                console.log("User already in queue:", req.user._id);
                return res.status(400).json({ message: 'You are already in the queue! Waiting for an opponent...' });
            }

            console.log("Creating new battle for user:", req.user._id);
            battle = await Battle.create({
                userA: {
                    userId: req.user._id,
                    ratingId: latestRating._id,
                    imageUrl: latestRating.imageUrl
                }
            });
        }

        res.status(201).json(battle);
    } catch (err) {
        console.error("Battle Join Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/battles/vote
router.get('/vote', protect, async (req, res) => {
    try {
        // Find a battle where both users are present and current user hasn't voted
        const battle = await Battle.findOne({
            status: 'active',
            'userB.userId': { $exists: true },
            'userA.userId': { $ne: req.user._id },
            'userB.userId': { $ne: req.user._id },
            voters: { $ne: req.user._id }
        });
        res.json(battle);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/battles/submit
router.post('/submit', protect, async (req, res) => {
    try {
        const { battleId, winner } = req.body; // winner is 'A' or 'B'
        const battle = await Battle.findById(battleId);
        if (!battle) return res.status(404).json({ message: 'Battle not found' });
        if (battle.voters.includes(req.user._id)) return res.status(400).json({ message: 'Already voted' });

        if (winner === 'A') battle.userA.votes += 1;
        else battle.userB.votes += 1;

        battle.voters.push(req.user._id);

        await battle.save();
        res.json({ message: 'Vote submitted!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/battles/status
router.get('/status', protect, async (req, res) => {
    try {
        const battle = await Battle.findOne({
            status: 'active',
            $or: [
                { 'userA.userId': req.user._id },
                { 'userB.userId': req.user._id }
            ]
        });
        res.json(battle);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
