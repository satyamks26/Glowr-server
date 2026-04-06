require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL
].filter(Boolean).map(o => o.replace(/\/$/, "")); // Remove trailing slash if any

app.use(cors({
    origin: function (origin, callback) {
        console.log("🌐 CORS Checking Origin:", origin);
        const normalizedOrigin = origin ? origin.replace(/\/$/, "") : null;

        if (!origin || allowedOrigins.includes(normalizedOrigin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.warn("🚫 CORS Blocked Origin:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/analyze', require('./routes/analyze'));
app.use('/api/history', require('./routes/history'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/roadmap', require('./routes/roadmap'));
app.use('/api/wardrobe', require('./routes/wardrobe'));
app.use('/api/battles', require('./routes/battles'));

app.get('/', (req, res) => res.json({ message: 'Glowr API running ✨' }));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('🔴 GLOBAL ERROR:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(process.env.PORT || 5000, () => {
            console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
        });
    })
    .catch((err) => console.error('MongoDB connection error:', err));
