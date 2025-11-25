const reportService = require('../services/report.service');

const getMonthlyReport = async (req, res, next) => {
  try {
    const { userId, month, year } = req.query;
    const targetUserId = userId || req.user.id;
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const report = await reportService.generateMonthlyReport(targetUserId, targetMonth, targetYear);
    res.json(report);
  } catch (error) {
    next(error);
  }
};

const getDepartmentReport = async (req, res, next) => {
  try {
    const { departmentId, month, year } = req.query;
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const report = await reportService.generateDepartmentReport(departmentId, targetMonth, targetYear);
    res.json(report);
  } catch (error) {
    next(error);
  }
};

const exportReport = async (req, res, next) => {
  try {
    const { type, userId, departmentId, month, year } = req.query;
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;
    const targetYear = parseInt(year) || new Date().getFullYear();

    let reportData;
    if (type === 'department') {
      reportData = await reportService.generateDepartmentReport(departmentId, targetMonth, targetYear);
    } else {
      reportData = await reportService.generateMonthlyReport(userId || req.user.id, targetMonth, targetYear);
    }

    const csv = await reportService.exportReportToCSV(reportData, type || 'monthly');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report-${targetMonth}-${targetYear}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

const getAttendanceTrends = async (req, res, next) => {
  try {
    const { months } = req.query;
    const trends = await reportService.getAttendanceTrends(req.user.id, parseInt(months) || 6);
    res.json(trends);
  } catch (error) {
    next(error);
  }
};

const getCompanySummary = async (req, res, next) => {
  try {
    const { date } = req.query;
    const summary = await reportService.getCompanySummary(date);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMonthlyReport,
  getDepartmentReport,
  exportReport,
  getAttendanceTrends,
  getCompanySummary,
};
