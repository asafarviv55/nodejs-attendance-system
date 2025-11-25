const moment = require('moment-timezone');
const { pool } = require('../config/database');
const config = require('../config/env');
const { isAuthorizedLocation } = require('../utils/location');

const clockIn = async (userId, latitude, longitude) => {
  if (!isAuthorizedLocation(latitude, longitude)) {
    throw new Error('Unauthorized location');
  }

  const currentDate = moment().tz(config.timezone).format('YYYY-MM-DD');
  const timestamp = moment().tz(config.timezone).format();

  // Check if already clocked in today
  const [existing] = await pool.query(
    'SELECT id FROM attendance WHERE user_id = ? AND DATE(clock_in) = ?',
    [userId, currentDate]
  );

  if (existing.length > 0) {
    throw new Error('Already clocked in today');
  }

  await pool.query(
    'INSERT INTO attendance (user_id, clock_in, latitude, longitude) VALUES (?, ?, ?, ?)',
    [userId, timestamp, latitude, longitude]
  );

  return { clockInTime: timestamp };
};

const clockOut = async (userId, latitude, longitude) => {
  if (!isAuthorizedLocation(latitude, longitude)) {
    throw new Error('Unauthorized location');
  }

  const currentDate = moment().tz(config.timezone).format('YYYY-MM-DD');
  const timestamp = new Date();

  // Find today's clock-in record without clock-out
  const [rows] = await pool.query(
    'SELECT * FROM attendance WHERE user_id = ? AND DATE(clock_in) = ? AND clock_out IS NULL',
    [userId, currentDate]
  );

  if (rows.length === 0) {
    throw new Error('No clock-in record found for today or already clocked out');
  }

  const clockInTime = new Date(rows[0].clock_in);
  const totalHours = (timestamp - clockInTime) / (1000 * 60 * 60);

  await pool.query(
    'UPDATE attendance SET clock_out = ?, total_hours = ?, latitude = ?, longitude = ? WHERE id = ?',
    [timestamp, totalHours, latitude, longitude, rows[0].id]
  );

  return { clockOutTime: timestamp, totalHours };
};

const getAttendanceReports = async () => {
  const [rows] = await pool.query('SELECT * FROM attendance ORDER BY clock_in DESC');
  return rows;
};

const requestCorrection = async (userId, attendanceId, requestReason) => {
  const requestDate = moment().tz(config.timezone).format();
  await pool.query(
    'INSERT INTO attendance_correction_requests (user_id, attendance_id, request_reason, request_date) VALUES (?, ?, ?, ?)',
    [userId, attendanceId, requestReason, requestDate]
  );
};

const respondToCorrection = async (requestId, status, managerResponse) => {
  if (!['approved', 'denied'].includes(status)) {
    throw new Error('Invalid status');
  }

  const responseDate = moment().tz(config.timezone).format();
  await pool.query(
    'UPDATE attendance_correction_requests SET status = ?, manager_response = ?, response_date = ? WHERE id = ?',
    [status, managerResponse, responseDate, requestId]
  );
};

const getPendingCorrectionRequests = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM attendance_correction_requests WHERE status = "pending"'
  );
  return rows;
};

module.exports = {
  clockIn,
  clockOut,
  getAttendanceReports,
  requestCorrection,
  respondToCorrection,
  getPendingCorrectionRequests,
};
