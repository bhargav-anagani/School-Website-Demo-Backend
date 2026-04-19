// ─────────────────────────────────────────────────────────────
// Auth Controller — login, register, forgot/reset password, me
// ─────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { signToken } = require('../utils/jwt');

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  // maxAge removed to make this a session cookie (expires when browser is closed)
};

// ── REGISTER (Removed) ──────────────────────────────────────────────────
// Registration functionality has been removed. All users are now pre-seeded.

// ── LOGIN ──────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    // Note: frontend might be sending it as 'email' or 'username', handle both to be safe
    const { username, email, password, role } = req.body;
    const loginIdentifier = username || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    // Fetch user
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND is_active = TRUE', [loginIdentifier]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = rows[0];

    // Verify role if provided
    if (role && user.role !== role) {
      return res.status(401).json({ success: false, message: `Invalid login. Please use ${user.role} login.` });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const token = signToken({ id: user.id, role: user.role, name: user.name, username: user.username });
    res.cookie('token', token, cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { id: user.id, name: user.name, username: user.username, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
};

// ── LOGOUT ────────────────────────────────────────────────────
const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
};

// ── ME (current user) ─────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, name, email, role, phone, is_active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?', [token, expiry, email]);

    // In production, send email here
    console.log(`🔑 Password reset token for ${email}: ${token}`);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// ── RESET PASSWORD ────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const [rows] = await pool.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [password_hash, rows[0].id]
    );

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, logout, getMe, forgotPassword, resetPassword };
