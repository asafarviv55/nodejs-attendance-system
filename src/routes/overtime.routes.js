const express = require('express');
const router = express.Router();
const overtimeController = require('../controllers/overtime.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Employee routes
router.post('/request', authenticate, overtimeController.requestOvertime);
router.get('/summary', authenticate, overtimeController.getOvertimeSummary);
router.get('/calculate-pay', authenticate, overtimeController.calculatePay);

// Manager routes
router.get('/requests', authenticate, authorize(['admin', 'manager']), overtimeController.getOvertimeRequests);
router.patch('/requests/:id', authenticate, authorize(['admin', 'manager']), overtimeController.approveOvertime);

module.exports = router;
