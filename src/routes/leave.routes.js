const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leave.controller');
const { verifyToken, isManager } = require('../middleware/auth.middleware');

router.post('/request', verifyToken, leaveController.requestLeave);
router.get('/requests', verifyToken, isManager, leaveController.getAllLeaveRequests);
router.post('/approve-deny', verifyToken, isManager, leaveController.respondToLeaveRequest);

module.exports = router;
