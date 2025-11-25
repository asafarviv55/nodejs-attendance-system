const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const attendanceRoutes = require('./attendance.routes');
const userRoutes = require('./user.routes');
const profileRoutes = require('./profile.routes');
const leaveRoutes = require('./leave.routes');
const locationRoutes = require('./location.routes');

// New business feature routes
const overtimeRoutes = require('./overtime.routes');
const shiftRoutes = require('./shift.routes');
const reportRoutes = require('./report.routes');
const holidayRoutes = require('./holiday.routes');
const wfhRoutes = require('./wfh.routes');
const timesheetRoutes = require('./timesheet.routes');
const leaveBalanceRoutes = require('./leaveBalance.routes');

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

// Business feature routes
router.use('/overtime', overtimeRoutes);
router.use('/shifts', shiftRoutes);
router.use('/reports', reportRoutes);
router.use('/holidays', holidayRoutes);
router.use('/wfh', wfhRoutes);
router.use('/timesheets', timesheetRoutes);
router.use('/leave-balance', leaveBalanceRoutes);

module.exports = router;
