const leaveService = require('../services/leave.service');

const requestLeave = async (req, res, next) => {
  try {
    const { userId, startDate, endDate, reason } = req.body;

    if (!userId || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await leaveService.requestLeave(userId, startDate, endDate, reason);
    res.json({ success: true, message: 'Leave request submitted successfully' });
  } catch (error) {
    next(error);
  }
};

const getAllLeaveRequests = async (req, res, next) => {
  try {
    const leaveRequests = await leaveService.getAllLeaveRequests();
    res.json({ success: true, leaveRequests });
  } catch (error) {
    next(error);
  }
};

const respondToLeaveRequest = async (req, res, next) => {
  try {
    const { requestId, status } = req.body;

    if (!requestId || !status) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await leaveService.respondToLeaveRequest(requestId, status);
    res.json({ success: true, message: `Leave request ${status}` });
  } catch (error) {
    if (error.message === 'Invalid status') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { requestLeave, getAllLeaveRequests, respondToLeaveRequest };
