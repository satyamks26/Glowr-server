const mongoose = require('mongoose');

const BattleSchema = new mongoose.Schema({
    userA: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ratingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rating' },
        imageUrl: { type: String },
        votes: { type: Number, default: 0 }
    },
    userB: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ratingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rating' },
        imageUrl: { type: String },
        votes: { type: Number, default: 0 }
    },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Prevent double voting
}, { timestamps: true });

module.exports = mongoose.model('Battle', BattleSchema);
