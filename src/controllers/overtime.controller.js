const overtimeService = require('../services/overtime.service');

const requestOvertime = async (req, res, next) => {
  try {
    const { date, hours, reason } = req.body;
    const result = await overtimeService.logOvertimeRequest(req.user.id, date, hours, reason);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getOvertimeRequests = async (req, res, next) => {
  try {
    const { status, departmentId } = req.query;
    const requests = await overtimeService.getOvertimeRequests(status, departmentId);
    res.json(requests);
  } catch (error) {
    next(error);
  }
};

const approveOvertime = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved, response } = req.body;
    const result = await overtimeService.approveOvertimeRequest(id, req.user.id, approved, response);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getOvertimeSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const summary = await overtimeService.getOvertimeSummary(
      req.user.id,
      parseInt(month) || new Date().getMonth() + 1,
      parseInt(year) || new Date().getFullYear()
    );
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

const calculatePay = async (req, res, next) => {
  try {
    const { month, year, hourlyRate } = req.query;
    const calculation = await overtimeService.calculateOvertimePay(
      req.user.id,
      parseInt(month),
      parseInt(year),
      parseFloat(hourlyRate)
    );
    res.json(calculation);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestOvertime,
  getOvertimeRequests,
  approveOvertime,
  getOvertimeSummary,
  calculatePay,
};
