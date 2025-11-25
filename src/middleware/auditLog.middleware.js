const moment = require('moment-timezone');
const { pool } = require('../config/database');
const config = require('../config/env');

const logAction = async (userId, action, details) => {
  try {
    const timestamp = moment().tz(config.timezone).format();
    await pool.query(
      'INSERT INTO audit_log (user_id, action, details, timestamp) VALUES (?, ?, ?, ?)',
      [userId, action, details, timestamp]
    );
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

const auditLogMiddleware = (action) => {
  return async (req, res, next) => {
    const userId = req.userId || req.body.userId;
    const details = JSON.stringify({
      method: req.method,
      path: req.path,
      body: { ...req.body, password: undefined }, // Never log passwords
    });

    await logAction(userId, action, details);
    next();
  };
};

module.exports = { auditLogMiddleware, logAction };
