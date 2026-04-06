const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 10 },
    strengths: [{ type: String }],
    tips: [{ type: String }],
    strengthsHindi: [{ type: String }],
    tipsHindi: [{ type: String }],
    isAI: { type: Boolean, default: false },
    qualityScore: { type: Number, default: 0 },
    persona: { type: String },
    personaHindi: { type: String },
    colorPalette: [{ type: String }],
    celebTwin: { type: String },
    category: { type: String, default: 'Overall' },
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);
