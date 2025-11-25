const express = require('express');
const router = express.Router();
const holidayService = require('../services/holiday.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Get holidays for a year
router.get('/', authenticate, async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const holidays = await holidayService.getHolidaysForYear(year);
    res.json(holidays);
  } catch (error) {
    next(error);
  }
});

// Get upcoming holidays
router.get('/upcoming', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const holidays = await holidayService.getUpcomingHolidays(limit);
    res.json(holidays);
  } catch (error) {
    next(error);
  }
});

// Get holiday summary for employee
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const summary = await holidayService.getHolidaySummary(req.user.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Check if date is holiday
router.get('/check', authenticate, async (req, res, next) => {
  try {
    const { date } = req.query;
    const holiday = await holidayService.isHoliday(date);
    res.json({ isHoliday: !!holiday, holiday });
  } catch (error) {
    next(error);
  }
});

// Calculate working days
router.get('/working-days', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const days = await holidayService.calculateWorkingDays(startDate, endDate);
    res.json({ workingDays: days });
  } catch (error) {
    next(error);
  }
});

// Admin routes
router.post('/', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const { name, date, isRecurring, description } = req.body;
    const holiday = await holidayService.addHoliday(name, date, isRecurring, description);
    res.status(201).json(holiday);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const result = await holidayService.deleteHoliday(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
