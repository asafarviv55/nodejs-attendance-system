const moment = require('moment-timezone');
const { pool } = require('../config/database');
const config = require('../config/env');

// Add a company holiday
const addHoliday = async (name, date, isRecurring = false, description = null) => {
  const [result] = await pool.query(
    `INSERT INTO holidays (name, date, is_recurring, description)
     VALUES (?, ?, ?, ?)`,
    [name, date, isRecurring, description]
  );

  return { id: result.insertId, name, date, isRecurring };
};

// Get holidays for a year
const getHolidaysForYear = async (year) => {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const [rows] = await pool.query(
    `SELECT * FROM holidays
     WHERE (date BETWEEN ? AND ?) OR is_recurring = true
     ORDER BY date`,
    [startDate, endDate]
  );

  // Adjust recurring holidays to current year
  return rows.map((h) => ({
    ...h,
    date: h.is_recurring ? `${year}${h.date.toString().substring(4)}` : h.date,
  }));
};

// Check if a date is a holiday
const isHoliday = async (date) => {
  const checkDate = moment(date).format('YYYY-MM-DD');
  const monthDay = checkDate.substring(5); // MM-DD

  const [rows] = await pool.query(
    `SELECT * FROM holidays
     WHERE date = ? OR (is_recurring = true AND SUBSTRING(date, 6) = ?)`,
    [checkDate, monthDay]
  );

  return rows.length > 0 ? rows[0] : null;
};

// Get upcoming holidays
const getUpcomingHolidays = async (limit = 5) => {
  const today = moment().tz(config.timezone).format('YYYY-MM-DD');
  const year = moment().year();

  const [rows] = await pool.query(
    `SELECT * FROM holidays
     WHERE date >= ? OR is_recurring = true
     ORDER BY date
     LIMIT ?`,
    [today, limit]
  );

  return rows.filter((h) => {
    const holidayDate = h.is_recurring
      ? `${year}-${h.date.toString().substring(5)}`
      : h.date;
    return moment(holidayDate).isSameOrAfter(today);
  });
};

// Calculate working days between two dates (excluding holidays and weekends)
const calculateWorkingDays = async (startDate, endDate, excludeWeekends = true) => {
  const start = moment(startDate);
  const end = moment(endDate);
  let workingDays = 0;

  const holidays = await getHolidaysForYear(start.year());
  const holidayDates = new Set(holidays.map((h) => moment(h.date).format('YYYY-MM-DD')));

  while (start.isSameOrBefore(end)) {
    const isWeekend = excludeWeekends && (start.day() === 0 || start.day() === 6);
    const isHolidayDate = holidayDates.has(start.format('YYYY-MM-DD'));

    if (!isWeekend && !isHolidayDate) {
      workingDays++;
    }

    start.add(1, 'day');
  }

  return workingDays;
};

// Delete holiday
const deleteHoliday = async (holidayId) => {
  await pool.query('DELETE FROM holidays WHERE id = ?', [holidayId]);
  return { message: 'Holiday deleted' };
};

// Get holiday summary for employee dashboard
const getHolidaySummary = async (userId) => {
  const year = moment().year();
  const holidays = await getHolidaysForYear(year);
  const upcoming = await getUpcomingHolidays(3);

  // Get user's personal time off
  const [pto] = await pool.query(
    `SELECT SUM(DATEDIFF(end_date, start_date) + 1) as pto_days
     FROM leave_requests
     WHERE user_id = ? AND status = 'approved' AND YEAR(start_date) = ?`,
    [userId, year]
  );

  return {
    totalHolidaysThisYear: holidays.length,
    upcomingHolidays: upcoming,
    ptoDaysTaken: pto[0].pto_days || 0,
  };
};

module.exports = {
  addHoliday,
  getHolidaysForYear,
  isHoliday,
  getUpcomingHolidays,
  calculateWorkingDays,
  deleteHoliday,
  getHolidaySummary,
};
