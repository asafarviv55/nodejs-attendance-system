const authService = require('../services/auth.service');
const emailService = require('../services/email.service');

const signup = async (req, res, next) => {
  try {
    const { email, password, roleName } = req.body;

    if (!email || !password || !roleName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await authService.signup(email, password, roleName);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    if (error.message === 'Invalid role' || error.message === 'Email already registered') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Missing email or password' });
    }

    const result = await authService.signin(email, password);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const token = await authService.forgotPassword(email);

    // Send email with reset link
    await emailService.sendPasswordResetEmail(email, token);

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    if (error.message === 'Email not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    await authService.resetPassword(token, password);
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    if (error.message === 'Invalid or expired token') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { signup, signin, forgotPassword, resetPassword };
