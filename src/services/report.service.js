const moment = require('moment-timezone');
const { pool } = require('../config/database');
const config = require('../config/env');
const { calculateWorkingDays } = require('./holiday.service');

// Generate monthly attendance report for employee
const generateMonthlyReport = async (userId, month, year) => {
  const startDate = moment().year(year).month(month - 1).startOf('month').format('YYYY-MM-DD');
  const endDate = moment().year(year).month(month - 1).endOf('month').format('YYYY-MM-DD');

  const [attendance] = await pool.query(
    `SELECT
       COUNT(*) as total_days_present,
       SUM(total_hours) as total_hours,
       SUM(CASE WHEN total_hours > 8 THEN total_hours - 8 ELSE 0 END) as overtime_hours,
       AVG(total_hours) as avg_hours_per_day,
       MIN(TIME(clock_in)) as earliest_arrival,
       MAX(TIME(clock_out)) as latest_departure
     FROM attendance
     WHERE user_id = ? AND DATE(clock_in) BETWEEN ? AND ?`,
    [userId, startDate, endDate]
  );

  const [leaves] = await pool.query(
    `SELECT
       COUNT(*) as total_leaves,
       SUM(DATEDIFF(end_date, start_date) + 1) as leave_days
     FROM leave_requests
     WHERE user_id = ? AND status = 'approved'
       AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))`,
    [userId, startDate, endDate, startDate, endDate]
  );

  const [lateArrivals] = await pool.query(
    `SELECT COUNT(*) as late_count
     FROM late_arrivals
     WHERE user_id = ? AND DATE(arrival_time) BETWEEN ? AND ?`,
    [userId, startDate, endDate]
  );

  const workingDays = await calculateWorkingDays(startDate, endDate);

  return {
    userId,
    month,
    year,
    workingDaysInMonth: workingDays,
    daysPresent: attendance[0].total_days_present || 0,
    daysAbsent: workingDays - (attendance[0].total_days_present || 0) - (leaves[0].leave_days || 0),
    leaveDays: leaves[0].leave_days || 0,
    totalHoursWorked: parseFloat(attendance[0].total_hours || 0).toFixed(2),
    overtimeHours: parseFloat(attendance[0].overtime_hours || 0).toFixed(2),
    averageHoursPerDay: parseFloat(attendance[0].avg_hours_per_day || 0).toFixed(2),
    lateArrivals: lateArrivals[0].late_count || 0,
    earliestArrival: attendance[0].earliest_arrival,
    latestDeparture: attendance[0].latest_departure,
    generatedAt: moment().format(),
  };
};

// Generate department report
const generateDepartmentReport = async (departmentId, month, year) => {
  const startDate = moment().year(year).month(month - 1).startOf('month').format('YYYY-MM-DD');
  const endDate = moment().year(year).month(month - 1).endOf('month').format('YYYY-MM-DD');

  const [summary] = await pool.query(
    `SELECT
       COUNT(DISTINCT a.user_id) as employees_tracked,
       COUNT(*) as total_attendance_records,
       SUM(a.total_hours) as total_hours,
       AVG(a.total_hours) as avg_hours_per_record
     FROM attendance a
     JOIN users u ON a.user_id = u.id
     WHERE u.department_id = ? AND DATE(a.clock_in) BETWEEN ? AND ?`,
    [departmentId, startDate, endDate]
  );

  const [employees] = await pool.query(
    `SELECT u.id, u.name, u.email,
       COUNT(a.id) as days_present,
       SUM(a.total_hours) as total_hours
     FROM users u
     LEFT JOIN attendance a ON u.id = a.user_id AND DATE(a.clock_in) BETWEEN ? AND ?
     WHERE u.department_id = ?
     GROUP BY u.id
     ORDER BY total_hours DESC`,
    [startDate, endDate, departmentId]
  );

  const [department] = await pool.query('SELECT name FROM departments WHERE id = ?', [departmentId]);

  return {
    departmentId,
    departmentName: department[0]?.name,
    month,
    year,
    summary: {
      employeesTracked: summary[0].employees_tracked || 0,
      totalRecords: summary[0].total_attendance_records || 0,
      totalHours: parseFloat(summary[0].total_hours || 0).toFixed(2),
      avgHoursPerRecord: parseFloat(summary[0].avg_hours_per_record || 0).toFixed(2),
    },
    employeeBreakdown: employees,
    generatedAt: moment().format(),
  };
};

// Export report to CSV format
const exportReportToCSV = async (reportData, reportType) => {
  let csv = '';

  if (reportType === 'monthly') {
    csv = 'Metric,Value\n';
    csv += `Month,${reportData.month}/${reportData.year}\n`;
    csv += `Working Days,${reportData.workingDaysInMonth}\n`;
    csv += `Days Present,${reportData.daysPresent}\n`;
    csv += `Days Absent,${reportData.daysAbsent}\n`;
    csv += `Leave Days,${reportData.leaveDays}\n`;
    csv += `Total Hours,${reportData.totalHoursWorked}\n`;
    csv += `Overtime Hours,${reportData.overtimeHours}\n`;
    csv += `Late Arrivals,${reportData.lateArrivals}\n`;
  } else if (reportType === 'department') {
    csv = 'Employee ID,Name,Days Present,Total Hours\n';
    reportData.employeeBreakdown.forEach((emp) => {
      csv += `${emp.id},"${emp.name}",${emp.days_present || 0},${parseFloat(emp.total_hours || 0).toFixed(2)}\n`;
    });
  }

  return csv;
};

// Get attendance trends
const getAttendanceTrends = async (userId, months = 6) => {
  const trends = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = moment().subtract(i, 'months');
    const report = await generateMonthlyReport(userId, date.month() + 1, date.year());
    trends.push({
      month: date.format('MMM YYYY'),
      daysPresent: report.daysPresent,
      totalHours: report.totalHoursWorked,
      lateArrivals: report.lateArrivals,
    });
  }

  return trends;
};

// Get company-wide summary
const getCompanySummary = async (date = null) => {
  const checkDate = date || moment().tz(config.timezone).format('YYYY-MM-DD');

  const [present] = await pool.query(
    `SELECT COUNT(DISTINCT user_id) as count FROM attendance WHERE DATE(clock_in) = ?`,
    [checkDate]
  );

  const [onLeave] = await pool.query(
    `SELECT COUNT(DISTINCT user_id) as count
     FROM leave_requests
     WHERE status = 'approved' AND ? BETWEEN start_date AND end_date`,
    [checkDate]
  );

  const [wfh] = await pool.query(
    `SELECT COUNT(DISTINCT user_id) as count
     FROM wfh_requests
     WHERE status = 'approved' AND work_date = ?`,
    [checkDate]
  );

  const [total] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');

  return {
    date: checkDate,
    totalEmployees: total[0].count,
    presentInOffice: present[0].count,
    onLeave: onLeave[0].count,
    workingFromHome: wfh[0].count,
    absent: total[0].count - present[0].count - onLeave[0].count - wfh[0].count,
  };
};

module.exports = {
  generateMonthlyReport,
  generateDepartmentReport,
  exportReportToCSV,
  getAttendanceTrends,
  getCompanySummary,
};
