const shiftService = require('../services/shift.service');

const createShift = async (req, res, next) => {
  try {
    const { name, startTime, endTime, breakMinutes } = req.body;
    const shift = await shiftService.createShift(name, startTime, endTime, breakMinutes);
    res.status(201).json(shift);
  } catch (error) {
    next(error);
  }
};

const getAllShifts = async (req, res, next) => {
  try {
    const shifts = await shiftService.getAllShifts();
    res.json(shifts);
  } catch (error) {
    next(error);
  }
};

const assignShift = async (req, res, next) => {
  try {
    const { userId, shiftId, effectiveDate, endDate } = req.body;
    const result = await shiftService.assignShift(userId, shiftId, effectiveDate, endDate);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getCurrentShift = async (req, res, next) => {
  try {
    const shift = await shiftService.getUserCurrentShift(req.user.id);
    res.json(shift || { message: 'No shift assigned' });
  } catch (error) {
    next(error);
  }
};

const getDepartmentSchedule = async (req, res, next) => {
  try {
    const { departmentId, weekStartDate } = req.query;
    const schedule = await shiftService.getDepartmentSchedule(departmentId, weekStartDate);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
};

const requestShiftSwap = async (req, res, next) => {
  try {
    const { targetUserId, swapDate, reason } = req.body;
    const result = await shiftService.requestShiftSwap(req.user.id, targetUserId, swapDate, reason);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const respondToSwap = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetAccepted, managerApproved } = req.body;
    const result = await shiftService.respondToShiftSwap(
      id,
      targetAccepted,
      req.user.id,
      managerApproved
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createShift,
  getAllShifts,
  assignShift,
  getCurrentShift,
  getDepartmentSchedule,
  requestShiftSwap,
  respondToSwap,
};
