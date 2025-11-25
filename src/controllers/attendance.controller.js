const attendanceService = require('../services/attendance.service');

const clockIn = async (req, res, next) => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await attendanceService.clockIn(userId, latitude, longitude);
    res.json({ success: true, message: 'Clocked in successfully', ...result });
  } catch (error) {
    if (error.message === 'Unauthorized location' || error.message === 'Already clocked in today') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const clockOut = async (req, res, next) => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await attendanceService.clockOut(userId, latitude, longitude);
    res.json({ success: true, message: 'Clocked out successfully', ...result });
  } catch (error) {
    if (error.message === 'Unauthorized location' ||
        error.message === 'No clock-in record found for today or already clocked out') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const reports = await attendanceService.getAttendanceReports();
    res.json({ success: true, reports });
  } catch (error) {
    next(error);
  }
};

const requestCorrection = async (req, res, next) => {
  try {
    const { userId, attendanceId, requestReason } = req.body;

    if (!userId || !attendanceId || !requestReason) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await attendanceService.requestCorrection(userId, attendanceId, requestReason);
    res.json({ success: true, message: 'Correction request submitted successfully' });
  } catch (error) {
    next(error);
  }
};

const respondToCorrection = async (req, res, next) => {
  try {
    const { requestId, status, managerResponse } = req.body;

    if (!requestId || !status) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await attendanceService.respondToCorrection(requestId, status, managerResponse);
    res.json({ success: true, message: `Correction request ${status}` });
  } catch (error) {
    if (error.message === 'Invalid status') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getCorrectionRequests = async (req, res, next) => {
  try {
    const requests = await attendanceService.getPendingCorrectionRequests();
    res.json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  clockIn,
  clockOut,
  getReports,
  requestCorrection,
  respondToCorrection,
  getCorrectionRequests,
};
