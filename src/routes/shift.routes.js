const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shift.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Get all shifts
router.get('/', authenticate, shiftController.getAllShifts);

// Get current user's shift
router.get('/my-shift', authenticate, shiftController.getCurrentShift);

// Get department schedule
router.get('/schedule', authenticate, shiftController.getDepartmentSchedule);

// Shift swap
router.post('/swap-request', authenticate, shiftController.requestShiftSwap);
router.patch('/swap-request/:id', authenticate, shiftController.respondToSwap);

// Admin routes
router.post('/', authenticate, authorize(['admin']), shiftController.createShift);
router.post('/assign', authenticate, authorize(['admin', 'manager']), shiftController.assignShift);

module.exports = router;
