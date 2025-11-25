const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { auditLogMiddleware } = require('../middleware/auditLog.middleware');

router.post('/clockin', verifyToken, auditLogMiddleware('clockin'), attendanceController.clockIn);
router.post('/clockout', verifyToken, auditLogMiddleware('clockout'), attendanceController.clockOut);
router.get('/reports', verifyToken, attendanceController.getReports);
router.post('/request-correction', verifyToken, auditLogMiddleware('request_correction'), attendanceController.requestCorrection);
router.post('/respond-correction', verifyToken, auditLogMiddleware('respond_correction'), attendanceController.respondToCorrection);
router.get('/correction-requests', verifyToken, attendanceController.getCorrectionRequests);

module.exports = router;
