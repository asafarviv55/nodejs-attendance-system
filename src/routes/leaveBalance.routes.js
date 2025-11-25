const express = require('express');
const router = express.Router();
const leaveBalanceService = require('../services/leaveBalance.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Get my leave balance
router.get('/balance', authenticate, async (req, res, next) => {
  try {
    const { year } = req.query;
    const balance = await leaveBalanceService.getLeaveBalance(req.user.id, parseInt(year) || null);
    res.json(balance);
  } catch (error) {
    next(error);
  }
});

// Check leave availability
router.get('/check-availability', authenticate, async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate } = req.query;
    const availability = await leaveBalanceService.checkLeaveAvailability(
      req.user.id,
      leaveType,
      startDate,
      endDate
    );
    res.json(availability);
  } catch (error) {
    next(error);
  }
});

// Get leave history
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { year } = req.query;
    const history = await leaveBalanceService.getLeaveHistory(req.user.id, parseInt(year) || null);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// Get leave types
router.get('/types', authenticate, (req, res) => {
  res.json(leaveBalanceService.LEAVE_TYPES);
});

// Admin routes
router.post('/initialize/:userId', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const { hireDate } = req.body;
    const result = await leaveBalanceService.initializeLeaveBalance(req.params.userId, hireDate);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/carry-forward/:userId', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const { maxDays } = req.body;
    const result = await leaveBalanceService.carryForwardLeaves(req.params.userId, maxDays || 5);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/reset-annual', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const result = await leaveBalanceService.resetAnnualBalances();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
