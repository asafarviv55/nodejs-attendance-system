const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  // Don't leak error details in production
  const message = config.nodeEnv === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack }),
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

module.exports = { errorHandler, notFoundHandler };
