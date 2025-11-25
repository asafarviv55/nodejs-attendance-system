const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Employee routes
router.get('/monthly', authenticate, reportController.getMonthlyReport);
router.get('/trends', authenticate, reportController.getAttendanceTrends);
router.get('/export', authenticate, reportController.exportReport);

// Manager routes
router.get('/department', authenticate, authorize(['admin', 'manager']), reportController.getDepartmentReport);
router.get('/company-summary', authenticate, authorize(['admin', 'manager']), reportController.getCompanySummary);

module.exports = router;
