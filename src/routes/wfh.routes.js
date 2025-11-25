const express = require('express');
const router = express.Router();
const wfhService = require('../services/wfh.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Request WFH
router.post('/request', authenticate, async (req, res, next) => {
  try {
    const { date, reason } = req.body;
    const result = await wfhService.requestWFH(req.user.id, date, reason);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Get my WFH requests
router.get('/my-requests', authenticate, async (req, res, next) => {
  try {
    const { status, fromDate, toDate } = req.query;
    const requests = await wfhService.getWFHRequests({
      userId: req.user.id,
      status,
      fromDate,
      toDate,
    });
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Get WFH summary
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const summary = await wfhService.getWFHSummary(
      req.user.id,
      parseInt(month) || new Date().getMonth() + 1,
      parseInt(year) || new Date().getFullYear()
    );
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Log WFH attendance
router.post('/log', authenticate, async (req, res, next) => {
  try {
    const { action, notes } = req.body;
    const result = await wfhService.logWFHAttendance(req.user.id, action, notes);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Cancel WFH request
router.delete('/request/:id', authenticate, async (req, res, next) => {
  try {
    const result = await wfhService.cancelWFH(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Manager routes
router.get('/requests', authenticate, authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    const { status, departmentId, fromDate, toDate } = req.query;
    const requests = await wfhService.getWFHRequests({ status, departmentId, fromDate, toDate });
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

router.patch('/request/:id', authenticate, authorize(['admin', 'manager']), async (req, res, next) => {
  try {
    const { approved, response } = req.body;
    const result = await wfhService.respondToWFH(req.params.id, req.user.id, approved, response);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
