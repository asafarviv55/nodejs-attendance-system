const { pool } = require('../config/database');

const requestLeave = async (userId, startDate, endDate, reason) => {
  await pool.query(
    'INSERT INTO leave_requests (user_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)',
    [userId, startDate, endDate, reason]
  );
};

const getAllLeaveRequests = async () => {
  const [rows] = await pool.query('SELECT * FROM leave_requests ORDER BY request_date DESC');
  return rows;
};

const respondToLeaveRequest = async (requestId, status) => {
  if (!['approved', 'denied'].includes(status)) {
    throw new Error('Invalid status');
  }
  await pool.query('UPDATE leave_requests SET status = ? WHERE id = ?', [status, requestId]);
};

module.exports = {
  requestLeave,
  getAllLeaveRequests,
  respondToLeaveRequest,
};
