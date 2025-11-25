const moment = require('moment-timezone');
const { pool } = require('../config/database');
const config = require('../config/env');

// Default leave types and annual allowances
const LEAVE_TYPES = {
  annual: { name: 'Annual Leave', defaultDays: 20 },
  sick: { name: 'Sick Leave', defaultDays: 10 },
  personal: { name: 'Personal Leave', defaultDays: 3 },
  maternity: { name: 'Maternity Leave', defaultDays: 90 },
  paternity: { name: 'Paternity Leave', defaultDays: 10 },
  unpaid: { name: 'Unpaid Leave', defaultDays: -1 }, // Unlimited
};

// Initialize leave balance for new employee
const initializeLeaveBalance = async (userId, hireDate) => {
  const year = moment().year();

  for (const [type, config] of Object.entries(LEAVE_TYPES)) {
    if (config.defaultDays < 0) continue; // Skip unlimited types

    // Pro-rate for mid-year hires
    const monthsRemaining = 12 - moment(hireDate).month();
    const proratedDays = Math.round((config.defaultDays * monthsRemaining) / 12);

    await pool.query(
      `INSERT INTO leave_balances (user_id, leave_type, year, total_days, used_days, remaining_days)
       VALUES (?, ?, ?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE total_days = ?, remaining_days = ?`,
      [userId, type, year, proratedDays, proratedDays, proratedDays, proratedDays]
    );
  }

  return { message: 'Leave balance initialized' };
};

// Get user's leave balance
const getLeaveBalance = async (userId, year = null) => {
  const targetYear = year || moment().year();

  const [balances] = await pool.query(
    `SELECT * FROM leave_balances WHERE user_id = ? AND year = ?`,
    [userId, targetYear]
  );

  // Get pending leave requests
  const [pending] = await pool.query(
    `SELECT leave_type, SUM(DATEDIFF(end_date, start_date) + 1) as pending_days
     FROM leave_requests
     WHERE user_id = ? AND status = 'pending' AND YEAR(start_date) = ?
     GROUP BY leave_type`,
    [userId, targetYear]
  );

  const pendingByType = pending.reduce((acc, p) => {
    acc[p.leave_type] = p.pending_days;
    return acc;
  }, {});

  return balances.map((b) => ({
    ...b,
    leaveTypeName: LEAVE_TYPES[b.leave_type]?.name || b.leave_type,
    pendingDays: pendingByType[b.leave_type] || 0,
    availableDays: b.remaining_days - (pendingByType[b.leave_type] || 0),
  }));
};

// Check if leave can be taken
const checkLeaveAvailability = async (userId, leaveType, startDate, endDate) => {
  const year = moment(startDate).year();
  const requestedDays = moment(endDate).diff(moment(startDate), 'days') + 1;

  // Check if it's an unlimited leave type
  if (LEAVE_TYPES[leaveType]?.defaultDays < 0) {
    return { canTake: true, requestedDays };
  }

  const [balance] = await pool.query(
    `SELECT * FROM leave_balances WHERE user_id = ? AND leave_type = ? AND year = ?`,
    [userId, leaveType, year]
  );

  if (balance.length === 0) {
    return { canTake: false, reason: 'Leave balance not found' };
  }

  // Get pending requests
  const [pending] = await pool.query(
    `SELECT SUM(DATEDIFF(end_date, start_date) + 1) as pending_days
     FROM leave_requests
     WHERE user_id = ? AND leave_type = ? AND status = 'pending' AND YEAR(start_date) = ?`,
    [userId, leaveType, year]
  );

  const pendingDays = pending[0].pending_days || 0;
  const availableDays = balance[0].remaining_days - pendingDays;

  if (requestedDays > availableDays) {
    return {
      canTake: false,
      reason: `Insufficient leave balance. Available: ${availableDays}, Requested: ${requestedDays}`,
      availableDays,
      requestedDays,
    };
  }

  return { canTake: true, availableDays, requestedDays };
};

// Deduct leave balance when approved
const deductLeaveBalance = async (userId, leaveType, days, year = null) => {
  const targetYear = year || moment().year();

  await pool.query(
    `UPDATE leave_balances
     SET used_days = used_days + ?, remaining_days = remaining_days - ?
     WHERE user_id = ? AND leave_type = ? AND year = ?`,
    [days, days, userId, leaveType, targetYear]
  );

  return { message: 'Leave balance deducted' };
};

// Restore leave balance when cancelled
const restoreLeaveBalance = async (userId, leaveType, days, year = null) => {
  const targetYear = year || moment().year();

  await pool.query(
    `UPDATE leave_balances
     SET used_days = used_days - ?, remaining_days = remaining_days + ?
     WHERE user_id = ? AND leave_type = ? AND year = ?`,
    [days, days, userId, leaveType, targetYear]
  );

  return { message: 'Leave balance restored' };
};

// Carry forward unused leaves to next year
const carryForwardLeaves = async (userId, maxCarryForward = 5) => {
  const currentYear = moment().year();
  const nextYear = currentYear + 1;

  const [balances] = await pool.query(
    `SELECT * FROM leave_balances WHERE user_id = ? AND year = ? AND leave_type = 'annual'`,
    [userId, currentYear]
  );

  if (balances.length === 0) return { message: 'No balance to carry forward' };

  const carryForwardDays = Math.min(balances[0].remaining_days, maxCarryForward);

  // Initialize next year's balance with carry forward
  const defaultDays = LEAVE_TYPES.annual.defaultDays;

  await pool.query(
    `INSERT INTO leave_balances (user_id, leave_type, year, total_days, used_days, remaining_days, carried_forward)
     VALUES (?, 'annual', ?, ?, 0, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_days = total_days + VALUES(carried_forward),
       remaining_days = remaining_days + VALUES(carried_forward),
       carried_forward = VALUES(carried_forward)`,
    [userId, nextYear, defaultDays + carryForwardDays, defaultDays + carryForwardDays, carryForwardDays]
  );

  return { message: `Carried forward ${carryForwardDays} days to ${nextYear}` };
};

// Get leave history
const getLeaveHistory = async (userId, year = null) => {
  const targetYear = year || moment().year();

  const [history] = await pool.query(
    `SELECT lr.*, lb.leave_type
     FROM leave_requests lr
     LEFT JOIN leave_balances lb ON lr.user_id = lb.user_id
     WHERE lr.user_id = ? AND YEAR(lr.start_date) = ?
     ORDER BY lr.start_date DESC`,
    [userId, targetYear]
  );

  return history;
};

// Reset annual leave balances (yearly job)
const resetAnnualBalances = async () => {
  const newYear = moment().year();

  const [users] = await pool.query('SELECT id, hire_date FROM users WHERE is_active = true');

  for (const user of users) {
    await initializeLeaveBalance(user.id, user.hire_date);
  }

  return { message: `Reset balances for ${users.length} users for year ${newYear}` };
};

module.exports = {
  LEAVE_TYPES,
  initializeLeaveBalance,
  getLeaveBalance,
  checkLeaveAvailability,
  deductLeaveBalance,
  restoreLeaveBalance,
  carryForwardLeaves,
  getLeaveHistory,
  resetAnnualBalances,
};
