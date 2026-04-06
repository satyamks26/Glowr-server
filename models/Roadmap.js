const mongoose = require('mongoose');

const RoadmapSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rating', required: true },
    title: { type: String, required: true },
    titleHindi: { type: String },
    days: [{
        day: { type: Number, required: true },
        task: { type: String, required: true },
        taskHindi: { type: String },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date }
    }],
    active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Roadmap', RoadmapSchema);
