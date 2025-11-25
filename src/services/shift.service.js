const moment = require('moment-timezone');
const { pool } = require('../config/database');
const config = require('../config/env');

// Create a new shift type
const createShift = async (name, startTime, endTime, breakMinutes = 60) => {
  const [result] = await pool.query(
    `INSERT INTO shifts (name, start_time, end_time, break_minutes, is_active)
     VALUES (?, ?, ?, ?, true)`,
    [name, startTime, endTime, breakMinutes]
  );

  return { id: result.insertId, name, startTime, endTime, breakMinutes };
};

// Get all shifts
const getAllShifts = async () => {
  const [rows] = await pool.query('SELECT * FROM shifts WHERE is_active = true ORDER BY start_time');
  return rows;
};

// Assign shift to employee
const assignShift = async (userId, shiftId, effectiveDate, endDate = null) => {
  // Check for overlapping assignments
  const [existing] = await pool.query(
    `SELECT id FROM user_shifts
     WHERE user_id = ? AND shift_id = ? AND
           ((end_date IS NULL AND effective_date <= ?) OR
            (end_date >= ? AND effective_date <= ?))`,
    [userId, shiftId, effectiveDate, effectiveDate, endDate || '9999-12-31']
  );

  if (existing.length > 0) {
    throw new Error('Overlapping shift assignment exists');
  }

  await pool.query(
    `INSERT INTO user_shifts (user_id, shift_id, effective_date, end_date)
     VALUES (?, ?, ?, ?)`,
    [userId, shiftId, effectiveDate, endDate]
  );

  return { message: 'Shift assigned successfully' };
};

// Get employee's current shift
const getUserCurrentShift = async (userId) => {
  const today = moment().tz(config.timezone).format('YYYY-MM-DD');

  const [rows] = await pool.query(
    `SELECT s.*, us.effective_date, us.end_date
     FROM user_shifts us
     JOIN shifts s ON us.shift_id = s.id
     WHERE us.user_id = ? AND us.effective_date <= ? AND (us.end_date IS NULL OR us.end_date >= ?)
     ORDER BY us.effective_date DESC
     LIMIT 1`,
    [userId, today, today]
  );

  return rows[0] || null;
};

// Get shift schedule for a department
const getDepartmentSchedule = async (departmentId, weekStartDate) => {
  const weekEnd = moment(weekStartDate).add(6, 'days').format('YYYY-MM-DD');

  const [rows] = await pool.query(
    `SELECT u.id as user_id, u.name as employee_name, s.name as shift_name,
            s.start_time, s.end_time, us.effective_date
     FROM users u
     JOIN user_shifts us ON u.id = us.user_id
     JOIN shifts s ON us.shift_id = s.id
     WHERE u.department_id = ?
       AND us.effective_date <= ?
       AND (us.end_date IS NULL OR us.end_date >= ?)
     ORDER BY u.name, s.start_time`,
    [departmentId, weekEnd, weekStartDate]
  );

  return rows;
};

// Request shift swap
const requestShiftSwap = async (requesterId, targetUserId, swapDate, reason) => {
  const requestDate = moment().tz(config.timezone).format();

  await pool.query(
    `INSERT INTO shift_swap_requests
     (requester_id, target_user_id, swap_date, reason, request_date, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [requesterId, targetUserId, swapDate, reason, requestDate]
  );

  return { message: 'Shift swap request submitted' };
};

// Respond to shift swap
const respondToShiftSwap = async (requestId, targetAccepted, managerId = null, managerApproved = null) => {
  if (targetAccepted === false) {
    await pool.query(
      `UPDATE shift_swap_requests SET status = 'rejected_by_employee' WHERE id = ?`,
      [requestId]
    );
    return { message: 'Shift swap rejected by employee' };
  }

  if (targetAccepted && managerApproved === null) {
    await pool.query(
      `UPDATE shift_swap_requests SET status = 'pending_manager_approval' WHERE id = ?`,
      [requestId]
    );
    return { message: 'Awaiting manager approval' };
  }

  const status = managerApproved ? 'approved' : 'rejected_by_manager';
  await pool.query(
    `UPDATE shift_swap_requests
     SET status = ?, approved_by = ?, response_date = NOW()
     WHERE id = ?`,
    [status, managerId, requestId]
  );

  return { message: `Shift swap ${status}` };
};

// Check if employee is late based on shift
const checkLateArrival = async (userId, clockInTime) => {
  const shift = await getUserCurrentShift(userId);
  if (!shift) return { isLate: false, message: 'No shift assigned' };

  const shiftStart = moment(clockInTime).format('YYYY-MM-DD') + ' ' + shift.start_time;
  const expectedTime = moment(shiftStart);
  const actualTime = moment(clockInTime);

  const diffMinutes = actualTime.diff(expectedTime, 'minutes');
  const gracePeriod = 5; // 5 minutes grace period

  return {
    isLate: diffMinutes > gracePeriod,
    minutesLate: Math.max(diffMinutes - gracePeriod, 0),
    expectedTime: expectedTime.format(),
    actualTime: actualTime.format(),
  };
};

module.exports = {
  createShift,
  getAllShifts,
  assignShift,
  getUserCurrentShift,
  getDepartmentSchedule,
  requestShiftSwap,
  respondToShiftSwap,
  checkLateArrival,
};
