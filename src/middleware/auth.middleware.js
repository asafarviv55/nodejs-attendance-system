const jwt = require('jsonwebtoken');
const config = require('../config/env');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.userId = decoded.userId;
    req.roleId = decoded.roleId;
    req.roleName = decoded.roleName;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.roleName !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin role required' });
  }
  next();
};

const isManager = (req, res, next) => {
  if (req.roleName !== 'manager' && req.roleName !== 'admin') {
    return res.status(403).json({ success: false, message: 'Manager role required' });
  }
  next();
};

module.exports = { verifyToken, isAdmin, isManager };
