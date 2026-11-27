const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const aqiRouter = require('./routes/aqi');
const geminiRouter = require('./routes/gemini');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust first proxy (required for accurate IP rate-limiting on Vercel)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(compression());
const allowedOrigins = [
  process.env.ALLOWED_ORIGIN,
  'https://vayucare-ai.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10kb' }));

// Global rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Routes
app.use('/api/aqi', aqiRouter);
app.use('/api/gemini', geminiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Only listen directly when run directly (not when imported in tests or serverless)
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`VayuCare API server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
