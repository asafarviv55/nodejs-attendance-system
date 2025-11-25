const express = require('express');
const router = express.Router();
const timesheetService = require('../services/timesheet.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Create timesheet
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { weekStartDate } = req.body;
    const timesheet = await timesheetService.createTimesheet(req.user.id, weekStartDate);
    res.status(201).json(timesheet);
  } catch (error) {
    next(error);
  }
});

// Get my timesheets
router.get('/my-timesheets', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;
    const timesheets = await timesheetService.getUserTimesheets(req.user.id, status);
    res.json(timesheets);
  } catch (error) {
    next(error);
  }
});

// Get timesheet details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const details = await timesheetService.getTimesheetDetails(req.params.id);
    res.json(details);
  } catch (error) {
    next(error);
  }
});

// Submit timesheet
router.post('/:id/submit', authenticate, async (req, res, next) => {
  try {
    const result = await timesheetService.submitTimesheet(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Recall timesheet
router.post('/:id/recall', authenticate, async (req, res, next) => {
  try {
    const result = await timesheetService.recallTimesheet(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Manager routes
router.get('/pending', authenticate, authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    const { departmentId } = req.query;
    const timesheets = await timesheetService.getPendingTimesheets(req.user.id, departmentId);
    res.json(timesheets);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/review', authenticate, authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    const { approved, notes } = req.body;
    const result = await timesheetService.reviewTimesheet(req.params.id, req.user.id, approved, notes);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Auto-create weekly timesheets (admin job)
router.post('/auto-create', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const result = await timesheetService.autoCreateWeeklyTimesheets();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
