const express = require('express');
const router = express.Router();
const Garment = require('../models/Garment');
const Rating = require('../models/Rating');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/wardrobe/analyze
router.post('/analyze', protect, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Please upload a photo of your garment' });

        const latestRating = await Rating.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
        if (!latestRating || !latestRating.colorPalette) {
            return res.status(400).json({ message: 'Analyze your style first to get your Power Palette!' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `Analyze this garment image. 
        1. Identify its dominant color (return as hex code).
        2. Compare it to these Power Colors: ${latestRating.colorPalette.join(', ')}.
        3. Determine if it's a good match (True/False).
        4. Provide detailed styling advice (clothing, combos) in English and Hindi.
        
        Return exactly this JSON format:
        {
            "dominantColor": "#...",
            "matchScore": 85,
            "isMatch": true,
            "analysis": "...",
            "analysisHindi": "..."
        }`;

        const imagePart = {
            inlineData: {
                data: Buffer.from(await fetch(req.file.path).then(res => res.arrayBuffer())).toString("base64"),
                mimeType: req.file.mimetype
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        console.log("Gemini Wardrobe Output:", text);

        let analysis;
        try {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start === -1 || end === -1) throw new Error("JSON not found");
            analysis = JSON.parse(text.substring(start, end + 1));
        } catch (parseErr) {
            console.error("Parse Error:", parseErr);
            return res.status(500).json({ message: 'AI failed to analyze clothing. Please try again.' });
        }

        const garment = await Garment.create({
            userId: req.user._id,
            imageUrl: req.file.path,
            dominantColor: analysis.dominantColor || "#000000",
            matchScore: analysis.matchScore || 0,
            isMatch: !!analysis.isMatch,
            analysis: analysis.analysis || "Style analysis complete",
            analysisHindi: analysis.analysisHindi || "स्टाइल विश्लेषण पूरा हुआ"
        });

        res.status(201).json(garment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/wardrobe
router.get('/', protect, async (req, res) => {
    try {
        const garments = await Garment.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(garments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
