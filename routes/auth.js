import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { pool } from '../server.js';
import { sendResetEmail } from '../lib/email.js';

const router = express.Router();

// Helper function to generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Signup
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name',
      [email, hashedPassword, firstName, lastName]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      token
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    console.log('🔐 Login attempt with email:', email);
    console.log('🔑 Password received:', password);
    console.log('📏 Password length:', password ? password.length : 'undefined');

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1',
      [email]
    );

    console.log('📋 User found in DB:', result.rows.length > 0 ? result.rows[0] : 'NOT FOUND');

    if (result.rows.length === 0) {
      console.log('❌ No user with email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password - with detailed debugging
    console.log('\n=== PASSWORD COMPARISON DEBUG ===');
    console.log('Password from request:', password);
    console.log('Password type:', typeof password);
    console.log('Password length:', password.length);
    console.log('Password bytes:', Buffer.from(password).toString('hex'));
    console.log('');
    console.log('Hash from DB:', user.password_hash);
    console.log('Hash type:', typeof user.password_hash);
    console.log('Hash length:', user.password_hash.length);
    console.log('Hash starts with $2a$10$:', user.password_hash.startsWith('$2a$10$'));
    console.log('');

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 Bcrypt comparison result:', isValidPassword);
    console.log('=================================\n');

    if (!isValidPassword) {
      console.log('❌ Password mismatch for user:', user.email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
router.post('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, userId: decoded.userId });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Forgot password — issue a one-time, expiring, hashed reset token and email it.
// Always responds the same way so it can't be used to discover which emails exist.
router.post('/forgot', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  const generic = { ok: true, message: 'If that email is registered, a reset link has been sent.' };
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json(generic); // don't reveal validation either
    const { email } = req.body;
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length) {
      const userId = result.rows[0].id;
      const token = crypto.randomBytes(32).toString('hex');                       // sent to the user
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');  // stored in the DB
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);                     // 1 hour
      await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]); // one active token per user
      await pool.query(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [userId, tokenHash, expiresAt]
      );
      const base = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
      const link = `${base}/reset-password.html?token=${token}`;
      try { await sendResetEmail(email, link); }
      catch (e) { console.error('Reset email failed to send:', e.message); }
    }
  } catch (err) {
    console.error('Forgot-password error:', err);
  }
  res.json(generic); // same response regardless of outcome
});

// Reset password — verify the token, set the new password, invalidate the token.
router.post('/reset', [body('token').notEmpty(), body('password').isLength({ min: 8 })], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Please choose a password of at least 8 characters.' });
    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query('SELECT user_id, expires_at FROM password_resets WHERE token_hash = $1', [tokenHash]);
    if (!result.rows.length) {
      return res.status(400).json({ error: 'This reset link is invalid or has already been used.' });
    }
    const row = result.rows[0];
    if (new Date(row.expires_at) < new Date()) {
      await pool.query('DELETE FROM password_resets WHERE token_hash = $1', [tokenHash]);
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, row.user_id]);
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [row.user_id]); // single-use
    res.json({ ok: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

export default router;
