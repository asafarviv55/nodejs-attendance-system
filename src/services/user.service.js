const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const SALT_ROUNDS = 10;

const getAllUsers = async () => {
  const [rows] = await pool.query('SELECT id, email, role_id FROM users');
  return rows;
};

const getUserById = async (userId) => {
  const [rows] = await pool.query('SELECT id, email, role_id FROM users WHERE id = ?', [userId]);
  return rows[0] || null;
};

const updateUser = async (userId, email) => {
  await pool.query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
};

const updateUserRole = async (userId, roleId) => {
  await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [roleId, userId]);
};

const deleteUser = async (userId) => {
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
};

const updateProfile = async (userId, email, password = null) => {
  if (password) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query('UPDATE users SET email = ?, password = ? WHERE id = ?', [email, hashedPassword, userId]);
  } else {
    await pool.query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
  }
};

const getAllRoles = async () => {
  const [rows] = await pool.query('SELECT id, role_name FROM roles');
  return rows;
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  updateUserRole,
  deleteUser,
  updateProfile,
  getAllRoles,
};
