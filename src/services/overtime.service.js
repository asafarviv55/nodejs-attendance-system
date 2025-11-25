const moment = require('moment-timezone');
const { pool } = require('../config/database');
const config = require('../config/env');

// Standard work hours per day
const STANDARD_HOURS = 8;
const OVERTIME_MULTIPLIER = 1.5;
const DOUBLE_TIME_MULTIPLIER = 2.0;

const calculateOvertimeHours = (totalHours) => {
  if (totalHours <= STANDARD_HOURS) {
    return { regular: totalHours, overtime: 0, doubleTime: 0 };
  }

  const regular = STANDARD_HOURS;
  const overtimeHours = totalHours - STANDARD_HOURS;

  // First 2 hours after standard = overtime (1.5x)
  // Beyond that = double time (2x)
  const overtime = Math.min(overtimeHours, 2);
  const doubleTime = Math.max(overtimeHours - 2, 0);

  return { regular, overtime, doubleTime };
};

const logOvertimeRequest = async (userId, date, hours, reason) => {
  const requestDate = moment().tz(config.timezone).format();

  await pool.query(
    `INSERT INTO overtime_requests
     (user_id, work_date, requested_hours, reason, request_date, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [userId, date, hours, reason, requestDate]
  );

  return { message: 'Overtime request submitted' };
};

const getOvertimeRequests = async (status = null, departmentId = null) => {
  let query = `
    SELECT otr.*, u.name as employee_name, u.email, d.name as department_name
    FROM overtime_requests otr
    JOIN users u ON otr.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND otr.status = ?';
    params.push(status);
  }

  if (departmentId) {
    query += ' AND u.department_id = ?';
    params.push(departmentId);
  }

  query += ' ORDER BY otr.request_date DESC';

  const [rows] = await pool.query(query, params);
  return rows;
};

const approveOvertimeRequest = async (requestId, managerId, approved, response) => {
  const responseDate = moment().tz(config.timezone).format();
  const status = approved ? 'approved' : 'denied';

  await pool.query(
    `UPDATE overtime_requests
     SET status = ?, approved_by = ?, manager_response = ?, response_date = ?
     WHERE id = ?`,
    [status, managerId, response, responseDate, requestId]
  );

  return { message: `Overtime request ${status}` };
};

const getOvertimeSummary = async (userId, month, year) => {
  const startDate = moment().year(year).month(month - 1).startOf('month').format('YYYY-MM-DD');
  const endDate = moment().year(year).month(month - 1).endOf('month').format('YYYY-MM-DD');

  const [rows] = await pool.query(
    `SELECT
       SUM(CASE WHEN total_hours > ? THEN total_hours - ? ELSE 0 END) as total_overtime,
       COUNT(CASE WHEN total_hours > ? THEN 1 END) as overtime_days,
       SUM(total_hours) as total_hours_worked
     FROM attendance
     WHERE user_id = ? AND DATE(clock_in) BETWEEN ? AND ?`,
    [STANDARD_HOURS, STANDARD_HOURS, STANDARD_HOURS, userId, startDate, endDate]
  );

  return {
    month,
    year,
    totalOvertimeHours: rows[0].total_overtime || 0,
    overtimeDays: rows[0].overtime_days || 0,
    totalHoursWorked: rows[0].total_hours_worked || 0,
    regularHoursExpected: 22 * STANDARD_HOURS, // Approximate working days
  };
};

const calculateOvertimePay = async (userId, month, year, hourlyRate) => {
  const summary = await getOvertimeSummary(userId, month, year);

  const regularPay = Math.min(summary.totalHoursWorked, 22 * STANDARD_HOURS) * hourlyRate;
  const overtimePay = summary.totalOvertimeHours * hourlyRate * OVERTIME_MULTIPLIER;

  return {
    ...summary,
    hourlyRate,
    regularPay,
    overtimePay,
    totalPay: regularPay + overtimePay,
  };
};

module.exports = {
  calculateOvertimeHours,
  logOvertimeRequest,
  getOvertimeRequests,
  approveOvertimeRequest,
  getOvertimeSummary,
  calculateOvertimePay,
  STANDARD_HOURS,
  OVERTIME_MULTIPLIER,
};
