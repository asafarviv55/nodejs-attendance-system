const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;

const initTransporter = () => {
  if (!config.email.user || !config.email.pass) {
    console.warn('Email credentials not configured. Email functionality disabled.');
    return;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
};

const sendPasswordResetEmail = async (email, token) => {
  if (!transporter) {
    console.warn('Email transporter not configured. Skipping email send.');
    return;
  }

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;

  const mailOptions = {
    from: config.email.user,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Initialize transporter on module load
initTransporter();

module.exports = { sendPasswordResetEmail };
