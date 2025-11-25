const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const config = require('../config/env');

const SALT_ROUNDS = 10;

const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

const signup = async (email, password, roleName) => {
  // Get role ID
  const [roleResult] = await pool.query('SELECT id FROM roles WHERE role_name = ?', [roleName]);
  if (roleResult.length === 0) {
    throw new Error('Invalid role');
  }
  const roleId = roleResult[0].id;

  // Check if email already exists
  const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser.length > 0) {
    throw new Error('Email already registered');
  }

  // Hash password and create user
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO users (email, password, role_id) VALUES (?, ?, ?)',
    [email, hashedPassword, roleId]
  );

  const userId = result.insertId;
  const token = generateToken({ userId, roleId, roleName });

  return { userId, token };
};

const signin = async (email, password) => {
  const [rows] = await pool.query(
    `SELECT users.id, users.password, users.role_id, roles.role_name, users.email
     FROM users
     JOIN roles ON users.role_id = roles.id
     WHERE users.email = ?`,
    [email]
  );

  if (rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = rows[0];
  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken({
    userId: user.id,
    roleId: user.role_id,
    roleName: user.role_name,
  });

  return {
    token,
    userId: user.id,
    userName: user.email,
    roleName: user.role_name,
  };
};

const forgotPassword = async (email) => {
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (rows.length === 0) {
    throw new Error('Email not found');
  }

  const user = rows[0];
  const token = crypto.randomBytes(20).toString('hex');
  const tokenExpiry = Date.now() + 3600000; // 1 hour

  await pool.query(
    'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
    [token, tokenExpiry, user.id]
  );

  return token;
};

const resetPassword = async (token, newPassword) => {
  const [rows] = await pool.query(
    'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > ?',
    [token, Date.now()]
  );

  if (rows.length === 0) {
    throw new Error('Invalid or expired token');
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query(
    'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
    [hashedPassword, rows[0].id]
  );
};

module.exports = {
  signup,
  signin,
  forgotPassword,
  resetPassword,
  generateToken,
};
