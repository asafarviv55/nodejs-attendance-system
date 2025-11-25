const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const requiredEnvVars = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  timezone: process.env.TZ || 'UTC',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
