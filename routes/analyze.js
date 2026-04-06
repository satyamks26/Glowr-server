const express = require('express');
const router = express.Router();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { protect } = require('../middleware/auth');
const { upload, cloudinary } = require('../config/cloudinary');
const Rating = require('../models/Rating');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Config for generation
const generationConfig = {
    temperature: 0,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 4096,
};

// Helper: convert image URL to base64 for Gemini
async function urlToBase64(url) {
    const https = require('https');
    const http = require('http');
    const protocol = url.startsWith('https') ? https : http;
    return new Promise((resolve, reject) => {
        protocol.get(url, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer.toString('base64'));
            });
            res.on('error', reject);
        });
    });
}

// POST /api/analyze
router.post('/', protect, upload.single('photo'), async (req, res) => {
    try {
        console.log('📸 NEW ANALYSIS REQUEST');
        if (!req.file) {
            console.log('❌ No file in request');
            return res.status(400).json({ message: 'No image uploaded' });
        }

        const imageUrl = req.file.path;
        console.log('✅ Image uploaded to Cloudinary:', imageUrl);

        // Get base64 of uploaded image
        const base64Image = await urlToBase64(imageUrl);
        const mimeType = req.file.mimetype || 'image/jpeg';

        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig
        });

        const prompt = `You are a professional image analyst and style consultant. Analyze this person and provide a high-standard assessment.

SCORING CRITERIA:
1. ATTRACTIVENESS/STYLE RATING: Be STRICT and CRITICAL. A 7.0/10 is "Good", 8.0 is "Very Good", 9.0 is "Exceptional". Most people should be between 4-7.
2. PHOTO QUALITY: Rate the photo clarity/lighting/composition from 1-10. An average clear phone photo is 7-8. Only give 1-3 if the photo is truly poor/blurry.
3. AI DETECTION: Carefully check if the image is AI-generated (synthetic). Look for: 
   - Overly smooth/perfect skin texture.
   - Unnatural hair-to-background blending or "floating" hair strands.
   - Unusual or inconsistent eye reflections/pupil shapes.
   - Inconsistencies in clothing patterns or jewelry.
   - Unnatural finger/hand shapes or backgrounds.
   If you see these, set "isAI" to true.

OUTPUT REQUIREMENTS:
- Provide exactly 5 strengths.
- Provide exactly 10 actionable styling/grooming tips.
- STYLE PERSONA: Give a creative 2-3 word title (e.g. "The Radiant Visionary").
- COLOR PALETTE: Suggest 4 hex codes that suit them best.
- CELEB TWIN: Mention a celebrity style icon with a similar vibe.
- Return the response in BOTH English and Hindi.
- Return ONLY a valid raw JSON object.

JSON STRUCTURE:
{
  "rating": 6.8,
  "qualityScore": 7.5,
  "isAI": false,
  "persona": "The Radiant Icon",
  "personaHindi": "तेजस्वी आइकन",
  "celebTwin": "Timothée Chalamet",
  "colorPalette": ["#1a1a1a", "#7c6af5", "#f5c518", "#ffffff"],
  "strengths": ["...", "...", "...", "...", "..."],
  "strengthsHindi": ["...", "...", "...", "...", "..."],
  "tips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5", "Tip 6", "Tip 7", "Tip 8", "Tip 9", "Tip 10"],
  "tipsHindi": ["सुझाव 1", "सुझाव 2", "सुझाव 3", "सुझाव 4", "सुझाव 5", "सुझाव 6", "सुझाव 7", "सुझाव 8", "सुझाव 9", "सुझाव 10"]
}`;

        console.log('🤖 Sending to Gemini...');
        let result;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            mimeType,
                            data: base64Image,
                        },
                    },
                ]);
                break; // Success!
            } catch (err) {
                attempts++;
                console.log(`⚠️ Gemini attempt ${attempts} failed: ${err.message}`);
                if (attempts < maxAttempts && (err.message.includes('503') || err.message.includes('429'))) {
                    console.log('⏳ Retrying in 2 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw err; // Max attempts reached or non-retryable error
                }
            }
        }

        const rawText = result.response.text().trim();
        console.log('🤖 Raw Gemini Response:', rawText);

        let analysisData;
        try {
            // More robust JSON extraction: find the outermost { and }
            const start = rawText.indexOf('{');
            const end = rawText.lastIndexOf('}');
            if (start === -1 || end === -1) throw new Error('No JSON brackets found');

            const jsonText = rawText.substring(start, end + 1);
            analysisData = JSON.parse(jsonText);
        } catch (parseError) {
            console.warn('⚠️ JSON Parse failed, using detailed recovery fallback');
            analysisData = {
                rating: 6.2,
                qualityScore: 6.5,
                isAI: false,
                strengths: ['Clear facial features', 'Good posture', 'Clean presentation', 'Balanced look', 'Natural lighting'],
                strengthsHindi: ['स्पष्ट चेहरे की विशेषताएं', 'मुद्रा (posture) सही है', 'साफ-सुथरी प्रस्तुति', 'संतुलित रूप', 'प्राकृतिक रोशनी'],
                tips: [
                    'Improve lighting consistency',
                    'Refine your hair styling',
                    'Select clothes that fit perfectly',
                    'Practice a confident smile',
                    'Choose a simpler background',
                    'Maintain consistent grooming',
                    'Upgrade your accessories',
                    'Experiment with clothing colors',
                    'Keep your posture upright',
                    'Improve photo composition'
                ],
                tipsHindi: [
                    'लाइटिंग की स्थिरता में सुधार करें',
                    'अपने हेयर स्टाइल को बेहतर बनाएं',
                    'कपड़े चुनें जो पूरी तरह फिट हों',
                    'आत्मविश्वासी मुस्कान का अभ्यास करें',
                    'एक सरल बैकग्राउंड चुनें',
                    'ग्रूमिंग को लगातार बनाए रखें',
                    'अपनी एक्सेसरीज (accessories) को अपग्रेड करें',
                    'कपड़ों के रंगों के साथ प्रयोग करें',
                    'अपनी मुद्रा (posture) को सीधा रखें',
                    'फोटो कंपोजिशन में सुधार करें'
                ],
            };
        }

        // Clamp values
        analysisData.rating = Math.min(10, Math.max(1, parseFloat(analysisData.rating) || 5));
        analysisData.qualityScore = Math.min(10, Math.max(1, parseFloat(analysisData.qualityScore) || 5));
        analysisData.isAI = !!analysisData.isAI;

        // Save to DB
        const rating = await Rating.create({
            userId: req.user._id,
            imageUrl,
            rating: analysisData.rating,
            qualityScore: analysisData.qualityScore,
            isAI: analysisData.isAI,
            persona: analysisData.persona,
            personaHindi: analysisData.personaHindi,
            colorPalette: analysisData.colorPalette || [],
            celebTwin: analysisData.celebTwin,
            strengths: analysisData.strengths || [],
            strengthsHindi: analysisData.strengthsHindi || [],
            tips: analysisData.tips || [],
            tipsHindi: analysisData.tipsHindi || [],
        });

        res.json({
            _id: rating._id,
            imageUrl,
            rating: analysisData.rating,
            qualityScore: analysisData.qualityScore,
            isAI: analysisData.isAI,
            persona: analysisData.persona,
            personaHindi: analysisData.personaHindi,
            colorPalette: analysisData.colorPalette || [],
            celebTwin: analysisData.celebTwin,
            strengths: analysisData.strengths,
            strengthsHindi: analysisData.strengthsHindi,
            tips: analysisData.tips,
            tipsHindi: analysisData.tipsHindi,
            createdAt: rating.createdAt,
        });
    } catch (err) {
        console.error('🔴 Analyze error:', err);
        res.status(500).json({ message: 'Analysis failed: ' + err.message });
    }
});

module.exports = router;
