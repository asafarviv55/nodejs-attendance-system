const moment = require('moment-timezone');
const { pool } = require('../config/database');
const config = require('../config/env');
const { getUserCurrentShift } = require('./shift.service');

const GRACE_PERIOD_MINUTES = 5;
const WARNING_THRESHOLDS = {
  verbal: 3,
  written: 5,
  final: 7,
};

// Record a late arrival
const recordLateArrival = async (userId, arrivalTime, shiftStartTime, minutesLate) => {
  const [result] = await pool.query(
    `INSERT INTO late_arrivals (user_id, arrival_time, expected_time, minutes_late)
     VALUES (?, ?, ?, ?)`,
    [userId, arrivalTime, shiftStartTime, minutesLate]
  );

  // Check if warning should be issued
  await checkAndIssueWarning(userId);

  return { id: result.insertId, minutesLate };
};

// Check late arrival on clock-in
const checkLateOnClockIn = async (userId, clockInTime) => {
  const shift = await getUserCurrentShift(userId);

  if (!shift) {
    return { isLate: false, message: 'No shift assigned' };
  }

  const today = moment(clockInTime).format('YYYY-MM-DD');
  const expectedTime = moment(`${today} ${shift.start_time}`);
  const actualTime = moment(clockInTime);

  const diffMinutes = actualTime.diff(expectedTime, 'minutes');

  if (diffMinutes > GRACE_PERIOD_MINUTES) {
    const minutesLate = diffMinutes - GRACE_PERIOD_MINUTES;
    await recordLateArrival(userId, clockInTime, expectedTime.format(), minutesLate);

    return {
      isLate: true,
      minutesLate,
      expectedTime: expectedTime.format('HH:mm'),
      actualTime: actualTime.format('HH:mm'),
    };
  }

  return { isLate: false };
};

// Check and issue warning if threshold reached
const checkAndIssueWarning = async (userId) => {
  const currentMonth = moment().format('YYYY-MM');

  const [count] = await pool.query(
    `SELECT COUNT(*) as late_count
     FROM late_arrivals
     WHERE user_id = ? AND DATE_FORMAT(arrival_time, '%Y-%m') = ?`,
    [userId, currentMonth]
  );

  const lateCount = count[0].late_count;

  let warningType = null;
  if (lateCount >= WARNING_THRESHOLDS.final) {
    warningType = 'final';
  } else if (lateCount >= WARNING_THRESHOLDS.written) {
    warningType = 'written';
  } else if (lateCount >= WARNING_THRESHOLDS.verbal) {
    warningType = 'verbal';
  }

  if (warningType) {
    // Check if warning already issued this month
    const [existing] = await pool.query(
      `SELECT id FROM late_warnings
       WHERE user_id = ? AND warning_type = ? AND DATE_FORMAT(issued_at, '%Y-%m') = ?`,
      [userId, warningType, currentMonth]
    );

    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO late_warnings (user_id, warning_type, late_count, issued_at)
         VALUES (?, ?, ?, NOW())`,
        [userId, warningType, lateCount]
      );

      return { warningIssued: true, warningType, lateCount };
    }
  }

  return { warningIssued: false };
};

// Get late arrivals for user
const getUserLateArrivals = async (userId, month = null, year = null) => {
  let query = `
    SELECT la.*, DATE(la.arrival_time) as date
    FROM late_arrivals la
    WHERE la.user_id = ?
  `;
  const params = [userId];

  if (month && year) {
    query += ' AND MONTH(la.arrival_time) = ? AND YEAR(la.arrival_time) = ?';
    params.push(month, year);
  }

  query += ' ORDER BY la.arrival_time DESC';

  const [rows] = await pool.query(query, params);
  return rows;
};

// Get late arrival summary
const getLateArrivalSummary = async (userId) => {
  const currentMonth = moment().format('YYYY-MM');
  const currentYear = moment().format('YYYY');

  const [monthlyCount] = await pool.query(
    `SELECT COUNT(*) as count, SUM(minutes_late) as total_minutes
     FROM late_arrivals
     WHERE user_id = ? AND DATE_FORMAT(arrival_time, '%Y-%m') = ?`,
    [userId, currentMonth]
  );

  const [yearlyCount] = await pool.query(
    `SELECT COUNT(*) as count
     FROM late_arrivals
     WHERE user_id = ? AND YEAR(arrival_time) = ?`,
    [userId, currentYear]
  );

  const [warnings] = await pool.query(
    `SELECT warning_type, issued_at
     FROM late_warnings
     WHERE user_id = ?
     ORDER BY issued_at DESC`,
    [userId]
  );

  return {
    thisMonth: {
      count: monthlyCount[0].count || 0,
      totalMinutesLate: monthlyCount[0].total_minutes || 0,
    },
    thisYear: {
      count: yearlyCount[0].count || 0,
    },
    warnings: warnings,
    nextWarningAt: getNextWarningThreshold(monthlyCount[0].count || 0),
  };
};

// Get next warning threshold
const getNextWarningThreshold = (currentCount) => {
  if (currentCount < WARNING_THRESHOLDS.verbal) return WARNING_THRESHOLDS.verbal;
  if (currentCount < WARNING_THRESHOLDS.written) return WARNING_THRESHOLDS.written;
  if (currentCount < WARNING_THRESHOLDS.final) return WARNING_THRESHOLDS.final;
  return null;
};

// Get department late arrival stats
const getDepartmentLateStats = async (departmentId, month, year) => {
  const [stats] = await pool.query(
    `SELECT
       u.id as user_id,
       u.name as employee_name,
       COUNT(la.id) as late_count,
       SUM(la.minutes_late) as total_minutes_late
     FROM users u
     LEFT JOIN late_arrivals la ON u.id = la.user_id
       AND MONTH(la.arrival_time) = ? AND YEAR(la.arrival_time) = ?
     WHERE u.department_id = ?
     GROUP BY u.id
     ORDER BY late_count DESC`,
    [month, year, departmentId]
  );

  return stats;
};

// Excuse a late arrival (manager action)
const excuseLateArrival = async (lateArrivalId, managerId, reason) => {
  await pool.query(
    `UPDATE late_arrivals
     SET is_excused = true, excused_by = ?, excuse_reason = ?
     WHERE id = ?`,
    [managerId, reason, lateArrivalId]
  );

  return { message: 'Late arrival excused' };
};

module.exports = {
  recordLateArrival,
  checkLateOnClockIn,
  checkAndIssueWarning,
  getUserLateArrivals,
  getLateArrivalSummary,
  getDepartmentLateStats,
  excuseLateArrival,
  WARNING_THRESHOLDS,
  GRACE_PERIOD_MINUTES,
};
