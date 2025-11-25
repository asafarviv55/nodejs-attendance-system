const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const attendanceRoutes = require('./attendance.routes');
const userRoutes = require('./user.routes');
const profileRoutes = require('./profile.routes');
const leaveRoutes = require('./leave.routes');
const locationRoutes = require('./location.routes');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/auth', authRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/users', userRoutes);
router.use('/profile', profileRoutes);
router.use('/leave', leaveRoutes);
router.use('/locations', locationRoutes);

module.exports = router;
