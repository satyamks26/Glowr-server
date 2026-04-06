const mongoose = require('mongoose');

const GarmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String, required: true },
    dominantColor: { type: String }, // Hex code
    matchScore: { type: Number }, // 1-100
    isMatch: { type: Boolean },
    analysis: { type: String }, // Detailed feedback
    analysisHindi: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Garment', GarmentSchema);
