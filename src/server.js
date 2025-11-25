const app = require('./app');
const config = require('./config/env');
const { testConnection } = require('./config/database');

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Start server
    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();
