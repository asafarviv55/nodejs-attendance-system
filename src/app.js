const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Attendance System API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
