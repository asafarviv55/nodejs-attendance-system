const moment = require('moment-timezone');
const { pool } = require('../config/database');
const config = require('../config/env');

// Request work from home
const requestWFH = async (userId, date, reason) => {
  const requestDate = moment().tz(config.timezone).format();

  // Check if already has WFH for this date
  const [existing] = await pool.query(
    `SELECT id FROM wfh_requests WHERE user_id = ? AND work_date = ?`,
    [userId, date]
  );

  if (existing.length > 0) {
    throw new Error('WFH request already exists for this date');
  }

  const [result] = await pool.query(
    `INSERT INTO wfh_requests (user_id, work_date, reason, request_date, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [userId, date, reason, requestDate]
  );

  return { id: result.insertId, message: 'WFH request submitted' };
};

// Get WFH requests
const getWFHRequests = async (filters = {}) => {
  let query = `
    SELECT wfh.*, u.name as employee_name, u.email, d.name as department_name
    FROM wfh_requests wfh
    JOIN users u ON wfh.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.userId) {
    query += ' AND wfh.user_id = ?';
    params.push(filters.userId);
  }

  if (filters.status) {
    query += ' AND wfh.status = ?';
    params.push(filters.status);
  }

  if (filters.departmentId) {
    query += ' AND u.department_id = ?';
    params.push(filters.departmentId);
  }

  if (filters.fromDate) {
    query += ' AND wfh.work_date >= ?';
    params.push(filters.fromDate);
  }

  if (filters.toDate) {
    query += ' AND wfh.work_date <= ?';
    params.push(filters.toDate);
  }

  query += ' ORDER BY wfh.work_date DESC';

  const [rows] = await pool.query(query, params);
  return rows;
};

// Approve/Deny WFH request
const respondToWFH = async (requestId, managerId, approved, response = null) => {
  const responseDate = moment().tz(config.timezone).format();
  const status = approved ? 'approved' : 'denied';

  await pool.query(
    `UPDATE wfh_requests
     SET status = ?, approved_by = ?, manager_response = ?, response_date = ?
     WHERE id = ?`,
    [status, managerId, response, responseDate, requestId]
  );

  return { message: `WFH request ${status}` };
};

// Log WFH attendance (clock in from home)
const logWFHAttendance = async (userId, action, notes = null) => {
  const today = moment().tz(config.timezone).format('YYYY-MM-DD');
  const timestamp = moment().tz(config.timezone).format();

  // Check if approved WFH exists for today
  const [wfh] = await pool.query(
    `SELECT id FROM wfh_requests WHERE user_id = ? AND work_date = ? AND status = 'approved'`,
    [userId, today]
  );

  if (wfh.length === 0) {
    throw new Error('No approved WFH for today');
  }

  if (action === 'start') {
    await pool.query(
      `INSERT INTO wfh_logs (user_id, wfh_request_id, start_time, notes)
       VALUES (?, ?, ?, ?)`,
      [userId, wfh[0].id, timestamp, notes]
    );
    return { message: 'WFH day started', startTime: timestamp };
  } else if (action === 'end') {
    const [log] = await pool.query(
      `SELECT id, start_time FROM wfh_logs
       WHERE user_id = ? AND DATE(start_time) = ? AND end_time IS NULL`,
      [userId, today]
    );

    if (log.length === 0) {
      throw new Error('No active WFH session found');
    }

    const totalHours = moment().diff(moment(log[0].start_time), 'hours', true);

    await pool.query(
      `UPDATE wfh_logs SET end_time = ?, total_hours = ?, notes = CONCAT(IFNULL(notes, ''), ' | ', ?)
       WHERE id = ?`,
      [timestamp, totalHours, notes || '', log[0].id]
    );

    return { message: 'WFH day ended', endTime: timestamp, totalHours };
  }
};

// Get WFH summary for an employee
const getWFHSummary = async (userId, month, year) => {
  const startDate = moment().year(year).month(month - 1).startOf('month').format('YYYY-MM-DD');
  const endDate = moment().year(year).month(month - 1).endOf('month').format('YYYY-MM-DD');

  const [stats] = await pool.query(
    `SELECT
       COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
       COUNT(CASE WHEN status = 'denied' THEN 1 END) as denied,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
     FROM wfh_requests
     WHERE user_id = ? AND work_date BETWEEN ? AND ?`,
    [userId, startDate, endDate]
  );

  const [hours] = await pool.query(
    `SELECT SUM(wl.total_hours) as total_wfh_hours
     FROM wfh_logs wl
     JOIN wfh_requests wr ON wl.wfh_request_id = wr.id
     WHERE wr.user_id = ? AND DATE(wl.start_time) BETWEEN ? AND ?`,
    [userId, startDate, endDate]
  );

  return {
    month,
    year,
    ...stats[0],
    totalWFHHours: hours[0].total_wfh_hours || 0,
  };
};

// Cancel WFH request
const cancelWFH = async (requestId, userId) => {
  const [request] = await pool.query(
    `SELECT * FROM wfh_requests WHERE id = ? AND user_id = ?`,
    [requestId, userId]
  );

  if (request.length === 0) {
    throw new Error('WFH request not found');
  }

  if (request[0].status !== 'pending') {
    throw new Error('Can only cancel pending requests');
  }

  await pool.query('DELETE FROM wfh_requests WHERE id = ?', [requestId]);
  return { message: 'WFH request cancelled' };
};

module.exports = {
  requestWFH,
  getWFHRequests,
  respondToWFH,
  logWFHAttendance,
  getWFHSummary,
  cancelWFH,
};
