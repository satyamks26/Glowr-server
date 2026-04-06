const express = require('express');
const router = express.Router();
const Roadmap = require('../models/Roadmap');
const Rating = require('../models/Rating');
const { protect } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/roadmap/generate
router.post('/generate', protect, async (req, res) => {
    try {
        const latestRating = await Rating.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
        if (!latestRating) {
            return res.status(400).json({ message: 'Please complete an analysis first!' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `Based on these 10 style/grooming tips, create a 30-day "Glow-up Roadmap". 
        Spread the tips across 30 days, creating daily bite-sized tasks.
        Tips: ${latestRating.tips.join(', ')}
        
        Return exactly a JSON array of 30 objects:
        [{"day": 1, "task": "...", "taskHindi": "..."}, ...]
        Ensure tasks are practical and progressive. Return ONLY the JSON array.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Gemini Roadmap Output:", text);

        let days;
        try {
            // Find the array [ ... ]
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start === -1 || end === -1) throw new Error("JSON not found in response");
            const jsonText = text.substring(start, end + 1);
            days = JSON.parse(jsonText);
        } catch (parseErr) {
            console.error("Parse Error:", parseErr);
            return res.status(500).json({ message: 'AI returned invalid plan. Please try again.' });
        }

        if (!Array.isArray(days)) {
            days = days.days || days.tasks || []; // Attempt to find nested array
        }

        if (days.length === 0) throw new Error("No tasks generated");

        const roadmap = await Roadmap.create({
            userId: req.user._id,
            ratingId: latestRating._id,
            title: `Roadmap from ${new Date().toLocaleDateString()}`,
            titleHindi: `${new Date().toLocaleDateString()} का रोडमैप`,
            days: days.slice(0, 30).map((d, i) => ({
                day: d.day || i + 1,
                task: d.task || "Styling task",
                taskHindi: d.taskHindi || "स्टाइलिंग कार्य",
                completed: false
            }))
        });

        res.status(201).json(roadmap);
    } catch (err) {
        console.error("Roadmap Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/roadmap
router.get('/', protect, async (req, res) => {
    try {
        const roadmap = await Roadmap.findOne({ userId: req.user._id, active: true }).sort({ createdAt: -1 });
        res.json(roadmap);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/roadmap/check/:dayId
router.patch('/check/:dayId', protect, async (req, res) => {
    try {
        const roadmap = await Roadmap.findOne({ userId: req.user._id, active: true });
        if (!roadmap) return res.status(404).json({ message: 'No active roadmap' });

        const day = roadmap.days.id(req.params.dayId);
        if (day) {
            day.completed = !day.completed;
            day.completedAt = day.completed ? new Date() : null;
            await roadmap.save();
        }
        res.json(roadmap);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
