const moment = require('moment-timezone');
const { pool } = require('../config/database');
const config = require('../config/env');

// Create weekly timesheet
const createTimesheet = async (userId, weekStartDate) => {
  const weekEnd = moment(weekStartDate).add(6, 'days').format('YYYY-MM-DD');

  // Check if timesheet already exists
  const [existing] = await pool.query(
    `SELECT id FROM timesheets WHERE user_id = ? AND week_start_date = ?`,
    [userId, weekStartDate]
  );

  if (existing.length > 0) {
    throw new Error('Timesheet already exists for this week');
  }

  // Get attendance records for the week
  const [attendance] = await pool.query(
    `SELECT DATE(clock_in) as date, total_hours
     FROM attendance
     WHERE user_id = ? AND DATE(clock_in) BETWEEN ? AND ?
     ORDER BY clock_in`,
    [userId, weekStartDate, weekEnd]
  );

  const totalHours = attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);

  const [result] = await pool.query(
    `INSERT INTO timesheets (user_id, week_start_date, week_end_date, total_hours, status)
     VALUES (?, ?, ?, ?, 'draft')`,
    [userId, weekStartDate, weekEnd, totalHours]
  );

  return {
    id: result.insertId,
    weekStartDate,
    weekEndDate: weekEnd,
    totalHours,
    dailyBreakdown: attendance,
  };
};

// Get user's timesheets
const getUserTimesheets = async (userId, status = null) => {
  let query = `
    SELECT t.*, u.name as employee_name
    FROM timesheets t
    JOIN users u ON t.user_id = u.id
    WHERE t.user_id = ?
  `;
  const params = [userId];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  query += ' ORDER BY t.week_start_date DESC';

  const [rows] = await pool.query(query, params);
  return rows;
};

// Submit timesheet for approval
const submitTimesheet = async (timesheetId, userId) => {
  const [timesheet] = await pool.query(
    `SELECT * FROM timesheets WHERE id = ? AND user_id = ?`,
    [timesheetId, userId]
  );

  if (timesheet.length === 0) {
    throw new Error('Timesheet not found');
  }

  if (timesheet[0].status !== 'draft') {
    throw new Error('Timesheet already submitted');
  }

  await pool.query(
    `UPDATE timesheets SET status = 'pending', submitted_at = NOW() WHERE id = ?`,
    [timesheetId]
  );

  return { message: 'Timesheet submitted for approval' };
};

// Get pending timesheets for manager
const getPendingTimesheets = async (managerId = null, departmentId = null) => {
  let query = `
    SELECT t.*, u.name as employee_name, u.email, d.name as department_name
    FROM timesheets t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE t.status = 'pending'
  `;
  const params = [];

  if (departmentId) {
    query += ' AND u.department_id = ?';
    params.push(departmentId);
  }

  query += ' ORDER BY t.submitted_at ASC';

  const [rows] = await pool.query(query, params);
  return rows;
};

// Approve/Reject timesheet
const reviewTimesheet = async (timesheetId, managerId, approved, notes = null) => {
  const status = approved ? 'approved' : 'rejected';
  const reviewedAt = moment().tz(config.timezone).format();

  await pool.query(
    `UPDATE timesheets
     SET status = ?, approved_by = ?, approved_at = ?, manager_notes = ?
     WHERE id = ?`,
    [status, managerId, reviewedAt, notes, timesheetId]
  );

  return { message: `Timesheet ${status}` };
};

// Recall submitted timesheet
const recallTimesheet = async (timesheetId, userId) => {
  const [timesheet] = await pool.query(
    `SELECT * FROM timesheets WHERE id = ? AND user_id = ?`,
    [timesheetId, userId]
  );

  if (timesheet.length === 0) {
    throw new Error('Timesheet not found');
  }

  if (timesheet[0].status !== 'pending') {
    throw new Error('Can only recall pending timesheets');
  }

  await pool.query(
    `UPDATE timesheets SET status = 'draft', submitted_at = NULL WHERE id = ?`,
    [timesheetId]
  );

  return { message: 'Timesheet recalled' };
};

// Get timesheet details with daily breakdown
const getTimesheetDetails = async (timesheetId) => {
  const [timesheet] = await pool.query(
    `SELECT t.*, u.name as employee_name
     FROM timesheets t
     JOIN users u ON t.user_id = u.id
     WHERE t.id = ?`,
    [timesheetId]
  );

  if (timesheet.length === 0) {
    throw new Error('Timesheet not found');
  }

  const [dailyRecords] = await pool.query(
    `SELECT DATE(clock_in) as date, clock_in, clock_out, total_hours
     FROM attendance
     WHERE user_id = ? AND DATE(clock_in) BETWEEN ? AND ?
     ORDER BY clock_in`,
    [timesheet[0].user_id, timesheet[0].week_start_date, timesheet[0].week_end_date]
  );

  return {
    ...timesheet[0],
    dailyRecords,
  };
};

// Auto-create timesheets for all employees (weekly job)
const autoCreateWeeklyTimesheets = async () => {
  const weekStart = moment().startOf('week').format('YYYY-MM-DD');

  const [users] = await pool.query('SELECT id FROM users WHERE is_active = true');

  let created = 0;
  for (const user of users) {
    try {
      await createTimesheet(user.id, weekStart);
      created++;
    } catch (e) {
      // Timesheet already exists, skip
    }
  }

  return { message: `Created ${created} timesheets`, weekStart };
};

module.exports = {
  createTimesheet,
  getUserTimesheets,
  submitTimesheet,
  getPendingTimesheets,
  reviewTimesheet,
  recallTimesheet,
  getTimesheetDetails,
  autoCreateWeeklyTimesheets,
};
